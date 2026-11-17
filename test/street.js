const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('file:///home/claude/kc/dist/gravitation.html'); await p.waitForTimeout(400);
  const R = f => p.evaluate(f);
  await R(() => { KC.start(); KC.G.seen.move = 1; KC.G.hint = null; KC.tp(4 * 384 + 48, 3 * 384 + 48); KC.P.invT = 1e9; KC.G.karma = 0;
    window.ST = { enter: 0, exit: 0, cross: 0, toCar: 0, parked: 0, drove: 0 };
    const seen = new Map();
    window.__watch = () => { for (const e of KC.ents) { if (e.kind === 'civ') { const k = e.id + e.street; if (!seen.has(k)) { seen.set(k, 1); if (ST[e.street] !== undefined) ST[e.street]++; } } if (e.kind === 'car') { const k = 'c' + e.id + (e.curb ? 'P' : e.driving ? 'D' : ''); if (!seen.has(k)) { seen.set(k, 1); if (e.curb) ST.parked++; if (e.driving && seen.has('c' + e.id + 'P')) ST.drove++; } } } };
  });
  for (let i = 0; i < 120; i++) await R(() => { for (let j = 0; j < 30; j++) { KC.P.invT = 1e9; KC.step(1); __watch(); } });   // 60 s
  console.log('cars that drove off after being parked:', await R(() => KC.ents.filter(e => e.reDrive).length)); console.log('in 60s:', JSON.stringify(await R(() => ST)), 'peds near', await R(() => KC.ents.filter(e => e.kind === 'civ' && Math.hypot(e.x - KC.P.x, e.y - KC.P.y) < 700).length), 'cars driving near', await R(() => KC.ents.filter(e => e.kind === 'car' && e.driving && Math.hypot(e.x - KC.P.x, e.y - KC.P.y) < 900).length));
  await p.waitForTimeout(500); await R(() => { KC.G.hint = null; }); await p.screenshot({ path: '/home/claude/street_life_1.png' });
  await R(() => { KC.tp(816, 1250); KC.step(900); }); await p.waitForTimeout(500); await R(() => { KC.G.hint = null; });
  await p.screenshot({ path: '/home/claude/street_life_2.png' });
  console.log('people on screen:', await R(() => KC.ents.filter(e => e.kind === 'civ' && Math.abs(e.x - KC.cam.cx) < KC.cam.w / 2 && Math.abs(e.y - KC.cam.cy) < KC.cam.h / 2).length));
  console.log(errs.slice(0, 5).join('\n') || 'no errors'); await b.close();
})();
