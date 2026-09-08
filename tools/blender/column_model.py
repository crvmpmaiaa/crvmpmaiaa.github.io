"""A slim classical column, turned from a profile and fluted, for the statue to lean on.
make_column(height, shaft_r) returns a Blender object with its base at z=0, centred on the origin."""
import math
import bpy
import bmesh


def profile(height, r):
    """(radius, z) pairs from the bottom of the plinth to the top of the abacus. Attic base, tapering shaft
    with a little entasis, Doric echinus and a square abacus handled as a separate block."""
    plinth_h, torus_h, scotia_h = 0.035, 0.028, 0.02
    cap_h = 0.06
    shaft_bottom = plinth_h + torus_h + scotia_h + torus_h * 0.8
    shaft_top = height - cap_h
    pts = []
    pts.append((r * 1.55, 0.0)); pts.append((r * 1.55, plinth_h))                         # plinth
    pts.append((r * 1.36, plinth_h))
    for i in range(1, 9):                                                                   # lower torus
        a = math.pi * i / 8; pts.append((r * 1.24 + r * 0.16 * math.sin(a), plinth_h + torus_h * (1 - math.cos(a)) / 2))
    pts.append((r * 1.12, plinth_h + torus_h + scotia_h * 0.5))                             # scotia
    for i in range(1, 7):                                                                   # upper torus
        a = math.pi * i / 6; pts.append((r * 1.08 + r * 0.1 * math.sin(a), plinth_h + torus_h + scotia_h + torus_h * 0.8 * (1 - math.cos(a)) / 2))
    n = 14                                                                                  # shaft with entasis
    for i in range(n + 1):
        t = i / n
        rr = r * (1.0 - 0.14 * t) * (1.0 + 0.035 * math.sin(math.pi * t * 0.9))
        pts.append((rr, shaft_bottom + (shaft_top - shaft_bottom) * t))
    top_r = pts[-1][0]
    pts.append((top_r * 1.03, shaft_top + cap_h * 0.12))                                    # necking
    for i in range(1, 7):                                                                   # echinus, flaring out
        t = i / 6
        pts.append((top_r * (1.03 + 0.42 * t ** 0.7), shaft_top + cap_h * (0.12 + 0.62 * t)))
    return pts, shaft_bottom, shaft_top


def make_column(height=0.985, shaft_r=0.075, segs=96, flutes=20):
    pts, shaft_bottom, shaft_top = profile(height, shaft_r)
    bm = bmesh.new()
    rings = []
    for (rad, z) in pts:
        ring = []
        for i in range(segs):
            a = 2 * math.pi * i / segs
            rr = rad
            # flutes: shallow rounded grooves on the shaft only, fading out at the ends
            if shaft_bottom + 0.02 < z < shaft_top - 0.02:
                ph = (a * flutes / (2 * math.pi)) % 1.0
                groove = max(0.0, math.cos((ph - 0.5) * math.pi * 1.35))
                rr = rad - rad * 0.09 * groove
            ring.append(bm.verts.new((rr * math.cos(a), rr * math.sin(a), z)))
        rings.append(ring)
    for j in range(len(rings) - 1):
        for i in range(segs):
            bm.faces.new((rings[j][i], rings[j][(i + 1) % segs], rings[j + 1][(i + 1) % segs], rings[j + 1][i]))
    bm.faces.new(rings[0][::-1])
    bm.faces.new(rings[-1])
    me = bpy.data.meshes.new("Column"); bm.to_mesh(me); bm.free()
    col = bpy.data.objects.new("Column", me)
    bpy.context.scene.collection.objects.link(col)
    # abacus: a square block on the echinus
    top_r = pts[-1][0]
    ab_h = height - pts[-1][1]
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, pts[-1][1] + ab_h / 2))
    ab = bpy.context.active_object; ab.scale = (max(top_r * 2.05, 0.26), max(top_r * 2.05, 0.26), ab_h)  # wide enough to carry the arm
    bpy.ops.object.transform_apply(scale=True)
    bev = ab.modifiers.new("Bevel", "BEVEL"); bev.width = ab_h * 0.25; bev.segments = 3
    bpy.context.view_layer.objects.active = ab; bpy.ops.object.modifier_apply(modifier="Bevel")
    for o in (col, ab):
        bpy.context.view_layer.objects.active = o; o.select_set(True)
        bpy.ops.object.shade_smooth()
    bpy.ops.object.select_all(action="DESELECT")
    col.select_set(True); ab.select_set(True); bpy.context.view_layer.objects.active = col
    bpy.ops.object.join()
    col = bpy.context.active_object; col.name = "Column"
    sub = col.modifiers.new("Sub", "SUBSURF"); sub.levels = 1
    bpy.ops.object.modifier_apply(modifier="Sub")
    return col
