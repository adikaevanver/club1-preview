/* =====================================================================
   CLUB №1 — events.js · ДАННЫЕ АФИШИ
   ---------------------------------------------------------------------
   Источник: операционная таблица маркетинга (лист «Все мероприятия»,
   выгрузка 2026-07-08) + афиши дизайна с Яндекс.Диска. Времена указаны
   только там, где они подтверждены первоисточником (напечатаны на афише,
   стоят в таблице или в разметке живого сайта); у остальных событий
   time:null — карточка показывает только дату.

   Поля:
     date   ISO-дата события
     time   'HH:MM' | null (не подтверждено)
     title  имя артиста / название шоу (заголовок карточки)
     kind   подпись жанра на CSS-постере (когда нет настоящей афиши)
     format ключ из CLUB1_FORMATS
     poster путь к настоящей афише | null → CSS-постер
     photo  фото артиста для CSS-постера | null
     tone   цветовой вариант CSS-постера (cyan/gold/mag/pur/green/sky/mono)
     page   внутренняя страница превью («Подробнее»)
     buy    живая страница с билетным виджетом | null → продажи не открыты
     age    возрастная маркировка | null (не подтверждена)
   ===================================================================== */
window.CLUB1_FORMATS = {
  solniki:   'Сольники',
  ok:        'От опытных комиков',
  gorod:     'В большом городе',
  pereigraem:'Давай переиграем',
  community: 'Комьюнити',
  burlesque: 'Burlesque & Stand Up',
  krashi:    'ВИА Ваши Краши',
  special:   'Спецпроекты'
};

