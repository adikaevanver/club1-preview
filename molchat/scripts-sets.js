/* демо-5: сеты, живые подачи (А крупно → Б в зале при наведении), трейлер */
(function(){
  var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
  // видео играют только в кадре
  var io=new IntersectionObserver(function(es){es.forEach(function(e){var v=e.target;
    if(e.isIntersecting){if(!v.src)v.src=v.dataset.aSrc;v.play().catch(function(){});}else v.pause();});},{threshold:.25});
  $$('.dish video').forEach(function(v){io.observe(v);});
  function swap(v,src,label){ if(v.getAttribute('src')===src)return; v.classList.add('swap');
    setTimeout(function(){v.src=src;v.play().catch(function(){});v.classList.remove('swap');
      v.parentNode.querySelector('.dtag').textContent=label;},220); }
  /* все карточки сета переключаются ВМЕСТЕ и стартуют синхронно (Ал 01.11 20:20) */
  function setPane(pane,toB){
    var vs=$$('.dish video',pane); if(!vs.length) return; if(pane._b===toB) return; pane._b=toB;
    vs.forEach(function(v){v.classList.add('swap');});
    setTimeout(function(){
      /* метки «крупно / на вашем столе» убраны (приёмка 03.11, п.16, п.39); каждое видео проявляется, как только загрузилось */
      vs.forEach(function(v){v.src=toB?v.dataset.bSrc:v.dataset.aSrc;});
      vs.forEach(function(v){var go=function(){v.currentTime=0;v.play().catch(function(){});v.classList.remove('swap');};
        if(v.readyState>=2)go(); else v.addEventListener('loadeddata',go,{once:true});});
      setTimeout(function(){vs.forEach(function(x){x.classList.remove('swap');x.play().catch(function(){});});},600);
    },220);
  }
  $$('.spane').forEach(function(pane){
    pane._b=false;
    pane.addEventListener('mouseenter',function(){pane._hover=true;setPane(pane,true);});
    pane.addEventListener('mouseleave',function(){pane._hover=false;setPane(pane,false);});
    pane.addEventListener('click',function(e){if(e.target.closest('.dish'))setPane(pane,true);}); /* клик/тап — показать подачу в зале (приёмка-2, п.112) */
  });
  /* общая автосмена раз в 7 с — видно и на телефоне; пока курсор над сетом — не мешаем */
  setInterval(function(){$$('.spane').forEach(function(pane){
    if(pane._hover||!pane.offsetParent) return; var r=pane.getBoundingClientRect(); if(r.bottom<0||r.top>innerHeight) return; setPane(pane,!pane._b);});},7000);
  // вкладки сетов
  var full=document.getElementById('fullmenu');
  $$('.stab').forEach(function(t){t.addEventListener('click',function(){var k=t.dataset.set;
    $$('.stab').forEach(function(x){x.classList.toggle('on',x===t);});
    $$('#dinner .spane[data-set]').forEach(function(p){p.classList.toggle('on',p.dataset.set===k);});
    if(full)full.setAttribute('data-menu',k);
    var np=document.querySelector('#dinner .spane[data-set="'+k+'"]'); if(np){np._b=null;setPane(np,false);}
  });});
  // трейлер со звуком
  var tb=document.querySelector('.tbox'),tv=document.getElementById('tv');
  /* 15.11 Ал: «на телефоне не работает видео» — сервер превью claude.ai не отдаёт видео частями (Range → 200), Safari на iPhone такой ролик не играет.
     В превью ролик заранее скачивается целиком (когда трейлер рядом) и играет из памяти (blob). На боевом сайте — как обычно, по ссылке. */
  var PREV=/claudeusercontent\.com$/.test(location.hostname)||/[?&]blob\b/.test(location.search), blobOk=false, want=false;
  var SRCV=(tv&&window.matchMedia('(max-width:820px)').matches&&tv.dataset.srcM)?tv.dataset.srcM:(tv&&tv.getAttribute('src'));
  function tryPlay(){tb.classList.add('playing');tv.controls=true;tv.muted=false;var pr=tv.play();if(pr&&pr.catch)pr.catch(function(){tb.classList.remove('playing');tb.classList.add('native');tv.controls=true;});}
  function loadBlob(){if(loadBlob.d)return;loadBlob.d=1;tb.classList.add('loading');
    fetch(SRCV).then(function(r){if(!r.ok)throw 0;return r.blob();}).then(function(b){tv.src=URL.createObjectURL(b);blobOk=true;tb.classList.remove('loading');if(want)tryPlay();})
      .catch(function(){tv.src=SRCV;blobOk=true;tb.classList.remove('loading');if(want)tryPlay();});}
  if(tb&&PREV){tv.removeAttribute('src');if('IntersectionObserver' in window){new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)loadBlob();});},{rootMargin:'800px'}).observe(tb);}else loadBlob();
    tb.querySelector('.tplay').addEventListener('click',function(e){if(blobOk)return;e.stopImmediatePropagation();want=true;loadBlob();},true);}
  if(tb){if(!PREV&&window.matchMedia('(max-width:820px)').matches&&tv.dataset.srcM){tv.src=tv.dataset.srcM;}tb.querySelector('.tplay').addEventListener('click',function(){tb.classList.add('playing');tv.controls=true;tv.muted=false;if(tv.readyState===0)tv.load();var pr=tv.play();if(pr&&pr.catch)pr.catch(function(){tb.classList.remove('playing');tb.classList.add('native');tv.controls=true;});});
    tv.addEventListener('ended',function(){if(tv.hasAttribute('data-endcard'))return;tb.classList.remove('playing');tv.controls=false;});  /* с живой карточкой дат — после конца остаётся карточка, повтор — кнопкой плеера */}
})();
/* шапка C: уголёк бежит по нити */
(function(){var t=document.querySelector('.hdr .thread');if(!t)return;var e=t.querySelector('.ember');
  t.querySelectorAll('a').forEach(function(a){a.addEventListener('mouseenter',function(){e.style.left=(a.offsetLeft+a.offsetWidth/2-27)+'px';e.style.opacity=1;});});
  t.addEventListener('mouseleave',function(){e.style.opacity=0;});})();
