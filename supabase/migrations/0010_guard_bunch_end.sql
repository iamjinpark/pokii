-- 0009는 '열려 있는 송이'만 확인해서, 아직 끝나지 않은 송이도 닫거나 목표를 보관할 수
-- 있었다. /goal/<id>/done 에 주소로 직접 들어가거나, 다른 기기에서 새 송이가 시작된 뒤
-- 그 화면을 들고 있으면 닿는다.
--
-- 그러면 '진행 중인 목표를 중간에 그만두는 기능은 없다'는 규칙(설계 3.6)이 뚫리고 남은
-- 날들이 영구히 사라진다. 어느 송이에 대한 요청인지와 기기 로컬 날짜를 받아, 그 송이가
-- 실제로 끝났을 때만 진행한다.
--
-- 날짜는 클라이언트가 보낸 값을 쓴다. 서버에서 만들면 시간대가 다른 기기에서 하루가
-- 어긋난다. 위조할 수 있지만 자기 데이터만 영향을 받고, 이 검사의 목적은 사고를 막는 것이다.
drop function if exists finish_goal(uuid);
drop function if exists start_next_bunch(uuid, date);

create function assert_bunch_ended(p_goal_id uuid, p_bunch_id uuid, p_today date)
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
  perform assert_bunch_ended(p_goal_id, p_bunch_id, p_today);

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
  perform assert_bunch_ended(p_goal_id, p_bunch_id, p_today);

  select coalesce(max(sequence), 0) + 1 into v_next from bunches where goal_id = p_goal_id;

  update bunches set closed_at = now() where id = p_bunch_id;

  insert into bunches (goal_id, sequence, started_on)
  values (p_goal_id, v_next, p_today)
  returning * into v_bunch;

  return v_bunch;
end;
$$;

-- 0008 이후 public 함수는 기본 노출되지 않는다. 필요한 역할에만 준다.
revoke execute on function assert_bunch_ended(uuid, uuid, date) from public, anon;
revoke execute on function finish_goal(uuid, uuid, date) from public, anon;
revoke execute on function start_next_bunch(uuid, uuid, date) from public, anon;
grant execute on function finish_goal(uuid, uuid, date) to authenticated;
grant execute on function start_next_bunch(uuid, uuid, date) to authenticated;
