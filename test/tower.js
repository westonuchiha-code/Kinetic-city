const { chromium } = require('playwright');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + e.stack));
  await p.goto('file://' + ROOT + '/dist/kinetic_city.html'); await p.waitForTimeout(500);
  await p.evaluate(() => { KC.start(); KC.skip(); });
  const n = await p.evaluate(() => KC.ents.filter(e => e.kind === 'tower').length);
  console.log('towers:', n);
  // stand next to the first tower
  await p.evaluate(() => { const t = KC.ents.find(e => e.kind === 'tower'); window.TW = t; KC.tp(t.x + 20, t.y + 90); KC.P.invT = 999; KC.P.hp = 1e6; });
  await p.waitForTimeout(1500); await p.screenshot({ path: ROOT + '/screenshots/tower.png' });
  // the lookout shoots at you from the deck
  const shots = await p.evaluate(async () => { let n = 0, seen = new Set(); for (let i = 0; i < 80; i++) { await new Promise(r => setTimeout(r, 50)); for (const b of bullets) if (b.by === 'tower' && !seen.has(b)) { seen.add(b); n++; } } return n; });
  console.log('lookout shots in 4 s:', shots);
  // a thrown crate damages it
  const hp1 = await p.evaluate(() => { const c = KC.spawn('crate', TW.x + 70, TW.y + 70); c.vx = -480; c.vy = -480; c.z = 14; c.vz = 40; c.thrower = 'player'; c.thrownT = 1; return TW.hp; });
  await p.waitForTimeout(600);
  const hp2 = await p.evaluate(() => TW.hp);
  console.log('hp before/after crate:', hp1, Math.round(hp2));
  // thrown cars finish it
  let cars = 0;
  for (; cars < 4 && !(await p.evaluate(() => TW.dead)); cars++) {
    await p.evaluate(() => { const c = KC.spawn('car', TW.x + 80, TW.y + 80, { vt: 'sedan' }); c.vx = -375; c.vy = -375; c.z = 14; c.vz = 40; c.thrower = 'player'; c.thrownT = 1; window.CAR = c; });
    await p.waitForTimeout(280); await p.screenshot({ path: ROOT + '/screenshots/tower_down.png' });
    await p.waitForTimeout(500); await p.evaluate(() => { CAR.dead = true; });
  }
  console.log('cars needed:', cars);
  console.log('lookout on the ground:', await p.evaluate(() => KC.ents.filter(e => e.kind === 'grunt' && !e.dead && Math.hypot(e.x - TW.x, e.y - TW.y) < 120).length));
  console.log('dead:', await p.evaluate(() => TW.dead), ' hideout still standing:', await p.evaluate(() => KC.ents.some(e => e.kind === 'hideout' && !e.dead && !e.cleared)));
  console.log(errs.slice(0, 5).join('\n') || 'no errors'); await b.close();
})();
