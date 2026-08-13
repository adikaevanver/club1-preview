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
})();
