// Screenshots of the hero at a set of scroll positions, plus a rough frame rate probe.
// Usage: node tools/qa/shots.mjs [baseUrl] [w] [h]
import puppeteer from "puppeteer-core";
import fs from "node:fs";

const base = process.argv[2] ?? "http://localhost:4173";
const W = Number(process.argv[3] ?? 1440), H = Number(process.argv[4] ?? 900);
const POSITIONS = (process.env.P ?? "0,0.06,0.15,0.22,0.3,0.38,0.45").split(",").map(Number);
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--use-angle=metal", "--enable-gpu-rasterization", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required", `--window-size=${W},${H}`],
});
const page = await browser.newPage();
if (process.env.FREEZE) await page.evaluateOnNewDocument(() => { window.__bdFreeze = true; });
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("requestfailed", (r) => errors.push("request failed " + r.url()));
page.on("response", (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.goto(base, { waitUntil: "networkidle0", timeout: 60000 });
await page.waitForSelector("canvas", { timeout: 20000 });
await new Promise((r) => setTimeout(r, 2500));
fs.mkdirSync("assets/shots", { recursive: true });
for (const p of POSITIONS) {
  await page.evaluate((p) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const hero = document.querySelector(".hero");
    const end = hero.offsetTop + hero.offsetHeight - window.innerHeight;
    window.scrollTo(0, hero.offsetTop + (end - hero.offsetTop) * p);
  }, p);
  await new Promise((r) => setTimeout(r, 1400));
  const got = await page.evaluate(() => window.__bdProgress);
  console.log(`p ${p.toFixed(2)} -> progress ${got?.toFixed(3)}`);
  await page.screenshot({ path: `assets/shots/p-${p.toFixed(4)}.png` });
}
// frame rate probe at p = 0.06 and 0.3 (headless GPU is not the M3 in Safari, treat as a floor)
const fps = {};
for (const p of [0.06, 0.3]) {
  await page.evaluate((p) => {
    const hero = document.querySelector(".hero");
    const end = hero.offsetTop + hero.offsetHeight - window.innerHeight;
    window.scrollTo(0, hero.offsetTop + (end - hero.offsetTop) * p);
  }, p);
  await new Promise((r) => setTimeout(r, 600));
  fps[p] = await page.evaluate(() => new Promise((res) => {
    let n = 0; const t0 = performance.now();
    const tick = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(tick); else res(Math.round(n / 2)); };
    requestAnimationFrame(tick);
  }));
}
console.log("fps", JSON.stringify(fps));
console.log("errors", errors.length ? errors : "none");
await browser.close();
