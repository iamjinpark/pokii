-- 정정: 0002_rls.sql의 "로그인하지 않은 요청(anon)에는 주지 않는다" 주석은
-- 작성 당시 실제와 달랐다. Supabase 프로젝트의 ALTER DEFAULT PRIVILEGES가
-- public 스키마에 새 테이블이 생길 때 anon에게 REFERENCES, TRIGGER, TRUNCATE를
-- 자동으로 부여하고 있었다(SELECT/INSERT/UPDATE/DELETE는 원래도 없었음).
-- 이 마이그레이션이 그 세 권한을 회수해 0002의 주석이 말하는 의도를 실제로 만든다.
revoke references, trigger, truncate on goals, bunches, grapes from anon;

-- goal_id가 goals 테이블에도 존재하게 되면 bare goal_id가 조용히 의미를 바꾸므로
-- 정책을 명시적으로 테이블 한정해 다시 만든다.
drop policy bunches_insert on bunches;
create policy bunches_insert on bunches for insert with check (
  exists (select 1 from goals g where g.id = bunches.goal_id and g.user_id = auth.uid())
);

drop policy grapes_insert on grapes;
create policy grapes_insert on grapes for insert with check (
  exists (select 1 from goals g where g.id = grapes.goal_id and g.user_id = auth.uid())
);
