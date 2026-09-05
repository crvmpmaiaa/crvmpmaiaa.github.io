import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-angle=metal", "--autoplay-policy=no-user-gesture-required", "--window-size=1440,900"] });
const pg = await b.newPage(); await pg.setViewport({ width: 1440, height: 900 });
const errs = []; pg.on("pageerror", (e) => errs.push(String(e))); pg.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 160)); });
await pg.goto("http://localhost:3000", { waitUntil: "networkidle0" }); await new Promise((r) => setTimeout(r, 2500));
await pg.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await new Promise((r) => setTimeout(r, 3500));
await pg.screenshot({ path: "assets/shots/footer.png" }); console.log("footer", errs.slice(0, 3)); await b.close();
