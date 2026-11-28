// Soak: several minutes of simulated play with the powers fired at random in busy places (fast-forwarded), checking the
// world every simulated second for anything that should never happen. Prints a summary; nothing is drawn.
//   node test/soak.js [simulated minutes, default 6] [hero|villain]   (hero/villain: every skill of that path bought first)
const { open } = require('./tour_lib');
(async () => {
  const T = await open(); const minutes = +process.argv[2] || 6, path = process.argv[3] || '';
  await T.run(() => { KC.start(); KC.skip(); G.seen = new Proxy({}, { get: () => 1, set: () => true }); gatesOpen[0] = gatesOpen[1] = true; }); await T.wait(300);
  if (path) console.log('skills bought: ' + await T.run((path) => { KC.setKarma(path === 'villain' ? -70 : 70); G.points = 99; let n = 0; for (const u of UPS) while (buyUpgrade(u.id)) n++; return n + ' ranks, ' + Object.keys(ups).filter(k => ups[k]).join(' '); }, path));
  const r = await T.run((minutes) => {
    const seed = mulberry(12345), rnd2 = () => seed(), issues = {}, note = s => { issues[s] = (issues[s] || 0) + 1; };
    const stuckFor = new Map(); let maxEnts = 0, maxParts = 0, maxBullets = 0, deaths = 0, slowest = 0, stuckLog = [];
    const spotsToVisit = []; for (const e of ents) if (e.kind === 'hideout') spotsToVisit.push([e.x + 120, e.rect.y + e.rect.h + 120]); for (const s of spots.boss) spotsToVisit.push([s.x - 80, s.y + 60]); spotsToVisit.push([432, 432], [1968, 816], [3504, 816], [1392, 420], [624, 1560], [1008, 1950]);
    for (let sec = 0; sec < minutes * 60; sec++) {
      if (sec % 20 === 0) { const s = spotsToVisit[(sec / 20) % spotsToVisit.length | 0]; KC.tp(s[0], s[1]); P.hp = S.maxHp; if (sec % 120 === 60) { const d = districtAt(P.x); if (!DS[d].bossAlive && !DS[d].bossDone) { DS[d].hideoutsLeft = 0; KC.spawnBoss(d); } } }
      for (let f = 0; f < 60; f++) {
        if (G.mode === 'play') {
          P.energy = Math.max(P.energy, 60);
          const roll = rnd2();
          if (roll < .02) { const a = rnd2() * 6.28; aim.ang = a; aim.dx = Math.cos(a); aim.dy = Math.sin(a); }
          if (roll > .985 && !P.holding && tkTarget) grab(tkTarget);
          else if (roll > .97 && P.holding) throwHeld();
          else if (roll > .965) repulse && repulse();
          else if (roll > .96 && typeof castWell === 'function') castWell();
          P.vx += (rnd2() - .5) * 60; P.vy += (rnd2() - .5) * 60;
        } else if (G.mode === 'dead' && f === 0) deaths++;
        const t0 = performance.now(); KC.step(1); slowest = Math.max(slowest, performance.now() - t0);
      }
      maxEnts = Math.max(maxEnts, ents.length); maxParts = Math.max(maxParts, parts.length); maxBullets = Math.max(maxBullets, bullets.length);
      if (!isFinite(P.x) || !isFinite(P.y) || !isFinite(P.hp)) note('player has a non-number in position or health');
      if (!walkable(P.x, P.y, 2) && G.mode === 'play') note('player inside a wall');
      for (const e of ents) {
        if (e.dead) continue;
        if (!isFinite(e.x) || !isFinite(e.y) || !isFinite(e.vx) || !isFinite(e.vy)) { note(e.kind + ' with a non-number position'); continue; }
        if (e.x < -30 || e.y < -30 || e.x > WORLD_W + 30 || e.y > WORLD_H + 30) note(e.kind + ' outside the world');
        if (e.kind === 'hideout' || e.kind === 'tower' || e.kind === 'fixer' || e.held || e.bossHeld || (e.z || 0) > 3) { stuckFor.delete(e); continue; }   // repair drones fly over the roofs on purpose
        if (!walkable(e.x, e.y, 1)) { const n = (stuckFor.get(e) || 0) + 1; stuckFor.set(e, n); if (n === 4) { note(e.kind + ' stuck inside a wall for 4 s'); if (stuckLog.length < 8) stuckLog.push(e.kind + (e.driving ? ' (driving)' : '') + (e.state ? ' ' + e.state : '') + ' at ' + Math.round(e.x) + ',' + Math.round(e.y) + ' tile ' + tileOf(e.x, e.y) + ' block ' + ((blockAt(e.x, e.y) || {}).kind)); } } else stuckFor.delete(e);
      }
      if (P.holding && P.holding.dead) note('holding a dead object');
      if (G.toasts.length > 6) note('more than 6 toasts stacked');
    }
    return { issues, maxEnts, maxParts, maxBullets, deaths, slowest: +slowest.toFixed(1), stuckLog, level: G.level, kills: G.kills };
  }, minutes);
  console.log('simulated ' + minutes + ' min: level ' + r.level + ', ' + r.kills + ' takedowns, ' + r.deaths + ' deaths; most entities ' + r.maxEnts + ', particles ' + r.maxParts + ', bullets ' + r.maxBullets + '; slowest tick ' + r.slowest + ' ms');
  const keys = Object.keys(r.issues); console.log(keys.length ? keys.map(k => 'ISSUE  ' + k + '  ×' + r.issues[k]).join('\n') : 'no issues'); if (r.stuckLog.length) console.log('  ' + r.stuckLog.join('\n  '));
  await T.done();
})();
