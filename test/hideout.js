const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/kc/dist/kinetic_city.html'); await p.waitForTimeout(500);
  const R = f => p.evaluate(f);
  await R(() => { KC.start(); KC.skip(); KC.G.seen.move = 1; });
  await R(() => { window.HO = KC.ents.find(e => e.kind === 'hideout' && e.did === 0); KC.tp(HO.x + 70, HO.rect.y + HO.rect.h + 40); KC.P.invT = 999; KC.G.hint = null; });
  await p.waitForTimeout(900); await R(() => { KC.G.hint = null; }); await p.waitForTimeout(100);
  await p.screenshot({ path: '/home/claude/hideout_closed.png' });
  console.log('guards', await R(() => HO.guardsLeft));
  // throw-test: a crate flung at the wall
  const before = await R(() => HO.hp);
  await R(() => { const c = KC.spawn('crate', HO.x, HO.rect.y + HO.rect.h + 40); c.vx = 0; c.vy = -700; c.thrower = 'player'; c.thrownT = 1.5; KC.step(30); });
  console.log('hideout hp', Math.round(before), '->', Math.round(await R(() => HO.hp)));
  // kill the guards
  await R(() => { for (const g of KC.ents.filter(e => e.guardOf === HO.hid)) KC.hurt(g, 9999, { by: 'player' }); });
  await p.waitForTimeout(1600); await R(() => { KC.G.hint = null; });
  await p.screenshot({ path: '/home/claude/hideout_open.png' });
  console.log('gate open', await R(() => HO.gateOpen));
  await p.screenshot({ path: '/home/claude/hideout_open_close.png', clip: { x: 420, y: 60, width: 760, height: 520 } });
  await R(() => { KC.tp(HO.x, HO.rect.y + HO.rect.h + 8); KC.step(3); KC.tp(HO.x + 70, HO.rect.y + HO.rect.h + 40); });
  await p.waitForTimeout(1200); await p.screenshot({ path: '/home/claude/hideout_cleared.png' });
  console.log('cleared', await R(() => [HO.cleared, KC.DS[0].hideoutsLeft]));
  console.log(errs.join('|') || 'no errors'); await b.close();
})();
