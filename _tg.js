async page => {
  await page.goto('https://tgstat.ru/search?q=qtickets', {waitUntil:'domcontentloaded'});
  await page.waitForTimeout(4000);
  const b = await page.evaluate(() => document.body.innerText.slice(0,2500));
  return JSON.stringify({u:page.url(), b});
}
