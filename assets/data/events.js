/* =====================================================================
   CLUB №1 — events.js · ДАННЫЕ АФИШИ
   ---------------------------------------------------------------------
   Источник: операционная таблица маркетинга (лист «Все мероприятия»,
   пересборка 2026-07-26 со страниц живого сайта: даты, времена и виджет-ссылки сняты с кнопок покупки; афиши — артворк событийных страниц) + афиши дизайна с Яндекс.Диска. Времена указаны
   только там, где они подтверждены первоисточником (напечатаны на афише,
   стоят в таблице или в разметке живого сайта); у остальных событий
   time:null — карточка показывает только дату.

   Поля:
     date   ISO-дата события
     time   'HH:MM' | null (не подтверждено)
     title  имя артиста / название шоу (заголовок карточки)
     kind   подпись жанра на CSS-постере (когда нет настоящей афиши)
     format ключ из CLUB1_FORMATS
     poster путь к настоящей афише 1080×1350 (4:5, родной размер карточки;
            старые квадраты 1:1 живут под размытой подложкой) | null → CSS-постер
     photo  фото артиста для CSS-постера | null
     tone   цветовой вариант CSS-постера (cyan/gold/mag/pur/green/sky/mono)
     page   внутренняя страница превью («Подробнее»)
     buy    ПРЯМАЯ виджет-ссылка покупки (intickets/Я.Билеты) | null
     wide   панорамная афиша 1920×800 (12:5, родное окно хиро-слайдера) | null
     wide169 переходный арт 16:9 для событий, на которые панорамы ещё нет:
            слайдер показывает его целиком, а не кропает в 12:5. Ставится
            вместе с wide:null; уходит, когда Максим пришлёт панораму
     age    возрастная маркировка | null (не подтверждена)
   ===================================================================== */
/* Единый словарь категорий (правки 24.07): без повторов, партнёрские и
   разовые форматы живут в «Других шоу» (до правок Фигмы 31.07 —
   «Спецпроекты»: слово гостю непонятно, замену дал Сергей). «Сольные
   концерты» — выбранный вариант переименования «Сольников» (второй
   кандидат был «Сольные стендапы»); название используется
   последовательно на всём сайте. */
window.CLUB1_FORMATS = {
  solniki:   'Сольные концерты',
  ok:        'Stand Up от опытных комиков',
  gorod:     'Stand Up в большом городе',
  pereigraem:'Давай переиграем',
  community: 'Комьюнити',
  burlesque: 'Burlesque & Stand Up',
  krashi:    'Концерты',
  special:   'Другие шоу',
  /* женский стендап — фильтр появится в афише сам, как только у события
     будет format:'zhensky' (решение о формате «Подруги» за арт-отделом) */
  zhensky:   'Женский стендап'
};

/* Бегущая строка для сообщений об отмене или переносе (правки 24.07):
   enabled:true + text — полоска появляется над шапкой на всех страницах,
   где есть [data-ticker]. Выключена по умолчанию. */
window.CLUB1_TICKER = { enabled:false, text:'' };

