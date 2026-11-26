#!/usr/bin/env python3
"""Ставит пакет сайта шоу «О чём молчат женщины» (сборка Кузнецова) в КОРЕНЬ сайта.

С 23.11.2026 мюзикл — главная metelitsaclub1.ru (решение команды шоу). Пакет Саши
собран под адрес /molchat/; скрипт кладёт его файлы в корень репозитория и
переписывает адреса /molchat/ → /. Страницы клуба с теми же именами (главная,
афиша, «Еда», 404, оферта, политика, возврат) заменяются страницами пакета;
остальные страницы клуба не трогаются.

    python3 tools/molchat_to_root.py <пакет.zip | папка molchat>

Не копируются: .htaccess (корневой свой — в нём 301 /molchat/* → /*),
robots.txt (свой корневой) и sitemap.xml (его собирает build-seo.py).
Список поставленных файлов — molchat-root-files.txt: при следующем пакете
скрипт удаляет файлы, которые были в прошлом пакете и пропали из нового.

    python3 tools/molchat_to_root.py --overlay <обновление.zip | папка molchat>

--overlay — частичное обновление («залить поверх, ничего не удалять», как 26.11):
файлы пакета кладутся поверх, ничего не удаляется, список дополняется.
"""
import os, sys, shutil, tempfile, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, 'molchat-root-files.txt')
SKIP = {'.htaccess', 'robots.txt', 'sitemap.xml'}
TEXT = ('.html', '.js', '.css', '.xml', '.php', '.txt', '.svg', '.json', '.webmanifest')


def rewrite(data: str) -> str:
    data = data.replace('https://metelitsaclub1.ru/molchat/', 'https://metelitsaclub1.ru/')
    data = data.replace('/molchat/', '/')
    # события мюзикла в общей афише ведут на страницу афиши шоу, а не на снятый /molchat
    data = data.replace("page:'molchat'", "page:'afisha'").replace("page:'molchat/'", "page:'afisha'")
    data = data.replace("href:'molchat', buy:'molchat#dates'", "href:'afisha', buy:'afisha#dates'")
    data = data.replace("window.CLUB1_FOLD = ['molchat'];", "window.CLUB1_FOLD = ['afisha'];")
    return data


def main(src, overlay=False):
    tmp = None
    if src.endswith('.zip'):
        tmp = tempfile.mkdtemp(prefix='molchat-pkg-')
        with zipfile.ZipFile(src) as z:
            for n in z.namelist():
                if n.startswith('/') or '..' in n.split('/'):
                    raise SystemExit(f'опасный путь в архиве: {n}')
            z.extractall(tmp)
        src = os.path.join(tmp, 'molchat')
    if not os.path.isfile(os.path.join(src, 'index.html')):
        raise SystemExit(f'в {src} нет index.html — это не пакет сайта шоу')

    new = []
    for dirpath, _, files in os.walk(src):
        for fn in files:
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, src).replace(os.sep, '/')
            if rel in SKIP or fn == '.DS_Store':
                continue
            dst = os.path.join(ROOT, rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            if fn.lower().endswith(TEXT):
                with open(full, encoding='utf-8') as fh:
                    data = rewrite(fh.read())
                with open(dst, 'w', encoding='utf-8') as fh:
                    fh.write(data)
            else:
                shutil.copyfile(full, dst)
            new.append(rel)

    # наши правки поверх пакета — в конец его site.css (позже по каскаду = главнее)
    fixes = os.path.join(ROOT, 'tools', 'molchat-fixes.css')
    css = os.path.join(ROOT, 'site.css')
    if os.path.exists(fixes) and os.path.exists(css):
        with open(fixes, encoding='utf-8') as fh:
            add = fh.read()
        with open(css, encoding='utf-8') as fh:
            cur = fh.read()
        if add.strip() not in cur:
            with open(css, 'a', encoding='utf-8') as fh:
                fh.write(add)

    old = []
    if os.path.exists(MANIFEST):
        old = [l.strip() for l in open(MANIFEST, encoding='utf-8') if l.strip()]
    gone = [] if overlay else sorted(set(old) - set(new))
    if overlay:
        new = sorted(set(old) | set(new))
    for rel in gone:
        p = os.path.join(ROOT, rel)
        if os.path.exists(p):
            os.remove(p)
    with open(MANIFEST, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(sorted(new)) + '\n')
    if tmp:
        shutil.rmtree(tmp)
    print(f'поставлено файлов: {len(new)} · удалено пропавших из пакета: {len(gone)}')
    for rel in gone:
        print('  − ' + rel)


if __name__ == '__main__':
    args = sys.argv[1:]
    overlay = '--overlay' in args
    args = [a for a in args if a != '--overlay']
    if len(args) != 1:
        raise SystemExit(__doc__)
    main(args[0], overlay)
