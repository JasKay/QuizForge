alter table arena.members add column account_user_id text references public.buzzer_user(id) on delete set null;
create unique index room_account_member on arena.members(room_id,account_user_id) where account_user_id is not null;

create function buzzer.join_match(gid uuid, invite text, nickname text, watch boolean, uid text)
returns void language plpgsql as $$
declare r arena.rooms; c buzzer.challenges; side text;
begin
  select * into r from arena.rooms where code=upper(invite) for update;
  select * into c from buzzer.challenges where room_code=r.code and status='accepted';
  if c.id is null then raise exception 'This room is not an accepted team match.'; end if;
  select case when team_id=c.from_team then 'A' else 'B' end into side
    from buzzer.members where user_id=uid and team_id in(c.from_team,c.to_team);
  if side is null then raise exception 'This room is reserved for the two invited teams.'; end if;
  if exists(select 1 from arena.members where room_id=r.id and account_user_id=uid and guest_id<>gid)
    then raise exception 'This room already has your player. Use the device you joined with.'; end if;
  perform arena.join_room(gid,invite,nickname,watch);
  update arena.members set account_user_id=uid,team=case when role='spectator' then null else side end
    where room_id=r.id and guest_id=gid;
end $$;

create function buzzer.close_team_rooms() returns trigger language plpgsql as $$
begin
  update arena.rooms set status='closed',version=version+1
    where code=old.room_code or code in(select room_code from buzzer.challenges where from_team=old.id or to_team=old.id);
  return old;
end $$;
create trigger close_team_rooms_before_delete before delete on buzzer.teams
  for each row execute function buzzer.close_team_rooms();
revoke all on all functions in schema buzzer from public;
