import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-angle=metal"] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
for (const [name, url, y] of [["work", "/work", 0], ["work2", "/work", 900], ["article", "/work/ucl", 700], ["contact", "/contact", 0]]) {
  await p.goto("http://localhost:3000" + url, { waitUntil: "networkidle0" });
  await p.evaluate((y) => window.scrollTo(0, y), y); await new Promise(r => setTimeout(r, 800));
  await p.screenshot({ path: `assets/shots/m/page-${name}.png`, captureBeyondViewport: false });
}
await b.close();
