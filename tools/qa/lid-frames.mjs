// The laptop lid opening, as transparent stills from the 3D scene at the pillar still's own camera and light.
import puppeteer from "puppeteer-core";
import fs from "node:fs";
const STEPS = [0, 0.12, 0.25, 0.4, 0.55, 0.7, 0.85, 1];
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-angle=metal", "--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 3 });
fs.mkdirSync("assets/stills/lid", { recursive: true });
for (const x of STEPS) {
  await p.goto(`http://localhost:3000/?rig&nodust&lid=${x}`, { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 4000));
  await p.evaluate(() => { const hero = document.querySelector(".hero"); const end = hero.offsetTop + hero.offsetHeight - innerHeight; scrollTo(0, hero.offsetTop + (end - hero.offsetTop) * 0.3834); });
  await new Promise((r) => setTimeout(r, 1800));
  await p.addStyleTag({ content: `html, body, .hero, .hero__stage { background: transparent !important; } .hero__canvas--sky, video, .hero__sky-poster { visibility: hidden !important; } .copy, .hero-nav, .scroll-hint, .work, .deck { display: none !important; }` });
  await new Promise((r) => setTimeout(r, 300));
  await p.screenshot({ path: `assets/stills/lid/${x}.png`, omitBackground: true, captureBeyondViewport: false });
  console.log("lid", x);
}
await b.close();
