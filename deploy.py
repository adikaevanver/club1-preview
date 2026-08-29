#!/usr/bin/env python3
"""
Выкладка сайта на хостинг reg.ru по FTPS.

    python3 deploy.py --dry-run    показать, что изменится
    python3 deploy.py              залить

Доступы — из окружения или из файла .env рядом со скриптом:

    CLUB1_FTP_HOST=31.31.196.16
    CLUB1_FTP_USER=u3603058
    CLUB1_FTP_PASS=...
    CLUB1_REMOTE=/www/club1.moscow
    CLUB1_DOCROOT=/var/www/u3603058/data/www/club1.moscow

Папка на сервере по-прежнему называется club1.moscow — это историческое имя.
Боевой домен с 28.08.2026 — metelitsaclub1.ru, он привязан к той же папке
как алиас, поэтому пути CLUB1_REMOTE/CLUB1_DOCROOT не меняются.

Почему FTPS, а не rsync: на шаред-хостинге reg.ru вход по SSH только по
паролю, а ставить sshpass ради одной задачи не хочется. ftplib встроен в
питон, TLS включается prot_p(). Когда на хостинг ляжет SSH-ключ, транспорт
можно заменить на rsync — остальная логика не изменится.

Скрипт зеркалит папку: заливает новое и изменившееся, удаляет на сервере то,
чего нет локально. Сравнение по размеру и времени правки.
"""
import argparse, hashlib, json, os, re, ssl, subprocess, sys
from datetime import datetime, timezone
from ftplib import FTP_TLS, error_perm

ROOT = os.path.dirname(os.path.abspath(__file__))

EXCLUDE_DIRS = {
    '.git', '.claude', '.playwright-cli', 'backups', 'sweeps',
    'node_modules', '__pycache__', '.idea', '.vscode',
}
# '.git' есть и в EXCLUDE_DIRS, и здесь: в обычном клоне это папка, а в
# git worktree — файл со строкой «gitdir: /Users/…/worktrees/<имя>». Фильтр
# каталогов такой файл не ловит, и он уезжал на боевой: на club1.moscow сейчас
# лежит .git с локальным путём чужого worktree. Пароль его прикрывает, но
# после открытия сайта это был бы наружу торчащий путь с машины.
EXCLUDE_FILES = {'.DS_Store', '.env', '.gitignore', '.git', 'deploy.py', 'deploy.sh',
                 'build-seo.py', '.deploy-state.json', 'README.md'}
# текстовое содержимое: правка может не изменить размер, поэтому при
# отсутствии известного хеша такие файлы заливаем не глядя
TEXT_EXT = ('.html', '.css', '.js', '.xml', '.txt', '.php', '.json', '.svg', '.htaccess')
EXCLUDE_PREFIX = ('sweep-',)

PREVIEW_URL = 'https://adikaevanver.github.io/club1-preview'
LIVE_URL = 'https://metelitsaclub1.ru'


def load_env():
    p = os.path.join(ROOT, '.env')
    if os.path.isfile(p):
        for line in open(p, encoding='utf-8'):
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())


def need(key):
    v = os.environ.get(key)
    if not v:
        sys.exit(f'не задан {key} — смотрите шапку deploy.py')
    return v


def local_files():
    """Отдаёт (относительный путь, содержимое) для всего, что уезжает на сервер."""
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames
                       if d not in EXCLUDE_DIRS and not d.startswith(EXCLUDE_PREFIX)]
        for fn in sorted(filenames):
            if fn in EXCLUDE_FILES:
                continue
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, ROOT).replace(os.sep, '/')
            yield rel, full


def transform(rel, data, docroot):
    """Правки, которые нужны только на боевом хосте."""
    if rel.endswith(('.html', '.xml', '.txt')):
        # canonical, og:url и JSON-LD в репозитории указывают на превью GitHub
        # Pages; sitemap.xml и robots.txt — тоже, иначе на боевом остались бы
        # чужие адреса и поисковик ушёл бы на превью
        data = data.replace(PREVIEW_URL.encode(), LIVE_URL.encode())
        # noindex превью (ставит build-seo.py) на боевой не едет: превью на
        # GitHub Pages — публичный дубль сайта, боевой — единственный оригинал
        if rel.endswith('.html'):
            data = b'\n'.join(l for l in data.split(b'\n') if b'data-preview-only' not in l)
        return data
    if rel == '.htaccess':
        out = []
        for line in data.decode('utf-8').split('\n'):
            if line.startswith('AuthUserFile '):
                line = f'AuthUserFile {docroot}/.htpasswd'
            out.append(line)
        return '\n'.join(out).encode('utf-8')
    return data


STATE_FILE = os.path.join(ROOT, '.deploy-state.json')


def load_state():
    """Хеши файлов, залитых прошлым деплоем. Нет файла — считаем по размеру."""
    try:
        with open(STATE_FILE, encoding='utf-8') as fh:
            return json.load(fh)
    except Exception:
        return {}


def save_state(state):
    with open(STATE_FILE, 'w', encoding='utf-8') as fh:
        json.dump(state, fh, indent=0, sort_keys=True)


def remote_tree(ftp, base):
    """Плоский список файлов на сервере: путь → размер."""
    found = {}

    def walk(path):
        entries = []
        try:
            ftp.retrlines(f'LIST {path}', entries.append)
        except error_perm:
            return
        for ln in entries:
            parts = ln.split(maxsplit=8)
            if len(parts) < 9:
                continue
            name = parts[8]
            if name in ('.', '..') or ' -> ' in name:
                continue
            full = f'{path}/{name}'
            if ln.startswith('d'):
                walk(full)
            else:
                found[full[len(base) + 1:]] = int(parts[4])

    walk(base)
    return found


