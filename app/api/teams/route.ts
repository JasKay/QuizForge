import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { database } from "@/lib/server/db";
import {
  requireUser,
  readAction,
  apiError,
  AppError,
  privateHeaders,
  text,
} from "@/lib/server/account";
import { userMastery } from "@/lib/server/mastery";
import { roomCode } from "@/lib/room-security";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function teamFor(userId: string) {
  const rows = await database().query(
    "select t.* from buzzer.teams t join buzzer.members m on m.team_id=t.id where m.user_id=$1",
    [userId],
  );
  return rows[0];
}
export async function GET(request: Request) {
  try {
    const user = await requireUser(request),
      team = await teamFor(user.id);
    const available = await database().query(
      "select t.id,t.name,t.school,(select count(*)::integer from buzzer.members where team_id=t.id) as members from buzzer.teams t where t.id::text <> $1 order by t.created_at desc limit 50",
      [team?.id || ""],
    );
    if (team?.room_code) {
      const active = await database().query(
        "select 1 from arena.rooms where code=$1 and expires_at>now() and status<>'closed'",
        [team.room_code],
      );
      if (!active.length) team.room_code = null;
    }
    if (!team)
      return Response.json(
        { team: null, available, challenges: [] },
        { headers: privateHeaders },
      );
    const [members, challenges] = await Promise.all([
      database().query(
        "select u.id,u.name,coalesce(p.learned,0)::integer as learned,coalesce(p.learned,0)::integer*10 as xp,coalesce(p.active,false) as active from buzzer.members m join public.buzzer_user u on u.id=m.user_id left join lateral (select count(*) filter(where correct>0) as learned,bool_or(updated_at>now()-interval '7 days') as active from buzzer.progress where user_id=u.id) p on true where m.team_id=$1 order by m.joined_at",
        [team.id],
      ),
      database().query(
        "select c.*,a.name as from_name,b.name as to_name,a.school as from_school,b.school as to_school from buzzer.challenges c join buzzer.teams a on a.id=c.from_team join buzzer.teams b on b.id=c.to_team where c.from_team=$1 or c.to_team=$1 order by c.scheduled_at desc limit 30",
        [team.id],
      ),
    ]);
    const cheers = await database().query(
      "select to_user,count(*)::integer as count,bool_or(from_user=$2) as cheered from buzzer.cheers where team_id=$1 and day=current_date group by to_user",
      [team.id, user.id],
    );
    const profiles = await Promise.all(
      members.map((m) => userMastery(String(m.id))),
    );
    const enriched = members.map((m, i) => ({
      ...m,
      xp: profiles[i].xp,
      strongest: profiles[i].strongest,
      focus: profiles[i].focus,
      power:
        profiles[i].domains.find((d) => d.subject === profiles[i].strongest)
          ?.power || 0,
      cheers: Number(cheers.find((c) => c.to_user === m.id)?.count || 0),
      cheered: !!cheers.find((c) => c.to_user === m.id)?.cheered,
    }));
    const week = await database().query(
      "select count(distinct (e.user_id,e.question_id))::integer as answers from buzzer.mastery_events e join buzzer.members m on m.user_id=e.user_id where m.team_id=$1 and e.correct and e.happened_at>now()-interval '7 days'",
      [team.id],
    );
    return Response.json(
      {
        team: {
          ...team,
          members: enriched,
          weekly: { answers: Number(week[0]?.answers || 0), goal: 50 },
          stats: {
            xp: enriched.reduce((n, m) => n + Number(m.xp), 0),
            learned: members.reduce((n, m) => n + Number(m.learned), 0),
            active: members.filter((m) => m.active).length,
          },
        },
        available,
        challenges,
      },
      { headers: privateHeaders },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request),
      body = await readAction(request),
      db = database();
    const team = await teamFor(user.id);
    if (body.action === "create") {
      if (team)
        throw new AppError(
          "You already belong to a team. Leave it before creating another.",
        );
      await db.query(
        "with t as (insert into buzzer.teams(name,owner_id,school) values($1,$2,$3) returning id) insert into buzzer.members(team_id,user_id) select id,$2 from t",
        [
          text(body.name, 2, 48),
          user.id,
          typeof body.school === "string"
            ? body.school.trim().slice(0, 100) || null
            : null,
        ],
      );
    } else if (body.action === "join") {
      if (team)
        throw new AppError(
          "You already belong to a team. Leave it before joining another.",
        );
      const joined = await db.query(
        "insert into buzzer.members(team_id,user_id) select id,$1 from buzzer.teams where invite_code=$2 returning team_id",
        [user.id, text(body.code, 12, 12).toUpperCase()],
      );
      if (!joined.length)
        throw new AppError(
          "That invite code was not found. Check it with your teammate.",
          404,
        );
    } else {
      if (!team) throw new AppError("Join or create a team first.");
      const owner = team.owner_id === user.id;
      if (body.action === "cheer") {
        const target = text(body.userId);
        if (target === user.id) throw new AppError("Cheer on a teammate.");
        const rows = await db.query(
          "insert into buzzer.cheers(team_id,from_user,to_user) select $1,$2,m.user_id from buzzer.members m where m.team_id=$1 and m.user_id=$3 on conflict do nothing returning to_user",
          [team.id, user.id, target],
        );
        if (!rows.length)
          throw new AppError("You can encourage each teammate once a day.");
      } else if (body.action === "leave") {
        if (owner)
          throw new AppError(
            "As captain, delete the team from its settings before leaving.",
          );
        await db.query("delete from buzzer.members where user_id=$1", [
          user.id,
        ]);
      } else {
        if (!owner)
          throw new AppError("Only your team captain can do that.", 403);
        if (body.action === "update")
          await db.query(
            "update buzzer.teams set name=$1,school=$2 where id=$3",
            [
              text(body.name, 2, 48),
              typeof body.school === "string"
                ? body.school.trim().slice(0, 100)
                : null,
              team.id,
            ],
          );
        else if (body.action === "delete")
          await db.query("delete from buzzer.teams where id=$1", [team.id]);
        else if (body.action === "rotate")
          await db.query(
            "update buzzer.teams set invite_code=upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)) where id=$1",
            [team.id],
          );
        else if (body.action === "challenge") {
          const date = new Date(String(body.scheduledAt));
          if (
            !Number.isFinite(date.getTime()) ||
            date.getTime() < Date.now() ||
            date.getTime() > Date.now() + 90 * 86400000
          )
            throw new AppError("Choose a time within the next 90 days.");
          if (String(body.opponent) === String(team.id))
            throw new AppError("Choose another team.");
          const rows = await db.query(
            "insert into buzzer.challenges(from_team,to_team,scheduled_at) select $1,t.id,$3 from buzzer.teams t where t.id::text=$2 and (select count(*) from buzzer.challenges where from_team=$1 and status='pending')<10 returning id",
            [team.id, text(body.opponent), date.toISOString()],
          );
          if (!rows.length)
            throw new AppError(
              "Choose an available team. You can have up to 10 pending invitations.",
            );
        } else if (body.action === "respond") {
          if (
            !["accepted", "declined", "cancelled"].includes(String(body.status))
          )
            throw new AppError("Choose a valid response.");
          const rows = await db.query(
            "update buzzer.challenges set status=$1 where id::text=$2 and status='pending' and (($1 in ('accepted','declined') and to_team=$3) or ($1='cancelled' and from_team=$3)) returning id",
            [body.status, text(body.id), team.id],
          );
          if (!rows.length)
            throw new AppError("That invitation is no longer available.", 409);
        } else if (body.action === "room") {
          const code = roomCode(body.code),
            token = request.cookies.get("qf_guest")?.value || "";
          const hash = createHash("sha256").update(token).digest("hex");
          const owned = await db.query(
            "select r.id from arena.rooms r join arena.guests g on g.id=r.host_id where r.code=$1 and g.token_hash=$2 and g.expires_at>now()",
            [code, hash],
          );
          if (!owned.length)
            throw new AppError(
              "Create a room before sharing it with your team.",
              403,
            );
          if (body.challengeId) {
            const rows = await db.query(
              "with match as (update buzzer.challenges set room_code=$1 where id::text=$2 and from_team=$3 and status='accepted' and room_code is null returning id) update arena.members m set account_user_id=$4 from arena.rooms r where m.room_id=r.id and r.code=$1 and m.guest_id=r.host_id and exists(select 1 from match) returning m.guest_id",
              [code, text(body.challengeId), team.id, user.id],
            );
            if (!rows.length)
              throw new AppError(
                "Only the inviting captain can open an accepted match, once.",
                409,
              );
          } else
            await db.query("update buzzer.teams set room_code=$1 where id=$2", [
              code,
              team.id,
            ]);
        } else throw new AppError("Choose a valid team action.");
      }
    }
    return Response.json({ ok: true }, { headers: privateHeaders });
  } catch (error) {
    if ((error as { code?: string })?.code === "23505")
      return Response.json(
        {
          error:
            "You already have a team or a pending invitation. Refresh and try again.",
        },
        { status: 409 },
      );
    return apiError(error);
  }
}
