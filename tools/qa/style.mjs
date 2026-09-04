import puppeteer from "puppeteer-core";
const [sel, p = "0.985"] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-angle=metal", "--autoplay-policy=no-user-gesture-required", "--window-size=1440,900"] });
const pg = await b.newPage(); await pg.setViewport({ width: 1440, height: 900 });
await pg.goto("http://localhost:3000", { waitUntil: "networkidle0" }); await pg.waitForSelector("canvas"); await new Promise((r) => setTimeout(r, 2500));
await pg.evaluate((pp) => { const hero = document.querySelector(".hero"); const end = hero.offsetTop + hero.offsetHeight - innerHeight; scrollTo(0, hero.offsetTop + (end - hero.offsetTop) * pp); }, Number(p));
await new Promise((r) => setTimeout(r, 1200));
console.log(await pg.evaluate((sel) => { const el = document.querySelector(sel); if (!el) return "not found"; const cs = getComputedStyle(el); return { cls: el.className, bg: cs.backgroundColor, color: cs.color, pad: cs.padding, radius: cs.borderRadius, display: cs.display, opacity: getComputedStyle(el.parentElement).opacity, rules: [...document.styleSheets].flatMap(s => { try { return [...s.cssRules]; } catch { return []; } }).filter(r => r.selectorText && r.selectorText.includes(".cta")).map(r => r.selectorText + " {" + r.style.cssText.slice(0, 80) + "}") }; }, sel));
await b.close();
