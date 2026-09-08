"""Ortho front, three quarter, side and back of any GLB, lit, grey ground. Run: tools/blender/run.sh 08c_glb_views.py path/to.glb [tag]"""
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import *
args = sys.argv[sys.argv.index("--") + 1:]
src = args[0]; tag = args[1] if len(args) > 1 else os.path.basename(src).split(".")[0]
rotx = float(args[2]) if len(args) > 2 else 0.0
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, src))
meshes = [o for o in bpy.data.objects if o.type == "MESH"]
obj = meshes[0] if len(meshes) == 1 else join(meshes, "Model")
import mathutils
obj.data.transform(mathutils.Matrix.Rotation(math.radians(rotx), 4, "X")); obj.data.update()
bpy.context.view_layer.update()
lo, hi = bbox(obj); log("bbox", [round(v, 3) for v in lo], [round(v, 3) for v in hi], "tris", tri_count(obj))
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"; scene.render.resolution_x = 900; scene.render.resolution_y = 1200; scene.render.film_transparent = False
scene.world = bpy.data.worlds.new("W"); scene.world.use_nodes = True
bgn = scene.world.node_tree.nodes["Background"]; bgn.inputs[0].default_value = (0.5, 0.5, 0.5, 1); bgn.inputs[1].default_value = 1.0
mat = bpy.data.materials.new("Grey"); mat.use_nodes = True; mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.8, 0.8, 0.8, 1); mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.6
obj.data.materials.clear(); obj.data.materials.append(mat)
for name, energy, rot in (("Sun", 3.0, (55, 15, -35)), ("Fill", 1.0, (60, 0, 150))):
    l = bpy.data.objects.new(name, bpy.data.lights.new(name, "SUN")); scene.collection.objects.link(l); l.data.energy = energy; l.rotation_euler = tuple(math.radians(a) for a in rot)
cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); scene.collection.objects.link(cam); scene.camera = cam
cam.data.type = "ORTHO"; size = max(hi[2] - lo[2], hi[0] - lo[0], hi[1] - lo[1]); cam.data.ortho_scale = size * 1.15
cz = (lo[2] + hi[2]) / 2; cx = (lo[0] + hi[0]) / 2; cy = (lo[1] + hi[1]) / 2
for label, ang in (("front", -90), ("threequarter", -45), ("side", 0), ("back", 90)):
    a = math.radians(ang)
    cam.location = (cx + 6 * math.cos(a), cy + 6 * math.sin(a), cz); cam.rotation_euler = (math.pi / 2, 0, a + math.pi / 2)
    scene.render.filepath = os.path.join(ROOT, f"assets/previews/glb-{tag}-{label}.png")
    bpy.ops.render.render(write_still=True); log("wrote", label)
