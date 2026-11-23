/* копия демо-4.js для сайта: проверки на отсутствующие блоки (01.11) */
/* Демо-4: блоки ниже первого экрана — как в демо-3; первый экран — отдельный модуль в конце файла.
   Демо-3 (на основе демо-2: логотип вместо набора на первом экране). «Метелица Клуб1» · 28.10.2026 · без библиотек.
   Дым-вьюга — WebGL-шейдер (domain-warped fbm), рисуется в половинном разрешении поверх фото сцены.
   Появления — IntersectionObserver + CSS, параллакс и sticky-сцена — один scroll-обработчик через rAF. */
(function(){
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobile = matchMedia('(max-width:700px)').matches;
  /* нет блока на странице — невидимая пустышка вместо null (сайт, 01.11) */
  var __st=document.getElementById('__stubs')||(function(){var d=document.createElement('div');d.id='__stubs';d.hidden=true;document.documentElement.appendChild(d);return d;})(); window.__stub=function(){var c=document.createElement('canvas');c.play=function(){return Promise.resolve();};c.pause=c.load=function(){};c.dataset.stub='1';__st.appendChild(c);return c;}; 
  var $ = function(s, r){ return (r || document).querySelector(s) || __stub(); }, $$ = function(s, r){ return [].slice.call((r || document).querySelectorAll(s)); };

  /* ---- буквы заголовка: плавное появление по одной ---- */
  $$('[data-letters]').forEach(function(el, li){
    var txt = el.textContent; el.textContent = '';
    txt.split('').forEach(function(c, i){
      var s = document.createElement('span'); s.className = 'ch'; s.textContent = c; s.setAttribute('aria-hidden','true');
      if (!reduce){ s.style.opacity = 0; s.style.transform = 'translateY(40px)'; s.style.filter = 'blur(10px)';
        s.style.transition = 'opacity 1.6s cubic-bezier(.2,.7,.2,1), transform 1.6s cubic-bezier(.2,.7,.2,1), filter 1.6s';
        s.style.transitionDelay = (0.5 + li*.7 + i*.09)+'s'; }
      el.appendChild(s);
    });
  });
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ $$('.hero .ch').forEach(function(s){ s.style.opacity = 1; s.style.transform = 'none'; s.style.filter = 'none'; }); }); });

  /* ---- орнамент: ар-деко веер и снежинка ---- */
  function fan(){
    var p = '', cx = 200, cy = 200;
    for (var a = 180; a <= 360; a += 9){ var r = a*Math.PI/180; p += '<line pathLength="1" x1="'+cx+'" y1="'+cy+'" x2="'+(cx + Math.cos(r)*190).toFixed(1)+'" y2="'+(cy + Math.sin(r)*190).toFixed(1)+'"/>'; }
    [70,130,190].forEach(function(R){ p += '<path pathLength="1" d="M'+(cx-R)+' '+cy+' A'+R+' '+R+' 0 0 1 '+(cx+R)+' '+cy+'"/>'; });
    for (var k = 0; k < 7; k++){ var x = 30 + k*57; p += '<path pathLength="1" d="M'+x+' 200 Q'+(x+28)+' 150 '+(x+57)+' 200"/>'; }
    return '<svg viewBox="0 0 400 210" aria-hidden="true">'+p+'</svg>';
  }
  function flake(){
    var p = '';
    for (var i = 0; i < 6; i++){ var r = i*Math.PI/3, c = Math.cos(r), s = Math.sin(r);
      p += '<line pathLength="1" x1="50" y1="50" x2="'+(50 + c*44).toFixed(1)+'" y2="'+(50 + s*44).toFixed(1)+'"/>';
      var bx = 50 + c*26, by = 50 + s*26;
      [-1,1].forEach(function(d){ var r2 = r + d*.7; p += '<line pathLength="1" x1="'+bx.toFixed(1)+'" y1="'+by.toFixed(1)+'" x2="'+(bx + Math.cos(r2)*12).toFixed(1)+'" y2="'+(by + Math.sin(r2)*12).toFixed(1)+'"/>'; });
    }
    return '<svg viewBox="0 0 100 100" aria-hidden="true">'+p+'<circle pathLength="1" cx="50" cy="50" r="7"/></svg>';
  }
  $$('[data-orn]').forEach(function(el){ el.innerHTML = el.getAttribute('data-orn') === 'fan' ? fan() : flake(); });

  /* ---- появления ---- */
  var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }); }, {rootMargin:'0px 0px -12% 0px'});
  $$('[data-a],[data-orn]').forEach(function(el){ io.observe(el); });

  /* ---- ближайшие даты флагмана из events.js ---- */
  var WD = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'], MG = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  function parse(d){ var p = d.split('-'); return new Date(+p[0], +p[1]-1, +p[2]); }
  var now = new Date(), todayISO = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
  var fl = (window.CLUB1_EVENTS || []).filter(function(e){ return e.page === 'molchat' && e.date >= todayISO && e.buy && (window.MOLCHAT_HIDE_WEEKDAYS || [0,4]).indexOf(parse(e.date).getDay()) < 0; })
    .sort(function(a,b){ return (a.date+a.time).localeCompare(b.date+b.time); });
  var dEl = $('[data-dates]');
  if (dEl) dEl.innerHTML = fl.slice(0, mobile ? 4 : 5).map(function(e){ var d = parse(e.date), g = d.getDay();
    return '<a href="'+e.buy+'" target="_blank" rel="noopener" data-buy><b>'+WD[g]+', '+d.getDate()+' '+MG[d.getMonth()]+'</b><small>'+e.time+'</small></a>'; }).join('');

  /* ---- шапка, параллакс, sticky-сцена ---- */
  var hdr = $('.hdr'), pars = $$('[data-par]'), ptm = $('#ptm'), panes = $$('#ptm .pane'), dots = $$('#ptm .dots i'), stage = -1, ticking = false;
  var bgs = panes.map(function(p){ return $('.bg', p); });
  function onScroll(){
    ticking = false;
    var y = scrollY, vh = innerHeight;
    hdr.classList.toggle('solid', y > 40);
    if (reduce) return;
    pars.forEach(function(img){ var r = img.parentNode.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return;
      var k = (r.top + r.height/2 - vh/2) / vh; img.style.transform = 'translate3d(0,'+(-k*parseFloat(img.getAttribute('data-par'))*100).toFixed(2)+'%,0)'; });
    if (!ptm || ptm.hasAttribute('data-auto')) return;   /* 11.11: витрина сетов листается сама (site.js) */
    var rr = ptm.getBoundingClientRect(), total = ptm.offsetHeight - vh, p = Math.min(1, Math.max(0, -rr.top / total));
    var s = p < .34 ? 0 : p < .67 ? 1 : 2;
    if (s !== stage){ stage = s; panes.forEach(function(el, i){ el.classList.toggle('on', i === s); }); dots.forEach(function(d, i){ d.classList.toggle('on', i === s); }); }
    bgs.forEach(function(b){ b.style.transform = 'scale('+(1.02 + p*.08).toFixed(4)+') translate3d(0,'+(-p*3).toFixed(2)+'%,0)'; });
  }
  addEventListener('scroll', function(){ if (!ticking){ ticking = true; requestAnimationFrame(onScroll); } }, {passive:true});
  addEventListener('resize', onScroll); onScroll();
  /* точки «Пробуй / Танцуй / Мечтай» — переход к своему слайду (п.37) */
  if (ptm && !ptm.hasAttribute('data-auto')) dots.forEach(function(d, i){ d.setAttribute('role','button'); d.setAttribute('tabindex','0'); d.setAttribute('aria-label', ['Пой','Танцуй','Мечтай'][i] || ('Слайд '+(i+1)));
    function go(){ var total = ptm.offsetHeight - innerHeight; scrollTo({top: ptm.getBoundingClientRect().top + scrollY + total*[.12,.5,.88][i], behavior: reduce ? 'auto' : 'smooth'}); }
    d.addEventListener('click', go); d.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); go(); } }); });

  /* прожектор на «Танцуй.» */
  var lamp = $('.lamp'), pB = $('#ptm .pB'), hasPtr = false;
  pB.parentNode.addEventListener('pointermove', function(e){ hasPtr = true; var r = pB.getBoundingClientRect();
    lamp.style.setProperty('--mx', ((e.clientX - r.left)/r.width*100).toFixed(1)+'%'); lamp.style.setProperty('--my', ((e.clientY - r.top)/r.height*100).toFixed(1)+'%'); }, {passive:true});

  /* ---- золотой снег на «Мечтай.» ---- */
  var gs = $('#gsnow'), gx = gs.getContext('2d'), gW = 0, gH = 0, fl2 = [], dpr = Math.min(devicePixelRatio || 1, 2);
  var spr = (function(){ var c = document.createElement('canvas'); c.width = c.height = 32; var g = c.getContext('2d'), r = g.createRadialGradient(16,16,0,16,16,16);
    r.addColorStop(0,'rgba(255,236,170,1)'); r.addColorStop(.3,'rgba(230,190,90,.7)'); r.addColorStop(1,'rgba(212,175,55,0)'); g.fillStyle = r; g.fillRect(0,0,32,32); return c; })();
  function gsize(){ gW = gs.clientWidth; gH = gs.clientHeight; gs.width = gW*dpr; gs.height = gH*dpr; gx.setTransform(dpr,0,0,dpr,0,0);
    fl2 = []; for (var i = 0; i < (mobile ? 70 : 140); i++) fl2.push({x:Math.random()*gW, y:Math.random()*gH, z:Math.random(), w:Math.random()*6}); }
  gsize(); addEventListener('resize', gsize);
  function gdraw(move){ gx.clearRect(0,0,gW,gH); gx.globalCompositeOperation = 'lighter';
    fl2.forEach(function(f){ if (move){ f.y += .2 + f.z*.7; f.w += .008; f.x += Math.sin(f.w)*.25; if (f.y > gH + 10){ f.y = -10; f.x = Math.random()*gW; } }
      var s = 3 + f.z*9; gx.globalAlpha = .25 + f.z*.55; gx.drawImage(spr, f.x - s/2, f.y - s/2, s, s); }); gx.globalAlpha = 1; }

  function tick(t){
    if (stage === 2 || reduce){ gdraw(!reduce); }
    if (stage === 1 && !hasPtr){ lamp.style.setProperty('--mx', (50 + Math.sin(t/1600)*22).toFixed(1)+'%'); lamp.style.setProperty('--my', (45 + Math.sin(t/1100)*10).toFixed(1)+'%'); }
    if (!reduce) requestAnimationFrame(tick);
  }
  if (reduce) tick(0); else requestAnimationFrame(tick);

  /* ---- карусель сетов и меню ---- */
  var track = $('.track'), slides = $$('.slide'), cd = $$('.cdots button'), cur = 0;
  function go(i){ cur = (i + slides.length) % slides.length; track.style.transform = 'translate3d('+(-cur*100)+'%,0,0)';
    slides.forEach(function(s, k){ s.classList.toggle('cur', k === cur); }); cd.forEach(function(d, k){ d.classList.toggle('on', k === cur); }); }
  $('.arr.prev').addEventListener('click', function(){ go(cur - 1); });
  $('.arr.next').addEventListener('click', function(){ go(cur + 1); });
  cd.forEach(function(d, k){ d.addEventListener('click', function(){ go(k); }); });
  var sx = null; track.addEventListener('touchstart', function(e){ sx = e.touches[0].clientX; }, {passive:true});
  track.addEventListener('touchend', function(e){ if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1)); sx = null; });
  /* названия блюд — по меню womanmusical.ru, без выдуманных «чувств» (приёмка 03.11, п.11, п.40) */
  var MENU = [
    ['Мясной сет', ['Паштет из печени цыплёнка с ягодной глазурью. Подаётся с вареньем из красного лука и кремом из чернослива, апельсинового сока, перца халапеньо и ферментированного чёрного чеснока.',
      'Хрустящие листья салата с кремом из вяленых томатов и запечённого сладкого перца, узбекскими томатами и кунжутной кимчи-заправкой. Дополняется ростбифом из говяжьей вырезки и кинзой.',
      'Томлёное говяжье ребро в устричной глазури. Подаётся с кремом из запечённого батата конфи и маринованным шпинатом.']],
    ['Рыбный сет', ['Сашими из свежего лосося и морского гребешка с грейпфрутом и авокадо, заправка из кинзы, сока лайма и мирина.',
      'Салат из манго и авокадо с обжаренной королевской креветкой в кисло-сладком соусе, узбекскими томатами и заправкой на основе ананасового сока.',
      'Лосось на углях с фирменной соевой глазурью, пак-чой, вешенки, крем из солёного арахиса и зелёный соус кресса.']],
    ['Вегетарианский сет', ['Запечённый баклажан на кунжутном масле с хумусом, бабаганушем и мухаммарой, зёрна граната и восточные специи.',
      'Леванский салат «Фатуш» с карамелизированным фило, огурцом, узбекскими томатами, перцем ромиро и брынзой.',
      'Мусака из запечённых овощей с пряным соусом и сальсой из томатов, базилик, копчёный сырный мусс, фисташка и заатар.']]];
  var dlg = $('#menu');
  var NAMES = [['Паштет из печени цыплёнка','Салат с ростбифом','Томлёное говяжье ребро'],['Сашими из лосося и гребешка','Салат с королевской креветкой','Лосось на углях'],['Баклажан с восточным мезе','Салат «Фатуш»','Мусака']];
  $$('[data-menu]').forEach(function(b){ b.addEventListener('click', function(){ var k = +b.getAttribute('data-menu'), m = MENU[k], L = ['Закуска','Салат','Горячее'];
    var KICK = window.MOLCHAT_SALE_MODE === 'addon' ? 'Авторский ужин · +2 200 ₽ к билету' : 'Авторский ужин · входит в билет'; /* режим продаж — из сборки (круг 5, п.102) */
    $('.body', dlg).innerHTML = '<p class="kick caps">'+KICK+'</p><h3 class="goldtext">'+m[0]+'</h3><dl>'+m[1].map(function(t, i){ return '<div><dt>'+L[i]+'</dt><dd><b>'+NAMES[k][i]+'</b>'+t+'</dd></div>'; }).join('')+'<div><dt>Десерт</dt><dd>Завершает ужин — входит в каждый сет.</dd></div></dl>';
    dlg.showModal(); }); });
  $('.x', dlg).addEventListener('click', function(){ dlg.close(); });
  dlg.addEventListener('click', function(e){ if (e.target === dlg) dlg.close(); });


  /* ---- логотип: проявление, параллакс от мыши, искры при наведении ---- */
  var lg = $('#lg');
  if (lg){
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ lg.classList.add('on'); }); });
    var heroEl = $('.hero');
    heroEl.style.perspective = '900px';
    if (!reduce) heroEl.addEventListener('pointermove', function(e){ var r = heroEl.getBoundingClientRect();
      var dx = (e.clientX - r.left)/r.width - .5, dy = (e.clientY - r.top)/r.height - .5;
      lg.style.transform = 'translate3d('+(dx*-16).toFixed(1)+'px,'+(dy*-10).toFixed(1)+'px,0) rotateX('+(dy*4).toFixed(2)+'deg) rotateY('+(dx*-5).toFixed(2)+'deg)'; }, {passive:true});
    var sc = $('.lg-sparks', lg), sx2 = sc.getContext('2d'), sp = [], sW = 0, sH = 0, over = false, mp = [0,0], sRun = false;
    function ssize(){ sW = sc.clientWidth; sH = sc.clientHeight; sc.width = sW*dpr; sc.height = sH*dpr; sx2.setTransform(dpr,0,0,dpr,0,0); }
    ssize(); addEventListener('resize', ssize);
    function spawn(x, y, n){ for (var i = 0; i < n; i++){ var a = Math.random()*6.283, v = .4 + Math.random()*2.2;
      sp.push({x:x, y:y, vx:Math.cos(a)*v, vy:Math.sin(a)*v - .6, life:1, s:2 + Math.random()*6}); } }
    /* звезда в логотипе: 55.9% × 19.6%; холст искр шире логотипа: left −30%, top −40%, 160% × 180% */
    function starXY(){ return [(.3 + .559)/1.6*sW, (.4 + .196)/1.8*sH]; }
    function sframe(){
      sx2.clearRect(0,0,sW,sH); sx2.globalCompositeOperation = 'lighter';
      if (over){ spawn(mp[0], mp[1], 3); if (Math.random() < .25){ var s0 = starXY(); spawn(s0[0], s0[1], 4); } }
      for (var i = sp.length - 1; i >= 0; i--){ var p = sp[i]; p.x += p.vx; p.y += p.vy; p.vy += .03; p.vx *= .985; p.life -= .016;
        if (p.life <= 0){ sp.splice(i,1); continue; }
        var s = p.s*p.life; sx2.globalAlpha = p.life; sx2.drawImage(spr, p.x - s, p.y - s, s*2, s*2); }
      sx2.globalAlpha = 1;
      if (sp.length || over) requestAnimationFrame(sframe); else sRun = false;
    }
    function kick(){ if (!sRun && !reduce){ sRun = true; requestAnimationFrame(sframe); } }
    var img = $('.lg-img', lg);
    img.addEventListener('pointerenter', function(){ over = true; kick(); });
    img.addEventListener('pointerleave', function(){ over = false; });
    img.addEventListener('pointermove', function(e){ var r = sc.getBoundingClientRect(); mp = [e.clientX - r.left, e.clientY - r.top]; over = true; kick(); }, {passive:true});
    var star = $('.lg-star', lg);
    star.addEventListener('animationiteration', function(){ var s0 = starXY(); spawn(s0[0], s0[1], 14); kick(); });
    if (!reduce) setTimeout(function(){ var s0 = starXY(); spawn(s0[0], s0[1], 18); kick(); }, 4300);
  }

  /* ---- дым-вьюга: WebGL ---- */
  var cv = $('#smoke'); if (!cv) return;
  var gl = cv.getContext('webgl', {premultipliedAlpha:true, antialias:false, alpha:true});
  if (!gl){ cv.style.display = 'none'; return; }
  var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FS = [
    'precision mediump float;uniform vec2 r;uniform float t;uniform vec2 m;uniform float rev;uniform float k;',
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}',
    'float fbm(vec2 p){float v=0.,a=.5;mat2 R=mat2(.8,-.6,.6,.8);for(int i=0;i<5;i++){v+=a*n(p);p=R*p*2.03;a*=.5;}return v;}',
    'void main(){vec2 uv=gl_FragCoord.xy/r;vec2 p=(gl_FragCoord.xy-.5*r)/r.y*2.1;float T=t*.04;',
    'vec2 mm=(m-.5*r)/r.y*2.1;float md=exp(-dot(p-mm,p-mm)*2.5);',
    'vec2 q=vec2(fbm(p+vec2(0.,T)),fbm(p+vec2(5.2,1.3)-T));',
    'vec2 w=vec2(fbm(p+3.*q+vec2(1.7,9.2)+vec2(T*1.6,-T*.8)+md*.7),fbm(p+3.*q+vec2(8.3,2.8)-T*1.1));',
    'float d=fbm(p+3.4*w+vec2(T*.5,0.));d=smoothstep(.38,.98,d);',
    'float c=length((uv-vec2(.5,.48))*vec2(r.x/r.y,1.));d*=mix(1.,.35+.65*smoothstep(.05,.85,c),rev);',
    'vec3 cream=vec3(.97,.93,.86),gold=vec3(.86,.66,.26);vec3 col=mix(gold,cream,smoothstep(.25,.85,w.x))*(.75+.4*q.y);',
    'float a=clamp(d*1.2*k,0.,.95);float dark=(1.-rev)*.9;',
    'gl_FragColor=vec4(col*a,a+dark*(1.-a));}'].join('');
  function sh(type, src){ var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)){ console.warn(gl.getShaderInfoLog(s)); return null; } return s; }
  var pr = gl.createProgram(), vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs){ cv.style.display = 'none'; return; }
  gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr); gl.useProgram(pr);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uR = gl.getUniformLocation(pr, 'r'), uT = gl.getUniformLocation(pr, 't'), uM = gl.getUniformLocation(pr, 'm'), uRev = gl.getUniformLocation(pr, 'rev'), uK = gl.getUniformLocation(pr, 'k');
  var scale = mobile ? .4 : .5, hero = $('.hero'), mouse = [-1e4, -1e4], sm = [-1e4, -1e4];
  function size(){ cv.width = Math.max(2, Math.round(hero.clientWidth*scale)); cv.height = Math.max(2, Math.round(hero.clientHeight*scale)); gl.viewport(0, 0, cv.width, cv.height); }
  size(); addEventListener('resize', size);
  hero.addEventListener('pointermove', function(e){ var r = hero.getBoundingClientRect(); mouse = [(e.clientX - r.left)*scale, (r.bottom - e.clientY)*scale]; }, {passive:true});
  var t0 = performance.now(), run = true, raf = 0;
  function frame(now){
    var t = (now - t0)/1000, rev = reduce ? 1 : Math.min(1, Math.max(0, (t - 1.4)/4)); rev = rev*rev*(3 - 2*rev);
    /* метель сгущается (0–1.6 с), потом расступается вокруг логотипа */
    var kk = reduce ? 1 : 1 + .7*Math.exp(-Math.pow((t - 1.5)/.9, 2)); gl.uniform1f(uK, kk);
    sm[0] += (mouse[0] - sm[0])*.05; sm[1] += (mouse[1] - sm[1])*.05;
    gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uT, reduce ? 20 : t + 20); gl.uniform2f(uM, sm[0], sm[1]); gl.uniform1f(uRev, rev);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (run && !reduce) raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  if (!reduce) new IntersectionObserver(function(es){ var v = es[0].isIntersecting;
    if (v && !run){ run = true; raf = requestAnimationFrame(frame); } else if (!v){ run = false; cancelAnimationFrame(raf); } }).observe(hero);
})();

