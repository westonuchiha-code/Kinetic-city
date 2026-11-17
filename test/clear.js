const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [n, vp, dsf] of [['phone', { width: 844, height: 390 }, 3], ['tv', { width: 1920, height: 1080 }, 1]]) {
    const p = await (await b.newContext({ viewport: vp, deviceScaleFactor: dsf })).newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto('file:///home/claude/kc/dist/gravitation.html'); await p.waitForTimeout(600);
    await p.evaluate(() => { KC.start(); KC.skip(); const h = KC.ents.find(e => e.kind === 'hideout'); KC.tp(h.x - 60, h.y + 170); KC.P.invT = 99; KC.G.hint = null; KC.G.seen.move = 1; KC.P.vx = 150; });
    await p.waitForTimeout(900); await p.screenshot({ path: `shots/70_${n}.png` });
  }
  console.log(errs.join('|') || 'ok'); await b.close();
})();
