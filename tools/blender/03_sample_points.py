"""Point cloud sampling for the morph.
Target A = statue LOD0 surface. Target B = column + closed laptop, assembled as on the page.
Same N for both, spatially coherent pairing via Morton order in a shared normalised space, per point delay.
Output: public/points/<set>.bin (packed Float32Array) and .json manifest.
Run: tools/blender/run.sh 03_sample_points.py [desktop|mobile ...]
"""
import json
import math
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(__file__))
import bpy
import mathutils
import numpy as np
from common import *

FLOATS_PER_POINT = 19  # posA(3) nrmA(3) colA(3) posB(3) nrmB(3) colB(3) delay(1)


def triangles_world(obj, depsgraph):
    """Triangulated world space geometry with per corner UVs and the object's albedo image, if any."""
    ev = obj.evaluated_get(depsgraph)
    me = ev.to_mesh()
    me.calc_loop_triangles()
    mw = ev.matrix_world
    nmat = mw.to_3x3().inverted().transposed()
    n_tri = len(me.loop_triangles)
    P = np.empty((n_tri, 3, 3), np.float64)
    N = np.empty((n_tri, 3, 3), np.float64)
    UV = np.zeros((n_tri, 3, 2), np.float64)
    uv_layer = me.uv_layers.active
    verts = me.vertices
    loops = me.loops
    for i, t in enumerate(me.loop_triangles):
        for k in range(3):
            v = verts[t.vertices[k]]
            P[i, k] = mw @ v.co
            N[i, k] = (nmat @ loops[t.loops[k]].normal).normalized() if hasattr(loops[t.loops[k]], "normal") else (nmat @ v.normal).normalized()
            if uv_layer:
                UV[i, k] = uv_layer.data[t.loops[k]].uv
    ev.to_mesh_clear()
    return P, N, UV


def albedo_pixels(obj):
    """(H, W, 3) float array of the material's base colour texture, or a flat colour."""
    mat = obj.data.materials[0] if obj.data.materials else None
    if mat and mat.use_nodes:
        bsdf = next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if bsdf:
            link = bsdf.inputs["Base Color"].links
            node = link[0].from_node if link else None
            # follow one mix node (albedo x AO) back to the albedo image
            while node and node.type != "TEX_IMAGE":
                src = next((l for inp in node.inputs for l in inp.links if l.from_node.type == "TEX_IMAGE"), None)
                node = src.from_node if src else None
            if node and node.image:
                img = node.image
                w, h = img.size
                px = np.array(img.pixels[:], np.float32).reshape(h, w, img.channels)[:, :, :3]
                if img.colorspace_settings.name == "sRGB":
                    pass  # Blender stores float pixels linear already
                return px
            c = bsdf.inputs["Base Color"].default_value
            return np.array([[[c[0], c[1], c[2]]]], np.float32)
    return np.array([[[0.8, 0.8, 0.8]]], np.float32)


def sample_surface(objs, n, rng):
    """Area weighted surface sampling across several objects (proportional to area)."""
    deps = bpy.context.evaluated_depsgraph_get()
    parts = []
    for o in objs:
        P, N, UV = triangles_world(o, deps)
        area = 0.5 * np.linalg.norm(np.cross(P[:, 1] - P[:, 0], P[:, 2] - P[:, 0]), axis=1)
        parts.append((P, N, UV, area, albedo_pixels(o)))
    total = sum(p[3].sum() for p in parts)
    pos = np.empty((n, 3), np.float32); nrm = np.empty((n, 3), np.float32); col = np.empty((n, 3), np.float32)
    counts = [int(round(n * p[3].sum() / total)) for p in parts]
    counts[-1] = n - sum(counts[:-1])
    at = 0
    for (P, N, UV, area, px), cnt in zip(parts, counts):
        if cnt <= 0:
            continue
        tri = rng.choice(len(area), size=cnt, p=area / area.sum())
        r1, r2 = rng.random(cnt), rng.random(cnt)
        s = np.sqrt(r1)
        b0, b1, b2 = 1 - s, s * (1 - r2), s * r2
        w = np.stack([b0, b1, b2], axis=1)[:, :, None]
        p = (P[tri] * w).sum(axis=1)
        nn = (N[tri] * w).sum(axis=1)
        nn /= np.maximum(np.linalg.norm(nn, axis=1, keepdims=True), 1e-9)
        uv = (UV[tri] * w).sum(axis=1)
        h, wd = px.shape[0], px.shape[1]
        ix = np.clip((uv[:, 0] % 1.0 * wd).astype(int), 0, wd - 1)
        iy = np.clip((uv[:, 1] % 1.0 * h).astype(int), 0, h - 1)
        c = px[iy, ix]
        pos[at:at + cnt] = p; nrm[at:at + cnt] = nn; col[at:at + cnt] = c
        at += cnt
    return pos, nrm, col


