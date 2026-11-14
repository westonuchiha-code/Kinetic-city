const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/kc/dist/kinetic_city.html'); await p.waitForTimeout(500);
  await p.evaluate(() => {
    KC.start(); KC.skip(); KC.G.seen.move = 1; KC.G.hint = null; KC.tp(1 * 384 + 48, 2 * 384 + 48); KC.P.invT = 99;
    for (const e of KC.ents) if (e.prop && Math.hypot(e.x - KC.P.x, e.y - KC.P.y) < 500) e.dead = true;
    const kinds = ['dumpster','dumpster','dumpster','crate','barrel'];
    kinds.forEach((k, i) => KC.spawn(k, KC.P.x - 260 + i * 130, KC.P.y + 60, { ang: (i % 4) * Math.PI / 6 }));
  });
  await p.waitForTimeout(700); await p.evaluate(() => { KC.G.hint = null; }); await p.waitForTimeout(100);
  await p.screenshot({ path: '/home/claude/props_dumpsters.png' });
  await p.screenshot({ path: '/home/claude/props_row.png', clip: { x: 450, y: 380, width: 900, height: 320 } });
  console.log(errs.join('|') || 'ok'); await b.close();
})();
