"""Close look at the lion skin hanging over the forearm, the fringed area."""
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import *
bpy.ops.wm.open_mainfile(filepath=os.path.join(CLEAN, "statue-baked.blend"))
scene = bpy.context.scene
for ob in bpy.data.objects:
    if ob.type == "MESH": ob.hide_render = ob.name != "StatueLOD0"
scene.render.engine = "CYCLES"; scene.cycles.samples = 48; scene.cycles.use_denoising = True
scene.render.resolution_x = 1000; scene.render.resolution_y = 800
scene.world = bpy.data.worlds.new("W"); scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.58, 0.62, 1)
for name, energy, rot in (("Key", 4.0, (50, 20, -40)), ("Fill", 1.5, (60, 0, 140))):
    l = bpy.data.objects.new(name, bpy.data.lights.new(name, "SUN")); scene.collection.objects.link(l); l.data.energy = energy; l.rotation_euler = tuple(math.radians(a) for a in rot)
cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); scene.collection.objects.link(cam); scene.camera = cam
cam.data.lens = 100
for tag, loc, rot in (
    ("skin", (1.25, -1.05, 1.05), (88, 0, 50)),
    ("skinlow", (0.95, -1.15, 0.80), (80, 0, 40)),
):
    cam.location = loc; cam.rotation_euler = tuple(math.radians(a) for a in rot)
    scene.render.filepath = os.path.join(ROOT, f"assets/previews/{tag}.png"); bpy.ops.render.render(write_still=True); log("wrote", tag)
