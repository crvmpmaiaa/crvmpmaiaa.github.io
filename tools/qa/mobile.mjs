// Phone viewport walk of the whole page. Usage: P=0,0.05,... node tools/qa/mobile.mjs [url] [w] [h]
import puppeteer from "puppeteer-core";
import fs from "node:fs";
const base = process.argv[2] ?? "http://localhost:3000";
const W = Number(process.argv[3] ?? 390), H = Number(process.argv[4] ?? 844);
const POSITIONS = (process.env.P ?? "0,0.04,0.09,0.14,0.2,0.26,0.32,0.37,0.42,0.46,0.5,0.55,0.6,0.65,0.7,0.75,0.8,0.85,0.9,0.95,1").split(",").map(Number);
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-angle=metal", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1");
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.goto(base, { waitUntil: "networkidle0", timeout: 60000 });
await new Promise((r) => setTimeout(r, 3500));
fs.mkdirSync("assets/shots/m", { recursive: true });
const info = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, vh: innerHeight, mode: document.documentElement.className, canvases: document.querySelectorAll("canvas").length }));
console.log(JSON.stringify(info));
for (const p of POSITIONS) {
  await page.evaluate((p) => { const max = document.documentElement.scrollHeight - innerHeight; window.scrollTo(0, max * p); }, p);
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: `assets/shots/m/${p.toFixed(2)}.png` });
}
console.log("errors", errors.length ? errors.slice(0, 5) : "none");
await browser.close();
