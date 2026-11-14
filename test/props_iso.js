const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + e.stack));
  await p.goto('file:///home/claude/kc/dist/kinetic_city.html'); await p.waitForTimeout(500);
  await p.evaluate(() => { KC.start(); KC.skip(); });
  // sheet: each prop at 8 angles, drawn into a 320x180 canvas and blown up 5x
  await p.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 320; c.height = 180; const old = ctx; ctx = c.getContext('2d');
    ctx.fillStyle = '#1e2130'; ctx.fillRect(0, 0, 320, 180); ISO.ox = 0; ISO.oy = 0;
    const rows = [['car', '#c84a4a'], ['car', '#e8d040'], ['dumpster'], ['crate'], ['barrel']];
    rows.forEach(([k, col], r) => { for (let i = 0; i < 8; i++) {
      const sx = 22 + i * 38, sy = 30 + r * 34, wx = (sx + 2 * sy) / 2 / ISO_K * .5 * 2 / 2, wy = 0;
      // invert iso for a world point that lands at (sx, sy)
      const X = (sx / ISO_K + 2 * sy / ISO_K) / 2, Y = (2 * sy / ISO_K - sx / ISO_K) / 2;
      const e = { kind: k, x: X, y: Y, z: 0, ang: i * Math.PI / 4, col: col || '#fff', hp: 10, maxhp: 10, flash: 0, def: { explosive: k === 'barrel' }, id: i, driving: i % 2 === 0 };
      drawIsoProp(e);
    } });
    ctx = old;
    const big = document.createElement('canvas'); big.width = 1600; big.height = 900; const g = big.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, 1600, 900);
    document.body.innerHTML = ''; document.body.appendChild(big); big.style.cssText = 'position:fixed;left:0;top:0';
  });
  await p.screenshot({ path: '/home/claude/props_sheet.png' });
  console.log(errs.slice(0, 5).join('\n') || 'no errors'); await b.close();
})();
