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
    const rows = [['sedan', '#c84a4a'], ['compact', '#2f9a62'], ['taxi'], ['cruiser'], ['van', '#d8d8de'], ['bus', '#d07a2a']]; G.heat = 2;
    rows.forEach(([k, col], r) => { for (let i = 0; i < 8; i++) {
      const sx = 24 + i * 38, sy = 26 + r * 28 + (r === 5 ? 6 : 0), wx = (sx + 2 * sy) / 2 / ISO_K * .5 * 2 / 2, wy = 0;
      // invert iso for a world point that lands at (sx, sy)
      const X = (sx / ISO_K + 2 * sy / ISO_K) / 2, Y = (2 * sy / ISO_K - sx / ISO_K) / 2;
      const e = { kind: 'car', vt: k, vs: VEHICLES[k], x: X, y: Y, z: 0, ang: i * Math.PI / 4, col: col || VEHICLES[k].col, hp: 10, maxhp: 10, flash: 0, def: {}, id: i, driving: i % 2 === 0 };
      drawIsoProp(e);
    } });
    ctx = old;
    const big = document.createElement('canvas'); big.width = 1600; big.height = 900; const g = big.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, 1600, 900);
    document.body.innerHTML = ''; document.body.appendChild(big); big.style.cssText = 'position:fixed;left:0;top:0';
  });
  await p.screenshot({ path: '/home/claude/vehicles_sheet.png' });
  console.log(errs.slice(0, 5).join('\n') || 'no errors'); await b.close();
})();
