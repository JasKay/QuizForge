alter table arena.rooms add column attempt integer not null default 1 check(attempt in (1,2));
alter table arena.rooms add column steal_team text check(steal_team in ('A','B'));
create table arena.room_attempts(room_id uuid not null references arena.rooms,run integer not null,question_index integer not null,attempt integer not null check(attempt in (1,2)),winner_id uuid references arena.guests,correct boolean not null,response text not null,points integer not null,primary key(room_id,run,question_index,attempt));
revoke all on arena.room_attempts from public;
insert into arena.room_attempts(room_id,run,question_index,attempt,winner_id,correct,response,points) select room_id,run,question_index,1,winner_id,correct,response,points from arena.answers;
alter table arena.voice_answers add column attempt integer not null default 1;
alter table arena.voice_answers drop constraint voice_answers_pkey;
alter table arena.voice_answers add primary key(room_id,run,question_index,attempt);
create function arena.can_steal(rid uuid) returns boolean language sql stable as $$ select exists(select 1 from arena.rooms r join arena.members first_player on first_player.room_id=r.id and first_player.guest_id=r.winner_id where r.id=rid and r.status='resolved' and r.attempt=1 and not r.last_correct and exists(select 1 from arena.members other where other.room_id=r.id and other.role<>'spectator' and other.team is distinct from first_player.team and other.team is not null)) $$;
create or replace function arena.prepare_reading(rid uuid) returns void language sql as $$
update arena.rooms r set armed=false,attempt=1,steal_team=null,reading_started_at=clock_timestamp()+interval '1 second',read_until=clock_timestamp()+interval '1 second'+make_interval(secs=>greatest(3,ceil(cardinality(regexp_split_to_array(trim(split_part(q.text,' Choices:',1)),E'\\s+'))/2.6)::integer)) from arena.questions q where r.id=rid and r.status='open' and q.id=r.question_ids[r.current_index]; $$;
create or replace function arena.resolve_round(rid uuid,is_correct boolean,response_text text) returns void language plpgsql as $$
declare r arena.rooms;awarded integer;
begin select * into r from arena.rooms where id=rid for update;if r.status not in ('open','locked') then raise exception 'This question has already been resolved.';end if;
 awarded=case when r.winner_id is null then 0 when is_correct then r.correct_points else r.incorrect_points end;
 insert into arena.answers(room_id,run,question_index,question_id,winner_id,correct,response,points) values(r.id,r.run,r.current_index,r.question_ids[r.current_index],r.winner_id,is_correct,coalesce(response_text,''),awarded);
 if r.winner_id is not null then update arena.members set score=score+awarded where room_id=r.id and guest_id=r.winner_id;end if;
 update arena.rooms set status='resolved',last_correct=is_correct,last_response=coalesce(response_text,''),version=version+1 where id=r.id;
