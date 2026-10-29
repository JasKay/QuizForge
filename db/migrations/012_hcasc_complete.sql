-- Complete the Face-Off/Bonus/Ultimate practice lifecycle.
alter table arena.hcasc_board add column bonus_id uuid references arena.questions;
alter table arena.rooms drop constraint rooms_round_number_check;
alter table arena.rooms add constraint rooms_round_number_check check(round_number between 1 and 4);
alter table arena.rooms drop constraint rooms_hcasc_phase_check;
alter table arena.rooms add constraint rooms_hcasc_phase_check check(hcasc_phase in ('classic','pick','question','ultimate_pick','ultimate','finished'));
alter table arena.rooms add column question_kind text not null default 'faceoff',
 add column bonus_team text, add column ultimate_team text,
 add column ultimate_queue uuid[] not null default '{}', add column ultimate_done uuid[] not null default '{}',
 add column ultimate_turn integer not null default 0, add column ultimate_sequence integer not null default 0,
 add column ultimate_feedback jsonb, add column sudden_death boolean not null default false;
create table arena.ultimate_packs(id text primary key,title text not null,description text not null,question_ids uuid[] not null check(cardinality(question_ids)=10));
create table arena.hcasc_final(room_id uuid references arena.rooms on delete cascade,pack_id text references arena.ultimate_packs,selected_by text,primary key(room_id,pack_id));

create or replace function arena.prepare_reading(rid uuid) returns void language sql as $$
update arena.rooms r set armed=false,attempt=1,steal_team=null,reading_started_at=clock_timestamp(),
read_until=clock_timestamp()+make_interval(secs=>greatest(3,ceil(cardinality(regexp_split_to_array(trim(split_part(q.text,' Choices:',1)),E'\\s+'))/2.6)::integer))
from arena.questions q where r.id=rid and r.status='open' and q.id=r.question_ids[r.current_index]; $$;

-- Stable per-round representatives; small practice rosters reuse their players.
create function arena.faceoff_player(rid uuid,side text) returns uuid language sql stable as $$
 select m.guest_id from arena.members m join arena.rooms r on r.id=m.room_id
 where m.room_id=rid and m.team=side and m.role<>'spectator'
 order by m.joined_at,m.guest_id offset ((select round_number-1 from arena.rooms where id=rid) % greatest(1,(select count(*)::integer from arena.members where room_id=rid and team=side and role<>'spectator'))) limit 1;
$$;
create or replace function arena.start_hcasc_room(gid uuid, invite text)
returns void language plpgsql as $$
declare
  r arena.rooms;
  round_value integer;
  category_value text;
  categories text[];
  all_categories text[];
begin
  perform arena.start_room(gid, invite);
  select * into r from arena.rooms where code = upper(invite) for update;
  if r.mode <> 'hcasc' then raise exception 'This is not an HCASC-style room.'; end if;

  if (select count(*) from (
    select subject from arena.questions
    where review_status = 'approved'
    group by subject having count(*) >= 6
  ) available) < 12 then
    raise exception 'No questions are available in twelve categories.';
  end if;

  select array_agg(subject) into all_categories
  from (
    select subject
    from arena.questions
    where review_status = 'approved'
    group by subject
    having count(*) >= 6
    order by random()
    limit 12
  ) chosen;
  delete from arena.hcasc_board where room_id = r.id and run = r.run;
  for round_value in 1..3 loop
    categories = all_categories[(round_value - 1) * 4 + 1 : round_value * 4];
    foreach category_value in array categories loop
      with pool as (select id,row_number() over(order by random()) n from (select id from arena.questions where review_status='approved' and subject=category_value order by random() limit 6) q)
      insert into arena.hcasc_board(room_id,run,round_number,category,slot,question_id,bonus_id)
      select r.id,r.run,round_value,category_value,a.n::integer,a.id,b.id from pool a join pool b on b.n=a.n+3 where a.n<=3;
    end loop;
  end loop;

  update arena.rooms set
    question_ids = '{}'::uuid[],
    current_index = 0,
    status = 'open',
    armed = false,
    round_number = 1,
    round_started_at = clock_timestamp(),
    round_ends_at = clock_timestamp() + interval '4 minutes',
    pick_team = case when random()<0.5 then 'A' else 'B' end,
    sudden_death=false,question_kind='faceoff',bonus_team=null,ultimate_team=null,ultimate_queue='{}',ultimate_done='{}',ultimate_turn=0,
    hcasc_phase = 'pick',
    winner_id = null,
    last_correct = null,
    last_response = null,
    reading_started_at = null,
    read_until = null,
    opened_at = null,
    locked_at = null,
    version = version + 1
  where id = r.id;
  delete from arena.hcasc_final where room_id=r.id;
  insert into arena.hcasc_final(room_id,pack_id) select r.id,id from arena.ultimate_packs order by random() limit 4;
  if (select count(*) from arena.hcasc_final where room_id=r.id)<4 then raise exception 'No questions available for four Ultimate themes. Run question seeding.'; end if;
