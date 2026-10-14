-- RLS 사용자 격리 실증 (#10)
--
-- 정책이 '존재하고 모양이 맞다'는 카탈로그 대조는 조건식이 틀려도 통과한다. 이 스크립트는
-- 실제로 두 사용자를 만들고 서로의 데이터에 접근을 시도해, 정책이 정말 막는지 확인한다.
--
-- 실행:
--   npx supabase db query --linked -f supabase/tests/rls_isolation.sql
--
-- 전부 하나의 트랜잭션이고 마지막에 rollback한다. 테스트 사용자도 데이터도 남지 않으므로
-- 운영 데이터가 있는 프로젝트에서 그대로 돌려도 된다.
--
-- 중요: 반드시 role을 authenticated로 바꾼 뒤 시도해야 한다. 테이블 소유자(postgres)는
-- RLS를 우회하므로, 역할을 바꾸지 않으면 모든 시나리오가 무의미하게 '통과'한다.

begin;

create temp table result (
  no int,
  scenario text,
  expected text,
  actual text,
  pass boolean
) on commit drop;

insert into auth.users (id) values
  ('aaaaaaaa-0000-4000-8000-00000000000a'),
  ('bbbbbbbb-0000-4000-8000-00000000000b');

do $$
declare
  a_id uuid := 'aaaaaaaa-0000-4000-8000-00000000000a';
  b_id uuid := 'bbbbbbbb-0000-4000-8000-00000000000b';
  a_goal uuid; a_bunch uuid; b_goal uuid; b_bunch uuid;
  n_goals int; n_bunches int; n_grapes int;
  n_del_goal int; n_del_grape int; n_own int;
  insert_blocked boolean := false; insert_code text := '';
  update_blocked boolean := false; update_code text := '';
  n_upd int := -1;
begin
  -- A의 데이터를 A로서 만든다. user_id는 set_user_id 트리거가 채운다.
  perform set_config('request.jwt.claims', json_build_object('sub', a_id)::text, true);
  perform set_config('role', 'authenticated', true);

  insert into goals (title, tag, position) values ('A의 목표', 'A', 1) returning id into a_goal;
  insert into bunches (goal_id, sequence, started_on)
    values (a_goal, 1, current_date) returning id into a_bunch;
  insert into grapes (bunch_id, goal_id, grape_date, mood)
    values (a_bunch, a_goal, current_date, 'calm');

  -- 이제 B가 되어 A의 것을 노린다.
  perform set_config('request.jwt.claims', json_build_object('sub', b_id)::text, true);
  perform set_config('role', 'authenticated', true);

  insert into goals (title, tag, position) values ('B의 목표', 'B', 1) returning id into b_goal;
  insert into bunches (goal_id, sequence, started_on)
    values (b_goal, 1, current_date) returning id into b_bunch;
  insert into grapes (bunch_id, goal_id, grape_date, mood)
    values (b_bunch, b_goal, current_date, 'happy');

  select count(*) into n_goals from goals where id = a_goal;
  select count(*) into n_bunches from bunches where goal_id = a_goal;
  select count(*) into n_grapes from grapes where goal_id = a_goal;

  begin
    insert into grapes (bunch_id, goal_id, grape_date, mood)
      values (a_bunch, a_goal, current_date - 1, 'sad');
  exception when others then
    insert_blocked := true;
    insert_code := sqlstate;
  end;
  perform set_config('role', 'authenticated', true);

  begin
    update grapes set goal_id = a_goal where goal_id = b_goal;
    get diagnostics n_upd = row_count;
  exception when others then
    update_blocked := true;
    update_code := sqlstate;
  end;
  perform set_config('role', 'authenticated', true);

  -- 알을 먼저 지운다. 목표를 먼저 지우면 cascade로 알이 사라져, 다음 시나리오가
  -- RLS 덕분인지 이미 없어서인지 구분되지 않는다.
  delete from grapes where goal_id = a_goal;
  get diagnostics n_del_grape = row_count;
  delete from goals where id = a_goal;
  get diagnostics n_del_goal = row_count;

  select count(*) into n_own from goals where id = b_goal;

  -- 기록은 postgres로 돌아와서 한다. authenticated는 임시 테이블에 쓸 권한이 없다.
  perform set_config('role', 'postgres', true);

  insert into result values
    (1, 'B가 A의 goals 조회', '0행', n_goals || '행', n_goals = 0),
    (2, 'B가 A의 bunches 조회', '0행', n_bunches || '행', n_bunches = 0),
    (3, 'B가 A의 grapes 조회', '0행', n_grapes || '행', n_grapes = 0),
    (4, 'B가 A의 goal을 참조해 grape insert', '거부',
        case when insert_blocked then '거부됨 (' || insert_code || ')' else '통과됨' end,
        insert_blocked),
    (5, 'B가 자기 grape의 goal_id를 A의 것으로 UPDATE', '거부 또는 0행',
        case when update_blocked then '거부됨 (' || update_code || ')'
             else n_upd || '행 변경됨' end,
        update_blocked or n_upd = 0),
    (6, 'B가 A의 grapes delete', '0행 영향', n_del_grape || '행 영향', n_del_grape = 0),
    (7, 'B가 A의 goal delete', '0행 영향', n_del_goal || '행 영향', n_del_goal = 0),
    (8, '(대조군) B가 자기 goals 조회', '1행', n_own || '행', n_own = 1);
exception when others then
  perform set_config('role', 'postgres', true);
  insert into result values (0, '스크립트 실행', '완주', '중단: ' || sqlerrm, false);
end $$;

select
  no,
  scenario,
  expected,
  actual,
  case when pass then 'PASS' else 'FAIL' end as 결과
from result
order by no;

rollback;
