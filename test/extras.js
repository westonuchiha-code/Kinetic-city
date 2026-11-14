const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/kc/dist/kinetic_city.html'); await p.waitForTimeout(500);
  await p.evaluate(() => { KC.start(); KC.skip(); KC.G.seen.move = 1; KC.G.hint = null; KC.P.invT = 99; });
  const shots = [['hideout', () => { const h = KC.ents.find(e => e.kind === 'hideout'); KC.tp(h.x + 40, h.y + 140); }],
    ['park', () => { KC.tp(2 * 384 + 48, 48 + 150); }], ['barricade', () => { KC.tp(1200 - 120, 384 + 48); }]];
  for (const [n, f] of shots) { await p.evaluate(f); await p.evaluate(() => { KC.G.hint = null; KC.P.invT = 99; }); await p.waitForTimeout(900); await p.screenshot({ path: `/home/claude/extras_${n}.png` }); }
  console.log(errs.join('|') || 'ok'); await b.close();
})();
