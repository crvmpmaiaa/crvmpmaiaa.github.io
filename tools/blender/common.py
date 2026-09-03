"""Shared helpers for the headless Blender pipeline. Blender works Z up internally; glTF export writes Y up."""
import json
import math
import os
import sys
import time

import bpy

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CONFIG = json.load(open(os.path.join(ROOT, "assets", "config.json")))
CLEAN = os.path.join(ROOT, "assets", "clean")
BAKE = os.path.join(ROOT, "assets", "bake")
STATS = os.path.join(ROOT, "assets", "stats.json")
MODELS = os.path.join(ROOT, "public", "models")
POINTS = os.path.join(ROOT, "public", "points")


def path(rel):
    return os.path.join(ROOT, rel)


def log(*args):
    print("[bd]", *args, flush=True)


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def args():
    argv = sys.argv
    return argv[argv.index("--") + 1:] if "--" in argv else []


def select_only(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def apply_transforms(obj):
    select_only(obj)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def clear_parent_keep(obj):
    select_only(obj)
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")


def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    out = bpy.context.view_layer.objects.active
    out.name = name
    out.data.name = name
    return out


def bbox(obj):
    import mathutils
    pts = [obj.matrix_world @ mathutils.Vector(c) for c in obj.bound_box]
    lo = [min(p[i] for p in pts) for i in range(3)]
    hi = [max(p[i] for p in pts) for i in range(3)]
    return lo, hi


def set_origin_to_base(obj):
    """Origin at the centre of the footprint, on the lowest point."""
    lo, hi = bbox(obj)
    cx, cy = (lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2
    saved = bpy.context.scene.cursor.location.copy()
    bpy.context.scene.cursor.location = (cx, cy, lo[2])
    select_only(obj)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    bpy.context.scene.cursor.location = saved
    obj.location = (0, 0, 0)


def scale_to_height(obj, height):
    lo, hi = bbox(obj)
    obj.scale = (height / (hi[2] - lo[2]),) * 3
    apply_transforms(obj)


def scale_to_width(obj, width):
    lo, hi = bbox(obj)
    obj.scale = (width / (hi[0] - lo[0]),) * 3
    apply_transforms(obj)


def tri_count(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def mesh_objects():
    return [o for o in bpy.context.scene.objects if o.type == "MESH"]


def save_blend(name):
    os.makedirs(CLEAN, exist_ok=True)
    p = os.path.join(CLEAN, name + ".blend")
    bpy.ops.wm.save_as_mainfile(filepath=p, compress=True)
    log("saved", os.path.relpath(p, ROOT))
    return p


def open_blend(name):
    bpy.ops.wm.open_mainfile(filepath=os.path.join(CLEAN, name + ".blend"))


def write_stats(section, data):
    stats = json.load(open(STATS)) if os.path.exists(STATS) else {}
    stats[section] = data
    json.dump(stats, open(STATS, "w"), indent=2)


def file_size(p):
    return os.path.getsize(p) if os.path.exists(p) else 0


class Timer:
    def __init__(self, label):
        self.label = label

    def __enter__(self):
        self.t = time.time()
        return self

    def __exit__(self, *a):
        log(f"{self.label}: {time.time() - self.t:.1f}s")
