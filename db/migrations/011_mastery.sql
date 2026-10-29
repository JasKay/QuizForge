create table buzzer.mastery_events (
  user_id text not null references public.buzzer_user(id) on delete cascade,
  event_id text not null check(length(event_id) <= 160),
  question_id text not null,
  correct boolean not null,
  source text not null check(source in ('learn','review','play','ultimate','room','legacy')),
  happened_at timestamptz not null default now(),
  primary key(user_id,event_id)
);
create index on buzzer.mastery_events(user_id,happened_at);
-- Existing history is a last-observed baseline; do not invent historical attempts.
insert into buzzer.mastery_events(user_id,event_id,question_id,correct,source,happened_at)
select user_id,'legacy:'||question_id,question_id,last_correct,'legacy',updated_at from buzzer.progress;

create function buzzer.record_attempt(uid text,eid text,qid text,ok boolean,origin text,at_time timestamptz default now())
returns boolean language plpgsql as $$
declare inserted integer;
begin
 insert into buzzer.mastery_events(user_id,event_id,question_id,correct,source,happened_at)
 values(uid,eid,qid,ok,origin,least(now(),at_time)) on conflict do nothing;
 get diagnostics inserted = row_count;
 if inserted=0 then return false; end if;
 insert into buzzer.progress(user_id,question_id,attempts,correct,last_correct,due_at,updated_at)
 values(uid,qid,1,case when ok then 1 else 0 end,ok,at_time+case when ok then interval '1 day' else interval '0 minutes' end,at_time)
 on conflict(user_id,question_id) do update set
 attempts=buzzer.progress.attempts+1,correct=buzzer.progress.correct+excluded.correct,
 last_correct=case when excluded.updated_at>=buzzer.progress.updated_at then excluded.last_correct else buzzer.progress.last_correct end,
 due_at=case when excluded.updated_at>=buzzer.progress.updated_at then excluded.due_at else buzzer.progress.due_at end,
 updated_at=greatest(buzzer.progress.updated_at,excluded.updated_at);
 return true;
end $$;

-- Room outcomes are recorded inside the scoring transaction; corrections update
-- the same evidence instead of granting another attempt or more XP.
create function buzzer.room_mastery() returns trigger language plpgsql as $$
declare uid text; qid text;
begin
 select m.account_user_id,q.id::text into uid,qid from arena.members m
 join arena.rooms r on r.id=m.room_id
 join arena.questions q on q.id=r.question_ids[new.question_index]
 where m.room_id=new.room_id and m.guest_id=new.winner_id;
 if uid is not null then
   if tg_op='INSERT' then
     perform buzzer.record_attempt(uid,'room:'||new.room_id||':'||new.run||':'||new.question_index||':'||new.attempt,qid,new.correct,'room');
   else
     update buzzer.mastery_events set correct=new.correct where user_id=uid and event_id='room:'||new.room_id||':'||new.run||':'||new.question_index||':'||new.attempt;
     update buzzer.progress p set correct=greatest(0,p.correct+(case when new.correct then 1 else 0 end)-(case when old.correct then 1 else 0 end)),
       last_correct=case when p.updated_at<=e.happened_at then new.correct else p.last_correct end,
       due_at=case when p.updated_at<=e.happened_at then now()+case when new.correct then interval '1 day' else interval '0 minutes' end else p.due_at end
     from buzzer.mastery_events e where p.user_id=uid and p.question_id=qid and e.user_id=uid and e.event_id='room:'||new.room_id||':'||new.run||':'||new.question_index||':'||new.attempt;
   end if;
 end if;
 return new;
end $$;
create trigger record_room_mastery after insert or update of correct on arena.room_attempts
 for each row execute function buzzer.room_mastery();

create table buzzer.cheers (
 team_id uuid not null references buzzer.teams(id) on delete cascade,
 from_user text not null references public.buzzer_user(id) on delete cascade,
 to_user text not null references public.buzzer_user(id) on delete cascade,
 day date not null default current_date,
 primary key(team_id,from_user,to_user,day), check(from_user<>to_user)
);
revoke all on all tables in schema buzzer from public;
revoke all on all functions in schema buzzer from public;
