const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  await p.goto('file:///home/claude/kc/dist/gravitation.html'); await p.waitForTimeout(400);
  await p.evaluate(() => { KC.start(); KC.skip(); window.__dbgBoss = []; KC.spawnBoss(0); KC.skip(); const bo = KC.G.boss; KC.tp(bo.x + 200, bo.y); });
  for (let i = 0; i < 25; i++) await p.evaluate(() => { KC.P.invT = 999; KC.step(60); KC.skip(); });
  const r = await p.evaluate(() => { const agg = {}; for (const [by, d, k, th] of window.__dbgBoss) { const key = by + '/' + k + '/' + th; agg[key] = (agg[key] || 0) + d; } return agg; });
  console.log(JSON.stringify(r));
  await b.close();
})();
