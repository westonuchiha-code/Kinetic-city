const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  await p.goto('file:///home/claude/kc/dist/gravitation.html'); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    KC.start(); KC.skip(); KC.skipTo(2); KC.skip(); KC.tp(7*384+48, 2*384+200); KC.step(5); KC.render(1/60);
    const f = window.drawBuilding, res = [];
    window.drawBuilding = function (b) { const t = performance.now(); for (let i = 0; i < 5; i++) f(b); res.push([((performance.now() - t) / 5).toFixed(2), b.w, b.h, Math.round(b.ht), b.win.reduce((a, s) => a + s.length, 0), b.signs.length, b.shops.length]); };
    KC.render(1/60); window.drawBuilding = f;
    return res.sort((a, b) => b[0] - a[0]).slice(0, 6);
  });
  console.log(JSON.stringify(r));
  await b.close();
})();
