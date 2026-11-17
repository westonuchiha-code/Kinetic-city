const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/kc/dist/gravitation.html'); await p.waitForTimeout(500);
  await p.evaluate(() => {
    KC.start(); KC.skip(); KC.G.seen.move = 1; KC.G.hint = null; KC.tp(1 * 384 + 48, 2 * 384 + 48); KC.P.invT = 99;
    for (const e of KC.ents) if (e.prop && Math.hypot(e.x - KC.P.x, e.y - KC.P.y) < 500) e.dead = true;
    const kinds = ['crate', 'crate', 'crate', 'crate', 'dumpster', 'dumpster', 'dumpster', 'barrel', 'barrel', 'barrel'];
    kinds.forEach((k, i) => KC.spawn(k, KC.P.x - 300 + (i % 5) * 140, KC.P.y - 110 + Math.floor(i / 5) * 190, { ang: (i % 4) * Math.PI / 6 }));
  });
  await p.waitForTimeout(700); await p.evaluate(() => { KC.G.hint = null; }); await p.waitForTimeout(100);
  await p.screenshot({ path: '/home/claude/props_angles.png' });
  await p.screenshot({ path: '/home/claude/props_closeup.png', clip: { x: 300, y: 180, width: 1000, height: 560 } });
  console.log(errs.join('|') || 'ok'); await b.close();
})();
