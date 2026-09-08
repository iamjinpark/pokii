# 계획 1 · 기반과 도메인

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expo 앱이 실행되고, Google/Kakao로 로그인하고, 빈 나무 화면을 본다. 열흘 송이의 날짜 규칙은 테스트로 증명된다.

**Architecture:** `src/utils/`에 Supabase도 React Native도 모르는 순수 함수로 날짜·송이 규칙을 두고 Jest로 검증한다. 데이터는 Supabase Postgres에 두고 RLS·트리거·제약으로 무결성을 지킨다. 화면은 expo-router가 라우팅하고 TanStack Query가 서버 상태를 담당한다.

**Tech Stack:** Expo SDK (expo-router) · TypeScript strict · Supabase (Postgres + Auth + RLS) · TanStack Query · expo-auth-session · jest-expo

**Spec:** `docs/superpowers/specs/2026-09-03-pokii-v1-design.md`

## Global Constraints

- **패키지명(`applicationId`)은 `com.pokii.app`.** 출시 후 변경 불가.
- **표시 이름은 `POKII`.**
- TypeScript strict. `any` 금지.
- 파일명은 **kebab-case**.
- 컴포넌트 파일당 default export 1개.
- Supabase 접근은 `src/utils/supabase.ts` 를 경유한다. 컴포넌트에서 직접 쿼리 금지.
- **모든 테이블에 RLS를 건다.** 정책 없는 테이블은 만들지 않는다.
- `src/utils/date.ts` 와 `src/utils/bunch.ts` 는 Supabase와 React Native를 import 하지 않는다. 이 두 파일이 순수해야 에뮬레이터 없이 도메인 규칙을 테스트할 수 있다. 규칙은 폴더가 아니라 이 두 파일에 붙는다.
- 비밀값은 `.env`, 클라이언트 노출값은 `EXPO_PUBLIC_` 접두사.
- 하루의 경계는 **기기 로컬 자정**. 서버는 사용자의 "오늘"을 모르므로 클라이언트가 로컬 날짜를 계산해 전달한다.
- UI 문구는 영어, **소문자 캐주얼 톤**.
- 커밋 메시지에 `Co-Authored-By: Claude` 를 넣지 않는다.
- **Task 하나 = Issue 하나 = PR 하나.** Task를 시작하기 전에 GitHub Issue를 먼저 만들고,
  브랜치·커밋·PR에 그 번호를 넣는다. 아래 커밋 예시의 `#<이슈번호>` 는 그 번호로 바꾼다.
  브랜치 이름은 `<타입>/#<번호>/<설명>` 형식이다 (예: `chore/#5/expo-scaffold`).
- **`main`에 직접 커밋할 수 없다.** 훅이 차단한다. 반드시 작업 브랜치에서 진행한다.

## 사람이 먼저 해줘야 하는 것

이 계획은 아래가 준비되어야 Task 5부터 진행할 수 있다.

| | 무엇 | 어디서 |
|---|---|---|
| H1 | Supabase 프로젝트 생성, `URL` · `anon key` 확보 | supabase.com |
| H2 | Google OAuth 클라이언트 등록 | Google Cloud Console |
| H3 | Kakao 앱 등록, REST API 키 확보 | Kakao Developers |
| H4 | Supabase Auth에 Google · Kakao provider 등록 | Supabase 대시보드 |

Task 1~4는 위와 무관하게 진행할 수 있다.

---

## 파일 구조

```
src/
  app/                    expo-router 라우트 전용. 여기 있는 파일은 전부 라우트다
    index.tsx             Task 1이 만들고 Task 7이 지우는 임시 진입점
    _layout.tsx           루트 레이아웃. Query · Auth 프로바이더
    (auth)/login.tsx
    (app)/_layout.tsx
    (app)/index.tsx       나무 화면
  screens/                라우트가 렌더하는 화면 본체
    login-screen.tsx
    tree-screen.tsx
  hooks/                  재사용 훅
    use-session.ts        세션
    use-goals.ts          목표 조회
  utils/                  독립 헬퍼 + 콜로케이트 테스트
    date.ts               로컬 날짜 계산. 순수
    date.test.ts
    bunch.ts              송이 열흘 규칙. 순수
    bunch.test.ts
    supabase.ts           Supabase 클라이언트. 유일한 접근점
    query.ts              TanStack Query 클라이언트
    sign-in.ts            OAuth 로그인
  i18n/
    index.ts              언어 감지와 t()
    en.ts
    ko.ts
    i18n.test.ts
  theme.ts                색 토큰
supabase/
  migrations/
    0001_schema.sql       테이블 · 제약 · 인덱스
    0002_rls.sql          RLS 정책 · 트리거
```

**책임 분리** — Expo 공식 구조를 따른다. `app/`은 라우트만 두고 화면 본체는 `screens/`가,
재사용 훅은 `hooks/`가, 독립 헬퍼는 `utils/`가 맡는다. 테스트는 대상 파일 옆에 둔다.
`utils/date.ts`와 `utils/bunch.ts`만은 저장소를 모르는 순수 함수로 유지한다 —
그래야 도메인 규칙이 에뮬레이터 없이 테스트된다.

---

## Task 1: Expo 스캐폴딩과 테스트 러너

**Files:**
- Create: `package.json`, `app.json`, `tsconfig.json`, `src/app/_layout.tsx`, `src/app/index.tsx`
- Create: `jest.config.js`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: 없음
- Produces: `npm test` 로 Jest 실행 가능. `npx expo start` 로 앱 실행 가능. `@/*` 경로 별칭이 `src/*` 를 가리킴.

- [ ] **Step 1: 빈 디렉터리에 Expo 앱을 만들고 저장소로 옮기기**

