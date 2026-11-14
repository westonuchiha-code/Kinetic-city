const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/kc/dist/kinetic_city.html'); await p.waitForTimeout(400);
  const R = f => p.evaluate(f);
  await R(() => { KC.start(); KC.G.seen.move = 1; KC.G.hint = null; KC.tp(816, 1250); KC.P.invT = 1e9; KC.step(300); });
  const k = () => R(() => Math.round(KC.G.karma * 10));
  // 10 civilians killed outright
  await R(() => { let n = 0; for (const c of KC.ents.filter(e => e.kind === 'civ')) { if (n++ >= 10) break; KC.hurt(c, 999, { by: 'player' }); } KC.step(5); });
  console.log('after killing 10 civilians: karma', await k(), 'rank', await R(() => window.karmaTier()));
  // 20 accidental hits spread over 60 s of fighting
  await R(() => { for (let i = 0; i < 20; i++) { const c = KC.ents.find(e => e.kind === 'civ' && !e.dead); if (c) KC.hurt(c, 3, { by: 'player' }); KC.step(180); } });
  console.log('after 20 accidental bystander hits over a minute: karma', await k());
  console.log('civilian kills needed to reach Bad rank from 0:', Math.ceil(20 / .4), ' to reach Infamous:', Math.ceil(60 / .4));
  await R(() => { KC.G.hint = null; KC.G.toasts.length = 0; }); await p.waitForTimeout(150);
  await p.screenshot({ path: '/home/claude/karma_hud.png', clip: { x: 0, y: 0, width: 520, height: 150 } });
  console.log(errs.join('|') || 'no errors'); await b.close();
})();
