import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-angle=metal", "--window-size=1440,900"] });
const pg = await b.newPage(); await pg.setViewport({ width: 1440, height: 900 });
await pg.goto("http://localhost:3000", { waitUntil: "networkidle0" }); await pg.waitForSelector("canvas"); await new Promise((r) => setTimeout(r, 3500));
const [from, to, step] = (process.env.R ?? "0.85,0.98,0.01").split(",").map(Number);
for (let p = from; p <= to + 1e-9; p += step) {
  await pg.evaluate((pp) => { const hero = document.querySelector(".hero"); const end = hero.offsetTop + hero.offsetHeight - innerHeight; scrollTo(0, hero.offsetTop + (end - hero.offsetTop) * pp); }, p);
  await new Promise((r) => setTimeout(r, 700));
  const s = await pg.evaluate(() => ({ cam: window.__bdCam, rig: window.__bdRig }));
  console.log(p.toFixed(3), JSON.stringify(s.cam?.pos), "look", JSON.stringify(s.cam?.look), "fov", s.cam?.fov, "| gy", s.rig?.gy, "rot", s.rig?.rot, "lid", s.rig?.lid, "sc", JSON.stringify(s.rig?.sc));
}
await b.close();
