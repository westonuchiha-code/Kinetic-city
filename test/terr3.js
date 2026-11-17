const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  await p.goto('file:///home/claude/kc/dist/gravitation.html'); await p.waitForTimeout(400);
  console.log(await p.evaluate(() => { KC.start(); KC.skip(); const H = KC.ents.find(e => e.kind === 'hideout' && e.did === 0); const g = KC.ents.filter(e => e.team === 'gang' && !e.static && Math.hypot(e.x - H.x, e.y - H.y) < 150);
    KC.tp(H.x + 150, H.y + 120); KC.P.invT = 999; const out = [];
    for (let i = 0; i < 6; i++) { KC.step(100); out.push(g.map(e => (e.dead ? 'X' : Math.round(Math.hypot(e.x - H.x, e.y - H.y))) + (e.tgt ? e.tgt.kind : '')).join(',') + ' mode=' + KC.G.mode); }
    return out.join('\n'); }));
  await b.close();
})();
