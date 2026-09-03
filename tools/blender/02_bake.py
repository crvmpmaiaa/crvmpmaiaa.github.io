"""Decimate, unwrap, bake and export.
Statue: LOD0 (head weighted) and LOD1, baked normal/roughness/AO/albedo from a procedural marble on the raw scan.
Column: unwrap, bake marble at 1024, export.
Laptop: split into Base, Lid and ScreenSurface, Lid origin on the hinge, posed closed, export.
Run: tools/blender/run.sh 02_bake.py [statue|column|laptop ...]
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import bmesh
import bpy
import mathutils
from common import *


# ---------- materials ----------

def marble_material(name, scale=2.2, vein_scale=1.0, seed=0.0):
    """Procedural white marble: warm cream base, grey cloud veins stretched along one axis, tight roughness."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nodes, links = nt.nodes, nt.links
    bsdf = nodes["Principled BSDF"]
    coord = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (scale, scale * 0.35, scale * 1.4)
    mapping.inputs["Location"].default_value = (seed, seed * 0.7, seed * 1.3)
    links.new(coord.outputs["Object"], mapping.inputs["Vector"])
    # veins: distorted noise passed through a narrow ramp
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 1.6 * vein_scale
    noise.inputs["Detail"].default_value = 9.0
    noise.inputs["Roughness"].default_value = 0.62
    noise.inputs["Distortion"].default_value = 1.4
    links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
    wave = nodes.new("ShaderNodeTexWave")
    wave.wave_type = "BANDS"
    wave.bands_direction = "Y"
    wave.inputs["Scale"].default_value = 0.9 * vein_scale
    wave.inputs["Distortion"].default_value = 9.0
    wave.inputs["Detail"].default_value = 6.0
    wave.inputs["Detail Roughness"].default_value = 0.7
    links.new(mapping.outputs["Vector"], wave.inputs["Vector"])
    mix = nodes.new("ShaderNodeMath")
    mix.operation = "MULTIPLY"
    links.new(noise.outputs["Fac"], mix.inputs[0])
    links.new(wave.outputs["Fac"], mix.inputs[1])
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.18
    ramp.color_ramp.elements[0].color = (0.30, 0.31, 0.33, 1)  # vein grey
    ramp.color_ramp.elements[1].position = 0.42
    ramp.color_ramp.elements[1].color = (0.88, 0.86, 0.82, 1)  # marble body
    links.new(mix.outputs["Value"], ramp.inputs["Fac"])
    # fine grain
    grain = nodes.new("ShaderNodeTexNoise")
    grain.inputs["Scale"].default_value = 60.0
    grain.inputs["Detail"].default_value = 4.0
    links.new(mapping.outputs["Vector"], grain.inputs["Vector"])
    grain_mix = nodes.new("ShaderNodeMix")
    grain_mix.data_type = "RGBA"
    grain_mix.inputs["Factor"].default_value = 0.12
    links.new(ramp.outputs["Color"], grain_mix.inputs["A"])
    links.new(grain.outputs["Color"], grain_mix.inputs["B"])
    links.new(grain_mix.outputs["Result"], bsdf.inputs["Base Color"])
    # roughness: veins slightly glossier than the body, grain breaks it up
    rough = nodes.new("ShaderNodeMapRange")
    rough.inputs["From Min"].default_value = 0.0
    rough.inputs["From Max"].default_value = 1.0
    rough.inputs["To Min"].default_value = 0.42
    rough.inputs["To Max"].default_value = 0.30
    links.new(mix.outputs["Value"], rough.inputs["Value"])
    rough_add = nodes.new("ShaderNodeMath")
    rough_add.operation = "MULTIPLY_ADD"
    links.new(grain.outputs["Fac"], rough_add.inputs[0])
    rough_add.inputs[1].default_value = 0.08
    links.new(rough.outputs["Result"], rough_add.inputs[2])
    links.new(rough_add.outputs["Value"], bsdf.inputs["Roughness"])
    bsdf.inputs["Specular IOR Level"].default_value = 0.5
    bsdf.inputs["Subsurface Weight"].default_value = 0.0
    return m


