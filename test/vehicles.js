// Vehicle and prop sheets: every vehicle type at six headings (plus a badly damaged row), and the props.
// Writes screenshots/vehicles_sheet.png, vehicles_sheet2.png and props_sheet.png.
const { chromium } = require('playwright');
const path = require('path'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + e.stack));
  await p.goto('file://' + ROOT + '/dist/gravitation.html'); await p.waitForTimeout(400);
  await p.evaluate(() => { KC.start(); KC.skip(); });
  const sheet = (rows, Z, angs, file) => p.evaluate(([rows, Z, angs]) => {
    const AW = Math.floor(1600 / Z), AH = Math.floor(900 / Z), c = document.createElement('canvas'); c.width = AW; c.height = AH; const old = ctx; ctx = c.getContext('2d');
    ctx.fillStyle = '#2a2f3d'; ctx.fillRect(0, 0, AW, AH); ISO.ox = 0; ISO.oy = 0; G.heat = 0;
    const COL = { sedan: '#b8323a', compact: '#2f9a62', van: '#d8d8de', bus: '#d07a2a' }, cw = AW / angs.length, rh = AH / rows.length;
    rows.forEach(([k, hp], r) => angs.forEach((deg, i) => {
      const sx = cw * (i + .5), sy = rh * (r + .64), X = (sx / ISO_K + 2 * sy / ISO_K) / 2, Y = (2 * sy / ISO_K - sx / ISO_K) / 2, car = !!VEHICLES[k];
      drawIsoProp(car ? { kind: 'car', vt: k, vs: VEHICLES[k], x: X, y: Y, z: 0, ang: deg * Math.PI / 180, col: COL[k] || VEHICLES[k].col, hp: 10 * (hp || 1), maxhp: 10, flash: 0, def: {}, id: i, driving: i % 2 === 0 }
                      : { kind: k, x: X, y: Y, z: 0, ang: deg * Math.PI / 180, col: '#fff', hp: 10, maxhp: 10, flash: 0, def: { explosive: k === 'barrel' }, id: i });
    }));
    ctx = old; parts.length = 0;
    let big = document.getElementById('sheet'); if (!big) { big = document.createElement('canvas'); big.id = 'sheet'; document.body.innerHTML = ''; document.body.appendChild(big); big.style.cssText = 'position:fixed;left:0;top:0'; }
    big.width = 1600; big.height = 900; const g = big.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, AW * Z, AH * Z);
  }, [rows, Z, angs]).then(() => p.screenshot({ path: ROOT + '/screenshots/' + file }));
  const A = [0, 60, 120, 180, 240, 300];
  await sheet([['sedan'], ['compact'], ['taxi'], ['cruiser']], 6, A, 'vehicles_sheet.png');
  await sheet([['van'], ['bus'], ['sedan', .2]], 5, A, 'vehicles_sheet2.png');
  await sheet([['crate'], ['barrel'], ['dumpster']], 8, [0, 30, 60, 90, 120, 150], 'props_sheet.png');
  const ms = await p.evaluate(() => { for (let i = 0; i < 14; i++) KC.spawn('car', KC.P.x - 150 + (i % 7) * 50, KC.P.y - 60 + Math.floor(i / 7) * 120, { ang: i * .7, vt: ['sedan', 'taxi', 'van', 'bus', 'cruiser', 'compact'][i % 6] }); KC.step(2); const t0 = performance.now(); for (let i = 0; i < 40; i++) render(1 / 60); return (performance.now() - t0) / 40; });
  console.log('render with 14 vehicles on screen: ' + ms.toFixed(2) + ' ms'); console.log(errs.slice(0, 5).join('\n') || 'no errors'); await b.close();
})();
