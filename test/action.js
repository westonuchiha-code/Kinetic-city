const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    const mkb = () => ({ pressed: false, value: 0 });
    window.__pad = { buttons: Array.from({ length: 17 }, mkb), axes: [0, 0, 0, 0], connected: true, id: 'Xbox Wireless Controller (Vendor: 045e)', index: 0, mapping: 'standard' };
    navigator.getGamepads = () => [window.__pad];
    window.btn = (i, v = 1) => { window.__pad.buttons[i] = { pressed: v > .5, value: v }; };
    window.ax = (a) => { window.__pad.axes = a; };
  });
  await p.goto('file:///home/claude/kc/dist/gravitation.html'); await p.waitForTimeout(400);
  await p.evaluate(() => { KC.start(); KC.skip(); KC.G.seen.move = 1; KC.G.hint = null; });
  // set up: player near hideout 0, a car next to player, grunts in front
  await p.evaluate(() => {
    const h = KC.ents.find(e => e.kind === 'hideout' && e.did === 0);
    KC.tp(h.x - 40, h.y + 230); KC.P.invT = 999;
    window.__car = KC.spawn('car', KC.P.x + 40, KC.P.y + 10, { col: '#e8d040', ang: 0 });
    for (const g of KC.ents.filter(e => e.kind === 'grunt' && Math.hypot(e.x - h.x, e.y - h.y) < 200)) { g.x = h.x + (Math.random() - .5) * 60; g.y = h.y + 70 + Math.random() * 20; g.tgt = null; g.cd = 9; }
  });
  await p.evaluate(() => btn(0)); await p.waitForTimeout(50); await p.evaluate(() => btn(0, 0));
  await p.evaluate(() => { const c = __car, a = Math.atan2(c.y - KC.P.y, c.x - KC.P.x); ax([0, 0, Math.cos(a), Math.sin(a)]); });
  await p.waitForTimeout(200);
  await p.screenshot({ path: 'shots/50_target.png' });
  await p.evaluate(() => btn(7, 1)); await p.waitForTimeout(350);
  await p.evaluate(() => { const h = KC.ents.find(e => e.kind === 'hideout' && e.did === 0); const a = Math.atan2(h.y + 75 - KC.P.y, h.x - KC.P.x); ax([0, 0, Math.cos(a), Math.sin(a)]); });
  await p.waitForTimeout(450);
  await p.screenshot({ path: 'shots/51_hold_aim.png' });
  await p.evaluate(() => btn(7, 0)); await p.waitForTimeout(260);
  await p.screenshot({ path: 'shots/52_impact.png' });
  await p.waitForTimeout(500);
  await p.screenshot({ path: 'shots/53_after.png' });
  console.log(JSON.stringify(await p.evaluate(() => ({ kills: KC.G.kills, combo: KC.G.combo, car: __car.dead, carhp: Math.round(__car.hp) }))));
  console.log(errs.join('\n'));
  await b.close();
})();
