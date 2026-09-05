// Transparent stills of the 3D scene for the phone version. Hides the sky and the copy, screenshots the stage
// with no background, then trims to the content. Usage: node tools/qa/stills.mjs
import puppeteer from "puppeteer-core";
import fs from "node:fs";
const W = 430, H = 932;
const SHOTS = [
  { name: "statue", p: 0.0, hide: [".copy", ".hero-nav", ".scroll-hint"] },
  { name: "dust", p: 0.235, hide: [".copy", ".hero-nav", ".scroll-hint"] },
  { name: "pillar", p: 0.395, hide: [".copy", ".hero-nav", ".scroll-hint"] },
  { name: "temple", p: 0.80, hide: [".copy", ".hero-nav", ".scroll-hint", ".work"] },
];
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-angle=metal", "--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
await p.setViewport({ width: W, height: H, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await p.goto("http://localhost:3000/", { waitUntil: "networkidle0", timeout: 60000 });
await new Promise((r) => setTimeout(r, 4000));
fs.mkdirSync("assets/stills", { recursive: true });
const ONLY = process.env.ONLY;
for (const s of SHOTS.filter((x) => !ONLY || x.name === ONLY)) {
  await p.evaluate((p) => { const max = document.documentElement.scrollHeight - innerHeight; const hero = document.querySelector(".hero"); const end = hero.offsetTop + hero.offsetHeight - innerHeight; scrollTo(0, hero.offsetTop + (end - hero.offsetTop) * p); }, s.p);
  await new Promise((r) => setTimeout(r, 1500));
  await p.addStyleTag({ content: `html, body, .hero, .hero__stage { background: transparent !important; } .hero__canvas--sky, video, .hero__sky-poster { visibility: hidden !important; } ${s.hide.join(", ")} { display: none !important; }` });
  await new Promise((r) => setTimeout(r, 300));
  await p.screenshot({ path: `assets/stills/${s.name}.png`, omitBackground: true, captureBeyondViewport: false });
  console.log(s.name, "captured");
  await p.reload({ waitUntil: "networkidle0" }); await new Promise((r) => setTimeout(r, 3500));
}
if (!ONLY) {
// atlas from the footer
await p.evaluate(() => document.querySelector(".footer").scrollIntoView());
await new Promise((r) => setTimeout(r, 2500));
await p.addStyleTag({ content: `html, body, .footer { background: transparent !important; } .footer__waves { visibility: hidden !important; }` });
await new Promise((r) => setTimeout(r, 300));
const atlas = await p.$(".footer__atlas");
await atlas.screenshot({ path: "assets/stills/atlas.png", omitBackground: true });
console.log("atlas captured");
}
await b.close();
