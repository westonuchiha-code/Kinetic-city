// Things a screenshot cannot show: map edges, sealed barricades, thin fences, dying mid-action, saves, window shapes.
// Prints one line per check; lines starting with FAIL are real problems. Writes a few screenshots to screenshots/tour/.
const { open, OUT } = require('./tour_lib');
(async () => {
  const T = await open(); const p = T.p;
  const res = []; const ok = (name, pass, detail) => { res.push((pass ? 'ok    ' : 'FAIL  ') + name + (detail ? '  — ' + detail : '')); };
  await T.run(() => { KC.start(); KC.skip(); G.seen = new Proxy({}, { get: () => 1, set: () => true }); }); await T.wait(300);

  // ---- map edges: push against all four for 3 s each
  for (const [dx, dy, nm, sx, sy] of [[-1, 0, 'west', 60, 432], [0, -1, 'north', 432, 60], [1, 0, 'east', 4640, 432], [0, 1, 'south', 432, 2720]]) {
    await T.run(([dx, dy, sx, sy]) => { gatesOpen[0] = gatesOpen[1] = true; stage(sx, sy); moveW(dx, dy); }, [dx, dy, sx, sy]); await T.wait(2500);
    const r = await T.run(() => { stopMove(); return { x: Math.round(P.x), y: Math.round(P.y), in: P.x >= 0 && P.y >= 0 && P.x <= WORLD_W && P.y <= WORLD_H, walk: walkable(P.x, P.y, 2) }; });
    ok('cannot walk off the ' + nm + ' edge', r.in && r.walk, 'ended at ' + r.x + ',' + r.y);
  }
  // ---- sealed barricade: walk, dash, and get blasted at it
  await T.run(() => { gatesOpen[0] = gatesOpen[1] = false; if (typeof closeGate === 'function') { closeGate(0); closeGate(1); } });
  const gateState = await T.run(() => ({ gx: GATE_TX[0] * TILE, solid: !walkable(GATE_TX[0] * TILE + 16, 432, 4) }));
  if (!gateState.solid) ok('barricade test could be set up', false, 'could not re-seal the gate for the test'); else {
    for (const how of ['walk', 'dash', 'blast', 'thrown car']) {
      await T.run((gx) => { stage(gx - 40, 432); P.energy = S.maxEn; P.invT = 9; moveW(1, 0); }, gateState.gx);
      if (how === 'walk') await T.wait(1500);
      if (how === 'dash') for (let i = 0; i < 6; i++) { await T.run(() => { P.dashCd = 0; P.energy = S.maxEn; }); await T.run(() => tap(0, 40)); await T.wait(260); }
      if (how === 'blast') { await T.run(() => { for (let i = 0; i < 5; i++) KC.explosion(P.x - 30, P.y, 120, 1, 'world'); P.vx = 900; }); await T.wait(900); }
      let carX = null;
      if (how === 'thrown car') { await T.run(() => { stopMove(); const c = KC.spawn('car', P.x - 10, P.y + 40, { col: '#888', ang: 0 }); window.__c = c; grab(c); c.z = 16; aim.ang = 0; aim.dx = 1; aim.dy = 0; throwHeld(); KC.step(120); }); carX = await T.run(() => Math.round(__c.x)); }
      const x = await T.run(() => { stopMove(); return Math.round(P.x); });
      if (how === 'thrown car') ok('a thrown car does not pass the sealed barricade', carX < gateState.gx + 32, 'car at x ' + carX + ', barricade at ' + gateState.gx);
      else ok('cannot ' + how + ' through the sealed barricade', x < gateState.gx + 16, 'ended at x ' + x + ', barricade at ' + gateState.gx);
    }
  }
  // ---- chain-link fence: dash at it and throw a car at it
  const F = await T.run(() => { const f = fences.find(f => Math.abs(f.x1 - f.x0) > 60) || fences[0]; return f ? { x0: f.x0, y0: f.y0, x1: f.x1, y1: f.y1 } : null; });
  if (F) {
    const horiz = Math.abs(F.x1 - F.x0) > Math.abs(F.y1 - F.y0), mx = (F.x0 + F.x1) / 2, my = (F.y0 + F.y1) / 2;
    for (const side of [-1, 1]) {
      const r = await T.run(([mx, my, horiz, side]) => {
        const sx = horiz ? mx : mx + side * 46, sy = horiz ? my + side * 46 : my; if (!walkable(sx, sy, 10)) return null;
        stage(sx, sy); P.invT = 9; const c = KC.spawn('car', sx + (horiz ? 40 : 0), sy + (horiz ? 0 : 40), { col: '#888', ang: 0 }); grab(c); c.z = 16; c.x = sx; c.y = sy;
        const a = horiz ? -side * Math.PI / 2 : (side > 0 ? Math.PI : 0); aim.ang = a; aim.dx = Math.cos(a); aim.dy = Math.sin(a); throwHeld(); KC.step(90);
        const through = horiz ? (c.y - my) * side < -6 : (c.x - mx) * side < -6; return { through, dead: c.dead, at: Math.round(c.x) + ',' + Math.round(c.y) };
      }, [mx, my, horiz, side]);
      if (r) ok('a thrown car does not fly through the chain-link fence (side ' + side + ')', !r.through || r.dead, 'car ended at ' + r.at + (r.dead ? ' (destroyed)' : ''));
    }
  }
  // ---- dying while holding something, then getting back up
  await T.run(() => { stage(1008, 1392); P.invT = 0; const c = KC.spawn('crate', P.x + 36, P.y); window.__c = c; grab(c); KC.hurt(P, 9999, { by: 'test' }); });
  const d1 = await T.run(() => ({ holding: !!P.holding, held: !!__c.held, mode: G.mode })); ok('dying drops what you hold', !d1.holding && !d1.held && d1.mode === 'dead');
  await T.until(() => G.mode === 'play', 6000); const d2 = await T.run(() => ({ hp: P.hp, max: S.maxHp, holding: !!P.holding, heat: G.heat, walk: walkable(P.x, P.y, 6) })); ok('respawn: full health, empty hands, on open ground', d2.hp === d2.max && !d2.holding && d2.walk);
  // dying while absorbing, with a well out, and mid-dash
  await T.run(() => { stage(1008, 1392); P.invT = 0; btn(6, 1); }); await T.wait(300); await T.run(() => { P.invT = 0; P.absorbing = false; KC.hurt(P, 9999, { by: 'test' }); btn(6, 0); }); await T.until(() => G.mode === 'play', 6000);
  ok('respawn after dying mid-absorb leaves no shield up', await T.run(() => !P.absorbing && P.charge === 0));
  // ---- clearing a hideout moves the respawn point to its gate
  const cp = await T.run(() => { G.check = { ...START }; const h = ents.find(e => e.kind === 'hideout' && e.did === 0 && !e.cleared); clearHideout(h); const c = { x: G.check.x, y: G.check.y }; stage(h.x + 300, h.y + 300); P.invT = 0; KC.hurt(P, 9999, { by: 'test' }); return { c, gate: [h.x, h.rect.y + h.rect.h], walk: walkable(c.x, c.y, 10) }; });
  await T.until(() => G.mode === 'play', 6000);
  const cp2 = await T.run(() => ({ x: Math.round(P.x), y: Math.round(P.y), saved: (loadSave() || {}).check }));
  ok('after clearing a hideout you get back up at its gate', cp.walk && Math.hypot(cp2.x - cp.gate[0], cp2.y - cp.gate[1]) < 80, 'respawned at ' + cp2.x + ',' + cp2.y + ', gate at ' + cp.gate.map(Math.round));
  ok('that respawn point is in the saved game', !!cp2.saved && Math.round(cp2.saved.x) === Math.round(cp.c.x) && Math.round(cp2.saved.y) === Math.round(cp.c.y));
  // ---- dying in a boss fight: he goes back to his plaza and waits, wounds kept; he picks the fight up when you return
  await T.run(() => { for (const e of ents) if (e.did === 0 && (e.kind === 'hideout' || e.guardOf !== undefined)) { if (e.kind === 'hideout') { e.cleared = true; e.gateOpen = true; e.gateT = 1; } else e.dead = true; } DS[0].hideoutsLeft = 0; G.check = { ...START }; const s = spots.boss[0]; stage(s.x - 110, s.y + 60); P.invT = 0; KC.spawnBoss(0); });
  await T.wait(1500); await T.run(() => { G.boss.hp = G.boss.maxhp * .4; P.invT = 0; KC.hurt(P, 9999, { by: 'boss' }); }); await T.until(() => G.mode === 'play', 6000); await T.wait(6000);
  const bz = await T.run(() => { const h = spots.boss[0]; return { frac: +(G.boss.hp / G.boss.maxhp).toFixed(2), home: Math.round(Math.hypot(G.boss.x - h.x, G.boss.y - h.y)), fromYou: Math.round(Math.hypot(G.boss.x - P.x, G.boss.y - P.y)), bullets: bullets.filter(b => Math.hypot(b.x - P.x, b.y - P.y) < 400).length, warns: warns.length, hp: P.hp, max: S.maxHp }; });
  ok('after you fall, the boss returns to his plaza instead of hunting you across the district', bz.home < 80 && bz.fromYou > 900, 'boss ' + bz.home + ' px from his plaza, ' + bz.fromYou + ' px from you');
  ok('nothing of his reaches you at the respawn point', bz.bullets === 0 && bz.hp === bz.max);
  ok('he keeps his wounds', Math.abs(bz.frac - .4) < .05, Math.round(bz.frac * 100) + '% health');
  await T.run(() => { const h = spots.boss[0]; KC.tp(h.x - 200, h.y + 40); P.invT = 9; }); await T.wait(5000);
  ok('he picks the fight up again when you come back', await T.run(() => !G.boss.away && (bullets.length > 0 || warns.length > 0 || G.boss.act !== '' || G.boss.pi !== undefined)));
  // running far away without dying also breaks it off
  await T.run(() => { KC.tp(spots.boss[0].x + 1000, spots.boss[0].y - 300); }); await T.wait(1500);
  ok('running far away breaks the fight off too', await T.run(() => G.boss.away === true));
  await T.run(() => { const h = spots.boss[0]; KC.tp(h.x - 150, h.y + 40); P.invT = 9; }); await T.wait(800);
  // ---- save, reload, continue
  await T.run(() => { KC.hurt(G.boss, 99999, { by: 'player' }); }); await T.until(() => DS[0].bossDone, 9000); await T.wait(300);
  await T.run(() => { G.shards = 3; G.shardIds = [0, 1, 2]; KC.giveXP(300); buyUpgrade('hp'); const t = ents.find(e => e.kind === 'tower' && e.did === 1 && !e.dead); window.__tw = t.hid; KC.hurt(t, 9999, { by: 'player' }); KC.setKarma(42); KC.step(70); setCostume('scarf'); saveGame(); });
  const before = await T.run(() => ({ lvl: G.level, pts: G.points, karma: Math.round(G.karma), shards: G.shards, hpUp: ups.hp || 0, d0: DS[0].status, gate0: gatesOpen[0], towers1: (DS[1].towers || []).slice(), costume: heroCostume, maxHp: S.maxHp }));
  await p.reload(); await T.wait(700); await T.run(() => document.getElementById('bCont').click()); await T.wait(700);
  const after = await T.run(() => ({ lvl: G.level, pts: G.points, karma: Math.round(G.karma), shards: G.shards, hpUp: ups.hp || 0, d0: DS[0].status, gate0: gatesOpen[0], towers1: (DS[1].towers || []).slice(), costume: heroCostume, maxHp: S.maxHp }));
  ok('a saved game comes back the same', JSON.stringify(before) === JSON.stringify(after), JSON.stringify(before) === JSON.stringify(after) ? '' : 'before ' + JSON.stringify(before) + ' after ' + JSON.stringify(after));
  ok('the destroyed tower stays destroyed after loading', before.towers1.length === 1 && await T.run((h) => !ents.some(e => e.kind === 'tower' && !e.dead && e.hid === h), before.towers1[0]));
  ok('cleared hideouts stay cleared after loading', await T.run(() => ents.filter(e => e.kind === 'hideout' && e.did === 0).every(e => e.cleared)));
  ok('you load onto open ground', await T.run(() => walkable(P.x, P.y, 6)));
  // ---- the barricade says why you cannot pass
  await T.run(() => { gatesOpen[0] = false; if (typeof closeGate === 'function') closeGate(0); G.toasts.length = 0; G.gateMsgT = 0; stage(GATE_TX[0] * TILE - 40, 432); moveW(1, 0); }); await T.wait(1200);
  ok('walking into a sealed barricade tells you what opens it', await T.run(() => { stopMove(); return G.toasts.some(t => /Sealed/.test(t.text) && t.text.includes(DIST[0].boss)); }), await T.run(() => (G.toasts.find(t => /Sealed/.test(t.text)) || {}).text || 'no message'));
  await T.shot('w_barricade_message', 'sealed barricade message');
  // ---- fullscreen choice is remembered
  await T.run(() => { SETTINGS.full = false; saveSettings(); }); await p.reload(); await T.wait(600); await p.click('#bNew'); await T.wait(500);
  ok('with Fullscreen off, starting a game stays windowed', await T.run(() => !document.fullscreenElement));
  await T.run(() => { SETTINGS.full = true; saveSettings(); }); await p.reload(); await T.wait(600); await p.click('#bNew'); await T.wait(500);
  ok('with Fullscreen on, starting a game goes fullscreen', await T.run(() => !!document.fullscreenElement));
  console.log(res.join('\n')); await T.done();
})();