end $$;

create or replace function arena.buzz_room(gid uuid, invite text, question_index integer)
returns void language plpgsql as $$
declare r arena.rooms;
begin
  perform arena.limit_action(gid);
  select * into r from arena.rooms where code = upper(invite) and expires_at > now() for update;
  if not found or not exists (
    select 1 from arena.members where room_id = r.id and guest_id = gid
      and role in ('player', 'moderator')
  ) then raise exception 'Only players in this room can buzz.'; end if;
  if r.mode = 'hcasc' and r.hcasc_phase <> 'question' then
    raise exception 'Choose a question from the active board.';
  end if;
  if r.mode='hcasc' and (r.question_kind<>'faceoff' or gid is distinct from arena.faceoff_player(r.id,(select team from arena.members where room_id=r.id and guest_id=gid))) then raise exception 'Only the round representative can buzz.'; end if;
  if r.attempt = 2 and not exists (
    select 1 from arena.members where room_id = r.id and guest_id = gid
      and team = r.steal_team and role in ('player', 'moderator')
  ) then raise exception 'Only the other team can buzz for this chance.'; end if;
  if not r.armed then raise exception 'The buzzer is closed while the moderator reads.'; end if;
  if r.current_index <> question_index or r.status <> 'open' then
    raise exception 'The buzzer is already locked or the question has changed.';
  end if;
  if clock_timestamp() > r.opened_at + make_interval(secs => case when r.mode='hcasc' then 3 else r.seconds_per_question end) then
    raise exception 'Time is up. Wait for the moderator.';
  end if;
  update arena.rooms set winner_id = gid, status = 'locked',
    locked_at = clock_timestamp(), version = version + 1 where id = r.id;
end $$;

create or replace function arena.answer_room(gid uuid, invite text, question_index integer, response_text text)
returns void language plpgsql as $$
declare r arena.rooms; q arena.questions; ok boolean;
begin
  perform arena.limit_action(gid);
  select * into r from arena.rooms where code = upper(invite) and expires_at > now() for update;
  if not found or r.winner_id is distinct from gid or not exists (
    select 1 from arena.members where room_id = r.id and guest_id = gid
      and role in ('player', 'moderator')
  ) then raise exception 'Only the player who buzzed first can answer.'; end if;
  if r.mode = 'hcasc' and r.hcasc_phase <> 'question' then
    raise exception 'Choose a question from the active board.';
  end if;
  if r.current_index <> question_index then raise exception 'The question has changed.'; end if;
  if r.status = 'resolved' then return; end if;
  if r.status <> 'locked' then raise exception 'Buzz in before answering.'; end if;
  if response_text is null or length(response_text) > 1000 then
    raise exception 'Answers must be at most 1000 characters.';
  end if;
  select * into q from arena.questions where id = r.question_ids[r.current_index];
  ok = length(trim(response_text)) > 0
    and arena.normalize(response_text) = any(
      array(select arena.normalize(value) from unnest(array_prepend(q.answer, q.alternatives)) value)
    );
  if clock_timestamp() > r.locked_at + interval '5 seconds' then ok = false; end if;
  perform arena.resolve_round(r.id, ok, response_text);
