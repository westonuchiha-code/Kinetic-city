// Structure art: the hideout of each gang (guarded, and cleared for the first), a hit flash, and the district barricade.
// Writes screenshots/struct_*.png at double size. Run after changing drawIsoHideout or drawIsoGateSeg.
const { chromium } = require('playwright');
const path = require('path'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + e.stack));
  await p.goto('file://' + ROOT + '/dist/gravitation.html'); await p.waitForTimeout(400);
  await p.evaluate(() => { localStorage.clear(); }); await p.reload(); await p.waitForTimeout(600);
  await p.evaluate(() => { KC.start(); KC.skip(); KC.P.invT = 0; G.hint = null; G.seen = new Proxy({}, { get: () => 1 }); gatesOpen[0] = gatesOpen[1] = true; });
  const shot = async (name, did, setup) => {
    const pos = await p.evaluate(([did, setup]) => {
      const h = ents.filter(e => e.kind === 'hideout' && e.did === did)[0];
      for (const e of ents) if (!e.dead && e !== P && e.kind !== 'hideout' && Math.hypot(e.x - h.x, e.y - h.y) < 420) { if (e.guardOf !== undefined && setup === '') { e.x += 5000; e.stun = 1e9; e.static = 1; } else e.dead = true; }   // clear the yard for a clean look
      if (setup === 'open') { h.gateOpen = true; h.gateT = 1; } if (setup === 'cleared') { h.gateOpen = true; h.gateT = 1; h.cleared = true; }
      h.wave = 99; h.waveT = 1e9;
      KC.tp(h.rect.x - 30, h.rect.y - 30); P.vx = P.vy = 0; G.hint = null; G.toasts.length = 0; G.heat = 0;
      return [h.rect.x + h.rect.w / 2, h.rect.y + h.rect.h / 2];
    }, [did, setup]);
    await p.waitForTimeout(1700);
    const s = await p.evaluate(([x, y]) => { G.hint = null; G.toasts.length = 0; for (const e of ents) if (!e.dead && e !== P && e.kind !== 'hideout' && e.guardOf === undefined && Math.hypot(e.x - x, e.y - y) < 420) e.dead = true; const s = isoToScreen(x, y, 40); return [s.x, s.y]; }, pos);
    await p.waitForTimeout(150);
    await p.screenshot({ path: ROOT + '/screenshots/struct_' + name + '.png', clip: { x: Math.max(0, s[0] - 300), y: Math.max(0, s[1] - 240), width: 600, height: 420 } });
  };
  for (let d = 0; d < 3; d++) await shot('hideout_' + ['rustlers', 'breakers', 'architects'][d], d, '');
  // a hit makes the whole building flash white for a moment
  await p.evaluate(() => { const h = ents.filter(e => e.kind === 'hideout' && e.did === 2)[0]; h.flash = 9; }); await p.waitForTimeout(200);
  console.log('flash draws:', await p.evaluate(() => { const h = ents.filter(e => e.kind === 'hideout' && e.did === 2)[0]; const ok = !!(h._art && h._art.white); h.flash = 0; return ok; }));
  await shot('hideout_cleared', 0, 'cleared');
  // the barricade between districts
  await p.evaluate(() => { gatesOpen[0] = false; const gx = GATE_TX[0] * TILE; KC.tp(gx + 10, 600); P.vx = P.vy = 0; for (const e of ents) if (e !== P && !e.dead && e.kind !== 'hideout' && Math.hypot(e.x - gx, e.y - 600) < 300) e.dead = true; });
  await p.waitForTimeout(1800); await p.evaluate(() => { G.hint = null; G.toasts.length = 0; }); await p.waitForTimeout(100);
  await p.screenshot({ path: ROOT + '/screenshots/struct_barricade.png', clip: { x: 420, y: 150, width: 760, height: 560 } });
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
