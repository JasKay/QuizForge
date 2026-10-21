-- Server-only Neon schema. DATABASE_URL never reaches the browser.
create schema if not exists arena;
create table arena.guests(id uuid primary key default gen_random_uuid(),token_hash text not null unique check(length(token_hash)=64),created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '7 days');
create table arena.questions(id uuid primary key,text text not null,answer text not null,alternatives text[] not null default '{}',explanation text not null,subject text not null,difficulty text not null,source text not null,review_status text not null default 'approved' check(review_status in ('approved','pending')));
create table arena.rooms(id uuid primary key default gen_random_uuid(),code text not null unique,host_id uuid not null references arena.guests,title text not null check(length(title) between 1 and 60),focus text,question_count integer not null check(question_count between 3 and 30),seconds_per_question integer not null check(seconds_per_question between 15 and 120),correct_points integer not null check(correct_points between 1 and 100),incorrect_points integer not null check(incorrect_points between -100 and 0),status text not null default 'waiting' check(status in ('waiting','open','locked','resolved','finished','closed')),question_ids uuid[] not null default '{}',current_index integer not null default 0,run integer not null default 0,winner_id uuid references arena.guests,opened_at timestamptz,locked_at timestamptz,last_correct boolean,last_response text,created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '24 hours',version integer not null default 0);
create table arena.members(room_id uuid not null references arena.rooms on delete cascade,guest_id uuid not null references arena.guests,display_name text not null check(length(display_name) between 1 and 32),role text not null check(role in ('moderator','player','spectator')),score integer not null default 0,joined_at timestamptz not null default now(),primary key(room_id,guest_id));
create table arena.answers(room_id uuid not null references arena.rooms,run integer not null,question_index integer not null,question_id uuid not null references arena.questions,winner_id uuid references arena.guests,correct boolean not null,response text not null,points integer not null,created_at timestamptz not null default now(),primary key(room_id,run,question_index));
create table arena.action_limits(guest_id uuid not null references arena.guests,created_at timestamptz not null default clock_timestamp());
create index on arena.action_limits(guest_id,created_at);
create index on arena.members(guest_id,room_id);
revoke all on schema arena from public;
revoke all on all tables in schema arena from public;
create function arena.normalize(value text) returns text language sql immutable as $$ select trim(regexp_replace(regexp_replace(lower(translate(value,'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖòóôõöÙÚÛÜùúûüÇçÑñ','AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn')),'[^a-z0-9 ]','','g'),'\s+',' ','g')) $$;
create function arena.require_guest(gid uuid) returns void language plpgsql as $$ begin if gid is null or not exists(select 1 from arena.guests where id=gid and expires_at>now()) then raise exception 'Your player session expired. Rejoin the room.';end if;end $$;
create function arena.limit_action(gid uuid) returns void language plpgsql as $$ begin perform arena.require_guest(gid);perform 1 from arena.guests where id=gid for update;if (select count(*) from arena.action_limits where guest_id=gid and created_at>clock_timestamp()-interval '1 minute')>=90 then raise exception 'Too many actions. Wait a moment.';end if;insert into arena.action_limits(guest_id) values(gid);delete from arena.action_limits where guest_id=gid and created_at<now()-interval '2 minutes';end $$;
create function arena.create_room(gid uuid,nickname text,room_title text,subject_focus text default null,question_total integer default 10,seconds integer default 30,correct_score integer default 10,incorrect_score integer default 0) returns text language plpgsql as $$
declare rid uuid;invite text;
begin perform arena.limit_action(gid);
 if length(trim(nickname)) not between 1 and 32 or nickname is null then raise exception 'Choose a player name (1–32 characters).';end if;
 if (select count(*) from arena.rooms where host_id=gid and expires_at>now() and status not in ('closed','finished'))>=5 then raise exception 'Finish or close an existing room first.';end if;
 if subject_focus is not null and not exists(select 1 from arena.questions where subject=subject_focus and review_status='approved') then raise exception 'That subject has no available questions.';end if;
 loop invite=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));exit when not exists(select 1 from arena.rooms where code=invite);end loop;
 insert into arena.rooms(code,host_id,title,focus,question_count,seconds_per_question,correct_points,incorrect_points) values(invite,gid,trim(room_title),subject_focus,question_total,seconds,correct_score,incorrect_score) returning id into rid;
 insert into arena.members(room_id,guest_id,display_name,role) values(rid,gid,trim(nickname),'moderator');return invite;
