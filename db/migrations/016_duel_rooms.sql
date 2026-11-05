alter table buzzer.duel_invites add column if not exists room_code text;
create index if not exists duel_invites_sender_recent on buzzer.duel_invites(sender_id,created_at desc);
