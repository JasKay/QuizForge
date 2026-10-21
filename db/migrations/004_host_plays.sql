-- A host retains room controls and competes under the same lockout and answer deadline.
create or replace function arena.buzz_room(gid uuid,invite text,question_index integer) returns void language plpgsql as $$
declare r arena.rooms;
begin perform arena.limit_action(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
 if not found or not exists(select 1 from arena.members where room_id=r.id and guest_id=gid and role in ('player','moderator')) then raise exception 'Only players in this room can buzz.';end if;
 if not r.armed then raise exception 'The buzzer is closed while the moderator reads.';end if;
 if r.current_index<>question_index or r.status<>'open' then raise exception 'The buzzer is already locked or the question has changed.';end if;
 if clock_timestamp()>r.opened_at+make_interval(secs=>r.seconds_per_question) then raise exception 'Time is up. Wait for the moderator.';end if;
 update arena.rooms set winner_id=gid,status='locked',locked_at=clock_timestamp(),version=version+1 where id=r.id;
end $$;
create or replace function arena.answer_room(gid uuid,invite text,question_index integer,response_text text) returns void language plpgsql as $$
declare r arena.rooms;q arena.questions;ok boolean;
begin perform arena.limit_action(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
 if not found or r.winner_id is distinct from gid or not exists(select 1 from arena.members where room_id=r.id and guest_id=gid and role in ('player','moderator')) then raise exception 'Only the player who buzzed first can answer.';end if;
 if r.current_index<>question_index then raise exception 'The question has changed.';end if;
 if r.status='resolved' then return;end if;
 if r.status<>'locked' then raise exception 'Buzz in before answering.';end if;
 if response_text is null or length(response_text)>1000 then raise exception 'Answers must be at most 1000 characters.';end if;
 select * into q from arena.questions where id=r.question_ids[r.current_index];
 ok=length(trim(response_text))>0 and arena.normalize(response_text)=any(array(select arena.normalize(v) from unnest(array_prepend(q.answer,q.alternatives)) v));
 if clock_timestamp()>r.locked_at+interval '5 seconds' then ok=false;end if;
 perform arena.resolve_round(r.id,ok,response_text);
end $$;
revoke execute on all functions in schema arena from public;
