alter table arena.members add column team text check(team in ('A','B'));
with numbered as(select room_id,guest_id,row_number() over(partition by room_id order by joined_at,guest_id) n from arena.members where role<>'spectator') update arena.members m set team=case when n.n%2=1 then 'A' else 'B' end from numbered n where m.room_id=n.room_id and m.guest_id=n.guest_id;
create or replace function arena.create_room(gid uuid,nickname text,room_title text,subject_focus text default null,question_total integer default 10,seconds integer default 30,correct_score integer default 10,incorrect_score integer default 0) returns text language plpgsql as $$
declare rid uuid;invite text;
begin perform arena.limit_action(gid);
 if length(trim(nickname)) not between 1 and 32 or nickname is null then raise exception 'Choose a player name (1–32 characters).';end if;
 if (select count(*) from arena.rooms where host_id=gid and expires_at>now() and status not in ('closed','finished'))>=5 then raise exception 'Finish or close an existing room first.';end if;
 if subject_focus is not null and not exists(select 1 from arena.questions where subject=subject_focus and review_status='approved') then raise exception 'That subject has no available questions.';end if;
 loop invite=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));exit when not exists(select 1 from arena.rooms where code=invite);end loop;
 insert into arena.rooms(code,host_id,title,focus,question_count,seconds_per_question,correct_points,incorrect_points) values(invite,gid,trim(room_title),subject_focus,question_total,seconds,correct_score,incorrect_score) returning id into rid;
 insert into arena.members(room_id,guest_id,display_name,role,team) values(rid,gid,trim(nickname),'moderator','A');return invite;
end $$;
create or replace function arena.join_room(gid uuid,invite text,nickname text,watch boolean default false) returns text language plpgsql as $$
declare r arena.rooms;
begin perform arena.limit_action(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() and status<>'closed' for update;if not found then raise exception 'Room not found or expired. Check the code.';end if;
 if length(trim(nickname)) not between 1 and 32 or nickname is null then raise exception 'Choose a player name (1–32 characters).';end if;
 if not exists(select 1 from arena.members where room_id=r.id and guest_id=gid) then
 if (select count(*) from arena.members where room_id=r.id)>=32 then raise exception 'This room is full.';end if;
 if not watch and r.status<>'waiting' then raise exception 'The round has started. Join as a viewer.';end if;
 end if;
 insert into arena.members(room_id,guest_id,display_name,role) values(r.id,gid,trim(nickname),case when watch then 'spectator' else 'player' end) on conflict(room_id,guest_id) do update set display_name=excluded.display_name;
 update arena.members set team=case when (select count(*) from arena.members where room_id=r.id and role<>'spectator' and team='A')<=(select count(*) from arena.members where room_id=r.id and role<>'spectator' and team='B') then 'A' else 'B' end where room_id=r.id and guest_id=gid and role<>'spectator' and team is null;
 update arena.rooms set version=version+1 where id=r.id;return r.code;
end $$;
create or replace function arena.start_room(gid uuid,invite text) returns void language plpgsql as $$
declare r arena.rooms;ids uuid[];
begin perform arena.limit_action(gid);select * into r from arena.rooms where code=upper(invite) for update;
 if not found or r.expires_at<now() or r.host_id<>gid then raise exception 'Only the moderator can start this room.';end if;
if not exists(select 1 from arena.members where room_id=r.id and role<>'spectator' and team='A') or not exists(select 1 from arena.members where room_id=r.id and role<>'spectator' and team='B') or abs((select count(*) from arena.members where room_id=r.id and role<>'spectator' and team='A')-(select count(*) from arena.members where room_id=r.id and role<>'spectator' and team='B'))>1 then raise exception 'Teams must be balanced before starting.';end if;
 if r.status not in ('waiting','finished') then raise exception 'This round has already started.';end if;
 if not exists(select 1 from arena.members where room_id=r.id and role='player') then raise exception 'Invite at least one player before starting.';end if;
 select array_agg(id) into ids from(select id from arena.questions where review_status='approved' and (r.focus is null or subject=r.focus) order by exists(select 1 from arena.answers a where a.room_id=r.id and a.question_id=arena.questions.id),random() limit r.question_count) q;
 if coalesce(cardinality(ids),0)=0 then raise exception 'No questions are available.';end if;
 update arena.members set score=0 where room_id=r.id;
 update arena.rooms set armed=false,question_ids=ids,current_index=1,run=run+1,status='open',opened_at=clock_timestamp(),locked_at=null,winner_id=null,last_correct=null,last_response=null,version=version+1 where id=r.id;
perform arena.prepare_reading(r.id);
end $$;
create or replace function arena.room_snapshot(gid uuid,invite text) returns jsonb language plpgsql as $$
declare r arena.rooms;v jsonb;s jsonb;
begin perform arena.require_guest(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() and status<>'closed' for update;
if not found then raise exception 'Room not found or expired. Check the code.';end if;
if not exists(select 1 from arena.members where room_id=r.id and guest_id=gid) then raise exception 'Join this room before viewing it.';end if;
if r.status='locked' and clock_timestamp()>r.locked_at+interval '5 seconds' then perform arena.resolve_round(r.id,false,'Five-second answer window expired');end if;
s=arena.room_state(gid,invite);
select jsonb_build_object('audio',audio,'mime',mime,'transcript',transcript,'needs_review',needs_review,'timely',timely) into v from arena.voice_answers where room_id=r.id and run=r.run and question_index=r.current_index;
select jsonb_set(s,'{members}',coalesce(jsonb_agg(entry||jsonb_build_object('team',m.team)),'[]'::jsonb)) into s from jsonb_array_elements(s->'members') entry join arena.members m on m.room_id=r.id and m.guest_id=(entry->>'id')::uuid;
return s||jsonb_build_object('voice',v,'armed',r.armed,'reading_started_at',r.reading_started_at,'read_until',r.read_until);end $$;
create function arena.assign_team(gid uuid,invite text,member_id uuid,side text) returns void language plpgsql as $$
declare r arena.rooms;
begin perform arena.limit_action(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
if not found or r.host_id<>gid then raise exception 'Only the host can assign teams.';end if;
if r.status not in ('waiting','finished') then raise exception 'The round has started. Teams are locked.';end if;
if side not in ('A','B') or side is null or not exists(select 1 from arena.members where room_id=r.id and guest_id=member_id and role<>'spectator') then raise exception 'Choose a player and team.';end if;
update arena.members set team=side where room_id=r.id and guest_id=member_id;
update arena.rooms set version=version+1 where id=r.id;end $$;
revoke execute on all functions in schema arena from public;
