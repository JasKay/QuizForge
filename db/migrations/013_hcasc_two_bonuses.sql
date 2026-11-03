-- HCASC: two category-matched 10-point bonus questions per correct face-off.
-- Apply with npm run db:migrate before shipping the matching UI.
alter table arena.rooms add column if not exists bonus_step integer not null default 0
  check (bonus_step between 0 and 2);

create or replace function arena.next_hcasc_question(gid uuid,invite text,question_index integer)
returns void language plpgsql as $$
declare r arena.rooms; bid uuid; side text; original_subject text;
begin
 perform arena.limit_action(gid);
 select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
 if not found or r.host_id<>gid then raise exception 'Only the host can advance the room.'; end if;
 if r.mode<>'hcasc' or r.hcasc_phase<>'question' or r.current_index<>question_index or r.status<>'resolved' then
  raise exception 'Resolve this question before advancing.';
 end if;
 if arena.can_steal(r.id) then raise exception 'The other team still has a chance to answer.'; end if;
 if r.sudden_death then
   if r.last_correct then update arena.rooms set status='finished',hcasc_phase='finished',version=version+1 where id=r.id;
   else perform arena.begin_tiebreak(r.id);end if;return;
 end if;
 if r.question_kind='faceoff' and r.last_correct then
   select team into side from arena.members where room_id=r.id and guest_id=r.winner_id;
   select bonus_id into bid from arena.hcasc_board where room_id=r.id and run=r.run and question_id=r.question_ids[r.current_index];
   if bid is null then raise exception 'No bonus question is available.';end if;
   update arena.rooms set question_ids=array_append(question_ids,bid),current_index=cardinality(question_ids)+1,
    status='open',question_kind='bonus',bonus_step=1,bonus_team=side,pick_team=side,correct_points=10,
    winner_id=null,last_correct=null,last_response=null,locked_at=null,opened_at=clock_timestamp(),version=version+1 where id=r.id;
   perform arena.prepare_reading(r.id);
   return;
 end if;
 if r.question_kind='bonus' and r.bonus_step=1 then
   -- The second bonus stays in the same exact subject as the first bonus.
   select subject into original_subject from arena.questions where id=r.question_ids[r.current_index];
   select q.id into bid from arena.questions q
    where q.review_status='approved' and q.subject=original_subject
      and not (q.id=any(r.question_ids))
    order by random() limit 1;
   if bid is not null then
    update arena.rooms set question_ids=array_append(question_ids,bid),current_index=cardinality(question_ids)+1,
      status='open',question_kind='bonus',bonus_step=2,correct_points=10,
      winner_id=null,last_correct=null,last_response=null,locked_at=null,opened_at=clock_timestamp(),version=version+1 where id=r.id;
    perform arena.prepare_reading(r.id);
    return;
   end if;
 end if;
 update arena.rooms set hcasc_phase='pick',status='open',question_kind='faceoff',bonus_step=0,bonus_team=null,correct_points=10,
  armed=false,winner_id=null,attempt=1,steal_team=null,reading_started_at=null,read_until=null,
  opened_at=null,locked_at=null,version=version+1 where id=r.id;
 perform arena.sync_hcasc_round(gid,invite);
end $$;

-- Keep bonus progress server-authoritative and visible to every player.
alter function arena.hcasc_metadata(uuid,text) rename to hcasc_metadata_before_two_bonuses;
create function arena.hcasc_metadata(gid uuid,invite text) returns jsonb language sql stable as $$
 select arena.hcasc_metadata_before_two_bonuses(gid,invite) ||
   jsonb_build_object('bonus_step',r.bonus_step)
 from arena.rooms r where r.code=upper(invite);
$$;
revoke execute on function arena.hcasc_metadata(uuid,text) from public;

-- Only the designated round representative may submit team bonus answers.
create or replace function arena.answer_bonus(gid uuid,invite text,expected integer,response_text text)
returns void language plpgsql as $$
declare r arena.rooms;q arena.questions;ok boolean;
begin
 perform arena.limit_action(gid);
 select * into r from arena.rooms where code=upper(invite) and expires_at>now() for update;
 if not found or r.mode<>'hcasc' or r.hcasc_phase<>'question' or r.question_kind<>'bonus' or r.status<>'open' or r.current_index<>expected then raise exception 'This question has already been resolved.';end if;
 if not exists(select 1 from arena.members where room_id=r.id and guest_id=gid and team=r.bonus_team and role<>'spectator')
   or gid is distinct from arena.faceoff_player(r.id,r.bonus_team) then
   raise exception 'Only the round representative can answer the bonus.';
 end if;
 if not r.armed then raise exception 'The question is still being read.';end if;
 if response_text is null or length(response_text)>1000 then raise exception 'Choose a valid answer.';end if;
 select * into q from arena.questions where id=r.question_ids[r.current_index];
 ok=length(trim(response_text))>0 and arena.normalize(response_text)=any(array(select arena.normalize(v) from unnest(array_prepend(q.answer,q.alternatives)) v));
 if clock_timestamp()>r.opened_at+interval '5 seconds' then ok=false;end if;
 update arena.rooms set winner_id=gid where id=r.id;
 perform arena.resolve_round(r.id,ok,response_text);
end $$;