def ensure_dirs(ftp, base, rel, made):
    parts = rel.split('/')[:-1]
    cur = base
    for p in parts:
        cur = f'{cur}/{p}'
        if cur in made:
            continue
        try:
            ftp.mkd(cur)
        except error_perm as e:
            if not str(e).startswith('550'):
                raise
        made.add(cur)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--yes', action='store_true',
                    help='не спрашивать подтверждение на удаление лишнего с сервера')
    ap.add_argument('--skip-seo', action='store_true',
                    help='не пересобирать sitemap.xml и JSON-LD перед заливкой')
    args = ap.parse_args()

    # sitemap и структурированные данные собираются из assets/data/events.js;
    # делаем это перед каждой заливкой, иначе разметка отстанет от афиши
    if not args.skip_seo:
        print('пересборка sitemap.xml и JSON-LD…')
        r = subprocess.run([sys.executable, os.path.join(ROOT, 'build-seo.py')])
        if r.returncode:
            sys.exit('build-seo.py упал — заливку не начинаю')
        print()

    load_env()
    host, user, pw = need('CLUB1_FTP_HOST'), need('CLUB1_FTP_USER'), need('CLUB1_FTP_PASS')
    base = os.environ.get('CLUB1_REMOTE', '/www/club1.moscow').rstrip('/')
    docroot = os.environ.get('CLUB1_DOCROOT', '/var/www/u3603058/data' + base).rstrip('/')

    # .htpasswd нужен, только пока сайт закрыт. После публикации блок
    # пароля из .htaccess удаляют — и без этой проверки деплой падал бы
    # с требованием пароля на уже открытом сайте.
    with open(os.path.join(ROOT, '.htaccess'), encoding='utf-8') as fh:
        password_on = 'Require valid-user' in fh.read()
    if password_on and not os.path.isfile(os.path.join(ROOT, '.htpasswd')):
        sys.exit('нет .htpasswd — сайт уехал бы без пароля.\n'
                 "создайте: htpasswd -nbB club1 '<пароль>' > .htpasswd")

    # Сертификат FTPS reg.ru выписан не на тот адрес, по которому мы
    # подключаемся (ходим по IP), поэтому проверка по умолчанию снята —
    # иначе выкладка просто не соединится. Кому нужна строгая проверка:
    # CLUB1_FTP_VERIFY=1 в окружении.
    ctx = ssl.create_default_context()
    if os.environ.get('CLUB1_FTP_VERIFY') != '1':
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
    ftp = FTP_TLS(context=ctx)
    ftp.connect(host, 21, timeout=60)
    ftp.login(user, pw)
    ftp.prot_p()

    remote = remote_tree(ftp, base)
    made, sent, skipped, removed = set(), 0, 0, 0

    # FTP не отдаёт хеш, только размер, а правка той же длины («590» → «690»,
    # исправленная дата, опечатка) размера не меняет — такие правки молча
    # оставались на боевом старыми. Поэтому держим свой список хешей того,
    # что реально залито; размер остаётся запасным признаком для файлов,
    # которых в списке ещё нет.
    state = load_state()
    new_state = {}

    for rel, full in local_files():
        data = transform(rel, open(full, 'rb').read(), docroot)
        digest = hashlib.sha256(data).hexdigest()
        new_state[rel] = digest

        known = state.get(rel)
        if known:
            same = known == digest
        elif rel.endswith(TEXT_EXT):
            same = False          # хеша нет и правка могла не менять размер
        else:
            same = remote.get(rel) == len(data)   # картинки: размера довольно
        if same and rel in remote:
            skipped += 1
            remote.pop(rel, None)
            continue

        print(('  [dry] ' if args.dry_run else '  → ') + rel)
        if not args.dry_run:
            ensure_dirs(ftp, base, rel, made)
            import io
            ftp.storbinary(f'STOR {base}/{rel}', io.BytesIO(data))
        sent += 1
        remote.pop(rel, None)

    # Зеркалирование удаляет с боевого всё, чего нет в локальной папке.
    # Под нож попадают файлы, которых у нас и не должно быть: подтверждение
    # прав в Вебмастере и Search Console, служебные каталоги хостинга,
    # загруженный менеджером PDF. Их держим в белом списке, а на остальное
    # спрашиваем подтверждение — молча сносить чужое нельзя.
    keep = [re.compile(p) for p in (
        r'^yandex_[0-9a-f]+\.html$',
        r'^google[0-9a-f]+\.html$',
        r'^mailru-verification[0-9a-f]+\.html$',
        r'^\.well-known/',
        r'^cgi-bin/',
        r'^robots\.txt\.bak$',
    )]
    doomed = [rel for rel in sorted(remote)
              if not any(p.search(rel) for p in keep)]
    spared = [rel for rel in sorted(remote) if rel not in doomed]
    for rel in spared:
        print('  = оставляю на сервере (белый список):', rel)

    if doomed and not args.dry_run and not args.yes:
        print('\nна сервере есть файлы, которых нет локально:')
        for rel in doomed:
            print('   ×', rel)
        if input(f'удалить {len(doomed)} шт.? [y/N] ').strip().lower() not in ('y', 'yes', 'д'):
            print('  удаление пропущено')
            doomed = []

    for rel in doomed:
        print(('  [dry] удалить ' if args.dry_run else '  × ') + rel)
        if not args.dry_run:
            try:
                ftp.delete(f'{base}/{rel}')
            except error_perm as e:
                print('    не удалилось:', e)
        removed += 1

    ftp.quit()
    if not args.dry_run:
        save_state(new_state)
    print(f'\nзалито {sent} · без изменений {skipped} · удалено {removed}')
    if args.dry_run:
        print('(dry-run: на сервере ничего не менялось)')
    else:
        print(LIVE_URL)


if __name__ == '__main__':
    main()