/* ===== Демо-4: первый экран — видео + прозрачное название (knockout) + стеклянные плашки ===== */
(function(){
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function(s){ return document.querySelector(s) || __stub(); }, $$ = function(s){ return [].slice.call(document.querySelectorAll(s)); };
  var sec = $('.h4'); if (!sec) return;
  var stage = $('.h4 .stage'), svg = $('.h4 svg.ko'), texts = $$('.h4 .kot'), groups = $$('.h4 .kog'), veil = $('.h4 .veil'), rim = $('.h4 .rim');
  var sub = $('.h4 .sub4'), ui = $('.h4 .ui'), plate = $('.h4 .cta4');

  /* шрифт названия: ?font=3 Oswald 700 (по умолчанию, решение Ал) · 1 Playfair Display 900 · 2 Yeseva One */
  var FONTS = {1:['"Playfair Display", Georgia, serif', 900], 2:['"Yeseva One", Georgia, serif', 400], 3:['Oswald, "Arial Narrow", sans-serif', 700]};
  var fk = +(new URLSearchParams(location.search).get('font')) || 3; if (!FONTS[fk]) fk = 3;
  /* режим: по умолчанию сплошной логотип шоу поверх видео (решение Ал); ?mode=knockout — прозрачные буквы */
  var KO = new URLSearchParams(location.search).get('mode') === 'knockout';
  document.documentElement.setAttribute('data-mode', KO ? 'knockout' : 'solid');
  var slogo = $('.h4 .showlogo'), dim = $('.h4 .dim4');
  if (!KO){ var sl = $('.h4 .slog4'); if (sl) sl.innerHTML = '<i>Пробуй.</i> Пой. Танцуй.'; }
  document.documentElement.style.setProperty('--ko-font', FONTS[fk][0]); document.documentElement.style.setProperty('--ko-w', FONTS[fk][1]);
  if (new URLSearchParams(location.search).has('debug')) $('.fontpick').hidden = false;
  $$('.fontpick a').forEach(function(a, i){ a.classList.toggle('on', KO ? (i > 0 && +((a.getAttribute('href').match(/font=(\d)/) || [])[1]) === fk) : i === 0); });

  /* видео: телефону — вертикальная версия 720×1280 */
  var v = $('#hv'), mob = innerWidth < 700 || innerHeight > innerWidth;
  v.poster = mob ? v.getAttribute('data-poster-m') : v.poster; $('.h4 .poster').src = v.poster;
  v.src = mob ? v.getAttribute('data-src-m') : v.getAttribute('data-src');
  if (!reduce){ v.autoplay = true; var pr = v.play(); if (pr && pr.catch) pr.catch(function(){}); }
  v.addEventListener('playing', function(){ $('.h4 .poster').style.opacity = 0; });

  /* данные: ближайший вечер флагмана и мини-афиша */
  var WD = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'], MG = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  function iso(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function parse(s){ var p = s.split('-'); return new Date(+p[0], +p[1]-1, +p[2]); }
  var now = new Date(), T = iso(now), tm = new Date(now); tm.setDate(tm.getDate()+1); var TM = iso(tm);
  var ev = (window.CLUB1_EVENTS || []).filter(function(e){ return e.date >= T; }).sort(function(a,b){ return (a.date+(a.time||'')).localeCompare(b.date+(b.time||'')); });
  var HW = window.MOLCHAT_HIDE_WEEKDAYS || [0,4]; /* вс и чт сняты с продажи (Ал 03.11), как в dates-live.js */
  var fl = ev.filter(function(e){ return e.page === 'molchat' && HW.indexOf(parse(e.date).getDay()) < 0; }), st = ev.filter(function(e){ return e.page !== 'molchat' && e.format !== 'musical'; });
  if (fl[0]){ var e = fl[0], d = parse(e.date);
    ($('[data-when]')||{}).textContent = e.date === T ? 'Сегодня в Метелице' : e.date === TM ? 'Завтра в Метелице' : 'Ближайший вечер · '+WD[d.getDay()]+', '+d.getDate()+' '+MG[d.getMonth()];
    ($('[data-what]')||{}).textContent = 'О чём молчат женщины, '+e.time;
    ($('[data-c1]')||{}).textContent = fl.slice(0,3).map(function(x){ var q = parse(x.date); return WD[q.getDay()]+' '+q.getDate()+'.'+String(q.getMonth()+1).padStart(2,'0'); }).join(' · ');
  }
  if (st[0]){ var q = parse(st[0].date); ($('[data-c2]')||{}).textContent = 'Ближайший: '+WD[q.getDay()]+', '+q.getDate()+' '+MG[q.getMonth()]; }

  /* раскладка названия: три строки со сдвигом, как у Одеона; подгонка по самой длинной — «ЖЕНЩИНЫ» */
  var W = 0, H = 0, origin = [0,0];
  var LINES = ['О ЧЁМ','МОЛЧАТ','ЖЕНЩИНЫ'], SHIFT = [.18, .82, 0];
  function setText(){
    texts.forEach(function(t){
      t.textContent = ''; t.setAttribute('text-anchor', 'start');
      LINES.forEach(function(s, i){ var ts = document.createElementNS('http://www.w3.org/2000/svg','tspan'); if (i) ts.setAttribute('dy', fk === 3 ? '0.98em' : '0.92em'); ts.textContent = s; t.appendChild(ts); });
    });
  }
  function layoutSolid(){
    W = stage.clientWidth; H = stage.clientHeight; var mob = W < 700;
    var lw = Math.min(W * (mob ? .9 : .56), H * (mob ? .3 : .37) * 1137 / 634), lh = lw * 634 / 1137, top = H * (mob ? .13 : .1);
    slogo.style.width = lw + 'px'; slogo.style.marginLeft = (-lw / 2) + 'px'; slogo.style.top = top + 'px';
    origin = [W / 2, top + lh * .55];
    sub.style.left = '0'; sub.style.right = '0'; sub.style.width = ''; sub.style.textAlign = 'center'; sub.classList.remove('side');
    sub.style.top = (top + lh + H * .02) + 'px';
    var pt = top + lh + H * .015 + sub.offsetHeight + H * .03;
    plate.style.top = pt + 'px';
    onScroll();
  }
  function layout(){
    if (!KO) return layoutSolid();
    W = stage.clientWidth; H = stage.clientHeight; setText();
    var mob = W < 700, t = texts[0];
    texts.forEach(function(x){ x.setAttribute('font-size', 100); x.setAttribute('y', 0); x.setAttribute('letter-spacing', fk === 3 ? '0.01em' : '0'); });
    var ws = [].map.call(t.childNodes, function(n){ return n.getComputedTextLength(); }), wmax = Math.max.apply(null, ws);
    var A = W * (mob ? .92 : .9), fs = Math.min(100 * A / wmax, H * (mob ? .17 : .155));
    texts.forEach(function(x){ x.setAttribute('font-size', fs); });
    ws = ws.map(function(w){ return w * fs / 100; }); wmax = Math.max.apply(null, ws);
    var L = (W - wmax) / 2, span = Math.min(W * .9, wmax + W * (mob ? 0 : .16)); L = (W - span) / 2;
    texts.forEach(function(x){ [].forEach.call(x.childNodes, function(n, i){ n.setAttribute('x', (L + (span - ws[i]) * SHIFT[i]).toFixed(1)); }); });
    var bb = t.getBBox(), top = H * (mob ? .12 : .11) + (mob ? 0 : 6), y = top - bb.y;
    texts.forEach(function(x){ x.setAttribute('y', y.toFixed(1)); });
    bb = t.getBBox();
    /* «влёт» — в ствол «М» второй строки (символ 5): сплошная вертикаль, увеличение открывает видео */
    var ex; try { ex = t.getExtentOfChar(5); } catch(err){ ex = {x: W/2, y: H/2, width: 0, height: 0}; }
    origin = [ex.x + ex.width * .14, ex.y + ex.height * .55];
    var bottom = bb.y + bb.height, pt;
    if (!mob){
      /* на широком экране подпись и слоган — справа от «О ЧЁМ», как фраза справа у Одеона */
      var l1 = t.childNodes[0], x1 = parseFloat(l1.getAttribute('x')) + ws[0], e0 = t.getExtentOfChar(0);
      sub.style.left = (x1 + W * .035) + 'px'; sub.style.right = 'auto'; sub.style.textAlign = 'left';
      sub.style.width = Math.max(260, W - L - x1 - W * .035) + 'px';
      sub.style.top = (e0.y + e0.height * .5 - sub.offsetHeight / 2) + 'px';
      sub.classList.add('side');
      pt = bottom + H * .035;
    } else {
      sub.style.left = '0'; sub.style.right = '0'; sub.style.width = ''; sub.style.textAlign = 'center'; sub.classList.remove('side');
      sub.style.top = (bottom + H * .02) + 'px';
      pt = bottom + H * .02 + sub.offsetHeight + H * .025;
    }
    plate.style.top = pt + 'px';
    onScroll();
  }
  function ease(x){ return x*x*x; }
  function sm(a, b, x){ x = Math.min(1, Math.max(0, (x - a)/(b - a))); return x*x*(3 - 2*x); }
  function onScroll(){
    var den = sec.offsetHeight - H, p = (reduce || !(den > 0)) ? 0 : Math.min(1, Math.max(0, -sec.getBoundingClientRect().top / den)); /* без NaN, когда секция не выше экрана (приёмка 03.11, п.41) */
    var s = 1 + 70*ease(sm(0, .9, p));
    var tr = 'translate('+origin[0]+' '+origin[1]+') scale('+s+') translate('+(-origin[0])+' '+(-origin[1])+')';
    groups.forEach(function(g){ g.setAttribute('transform', tr); });
    if (!KO){ var k = sm(0, .8, p); slogo.style.transform = 'scale(' + (1 + 1.6 * k * k).toFixed(3) + ')'; slogo.style.opacity = (1 - sm(.1, .6, p)).toFixed(3);
      dim.style.opacity = (1 - sm(.15, .8, p)).toFixed(3); }
    veil.setAttribute('fill-opacity', (.9*(1 - sm(.3, .85, p))).toFixed(3));
    rim.style.opacity = (1 - sm(.05, .35, p)).toFixed(3);
    var f = (1 - sm(0, .18, p)).toFixed(3); ui.style.opacity = f; sub.style.opacity = f; ui.style.pointerEvents = f < .1 ? 'none' : '';
  }
  addEventListener('scroll', function(){ requestAnimationFrame(onScroll); }, {passive:true});
  var rt; addEventListener('resize', function(){ clearTimeout(rt); rt = setTimeout(layout, 120); });
  function go(){ layout(); requestAnimationFrame(function(){ document.documentElement.classList.add('ready'); }); }
  var fam = {1:'900 100px "Playfair Display"', 2:'400 100px "Yeseva One"', 3:'700 100px Oswald'}[fk];
  if (document.fonts && document.fonts.load) Promise.race([document.fonts.load(fam, 'О ЧЁМ МОЛЧАТ ЖЕНЩИНЫ'), new Promise(function(r){ setTimeout(r, 2500); })]).then(go, go); else go();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  var lk = document.querySelector('link[href*="fonts.googleapis.com/css2"]');
  if (lk) lk.addEventListener('load', function(){ if (document.fonts) document.fonts.load(fam, 'О ЧЁМ МОЛЧАТ ЖЕНЩИНЫ').then(layout, layout); });
})();

