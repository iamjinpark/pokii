-- 0003은 이미 존재하던 goals/bunches/grapes 세 테이블에서만 anon 권한을 회수했다.
-- 근본 원인은 그 세 테이블이 아니라, public 스키마 소유자 postgres가 설정한
-- ALTER DEFAULT PRIVILEGES였다 — public에 새 relation이 생길 때마다 anon에게
-- TRUNCATE/REFERENCES/TRIGGER/MAINTAIN을 자동으로 얹는다(pg_default_acl 확인:
-- defaclrole=postgres, defaclnamespace=public, defaclacl에 anon=Dxtm 포함).
-- 이걸 고치지 않으면 앞으로 public에 테이블을 추가할 때마다(예: entitlements)
-- 똑같은 누수가 반복된다. 이 마이그레이션은 그 원인을 막아, 이후 테이블은
-- 별도로 revoke하지 않아도 anon에 해당 권한이 붙지 않게 한다.
-- authenticated는 건드리지 않는다 — 앱이 의존하는 권한이다.
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger, maintain on tables from anon;
