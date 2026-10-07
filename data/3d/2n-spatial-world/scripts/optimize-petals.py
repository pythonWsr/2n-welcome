"""Build independent, visually checked runtime copies of the six existing GLBs.

Usage: python3 scripts/optimize-petals.py SOURCE_DIRECTORY OUTPUT_DIRECTORY
Requires the local VTK, NumPy and Pillow environment. Never writes to SOURCE_DIRECTORY.
"""

import hashlib
import io
import json
import struct
import sys
from pathlib import Path

import numpy as np
import vtk
from PIL import Image, ImageDraw
from vtk.util.numpy_support import vtk_to_numpy


NAMES = ('glass', 'leaf', 'rose', 'clover', 'rock', 'goldenleaf')
# Preserve more of the angular outlines; each candidate is also checked in four views.
REDUCTION = {'glass': .80, 'leaf': .82, 'rose': .83,
             'clover': .80, 'rock': .83, 'goldenleaf': .81}
VIEWS = {
    'front': (0, 0, 1), 'three-quarter': (1, .45, 1),
    'side': (1, 0, 0), 'top': (0, 1, 0),
}
vtk.vtkObject.GlobalWarningDisplayOff()


def read_glb(path):
    data = path.read_bytes()
    assert data[:4] == b'glTF' and struct.unpack_from('<I', data, 8)[0] == len(data)
    length = struct.unpack_from('<I', data, 12)[0]
    descriptor = json.loads(data[20:20 + length])
    binary_offset = 20 + length + 8
    image = descriptor['images'][0]
    view = descriptor['bufferViews'][image['bufferView']]
    start = binary_offset + view.get('byteOffset', 0)
    color = Image.open(io.BytesIO(data[start:start + view['byteLength']])).convert('RGB')
    return data, descriptor, color


def polygon(path):
    reader = vtk.vtkGLTFReader()
    reader.SetFileName(str(path))
    reader.Update()
    block = reader.GetOutput()
    while block.IsA('vtkMultiBlockDataSet'):
        assert block.GetNumberOfBlocks() == 1
        block = block.GetBlock(0)
    assert block.IsA('vtkPolyData') and block.GetNumberOfPolys() > 0
    return block


def arrays(poly):
    positions = vtk_to_numpy(poly.GetPoints().GetData()).astype(np.float32)
    index = vtk_to_numpy(poly.GetPolys().GetData()).reshape(-1, 4)[:, 1:].astype(np.uint32)
    uv = vtk_to_numpy(poly.GetPointData().GetArray('TEXCOORD_0')).astype(np.float32)
    normals = vtk_to_numpy(poly.GetPointData().GetArray('NORMAL')).astype(np.float32)
    return positions, index, uv, normals


def mask(positions, faces, direction, center, span, size=256):
    forward = np.asarray(direction, dtype=np.float32)
    forward /= np.linalg.norm(forward)
    up = np.asarray((0, 1, 0) if abs(forward[1]) < .9 else (0, 0, -1), dtype=np.float32)
    right = np.cross(up, forward)
    right /= np.linalg.norm(right)
    up = np.cross(forward, right)
    xy = np.stack(((positions-center) @ right, (positions-center) @ up), axis=1)
    xy = xy * (size * .84 / span) + size / 2
    xy = np.rint(xy).astype(np.int32)
    image = Image.new('L', (size, size))
    drawing = ImageDraw.Draw(image)
    for a, b, c in faces:
        drawing.polygon((tuple(xy[a]), tuple(xy[b]), tuple(xy[c])), fill=255)
    return image


def compare(original, candidate):
    source = arrays(original)
    result = (vtk_to_numpy(candidate.GetPoints().GetData()).astype(np.float32),
              vtk_to_numpy(candidate.GetPolys().GetData()).reshape(-1, 4)[:, 1:])
    center = (source[0].max(axis=0) + source[0].min(axis=0)) / 2
    span = float(np.max(source[0].max(axis=0) - source[0].min(axis=0)))
    score = {}
    for name, vector in VIEWS.items():
        a = np.asarray(mask(source[0], source[1], vector, center, span)) > 0
        b = np.asarray(mask(result[0], result[1], vector, center, span)) > 0
        score[name] = round(float(np.logical_and(a, b).sum() / max(1, np.logical_or(a, b).sum())), 4)
    return score