/* первый экран: слоган и кнопку — ниже (Ал 01.11 17:10); раскладка демо-4 ставит их сразу под логотипом */
(function(){
  var stage=document.querySelector('.h4 .stage'),sub=document.querySelector('.h4 .sub4'),plate=document.querySelector('.h4 .cta4'),logo=document.querySelector('.h4 .showlogo');
  if(!stage||!sub||!plate||!logo)return;
  function lower(){var H=stage.clientHeight,mob=stage.clientWidth<700;
    /* кнопка — у самого низа, слоган — сразу над ней (Ал 01.11 17:21) */
    var ph=plate.offsetHeight||48, pt=H-ph-(mob?34:44), top=pt-sub.offsetHeight-H*.035;
    /* логотип шоу — ниже, по центру между шапкой и слоганом (Ал 01.11 17:23) */
    var lh=logo.offsetHeight, hb=mob?70:80, lt=Math.max(hb,top-H*.015-lh); /* ещё ниже — вплотную к слогану (Ал 17:24) */
    logo.style.top=lt+'px';
    var lb=lt+lh; top=Math.max(top,lb+H*.015);
    sub.style.top=top+'px'; plate.style.top=pt+'px';}
  function later(){requestAnimationFrame(function(){requestAnimationFrame(lower);});}
  window.addEventListener('load',later);window.addEventListener('resize',later);later();setTimeout(lower,600);
})();

