alter table arena.rooms
  add column mode text not null default 'classic' check (mode in ('classic', 'hcasc')),
  add column round_number integer not null default 1 check (round_number between 1 and 3),
  add column round_started_at timestamptz,
  add column round_ends_at timestamptz,
  add column pick_team text check (pick_team in ('A', 'B')),
  add column hcasc_phase text not null default 'classic' check (hcasc_phase in ('classic', 'pick', 'question', 'finished'));

create table arena.hcasc_board (
  room_id uuid not null references arena.rooms on delete cascade,
  run integer not null,
  round_number integer not null check (round_number between 1 and 3),
  category text not null,
  slot integer not null check (slot between 1 and 3),
  question_id uuid not null references arena.questions,
  selected boolean not null default false,
  primary key (room_id, run, round_number, category, slot),
  unique (room_id, run, round_number, question_id)
);
revoke all on arena.hcasc_board from public;

create function arena.create_hcasc_room(gid uuid, nickname text)
returns text language plpgsql as $$
declare invite text;
begin
  invite = arena.create_room(gid, nickname, 'HCASC-style game', null, 3, 120, 10, 0);
  update arena.rooms set mode = 'hcasc' where code = invite;
  return invite;
end $$;

create function arena.start_hcasc_room(gid uuid, invite text)
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
    group by subject having count(*) >= 3
  ) available) < 12 then
    raise exception 'No questions are available in twelve categories.';
  end if;

  select array_agg(subject) into all_categories
  from (
    select subject
    from arena.questions
    where review_status = 'approved'
    group by subject
    having count(*) >= 3
    order by random()
    limit 12
  ) chosen;
  delete from arena.hcasc_board where room_id = r.id and run = r.run;
  for round_value in 1..3 loop
    categories = all_categories[(round_value - 1) * 4 + 1 : round_value * 4];
    foreach category_value in array categories loop
      insert into arena.hcasc_board(room_id, run, round_number, category, slot, question_id)
      select r.id, r.run, round_value, category_value,
        row_number() over (order by random())::integer, id
      from (
        select id from arena.questions
        where review_status = 'approved' and subject = category_value
        order by random()
        limit 3
      ) questions;
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
    pick_team = 'A',
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
end $$;

create function arena.pick_hcasc_question(gid uuid, invite text, category_value text, question_slot integer)
returns void language plpgsql as $$
declare r arena.rooms; question_value uuid;
begin
  perform arena.limit_action(gid);
  select * into r from arena.rooms where code = upper(invite) and expires_at > now() for update;
  if not found or not exists (
    select 1 from arena.members where room_id = r.id and guest_id = gid
      and role in ('player', 'moderator') and team = r.pick_team
  ) then raise exception 'Only Team % can choose this question.', coalesce(r.pick_team, ''); end if;
  if r.mode <> 'hcasc' or r.hcasc_phase <> 'pick' or r.status <> 'open' then
    raise exception 'Choose a question from the active board.';
  end if;
  if r.round_ends_at <= clock_timestamp() then raise exception 'This round has ended.'; end if;
  select question_id into question_value from arena.hcasc_board
    where room_id = r.id and run = r.run and round_number = r.round_number
      and category = category_value and slot = question_slot and not selected
    for update;
  if question_value is null then raise exception 'That question has already been chosen.'; end if;

  update arena.hcasc_board set selected = true
    where room_id = r.id and run = r.run and round_number = r.round_number
      and category = category_value and slot = question_slot;
  update arena.rooms set
    question_ids = array_append(question_ids, question_value),
    current_index = cardinality(question_ids) + 1,
    hcasc_phase = 'question',
    status = 'open',
    armed = false,
    opened_at = clock_timestamp(),
    winner_id = null,
    attempt = 1,
    steal_team = null,
    last_correct = null,
    last_response = null,
    version = version + 1
  where id = r.id;
  perform arena.prepare_reading(r.id);
end $$;

create function arena.next_hcasc_question(gid uuid, invite text, question_index integer)
returns void language plpgsql as $$
declare r arena.rooms;
begin
  perform arena.limit_action(gid);
  select * into r from arena.rooms where code = upper(invite) and expires_at > now() for update;
  if not found or r.host_id <> gid then raise exception 'Only the moderator can advance the room.'; end if;
  if r.mode <> 'hcasc' or r.current_index <> question_index or r.status <> 'resolved' then
    raise exception 'Resolve this question before advancing.';
  end if;
  if arena.can_steal(r.id) then raise exception 'The other team still has a chance to answer.'; end if;

  update arena.rooms set
    hcasc_phase = 'pick',
    status = 'open',
    armed = false,
    pick_team = case when pick_team = 'A' then 'B' else 'A' end,
    winner_id = null,
    attempt = 1,
    steal_team = null,
    reading_started_at = null,
    read_until = null,
    opened_at = null,
    locked_at = null,
    version = version + 1
  where id = r.id;