def morton_order(pos, lo, hi, bits=10):
    """Sort indices along a Z order curve in the shared normalised box."""
    q = np.clip(((pos - lo) / np.maximum(hi - lo, 1e-9) * ((1 << bits) - 1)).astype(np.uint64), 0, (1 << bits) - 1)

    def spread(v):
        v = v & 0x3FF
        v = (v | (v << 16)) & 0x030000FF
        v = (v | (v << 8)) & 0x0300F00F
        v = (v | (v << 4)) & 0x030C30C3
        v = (v | (v << 2)) & 0x09249249
        return v

    code = spread(q[:, 0]) | (spread(q[:, 1]) << np.uint64(1)) | (spread(q[:, 2]) << np.uint64(2))
    return np.argsort(code, kind="stable")


def to_yup(v):
    """Blender Z up to glTF/three Y up: (x, y, z) -> (x, z, -y)."""
    return np.stack([v[:, 0], v[:, 2], -v[:, 1]], axis=1)


def build(set_name, n):
    seed = CONFIG["points"]["seed"]
    rng = np.random.default_rng(seed)

    # target A: statue LOD0
    open_blend("statue-baked")
    statue = bpy.data.objects["StatueLOD0"]
    with Timer(f"sample A {n}"):
        posA, nrmA, colA = sample_surface([statue], n, rng)

    # target B: column + closed laptop on top, as assembled on the page
    open_blend("column-baked")
    column = bpy.data.objects["Column"]
    col_top = bbox(column)[1][2]
    bpy.ops.wm.append(filepath=os.path.join(CLEAN, "laptop-baked.blend", "Object", "Base"),
                      directory=os.path.join(CLEAN, "laptop-baked.blend", "Object"), filename="Base")
    bpy.ops.wm.append(filepath=os.path.join(CLEAN, "laptop-baked.blend", "Object", "Lid"),
                      directory=os.path.join(CLEAN, "laptop-baked.blend", "Object"), filename="Lid")
    laptop_parts = [o for o in bpy.data.objects if o.name in ("Base", "Lid", "LidPivot", "ScreenSurface")]
    roots = [o for o in laptop_parts if o.parent is None]
    for o in roots:
        o.location.z += col_top
    bpy.context.view_layer.update()
    with Timer(f"sample B {n}"):
        posB, nrmB, colB = sample_surface([column] + [o for o in laptop_parts if o.type == "MESH"], n, rng)

    # pair by Morton order in a shared box (each set normalised to its own bounds, so shapes align by relative position)
    loA, hiA = posA.min(0), posA.max(0)
    loB, hiB = posB.min(0), posB.max(0)
    oa = morton_order(posA, loA, hiA)
    ob = morton_order(posB, loB, hiB)
    posA, nrmA, colA = posA[oa], nrmA[oa], colA[oa]
    posB, nrmB, colB = posB[ob], nrmB[ob], colB[ob]

    # delay: bottom to top through the statue with a little noise so the sweep has a ragged edge
    h = (posA[:, 2] - loA[2]) / max(hiA[2] - loA[2], 1e-9)
    delay = np.clip(h * 0.85 + rng.random(n) * 0.15, 0, 1).astype(np.float32)

    data = np.concatenate([to_yup(posA), to_yup(nrmA), colA, to_yup(posB), to_yup(nrmB), colB, delay[:, None]], axis=1).astype(np.float32)
    assert data.shape == (n, FLOATS_PER_POINT)
    os.makedirs(POINTS, exist_ok=True)
    bin_path = os.path.join(POINTS, f"{set_name}.bin")
    data.tofile(bin_path)
    manifest = {
        "count": n, "floatsPerPoint": FLOATS_PER_POINT, "seed": seed,
        "layout": ["posA", "nrmA", "colA", "posB", "nrmB", "colB", "delay"],
        "up": "Y", "boundsA": [to_yup(loA[None])[0].tolist(), to_yup(hiA[None])[0].tolist()],
        "boundsB": [to_yup(loB[None])[0].tolist(), to_yup(hiB[None])[0].tolist()],
        "columnTop": col_top, "bytes": file_size(bin_path),
    }
    json.dump(manifest, open(os.path.join(POINTS, f"{set_name}.json"), "w"), indent=2)
    log(set_name, n, "points,", file_size(bin_path), "bytes")
    return manifest


if __name__ == "__main__":
    which = args() or ["desktop", "mobile"]
    out = {}
    for w in which:
        out[w] = build(w, CONFIG["points"][w])
    write_stats("points", out)
