/* =====================================================================
   CLUB №1 — script.js
   SHARED interactive components for the static site (vanilla, no deps).
   ---------------------------------------------------------------------
   Four components, each driven purely by data-attributes so a page only
   has to add markup (see the snippets in styles.css §12 / the handoff):

     1. MODAL     — [data-modal] root + [data-modal-open="id"] triggers
     2. TABS      — [data-tabs] with role="tab" / role="tabpanel"
     3. SLIDESHOW — [data-slideshow] wrapping .slideshow__track + [data-slide]
     4. DATEBAR   — [data-datebar] with .datebar__day chips

   Everything is namespaced so it never collides with the per-page inline
   scripts that already drive the header, burger and [data-slider] rails.
   Each initialiser is a no-op when its markup is absent — include this
   file on every page and only the present components wire up.

   Page authors add ONE line (defer keeps it off the critical path and
   makes DOMContentLoaded fire before this runs, but we guard anyway):
     <script src="script.js" defer></script>
   ===================================================================== */
(function () {
  "use strict";

  /* --- tiny helpers ------------------------------------------------- */
  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };
  var FOCUSABLE = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');


  /* =================================================================
     1 · MODAL  —  backdrop + centred panel, comedian-bio pop-up
     -----------------------------------------------------------------
     Root .modal[data-modal][hidden] is itself the backdrop; the panel
     is centred inside. Opens from any [data-modal-open="<modal-id>"].
     Closes on: the close button / any [data-modal-close], a click on
     the backdrop (outside the panel), and Escape. Locks body scroll,
     moves focus into the panel, traps Tab, and restores focus to the
     opener on close.
     ================================================================= */
  var Modal = (function () {
    var openEl = null;      // currently-open .modal element
    var opener = null;      // element that triggered it (focus returns here)
    var prevOverflow = '';  // body overflow to restore on close

    function panelOf(modal) { return $('.modal__panel', modal); }

    function open(modal, trigger) {
      if (!modal || openEl === modal) return;
      if (openEl) close(openEl, true);      // only one modal at a time
      openEl = modal;
      opener = trigger || document.activeElement;

      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';       // lock scroll

      modal.hidden = false;
      // next frame so the display flip settles before the opacity/lift transition
      requestAnimationFrame(function () { modal.classList.add('is-open'); });

      var panel = panelOf(modal);
      var first = panel ? $(FOCUSABLE, panel) : null;
      (first || panel || modal).focus();
    }

    function close(modal, immediate) {
      modal = modal || openEl;
      if (!modal) return;
      modal.classList.remove('is-open');
      document.body.style.overflow = prevOverflow;   // restore scroll

      var finish = function () { modal.hidden = true; };
      if (immediate) {
        finish();
      } else {
        var panel = panelOf(modal);
        var done = false;
        var end = function () { if (done) return; done = true; finish(); };
        if (panel) panel.addEventListener('transitionend', end, { once: true });
        setTimeout(end, 340);                         // fallback if no transition
      }

      if (openEl === modal) openEl = null;
      if (opener && typeof opener.focus === 'function') opener.focus();
      opener = null;
    }

    function trapTab(e) {
      if (!openEl || e.key !== 'Tab') return;
      var panel = panelOf(openEl);
      if (!panel) return;
      var f = $$(FOCUSABLE, panel).filter(function (el) {
        return el.offsetWidth || el.offsetHeight || el.getClientRects().length;
      });
      if (!f.length) { e.preventDefault(); panel.focus(); return; }
      var firstEl = f[0], lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault(); lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault(); firstEl.focus();
      }
    }

    function init() {
      // ensure every modal has a focusable panel + starts closed
      $$('[data-modal]').forEach(function (modal) {
        var panel = panelOf(modal);
        if (panel && !panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
        modal.hidden = true;
        modal.classList.remove('is-open');
      });

      // open triggers (delegated so dynamically-added triggers also work)
      document.addEventListener('click', function (e) {
        var trigger = e.target.closest('[data-modal-open]');
        if (!trigger) return;
        var modal = document.getElementById(trigger.getAttribute('data-modal-open'));
        if (!modal) return;
        e.preventDefault();
        open(modal, trigger);
      });

      // close: explicit [data-modal-close] OR a click on the backdrop itself
      document.addEventListener('click', function (e) {
        if (!openEl) return;
        if (e.target.closest('[data-modal-close]')) { close(openEl); return; }
        if (e.target === openEl) close(openEl);   // backdrop (outside the panel)
      });

      document.addEventListener('keydown', function (e) {
        if (!openEl) return;
        if (e.key === 'Escape') { e.preventDefault(); close(openEl); }
        else trapTab(e);
      });
    }

    return { init: init, open: open, close: close };
  })();


  /* =================================================================
     2 · TABS  —  pill tablist + panels, one panel visible at a time
     -----------------------------------------------------------------
     [data-tabs] scopes one group. Buttons role="tab" carry
     aria-controls="<panel-id>"; panels role="tabpanel". Selected tab
     gets aria-selected="true"; its panel is shown, the rest hidden.
     Roving tabindex + Left/Right/Home/End keyboard support.
     Fires a "tabs:change" CustomEvent on the group (detail.tab/panel).
     ================================================================= */
  var Tabs = (function () {
    function select(group, tab, focus) {
      var tabs = $$('[role="tab"]', group);
      if (tabs.indexOf(tab) === -1) return;
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
      group.dispatchEvent(new CustomEvent('tabs:change', {
        bubbles: true,
        detail: { tab: tab, panel: document.getElementById(tab.getAttribute('aria-controls')) }
      }));
    }

    function init() {
      $$('[data-tabs]').forEach(function (group) {
        var tabs = $$('[role="tab"]', group);
        if (!tabs.length) return;

        // normalise initial state: honour a pre-set aria-selected, else first
        var current = tabs.filter(function (t) {
          return t.getAttribute('aria-selected') === 'true';
        })[0] || tabs[0];
        select(group, current, false);

        group.addEventListener('click', function (e) {
          var tab = e.target.closest('[role="tab"]');
          if (tab && tabs.indexOf(tab) !== -1) select(group, tab, false);
        });

        group.addEventListener('keydown', function (e) {
          var tab = e.target.closest('[role="tab"]');
          if (!tab) return;
          var i = tabs.indexOf(tab), n = tabs.length, next = -1;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % n;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + n) % n;
          else if (e.key === 'Home') next = 0;
          else if (e.key === 'End') next = n - 1;
          if (next !== -1) { e.preventDefault(); select(group, tabs[next], true); }
        });
      });
    }

    return { init: init };
  })();


  /* =================================================================
     3 · SLIDESHOW  —  horizontal scroll-snap photo rail
     -----------------------------------------------------------------
     [data-slideshow] wraps a .slideshow__track (the scroll viewport)
     and prev/next buttons marked [data-slide="prev"|"next"] (styled
     with the shared .slider-arrow). Scrolls by ~80% of the viewport.
     Arrow disabled-state reflects scroll position.
     ================================================================= */
  var Slideshow = (function () {
    function init() {
      $$('[data-slideshow]').forEach(function (root) {
        var track = $('.slideshow__track', root);
        if (!track) return;
        var btns = $$('[data-slide]', root);

        function step() { return Math.max(track.clientWidth * 0.8, 240); }

        function syncArrows() {
          var max = track.scrollWidth - track.clientWidth - 1;
          btns.forEach(function (b) {
            var prev = b.getAttribute('data-slide') === 'prev';
            var atEnd = prev ? track.scrollLeft <= 0 : track.scrollLeft >= max;
            b.disabled = max <= 0 || atEnd;
          });
        }

        btns.forEach(function (b) {
          b.addEventListener('click', function () {
            var dir = b.getAttribute('data-slide') === 'prev' ? -1 : 1;
            track.scrollBy({ left: dir * step(), behavior: 'smooth' });
          });
        });

        track.addEventListener('scroll', syncArrows, { passive: true });
        window.addEventListener('resize', syncArrows, { passive: true });
        syncArrows();
      });
    }
    return { init: init };
  })();


  /* =================================================================
     4 · DATEBAR  —  month label + selectable day chips
     -----------------------------------------------------------------
     [data-datebar] holds a .datebar__month label and .datebar__day
     chips (each ideally carrying data-date="YYYY-MM-DD"). Single-select
     within the bar via aria-pressed, matching the .pill white-fill look.
     Fires a "datebar:change" CustomEvent (detail.date / detail.button).
     ================================================================= */
  var Datebar = (function () {
    var MONTHS = ['января','февраля','марта','апреля','мая','июня',
                  'июля','августа','сентября','октября','ноября','декабря'];
    var MONTHS_NOM = ['ЯНВАРЬ','ФЕВРАЛЬ','МАРТ','АПРЕЛЬ','МАЙ','ИЮНЬ',
                      'ИЮЛЬ','АВГУСТ','СЕНТЯБРЬ','ОКТЯБРЬ','НОЯБРЬ','ДЕКАБРЬ'];
    var WEEKDAYS = ['воскресенье','понедельник','вторник','среда',
                    'четверг','пятница','суббота'];

    function today() {
      var t = new Date();
      return new Date(t.getFullYear(), t.getMonth(), t.getDate());
    }

    function parse(day) {
      var v = day.getAttribute('data-date');
      if (!v) return null;
      var p = v.split('-');
      if (p.length !== 3) return null;
      return new Date(+p[0], +p[1] - 1, +p[2]);
    }

    /* Дата на странице живёт в нескольких местах: подпись под рейкой,
       кнопка брони, бейдж на афише, плашка с датой и мобильный CTA.
       Обновляем их одним проходом по data-picked-*, чтобы страница не
       осталась с датой, которая уже прошла. */
    function paint(day) {
      var d = parse(day);
      var label = day.getAttribute('data-label') || '';
      var time = day.getAttribute('data-time') || '';
      var buy = day.getAttribute('data-buy') || '';

      $$('[data-picked-date]').forEach(function (el) { el.textContent = label; });
      $$('[data-picked-time]').forEach(function (el) { if (time) el.textContent = time; });
      $$('[data-picked-buy]').forEach(function (el) { if (buy) el.setAttribute('href', buy); });

      if (d) {
        var dd = ('0' + d.getDate()).slice(-2);
        var mm = ('0' + (d.getMonth() + 1)).slice(-2);
        $$('[data-picked-badge]').forEach(function (el) {
          el.innerHTML = dd + '.' + mm + (time ? '<small>' + time + '</small>' : '');
        });
        $$('[data-picked-meta]').forEach(function (el) {
          var sub = WEEKDAYS[d.getDay()] + (time ? ', ' + time : '');
          el.innerHTML = label + '<small>' + sub + '</small>';
        });
      }
    }

    function select(bar, day) {
      $$('.datebar__day', bar).forEach(function (d) {
        d.setAttribute('aria-pressed', String(d === day));
      });
      paint(day);
      bar.dispatchEvent(new CustomEvent('datebar:change', {
        bubbles: true,
        detail: { date: day.getAttribute('data-date') || null, button: day }
      }));
    }

    /* Месяцы в подписи рейки («АВГУСТ — СЕНТЯБРЬ») пересобираем по тем
       датам, что остались: иначе после скрытия прошедших в заголовке
       висел бы месяц, которого в списке уже нет. */
    function relabel(bar, days) {
      var el = $('.datebar__month', bar);
      if (!el) return;
      var names = [];
      days.forEach(function (d) {
        var p = parse(d);
        if (!p) return;
        var n = MONTHS_NOM[p.getMonth()];
        if (names.indexOf(n) === -1) names.push(n);
      });
      if (names.length) el.textContent = names.join(' — ');
    }

    function init() {
      var now = today();

      $$('[data-datebar]').forEach(function (bar) {
        var days = $$('.datebar__day', bar);
        if (!days.length) return;

        days.forEach(function (d) {
          if (!d.hasAttribute('aria-pressed')) d.setAttribute('aria-pressed', 'false');
        });

        /* Прошедшие даты убираем из рейки. До этого они оставались на
           странице и могли быть выбраны по умолчанию: 8 августа
           страница Чабдарова показывала «Выбрана дата: 1 августа». */
        var upcoming = days.filter(function (d) {
          var p = parse(d);
          if (p && p < now) {
            d.hidden = true;
            d.disabled = true;
            d.setAttribute('aria-pressed', 'false');
            return false;
          }
          return true;
        });

        if (!upcoming.length) {
          bar.setAttribute('data-datebar-empty', '');
          bar.dispatchEvent(new CustomEvent('datebar:empty', { bubbles: true }));
        } else {
          relabel(bar, upcoming);
          var pressed = upcoming.filter(function (d) {
            return d.getAttribute('aria-pressed') === 'true';
          })[0];
          select(bar, pressed || upcoming[0]);
        }

        bar.addEventListener('click', function (e) {
          var day = e.target.closest('.datebar__day');
          if (day && !day.disabled && bar.contains(day)) select(bar, day);
        });
      });
    }
    return { init: init };
  })();


  /* --- StickyCta ----------------------------------------------------
     Мобильная плашка брони прячется, пока герой-кнопки брони видны на
     экране (аудит 06.08: на короткой шапке Комарова плашка перекрывала
     кнопки целиком). Без IntersectionObserver — поведение прежнее. */
  var StickyCta = (function () {
    function init() {
      var sticky  = document.querySelector('.sticky-cta');
      var heroCta = document.querySelector('.hero-cta, .cta-row');
      if (!sticky || !heroCta || !('IntersectionObserver' in window)) return;
      var io = new IntersectionObserver(function (entries) {
        sticky.classList.toggle('is-suppressed', entries[0].isIntersecting);
      }, { threshold: 0.4 });
      io.observe(heroCta);
    }
    return { init: init };
  })();

  /* =================================================================
     5 · LIGHTBOX — [data-lightbox] контейнер, его <img> открываются
         во весь экран (правка Анвера 09.08: фотографии зала висели
         картинками, по которым гость тыкал впустую).

     Разметка не нужна: компонент сам делает картинки кнопками, сам
     собирает оверлей и сам его убирает. Внутри одного контейнера
     работают стрелки и свайп, Esc и клик по фону закрывают.
     Отсутствие [data-lightbox] на странице — no-op.
     ================================================================= */
  var Lightbox = (function () {
    var box, imgEl, capEl, cntEl, items = [], idx = 0, opener = null;

    function build() {
      if (box) return;
      box = document.createElement('div');
      box.className = 'lightbox';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-label', 'Просмотр фотографии');
      box.hidden = true;
      box.innerHTML =
        '<button class="lightbox__close" type="button" aria-label="Закрыть">&times;</button>' +
        '<button class="lightbox__nav lightbox__nav--prev" type="button" aria-label="Предыдущее фото">&lsaquo;</button>' +
        '<figure class="lightbox__fig">' +
          '<img class="lightbox__img" alt="">' +
          '<figcaption class="lightbox__cap"></figcaption>' +
        '</figure>' +
        '<button class="lightbox__nav lightbox__nav--next" type="button" aria-label="Следующее фото">&rsaquo;</button>' +
        '<span class="lightbox__count" aria-hidden="true"></span>';
      document.body.appendChild(box);
      imgEl = $('.lightbox__img', box);
      capEl = $('.lightbox__cap', box);
      cntEl = $('.lightbox__count', box);

      box.addEventListener('click', function (e) {
        if (e.target.closest('.lightbox__close') || e.target === box ||
            e.target.classList.contains('lightbox__fig')) { close(); return; }
        if (e.target.closest('.lightbox__nav--prev')) step(-1);
        if (e.target.closest('.lightbox__nav--next')) step(1);
      });

      /* свайп пальцем — тот же жест, что ждут от фотогалереи */
      var x0 = null;
      box.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      box.addEventListener('touchend', function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 45) step(dx < 0 ? 1 : -1);
        x0 = null;
      }, { passive: true });
    }

    function show(i) {
      idx = (i + items.length) % items.length;
      var src = items[idx];
      imgEl.src = src.full;
      imgEl.alt = src.alt;
      capEl.textContent = src.cap || '';
      capEl.hidden = !src.cap;
      cntEl.textContent = items.length > 1 ? (idx + 1) + ' / ' + items.length : '';
      $('.lightbox__nav--prev', box).hidden = items.length < 2;
      $('.lightbox__nav--next', box).hidden = items.length < 2;
    }
    function step(d) { show(idx + d); }

    function open(list, i, from) {
      build();
      items = list; opener = from || null;
      show(i);
      box.hidden = false;
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(function () { box.classList.add('is-open'); });
      $('.lightbox__close', box).focus();
    }
    function close() {
      if (!box || box.hidden) return;
      box.classList.remove('is-open');
      box.hidden = true;
      document.body.style.overflow = '';
      imgEl.src = '';
      if (opener) { opener.focus(); opener = null; }
    }

    function init() {
      var roots = $$('[data-lightbox]');
      if (!roots.length) return;

      roots.forEach(function (root) {
        var imgs = $$('img', root);
        var list = imgs.map(function (im) {
          var fig = im.closest('figure');
          var cap = fig ? $('figcaption', fig) : null;
          return {
            full: im.getAttribute('data-full') || im.currentSrc || im.src,
            alt: im.getAttribute('alt') || '',
            cap: cap ? cap.textContent.trim() : (im.getAttribute('alt') || '')
          };
        });
        imgs.forEach(function (im, i) {
          im.classList.add('is-zoomable');
          /* картинка сама не фокусируется — оборачиваем в кнопку, чтобы
             открывалось и с клавиатуры, и читалось скринридером */
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'zoom-btn';
          btn.setAttribute('aria-label', 'Открыть фото во весь экран: ' + (list[i].cap || 'фотография зала'));
          im.parentNode.insertBefore(btn, im);
          btn.appendChild(im);
          btn.addEventListener('click', function () { open(list, i, btn); });
        });
      });

      document.addEventListener('keydown', function (e) {
        if (!box || box.hidden) return;
        if (e.key === 'Escape') { e.preventDefault(); close(); }
        if (e.key === 'ArrowLeft') step(-1);
        if (e.key === 'ArrowRight') step(1);
      });
    }

    return { init: init, open: open, close: close };
  })();


  /* --- boot --------------------------------------------------------- */
  function boot() {
    Modal.init();
    Tabs.init();
    Slideshow.init();
    Datebar.init();
    StickyCta.init();
    Lightbox.init();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();   // defer/late-inject safety net
  }

  // expose the modal API for pages that want to open/close programmatically
  window.Club1 = { openModal: Modal.open, closeModal: Modal.close };
})();
