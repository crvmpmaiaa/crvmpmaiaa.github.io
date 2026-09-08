"""Stage one of the pillar rework. Fuse the scan into one solid (voxel remesh), then boolean-cut the club, lion
skin and rock away with a box, leaving the forearm and the skin above the cap line as cloth with a straight hem.
Saves statue-solid.blend (fused) and statue-cut.blend (cut). Run: tools/blender/run.sh 01d_solid_cut.py"""
import os, sys, math, time
sys.path.insert(0, os.path.dirname(__file__))
import bpy, bmesh
from common import *

X_CUT, Z_LOW, Z_HEM = 0.08, 0.18, 0.97
bpy.ops.wm.open_mainfile(filepath=os.path.join(CLEAN, "statue-nude.blend"))
statue = bpy.data.objects["Statue"]
scene = bpy.context.scene
solid = os.path.join(CLEAN, "statue-solid.blend")
if not os.path.exists(solid):
    select_only(statue)
    rm = statue.modifiers.new("Remesh", "REMESH"); rm.mode = "VOXEL"; rm.voxel_size = 0.0025; rm.adaptivity = 0.0; rm.use_smooth_shade = True
    with Timer("voxel remesh"):
        bpy.ops.object.modifier_apply(modifier="Remesh")
    log("solid tris", tri_count(statue))
    bpy.ops.wm.save_as_mainfile(filepath=solid, compress=True)
else:
    bpy.ops.wm.open_mainfile(filepath=solid); statue = bpy.data.objects["Statue"]; scene = bpy.context.scene

# the cutter: everything to his right, between the plinth top and the hem line
bpy.ops.mesh.primitive_cube_add(size=1, location=((X_CUT + 0.8) / 2, 0, (Z_LOW + Z_HEM) / 2))
cutter = bpy.context.active_object; cutter.name = "Cutter"
cutter.scale = (0.8 - X_CUT, 1.4, Z_HEM - Z_LOW)
bpy.ops.object.transform_apply(scale=True)
select_only(statue)
bo = statue.modifiers.new("Cut", "BOOLEAN"); bo.operation = "DIFFERENCE"; bo.object = cutter; bo.solver = "EXACT"
with Timer("boolean"):
    bpy.ops.object.modifier_apply(modifier="Cut")
bpy.data.objects.remove(cutter, do_unlink=True)
log("cut tris", tri_count(statue))
# keep only the main body: the boolean can leave slivers floating
select_only(statue)
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.mesh.separate(type="LOOSE"); bpy.ops.object.mode_set(mode="OBJECT")
parts = sorted([o for o in bpy.context.selected_objects if o.type == "MESH"], key=lambda o: len(o.data.polygons), reverse=True)
log("parts", [len(p.data.polygons) for p in parts[:6]])
for p in parts[1:]:
    bpy.data.objects.remove(p, do_unlink=True)
statue = parts[0]; statue.name = "Statue"
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(CLEAN, "statue-cut.blend"), compress=True)
log("saved statue-cut.blend")
