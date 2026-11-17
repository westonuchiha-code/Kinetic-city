const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/kc/dist/gravitation.html'); await p.waitForTimeout(400);
  const R = f => p.evaluate(f);
  await R(() => { KC.start(); KC.skip(); });
  await R(() => { window.HO = KC.ents.find(e => e.kind === 'hideout' && e.did === 0); });
  const count = () => R(() => KC.ents.filter(e => e.team === 'gang' && !e.static && e.tgt === KC.P).length);
  const near = () => R(() => KC.ents.filter(e => e.team === 'gang' && !e.static && Math.hypot(e.x - KC.P.x, e.y - KC.P.y) < 200).length);
  // 1) stand 420 units from the hideout (outside its turf) for 10 s
  await R(() => { KC.tp(HO.x + 420, HO.y + 30); KC.P.invT = 999; KC.step(600); });
  console.log('outside turf, gang targeting you:', await count(), ' gang within 200:', await near());
  // 2) step inside the turf
  await R(() => { KC.tp(HO.x + 150, HO.y + 120); KC.P.invT = 999; KC.step(120); });
  console.log('inside turf, gang targeting you:', await count());
  // 3) walk well away and wait
  await R(() => { KC.tp(48, 210); KC.P.invT = 999; KC.step(600); });
  console.log('left turf 10 s ago, gang targeting you:', await count(), ' gang within 300 of you:', await R(() => KC.ents.filter(e => e.team === 'gang' && !e.static && Math.hypot(e.x - KC.P.x, e.y - KC.P.y) < 300).length));
  console.log('gang back near hideout:', await R(() => KC.ents.filter(e => e.team === 'gang' && !e.static && Math.hypot(e.x - HO.x, e.y - HO.y) < 320).length));
  // 4) a minute of free roaming far from any hideout: random ambushes should not appear
  await R(() => { KC.tp(1 * 384 + 48, 3 * 384 + 48); for (let i = 0; i < 3600; i++) { KC.P.invT = 999; KC.G.encT = Math.min(KC.G.encT, 1); KC.step(1); } });
  console.log('after 60 s roaming with encounters forced, gang targeting you:', await count());
  console.log(errs.join('|') || 'no errors'); await b.close();
})();
