# pokii
Collect a pokii a day, fill a bunch in ten days.

## 스크린샷 검증

웹으로 화면을 캡처해 눈으로 확인하는 경로다.

```bash
npm run web                          # dev server가 먼저 떠 있어야 한다
npm run screenshot -- /goal/<id>     # 기본 경로는 /
```

### 도구 전용 세션

보호된 화면을 찍으려면 세션이 필요하다. **평소 쓰는 브라우저의 세션을 복사해 오면 안 된다.**

Supabase refresh token은 1회용이고 갱신할 때마다 회전한다. 도구와 브라우저가 같은 세션을
나눠 쓰면 한쪽이 갱신하는 순간 다른 쪽 토큰이 `refresh_token_already_used`로 죽는다.
로그인할 때마다 독립된 세션이 발급되므로, 도구에게 자기 세션을 주면 서로를 건드리지 않는다.

준비는 한 번만 하면 된다.

1. **시크릿 창**에서 `http://localhost:8081`을 열고 평소와 같은 계정으로 로그인한다
   (계정이 같아야 도구가 내 데이터를 본다)
2. 콘솔에서 세션을 복사한다
   ```js
   copy(localStorage.getItem(Object.keys(localStorage).find((k) => k.endsWith('-auth-token'))))
   ```
3. `.auth/session.json`에 붙여넣는다
4. **로그아웃하지 말고 시크릿 창을 닫는다.** 로그아웃하면 방금 복사한 토큰이 서버에서
   폐기된다. 창을 열어둔 채로 두면 그쪽이 토큰을 갱신해 도구의 것이 죽는다

그 뒤로는 도구가 자기 토큰을 갱신하며 파일에 되쓰므로 손댈 일이 없다.
`.auth/`는 gitignore 대상이라 저장소에 올라가지 않는다.

도구가 `refresh token이 이미 사용됐다`로 실패하면 그 세션이 죽은 것이다. 위 절차를 다시 밟는다.
