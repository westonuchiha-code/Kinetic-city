const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + e.stack));
  await p.goto('file:///home/claude/kc/dist/kinetic_city.html'); await p.waitForTimeout(500);
  await p.evaluate(() => { KC.start(); KC.skip(); });
  await p.evaluate(() => { KC.tp(1*384+48, 2*384+150); KC.P.invT = 999; });
  await p.waitForTimeout(2500); await p.screenshot({ path: '/home/claude/chars_street.png' });
  await p.evaluate(() => { const h = KC.ents.find(e => e.kind === 'hideout'); KC.tp(h.x, h.rect.y + h.rect.h + 90); KC.P.invT = 999; KC.P.hp = 1e6; });
  await p.waitForTimeout(1800); await p.screenshot({ path: '/home/claude/chars_hideout.png' });
  await p.evaluate(() => { KC.spawn && KC.spawn('brute', KC.P.x + 60, KC.P.y + 20); KC.spawn && KC.spawn('cop', KC.P.x - 50, KC.P.y + 30); });
  await p.waitForTimeout(700); await p.screenshot({ path: '/home/claude/chars_mix.png' });
  const perf = await p.evaluate(() => { const t0 = performance.now(); for (let i = 0; i < 30; i++) render(1/60); return (performance.now() - t0) / 30; });
  console.log('render ms', perf.toFixed(2)); console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await b.close();
})();
