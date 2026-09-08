-- user_id를 클라이언트가 정하지 못하게 서버가 덮어쓴다.
create or replace function set_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$;

create trigger goals_set_user_id   before insert on goals   for each row execute function set_user_id();
create trigger bunches_set_user_id before insert on bunches for each row execute function set_user_id();
create trigger grapes_set_user_id  before insert on grapes  for each row execute function set_user_id();

alter table goals   enable row level security;
alter table bunches enable row level security;
alter table grapes  enable row level security;

create policy goals_select on goals for select using (user_id = auth.uid());
create policy goals_insert on goals for insert with check (user_id = auth.uid());
create policy goals_update on goals for update using (user_id = auth.uid());
create policy goals_delete on goals for delete using (user_id = auth.uid());

create policy bunches_select on bunches for select using (user_id = auth.uid());
create policy bunches_update on bunches for update using (user_id = auth.uid());
create policy bunches_delete on bunches for delete using (user_id = auth.uid());

-- 내 user_id + 남의 goal_id 조합을 막는다.
create policy bunches_insert on bunches for insert with check (
  exists (select 1 from goals g where g.id = goal_id and g.user_id = auth.uid())
);

create policy grapes_select on grapes for select using (user_id = auth.uid());
create policy grapes_update on grapes for update using (user_id = auth.uid());
create policy grapes_delete on grapes for delete using (user_id = auth.uid());

create policy grapes_insert on grapes for insert with check (
  exists (select 1 from goals g where g.id = goal_id and g.user_id = auth.uid())
);

-- Data API 노출.
-- 프로젝트 생성 시 "Automatically expose new tables"를 껐으므로 명시적으로 권한을 준다.
-- 이 GRANT가 없으면 테이블은 만들어져도 앱이 읽지 못한다 (PGRST205).
-- 로그인하지 않은 요청(anon)에는 주지 않는다 — RLS로 0행을 받는 것보다
-- 권한 오류로 즉시 막히는 편이 원인이 분명하다.
grant select, insert, update, delete on goals, bunches, grapes to authenticated;
grant usage on schema public to authenticated;
