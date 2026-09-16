-- 같은 사용자의 create_goal이 동시에 돌면 둘 다 같은 빈 자리를 고른다. 서로의 미커밋
-- insert를 보지 못하기 때문이다. 그러면 유니크 인덱스가 한쪽을 거절해, 자리가 남아 있는데도
-- 생성이 실패한다(탭이나 기기 두 개에서 동시에 누른 경우).
--
-- 사용자 단위 advisory lock으로 직렬화한다. 트랜잭션이 끝나면 자동으로 풀리고, 잠금
-- 범위가 그 사용자로 한정돼 다른 사용자의 생성은 막지 않는다.
create or replace function create_goal(p_title text, p_tag text, p_started_on date)
returns goals
language plpgsql
set search_path = public
as $$
declare
  v_position smallint;
  v_goal goals;
begin
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));

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
