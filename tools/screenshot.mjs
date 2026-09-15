import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import puppeteer from "puppeteer-core";

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const route = process.argv[2]?.startsWith("--") ? "/" : (process.argv[2] ?? "/");
const width = Number(arg("width", 390));
const height = Number(arg("height", 844));
const origin = arg("origin", "http://localhost:8081");
const outDir = resolve(arg("outDir", ".screenshots"));
const out = resolve(outDir, arg("name", "screen") + ".png");
const sessionPath = resolve(arg("session", ".auth/session.json"));

// puppeteer-core는 Chromium을 내려받지 않는다. 설치된 Chrome을 가리켜야 한다.
const chrome =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const die = (msg) => {
  console.error(`스크린샷 실패: ${msg}`);
  process.exit(1);
};

if (!existsSync(chrome)) {
  die(`Chrome을 찾을 수 없다: ${chrome}\n  CHROME_PATH 환경변수로 경로를 지정하라.`);
}

const url = origin + route;
try {
  const res = await fetch(origin, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) die(`dev server가 ${res.status}를 반환했다: ${origin}`);
} catch (e) {
  die(
    `dev server에 연결할 수 없다: ${origin} (${e.message})\n` +
      `  'npm run web'으로 먼저 띄워라.`,
  );
}

// 세션 주입: Chrome이 임시 프로필로 뜨므로 개발자 브라우저의 로그인 상태를 물려받지
// 못한다. 보호된 라우트를 찍으려면 세션을 직접 넣어야 한다.
// supabase 클라이언트는 storage로 AsyncStorage를 쓰고, 웹 구현은 접두어 없이
// localStorage를 그대로 사용한다.
let inject = null;
if (existsSync(sessionPath)) {
  try {
    process.loadEnvFile(".env");
  } catch {
    /* .env 없이 환경변수로 준 경우 */
  }
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    die("EXPO_PUBLIC_SUPABASE_URL을 읽을 수 없어 세션 키를 만들 수 없다.");
  }
  const ref = new URL(supabaseUrl).hostname.split(".")[0];
  const raw = readFileSync(sessionPath, "utf8").trim();
  try {
    JSON.parse(raw);
  } catch {
    die(`세션 파일이 올바른 JSON이 아니다: ${sessionPath}`);
  }
  inject = { key: `sb-${ref}-auth-token`, value: raw };
}

mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({ executablePath: chrome, headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  // Supabase refresh token은 1회용이라 쓸 때마다 회전한다. 도구와 브라우저가 같은 세션을
  // 나눠 쓰면 서로의 토큰을 무효화한다. 그러면 앱이 로그인 화면으로 떨어지는데, 그걸
  // 모른 채 캡처하면 "화면이 깨졌다"로 오진한다. 갱신 실패를 잡아 사유를 말하게 한다.
  // 갱신 거절만 잡는다. auth-js는 5xx를 인프라 오류로 보고 스스로 재시도해 성공하므로
  // 그것까지 실패로 처리하면 멀쩡한 실행을 "세션이 죽었다"고 오진한다.
  // 200 응답에는 토큰이 들어 있으므로 본문을 건드리는 경로에 절대 닿지 않게 한다.
  let refreshFailure = null;
  const inspected = [];
  page.on("response", (res) => {
    if (!res.url().includes("grant_type=refresh_token") || res.status() !== 400) return;
    inspected.push(
      res
        .text()
        .catch(() => "")
        .then((body) => {
          if (refreshFailure) return;
          // Chrome이 본문을 버린 뒤면 읽지 못한다. 그래도 /token의 400은 갱신 거절이므로
          // 원인을 잃지 않게 같은 안내로 떨어뜨린다.
          refreshFailure =
            body === "" || body.includes("refresh_token_already_used")
              ? "refresh token이 이미 사용됐거나 만료됐다 (다른 곳에서 같은 세션을 갱신했다)"
              : `토큰 갱신이 400으로 거절됐다: ${body.slice(0, 120)}`;
        }),
    );
  });
  if (inject) {
    await page.evaluateOnNewDocument(
      (k, v) => window.localStorage.setItem(k, v),
      inject.key,
      inject.value,
    );
  }
  // 앱이 autoRefreshToken으로 갱신한 세션은 임시 프로필과 함께 버려진다. 파일에
  // 되써서 다음 실행이 살아있는 토큰을 쓰게 한다. 세션이 비었거나 형식이 다르면
  // 덮어쓰지 않는다 (로그아웃·만료 시 멀쩡한 토큰을 잃지 않도록).
  let renewed = false;
  const saveSession = async () => {
    if (!inject) return;
    const after = await page.evaluate((k) => window.localStorage.getItem(k), inject.key);
    if (!after || after === inject.value) return;
    try {
      if (JSON.parse(after)?.access_token) {
        writeFileSync(sessionPath, after);
        inject.value = after;
        renewed = true;
      }
    } catch {
      /* 파싱 불가면 그대로 둔다 */
    }
  };

  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

  // 아래 단계에서 실패로 빠져나가도 회전된 토큰을 잃지 않도록 먼저 저장한다.
  // 잃으면 다음 실행이 already_used로 죽고, 도구가 자기가 태운 토큰을 브라우저 탓으로 돌린다.
  await saveSession();

  // Chrome CLI --window-size는 레이아웃 폭을 강제하지 못하고 넓게 렌더한 뒤 잘라낸다.
  // 그러면 없는 레이아웃 버그가 보인다. 실제 적용된 폭을 확인해 조용히 거짓말하지 않게 한다.
  const actual = await page.evaluate(() => window.innerWidth);
  if (actual !== width) {
    die(`뷰포트 폭이 적용되지 않았다: 요청 ${width}px, 실제 ${actual}px`);
  }

  // networkidle2는 조회가 끝났다는 뜻이 아니다. 로딩 스피너가 도는 화면을 찍고도
  // 성공으로 보고할 수 있다. 두 프레임을 비교해 화면이 아직 움직이면 알린다.
  const before = await page.screenshot();
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: out });
  const settled = before.equals(readFileSync(out));

  // 캡처를 기다리는 사이에 갱신됐을 수도 있다.
  await saveSession();

  // 리스너가 본문을 비동기로 읽는다. 기다리지 않으면 늦게 도착한 400을 놓치고
  // 아래 경로 불일치 분기로 떨어져 원인을 다시 오진한다.
  await Promise.all(inspected);
  if (refreshFailure) {
    die(
      `${refreshFailure}\n` +
        `  ${sessionPath}의 세션이 죽었다. 이 도구는 전용 세션을 써야 한다.\n` +
        `  시크릿 창에서 같은 계정으로 다시 로그인한 뒤 그 세션만 넣어라.\n` +
        `  절차: README.md "스크린샷 검증" (이미지는 저장했다)`,
    );
  }

  // Stack.Protected 가드는 세션이 없으면 로그인으로 돌려보낸다. 그걸 모른 채
  // "요청한 화면을 찍었다"고 믿으면 엉뚱한 화면을 검증하게 된다.
  const landed = await page.evaluate(() => location.pathname);
  const auth = inject ? (renewed ? "세션 주입됨 · 갱신 저장" : "세션 주입됨") : "세션 없음";
  console.log(`${out}\n  ${url} · ${width}x${height} (실제 폭 ${actual}px) · ${auth}`);
  if (!settled) {
    console.log(
      "  경고: 화면이 아직 움직인다. 로딩 스피너거나 애니메이션일 수 있다.\n" +
        "  이 캡처를 '완성된 화면'으로 믿지 마라.",
    );
  }
  if (landed !== route) {
    die(
      `요청한 경로가 아니다: 요청 ${route}, 도착 ${landed}\n` +
        `  보호된 화면이라 로그인으로 리다이렉트된 것일 수 있다. ` +
        `${sessionPath}에 세션을 넣어라. (이미지는 저장했다)`,
    );
  }
} finally {
  await browser.close();
}