/* варианты логотипа: ?logo=N или панель внизу слева */
(function(){
  var root=document.documentElement, logo=document.querySelector('.h4 .showlogo'), fx=document.querySelector('.h4 .lfx'), veil=document.querySelector('.h4 .veilfx');
  var q=(location.search.match(/logo=(\d)/)||[])[1], saved=null; try{saved=localStorage.getItem('d5logo');}catch(e){}
  function set(n){root.setAttribute('data-logo',n);document.querySelectorAll('.lsw button').forEach(function(b){b.classList.toggle('on',b.dataset.l===String(n));});try{localStorage.setItem('d5logo',n);}catch(e){}}
  set(q||'6'); if(/[?&]sw/.test(location.search))root.setAttribute('data-sw',''); /* выбор Ал 01.11 17:29 — вариант 6 «Сплошной»; остальные — только ?logo=N */
  document.querySelectorAll('.lsw button').forEach(function(b){b.addEventListener('click',function(){set(b.dataset.l);});});
  if(!logo)return;
  (function sync(){
    var cs=getComputedStyle(logo), l=logo.offsetLeft, t=logo.offsetTop, w=logo.offsetWidth, h=logo.offsetHeight;
    if(fx){fx.style.left=l+'px';fx.style.top=t+'px';fx.style.width=w+'px';fx.style.height=h+'px';fx.style.transform=logo.style.transform;fx.style.opacity=cs.opacity;}
    if(veil){veil.style.setProperty('--lx',l+'px');veil.style.setProperty('--ly',t+'px');veil.style.setProperty('--lw',w+'px');veil.style.setProperty('--lh',h+'px');veil.style.opacity=cs.opacity;}
    requestAnimationFrame(sync);
  })();
})();
/* «Меню вечера»: шаг открывается подробно (01.11) */
(function(){
  var dlg=document.getElementById('mvd'),dat=document.getElementById('mvd-data'); if(!dlg||!dat)return;
  var D=JSON.parse(dat.textContent),cur=0,$=function(s){return dlg.querySelector(s)};
  var STAR='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z"/></svg>';
  function show(i){cur=(i+D.length)%D.length;var d=D[cur];
    $('.mvd-media').innerHTML=d.m==='video'?'<video src="'+d.src+'" poster="'+(d.poster||'')+'" muted loop playsinline autoplay aria-hidden="true"></video>':'<img src="'+d.src+'" alt="">';
    $('.mvd-k').textContent=d.k;$('.mvd-t').textContent=d.t;
    $('.mvd-p').innerHTML=d.p.map(function(x){return '<p>'+x+'</p>'}).join('');
    $('.mvd-f').innerHTML=d.f.map(function(x){return '<div><dt>'+x[0]+'</dt><dd>'+x[1]+'</dd></div>'}).join('');
    var a=$('.mvd-a');a.href=d.a[1];a.innerHTML=STAR+'<span>'+d.a[0]+'</span>';
    if(window.ym)try{ym(111571199,'reachGoal','evening_step',{step:d.t})}catch(e){}}
  document.querySelectorAll('.mv-row[data-i]').forEach(function(r){
    function op(){show(+r.dataset.i);if(!dlg.open)dlg.showModal();}
    r.addEventListener('click',op);r.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();op()}});});
  $('.mvd-x').addEventListener('click',function(){dlg.close()});
  $('.mvd-prev').addEventListener('click',function(){show(cur-1)});$('.mvd-next').addEventListener('click',function(){show(cur+1)});
  dlg.addEventListener('click',function(e){if(e.target===dlg)dlg.close()});
  $('.mvd-a').addEventListener('click',function(){if(this.getAttribute('href').charAt(0)==='#')dlg.close()});
  dlg.addEventListener('keydown',function(e){if(e.key==='ArrowRight')show(cur+1);if(e.key==='ArrowLeft')show(cur-1)});
  dlg.addEventListener('close',function(){$('.mvd-media').innerHTML=''});
})();
/* «Бар»: ролик под размер экрана, играет только в кадре */
(function(){var v=document.querySelector('.bar5-v');if(!v)return;var mob=matchMedia('(max-width:700px)').matches;
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){if(!v.getAttribute('src')){v.src=mob?v.dataset.srcM:v.dataset.srcD;}v.play().catch(function(){});}else v.pause();});},{threshold:.15});io.observe(v);})();
