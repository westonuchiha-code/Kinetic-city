const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [name, vp] of [['phone', { width: 844, height: 390 }], ['laptop', { width: 1366, height: 768 }]]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: name === 'phone', isMobile: name === 'phone', deviceScaleFactor: name === 'phone' ? 3 : 1 });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file:///home/claude/kc/dist/gravitation.html'); await p.waitForTimeout(700);
    await p.screenshot({ path: `shots/60_${name}_title.png` });
    await p.evaluate(() => { KC.start(); KC.skip(); const h = KC.ents.find(e => e.kind === 'hideout'); KC.tp(h.x - 100, h.y + 200); KC.P.invT = 99; });
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `shots/61_${name}_play.png` });
    console.log(name, errs.join('|'));
    await ctx.close();
  }
  await b.close();
})();
