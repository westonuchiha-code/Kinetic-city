const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  await p.goto('file:///home/claude/kc/dist/gravitation.html'); await p.waitForTimeout(400);
  await p.evaluate(() => { KC.start(); KC.skip(); KC.skipTo(2); KC.skip(); KC.tp(7*384+48, 2*384+200); KC.P.invT = 999; });
  await p.waitForTimeout(500);
  const r = await p.evaluate(() => {
    const names = ['drawGround', 'drawGroundLights', 'drawBuilding', 'drawEntity', 'drawEffects', 'drawHUD', 'drawRain', 'updateSplashes', 'drawTree', 'drawGates', 'drawTKOverlay', 'drawPlayer', 'shadowOf', 'drawWarns'];
    const out = {};
    // time full render pieces by calling them directly N times
    const t0 = performance.now(); for (let i = 0; i < 30; i++) KC.render(1/60); const tr = (performance.now() - t0) / 30;
    const t1 = performance.now(); for (let i = 0; i < 30; i++) KC.drawHUD(1/60); const th = (performance.now() - t1) / 30;
    const t2 = performance.now(); for (let i = 0; i < 30; i++) KC.step(1); const ts = (performance.now() - t2) / 30;
    return { render: tr.toFixed(2), hud: th.toFixed(2), step: ts.toFixed(2), ents: KC.ents.length };
  });
  console.log(JSON.stringify(r));
  await b.close();
})();
