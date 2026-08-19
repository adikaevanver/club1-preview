#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Пересобирает sitemap.xml и структурированные данные (JSON-LD).

Запускается автоматически из deploy.py перед заливкой, поэтому разметка не
разъезжается с данными: правишь assets/data/events.js — карточки событий в
выдаче едут следом.

Что делает:
  1. sitemap.xml — все страницы сайта чистыми адресами (без .html), lastmod
     берётся из git.
  2. JSON-LD «организация» на главной: адрес, телефон, координаты, соцсети.
  3. JSON-LD «события» на главной, в афише и на страницах событий —
     собирается из CLUB1_EVENTS, только будущие даты.

Блоки помечены data-seo, повторный запуск их заменяет, а не плодит.
Данных, которых у нас нет, не выдумываем: без подтверждённой цены блок
offers не пишется, длительность (endDate) не указывается, часы работы у
организации не проставлены — клуб работает по афише.
"""
import json, os, re, glob, subprocess, sys, datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
BASE = 'https://adikaevanver.github.io/club1-preview'   # deploy.py заменит на club1.moscow

PLACE = {
    '@type': 'Place',
    'name': 'Клуб №1',
    'address': {
        '@type': 'PostalAddress',
        'streetAddress': 'Новый Арбат, 21',
        'addressLocality': 'Москва',
        'addressCountry': 'RU',
    },
    # координаты сняты с карты на странице «О клубе»
    'geo': {'@type': 'GeoCoordinates', 'latitude': 55.751916, 'longitude': 37.585132},
}

ORG = {
    '@context': 'https://schema.org',
    '@type': 'ComedyClub',
    'name': 'Клуб №1',
    'alternateName': 'CLUB 1',
    'url': BASE + '/',
    'logo': BASE + '/assets/logo-white.svg',
    'image': BASE + '/assets/venue/audience.jpg',
    'description': 'Стендап-клуб на Новом Арбате, 21. Сольные концерты, сборные '
                   'вечера и проверки материала от опытных комиков.',
    'telephone': '+74996869111',
    'email': 'Club1promo@yandex.ru',
    'address': PLACE['address'],
    'geo': PLACE['geo'],
    'sameAs': ['https://vk.ru/standupclubnaarbate', 'https://t.me/club1standup'],
}


def events():
    """Читает assets/data/events.js через node — единственный источник афиши."""
    out = subprocess.run(
        ['node', '-e',
         'global.window={};require(process.argv[1]);'
         'process.stdout.write(JSON.stringify(window.CLUB1_EVENTS||[]))',
         os.path.join(ROOT, 'assets/data/events.js')],
        capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def event_ld(ev):
    name = ev['title']
    if ev.get('format') == 'solniki':
        name += '. Сольный стендап-концерт'

    ld = {
        '@context': 'https://schema.org',
        '@type': 'ComedyEvent',
        'name': name,
        'startDate': f"{ev['date']}T{ev['time']}:00+03:00" if ev.get('time') else ev['date'],
        'eventStatus': 'https://schema.org/EventScheduled',
        'eventAttendanceMode': 'https://schema.org/OfflineEventAttendanceMode',
        'location': PLACE,
        'image': [BASE + '/' + (ev.get('poster') or 'assets/venue/audience.jpg')],
        'organizer': {'@type': 'Organization', 'name': 'Клуб №1', 'url': BASE + '/'},
    }
    if ev.get('page'):
        ld['url'] = f"{BASE}/{ev['page']}"
    elif ev.get('buy'):
        ld['url'] = ev['buy']

    # сольник — на сцене конкретный человек; у сборных форматов состав
    # меняется от даты к дате, выдавать его за постоянный нельзя
    if ev.get('format') == 'solniki':
        ld['performer'] = {'@type': 'Person', 'name': ev['title']}

    # offers пишем только с подтверждённой ценой: Offer без price — невалидная
    # разметка, а придумывать цену нельзя
    if ev.get('priceFrom') and ev.get('buy'):
        ld['offers'] = {
            '@type': 'AggregateOffer',
            'lowPrice': ev['priceFrom'],
            'priceCurrency': 'RUB',
            'url': ev['buy'],
            'availability': 'https://schema.org/InStock',
        }
    return ld


def inject(path, marker, payload):
    """Ставит (или заменяет) блок JSON-LD перед </head>."""
    with open(path, encoding='utf-8') as fh:
        s = fh.read()
    block = (f'<script type="application/ld+json" data-seo="{marker}">\n'
             + json.dumps(payload, ensure_ascii=False, indent=1)
             + '\n</script>\n')
    pat = re.compile(r'<script type="application/ld\+json" data-seo="'
                     + re.escape(marker) + r'">.*?</script>\n', re.S)
    s2 = pat.sub(block, s) if pat.search(s) else s.replace('</head>', block + '</head>', 1)
    if s2 != s:
        with open(path, 'w', encoding='utf-8') as fh:
            fh.write(s2)
        return True
    return False



MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
              'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']


def esc(v):
    return (str(v).replace('&', '&amp;').replace('<', '&lt;')
            .replace('>', '&gt;').replace('"', '&quot;'))


def inject_fallback(path, evs):
    """Текстовая афиша в <noscript> — чтобы страница не была пустой без JS.

    Список событий рисует afisha.js уже в браузере, поэтому в исходном
    HTML страницы афиши не было ни одного мероприятия: краулеру, который
    не исполняет скрипты, доставалась единственная фраза «По выбранным
    фильтрам событий нет». Здесь тот же список лежит текстом. Видимую
    вёрстку блок не трогает — он внутри noscript.
    """
    rows = []
    for e in evs[:40]:
        d = datetime.date.fromisoformat(e['date'])
        when = f"{d.day} {MONTHS_GEN[d.month - 1]}"
        if e.get('time'):
            when += f", {e['time']}"
        href = e.get('page') or 'afisha'
        price = f" — от {e['priceFrom']} \u20bd" if e.get('priceFrom') else ''
        rows.append(f'    <li>{when} — <a href="{esc(href)}">{esc(e["title"])}</a>{price}</li>')
    block = ('<noscript data-seo="afisha-fallback">\n'
             '  <h2>Ближайшие мероприятия</h2>\n  <ul>\n'
             + '\n'.join(rows)
             + '\n  </ul>\n</noscript>\n')
    with open(path, encoding='utf-8') as fh:
        s = fh.read()
    pat = re.compile(r'<noscript data-seo="afisha-fallback">.*?</noscript>\n', re.S)
    if pat.search(s):
        s2 = pat.sub(block, s)
    elif '</main>' in s:
        s2 = s.replace('</main>', block + '</main>', 1)
    else:
        return False
    if s2 == s:
        return False
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(s2)
    return True


def lastmod(f):
    try:
        r = subprocess.run(['git', 'log', '-1', '--format=%cs', '--', f],
                           cwd=ROOT, capture_output=True, text=True)
        return r.stdout.strip() or datetime.date.today().isoformat()
    except Exception:
        return datetime.date.today().isoformat()


def indexable(f):
    """Страница с noindex в карте сайта — противоречивое указание.

    Вебмастер и Search Console выписывают за это предупреждение: карта
    зовёт робота на страницу, а страница просит её не индексировать.
    Так в карту попадала komiki — она закрыта до единого стиля фото.
    Служебная 404 в карте тоже не нужна.
    """
    if f == '404.html':
        return False
    try:
        with open(os.path.join(ROOT, f), encoding='utf-8') as fh:
            head = fh.read(4000)
    except OSError:
        return True
    return 'noindex' not in head


def build_sitemap(pages):
    pages = [f for f in pages if indexable(f)]
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for f in pages:
        slug = '' if f == 'index.html' else f[:-5]
        lines.append('  <url>')
        lines.append(f'    <loc>{BASE}/{slug}</loc>')
        lines.append(f'    <lastmod>{lastmod(f)}</lastmod>')
        lines.append('  </url>')
    lines.append('</urlset>')
    with open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(lines) + '\n')
    return len(pages)


def main():
    today = datetime.date.today().isoformat()
    evs = [e for e in events() if e['date'] >= today]
    evs.sort(key=lambda e: (e['date'], e.get('time') or '23:00'))

    pages = sorted(os.path.basename(p) for p in glob.glob(os.path.join(ROOT, '*.html')))
    n = build_sitemap(pages)

    touched = []
    if inject(os.path.join(ROOT, 'index.html'), 'org', ORG):
        touched.append('index.html (организация)')

    # афиша целиком — на главной и на странице афиши
    all_ld = [event_ld(e) for e in evs]
    for f in ('index.html', 'afisha.html'):
        if inject(os.path.join(ROOT, f), 'events', all_ld):
            touched.append(f'{f} ({len(all_ld)} событий)')

    # страницы событий — только свои даты
    by_page = {}
    for e in evs:
        if e.get('page'):
            by_page.setdefault(e['page'], []).append(e)
    for slug, lst in sorted(by_page.items()):
        path = os.path.join(ROOT, slug + '.html')
        if not os.path.exists(path):
            print(f'  ! страница {slug}.html не найдена, пропускаю', file=sys.stderr)
            continue
        if inject(path, 'events', [event_ld(e) for e in lst]):
            touched.append(f'{slug}.html ({len(lst)})')

    for f in ('afisha.html', 'index.html'):
        if inject_fallback(os.path.join(ROOT, f), evs):
            touched.append(f'{f} (текстовая афиша)')

    no_price = [e for e in evs if not e.get('priceFrom')]
    print(f'sitemap.xml: {n} страниц')
    print(f'JSON-LD: {len(evs)} будущих событий · обновлено файлов: {len(touched)}')
    for t in touched:
        print('  ·', t)
    if no_price:
        print(f'\nбез подтверждённой цены (offers не пишется): {len(no_price)}')
        for e in no_price:
            print(f'  {e["date"]} {e.get("time") or "—"} {e["title"]}')


if __name__ == '__main__':
    main()
