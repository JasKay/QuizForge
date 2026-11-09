import { database } from "@/lib/server/db";
import { apiError, AppError, privateHeaders, readAction, requireUser, text } from "@/lib/server/account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const ownerEmail = "iamjasanyakay@gmail.com";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: privateHeaders });

async function ensureFeedbackTable() {
  const db = database();
  await db`create table if not exists buzzer.player_feedback (
    id uuid primary key default gen_random_uuid(),
    user_id text not null references public.buzzer_user(id) on delete cascade,
    sender_name text not null default 'Player',
    message text not null check (length(message) between 3 and 500),
    created_at timestamptz not null default now()
  )`;
  await db`create index if not exists buzzer_player_feedback_created on buzzer.player_feedback(created_at desc)`;
  return db;
}

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    if (user.email?.trim().toLowerCase() !== ownerEmail) return json({ isOwner: false, feedback: [] });
    const db = await ensureFeedbackTable();
    const feedback = await db`select id, sender_name, message, created_at from buzzer.player_feedback order by created_at desc limit 50`;
    return json({ isOwner: true, feedback });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await readAction(request);
    const message = text(body.message, 3, 500);
    const db = await ensureFeedbackTable();
    const recent = await db`select count(*)::int as count from buzzer.player_feedback where user_id = ${user.id} and created_at > now() - interval '24 hours'`;
    if (recent[0]?.count >= 5) throw new AppError("You’ve sent a few suggestions today. Try again tomorrow.", 429);
    await db`insert into buzzer.player_feedback (user_id, sender_name, message) values (${user.id}, ${user.name?.slice(0, 80) || "Player"}, ${message})`;
    return json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}