저장소에는 이미 `docs/`가 있어 `create-expo-app`이 거부한다. 임시 폴더에 만들어 옮긴다.

```bash
cd /tmp
npx create-expo-app@latest pokii-scaffold --template default
cd /Users/jiinpark/Desktop/front/pokii
rsync -a --exclude node_modules --exclude .git --exclude README.md /tmp/pokii-scaffold/ .
rm -rf /tmp/pokii-scaffold
npm install
```

- [ ] **Step 2: 앱이 뜨는지 확인**

Run: `npx expo start`
Expected: QR 코드가 뜨고, Expo Go로 스캔하면 템플릿 화면이 보인다. 확인했으면 `Ctrl+C`.

- [ ] **Step 3: 템플릿 예제를 걷어내고 `src/` 로 옮기기**

기본 템플릿은 루트 `app/`에 탭 예제를 만든다. spec의 폴더 구조로 바꾼다.

```bash
rm -rf app components constants hooks scripts app-example
mkdir -p src/app src/utils src/hooks src/screens src/i18n
```

`src/app/_layout.tsx` 를 만든다:

```tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

`src/app/index.tsx` 를 만든다:

```tsx
import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>POKII</Text>
    </View>
  );
}
```

- [ ] **Step 4: `app.json` 에 식별자와 스킴 넣기**

`expo` 객체를 아래 값으로 맞춘다. `scheme`은 OAuth 리다이렉트에 쓰이므로 반드시 필요하다.

```json
{
  "expo": {
    "name": "POKII",
    "slug": "pokii",
    "scheme": "pokii",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "android": {
      "package": "com.pokii.app",
      "adaptiveIcon": { "backgroundColor": "#0B7A3B" }
    },
    "ios": { "bundleIdentifier": "com.pokii.app", "supportsTablet": false },
    "plugins": ["expo-router"],
    "experiments": { "typedRoutes": true }
  }
}
```

- [ ] **Step 5: `tsconfig.json` 에서 strict와 경로 별칭 확인**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

- [ ] **Step 6: Jest 설치**

```bash
npx expo install jest-expo jest --dev
npm install --save-dev @types/jest
```

`package.json` 의 `scripts` 에 추가:

```json
"test": "jest"
```

`jest.config.js` 를 만든다:

```js
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
};
```

- [ ] **Step 7: 테스트 러너가 도는지 확인하는 임시 테스트**

`src/utils/smoke.test.ts`:

```ts
test('테스트 러너가 동작한다', () => {
  expect(1 + 1).toBe(2);
});
```

- [ ] **Step 8: 테스트 실행**

Run: `npm test`
Expected: PASS · 1 passed

- [ ] **Step 9: 임시 테스트 삭제하고 앱 재확인**

```bash
rm src/utils/smoke.test.ts
npx expo start
```

Expected: `POKII` 글자만 있는 화면이 뜬다. 확인했으면 `Ctrl+C`.

- [ ] **Step 10: 커밋**

```bash
git add -A
git commit -m "chore(setup): #<이슈번호> Expo 스캐폴딩과 테스트 러너 구성

