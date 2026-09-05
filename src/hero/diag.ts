/**
 * On-device diagnostics for crashes we cannot see. Every stage writes a line to localStorage as it happens, so
 * when the tab is killed the next load with ?diag shows how far the previous run got. Cheap: a few string writes.
 */
const KEY = "bd-diag";
let started = false;
let box: HTMLElement | null = null;

function read(): string[] { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } }
function write(lines: string[]) { try { localStorage.setItem(KEY, JSON.stringify(lines.slice(-60))); } catch { /* storage may be off */ } }

export function diag(msg: string) {
  if (typeof window === "undefined") return;
  const line = `${(performance.now() / 1000).toFixed(1)}s ${msg}`;
  const lines = read(); lines.push(line); write(lines);
  if (box) box.textContent += "\n" + line;
}

/** call once at first client mount */
export function diagStart() {
  if (typeof window === "undefined" || started) return;
  started = true;
  const show = new URLSearchParams(location.search).has("diag");
  const previous = read();
  write(["--- new run " + new Date().toISOString()]);
  if (show) {
    box = document.createElement("pre");
    box.style.cssText = "position:fixed;left:0;top:0;z-index:99999;margin:0;padding:8px;max-height:60vh;overflow:auto;font:11px/1.35 monospace;background:rgba(0,0,0,.85);color:#9f9;white-space:pre-wrap;pointer-events:auto;width:100vw;box-sizing:border-box";
    box.textContent = "PREVIOUS RUN:\n" + previous.join("\n") + "\n\nTHIS RUN:";
    document.body.appendChild(box);
  }
  const nav = navigator as Navigator & { deviceMemory?: number; hardwareConcurrency?: number };
  diag(`ua ${navigator.userAgent.slice(0, 80)}`);
  diag(`vp ${innerWidth}x${innerHeight} dpr ${devicePixelRatio} mem ${nav.deviceMemory ?? "?"} cores ${nav.hardwareConcurrency ?? "?"}`);
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") as WebGL2RenderingContext | null;
    if (gl) {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      const r = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      diag(`gpu ${String(r).slice(0, 60)} maxTex ${gl.getParameter(gl.MAX_TEXTURE_SIZE)}`);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    } else diag("no webgl2");
  } catch (e) { diag("gl probe failed " + String(e).slice(0, 60)); }
  window.addEventListener("error", (e) => diag("error " + String(e.message).slice(0, 120)));
  window.addEventListener("unhandledrejection", (e) => diag("rejection " + String(e.reason).slice(0, 120)));
  // heartbeat so we know how long the run lived
  let n = 0;
  const beat = () => { n++; if (n <= 30) { diag(`alive scrollY ${Math.round(scrollY)}`); setTimeout(beat, 2000); } };
  setTimeout(beat, 2000);
}