/* ===== Демо-4е: искры костра летят вверх по странице (лёгкий слой, ~40 искр) ===== */
(function(){
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var c = document.getElementById('embers'); if (!c) return;
  var x = c.getContext('2d'), W = 0, H = 0, dpr = Math.min(devicePixelRatio || 1, 2), P = [], N = innerWidth < 700 ? 22 : 42;
  function size(){ W = innerWidth; H = innerHeight; c.width = W*dpr; c.height = H*dpr; x.setTransform(dpr,0,0,dpr,0,0); }
  function mk(any){ return {x: Math.random()*W, y: any ? Math.random()*H : H + 10, v: .25 + Math.random()*.7, s: .6 + Math.random()*1.8, w: Math.random()*6.28, l: .3 + Math.random()*.6, h: Math.random() < .5 ? '255,213,138' : '233,162,59'}; }
  size(); for (var i = 0; i < N; i++) P.push(mk(true)); addEventListener('resize', size);
  var run = true; document.addEventListener('visibilitychange', function(){ run = !document.hidden; if (run) requestAnimationFrame(f); });
  function f(){
    x.clearRect(0,0,W,H);
    for (var i = 0; i < P.length; i++){ var p = P[i]; p.y -= p.v; p.w += .02; p.x += Math.sin(p.w)*.35;
      if (p.y < -10) P[i] = mk(false);
      var a = p.l * Math.min(1, p.y / (H*.35));
      x.beginPath(); x.arc(p.x, p.y, p.s, 0, 6.283); x.fillStyle = 'rgba('+p.h+','+a.toFixed(3)+')'; x.shadowColor = 'rgba(255,170,60,.9)'; x.shadowBlur = 6; x.fill(); }
    if (run) requestAnimationFrame(f);
  }
  requestAnimationFrame(f);
})();
