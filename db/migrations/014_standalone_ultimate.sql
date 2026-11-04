-- Standalone two-team Ultimate uses the proven HCASC Ultimate turn engine.
alter table arena.rooms add column game_format text not null default 'full'
  check (game_format in ('faceoff','full','ultimate'));
update arena.rooms set game_format=case when mode='hcasc' then 'full' else 'faceoff' end;

create function arena.create_ultimate_room(gid uuid, nickname text)
returns text language plpgsql as $$
declare invite text;
begin
  invite := arena.create_hcasc_room(gid,nickname);
  update arena.rooms set game_format='ultimate',title='Ultimate Challenge'
  where code=invite;
  return invite;
end $$;

create function arena.start_ultimate_room(gid uuid,invite text)
returns void language plpgsql as $$
declare r arena.rooms;
begin
  select * into r from arena.rooms where code=upper(invite);
  if not found or r.game_format<>'ultimate' then
    raise exception 'This room is not a standalone Ultimate Challenge.';
  end if;
  perform arena.start_hcasc_room(gid,invite);
  update arena.rooms set round_number=4,hcasc_phase='ultimate_pick',
    ultimate_team=case when random()<0.5 then 'A' else 'B' end,
    ultimate_turn=1,round_ends_at=null,round_started_at=null,
    status='open',version=version+1 where code=upper(invite);
end $$;

alter function arena.hcasc_metadata(uuid,text) rename to hcasc_metadata_before_game_format;
create function arena.hcasc_metadata(gid uuid,invite text)
returns jsonb language sql stable as $$
 select arena.hcasc_metadata_before_game_format(gid,invite) ||
   jsonb_build_object('game_format',r.game_format)
 from arena.rooms r where r.code=upper(invite);
$$;
revoke execute on function arena.hcasc_metadata(uuid,text) from public;
revoke execute on function arena.create_ultimate_room(uuid,text) from public;
revoke execute on function arena.start_ultimate_room(uuid,text) from public;
