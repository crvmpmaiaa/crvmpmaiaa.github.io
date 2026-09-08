"""Cut on the RAW sculpt, no voxel remesh: keep every bit of the original surface. Club, lion skin below the
cap line and the rock go; the arm and hand stay. Saves statue-rawcut.blend. Run: tools/blender/run.sh 12_raw_cut.py"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import bpy, bmesh
from common import *

X_CUT, Z_LOW, Z_HEM = 0.08, 0.18, 0.97
bpy.ops.wm.open_mainfile(filepath=os.path.join(CLEAN, "statue-nude.blend"))
statue = bpy.data.objects["Statue"]
log("raw tris", tri_count(statue))
bm = bmesh.new(); bm.from_mesh(statue.data)
nonman = sum(1 for e in bm.edges if not e.is_manifold); bm.free()
log("non manifold edges", nonman)

def box_cut(target, centre, size, label):
    bpy.ops.mesh.primitive_cube_add(size=1, location=centre)
    c = bpy.context.active_object; c.scale = size; bpy.ops.object.transform_apply(scale=True)
    select_only(target)
    bo = target.modifiers.new("Cut", "BOOLEAN"); bo.operation = "DIFFERENCE"; bo.object = c; bo.solver = "EXACT"
    with Timer(f"boolean {label}"):
        bpy.ops.object.modifier_apply(modifier="Cut")
    bpy.data.objects.remove(c, do_unlink=True)
    log(label, "tris", tri_count(target))

box_cut(statue, ((X_CUT + 0.8) / 2, 0, (Z_LOW + Z_HEM) / 2), (0.8 - X_CUT, 1.4, Z_HEM - Z_LOW), "club+skin+rock")
box_cut(statue, ((-0.03 + 0.5) / 2, 0, (Z_LOW + 0.5) / 2), (0.53, 1.4, 0.5 - Z_LOW), "stump")
# the sculpt is many overlapping shells, so loose parts are legitimate pieces (head, beard, hands). Only drop
# a part if it sits entirely inside the cut region or is a tiny sliver.
select_only(statue)
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.mesh.separate(type="LOOSE"); bpy.ops.object.mode_set(mode="OBJECT")
parts = sorted([o for o in bpy.context.selected_objects if o.type == "MESH"], key=lambda o: len(o.data.polygons), reverse=True)
keep, drop = [], []
for p in parts:
    lo, hi = bbox(p)
    inside_cut = lo[0] > X_CUT - 0.005 and lo[2] > Z_LOW - 0.005 and hi[2] < Z_HEM + 0.005
    (drop if (len(p.data.polygons) < 300 or inside_cut) else keep).append(p)
log("keep", [len(p.data.polygons) for p in keep[:8]], "drop", len(drop))
for p in drop: bpy.data.objects.remove(p, do_unlink=True)
statue = join(keep, "Statue") if len(keep) > 1 else keep[0]
statue.name = "Statue"
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(CLEAN, "statue-rawcut.blend"), compress=True)
log("saved statue-rawcut.blend tris", tri_count(statue))
