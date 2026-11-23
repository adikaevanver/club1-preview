/* Реклама: пиксель VK Рекламы (Top.Mail.Ru) + дополнительные цели Метрики для Директа.
   Работает только на боевом домене. ВПИСАТЬ ID пикселя из кабинета VK Рекламы → VK_PIXEL_ID.
   Цели (одинаковые имена в Метрике и VK): buy_click — переход в кассу (ставит analytics.js в Метрику; здесь дублируем в VK),
   dates_view — увидел блок дат, trailer_play — включил трейлер, lead_corp / lead_gift — заявка, lp_view — открыл посадочную. */
(function(){
  var PROD=/metelitsaclub1\.ru$/.test(location.hostname), YM=111571199, VK_PIXEL_ID='';
  var _tmr=window._tmr||(window._tmr=[]);
  if(PROD&&VK_PIXEL_ID){
    _tmr.push({id:VK_PIXEL_ID,type:'pageView',start:(new Date()).getTime()});
    (function(d,w,id){if(d.getElementById(id))return;var ts=d.createElement('script');ts.type='text/javascript';ts.async=true;ts.id=id;ts.src='https://top-fwz1.mail.ru/js/code.js';
      var f=function(){var s=d.getElementsByTagName('script')[0];s.parentNode.insertBefore(ts,s);};if(w.opera=='[object Opera]'){d.addEventListener('DOMContentLoaded',f,false);}else{f();}})(document,window,'tmr-code');
  }
  function goal(name,params){
    if(!PROD)return;
    try{if(window.ym&&name!=='buy_click')ym(YM,'reachGoal',name,params||{});}catch(e){}
    try{if(VK_PIXEL_ID)_tmr.push({type:'reachGoal',id:VK_PIXEL_ID,goal:name,params:params||{}});}catch(e){}
  }
  window.club1AdsGoal=goal;
  /* переход в кассу Яндекс Афиши */
  document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href*="afisha.yandex.ru"],a[href*="widget.afisha"],[data-buy]');if(a)goal('buy_click',{page:document.body.getAttribute('data-page')});},true);
  /* заявки */
  document.addEventListener('club1:lead',function(ev){var k=(ev.detail&&ev.detail.form)||'form';goal('lead_'+k,{page:document.body.getAttribute('data-page')});});
  /* посадочная */
  if(document.body.getAttribute('data-kind')==='landing')goal('lp_view',{page:document.body.getAttribute('data-page')});
  /* блок дат */
  var t=document.getElementById('today');
  if(t&&'IntersectionObserver' in window){var seen=false;new IntersectionObserver(function(es){if(!seen&&es[0].isIntersecting){seen=true;goal('dates_view',{page:document.body.getAttribute('data-page')});}},{threshold:.3}).observe(t);}
  /* трейлер */
  var tv=document.getElementById('tv');if(tv)tv.addEventListener('play',function(){goal('trailer_play');},{once:true});
})();
