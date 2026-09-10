# Backlog

대기실이지 기록보관소가 아니다. 완료 이력은 closed Issue와 git log가 갖고 있다.

- **보류** — 여기 쌓인다. `/decide`의 입력
- **유지 → Issue 생성됨** — 이 파일에서 **삭제한다.** 추적은 Issue가 한다
- **제외** — 한 줄 이유와 함께 남긴다. 같은 논의를 반복하지 않기 위해서다

## 보류

- 접근성 라벨 다국어화 — `tree-screen.tsx`의 `accessibilityLabel`이 한국어로 하드코딩되어 있다.
  영어 사용자의 스크린리더가 한국어를 읽는다. i18n 키로 옮길 것 (계획 2 UI 작업 때 함께)

- 임시 로그아웃 버튼 제거 — `tree-screen.tsx`의 `devSignOut`은 설정 화면이 없어서 둔 개발용 버튼이다.
  설정 화면(스펙 586줄)을 만들 때 그쪽으로 옮기고 나무 화면에서 제거할 것

- 세션 토큰 암호화 — `AsyncStorage`는 평문이라 루팅된 기기에서 토큰을 읽을 수 있다.
  Supabase 공식 `LargeSecureStore` 패턴(AES 키는 `expo-secure-store`, 암호문은 `AsyncStorage`)으로 해결.
  `expo-secure-store`는 값당 2048바이트 제한이 있어 세션을 통째로 넣지 못하므로 이 우회가 필요하다.
  결제 기능이 붙어 민감도가 올라가는 시점에 적용할 것

## 제외
