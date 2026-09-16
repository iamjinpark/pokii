-- public 스키마의 함수는 Postgres 기본값으로 PUBLIC에 EXECUTE가 붙는다. PostgREST가
-- public 스키마를 API로 노출하므로, 기본값 그대로 두면 함수를 만드는 즉시
-- /rest/v1/rpc/<name> 으로 anon에게 열린다(pg_proc.proacl이 비어 있는 상태가 그것이다).
--
-- 아래 두 함수는 트리거 전용이라 직접 호출해도 동작하지 않는다. 실제 악용 경로는
-- 확인되지 않았지만(set_user_id는 404, rls_auto_enable은 event_trigger 반환 오류),
-- 쓰이지 않는 API 표면은 닫아 둔다.
--
-- set_user_id는 BEFORE INSERT 트리거다. Postgres는 EXECUTE 권한을 CREATE TRIGGER
-- 시점에 확인하고 발화 시점에는 보지 않으므로, PUBLIC에서 회수해도 트리거는 계속 돈다.
-- rls_auto_enable은 Supabase가 심은 이벤트 트리거로 DDL 실행자(postgres) 권한으로 돈다.
revoke execute on function set_user_id() from public;
revoke execute on function rls_auto_enable() from public;

-- 0004가 테이블에 한 것과 같은 이유로 원인도 막는다. 이후 public에 만드는 함수는
-- 기본으로 노출되지 않고, 필요한 역할에 명시적으로 grant해야 한다
-- (create_goal이 이미 그 방식이다: anon에서 회수하고 authenticated에만 부여).
alter default privileges for role postgres in schema public
  revoke execute on functions from public;
