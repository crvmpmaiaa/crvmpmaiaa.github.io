"""Modesty drape for the statue: a cloth band around the hips, shrinkwrapped to the body, joined into the high poly.
Runs after 01_normalise.py statue and rewrites assets/clean/statue.blend (keeps statue-nude.blend as the untouched source).
Run: tools/blender/run.sh 01b_drape.py
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import bmesh
import bpy
import mathutils
from common import *


def main():
    cfg = CONFIG["statue"]
    d = cfg["drape"]
    nude = os.path.join(CLEAN, "statue-nude.blend")
    if os.path.exists(nude):
        bpy.ops.wm.open_mainfile(filepath=nude)
    else:
        open_blend("statue")
        bpy.ops.wm.save_as_mainfile(filepath=nude, compress=True)
    statue = bpy.data.objects["Statue"]

    lo, hi = bbox(statue)
    H = hi[2] - lo[2]
    z_top, z_bot = lo[2] + H * d["top"], lo[2] + H * d["bottom"]
    # body cross section in the hip slab, excluding the club and lion skin on +X
    pts = [v.co for v in statue.data.vertices if z_bot <= v.co.z <= z_top and v.co.x < d["body_x_max"]]
    xs = [p.x for p in pts]; ys = [p.y for p in pts]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    rx, ry = (max(xs) - min(xs)) / 2, (max(ys) - min(ys)) / 2
    log(f"hip slab z {z_bot:.3f}..{z_top:.3f}, centre ({cx:.3f},{cy:.3f}), radii ({rx:.3f},{ry:.3f}), {len(pts)} verts")

    # body only proxy as the wrap target: the hip slab without the club, lion skin and anything far from the body
    proxy = statue.copy(); proxy.data = statue.data.copy(); proxy.name = "BodyProxy"
    bpy.context.scene.collection.objects.link(proxy)
    pb = bmesh.new(); pb.from_mesh(proxy.data)
    kill = [v for v in pb.verts if v.co.x > d["body_x_max"] or v.co.z < z_bot - 0.15 or v.co.z > z_top + 0.15]
    bmesh.ops.delete(pb, geom=kill, context="VERTS")
    pb.to_mesh(proxy.data); pb.free()
    log("proxy tris", tri_count(proxy))

    # band: elliptical cylinder, slightly larger than the body, longer at the front (the hanging flap)
    segs, rings = 96, 14
    bm = bmesh.new()
    grid = []
    for j in range(rings + 1):
        t = j / rings
        ring = []
        for i in range(segs):
            a = 2 * math.pi * i / segs
            # front is -Y. front weight 1 at the front, 0 at the back
            front = (1 - math.cos(a - math.pi / 2)) / 2 if False else max(0.0, -math.sin(a))
            z = z_top - t * ((z_top - z_bot) + d["front_drop"] * front ** 2)
            x = cx + rx * math.cos(a)
            y = cy + ry * math.sin(a)
            ring.append(bm.verts.new((x, y, z)))
        grid.append(ring)
    for j in range(rings):
        for i in range(segs):
            bm.faces.new((grid[j][i], grid[j][(i + 1) % segs], grid[j + 1][(i + 1) % segs], grid[j + 1][i]))
    me = bpy.data.meshes.new("Drape")
    bm.to_mesh(me); bm.free()
    drape = bpy.data.objects.new("Drape", me)
    bpy.context.scene.collection.objects.link(drape)
    select_only(drape)
    bpy.ops.object.shade_smooth()

    # hug the body, then folds, then thickness
    sw = drape.modifiers.new("Wrap", "SHRINKWRAP")
    sw.target = proxy
    sw.wrap_method = "NEAREST_SURFACEPOINT"
    sw.wrap_mode = "ON_SURFACE"
    sw.offset = d["offset"]
    sub = drape.modifiers.new("Sub", "SUBSURF")
    sub.levels = sub.render_levels = 2
    tex = bpy.data.textures.new("Folds", "CLOUDS")
    tex.noise_scale = 0.08
    tex.noise_depth = 2
    disp = drape.modifiers.new("Folds", "DISPLACE")
    disp.texture = tex
    disp.strength = d["fold_strength"]
    disp.mid_level = 0.5
    disp.direction = "NORMAL"
    # vertical fold ridges: stretch the noise along Z so folds hang
    disp.texture_coords = "LOCAL"
    sw2 = drape.modifiers.new("Wrap2", "SHRINKWRAP")
    sw2.target = proxy
    sw2.wrap_method = "NEAREST_SURFACEPOINT"
    sw2.wrap_mode = "OUTSIDE"
    sw2.offset = d["offset"] * 0.5
    sol = drape.modifiers.new("Thick", "SOLIDIFY")
    sol.thickness = d["thickness"]
    sol.offset = -1
    sol.use_rim = True
    smooth = drape.modifiers.new("Smooth", "SMOOTH")
    smooth.factor = 0.5
    smooth.iterations = 2
    for m in list(drape.modifiers):
        select_only(drape)
        bpy.ops.object.modifier_apply(modifier=m.name)
    log("drape tris", tri_count(drape))
    bpy.data.objects.remove(proxy, do_unlink=True)

    # join into the high poly so every later stage (LODs, bake, points) sees one statue
    statue["drape"] = True
    joined = join([statue, drape], "Statue")
    select_only(joined)
    save_blend("statue")
    write_stats("drape", {"triangles_added": tri_count(joined) - 970342, "slab": [round(z_bot, 3), round(z_top, 3)]})


main()
