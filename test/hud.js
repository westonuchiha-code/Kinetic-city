// In-game HUD look: a calm frame and a busy one (boss bar, combo, heat, skill points, hint, toasts) with a controller.
// Writes screenshots/hud_calm.png and screenshots/hud_busy.png; `node test/hud.js 2` also writes double-size corner close-ups.
const { chromium } = require('playwright');
const path = require('path'); const ROOT = path.resolve(__dirname, '..'), OUT = ROOT + '/screenshots/hud', ZOOM = +process.argv[2] || 0;
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: ZOOM || 1 })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + e.stack));
  await p.addInitScript(() => {
    const mkb = () => ({ pressed: false, value: 0 });
    window.__pad = { buttons: Array.from({ length: 17 }, mkb), axes: [0, 0, 0, 0], connected: true, id: 'Xbox Wireless Controller (STANDARD GAMEPAD)', index: 0, mapping: 'standard' };
    navigator.getGamepads = () => [window.__pad];
    window.tap = async (i) => { window.__pad.buttons[i] = { pressed: true, value: 1 }; await new Promise(r => setTimeout(r, 70)); window.__pad.buttons[i] = { pressed: false, value: 0 }; await new Promise(r => setTimeout(r, 90)); };
  });
  await p.goto('file://' + ROOT + '/dist/kinetic_city.html'); await p.waitForTimeout(400);
  await p.evaluate(() => { localStorage.clear(); }); await p.reload(); await p.waitForTimeout(400);
  await p.evaluate(() => { KC.start(); KC.skip(); KC.P.invT = 1e9; });
  await p.evaluate(() => tap(14)); await p.waitForTimeout(600);
  await p.screenshot({ path: OUT + '_calm.png' });
  await p.evaluate(() => {
    KC.G.level = 7; KC.G.points = 2; KC.G.karma = 46; KC.G.heat = 3.4; KC.G.heatT = 99; KC.G.combo = 9; KC.G.comboT = 2.6; KC.G.xp = xpNeed() * .6;
    KC.P.hp = 58; KC.P.energy = 40; KC.P.wellCd = 1.4; KC.P.dashCd = .2;
    KC.spawnBoss && KC.spawnBoss(0, KC.P.x + 150, KC.P.y - 60);
    G.marker = { x: KC.P.x + 900, y: KC.P.y + 300 };
  });
  await p.evaluate(() => { KC.step(20); if (G.boss) { G.boss.hp = G.boss.maxhp * .62; } KC.P.hp = 58; G.combo = 9; G.comboT = 2.6; G.heat = 3.4; hpTrail = 80; G.hint = { items: [{ a: 'tk' }, { t: 'Hold to lift, release to throw' }], life: 9 }; toast('District liberated', '#38d0ff', true); toast('+120 XP', '#ffc24a'); });
  await p.waitForTimeout(250);
  await p.screenshot({ path: OUT + '_busy.png' });
  if (ZOOM) {
    await p.screenshot({ path: OUT + '_tl.png', clip: { x: 0, y: 0, width: 520, height: 200 } });
    await p.screenshot({ path: OUT + '_tr.png', clip: { x: 1080, y: 0, width: 520, height: 460 } });
    await p.screenshot({ path: OUT + '_bl.png', clip: { x: 0, y: 700, width: 520, height: 200 } });
    await p.screenshot({ path: OUT + '_bc.png', clip: { x: 420, y: 640, width: 760, height: 220 } });
  }
  console.log('cached HUD pieces:', await p.evaluate(() => _stamps.size));
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
