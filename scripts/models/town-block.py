"""
Build public/models/town-block.glb from the supplied shopfront model.

    pip install trimesh pyfqmr scipy numpy
    python3 scripts/models/town-block.py MyBuild.obj public/models/town-block.glb

The source is two shop buildings, Z up, about 130k faces, with no material
library. It is turned Y up and centred on its footprint with the ground at
y = 0, its materials merged into the few the scene treats differently (Glass,
Light, Sign, Fascia, and the walls by colour), parts smaller than 30 cm
dropped (nothing that small reads from a passing train) and the rest
decimated. The shop's own brand panels come out as plain "Fascia" in the
railway's cyan; nothing of the brand is kept.
"""
import collections
import os
import sys

import numpy as np
import pyfqmr
import trimesh

src, out = sys.argv[1], sys.argv[2]

V = []
F = collections.defaultdict(list)
cur = 'default'
with open(src) as fh:
    for line in fh:
        if line.startswith('v '):
            V.append([float(x) for x in line.split()[1:4]])
        elif line.startswith('usemtl'):
            cur = line.split(None, 1)[1].strip()
        elif line.startswith('f '):
            idx = [int(p.split('/')[0]) for p in line.split()[1:]]
            for i in range(1, len(idx) - 1):
                F[cur].append((idx[0] - 1, idx[i] - 1, idx[i + 1] - 1))
V = np.array(V)

# Z up to Y up; centred on the footprint, ground at 0.
Vy = np.stack([V[:, 0], V[:, 2], -V[:, 1]], 1)
Vy[:, 0] -= (Vy[:, 0].min() + Vy[:, 0].max()) / 2
Vy[:, 2] -= (Vy[:, 2].min() + Vy[:, 2].max()) / 2
Vy[:, 1] -= Vy[:, 1].min()

COLOUR = {
    'proxy_mat_grey': (0x8e, 0x93, 0x9a), 'proxy_mat_stone': (0xcf, 0xc6, 0xb5), 'Black_details': (0x1b, 0x1d, 0x22),
    'proxy_mat_Concret': (0xa9, 0xa5, 0x9d), 'Vereda': (0x9c, 0x9a, 0x94), 'proxy_mat_general_reflective': (0xc8, 0xcc, 0xd2),
    'Door': (0x3b, 0x2f, 0x2a), 'Wood': (0x8a, 0x5a, 0x36), 'proxy_mat_roof': (0x55, 0x58, 0x5e),
    'Light': (255, 226, 176), 'Glass': (43, 74, 99), 'Fascia': (0, 201, 241), 'Sign': (240, 240, 236),
}


def group(name):
    if name in ('LIGTH_2', 'Ligth', 'Luz_fondo_pisos_superiores', 'Luz_fondo_pisos_superiores_2'):
        return 'Light'
    if name in ('Glass', 'Vidrio_Pavonado'):
        return 'Glass'
    if name in ('Logo_Tambo', 'Tambo'):
        return 'Fascia'
    if name.lower().startswith('anuncio') or name.startswith('Cartel'):
        return 'Sign'
    if name == 'proxy_mat_grey.001':
        return 'proxy_mat_grey'
    return name


merged = {}
for name, faces in F.items():
    merged.setdefault(group(name), []).append(faces)

scene = trimesh.Scene()
for name, parts in merged.items():
    m = trimesh.Trimesh(Vy, np.concatenate(parts), process=True)
    m.remove_unreferenced_vertices()
    if len(m.faces) > 3000:
        keep = [p for p in m.split(only_watertight=False) if np.ptp(p.vertices, axis=0).max() > 0.3]
        m = trimesh.util.concatenate(keep)
    if len(m.faces) > 3000:
        s = pyfqmr.Simplify()
        s.setMesh(m.vertices, m.faces)
        s.simplify_mesh(target_count=max(1500, int(len(m.faces) * 0.15)), aggressiveness=7, preserve_border=False, verbose=False)
        v, f, _ = s.getMesh()
        m = trimesh.Trimesh(v, f, process=True)
    c = COLOUR.get(name, (200, 200, 200))
    shiny = name in ('Glass', 'proxy_mat_general_reflective')
    m.visual = trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(
        name=name, baseColorFactor=[c[0] / 255, c[1] / 255, c[2] / 255, 1.0],
        metallicFactor=0.8 if shiny else 0.05, roughnessFactor=0.15 if name == 'Glass' else 0.8, doubleSided=True))
    scene.add_geometry(m, node_name=name, geom_name=name)

scene.export(out)
print(out, os.path.getsize(out) // 1000, 'KB')
