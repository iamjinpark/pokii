import { existsSync, mkdirSync } from "node:fs";
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

mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({ executablePath: chrome, headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

  // Chrome CLI --window-size는 레이아웃 폭을 강제하지 못하고 넓게 렌더한 뒤 잘라낸다.
  // 그러면 없는 레이아웃 버그가 보인다. 실제 적용된 폭을 확인해 조용히 거짓말하지 않게 한다.
  const actual = await page.evaluate(() => window.innerWidth);
  if (actual !== width) {
    die(`뷰포트 폭이 적용되지 않았다: 요청 ${width}px, 실제 ${actual}px`);
  }

  await page.screenshot({ path: out });
  console.log(`${out}\n  ${url} · ${width}x${height} (실제 폭 ${actual}px 확인)`);
} finally {
  await browser.close();
}
