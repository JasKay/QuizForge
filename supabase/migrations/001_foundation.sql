-- Phase 1: all writes that affect scoring run inside authenticated database functions.
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default 'Learner' check(length(display_name) between 1 and 80),
 role text not null default 'student' check(role in ('student','coach','moderator','admin')),
 daily_goal integer not null default 10 check(daily_goal between 1 and 100)
);
create function public.create_profile() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,display_name) values(new.id,left(coalesce(nullif(new.raw_user_meta_data->>'display_name',''),'Learner'),80));return new;end $$;
create trigger on_user_created after insert on auth.users for each row execute function public.create_profile();
create table public.questions (
 id uuid primary key default gen_random_uuid(), text text not null check(length(text) between 5 and 5000),
 answer text not null check(length(answer) between 1 and 1000), alternatives text[] not null default '{}',
 explanation text not null check(length(explanation) between 5 and 5000),
 subject text not null check(subject in ('History','Literature','Science','Mathematics','Geography','Sports','African American History','Arts','General Knowledge')),
 subcategory text not null, difficulty text not null check(difficulty in ('Easy','Medium','Hard')),
 source text not null check(source like 'https://%'), tags text[] not null default '{}',
 format text not null default 'short_answer' check(format='short_answer'),
 review_status text not null default 'pending' check(review_status in ('pending','approved','demo'))
);
create table public.practice_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade,
 question_ids uuid[] not null, current_index integer not null default 1,
 timed boolean not null default false, mode text not null check(mode in ('normal','daily','review')),
 status text not null default 'active' check(status in ('active','answered','completed')),
 started_at timestamptz not null default clock_timestamp(), question_started_at timestamptz not null default clock_timestamp(),
 completed_at timestamptz
);
create table public.attempts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade,
 session_id uuid not null references public.practice_sessions on delete cascade,
 question_id uuid not null references public.questions, correct boolean not null,
 elapsed_ms integer not null check(elapsed_ms>=0), answer text not null, subject text not null,
 created_at timestamptz not null default clock_timestamp(), unique(session_id,question_id)
);
create index on public.attempts(user_id,created_at desc);
alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.attempts enable row level security;
revoke all on public.profiles,public.questions,public.practice_sessions,public.attempts from public,anon,authenticated;
grant select on public.profiles,public.practice_sessions,public.attempts to authenticated;
grant update(display_name,daily_goal) on public.profiles to authenticated;
create policy own_profile_read on public.profiles for select to authenticated using(id=auth.uid());
create policy own_profile_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy own_sessions on public.practice_sessions for select to authenticated using(user_id=auth.uid());
create policy own_attempts on public.attempts for select to authenticated using(user_id=auth.uid());
-- This view intentionally excludes answer, alternatives, explanation and source.
-- It is owner-executed so base-table answer access remains entirely revoked.
create view public.question_bank as select id,text,subject,subcategory,difficulty,tags,format,review_status from public.questions where review_status in ('approved','demo');
revoke all on public.question_bank from public,anon,authenticated;
grant select on public.question_bank to authenticated;
create function public.normalize_answer(value text) returns text language sql immutable set search_path=public as $$
 select trim(regexp_replace(regexp_replace(lower(translate(value,'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖòóôõöÙÚÛÜùúûüÇçÑñ','AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn')),'[^a-z0-9 ]','','g'),'\s+',' ','g'))
$$;
create function public.start_practice(question_ids uuid[],is_timed boolean default false,practice_mode text default 'normal') returns uuid language plpgsql security definer set search_path=public as $$
declare sid uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if coalesce(cardinality(question_ids),0) not between 1 and 50 or practice_mode not in ('normal','daily','review') then raise exception 'Invalid practice configuration';end if;
 if (select count(distinct q.id) from public.questions q where q.id=any(question_ids) and q.review_status in ('approved','demo'))<>cardinality(question_ids) then raise exception 'Invalid or duplicate question';end if;
 insert into public.practice_sessions(user_id,question_ids,timed,mode) values(auth.uid(),question_ids,is_timed,practice_mode) returning id into sid;return sid;
