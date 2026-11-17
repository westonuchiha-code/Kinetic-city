const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + e.stack));
  await p.goto('file:///home/claude/kc/dist/gravitation.html'); await p.waitForTimeout(500);
  await p.evaluate(() => { KC.start(); KC.skip(); });
  const info = await p.evaluate(() => ({ world: [WORLD_W, WORLD_H], blocks: blocks.length, buildings: buildings.length, hideouts: KC.ents.filter(e => e.kind === 'hideout').map(h => [h.did, Math.round(h.x), Math.round(h.y)]), boss: spots.boss.map(s => [Math.round(s.x), Math.round(s.y)]), gates: GATE_TX, start: [Math.round(KC.P.x), Math.round(KC.P.y)] }));
  console.log(JSON.stringify(info));
  // every hideout and boss arena reachable on foot from the start (gates treated as open)
  const reach = await p.evaluate(() => { const saved = GATE_TX.map(g => map[g]); for (const g of GATE_TX) for (let ty = 0; ty < MAP_H; ty++) if (map[ty * MAP_W + g] === T.GATE) map[ty * MAP_W + g] = 99;
    const seen = new Uint8Array(MAP_W * MAP_H), q = [Math.floor(KC.P.y / TILE) * MAP_W + Math.floor(KC.P.x / TILE)]; seen[q[0]] = 1;
    while (q.length) { const c = q.pop(), x = c % MAP_W, y = (c / MAP_W) | 0; for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue; const n = ny * MAP_W + nx; if (seen[n] || (isSolidT(map[n]) )) continue; seen[n] = 1; q.push(n); } }
    for (const g of GATE_TX) for (let ty = 0; ty < MAP_H; ty++) if (map[ty * MAP_W + g] === 99) map[ty * MAP_W + g] = T.GATE;
    const ok = s => seen[Math.floor((s.y + 120) / TILE) * MAP_W + Math.floor(s.x / TILE)];
    return { hide: spots.hide.map(ok), boss: spots.boss.map(ok) }; });
  console.log('reachable', JSON.stringify(reach));
  await p.evaluate(() => { G.mode = 'map'; }); await p.waitForTimeout(300); await p.screenshot({ path: '/home/claude/bigcity_map.png' });
  await p.evaluate(() => { G.mode = 'play'; KC.tp(5*384+48, 4*384+150); KC.P.invT = 999; }); await p.waitForTimeout(1500);
  await p.screenshot({ path: '/home/claude/bigcity_street.png' });
  const perf = await p.evaluate(() => { const t0 = performance.now(); for (let i = 0; i < 30; i++) render(1/60); const r = (performance.now() - t0) / 30; const t1 = performance.now(); KC.step(120); return [r, (performance.now() - t1) / 120]; });
  console.log('render ms', perf[0].toFixed(2), 'tick ms', perf[1].toFixed(2));
  console.log(errs.slice(0, 5).join('\n') || 'no errors'); await b.close();
})();