end $$;

create function arena.sync_hcasc_round(gid uuid, invite text)
returns void language plpgsql as $$
declare r arena.rooms; mode_value text;
begin
  perform arena.require_guest(gid);
  select mode into mode_value from arena.rooms
    where code = upper(invite) and expires_at > now();
  if not found then raise exception 'Room not found or expired. Check the code.'; end if;
  if mode_value <> 'hcasc' then return; end if;
  select * into r from arena.rooms
    where code = upper(invite) and expires_at > now() for update;
  if not found or not exists (select 1 from arena.members where room_id = r.id and guest_id = gid) then
    raise exception 'Join this room before viewing it.';
  end if;
  if r.mode <> 'hcasc' or r.status = 'finished' or r.round_ends_at is null
    or r.round_ends_at > clock_timestamp() then return; end if;

  if r.hcasc_phase = 'question' and r.status in ('open', 'locked') then
    perform arena.resolve_round(r.id, false, 'Round time expired');
  end if;
  if r.round_number = 3 then
    update arena.rooms set status = 'finished', hcasc_phase = 'finished',
      version = version + 1 where id = r.id;
  else
    update arena.rooms set status = 'open', hcasc_phase = 'pick',
      round_number = round_number + 1,
      round_started_at = clock_timestamp(),
      round_ends_at = clock_timestamp() + interval '4 minutes',
      pick_team = case when round_number = 1 then 'B' else 'A' end,
      armed = false, winner_id = null, attempt = 1, steal_team = null,
      last_correct = null, last_response = null,
      reading_started_at = null, read_until = null, opened_at = null,
      locked_at = null, version = version + 1
    where id = r.id;
  end if;
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
  if r.mode = 'hcasc' and r.round_ends_at <= clock_timestamp() then
    raise exception 'This round has ended.';
  end if;
  if r.attempt = 2 and not exists (
    select 1 from arena.members where room_id = r.id and guest_id = gid
      and team = r.steal_team and role in ('player', 'moderator')
  ) then raise exception 'Only the other team can buzz for this chance.'; end if;
  if not r.armed then raise exception 'The buzzer is closed while the moderator reads.'; end if;
  if r.current_index <> question_index or r.status <> 'open' then
    raise exception 'The buzzer is already locked or the question has changed.';
  end if;
  if clock_timestamp() > r.opened_at + make_interval(secs => r.seconds_per_question) then
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
  if r.mode = 'hcasc' and r.round_ends_at <= clock_timestamp() then
    raise exception 'This round has ended.';
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
  if r.mode = 'hcasc' and r.round_ends_at <= clock_timestamp() then
    raise exception 'This round has ended.';
  end if;
  if r.current_index <> question_index or r.status not in ('open', 'locked') then
    raise exception 'This question has already been resolved.';
  end if;
  perform arena.resolve_round(r.id, false, 'Revealed by moderator');
end $$;

create function arena.hcasc_metadata(gid uuid, invite text)
returns jsonb language plpgsql stable as $$
declare r arena.rooms; board_value jsonb;
begin
  select * into r from arena.rooms
    where code = upper(invite) and expires_at > now();
  if not found or not exists (select 1 from arena.members where room_id = r.id and guest_id = gid) then
    raise exception 'Join this room before viewing it.';
  end if;
  if r.mode <> 'hcasc' then return jsonb_build_object('mode', 'classic'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('category', categories.category, 'slots', categories.slots)
    order by categories.category), '[]'::jsonb) into board_value
  from (
    select category, jsonb_agg(jsonb_build_object('slot', slot, 'available', not selected)
      order by slot) as slots
    from arena.hcasc_board
    where room_id = r.id and run = r.run and round_number = r.round_number
    group by category
  ) categories;
  return jsonb_build_object(
    'mode', r.mode,
    'round', r.round_number,
    'round_started_at', r.round_started_at,
    'round_ends_at', r.round_ends_at,
    'pick_team', r.pick_team,
    'hcasc_phase', r.hcasc_phase,
    'board', board_value
  );
end $$;

revoke execute on all functions in schema arena from public;
