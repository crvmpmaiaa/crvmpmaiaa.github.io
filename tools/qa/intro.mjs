// Timed frames of the load intro.
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-angle=metal", "--window-size=1440,900"] });
const pg = await b.newPage(); await pg.setViewport({ width: 1440, height: 900 });
const t0 = Date.now();
await pg.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
const marks = [400, 1200, 1800, 2400, 3200, 4500];
for (const m of marks) {
  const wait = m - (Date.now() - t0);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  await pg.screenshot({ path: `assets/shots/intro-${m}.png` });
}
console.log("done");
await b.close();
