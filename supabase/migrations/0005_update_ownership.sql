-- update 정책에 with check가 없으면 using 절이 대신 쓰인다.
-- using은 user_id만 보므로 내 user_id를 유지한 채 goal_id만 남의 것으로 바꾸는
-- UPDATE가 통과했다. insert 정책에는 있던 소유권 검사를 update에도 건다.

drop policy bunches_update on bunches;
create policy bunches_update on bunches for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from goals g where g.id = goal_id and g.user_id = auth.uid())
  );

drop policy grapes_update on grapes;
create policy grapes_update on grapes for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from goals g where g.id = goal_id and g.user_id = auth.uid())
  );
