"""Four lit views of the baked site statue (loincloth on, marble textures), for reference sheets.
Run: tools/blender/run.sh 08b_views.py"""
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import *
bpy.ops.wm.read_factory_settings(use_empty=True)
src = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "public/models/statue-lod0.glb"
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, src))
scene = bpy.context.scene
meshes = [o for o in bpy.data.objects if o.type == "MESH"]
keep = meshes[0] if len(meshes) == 1 else join(meshes, "Statue")
keep.rotation_euler = (0, 0, 0)
if "--" in sys.argv and len(sys.argv) > sys.argv.index("--") + 2: keep.rotation_euler = (math.radians(float(sys.argv[sys.argv.index("--") + 2])), 0, 0)
bpy.context.view_layer.update()
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1000; scene.render.resolution_y = 1400; scene.render.film_transparent = False
if scene.world is None: scene.world = bpy.data.worlds.new("W")
scene.world.use_nodes = True
bgn = scene.world.node_tree.nodes["Background"]; bgn.inputs[0].default_value = (0.5, 0.5, 0.5, 1); bgn.inputs[1].default_value = 1.0
sun = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", "SUN")); scene.collection.objects.link(sun); sun.data.energy = 3.5; sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(-40))
fill = bpy.data.objects.new("Fill", bpy.data.lights.new("Fill", "SUN")); scene.collection.objects.link(fill); fill.data.energy = 1.2; fill.rotation_euler = (math.radians(60), 0, math.radians(140))
cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); scene.collection.objects.link(cam); scene.camera = cam
cam.data.lens = 85
bpy.ops.object.select_all(action="DESELECT"); keep.select_set(True); bpy.context.view_layer.objects.active = keep; bpy.ops.object.transform_apply(rotation=True)
lo, hi = bbox(keep)
cz = (lo[2] + hi[2]) / 2; cx = (lo[0] + hi[0]) / 2; cy = (lo[1] + hi[1]) / 2
H = hi[2] - lo[2]; dist = H * 2.6
os.makedirs(os.path.join(ROOT, "assets/previews"), exist_ok=True)
for label, ang in (("front", -90), ("threequarter", -45), ("side", 0), ("back", 90)):
    a = math.radians(ang)
    cam.location = (cx + dist * math.cos(a), cy + dist * math.sin(a), cz + H * 0.05)
    cam.rotation_euler = (math.radians(88), 0, a + math.pi / 2)
    tag = os.path.basename(src).split(".")[0]
    scene.render.filepath = os.path.join(ROOT, f"assets/previews/ref-{tag}-{label}.png")
    bpy.ops.render.render(write_still=True)
    print("wrote", label)