end $$;

create or replace function arena.reveal_room(gid uuid, invite text, question_index integer)
returns void language plpgsql as $$
declare r arena.rooms;
begin
  perform arena.limit_action(gid);
  select * into r from arena.rooms where code = upper(invite) and expires_at > now() for update;
  if not found or r.host_id <> gid then raise exception 'Only the moderator can reveal an answer.'; end if;
  if r.mode = 'hcasc' and r.hcasc_phase <> 'question' then
    raise exception 'Choose a question from the active board.';
  end if;
  if r.current_index <> question_index or r.status not in ('open', 'locked') then
    raise exception 'This question has already been resolved.';
  end if;
  perform arena.resolve_round(r.id, false, 'Revealed by moderator');
end $$;


alter function arena.can_steal(uuid) rename to can_steal_before_bonus;
create function arena.can_steal(rid uuid) returns boolean language sql stable as $$
select arena.can_steal_before_bonus(rid) and not exists(select 1 from arena.rooms where id=rid and mode='hcasc' and question_kind='bonus'); $$;

create function arena.begin_tiebreak(rid uuid) returns void language plpgsql as $$
declare qid uuid;
begin
 select q.id into qid from arena.questions q where q.review_status='approved'
 order by exists(select 1 from arena.answers a where a.room_id=rid and a.question_id=q.id),random() limit 1;
 update arena.rooms set sudden_death=true,hcasc_phase='question',status='open',question_kind='faceoff',bonus_team=null,
 question_ids=array_append(question_ids,qid),current_index=cardinality(question_ids)+1,
 correct_points=10,winner_id=null,last_correct=null,last_response=null,round_ends_at=null,opened_at=clock_timestamp(),locked_at=null,version=version+1 where id=rid;
 perform arena.prepare_reading(rid);
end $$;

create or replace function arena.next_hcasc_question(gid uuid,invite text,question_index integer)
returns void language plpgsql as $$
declare r arena.rooms; bid uuid; side text;
begin
 perform arena.limit_action(gid);
 select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
 if not found or r.host_id<>gid then raise exception 'Only the host can advance the room.'; end if;
 if r.mode<>'hcasc' or r.hcasc_phase<>'question' or r.current_index<>question_index or r.status<>'resolved' then raise exception 'Resolve this question before advancing.';end if;
 if arena.can_steal(r.id) then raise exception 'The other team still has a chance to answer.';end if;
 if r.sudden_death then
   if r.last_correct then update arena.rooms set status='finished',hcasc_phase='finished',version=version+1 where id=r.id;
   else perform arena.begin_tiebreak(r.id);end if;return;
 end if;
 if r.question_kind='faceoff' and r.last_correct then
   select team into side from arena.members where room_id=r.id and guest_id=r.winner_id;
   select bonus_id into bid from arena.hcasc_board where room_id=r.id and run=r.run and question_id=r.question_ids[r.current_index];
   update arena.rooms set question_ids=array_append(question_ids,bid),current_index=cardinality(question_ids)+1,
    status='open',question_kind='bonus',bonus_team=side,pick_team=side,correct_points=20,
    winner_id=null,last_correct=null,last_response=null,locked_at=null,opened_at=clock_timestamp(),version=version+1 where id=r.id;
   perform arena.prepare_reading(r.id);
   return;
 end if;
 update arena.rooms set hcasc_phase='pick',status='open',question_kind='faceoff',bonus_team=null,correct_points=10,
  armed=false,winner_id=null,attempt=1,steal_team=null,reading_started_at=null,read_until=null,
  opened_at=null,locked_at=null,version=version+1 where id=r.id;
 perform arena.sync_hcasc_round(gid,invite);
end $$;

