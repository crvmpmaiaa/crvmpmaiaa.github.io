// Full resolution crop of the hero at a scroll position. Usage: node tools/qa/zoom.mjs <p> <x> <y> <w> <h> [out]
import puppeteer from "puppeteer-core";
const [p, x, y, w, h, out = "assets/shots/zoom.png"] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-angle=metal", "--window-size=1440,900"] });
const pg = await b.newPage(); await pg.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await pg.goto("http://localhost:3000", { waitUntil: "networkidle0" }); await pg.waitForSelector("canvas"); await new Promise((r) => setTimeout(r, 2500));
await pg.evaluate((p) => { const hero = document.querySelector(".hero"); const end = hero.offsetTop + hero.offsetHeight - innerHeight; scrollTo(0, hero.offsetTop + (end - hero.offsetTop) * p); }, Number(p));
await new Promise((r) => setTimeout(r, 1500));
await pg.screenshot({ path: out.replace(".png", "-full.png") });
await pg.screenshot({ path: out, clip: { x: Number(x), y: Number(y), width: Number(w), height: Number(h) } });
await b.close(); console.log("wrote", out);
