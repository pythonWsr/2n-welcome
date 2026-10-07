"""Software-render four-view source/web contact sheets without a GPU/X server."""

import importlib.util
import io
import json
import struct
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

spec = importlib.util.spec_from_file_location('petal_optimizer', Path(__file__).with_name('optimize-petals.py'))
opt = importlib.util.module_from_spec(spec)
spec.loader.exec_module(opt)


def source_texture(path):
    return opt.read_glb(path)[2]


def render(poly, texture, direction, center, span):
    points, triangles, uv, normals = opt.arrays(poly)
    side = np.asarray(direction, dtype=float)
    side /= np.linalg.norm(side)
    up = np.asarray((0, 1, 0) if abs(side[1]) < .9 else (0, 0, -1), dtype=float)
    right = np.cross(up, side)
    right /= np.linalg.norm(right)
    up = np.cross(side, right)
    xy = np.stack(((points - center) @ right, (points - center) @ up), axis=1)
    size = 240
    xy = np.rint(xy * (size * .82 / span) + size / 2).astype(int)
    depth = (points[triangles].mean(axis=1) @ side)
    tex = np.asarray(texture)
    coords = uv[triangles].mean(axis=1)
    xx = np.clip(np.rint(coords[:, 0] * (tex.shape[1] - 1)).astype(int), 0, tex.shape[1] - 1)
    yy = np.clip(np.rint((1 - coords[:, 1]) * (tex.shape[0] - 1)).astype(int), 0, tex.shape[0] - 1)
    color = tex[yy, xx].astype(float)
    face_normal = normals[triangles].mean(axis=1)
    lighting = np.clip(.82 + .18 * (face_normal @ side), .65, 1)
    color = np.clip(color * lighting[:, None], 0, 255).astype('uint8')
    canvas = Image.new('RGB', (size, size), (28, 34, 36))
    draw = ImageDraw.Draw(canvas)
    for index in np.argsort(depth):
        a, b, c = triangles[index]
        draw.polygon((tuple(xy[a]), tuple(xy[b]), tuple(xy[c])), fill=tuple(color[index]))
    return canvas


def main():
    master, web, output = map(Path, sys.argv[1:4])
    sheet = Image.new('RGB', (4 * 240, 12 * 270), (17, 23, 22))
    drawer = ImageDraw.Draw(sheet)
    for n, name in enumerate(opt.NAMES):
        a, b = master / f'{name}.glb', web / f'{name}.glb'
        source, result = opt.polygon(a), opt.polygon(b)
        positions = opt.arrays(source)[0]
        center = (positions.min(axis=0) + positions.max(axis=0)) / 2
        span = float(np.max(positions.max(axis=0) - positions.min(axis=0)))
        for row, (path, poly) in enumerate(((a, source), (b, result))):
            for column, (view, vector) in enumerate(opt.VIEWS.items()):
                image = render(poly, source_texture(path), vector, center, span)
                sheet.paste(image, (column * 240, (n * 2 + row) * 270))
                drawer.text((column * 240 + 8, (n * 2 + row) * 270 + 242),
                            f'{name} {"MASTER" if row == 0 else "WEB"} {view}', fill=(229, 230, 214))
        print(name, flush=True)
    sheet.save(output)


if __name__ == '__main__':
    main()
