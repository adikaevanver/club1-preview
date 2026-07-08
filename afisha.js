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
                            data-upcoming-first="Имя" — события этого
                            артиста первыми; data-upcoming-limit="8".
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

  function upcoming(){
    var t = todayISO();
    return EVENTS
      .filter(function(ev){ return ev.date >= t; })
      .sort(function(a, b){ return sortKey(a) < sortKey(b) ? -1 : 1; });
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
    var age = ev.age ? '<span class="poster__age">' + esc(ev.age) + '</span>' : '';
    var poster;
    if (ev.poster){
      poster =
        '<div class="poster poster--art">' +
          '<img class="poster__full" src="' + esc(ev.poster) + '" alt="Афиша: ' + esc(ev.title) + '" loading="lazy" width="800" height="800">' +
          badge +
        '</div>';
    } else {
      poster =
        '<div class="poster poster--' + esc(ev.tone || 'mag') + '">' +
          (ev.photo ? '<img class="poster__photo" src="' + esc(ev.photo) + '" alt="" aria-hidden="true" loading="lazy" width="900" height="900"><div class="poster__tint"></div>' : '') +
          badge +
          '<img class="poster__logo" src="assets/logo-white.svg" alt="" aria-hidden="true">' +
          '<div class="poster__art"><span class="poster__standup">STANDUP</span><span class="poster__solo">' + esc(ev.kind || '') + '</span></div>' +
          '<div class="poster__name"><b>' + esc(ev.title) + '</b></div>' +
          age +
        '</div>';
    }
    var cta = ev.buy
      ? '<a class="btn btn--primary btn--sm" href="' + esc(ev.buy) + '" target="_blank" rel="noopener">Бронировать места</a>'
      : '<a class="btn btn--primary btn--sm" href="#contacts">Узнать о старте продаж</a>';
    var price = ev.priceFrom
      ? '<p class="event-card__price">от ' + ev.priceFrom.toLocaleString('ru-RU') + ' ₽' +
        '<small>+ сервисный сбор 10%</small></p>'
      : '';
    return (
      '<article class="event-card" role="listitem">' +
        poster +
        '<h3 class="event-card__title">' + esc(ev.title) + '</h3>' +
        '<p class="event-card__meta">' + DAYS_FULL[dateOf(ev).getDay()] + ', ' + fmtShort(ev) +
          (ev.time ? ' · ' + esc(ev.time) : '') + ' · Новый Арбат, 21</p>' +
        price +
        '<div class="event-card__actions">' +
          '<a class="btn btn--ghost btn--sm" href="' + esc(ev.page) + '">Подробнее</a>' + cta +
        '</div>' +
      '</article>'
    );
  }

  /* =================================================================
     1 · Полная афиша с фильтрами  [data-afisha]
     ================================================================= */
  function initAfisha(root){
    var monthLabel = root.querySelector('[data-af-month]');
    var monthPrev  = root.querySelector('[data-af-prev]');
    var monthNext  = root.querySelector('[data-af-next]');
    var daysWrap   = root.querySelector('[data-af-days]');
    var dowWrap    = root.querySelector('[data-af-dows]');
    var fmtWrap    = root.querySelector('[data-af-formats]');
    var sortWrap   = root.querySelector('[data-af-sorts]');
    var track      = root.querySelector('[data-af-track]');
    var emptyBox   = root.querySelector('[data-af-empty]');
    if (!track) return;

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

    /* состояние фильтров; восстановление после возврата из карточки */
    var state = { month: null, date: null, dow: null, format: null, sort: 'date' };
    try {
      var saved = JSON.parse(sessionStorage.getItem('club1-afisha') || 'null');
      if (saved && months.indexOf(saved.month) !== -1) state = saved;
      if (!state.sort) state.sort = 'date';
    } catch (e) {}
    if (!state.month){
      var cur = monthKey(todayISO());
      state.month = months.indexOf(cur) !== -1 ? cur : months[0];
    }

    function save(){
      try { sessionStorage.setItem('club1-afisha', JSON.stringify(state)); } catch (e) {}
    }

    function filtered(){
      return events.filter(function(ev){
        if (monthKey(ev.date) !== state.month) return false;
        if (state.date && ev.date !== state.date) return false;
        if (state.dow !== null && dateOf(ev).getDay() !== state.dow) return false;
        if (state.format && ev.format !== state.format) return false;
        return true;
      });
    }

    function render(){
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

      /* дни недели */
      if (dowWrap){
        dowWrap.innerHTML = [1,2,3,4,5,6,0].map(function(dow){
          return '<button class="pill" type="button" data-dow="' + dow + '"' +
                 ' aria-pressed="' + String(state.dow === dow) + '">' + DAYS_FULL[dow] + '</button>';
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

      var list = applySort(filtered(), state.sort);
      track.innerHTML = list.map(cardHTML).join('');
      if (emptyBox) emptyBox.hidden = list.length > 0;
      save();
    }

    if (monthPrev) monthPrev.addEventListener('click', function(){
      var mi = months.indexOf(state.month);
      if (mi > 0){ state.month = months[mi - 1]; state.date = null; render(); }
    });
    if (monthNext) monthNext.addEventListener('click', function(){
      var mi = months.indexOf(state.month);
      if (mi < months.length - 1){ state.month = months[mi + 1]; state.date = null; render(); }
    });
    if (daysWrap) daysWrap.addEventListener('click', function(e){
      var b = e.target.closest('[data-date]');
      if (!b) return;
      state.date = state.date === b.getAttribute('data-date') ? null : b.getAttribute('data-date');
      if (state.date) state.dow = null;      /* дата и день недели вместе не имеют смысла */
      render();
    });
    if (dowWrap) dowWrap.addEventListener('click', function(e){
      var b = e.target.closest('[data-dow]');
      if (!b) return;
      var dow = parseInt(b.getAttribute('data-dow'), 10);
      state.dow = state.dow === dow ? null : dow;
      if (state.dow !== null) state.date = null;
      render();
    });
    if (fmtWrap) fmtWrap.addEventListener('click', function(e){
      var b = e.target.closest('[data-format]');
      if (!b) return;
      state.format = b.getAttribute('data-format') || null;
      render();
    });
    if (sortWrap) sortWrap.addEventListener('click', function(e){
      var b = e.target.closest('[data-sort]');
      if (!b) return;
      state.sort = b.getAttribute('data-sort');
      render();
    });
    root.addEventListener('click', function(e){
      if (e.target.closest('[data-af-reset]')){
        state.date = null; state.dow = null; state.format = null; state.sort = 'date';
        render();
      }
    });

    render();
  }

  /* =================================================================
     2 · Рейка ближайших событий  [data-upcoming]
     ================================================================= */
  function initUpcoming(el){
    var first = el.getAttribute('data-upcoming-first');
    var limit = parseInt(el.getAttribute('data-upcoming-limit'), 10) || 8;
    var list = upcoming();
    if (first){
      var mine   = list.filter(function(ev){ return ev.title === first; });
      var others = list.filter(function(ev){ return ev.title !== first; });
      list = mine.concat(others);
    }
    el.innerHTML = list.slice(0, limit).map(cardHTML).join('');
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
        if (cta) setCta(cta, 'Смотреть афишу', 'index.html#afisha');
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

  /* --- boot ---------------------------------------------------------- */
  function boot(){
    document.querySelectorAll('[data-afisha]').forEach(initAfisha);
    document.querySelectorAll('[data-upcoming]').forEach(initUpcoming);
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
