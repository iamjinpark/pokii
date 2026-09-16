-- 끝난 송이에서 고르는 두 경로는 모두 두 테이블을 건드린다. PostgREST로는 원자적이지
-- 않으므로 함수로 묶는다(create_goal과 같은 이유).
--
-- 날짜는 인자로 받는다. 서버에서 current_date로 만들면 시간대가 다른 기기에서 하루가
-- 어긋난다. security invoker(기본)로 둬서 RLS가 그대로 적용된다.

-- 끝내기: 목표를 보관하고 송이를 닫는다 (설계 3.5).
create function finish_goal(p_goal_id uuid)
returns void
language plpgsql
set search_path = public
as $$
begin
  update bunches set closed_at = now()
  where goal_id = p_goal_id and closed_at is null;

  update goals set archived_at = now()
  where id = p_goal_id and archived_at is null;

  -- RLS로 남의 목표는 한 행도 바뀌지 않는다. 조용히 성공하면 화면만 맞고 데이터는
  -- 그대로인 상태가 되므로 실패로 알린다.
  if not found then
    raise exception 'goal not found or already archived' using errcode = 'P0002';
  end if;
end;
$$;

-- 한 송이 더: 이전 송이를 닫고 '누른 그날'을 시작일로 다음 송이를 만든다 (설계 3.5).
-- 이전 송이 종료 다음날이 아니다. 며칠 뒤에 열었는데 이미 놓친 상태로 시작되면 이상하다.
create function start_next_bunch(p_goal_id uuid, p_started_on date)
returns bunches
language plpgsql
set search_path = public
as $$
declare
  v_next int;
  v_bunch bunches;
begin
  -- 같은 목표에 동시 요청이 오면 둘 다 같은 sequence를 골라 한쪽이 유니크 제약에
  -- 걸린다. 목표 단위로 직렬화한다.
  perform pg_advisory_xact_lock(hashtextextended(p_goal_id::text, 0));

  select coalesce(max(sequence), 0) + 1 into v_next
  from bunches where goal_id = p_goal_id;

  update bunches set closed_at = now()
  where goal_id = p_goal_id and closed_at is null;

  if not found then
    raise exception 'no open bunch for goal' using errcode = 'P0002';
  end if;

  insert into bunches (goal_id, sequence, started_on)
  values (p_goal_id, v_next, p_started_on)
  returning * into v_bunch;

  return v_bunch;
end;
$$;

-- 0008 이후 public 함수는 기본 노출되지 않는다. 필요한 역할에만 명시적으로 준다.
revoke execute on function finish_goal(uuid) from public, anon;
revoke execute on function start_next_bunch(uuid, date) from public, anon;
grant execute on function finish_goal(uuid) to authenticated;
grant execute on function start_next_bunch(uuid, date) to authenticated;
