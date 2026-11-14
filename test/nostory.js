const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/kc/dist/kinetic_city.html'); await p.waitForTimeout(400);
  await p.evaluate(() => KC.start()); await p.waitForTimeout(200);
  console.log('after New game:', await p.evaluate(() => KC.G.mode));
  console.log(await p.evaluate(() => { KC.spawnBoss(0); const m1 = KC.G.mode; KC.P.invT = 999; KC.hurt(KC.G.boss, 99999, { by: 'player' }); KC.step(200); return JSON.stringify({ duringBoss: m1, after: KC.G.mode, d0: KC.DS[0].status, gate: KC.DS[0].bossDone }); }));
  console.log(errs.join('|') || 'no errors'); await b.close();
})();
