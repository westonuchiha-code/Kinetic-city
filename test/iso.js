const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message + '\n' + e.stack));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('file:///home/claude/kc/dist/kinetic_city.html');
  await p.waitForTimeout(600);
  await p.evaluate(() => { KC.start(); KC.skip(); });
  const shot = async (name, fn) => { await p.evaluate(fn); await p.waitForTimeout(1200); await p.screenshot({ path: '/home/claude/' + name }); };
  await shot('iso_street.png', () => { KC.tp(1*384+48, 2*384+150); KC.P.invT = 999; });
  await shot('iso_hideout.png', () => { const h = KC.ents.find(e => e.kind === 'hideout'); KC.tp(h.x, h.rect.y + h.rect.h + 120); KC.P.invT = 999; });
  await shot('iso_tower.png', () => { KC.skipTo(2); KC.skip(); KC.tp(7*384+48, 2*384+200); KC.P.invT = 999; });
  const perf = await p.evaluate(() => { const t0 = performance.now(); for (let i = 0; i < 30; i++) render(1/60); return (performance.now() - t0) / 30; });
  console.log('render ms', perf.toFixed(2));
  // controls: stick up should move the player up the screen
  const mv = await p.evaluate(() => { const v = isoDir({ x: 0, y: -1 }); const a = isoXY(0, 0), c = isoXY(v.x * 10, v.y * 10); return [v.x.toFixed(2), v.y.toFixed(2), (c[0]-a[0]).toFixed(2), (c[1]-a[1]).toFixed(2)]; });
  console.log('stick up -> world', mv.slice(0,2), 'screen delta', mv.slice(2));
  const rt = await p.evaluate(() => { isoOrigin(); const s = isoToScreen(KC.P.x, KC.P.y); const w = screenToWorld(s.x + FRAME.x, s.y + FRAME.y); return [KC.P.x - w.x, KC.P.y - w.y].map(v => v.toFixed(2)); });
  console.log('screen<->world roundtrip error', rt);
  console.log(errs.slice(0, 8).join('\n'));
  await b.close();
})();
