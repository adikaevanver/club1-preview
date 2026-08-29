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
offers не пишется, часы работы у организации не проставлены — клуб работает
по афише. Длительность шоу клуб публикует не везде, поэтому endDate
считается по таблице DURATION_MIN — она же единственное место, где эти
значения правятся.
"""
import json, os, re, glob, subprocess, sys, datetime, html

ROOT = os.path.dirname(os.path.abspath(__file__))
BASE = 'https://adikaevanver.github.io/club1-preview'   # deploy.py заменит на metelitsaclub1.ru

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
    'logo': BASE + '/assets/logo-metelitsa.png',
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


# Длительность шоу — из неё считается endDate. Своего поля в events.js нет,
# поэтому берём то, что клуб пишет сам: «три комика и ведущий, час живого
# стендапа» на страницах сборников и «1 час 30 минут» на странице сольного
# концерта (guram.html). Для остальных форматов длительность нигде не
# опубликована — держим общие два часа. Правится здесь, одним местом.
DURATION_MIN = {'ok': 60, 'gorod': 60, 'solniki': 90}
DURATION_DEFAULT = 120

_DESC = {}
_SALE = {}


def end_date(ev):
    """Конец события: начало плюс длительность формата.

    У события без подтверждённого времени конец — та же дата, без часов:
    придумывать время окончания там, где нет начала, нечем.
    """
    if not ev.get('time'):
        return ev['date']
    start = datetime.datetime.fromisoformat(f"{ev['date']}T{ev['time']}:00")
    end = start + datetime.timedelta(
        minutes=DURATION_MIN.get(ev.get('format'), DURATION_DEFAULT))
    return end.strftime('%Y-%m-%dT%H:%M:%S+03:00')


def page_description(slug):
    """Описание события для JSON-LD — meta description его страницы.

    Отдельный текст под разметку не заводим: описание страницы уже написано
    под это шоу и правится в одном месте.
    """
    if slug not in _DESC:
        txt = ''
        try:
            head = read(os.path.join(ROOT, slug + '.html')).split('</head>', 1)[0]
            m = re.search(r'<meta name="description" content="([^"]*)"', head)
            if m:
                txt = html.unescape(m.group(1)).strip()
        except OSError:
            pass
        _DESC[slug] = txt
    return _DESC[slug]


def sale_start(ev):
    """validFrom у offers — с какой даты билет продаётся.

    Дату открытия продаж касса не отдаёт, а выдумывать её нельзя. Берём
    проверяемый факт: коммит, которым сеанс появился в events.js, — к тому
    дню ссылка на покупку уже работала. Сеанс, ещё не попавший в коммит,
    продаётся с сегодня.
    """
    m = re.search(r'/seance/(\d+)|@(\d+)', ev.get('buy') or '')
    sid = (m.group(1) or m.group(2)) if m else None
    if not sid:
        return None
    if sid not in _SALE:
        d = ''
        try:
            r = subprocess.run(['git', 'log', '--reverse', '--format=%cs',
                                '-S', sid, '--', 'assets/data/events.js'],
                               cwd=ROOT, capture_output=True, text=True)
            d = (r.stdout.split('\n')[0] or '').strip()
        except Exception:
            pass
        _SALE[sid] = d or datetime.date.today().isoformat()
    return _SALE[sid]


def event_ld(ev):
    name = ev['title']
    if ev.get('format') == 'solniki':
        name += '. Сольный стендап-концерт'

    ld = {
        '@context': 'https://schema.org',
        '@type': 'ComedyEvent',
        'name': name,
        'startDate': f"{ev['date']}T{ev['time']}:00+03:00" if ev.get('time') else ev['date'],
        'endDate': end_date(ev),
        'eventStatus': 'https://schema.org/EventScheduled',
        'eventAttendanceMode': 'https://schema.org/OfflineEventAttendanceMode',
        'location': PLACE,
        'image': [BASE + '/' + (ev.get('poster') or 'assets/venue/audience.jpg')],
        'organizer': {'@type': 'Organization', 'name': 'Клуб №1', 'url': BASE + '/'},
    }
    if ev.get('page'):
        ld['url'] = f"{BASE}/{ev['page']}"
    elif ev.get('buy'):
        # '#abiframe' — служебный якорь виджета кассы, он включает модальное
        # окно на сайте. Поисковику он не нужен и только мусорит в разметке
        ld['url'] = ev['buy'].split('#')[0]

    if ev.get('page') and page_description(ev['page']):
        ld['description'] = page_description(ev['page'])

    # сольник — на сцене конкретный человек; у сборных форматов состав
    # меняется от даты к дате, выдавать конкретные имена за постоянные
    # нельзя — там на сцене труппа клуба без перечисления
    if ev.get('format') == 'solniki':
        ld['performer'] = {'@type': 'Person', 'name': ev['title']}
    else:
        ld['performer'] = {'@type': 'PerformingGroup', 'name': 'Артисты Клуба №1'}

    # offers пишем только с подтверждённой ценой: Offer без price — невалидная
    # разметка, а придумывать цену нельзя
    if ev.get('priceFrom') and ev.get('buy'):
        # Offer/price — единственная форма, которую документирует Google для
        # Event (аудит 26.08: AggregateOffer/lowPrice в доке не упоминается)
        ld['offers'] = {
            '@type': 'Offer',
            'price': ev['priceFrom'],
            'priceCurrency': 'RUB',
            'url': ev['buy'].split('#')[0],
            'availability': 'https://schema.org/InStock',
        }
        vf = sale_start(ev)
        if vf:
            ld['offers']['validFrom'] = vf
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
            head = fh.read().split('</head>', 1)[0]
    except OSError:
        return True
    # строка с data-preview-only — noindex только для превью на GitHub Pages,
    # deploy.py вырезает её при заливке на боевой; для карты сайта её нет
    head = '\n'.join(l for l in head.split('\n') if 'data-preview-only' not in l)
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


# ---------------------------------------------------------------------
# Жизненный цикл страниц событий, кнопки дат, превью и версии (аудит 26.08)
# ---------------------------------------------------------------------
import hashlib

DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
MONTHS_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
              'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
DAYS_FULL = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье']
PREVIEW_META = '<meta name="robots" content="noindex, nofollow" data-preview-only>\n'
PAST_META = '<meta name="robots" content="noindex, follow" data-seo="past">\n'
PAST_OG = 'Даты и билеты на сайте Клуба №1 — стендап-клуб на Новом Арбате, 21.'


def read(path):
    with open(path, encoding='utf-8') as fh:
        return fh.read()


def write_if_changed(path, s_old, s_new):
    if s_new != s_old:
        with open(path, 'w', encoding='utf-8') as fh:
            fh.write(s_new)
        return True
    return False


def all_dates_text(lst):
    """Тот же формат, что рисует afisha.js в [data-all-dates]."""
    dates, times = {}, {}
    for e in lst:
        dates.setdefault(e['date'], [])
        if e.get('time'):
            dates[e['date']].append(e['time']); times[e['time']] = 1
    keys = sorted(dates)
    if len(times) <= 1:
        groups, last = [], None
        for d in keys:
            dd = datetime.date.fromisoformat(d)
            if not last or last[0] != dd.month:
                last = [dd.month, []]; groups.append(last)
            last[1].append(str(dd.day))
        txt = ' · '.join(', '.join(g[1]) + ' ' + MONTHS_GEN[g[0] - 1] for g in groups)
        if times:
            txt += '<small>начало в ' + esc(next(iter(times))) + '</small>'
        return txt
    parts = []
    for d in keys:
        dd = datetime.date.fromisoformat(d)
        parts.append(f"{dd.day} {MONTHS_SHORT[dd.month - 1]}" + (' ' + ' / '.join(esc(t) for t in dates[d]) if dates[d] else ''))
    n = len(keys)
    word = 'дата' if n == 1 else 'даты' if n < 5 else 'дат'
    return ' · '.join(parts) + f'<small>{n} {word} — выберите ниже</small>'


def sync_datebar(path, lst):
    """Кнопки дат на странице — из events.js, а не руками.

    Аудит 26.08: у Гурама и Чабдарова ручной датабар разошёлся с афишей —
    со страницы нельзя было купить билет на реальную дату. Страницы с
    data-sched-days (расписание строит afisha.js) не трогаем.
    """
    s = read(path)
    if 'data-sched-days' in s or 'class="datebar__days"' not in s:
        return False
    lst = sorted(lst, key=lambda e: (e['date'], e.get('time') or '23:00'))
    if not lst:
        return False
    same_day = {}
    for e in lst:
        same_day[e['date']] = same_day.get(e['date'], 0) + 1
    btns = []
    for i, e in enumerate(lst):
        d = datetime.date.fromisoformat(e['date'])
        label = f"{d.day} {MONTHS_GEN[d.month - 1]}"
        sub = DAYS_SHORT[d.weekday()] + ((' ' + e['time']) if same_day[e['date']] > 1 and e.get('time') else '')
        attrs = [f'data-date="{e["date"]}"', f'data-label="{label}"']
        if e.get('time'):
            attrs.append(f'data-time="{esc(e["time"])}"')
        if e.get('priceFrom'):
            attrs.append(f'data-price="от {int(e["priceFrom"]):,} ₽"'.replace(',', ' '))
        if e.get('buy'):
            attrs.append(f'data-buy="{esc(e["buy"])}"')
        attrs.append('aria-pressed="' + ('true' if i == 0 else 'false') + '"')
        btns.append(f'              <button class="datebar__day" {" ".join(attrs)}><b>{d.day:02d}</b><span>{sub}</span></button>')
    months = []
    for e in lst:
        m = MONTHS_NOM[datetime.date.fromisoformat(e['date']).month - 1]
        if m not in months:
            months.append(m)
    month_label = months[0] if len(months) == 1 else f'{months[0]} — {months[-1]}'
    s2 = re.sub(r'(<div class="datebar__days"[^>]*>)\n.*?\n(\s*</div>)',
                lambda m: m.group(1) + '\n' + '\n'.join(btns) + '\n' + m.group(2), s, count=1, flags=re.S)
    s2 = re.sub(r'(<span class="datebar__month">)[^<]*(</span>)', lambda m: m.group(1) + month_label + m.group(2), s2, count=1)
    first = lst[0]
    d0 = datetime.date.fromisoformat(first['date'])
    label0 = f"{d0.day} {MONTHS_GEN[d0.month - 1]}"
    time0 = first.get('time') or ''
    s2 = re.sub(r'(<div class="poster__badge" data-picked-badge>)[^<]*(<small>)[^<]*(</small></div>)',
                lambda m: m.group(1) + f'{d0.day:02d}.{d0.month:02d}' + m.group(2) + esc(time0) + m.group(3), s2)
    s2 = re.sub(r'(<b data-picked-date[^>]*>)[^<]*(</b>)', lambda m: m.group(1) + label0 + m.group(2), s2)
    s2 = re.sub(r'(<b data-picked-time[^>]*>)[^<]*(</b>)', lambda m: m.group(1) + esc(time0) + m.group(2), s2)
    if first.get('priceFrom'):
        s2 = re.sub(r'(<b data-picked-price>)[^<]*(</b>)',
                    lambda m: m.group(1) + f'от {int(first["priceFrom"]):,} ₽'.replace(',', ' ') + m.group(2), s2)
    if first.get('buy'):
        s2 = re.sub(r'(data-picked-buy href=")[^"]*(")', lambda m: m.group(1) + esc(first['buy']) + m.group(2), s2)
    s2 = re.sub(r'(<span data-picked-meta>)[^<]*<small>[^<]*</small>(</span>)',
                lambda m: m.group(1) + label0 + f'<small>{DAYS_FULL[d0.weekday()]}, {esc(time0)}</small>' + m.group(2), s2)
    s2 = re.sub(r'(<span class="fact__value" data-picked-meta>)[^<]*<small>[^<]*</small>(</span>)',
                lambda m: m.group(1) + label0 + f'<small>{DAYS_FULL[d0.weekday()]}, {esc(time0)}</small>' + m.group(2), s2)
    s2 = re.sub(r'(<span[^>]*data-all-dates[^>]*>).*?(</span>)', lambda m: m.group(1) + all_dates_text(lst) + m.group(2), s2, count=1, flags=re.S)
    return write_if_changed(path, s, s2)


def mark_past(path, has_future):
    """Страница события без будущих дат: noindex, пустой JSON-LD, og без даты.

    Правило жизненного цикла из вольта («Стандарт SEO», §5): страница
    прошедшего события не остаётся в индексе. Появится новая дата на той же
    странице — маркер снимается сам следующим прогоном.
    """
    s = read(path)
    s2 = s
    if has_future:
        s2 = s2.replace(PAST_META, '')
    else:
        if PAST_META not in s2:
            s2 = s2.replace('</head>', PAST_META + '</head>', 1)
        s2 = re.sub(r'(<script type="application/ld\+json" data-seo="events">\n).*?(\n</script>\n)',
                    lambda m: m.group(1) + '[]' + m.group(2), s2, count=1, flags=re.S)
        s2 = re.sub(r'(<meta property="og:description" content=")[^"]*(">)', lambda m: m.group(1) + PAST_OG + m.group(2), s2, count=1)
    return write_if_changed(path, s, s2)


def mark_preview(path):
    """noindex для превью на GitHub Pages: deploy.py вырезает эту строку
    при заливке на боевой (аудит 26.08: превью — публичный дубль сайта)."""
    s = read(path)
    if 'data-preview-only' in s:
        return False
    return write_if_changed(path, s, s.replace('</head>', PREVIEW_META + '</head>', 1))


VERSIONED = ['styles.css', 'script.js', 'afisha.js', 'analytics.js', 'assets/data/events.js']


def stamp_versions(pages):
    """?v= у css/js — хэш содержимого файла, а не ручная строка.

    Хост кэширует статику 45 дней, игнорируя TTL из .htaccess (аудит
    26.08); единственная защита — версия в адресе. Считаем её сами.
    """
    hashes = {}
    for f in VERSIONED:
        fp = os.path.join(ROOT, f)
        if os.path.exists(fp):
            hashes[f] = hashlib.sha256(open(fp, 'rb').read()).hexdigest()[:10]
    pat = re.compile(r'((?:assets/data/)?(?:styles\.css|script\.js|afisha\.js|analytics\.js|events\.js))\?v=[A-Za-z0-9._-]+')
    def sub(m):
        key = m.group(1)
        if key == 'events.js':
            key = 'assets/data/events.js'
        return m.group(1) + '?v=' + hashes.get(key, m.group(0).split('?v=')[1])
    n = 0
    for f in pages:
        path = os.path.join(ROOT, f)
        s = read(path)
        s2 = pat.sub(sub, s)
        if write_if_changed(path, s, s2):
            n += 1
    return n, hashes


def main():
    today = datetime.date.today().isoformat()
    evs = [e for e in events() if e['date'] >= today]
    evs.sort(key=lambda e: (e['date'], e.get('time') or '23:00'))

    # файлы подтверждения прав (Вебмастер yandex_*.html, Search Console
    # google*.html) — не страницы: ни в sitemap, ни noindex им не нужны,
    # а чужая строка в теле ломает проверку.
    VERIFY_RE = re.compile(r'^(yandex_[0-9a-f]+|google[0-9a-f]+)\.html$')
    pages = sorted(os.path.basename(p) for p in glob.glob(os.path.join(ROOT, '*.html'))
                   if not VERIFY_RE.match(os.path.basename(p)))

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

    # кнопки дат и подписи первой даты — из events.js
    for slug, lst in sorted(by_page.items()):
        path = os.path.join(ROOT, slug + '.html')
        if os.path.exists(path) and sync_datebar(path, lst):
            touched.append(f'{slug}.html (кнопки дат)')

    # прошедшие события: страница события (есть в events.js), у которой нет
    # будущих дат — независимо от того, успел ли на ней появиться JSON-LD
    event_pages = {e['page'] for e in events() if e.get('page')}
    for f in pages:
        path = os.path.join(ROOT, f)
        if f[:-5] not in event_pages or f in ('index.html', 'afisha.html'):
            continue
        if mark_past(path, f[:-5] in by_page):
            touched.append(f'{f} (' + ('снят noindex' if f[:-5] in by_page else 'прошедшее: noindex') + ')')

    # превью на GitHub Pages — noindex; на боевом строку вырезает deploy.py
    for f in pages:
        if mark_preview(os.path.join(ROOT, f)):
            touched.append(f'{f} (noindex превью)')

    # карта сайта — после маркеров (noindex прошедших уходит из карты)
    n = build_sitemap(pages)
    nv, hashes = stamp_versions(pages)
    if nv:
        touched.append(f'версии ?v= обновлены в {nv} файлах: ' + ', '.join(f'{k.split("/")[-1]}={v}' for k, v in hashes.items()))

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
