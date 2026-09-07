import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-angle=metal", "--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
const t0 = Date.now(); const shots = [];
for (let i = 0; i < 14; i++) { await p.screenshot({ path: `assets/shots/m/intro-${i}.png` }); shots.push(Date.now() - t0); await new Promise(r => setTimeout(r, 250)); }
console.log(shots.join(" "), await p.evaluate(() => ({ revealed: !!document.querySelector(".is-revealed"), locked: document.documentElement.classList.contains("is-locked"), intro: !!document.querySelector(".intro"), letters: document.querySelectorAll(".copy--wordmark .letter").length })));
await b.close();
