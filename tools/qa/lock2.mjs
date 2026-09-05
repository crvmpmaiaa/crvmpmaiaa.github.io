import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-angle=metal", "--autoplay-policy=no-user-gesture-required", "--window-size=1440,900"] });
const pg = await b.newPage(); await pg.setViewport({ width: 1440, height: 900 });
await pg.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
for (const t of [800, 1600, 2400, 3200, 4000, 5000]) {
  await new Promise((r) => setTimeout(r, 800));
  const s = await pg.evaluate(() => { window.scrollTo(0, 600); return { y: scrollY, locked: document.documentElement.classList.contains("is-locked"), revealed: !!document.querySelector(".is-revealed"), hint: getComputedStyle(document.querySelector(".scroll-hint")).visibility }; });
  console.log(t, JSON.stringify(s));
  await pg.evaluate(() => window.scrollTo(0, 0));
}
await b.close();
