async page => {
  const res = [];
  const urls = [
    'https://zoon.ru/msk/business/kompaniya_intickets/reviews/',
    'https://zoon.ru/msk/business/ticketscloud/reviews/'
  ];
  for (const u of urls) {
    try {
      await page.goto(u, {waitUntil:'domcontentloaded'});
      await page.waitForTimeout(3500);
      for (let i=0;i<4;i++){ await page.mouse.wheel(0,2500); await page.waitForTimeout(700); }
      const items = await page.evaluate(() => {
        const out=[];
        document.querySelectorAll('.comment-item, [itemprop="review"]').forEach(el=>{
          const a=el.querySelector('[itemprop="author"], .name-wrapper, .comment-item__author');
          const d=el.querySelector('[itemprop="datePublished"], .comment-item__date, time');
          const t=el.querySelector('[itemprop="description"], .js-comment-content, .comment-text');
          out.push({a:a?a.innerText.trim():'', d:d?(d.getAttribute('datetime')||d.getAttribute('content')||d.innerText.trim()):'', t:t?t.innerText.trim().slice(0,900):''});
        });
        return out;
      });
      res.push({u, n:items.length, items: items.slice(0,25)});
    } catch(e) { res.push({u, err:String(e).slice(0,150)}); }
  }
  return JSON.stringify(res);
}
