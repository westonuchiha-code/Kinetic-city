const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  await p.goto('file:///home/claude/kc/dist/gravitation.html'); await p.waitForTimeout(400);
  for (const [d, x, y] of [[0, 1*384+48, 2*384+150], [2, 7*384+48, 2*384+200]]) {
  const r = await p.evaluate(([d, x, y]) => {
    if (KC.G.mode === 'title') { KC.start(); KC.skip(); }
    if (d) { KC.skipTo(d); KC.skip(); }
    KC.tp(x, y); KC.P.invT = 999; KC.step(5);
    const names = ['drawGround', 'drawGroundLights', 'drawBuilding', 'drawEntity', 'drawEffects', 'drawRain', 'updateSplashes', 'drawTree', 'drawGates', 'drawTKOverlay', 'drawPlayer', 'shadowOf', 'drawWarns', 'drawPickup'];
    const acc = {};
    for (const n of names) { const f = window[n]; acc[n] = 0; window[n] = function (...a) { const t = performance.now(); const r = f.apply(this, a); acc[n] += performance.now() - t; return r; }; }
    const t0 = performance.now(); for (let i = 0; i < 20; i++) KC.render(1 / 60); const tot = (performance.now() - t0) / 20;
    const out = { total: tot.toFixed(1) }; for (const n of names) out[n] = (acc[n] / 20).toFixed(2);
    return out;
  }, [d, x, y]);
  console.log(JSON.stringify(r));
  }
  await b.close();
})();
