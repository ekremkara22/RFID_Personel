"""Read binary STL geometry without CAD dependencies. Coordinates in mm."""
from pathlib import Path
import json
import hashlib
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent

def load(path):
    data = path.read_bytes()
    dtype = np.dtype([('normal', '<f4', (3,)), ('vertices', '<f4', (3, 3)), ('attr', '<u2')])
    count = int.from_bytes(data[80:84], 'little')
    assert len(data) == 84 + 50 * count
    return np.frombuffer(data, dtype=dtype, offset=84)['vertices'].astype(float)

def section(tris, z):
    edges = []
    for tri in tris:
        hits = []
        for i in range(3):
            a, b = tri[i], tri[(i + 1) % 3]
            if (a[2] < z < b[2]) or (b[2] < z < a[2]):
                p = a + (b-a) * (z-a[2])/(b[2]-a[2])
                hits.append(tuple(np.round(p[:2], 4)))
        if len(hits) == 2:
            edges.append(hits)
    return edges

def loops(edges):
    graph = {}
    for a, b in edges:
        graph.setdefault(a, set()).add(b)
        graph.setdefault(b, set()).add(a)
    result = []
    while graph:
        seed = next(iter(graph))
        stack, pts = [seed], []
        while stack:
            p = stack.pop()
            if p not in graph:
                continue
            pts.append(p)
            stack.extend(graph.pop(p))
        p = np.array(pts)
        lo, hi = p.min(0), p.max(0)
        result.append({'center': ((lo+hi)/2).round(4).tolist(), 'size': (hi-lo).round(4).tolist(), 'points':len(pts)})
    return sorted(result, key=lambda x:(x['center'][0],x['center'][1],x['size'][0]))

def inspect():
    results = {}
    for path in (ROOT/'output/enclosure_v4').glob('*.stl'):
        tris = load(path)
        lo = tris.reshape(-1,3).min(0)
        hi = tris.reshape(-1,3).max(0)
        tris -= lo
        heights = [5,9.5,11,24,40] if hi[2] > 20 else [2.5,4.5,6.25,8.25]
        results[path.name] = {'sha256':hashlib.sha256(path.read_bytes()).hexdigest(), 'original_min':lo.tolist(), 'size':(hi-lo).tolist(), 'slices':{str(z):loops(section(tris,z)) for z in heights}}
    (OUT/'v4_geometry.json').write_text(json.dumps(results,indent=2,ensure_ascii=False),encoding='utf-8')
    print(json.dumps(results,indent=2,ensure_ascii=True))

if __name__ == '__main__':
    inspect()
