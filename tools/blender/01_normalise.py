"""Ingest raw assets, normalise orientation, origin and scale, drop junk geometry, save assets/clean/*.blend.
Run: tools/blender/run.sh 01_normalise.py [statue|column|laptop ...]
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import bmesh
import bpy
from common import *


def import_source(cfg):
    fmt = cfg["format"]
    src = path(cfg["source"])
    if fmt == "obj":
        bpy.ops.wm.obj_import(filepath=src, forward_axis="NEGATIVE_Z", up_axis="Y")
    elif fmt == "gltf":
        bpy.ops.import_scene.gltf(filepath=src)
    elif fmt == "fbx":
        bpy.ops.import_scene.fbx(filepath=src)
    else:
        raise SystemExit(f"unknown format {fmt}")
    return mesh_objects()


def drop_small_islands(obj, min_fraction=0.002):
    """Split loose parts, delete islands below min_fraction of total faces, join the rest."""
    total = len(obj.data.polygons)
    select_only(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.separate(type="LOOSE")
    bpy.ops.object.mode_set(mode="OBJECT")
    parts = [o for o in bpy.context.selected_objects if o.type == "MESH"]
    keep, dropped = [], 0
    for p in parts:
        if len(p.data.polygons) < total * min_fraction:
            dropped += len(p.data.polygons)
            bpy.data.objects.remove(p, do_unlink=True)
        else:
            keep.append(p)
    out = join(keep, obj.name) if len(keep) > 1 else keep[0]
    log(f"islands: kept {len(keep)} of {len(parts)}, dropped {dropped} faces")
    return out


def cleanup_mesh(obj):
    select_only(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.remove_doubles(threshold=1e-5)
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.mesh.select_all(action="DESELECT")
    bpy.ops.object.mode_set(mode="OBJECT")


def statue():
    reset_scene()
    cfg = CONFIG["statue"]
    with Timer("import statue"):
        objs = import_source(cfg)
    obj = join(objs, "Statue") if len(objs) > 1 else objs[0]
    obj.name = obj.data.name = "Statue"
    clear_parent_keep(obj)
    apply_transforms(obj)
    if cfg.get("drop_islands", True):
        with Timer("islands"):
            obj = drop_small_islands(obj)
    with Timer("cleanup"):
        cleanup_mesh(obj)
    obj.rotation_euler = (math.radians(cfg.get("pitch_degrees", 0)), 0, math.radians(cfg.get("yaw_degrees", 0)))
    apply_transforms(obj)
    scale_to_height(obj, cfg["height"])
    set_origin_to_base(obj)
    bpy.context.view_layer.update()
    obj.data.materials.clear()
    lo, hi = bbox(obj)
    log("statue bbox", [round(v, 3) for v in lo], [round(v, 3) for v in hi], "tris", tri_count(obj))
    write_stats("statue_raw", {"triangles": tri_count(obj), "vertices": len(obj.data.vertices),
                               "size": [round(hi[i] - lo[i], 3) for i in range(3)]})
    save_blend("statue")


def build_column():
    """Doric column: fluted shaft with entasis, echinus, abacus. Built from rings so the count is predictable."""
    cfg = CONFIG["column"]
    H = cfg["height"]
    flutes = cfg["flutes"]
    seg_per_flute = 8
    N = flutes * seg_per_flute
    rings = 36
    abacus_h, abacus_w = 0.05, 0.36
    echinus_h = 0.06
    shaft_h = H - abacus_h - echinus_h
    r_base, r_top = 0.11, 0.094

    bm = bmesh.new()
    ring_verts = []

    def shaft_radius(t, ang):
        # entasis: slight bulge at one third height, then taper
        r = r_base + (r_top - r_base) * t
        r += 0.006 * math.sin(math.pi * min(1.0, t * 1.5))
        flute = (math.cos(ang * flutes) + 1) / 2  # 1 on the arris, 0 in the hollow
        depth = 0.014 * (1 - flute ** 0.6)
        return r - depth

    for j in range(rings + 1):
        t = j / rings
        z = t * shaft_h
        ring = []
        for i in range(N):
            ang = 2 * math.pi * i / N
            r = shaft_radius(t, ang)
            ring.append(bm.verts.new((r * math.cos(ang), r * math.sin(ang), z)))
        ring_verts.append(ring)
    for j in range(rings):
        a, b = ring_verts[j], ring_verts[j + 1]
        for i in range(N):
            bm.faces.new((a[i], a[(i + 1) % N], b[(i + 1) % N], b[i]))
    # bottom cap
    bm.faces.new(list(reversed(ring_verts[0])))

    # echinus: flared curve from shaft top to under the abacus, smooth ring (no flutes)
    ech_rings = 6
    prev = ring_verts[-1]
    top_ring_r = [((v.co.x ** 2 + v.co.y ** 2) ** 0.5) for v in prev]
    for k in range(1, ech_rings + 1):
        s = k / ech_rings
        z = shaft_h + echinus_h * s
        r = r_top + (abacus_w / 2 * 0.92 - r_top) * (s ** 1.8)
        ring = []
        for i in range(N):
            ang = 2 * math.pi * i / N
            rr = r if k > 1 else top_ring_r[i] + (r - top_ring_r[i]) * 0.5
            ring.append(bm.verts.new((rr * math.cos(ang), rr * math.sin(ang), z)))
        for i in range(N):
            bm.faces.new((prev[i], prev[(i + 1) % N], ring[(i + 1) % N], ring[i]))
        prev = ring
    # close the echinus top into the abacus underside
    bm.faces.new(prev)

    # abacus: square slab
    z0, z1 = shaft_h + echinus_h, H
    w = abacus_w / 2
    corners = [(-w, -w), (w, -w), (w, w), (-w, w)]
    lo_v = [bm.verts.new((x, y, z0)) for x, y in corners]
    hi_v = [bm.verts.new((x, y, z1)) for x, y in corners]
    bm.faces.new(list(reversed(lo_v)))
    bm.faces.new(hi_v)
    for i in range(4):
        bm.faces.new((lo_v[i], lo_v[(i + 1) % 4], hi_v[(i + 1) % 4], hi_v[i]))

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new("Column")
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new("Column", me)
    bpy.context.scene.collection.objects.link(obj)
    select_only(obj)
    bpy.ops.object.shade_smooth()
    # keep abacus edges crisp
    for p in me.polygons:
        if p.center.z >= z0 - 1e-6:
            p.use_smooth = False
    return obj


def column():
    reset_scene()
    cfg = CONFIG["column"]
    if cfg["source"] == "procedural":
        obj = build_column()
    else:
        objs = import_source(cfg)
        for o in objs:
            clear_parent_keep(o)
            apply_transforms(o)
        for o in list(bpy.context.scene.objects):
            if o.type != "MESH":
                bpy.data.objects.remove(o, do_unlink=True)
        objs = mesh_objects()
        obj = join(objs, "Column") if len(objs) > 1 else objs[0]
        obj.name = obj.data.name = "Column"
        cleanup_mesh(obj)
        scale_to_height(obj, cfg["height"])
        set_origin_to_base(obj)
        bpy.context.view_layer.update()
    lo, hi = bbox(obj)
    log("column bbox", [round(v, 3) for v in lo], [round(v, 3) for v in hi], "tris", tri_count(obj))
    write_stats("column_raw", {"triangles": tri_count(obj), "vertices": len(obj.data.vertices),
                               "size": [round(hi[i] - lo[i], 3) for i in range(3)]})
    save_blend("column")


def laptop():
    reset_scene()
    cfg = CONFIG["laptop"]
    with Timer("import laptop"):
        objs = import_source(cfg)
    for o in objs:
        clear_parent_keep(o)
        apply_transforms(o)
    for o in list(bpy.context.scene.objects):
        if o.type != "MESH":
            bpy.data.objects.remove(o, do_unlink=True)
    objs = mesh_objects()
    names = {o.name: (len(o.data.polygons), [m.name for m in o.data.materials]) for o in objs}
    log("laptop parts", names)
    # scale the whole assembly to the target width along its widest horizontal axis
    lo = [min(bbox(o)[0][i] for o in objs) for i in range(3)]
    hi = [max(bbox(o)[1][i] for o in objs) for i in range(3)]
    ext = [hi[i] - lo[i] for i in range(3)]
    wide_axis = 0 if ext[0] >= ext[1] else 1
    s = cfg["width"] / ext[wide_axis]
    for o in objs:
        o.scale = (s,) * 3
        o.location = [(o.location[i] - lo[i] if i == 2 else o.location[i] - (lo[i] + hi[i]) / 2) * s for i in range(3)]
        apply_transforms(o)
    if wide_axis == 1:
        for o in objs:
            o.rotation_euler = (0, 0, math.radians(90))
            apply_transforms(o)
    lo = [min(bbox(o)[0][i] for o in objs) for i in range(3)]
    hi = [max(bbox(o)[1][i] for o in objs) for i in range(3)]
    log("laptop bbox", [round(v, 3) for v in lo], [round(v, 3) for v in hi], "tris", sum(tri_count(o) for o in objs))
    write_stats("laptop_raw", {"parts": names, "triangles": sum(tri_count(o) for o in objs),
                               "size": [round(hi[i] - lo[i], 3) for i in range(3)]})
    save_blend("laptop")


if __name__ == "__main__":
    which = args() or ["statue", "column", "laptop"]
    for w in which:
        {"statue": statue, "column": column, "laptop": laptop}[w]()