create function arena.answer_bonus(gid uuid,invite text,expected integer,response_text text)
returns void language plpgsql as $$
declare r arena.rooms;q arena.questions;ok boolean;
begin
 perform arena.limit_action(gid);
 select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
 if not found or r.mode<>'hcasc' or r.hcasc_phase<>'question' or r.question_kind<>'bonus' or r.status<>'open' or r.current_index<>expected then raise exception 'This question has already been resolved.';end if;
 if not exists(select 1 from arena.members where room_id=r.id and guest_id=gid and team=r.bonus_team and role<>'spectator') then raise exception 'Only the bonus team may answer.';end if;
 if not r.armed then raise exception 'The question is still being read.';end if;
 if response_text is null or length(response_text)>1000 then raise exception 'Choose a valid answer.';end if;
 select * into q from arena.questions where id=r.question_ids[r.current_index];
 ok=length(trim(response_text))>0 and arena.normalize(response_text)=any(array(select arena.normalize(v) from unnest(array_prepend(q.answer,q.alternatives)) v));
 if clock_timestamp()>r.opened_at+interval '5 seconds' then ok=false;end if;
 update arena.rooms set winner_id=gid where id=r.id;
 perform arena.resolve_round(r.id,ok,response_text);
end $$;

create or replace function arena.sync_hcasc_round(gid uuid,invite text)
returns void language plpgsql as $$
declare r arena.rooms; a integer;b integer;
begin
 perform arena.require_guest(gid);
 select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
 if not found or not exists(select 1 from arena.members where room_id=r.id and guest_id=gid) then raise exception 'Join this room before viewing it.';end if;
 if r.mode<>'hcasc' or r.status in ('waiting','finished','closed') then return;end if;
 if r.hcasc_phase='question' and r.status='open' and r.armed and clock_timestamp()>(r.opened_at+(case when r.question_kind='bonus' then interval '5 seconds' else interval '3 seconds' end)) then
  perform arena.resolve_round(r.id,false,'Answer window expired');return;
 end if;
 if r.hcasc_phase='ultimate' and (r.round_ends_at<=clock_timestamp() or cardinality(r.ultimate_queue)=0) then
  if r.ultimate_turn=2 then
   select coalesce(sum(score) filter(where team='A'),0),coalesce(sum(score) filter(where team='B'),0) into a,b from arena.members where room_id=r.id;
   if a=b then perform arena.begin_tiebreak(r.id);
   else update arena.rooms set status='finished',hcasc_phase='finished',version=version+1 where id=r.id;end if;
  else update arena.rooms set hcasc_phase='ultimate_pick',ultimate_team=case when ultimate_team='A' then 'B' else 'A' end,ultimate_turn=2,round_ends_at=null,version=version+1 where id=r.id;end if;
  return;
 end if;
 if r.hcasc_phase<>'pick' then return;end if;
 if r.round_ends_at>clock_timestamp() and exists(select 1 from arena.hcasc_board where room_id=r.id and run=r.run and round_number=r.round_number and not selected) then return;end if;
 select coalesce(sum(score) filter(where team='A'),0),coalesce(sum(score) filter(where team='B'),0) into a,b from arena.members where room_id=r.id;
 if r.round_number=3 then
  update arena.rooms set round_number=4,hcasc_phase='ultimate_pick',ultimate_team=case when a<b then 'A' when b<a then 'B' when random()<0.5 then 'A' else 'B' end,
    ultimate_turn=1,round_ends_at=null,version=version+1 where id=r.id;
 else
  update arena.rooms set round_number=round_number+1,round_started_at=clock_timestamp(),round_ends_at=clock_timestamp()+interval '4 minutes',
    pick_team=case when a<b then 'A' when b<a then 'B' when random()<0.5 then 'A' else 'B' end,version=version+1 where id=r.id;
 end if;
end $$;

