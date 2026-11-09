create table if not exists buzzer.player_feedback (
 id uuid primary key default gen_random_uuid(),
 user_id text not null references public.buzzer_user(id) on delete cascade,
 sender_name text not null default 'Player',
 message text not null check (length(message) between 3 and 500),
 created_at timestamptz not null default now(),
 email_sent_at timestamptz
);
create index if not exists buzzer_player_feedback_created on buzzer.player_feedback(created_at desc);
