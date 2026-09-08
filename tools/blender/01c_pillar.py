"""Lose the club, the lion skin and the rock; stand him on a marble column instead. Reads statue-nude.blend,
writes statue-pillar.blend (the drape then reads that). Run: tools/blender/run.sh 01c_pillar.py [x_cut] [z_hand]"""
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
import bpy, bmesh, mathutils
from common import *

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
X_CUT = float(args[0]) if args else 0.2      # everything right of this (his right) goes ...
Z_HAND = float(args[1]) if len(args) > 1 else 0.92   # ... below the hand
Z_PLINTH = 0.18                              # and above the plinth
COL = {"x": 0.3, "y": 0.04, "top": 0.985, "radius": 0.075}  # radius is the shaft

bpy.ops.wm.open_mainfile(filepath=os.path.join(CLEAN, "statue-nude.blend"))
statue = bpy.data.objects["Statue"]
scene = bpy.context.scene
bm = bmesh.new(); bm.from_mesh(statue.data)
before = len(bm.faces)
def gone(v):
    x, y, z = v.co
    if x > X_CUT and Z_PLINTH < z < Z_HAND: return True                 # club, lion skin, rock
    if x > 0.12 and 0.9 <= z < 1.32 and (y < -0.1 or y > 0.16): return True   # the skin's flaps either side of the forearm
    if x > -0.03 and Z_PLINTH < z < 0.62: return True                          # rock stub and slivers beside the leg (both legs are left of centre)
    return False
kill = [f for f in bm.faces if all(gone(v) for v in f.verts)]
bmesh.ops.delete(bm, geom=kill, context="FACES")
log("faces removed", before - len(bm.faces), "of", before)
# cap what we can: boundary loops that are small enough to fill sensibly
bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=64)
bm.to_mesh(statue.data); bm.free()
statue.data.update()

# a slim classical column, turned in Blender, its cap meeting the hand
from column_model import make_column
col = make_column(height=COL["top"] + 0.02, shaft_r=COL["radius"])
col.location = (COL["x"], COL["y"], -0.02)
bpy.context.view_layer.update()
select_only(col); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
lo2, hi2 = bbox(col); log("column", [round(v, 3) for v in lo2], [round(v, 3) for v in hi2], "tris", tri_count(col))
joined = join([statue, col], "Statue")
select_only(joined)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(CLEAN, "statue-pillar.blend"), compress=True)
log("saved statue-pillar.blend, tris", tri_count(joined))
