alter table arena.rooms add column reading_started_at timestamptz;
alter table arena.rooms add column read_until timestamptz;
create function arena.prepare_reading(rid uuid) returns void language sql as $$
update arena.rooms r set armed=false,reading_started_at=clock_timestamp()+interval '1 second',
read_until=clock_timestamp()+interval '1 second'+make_interval(secs=>greatest(3,ceil(cardinality(regexp_split_to_array(trim(split_part(q.text,' Choices:',1)),E'\\s+'))/2.6)::integer))
from arena.questions q where r.id=rid and r.status='open' and q.id=r.question_ids[r.current_index]; $$;
create or replace function arena.start_room(gid uuid,invite text) returns void language plpgsql as $$
declare r arena.rooms;ids uuid[];
begin perform arena.limit_action(gid);select * into r from arena.rooms where code=upper(invite) for update;
 if not found or r.expires_at<now() or r.host_id<>gid then raise exception 'Only the moderator can start this room.';end if;
 if r.status not in ('waiting','finished') then raise exception 'This round has already started.';end if;
 if not exists(select 1 from arena.members where room_id=r.id and role='player') then raise exception 'Invite at least one player before starting.';end if;
 select array_agg(id) into ids from(select id from arena.questions where review_status='approved' and (r.focus is null or subject=r.focus) order by exists(select 1 from arena.answers a where a.room_id=r.id and a.question_id=arena.questions.id),random() limit r.question_count) q;
 if coalesce(cardinality(ids),0)=0 then raise exception 'No questions are available.';end if;
 update arena.members set score=0 where room_id=r.id;
 update arena.rooms set armed=false,question_ids=ids,current_index=1,run=run+1,status='open',opened_at=clock_timestamp(),locked_at=null,winner_id=null,last_correct=null,last_response=null,version=version+1 where id=r.id;
perform arena.prepare_reading(r.id);
end $$;
create or replace function arena.next_room(gid uuid,invite text,question_index integer) returns void language plpgsql as $$
declare r arena.rooms;
begin perform arena.limit_action(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
 if not found or r.host_id<>gid then raise exception 'Only the moderator can advance the room.';end if;
 if r.current_index<>question_index or r.status<>'resolved' then raise exception 'Resolve this question before advancing.';end if;
 if r.current_index=cardinality(r.question_ids) then update arena.rooms set status='finished',version=version+1 where id=r.id;
 else update arena.rooms set armed=false,current_index=current_index+1,status='open',winner_id=null,last_correct=null,last_response=null,opened_at=clock_timestamp(),locked_at=null,version=version+1 where id=r.id;end if;
perform arena.prepare_reading(r.id);
end $$;
create or replace function arena.arm_room(gid uuid,invite text,question_index integer) returns void language plpgsql as $$
declare r arena.rooms;
begin perform arena.limit_action(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
if not found or r.host_id<>gid then raise exception 'Only the moderator can open buzzers.';end if;
if r.status<>'open' or r.current_index<>question_index or r.armed then raise exception 'The buzzer has already opened or the question changed.';end if;
if r.read_until is not null and clock_timestamp()<r.read_until then raise exception 'The question is still being read.';end if;
update arena.rooms set armed=true,opened_at=clock_timestamp(),version=version+1 where id=r.id;end $$;
create or replace function arena.room_snapshot(gid uuid,invite text) returns jsonb language plpgsql as $$
declare r arena.rooms;v jsonb;s jsonb;
begin perform arena.require_guest(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() and status<>'closed' for update;
if not found then raise exception 'Room not found or expired. Check the code.';end if;
if not exists(select 1 from arena.members where room_id=r.id and guest_id=gid) then raise exception 'Join this room before viewing it.';end if;
if r.status='locked' and clock_timestamp()>r.locked_at+interval '5 seconds' then perform arena.resolve_round(r.id,false,'Five-second answer window expired');end if;
s=arena.room_state(gid,invite);
select jsonb_build_object('audio',audio,'mime',mime,'transcript',transcript,'needs_review',needs_review,'timely',timely) into v from arena.voice_answers where room_id=r.id and run=r.run and question_index=r.current_index;
return s||jsonb_build_object('voice',v,'armed',r.armed,'reading_started_at',r.reading_started_at,'read_until',r.read_until);end $$;
revoke execute on all functions in schema arena from public;