def pack_glb(positions, faces, uv, normals, color, texture_size=768, lossless=False):
    payload = bytearray()
    views = []

    def append(chunk, target=None):
        while len(payload) % 4:
            payload.append(0)
        entry = {'buffer': 0, 'byteOffset': len(payload), 'byteLength': len(chunk)}
        if target:
            entry['target'] = target
        views.append(entry)
        payload.extend(chunk)
        return len(views) - 1

    indices = faces.reshape(-1).astype('<u4')
    indices_view = append(indices.tobytes(), 34963)
    position_view = append(positions.astype('<f4').tobytes(), 34962)
    normal_view = append(normals.astype('<f4').tobytes(), 34962)
    uv_view = append(uv.astype('<f4').tobytes(), 34962)
    output = io.BytesIO()
    color.thumbnail((texture_size, texture_size), Image.Resampling.LANCZOS)
    if lossless:
        color.save(output, format='PNG', optimize=True)
    else:
        color.save(output, format='JPEG', quality=91, subsampling=0)
    image_view = append(output.getvalue())
    accessors = [
        {'bufferView': indices_view, 'componentType': 5125, 'count': len(indices), 'type': 'SCALAR'},
        {'bufferView': position_view, 'componentType': 5126, 'count': len(positions), 'type': 'VEC3',
         'min': positions.min(axis=0).tolist(), 'max': positions.max(axis=0).tolist()},
        {'bufferView': normal_view, 'componentType': 5126, 'count': len(normals), 'type': 'VEC3'},
        {'bufferView': uv_view, 'componentType': 5126, 'count': len(uv), 'type': 'VEC2'},
    ]
    scene = {
        'asset': {'version': '2.0', 'generator': '2n Garden Web optimizer'},
        'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'mesh': 0}],
        'meshes': [{'primitives': [{'attributes': {'POSITION': 1, 'NORMAL': 2, 'TEXCOORD_0': 3},
                                   'indices': 0, 'material': 0}]}],
        'materials': [{'pbrMetallicRoughness': {'baseColorTexture': {'index': 0},
                                                'metallicFactor': 0, 'roughnessFactor': .9}}],
        'textures': [{'source': 0}], 'images': [{'bufferView': image_view, 'mimeType': 'image/png' if lossless else 'image/jpeg'}],
        'buffers': [{'byteLength': len(payload)}], 'bufferViews': views, 'accessors': accessors,
    }
    while len(payload) % 4:
        payload.append(0)
    js = json.dumps(scene, separators=(',', ':')).encode('utf-8')
    js += b' ' * (-len(js) % 4)
    header = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(payload))
    return header + struct.pack('<I4s', len(js), b'JSON') + js + struct.pack('<I4s', len(payload), b'BIN\0') + payload


def optimize(source, destination, name):
    raw, metadata, image = read_glb(source)
    master = polygon(source)
    original_faces = master.GetNumberOfPolys()
    # GLBs use ~0.1 unit geometry; normalize before texture-aware quadrics to
    # avoid singular attribute matrices, then restore the exact source scale.
    magnify = vtk.vtkTransform()
    magnify.Scale(25, 25, 25)
    normalized = vtk.vtkTransformPolyDataFilter()
    normalized.SetTransform(magnify)
    normalized.SetInputData(master)
    normalized.Update()
    best = None
    for reduction in (REDUCTION[name], .72, .62):
        decimator = vtk.vtkQuadricDecimation()
        decimator.SetInputConnection(normalized.GetOutputPort())
        decimator.SetTargetReduction(reduction)
        decimator.AttributeErrorMetricOn()
        decimator.TCoordsAttributeOn()
        decimator.NormalsAttributeOff()
        decimator.SetTCoordsWeight(.05)
        decimator.Update()
        restore = vtk.vtkTransform()
        restore.Scale(.04, .04, .04)
        scaled = vtk.vtkTransformPolyDataFilter()
        scaled.SetTransform(restore)
        scaled.SetInputConnection(decimator.GetOutputPort())
        scaled.Update()
        candidate = vtk.vtkPolyData()
        candidate.DeepCopy(scaled.GetOutput())
        scores = compare(master, candidate)
        best = candidate, reduction, scores
        if min(scores.values()) >= .94:
            break
    candidate, reduction, scores = best
    if min(scores.values()) < .94:
        raise RuntimeError(f'{name}: four-view outline lost: {scores}')
    positions, faces, uv, normals = arrays(candidate)
    destination.parent.mkdir(parents=True, exist_ok=True)
    binary = pack_glb(positions, faces, uv, normals, image)
    destination.write_bytes(binary)
    return {'name': name, 'source_sha256': hashlib.sha256(raw).hexdigest(),
            'source_bytes': len(raw), 'source_triangles': original_faces,
            'web_bytes': len(binary), 'web_triangles': len(faces),
            'web_vertices': len(positions), 'reduction': reduction, 'silhouette_iou': scores}


def main():
    source, destination = map(Path, sys.argv[1:3])
    assert source.resolve() != destination.resolve()
    report = [optimize(source / f'{name}.glb', destination / f'{name}.glb', name) for name in NAMES]
    (destination / 'web-asset-report.json').write_text(json.dumps(report, indent=2) + '\n')
    for item in report:
        print(f"{item['name']}: {item['source_triangles']} → {item['web_triangles']} triangles; "
              f"{item['source_bytes']} → {item['web_bytes']} bytes; four views {item['silhouette_iou']}", flush=True)


if __name__ == '__main__':
    main()
