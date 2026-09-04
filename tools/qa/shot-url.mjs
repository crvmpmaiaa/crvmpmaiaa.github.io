import puppeteer from "puppeteer-core";
const [url, out, w = "1440", h = "900"] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-angle=metal", "--autoplay-policy=no-user-gesture-required", `--window-size=${w},${h}`] });
const pg = await b.newPage(); await pg.setViewport({ width: Number(w), height: Number(h) });
const errs = []; pg.on("pageerror", (e) => errs.push(String(e))); pg.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 200)); });
await pg.goto(url, { waitUntil: "networkidle0", timeout: 60000 }); await new Promise((r) => setTimeout(r, 3500));
await pg.screenshot({ path: out }); console.log("wrote", out, errs.length ? errs : "");
await b.close();
