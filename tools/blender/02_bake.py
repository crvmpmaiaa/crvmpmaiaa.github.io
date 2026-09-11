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
import numpy as np
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
    ramp.color_ramp.elements[0].position = 0.24
    ramp.color_ramp.elements[0].color = (0.80, 0.80, 0.82, 1)  # vein grey, faint
    ramp.color_ramp.elements[1].position = 0.34
    ramp.color_ramp.elements[1].color = (0.95, 0.94, 0.92, 1)  # statuary body
    links.new(mix.outputs["Value"], ramp.inputs["Fac"])
    # fine grain
    grain = nodes.new("ShaderNodeTexNoise")
    grain.inputs["Scale"].default_value = 60.0
    grain.inputs["Detail"].default_value = 4.0
    links.new(mapping.outputs["Vector"], grain.inputs["Vector"])
    grain_mix = nodes.new("ShaderNodeMix")
    grain_mix.data_type = "RGBA"
    grain_mix.inputs["Factor"].default_value = 0.03
    links.new(ramp.outputs["Color"], grain_mix.inputs["A"])
    links.new(grain.outputs["Color"], grain_mix.inputs["B"])
    links.new(grain_mix.outputs["Result"], bsdf.inputs["Base Color"])
    # roughness: veins slightly glossier than the body, grain breaks it up
    rough = nodes.new("ShaderNodeMapRange")
    rough.inputs["From Min"].default_value = 0.0
    rough.inputs["From Max"].default_value = 1.0
    rough.inputs["To Min"].default_value = 0.52
    rough.inputs["To Max"].default_value = 0.40
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


