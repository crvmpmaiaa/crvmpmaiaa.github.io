import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-angle=metal", "--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto("http://localhost:3000", { waitUntil: "networkidle0" }); await new Promise(r => setTimeout(r, 4000));
console.log(JSON.stringify(await p.evaluate(() => {
  const r = (e) => { const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), op: cs.opacity, vis: cs.visibility, fs: cs.fontSize }; };
  return { revealed: document.querySelector(".is-revealed") ? true : false, locked: document.documentElement.className.includes("is-locked"),
    top: r(document.querySelector(".word--top")), bottom: r(document.querySelector(".word--bottom")),
    topLetters: [...document.querySelectorAll(".word--top .letter")].map(r), stage: r(document.querySelector(".hero__stage") || document.querySelector(".hero")), heroCls: document.querySelector(".hero").className };
}), null, 0));
await b.close();