end $$;
create function arena.join_room(gid uuid,invite text,nickname text,watch boolean default false) returns text language plpgsql as $$
declare r arena.rooms;
begin perform arena.limit_action(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() and status<>'closed' for update;if not found then raise exception 'Room not found or expired. Check the code.';end if;
 if length(trim(nickname)) not between 1 and 32 or nickname is null then raise exception 'Choose a player name (1–32 characters).';end if;
 if not exists(select 1 from arena.members where room_id=r.id and guest_id=gid) then
 if (select count(*) from arena.members where room_id=r.id)>=32 then raise exception 'This room is full.';end if;
 if not watch and r.status<>'waiting' then raise exception 'The round has started. Join as a viewer.';end if;
 end if;
 insert into arena.members(room_id,guest_id,display_name,role) values(r.id,gid,trim(nickname),case when watch then 'spectator' else 'player' end) on conflict(room_id,guest_id) do update set display_name=excluded.display_name;
 update arena.rooms set version=version+1 where id=r.id;return r.code;
end $$;
create function arena.room_state(gid uuid,invite text) returns jsonb language plpgsql stable as $$
declare r arena.rooms; q arena.questions;my_role text;members_json jsonb;result_json jsonb;review_json jsonb;
begin perform arena.require_guest(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() and status<>'closed';if not found then raise exception 'Room not found or expired. Check the code.';end if;
 select role into my_role from arena.members where room_id=r.id and guest_id=gid;if not found then raise exception 'Join this room before viewing it.';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',guest_id,'name',display_name,'role',role,'score',score) order by score desc,joined_at),'[]'::jsonb) into members_json from arena.members where room_id=r.id;
 if r.current_index>0 then select * into q from arena.questions where id=r.question_ids[r.current_index];end if;
 if r.status in ('resolved','finished') then result_json=jsonb_build_object('answer',q.answer,'explanation',q.explanation,'source',q.source,'correct',r.last_correct,'response',r.last_response);end if;
 if r.status='finished' then select coalesce(jsonb_agg(jsonb_build_object('question',qq.text,'subject',qq.subject,'answer',qq.answer,'explanation',qq.explanation,'source',qq.source,'correct',a.correct,'points',a.points) order by a.question_index),'[]'::jsonb) into review_json from arena.answers a join arena.questions qq on qq.id=a.question_id where a.room_id=r.id and a.run=r.run;end if;
 return jsonb_build_object('id',r.id,'code',r.code,'title',r.title,'status',r.status,'index',r.current_index,'total',cardinality(r.question_ids),'focus',r.focus,'seconds',r.seconds_per_question,'correct_points',r.correct_points,'incorrect_points',r.incorrect_points,'winner',r.winner_id,'opened_at',r.opened_at,'locked_at',r.locked_at,'version',r.version,'server_time',now(),'me',gid,'my_role',my_role,'members',members_json,'question',case when q.id is not null then jsonb_build_object('id',q.id,'text',q.text,'subject',q.subject,'difficulty',q.difficulty) else null end,'result',result_json,'review',review_json);
end $$;
create function arena.start_room(gid uuid,invite text) returns void language plpgsql as $$
declare r arena.rooms;ids uuid[];
begin perform arena.limit_action(gid);select * into r from arena.rooms where code=upper(invite) for update;
 if not found or r.expires_at<now() or r.host_id<>gid then raise exception 'Only the moderator can start this room.';end if;
 if r.status not in ('waiting','finished') then raise exception 'This round has already started.';end if;
 if not exists(select 1 from arena.members where room_id=r.id and role='player') then raise exception 'Invite at least one player before starting.';end if;
 select array_agg(id) into ids from(select id from arena.questions where review_status='approved' and (r.focus is null or subject=r.focus) order by random() limit r.question_count) q;
 if coalesce(cardinality(ids),0)=0 then raise exception 'No questions are available.';end if;
 update arena.members set score=0 where room_id=r.id;
 update arena.rooms set question_ids=ids,current_index=1,run=run+1,status='open',opened_at=clock_timestamp(),locked_at=null,winner_id=null,last_correct=null,last_response=null,version=version+1 where id=r.id;
end $$;
create function arena.buzz_room(gid uuid,invite text,question_index integer) returns void language plpgsql as $$
declare r arena.rooms;
begin perform arena.limit_action(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
 if not found or not exists(select 1 from arena.members where room_id=r.id and guest_id=gid and role='player') then raise exception 'Only players in this room can buzz.';end if;
 if r.current_index<>question_index or r.status<>'open' then raise exception 'The buzzer is already locked or the question has changed.';end if;
 if clock_timestamp()>r.opened_at+make_interval(secs=>r.seconds_per_question) then raise exception 'Time is up. Wait for the moderator.';end if;
 update arena.rooms set winner_id=gid,status='locked',locked_at=clock_timestamp(),version=version+1 where id=r.id;
end $$;create function arena.resolve_round(rid uuid,is_correct boolean,response_text text) returns void language plpgsql as $$
declare r arena.rooms;awarded integer;
begin select * into r from arena.rooms where id=rid for update;if r.status not in ('open','locked') then raise exception 'This question has already been resolved.';end if;
 awarded=case when r.winner_id is null then 0 when is_correct then r.correct_points else r.incorrect_points end;
 insert into arena.answers(room_id,run,question_index,question_id,winner_id,correct,response,points) values(r.id,r.run,r.current_index,r.question_ids[r.current_index],r.winner_id,is_correct,coalesce(response_text,''),awarded);
 if r.winner_id is not null then update arena.members set score=score+awarded where room_id=r.id and guest_id=r.winner_id;end if;
 update arena.rooms set status='resolved',last_correct=is_correct,last_response=coalesce(response_text,''),version=version+1 where id=r.id;
end $$;
create function arena.answer_room(gid uuid,invite text,question_index integer,response_text text) returns void language plpgsql as $$
declare r arena.rooms;q arena.questions;ok boolean;
begin perform arena.limit_action(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
 if not found or r.winner_id is distinct from gid or not exists(select 1 from arena.members where room_id=r.id and guest_id=gid and role='player') then raise exception 'Only the player who buzzed first can answer.';end if;
 if r.current_index<>question_index then raise exception 'The question has changed.';end if;
 if r.status='resolved' then return;end if;
 if r.status<>'locked' then raise exception 'Buzz in before answering.';end if;
 if response_text is null or length(response_text)>1000 then raise exception 'Answers must be at most 1000 characters.';end if;
 select * into q from arena.questions where id=r.question_ids[r.current_index];
 ok=length(trim(response_text))>0 and arena.normalize(response_text)=any(array(select arena.normalize(v) from unnest(array_prepend(q.answer,q.alternatives)) v));
 if clock_timestamp()>r.locked_at+interval '15 seconds' then ok=false;end if;
 perform arena.resolve_round(r.id,ok,response_text);
end $$;
create function arena.judge_room(gid uuid,invite text,question_index integer,is_correct boolean) returns void language plpgsql as $$
declare r arena.rooms;
begin perform arena.limit_action(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
 if not found or r.host_id<>gid then raise exception 'Only the moderator can judge an answer.';end if;
 if r.current_index<>question_index or r.status<>'locked' then raise exception 'There is no active buzz to judge.';end if;
 perform arena.resolve_round(r.id,is_correct,'Moderator judgement');
end $$;
create function arena.reveal_room(gid uuid,invite text,question_index integer) returns void language plpgsql as $$
declare r arena.rooms;
begin perform arena.limit_action(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
 if not found or r.host_id<>gid then raise exception 'Only the moderator can reveal an answer.';end if;
 if r.current_index<>question_index or r.status not in ('open','locked') then raise exception 'This question has already been resolved.';end if;
 perform arena.resolve_round(r.id,false,'Revealed by moderator');
end $$;
create function arena.next_room(gid uuid,invite text,question_index integer) returns void language plpgsql as $$
declare r arena.rooms;
begin perform arena.limit_action(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
 if not found or r.host_id<>gid then raise exception 'Only the moderator can advance the room.';end if;
 if r.current_index<>question_index or r.status<>'resolved' then raise exception 'Resolve this question before advancing.';end if;
 if r.current_index=cardinality(r.question_ids) then update arena.rooms set status='finished',version=version+1 where id=r.id;
 else update arena.rooms set current_index=current_index+1,status='open',winner_id=null,last_correct=null,last_response=null,opened_at=clock_timestamp(),locked_at=null,version=version+1 where id=r.id;end if;
end $$;
create function arena.leave_room(gid uuid,invite text) returns void language plpgsql as $$
declare r arena.rooms;
begin perform arena.limit_action(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
 if not found or not exists(select 1 from arena.members where room_id=r.id and guest_id=gid) then raise exception 'Join this room before viewing it.';end if;
 if r.host_id=gid then update arena.rooms set status='closed',version=version+1 where id=r.id;return;end if;
 if r.winner_id=gid and r.status='locked' then perform arena.resolve_round(r.id,false,'Player left the room');end if;
 -- Keep past scores attached to the player; a returning player rejoins as a viewer.
 update arena.members set role='spectator' where room_id=r.id and guest_id=gid;
 update arena.rooms set version=version+1 where id=r.id;
end $$;
revoke execute on all functions in schema arena from public;