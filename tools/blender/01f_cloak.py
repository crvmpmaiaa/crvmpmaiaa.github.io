"""The arm stays. From statue-cut.blend (club, skin below the hem and rock gone; hand and forearm kept), stand the
column under the hand and drop a simulated cloak over the cap, the hand and the hide, so the whole lump reads as
cloth laid over the column. Writes statue-pillar.blend for the drape and bake. Run: tools/blender/run.sh 01f_cloak.py"""
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
import bpy, bmesh, mathutils
from common import *
from column_model import make_column

COL = {"x": 0.28, "y": 0.04, "top": 0.975, "radius": 0.085}
CLOAK = {"w": 0.85, "d": 0.95, "res": 0.014, "drop": 0.10, "frames": 160, "thickness": 0.009}

bpy.ops.wm.open_mainfile(filepath=os.path.join(CLEAN, "statue-cut.blend"))
statue = bpy.data.objects["Statue"]; scene = bpy.context.scene
# the stump beside the legs
bpy.ops.mesh.primitive_cube_add(size=1, location=((-0.03 + 0.5) / 2, 0, (0.18 + 0.5) / 2))
c = bpy.context.active_object; c.scale = (0.53, 1.4, 0.32); bpy.ops.object.transform_apply(scale=True)
select_only(statue); bo = statue.modifiers.new("Cut", "BOOLEAN"); bo.operation = "DIFFERENCE"; bo.object = c; bo.solver = "EXACT"
with Timer("stump boolean"): bpy.ops.object.modifier_apply(modifier="Cut")
bpy.data.objects.remove(c, do_unlink=True)
select_only(statue); bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.mesh.separate(type="LOOSE"); bpy.ops.object.mode_set(mode="OBJECT")
parts = sorted([o for o in bpy.context.selected_objects if o.type == "MESH"], key=lambda o: len(o.data.polygons), reverse=True)
for p in parts[1:]: bpy.data.objects.remove(p, do_unlink=True)
statue = parts[0]; statue.name = "Statue"

col = make_column(height=COL["top"] + 0.02, shaft_r=COL["radius"])
col.location = (COL["x"], COL["y"], -0.02); bpy.context.view_layer.update()
select_only(col); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
log("column top", COL["top"])

# collision proxy: statue (decimated) plus the column, only the region around the cap to keep the sim quick
proxy = statue.copy(); proxy.data = statue.data.copy(); proxy.name = "Proxy"; scene.collection.objects.link(proxy)
pb = bmesh.new(); pb.from_mesh(proxy.data)
kill = [v for v in pb.verts if v.co.z < 0.5 or v.co.x < -0.15]
bmesh.ops.delete(pb, geom=kill, context="VERTS"); pb.to_mesh(proxy.data); pb.free()
select_only(proxy); dec = proxy.modifiers.new("D", "DECIMATE"); dec.ratio = min(1.0, 60000 / max(tri_count(proxy), 1)); bpy.ops.object.modifier_apply(modifier="D")
for o in (proxy, col):
    select_only(o); o.modifiers.new("Collision", "COLLISION"); o.collision.thickness_outer = 0.006; o.collision.cloth_friction = 4.0
log("proxy tris", tri_count(proxy))

# the cloak: a sheet above the cap, centred a little toward the body so it lies over the hand and the hide
cx, cy = COL["x"] + 0.03, COL["y"] + 0.0
nx, ny = int(CLOAK["w"] / CLOAK["res"]), int(CLOAK["d"] / CLOAK["res"])
bm = bmesh.new(); grid = []
for j in range(ny + 1):
    row = []
    for i in range(nx + 1):
        row.append(bm.verts.new((cx - CLOAK["w"] / 2 + i * CLOAK["res"], cy - CLOAK["d"] / 2 + j * CLOAK["res"], COL["top"] + CLOAK["drop"])))
    grid.append(row)
for j in range(ny):
    for i in range(nx):
        bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
me = bpy.data.meshes.new("Cloak"); bm.to_mesh(me); bm.free()
cloak = bpy.data.objects.new("Cloak", me); scene.collection.objects.link(cloak)
select_only(cloak); bpy.ops.object.shade_smooth()
cloth = cloak.modifiers.new("Cloth", "CLOTH"); cs = cloth.settings
cs.quality = 12; cs.mass = 0.6; cs.tension_stiffness = 8; cs.compression_stiffness = 8; cs.shear_stiffness = 4; cs.bending_stiffness = 0.12
cs.tension_damping = 5; cs.air_damping = 1.2
cc = cloth.collision_settings; cc.use_collision = True; cc.distance_min = 0.006; cc.collision_quality = 5; cc.use_self_collision = True; cc.self_distance_min = 0.005
scene.frame_start = 1; scene.frame_end = CLOAK["frames"]; cloth.point_cache.frame_start = 1; cloth.point_cache.frame_end = CLOAK["frames"]
with Timer(f"cloak sim {CLOAK['frames']} frames"):
    for f in range(1, CLOAK["frames"] + 1): scene.frame_set(f)
deps = bpy.context.evaluated_depsgraph_get()
sim = bpy.data.meshes.new_from_object(cloak.evaluated_get(deps)); cloak.modifiers.clear(); old = cloak.data; cloak.data = sim; bpy.data.meshes.remove(old)
select_only(cloak)
sub = cloak.modifiers.new("Sub", "SUBSURF"); sub.levels = sub.render_levels = 1
sol = cloak.modifiers.new("Thick", "SOLIDIFY"); sol.thickness = CLOAK["thickness"]; sol.offset = 1; sol.use_rim = True
for m in list(cloak.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
bpy.ops.object.shade_smooth()
lo, hi = bbox(cloak); log("cloak", [round(v, 3) for v in lo], [round(v, 3) for v in hi], "tris", tri_count(cloak))
for o in (proxy,): bpy.data.objects.remove(o, do_unlink=True)
col.modifiers.clear()
joined = join([statue, col, cloak], "Statue"); select_only(joined); scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(CLEAN, "statue-pillar.blend"), compress=True)
log("saved statue-pillar.blend tris", tri_count(joined))
