import { existsSync, mkdirSync, readFileSync } from "node:fs";
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
  if (inject) {
    await page.evaluateOnNewDocument(
      (k, v) => window.localStorage.setItem(k, v),
      inject.key,
      inject.value,
    );
  }
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

  // Chrome CLI --window-size는 레이아웃 폭을 강제하지 못하고 넓게 렌더한 뒤 잘라낸다.
  // 그러면 없는 레이아웃 버그가 보인다. 실제 적용된 폭을 확인해 조용히 거짓말하지 않게 한다.
  const actual = await page.evaluate(() => window.innerWidth);
  if (actual !== width) {
    die(`뷰포트 폭이 적용되지 않았다: 요청 ${width}px, 실제 ${actual}px`);
  }

  await page.screenshot({ path: out });

  // Stack.Protected 가드는 세션이 없으면 로그인으로 돌려보낸다. 그걸 모른 채
  // "요청한 화면을 찍었다"고 믿으면 엉뚱한 화면을 검증하게 된다.
  const landed = await page.evaluate(() => location.pathname);
  const auth = inject ? "세션 주입됨" : "세션 없음";
  console.log(`${out}\n  ${url} · ${width}x${height} (실제 폭 ${actual}px) · ${auth}`);
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