- **구현**
  - expo-router 템플릿을 src/ 구조로 재배치
  - app.json에 com.pokii.app 패키지명과 pokii 스킴 설정
  - TypeScript strict, @/* 경로 별칭
  - jest-expo 테스트 러너"
```

---

## Task 2: 로컬 날짜 계산

**Files:**
- Create: `src/utils/date.ts`
- Test: `src/utils/date.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `type IsoDate = string` — `'YYYY-MM-DD'` 형식
  - `localToday(now?: Date): IsoDate`
  - `addDays(date: IsoDate, n: number): IsoDate`
  - `diffDays(from: IsoDate, to: IsoDate): number`

`Date` 객체를 밖으로 내보내지 않는다. 문자열만 오가면 시간대 실수가 생길 자리가 없다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/utils/date.test.ts`:

```ts
import { localToday, addDays, diffDays } from './date';

describe('localToday', () => {
  test('기기 로컬 날짜를 YYYY-MM-DD로 준다', () => {
    expect(localToday(new Date(2026, 8, 8, 13, 30))).toBe('2026-09-08');
  });

  test('자정 직전은 아직 그날이다', () => {
    expect(localToday(new Date(2026, 8, 8, 23, 59, 59))).toBe('2026-09-08');
  });

  test('자정을 넘기면 다음 날이다', () => {
    expect(localToday(new Date(2026, 8, 9, 0, 0, 0))).toBe('2026-09-09');
  });
});

describe('addDays', () => {
  test('며칠 뒤를 준다', () => {
    expect(addDays('2026-09-08', 9)).toBe('2026-09-17');
  });

  test('음수면 며칠 전을 준다', () => {
    expect(addDays('2026-09-08', -1)).toBe('2026-09-07');
  });

  test('월을 넘긴다', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
  });

  test('윤년 2월을 넘긴다', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('diffDays', () => {
  test('같은 날은 0이다', () => {
    expect(diffDays('2026-09-08', '2026-09-08')).toBe(0);
  });

  test('뒤로 갈수록 양수다', () => {
    expect(diffDays('2026-09-08', '2026-09-17')).toBe(9);
  });

  test('앞으로 가면 음수다', () => {
    expect(diffDays('2026-09-08', '2026-09-07')).toBe(-1);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- date.test`
Expected: FAIL — `Cannot find module './date'`

- [ ] **Step 3: 최소 구현**

`src/utils/date.ts`:

```ts
export type IsoDate = string;

const pad = (n: number): string => String(n).padStart(2, '0');

export function localToday(now: Date = new Date()): IsoDate {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function toUtcMillis(date: IsoDate): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(date: IsoDate, n: number): IsoDate {
  const shifted = new Date(toUtcMillis(date) + n * 86400000);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

export function diffDays(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMillis(to) - toUtcMillis(from)) / 86400000);
}
```

`localToday`는 로컬 시각을 읽고, `addDays`·`diffDays`는 UTC로 계산한다. 날짜 문자열끼리의 덧셈에는 시간대가 필요 없고, UTC로 하면 서머타임 때문에 하루가 23시간이 되는 날에도 결과가 흔들리지 않는다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- date.test`
Expected: PASS · 10 passed

- [ ] **Step 5: 커밋**

```bash
git add src/utils/date.ts src/utils/date.test.ts
git commit -m "feat(domain): #<이슈번호> 로컬 날짜 계산 함수 추가

- **구현**
  - localToday / addDays / diffDays
  - 로컬 자정 기준으로 오늘을 정하고, 날짜 덧셈은 UTC로 계산해 서머타임 영향을 없앰"
```

---

## Task 3: 송이 열흘 규칙

**Files:**
- Create: `src/utils/bunch.ts`
- Test: `src/utils/bunch.test.ts`

**Interfaces:**
- Consumes: `IsoDate`, `addDays`, `diffDays` (Task 2)
- Produces:
  - `const BUNCH_SIZE = 10`
  - `type GrapeState = 'filled' | 'today' | 'yesterday' | 'missed' | 'future'`
  - `bunchDates(startedOn: IsoDate): IsoDate[]` — 열 개
  - `isBunchOpen(startedOn: IsoDate, today: IsoDate): boolean`
  - `grapeStateFor(args: { date: IsoDate; today: IsoDate; filled: ReadonlySet<IsoDate> }): GrapeState`
  - `canFill(args: { date: IsoDate; today: IsoDate; startedOn: IsoDate; filled: ReadonlySet<IsoDate> }): boolean`
  - `containerFor(filledCount: number): 'basket' | 'crate' | 'colander'`

이 파일이 이 계획에서 가장 중요하다. 유예일과 소급 보충이 얽히는 곳이라 버그가 숨기 좋다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/utils/bunch.test.ts`:

```ts
import {
  BUNCH_SIZE, bunchDates, isBunchOpen, grapeStateFor, canFill, containerFor,
} from './bunch';

const START = '2026-09-01';
const none = new Set<string>();

describe('bunchDates', () => {
  test('시작일부터 연속 열흘이다', () => {
    const dates = bunchDates(START);
    expect(dates).toHaveLength(BUNCH_SIZE);
    expect(dates[0]).toBe('2026-09-01');
    expect(dates[9]).toBe('2026-09-10');
  });
});

describe('isBunchOpen', () => {
  test('1일차에 열려 있다', () => {
    expect(isBunchOpen(START, '2026-09-01')).toBe(true);
  });

  test('10일차에 열려 있다', () => {
    expect(isBunchOpen(START, '2026-09-10')).toBe(true);
  });

  test('유예일에도 아직 열려 있다', () => {
    expect(isBunchOpen(START, '2026-09-11')).toBe(true);
  });

  test('유예일 다음 날 닫힌다', () => {
    expect(isBunchOpen(START, '2026-09-12')).toBe(false);
  });
});

describe('grapeStateFor', () => {
  const today = '2026-09-05';

  test('채운 날은 filled다', () => {
    const filled = new Set(['2026-09-03']);
    expect(grapeStateFor({ date: '2026-09-03', today, filled })).toBe('filled');
  });

  test('오늘이고 안 채웠으면 today다', () => {
    expect(grapeStateFor({ date: today, today, filled: none })).toBe('today');
  });

  test('오늘이어도 채웠으면 filled다', () => {
    const filled = new Set([today]);
    expect(grapeStateFor({ date: today, today, filled })).toBe('filled');
  });

  test('어제고 안 채웠으면 yesterday다', () => {
    expect(grapeStateFor({ date: '2026-09-04', today, filled: none })).toBe('yesterday');
  });

  test('그저께 빈 칸은 missed다', () => {
    expect(grapeStateFor({ date: '2026-09-03', today, filled: none })).toBe('missed');
  });

  test('내일은 future다', () => {
    expect(grapeStateFor({ date: '2026-09-06', today, filled: none })).toBe('future');
  });
});

describe('canFill', () => {
  const args = { startedOn: START, filled: none };

  test('오늘은 채울 수 있다', () => {
    expect(canFill({ ...args, date: '2026-09-05', today: '2026-09-05' })).toBe(true);
  });

  test('어제는 채울 수 있다', () => {
    expect(canFill({ ...args, date: '2026-09-04', today: '2026-09-05' })).toBe(true);
  });

  test('그저께는 못 채운다', () => {
    expect(canFill({ ...args, date: '2026-09-03', today: '2026-09-05' })).toBe(false);
  });

  test('내일은 못 채운다', () => {
    expect(canFill({ ...args, date: '2026-09-06', today: '2026-09-05' })).toBe(false);
  });

  test('이미 채운 날은 못 채운다', () => {
    const filled = new Set(['2026-09-05']);
    expect(canFill({ ...args, filled, date: '2026-09-05', today: '2026-09-05' })).toBe(false);
  });

  test('유예일에 10일차를 소급 보충할 수 있다', () => {
    expect(canFill({ ...args, date: '2026-09-10', today: '2026-09-11' })).toBe(true);
  });

  test('유예일에 오늘 칸은 송이 밖이라 못 채운다', () => {
    expect(canFill({ ...args, date: '2026-09-11', today: '2026-09-11' })).toBe(false);
  });

  test('송이가 닫힌 뒤에는 아무것도 못 채운다', () => {
    expect(canFill({ ...args, date: '2026-09-10', today: '2026-09-12' })).toBe(false);
  });
});

describe('containerFor', () => {
  test('10알이면 바구니다', () => {
    expect(containerFor(10)).toBe('basket');
  });

  test('3알이면 상자다', () => {
    expect(containerFor(3)).toBe('crate');
  });

  test('9알이면 상자다', () => {
    expect(containerFor(9)).toBe('crate');
  });

  test('2알이면 소쿠리다', () => {
    expect(containerFor(2)).toBe('colander');
  });

  test('0알이면 소쿠리다', () => {
    expect(containerFor(0)).toBe('colander');
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- bunch.test`
Expected: FAIL — `Cannot find module './bunch'`

- [ ] **Step 3: 최소 구현**

`src/utils/bunch.ts`:

```ts
import { addDays, diffDays, type IsoDate } from './date';

export const BUNCH_SIZE = 10;

/** 마지막 칸(+9) 다음 날. 이날까지 소급 보충할 수 있다. */
const GRACE_OFFSET = BUNCH_SIZE;