window.CLUB1_EVENTS = [
  {date:'2026-07-09', time:'18:30', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:590,
   poster:'assets/posters/ok-sq.jpg', photo:null, tone:'mono', page:'show.html',
   buy:'https://clubnaarbate21.ru/proverka-ot-opytnyh-komikov', age:'18+'},
  {date:'2026-07-09', time:'20:30', title:'Гурам Амарян', kind:'Сольный концерт', format:'solniki', priceFrom:2000,
   poster:'assets/posters/guram-0907-sq.jpg', photo:null, tone:'mag', page:'solnik.html',
   buy:'https://clubnaarbate21.ru/guram-amaryan-stand-up', age:'18+'},
  {date:'2026-07-09', time:'21:00', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:590,
   poster:'assets/posters/ok-sq.jpg', photo:null, tone:'mono', page:'show.html',
   buy:'https://clubnaarbate21.ru/proverka-ot-opytnyh-komikov', age:'18+'},

  {date:'2026-07-10', time:'20:00', title:'Burlesque & Stand Up', kind:'Шоу', format:'burlesque', priceFrom:1700,
   poster:'assets/posters/burlesk-1007-sq.jpg', photo:null, tone:'pur', page:'razovoe.html',
   buy:'https://clubnaarbate21.ru/burlesque-stand-up-10-07', age:'18+'},
  {date:'2026-07-10', time:'20:30', title:'ВИА Ваши Краши', kind:'Шоу', format:'krashi', priceFrom:1200,
   poster:'assets/posters/krashi-1007-sq.jpg', photo:null, tone:'sky', page:'razovoe.html',
   buy:'https://clubnaarbate21.ru/vashi-krashi-10-07', age:'18+'},
  {date:'2026-07-10', time:'17:30', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:590,
   poster:'assets/posters/ok-sq.jpg', photo:null, tone:'mono', page:'show.html',
   buy:'https://clubnaarbate21.ru/proverka-ot-opytnyh-komikov', age:'18+'},

  {date:'2026-07-11', time:'19:00', title:'Выпускной', kind:'Спецпроект', format:'special', priceFrom:1100,
   poster:null, photo:null, tone:'gold', page:'razovoe.html',
   buy:'https://iframeab-pre7764.intickets.ru/seance/73128048/', age:'18+'},
  {date:'2026-07-11', time:'21:30', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:590,
   poster:'assets/posters/ok-sq.jpg', photo:null, tone:'mono', page:'show.html',
   buy:'https://clubnaarbate21.ru/proverka-ot-opytnyh-komikov', age:'18+'},

  {date:'2026-07-12', time:'19:30', title:'В большом городе', kind:'Сборный концерт', format:'gorod', priceFrom:800,
   poster:null, photo:null, tone:'cyan', page:'show.html',
   buy:'https://clubnaarbate21.ru/stand-up-v-bolshom-gorode', age:null},
  {date:'2026-07-12', time:'17:00', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:590,
   poster:'assets/posters/ok-sq.jpg', photo:null, tone:'mono', page:'show.html',
   buy:'https://clubnaarbate21.ru/proverka-ot-opytnyh-komikov', age:'18+'},

  {date:'2026-07-16', time:null, title:'Гастростендап', kind:'Спецпроект', format:'special',
   poster:null, photo:null, tone:'green', page:'razovoe.html', buy:null, age:null},
  {date:'2026-07-16', time:'20:00', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:590,
   poster:'assets/posters/ok-sq.jpg', photo:null, tone:'mono', page:'show.html',
   buy:'https://clubnaarbate21.ru/proverka-ot-opytnyh-komikov', age:'18+'},

  {date:'2026-07-17', time:'21:00', title:'Burlesque & Stand Up', kind:'Шоу', format:'burlesque', priceFrom:1700,
   poster:'assets/posters/burlesk-1707-sq.jpg', photo:null, tone:'pur', page:'razovoe.html',
   buy:'https://clubnaarbate21.ru/burlesque-stand-up-17-07', age:'18+'},

  {date:'2026-07-18', time:'18:30', title:'В большом городе', kind:'Сборный концерт', format:'gorod', priceFrom:800,
   poster:null, photo:null, tone:'cyan', page:'show.html',
   buy:'https://clubnaarbate21.ru/stand-up-v-bolshom-gorode', age:null},
  {date:'2026-07-18', time:'19:00', title:'Артём Винокур', kind:'Сольный концерт', format:'solniki', priceFrom:1500,
   poster:'assets/posters/vinokur-1807-sq.jpg', photo:null, tone:'green', page:'solnik.html',
   buy:'https://clubnaarbate21.ru/artem-vinokur-stand-up', age:'18+'},

  {date:'2026-07-22', time:'20:30', title:'Гурам Амарян', kind:'Сольный концерт', format:'solniki', priceFrom:2000,
   poster:'assets/posters/guram-2207-sq.jpg', photo:null, tone:'mag', page:'solnik.html',
   buy:'https://clubnaarbate21.ru/guram-amaryan-stand-up', age:'18+'},
  {date:'2026-07-22', time:'19:00', title:'Стендап мастер-класс', kind:'Спецпроект', format:'special', priceFrom:1100,
   poster:null, photo:null, tone:'gold', page:'razovoe.html',
   buy:'https://clubnaarbate21.ru/mk-22-07', age:null},
  {date:'2026-07-22', time:'21:30', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:590,
   poster:'assets/posters/ok-sq.jpg', photo:null, tone:'mono', page:'show.html',
   buy:'https://clubnaarbate21.ru/proverka-ot-opytnyh-komikov', age:'18+'},

  {date:'2026-07-23', time:'19:00', title:'Психологический стендап', kind:'Стендап-шоу', format:'special', priceFrom:2500,
   poster:null, photo:null, tone:'pur', page:'razovoe.html',
   buy:'https://clubnaarbate21.ru/psy-stand-up-23-07', age:null},
  {date:'2026-07-23', time:'20:00', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:590,
   poster:'assets/posters/ok-sq.jpg', photo:null, tone:'mono', page:'show.html',
   buy:'https://clubnaarbate21.ru/proverka-ot-opytnyh-komikov', age:'18+'},

  {date:'2026-07-24', time:'21:00', title:'В большом городе', kind:'Сборный концерт', format:'gorod', priceFrom:800,
   poster:null, photo:null, tone:'cyan', page:'show.html',
   buy:'https://clubnaarbate21.ru/stand-up-v-bolshom-gorode', age:null},
  {date:'2026-07-24', time:'18:30', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:590,
   poster:'assets/posters/ok-sq.jpg', photo:null, tone:'mono', page:'show.html',
   buy:'https://clubnaarbate21.ru/proverka-ot-opytnyh-komikov', age:'18+'},

  {date:'2026-07-25', time:'16:00', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:590,
   poster:'assets/posters/ok-sq.jpg', photo:null, tone:'mono', page:'show.html',
   buy:'https://clubnaarbate21.ru/proverka-ot-opytnyh-komikov', age:'18+'},
  {date:'2026-07-25', time:'19:00', title:'Илья Раевский', kind:'Сольный концерт', format:'solniki', priceFrom:1500,
   poster:'assets/posters/raevskiy-2507-sq.jpg', photo:null, tone:'gold', page:'raevskiy.html',
   buy:'https://clubnaarbate21.ru/ilya-raevsky-stand-up', age:'18+'},
  {date:'2026-07-25', time:null, title:'В большом городе', kind:'Сборный концерт', format:'gorod', priceFrom:800,
   poster:null, photo:null, tone:'cyan', page:'show.html',
   buy:'https://clubnaarbate21.ru/stand-up-v-bolshom-gorode', age:null},
  {date:'2026-07-25', time:'21:00', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:590,
   poster:'assets/posters/ok-sq.jpg', photo:null, tone:'mono', page:'show.html',
   buy:'https://clubnaarbate21.ru/proverka-ot-opytnyh-komikov', age:'18+'},

  {date:'2026-07-30', time:'19:00', title:'Эйчар стендап', kind:'Спецпроект', format:'special', priceFrom:2500,
   poster:null, photo:null, tone:'sky', page:'razovoe.html',
   buy:'https://clubnaarbate21.ru/hr-stand-up-30-07', age:null},
  {date:'2026-07-30', time:'20:00', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:590,
   poster:'assets/posters/ok-sq.jpg', photo:null, tone:'mono', page:'show.html',
   buy:'https://clubnaarbate21.ru/proverka-ot-opytnyh-komikov', age:'18+'},

  {date:'2026-07-31', time:'19:30', title:'Илья Раевский', kind:'Сольный концерт', format:'solniki', priceFrom:1500,
   poster:'assets/posters/raevskiy-3107-sq.jpg', photo:null, tone:'green', page:'raevskiy.html',
   buy:'https://clubnaarbate21.ru/ilya-raevsky-stand-up', age:'18+'},
  {date:'2026-07-31', time:'21:00', title:'В большом городе', kind:'Сборный концерт', format:'gorod', priceFrom:800,
   poster:null, photo:null, tone:'cyan', page:'show.html',
   buy:'https://clubnaarbate21.ru/stand-up-v-bolshom-gorode', age:null},
  {date:'2026-07-31', time:'18:30', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:590,
   poster:'assets/posters/ok-sq.jpg', photo:null, tone:'mono', page:'show.html',
   buy:'https://clubnaarbate21.ru/proverka-ot-opytnyh-komikov', age:'18+'},

  {date:'2026-08-01', time:'19:00', title:'Расул Чабдаров', kind:'Сольный концерт', format:'solniki', priceFrom:1500,
   poster:null, photo:'assets/comics/chabdarov.jpg', tone:'mag', page:'solnik.html',
   buy:'https://clubnaarbate21.ru/rasul-chabdarov-stand-up', age:null},
  {date:'2026-08-08', time:'19:00', title:'Расул Чабдаров', kind:'Сольный концерт', format:'solniki', priceFrom:1500,
   poster:null, photo:'assets/comics/chabdarov.jpg', tone:'pur', page:'solnik.html',
   buy:'https://clubnaarbate21.ru/rasul-chabdarov-stand-up', age:null},
  {date:'2026-09-12', time:'19:00', title:'Расул Чабдаров', kind:'Сольный концерт', format:'solniki', priceFrom:1500,
   poster:null, photo:'assets/comics/chabdarov.jpg', tone:'mag', page:'solnik.html',
   buy:'https://clubnaarbate21.ru/rasul-chabdarov-stand-up', age:null},
  {date:'2026-09-19', time:'19:00', title:'Расул Чабдаров', kind:'Сольный концерт', format:'solniki', priceFrom:1500,
   poster:null, photo:'assets/comics/chabdarov.jpg', tone:'pur', page:'solnik.html',
   buy:'https://clubnaarbate21.ru/rasul-chabdarov-stand-up', age:null}
];
