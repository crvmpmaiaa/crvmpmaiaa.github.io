import puppeteer from "puppeteer-core";
import fs from "node:fs";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal","--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const srcs = [];
p.on("response", async r => { const u = r.url(); if (u.endsWith(".js")) { try { const t = await r.text(); if (/distortion|uDisplacement|gl_FragColor|fragmentShader/i.test(t)) srcs.push({ u, t }); } catch {} } });
await p.goto("https://zerasoftwarestudio.com/work", { waitUntil: "networkidle2", timeout: 60000 });
await new Promise(r => setTimeout(r, 2000));
for (const s of srcs) fs.writeFileSync("assets/zera-" + s.u.split("/").pop(), s.t);
console.log(srcs.map(s => s.u));
const wrap = await p.$(".project-distortion-canvas-wrap");
await wrap.evaluate(e => e.scrollIntoView({ block: "center" }));
await new Promise(r => setTimeout(r, 1500));
const r = await wrap.boundingBox();
console.log(r);
await p.mouse.move(r.x + r.width/2, r.y + r.height/2);
for (let i = 0; i < 10; i++) { await p.screenshot({ path: `assets/shots/zera-hover-${i}.png`, clip: { x: r.x, y: r.y, width: r.width, height: r.height } }); await new Promise(r => setTimeout(r, 100)); await p.mouse.move(r.x + r.width/2 + i*30, r.y + r.height/2 + i*10); }
await b.close();
