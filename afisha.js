/* =====================================================================
   CLUB №1 — afisha.js
   Живая афиша поверх данных assets/data/events.js (CLUB1_EVENTS).
   ---------------------------------------------------------------------
   Компоненты (все по data-атрибутам, отсутствие разметки = no-op):

     1. [data-afisha]     — полная афиша: месяцы + дни + фильтры + карточки
                            (главная). Фильтры: дата, день недели, формат.
                            Пустой результат → сообщение + сброс. Выбор
                            сохраняется в sessionStorage и переживает
                            переход в карточку и назад.
     2. [data-upcoming]   — рейка «ближайшие события» (страницы событий).
                            data-upcoming-except="Имя" — события этого
                            артиста НЕ показывать: гость уже на его
                            странице, рейка зовёт на другие мероприятия
                            (правка Фигмы 31.07, #15 — до неё артист
                            стоял первым и рейка выглядела дублями);
                            data-upcoming-limit="8".
     3. [data-format-next]— на карточку формата дописывает ближайшую дату
                            и ведёт кнопку на неё; сортирует карточки
                            внутри [data-format-grid] по ближайшей дате.
     4. window.Club1Afisha— публичные помощники (upcoming, nextForArtist…)

   CTA-логика (ТЗ 2026-07-07): есть billet-страница → «Бронировать
   места»; продажи не открыты → «Узнать о старте продаж» (контакты).
   Кнопок «в никуда» нет.
   ===================================================================== */
