/* Сайт шоу: меню-бургер, «Купить билет» без блока дат на странице, отправка форм, галерея, видео в галерее.
   Правки по приёмке 03.11: меню закрывается по Esc / тапу мимо / прокрутке (п.10), кнопки ведут к датам (п.09),
   проверка телефона (п.21), листание фото в галерее (п.17). Прошлая версия — _архив/2026-11-03/до-приёмки/. */
(function(){
  var hdr=document.querySelector('.hdr'), b=document.querySelector('.burger');
  function setNav(o){if(!hdr||!b)return;hdr.classList.toggle('navopen',o);b.setAttribute('aria-expanded',o?'true':'false');b.setAttribute('aria-label',o?'Закрыть меню':'Открыть меню');}
  if(b){
    b.addEventListener('click',function(e){e.stopPropagation();setNav(!hdr.classList.contains('navopen'));});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&hdr.classList.contains('navopen')){setNav(false);b.focus();}});
    document.addEventListener('click',function(e){if(hdr.classList.contains('navopen')&&!e.target.closest('#mainnav'))setNav(false);});
    var y0=0;addEventListener('scroll',function(){if(!hdr.classList.contains('navopen')){y0=scrollY;return;}if(Math.abs(scrollY-y0)>40)setNav(false);},{passive:true});
  }
  document.querySelectorAll('#mainnav a').forEach(function(a){a.addEventListener('click',function(){setNav(false);});});
  /* если на странице нет списка дат — кнопки покупки ведут на афишу */
  if(!document.getElementById('dates')) document.querySelectorAll('a[href="#dates"]').forEach(function(a){a.setAttribute('href','afisha.html#dates');});
  /* прокрутка: обычно — окно; если страница открыта во фрейме на всю высоту (превью claude.ai на телефоне), своё окно не прокручивается — тогда scrollIntoView, он двигает внешнюю страницу */
  function ownScroll(){return document.documentElement.scrollHeight-innerHeight>4;}
  function goTo(t,beh){var off=((hdr&&hdr.offsetHeight)||70)+16;
    if(ownScroll()){scrollTo({top:t.getBoundingClientRect().top+scrollY-off,behavior:beh});return;}
    t.style.scrollMarginTop=off+'px';try{t.scrollIntoView({behavior:beh,block:'start'});}catch(_){t.scrollIntoView(true);}}
  /* якоря на этой же странице — плавно и с учётом шапки (и на 404, где стоит <base>) */
  document.addEventListener('click',function(e){var a=e.target.closest('a[href^="#"]');if(!a)return;var id=a.getAttribute('href').slice(1),t=id&&document.getElementById(id);
    if(!t)return;e.preventDefault();var d=a.closest('dialog');if(d&&d.open)d.close();
    goTo(t,matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth');
    if(history.replaceState)history.replaceState(null,'',location.pathname+location.search+'#'+id);});
  if(location.hash==='#dates'){var t0=document.getElementById('dates');if(t0)setTimeout(function(){goTo(t0,'auto');},300);}
  else if(!location.hash){var inFrame=false;try{inFrame=window.self!==window.top;}catch(_){inFrame=true;}var toTop=function(){if(!inFrame)return;var el=document.getElementById('top-mark');if(!el){el=document.createElement('div');el.id='top-mark';el.style.cssText='position:absolute;top:0;left:0;width:1px;height:1px';document.body.insertBefore(el,document.body.firstChild);}try{el.scrollIntoView({block:'start'});}catch(_){}};toTop();addEventListener('load',toTop);
    /* 15.11 Ал: в превью claude.ai высоту фрейма подгоняют уже после загрузки, и внешнее окно оставалось внизу (открывался подвал) — поднимаем ещё несколько раз в первые 2 с, пока человек сам не начал листать */
    if(inFrame){var stop=false,st=function(){stop=true;};['wheel','touchstart','keydown','mousedown'].forEach(function(ev){addEventListener(ev,st,{once:true,passive:true});});
      [120,350,700,1100,1600,2200].forEach(function(ms){setTimeout(function(){if(!stop)toTop();},ms);});}}
  /* телефон: +7 и 10 цифр (8… и 9… тоже принимаем) */
  function phoneOk(v){var d=String(v||'').replace(/\D/g,'');if(d.length===11&&(d[0]==='7'||d[0]==='8'))d=d.slice(1);return d.length===10&&/^[3-9]/.test(d)?'+7'+d:null;}
  /* формы → send.php (PHP на хостинге reg.ru); если не вышло — письмо с готовым текстом */
  document.querySelectorAll('form[data-lead]').forEach(function(f){
    var ph=f.querySelector('input[name=phone]');
    if(ph)ph.addEventListener('input',function(){if(f.classList.contains('badphone')&&phoneOk(ph.value)){f.classList.remove('badphone');ph.removeAttribute('aria-invalid');}});
    f.addEventListener('submit',function(e){
      e.preventDefault();
      if(ph){var norm=phoneOk(ph.value);if(!norm){f.classList.add('badphone');ph.setAttribute('aria-invalid','true');ph.focus();return;}ph.value=norm;f.classList.remove('badphone');ph.removeAttribute('aria-invalid');}
      if(!f.checkValidity()){f.reportValidity();return;}
      var kind=f.getAttribute('data-lead'), fd=new FormData(f), data={kind:kind,page:location.pathname,ref:document.referrer};
      fd.forEach(function(v,k){data[k]=v;});
      try{var m=JSON.parse(localStorage.getItem('club1_utm')||localStorage.getItem('club1_first_touch')||'null'); if(m) data.utm=m;}catch(x){}
      f.classList.add('busy'); f.classList.remove('fail');
      fetch('send.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
        .then(function(r){return r.json();}).then(function(j){if(!j||!j.ok)throw 0; done();})
        .catch(function(){ if(location.protocol==='file:'||/^(127\.|localhost)/.test(location.hostname)){done();return;}
          f.classList.add('fail');
          var body='Заявка ('+kind+')%0D%0AИмя: '+encodeURIComponent(data.name||'')+'%0D%0AТелефон: '+encodeURIComponent(data.phone||'')+'%0D%0A'+encodeURIComponent(data.details||'');
          location.href='mailto:Club1promo@yandex.ru?subject='+encodeURIComponent('Заявка с сайта: '+kind)+'&body='+body; })
        .then(function(){f.classList.remove('busy');});
      function done(){f.classList.add('sent');f.reset();document.dispatchEvent(new CustomEvent('club1:lead',{detail:{form:kind}}));}
    });
  });
  /* галерея: листание стрелками, клавишами и свайпом, счётчик и подпись */
  var lb=document.getElementById('lb');
  if(lb){var G=[].slice.call(document.querySelectorAll('.gal5 .gi')),cur=0,img=lb.querySelector('img'),cap=lb.querySelector('.lb-cap'),num=lb.querySelector('.lb-n');
    function show(i){cur=(i+G.length)%G.length;var a=G[cur],al=a.querySelector('img').alt;img.src=a.getAttribute('href');img.alt=al;if(cap)cap.textContent=al;if(num)num.textContent=(cur+1)+' / '+G.length;}
    G.forEach(function(a,i){a.addEventListener('click',function(e){e.preventDefault();show(i);lb.showModal();});});
    lb.querySelector('.x').addEventListener('click',function(){lb.close();});
    var pv=lb.querySelector('.lb-prev'),nx=lb.querySelector('.lb-next');
    if(pv)pv.addEventListener('click',function(e){e.stopPropagation();show(cur-1);});
    if(nx)nx.addEventListener('click',function(e){e.stopPropagation();show(cur+1);});
    lb.addEventListener('click',function(e){if(e.target===lb)lb.close();});
    lb.addEventListener('keydown',function(e){if(e.key==='ArrowRight'){e.preventDefault();show(cur+1);}if(e.key==='ArrowLeft'){e.preventDefault();show(cur-1);}});
    /* переход с полароида главной: galereya.html#foto=kk-1 — сразу открыть это фото крупно (Ал 14.11) */
    var fm=location.hash.match(/^#foto=([\w-]+)$/);
    if(fm){var fi=-1;G.forEach(function(a,i){if(fi<0&&a.getAttribute('href').indexOf('/'+fm[1]+'.')>=0)fi=i;});
      if(fi>=0){var a0=G[fi];setTimeout(function(){a0.scrollIntoView({block:'center'});show(fi);lb.showModal();},400);}}
    var sx=null;lb.addEventListener('touchstart',function(e){sx=e.touches[0].clientX;},{passive:true});
    lb.addEventListener('touchend',function(e){if(sx===null)return;var dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>40)show(cur+(dx<0?1:-1));sx=null;});}
  /* видео в галерее/баре играют, когда видны */
  if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(x){var v=x.target;if(x.isIntersecting){v.play&&v.play().catch(function(){});}else{v.pause&&v.pause();}});},{threshold:.35});
    document.querySelectorAll('.gv video').forEach(function(v){io.observe(v);});}
})();
/* 11.11 Ал: витрина сетов (#ptm[data-auto]) — ролик целиком, без надписей; рыбный → мясной → вегетарианский по очереди, точки — вручную */
(function(){
  var box=document.querySelector('#ptm[data-auto]'); if(!box) return;
  var panes=[].slice.call(box.querySelectorAll('.pane')), dots=[].slice.call(box.querySelectorAll('.ptm-tabs .tab, .dots i')), cur=0, seen=false, t=null;
  var vids=panes.map(function(p){return p.querySelector('video');});
  function show(i){
    cur=(i+panes.length)%panes.length; clearTimeout(t);
    panes.forEach(function(p,k){p.classList.toggle('on',k===cur);}); dots.forEach(function(d,k){d.classList.toggle('on',k===cur); if(d.tagName==='BUTTON') d.setAttribute('aria-pressed',k===cur?'true':'false');});
    vids.forEach(function(v,k){ if(k!==cur){v.pause();} });
    var v=vids[cur]; if(!v) return;
    try{v.currentTime=0;}catch(e){}
    if(seen){ var pr=v.play(); if(pr&&pr.catch) pr.catch(function(){}); }
    t=setTimeout(function(){show(cur+1);},12000);   /* страховка, если ролик не дошёл до конца */
    var nx=vids[(cur+1)%vids.length]; if(nx&&nx.preload!=='auto'){nx.preload='auto';}
  }
  vids.forEach(function(v,k){ v.addEventListener('ended',function(){ if(k===cur) show(cur+1); }); });
  var NM=['Рыбный сет','Мясной сет','Вегетарианский сет'];
  dots.forEach(function(d,k){ d.addEventListener('click',function(){ show(k); }); });
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(es){ es.forEach(function(x){ seen=x.isIntersecting;
      var v=vids[cur]; if(!v) return; if(seen){ var pr=v.play(); if(pr&&pr.catch) pr.catch(function(){}); t=t||setTimeout(function(){show(cur+1);},12000); } else { v.pause(); } }); },{threshold:.35}).observe(box);
  } else { seen=true; }
  show(0);
})();

/* 12.11 Ал: плейлист песен — на главной 8, «Все 24 песни» раскрывает список */
(function(){var b=document.querySelector('.pl-more'),l=document.querySelector('#music .pl');if(!b||!l)return;
  b.addEventListener('click',function(){l.classList.add('open');b.setAttribute('aria-expanded','true');b.hidden=true;});})();
