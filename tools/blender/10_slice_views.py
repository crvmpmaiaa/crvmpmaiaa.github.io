"""Side views with the near clip plane cutting into the model at given x values. Run: tools/blender/run.sh 10_slice_views.py statue-nude 0.10 0.15 0.20 0.25"""
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import *
args = sys.argv[sys.argv.index("--") + 1:]
name = args[0]; cuts = [float(a) for a in args[1:] if not a.startswith("z")]; zs = [float(a[1:]) for a in args[1:] if a.startswith("z")] or [0.3, 0.5, 0.7, 0.9]
bpy.ops.wm.open_mainfile(filepath=os.path.join(CLEAN, name + ".blend"))
obj = bpy.data.objects["Statue"]; lo, hi = bbox(obj)
scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"; scene.display.shading.color_type = "SINGLE"; scene.display.shading.single_color = (0.75, 0.75, 0.75)
scene.display.shading.show_backface_culling = False
scene.render.resolution_x = 700; scene.render.resolution_y = 900; scene.render.film_transparent = True
cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); scene.collection.objects.link(cam); scene.camera = cam
cam.data.type = "ORTHO"; cam.data.ortho_scale = (hi[2] - lo[2]) * 1.1
cz = (lo[2] + hi[2]) / 2; cy = (lo[1] + hi[1]) / 2
os.makedirs(os.path.join(ROOT, "assets/previews"), exist_ok=True)
for x in cuts:
    cam.location = (x + 3.0, cy, cz); cam.rotation_euler = (math.pi / 2, 0, math.pi / 2)
    cam.data.clip_start = 3.0; cam.data.clip_end = 10
    scene.render.filepath = os.path.join(ROOT, f"assets/previews/slice-{name}-x{x:.2f}.png")
    bpy.ops.render.render(write_still=True)
# and top down bands: camera above, clip at z
for z in zs:
    cam.location = ((lo[0] + hi[0]) / 2, cy, z + 3.0); cam.rotation_euler = (0, 0, 0)
    cam.data.ortho_scale = 0.8; cam.data.clip_start = 3.0
    scene.render.filepath = os.path.join(ROOT, f"assets/previews/slice-{name}-z{z:.2f}.png")
    bpy.ops.render.render(write_still=True)
print("done")
