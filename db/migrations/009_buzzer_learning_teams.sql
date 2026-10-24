create schema if not exists buzzer;
revoke all on schema buzzer from public;
create table buzzer.progress (
  user_id text not null references public.buzzer_user(id) on delete cascade,
  question_id text not null,
  attempts integer not null default 0,
  correct integer not null default 0,
  last_correct boolean not null,
  due_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id, question_id)
);
create index on buzzer.progress(user_id, due_at);
create table buzzer.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(name) between 2 and 48),
  owner_id text not null references public.buzzer_user(id) on delete cascade,
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
  school text check(length(school) <= 100),
  room_code text,
  created_at timestamptz not null default now()
);
create unique index on buzzer.teams(owner_id);
create table buzzer.members (
  team_id uuid not null references buzzer.teams(id) on delete cascade,
  user_id text not null references public.buzzer_user(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(team_id, user_id)
);
create unique index on buzzer.members(user_id);
create table buzzer.challenges (
  id uuid primary key default gen_random_uuid(),
  from_team uuid not null references buzzer.teams(id) on delete cascade,
  to_team uuid not null references buzzer.teams(id) on delete cascade,
  scheduled_at timestamptz not null,
  status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled')),
  room_code text,
  created_at timestamptz not null default now(),
  check(from_team <> to_team)
);
create index on buzzer.challenges(from_team, created_at desc);
create index on buzzer.challenges(to_team, created_at desc);
revoke all on all tables in schema buzzer from public;
