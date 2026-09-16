-- 목표를 만들면 1번 송이가 함께 생긴다. 송이 없는 목표는 존재하지 않는다(설계 3.6).
-- PostgREST로는 두 테이블에 원자적으로 넣을 수 없어 함수로 묶는다.
--
-- started_on은 인자로 받는다. 서버에서 current_date로 만들면 시간대가 다른 기기에서
-- 하루가 어긋난다. 날짜는 기기 로컬 자정을 경계로 클라이언트가 계산해 넘긴다.
--
-- security invoker(기본)로 둔다. RLS와 user_id 트리거가 그대로 적용돼야 하고,
-- definer로 올리면 이 함수가 RLS를 우회하는 구멍이 된다.
create function create_goal(p_title text, p_tag text, p_started_on date)
returns goals
language plpgsql
set search_path = public
as $$
declare
  v_position smallint;
  v_goal goals;
begin
  -- 비어 있는 자리 중 가장 낮은 번호. 자리가 없으면 만들 수 없다(설계 3.6).
  select min(p) into v_position
  from generate_series(1, 3) as p
  where not exists (
    select 1 from goals g
    where g.user_id = auth.uid() and g.archived_at is null and g.position = p
  );

  if v_position is null then
    raise exception 'no free slot' using errcode = 'P0001';
  end if;

  -- user_id는 set_user_id 트리거가 채운다.
  insert into goals (title, tag, position)
  values (p_title, p_tag, v_position)
  returning * into v_goal;

  insert into bunches (goal_id, sequence, started_on)
  values (v_goal.id, 1, p_started_on);

  return v_goal;
end;
$$;

revoke all on function create_goal(text, text, date) from public, anon;
grant execute on function create_goal(text, text, date) to authenticated;
