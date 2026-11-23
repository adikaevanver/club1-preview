/* =====================================================================
   analytics.js · цели Метрики и рекламные метки сайта мюзикла
   ---------------------------------------------------------------------
   Счётчик Метрики 111571199 подключается в <head> и только на домене
   metelitsaclub1.ru. Здесь — то, чего счётчик сам не умеет:
   1. buy_click — уход в кассу Яндекс Афиши (иначе воронка обрывается);
   2. рекламная метка первого захода дописывается в ссылку кассы;
   3. phone_click / email_click / lead_form.
   Круг 5 (04.11): убраны приглашение в Telegram стендап-клуба, цели
   старого сайта (arenda_lead, показы слайдов) и касса intickets.
   Прежняя версия — _архив/2026-11-04/до-приёмки-5/analytics.js.
   ===================================================================== */
(function () {
  'use strict';
  var COUNTER = 111571199;
  var KEY = 'club1-utm';
  var MARKS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid', 'gclid', 'ymclid', 'from'];
  var CASHDESK = /(widget\.afisha\.yandex\.ru|afisha\.yandex\.ru)/i;

  function goal(name, params) {
    if (typeof window.ym === 'function') window.ym(COUNTER, 'reachGoal', name, params || {});
  }

  /* ---- метка первого захода ---- */
  function readMarks() {
    var q = new URLSearchParams(location.search), found = {};
    MARKS.forEach(function (k) { var v = q.get(k); if (v) found[k] = v; });
    return Object.keys(found).length ? found : null;
  }
  function storedMarks() {
    try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }
  var fresh = readMarks();
  if (fresh) { try { sessionStorage.setItem(KEY, JSON.stringify(fresh)); } catch (e) {} }
  var marks = fresh || storedMarks();
  function withMarks(href) {
    if (!marks) return href;
    var u; try { u = new URL(href, location.href); } catch (e) { return href; }
    Object.keys(marks).forEach(function (k) { if (!u.searchParams.has(k)) u.searchParams.set(k, marks[k]); });
    return u.toString();
  }

  /* ---- цели ---- */
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (CASHDESK.test(href)) {
      var tagged = withMarks(href);
      if (tagged !== href) a.setAttribute('href', tagged);
      goal('buy_click', { page: location.pathname, label: (a.textContent || '').trim().slice(0, 60) });
      return;
    }
    if (href.indexOf('tel:') === 0) goal('phone_click');
    else if (href.indexOf('mailto:') === 0) goal('email_click');
  }, true);

  /* заявка с формы сайта (корпоратив, сертификат) — событие шлёт site.js */
  document.addEventListener('club1:lead', function (ev) { goal('lead_form', (ev && ev.detail) || {}); });
})();