export type GrapeState = 'filled' | 'today' | 'yesterday' | 'missed' | 'future';
export type Container = 'basket' | 'crate' | 'colander';

export function bunchDates(startedOn: IsoDate): IsoDate[] {
  return Array.from({ length: BUNCH_SIZE }, (_, i) => addDays(startedOn, i));
}

export function isBunchOpen(startedOn: IsoDate, today: IsoDate): boolean {
  return diffDays(startedOn, today) <= GRACE_OFFSET;
}

export function grapeStateFor(args: {
  date: IsoDate;
  today: IsoDate;
  filled: ReadonlySet<IsoDate>;
}): GrapeState {
  const { date, today, filled } = args;
  if (filled.has(date)) return 'filled';
  const offset = diffDays(today, date);
  if (offset === 0) return 'today';
  if (offset === -1) return 'yesterday';
  return offset < 0 ? 'missed' : 'future';
}

export function canFill(args: {
  date: IsoDate;
  today: IsoDate;
  startedOn: IsoDate;
  filled: ReadonlySet<IsoDate>;
}): boolean {
  const { date, today, startedOn, filled } = args;
  if (!bunchDates(startedOn).includes(date)) return false;
  const state = grapeStateFor({ date, today, filled });
  return state === 'today' || state === 'yesterday';
}

export function containerFor(filledCount: number): Container {
  if (filledCount >= BUNCH_SIZE) return 'basket';
  if (filledCount >= 3) return 'crate';
  return 'colander';
}
```

**유예일이 따로 구현되지 않은 것에 주의한다.** `canFill`이 "송이 안의 날짜"와 "오늘 또는 어제"를 모두 요구하므로, 유예일(`started+10`)에는 오늘이 송이 밖이라 막히고 어제(`started+9`)만 통과한다. 규칙 하나가 두 요구사항을 동시에 만족시킨다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- bunch.test`
Expected: PASS · 24 passed

- [ ] **Step 5: 전체 테스트 확인**

Run: `npm test`
Expected: PASS · 34 passed (date 10 + bunch 24)

- [ ] **Step 6: 커밋**

```bash
git add src/utils/bunch.ts src/utils/bunch.test.ts
git commit -m "feat(domain): #<이슈번호> 송이 열흘 규칙 추가

- **구현**
  - bunchDates / isBunchOpen / grapeStateFor / canFill / containerFor
  - 유예일은 별도 분기 없이 '송이 안의 날짜 + 오늘이거나 어제' 조건으로 자연히 성립
  - 소급 보충 1일 한도와 송이 마감을 테스트로 고정"
```

---

## Task 4: 색 토큰과 다국어 구조

**Files:**
- Create: `src/theme.ts`, `src/i18n/index.ts`, `src/i18n/en.ts`, `src/i18n/ko.ts`
- Test: `src/i18n/i18n.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `theme` 객체 — `theme.mood.excited` 등
  - `t(key: TranslationKey): string`
  - `type TranslationKey = keyof typeof en`

- [ ] **Step 1: 색 토큰 작성**

`src/theme.ts`. 값은 spec §8.1.1의 임시값이며 Figma 확정 후 교체한다.

```ts
export const theme = {
  vine: '#0B7A3B',
  sky: '#D6EEFA',
  ink: '#2E2A6B',
  tag: '#F4EBD9',
  tagEdge: '#8B5E3C',
  amber: '#B45309',
  /** 채우지 않은 알. 기분이 없으면 색도 없다. */
  empty: '#DDE1E6',
  mood: {
    excited: '#33265E',
    happy: '#4E3480',
    calm: '#6D4CA0',
    tired: '#9377BE',
    sad: '#B7A2D6',
  },
} as const;

export type Mood = keyof typeof theme.mood;
export const MOODS: readonly Mood[] = ['excited', 'happy', 'calm', 'tired', 'sad'];
```

- [ ] **Step 2: 영어 문구 작성**

`src/i18n/en.ts`. spec §10의 문구를 옮긴다.

```ts
export const en = {
  'login.google': 'Continue with Google',
  'login.kakao': 'Continue with Kakao',
  'tree.greeting': 'hello!',
  'tree.empty': 'your tree is waiting',
  'tree.collect': "let's collect today's pokii",
  'tree.done': 'all done for today',
  'tree.full.title': 'your tree is full!',
  'tree.full.body': 'finish a bunch to plant a new one',
  'common.retry': 'retry',
  'common.error.network': "couldn't reach your tree.",
} as const;

export type TranslationKey = keyof typeof en;
```

- [ ] **Step 3: 한국어 문구 작성**

`src/i18n/ko.ts`:

```ts
import type { TranslationKey } from './en';

