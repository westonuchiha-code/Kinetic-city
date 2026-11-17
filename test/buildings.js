// Building art: two street views per district, same spots every run. Writes screenshots/bld_<district>_<n>.png.
// Run after changing 11g_buildings.js.
const { chromium } = require('playwright');
const path = require('path'); const ROOT = path.resolve(__dirname, '..'), url = 'file://' + ROOT + '/dist/gravitation.html';
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + e.stack));
  await p.goto(url); await p.waitForTimeout(400);
  await p.evaluate(() => { localStorage.clear(); }); await p.reload(); await p.waitForTimeout(600);
  await p.evaluate(() => { KC.start(); KC.skip(); KC.P.invT = 0; G.hint = null; G.seen = new Proxy({}, { get: () => 1 }); gatesOpen[0] = gatesOpen[1] = true; SETTINGS.hud = .7; });
  for (let d = 0; d < 3; d++) {
    const spots = await p.evaluate((d) => {
      // buildings of this district with the most shops/signs/doors facing the camera
      const x0 = d === 0 ? 0 : DIST_SPLIT[d - 1], x1 = d === 2 ? WORLD_W : DIST_SPLIT[d];
      const L = buildings.filter(b => !b.frame && b.x > x0 + 200 && b.x + b.w < x1 - 200 && b.y > 300 && b.y < WORLD_H - 500)
        .map(b => ({ b, s: b.shops.filter(s => s.side === 1 || s.side === 2).length * 2 + b.signs.filter(s => s.side === 1 || s.side === 2).length + (b.door ? 1 : 0) + (b.props.length ? 1 : 0) }))
        .sort((a, c) => c.s - a.s || a.b.x - c.b.x || a.b.y - c.b.y).slice(0, 2).map(o => [o.b.x + o.b.w + 40, o.b.y + o.b.h + 40]);
      return L;
    }, d);
    for (let i = 0; i < spots.length; i++) {
      await p.evaluate(([x, y]) => { KC.tp(x, y); P.vx = P.vy = 0; P.ang = -2.3; for (const e of ents) if (e !== P && !e.dead && e.kind !== 'hideout' && (e.team === 'gang' || e.kind === 'cop') && Math.hypot(e.x - x, e.y - y) < 700) e.dead = true; G.heat = 0; }, spots[i]);
      await p.waitForTimeout(1700);
      await p.evaluate(() => { G.hint = null; G.toasts.length = 0; G.time = 100; });
      await p.waitForTimeout(80);
      await p.screenshot({ path: ROOT + '/screenshots/bld_' + d + '_' + i + '.png' });
    }
  }
  console.log('buildings painted:', await p.evaluate(() => buildings.filter(b => b._art).length));
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