def image_material(name, albedo, normal, rough, ao=None):
    """Baked PBR material for export: albedo x AO, roughness map, normal map."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nodes, links = nt.nodes, nt.links
    bsdf = nodes["Principled BSDF"]
    ta = nodes.new("ShaderNodeTexImage"); ta.image = albedo
    tr = nodes.new("ShaderNodeTexImage"); tr.image = rough; tr.image.colorspace_settings.name = "Non-Color"
    tn = nodes.new("ShaderNodeTexImage"); tn.image = normal; tn.image.colorspace_settings.name = "Non-Color"
    nm = nodes.new("ShaderNodeNormalMap")
    links.new(tn.outputs["Color"], nm.inputs["Color"])
    links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    links.new(tr.outputs["Color"], bsdf.inputs["Roughness"])
    if ao is not None:
        tao = nodes.new("ShaderNodeTexImage"); tao.image = ao; tao.image.colorspace_settings.name = "Non-Color"
        mul = nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"
        mul.inputs["Factor"].default_value = 0.85
        links.new(ta.outputs["Color"], mul.inputs["A"])
        links.new(tao.outputs["Color"], mul.inputs["B"])
        links.new(mul.outputs["Result"], bsdf.inputs["Base Color"])
    else:
        links.new(ta.outputs["Color"], bsdf.inputs["Base Color"])
    return m


# ---------- geometry ----------

def decimate_to(obj, target_tris, head_weight=None):
    """Collapse decimate to a triangle target. head_weight = (z_from, factor) keeps more density above z_from."""
    select_only(obj)
    mod = obj.modifiers.new("Decimate", "DECIMATE")
    mod.decimate_type = "COLLAPSE"
    mod.use_collapse_triangulate = True
    if head_weight:
        z_from, factor = head_weight
        vg = obj.vertex_groups.new(name="head")
        idx = [v.index for v in obj.data.vertices if v.co.z >= z_from]
        vg.add(idx, 1.0, "REPLACE")
        mod.vertex_group = "head"
        mod.vertex_group_factor = factor
        mod.invert_vertex_group = True  # weighted verts are protected
    total = tri_count(obj)
    mod.ratio = min(1.0, target_tris / total)
    bpy.ops.object.modifier_apply(modifier="Decimate")
    # decimation on a dense shell leaves a few flipped and degenerate faces: clean them up
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.dissolve_degenerate(threshold=1e-5)
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    got = tri_count(obj)
    # second pass to land near the target when weighting pushed it over
    if got > target_tris * 1.12:
        mod = obj.modifiers.new("Decimate2", "DECIMATE")
        mod.use_collapse_triangulate = True
        mod.ratio = target_tris / got
        bpy.ops.object.modifier_apply(modifier="Decimate2")
    log(f"decimate {obj.name}: {total} -> {tri_count(obj)} (target {target_tris})")


def unwrap(obj, margin=0.004, slot=None):
    """Smart project the whole object, or only the faces of one material slot into their own 0..1 layout."""
    select_only(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    if slot is None:
        bpy.ops.mesh.select_all(action="SELECT")
    else:
        bpy.ops.mesh.select_all(action="DESELECT")
        obj.active_material_index = slot
        bpy.ops.object.material_slot_select()
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=margin, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode="OBJECT")


def assign_head_slot(obj, head_z):
    """Faces above head_z go to a second material slot so the head gets its own texture set."""
    obj.data.materials.append(bpy.data.materials.new(obj.name + "HeadBake"))
    obj.data.materials[-1].use_nodes = True
    verts = obj.data.vertices
    n = 0
    for poly in obj.data.polygons:
        if all(verts[i].co.z > head_z for i in poly.vertices):
            poly.material_index = 1
            n += 1
    log(f"head slot: {n} faces above z {head_z:.3f}")
    return n


def new_image(name, size, color=False):
    img = bpy.data.images.new(name, size, size, alpha=False, float_buffer=False)
    if not color:
        img.colorspace_settings.name = "Non-Color"
    return img


def bake(low, high, img, kind, size, samples, extrusion=0.02, ray_distance=0.06, pass_filter=None, margin=16):
    """Selected to active bake from high onto low. img is one image, or a list with one image per material slot."""
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "GPU"
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "METAL"
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
    except Exception as e:
        log("GPU setup skipped:", e)
    scene.cycles.samples = samples
    scene.cycles.use_denoising = False
    scene.render.bake.margin = margin
    scene.render.bake.use_selected_to_active = high is not None
    scene.render.bake.cage_extrusion = extrusion
    scene.render.bake.max_ray_distance = ray_distance
    scene.render.bake.use_clear = True
    imgs = img if isinstance(img, list) else [img]
    nodes_made = []
    for mat, im in zip(low.data.materials, imgs):
        node = mat.node_tree.nodes.new("ShaderNodeTexImage")
        node.image = im
        mat.node_tree.nodes.active = node
        nodes_made.append((mat, node))
    bpy.ops.object.select_all(action="DESELECT")
    if high is not None:
        high.select_set(True)
    low.select_set(True)
    bpy.context.view_layer.objects.active = low
    kwargs = dict(type=kind, use_clear=True, margin=margin)
    if pass_filter:
        kwargs["pass_filter"] = pass_filter
    with Timer(f"bake {kind} {size}"):
        bpy.ops.object.bake(**kwargs)
    for mat, node in nodes_made:
        mat.node_tree.nodes.remove(node)
    return img


def save_image(img, name, fmt="PNG"):
    os.makedirs(BAKE, exist_ok=True)
    p = os.path.join(BAKE, f"{name}.png")
    img.filepath_raw = p
    img.file_format = fmt
    img.save()
    img.source = "FILE"
    img.filepath = p
    img.reload()
    img.pack()
    return p


def export_glb(objs, name):
    os.makedirs(MODELS, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    p = os.path.join(MODELS, f"{name}.glb")
    bpy.ops.export_scene.gltf(filepath=p, export_format="GLB", use_selection=True, export_yup=True,
                              export_apply=True, export_texcoords=True, export_normals=True,
                              export_materials="EXPORT", export_image_format="AUTO", export_jpeg_quality=88)
    log("exported", os.path.relpath(p, ROOT), file_size(p))
    return p


# ---------- assets ----------

def ensure_world():
    if bpy.context.scene.world is None:
        bpy.context.scene.world = bpy.data.worlds.new("World")


def statue():
    cfg = CONFIG["statue"]
    size = cfg["texture_size"]
    open_blend("statue")
    ensure_world()
    high = bpy.data.objects["Statue"]
    if cfg.get("remesh_voxel"):
        # the sculpt is many overlapping shells; fuse into one watertight surface before decimating or the
        # collapse tears holes where shells intersect (hair, beard, feet)
        select_only(high)
        rm = high.modifiers.new("Remesh", "REMESH")
        rm.mode = "VOXEL"
        rm.voxel_size = cfg["remesh_voxel"]
        rm.adaptivity = 0.0
        rm.use_smooth_shade = True
        with Timer(f"voxel remesh {cfg['remesh_voxel']}"):
            bpy.ops.object.modifier_apply(modifier="Remesh")
        log("remeshed tris", tri_count(high))
    high.data.materials.clear()
    high.data.materials.append(marble_material("MarbleHigh", scale=1.6, seed=3.0))
    lo, hi = bbox(high)
    head_z = lo[2] + (hi[2] - lo[2]) * (1 - cfg["head_fraction"])

    # LOD0 with head protected, LOD1 uniform
    lod0 = high.copy(); lod0.data = high.data.copy(); lod0.name = lod0.data.name = "StatueLOD0"
    bpy.context.scene.collection.objects.link(lod0)
    with Timer("decimate LOD0"):
        decimate_to(lod0, cfg["lod0_triangles"], head_weight=(head_z, cfg["head_weight"]) if cfg.get("head_weight") else None)
    lod1 = lod0.copy(); lod1.data = lod0.data.copy(); lod1.name = lod1.data.name = "StatueLOD1"
    bpy.context.scene.collection.objects.link(lod1)
    with Timer("decimate LOD1"):
        decimate_to(lod1, cfg["lod1_triangles"])

    use_head = bool(cfg.get("head_texture"))
    stats = {"lod0_triangles": tri_count(lod0), "lod1_triangles": tri_count(lod1), "textures": {}}
    for lod, s, samples, split in ((lod0, size, 64, use_head), (lod1, size // 2, 32, False)):
        lod.data.materials.clear()
        lod.data.materials.append(bpy.data.materials.new(lod.name + "Bake"))
        lod.data.materials[0].use_nodes = True
        slots = 1
        if split:
            assign_head_slot(lod, head_z)
            slots = 2
        for k in range(slots):
            unwrap(lod, margin=0.004 if s >= 2048 else 0.006, slot=k if slots > 1 else None)
        select_only(lod)
        bpy.ops.object.shade_smooth()
        names = ["body", "head"][:slots]
        mk = lambda kind, color=False: [new_image(f"{lod.name}_{names[k]}_{kind}", s, color=color) for k in range(slots)]
        nrm = bake(lod, high, mk("normal"), "NORMAL", s, 16)
        alb = bake(lod, high, mk("albedo", True), "DIFFUSE", s, 16, pass_filter={"COLOR"})
        rgh = bake(lod, high, mk("rough"), "ROUGHNESS", s, 16)
        # AO from the low poly itself: projecting it from the high poly starts rays inside neighbouring hair and
        # beard shells and leaves black patches
        bpy.context.scene.world.light_settings.distance = 0.25
        ao = bake(lod, None, mk("ao"), "AO", s, samples)
        lod_stats = {}
        mats = []
        for k in range(slots):
            paths = {kind: save_image(i[k], f"{lod.name.lower()}_{names[k]}_{kind}") for kind, i in (("normal", nrm), ("albedo", alb), ("rough", rgh), ("ao", ao))}
            lod_stats[names[k]] = {kind: {"size": s, "bytes": file_size(p)} for kind, p in paths.items()}
            mats.append(image_material(f"{lod.name}{names[k].title()}Mat", alb[k], nrm[k], rgh[k], ao[k]))
        stats["textures"][lod.name] = lod_stats
        # replace in place: clearing the slots resets every face's material index to 0
        for k, m in enumerate(mats):
            lod.data.materials[k] = m
        lod.modifiers.clear()
    stats["lod0_glb"] = file_size(export_glb([lod0], "statue-lod0"))
    stats["lod1_glb"] = file_size(export_glb([lod1], "statue-lod1"))
    bpy.data.objects.remove(high, do_unlink=True)
    save_blend("statue-baked")
    write_stats("statue", stats)


def column():
    cfg = CONFIG["column"]
    size = cfg["texture_size"]
    open_blend("column")
    ensure_world()
    obj = bpy.data.objects["Column"]
    if cfg.get("textured"):
        # source ships its own PBR textures: decimate to budget if needed and export as is
        if tri_count(obj) > cfg["triangles"] * 1.1:
            decimate_to(obj, cfg["triangles"])
        select_only(obj)
        bpy.ops.object.shade_smooth()
        glb = export_glb([obj], "column")
        save_blend("column-baked")
        write_stats("column", {"triangles": tri_count(obj), "textured_source": True, "glb": file_size(glb)})
        return
    obj.data.materials.clear()
    obj.data.materials.append(marble_material("MarbleColumn", scale=2.4, vein_scale=1.3, seed=11.0))
    with Timer("unwrap column"):
        unwrap(obj, margin=0.01)
    # self bake: no high poly, the procedural material is the source
    alb = bake(obj, None, new_image("column_albedo", size, color=True), "DIFFUSE", size, 16, pass_filter={"COLOR"})
    rgh = bake(obj, None, new_image("column_rough", size), "ROUGHNESS", size, 16)
    bpy.context.scene.world.light_settings.distance = 0.2
    ao = bake(obj, None, new_image("column_ao", size), "AO", size, 48)
    # flat normal (no high) keeps the glTF material complete and lets us add detail later
    nrm = new_image("column_normal", 4)
    nrm.pixels = [0.5, 0.5, 1.0, 1.0] * 16
    for k, i in (("albedo", alb), ("rough", rgh), ("ao", ao), ("normal", nrm)):
        save_image(i, f"column_{k}")
    obj.data.materials.clear()
    obj.data.materials.append(image_material("ColumnMat", alb, nrm, rgh, ao))
    glb = export_glb([obj], "column")
    save_blend("column-baked")
    write_stats("column", {"triangles": tri_count(obj), "texture": size, "glb": file_size(glb)})


def laptop():
    cfg = CONFIG["laptop"]
    open_blend("laptop")
    objs = mesh_objects()
    screen_mat = cfg["screen_material"]
    screen_src = next(o for o in objs if any(m.name == screen_mat for m in o.data.materials))
    zlo = min(bbox(o)[0][2] for o in objs); zhi = max(bbox(o)[1][2] for o in objs)
    lid_parts = [o for o in objs if bbox(o)[1][2] > zlo + (zhi - zlo) * 0.25]
    base_parts = [o for o in objs if o not in lid_parts]
    log("lid parts", [o.name for o in lid_parts], "base parts", [o.name for o in base_parts])
    assert screen_src in lid_parts
    lid_src = join(lid_parts, "Lid") if len(lid_parts) > 1 else lid_parts[0]

    # 1. isolate the screen faces into ScreenSurface
    select_only(lid_src)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="DESELECT")
    idx = [i for i, m in enumerate(lid_src.data.materials) if m.name == screen_mat][0]
    lid_src.active_material_index = idx
    bpy.ops.object.material_slot_select()
    bpy.ops.mesh.separate(type="SELECTED")
    bpy.ops.object.mode_set(mode="OBJECT")
    screen = [o for o in bpy.context.selected_objects if o is not lid_src][0]
    screen.name = screen.data.name = "ScreenSurface"
    lid = lid_src
    lid.name = lid.data.name = "Lid"
    # the screen should be a flat quad: verify planarity and rebuild UVs as a clean 0..1 map
    select_only(screen)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.dissolve_limited(angle_limit=math.radians(2))
    bpy.ops.object.mode_set(mode="OBJECT")
    bm = bmesh.new(); bm.from_mesh(screen.data)
    n = mathutils.Vector((0, 0, 0))
    for f in bm.faces:
        n += f.normal * f.calc_area()
    n.normalize()
    verts = [screen.matrix_world @ v.co for v in bm.verts]
    up = mathutils.Vector((0, 0, 1))
    u_axis = up.cross(n).normalized()
    v_axis = n.cross(u_axis).normalized()
    us = [(p.dot(u_axis)) for p in verts]; vs = [(p.dot(v_axis)) for p in verts]
    uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        for l in f.loops:
            p = screen.matrix_world @ l.vert.co
            l[uv].uv = ((p.dot(u_axis) - min(us)) / (max(us) - min(us)), (p.dot(v_axis) - min(vs)) / (max(vs) - min(vs)))
    bm.to_mesh(screen.data); bm.free()
    screen_w, screen_h = max(us) - min(us), max(vs) - min(vs)
    screen.data.materials.clear()
    sm = bpy.data.materials.new("ScreenSurface"); sm.use_nodes = True
    sm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.02, 0.02, 0.02, 1)
    sm.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.2
    screen.data.materials.append(sm)
    log(f"screen: {len(screen.data.polygons)} faces, {screen_w:.4f} x {screen_h:.4f}, aspect {screen_w/screen_h:.3f}, normal {tuple(round(c,3) for c in n)}")

    # 2. Base = everything else, joined
    base = join(base_parts, "Base") if len(base_parts) > 1 else base_parts[0]
    base.name = base.data.name = "Base"
    set_origin_to_base(base)
    bpy.context.view_layer.update()

    # 3. hinge: on the base's top surface at its back edge, so the closed lid lies on top of the base.
    # Lid thickness is taken from the lid's own extent along its normal near the hinge.
    blo, bhi = bbox(base)
    llo, lhi = bbox(lid)
    hinge_z = bhi[2]
    foot = [lid.matrix_world @ v.co for v in lid.data.vertices]
    foot = [q for q in foot if q.z < hinge_z + 0.006]
    hinge_y = (min(q.y for q in foot) + max(q.y for q in foot)) / 2 if foot else bhi[1] - 0.004
    saved = bpy.context.scene.cursor.location.copy()
    bpy.context.scene.cursor.location = ((llo[0] + lhi[0]) / 2, hinge_y, hinge_z)
    for o in (lid, screen):
        select_only(o)
        bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    bpy.context.scene.cursor.location = saved
    screen.parent = lid
    screen.matrix_parent_inverse = lid.matrix_world.inverted()
    log(f"base top z {bhi[2]:.4f}, back y {bhi[1]:.4f}, hinge {tuple(round(c,4) for c in lid.location)}")

    # 4. measure the open angle and pose closed: rotate about the hinge (local X) so the lid lies flat on the base
    # lid direction = from hinge to the lid's far edge, projected on the YZ plane
    # lid plane up vector from the screen normal (n faces the viewer): u = n rotated 90 degrees about X
    u = mathutils.Vector((0, n.z, -n.y)).normalized()
    open_angle = math.degrees(math.atan2(u.z, -u.y))  # 0 = lying flat toward the front (-Y), 90 = vertical
    log(f"lid open angle in source: {open_angle:.1f} deg, hinge at {tuple(round(c,4) for c in lid.location)}")
    # Closing: rotate about +X by +angle so the far edge swings forward (toward -Y) and down onto the base.
    lid.rotation_mode = "XYZ"
    lid.rotation_euler = (math.radians(open_angle), 0, 0)
    bpy.context.view_layer.update()
    for o in (lid, screen):
        select_only(o)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    lid.rotation_euler = (0, 0, 0)
    bpy.context.view_layer.update()
    clo = [min(bbox(o)[0][i] for o in (base, lid, screen)) for i in range(3)]
    chi = [max(bbox(o)[1][i] for o in (base, lid, screen)) for i in range(3)]
    log("laptop closed bbox", [round(v, 4) for v in clo], [round(v, 4) for v in chi])
    assert bbox(lid)[1][1] < lid.location.y + 0.03, "lid closed backwards"
    lid_lo = bbox(lid)[0][2]
    log("closed lid bottom", round(lid_lo,4), "base top", round(bhi[2],4))
    assert lid_lo > bhi[2] - 0.006, f"closed lid sinks into the base: lid bottom {lid_lo:.4f}, base top {bhi[2]:.4f}"

    # Hinge convention. In a right handed Y up scene with the laptop facing +Z, rotating the lid about +X by a
    # positive angle pushes the far edge down. To make a positive Lid.rotation.x OPEN the lid, the lid sits under
    # a LidPivot node rotated 180 degrees about the vertical axis, and the lid mesh is stored pre rotated so the
    # rest pose is unchanged. world = pivot(180) * Rx(+a) * mesh, and +a lifts the far edge forward.
    hinge = lid.location.copy()
    pivot = bpy.data.objects.new("LidPivot", None)
    bpy.context.scene.collection.objects.link(pivot)
    pivot.location = hinge
    pivot.rotation_euler = (0, 0, math.pi)
    flip = mathutils.Matrix.Rotation(math.pi, 4, "Z") @ mathutils.Matrix.Translation(-hinge)
    for o, parent in ((lid, pivot), (screen, lid)):
        mw = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = mw
        bpy.context.view_layer.update()
        select_only(o)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)  # mesh now in world coords
        o.data.transform(flip)  # local = Rz(180) * (world - hinge)
        o.parent = parent
        o.matrix_parent_inverse.identity()
        o.location = (0, 0, 0)
        o.rotation_euler = (0, 0, 0)
        o.scale = (1, 1, 1)
    bpy.context.view_layer.update()
    rlo = [min(bbox(o)[0][i] for o in (base, lid, screen)) for i in range(3)]
    rhi = [max(bbox(o)[1][i] for o in (base, lid, screen)) for i in range(3)]
    log("rest after rig", [round(v, 4) for v in rlo], [round(v, 4) for v in rhi], "screen", [round(v,4) for v in bbox(screen)[0]], [round(v,4) for v in bbox(screen)[1]], "lid", [round(v,4) for v in bbox(lid)[0]], [round(v,4) for v in bbox(lid)[1]])
    assert all(abs(rlo[i] - clo[i]) < 1e-3 and abs(rhi[i] - chi[i]) < 1e-3 for i in range(3)), "pivot rig moved the rest pose"

    # sanity: a positive X rotation on Lid must open it forward and up
    lid.rotation_euler = (math.radians(cfg["lid_open_degrees"]), 0, 0)
    bpy.context.view_layer.update()
    olo, ohi = bbox(lid)
    slo, shi = bbox(screen)
    log(f"lid at +{cfg['lid_open_degrees']} deg: top z {ohi[2]:.4f} (closed top {chi[2]:.4f}), lid y range {olo[1]:.4f}..{ohi[1]:.4f}, hinge y {pivot.location.y:.4f}")
    assert ohi[2] > chi[2] + 0.05, "positive X rotation does not lift the lid"
    lid.rotation_euler = (math.radians(45), 0, 0)
    bpy.context.view_layer.update()
    hlo, hhi = bbox(lid)
    assert hlo[1] < pivot.location.y - 0.05 and hhi[2] > chi[2] + 0.05, "lid opened backwards"
    lid.rotation_euler = (0, 0, 0)
    bpy.context.view_layer.update()

    tris = {o.name: tri_count(o) for o in (base, lid, screen)}
    glb = export_glb([base, pivot, lid, screen], "laptop")
    save_blend("laptop-baked")
    write_stats("laptop", {"triangles": tris, "screen_aspect": round(screen_w / screen_h, 4), "screen_size": [round(screen_w, 4), round(screen_h, 4)],
                           "closed_size": [round(chi[i] - clo[i], 4) for i in range(3)], "hinge": [round(c, 4) for c in pivot.location],
                           "source_open_angle": round(open_angle, 1), "glb": file_size(glb)})


if __name__ == "__main__":
    which = args() or ["statue", "column", "laptop"]
    for w in which:
        {"statue": statue, "column": column, "laptop": laptop}[w]()
