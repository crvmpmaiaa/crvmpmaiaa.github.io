"""Stage two: cut the rock stump beside the foot, add the slim column under the hand. statue-cut -> statue-pillar."""
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import *
from column_model import make_column
COL = {"x": 0.275, "y": 0.03, "top": 1.27, "radius": 0.09}  # cap under the elbow, everything below it goes
bpy.ops.wm.open_mainfile(filepath=os.path.join(CLEAN, "statue-cut.blend"))
statue = bpy.data.objects["Statue"]
# three box cuts, applied one at a time: everything to his right below the elbow (forearm, hand, skin, club,
# rock); the stump beside the legs; the last strip of hide beside the torso, 6 to 12cm out, 90cm to 1.13m up
def box_cut(target, centre, size):
    bpy.ops.mesh.primitive_cube_add(size=1, location=centre)
    c = bpy.context.active_object; c.scale = size; bpy.ops.object.transform_apply(scale=True)
    select_only(target)
    bo = target.modifiers.new("Cut", "BOOLEAN"); bo.operation = "DIFFERENCE"; bo.object = c; bo.solver = "EXACT"
    with Timer(f"boolean {centre}"):
        bpy.ops.object.modifier_apply(modifier="Cut")
    bpy.data.objects.remove(c, do_unlink=True)
box_cut(statue, ((0.12 + 0.8) / 2, 0, (0.18 + COL["top"]) / 2), (0.8 - 0.12, 1.4, COL["top"] - 0.18))
box_cut(statue, ((-0.03 + 0.5) / 2, 0, (0.18 + 0.5) / 2), (0.53, 1.4, 0.32))
box_cut(statue, ((0.055 + 0.125) / 2, 0.1, (0.85 + 1.13) / 2), (0.07, 0.4, 0.28))
select_only(statue)
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.mesh.separate(type="LOOSE"); bpy.ops.object.mode_set(mode="OBJECT")
parts = sorted([o for o in bpy.context.selected_objects if o.type == "MESH"], key=lambda o: len(o.data.polygons), reverse=True)
for p in parts[1:]: bpy.data.objects.remove(p, do_unlink=True)
statue = parts[0]; statue.name = "Statue"
col = make_column(height=COL["top"] + 0.02, shaft_r=COL["radius"])
col.location = (COL["x"], COL["y"], -0.02)
bpy.context.view_layer.update()
select_only(col); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
lo, hi = bbox(col); log("column", [round(v, 3) for v in lo], [round(v, 3) for v in hi])
joined = join([statue, col], "Statue")
select_only(joined)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(CLEAN, "statue-pillar.blend"), compress=True)
log("saved statue-pillar.blend tris", tri_count(joined))
