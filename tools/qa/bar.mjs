import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal"] });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await p.goto("http://localhost:3000/work", { waitUntil: "networkidle0" });
await p.evaluate(() => window.scrollTo(0, 1400)); await new Promise(r => setTimeout(r, 600));
await p.screenshot({ path: "assets/shots/bar-pinned.png", captureBeyondViewport: false });
await b.close();
