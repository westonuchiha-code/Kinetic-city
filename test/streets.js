// Street art: the ground, lamps, trees and crossings in each district, same spots every run.
// Writes screenshots/street_<name>.png. Run after changing 11i_street.js.   node test/streets.js [out-prefix]
const { chromium } = require('playwright');
const path = require('path'); const ROOT = path.resolve(__dirname, '..'), PRE = process.argv[2] || ROOT + '/screenshots/street_';
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  await p.goto('file://' + ROOT + '/dist/gravitation.html'); await p.waitForTimeout(400);
  await p.evaluate(() => { localStorage.clear(); }); await p.reload(); await p.waitForTimeout(600);
  await p.evaluate(() => { KC.start(); KC.skip(); KC.P.invT = 0; G.hint = null; G.seen = new Proxy({}, { get: () => 1, set: () => true }); gatesOpen[0] = gatesOpen[1] = true; SETTINGS.hud = .7; });
  const spots = [['gz_crossing', 432, 432], ['gz_park', 1008, 250], ['gz_lot', 1392, 250], ['gz_court', 624, 1400], ['gz_plaza', 1008, 1392], ['slums_crossing', 1968, 816], ['slums_yard', 2544, 640], ['tower_crossing', 3504, 816], ['tower_park', 3696, 250]];
  for (const [nm, x, y] of spots) {
    await p.evaluate(([x, y]) => { KC.tp(x, y); P.vx = P.vy = 0; P.ang = .8; G.heat = 0; for (const e of ents) if (e !== P && !e.dead && (e.team === 'gang' || e.kind === 'cop' || e.kind === 'civ' || (e.kind === 'car' && e.driving)) && e.kind !== 'hideout' && e.kind !== 'tower' && Math.hypot(e.x - x, e.y - y) < 700) e.dead = true; }, [x, y]);
    await p.waitForTimeout(1500);
    await p.evaluate(() => { G.hint = null; G.toasts.length = 0; for (const e of ents) if (e !== P && !e.dead && (e.kind === 'civ' || (e.kind === 'car' && e.driving)) && Math.hypot(e.x - P.x, e.y - P.y) < 600) e.dead = true; });
    await p.waitForTimeout(120);
    await p.screenshot({ path: PRE + nm + '.png' });
  }
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
