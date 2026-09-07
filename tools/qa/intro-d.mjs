import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-angle=metal", "--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
await p.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
const t0 = Date.now(); const ts = [];
for (let i = 0; i < 12; i++) { await p.screenshot({ path: `assets/shots/intro-d-${i}.png` }); ts.push(Date.now() - t0); await new Promise(r => setTimeout(r, 300)); }
console.log(ts.join(" "));
await b.close();
