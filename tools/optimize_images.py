#!/usr/bin/env python3
"""Пережимает тяжёлые JPG сайта шоу (26.11.2026: «сайт долго грузится» у Кузнецова).

Замер 26.11: главная на телефоне по медленному 4G — 4,5 МБ, из них 3 МБ фотографии;
68 JPG тяжелее 150 КБ (16,7 МБ). Скрипт берёт JPG больше LIMIT, уменьшает длинную
сторону до MAX_SIDE и сохраняет с качеством QUALITY (прогрессивный JPEG). Файл
заменяется, только если стал легче хотя бы на 15 %; размеры в пикселях меньше
MAX_SIDE не трогаются, пропорции сохраняются.

    python3 tools/optimize_images.py [папка …]     # по умолчанию img/ и assets/

molchat_to_root.py зовёт его после установки пакета, поэтому новые пакеты Кузнецова
пережимаются сами.
"""
import os, sys
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIMIT = 150 * 1024
MAX_SIDE = 1600
QUALITY = 76


def optimize(path):
    old = os.path.getsize(path)
    if old <= LIMIT:
        return None
    with Image.open(path) as im:
        im = ImageOps.exif_transpose(im)
        if im.mode not in ('RGB', 'L'):
            im = im.convert('RGB')
        w, h = im.size
        if max(w, h) > MAX_SIDE:
            k = MAX_SIDE / max(w, h)
            im = im.resize((round(w * k), round(h * k)), Image.LANCZOS)
        tmp = path + '.tmp'
        im.save(tmp, 'JPEG', quality=QUALITY, optimize=True, progressive=True)
    new = os.path.getsize(tmp)
    if new < old * 0.85:
        os.replace(tmp, path)
        return old, new
    os.remove(tmp)
    return None


def main(dirs):
    saved = 0; n = 0
    for d in dirs:
        for dp, _, files in os.walk(os.path.join(ROOT, d)):
            rel = os.path.relpath(dp, ROOT)
            if any(part.startswith('.') for part in rel.split(os.sep)):
                continue
            for fn in files:
                if fn.lower().endswith(('.jpg', '.jpeg')):
                    r = optimize(os.path.join(dp, fn))
                    if r:
                        n += 1; saved += r[0] - r[1]
    print(f'пережато JPG: {n} · сэкономлено {saved / 1048576:.1f} МБ')


if __name__ == '__main__':
    main(sys.argv[1:] or ['img', 'assets'])
