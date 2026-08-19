/* =====================================================================
   analytics.js · счётчик, цели и рекламные метки
   ---------------------------------------------------------------------
   Сам счётчик Метрики подключён в <head> каждой страницы — он должен
   успеть загрузиться до этого файла. Здесь то, что счётчик сам не умеет:

   1. Цели. Метрика не знает, что уход на iframeab-pre7764.intickets.ru
      или widget.afisha.yandex.ru — это попытка покупки. Отправляем
      buy_click руками, иначе воронка обрывается на входе в кассу.

   2. Рекламная метка. Гость приходит по объявлению на посадочную,
      гуляет по сайту и жмёт «купить» уже с другой страницы — в адресе
      метки нет, и заказ в кассе остаётся без источника (на старом
      сайте так потерялись 72 заказа из 76). Запоминаем метку первого
      захода и подставляем её в ссылку кассы.

   Счётчик у нового сайта свой. Номер стоит ещё и в <head> каждой
   страницы — менять оба места разом, иначе цели будут уходить в один
   счётчик, а просмотры страниц в другой.
   ===================================================================== */
(function () {
  'use strict';

  var COUNTER = 111571199;
  var KEY = 'club1-utm';
  var MARKS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content',
               'utm_term', 'yclid', 'gclid', 'ymclid', 'from'];
  var CASHDESK = /(intickets\.ru|widget\.afisha\.yandex\.ru|afisha\.yandex\.ru)/i;

  function ym() {
    if (typeof window.ym === 'function') {
      window.ym.apply(null, arguments);
    }
  }

  function goal(name, params) {
    ym(COUNTER, 'reachGoal', name, params || {});
  }

  /* ---- 1. метка первого захода ------------------------------------ */
  function readMarks() {
    var q = new URLSearchParams(location.search);
    var found = {};
    MARKS.forEach(function (k) {
      var v = q.get(k);
      if (v) found[k] = v;
    });
    return Object.keys(found).length ? found : null;
  }

  function storedMarks() {
    try {
      return JSON.parse(sessionStorage.getItem(KEY) || 'null');
    } catch (e) {
      return null;
    }
  }

  var fresh = readMarks();
  if (fresh) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(fresh));
    } catch (e) { /* приватный режим — просто живём без метки */ }
  }
  var marks = fresh || storedMarks();

  /* Метка дописывается в ссылку кассы в момент клика, а не при загрузке:
     часть ссылок афиша рисует уже после старта страницы. */
  function withMarks(href) {
    if (!marks) return href;
    var u;
    try {
      u = new URL(href, location.href);
    } catch (e) {
      return href;
    }
    Object.keys(marks).forEach(function (k) {
      if (!u.searchParams.has(k)) u.searchParams.set(k, marks[k]);
    });
    return u.toString();
  }

  /* ---- 2. цели ----------------------------------------------------- */
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';

    if (CASHDESK.test(href)) {
      var tagged = withMarks(href);
      if (tagged !== href) a.setAttribute('href', tagged);
      goal('buy_click', {
        page: location.pathname,
        label: (a.textContent || '').trim().slice(0, 60)
      });
      return;
    }

    if (href.indexOf('tel:') === 0) goal('phone_click');
    else if (href.indexOf('mailto:') === 0) goal('email_click');
  }, true);

  /* Заявку с формы аренды отправляет своя логика на странице —
     она сообщает об успехе этим событием. */
  document.addEventListener('club1:lead', function (ev) {
    goal('arenda_lead', (ev && ev.detail) || {});
  });

  /* ===================================================================
     События по ТЗ Сергея 17.08. Каждое уходит один раз на одно действие:
     показ слайда помечается на самом слайде, чтобы прокрутка ленты
     туда-сюда не накручивала счётчик.
     =================================================================== */
  function cardInfo(card){
    if (!card) return {};
    var t = card.querySelector('.event-card__title');
    var m = card.querySelector('.event-card__meta');
    var list = card.parentElement ? card.parentElement.children : [];
    var pos = 0;
    for (var i = 0; i < list.length; i++){ if (list[i] === card){ pos = i + 1; break; } }
    var f = document.querySelector('.filters__presets [aria-pressed="true"], .pill[aria-pressed="true"]');
    return {
      title: t ? (t.textContent || '').trim().slice(0, 60) : '',
      date:  card.getAttribute('data-date') || '',
      meta:  m ? (m.textContent || '').trim().slice(0, 80) : '',
      position: pos,
      filter: f ? (f.textContent || '').trim().slice(0, 40) : ''
    };
  }

  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || !t.closest) return;

    var social = t.closest('a.social-btn');
    if (social){
      var href = social.getAttribute('href') || '';
      goal('social_link_click', {
        network: /t\.me/.test(href) ? 'telegram' : (/vk\./.test(href) ? 'vk' : 'other'),
        place: (href.match(/utm_medium=([a-z_]+)/) || [])[1] || 'unknown'
      });
    }

    var slide = t.closest('.bb-slide');
    if (slide){
      var btn = t.closest('.bb-slide__actions a');
      goal('hero_slide_click', {
        source: btn ? 'cta' : 'banner',
        label: (slide.querySelector('.bb-chip') || {}).textContent || ''
      });
    }

    var card = t.closest('.event-card');
    if (card){
      var info = cardInfo(card);
      var buy = t.closest('.event-card__actions a');
      if (buy){
        info.source = 'button';
        goal('ticket_button_click', info);
      } else {
        info.source = t.closest('.poster-link') ? 'image' : 'card';
        goal('event_card_click', info);
      }
    }
  }, true);

  /* показ слайда: помечаем сам узел, чтобы событие ушло один раз */
  function watchSlides(){
    var track = document.querySelector('.billboard__track');
    if (!track || !('MutationObserver' in window)) return;
    function report(){
      var act = track.querySelector('.bb-slide.is-active');
      if (!act || act.getAttribute('data-seen')) return;
      act.setAttribute('data-seen', '1');
      var chip = act.querySelector('.bb-chip');
      goal('hero_slide_view', {label: chip ? (chip.textContent || '').trim() : ''});
    }
    new MutationObserver(report).observe(track, {
      subtree: true, attributes: true, attributeFilter: ['class']
    });
    report();
  }

  /* ===================================================================
     Приглашение в Telegram (ТЗ Сергея 17.08, раздел 5).
     Показ — после 45 секунд ИЛИ половины страницы, но только после
     осмысленного действия и не чаще раза за визит. Закрыли — тихо на
     7 дней, перешли — на 30. Состояние в localStorage; автоматического
     перехода в Telegram нет.
     =================================================================== */
  var TG_KEY = 'club1-tg-invite';
  var TG_LINK = 'https://t.me/club1standup?utm_source=club1_site' +
                '&utm_medium=popup&utm_campaign=telegram_subscription';

  function tgMuted(){
    try {
      var until = parseInt(localStorage.getItem(TG_KEY) || '0', 10);
      return until && Date.now() < until;
    } catch (e) { return false; }
  }
  function tgMute(days){
    try { localStorage.setItem(TG_KEY, String(Date.now() + days * 864e5)); } catch (e) {}
  }

  function initTelegramInvite(){
    if (tgMuted()) return;
    var shown = false, acted = false, timer = null;

    function markAction(){ acted = true; }
    ['scroll', 'click', 'keydown', 'touchstart'].forEach(function (n){
      window.addEventListener(n, markAction, {passive: true, once: true});
    });

    function halfway(){
      var h = document.documentElement.scrollHeight - window.innerHeight;
      return h > 0 && (window.pageYOffset / h) >= 0.5;
    }

    function show(){
      if (shown || !acted || tgMuted()) return;
      /* не мешаем выбору мест и открытым окнам */
      if (document.querySelector('.modal.is-open, .mobile-menu.is-open')) return;
      shown = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);

      var box = document.createElement('aside');
      box.className = 'tg-invite';
      box.setAttribute('role', 'complementary');
      box.setAttribute('aria-label', 'Афиша клуба в Telegram');
      box.innerHTML =
        '<button class="tg-invite__close" type="button" aria-label="Закрыть">&times;</button>' +
        '<p class="tg-invite__title">Афиша, новые концерты и дополнительные даты — ' +
          'в Telegram CLUB#1.</p>' +
        '<a class="btn btn--primary btn--sm tg-invite__cta" href="' + TG_LINK + '"' +
          ' target="_blank" rel="noopener noreferrer">Подписаться в Telegram</a>' +
        '<button class="tg-invite__peek" type="button" aria-label="Афиша клуба в Telegram">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>' +
        '</button>';
      document.body.appendChild(box);
      requestAnimationFrame(function(){ box.classList.add('is-in'); });
      goal('telegram_invite_shown');

      /* ТЗ Сергея 17.08: окно «не закрывающее карточки и CTA». В правом
         нижнем углу широкого экрана карточки доходят до самого края, и
         развёрнутая панель неизбежно ложится на кнопки. Поэтому через
         двенадцать секунд она сама сворачивается в иконку 52 px, а клик
         по иконке разворачивает обратно. */
      var fold = setTimeout(function(){ box.classList.add('is-mini'); }, 12000);
      box.querySelector('.tg-invite__peek').addEventListener('click', function(){
        clearTimeout(fold);
        box.classList.remove('is-mini');
        fold = setTimeout(function(){ box.classList.add('is-mini'); }, 12000);
      });

      box.querySelector('.tg-invite__close').addEventListener('click', function(){
        clearTimeout(fold);
        goal('telegram_invite_closed');
        tgMute(7);
        box.classList.remove('is-in');
        setTimeout(function(){ box.remove(); }, 260);
      });
      box.querySelector('.tg-invite__cta').addEventListener('click', function(){
        goal('telegram_invite_click');
        tgMute(30);
      });
    }

    function onScroll(){ if (halfway()) show(); }
    window.addEventListener('scroll', onScroll, {passive: true});
    timer = setTimeout(show, 45000);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ watchSlides(); initTelegramInvite(); });
  } else {
    watchSlides(); initTelegramInvite();
  }
})();
