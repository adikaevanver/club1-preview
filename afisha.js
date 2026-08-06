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

  function upcoming(){
    var t = todayISO();
    return EVENTS
      .filter(function(ev){ return ev.date >= t; })
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
  function cardHTML(ev){
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
      poster =
        '<div class="poster poster--art">' +
          '<img class="poster__full" src="' + esc(ev.poster) + '" alt="Афиша: ' + esc(ev.title) + '" loading="lazy" width="800" height="800">' +
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
    poster = '<a class="poster-link" href="' + esc(ev.page) + '" aria-label="Подробнее: ' + esc(ev.title) + '">' + poster + '</a>';
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
    var price = ev.priceFrom
      ? '<p class="event-card__price">от ' + ev.priceFrom.toLocaleString('ru-RU') + ' ₽</p>'
      : '';
    /* слитая карточка (dedupeSameDay) несёт все времена дня: «16:00 и 18:30» */
    var times = (ev.times && ev.times.length ? ev.times : (ev.time ? [ev.time] : []))
                  .map(esc).join(' и ');
    return (
      '<article class="event-card" role="listitem">' +
        poster +
        '<h3 class="event-card__title">' + esc(ev.title) + '</h3>' +
        '<p class="event-card__meta">' + DAYS_FULL[dateOf(ev).getDay()] + ', ' + fmtShort(ev) +
          (times ? ' · ' + times : '') + ' · Новый Арбат, 21</p>' +
        price +
        '<div class="event-card__actions">' +
          '<a class="btn btn--ghost btn--sm" href="' + esc(ev.page) + '">Подробнее</a>' + cta +
        '</div>' +
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
    var solo   = out.filter(function(it){ return it.ev.format === 'solniki'; });
    var others = out.filter(function(it){ return it.ev.format !== 'solniki'; });
    return solo.concat(others).slice(0, 6);
  }

  /* макет Максима 22.07 (ранний вариант выбран на созвоне 24.07 как
     основа): текст рядом с афишей не дублируется — афиша сама несёт
     информацию, на слайде остаются даты, маркировка 18+ и кнопки.
     Есть широкая афиша (ev.wide) → она фоном всего слайда, как в
     референсе; нет — квадратная афиша по центру на размытой подложке */
  function heroSlideHTML(item, i){
    var ev = item.ev;
    var chips = item.dates.slice(0, 2).map(function(d){
      return '<span class="bb-chip"><b>' + fmtShort(d) + '</b>' +
             (d.time ? '<small>' + esc(d.time) + '</small>' : '') + '</span>';
    }).join('');
    var cta = ev.buy
      ? '<a class="btn btn--primary" href="' + esc(ev.buy) + '" target="_blank" rel="noopener">Бронировать места</a>'
      : '<a class="btn btn--primary" href="#contacts">Узнать о старте продаж</a>';
    var actions = '<div class="bb-slide__actions">' +
                    '<a class="btn btn--ghost" href="' + esc(ev.page) + '">Подробнее</a>' + cta +
                  '</div>';
    if (ev.wide){
      return (
        '<article class="bb-slide bb-slide--wide" role="group" aria-roledescription="слайд" aria-label="' + esc(ev.title) + ', ' + fmtHuman(ev) + '">' +
          '<div class="bb-slide__bg bb-slide__bg--wide" style="background-image:url(\'' + esc(ev.wide) + '\')" aria-hidden="true"></div>' +
          '<div class="bb-slide__stage">' +
            '<div class="bb-slide__chips">' + chips + '</div>' +
            '<span class="bb-slide__age bb-slide__age--corner">' + esc(ev.age || '18+') + '</span>' +
            actions +
          '</div>' +
        '</article>'
      );
    }
    var art;
    if (ev.poster){
      art = '<img class="bb-slide__poster" src="' + esc(ev.poster) + '" alt="Афиша: ' + esc(ev.title) + '"' +
            (i ? ' loading="lazy"' : '') + ' width="800" height="800">';
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
    return (
      '<article class="bb-slide" role="group" aria-roledescription="слайд" aria-label="' + esc(ev.title) + ', ' + fmtHuman(ev) + '">' +
        bg +
        '<div class="bb-slide__stage">' +
          '<div class="bb-slide__chips">' + chips + '</div>' +
          '<div class="bb-slide__art">' + art + '</div>' +
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
          expanded = true;
          applyCollapse();
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

    /* трек — нативный горизонтальный скролл со снапом: свайп пальцем на
       телефоне и двумя пальцами по трекпаду работают сами; стрелки, точки
       и автопрокрутка ездят через scrollTo по тому же скроллу */
    var idx = 0, timer = null, paused = false;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function syncDots(){
      if (!dots) return;
      Array.prototype.forEach.call(dots.children, function(d, j){
        d.setAttribute('aria-pressed', String(j === idx));
      });
    }
    function goTo(i, instant){
      idx = (i + list.length) % list.length;
      track.scrollTo({
        left: idx * track.clientWidth,
        behavior: (instant || reduceMotion) ? 'auto' : 'smooth'
      });
      syncDots();
    }

    /* индекс следует за живым скроллом (свайп/трекпад), точки не отстают */
    var scrollT = null;
    track.addEventListener('scroll', function(){
      if (scrollT) clearTimeout(scrollT);
      scrollT = setTimeout(function(){
        var i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        idx = Math.max(0, Math.min(list.length - 1, i));
        syncDots();
      }, 80);
    }, {passive: true});
    window.addEventListener('resize', function(){ goTo(idx, true); });

    function tick(){ if (!paused) goTo(idx + 1); }
    function play(){
      if (reduceMotion || list.length < 2 || timer) return;
      timer = setInterval(tick, 6000);
    }
    function stop(){ if (timer){ clearInterval(timer); timer = null; } }

    root.addEventListener('click', function(e){
      var go = e.target.closest('[data-hb-goto]');
      if (go){ goTo(parseInt(go.getAttribute('data-hb-goto'), 10)); return; }
      var arrow = e.target.closest('[data-hb-dir]');
      if (arrow){ goTo(idx + parseInt(arrow.getAttribute('data-hb-dir'), 10)); }
    });
    /* руками начали листать — автопрокрутка не дёргает обратно */
    ['mouseenter', 'focusin', 'touchstart', 'pointerdown', 'wheel'].forEach(function(evName){
      root.addEventListener(evName, function(){ paused = true; }, {passive: true});
    });
    ['mouseleave', 'focusout'].forEach(function(evName){
      root.addEventListener(evName, function(){ paused = false; });
    });
    document.addEventListener('visibilitychange', function(){
      if (document.hidden) stop(); else play();
    });

    goTo(0, true);
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
       Правило месяцев (Анвер, 26.07): выбран ТЕКУЩИЙ месяц — показываем
       все ближайшие события сквозь месяцы; перелистнул на другой месяц —
       только события этого месяца. Правило выводится из state.month на
       каждом рендере, отдельного флага нет — протухать нечему, и после
       перезагрузки на текущем месяце список снова полный */
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
      var curMonth = monthKey(todayISO());
      return events.filter(function(ev){
        if (!matchesQuery(ev)) return false;
        if (state.format && ev.format !== state.format) return false;
        if (state.q) return true;
        if (state.preset) return inPreset(ev, state.preset);
        if (state.date) return ev.date === state.date;
        /* текущий месяц = все ближайшие; другой месяц = только он */
        if (state.month === curMonth) return true;
        return monthKey(ev.date) === state.month;
      });
    }

    /* «Загрузить ещё»: первый экран — два ряда карточек, сколько бы
       колонок ни поместилось; каждая догрузка добавляет ещё два ряда */
    var visible = 0;
    function batchSize(){
      var cols = 1;
      try {
        cols = (getComputedStyle(track).gridTemplateColumns || '')
                 .split(' ').filter(Boolean).length || 1;
      } catch (e) {}
      return Math.max(2, cols * 2);
    }

    function render(){
      /* пресеты: пилюля гаснет, если в диапазоне нет ни одного события */
      if (presetWrap){
        presetWrap.innerHTML = PRESETS.map(function(p){
          var n = events.filter(function(ev){ return inPreset(ev, p.key); }).length;
          return '<button class="pill" type="button" data-preset="' + p.key + '"' +
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

      /* дни месяца, в которые есть события */
      if (daysWrap){
        var dates = [];
        events.forEach(function(ev){
          if (monthKey(ev.date) === state.month && dates.indexOf(ev.date) === -1) dates.push(ev.date);
        });
        daysWrap.innerHTML = dates.map(function(d){
          var dt = new Date(d + 'T00:00:00');
          return '<button class="datebar__day" type="button" data-date="' + d + '"' +
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
      if (!visible) visible = batchSize();
      track.innerHTML = list.slice(0, visible).map(cardHTML).join('');
      if (loadBtn) loadBtn.hidden = list.length <= visible;
      if (emptyBox) emptyBox.hidden = list.length > 0;
      save();
    }

    /* любое изменение фильтров возвращает список к первым двум рядам */
    function rerender(){ visible = 0; render(); }

    if (presetWrap) presetWrap.addEventListener('click', function(e){
      var b = e.target.closest('[data-preset]');
      if (!b || b.disabled) return;
      var key = b.getAttribute('data-preset');
      state.preset = state.preset === key ? null : key;
      if (state.preset){ state.date = null; }   /* пресет заменяет ручные даты */
      rerender();
    });
    if (monthPrev) monthPrev.addEventListener('click', function(){
      var mi = months.indexOf(state.month);
      if (mi > 0){ state.month = months[mi - 1]; state.date = null; state.preset = null; rerender(); }
    });
    if (monthNext) monthNext.addEventListener('click', function(){
      var mi = months.indexOf(state.month);
      if (mi < months.length - 1){ state.month = months[mi + 1]; state.date = null; state.preset = null; rerender(); }
    });
    if (daysWrap) daysWrap.addEventListener('click', function(e){
      var b = e.target.closest('[data-date]');
      if (!b) return;
      state.date = state.date === b.getAttribute('data-date') ? null : b.getAttribute('data-date');
      if (state.date){ state.preset = null; }
      rerender();
    });
    if (fmtWrap) fmtWrap.addEventListener('click', function(e){
      var b = e.target.closest('[data-format]');
      if (!b) return;
      state.format = b.getAttribute('data-format') || null;
      rerender();
    });
    if (sortWrap) sortWrap.addEventListener('click', function(e){
      var b = e.target.closest('[data-sort]');
      if (!b) return;
      state.sort = b.getAttribute('data-sort');
      rerender();
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
        rerender();
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
        if (cta) setCta(cta, 'Смотреть афишу', 'afisha.html');
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

  /* --- boot ---------------------------------------------------------- */
  function boot(){
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
