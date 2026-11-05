-- Privacy-first opt-in presence and direct challenge invitations.
create table if not exists buzzer.notification_settings (
 user_id text primary key references public.buzzer_user(id) on delete cascade,
 show_online boolean not null default false,
 challenge_alerts boolean not null default true,
 practice_frequency text not null default 'off' check(practice_frequency in ('off','daily','weekdays','weekly')),
 practice_hour integer not null default 18 check(practice_hour between 0 and 23),
 timezone text not null default 'UTC',
 updated_at timestamptz not null default now()
);
create table if not exists buzzer.presence (
 user_id text primary key references public.buzzer_user(id) on delete cascade,
 seen_at timestamptz not null default now()
);
create table if not exists buzzer.duel_invites (
 id uuid primary key default gen_random_uuid(),
 sender_id text not null references public.buzzer_user(id) on delete cascade,
 recipient_id text not null references public.buzzer_user(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted','declined')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now() + interval '30 minutes'),
 check(sender_id <> recipient_id)
);
create index if not exists buzzer_presence_recent on buzzer.presence(seen_at desc);
create index if not exists buzzer_duel_recipient on buzzer.duel_invites(recipient_id,created_at desc);
