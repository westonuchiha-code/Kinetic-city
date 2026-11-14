// Screenshots of every menu and screen at 1600x900 with a controller, for visual review.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '..'), OUT = process.argv[2] || ROOT + '/screenshots/ui';
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.addInitScript(() => {
    const mkb = () => ({ pressed: false, value: 0 });
    window.__pad = { buttons: Array.from({ length: 17 }, mkb), axes: [0, 0, 0, 0], connected: true, id: 'Razer Kishi (STANDARD GAMEPAD)', index: 0, mapping: 'standard' };
    navigator.getGamepads = () => [window.__pad];
    window.tap = async (i) => { window.__pad.buttons[i] = { pressed: true, value: 1 }; await new Promise(r => setTimeout(r, 70)); window.__pad.buttons[i] = { pressed: false, value: 0 }; await new Promise(r => setTimeout(r, 110)); };
  });
  const shot = async n => { await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}/${n}.png` }); };
  const tap = i => p.evaluate(i => tap(i), i);
  await p.goto('file://' + ROOT + '/dist/kinetic_city.html'); await p.waitForTimeout(600);
  await shot('01_title');
  await p.evaluate(() => document.getElementById('bCtl').click()); await shot('02_title_controls');
  await tap(1);
  await p.evaluate(() => { KC.start(); KC.skip(); KC.P.invT = 1e9; }); await p.waitForTimeout(800);
  await shot('03_play_start');
  await tap(9); await shot('04_pause_skills');
  await tap(5); await shot('04b_pause_costumes');
  await tap(5); await shot('05_pause_controls');
  await tap(5); await shot('06_pause_settings');
  await tap(9); await p.waitForTimeout(200);
  await tap(8); await shot('07_map');
  await tap(8);
  await p.evaluate(() => { KC.giveXP(400); }); await p.waitForTimeout(600); await shot('08_levelup');
  await tap(9); await shot('09_pause_skills_points'); await tap(9);
  await p.evaluate(() => { KC.P.invT = 0; KC.hurt(KC.P, 9999, { by: 'grunt' }); }); await p.waitForTimeout(1500); await shot('10_dead');
  // title settings, with a save present so the delete row shows
  await p.evaluate(() => { saveGame(); }); await p.reload(); await p.waitForTimeout(600);
  await p.evaluate(() => document.getElementById('bSet').click()); await shot('12_title_settings');
  await p.evaluate(() => { document.querySelector('.set[data-k="hud"]').click(); });
  await tap(1); await p.evaluate(() => { document.getElementById('bCont').click(); KC.P.invT = 1e9; }); await p.waitForTimeout(700); await shot('13_hud_110');
  await p.evaluate(() => { SETTINGS.hud = .7; }); await shot('14_hud_70');
  await p.evaluate(() => { SETTINGS.hud = 1; saveSettings(); });
  console.log(errs.join('\n') || 'no errors');
  await ctx.close();
  await b.close();
})();
