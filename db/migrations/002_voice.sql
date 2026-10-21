create or replace function arena.answer_room(gid uuid,invite text,question_index integer,response_text text) returns void language plpgsql as $$
declare r arena.rooms;q arena.questions;ok boolean;
begin perform arena.limit_action(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
 if not found or r.winner_id is distinct from gid or not exists(select 1 from arena.members where room_id=r.id and guest_id=gid and role='player') then raise exception 'Only the player who buzzed first can answer.';end if;
 if r.current_index<>question_index then raise exception 'The question has changed.';end if;
 if r.status='resolved' then return;end if;
 if r.status<>'locked' then raise exception 'Buzz in before answering.';end if;
 if response_text is null or length(response_text)>1000 then raise exception 'Answers must be at most 1000 characters.';end if;
 select * into q from arena.questions where id=r.question_ids[r.current_index];
 ok=length(trim(response_text))>0 and arena.normalize(response_text)=any(array(select arena.normalize(v) from unnest(array_prepend(q.answer,q.alternatives)) v));
 if clock_timestamp()>r.locked_at+interval '5 seconds' then ok=false;end if;
 perform arena.resolve_round(r.id,ok,response_text);
end $$;

create table arena.voice_answers(room_id uuid not null references arena.rooms,run integer not null,question_index integer not null,
audio text not null check(length(audio) between 1 and 180000),mime text not null check(mime in ('audio/webm','audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus','audio/ogg')),
transcript text not null check(length(transcript)<=1000),timely boolean not null,needs_review boolean not null,created_at timestamptz not null default now(),primary key(room_id,run,question_index));
create index on arena.voice_answers(created_at);
revoke all on arena.voice_answers from public;
create or replace function arena.judge_room(gid uuid,invite text,question_index integer,is_correct boolean) returns void language plpgsql as $$
declare r arena.rooms;
begin perform arena.limit_action(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
if not found or r.host_id<>gid then raise exception 'Only the moderator can judge an answer.';end if;
if r.current_index<>question_index or r.status<>'locked' then raise exception 'There is no active buzz to judge.';end if;
perform arena.resolve_round(r.id,is_correct and clock_timestamp()<=r.locked_at+interval '5 seconds','Moderator judgement');end $$;
create function arena.voice_room(gid uuid,invite text,question_index integer,response_text text,audio_text text,audio_mime text) returns void language plpgsql as $$
declare r arena.rooms;in_time boolean;
begin perform arena.require_guest(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
if not found or r.winner_id is distinct from gid then raise exception 'Only the player who buzzed first can answer.';end if;
if r.current_index<>question_index then raise exception 'The question has changed.';end if;
if r.status='resolved' then return;end if;
if r.status<>'locked' then raise exception 'Buzz in before answering.';end if;
if audio_text is null or length(audio_text) not between 1 and 180000 or audio_text !~ '^[A-Za-z0-9+/]*={0,2}$' or audio_mime is null or audio_mime not in ('audio/webm','audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus','audio/ogg') then raise exception 'Choose a supported audio recording.';end if;
in_time=clock_timestamp()<=r.locked_at+interval '5 seconds';
perform arena.answer_room(gid,invite,question_index,coalesce(response_text,''));
insert into arena.voice_answers(room_id,run,question_index,audio,mime,transcript,timely,needs_review)
values(r.id,r.run,r.current_index,audio_text,audio_mime,coalesce(response_text,''),in_time,in_time and not (select last_correct from arena.rooms where id=r.id));end $$;
create function arena.review_voice(gid uuid,invite text,expected_index integer,is_correct boolean) returns void language plpgsql as $$
declare r arena.rooms;old_points integer;new_points integer;
begin perform arena.limit_action(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
if not found or r.host_id<>gid then raise exception 'Only the moderator can review speech.';end if;
if r.current_index<>expected_index or r.status<>'resolved' or not exists(select 1 from arena.voice_answers where room_id=r.id and run=r.run and question_index=r.current_index and timely) then raise exception 'There is no timely spoken answer to review.';end if;
select points into old_points from arena.answers where room_id=r.id and run=r.run and question_index=r.current_index;
new_points=case when is_correct then r.correct_points else r.incorrect_points end;
update arena.answers set correct=is_correct,points=new_points where room_id=r.id and run=r.run and question_index=r.current_index;
update arena.members set score=score+new_points-old_points where room_id=r.id and guest_id=r.winner_id;
update arena.voice_answers set needs_review=false where room_id=r.id and run=r.run and question_index=r.current_index;
update arena.rooms set last_correct=is_correct,version=version+1 where id=r.id;end $$;
create function arena.room_snapshot(gid uuid,invite text) returns jsonb language plpgsql as $$
declare r arena.rooms;v jsonb;s jsonb;
begin perform arena.require_guest(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() and status<>'closed' for update;
if not found then raise exception 'Room not found or expired. Check the code.';end if;
if not exists(select 1 from arena.members where room_id=r.id and guest_id=gid) then raise exception 'Join this room before viewing it.';end if;
if r.status='locked' and clock_timestamp()>r.locked_at+interval '5 seconds' then perform arena.resolve_round(r.id,false,'Five-second answer window expired');end if;
s=arena.room_state(gid,invite);
select jsonb_build_object('audio',audio,'mime',mime,'transcript',transcript,'needs_review',needs_review,'timely',timely) into v from arena.voice_answers where room_id=r.id and run=r.run and question_index=r.current_index;
return s||jsonb_build_object('voice',v,'armed',r.armed);end $$;
revoke execute on all functions in schema arena from public;

alter table arena.rooms add column armed boolean not null default true;
alter table arena.rooms drop constraint rooms_seconds_per_question_check;
alter table arena.rooms add constraint rooms_seconds_per_question_check check(seconds_per_question between 3 and 120);
create function arena.arm_room(gid uuid,invite text,question_index integer) returns void language plpgsql as $$
declare r arena.rooms;
begin perform arena.limit_action(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
if not found or r.host_id<>gid then raise exception 'Only the moderator can open buzzers.';end if;
if r.status<>'open' or r.current_index<>question_index or r.armed then raise exception 'The buzzer has already opened or the question changed.';end if;
update arena.rooms set armed=true,opened_at=clock_timestamp(),version=version+1 where id=r.id;end $$;
revoke execute on function arena.arm_room(uuid,text,integer) from public;

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
end $$;
create or replace function arena.next_room(gid uuid,invite text,question_index integer) returns void language plpgsql as $$
declare r arena.rooms;
begin perform arena.limit_action(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
 if not found or r.host_id<>gid then raise exception 'Only the moderator can advance the room.';end if;
 if r.current_index<>question_index or r.status<>'resolved' then raise exception 'Resolve this question before advancing.';end if;
 if r.current_index=cardinality(r.question_ids) then update arena.rooms set status='finished',version=version+1 where id=r.id;
 else update arena.rooms set armed=false,current_index=current_index+1,status='open',winner_id=null,last_correct=null,last_response=null,opened_at=clock_timestamp(),locked_at=null,version=version+1 where id=r.id;end if;
end $$;
create or replace function arena.buzz_room(gid uuid,invite text,question_index integer) returns void language plpgsql as $$
declare r arena.rooms;
begin perform arena.limit_action(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
 if not found or not exists(select 1 from arena.members where room_id=r.id and guest_id=gid and role='player') then raise exception 'Only players in this room can buzz.';end if;
 if not r.armed then raise exception 'The buzzer is closed while the moderator reads.';end if;
 if r.current_index<>question_index or r.status<>'open' then raise exception 'The buzzer is already locked or the question has changed.';end if;
 if clock_timestamp()>r.opened_at+make_interval(secs=>r.seconds_per_question) then raise exception 'Time is up. Wait for the moderator.';end if;
 update arena.rooms set winner_id=gid,status='locked',locked_at=clock_timestamp(),version=version+1 where id=r.id;
end $$;
revoke execute on all functions in schema arena from public;
