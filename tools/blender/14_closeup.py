"""Close up of the loincloth on the baked LOD0, marble and flat-texture side by side."""
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import *
bpy.ops.wm.open_mainfile(filepath=os.path.join(CLEAN, "statue-baked.blend"))
scene = bpy.context.scene
for ob in bpy.data.objects:
    if ob.type == "MESH": ob.hide_render = ob.name != "StatueLOD0"
lod = bpy.data.objects["StatueLOD0"]
scene.render.engine = "CYCLES"; scene.cycles.samples = 48; scene.cycles.use_denoising = True
scene.render.resolution_x = 1000; scene.render.resolution_y = 800
scene.world = bpy.data.worlds.new("W"); scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.58, 0.62, 1)
for name, energy, rot in (("Key", 4.0, (50, 20, -40)), ("Fill", 1.5, (60, 0, 140))):
    l = bpy.data.objects.new(name, bpy.data.lights.new(name, "SUN")); scene.collection.objects.link(l); l.data.energy = energy; l.rotation_euler = tuple(math.radians(a) for a in rot)
cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); scene.collection.objects.link(cam); scene.camera = cam
cam.data.lens = 110; cam.location = (0.75, -1.05, 1.02); cam.rotation_euler = (math.radians(88), 0, math.radians(36))
scene.render.filepath = os.path.join(ROOT, "assets/previews/cloth-marble.png"); bpy.ops.render.render(write_still=True); log("wrote marble")