window.CLUB1_EVENTS = [
  {date:'2026-07-26', time:'16:00', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:590,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/MzUwMDh8NjY2NTc3fDEyMzY1MzczfDE3ODUwNzA4MDAwMDA=?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-07-26', time:'18:30', title:'В большом городе', kind:'Сборный концерт', format:'gorod', priceFrom:800,
   poster:'assets/posters/gorod-45.jpg', wide:'assets/posters/gorod-wide125.jpg', photo:null, tone:'cyan', page:'gorod',
   buy:'https://iframeab-pre7764.intickets.ru/seance/73521911/#abiframe', age:'18+'},
  {date:'2026-07-26', time:'21:00', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:590,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/MzUwMDh8NjY2NTc3fDEyMzY1MzczfDE3ODUwODg4MDAwMDA=?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-07-30', time:'19:00', title:'Эйчар стендап', kind:'Шоу', format:'special', priceFrom:2500,
   poster:'assets/posters/hr-45.jpg', wide:null, photo:null, tone:'sky', page:'hr-standup',
   buy:'https://iframeab-pre7764.intickets.ru/seance/73241619/#abiframe', age:'18+'},
  {date:'2026-07-30', time:'20:00', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:590,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/ticketsteam-8133@66681254?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-07-31', time:'18:30', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:590,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/ticketsteam-8133@66681256?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-07-31', time:'21:00', title:'В большом городе', kind:'Сборный концерт', format:'gorod', priceFrom:800,
   poster:'assets/posters/gorod-45.jpg', wide:'assets/posters/gorod-wide125.jpg', photo:null, tone:'cyan', page:'gorod',
   buy:'https://iframeab-pre7764.intickets.ru/seance/73295562/#abiframe', age:'18+'},
  {date:'2026-08-01', time:'16:00', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:590,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/MzUwMDh8NjY2NTc3fDEyMzY1MzczfDE3ODU1ODkyMDAwMDA=?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-08-01', time:'18:30', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:590,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/MzUwMDh8NjY2NTc3fDEyMzY1MzczfDE3ODU1OTgyMDAwMDA=?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-08-01', time:'19:00', title:'Расул Чабдаров', kind:'Сольный концерт', format:'solniki', priceFrom:1500,
   poster:'assets/posters/chabdarov-45.jpg', wide:null, photo:null, tone:'mag', page:'chabdarov',
   buy:'https://iframeab-pre7764.intickets.ru/seance/72656521/#abiframe', age:'18+'},
  {date:'2026-08-01', time:'21:00', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:590,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/MzUwMDh8MzM4MjMxfDI5ODkwNTd8MTc4NTYwNzIwMDAwMA==?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-08-01', time:'21:00', title:'В большом городе', kind:'Сборный концерт', format:'gorod', priceFrom:800,
   poster:'assets/posters/gorod-45.jpg', wide:'assets/posters/gorod-wide125.jpg', photo:null, tone:'cyan', page:'gorod',
   buy:'https://iframeab-pre7764.intickets.ru/seance/73521913/#abiframe', age:'18+'},
  {date:'2026-08-02', time:'16:00', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:590,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/MzUwMDh8NjY2NTc3fDEyMzY1MzczfDE3ODU2NzU2MDAwMDA=?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-08-02', time:'18:30', title:'В большом городе', kind:'Сборный концерт', format:'gorod', priceFrom:800,
   poster:'assets/posters/gorod-45.jpg', wide:'assets/posters/gorod-wide125.jpg', photo:null, tone:'cyan', page:'gorod',
   buy:'https://iframeab-pre7764.intickets.ru/seance/73521915/#abiframe', age:'18+'},
  {date:'2026-08-02', time:'21:00', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:590,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/MzUwMDh8NjY2NTc3fDEyMzY1MzczfDE3ODU2OTM2MDAwMDA=?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-08-06', time:'19:00', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:590,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/ticketsteam-8133@68548295?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-08-06', time:'21:00', title:'ВИА Ваши Краши', kind:'Концерт', format:'krashi',
   poster:'assets/posters/krashi0608-45.jpg', wide:null, photo:null, tone:'gold', page:'krashi',
   buy:'https://iframeab-pre7764.intickets.ru/seance/72936887/#abiframe', age:'18+'},
  {date:'2026-08-06', time:'21:30', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:590,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/ticketsteam-8133@68930974?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-08-07', time:'18:30', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:590,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/ticketsteam-8133@68548501?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-08-07', time:'21:00', title:'Burlesque & Stand Up', kind:'Шоу', format:'burlesque', priceFrom:1700,
   poster:'assets/posters/burlesk-45.jpg', wide:'assets/posters/burlesk-wide125.jpg', photo:null, tone:'pur', page:'razovoe',
   buy:'https://iframeab-pre7764.intickets.ru/seance/73545384/#abiframe', age:'18+'},
  {date:'2026-08-08', time:'18:30', title:'В большом городе', kind:'Сборный концерт', format:'gorod', priceFrom:800,
   poster:'assets/posters/gorod-45.jpg', wide:'assets/posters/gorod-wide125.jpg', photo:null, tone:'cyan', page:'gorod',
   buy:'https://iframeab-pre7764.intickets.ru/seance/73581160/#abiframe', age:'18+'},
  {date:'2026-08-08', time:'19:00', title:'Расул Чабдаров', kind:'Сольный концерт', format:'solniki', priceFrom:1500,
   poster:'assets/posters/chabdarov-45.jpg', wide:null, photo:null, tone:'mag', page:'chabdarov',
   buy:'https://iframeab-pre7764.intickets.ru/seance/72656523/#abiframe', age:'18+'},
  {date:'2026-08-08', time:'21:00', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:590,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/ticketsteam-8133@68548503?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-08-13', time:'19:00', title:'Медицинский стендап', kind:'Шоу', format:'special', priceFrom:2200,
   poster:'assets/posters/med-45.jpg', wide:null, wide169:'assets/posters/med-wide.jpg', photo:null, tone:'green', page:'med-standup',
   buy:'https://iframeab-pre7764.intickets.ru/seance/73469460/#abiframe', age:'18+'},
  /* партнёрское событие: продаётся с отдельного поддомена intickets, своей
     страницы нет ни у нас, ни на старом сайте — page:null, афиша не
     кликабельна, «Подробнее» не рисуется (см. afisha.js) */
  {date:'2026-08-13', time:'20:00', title:'Дела | True Crime', kind:'Встреча', format:'special', priceFrom:1000,
   poster:null, wide:null, photo:null, tone:'mono', page:null,
   buy:'https://delatruecrime.intickets.ru/seance/73691678/#abiframe', age:null},
  {date:'2026-08-13', time:'21:30', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:690,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/ticketsteam-8133@68548505?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-08-14', time:'18:30', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:690,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/ticketsteam-8133@68930960?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-08-14', time:'19:30', title:'Алексей Жаров', kind:'Сольный концерт', format:'solniki', priceFrom:1500,
   poster:'assets/posters/zharov-45.jpg', wide:'assets/posters/zharov-wide125.jpg', photo:null, tone:'mag', page:'zharov',
   buy:'https://iframeab-pre7764.intickets.ru/seance/73871868/#abiframe', age:'18+'},
  {date:'2026-08-14', time:'21:00', title:'В большом городе', kind:'Сборный концерт', format:'gorod', priceFrom:800,
   poster:'assets/posters/gorod-45.jpg', wide:'assets/posters/gorod-wide125.jpg', photo:null, tone:'cyan', page:'gorod',
   buy:'https://iframeab-pre7764.intickets.ru/seance/73581400/#abiframe', age:'18+'},
  {date:'2026-08-15', time:'16:00', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:690,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/ticketsteam-8133@68548509?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-08-15', time:'18:30', title:'В большом городе', kind:'Сборный концерт', format:'gorod', priceFrom:800,
   poster:'assets/posters/gorod-45.jpg', wide:'assets/posters/gorod-wide125.jpg', photo:null, tone:'cyan', page:'gorod',
   buy:'https://iframeab-pre7764.intickets.ru/seance/73581165/#abiframe', age:'18+'},
  {date:'2026-08-15', time:'20:30', title:'Гурам Амарян', kind:'Сольный концерт', format:'solniki', priceFrom:3000,
   poster:'assets/posters/guram2-45.jpg', wide:null, wide169:'assets/posters/guram2-wide.jpg', photo:null, tone:'mag', page:'guram',
   buy:'https://widget.afisha.yandex.ru/w/sessions/MzUwMDh8MzkwNjg5fDEyMzY2MDAzfDE3ODY4MTUwMDAwMDA=?utm_source=guram-amarian-club-1&utm_medium=button15_08&utm_campaign=redirect_to_afisha&clientKey=669491f5-955b-442e-97de-9eb090af0cce', age:'18+'},
  {date:'2026-08-15', time:'21:00', title:'Burlesque & Stand Up', kind:'Шоу', format:'burlesque', priceFrom:1700,
   poster:'assets/posters/burlesk-45.jpg', wide:'assets/posters/burlesk-wide125.jpg', photo:null, tone:'pur', page:'razovoe',
   buy:'https://iframeab-pre7764.intickets.ru/seance/73545386/#abiframe', age:'18+'},
  {date:'2026-08-16', time:'16:00', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:690,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/ticketsteam-8133@68548511?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-08-16', time:'18:30', title:'В большом городе', kind:'Сборный концерт', format:'gorod', priceFrom:800,
   poster:'assets/posters/gorod-45.jpg', wide:'assets/posters/gorod-wide125.jpg', photo:null, tone:'cyan', page:'gorod',
   buy:'https://iframeab-pre7764.intickets.ru/seance/73581169/#abiframe', age:'18+'},
  {date:'2026-08-16', time:'21:00', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:690,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/ticketsteam-8133@68548513?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-08-19', time:'18:30', title:'В большом городе', kind:'Сборный концерт', format:'gorod', priceFrom:800,
   poster:'assets/posters/gorod-45.jpg', wide:'assets/posters/gorod-wide125.jpg', photo:null, tone:'cyan', page:'gorod',
   buy:'https://iframeab-pre7764.intickets.ru/seance/73581174/#abiframe', age:'18+'},
  {date:'2026-08-19', time:'21:00', title:'Давай переиграем', kind:'Импровизационное шоу', format:'pereigraem', priceFrom:800,
   poster:'assets/posters/pereigraem-45.jpg', wide:null, photo:null, tone:'pur', page:'pereigraem',
   buy:'https://iframeab-pre7764.intickets.ru/seance/73864719/#abiframe', age:'18+'},
  {date:'2026-08-20', time:'18:30', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:690,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/ticketsteam-8133@68548515?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-08-20', time:'19:00', title:'Риэлторский стендап', kind:'Шоу', format:'special', priceFrom:2100,
   poster:'assets/posters/realty-45.jpg', wide:null, wide169:'assets/posters/realty-wide.jpg', photo:null, tone:'gold', page:'realty-standup',
   buy:'https://iframeab-pre7764.intickets.ru/seance/73295697/#abiframe', age:'18+'},
  {date:'2026-08-20', time:'21:00', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:690,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/ticketsteam-8133@68548517?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-08-20', time:'21:30', title:'Гурам Амарян', kind:'Сольный концерт', format:'solniki', priceFrom:2000,
   poster:'assets/posters/guram2-45.jpg', wide:null, wide169:'assets/posters/guram2-wide.jpg', photo:null, tone:'mag', page:'guram',
   buy:'https://widget.afisha.yandex.ru/w/sessions/MzUwMDh8MzkwNjg5fDEyMzY2MDAzfDE3ODcyNTA2MDAwMDA=?utm_source=guram-amarian-club-1&utm_medium=button20_08&utm_campaign=redirect_to_afisha&clientKey=669491f5-955b-442e-97de-9eb090af0cce', age:'18+'},
  {date:'2026-08-21', time:'18:00', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:690,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/ticketsteam-8133@68548519?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-08-21', time:'20:30', title:'Артём Винокур', kind:'Сольный концерт', format:'solniki', priceFrom:1500,
   poster:'assets/posters/vinokur-45.jpg', wide:null, photo:null, tone:'green', page:'vinokur',
   buy:'https://iframeab-pre7764.intickets.ru/seance/73545374/#abiframe', age:'18+'},
  {date:'2026-08-22', time:'18:30', title:'В большом городе', kind:'Сборный концерт', format:'gorod', priceFrom:800,
   poster:'assets/posters/gorod-45.jpg', wide:'assets/posters/gorod-wide125.jpg', photo:null, tone:'cyan', page:'gorod',
   buy:'https://iframeab-pre7764.intickets.ru/seance/73581179/#abiframe', age:'18+'},
  {date:'2026-08-22', time:'21:00', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:690,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/ticketsteam-8133@68548521?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-08-23', time:'16:00', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:690,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/ticketsteam-8133@68548525?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-08-23', time:'18:30', title:'В большом городе', kind:'Сборный концерт', format:'gorod', priceFrom:800,
   poster:'assets/posters/gorod-45.jpg', wide:'assets/posters/gorod-wide125.jpg', photo:null, tone:'cyan', page:'gorod',
   buy:'https://iframeab-pre7764.intickets.ru/seance/73581184/#abiframe', age:'18+'},
  {date:'2026-08-23', time:'21:00', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:690,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/ticketsteam-8133@68548523?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-08-26', time:'19:00', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:690,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/ticketsteam-8133@69740858?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-08-26', time:'21:30', title:'Советчики', kind:'Шоу', format:'special', priceFrom:200,
   poster:'assets/posters/sovetchiki-45.jpg', wide:null, photo:null, tone:'gold', page:'sovetchiki',
   buy:'https://iframeab-pre7764.intickets.ru/seance/74188845/#abiframe', age:'18+'},
  {date:'2026-08-27', time:'18:30', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:690,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/ticketsteam-8133@68548527?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-08-27', time:'21:00', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:690,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/ticketsteam-8133@68548529?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-08-28', time:'18:30', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:690,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/ticketsteam-8133@68548531?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-08-28', time:'21:00', title:'В большом городе', kind:'Сборный концерт', format:'gorod', priceFrom:800,
   poster:'assets/posters/gorod-45.jpg', wide:'assets/posters/gorod-wide125.jpg', photo:null, tone:'cyan', page:'gorod',
   buy:'https://iframeab-pre7764.intickets.ru/seance/73581402/#abiframe', age:'18+'},
  {date:'2026-08-29', time:'18:30', title:'В большом городе', kind:'Сборный концерт', format:'gorod', priceFrom:800,
   poster:'assets/posters/gorod-45.jpg', wide:'assets/posters/gorod-wide125.jpg', photo:null, tone:'cyan', page:'gorod',
   buy:'https://iframeab-pre7764.intickets.ru/seance/73581188/#abiframe', age:'18+'},
  {date:'2026-08-29', time:'21:00', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:690,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/ticketsteam-8133@68548533?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-08-30', time:'16:00', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:690,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/ticketsteam-8133@68548537?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  {date:'2026-08-30', time:'18:30', title:'В большом городе', kind:'Сборный концерт', format:'gorod', priceFrom:800,
   poster:'assets/posters/gorod-45.jpg', wide:'assets/posters/gorod-wide125.jpg', photo:null, tone:'cyan', page:'gorod',
   buy:'https://iframeab-pre7764.intickets.ru/seance/73581193/#abiframe', age:'18+'},
  /* ЧУДАки — сверка со старым сайтом 20.08: шоу продавалось там и
     отсутствовало здесь. Сеанс intickets 74461153 открыт живьём:
     «Вск, 30 августа 2026, 19:00 · Шоу "ЧУДАки" · CLUB#1», цены
     1 500–5 000 ₽. Афиша взята с Тильда-CDN, она квадратная 1:1 —
     карточка покажет её в рамке 4:5 с полями; портрет 1080×1350
     заказан Максиму. Своей страницы у шоу нет, кнопка ведёт в кассу. */
  {date:'2026-08-30', time:'19:00', title:'ЧУДАки', kind:'Шоу', format:'special', priceFrom:1500,
   poster:'assets/posters/chudaki-sq.jpg', wide:null, wide169:'assets/posters/chudaki-wide.jpg', photo:null, tone:'gold', page:null,
   buy:'https://iframeab-pre7764.intickets.ru/seance/74461153/#abiframe', age:'18+'},
  {date:'2026-08-30', time:'21:00', title:'Опытные комики', kind:'Проверка материала', format:'ok', priceFrom:690,
   poster:'assets/posters/ok2-45.jpg', wide:'assets/posters/ok2-wide125.jpg', photo:null, tone:'mono', page:'show',
   buy:'https://widget.afisha.yandex.ru/w/sessions/ticketsteam-8133@68548535?clientKey=eb57dd5a-829c-45ff-91c5-39268e290ad3&regionId=213', age:'18+'},
  /* Гурам Амарян, вторая дата — сверка со старым сайтом 20.08. Виджет
     Афиши открыт живьём: «Ср, 2 сентября, 20:00 · Club #1», цены
     2 000–6 000 ₽. Афиша и страница те же, что у даты 20.08. */
  {date:'2026-09-02', time:'19:00', title:'Открытый микрофон', kind:'Открытый микрофон', format:'special', priceFrom:390,
   poster:'assets/posters/open-mic-sq.jpg', wide:'assets/posters/open-mic-wide.jpg', photo:null, tone:'mono', page:null,
   buy:'https://iframeab-pre7764.intickets.ru/seance/74686647/', age:'18+'},
  {date:'2026-09-02', time:'20:00', title:'Гурам Амарян', kind:'Сольный концерт', format:'solniki', priceFrom:2000,
   poster:'assets/posters/guram2-45.jpg', wide:null, wide169:'assets/posters/guram2-wide.jpg', photo:null, tone:'mag', page:'guram',
   buy:'https://widget.afisha.yandex.ru/w/sessions/MzUwMDh8MzkwNjg5fDEyMzY2MDAzfDE3ODgzNjg0MDAwMDA=?utm_source=guram-amarian-club-1&utm_medium=button02_09&utm_campaign=redirect_to_afisha&clientKey=669491f5-955b-442e-97de-9eb090af0cce', age:'18+'},
  {date:'2026-09-03', time:'21:30', title:'Открытый микрофон', kind:'Открытый микрофон', format:'special', priceFrom:390,
   poster:'assets/posters/open-mic-sq.jpg', wide:'assets/posters/open-mic-wide.jpg', photo:null, tone:'mono', page:null,
   buy:'https://iframeab-pre7764.intickets.ru/seance/74686651/', age:'18+'},
  {date:'2026-09-04', time:'19:00', title:'Burlesque & Stand Up', kind:'Шоу', format:'burlesque', priceFrom:1700,
   poster:'assets/posters/burlesk-0409-sq.jpg', wide:'assets/posters/burlesk-wide.jpg', photo:null, tone:'pur', page:'razovoe',
   buy:'https://iframeab-pre7764.intickets.ru/seance/74432346/', age:'18+'},
  {date:'2026-09-06', time:'19:00', title:'Виктор Комаров', kind:'Сольный концерт', format:'solniki', priceFrom:1500,
   poster:'assets/posters/komarov-45.jpg', wide:null, wide169:'assets/posters/komarov-wide.jpg', photo:null, tone:'sky', page:'komarov',
   buy:'https://iframeab-pre7764.intickets.ru/seance/73420327/#abiframe', age:'18+'},
  {date:'2026-09-09', time:'21:30', title:'Открытый микрофон', kind:'Открытый микрофон', format:'special', priceFrom:390,
   poster:'assets/posters/open-mic-sq.jpg', wide:'assets/posters/open-mic-wide.jpg', photo:null, tone:'mono', page:null,
   buy:'https://iframeab-pre7764.intickets.ru/seance/74686653/', age:'18+'},
  {date:'2026-09-10', time:'19:00', title:'Открытый микрофон', kind:'Открытый микрофон', format:'special', priceFrom:390,
   poster:'assets/posters/open-mic-sq.jpg', wide:'assets/posters/open-mic-wide.jpg', photo:null, tone:'mono', page:null,
   buy:'https://iframeab-pre7764.intickets.ru/seance/74686661/', age:'18+'},
  {date:'2026-09-12', time:'16:00', title:'Открытый микрофон', kind:'Открытый микрофон', format:'special', priceFrom:390,
   poster:'assets/posters/open-mic-sq.jpg', wide:'assets/posters/open-mic-wide.jpg', photo:null, tone:'mono', page:null,
   buy:'https://iframeab-pre7764.intickets.ru/seance/74686667/', age:'18+'},
  {date:'2026-09-12', time:'19:00', title:'Расул Чабдаров', kind:'Сольный концерт', format:'solniki', priceFrom:1500,
   poster:'assets/posters/chabdarov-45.jpg', wide:null, photo:null, tone:'mag', page:'chabdarov',
   buy:'https://iframeab-pre7764.intickets.ru/seance/74316674/#abiframe', age:'18+'},
  /* Валентин Сидоров — сверка со старым сайтом 20.08. Сеанс intickets
     74461145 открыт живьём: «Сб, 12 сентября 2026, 21:30 · Валентин
     Сидоров. Стендап. Сольный концерт · CLUB#1», цены 1 500–5 000 ₽.
     Афиша квадратная 1:1 с Тильда-CDN, портрет 4:5 заказан Максиму. */
  {date:'2026-09-12', time:'21:30', title:'Валентин Сидоров', kind:'Сольный концерт', format:'solniki', priceFrom:1500,
   poster:'assets/posters/sidorov-sq.jpg', wide:null, photo:null, tone:'cyan', page:null,
   buy:'https://iframeab-pre7764.intickets.ru/seance/74461145/#abiframe', age:'18+'},
  /* Бьюти стендап — заведён 13.08 по карточке Максима; время и сеанс из
     кассы (intickets 74087267, сверено 10.08 при заводе на старый сайт),
     внутренней страницы на превью нет — кнопка ведёт сразу в кассу */
  {date:'2026-09-13', time:'18:30', title:'Money Mic', kind:'Битва комиков', format:'special', priceFrom:700,
   poster:'assets/posters/money-mic-sq.jpg', wide:'assets/posters/money-mic-wide.jpg', photo:null, tone:'mag', page:'money-mic',
   buy:'https://iframeab-pre7764.intickets.ru/seance/74686679/', age:'18+'},
  {date:'2026-09-13', time:'21:00', title:'Шоу БАЙКИ', kind:'Шоу', format:'special', priceFrom:800,
   poster:null, wide:null, photo:null, tone:'gold', page:null,
   buy:'https://iframeab-pre7764.intickets.ru/seance/74686573/', age:'18+'},
  {date:'2026-09-16', time:'19:00', title:'Открытый микрофон', kind:'Открытый микрофон', format:'special', priceFrom:390,
   poster:'assets/posters/open-mic-sq.jpg', wide:'assets/posters/open-mic-wide.jpg', photo:null, tone:'mono', page:null,
   buy:'https://iframeab-pre7764.intickets.ru/seance/74686663/', age:'18+'},
  {date:'2026-09-17', time:'21:30', title:'Открытый микрофон', kind:'Открытый микрофон', format:'special', priceFrom:390,
   poster:'assets/posters/open-mic-sq.jpg', wide:'assets/posters/open-mic-wide.jpg', photo:null, tone:'mono', page:null,
   buy:'https://iframeab-pre7764.intickets.ru/seance/74686655/', age:'18+'},
  {date:'2026-09-18', time:'19:00', title:'Burlesque & Stand Up', kind:'Шоу', format:'burlesque', priceFrom:1700,
   poster:'assets/posters/burlesk-1809-sq.jpg', wide:'assets/posters/burlesk-wide.jpg', photo:null, tone:'pur', page:'razovoe',
   buy:'https://iframeab-pre7764.intickets.ru/seance/74432348/', age:'18+'},
  {date:'2026-09-19', time:'21:30', title:'Бьюти стендап', kind:'Шоу', format:'special', priceFrom:2000,
   poster:'assets/posters/beauty-45.jpg', wide:null, photo:null, tone:'mag', page:null,
   buy:'https://iframeab-pre7764.intickets.ru/seance/74087267/#abiframe', age:'18+'},
  /* ВИА Ваши Краши — сверка со старым сайтом 20.08. Сеанс intickets
     74432364 открыт живьём: «Вск, 20 сентября 2026, 19:00 · ВИА Ваши
     Краши · CLUB#1», цены 1 200–3 500 ₽. Афиша квадратная 1:1,
     портрет 4:5 заказан Максиму. */
  {date:'2026-09-20', time:'19:00', title:'ВИА Ваши Краши', kind:'Концерт', format:'krashi', priceFrom:1200,
   poster:'assets/posters/krashi2009-sq.jpg', wide:null, wide169:'assets/posters/krashi2009-wide.jpg', photo:null, tone:'mag', page:null,
   buy:'https://iframeab-pre7764.intickets.ru/seance/74432364/#abiframe', age:'18+'},
  {date:'2026-09-23', time:'20:00', title:'Стендап Комьюнити', kind:'Комьюнити', format:'community', priceFrom:1000,
   poster:null, wide:null, photo:null, tone:'green', page:null,
   buy:'https://iframeab-pre7764.intickets.ru/seance/74686575/', age:'18+'},
  {date:'2026-09-23', time:'21:30', title:'Открытый микрофон', kind:'Открытый микрофон', format:'special', priceFrom:390,
   poster:'assets/posters/open-mic-sq.jpg', wide:'assets/posters/open-mic-wide.jpg', photo:null, tone:'mono', page:null,
   buy:'https://iframeab-pre7764.intickets.ru/seance/74686657/', age:'18+'},
  {date:'2026-09-24', time:'19:00', title:'Открытый микрофон', kind:'Открытый микрофон', format:'special', priceFrom:390,
   poster:'assets/posters/open-mic-sq.jpg', wide:'assets/posters/open-mic-wide.jpg', photo:null, tone:'mono', page:null,
   buy:'https://iframeab-pre7764.intickets.ru/seance/74686665/', age:'18+'},
  {date:'2026-09-26', time:'19:00', title:'Burlesque & Stand Up', kind:'Шоу', format:'burlesque', priceFrom:1700,
   poster:'assets/posters/burlesk-2609-sq.jpg', wide:'assets/posters/burlesk-wide.jpg', photo:null, tone:'pur', page:'razovoe',
   buy:'https://iframeab-pre7764.intickets.ru/seance/74432350/', age:'18+'},
  {date:'2026-09-27', time:'18:30', title:'Money Mic', kind:'Битва комиков', format:'special', priceFrom:700,
   poster:'assets/posters/money-mic-sq.jpg', wide:'assets/posters/money-mic-wide.jpg', photo:null, tone:'mag', page:'money-mic',
   buy:'https://iframeab-pre7764.intickets.ru/seance/74686681/', age:'18+'},
  {date:'2026-10-01', time:'21:30', title:'Открытый микрофон', kind:'Открытый микрофон', format:'special', priceFrom:390,
   poster:'assets/posters/open-mic-sq.jpg', wide:'assets/posters/open-mic-wide.jpg', photo:null, tone:'mono', page:null,
   buy:'https://iframeab-pre7764.intickets.ru/seance/74686659/', age:'18+'},
  {date:'2026-10-03', time:'18:30', title:'Виктор Комаров', kind:'Сольный концерт', format:'solniki', priceFrom:1500,
   poster:'assets/posters/komarov-45.jpg', wide:null, wide169:'assets/posters/komarov-wide.jpg', photo:null, tone:'sky', page:'komarov',
   buy:'https://iframeab-pre7764.intickets.ru/seance/73420338/#abiframe', age:'18+'},
  /* Расул Чабдаров, вторая дата — БЫЛА 19.09, стала 4 октября. Касса
     перенесла дату внутри того же сеанса 74316676: виджет, открытый
     20.08, отдаёт «Вск, 4 октября 2026, 18:30». Сайт до этой правки
     продавал её как 19 сентября, то есть человек покупал билет на
     другой день. Ссылка не менялась, менялась дата вокруг неё. */
  {date:'2026-10-04', time:'18:30', title:'Расул Чабдаров', kind:'Сольный концерт', format:'solniki', priceFrom:1500,
   poster:'assets/posters/chabdarov-45.jpg', wide:null, photo:null, tone:'mag', page:'chabdarov',
   buy:'https://iframeab-pre7764.intickets.ru/seance/74316676/#abiframe', age:'18+'},
  {date:'2026-10-10', time:'19:00', title:'Burlesque & Stand Up', kind:'Шоу', format:'burlesque', priceFrom:1700,
   poster:'assets/posters/burlesk-1010-sq.jpg', wide:'assets/posters/burlesk-wide.jpg', photo:null, tone:'pur', page:'razovoe',
   buy:'https://iframeab-pre7764.intickets.ru/seance/74432352/', age:'18+'},
  {date:'2026-10-30', time:'21:30', title:'Burlesque & Stand Up', kind:'Шоу', format:'burlesque', priceFrom:1700,
   poster:'assets/posters/burlesk-3010-sq.jpg', wide:'assets/posters/burlesk-wide.jpg', photo:null, tone:'pur', page:'razovoe',
   buy:'https://iframeab-pre7764.intickets.ru/seance/74686618/', age:'18+'}
];
