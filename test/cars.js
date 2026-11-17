const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/kc/dist/gravitation.html'); await p.waitForTimeout(500);
  await p.evaluate(() => {
    KC.start(); KC.skip(); KC.G.seen.move = 1; KC.G.hint = null; KC.tp(1 * 384 + 48, 2 * 384 + 48); KC.P.invT = 99;
    for (const e of KC.ents) if (e.kind === 'car' && Math.hypot(e.x - KC.P.x, e.y - KC.P.y) < 500) e.dead = true;
    const cols = ['#b8323a', '#2f5fb8', '#e8d040', '#2f9a62', '#c8c8d0', '#6a3ab8', '#d06a2a', '#202430'];
    for (let i = 0; i < 8; i++) KC.spawn('car', KC.P.x - 280 + (i % 4) * 150, KC.P.y - 90 + Math.floor(i / 4) * 170, { col: cols[i], ang: i * Math.PI / 4 });
  });
  await p.waitForTimeout(700); await p.evaluate(() => { KC.G.hint = null; });
  await p.waitForTimeout(100); await p.screenshot({ path: '/home/claude/cars_angles.png' });
  console.log(errs.join('|') || 'ok'); await b.close();
})();