export const ko: Record<TranslationKey, string> = {
  'login.google': 'Google로 계속하기',
  'login.kakao': '카카오로 계속하기',
  'tree.greeting': '안녕!',
  'tree.empty': '나무가 기다리고 있어요',
  'tree.collect': '오늘의 포도알을 모아요',
  'tree.done': '오늘은 다 했어요',
  'tree.full.title': '나무가 가득 찼어요',
  'tree.full.body': '한 송이를 마쳐야 새로 심을 수 있어요',
  'common.retry': '다시 시도',
  'common.error.network': '나무에 닿지 못했어요.',
};
```

`ko`에 `Record<TranslationKey, string>` 타입을 준 덕분에, 영어에 키를 추가하고 한국어를 빠뜨리면 **타입 검사에서 걸린다.**

- [ ] **Step 4: 실패하는 테스트 작성**

`src/i18n/i18n.test.ts`:

```ts
import { resolveLocale, translate } from './index';

describe('resolveLocale', () => {
  test('한국어 기기는 ko다', () => {
    expect(resolveLocale('ko-KR')).toBe('ko');
  });

  test('영어 기기는 en이다', () => {
    expect(resolveLocale('en-US')).toBe('en');
  });

  test('지원하지 않는 언어는 en으로 떨어진다', () => {
    expect(resolveLocale('ja-JP')).toBe('en');
  });

  test('언어를 모르면 en으로 떨어진다', () => {
    expect(resolveLocale(null)).toBe('en');
  });
});

describe('translate', () => {
  test('언어에 맞는 문구를 준다', () => {
    expect(translate('en', 'tree.empty')).toBe('your tree is waiting');
    expect(translate('ko', 'tree.empty')).toBe('나무가 기다리고 있어요');
  });
});
```

- [ ] **Step 5: 테스트가 실패하는지 확인**

Run: `npm test -- i18n.test`
Expected: FAIL — `Cannot find module './index'`

- [ ] **Step 6: 최소 구현**

```bash
npx expo install expo-localization
```

`src/i18n/index.ts`:

```ts
import { getLocales } from 'expo-localization';
import { en, type TranslationKey } from './en';
import { ko } from './ko';

export type Locale = 'en' | 'ko';

const tables = { en, ko } as const;

export function resolveLocale(languageCode: string | null | undefined): Locale {
  if (!languageCode) return 'en';
  return languageCode.startsWith('ko') ? 'ko' : 'en';
}

export function translate(locale: Locale, key: TranslationKey): string {
  return tables[locale][key];
}

/** 기기 언어를 읽는다. 사용자가 Settings에서 고른 값은 계획 4에서 덮어쓴다. */
export function deviceLocale(): Locale {
  return resolveLocale(getLocales()[0]?.languageCode);
}

export function t(key: TranslationKey): string {
  return translate(deviceLocale(), key);
}

export type { TranslationKey };
```

- [ ] **Step 7: 테스트 통과 확인**

Run: `npm test -- i18n.test`
Expected: PASS · 5 passed

- [ ] **Step 8: 커밋**

```bash
git add src/theme.ts src/i18n
git commit -m "feat(setup): #<이슈번호> 색 토큰과 다국어 구조 추가

- **구현**
  - theme.ts에 기분 5색과 기본 색 토큰 (Figma 확정 전 임시값)
  - i18n 영어·한국어 테이블. ko를 Record<TranslationKey,string>으로 묶어 번역 누락을 타입으로 차단
  - expo-localization으로 기기 언어 감지"
```

---

## Task 5: 데이터베이스 스키마

**Files:**
- Create: `supabase/migrations/0001_schema.sql`
- Create: `supabase/migrations/0002_rls.sql`

**Interfaces:**
- Consumes: H1 (Supabase 프로젝트)
- Produces: `goals` · `bunches` · `grapes` 테이블. 다른 사용자의 행은 조회·수정 불가.

**선행 조건:** H1이 끝나 있어야 한다.

- [ ] **Step 1: Supabase CLI 설치와 연결**

```bash
npm install --save-dev supabase
npx supabase init
npx supabase link --project-ref <프로젝트 ref>
```

- [ ] **Step 2: 스키마 마이그레이션 작성**

`supabase/migrations/0001_schema.sql`:

```sql
create table goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  title       text not null check (char_length(title) between 1 and 60),
  tag         text not null check (char_length(tag) between 1 and 8),
  position    smallint not null check (position between 1 and 3),
  created_at  timestamptz not null default now(),
  archived_at timestamptz
);

-- 진행 중인 목표끼리만 자리가 겹치면 안 된다. 보관한 목표는 자리를 비워준다.
create unique index goals_active_slot on goals (user_id, position)
  where archived_at is null;
create index goals_user on goals (user_id);

create table bunches (
  id          uuid primary key default gen_random_uuid(),
  goal_id     uuid not null references goals on delete cascade,
  user_id     uuid not null references auth.users on delete cascade,
  sequence    int not null check (sequence >= 1),
  started_on  date not null,
  closed_at   timestamptz,
  unique (goal_id, sequence),
  -- grapes의 복합 외래키가 참조할 대상
  unique (id, goal_id)
);

