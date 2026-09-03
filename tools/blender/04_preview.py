"""Render a checkpoint still of a cleaned or baked asset with the studio HDRI.
Run: tools/blender/run.sh 04_preview.py <blend name> [out name] [--size 1280] [--elev 8] [--yaw 25] [--fov 30] [--target 0.5]
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import bpy
import mathutils
from common import *

PREVIEWS = os.path.join(ROOT, "assets", "previews")


def opt(name, default, cast=float):
    a = args()
    return cast(a[a.index(name) + 1]) if name in a else default


def frame_objects(objs, cam, yaw, elev, fov, target_frac):
    lo = [min(bbox(o)[0][i] for o in objs) for i in range(3)]
    hi = [max(bbox(o)[1][i] for o in objs) for i in range(3)]
    size = max(hi[i] - lo[i] for i in range(3))
    centre = mathutils.Vector(((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2] + (hi[2] - lo[2]) * target_frac))
    dist = (max(hi[2] - lo[2], size * 0.6) * 1.15) / (2 * math.tan(math.radians(fov) / 2))
    y, e = math.radians(yaw), math.radians(elev)
    pos = centre + mathutils.Vector((math.sin(y) * math.cos(e), -math.cos(y) * math.cos(e), math.sin(e))) * dist
    cam.location = pos
    cam.rotation_euler = (centre - pos).to_track_quat("-Z", "Y").to_euler()
    cam.data.angle = math.radians(fov)
    cam.data.clip_start = max(dist * 0.001, 0.001)
    cam.data.clip_end = dist * 10


def main():
    a = args()
    name = a[0]
    out = a[1] if len(a) > 1 and not a[1].startswith("--") else name
    if name.endswith(".glb") or name.endswith(".gltf"):
        reset_scene()
        bpy.ops.import_scene.gltf(filepath=path(name))
        out = a[1] if len(a) > 1 and not a[1].startswith("--") else os.path.splitext(os.path.basename(name))[0]
    else:
        open_blend(name)
    scene = bpy.context.scene
    only = a[a.index("--only") + 1] if "--only" in a else None
    if only:
        for o in mesh_objects():
            if o.name != only:
                bpy.data.objects.remove(o, do_unlink=True)
    objs = mesh_objects()
    for o in objs:
        if not o.data.materials:
            m = bpy.data.materials.new("Preview")
            m.use_nodes = True
            b = m.node_tree.nodes["Principled BSDF"]
            b.inputs["Base Color"].default_value = (0.86, 0.84, 0.80, 1)
            b.inputs["Roughness"].default_value = 0.45
            o.data.materials.append(m)
    lid = bpy.data.objects.get("Lid")
    if lid is not None:
        lid.rotation_euler = (math.radians(opt("--lid", 0)), 0, 0)
        bpy.context.view_layer.update()
    cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam"))
    scene.collection.objects.link(cam)
    scene.camera = cam
    frame_objects(objs, cam, opt("--yaw", 25), opt("--elev", 8), opt("--fov", 30), opt("--target", 0.5))
    # world: HDRI
    world = bpy.data.worlds.new("World")
    world.use_nodes = True
    scene.world = world
    nt = world.node_tree
    env = nt.nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(path("public/hdri/brown_photostudio_02_1k.hdr"))
    bg = nt.nodes["Background"]
    bg.inputs["Strength"].default_value = 1.0
    nt.links.new(env.outputs["Color"], bg.inputs["Color"])
    # key light for shape
    key = bpy.data.objects.new("Key", bpy.data.lights.new("Key", "AREA"))
    key.data.energy = 250
    key.data.size = 1.5
    key.location = (1.5, -1.5, 2.5)
    key.rotation_euler = (mathutils.Vector((0, 0, 0.8)) - key.location).to_track_quat("-Z", "Y").to_euler()
    scene.collection.objects.link(key)
    # floor (skipped with --nofloor for scenes that bring their own ground)
    lo_all = [min(bbox(o)[0][i] for o in objs) for i in range(3)]; hi_all = [max(bbox(o)[1][i] for o in objs) for i in range(3)]
    log("scene bounds", [round(v, 2) for v in lo_all], [round(v, 2) for v in hi_all])
    bpy.ops.mesh.primitive_plane_add(size=20 if "--nofloor" not in a else 0.001, location=(0, 0, lo_all[2] - 0.001))
    floor = bpy.context.active_object
    fm = bpy.data.materials.new("Floor")
    fm.use_nodes = True
    fm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.05, 0.05, 0.055, 1)
    fm.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.6
    floor.data.materials.append(fm)
    scene.render.engine = "BLENDER_EEVEE"
    size = int(opt("--size", 1280))
    scene.render.resolution_x = size
    scene.render.resolution_y = size
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "AgX"
    scene.eevee.taa_render_samples = 32
    os.makedirs(PREVIEWS, exist_ok=True)
    scene.render.filepath = os.path.join(PREVIEWS, out + ".png")
    with Timer("render " + out):
        bpy.ops.render.render(write_still=True)
    log("wrote", os.path.relpath(scene.render.filepath, ROOT))


main()
