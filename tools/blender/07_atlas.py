"""Normalise the purchased temple model: apply transforms, Y up, origin at the base, scale to height, export glb.
Run: tools/blender/run.sh 06_temple.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from common import *

reset_scene()
bpy.ops.import_scene.gltf(filepath=path("assets/raw/atlas/scene.gltf"))
for o in list(bpy.context.scene.objects):
    if o.type == "MESH":
        clear_parent_keep(o); apply_transforms(o)
for o in list(bpy.context.scene.objects):
    if o.type != "MESH":
        bpy.data.objects.remove(o, do_unlink=True)
objs = mesh_objects()
obj = join(objs, "Atlas") if len(objs) > 1 else objs[0]
obj.name = obj.data.name = "Atlas"
scale_to_height(obj, 2.2)
set_origin_to_base(obj)
bpy.context.view_layer.update()
lo, hi = bbox(obj)
log("atlas bbox", [round(v, 3) for v in lo], [round(v, 3) for v in hi], "tris", tri_count(obj), "mats", len(obj.data.materials))
os.makedirs(path("assets/export"), exist_ok=True)
select_only(obj)
bpy.ops.export_scene.gltf(filepath=path("assets/export/atlas.glb"), export_format="GLB", use_selection=True, export_yup=True, export_apply=True, export_image_format="AUTO")
save_blend("atlas")
