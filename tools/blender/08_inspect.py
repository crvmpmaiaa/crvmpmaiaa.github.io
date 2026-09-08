"""Front and side renders of a clean blend plus bbox, to plan surgery. Run: tools/blender/run.sh 08_inspect.py statue-nude"""
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import *
name = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "statue-nude"
bpy.ops.wm.open_mainfile(filepath=os.path.join(CLEAN, name + ".blend"))
obj = bpy.data.objects["Statue"]
lo, hi = bbox(obj); log("bbox", [round(v, 3) for v in lo], [round(v, 3) for v in hi])
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = scene.render.resolution_y = 900
scene.render.film_transparent = True
if scene.world is None: scene.world = bpy.data.worlds.new("W")
scene.world.use_nodes = True; scene.world.node_tree.nodes["Background"].inputs[1].default_value = 1.0
sun = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", "SUN")); scene.collection.objects.link(sun); sun.data.energy = 3.0; sun.rotation_euler = (math.radians(55), math.radians(15), math.radians(-35))
fill = bpy.data.objects.new("Fill", bpy.data.lights.new("Fill", "SUN")); scene.collection.objects.link(fill); fill.data.energy = 1.0; fill.rotation_euler = (math.radians(60), 0, math.radians(150))
mat = bpy.data.materials.new("Grey"); mat.use_nodes = True; mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.8, 0.8, 0.8, 1); mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.6
for o in bpy.data.objects:
    if o.type == "MESH": o.data.materials.clear(); o.data.materials.append(mat)
cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); scene.collection.objects.link(cam); scene.camera = cam
cam.data.type = "ORTHO"; cam.data.ortho_scale = (hi[2] - lo[2]) * 1.15
cz = (lo[2] + hi[2]) / 2; cx = (lo[0] + hi[0]) / 2; cy = (lo[1] + hi[1]) / 2
os.makedirs(os.path.join(ROOT, "assets/previews"), exist_ok=True)
for label, pos, rot in (("front", (cx, cy - 6, cz), (math.pi / 2, 0, 0)), ("side", (cx + 6, cy, cz), (math.pi / 2, 0, math.pi / 2)), ("back", (cx, cy + 6, cz), (math.pi / 2, 0, math.pi))):
    cam.location = pos; cam.rotation_euler = rot
    scene.render.filepath = os.path.join(ROOT, f"assets/previews/inspect-{name}-{label}.png")
    bpy.ops.render.render(write_still=True)
    log("wrote", scene.render.filepath)
