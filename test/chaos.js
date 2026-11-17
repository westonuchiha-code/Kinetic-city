const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('file:///home/claude/kc/dist/gravitation.html'); await p.waitForTimeout(400);
  const R = (f, a) => p.evaluate(f, a);
  await R(() => { KC.start(); KC.skip(); });
  // police heat
  await R(() => { KC.G.heat = 3.2; KC.P.invT = 0; for (let i = 0; i < 600; i++) { KC.step(1); if (KC.P.hp < 30) KC.P.hp = 100; } });
  console.log('cops', await R(() => KC.ents.filter(e => e.kind === 'cop').length), 'heat', await R(() => KC.G.heat.toFixed(2)));
  // death + respawn
  await R(() => { KC.P.invT = 0; KC.P.dashT = 0; KC.P.absorbing = false; KC.hurt(KC.P, 999, { by: 'test' }); KC.step(200); });
  console.log('after death mode', await R(() => KC.G.mode), 'hp', await R(() => Math.round(KC.P.hp)));
  // allies at high karma
  await R(() => { KC.G.heat = 0; KC.G.karma = 60; KC.G.allyT = 0; KC.step(30); KC.G.allyT = 0; KC.step(600); });
  console.log('allies', await R(() => KC.ents.filter(e => e.kind === 'cop' && e.ally).length));
  // encounters: force each
  for (let i = 0; i < 6; i++) await R(() => { KC.G.encT = 0; KC.step(120); KC.skip(); });
  console.log('marker', await R(() => !!KC.G.marker), 'ents', await R(() => KC.ents.length));
  // upgrades: give points and buy all affordable incl evil
  await R(() => { KC.G.points = 40; KC.G.karma = -60; });
  await R(() => { for (const u of ['hp','en','regen','tk1','tk2','rep','well','dash','abs','e_vortex','e_chain','e_tithe']) for (let i = 0; i < 3; i++) window.buyUpgrade && window.buyUpgrade(u); });
  console.log('ups', await R(() => JSON.stringify(KC.ups)));
  // powers spam near a hideout in district 0
  await R(() => { const h = KC.ents.find(e => e.kind === 'hideout'); if (h) KC.tp(h.x + 150, h.y + 150); });
  for (let i = 0; i < 40; i++) await R((i) => {
    KC.P.invT = 999; KC.P.energy = 999;
    const k = i % 5; if (k === 0) window.repulse(); else if (k === 1) window.placeWell(); else if (k === 2) { KC.P.absorbing = true; KC.P.charge = 60; window.releaseAbsorb(); KC.P.absorbing = false; }
    else if (k === 3) { const t = KC.ents.find(e => e.def.grab && !e.dead && !e.held && Math.hypot(e.x - KC.P.x, e.y - KC.P.y) < 300); if (t) { window.grab(t); KC.step(20); window.throwHeld(); } }
    else { KC.P.dashT = .17; KC.P.dashDx = 1; KC.P.dashDy = 0; }
    KC.step(30);
  }, i);
  console.log('after powers kills', await R(() => KC.G.kills), 'combo best', await R(() => KC.G.comboBest), 'civKills', await R(() => KC.G.civKills));
  // heal + drain
  await R(() => { const c = KC.ents.find(e => e.kind === 'civ' && !e.dead); KC.tp(c.x + 20, c.y); c.state = 'wounded'; c.hp = 1; c.woundT = 30; KC.step(1); window.healCiv(c); const c2 = KC.ents.find(e => e.kind === 'civ' && !e.dead && e !== c); window.drainCiv(c2); KC.step(10); });
  // shards
  await R(() => { const s = KC.ents && KC.pickups.find(p => p.type === 'shard'); KC.tp(s.x, s.y); KC.step(5); });
  console.log('shards', await R(() => KC.G.shards));
  // bosses in other districts with supers & brutes alive
  await R(() => { KC.skipTo(1); KC.skip(); KC.spawnBoss(1); KC.skip(); KC.P.invT = 999; });
  for (let i = 0; i < 15; i++) await R(() => { KC.P.invT = 999; KC.step(60); KC.skip(); });
  await R(() => { KC.skipTo(2); KC.skip(); KC.spawnBoss(2); KC.skip(); });
  for (let i = 0; i < 15; i++) await R(() => { KC.P.invT = 999; KC.step(60); KC.skip(); });
  console.log('ents end', await R(() => KC.ents.length), 'parts', await R(() => KC.parts.length));
  // save & reload & continue
  await R(() => window.saveGame());
  await p.reload(); await p.waitForTimeout(400);
  console.log('continue enabled', await R(() => !document.getElementById('bCont').disabled));
  await R(() => document.getElementById('bCont').click()); await p.waitForTimeout(300);
  console.log('loaded', JSON.stringify(await R(() => ({ mode: KC.G.mode, lvl: KC.G.level, d0: KC.DS[0].status, gates: [KC.DS[1].intro], shards: KC.G.shards, hideouts: KC.ents.filter(e => e.kind === 'hideout').length }))));
  console.log(errs.slice(0, 10).join('\n'));
  await b.close();
})();
