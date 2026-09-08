"""Cross-sections of the bare statue: for each 5cm band, the x extents of the separate lumps (edge connected),
to find where the club and lion skin part from the leg. Run: tools/blender/run.sh 09_slices.py"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import bpy, bmesh
from common import *
name = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "statue-nude"
bpy.ops.wm.open_mainfile(filepath=os.path.join(CLEAN, name + ".blend"))
obj = bpy.data.objects["Statue"]
bm = bmesh.new(); bm.from_mesh(obj.data); bm.verts.ensure_lookup_table()
n = len(bm.verts)
import collections
step = 0.05
bands = collections.defaultdict(list)
for v in bm.verts:
    bands[int(v.co.z // step)].append(v)
for b in sorted(bands):
    verts = bands[b]
    idx = {v.index: i for i, v in enumerate(verts)}
    parent = list(range(len(verts)))
    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]; a = parent[a]
        return a
    for v in verts:
        for e in v.link_edges:
            o = e.other_vert(v)
            if o.index in idx:
                ra, rb = find(idx[v.index]), find(idx[o.index])
                if ra != rb: parent[ra] = rb
    groups = collections.defaultdict(list)
    for v in verts: groups[find(idx[v.index])].append(v)
    lumps = sorted([g for g in groups.values() if len(g) > 60], key=lambda g: min(v.co.x for v in g))
    desc = " | ".join(f"x[{min(v.co.x for v in g):.2f},{max(v.co.x for v in g):.2f}] y[{min(v.co.y for v in g):.2f},{max(v.co.y for v in g):.2f}] n{len(g)}" for g in lumps)
    print(f"z {b*step:.2f}: {desc}")
