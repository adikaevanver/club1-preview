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
    function select(bar, day) {
      $$('.datebar__day', bar).forEach(function (d) {
        d.setAttribute('aria-pressed', String(d === day));
      });
      bar.dispatchEvent(new CustomEvent('datebar:change', {
        bubbles: true,
        detail: { date: day.getAttribute('data-date') || null, button: day }
      }));
    }

    function init() {
      $$('[data-datebar]').forEach(function (bar) {
        var days = $$('.datebar__day', bar);
        if (!days.length) return;

        // normalise: give each chip an aria-pressed if it lacks one
        days.forEach(function (d) {
          if (!d.hasAttribute('aria-pressed')) d.setAttribute('aria-pressed', 'false');
        });

        bar.addEventListener('click', function (e) {
          var day = e.target.closest('.datebar__day');
          if (day && !day.disabled && bar.contains(day)) select(bar, day);
        });
      });
    }
    return { init: init };
  })();


  /* --- boot --------------------------------------------------------- */
  function boot() {
    Modal.init();
    Tabs.init();
    Slideshow.init();
    Datebar.init();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();   // defer/late-inject safety net
  }

  // expose the modal API for pages that want to open/close programmatically
  window.Club1 = { openModal: Modal.open, closeModal: Modal.close };
})();