create function arena.pick_ultimate(gid uuid,invite text,pack text) returns void language plpgsql as $$
declare r arena.rooms;ids uuid[];
begin
 perform arena.limit_action(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
 if not found or r.hcasc_phase<>'ultimate_pick' then raise exception 'Choose a category from the final board.';end if;
 if not exists(select 1 from arena.members where room_id=r.id and guest_id=gid and team=r.ultimate_team and role<>'spectator') then raise exception 'Only the active team may choose.';end if;
 select p.question_ids into ids from arena.hcasc_final f join arena.ultimate_packs p on p.id=f.pack_id where f.room_id=r.id and f.pack_id=pack and selected_by is null;
 if ids is null then raise exception 'That category is no longer available.';end if;
 update arena.hcasc_final set selected_by=r.ultimate_team where room_id=r.id and pack_id=pack;
 update arena.rooms set hcasc_phase='ultimate',ultimate_queue=ids,ultimate_done='{}',ultimate_sequence=0,ultimate_feedback=null,
 round_started_at=clock_timestamp(),round_ends_at=clock_timestamp()+interval '60 seconds',version=version+1 where id=r.id;
end $$;

create function arena.answer_ultimate(gid uuid,invite text,expected integer,response_text text,pass boolean)
returns void language plpgsql as $$
declare r arena.rooms;q arena.questions;ok boolean;uid text;
begin
 perform arena.limit_action(gid);select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
 if not found or r.hcasc_phase<>'ultimate' or r.ultimate_sequence<>expected then raise exception 'The question has changed.';end if;
 if r.round_ends_at<=clock_timestamp() then perform arena.sync_hcasc_round(gid,invite);return;end if;
 if not exists(select 1 from arena.members where room_id=r.id and guest_id=gid and team=r.ultimate_team and role<>'spectator') then raise exception 'Only the active team may answer.';end if;
 if response_text is null or length(response_text)>1000 then raise exception 'Choose a valid answer.';end if;
 select * into q from arena.questions where id=r.ultimate_queue[1];
 ok=not pass and length(trim(response_text))>0 and arena.normalize(response_text)=any(array(select arena.normalize(v) from unnest(array_prepend(q.answer,q.alternatives)) v));
 update arena.members set score=score+case when ok then 50 else 0 end where room_id=r.id and guest_id=gid returning account_user_id into uid;
 if uid is not null then
 perform buzzer.record_attempt(uid,'ultimate:'||r.id||':'||r.run||':'||r.ultimate_turn||':'||r.ultimate_sequence,q.id::text,ok,'room');
 end if;
 update arena.rooms set ultimate_queue=case when ok then ultimate_queue[2:] else array_append(ultimate_queue[2:],q.id) end,
 ultimate_done=case when ok then array_append(ultimate_done,q.id) else ultimate_done end,
 ultimate_sequence=ultimate_sequence+1,ultimate_feedback=jsonb_build_object('correct',ok,'passed',pass),version=version+1 where id=r.id;
 perform arena.sync_hcasc_round(gid,invite);
end $$;

alter function arena.hcasc_metadata(uuid,text) rename to hcasc_metadata_before_final;
create function arena.hcasc_metadata(gid uuid,invite text) returns jsonb language plpgsql stable as $$
declare r arena.rooms;data jsonb;final jsonb;q arena.questions;
begin
 data=arena.hcasc_metadata_before_final(gid,invite);
 select * into r from arena.rooms where code=upper(invite);
 if r.mode<>'hcasc' then return data;end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'title',p.title,'description',p.description,'selected_by',f.selected_by) order by p.title),'[]') into final from arena.hcasc_final f join arena.ultimate_packs p on p.id=f.pack_id where f.room_id=r.id;
 if r.hcasc_phase='ultimate' then select * into q from arena.questions where id=r.ultimate_queue[1];end if;
 return data||jsonb_build_object('question_kind',r.question_kind,'bonus_team',r.bonus_team,'sudden_death',r.sudden_death,
 'representatives',jsonb_build_object('A',arena.faceoff_player(r.id,'A'),'B',arena.faceoff_player(r.id,'B')),
 'ultimate_team',r.ultimate_team,'ultimate_sequence',r.ultimate_sequence,'ultimate_cleared',cardinality(r.ultimate_done),'ultimate_feedback',r.ultimate_feedback,
 'ultimate_question',case when q.id is not null then jsonb_build_object('id',q.id,'text',split_part(q.text,' Choices:',1),'subject',q.subject) else null end,'final_categories',final);
end $$;
revoke all on all tables in schema arena from public;
revoke execute on all functions in schema arena from public;
