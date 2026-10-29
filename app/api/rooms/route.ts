import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { database, databaseReady } from "@/lib/server/db";
import { sameRequestOrigin, roomCode } from "@/lib/room-security";
import { choicesForQuestion, questionStem } from "@/lib/choices";
import { getAuth } from "@/lib/auth";
const choiceCache = new Map<string, { text: string; choices: string[] }>();
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const COOKIE = "qf_guest";
const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
async function matchAccess(
  request: Request,
  code: string,
  token: string | undefined,
  joining = false,
) {
  const matches = await database().query(
    "select from_team,to_team from buzzer.challenges where room_code=$1 and status='accepted'",
    [code],
  );
  if (!matches.length) return null;
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) throw Error("Join this match with your Buzzer! account.");
  const members = await database().query(
    "select team_id from buzzer.members where user_id=$1 and team_id in ($2,$3)",
    [session.user.id, matches[0].from_team, matches[0].to_team],
  );
  if (!members.length)
    throw Error("This room is reserved for the two invited teams.");
  if (!joining) {
    const bound = await database().query(
      "select 1 from arena.members m join arena.rooms r on r.id=m.room_id join arena.guests g on g.id=m.guest_id where r.code=$1 and g.token_hash=$2 and m.account_user_id=$3",
      [code, hash(token || ""), session.user.id],
    );
    if (!bound.length)
      throw Error("Join this match with your Buzzer! account.");
  }
  return {
    userId: session.user.id,
    team: members[0].team_id === matches[0].from_team ? "A" : "B",
  };
}
function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, private" },
  });
}
function fail(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  const safe =
    /^(Your player|Room not found|Join this|Choose a|Finish or|That subject|That question|This is not|This room|The round|Only |Invite at|This round|No questions|The buzzer|Time is|The question|Buzz in|Answers must|There is|Resolve this|This question|Too many|Teams must|Enter the)/.test(
      message,
    );
  if (!safe)
    console.error("Room operation failed", {
      code: (error as { code?: string }).code || "unavailable",
    });
  return json(
    { error: safe ? message : "Could not reach the room. Please try again." },
    safe ? 400 : 503,
  );
}
async function state(token: string, code: string) {
  const identity = await database().query(
    "select id from arena.guests where token_hash=$1 and expires_at>now()",
    [hash(token)],
  );
  if (!identity.length)
    throw Error("Your player session expired. Rejoin the room.");
  await database().query("select arena.sync_hcasc_round($1,$2)", [
    identity[0].id,
    code,
  ]);
  const rows = await database().query(
    "select arena.room_snapshot((select id from arena.guests where token_hash=$1 and expires_at>now()),$2) as state",
    [hash(token), code],
  );
  const room = rows[0].state;
  const metadata = await database().query(
    "select arena.hcasc_metadata($1,$2) as metadata",
    [identity[0].id, code],
  );
  Object.assign(room, metadata[0].metadata);
  if (room.mode === "hcasc")
    room.seconds = room.question_kind === "bonus" ? 5 : 3;
  if (
    room.mode === "hcasc" &&
    ["pick", "ultimate_pick", "ultimate"].includes(room.hcasc_phase)
  ) {
    room.question = null;
    room.result = null;
  }
  if (room.question) {
    let choice = choiceCache.get(room.question.id);
    if (!choice) {
      const found = await database().query(
        "select q.id,q.text,q.answer,q.alternatives,q.subject,(select jsonb_agg(a) from (select answer,subject from arena.questions where review_status='approved' order by (subject=q.subject) desc,md5(id::text || q.id::text) limit 32) a) as pool from arena.questions q where q.id=$1",
        [room.question.id],
      );
      const q = found[0] as unknown as Parameters<
        typeof choicesForQuestion
      >[0] & { pool: { answer: string; subject: string }[] };
      choice = {
        text: questionStem(q.text),
        choices: choicesForQuestion(q, q.pool),
      };
      if (choiceCache.size >= 500)
        choiceCache.delete(choiceCache.keys().next().value!);
      choiceCache.set(q.id, choice);
    }
    room.question = {
      ...room.question,
      ...choice,
      choices: room.mode === "hcasc" ? [] : choice.choices,
    };
  }
  return room;
}
export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("config") === "1")
    return json({ available: databaseReady() });
  if (!databaseReady())
    return json({ error: "Team rooms are not available yet." }, 503);
  const token = request.cookies.get(COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    return json({ error: "Enter your name to join this room." }, 401);
  try {
    await matchAccess(
      request,
      roomCode(request.nextUrl.searchParams.get("code")),
      token,
    );
    return json({
      room: await state(
        token,
        roomCode(request.nextUrl.searchParams.get("code")),
      ),
    });
  } catch (error) {
    return fail(error);
  }
}
export async function POST(request: NextRequest) {
  if (
    !sameRequestOrigin(
      request.url,
      request.headers.get("host"),
      request.headers.get("origin"),
    )
  )
    return json({ error: "Open the game and try again." }, 403);
  if (!databaseReady())
    return json({ error: "Team rooms are not available yet." }, 503);
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 190000)
      return json({ error: "That request is too large." }, 413);
    body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw Error();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  let token = request.cookies.get(COOKIE)?.value;
  let newToken = false;
  try {
    const sql = database();
    let identity: Record<string, unknown>[] = [];
    if (token && /^[a-f0-9]{64}$/.test(token))
      identity = await sql.query(
        "select id from arena.guests where token_hash=$1 and expires_at>now()",
        [hash(token)],
      );
    if (!identity.length) {
      if (!["create", "join"].includes(String(body.action)))
        return json(
          { error: "Your player session expired. Rejoin the room." },
          401,
        );
      token = randomBytes(32).toString("hex");
      newToken = true;
      identity = await sql.query(
        "insert into arena.guests(token_hash) values($1) returning id",
        [hash(token)],
      );
    }
    const gid = identity[0].id;
    const account = await getAuth().api.getSession({
      headers: request.headers,
    });
    let code = "";
    const text = (key: string, max: number, fallback = "") => {
      const value = body[key] ?? fallback;
      if (typeof value !== "string" || value.length > max)
        throw Error("Choose a valid " + key + ".");
      return value.trim();
    };
    const integer = (
      key: string,
      min: number,
      max: number,
      fallback: number,
    ) => {
      const value = body[key] ?? fallback;
      if (
        !Number.isInteger(value) ||
        Number(value) < min ||
        Number(value) > max
      )
        throw Error("Choose a valid " + key + ".");
      return Number(value);
    };
    if (body.action === "create") {
      await sql.query(
        "delete from arena.voice_answers where created_at < now()-interval '24 hours'",
      );
      const rows =
        body.mode === "hcasc"
          ? await sql.query("select arena.create_hcasc_room($1,$2) as code", [
              gid,
              text("name", 32),
            ])
          : await sql.query(
              "select arena.create_room($1,$2,$3,$4,$5,$6,$7,$8) as code",
              [
                gid,
                text("name", 32),
                text("title", 60, "Team practice"),
                text("focus", 40) || null,
                integer("count", 3, 30, 10),
                integer("seconds", 15, 120, 30),
                integer("correct", 1, 100, 10),
                integer("incorrect", -100, 0, 0),
              ],
            );
      code = rows[0].code;
    } else {
      code = roomCode(body.code);
      const match = await matchAccess(
        request,
        code,
        token,
        body.action === "join",
      );
      const index = integer("index", 0, 200, 0);
      if (body.action !== "join") {
        await sql.query("select arena.sync_hcasc_round($1,$2)", [gid, code]);
        const progress = await sql.query(
          "select r.mode,r.hcasc_phase from arena.rooms r join arena.members m on m.room_id=r.id where r.code=$1 and m.guest_id=$2",
          [code, gid],
        );
        const binding = await sql.query(
          "select account_user_id from arena.members m join arena.rooms r on r.id=m.room_id where r.code=$1 and m.guest_id=$2",
          [code, gid],
        );
        if (
          binding[0]?.account_user_id &&
          binding[0].account_user_id !== account?.user.id
        )
          throw Error(
            "Join this room with the account you used when entering.",
          );
        if (
          progress[0]?.mode === "hcasc" &&
          ["start", "next", "judge"].includes(String(body.action))
        )
          throw Error("Choose an HCASC action for this room.");
        if (
          progress[0]?.mode === "hcasc" &&
          progress[0].hcasc_phase !== "question" &&
          [
            "arm",
            "buzz",
            "voice",
            "review_voice",
            "answer",
            "judge",
            "reveal",
          ].includes(String(body.action))
        )
          throw Error("Choose a question from the active board.");
      }
      switch (body.action) {
        case "join":
          if (match)
            await sql.query("select buzzer.join_match($1,$2,$3,$4,$5)", [
              gid,
              code,
              text("name", 32),
              body.watch === true,
              match.userId,
            ]);
          else
            await sql.query("select arena.join_room($1,$2,$3,$4)", [
              gid,
              code,
              text("name", 32),
              body.watch === true,
            ]);
          break;
        case "assign_team": {
          if (match)
            throw Error(
              "This room keeps the invited teams on their own sides.",
            );
          const member = text("member", 36),
            team = text("team", 1);
          if (!/^[a-f0-9-]{36}$/i.test(member) || !["A", "B"].includes(team))
            throw Error("Choose a player and team.");
          await sql.query("select arena.assign_team($1,$2,$3,$4)", [
            gid,
            code,
            member,
            team,
          ]);
          break;
        }
        case "steal":
          await sql.query("select arena.steal_room($1,$2,$3)", [
            gid,
            code,
            index,
          ]);
          break;
        case "start":
          await sql.query("select arena.start_room($1,$2)", [gid, code]);
          break;
        case "start_hcasc":
          if (match) {
            const roster = await sql.query(
              "select m.team,count(*)::integer as n from arena.members m join arena.rooms r on r.id=m.room_id where r.code=$1 and m.role<>'spectator' group by m.team",
              [code],
            );
            if (
              !["A", "B"].every((side) =>
                roster.some((r) => r.team === side && r.n === 3),
              )
            )
              throw Error(
                "Teams must have three active players each for a university match. Extra players can join as viewers.",
              );
          }
          await sql.query("select arena.start_hcasc_room($1,$2)", [gid, code]);
          break;
        case "pick":
          await sql.query("select arena.pick_hcasc_question($1,$2,$3,$4)", [
            gid,
            code,
            text("category", 40),
            integer("slot", 1, 3, 0),
          ]);
          break;
        case "next_hcasc":
          await sql.query("select arena.next_hcasc_question($1,$2,$3)", [
            gid,
            code,
            index,
          ]);
          break;
        case "answer_bonus":
          await sql.query("select arena.answer_bonus($1,$2,$3,$4)", [
            gid,
            code,
            index,
            text("answer", 1000),
          ]);
          break;
        case "pick_ultimate":
          await sql.query("select arena.pick_ultimate($1,$2,$3)", [
            gid,
            code,
            text("pack", 80),
          ]);
          break;
        case "answer_ultimate":
          await sql.query("select arena.answer_ultimate($1,$2,$3,$4,$5)", [
            gid,
            code,
            integer("sequence", 0, 1000, 0),
            text("answer", 1000),
            body.pass === true,
          ]);
          break;
        case "arm":
          await sql.query("select arena.arm_room($1,$2,$3)", [
            gid,
            code,
            index,
          ]);
          break;
        case "buzz":
          await sql.query("select arena.buzz_room($1,$2,$3)", [
            gid,
            code,
            index,
          ]);
          break;
        case "voice":
          await sql.query("select arena.voice_room($1,$2,$3,$4,$5,$6)", [
            gid,
            code,
            index,
            text("answer", 1000),
            text("audio", 180000),
            text("mime", 40),
          ]);
          break;
        case "review_voice":
          if (typeof body.correct !== "boolean")
            return json({ error: "Choose correct or incorrect." }, 400);
          await sql.query("select arena.review_voice($1,$2,$3,$4)", [
            gid,
            code,
            index,
            body.correct,
          ]);
          break;
        case "answer":
          await sql.query("select arena.answer_room($1,$2,$3,$4)", [
            gid,
            code,
            index,
            text("answer", 1000),
          ]);
          break;
        case "judge":
          if (typeof body.correct !== "boolean")
            return json({ error: "Choose correct or incorrect." }, 400);
          await sql.query("select arena.judge_room($1,$2,$3,$4)", [
            gid,
            code,
            index,
            body.correct,
          ]);
          break;
        case "reveal":
          await sql.query("select arena.reveal_room($1,$2,$3)", [
            gid,
            code,
            index,
          ]);
          break;
        case "next":
          await sql.query("select arena.next_room($1,$2,$3)", [
            gid,
            code,
            index,
          ]);
          break;
        case "leave":
          await sql.query("select arena.leave_room($1,$2)", [gid, code]);
          return json({ left: true });
        default:
          return json({ error: "Unknown room action." }, 400);
      }
    }
    if (body.action === "create" || body.action === "join") {
      if (account)
        await sql.query(
          "update arena.members m set account_user_id=$1 from arena.rooms r where r.id=m.room_id and r.code=$2 and m.guest_id=$3 and (m.account_user_id is null or m.account_user_id=$1)",
          [account.user.id, code, gid],
        );
    }
    const response = json({ room: await state(token!, code) });
    if (newToken)
      response.cookies.set(COOKIE, token!, {
        httpOnly: true,
        secure:
          process.env.VERCEL === "1" || request.nextUrl.protocol === "https:",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    return response;
  } catch (error) {
    return fail(error);
  }
}
