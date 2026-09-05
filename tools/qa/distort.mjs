import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal"] });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await p.goto("http://localhost:3000/work", { waitUntil: "networkidle0" });
const fig = (await p.$$(".wp__preview"))[0];
await fig.evaluate(e => e.scrollIntoView({ block: "center" }));
await new Promise(r => setTimeout(r, 1200));
const r = await fig.boundingBox(); console.log(r);
await p.mouse.move(r.x + 20, r.y + r.height * 0.4);
for (let i = 0; i < 12; i++) { await p.mouse.move(r.x + 20 + i * (r.width - 40) / 12, r.y + r.height * (0.4 + 0.02 * i), { steps: 2 }); await new Promise(r => setTimeout(r, 30)); if (i % 3 === 2) { const live = await p.evaluate(() => !!document.querySelector(".wp__distort.is-live")); console.log("live", live); await p.screenshot({ path: `assets/shots/distort-${i}.png`, captureBeyondViewport: false }); } }
await p.goto("http://localhost:3000/", { waitUntil: "networkidle0" }); await new Promise(r => setTimeout(r, 5000));
await p.screenshot({ path: "assets/shots/hero-nav.png" });
await b.close();
