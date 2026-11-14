const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message + '\n' + e.stack));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.addInitScript(() => {
    const mkb = () => ({ pressed: false, value: 0 });
    window.__pad = { buttons: Array.from({ length: 17 }, mkb), axes: [0, 0, 0, 0], connected: true, id: 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e)', index: 0, mapping: 'standard', timestamp: 0 };
    navigator.getGamepads = () => [window.__pad];
    window.btn = (i, v = 1) => { window.__pad.buttons[i] = { pressed: v > .5, value: v }; };
    window.ax = (a) => { window.__pad.axes = a; };
  });
  await p.goto('file:///home/claude/kc/dist/kinetic_city.html');
  await p.waitForTimeout(800);
  const log = async (label) => console.log(label, JSON.stringify(await p.evaluate(() => ({ mode: KC.G.mode, dev: KC.Input.device, P: [Math.round(KC.P.x), Math.round(KC.P.y)], hold: KC.P.holding && KC.P.holding.kind, tk: KC.tkTarget && KC.tkTarget.kind, en: Math.round(KC.P.energy), hp: Math.round(KC.P.hp) }))));
  // press A on title to start (focus is on New game)
  await p.evaluate(() => btn(0)); await p.waitForTimeout(100); await p.evaluate(() => btn(0, 0)); await p.waitForTimeout(300);
  await log('after A on title');
  // advance dialogue with A presses
  for (let i = 0; i < 12; i++) { await p.evaluate(() => btn(0)); await p.waitForTimeout(60); await p.evaluate(() => btn(0, 0)); await p.waitForTimeout(80); }
  await log('after dialog');
  // move right a bit with LS
  await p.evaluate(() => ax([1, 0, 0, 0])); await p.waitForTimeout(400); await p.evaluate(() => ax([0, 0, 0, 0]));
  await log('after move');
  // aim at nearest crate with RS
  await p.evaluate(() => { const c = KC.ents.filter(e => e.kind === 'crate').sort((a, b) => Math.hypot(a.x - KC.P.x, a.y - KC.P.y) - Math.hypot(b.x - KC.P.x, b.y - KC.P.y))[0]; const a = Math.atan2(c.y - KC.P.y, c.x - KC.P.x); ax([0, 0, Math.cos(a), Math.sin(a)]); window.__c = c; });
  await p.waitForTimeout(250);
  await log('aiming');
  await p.evaluate(() => btn(7, 1)); await p.waitForTimeout(500);
  await log('holding RT');
  await p.screenshot({ path: 'shots/10_hold.png' });
  // swing aim to the right and release
  await p.evaluate(() => ax([0, 0, 1, 0])); await p.waitForTimeout(300);
  await p.screenshot({ path: 'shots/11_aimthrow.png' });
  await p.evaluate(() => btn(7, 0)); await p.waitForTimeout(60);
  console.log('thrown', JSON.stringify(await p.evaluate(() => ({ v: Math.round(Math.hypot(__c.vx, __c.vy)), thrower: __c.thrower, held: __c.held }))));
  await p.waitForTimeout(600);
  // go to the hideout and fight
  await p.evaluate(() => { const h = KC.ents.find(e => e.kind === 'hideout' && e.did === 0); KC.tp(h.x - 180, h.y + 160); KC.P.invT = 0; });
  await p.waitForTimeout(1500);
  await log('near hideout');
  await p.screenshot({ path: 'shots/12_fight.png' });
  // repulse, well, absorb, dash
  await p.evaluate(() => btn(5)); await p.waitForTimeout(80); await p.evaluate(() => btn(5, 0));
  await p.waitForTimeout(200);
  await p.screenshot({ path: 'shots/13_repulse.png' });
  await p.evaluate(() => { ax([0, 0, .7, -.7]); btn(4); }); await p.waitForTimeout(80); await p.evaluate(() => btn(4, 0));
  await p.waitForTimeout(700);
  await p.screenshot({ path: 'shots/14_well.png' });
  await p.evaluate(() => btn(6, 1)); await p.waitForTimeout(900); 
  await p.screenshot({ path: 'shots/15_absorb.png' });
  await p.evaluate(() => btn(6, 0)); await p.waitForTimeout(150);
  await p.evaluate(() => btn(0)); await p.waitForTimeout(60); await p.evaluate(() => btn(0, 0));
  await p.waitForTimeout(1500);
  await log('after powers');
  // pause menu
  await p.evaluate(() => btn(9)); await p.waitForTimeout(80); await p.evaluate(() => btn(9, 0)); await p.waitForTimeout(200);
  await p.screenshot({ path: 'shots/16_pause.png' });
  await log('pause');
  await p.evaluate(() => btn(5)); await p.waitForTimeout(80); await p.evaluate(() => btn(5, 0)); await p.waitForTimeout(200);
  await p.screenshot({ path: 'shots/17_controls.png' });
  await p.evaluate(() => btn(1)); await p.waitForTimeout(80); await p.evaluate(() => btn(1, 0)); await p.waitForTimeout(200);
  await log('resumed');
  await p.evaluate(() => btn(8)); await p.waitForTimeout(80); await p.evaluate(() => btn(8, 0)); await p.waitForTimeout(200);
  await p.screenshot({ path: 'shots/18_map.png' });
  await p.evaluate(() => btn(8)); await p.waitForTimeout(80); await p.evaluate(() => btn(8, 0)); await p.waitForTimeout(200);
  await log('map closed');
  console.log(errs.slice(0, 8).join('\n'));
  await b.close();
})();
