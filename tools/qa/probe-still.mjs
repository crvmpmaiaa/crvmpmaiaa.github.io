import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-angle=metal", "--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto("http://localhost:3000/", { waitUntil: "networkidle0" }); await new Promise(r => setTimeout(r, 3500));
for (const f of [0.31, 0.318, 0.325, 0.332, 0.34]) {
  await p.evaluate((f) => { const max = document.documentElement.scrollHeight - innerHeight; scrollTo(0, max * f); }, f);
  await new Promise(r => setTimeout(r, 1200));
  console.log(f, JSON.stringify(await p.evaluate(() => window.__bdStill)));
}
await b.close();
