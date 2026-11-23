/* Карта «Как добраться»: тёмная подложка CARTO + золотая метка «Метелицы», метро. Без рекламы виджета (01.11). */
(function(){
  var el=document.getElementById('map5'); if(!el||!window.L) return;
  var lat=+el.dataset.lat, lon=+el.dataset.lon;
  var map=L.map(el,{zoomControl:false,scrollWheelZoom:false,attributionControl:true}).setView([lat,lon],16);
  L.control.zoom({position:'bottomright'}).addTo(map);
  map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>'); /* без значка-флага Leaflet 1.9 (приёмка 03.11, п.55) */
  /* подложка — свои квадраты OpenStreetMap в img/tiles (15.11): превью claude.ai не грузит внешние картинки, живая подгрузка тормозила.
     Район — маршруты от метро + запас, масштабы 14–18 (19 — растянутый 18). Маршруты не менялись. Скачать заново: _работа/87-сайт/скачать-квадраты-карты.py */
  var TB=L.latLngBounds([55.748308,37.581927],[55.753605,37.602869]);
  L.tileLayer('img/tiles/{z}/{x}/{y}.png',{minZoom:14,maxZoom:19,maxNativeZoom:18,bounds:TB,
    attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
  map.setMinZoom(14); map.setMaxBounds(TB.pad(0.05));
  var star='<svg viewBox="0 0 24 24"><path d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z"/></svg>';
var STAR8='<svg viewBox="0 0 24 24"><path fill="#ffd99a" d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z"/></svg>';
var FLAKE='<svg viewBox="0 0 24 24"><path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M12 2l-2 2m2-2l2 2M12 22l-2-2m2 2l2-2"/></svg>';
var V=[
 ['v1','1 · Логотип в капле','Классическая «булавка» карты, внутри — логотип «Метелица CLUB1». Качается.',
  '<span class="sh"></span><span class="pinb"><svg viewBox="0 0 52 62"><path d="M26 61C26 61 4 38 4 24A22 22 0 0 1 48 24C48 38 26 61 26 61Z" fill="#140c07" stroke="#e9a24a" stroke-width="2.5"/></svg><img src="img/logo-metelitsa-rgba.png" alt=""></span>'],
 ['v2','2 · Снежинка-метель','«Метелица» = метель: серебряная снежинка медленно вращается, вокруг — морозная волна.',
  '<span class="p"></span><span class="c">'+FLAKE+'</span><span class="lab">Метелица</span>'],
 ['v3','3 · Неоновая вывеска','Табличка с логотипом над точкой входа, слегка мерцает как неон.',
  '<span class="dot"></span><span class="sign"><img src="img/logo-metelitsa-rgba.png" alt="Метелица"></span>'],
 ['v4','4 · Клош — ужин','Ресторанный колпак на зелёном (цвет шоу): сразу ясно, что здесь едят.',
  '<span class="p"></span><span class="c"><svg viewBox="0 0 24 24"><path d="M12 5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm-9 12a9 9 0 0 1 18 0zm-1 1h20v2H2z"/></svg></span><span class="lab">Метелица</span>'],
 ['v5','5 · Звезда-вспышка','Звезда из бренда шоу с вращающимися лучами — как прожектор.',
  '<svg class="rays" viewBox="0 0 92 92"><g stroke="#ffd99a" stroke-width="1.5" opacity=".7">'+Array.from({length:12},function(_,i){var a=i*30*Math.PI/180;return '<line x1="'+(46+18*Math.cos(a))+'" y1="'+(46+18*Math.sin(a))+'" x2="'+(46+44*Math.cos(a))+'" y2="'+(46+44*Math.sin(a))+'"/>'}).join('')+'</g></svg><span class="s">'+STAR8+'</span><span class="lab">Метелица</span>'],
 ['v6','6 · Фасад в медальоне','Круглое фото фасада «Метелицы» в золотой рамке — гость узнает вход.',
  '<span class="med"><img src="img/our/v-fasad.jpg" alt=""></span><span class="lab">Метелица</span>'],
 ['v7','7 · Розовый пин шоу','Пин в малиновом цвете шоу со звездой — выделяется на тёмной карте сильнее всего.',
  '<span class="sh"></span><span class="c">'+STAR8.replace('#ffd99a','#fff')+'</span><span class="lab" style="top:-48px">Метелица</span>'],
 ['v8','8 · Минимал','Тонкое золотое кольцо с точкой и подпись капсом. Строго и дорого.',
  '<span class="r2"></span><span class="r"></span><span class="d"></span><span class="lab">Метелица</span>']];
  var CUR=L.marker([lat,lon],{icon:L.divIcon({className:'pin5',html:'<span class="pin5-pulse"></span><span class="pin5-dot">'+star+'</span><span class="pin5-lab">Метелица</span>',iconSize:[0,0]})}).addTo(map);
  function setPin(i){CUR.setIcon(i===0?L.divIcon({className:'pin5',html:'<span class="pin5-pulse"></span><span class="pin5-dot">'+star+'</span><span class="pin5-lab">Метелица</span>',iconSize:[0,0]}):L.divIcon({className:'ic '+V[i-1][0],html:V[i-1][3],iconSize:[0,0]}));
    document.querySelectorAll('.pick5 button').forEach(function(b){b.classList.toggle('on',+b.dataset.i===i)});}
  /* значок = сам логотип «Метелица CLUB 1», центром ровно на месте «Club1» (Ал 01.11 21:00) */
  map.removeLayer(CUR); /* логотип пока убран (Ал 01.11 21:05) */
  /* последний отрезок — от тротуара Нового Арбата до двери, сплошной (Ал: «до дверей») */
  L.circleMarker([lat,lon],{radius:7,color:'#0d0806',weight:3,fillColor:'#ffd99a',fillOpacity:1}).addTo(map);
  /* логотип внутри пустого прямоугольника между тротуаром и входом, справа от линии к двери (Ал 01.11 21:07) */
  var LOGO_B=[[lat-0.000120,lon-0.000140],[lat+0.000000,lon-0.000140+0.000390]]; /* меньше и ниже (Ал 21:10) */
  var logoOv=L.imageOverlay('img/logo-metelitsa-rgba.png',LOGO_B,{className:'logo-ov5',interactive:false}).addTo(map);
  function lv(){var z=map.getZoom(),e=logoOv.getElement();if(e)e.style.display=z>=17?'':'none';}
  map.on('zoomend',lv);lv();
  window.__map5=map;
  var R=window.ROUTES5||{};
  [['smol','#ffd99a','Смоленская'],['arb','#e9a24a','Арбатская']].forEach(function(r){ var pts=R[r[0]]; if(!pts)return;
    L.polyline(pts,{color:r[1],weight:12,opacity:.22}).addTo(map);
    L.polyline(pts,{color:r[1],weight:4,opacity:.95,className:'run5',lineCap:'round'}).addTo(map);
    L.marker(pts[0],{icon:L.divIcon({className:'metro5',html:'<span class="m5i">М</span><span>'+r[2]+'</span>',iconSize:[0,0]})}).addTo(map);});
  /* сразу показываем вход крупно, чтобы на подложке было видно «Club1» (Ал 01.11) */
  map.setView([lat+0.00012,lon],18);
  var tg=document.createElement('div');tg.className='zoom5';
  tg.innerHTML='<button data-z="door" class="on">Вход крупно</button><button data-z="all">Путь от метро</button>';
  el.parentNode.appendChild(tg);
  tg.querySelectorAll('button').forEach(function(b){b.onclick=function(e){e.stopPropagation();
    tg.querySelectorAll('button').forEach(function(x){x.classList.toggle('on',x===b)});
    if(b.dataset.z==='door')map.flyTo([lat+0.00012,lon],18,{duration:.8});
    else if(R.smol&&R.arb)map.flyToBounds(L.latLngBounds(R.smol.concat(R.arb)),{paddingTopLeft:[40,90],paddingBottomRight:[40,60],duration:.8});};});
  el.addEventListener('click',function(){map.scrollWheelZoom.enable();});
  document.querySelectorAll('.rt[data-route]').forEach(function(a){a.addEventListener('click',function(){
    if(window.ym)try{ym(111571199,'reachGoal','route_click',{via:a.dataset.route})}catch(e){}});});
})();