end $$;
create function public.answer_result(q public.questions,a public.attempts) returns jsonb language sql stable set search_path=public as $$
 select jsonb_build_object('result',jsonb_build_object('correct',a.correct,'answer',q.answer,'explanation',q.explanation,'source',q.source),'attempt',to_jsonb(a))
$$;
create function public.submit_answer(practice_id uuid,question_id uuid,response text) returns jsonb language plpgsql security definer set search_path=public as $$
declare s public.practice_sessions; q public.questions; a public.attempts; elapsed integer; ok boolean;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if response is null or length(response)>1000 then raise exception 'Answer must be at most 1000 characters';end if;
 select * into s from public.practice_sessions where id=practice_id and user_id=auth.uid() for update;
 if not found then raise exception 'Session not found';end if;
 select * into a from public.attempts t where t.session_id=practice_id and t.question_id=submit_answer.question_id;
 select * into q from public.questions where id=submit_answer.question_id;
 if a.id is not null then return public.answer_result(q,a);end if;
 if s.status<>'active' or s.question_ids[s.current_index]<>question_id then raise exception 'Question is not active';end if;
 elapsed=least(2147483647,greatest(0,floor(extract(epoch from (clock_timestamp()-s.question_started_at))*1000)))::integer;
 ok=length(trim(response))>0 and public.normalize_answer(response)=any(array(select public.normalize_answer(v) from unnest(array_prepend(q.answer,q.alternatives)) v));
 if s.timed and elapsed>30000 then ok=false;end if;
 insert into public.attempts(user_id,session_id,question_id,correct,elapsed_ms,answer,subject) values(auth.uid(),s.id,q.id,ok,elapsed,response,q.subject) returning * into a;
 update public.practice_sessions set status=case when current_index=cardinality(question_ids) then 'completed' else 'answered' end,completed_at=case when current_index=cardinality(question_ids) then clock_timestamp() else null end where id=s.id;
 return public.answer_result(q,a);
end $$;
create function public.advance_practice(practice_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare s public.practice_sessions;
begin
 select * into s from public.practice_sessions where id=practice_id and user_id=auth.uid() for update;
 if not found or s.status<>'answered' then raise exception 'Session cannot advance';end if;
 update public.practice_sessions set current_index=current_index+1,status='active',question_started_at=clock_timestamp() where id=s.id;
end $$;
create function public.review_answer(question_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare q public.questions;
begin
 if not exists(select 1 from public.attempts a where a.user_id=auth.uid() and a.question_id=review_answer.question_id) then raise exception 'Answer a question before reviewing it';end if;
 select * into q from public.questions where id=question_id;
 return jsonb_build_object('correct',false,'answer',q.answer,'explanation',q.explanation,'source',q.source);
end $$;
create function public.import_questions(items jsonb) returns integer language plpgsql security definer set search_path=public as $$
declare item jsonb; n integer;
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Administrator access required';end if;
 if jsonb_typeof(items)<>'array' or jsonb_array_length(items) not between 1 and 500 then raise exception 'Import 1 to 500 questions';end if;
 n=jsonb_array_length(items);
 for item in select * from jsonb_array_elements(items) loop
 insert into public.questions(text,answer,alternatives,explanation,subject,subcategory,difficulty,source,tags,review_status)
 values(item->>'text',item->>'answer',array(select jsonb_array_elements_text(coalesce(item->'alternatives','[]'::jsonb))),item->>'explanation',item->>'subject',coalesce(item->>'subcategory',item->>'subject'),item->>'difficulty',item->>'source',array(select jsonb_array_elements_text(coalesce(item->'tags','[]'::jsonb))),'pending');
 end loop;return n;
end $$;
revoke execute on function public.create_profile(),public.normalize_answer(text),public.answer_result(public.questions,public.attempts),public.start_practice(uuid[],boolean,text),public.submit_answer(uuid,uuid,text),public.advance_practice(uuid),public.review_answer(uuid),public.import_questions(jsonb) from public,anon,authenticated;
grant execute on function public.start_practice(uuid[],boolean,text),public.submit_answer(uuid,uuid,text),public.advance_practice(uuid),public.review_answer(uuid),public.import_questions(jsonb) to authenticated;