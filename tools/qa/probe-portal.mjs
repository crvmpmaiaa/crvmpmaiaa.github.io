import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-angle=metal", "--window-size=1440,900", "--autoplay-policy=no-user-gesture-required"] });
const pg = await b.newPage(); await pg.setViewport({ width: 1440, height: 900 });
const logs = []; pg.on("console", (m) => logs.push(m.type() + ": " + m.text().slice(0, 200)));
await pg.goto("http://localhost:3000/portal", { waitUntil: "networkidle0" }); await new Promise((r) => setTimeout(r, 4000));
console.log(await pg.evaluate(() => window.__bdBackdrop));
console.log(await pg.evaluate(() => { const v = document.querySelector("video"); return { ready: v?.readyState, t: v?.currentTime, paused: v?.paused, src: v?.currentSrc, err: v?.error?.code, w: v?.videoWidth }; }));
console.log(logs.filter((l) => !l.includes("HMR") && !l.includes("DevTools")).slice(0, 10).join("\n"));
await b.close();