def bake(low, high, img, kind, size, samples, extrusion=0.008, ray_distance=0.03, pass_filter=None, margin=64):
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
    # a self bake must not see any other geometry, or the high poly a millimetre away occludes everything
    hidden = []
    if high is None:
        for o in bpy.context.scene.objects:
            if o.type == "MESH" and o is not low and not o.hide_render:
                o.hide_render = True
                hidden.append(o)
    with Timer(f"bake {kind} {size}"):
        bpy.ops.object.bake(**kwargs)
    for o in hidden:
        o.hide_render = False
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
    # the raw sculpt keeps every fine detail: normals are baked from this, and the fused copy below only shapes the low poly
    if cfg.get("smooth_spikes"):
        import numpy as np
        # The lion skin is fine fur in the sculpt, and collapsing it to a web mesh leaves ragged shards. Move
        # each vertex toward the average of its neighbours, but weighted so that only genuinely spiky vertices
        # move: a vertex sitting on a smooth surface is already near that average and stays put, so carved
        # detail like the beard and the muscle is untouched.
        me = high.data
        nv, ne = len(me.vertices), len(me.edges)
        co = np.empty(nv * 3, np.float32); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
        ed = np.empty(ne * 2, np.int32); me.edges.foreach_get("vertices", ed); ed = ed.reshape(-1, 2)
        a_i, b_i = ed[:, 0], ed[:, 1]
        deg = np.zeros(nv, np.float32)
        np.add.at(deg, a_i, 1.0); np.add.at(deg, b_i, 1.0)
        deg = np.maximum(deg, 1.0)
        edge_len = float(np.linalg.norm(co[a_i] - co[b_i], axis=1).mean())
        moved = 0.0
        for _ in range(cfg.get("smooth_iterations", 6)):
            acc = np.zeros_like(co)
            np.add.at(acc, a_i, co[b_i]); np.add.at(acc, b_i, co[a_i])
            delta = acc / deg[:, None] - co
            mag = np.linalg.norm(delta, axis=1) / max(edge_len, 1e-9)
            w = np.clip((mag - cfg.get("smooth_threshold", 0.42)) / 0.5, 0.0, 1.0) ** 2
            # The lion skin is a regular corrugation, not spikes, so each vertex already sits near the average
            # of its neighbours and the test above barely moves it. Smooth that whole region on its own terms
            # instead, fading in across its boundary so there is no seam against the body.
            rx = cfg.get("smooth_region_x")
            if rx is not None:
                w = np.maximum(w, np.clip((co[:, 0] - rx) / 0.06, 0.0, 1.0))
            # the beard and hair are meant to be rough, so hold the head still
            hz = cfg.get("smooth_protect_above")
            if hz is not None:
                w = w * np.clip((hz - co[:, 2]) / 0.06, 0.0, 1.0)
            step = delta * (0.85 * w)[:, None]
            co += step
            moved = float(np.abs(step).max())
        me.vertices.foreach_set("co", co.ravel()); me.update()
        log(f"spike smoothing: {nv} verts, mean edge {edge_len:.5f}, last max move {moved:.5f}")

    raw = high.copy(); raw.data = high.data.copy(); raw.name = raw.data.name = "StatueRaw"
    bpy.context.scene.collection.objects.link(raw); raw.hide_render = True; raw.hide_set(True)
    # a watertight copy purely for occlusion: on the raw sculpt every AO ray hits an interior shell and the map
    # bakes black, so the shading detail has to come off a fused version of the same silhouette
    solid = None
    if cfg.get("bake_ao", True):
        solid = high.copy(); solid.data = high.data.copy(); solid.name = solid.data.name = "StatueSolid"
        bpy.context.scene.collection.objects.link(solid)
        select_only(solid)
        rm = solid.modifiers.new("Remesh", "REMESH"); rm.mode = "VOXEL"; rm.voxel_size = 0.0035; rm.adaptivity = 0.0; rm.use_smooth_shade = True
        with Timer("AO proxy remesh"):
            bpy.ops.object.modifier_apply(modifier="Remesh")
        log("AO proxy tris", tri_count(solid))
        solid.hide_render = True; solid.hide_set(True)
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

    # Decimation leaves a scatter of zero area faces. They survive unwrapping with useless texture coordinates,
    # so they sample whatever texel they happen to land on and render as slivers in the wrong shade. Dissolve
    # them before the UVs are made and the problem cannot arise.
    for m in (lod0, lod1):
        select_only(m)
        before = tri_count(m)
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.mesh.dissolve_degenerate(threshold=2e-5)
        bpy.ops.mesh.remove_doubles(threshold=1e-5)
        bpy.ops.object.mode_set(mode="OBJECT")
        log(f"{m.name}: dissolved degenerates, {before} -> {tri_count(m)} tris")

    use_head = bool(cfg.get("head_texture"))
    stats = {"lod0_triangles": tri_count(lod0), "lod1_triangles": tri_count(lod1), "textures": {}}

    if cfg.get("solid_colour"):
        import numpy as np  # numpy is imported again further down, which makes it local to this function
        # One solid marble colour, and the shading carried on the mesh itself as a colour per vertex rather than
        # in an image. A texture on a 600k mesh gives each triangle a handful of pixels, so almost every face sits
        # on the edge of a texture island where the bake only half covers it, and those half covered pixels are
        # what read as marks. Vertices have no islands and no edges, so the whole class of fault cannot occur.
        base = cfg.get("marble_rgb", [0.93, 0.925, 0.91])
        for lod, samples in ((lod0, 256), (lod1, 128)):
            lod.data.materials.clear()
            mat = bpy.data.materials.new(lod.name + "Solid"); mat.use_nodes = True
            nt = mat.node_tree; bsdf = nt.nodes["Principled BSDF"]
            bsdf.inputs["Base Color"].default_value = (base[0], base[1], base[2], 1.0)
            bsdf.inputs["Roughness"].default_value = cfg.get("marble_roughness", 0.45)
            lod.data.materials.append(mat)
            me = lod.data
            for ca in list(me.color_attributes):
                me.color_attributes.remove(ca)
            ca = me.color_attributes.new(name="Col", type="FLOAT_COLOR", domain="POINT")
            me.color_attributes.active_color = ca
            me.attributes.active_color = ca
            scene = bpy.context.scene
            scene.render.engine = "CYCLES"; scene.cycles.device = "GPU"; scene.cycles.samples = samples
            scene.cycles.use_denoising = False
            scene.world.light_settings.distance = 0.25
            scene.render.bake.target = "VERTEX_COLORS"
            scene.render.bake.use_selected_to_active = True
            scene.render.bake.cage_extrusion = 0.008
            scene.render.bake.max_ray_distance = 0.03
            scene.render.bake.use_clear = True
            solid.hide_set(False); solid.hide_render = False
            hidden = []
            for ob in bpy.data.objects:
                if ob.type == "MESH" and ob not in (solid, lod):
                    hidden.append((ob, ob.hide_render)); ob.hide_render = True
            rays = (lod.visible_diffuse, lod.visible_glossy, lod.visible_transmission, lod.visible_shadow)
            lod.visible_diffuse = lod.visible_glossy = lod.visible_transmission = lod.visible_shadow = False
            bpy.ops.object.select_all(action="DESELECT")
            solid.select_set(True); lod.select_set(True)
            bpy.context.view_layer.objects.active = lod
            with Timer(f"{lod.name} vertex AO {samples}"):
                bpy.ops.object.bake(type="AO")
            lod.visible_diffuse, lod.visible_glossy, lod.visible_transmission, lod.visible_shadow = rays
            for ob, h in hidden: ob.hide_render = h
            solid.hide_render = True; solid.hide_set(True)
            scene.render.bake.target = "IMAGE_TEXTURES"
            n = len(me.vertices)
            vals = np.zeros(n * 4, np.float32)
            ca.data.foreach_get("color", vals)
            v = vals.reshape(-1, 4)
            lo = cfg.get("ao_floor", 0.55)
            v[:, :3] = lo + (1.0 - lo) * np.clip(v[:, :3], 0.0, 1.0)   # keep the shading, never go dark
            ca.data.foreach_set("color", v.ravel())
            log(f"{lod.name}: vertex shading on {n} vertices, range {v[:, 0].min():.2f} to {v[:, 0].max():.2f}")
            # the exporter only writes COLOR_0 when the material reads it
            vc = nt.nodes.new("ShaderNodeVertexColor"); vc.layer_name = "Col"
            mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
            mix.inputs["Factor"].default_value = 1.0
            rgb = nt.nodes.new("ShaderNodeRGB"); rgb.outputs[0].default_value = (base[0], base[1], base[2], 1.0)
            nt.links.new(rgb.outputs[0], mix.inputs["A"])
            nt.links.new(vc.outputs["Color"], mix.inputs["B"])
            nt.links.new(mix.outputs["Result"], bsdf.inputs["Base Color"])
        stats["lod0_glb"] = file_size(export_glb([lod0], "statue-lod0"))
        stats["lod1_glb"] = file_size(export_glb([lod1], "statue-lod1"))
        for o in (raw, solid, high):
            if o: o.hide_render = False; o.hide_set(False)
        save_blend("statue-baked")
        write_stats("statue", stats)
        return
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
        # A normal map only pays off when the low poly is far coarser than the source. Here the LOD carries most
        # of the sculpt already, and the sculpt is overlapping shells, so rays hit a neighbouring shell's back
        # face and record a garbage normal that reads as a black speck. Flat normals, detail from the geometry.
        if cfg.get("bake_normal", True):
            raw.hide_set(False); raw.hide_render = False
            nrm = bake(lod, raw, mk("normal"), "NORMAL", s, 16)
            raw.hide_render = True; raw.hide_set(True)
        else:
            nrm = mk("normal")
            for img in nrm:
                img.pixels = [0.5, 0.5, 1.0, 1.0] * (img.size[0] * img.size[1])
            log("normal skipped (bake_normal false): flat")
        # colour and roughness come from the procedural marble on the low poly itself: it is defined in object
        # space so it matches the high poly exactly, and a self bake cannot miss thin geometry
        keep = [m for m in lod.data.materials]
        for k in range(slots):
            lod.data.materials[k] = marble_material(f"{lod.name}MarbleSelf{k}", scale=1.6, seed=3.0)
        alb = bake(lod, None, mk("albedo", True), "DIFFUSE", s, 16, pass_filter={"COLOR"})
        rgh = bake(lod, None, mk("rough"), "ROUGHNESS", s, 16)
        for k, m in enumerate(keep):
            lod.data.materials[k] = m
        # AO from the low poly itself as well, unless the source is a sculpt of overlapping shells: there
        # every ray hits interior geometry and the map bakes almost black, which reads as grime on white stone
        if cfg.get("bake_ao", True):
            bpy.context.scene.world.light_settings.distance = 0.25
            # Only the fused proxy may occlude. The full res sculpt sits exactly on top of the LOD, so if it is
            # left visible to rays every sample hits it at zero distance and the whole map bakes black; the LOD
            # itself has to stop occluding too, for the same reason.
            solid.hide_set(False); solid.hide_render = False
            hidden = []
            for ob in bpy.data.objects:
                if ob.type == "MESH" and ob not in (solid, lod):
                    hidden.append((ob, ob.hide_render)); ob.hide_render = True
            rays = (lod.visible_diffuse, lod.visible_glossy, lod.visible_transmission, lod.visible_shadow)
            lod.visible_diffuse = lod.visible_glossy = lod.visible_transmission = lod.visible_shadow = False
            ao = bake(lod, solid, mk("ao"), "AO", s, samples * 4)
            lod.visible_diffuse, lod.visible_glossy, lod.visible_transmission, lod.visible_shadow = rays
            for ob, h in hidden: ob.hide_render = h
            solid.hide_render = True; solid.hide_set(True)
        else:
            ao = mk("ao")
            for img in ao:
                img.pixels = [1.0] * (img.size[0] * img.size[1] * 4)
            log("AO skipped (bake_ao false): flat white")
        import numpy as np

        def coverage_mask(img, threshold):
            """Texels the bake did not fully cover. Blender records coverage in alpha, so a texel on the edge of
            a UV island reads back part covered: its colour is a blend of the real value and the cleared
            background, which is exactly the faint dark shard problem. Alpha separates those precisely, where a
            brightness test cannot. Falls back to brightness if the target carries no alpha information."""
            w, h = img.size
            a = np.array(img.pixels[:], np.float32).reshape(h, w, 4)
            alpha = a[..., 3]
            if float(alpha.min()) < 0.999:
                m = alpha < 0.999
                log(f"coverage from alpha: {100.0 * m.mean():.1f}% of texels not fully covered")
                return m
            log("no alpha coverage on this target, falling back to a brightness test")
            return a[..., :3].sum(axis=2) < threshold

        def hole_mask(img, threshold):
            """Texels the bake never covered. One mask, taken from the colour map, is used for every map: they
            share UVs, so a texel missing in one is missing in all, and the occlusion map has no reliable
            brightness of its own to test against (a real crevice is legitimately black)."""
            w, h = img.size
            a = np.array(img.pixels[:], np.float32).reshape(h, w, 4)
            return a[..., :3].sum(axis=2) < threshold

        def fill_masked(img, hole, passes=80):
            """Grow the covered pixels outward into the masked ones; anything still masked takes the map average."""
            w, h = img.size
            a = np.array(img.pixels[:], np.float32).reshape(h, w, 4)
            rgb = a[..., :3]
            hole = hole.copy()
            filled = 0
            for _ in range(passes):
                if not hole.any():
                    break
                good = (~hole).astype(np.float32)[..., None]
                acc = np.zeros_like(rgb); cnt = np.zeros_like(good)
                for ax, sh in ((0, 1), (0, -1), (1, 1), (1, -1)):
                    acc += np.roll(rgb * good, sh, ax); cnt += np.roll(good, sh, ax)
                take = hole & (cnt[..., 0] > 0)
                rgb[take] = acc[take] / np.maximum(cnt[take], 1e-6)
                hole &= ~take
                filled += int(take.sum())
            if hole.any() and (~hole).any():
                rgb[hole] = rgb[~hole].mean(axis=0)
                filled += int(hole.sum())
            a[..., :3] = rgb; a[..., 3] = 1.0
            img.pixels = a.ravel().tolist()
            return filled

        def blur(img, passes=2):
            # small separable blur to take the sampling noise out of the occlusion in tight crevices
            w, h = img.size
            a = np.array(img.pixels[:], np.float32).reshape(h, w, 4)
            for _ in range(passes):
                a = (a + np.roll(a, 1, 0) + np.roll(a, -1, 0)) / 3.0
                a = (a + np.roll(a, 1, 1) + np.roll(a, -1, 1)) / 3.0
            img.pixels = a.ravel().tolist()

        for k in range(slots):
            mask = coverage_mask(alb[k], 2.30)
            n = fill_masked(alb[k], mask); fill_masked(rgh[k], mask)
            if cfg.get("bake_ao", True): fill_masked(ao[k], mask)
            if cfg.get("bake_normal", True): fill_masked(nrm[k], mask)
            if n: log(f"{names[k]}: filled {n} unbaked texels across all maps")
            # Clamp each map into the range its own material can actually produce. Texels on the edge of a UV
            # island come back part covered, so they land between the real colour and the black background:
            # only slightly dark, but enough to read as a shard on white stone, and too close to the real
            # values for any threshold to separate. The marble never goes below its vein colour, and the
            # roughness never leaves its own narrow band, so anything outside is a bake artifact.
            apx = np.array(alb[k].pixels[:], np.float32).reshape(-1, 4)
            apx[:, :3] = np.clip(apx[:, :3], 0.76, 1.0)
            alb[k].pixels = apx.ravel().tolist()
            rpx = np.array(rgh[k].pixels[:], np.float32).reshape(-1, 4)
            rpx[:, :3] = np.clip(rpx[:, :3], 0.34, 0.62)
            rgh[k].pixels = rpx.ravel().tolist()
            if cfg.get("bake_ao", True):
                # Occlusion is only ever wanted as broad shading, so blur it hard. Part covered texels on island
                # edges are single pixel artifacts and disappear into their neighbours; the large scale shadow
                # that gives the carving its depth survives untouched.
                blur(ao[k], passes=14)
                # a fully black occlusion texel is a self intersection in the cloth, not a real crevice, and it
                # multiplies through to a black shard on white stone. Floor it.
                apx = np.array(ao[k].pixels[:], np.float32).reshape(-1, 4)
                apx[:, :3] = np.maximum(apx[:, :3], 0.32)
                ao[k].pixels = apx.ravel().tolist()
            if not cfg.get("bake_normal", True):
                continue
            # missed normal texels are black, back face hits point away: both become flat
            px = np.array(nrm[k].pixels[:], np.float32).reshape(-1, 4)
            bad = (px[:, :3].sum(axis=1) < 0.15) | (px[:, 2] < 0.62)
            px[bad, 0] = 0.5; px[bad, 1] = 0.5; px[bad, 2] = 1.0
            nrm[k].pixels = px.ravel().tolist()
            log(f"normal {names[k]}: flattened {int(bad.sum())} texels")
        lod_stats = {}
        mats = []
        for k in range(slots):
            # fold AO into the albedo: the glTF exporter only carries a plain image on base colour
            import numpy as np
            a_px = np.array(alb[k].pixels[:], np.float32).reshape(-1, 4)
            o_px = np.array(ao[k].pixels[:], np.float32).reshape(-1, 4)
            occ = 1.0 - 0.48 * (1.0 - o_px[:, :1])  # enough to read as carved shadow, short of grime
            a_px[:, :3] *= occ
            # Floor the result. A handful of sliver faces left by decimation carry useless texture coordinates
            # and sample whatever texel they land on; with occlusion multiplied in they can land very dark and
            # read as shards. Once nothing in the map is darker than this, a stray sample is at worst a soft
            # grey patch, and the carved shading still has its full range above it.
            a_px[:, :3] = np.clip(a_px[:, :3], 0.55, 1.0)
            alb[k].pixels = a_px.ravel().tolist()
            paths = {kind: save_image(i[k], f"{lod.name.lower()}_{names[k]}_{kind}") for kind, i in (("normal", nrm), ("albedo", alb), ("rough", rgh), ("ao", ao))}
            lod_stats[names[k]] = {kind: {"size": s, "bytes": file_size(p)} for kind, p in paths.items()}
            # occlusion is already multiplied into the colour above: passing it again here applied it twice
            mats.append(image_material(f"{lod.name}{names[k].title()}Mat", alb[k], nrm[k], rgh[k], None))
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
