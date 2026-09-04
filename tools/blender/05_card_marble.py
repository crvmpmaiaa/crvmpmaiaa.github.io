"""Bake the statue's procedural marble onto a flat card sized plane, orthographic, for the portal cards.
Run: tools/blender/run.sh 05_card_marble.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import *
import importlib
bake = importlib.import_module("02_bake")

reset_scene()
scene = bpy.context.scene
W, H = 1.5, 0.95
bpy.ops.mesh.primitive_plane_add(size=1)
plane = bpy.context.active_object
plane.scale = (W, H, 1)
bpy.ops.object.transform_apply(scale=True)
def carrara(name):
    """White statuary slab: thin branching veins from a noise distorted Voronoi edge field, faint cloud, fine grain."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nodes, links = nt.nodes, nt.links
    bsdf = nodes["Principled BSDF"]
    coord = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (1.3, 1.3, 1.3)
    mapping.inputs["Rotation"].default_value = (0, 0, 0.6)
    links.new(coord.outputs["Object"], mapping.inputs["Vector"])
    warp = nodes.new("ShaderNodeTexNoise"); warp.inputs["Scale"].default_value = 1.1; warp.inputs["Detail"].default_value = 6; warp.inputs["Roughness"].default_value = 0.6
    links.new(mapping.outputs["Vector"], warp.inputs["Vector"])
    add = nodes.new("ShaderNodeVectorMath"); add.operation = "ADD"
    scale = nodes.new("ShaderNodeVectorMath"); scale.operation = "SCALE"; scale.inputs["Scale"].default_value = 0.55
    links.new(warp.outputs["Color"], scale.inputs[0]); links.new(mapping.outputs["Vector"], add.inputs[0]); links.new(scale.outputs["Vector"], add.inputs[1])
    vor = nodes.new("ShaderNodeTexVoronoi"); vor.feature = "DISTANCE_TO_EDGE"; vor.inputs["Scale"].default_value = 2.2
    links.new(add.outputs["Vector"], vor.inputs["Vector"])
    # thin veins: only the first few percent of edge distance
    vein = nodes.new("ShaderNodeMapRange"); vein.inputs["From Min"].default_value = 0.0; vein.inputs["From Max"].default_value = 0.05; vein.inputs["To Min"].default_value = 1.0; vein.inputs["To Max"].default_value = 0.0
    links.new(vor.outputs["Distance"], vein.inputs["Value"])
    # second, finer and fainter vein network
    vor2 = nodes.new("ShaderNodeTexVoronoi"); vor2.feature = "DISTANCE_TO_EDGE"; vor2.inputs["Scale"].default_value = 5.5
    links.new(add.outputs["Vector"], vor2.inputs["Vector"])
    vein2 = nodes.new("ShaderNodeMapRange"); vein2.inputs["From Min"].default_value = 0.0; vein2.inputs["From Max"].default_value = 0.025; vein2.inputs["To Min"].default_value = 0.45; vein2.inputs["To Max"].default_value = 0.0
    links.new(vor2.outputs["Distance"], vein2.inputs["Value"])
    vsum = nodes.new("ShaderNodeMath"); vsum.operation = "MAXIMUM"
    links.new(vein.outputs["Result"], vsum.inputs[0]); links.new(vein2.outputs["Result"], vsum.inputs[1])
    # veins fade in and out along their length with a large noise so they do not read as a net
    gate = nodes.new("ShaderNodeTexNoise"); gate.inputs["Scale"].default_value = 0.9; gate.inputs["Detail"].default_value = 3
    links.new(mapping.outputs["Vector"], gate.inputs["Vector"])
    gr = nodes.new("ShaderNodeMapRange"); gr.inputs["From Min"].default_value = 0.35; gr.inputs["From Max"].default_value = 0.7
    links.new(gate.outputs["Fac"], gr.inputs["Value"])
    vg = nodes.new("ShaderNodeMath"); vg.operation = "MULTIPLY"
    links.new(vsum.outputs["Value"], vg.inputs[0]); links.new(gr.outputs["Result"], vg.inputs[1])
    # cloud: soft grey patches, low contrast
    cloud = nodes.new("ShaderNodeTexNoise"); cloud.inputs["Scale"].default_value = 1.6; cloud.inputs["Detail"].default_value = 7; cloud.inputs["Roughness"].default_value = 0.7
    links.new(mapping.outputs["Vector"], cloud.inputs["Vector"])
    body = nodes.new("ShaderNodeMix"); body.data_type = "RGBA"
    body.inputs["A"].default_value = (0.93, 0.925, 0.91, 1); body.inputs["B"].default_value = (0.80, 0.81, 0.83, 1)
    cr = nodes.new("ShaderNodeMapRange"); cr.inputs["From Min"].default_value = 0.35; cr.inputs["From Max"].default_value = 0.75
    links.new(cloud.outputs["Fac"], cr.inputs["Value"]); links.new(cr.outputs["Result"], body.inputs["Factor"])
    final = nodes.new("ShaderNodeMix"); final.data_type = "RGBA"
    final.inputs["B"].default_value = (0.42, 0.44, 0.47, 1)
    links.new(body.outputs["Result"], final.inputs["A"]); links.new(vg.outputs["Value"], final.inputs["Factor"])
    links.new(final.outputs["Result"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.35
    return m

mat = carrara("CardMarble")
plane.data.materials.append(mat)
cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam"))
cam.data.type = "ORTHO"
cam.data.ortho_scale = W
cam.location = (0, 0, 2)
scene.collection.objects.link(cam)
scene.camera = cam
world = bpy.data.worlds.new("W"); world.use_nodes = True; scene.world = world
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.0
world.node_tree.nodes["Background"].inputs["Color"].default_value = (1, 1, 1, 1)
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1536
scene.render.resolution_y = int(1536 * H / W)
scene.view_settings.view_transform = "Standard"
os.makedirs(path("assets/bake"), exist_ok=True)
scene.render.filepath = path("assets/bake/marble-card.png")
bpy.ops.render.render(write_still=True)
log("wrote assets/bake/marble-card.png")
