const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/kc/dist/gravitation.html'); await p.waitForTimeout(400);
  const R = f => p.evaluate(f);
  await R(() => { KC.start(); KC.G.seen.move = 1; KC.G.hint = null; window.HO = KC.ents.find(e => e.kind === 'hideout' && e.did === 0); KC.tp(HO.x + 70, HO.rect.y + HO.rect.h + 120); KC.P.invT = 1e9; });
  await R(() => { for (const g of KC.ents.filter(e => e.guardOf === HO.hid)) KC.hurt(g, 9999, { by: 'player' }); });
  const log = [];
  for (let w = 0; w < 3; w++) {
    await R(() => { KC.P.invT = 1e9; KC.step(150); });                // let the wave pour out
    if (w === 0) { await p.waitForTimeout(200); await R(() => { KC.G.hint = null; }); await p.screenshot({ path: '/home/claude/assault_wave1.png' }); }
    if (w === 2) { await p.waitForTimeout(200); await R(() => { KC.G.hint = null; }); await p.screenshot({ path: '/home/claude/assault_lieutenant.png' }); }
    log.push(await R(() => ({ wave: HO.wave, out: KC.ents.filter(e => e.waveOf === HO.hid && !e.dead).map(e => e.leader ? 'LEADER' : e.kind).join(','), obj: null })));
    await R(() => { for (const g of KC.ents.filter(e => e.waveOf === HO.hid && !e.dead)) KC.hurt(g, 9999, { by: 'player' }); KC.step(30); });
  }
  await R(() => KC.step(60));
  console.log(JSON.stringify(log));
  console.log('cleared:', await R(() => [HO.cleared, KC.DS[0].hideoutsLeft]));
  console.log(errs.join('|') || 'no errors'); await b.close();
})();
