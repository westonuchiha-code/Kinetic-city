const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('file:///home/claude/kc/dist/kinetic_city.html'); await p.waitForTimeout(400);
  await p.evaluate(() => {
    KC.start(); KC.G.seen.move = 1; KC.G.hint = null; KC.tp(4 * 384 + 48, 3 * 384 + 48 + 24); KC.P.invT = 1e9;
    for (const e of KC.ents) if (e !== KC.P && Math.hypot(e.x - KC.P.x, e.y - KC.P.y) < 600 && !e.static) e.dead = true;
    KC.step(2); window.LINE = [];
    const kinds = [['grunt'], ['cop'], ['brute'], ['civ'], ['civ'], ['sup']];
    const angs = [Math.PI / 2, Math.PI / 4, 0, -Math.PI / 4, -Math.PI / 2, Math.PI, 3 * Math.PI / 4, -3 * Math.PI / 4];
    kinds.forEach(([k], r) => angs.forEach((a, i) => {
      const x = KC.P.x - 300 + i * 60 + 70, y = KC.P.y - 120 + r * 48;
      const e = k === 'civ' ? KC.spawn('civ', x, y, { col: r === 3 ? '#5fa86a' : '#d9c25a', hair: '#5a3a22', umb: null, speed: 0 }) : KC.spawnGang(k, x, y);
      e.ang = a; e.static = true; e.home = { x, y }; e.tgt = null; e.state = ''; LINE.push(e);
    }));
    KC.P.ang = Math.PI / 2;
  });
  for (let i = 0; i < 8; i++) { await p.evaluate(() => { for (const e of LINE) { e.vx = e.vy = 0; } KC.G.hint = null; KC.G.toasts.length = 0; }); await p.waitForTimeout(40); }
  await p.evaluate(() => { KC.G.mode = 'pause'; });   // freeze so nobody turns
  await p.evaluate(() => { for (const [e, a] of LINE.map((e, i) => [e, [Math.PI / 2, Math.PI / 4, 0, -Math.PI / 4, -Math.PI / 2, Math.PI, 3 * Math.PI / 4, -3 * Math.PI / 4][i % 8]])) e.ang = a; KC.render(1 / 60); });
  await p.screenshot({ path: '/home/claude/chars_lineup.png', clip: { x: 360, y: 150, width: 900, height: 560 } });
  await p.evaluate(() => { KC.G.mode = 'play'; for (const e of LINE) e.dead = true; KC.step(2); });
  console.log(errs.join('|') || 'no errors'); await b.close();
})();