create table grapes (
  id          uuid primary key default gen_random_uuid(),
  bunch_id    uuid not null,
  goal_id     uuid not null,
  user_id     uuid not null references auth.users on delete cascade,
  grape_date  date not null,
  filled_at   timestamptz not null default now(),
  mood        text not null check (mood in ('excited','happy','calm','tired','sad')),
  note        text check (note is null or char_length(note) <= 100),
  -- 하루에 두 알이 들어갈 수 없다. 이 스키마에서 가장 중요한 제약.
  unique (goal_id, grape_date),
  -- 알이 가리키는 송이와 목표가 어긋날 수 없다.
  foreign key (bunch_id, goal_id) references bunches (id, goal_id) on delete cascade
);
```

- [ ] **Step 3: RLS와 트리거 작성**

`supabase/migrations/0002_rls.sql`:

```sql
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
```

- [ ] **Step 4: 마이그레이션 적용**

```bash
npx supabase db push
```

Expected: 두 파일이 적용되고 오류가 없다.

- [ ] **Step 5: 제약이 실제로 동작하는지 확인**

Supabase 대시보드의 SQL Editor에서 실행한다. `<uuid>` 는 `auth.users` 에 있는 아무 사용자 id로 바꾼다.

```sql
-- 준비
insert into goals (user_id, title, tag, position)
values ('<uuid>', 'test goal', 'TEST', 1) returning id;

insert into bunches (goal_id, user_id, sequence, started_on)
values ('<위 goal id>', '<uuid>', 1, current_date) returning id;

-- 하루 한 알 제약: 두 번째가 실패해야 한다
insert into grapes (bunch_id, goal_id, user_id, grape_date, mood)
values ('<bunch id>', '<goal id>', '<uuid>', current_date, 'calm');

insert into grapes (bunch_id, goal_id, user_id, grape_date, mood)
values ('<bunch id>', '<goal id>', '<uuid>', current_date, 'happy');
```

Expected: 두 번째 insert가 `duplicate key value violates unique constraint "grapes_goal_id_grape_date_key"` 로 실패한다.

```sql
-- 잘못된 mood 값: 실패해야 한다
insert into grapes (bunch_id, goal_id, user_id, grape_date, mood)
values ('<bunch id>', '<goal id>', '<uuid>', current_date + 1, 'angry');
```

Expected: `violates check constraint` 로 실패한다.

```sql
-- 정리
delete from goals where tag = 'TEST';
```

- [ ] **Step 6: 커밋**

```bash
git add supabase/
git commit -m "feat(db): #<이슈번호> goals/bunches/grapes 스키마와 RLS 추가

- **구현**
  - 3단 스키마와 제약: unique(goal_id, grape_date)로 하루 한 알 보장
  - bunches(id, goal_id) 복합 유니크 + grapes 복합 FK로 송이·목표 불일치 차단
  - 진행 중 목표끼리만 자리가 겹치지 않도록 부분 유니크 인덱스
  - user_id는 트리거가 auth.uid()로 덮어써 클라이언트가 위조할 수 없음
  - grapes/bunches insert 정책에서 목표 소유권까지 확인"
```

---

## Task 6: Supabase 클라이언트와 Query 설정

**Files:**
- Create: `src/utils/supabase.ts`, `src/utils/query.ts`, `.env.example`
- Modify: `src/app/_layout.tsx`

**Interfaces:**
- Consumes: H1 (URL과 anon key)
- Produces:
  - `supabase` — 앱 전체에서 유일한 Supabase 클라이언트
  - `queryClient` — TanStack Query 클라이언트
  - 루트 레이아웃이 `QueryClientProvider` 로 감싸져 있음

- [ ] **Step 1: 의존성 설치**

```bash
npm install @supabase/supabase-js @tanstack/react-query
npx expo install @react-native-async-storage/async-storage react-native-url-polyfill
```

- [ ] **Step 2: 환경변수 파일**

`.env.example`:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

`.env` 를 만들어 실제 값을 넣는다. `.gitignore` 에 이미 `.env` 가 있으므로 커밋되지 않는다.

- [ ] **Step 3: Supabase 클라이언트**

`src/utils/supabase.ts`:

```ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL과 EXPO_PUBLIC_SUPABASE_ANON_KEY가 필요합니다. .env를 확인하세요.');
}

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // 앱에는 URL 표시줄이 없다. 로그인 콜백은 Task 7에서 직접 처리한다.
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 4: Query 클라이언트**

`src/utils/query.ts`:

```ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
});
```

- [ ] **Step 5: 루트 레이아웃에 프로바이더 연결**

`src/app/_layout.tsx`:

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { queryClient } from '@/utils/query';

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 6: 앱이 여전히 뜨는지 확인**

Run: `npx expo start`
Expected: `POKII` 화면이 그대로 뜬다. 환경변수가 없으면 위에서 던진 오류 메시지가 보인다. 확인했으면 `Ctrl+C`.

- [ ] **Step 7: 커밋**

```bash
git add src/utils .env.example src/app/_layout.tsx
git commit -m "feat(setup): #<이슈번호> Supabase 클라이언트와 TanStack Query 설정

- **구현**
  - src/utils/supabase.ts를 유일한 접근점으로 두고 AsyncStorage에 세션 보관
  - 환경변수 누락 시 즉시 명확한 오류를 던지도록 처리
  - QueryClientProvider를 루트 레이아웃에 연결"
```

---

## Task 7: Google · Kakao 로그인

**Files:**
- Create: `src/utils/sign-in.ts`, `src/hooks/use-session.ts`
- Create: `src/screens/login-screen.tsx`, `src/app/(auth)/login.tsx`
- Modify: `src/app/_layout.tsx`

**Interfaces:**
- Consumes: `supabase` (Task 6), `t` (Task 4), `theme` (Task 4), H2·H3·H4
- Produces:
  - `signInWith(provider: 'google' | 'kakao'): Promise<void>`
  - `useSession(): { session: Session | null; loading: boolean }`

**세션 자동 갱신에 AppState 연결이 필요하다.** `src/utils/supabase.ts` 는 `autoRefreshToken: true`
로 설정되어 있으나, 이 갱신은 JS 타이머로 돌기 때문에 OS가 앱을 백그라운드로 보내면 함께 멈춘다.
다시 앱을 열었을 때 만료된 세션으로 잠시 동작하게 된다.

