# DB 검증 스크립트

## RLS 사용자 격리 (`rls_isolation.sql`)

정책이 **존재하고 모양이 맞다**는 카탈로그 대조는 조건식이 틀려도 통과한다. 이 프로젝트에도
`0002_rls.sql`의 주석이 주장한 `anon` 권한 상태와 실제 DB가 어긋나 `0003`·`0004`가 필요했던
선례가 있다. 이 스크립트는 사용자 두 명을 만들어 **서로의 데이터에 실제로 접근을 시도한다.**

```bash
npx supabase db query --linked -f supabase/tests/rls_isolation.sql
```

전부 한 트랜잭션이고 마지막에 `rollback`한다. 테스트 사용자도 데이터도 남지 않으므로
운영 데이터가 있는 프로젝트에서 그대로 돌려도 된다.

### 시나리오

| # | 시나리오 | 기대 |
|---|---|---|
| 1 | B가 A의 `goals` 조회 | 0행 |
| 2 | B가 A의 `bunches` 조회 | 0행 |
| 3 | B가 A의 `grapes` 조회 | 0행 |
| 4 | B가 A의 `goal_id`를 참조해 `grapes` insert | 거부 |
| 5 | B가 자기 알의 `goal_id`를 A의 것으로 UPDATE | 거부 (`0005`가 막는지) |
| 6 | B가 A의 `grapes` delete | 0행 영향 |
| 7 | B가 A의 `goal` delete | 0행 영향 |
| 8 | **(대조군)** B가 자기 `goals` 조회 | 1행 |

8번이 대조군이다. 격리가 과해서 자기 것까지 막으면 앱이 동작하지 않는다.

### 스크립트를 읽을 때 주의할 점

- **역할을 `authenticated`로 바꾼 뒤 시도해야 한다.** 테이블 소유자(`postgres`)는 RLS를
  우회하므로, 역할을 바꾸지 않으면 모든 시나리오가 무의미하게 통과한다
- 결과 기록은 `postgres`로 돌아와서 한다. `authenticated`는 임시 테이블에 쓸 권한이 없다
- 알을 목표보다 **먼저** 지운다. 목표를 먼저 지우면 cascade로 알이 사라져, 다음 시나리오가
  RLS 덕분인지 이미 없어서인지 구분되지 않는다

### 이 스크립트가 진짜 뭔가를 시험하는지 확인하는 법

역할 전환을 빼고 돌리면 실패해야 한다. 실패하지 않으면 스크립트가 아무것도 검증하지 않는 것이다.

```bash
sed "s/perform set_config('role', 'authenticated', true);/-- 제거/" \
  supabase/tests/rls_isolation.sql > /tmp/no-role.sql
npx supabase db query --linked -f /tmp/no-role.sql
```

### 기록

| 실행 | 날짜 | 결과 |
|---|---|---|
| 본 실행 | 2026-09-23 | **8건 전부 PASS** |
| 음성 대조 (역할 전환 제거) | 2026-09-23 | 8건 중 6건 FAIL — 스크립트가 실제로 RLS를 시험함을 확인 |

4번과 5번은 `42501`(권한 거부)로 막혔다. 5번이 `0005_update_ownership.sql`이 메우려던
구멍이고, 실제로 막히는 것을 확인했다.

스키마나 정책을 바꾸면 다시 돌린다.
