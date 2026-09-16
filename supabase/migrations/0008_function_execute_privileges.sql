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

-- postgres가 만드는 함수의 기본 노출도 줄인다. 다만 이것만으로 '기본 거부'가 되지는
-- 않는다 — 확인한 한계는 다음과 같다.
--
--  1. 기본 권한은 객체를 '만든 역할' 기준으로 적용된다. Management API나 대시보드
--     SQL 에디터로 만든 함수는 다른 역할이 생성한 뒤 소유자만 postgres로 바뀌므로
--     이 항목이 적용되지 않는다. 실제로 그 경로로 만든 함수는 proacl이 비어 있었고
--     anon이 호출에 성공했다.
--  2. 플랫폼에는 supabase_admin이 설정한 별도 기본 권한 항목이 있어
--     (anon/authenticated/service_role에 EXECUTE) 우리가 손댈 수 없다.
--
-- 근본 스위치는 config.toml의 auto_expose_new_tables = false 인데, 적용하려면
-- `supabase config push`가 필요하고 지금 config.toml은 원격과 19곳이 달라
-- 그대로 밀면 이메일 가입이 되살아나고 OAuth 설정이 날아간다. 인증 설정을 먼저
-- 원격과 맞춘 뒤에 다룰 일이다.
--
-- 그때까지는 함수마다 명시적으로 권한을 다룬다 (create_goal이 그 방식이다:
-- public/anon에서 회수하고 authenticated에만 부여).
alter default privileges for role postgres in schema public
  revoke execute on functions from public;
