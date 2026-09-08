"""Render LOD0 with its baked albedo as pure emission: no lighting, no shading. Whatever shows is the texture."""
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import *
bpy.ops.wm.open_mainfile(filepath=os.path.join(CLEAN, "statue-baked.blend"))
scene = bpy.context.scene
for ob in bpy.data.objects:
    if ob.type == "MESH": ob.hide_render = ob.name != "StatueLOD0"
lod = bpy.data.objects["StatueLOD0"]
log("slots", [m.name for m in lod.data.materials])
for si, m in enumerate(lod.data.materials):
    tex = next((n for n in m.node_tree.nodes if n.type == "TEX_IMAGE" and "albedo" in (n.image.name if n.image else "")), None)
    log("slot", si, "albedo image", tex.image.name if tex else "NONE")
    nm = bpy.data.materials.new(f"Emit{si}"); nm.use_nodes = True
    nt = nm.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial"); em = nt.nodes.new("ShaderNodeEmission")
    ti = nt.nodes.new("ShaderNodeTexImage"); ti.image = tex.image if tex else None
    ti.interpolation = "Closest"
    nt.links.new(ti.outputs["Color"], em.inputs["Color"]); nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    lod.data.materials[si] = nm
scene.render.engine = "CYCLES"; scene.cycles.samples = 8; scene.render.resolution_x = 900; scene.render.resolution_y = 1100
scene.render.film_transparent = False
scene.world = bpy.data.worlds.new("W"); scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs[0].default_value = (0.5, 0.55, 0.6, 1)
cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); scene.collection.objects.link(cam); scene.camera = cam
cam.data.lens = 85; cam.location = (1.15, -1.55, 1.42); cam.rotation_euler = (math.radians(84), 0, math.radians(36))
scene.render.filepath = os.path.join(ROOT, "assets/previews/texcheck.png")
bpy.ops.render.render(write_still=True); log("wrote texcheck")