`react-native` 의 `AppState` 를 구독해 포그라운드 진입 시 `supabase.auth.startAutoRefresh()`,
백그라운드 진입 시 `stopAutoRefresh()` 를 호출한다. 루트 레이아웃에 두는 것이 자연스럽다.

**선행 조건:** H2·H3·H4가 끝나 있어야 한다.

- [ ] **Step 1: 의존성 설치**

```bash
npx expo install expo-auth-session expo-web-browser expo-crypto
```

- [ ] **Step 2: 로그인 함수**

`src/utils/sign-in.ts`:

```ts
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '@/utils/supabase';

export type OAuthProvider = 'google' | 'kakao';

/** app.json의 scheme("pokii")으로 만들어지는 pokii:// 주소 */
const redirectTo = makeRedirectUri({ scheme: 'pokii', path: 'auth-callback' });

function tokensFrom(url: string): { access_token: string; refresh_token: string } | null {
  const fragment = url.split('#')[1];
  if (!fragment) return null;
  const params = new URLSearchParams(fragment);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token };
}

export async function signInWith(provider: OAuthProvider): Promise<void> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('OAuth 주소를 받지 못했습니다.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return;

  const tokens = tokensFrom(result.url);
  if (!tokens) throw new Error('로그인 응답에서 토큰을 찾지 못했습니다.');

  const { error: sessionError } = await supabase.auth.setSession(tokens);
  if (sessionError) throw sessionError;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
```

- [ ] **Step 3: 세션 훅**

`src/hooks/use-session.ts`:

```ts
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase';

export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading };
}
```

- [ ] **Step 4: 로그인 화면**

`src/screens/login-screen.tsx`:

```tsx
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { signInWith, type OAuthProvider } from '@/utils/sign-in';
import { t } from '@/i18n';
import { theme } from '@/theme';

export default function LoginScreen() {
  const [busy, setBusy] = useState<OAuthProvider | null>(null);

  const handle = async (provider: OAuthProvider) => {
    setBusy(provider);
    try {
      await signInWith(provider);
    } catch {
      Alert.alert(t('common.error.network'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.mark}>POKII</Text>
      <View style={styles.buttons}>
        <Pressable
          style={[styles.button, styles.google]}
          disabled={busy !== null}
          onPress={() => handle('google')}
        >
          <Text style={styles.googleLabel}>{t('login.google')}</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.kakao]}
          disabled={busy !== null}
          onPress={() => handle('kakao')}
        >
          <Text style={styles.kakaoLabel}>{t('login.kakao')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 24 },
  mark: { fontSize: 40, fontWeight: '800', color: theme.ink, letterSpacing: 2, marginBottom: 48 },
  buttons: { alignSelf: 'stretch', gap: 12 },
  button: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  google: { backgroundColor: theme.ink },
  googleLabel: { color: '#fff', fontSize: 15, fontWeight: '700' },
  kakao: { backgroundColor: '#FEE500' },
  kakaoLabel: { color: theme.ink, fontSize: 15, fontWeight: '700' },
});
```

`src/app/(auth)/login.tsx`:

```tsx
export { default } from '@/screens/login-screen';
```

- [ ] **Step 5: 세션에 따라 화면 가르기**

Task 1이 만든 `src/app/index.tsx` 를 먼저 지운다.

```bash
rm src/app/index.tsx
```

지우지 않으면 Task 8이 만드는 `src/app/(app)/index.tsx` 와 함께 경로 `/` 에 라우트가 둘이 된다.
expo-router에서 괄호로 묶은 라우트 그룹은 URL에 나타나지 않으므로 `(app)/index.tsx` 도 `/` 를 가리킨다.

`src/app/_layout.tsx`:

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useSession } from '@/hooks/use-session';
import { queryClient } from '@/utils/query';

function Routes() {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={session !== null}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={session === null}>
        <Stack.Screen name="(auth)/login" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Routes />
    </QueryClientProvider>
  );
}
```

`Stack.Protected` 가 설치된 expo-router 버전에 없으면, 대신 `useEffect` 안에서 `router.replace('/(auth)/login')` 또는 `router.replace('/(app)')` 로 분기한다.

- [ ] **Step 6: Supabase 리다이렉트 주소 등록**

Supabase 대시보드 → Authentication → URL Configuration → Redirect URLs 에 아래를 추가한다.

```
pokii://auth-callback
```

- [ ] **Step 7: 실기기에서 로그인 확인**

Run: `npx expo start`

Expected:
1. 로그인 화면이 뜬다
2. `Continue with Google` 을 누르면 브라우저가 열린다
3. 로그인하면 앱으로 돌아오고 화면이 바뀐다
4. 앱을 완전히 껐다 켜도 로그인 상태가 유지된다
5. Kakao도 같은 흐름으로 동작한다
6. `.env` 의 값을 일부러 지우고 앱을 다시 열면 오류 메시지가 보인다 (흰 화면이 아니라)

**Android 에뮬레이터에서 반드시 확인한다.** 리다이렉트 스킴 처리가 iOS와 다르므로 iOS만 확인하고 넘어가면 안 된다.

- [ ] **Step 8: 커밋**

```bash
git add src/utils/sign-in.ts src/hooks/use-session.ts src/screens/login-screen.tsx "src/app/(auth)" src/app/_layout.tsx
git rm --cached src/app/index.tsx 2>/dev/null || git add -u src/app/index.tsx
git commit -m "feat(auth): #<이슈번호> Google/Kakao OAuth 로그인 추가

- **구현**
  - expo-auth-session으로 pokii://auth-callback 리다이렉트 처리
  - 콜백 URL 프래그먼트에서 토큰을 꺼내 supabase.auth.setSession으로 세션 수립
  - useSession 훅과 세션 유무에 따른 라우트 분기
  - Android 에뮬레이터에서 두 provider 모두 확인"
