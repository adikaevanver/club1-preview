async page => {
  const urls = [
    'https://startpack.ru/application/qtickets',
    'https://startpack.ru/application/timepad',
    'https://startpack.ru/application/radario',
    'https://startpack.ru/application/ticketscloud'
  ];
  const res = [];
  for (const u of urls) {
    try {
      await page.goto(u, {waitUntil:'domcontentloaded'});
      await page.waitForTimeout(2500);
      const b = await page.evaluate(() => document.body.innerText);
      const i = b.indexOf('тзыв');
      res.push({u, url: page.url(), chunk: (i>0 ? b.slice(Math.max(0,i-200), i+3000) : b.slice(0,1200))});
    } catch(e) { res.push({u, err: String(e).slice(0,200)}); }
  }
  return JSON.stringify(res);
}
