"""Modesty drape for the statue, cloth simulated: a band pinned at the waist falls under gravity and collides
with the body, then gets thickness and is joined into the high poly. Rewrites assets/clean/statue.blend,
keeping statue-nude.blend as the untouched source.
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
    scene = bpy.context.scene

    lo, hi = bbox(statue)
    H = hi[2] - lo[2]
    z_top, z_bot = lo[2] + H * d["top"], lo[2] + H * d["bottom"]

    # body only collision proxy: hip to knee slab without the club and lion skin, decimated for sim speed
    proxy = statue.copy(); proxy.data = statue.data.copy(); proxy.name = "BodyProxy"
    scene.collection.objects.link(proxy)
    pb = bmesh.new(); pb.from_mesh(proxy.data)
    kill = [v for v in pb.verts if v.co.x > d["body_x_max"] or v.co.z < z_bot - 0.2 or v.co.z > z_top + 0.15]
    bmesh.ops.delete(pb, geom=kill, context="VERTS")
    pb.to_mesh(proxy.data); pb.free()
    select_only(proxy)
    dec = proxy.modifiers.new("D", "DECIMATE"); dec.ratio = min(1.0, 40000 / max(tri_count(proxy), 1))
    bpy.ops.object.modifier_apply(modifier="D")
    col = proxy.modifiers.new("Collision", "COLLISION")
    proxy.collision.thickness_outer = d["offset"]
    proxy.collision.cloth_friction = 12.0
    log("proxy tris", tri_count(proxy))

    # waist ring: the body outline at z_top, so the pinned top edge sits on the skin
    band = [v.co for v in proxy.data.vertices if abs(v.co.z - z_top) < 0.012]
    cx = (min(p.x for p in band) + max(p.x for p in band)) / 2
    cy = (min(p.y for p in band) + max(p.y for p in band)) / 2
    log(f"waist z {z_top:.3f} centre ({cx:.3f},{cy:.3f}) from {len(band)} verts")
    bvh = mathutils.bvhtree.BVHTree.FromObject(proxy, bpy.context.evaluated_depsgraph_get())

    def waist_radius(a):
        # cast from the axis outward at z_top and take the hit distance
        o = mathutils.Vector((cx, cy, z_top)); dirv = mathutils.Vector((math.cos(a), math.sin(a), 0))
        hit = bvh.ray_cast(o, dirv, 1.0)
        return (hit[0] - o).length if hit[0] is not None else 0.2

    segs, rings = d["segs"], d["rings"]
    length = (z_top - z_bot)
    bm = bmesh.new()
    grid = []
    pin = []
    for j in range(rings + 1):
        t = j / rings
        ring = []
        for i in range(segs):
            a = 2 * math.pi * i / segs
            r = waist_radius(a) + d["offset"] * 1.5
            r *= 1.0 + (d["slack"] - 1.0) * t  # wider toward the hem so it can fall and fold
            v = bm.verts.new((cx + r * math.cos(a), cy + r * math.sin(a), z_top - t * length))
            ring.append(v)
            if j == 0:
                pin.append(v)
        grid.append(ring)
    for j in range(rings):
        for i in range(segs):
            bm.faces.new((grid[j][i], grid[j][(i + 1) % segs], grid[j + 1][(i + 1) % segs], grid[j + 1][i]))
    me = bpy.data.meshes.new("Drape")
    bm.to_mesh(me)
    pin_idx = [v.index for v in pin]
    bm.free()
    drape = bpy.data.objects.new("Drape", me)
    scene.collection.objects.link(drape)
    vg = drape.vertex_groups.new(name="Pin")
    vg.add(pin_idx, 1.0, "REPLACE")
    select_only(drape)
    bpy.ops.object.shade_smooth()

    # cloth
    cloth = drape.modifiers.new("Cloth", "CLOTH")
    cs = cloth.settings
    cs.quality = 10
    cs.mass = 0.4
    cs.tension_stiffness = 12
    cs.compression_stiffness = 12
    cs.shear_stiffness = 6
    cs.bending_stiffness = 0.15
    cs.tension_damping = 5
    cs.air_damping = 1.5
    cs.vertex_group_mass = "Pin"
    cs.pin_stiffness = 1.0
    cc = cloth.collision_settings
    cc.use_collision = True
    cc.distance_min = d["offset"]
    cc.collision_quality = 4
    cc.use_self_collision = True
    cc.self_distance_min = 0.004
    scene.frame_start = 1
    scene.frame_end = d["frames"]
    cloth.point_cache.frame_start = 1
    cloth.point_cache.frame_end = d["frames"]
    with Timer(f"cloth sim {d['frames']} frames"):
        for f in range(1, d["frames"] + 1):
            scene.frame_set(f)
    # bake the simulated shape into the mesh
    deps = bpy.context.evaluated_depsgraph_get()
    sim_mesh = bpy.data.meshes.new_from_object(drape.evaluated_get(deps))
    drape.modifiers.clear()
    old = drape.data
    drape.data = sim_mesh
    bpy.data.meshes.remove(old)
    drape.vertex_groups.clear()

    # thickness and a little softening
    select_only(drape)
    sub = drape.modifiers.new("Sub", "SUBSURF"); sub.levels = sub.render_levels = 1
    sol = drape.modifiers.new("Thick", "SOLIDIFY"); sol.thickness = d["thickness"]; sol.offset = 1; sol.use_rim = True
    for m in list(drape.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.ops.object.shade_smooth()
    log("drape tris", tri_count(drape))

    # fold over cuff: the top rows of the simulated cloth duplicated, pushed out along their normals and thickened,
    # so the waist reads as a doubled, tucked edge that follows every fold of the wrap
    cuff_h = 0.045
    cb = bmesh.new(); cb.from_mesh(drape.data)
    cb.verts.ensure_lookup_table()
    keep_faces = [f for f in cb.faces if all(v.co.z > z_top - cuff_h for v in f.verts)]
    drop = [f for f in cb.faces if f not in set(keep_faces)]
    bmesh.ops.delete(cb, geom=drop, context="FACES")
    for v in cb.verts:
        v.co += v.normal * (d["thickness"] * 1.4)
    wme = bpy.data.meshes.new("Cuff"); cb.to_mesh(wme); cb.free()
    waist = bpy.data.objects.new("Cuff", wme)
    scene.collection.objects.link(waist)
    select_only(waist)
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.delete_loose(); bpy.ops.object.mode_set(mode="OBJECT")
    sol2 = waist.modifiers.new("Thick", "SOLIDIFY"); sol2.thickness = d["thickness"] * 0.9; sol2.offset = -1; sol2.use_rim = True
    bpy.ops.object.modifier_apply(modifier="Thick")
    bpy.ops.object.shade_smooth()
    log("cuff tris", tri_count(waist))
    bpy.data.objects.remove(proxy, do_unlink=True)

    joined = join([statue, drape, waist], "Statue")
    select_only(joined)
    scene.frame_set(1)
    save_blend("statue")
    write_stats("drape", {"triangles_added": tri_count(joined) - 970342, "slab": [round(z_bot, 3), round(z_top, 3)], "frames": d["frames"]})


main()
