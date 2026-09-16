-- 0010의 assert_bunch_ended는 public에 있어서 두 가지가 동시에 곤란했다.
--  - authenticated에 EXECUTE를 주면 /rest/v1/rpc/assert_bunch_ended 로 API에 노출된다
--  - 주지 않으면 security invoker인 바깥 함수가 자기 헬퍼를 부르지 못한다(실제로 403)
-- API는 public과 graphql_public만 노출하므로(config.toml), 헬퍼를 private 스키마로 옮긴다.
create schema if not exists private;
grant usage on schema private to authenticated;

drop function if exists finish_goal(uuid, uuid, date);
drop function if exists start_next_bunch(uuid, uuid, date);
drop function if exists assert_bunch_ended(uuid, uuid, date);

create function private.assert_bunch_ended(p_goal_id uuid, p_bunch_id uuid, p_today date)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_started date;
  v_filled int;
begin
  select b.started_on, (select count(*) from grapes x where x.bunch_id = b.id)
  into v_started, v_filled
  from bunches b
  where b.id = p_bunch_id and b.goal_id = p_goal_id and b.closed_at is null;

  -- RLS로 남의 송이는 보이지 않는다. 이미 닫힌 송이도 여기서 걸린다.
  if v_started is null then
    raise exception 'bunch not found or already closed' using errcode = 'P0002';
  end if;

  -- 10알을 다 채웠거나 유예일(started_on + 10)이 지나야 끝난 것이다 (설계 3.3, 3.5).
  if v_filled < 10 and p_today <= v_started + 10 then
    raise exception 'bunch has not ended' using errcode = 'P0002';
  end if;
end;
$$;

create function finish_goal(p_goal_id uuid, p_bunch_id uuid, p_today date)
returns void
language plpgsql
set search_path = public
as $$
begin
  perform private.assert_bunch_ended(p_goal_id, p_bunch_id, p_today);

  update bunches set closed_at = now() where id = p_bunch_id;
  update goals set archived_at = now() where id = p_goal_id and archived_at is null;

  if not found then
    raise exception 'goal not found or already archived' using errcode = 'P0002';
  end if;
end;
$$;

-- 새 송이는 '누른 그날'을 시작일로 한다. 이전 송이 종료 다음날이 아니다 (설계 3.5).
create function start_next_bunch(p_goal_id uuid, p_bunch_id uuid, p_today date)
returns bunches
language plpgsql
set search_path = public
as $$
declare
  v_next int;
  v_bunch bunches;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_goal_id::text, 0));
  perform private.assert_bunch_ended(p_goal_id, p_bunch_id, p_today);

  select coalesce(max(sequence), 0) + 1 into v_next from bunches where goal_id = p_goal_id;

  update bunches set closed_at = now() where id = p_bunch_id;

  insert into bunches (goal_id, sequence, started_on)
  values (p_goal_id, v_next, p_today)
  returning * into v_bunch;

  return v_bunch;
end;
$$;

revoke execute on function private.assert_bunch_ended(uuid, uuid, date) from public;
grant execute on function private.assert_bunch_ended(uuid, uuid, date) to authenticated;
revoke execute on function finish_goal(uuid, uuid, date) from public, anon;
revoke execute on function start_next_bunch(uuid, uuid, date) from public, anon;
grant execute on function finish_goal(uuid, uuid, date) to authenticated;
grant execute on function start_next_bunch(uuid, uuid, date) to authenticated;