(function () {
  "use strict";

  var EVENTS  = window.CLUB1_EVENTS  || [];
  var FORMATS = window.CLUB1_FORMATS || {};

  var MONTHS_NOM = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                    'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  var MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня',
                    'июля','августа','сентября','октября','ноября','декабря'];
  var DAYS_SHORT = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
  var DAYS_FULL  = ['Воскресенье','Понедельник','Вторник','Среда',
                    'Четверг','Пятница','Суббота'];

  /* --- helpers ------------------------------------------------------- */
  function pad2(n){ return (n < 10 ? '0' : '') + n; }
  function dateOf(ev){ return new Date(ev.date + 'T00:00:00'); }
  function todayISO(){
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function monthKey(iso){ return iso.slice(0, 7); }          // 'YYYY-MM'
  function sortKey(ev){ return ev.date + 'T' + (ev.time || '23:00'); }
  function shiftISO(days){
    var d = new Date();
    d.setDate(d.getDate() + days);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  /* Сеанс уходит из афиши в момент начала, а не в полночь: сравнение
     только по дате оставляло вечернее шоу с плашкой «Сегодня» и живой
     кнопкой брони, когда оно уже шло на сцене. Полчаса форы оставляем —
     опоздавшие ещё покупают на входе. */
  var GRACE_MIN = 30;
  function startedAlready(ev){
    var p = (ev.date || '').split('-');
    if (p.length !== 3) return false;
    var hm = (ev.time || '23:59').split(':');
    var start = new Date(+p[0], +p[1] - 1, +p[2], +hm[0] || 0, +hm[1] || 0);
    return (new Date()).getTime() > start.getTime() + GRACE_MIN * 60000;
  }

  function upcoming(){
    var t = todayISO();
    return EVENTS
      .filter(function(ev){ return ev.date >= t && !startedAlready(ev); })
      .sort(function(a, b){ return sortKey(a) < sortKey(b) ? -1 : 1; });
  }
  /* Сетка «день = шоу» (правки Фигмы 04.08, #17 + #11 «дубли перебор»):
     два сеанса одного шоу в один день — одна карточка, времена копятся
     в ev.times («16:00 и 18:30»). Кнопка брони ведёт на ранний сеанс,
     остальные выбираются на странице шоу. Слияние делает копию события,
     исходные данные не трогает. */
  function dedupeSameDay(list){
    var seen = {}, out = [];
    list.forEach(function(ev){
      var k = ev.date + '|' + ev.title;
      if (seen[k]){
        if (ev.time) seen[k].times.push(ev.time);
        return;
      }
      var copy = Object.assign({}, ev);
      copy.times = ev.time ? [ev.time] : [];
      seen[k] = copy;
      out.push(copy);
    });
    return out;
  }

  function nextForFormat(key){
    return upcoming().filter(function(ev){ return ev.format === key; })[0] || null;
  }
  function nextForArtist(name){
    return upcoming().filter(function(ev){ return ev.title === name; })[0] || null;
  }
  function fmtShort(ev){                                      // '10.07'
    return ev.date.slice(8, 10) + '.' + ev.date.slice(5, 7);
  }
  function fmtHuman(ev){                                      // 'Пт 10.07'
    return DAYS_SHORT[dateOf(ev).getDay()] + ' ' + fmtShort(ev);
  }

  function esc(s){
    return String(s).replace(/[&<>"]/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];
    });
  }

  /* --- event card ----------------------------------------------------
     Настоящая афиша → полноцветная картинка; нет афиши → фирменный
     CSS-постер (дуотон + STANDUP + имя), при наличии фото — с фото.
     Дата-бейдж единый на всех карточках: ДД.ММ + время или день недели. */
  /* Мигание афиш при листании ленты (правка Анвера 09.08): постеры грузились
     лениво, то есть ровно в тот момент, когда карточка выезжает в кадр — глаз
     успевал поймать пустой серый прямоугольник. Первые четыре карточки грузим
     сразу, остальные остаются ленивыми: они за пределами двух-трёх свайпов. */
  function cardHTML(ev, i){
    /* ТЗ Сергея 17.08: первые пять афиш грузятся сразу — это ровно первый
       ряд сетки на широком экране; остальные лениво */
    var eager = (i || 0) < 5;
    var load = (eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"') +
               ' decoding="async"';
    var badge = '<div class="poster__badge">' + fmtShort(ev) +
                '<small>' + (ev.time ? esc(ev.time) : DAYS_SHORT[dateOf(ev).getDay()]) + '</small></div>';
    /* 18+ рисует сайт на каждой афише (созвон 21.07: алкоголь ⇒ всё 18+) */
    var age = '<span class="poster__age">' + esc(ev.age || '18+') + '</span>';
    /* бейдж срочности — только из реальных данных: дата/время события,
       подтверждённый sold-out или объявленный перенос (ev.moved = ISO-дата);
       никаких выдуманных «мест осталось мало» */
    var when = '';
    if (ev.soldOut){
      when = '<span class="poster__when poster__when--soldout">Билеты закончились</span>';
    } else if (ev.moved){
      when = '<span class="poster__when poster__when--soldout">Перенесено на ' +
             ev.moved.slice(8, 10) + '.' + ev.moved.slice(5, 7) + '</span>';
    } else if (ev.date === todayISO()){
      /* правки 24.07: плашки «Сегодня»/«Завтра» без уточнения времени —
         время стоит в дата-бейдже и в строке под карточкой */
      when = '<span class="poster__when">Сегодня</span>';
    } else if (ev.date === shiftISO(1)){
      when = '<span class="poster__when">Завтра</span>';
    }
    /* дата — слева сверху, «завтра/сегодня» — справа сверху, 18+ — справа
       снизу; логотип на CSS-постер не ставим (решение созвона 21.07: афиши
       чистые, служебное рисует сайт) */
    /* правки 24.07: без дополнительного выделенного текста поверх афиши —
       на CSS-постере карточки название не дублируется (заголовок стоит
       прямо под афишей); афиша целиком кликабельна на «Подробнее» */
    var poster;
    if (ev.poster){
      /* Афиша отдаётся в трёх размерах. Карточка на телефоне занимает
         157–190 CSS-пикселей (замер на вьюпортах 360–440), при DPR 3 ей
         нужен файл шириной 472–570 px. Крупная 1080×1350 на двадцати
         четырёх карточках даёт около 140 МБ декодированных битмапов, iOS
         выгружает их и декодирует заново — это и есть «блики».

         Четвёртый заход, 20.08. Третий добавил вариант 540 px, но телефон
         его не брал: sizes объявлял 46vw, на 402 pt это 185 CSS-пикселей,
         при DPR 3 браузеру нужен файл от 555 px, и 540-й не проходил. Ниже
         sizes считает ширину карточки по сетке (гаттер 5vw с каждой
         стороны плюс зазор 12 px на две колонки), а между 540 и 1080
         добавлен вариант 640 px — его берут широкие телефоны (430–440 pt),
         где карточке нужно 557–570 px.

         Замер после правки: DPR 2 и DPR 3 берут только мелкие файлы,
         крупных на телефоне ноль. */
      var small = esc(ev.poster).replace(/\.jpg$/, '-540.jpg');
      var mid = esc(ev.poster).replace(/\.jpg$/, '-640.jpg');
      var srcset = ' srcset="' + small + ' 540w, ' + mid + ' 640w, ' + esc(ev.poster) + ' 1080w"' +
                   ' sizes="(max-width:760px) calc(45vw - 8px), (max-width:1279px) 24vw, 260px"';
      /* Подложка под поля рамки нужна только квадратным артам и только на
         широком экране: на телефоне она скрыта стилями, но браузер всё
         равно её скачивал и держал в памяти — 23 лишние картинки. */
      var wide = !window.matchMedia || !window.matchMedia('(max-width:900px)').matches;
      var backfill = wide
        ? '<img class="poster__backfill" src="' + small + '" alt="" aria-hidden="true" ' + load + ' width="540" height="675">'
        : '';
      poster =
        '<div class="poster poster--art">' +
          backfill +
          '<img class="poster__full" src="' + esc(ev.poster) + '"' + srcset +
            ' alt="Афиша: ' + esc(ev.title) + '" ' + load + ' width="1080" height="1350">' +
          badge + when + age +
        '</div>';
    } else {
      poster =
        '<div class="poster poster--noname poster--' + esc(ev.tone || 'mag') + '">' +
          (ev.photo ? '<img class="poster__photo" src="' + esc(ev.photo) + '" alt="" aria-hidden="true" loading="lazy" width="900" height="900"><div class="poster__tint"></div>' : '') +
          badge + when +
          '<div class="poster__art"><span class="poster__standup">STANDUP</span><span class="poster__solo">' + esc(ev.kind || '') + '</span></div>' +
          age +
        '</div>';
    }
    /* партнёрские события идут без своей страницы (билеты живут на стороне
       организатора) — тогда афиша не кликабельна и «Подробнее» не рисуем,
       иначе ссылка уходила бы в href="null" */
    if (ev.page){
      poster = '<a class="poster-link" href="' + esc(ev.page) + '" aria-label="Подробнее: ' + esc(ev.title) + '">' + poster + '</a>';
    } else if (ev.buy){
      /* У партнёрских событий своей страницы нет (билеты живут у
         организатора). Раньше их афиша не кликалась вовсе — единственная
         карточка в афише, которая молча не реагировала на клик (аудит
         переходов 19.08). Теперь ведёт туда же, куда кнопка: в кассу. */
      poster = '<a class="poster-link" href="' + esc(ev.buy) + '" target="_blank" rel="noopener"' +
               ' aria-label="Билеты: ' + esc(ev.title) + '">' + poster + '</a>';
    }
    var cta;
    if (ev.soldOut){
      cta = '<a class="btn btn--ghost btn--sm" href="#contacts">Узнать о доп. датах</a>';
    } else if (ev.moved){
      cta = '<a class="btn btn--ghost btn--sm" href="' + esc(ev.page) + '">Смотреть новую дату</a>';
    } else if (ev.buy){
      cta = '<a class="btn btn--primary btn--sm" href="' + esc(ev.buy) + '" target="_blank" rel="noopener">Бронировать места</a>';
    } else {
      cta = '<a class="btn btn--primary btn--sm" href="#contacts">Узнать о старте продаж</a>';
    }
    /* правки 24.07: строка-попап «как считается цена» с карточек снята —
       подробности о цене живут на странице мероприятия */
    /* цена рисуется всегда, пустой абзац держит свою строку в subgrid-сетке:
       иначе у карточки без цены кнопки поднимались выше соседних */
    var price = '<p class="event-card__price">' +
      (ev.priceFrom ? 'от ' + ev.priceFrom.toLocaleString('ru-RU') + ' ₽' : '') + '</p>';
    /* слитая карточка (dedupeSameDay) несёт все времена дня: «16:00 и 18:30» */
    var times = (ev.times && ev.times.length ? ev.times : (ev.time ? [ev.time] : []))
                  .map(esc).join(' и ');
    return (
      '<article class="event-card" role="listitem" data-date="' + esc(ev.date) + '">' +
        poster +
        '<h3 class="event-card__title">' + esc(ev.title) + '</h3>' +
        '<p class="event-card__meta">' + DAYS_FULL[dateOf(ev).getDay()] + ', ' + fmtShort(ev) +
          (times ? ' · ' + times : '') + ' · Новый Арбат, 21</p>' +
        price +
        /* ТЗ Сергея 17.08: в карточке одна кнопка — покупка. «Подробнее»
           снята, на страницу события ведёт сама карточка (растянутая ссылка
           .poster-link::after). В пяти колонках две кнопки не помещались и
           переносились друг под друга. */
        '<div class="event-card__actions">' + cta + '</div>' +
      '</article>'
    );
  }

  /* =================================================================
     0 · Хиро-биллборд  [data-hero-slider]  (правки созвона 2026-07-21)
     ----------------------------------------------------------------
     Большая афиша на весь экран с автопрокруткой вместо ленты фото.
     Слайды — продукты, которые продаём в первую очередь: ближайшие
     события всех форматов, кроме проверок материала («Опытные комики»),
     по одному на продукт (dedup по названию), максимум 6. Настоящая
     афиша → картинка + её же размытая подложка; нет афиши → фирменный
     CSS-постер. Дату, время и 18+ рисует сайт (афиши приходят чистыми).
     Автопрокрутка 6 с; пауза на hover/фокусе/касании; при
     prefers-reduced-motion автопрокрутки нет.
     ================================================================= */
  /* продукты биллборда: по одному слайду на продукт, все его ближайшие
     даты копятся в item.dates — макет Максима показывает на слайде
     плашки с парами «дата · время» */
  function heroEvents(){
    var seen = {}, out = [];
    upcoming().forEach(function(ev){
      if (ev.format === 'ok') return;          /* проверки — не хиро-продукт */
      if (ev.soldOut || ev.moved) return;
      if (seen[ev.title]){ seen[ev.title].dates.push(ev); return; }
      var item = { ev: ev, dates: [ev] };
      seen[ev.title] = item;
      out.push(item);
    });
    /* сольники — первыми (созвон: крупные продукты в приоритете),
       внутри групп порядок по дате сохраняется */
    /* В слайдере только события с панорамой 12:5 (решение Анвера 14.08):
       карточки и переходные 16:9 в хиро не показываем — событие войдёт в
       слайдер само, как только его панорама от Максима встанет в wide */
    out = out.filter(function(it){ return it.ev.wide; });
    var solo   = out.filter(function(it){ return it.ev.format === 'solniki'; });
    var others = out.filter(function(it){ return it.ev.format !== 'solniki'; });
    /* лимит поднят 6 → 8 (Анвер 13.08, «используй все панорамы Максима»):
       при пяти сольниках впереди панорамные СБГ и Бурлеск не влезали в
       шестёрку, и готовые арты 1920×800 не показывались вовсе */
    return solo.concat(others).slice(0, 8);
  }

  /* макет Максима 22.07 (ранний вариант выбран на созвоне 24.07 как
     основа): текст рядом с афишей не дублируется — афиша сама несёт
     информацию, на слайде остаются даты, маркировка 18+ и кнопки.
     Есть широкая афиша (ev.wide) → она фоном всего слайда, как в
     референсе; нет — квадратная афиша по центру на размытой подложке */
  function heroSlideHTML(item, i){
    var ev = item.ev;
    /* цвет плашки — под каждую афишу (просьба Максима 13.08): необязательное
       поле chip в events.js, {bg:'#d3e04b', ink:'#1c1c1c'}; без него —
       фирменная маджента с белым (дефолты в CSS) */
    var chipStyle = ev.chip
      ? ' style="' + (ev.chip.bg ? '--chip-bg:' + esc(ev.chip.bg) + ';' : '') +
                     (ev.chip.ink ? '--chip-ink:' + esc(ev.chip.ink) + ';' : '') + '"'
      : '';
    var chips = item.dates.slice(0, 2).map(function(d){
      return '<span class="bb-chip"' + chipStyle + '><b>' + fmtShort(d) + '</b>' +
             (d.time ? '<small>' + esc(d.time) + '</small>' : '') + '</span>';
    }).join('');
    var cta = ev.buy
      ? '<a class="btn btn--primary" href="' + esc(ev.buy) + '" target="_blank" rel="noopener">Бронировать места</a>'
      : '<a class="btn btn--primary" href="#contacts">Узнать о старте продаж</a>';
    var actions = '<div class="bb-slide__actions">' +
                    (ev.page ? '<a class="btn btn--ghost" href="' + esc(ev.page) + '">Подробнее</a>' : '') + cta +
                  '</div>';
    /* клик по самой афише ведёт на страницу события (просьба Анвера
       06.08): ссылка-подложка на весь слайд; сцена поверх неё прозрачна
       для кликов (pointer-events), кнопки остаются кликабельными.
       У партнёрского события своей страницы нет — подложку не ставим */
    var slideLink = ev.page
      ? '<a class="bb-slide__link" href="' + esc(ev.page) +
        '" aria-label="' + esc(ev.title) + ' — подробнее о событии"></a>'
      : '';
    if (ev.wide){
      /* Телефон (правка Анвера 09.08): слайды лежат в одной ячейке сетки, и
         высоту задаёт самый высокий — слайд с квадратной афишей и кнопками
         под ней. Панорамный арт 16:9, растянутый в этот высокий бокс через
         cover, обрезался до неузнаваемости: от заголовка оставались огрызки,
         а кнопки ложились поверх картинки. Поэтому на узком экране широкий
         арт не показываем вовсе — отдаём квадратную афишу, как у остальных
         слайдов; подложку из неё же размывает .bb-slide__bg. */
      var sq = ev.poster
        ? '<div class="bb-slide__mob">' +
            '<div class="bb-slide__frame">' +
              '<img class="bb-slide__poster" src="' + esc(ev.poster) + '"' +
              ' srcset="' + esc(ev.poster).replace(/\.jpg$/, '-540.jpg') + ' 540w, ' + esc(ev.poster) + ' 1080w"' +
              ' sizes="(max-width:760px) 100vw, 540px"' +
              ' alt="Афиша: ' + esc(ev.title) + '"' +
              (i ? ' loading="lazy"' : '') + ' width="1080" height="1350">' +
              '<span class="bb-slide__age">' + esc(ev.age || '18+') + '</span>' +
            '</div>' +
          '</div>'
        : '';
      var mobBg = ev.poster
        ? '<div class="bb-slide__bg bb-slide__bg--mob" style="background-image:url(\'' + esc(ev.poster) + '\')" aria-hidden="true"></div>'
        : '';
      return (
        '<article class="bb-slide bb-slide--wide" role="group" aria-roledescription="слайд" aria-label="' + esc(ev.title) + ', ' + fmtHuman(ev) + '">' +
          /* нижний слой — размытая заливка полей, верхний — панорама целиком
             (окно 3:1 шире, чем арты 12:5; правка Саши 16.08) */
          '<div class="bb-slide__bg bb-slide__bg--wide-fill" style="background-image:url(\'' + esc(ev.wide) + '\')" aria-hidden="true"></div>' +
          '<div class="bb-slide__bg bb-slide__bg--wide" style="background-image:url(\'' + esc(ev.wide) + '\')" aria-hidden="true"></div>' +
          mobBg +
          slideLink +
          '<div class="bb-slide__stage">' +
            '<div class="bb-slide__chips">' + chips + '</div>' +
            sq +
            '<span class="bb-slide__age bb-slide__age--corner">' + esc(ev.age || '18+') + '</span>' +
            actions +
          '</div>' +
        '</article>'
      );
    }
    var art;
    if (ev.poster){
      art = '<img class="bb-slide__poster" src="' + esc(ev.poster) + '"' +
            ' srcset="' + esc(ev.poster).replace(/\.jpg$/, '-540.jpg') + ' 540w, ' + esc(ev.poster) + ' 1080w"' +
            ' sizes="(max-width:760px) 100vw, 480px"' +
            ' alt="Афиша: ' + esc(ev.title) + '"' +
            (i ? ' loading="lazy"' : '') + ' width="1080" height="1350">';
    } else {
      art =
        '<div class="poster poster--' + esc(ev.tone || 'mag') + ' bb-slide__cssposter">' +
          (ev.photo ? '<img class="poster__photo" src="' + esc(ev.photo) + '" alt="" aria-hidden="true" loading="lazy" width="900" height="900"><div class="poster__tint"></div>' : '') +
          '<div class="poster__art"><span class="poster__standup">STANDUP</span><span class="poster__solo">' + esc(ev.kind || '') + '</span></div>' +
          '<div class="poster__name"><b>' + esc(ev.title) + '</b></div>' +
        '</div>';
    }
    var bg = ev.poster
      ? '<div class="bb-slide__bg" style="background-image:url(\'' + esc(ev.poster) + '\')" aria-hidden="true"></div>'
      : '<div class="bb-slide__bg bb-slide__bg--brand" aria-hidden="true"></div>';
    /* 18+ — в нижнем левом углу самой афиши (рамка), не сцены слайда */
    var age = '<span class="bb-slide__age">' + esc(ev.age || '18+') + '</span>';
    art = '<div class="bb-slide__frame">' + art + age + '</div>';
    /* wide169 — переходный арт 16:9, пока Максим не прислал панораму 12:5
       (замечание Анвера 13.08: карточка 4:5 в центре широкого окна выглядела
       бедно). Показываем 16:9 целиком крупно по центру на десктопе; на
       телефоне остаётся карточка — там 16:9 мелкий и нечитаемый */
    var artWrap;
    if (ev.wide169){
      var midArt = '<div class="bb-slide__frame">' +
          '<img class="bb-slide__poster bb-slide__poster--mid" src="' + esc(ev.wide169) + '" alt="Афиша: ' + esc(ev.title) + '"' +
          (i ? ' loading="lazy"' : '') + ' width="1920" height="1080">' + age + '</div>';
      artWrap = '<div class="bb-slide__art bb-slide__art--mid">' + midArt + '</div>' +
                '<div class="bb-slide__art bb-slide__art--sq">' + art + '</div>';
      bg = '<div class="bb-slide__bg" style="background-image:url(\'' + esc(ev.wide169) + '\')" aria-hidden="true"></div>';
    } else {
      artWrap = '<div class="bb-slide__art">' + art + '</div>';
    }
    return (
      '<article class="bb-slide" role="group" aria-roledescription="слайд" aria-label="' + esc(ev.title) + ', ' + fmtHuman(ev) + '">' +
        bg +
        slideLink +
        '<div class="bb-slide__stage">' +
          '<div class="bb-slide__chips">' + chips + '</div>' +
          artWrap +
          actions +
        '</div>' +
      '</article>'
    );
  }

  /* =================================================================
     0б · Живое расписание шоу  [data-schedule="Название"]
     ----------------------------------------------------------------
     Для повторяющихся шоу (Опытные комики, В большом городе): рендерит
     календарь дат и строки «дата · время · Бронировать места» из
     events.js — виджет-ссылка у каждого сеанса своя. Статичные списки
     сеансов в HTML больше не протухают. Разметка повторяет .sched-row
     из постраничного CSS show.html.
     ================================================================= */
  var SVG_CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>';
  var SVG_CLK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

  function initSchedule(){
    document.querySelectorAll('[data-schedule]').forEach(function(root){
      var title  = root.getAttribute('data-schedule');
      var daysEl = root.querySelector('[data-sched-days]');
      var listEl = root.querySelector('[data-sched-list]');
      var monEl  = root.querySelector('[data-sched-month]');
      if (!listEl) return;
      var list = upcoming().filter(function(ev){ return ev.title === title && ev.buy; });
      if (!list.length){ root.hidden = true; return; }

      function humanDay(isoDate){
        var d = new Date(isoDate + 'T00:00:00');
        return d.getDate() + ' ' + MONTHS_GEN[d.getMonth()] + ', ' + DAYS_SHORT[d.getDay()];
      }
      if (monEl){
        var mons = [];
        list.forEach(function(ev){
          var m = MONTHS_NOM[parseInt(ev.date.slice(5, 7), 10) - 1];
          if (mons.indexOf(m) === -1) mons.push(m);
        });
        monEl.textContent = mons.length > 1 ? mons[0] + ' — ' + mons[mons.length - 1] : mons[0];
      }
      if (daysEl){
        var dates = [];
        list.forEach(function(ev){ if (dates.indexOf(ev.date) === -1) dates.push(ev.date); });
        daysEl.innerHTML =
          '<button class="datebar__day" type="button" data-date="all" aria-pressed="true"><b>Все</b><span>даты</span></button>' +
          dates.map(function(d){
            var dt = new Date(d + 'T00:00:00');
            return '<button class="datebar__day" type="button" data-date="' + d + '" aria-pressed="false">' +
                   '<b>' + d.slice(8, 10) + '</b><span>' + DAYS_SHORT[dt.getDay()] + '</span></button>';
          }).join('');
        daysEl.addEventListener('click', function(e){
          var b = e.target.closest('[data-date]');
          if (!b) return;
          Array.prototype.forEach.call(daysEl.querySelectorAll('[data-date]'), function(x){
            x.setAttribute('aria-pressed', String(x === b));
          });
          curPick = b.getAttribute('data-date');
          applyCollapse();
        });
      }
      listEl.innerHTML = list.map(function(ev){
        return '<div class="sched-row" data-date="' + ev.date + '">' +
                 '<span class="sched-row__meta">' +
                   '<span class="sched-row__cell sched-row__cell--day">' + SVG_CAL + ' ' + humanDay(ev.date) + '</span>' +
                   '<span class="sched-row__cell">' + SVG_CLK + ' ' + esc(ev.time || '') + '</span>' +
                 '</span>' +
                 '<a class="btn book-btn" href="' + esc(ev.buy) + '" target="_blank" rel="noopener">Бронировать места</a>' +
               '</div>';
      }).join('');

      /* Правка Фигмы 31.07 (#7): простыня сеансов свёрнута — первые три
         строки, дальше кнопка «Показать все даты (N)». Выбор дня в
         датапике показывает его сеансы целиком независимо от свёртки. */
      var curPick  = 'all';
      var expanded = list.length <= 3;
      var moreBtn  = null;
      function applyCollapse(){
        var shown = 0;
        Array.prototype.forEach.call(listEl.children, function(row){
          var byDay  = curPick !== 'all' && row.getAttribute('data-date') !== curPick;
          var byFold = !expanded && curPick === 'all' && shown >= 3;
          row.hidden = byDay || byFold;
          if (!byDay) shown++;
        });
        if (moreBtn) moreBtn.hidden = expanded || curPick !== 'all';
      }
      if (!expanded){
        moreBtn = document.createElement('button');
        moreBtn.type = 'button';
        moreBtn.className = 'btn btn--ghost sched-more';
        moreBtn.textContent = 'Показать все даты (' + list.length + ')';
        moreBtn.addEventListener('click', function(){
          /* Кнопка прячет саму себя, и фокус вместе с ней улетал в body:
             дальше Tab шёл с начала страницы, а раскрытые кнопки брони
             пропускались. Запоминаем первую скрытую строку и переводим
             фокус на её кнопку — обход продолжается с того же места. */
          var firstHidden = null;
          Array.prototype.forEach.call(listEl.children, function(row){
            if (!firstHidden && row.hidden) firstHidden = row;
          });
          expanded = true;
          applyCollapse();
          var target = firstHidden && firstHidden.querySelector('a');
          if (target) target.focus();
        });
        listEl.parentNode.insertBefore(moreBtn, listEl.nextSibling);
        applyCollapse();
      }
    });
  }

  function initHeroSlider(root){
    var list = heroEvents();
    if (!list.length){ root.hidden = true; return; }

    var track = root.querySelector('[data-hb-track]');
    var dots  = root.querySelector('[data-hb-dots]');
    if (!track) return;
    track.innerHTML = list.map(heroSlideHTML).join('');
    if (dots){
      dots.innerHTML = list.map(function(item, i){
        return '<button class="bb-dot" type="button" data-hb-goto="' + i + '"' +
               ' aria-label="Слайд ' + (i + 1) + ': ' + esc(item.ev.title) + '"' +
               ' aria-pressed="' + String(i === 0) + '"></button>';
      }).join('');
    }

    /* Правки Максима 06.08 (PDF): смена слайдов — fade in/fade out.
       Слайды лежат стопкой (grid-area 1/1), активный получает .is-active
       и кроссфейдится по opacity. Свайп остаётся (просьба команды): жест
       ловим pointer-событиями, горизонтальный жест трекпада — по wheel;
       стрелки, точки и автопрокрутка ходят через тот же goTo */
    var idx = 0, timer = null, paused = false;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function syncDots(){
      if (!dots) return;
      Array.prototype.forEach.call(dots.children, function(d, j){
        d.setAttribute('aria-pressed', String(j === idx));
      });
    }
    function goTo(i){
      idx = (i + list.length) % list.length;
      Array.prototype.forEach.call(track.children, function(s, j){
        var active = j === idx;
        s.classList.toggle('is-active', active);
        /* Неактивный слайд невидим (opacity:0) и не кликается
           (pointer-events:none), но его ссылки и кнопки оставались в
           порядке обхода: на главной Tab уводил на «Подробнее» слайда,
           которого не видно. inert убирает их и из фокуса, и из
           экранного диктора. */
        if (active) { s.removeAttribute('inert'); } else { s.setAttribute('inert', ''); }
      });
      syncDots();
    }

    /* свайп пальцем: порог 40px, вертикальный скролл не трогаем
       (touch-action:pan-y в CSS); клики по кнопкам слайда дают dx≈0.
       Слайд целиком — ссылка на событие (.bb-slide__link), поэтому жест
       с заметным смещением гасит последующий click — свайп не должен
       уводить на страницу */
    var downX = null, swiped = false;
    track.addEventListener('pointerdown', function(e){ downX = e.clientX; swiped = false; });
    track.addEventListener('pointerup', function(e){
      if (downX === null) return;
      var dx = e.clientX - downX;
      downX = null;
      if (Math.abs(dx) > 8) swiped = true;
      if (Math.abs(dx) > 40) goTo(idx + (dx < 0 ? 1 : -1));
    });
    track.addEventListener('click', function(e){
      if (swiped){ e.preventDefault(); e.stopPropagation(); swiped = false; }
    }, true);
    track.addEventListener('pointercancel', function(){ downX = null; });
    track.addEventListener('dragstart', function(e){ e.preventDefault(); });

    /* горизонтальный жест трекпада: один щелчок листания на жест */
    var wheelLock = 0;
    track.addEventListener('wheel', function(e){
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      var now = Date.now();
      if (now - wheelLock < 500 || Math.abs(e.deltaX) < 12) return;
      wheelLock = now;
      goTo(idx + (e.deltaX > 0 ? 1 : -1));
    }, {passive: false});

    function tick(){
      if (paused) return;
      if (new Date().getTime() < manualUntil) return;   /* пауза после ручного листания */
      goTo(idx + 1);
    }
    function play(){
      if (reduceMotion || list.length < 2 || timer) return;
      timer = setInterval(tick, 6000);
    }
    function stop(){ if (timer){ clearInterval(timer); timer = null; } }

    /* ТЗ Сергея 17.08: после ручного переключения автопрокрутка молчит
       не меньше десяти секунд — иначе слайдер уводит гостя с того слайда,
       который он только что выбрал сам */
    var manualUntil = 0;
    function handled(){ manualUntil = new Date().getTime() + 10000; }
    root.addEventListener('click', function(e){
      var go = e.target.closest('[data-hb-goto]');
      if (go){ handled(); goTo(parseInt(go.getAttribute('data-hb-goto'), 10)); return; }
      var arrow = e.target.closest('[data-hb-dir]');
      if (arrow){ handled(); goTo(idx + parseInt(arrow.getAttribute('data-hb-dir'), 10)); }
    });

    /* ТЗ Сергея 17.08: один слайд — стрелки и точки не нужны */
    if (list.length < 2){
      Array.prototype.forEach.call(
        root.querySelectorAll('[data-hb-dir], [data-hb-dots]'),
        function(el){ el.hidden = true; }
      );
    }
    /* Руками начали листать — автопрокрутка не дёргает обратно. Наведение и
       касание держим раздельно: на десктопе пауза живёт, пока курсор или
       фокус на слайдере, и клик её не снимает; на телефоне пауза длится само
       касание. Раньше касание ставило общий флаг, а снимали его только
       mouseleave/focusout, которых на телефоне не бывает, — после первого
       касания слайдер вставал до перезагрузки страницы (найдено 16.08) */
    var overHover = false, overTouch = false;
    function syncPaused(){ paused = overHover || overTouch; }
    ['mouseenter', 'focusin'].forEach(function(evName){
      root.addEventListener(evName, function(){ overHover = true; syncPaused(); }, {passive: true});
    });
    ['mouseleave', 'focusout'].forEach(function(evName){
      root.addEventListener(evName, function(){ overHover = false; syncPaused(); }, {passive: true});
    });
    ['touchstart', 'pointerdown'].forEach(function(evName){
      root.addEventListener(evName, function(){ overTouch = true; syncPaused(); }, {passive: true});
    });
    ['touchend', 'touchcancel', 'pointerup', 'pointercancel'].forEach(function(evName){
      root.addEventListener(evName, function(){ overTouch = false; syncPaused(); }, {passive: true});
    });
    /* жест трекпадом по слайдеру — тоже пауза, но короткая: снимаем сами */
    var wheelPause = null;
    root.addEventListener('wheel', function(){
      overTouch = true; syncPaused();
      if (wheelPause) clearTimeout(wheelPause);
      wheelPause = setTimeout(function(){ overTouch = false; syncPaused(); }, 1200);
    }, {passive: true});
    document.addEventListener('visibilitychange', function(){
      if (document.hidden) stop(); else play();
    });

    goTo(0);
    play();
  }

  /* =================================================================
     1 · Полная афиша с фильтрами  [data-afisha]
     ================================================================= */
  /* Перестройка фильтров 24.07: календарь всегда на виду (не во вкладке),
     фильтра по дням недели нет (логика уже в календаре), фамилий артистов
     в фильтрах нет — конкретного артиста ищут поисковой строкой. Список —
     сетка в два ряда, дальше «Загрузить ещё». */
  function initAfisha(root){
    var monthLabel = root.querySelector('[data-af-month]');
    var monthPrev  = root.querySelector('[data-af-prev]');
    var monthNext  = root.querySelector('[data-af-next]');
    var daysWrap   = root.querySelector('[data-af-days]');
    var fmtWrap    = root.querySelector('[data-af-formats]');
    var sortWrap   = root.querySelector('[data-af-sorts]');
    var track      = root.querySelector('[data-af-track]');
    var emptyBox   = root.querySelector('[data-af-empty]');
    var presetWrap = root.querySelector('[data-af-presets]');
    var searchBox  = root.querySelector('[data-af-search]');
    var loadBtn    = root.querySelector('[data-af-load]');
    var moreBtn    = root.querySelector('[data-af-more]');
    var extraWrap  = root.querySelector('[data-af-extra]');
    if (!track) return;

    /* быстрые пресеты дат (импульсная аудитория): диапазон [от, до] */
    var PRESETS = [
      { key: 'today',    label: 'Сегодня' },
      { key: 'tomorrow', label: 'Завтра' },
      { key: 'weekend',  label: 'В эти выходные' },
      { key: 'nextweek', label: 'На следующей неделе' }
    ];
    function presetRange(key){
      var base = new Date(todayISO() + 'T00:00:00');
      function iso(d){ return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
      if (key === 'today')    return [todayISO(), todayISO()];
      if (key === 'tomorrow') return [shiftISO(1), shiftISO(1)];
      if (key === 'weekend'){
        var dow = base.getDay();                  /* 0=Вс … 6=Сб */
        if (dow === 0) return [todayISO(), todayISO()];   /* вс: последний день выходных */
        var sat = new Date(base); sat.setDate(sat.getDate() + (6 - dow));
        var sun = new Date(sat); sun.setDate(sun.getDate() + 1);
        return [iso(sat), iso(sun)];
      }
      if (key === 'nextweek'){
        var dw = base.getDay();
        var mon = new Date(base); mon.setDate(mon.getDate() + ((( 8 - dw) % 7) || 7));
        var sun2 = new Date(mon); sun2.setDate(sun2.getDate() + 6);
        return [iso(mon), iso(sun2)];
      }
      return null;
    }
    function inPreset(ev, key){
      var r = presetRange(key);
      return r ? (ev.date >= r[0] && ev.date <= r[1]) : true;
    }

    var SORTS = [
      { key: 'date',       label: 'Ближайшие сначала' },
      { key: 'price-asc',  label: 'Цена: по возрастанию' },
      { key: 'price-desc', label: 'Цена: по убыванию' }
    ];
    /* события без известной цены при ценовой сортировке уходят в конец
       (цены сняты с открытых виджетов продаж, есть не у всех) */
    function applySort(list, mode){
      if (mode === 'price-asc' || mode === 'price-desc'){
        var dir = mode === 'price-asc' ? 1 : -1;
        return list.slice().sort(function(a, b){
          if (a.priceFrom == null && b.priceFrom == null) return sortKey(a) < sortKey(b) ? -1 : 1;
          if (a.priceFrom == null) return 1;
          if (b.priceFrom == null) return -1;
          if (a.priceFrom !== b.priceFrom) return (a.priceFrom - b.priceFrom) * dir;
          return sortKey(a) < sortKey(b) ? -1 : 1;
        });
      }
      return list;   /* 'date' — базовый порядок по дате */
    }

    var events = upcoming();
    if (!events.length){
      track.innerHTML = '';
      if (emptyBox){ emptyBox.hidden = false; }
      return;
    }

    var months = [];
    events.forEach(function(ev){
      var k = monthKey(ev.date);
      if (months.indexOf(k) === -1) months.push(k);
    });

    /* состояние фильтров; восстановление после возврата из карточки.
       Правило месяцев (правка Саши, 16.08): показываем ВСЕ события
       выбранного месяца и только его — на августе весь август, перелистнул
       на сентябрь, видишь весь сентябрь. Прежнее правило 26.07 («текущий
       месяц = все ближайшие сквозь месяцы») этим отменено. Правило
       выводится из state.month на каждом рендере, отдельного флага нет */
    var state = { month: null, date: null, format: null, sort: 'date', preset: null, q: '' };
    try {
      var saved = JSON.parse(sessionStorage.getItem('club1-afisha') || 'null');
      if (saved && months.indexOf(saved.month) !== -1) state = saved;
      if (!state.sort) state.sort = 'date';
      if (!('preset' in state)) state.preset = null;
      if (typeof state.q !== 'string') state.q = '';
      delete state.dow; delete state.artist; delete state.all;   /* прошлые схемы */
    } catch (e) {}
    if (!state.month){
      var cur = monthKey(todayISO());
      state.month = months.indexOf(cur) !== -1 ? cur : months[0];
    }
    if (searchBox) searchBox.value = state.q;

    function save(){
      try { sessionStorage.setItem('club1-afisha', JSON.stringify(state)); } catch (e) {}
    }

    /* поиск по названию, жанру и категории; регистр и «ё» не важны */
    function norm(s){ return String(s).toLowerCase().replace(/ё/g, 'е'); }
    function matchesQuery(ev){
      if (!state.q) return true;
      var hay = norm(ev.title + ' ' + (ev.kind || '') + ' ' + (FORMATS[ev.format] || ''));
      return norm(state.q).split(/\s+/).every(function(tok){
        return !tok || hay.indexOf(tok) !== -1;
      });
    }

    function filtered(){
      /* поиск ищет по всей афише (не только по выбранному месяцу);
         активный пресет заменяет собой месяц и дату, формат — поверх */
      return events.filter(function(ev){
        if (!matchesQuery(ev)) return false;
        if (state.format && ev.format !== state.format) return false;
        if (state.q) return true;
        if (state.preset) return inPreset(ev, state.preset);
        if (state.date) return ev.date === state.date;
        /* Правка Анвера 19.08: афиша идёт непрерывной лентой — кончился
           август, ниже сразу сентябрь. Месяц больше не режет список (этим
           отменено правило Саши 16.08 «месяц целиком и только он»), он стал
           подписью над рейкой и меняется по мере прокрутки. Стрелки ‹ ›
           перематывают ленту к первой дате соседнего месяца. */
        return true;
      });
    }

    /* Пагинация (правка Саши, 16.08): «Загрузить ещё» больше нет — месяц
       выводится списком целиком. Механика догрузки осталась в коде и
       включается атрибутом data-af-limit="8" на блоке [data-afisha]:
       столько карточек на первом экране, столько же в каждой догрузке
       (правка Максима 13.08 — одинаковое наполнение на телефоне и на
       десктопе). Без атрибута ограничения нет и кнопка не появляется */
    var pageSize = parseInt(root.getAttribute('data-af-limit'), 10) || 0;
    var visible = 0;
    function batchSize(){ return pageSize || 8; }

    function render(){
      /* пресеты — вкладки (макет Максима 06.08, подтверждён 13.08); вкладка
         гаснет, если в диапазоне нет ни одного события. «Все мероприятия» —
         активна, пока не выбран пресет или конкретный день; клик сбрасывает
         и то и другое */
      if (presetWrap){
        presetWrap.innerHTML =
          '<button class="af-tab" type="button" data-preset="all"' +
          ' aria-pressed="' + String(!state.preset && !state.date) + '">Все мероприятия</button>' +
          PRESETS.map(function(p){
            var n = events.filter(function(ev){ return inPreset(ev, p.key); }).length;
            return '<button class="af-tab" type="button" data-preset="' + p.key + '"' +
                   (n ? '' : ' disabled title="Событий нет"') +
                   ' aria-pressed="' + String(state.preset === p.key) + '">' + p.label + '</button>';
          }).join('');
      }

      var mi = months.indexOf(state.month);
      if (monthLabel){
        monthLabel.textContent = MONTHS_NOM[parseInt(state.month.slice(5), 10) - 1];
      }
      if (monthPrev) monthPrev.disabled = mi <= 0;
      if (monthNext) monthNext.disabled = mi >= months.length - 1;

      /* Все ближайшие даты подряд, сквозь месяцы (правка Анвера 19.08):
         рейка — навигация по непрерывной ленте, а не список одного месяца */
      if (daysWrap){
        var dates = [];
        events.forEach(function(ev){
          if (dates.indexOf(ev.date) === -1) dates.push(ev.date);
        });
        dates.sort();
        var prevMk = null;
        daysWrap.innerHTML = dates.map(function(d){
          var dt = new Date(d + 'T00:00:00');
          var mk = monthKey(d), mark = '';
          /* смена месяца внутри сквозной рейки помечается словом, иначе
             «06» сразу после «30» читается как продолжение августа */
          /* Первую метку рисуем тоже, если лента начинается не с текущего
             месяца: иначе на телефоне, где подписи слева нет, первые даты
             оставались без названия месяца */
          if ((prevMk && mk !== prevMk) || (!prevMk && mk !== monthKey(todayISO()))){
            mark = '<span class="datebar__mark">' +
                   MONTHS_NOM[parseInt(mk.slice(5), 10) - 1] + '</span>';
          }
          prevMk = mk;
          return mark + '<button class="datebar__day" type="button" data-date="' + d + '"' +
                 ' aria-pressed="' + String(state.date === d) + '">' +
                 '<b>' + d.slice(8, 10) + '</b><span>' + DAYS_SHORT[dt.getDay()] + '</span></button>';
        }).join('');
      }

      /* форматы: «Все события» + только форматы, у которых есть события */
      if (fmtWrap){
        var keys = [];
        events.forEach(function(ev){
          if (keys.indexOf(ev.format) === -1) keys.push(ev.format);
        });
        var pills = '<button class="pill" type="button" data-format=""' +
                    ' aria-pressed="' + String(!state.format) + '">Все события</button>';
        keys.forEach(function(k){
          pills += '<button class="pill" type="button" data-format="' + esc(k) + '"' +
                   ' aria-pressed="' + String(state.format === k) + '">' + esc(FORMATS[k] || k) + '</button>';
        });
        fmtWrap.innerHTML = pills;
      }

      /* сортировка */
      if (sortWrap){
        sortWrap.innerHTML = SORTS.map(function(s){
          return '<button class="pill" type="button" data-sort="' + s.key + '"' +
                 ' aria-pressed="' + String(state.sort === s.key) + '">' + s.label + '</button>';
        }).join('');
      }

      /* «день = шоу»: повторные сеансы дня схлопнуты в одну карточку */
      var list = dedupeSameDay(applySort(filtered(), state.sort));
      if (pageSize && !visible) visible = batchSize();
      /* Разделитель месяца во всю ширину сетки (правка Анвера 19.08).
         Лента идёт непрерывно, но месяцы делили один ряд: рядом стояли
         29 августа и 6 сентября, и подпись над рейкой не понимала, какой
         месяц показывать. Разделитель начинает новый месяц с новой строки
         и служит якорем для перемотки стрелками. */
      var shown = pageSize ? list.slice(0, visible) : list;
      var lastMk = null;
      track.innerHTML = shown.map(function(ev, i){
        var mk = monthKey(ev.date), head = '';
        if (mk !== lastMk){
          lastMk = mk;
          head = '<div class="afisha__month" data-month="' + mk + '" aria-hidden="true">' +
                 MONTHS_NOM[parseInt(mk.slice(5), 10) - 1] + '</div>';
        }
        return head + cardHTML(ev, i);
      }).join('');
      if (loadBtn) loadBtn.hidden = !pageSize || list.length <= visible;
      if (emptyBox) emptyBox.hidden = list.length > 0;
      markCurrentDay();
      save();
    }

    /* любое изменение фильтров возвращает список к первым двум рядам */
    function rerender(){ visible = 0; render(); }

    /* ----------------------------------------------------------------
       Липкая рейка дат (правка Саши, 16.08; референс standupstore.ru).
       Рейка прилипает под шапкой, а активная дата ведётся по скроллу:
       подсвечивается день, чьи карточки сейчас у верхней кромки списка.
       Фильтры это не трогает — выбранная дата остаётся aria-pressed,
       «текущая по скроллу» живёт отдельным классом .is-current. Когда
       дата выбрана руками, ведём подсветку по ней: список из одного дня
       вести по скроллу нечем.
       ---------------------------------------------------------------- */
    var dateBar = root.querySelector('.datebar');
    var spyFrame = null;

    function scrollLine(){
      /* кромка отсчёта — низ липкой рейки, но не выше низа шапки: там, где
         рейка не липкая (блок афиши на главной), её box уезжает в минус и
         «текущим» вечно оставался бы первый день */
      var box = dateBar ? dateBar.getBoundingClientRect() : null;
      var head = document.querySelector('.site-header');
      var headBottom = head ? head.getBoundingClientRect().bottom : 88;
      return Math.max(box ? box.bottom : 0, headBottom) + 8;
    }
    function eventCards(){
      return Array.prototype.filter.call(track.children, function(el){
        return el.hasAttribute && el.hasAttribute('data-date');
      });
    }
    /* Какие дни сейчас на экране. Возвращаем СПИСОК, а не одну дату: в
       одном ряду сетки стоят карточки разных дней (19, 20, 20, 20, 21), и
       подсветка одной только первой заставляла рейку перепрыгивать через
       промежуточные числа при прокрутке — 19 → 22, будто 20 и 21 в афише
       нет (правка Анвера 19.08). Теперь горят все дни, попавшие в кадр. */
    function daysInView(){
      var line = scrollLine(), cards = eventCards();
      if (!cards.length) return [];
      var vh = window.innerHeight || document.documentElement.clientHeight;
      /* список целиком выше кромки — под рейкой уже отзывы и подвал */
      if (cards[cards.length - 1].getBoundingClientRect().bottom <= line) return [];
      /* сетка ещё не доехала до кромки */
      if (cards[0].getBoundingClientRect().top >= vh) return [];
      var out = [];
      for (var i = 0; i < cards.length; i++){
        var r = cards[i].getBoundingClientRect();
        if (r.bottom <= line || r.top >= vh) continue;
        var d = cards[i].getAttribute('data-date');
        if (d && out.indexOf(d) === -1) out.push(d);
      }
      return out;
    }

    function keepDayVisible(btn){
      var wrap = daysWrap.getBoundingClientRect(), b = btn.getBoundingClientRect();
      if (b.left < wrap.left) daysWrap.scrollLeft -= (wrap.left - b.left) + 28;
      else if (b.right > wrap.right) daysWrap.scrollLeft += (b.right - wrap.right) + 28;
    }
    function markCurrentDay(){
      spyFrame = null;
      if (!daysWrap || !daysWrap.children.length) return;
      var days = state.date ? [state.date]
               : ((state.preset || state.q) ? [] : daysInView());
      var btns = daysWrap.children, first = null;
      for (var i = 0; i < btns.length; i++){
        var d = btns[i].getAttribute && btns[i].getAttribute('data-date');
        var on = !!d && days.indexOf(d) !== -1;
        btns[i].classList.toggle('is-current', on);
        if (on && !first) first = btns[i];
      }
      if (first) keepDayVisible(first);
      /* Подпись месяца идёт за лентой: доскроллил до сентябрьских карточек —
         над рейкой встал «сентябрь». Берём месяц первого видимого дня. */
      if (days.length){
        var mk = monthKey(days[0]);
        if (mk !== state.month){
          state.month = mk;
          if (monthLabel) monthLabel.textContent = MONTHS_NOM[parseInt(mk.slice(5), 10) - 1];
          var mi2 = months.indexOf(mk);
          if (monthPrev) monthPrev.disabled = mi2 <= 0;
          if (monthNext) monthNext.disabled = mi2 >= months.length - 1;
        }
      }
    }

    function scheduleSpy(){
      if (spyFrame) return;
      spyFrame = window.requestAnimationFrame
        ? requestAnimationFrame(markCurrentDay)
        : setTimeout(markCurrentDay, 60);
    }
    window.addEventListener('scroll', scheduleSpy, {passive: true});

    if (presetWrap) presetWrap.addEventListener('click', function(e){
      var b = e.target.closest('[data-preset]');
      if (!b || b.disabled) return;
      var key = b.getAttribute('data-preset');
      if (key === 'all'){                       /* «Все мероприятия» = сброс дат */
        state.preset = null; state.date = null;
        rerender(); showListTop();
        return;
      }
      state.preset = state.preset === key ? null : key;
      if (state.preset){ state.date = null; }   /* пресет заменяет ручные даты */
      rerender(); showListTop();
    });
    /* «Ещё фильтры» (макет Максима 06.08): форматы и сортировка спрятаны
       в раскрывашку; активный фильтр из sessionStorage раскрывает её сам,
       чтобы применённое не оказалось невидимым */
    function openExtra(open){
      if (!extraWrap) return;
      extraWrap.hidden = !open;
      if (moreBtn){
        moreBtn.setAttribute('aria-expanded', String(open));
        moreBtn.classList.toggle('is-open', open);
      }
    }
    if (moreBtn && extraWrap){
      moreBtn.addEventListener('click', function(){ openExtra(extraWrap.hidden); });
      if (state.format || state.sort !== 'date') openExtra(true);
    }

    /* После смены фильтра список схлопывается, а страница остаётся там же,
       где стояла: выбрал «3 октября», листая октябрь, — и оказался в пустоте
       под единственной карточкой (правка Анвера 19.08). Показываем начало
       списка: подводим блок афиши под шапку и липкую рейку. Прокручиваем
       только вниз-вверх к списку, если он уже не в кадре целиком. */
    function showListTop(){
      var head = document.querySelector('.site-header');
      var bar  = root.querySelector('.datebar');
      var off  = (head ? head.getBoundingClientRect().height : 76) +
                 (bar ? bar.getBoundingClientRect().height : 0) + 12;
      var y = track.getBoundingClientRect().top + window.pageYOffset - off;
      y = Math.max(0, Math.round(y));
      if (Math.abs(window.pageYOffset - y) < 8) return;
      try { window.scrollTo({top: y, behavior: 'smooth'}); }
      catch (e) { window.scrollTo(0, y); }
    }

    /* Стрелки месяца прокручивают ленту к первой карточке соседнего месяца
       (правка Анвера 19.08). Раньше они переключали фильтр и подменяли весь
       список; теперь список непрерывен, и перематывать нужно именно его. */
    function jumpToMonth(mk){
      if (!mk) return;
      state.date = null; state.preset = null; state.month = mk;
      rerender();
      /* якорь перемотки — заголовок месяца, он всегда начинает новую строку */
      var target = track.querySelector('.afisha__month[data-month="' + mk + '"]');
      if (!target){
        var cards = eventCards();
        for (var i = 0; i < cards.length; i++){
          if (monthKey(cards[i].getAttribute('data-date') || '') === mk){ target = cards[i]; break; }
        }
      }
      if (!target) return;
      var head = document.querySelector('.site-header');
      var bar  = root.querySelector('.datebar');
      var off  = (head ? head.getBoundingClientRect().height : 76) +
                 (bar ? bar.getBoundingClientRect().height : 0) + 12;
      var y = target.getBoundingClientRect().top + window.pageYOffset - off;
      window.scrollTo({top: Math.max(0, y), behavior: 'smooth'});
    }
    if (monthPrev) monthPrev.addEventListener('click', function(){
      var mi = months.indexOf(state.month);
      if (mi > 0) jumpToMonth(months[mi - 1]);
    });
    if (monthNext) monthNext.addEventListener('click', function(){
      var mi = months.indexOf(state.month);
      if (mi < months.length - 1) jumpToMonth(months[mi + 1]);
    });
    if (daysWrap) daysWrap.addEventListener('click', function(e){
      var b = e.target.closest('[data-date]');
      if (!b) return;
      state.date = state.date === b.getAttribute('data-date') ? null : b.getAttribute('data-date');
      if (state.date){ state.preset = null; }
      rerender(); showListTop();
    });
    if (fmtWrap) fmtWrap.addEventListener('click', function(e){
      var b = e.target.closest('[data-format]');
      if (!b) return;
      state.format = b.getAttribute('data-format') || null;
      rerender(); showListTop();
    });
    if (sortWrap) sortWrap.addEventListener('click', function(e){
      var b = e.target.closest('[data-sort]');
      if (!b) return;
      state.sort = b.getAttribute('data-sort');
      rerender(); showListTop();
    });
    if (searchBox){
      var searchT = null;
      searchBox.addEventListener('input', function(){
        if (searchT) clearTimeout(searchT);
        searchT = setTimeout(function(){
          state.q = searchBox.value.trim();
          rerender();
        }, 180);
      });
    }
    if (loadBtn) loadBtn.addEventListener('click', function(){
      visible += batchSize();
      render();
    });
    root.addEventListener('click', function(e){
      if (e.target.closest('[data-af-reset]')){
        state.date = null; state.format = null; state.sort = 'date'; state.preset = null; state.q = '';
        state.month = monthKey(todayISO());
        if (searchBox) searchBox.value = '';
        rerender(); showListTop();
      }
    });

    /* смена ширины окна меняет число колонок — пока «Загрузить ещё» не
       нажимали, первый экран пересчитывается под новые два ряда */
    var loadedMore = false, resizeT = null;
    if (loadBtn) loadBtn.addEventListener('click', function(){ loadedMore = true; });
    window.addEventListener('resize', function(){
      if (loadedMore) return;
      if (resizeT) clearTimeout(resizeT);
      resizeT = setTimeout(rerender, 150);
    });

    render();
  }

  /* =================================================================
     2 · Рейка ближайших событий  [data-upcoming]
     ================================================================= */
  function initUpcoming(el){
    var except = el.getAttribute('data-upcoming-except');
    var limit  = parseInt(el.getAttribute('data-upcoming-limit'), 10) || 8;
    var list   = upcoming();
    if (except){
      list = list.filter(function(ev){ return ev.title !== except; });
    }
    /* Блок «Вам может понравиться» рекомендовал то самое событие, которое
       гость уже читает: на странице Риэлторского стендапа первой карточкой
       шёл он сам, с той же датой и ценой (аудит переходов 19.08). Страница
       события узнаёт себя по полю page и убирает себя из подборки —
       атрибут data-upcoming-except теперь нужен только для исключений
       по названию, а не для каждой страницы руками. */
    var file = (location.pathname.split('/').pop() || '').replace(/\.html$/, '');
    if (file && file !== 'index' && file !== 'afisha'){
      var self = EVENTS.filter(function(ev){ return ev.page === file; });
      if (self.length){
        var titles = {};
        self.forEach(function(ev){ titles[ev.title] = 1; });
        list = list.filter(function(ev){ return !titles[ev.title]; });
      }
    }
    el.innerHTML = dedupeSameDay(list).slice(0, limit).map(cardHTML).join('');
  }

  /* =================================================================
     3 · Карточки форматов  [data-format-next="key"]
     ----------------------------------------------------------------
     Дописывает ближайшую дату в [data-format-date], ведёт основную
     кнопку [data-format-cta] на ближайшее событие; если дат нет —
     кнопка остаётся якорем на описание ниже. [data-format-grid]
     сортирует карточки: с ближайшей датой раньше.
     ================================================================= */
  function initFormatCards(){
    /* текст кнопки живёт в [data-cta-label], чтобы svg-стрелка внутри
       кнопки переживала переименование (единые hover-состояния по ТЗ) */
    function setCta(cta, label, href){
      var labelEl = cta.querySelector('[data-cta-label]');
      if (labelEl) labelEl.textContent = label;
      else cta.textContent = label;
      cta.setAttribute('href', href);
    }
    var cards = Array.prototype.slice.call(document.querySelectorAll('[data-format-next]'));
    cards.forEach(function(card){
      var ev = nextForFormat(card.getAttribute('data-format-next'));
      var dateEl = card.querySelector('[data-format-date]');
      var cta = card.querySelector('[data-format-cta]');
      if (ev){
        if (dateEl) dateEl.textContent = 'Ближайшее: ' + fmtHuman(ev) + (ev.time ? ' в ' + ev.time : '');
        if (cta) setCta(cta, 'Смотреть ближайшие даты', ev.page);
        card.setAttribute('data-has-date', '1');
      } else {
        if (dateEl) dateEl.textContent = 'Дат пока нет — следите за афишей';
        if (cta) setCta(cta, 'Смотреть афишу', 'afisha');
      }
    });
    document.querySelectorAll('[data-format-grid]').forEach(function(grid){
      var items = Array.prototype.slice.call(grid.children);
      items.sort(function(a, b){
        var ea = nextForFormat(a.getAttribute('data-format-next'));
        var eb = nextForFormat(b.getAttribute('data-format-next'));
        if (!ea && !eb) return 0;
        if (!ea) return 1;
        if (!eb) return -1;
        return sortKey(ea) < sortKey(eb) ? -1 : 1;
      });
      items.forEach(function(it){ grid.appendChild(it); });
      /* нумерация «Формат NN» следует новому порядку */
      items.forEach(function(it, i){
        var num = it.querySelector('[data-format-num]');
        if (num) num.textContent = 'Формат ' + pad2(i + 1);
      });
    });
  }

  /* =================================================================
     4 · Комики  [data-comic="Имя Фамилия"] внутри [data-comics-grid]
     ----------------------------------------------------------------
     Карточка получает строку «Ближайший концерт: …», сетка сортируется
     (у кого есть даты — первыми, по дате), в биографический поп-ап
     дописывается кнопка брони на ближайший концерт. Клик по карточке
     по-прежнему открывает поп-ап — это «страница артиста» превью.
     ================================================================= */
  function initComics(){
    var grid = document.querySelector('[data-comics-grid]');
    if (!grid) return;
    var items = Array.prototype.slice.call(grid.querySelectorAll('[data-comic]'));
    if (!items.length) return;

    items.forEach(function(li){
      var ev = nextForArtist(li.getAttribute('data-comic'));
      if (!ev) return;
      var meta = li.querySelector('.comic-card__meta');
      var more = li.querySelector('.comic-card__more');
      if (meta){
        var chip = document.createElement('span');
        chip.className = 'comic-card__next';
        chip.textContent = 'Ближайший концерт: ' + fmtHuman(ev);
        meta.insertBefore(chip, more || null);
      }
      var opener = li.querySelector('[data-modal-open]');
      var modal = opener && document.getElementById(opener.getAttribute('data-modal-open'));
      var panel = modal && modal.querySelector('.modal__panel');
      if (panel && !panel.querySelector('.modal__cta')){
        var cta = document.createElement('div');
        cta.className = 'modal__cta';
        cta.innerHTML = ev.buy
          ? '<a class="btn btn--primary" href="' + esc(ev.buy) + '" target="_blank" rel="noopener">Бронировать места — ' + fmtHuman(ev) + '</a>'
          : '<a class="btn btn--primary" href="' + esc(ev.page) + '">Смотреть даты — ' + fmtHuman(ev) + '</a>';
        panel.appendChild(cta);
      }
    });

    items.sort(function(a, b){
      var ea = nextForArtist(a.getAttribute('data-comic'));
      var eb = nextForArtist(b.getAttribute('data-comic'));
      if (!ea && !eb) return 0;
      if (!ea) return 1;
      if (!eb) return -1;
      return sortKey(ea) < sortKey(eb) ? -1 : 1;
    });
    items.forEach(function(it){ grid.appendChild(it); });
  }

  /* =================================================================
     5 · Бегущая строка  [data-ticker]  (правки 24.07)
     ----------------------------------------------------------------
     Для сообщений об отмене или переносе мероприятий. Управляется из
     events.js: CLUB1_TICKER = { enabled:true, text:'…' } — полоска
     появляется над шапкой; выключена — разметка остаётся скрытой.
     ================================================================= */
  function initTicker(){
    var conf = window.CLUB1_TICKER;
    var bars = document.querySelectorAll('[data-ticker]');
    if (!bars.length) return;
    var on = !!(conf && conf.enabled && conf.text);
    Array.prototype.forEach.call(bars, function(bar){
      if (!on){ bar.hidden = true; return; }
      var run = '';
      for (var k = 0; k < 10; k++) run += '<span class="ticker__item">' + esc(conf.text) + '</span>';
      bar.innerHTML = '<div class="ticker__track">' + run + '</div>';
      bar.hidden = false;
    });
  }

  /* =================================================================
     Прошедшее событие — страница сама себя закрывает
     ----------------------------------------------------------------
     На страницах Жарова, Медстендапа и Бурлеска (аудит переходов 19.08)
     висела живая кнопка покупки на кассу закрытого сеанса: их снимали
     руками, и про три страницы забыли. Теперь страница смотрит в
     events.js: если её собственных будущих сеансов не осталось, кнопки
     кассы заменяются на «Смотреть афишу клуба», а под ними встаёт
     honest-строка «этот вечер уже прошёл». Руками снимать больше нечего.
     ================================================================= */
  function initPastEvent(){
    var file = (location.pathname.split('/').pop() || '').replace(/\.html$/, '');
    if (!file || file === 'index' || file === 'afisha') return;
    var mine = EVENTS.filter(function(ev){ return ev.page === file; });
    if (!mine.length) return;                       /* не страница события */
    var t = todayISO();
    var future = mine.filter(function(ev){ return ev.date >= t && !startedAlready(ev); });
    if (future.length) return;                      /* даты ещё впереди */

    var last = mine.slice().sort(function(a, b){ return a.date < b.date ? 1 : -1; })[0];
    var when = last ? fmtHuman(last) : '';

    var links = document.querySelectorAll('a[href*="intickets.ru"], a[href*="afisha.yandex.ru"]');
    Array.prototype.forEach.call(links, function(a){
      a.setAttribute('href', 'afisha');
      a.removeAttribute('target');
      a.removeAttribute('rel');
      a.textContent = 'Смотреть афишу клуба';
    });

    /* строку ставим один раз, рядом с первой парой кнопок */
    if (!document.querySelector('[data-past-note]')){
      var host = document.querySelector('.hero-cta, .cta-row, .datepick__book');
      if (host && host.parentNode){
        var note = document.createElement('p');
        note.className = 'desc__note';
        note.setAttribute('data-past-note', '');
        note.style.marginTop = '18px';
        note.innerHTML = 'Этот вечер уже прошёл' + (when ? ' (' + when + ')' : '') +
          '. Ближайших дат пока нет — посмотрите, что идёт в клубе, в ' +
          '<a href="afisha">афише</a>.';
        host.parentNode.insertBefore(note, host.nextSibling);
      }
    }
    /* датапик и расписание прошедшего события только путают */
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-schedule], .datepick'),
      function(el){ el.hidden = true; }
    );
  }

  /* --- boot ---------------------------------------------------------- */
  function boot(){
    initPastEvent();
    initTicker();
    document.querySelectorAll('[data-hero-slider]').forEach(initHeroSlider);
    document.querySelectorAll('[data-afisha]').forEach(initAfisha);
    document.querySelectorAll('[data-upcoming]').forEach(initUpcoming);
    initSchedule();
    initFormatCards();
    initComics();
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.Club1Afisha = {
    upcoming: upcoming,
    nextForFormat: nextForFormat,
    nextForArtist: nextForArtist,
    fmtHuman: fmtHuman
  };
})();
