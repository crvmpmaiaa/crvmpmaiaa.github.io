"""Same camera, same light, three versions of the head and torso: the raw sculpt in clay, our LOD0 in clay,
our LOD0 with the baked marble. Run: tools/blender/run.sh 11_quality_test.py"""
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import *
scene = None
def setup():
    global scene
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"; scene.cycles.samples = 64; scene.cycles.use_denoising = True
    scene.render.resolution_x = 900; scene.render.resolution_y = 1100; scene.render.film_transparent = False
    if scene.world is None: scene.world = bpy.data.worlds.new("W")
    scene.world.use_nodes = True; bg = scene.world.node_tree.nodes["Background"]; bg.inputs[0].default_value = (0.55, 0.58, 0.62, 1); bg.inputs[1].default_value = 1.0
    for name, energy, rot, size in (("Key", 4.0, (50, 20, -40), 3.0), ("Fill", 1.5, (60, 0, 140), 8.0)):
        l = bpy.data.objects.new(name, bpy.data.lights.new(name, "SUN")); scene.collection.objects.link(l); l.data.energy = energy; l.data.angle = math.radians(size); l.rotation_euler = tuple(math.radians(a) for a in rot)
    cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); scene.collection.objects.link(cam); scene.camera = cam
    cam.data.lens = 85
    # head and torso, three quarter, like the site's opening frame
    cam.location = (1.15, -1.55, 1.42); cam.rotation_euler = (math.radians(84), 0, math.radians(36))
def clay():
    m = bpy.data.materials.new("Clay"); m.use_nodes = True; p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (0.78, 0.78, 0.78, 1); p.inputs["Roughness"].default_value = 0.55
    return m
def render(name):
    scene.render.filepath = os.path.join(ROOT, f"assets/previews/qt-{name}.png"); bpy.ops.render.render(write_still=True); log("wrote", name)

# 1: raw sculpt, clay
bpy.ops.wm.open_mainfile(filepath=os.path.join(CLEAN, "statue-nude.blend")); setup()
o = bpy.data.objects["Statue"]; o.data.materials.clear(); o.data.materials.append(clay()); render("raw-clay")
# 2 and 3: baked LOD0 in clay, then with its own marble
bpy.ops.wm.open_mainfile(filepath=os.path.join(CLEAN, "statue-baked.blend")); setup()
for ob in bpy.data.objects:
    if ob.type == "MESH": ob.hide_render = ob.name != "StatueLOD0"
lod = bpy.data.objects["StatueLOD0"]
keep = [m for m in lod.data.materials]
render("lod0-marble")
for i in range(len(lod.data.materials)): lod.data.materials[i] = clay()
render("lod0-clay")