insert into arena.room_attempts(room_id,run,question_index,attempt,winner_id,correct,response,points) values(r.id,r.run,r.current_index,r.attempt,r.winner_id,is_correct,coalesce(response_text,''),awarded);
end $$;
create or replace function arena.buzz_room(gid uuid,invite text,question_index integer) returns void language plpgsql as $$
declare r arena.rooms;
begin perform arena.limit_action(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
 if not found or not exists(select 1 from arena.members where room_id=r.id and guest_id=gid and role in ('player','moderator')) then raise exception 'Only players in this room can buzz.';end if;
 if r.attempt=2 and not exists(select 1 from arena.members where room_id=r.id and guest_id=gid and team=r.steal_team and role in ('player','moderator')) then raise exception 'Only the other team can buzz for this chance.';end if;
 if not r.armed then raise exception 'The buzzer is closed while the moderator reads.';end if;
 if r.current_index<>question_index or r.status<>'open' then raise exception 'The buzzer is already locked or the question has changed.';end if;
 if clock_timestamp()>r.opened_at+make_interval(secs=>r.seconds_per_question) then raise exception 'Time is up. Wait for the moderator.';end if;
 update arena.rooms set winner_id=gid,status='locked',locked_at=clock_timestamp(),version=version+1 where id=r.id;
end $$;
create function arena.steal_room(gid uuid,invite text,expected_index integer) returns void language plpgsql as $$
declare r arena.rooms;target text;
begin perform arena.limit_action(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
if not found or r.host_id<>gid then raise exception 'Only the host can pass the question.';end if;
if r.current_index<>expected_index or not arena.can_steal(r.id) then raise exception 'There is no second chance to open.';end if;
select case when team='A' then 'B' else 'A' end into target from arena.members where room_id=r.id and guest_id=r.winner_id;
-- The first answer remains in room_attempts; answers holds the final outcome for each question.
delete from arena.answers where room_id=r.id and run=r.run and question_index=r.current_index;
update arena.rooms set attempt=2,steal_team=target,status='open',armed=true,winner_id=null,last_correct=null,last_response=null,locked_at=null,opened_at=clock_timestamp(),version=version+1 where id=r.id;
end $$;
create or replace function arena.next_room(gid uuid,invite text,question_index integer) returns void language plpgsql as $$
declare r arena.rooms;
begin perform arena.limit_action(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
 if not found or r.host_id<>gid then raise exception 'Only the moderator can advance the room.';end if;
 if r.current_index<>question_index or r.status<>'resolved' then raise exception 'Resolve this question before advancing.';end if;
 if arena.can_steal(r.id) then raise exception 'The other team still has a chance to answer.';end if;
 if r.current_index=cardinality(r.question_ids) then update arena.rooms set status='finished',version=version+1 where id=r.id;
 else update arena.rooms set armed=false,current_index=current_index+1,status='open',winner_id=null,last_correct=null,last_response=null,opened_at=clock_timestamp(),locked_at=null,version=version+1 where id=r.id;end if;
perform arena.prepare_reading(r.id);
end $$;
create or replace function arena.voice_room(gid uuid,invite text,question_index integer,response_text text,audio_text text,audio_mime text) returns void language plpgsql as $$
declare r arena.rooms;in_time boolean;
begin perform arena.require_guest(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
if not found or r.winner_id is distinct from gid then raise exception 'Only the player who buzzed first can answer.';end if;
if r.current_index<>question_index then raise exception 'The question has changed.';end if;
if r.status='resolved' then return;end if;
if r.status<>'locked' then raise exception 'Buzz in before answering.';end if;
if audio_text is null or length(audio_text) not between 1 and 180000 or audio_text !~ '^[A-Za-z0-9+/]*={0,2}$' or audio_mime is null or audio_mime not in ('audio/webm','audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus','audio/ogg') then raise exception 'Choose a supported audio recording.';end if;
in_time=clock_timestamp()<=r.locked_at+interval '5 seconds';
perform arena.answer_room(gid,invite,question_index,coalesce(response_text,''));
insert into arena.voice_answers(room_id,run,question_index,attempt,audio,mime,transcript,timely,needs_review)
values(r.id,r.run,r.current_index,r.attempt,audio_text,audio_mime,coalesce(response_text,''),in_time,in_time and not (select last_correct from arena.rooms where id=r.id));end $$;
create or replace function arena.review_voice(gid uuid,invite text,expected_index integer,is_correct boolean) returns void language plpgsql as $$
declare r arena.rooms;old_points integer;new_points integer;
begin perform arena.limit_action(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
if not found or r.host_id<>gid then raise exception 'Only the moderator can review speech.';end if;
if r.current_index<>expected_index or r.status<>'resolved' or not exists(select 1 from arena.voice_answers where room_id=r.id and run=r.run and question_index=r.current_index and attempt=r.attempt and timely) then raise exception 'There is no timely spoken answer to review.';end if;
select points into old_points from arena.answers where room_id=r.id and run=r.run and question_index=r.current_index;
new_points=case when is_correct then r.correct_points else r.incorrect_points end;
update arena.answers set correct=is_correct,points=new_points where room_id=r.id and run=r.run and question_index=r.current_index;
update arena.members set score=score+new_points-old_points where room_id=r.id and guest_id=r.winner_id;
update arena.voice_answers set needs_review=false where room_id=r.id and run=r.run and question_index=r.current_index and attempt=r.attempt;
update arena.rooms set last_correct=is_correct,version=version+1 where id=r.id;update arena.room_attempts set correct=is_correct,points=new_points where room_id=r.id and run=r.run and question_index=r.current_index and attempt=r.attempt;
end $$;
create or replace function arena.room_snapshot(gid uuid,invite text) returns jsonb language plpgsql as $$
declare r arena.rooms;v jsonb;s jsonb;
begin perform arena.require_guest(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() and status<>'closed' for update;
if not found then raise exception 'Room not found or expired. Check the code.';end if;
if not exists(select 1 from arena.members where room_id=r.id and guest_id=gid) then raise exception 'Join this room before viewing it.';end if;
if r.status='locked' and clock_timestamp()>r.locked_at+interval '5 seconds' then perform arena.resolve_round(r.id,false,'Five-second answer window expired');end if;
select * into r from arena.rooms where id=r.id;
s=arena.room_state(gid,invite);
select jsonb_build_object('audio',audio,'mime',mime,'transcript',transcript,'needs_review',needs_review,'timely',timely) into v from arena.voice_answers where room_id=r.id and run=r.run and question_index=r.current_index and attempt=r.attempt;
select jsonb_set(s,'{members}',coalesce(jsonb_agg(entry||jsonb_build_object('team',m.team)),'[]'::jsonb)) into s from jsonb_array_elements(s->'members') entry join arena.members m on m.room_id=r.id and m.guest_id=(entry->>'id')::uuid;
if arena.can_steal(r.id) then s=jsonb_set(s,'{result}',jsonb_build_object('correct',false,'response',r.last_response));end if;
return s||jsonb_build_object('attempt',r.attempt,'steal_available',arena.can_steal(r.id),'steal_team',case when arena.can_steal(r.id) then (select case when team='A' then 'B' else 'A' end from arena.members where room_id=r.id and guest_id=r.winner_id) else r.steal_team end,'outcome',(select jsonb_build_object('id',a.run||':'||a.question_index||':'||a.attempt||':'||a.correct,'correct',a.correct) from arena.room_attempts a where a.room_id=r.id and a.run=r.run and a.question_index=r.current_index and a.winner_id is not null order by a.attempt desc limit 1))||jsonb_build_object('voice',v,'armed',r.armed,'reading_started_at',r.reading_started_at,'read_until',r.read_until);end $$;
revoke execute on all functions in schema arena from public;