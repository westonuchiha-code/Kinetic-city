const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + e.stack));
  await p.goto('file:///home/claude/kc/dist/kinetic_city.html'); await p.waitForTimeout(500);
  await p.evaluate(() => { KC.start(); KC.skip(); KC.tp(1*384+48, 2*384+150); KC.P.invT = 999; KC.P.hp = 1e6; });
  await p.waitForTimeout(800);
  // 1: explosion + debris + sparks + shockwave + a gravity well + a brute's warning + fire trail
  await p.evaluate(() => {
    const P = KC.P; KC.explosion(P.x + 90, P.y - 30, 70, 0, null);
    KC.wells.push({ x: P.x - 80, y: P.y + 40, t: 3, max: 3, r: 110, a: 0 });
    warnCircle(P.x + 20, P.y + 110, 50, 1.2); warnLine(P.x - 140, P.y - 90, .4, 160, 24, 1.2);
    for (let i = 0; i < 4; i++) zones.push({ x: P.x - 40 + i * 22, y: P.y - 100 + i * 8, r: 24, t: 3, max: 3, dmg: 0, col: '#ff7a2a' });
    const g = KC.spawn('grunt', P.x + 150, P.y + 60); g.ang = Math.atan2(P.y - g.y, P.x - g.x); g.aimT = .2;
    for (let i = 0; i < 3; i++) shoot(g, g.ang + (i - 1) * .2);
  });
  await p.waitForTimeout(140); await p.screenshot({ path: '/home/claude/fx_combat.png' });
  // 2: telekinesis: hold a crate and show the throw line toward an enemy
  await p.evaluate(() => {
    const P = KC.P; const c = KC.spawn('crate', P.x + 40, P.y + 10); grab(c);
    const g = KC.spawn('grunt', P.x + 200, P.y + 30); g.stun = 2;
  });
  await p.waitForTimeout(500); await p.screenshot({ path: '/home/claude/fx_tk.png' });
  console.log(errs.slice(0, 5).join('\n') || 'no errors'); await b.close();
})();
