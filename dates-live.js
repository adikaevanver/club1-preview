/* Цены на датах. Режим продаж — window.MOLCHAT_SALE_MODE, его ставит сборка из SALE_MODE в сайт-src/build.py:
   'bundle' (Ал 03.11, круг 4) — один билет «вечер с ужином»: место + авторский ужин + приветственный напиток, одна цена от 6 100 ₽ (место от 4 000 + сет 2 100, Ал 11.11);
   'addon'  (Ал 11.11 18:15, сейчас) — место «от» по датам (SEAT_BY_DATE, минимум 4 000 по письму Яндекса 11.11) + ужин 2 100 ₽ в той же покупке, как в кассе Яндекс Афиши.
   Цена меняется в одном месте: BUNDLE_FROM (или ev.ticketFrom у показа в events.js). Поле priceFrom в events.js устарело — не используем.
   Прошлые версии: _архив/2026-11-03/ (до-приёмки, -2, -3, -4). */
/* Даты из живых данных сайта (assets/data/events.js → window.CLUB1_EVENTS).
   Ссылка кассы — ev.buy (виджет Яндекс Афиши); цель buy_click и рекламную
   метку ставит analytics.js с живого сайта по клику на ссылку кассы. */
(function(){
  var M=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'],
      D=['вс','пн','вт','ср','чт','пт','сб'], STAR='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z"/></svg>';
  var MODE=window.MOLCHAT_SALE_MODE||'bundle';
  var BUNDLE_FROM=6100;   /* один билет «вечер с ужином», от, ₽ (= место 4 000 + сет 2 100, Ал 11.11) */
  var DINNER=2100;        /* ужин, ₽ — только для режима addon (в bundle он уже внутри цены билета) */
  var CHIPC=['pink','green','black','gold','cream'];   /* фишки-номиналы у цены (Ал 11.11, казино-штрихи) */
  /* Воскресенья и четверги временно сняты с продажи (Ал 03.11): не показываем. Вернуть — убрать дни из списка (0 — вс, 4 — чт).
     Данные в events.js не трогаем. Можно переопределить window.MOLCHAT_HIDE_WEEKDAYS=[] до этого скрипта. */
  var HIDE_WD=window.MOLCHAT_HIDE_WEEKDAYS||[0,4];
  var HIDE_UNTIL='2026-12-01';   /* Ал 11.11: правило «без вс и чт» — только для ноября; в каникулы касса продаёт и вс, и чт (27.12, 31.12, 3.01, 7.01) */
  function rub(n){return n.toLocaleString('ru-RU').replace(/\s/g,' ')+' ₽';}
  function num(n){return n.toLocaleString('ru-RU').replace(/\s/g,' ');}
  /* цена одного билета с ужином у показа: ev.ticketFrom (если завели) или BUNDLE_FROM */
  /* Ал 11.11 18:15 (режим addon): цена МЕСТА «от» по датам — как в кассе Яндекс Афиши 11.11; дата не в списке — SEAT_DEFAULT (не занижаем).
     Обновлять по кассе: дата → минимальная цена места. */
  /* Цены и список показов — по Яндекс Афише: window.MOLCHAT_CENY (вставляет build.py из assets/data/molchat-ceny.json, файл обновляет сверка.py).
     Показываем только сеансы, которые есть на Афише и продаются; цена места — минимальная по кассе на эту дату. */
  var CENY=window.MOLCHAT_CENY||null, SEAT_BY_DATE={}, ON_SALE=null;
  if(CENY&&CENY.sessions&&CENY.sessions.length){ ON_SALE={}; CENY.sessions.forEach(function(x){ if(x.s==='available'){ SEAT_BY_DATE[x.d+' '+x.t]=x.min; ON_SALE[x.d+' '+x.t]=1; } }); }
  var SEAT_DEFAULT=(CENY&&CENY.seat_min)||4000, AT_VENUE='6 000–8 000 ₽';
  function price(e){
    if(typeof e.ticketFrom==='number'&&e.ticketFrom>0) return e.ticketFrom;
    if(MODE==='addon') return SEAT_BY_DATE[e.date+' '+e.time]||SEAT_DEFAULT;
    return BUNDLE_FROM;}
  /* продающиеся будущие показы — общий отбор для блока дат и карточки на концовке трейлера */
  function upcoming(title){ return (window.CLUB1_EVENTS||[]).filter(function(e){if(!(e.title===title&&e.buy))return false; if(ON_SALE&&!ON_SALE[e.date+' '+e.time])return false; if(!ON_SALE&&e.date<HIDE_UNTIL&&HIDE_WD.indexOf(new Date(e.date+'T00:00:00').getDay())>-1)return false; var st=new Date(e.date+'T'+(e.time||'23:59')+':00'); return st.getTime()>Date.now()-15*60000;}) /* прошедшие сеансы скрываем по времени начала (+15 мин на опоздавших) */
      .sort(function(a,b){return (a.date+(a.time||'')).localeCompare(b.date+(b.time||''));}); }
  document.querySelectorAll('[data-live-dates]').forEach(function(root){
    var title=root.getAttribute('data-live-dates'), all=upcoming(title);
    if(!all.length){root.innerHTML='<p class="sub">Новые даты скоро — следите за афишей.</p>';return;}
    var FOLD=root.getAttribute('data-fold')==='all'?999:6, pmin=Math.min.apply(null,all.map(price));
    var note, hint, small;
    if(MODE==='addon'){
      note='Место в зале — от '+rub(pmin)+'. Авторский ужин — '+rub(DINNER)+' за сет: добавляется в той же покупке, сразу после выбора мест. На месте такой сет стоит '+AT_VENUE+'. Продолжительность — 3 часа, включая 2 антракта.';
      hint='Ужин по спеццене — только вместе с билетом';
      small=function(){return '<small>+ ужин '+num(DINNER)+' ₽</small>';};
    } else {
      note='Цена — за один билет «вечер с ужином»: место в зале, авторский ужин (три блюда и десерт) и приветственный напиток от «Метелицы».';
      hint='Сет ужина выбираете при покупке — для каждого места';
      small=function(){return '<small>вечер с ужином</small>';};
    }
    root.innerHTML='<p class="dnote">'+note+'</p><p class="dhint">'+hint+'</p><div class="drows">'+all.map(function(e,i){var d=new Date(e.date+'T00:00:00'),wd=d.getDay(),p=price(e);
      return '<a class="drow'+(i>=FOLD?' more':'')+'" href="'+e.buy+'" target="_blank" rel="noopener">'+
        '<span class="dd"><b>'+d.getDate()+'</b><i>'+M[d.getMonth()]+'</i></span>'+
        '<span class="dw">'+D[wd]+(e.time?' · '+e.time:'')+'</span>'+
        '<span class="dp"><svg class="chip" aria-hidden="true"><use href="#chip-'+CHIPC[i%CHIPC.length]+'"/></svg>от '+rub(p)+small(p)+'</span>'+
        '<span class="db">'+STAR+'Выбрать место</span></a>';}).join('')+'</div>'+
      (all.length>FOLD?'<div class="center"><button class="dmore" type="button">Показать все даты ('+all.length+')</button></div>':'');
    var b=root.querySelector('.dmore'); if(b)b.addEventListener('click',function(){root.classList.add('open');b.remove();});
  });

  /* Концовка трейлера v17 (14.11, сессия 88): в ролике больше нет вшитого календаря — поверх последних секунд
     показываем живую карточку «Ближайшие даты». Включается атрибутом data-endcard="<секунда>" у video#tv. */
  var tv=document.getElementById('tv'), box=tv&&tv.closest('.tbox'), T=tv&&parseFloat(tv.getAttribute('data-endcard'));
  var DUR=(tv&&tv.getAttribute('data-dur'))||'1 мин';   /* длительность для подписей кнопок (15.11: полная версия 2:20) */
  if(box&&T>0){
    var src=document.querySelector('[data-live-dates]'), list=upcoming(src?src.getAttribute('data-live-dates'):'О чём молчат женщины').slice(0,4);
    if(list.length){
      var card=document.createElement('div'); card.className='tend'; card.setAttribute('aria-live','polite');
      card.innerHTML='<div class="tend-r"><p class="tend-k">Ближайшие <br>даты</p>'+list.map(function(e,i){var d=new Date(e.date+'T00:00:00');
        return '<a class="tend-d'+(i>2?' x4':'')+'" href="'+e.buy+'" target="_blank" rel="noopener"><b>'+d.getDate()+' '+M[d.getMonth()].slice(0,3)+'</b><i>'+D[d.getDay()]+(e.time?' · '+e.time:'')+'</i><span>от '+rub(price(e))+'</span></a>';}).join('')+
        '<a class="tend-b" href="#dates">'+STAR+'<span>Выбрать дату</span></a>'+
        '<button class="tend-p" type="button" aria-label="Смотреть трейлер со звуком"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z"/></svg><span>Смотреть трейлер · '+DUR+'</span></button></div>';
      box.appendChild(card); box.classList.add('has-endcard');
      /* 15.11 Ал: «непонятно, что здесь видео» — большая круглая ▶ на свободном месте кадра; клик ловит прозрачная .tplay на весь кадр */
      var big=document.createElement('div'); big.className='tbig'; big.setAttribute('aria-hidden','true');
      big.innerHTML='<span class="tbig-c"><svg viewBox="0 0 24 24"><path d="M8 5l12 7-12 7z"/></svg></span><span class="tbig-t">Трейлер · '+DUR+' · со звуком</span>'; box.appendChild(big);
      var pb=card.querySelector('.tend-p'), started=false;
      pb.addEventListener('click',function(){
        if(!started){var tp=box.querySelector('.tplay'); if(tp)tp.click(); else {tv.muted=false;tv.play();}}
        else {tv.currentTime=0; tv.muted=false; tv.play();}
      });
      tv.addEventListener('play',function(){started=true; box.classList.add('started');});
      tv.addEventListener('ended',function(){pb.querySelector('span').textContent='Смотреть ещё раз';});
      var on=function(v){card.classList.toggle('on',v);box.classList.toggle('ended',v);};
      tv.addEventListener('timeupdate',function(){on(tv.currentTime>=T-0.05);});
      tv.addEventListener('seeked',function(){on(tv.currentTime>=T-0.05);});
      tv.addEventListener('ended',function(){on(true);});
      on(true);   /* до запуска — тот же финальный кадр с датами (обложка = последний кадр) */
      tv.addEventListener('play',function(){if(tv.currentTime<T-0.05)on(false);});
    }
  }
})();