```

---

## Task 8: 빈 나무 화면

**Files:**
- Create: `src/screens/tree-screen.tsx`, `src/app/(app)/_layout.tsx`, `src/app/(app)/index.tsx`
- Create: `src/hooks/use-goals.ts`

**Interfaces:**
- Consumes: `supabase` (Task 6), `useSession` (Task 7), `t`·`theme` (Task 4)
- Produces:
  - `type Goal = { id: string; title: string; tag: string; position: 1 | 2 | 3 }`
  - `useGoals(): UseQueryResult<Goal[]>` — 쿼리 키 `['goals']`
  - 나무 화면이 빈 가지 세 개를 보여줌

- [ ] **Step 1: 목표 조회 훅**

`src/hooks/use-goals.ts`:

```ts
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase';

export type Goal = {
  id: string;
  title: string;
  tag: string;
  position: 1 | 2 | 3;
};

/** 나무의 자리 순서. 첫 목표가 가운데(1)에 온다. */
export const SLOTS = [2, 1, 3] as const;

async function fetchGoals(): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('id, title, tag, position')
    .is('archived_at', null)
    .order('position');
  if (error) throw error;
  return data as Goal[];
}

export function useGoals(): UseQueryResult<Goal[]> {
  return useQuery({ queryKey: ['goals'], queryFn: fetchGoals });
}
```

- [ ] **Step 2: 나무 화면**

`src/screens/tree-screen.tsx`. 이 계획에서는 **빈 가지만** 그린다. 송이와 태그는 계획 2에서 붙인다.

```tsx
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SLOTS, useGoals } from '@/hooks/use-goals';
import { t } from '@/i18n';
import { theme } from '@/theme';

export default function TreeScreen() {
  const { data: goals, isLoading, isError, refetch } = useGoals();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>{t('common.error.network')}</Text>
        <Pressable onPress={() => refetch()} style={styles.retry}>
          <Text style={styles.retryLabel}>{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  const filled = new Set((goals ?? []).map((g) => g.position));
  const allEmpty = filled.size === 0;

  return (
    <View style={styles.root}>
      <View style={styles.canopy}>
        {SLOTS.map((slot) => (
          <View key={slot} style={[styles.slotRow, slot === 1 && styles.slotRowCenter]}>
            {filled.has(slot) ? (
              <View style={styles.taken} />
            ) : (
              <Pressable style={styles.empty} accessibilityLabel={`빈 가지 ${slot}`}>
                <Text style={styles.plus}>+</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.greeting}>{t('tree.greeting')}</Text>
        <Text style={styles.body}>{allEmpty ? t('tree.empty') : t('tree.collect')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.sky, padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.sky, gap: 12 },
  canopy: { flex: 1, justifyContent: 'center', gap: 26 },
  slotRow: { alignItems: 'flex-start' },
  slotRowCenter: { alignItems: 'center' },
  empty: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 2.5, borderStyle: 'dashed', borderColor: theme.vine,
    alignItems: 'center', justifyContent: 'center',
  },
  taken: { width: 76, height: 76, borderRadius: 38, backgroundColor: theme.empty },
  plus: { fontSize: 28, fontWeight: '800', color: theme.vine },
  footer: { paddingBottom: 20, gap: 4 },
  greeting: { fontSize: 20, fontWeight: '800', color: theme.ink },
  body: { fontSize: 15, fontWeight: '600', color: theme.ink },
  retry: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 18, backgroundColor: theme.ink },
  retryLabel: { color: '#fff', fontWeight: '700' },
});
```

- [ ] **Step 3: 라우트 연결**

`src/app/(app)/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

`src/app/(app)/index.tsx`:

```tsx
export { default } from '@/screens/tree-screen';
```

- [ ] **Step 4: 실기기에서 확인**

Run: `npx expo start`

Expected:
1. 로그인하면 하늘색 배경에 **점선 원 세 개**가 보인다
2. 가운데 원이 다른 둘보다 가운데 정렬되어 있다
3. 아래에 `hello!` 와 `your tree is waiting` 이 보인다
4. 비행기 모드로 바꾸고 앱을 다시 열면 오류 문구와 `retry` 버튼이 보인다

- [ ] **Step 5: 타입 검사와 전체 테스트**

```bash
npx tsc --noEmit
npm test
```

Expected: 타입 오류 0개, 테스트 전부 통과

- [ ] **Step 6: 커밋**

```bash
git add src/hooks/use-goals.ts src/screens/tree-screen.tsx "src/app/(app)"
git commit -m "feat(tree): #<이슈번호> 빈 나무 화면 추가

- **구현**
  - useGoals 훅. 쿼리 키 ['goals'], 보관하지 않은 목표만 조회
  - 가지 세 자리를 2-1-3 순서로 배치해 첫 목표가 가운데 오도록 함
  - 로딩·에러·빈 상태 처리"
```

---

## 이 계획이 끝나면

```
✅ 앱이 실행되고 로그인이 된다
✅ 열흘 규칙이 31개 테스트로 고정된다
✅ 데이터베이스가 하루 한 알을 물리적으로 보장한다
✅ 빈 나무가 보인다
```

**아직 못 하는 것** — 목표를 만들 수 없고 포도알을 채울 수 없다. 계획 2가 담당한다.

## 다음 계획으로 넘길 것

- `Create Goal` 화면과 목표 생성 시 1번 송이 동시 생성
- `Bunch Detail` 과 하루 기록 화면
- `grapeStateFor` 를 화면에 연결하는 컴포넌트
- 나무에 송이·태그·배지 그리기
