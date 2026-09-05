import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal"] });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await p.goto("http://localhost:3000/work/" + (process.argv[2] || "ucl"), { waitUntil: "networkidle0" });
const body = await p.$(".wp__body"); await body.evaluate(e => e.scrollIntoView({ block: "start" })); await new Promise(r => setTimeout(r, 500));
await p.screenshot({ path: "assets/shots/article-body.png", captureBeyondViewport: false });
await b.close();
