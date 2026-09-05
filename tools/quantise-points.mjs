// Pack the Blender sampler's float32 point buffers into 22 bytes a point: int16 positions against the manifest
// bounds, int8 normals, uint8 colours and delay. Rebuild normals (nrmB) are not read by the shader and are dropped.
// Usage: node tools/quantise-points.mjs   (rewrites public/points/{desktop,mobile}.bin and .json in place)
import fs from "node:fs";
const FLOATS = 19, BYTES = 22;
for (const set of ["desktop", "mobile"]) {
  const jsonPath = `public/points/${set}.json`, binPath = `public/points/${set}.bin`;
  const meta = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  if (meta.format === "q1") { console.log(set, "already packed"); continue; }
  const f = new Float32Array(fs.readFileSync(binPath).buffer.slice(0));
  const n = meta.count;
  if (f.length !== n * FLOATS) throw new Error(`${set}: expected ${n * FLOATS} floats, got ${f.length}`);
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < n; i++) for (const o of [i * FLOATS, i * FLOATS + 9]) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], f[o + k]); hi[k] = Math.max(hi[k], f[o + k]); }
  const out = new ArrayBuffer(n * BYTES), dv = new DataView(out);
  const q16 = (v, k) => Math.round(((v - lo[k]) / (hi[k] - lo[k] || 1)) * 65535) - 32768;
  const q8 = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));
  const s8 = (v) => Math.max(-127, Math.min(127, Math.round(v * 127)));
  for (let i = 0; i < n; i++) {
    const o = i * FLOATS, b = i * BYTES;
    for (let k = 0; k < 3; k++) dv.setInt16(b + k * 2, q16(f[o + k], k), true);          // posA
    for (let k = 0; k < 3; k++) dv.setInt8(b + 6 + k, s8(f[o + 3 + k]));                  // nrmA
    for (let k = 0; k < 3; k++) dv.setUint8(b + 9 + k, q8(f[o + 6 + k]));                 // colA
    for (let k = 0; k < 3; k++) dv.setInt16(b + 12 + k * 2, q16(f[o + 9 + k], k), true);  // posB
    for (let k = 0; k < 3; k++) dv.setUint8(b + 18 + k, q8(f[o + 15 + k]));               // colB
    dv.setUint8(b + 21, q8(f[o + 18]));                                                    // delay
  }
  fs.writeFileSync(binPath, Buffer.from(out));
  fs.writeFileSync(jsonPath, JSON.stringify({ ...meta, format: "q1", bytesPerPoint: BYTES, qlo: lo, qhi: hi, bytes: n * BYTES }, null, 2));
  console.log(set, n, "points", (n * BYTES / 1e6).toFixed(1), "MB");
}
