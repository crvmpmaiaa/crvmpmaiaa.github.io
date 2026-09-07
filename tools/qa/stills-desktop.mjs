// Hi-res transparent stills from the desktop framing (1440 x 900 at 3x). Usage: node tools/qa/stills-desktop.mjs
import puppeteer from "puppeteer-core";
import fs from "node:fs";
const SHOTS = [
  { name: "statue-full", p: 0.14, extra: "" },
  { name: "pillar-bare", p: 0.342, extra: "&nodust" },
  { name: "pillar-laptop", p: 0.39, extra: "&nodust" },
];
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-angle=metal", "--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 3 });
fs.mkdirSync("assets/stills", { recursive: true });
for (const s of SHOTS) {
  await p.goto("http://localhost:3000/?rig" + s.extra, { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 4000));
  await p.evaluate((p) => { const hero = document.querySelector(".hero"); const end = hero.offsetTop + hero.offsetHeight - innerHeight; scrollTo(0, hero.offsetTop + (end - hero.offsetTop) * p); }, s.p);
  await new Promise((r) => setTimeout(r, 1800));
  await p.addStyleTag({ content: `html, body, .hero, .hero__stage { background: transparent !important; } .hero__canvas--sky, video, .hero__sky-poster { visibility: hidden !important; } .copy, .hero-nav, .scroll-hint, .work, .deck { display: none !important; }` });
  await new Promise((r) => setTimeout(r, 300));
  await p.screenshot({ path: `assets/stills/d-${s.name}.png`, omitBackground: true, captureBeyondViewport: false });
  console.log(s.name, "captured");
}
await b.close();
