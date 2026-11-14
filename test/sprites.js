const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + e.stack));
  await p.goto('file:///home/claude/kc/dist/kinetic_city.html'); await p.waitForTimeout(500);
  await p.evaluate(() => { KC.start(); KC.skip(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    const kinds = [['player'], ['civ', 0], ['civ', 1], ['civ', 3], ['grunt', 0], ['grunt', 1], ['grunt', 2], ['cop'], ['brute', 1], ['sup'], ['boss', 0]];
    const c = document.createElement('canvas'), SC = 3; c.width = 1600; c.height = 900; const x = c.getContext('2d');
    x.fillStyle = '#1a1c28'; x.fillRect(0, 0, 1600, 900); x.imageSmoothingEnabled = false;
    const angs = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI, -3 * Math.PI / 4, -Math.PI / 2, -Math.PI / 4];   // world angles
    kinds.forEach(([k, v], row) => {
      const e = k === 'player' ? KC.P : { kind: k, id: v !== undefined ? v * 7 + 3 : 5, did: v || 0, col: ['#c84a4a', '#4a8ac8', '#d8c050', '#9a5ac8'][v || 0], hair: ['#1a1410', '#c8a060', '#7a4a2a'][(v || 0) % 3], umb: null, state: '', flash: 0, hp: 1, maxhp: 1, team: 'x' };
      angs.forEach((a, i) => { e.ang = a; const o = OCT[screenOctant(a)];
        for (let f = 0; f < 2; f++) { const L = charLook(e), s = charSprite(o[0], f, L.o, L.pal);
          const X = 14 + (i * 2 + f) * 98, Y = 6 + row * 81;
          x.save(); if (o[1]) { x.translate(X + s.width * SC, Y); x.scale(-1, 1); x.drawImage(s, 0, 0, s.width * SC, s.height * SC); } else x.drawImage(s, X, Y, s.width * SC, s.height * SC); x.restore(); } });
    });
    document.body.innerHTML = ''; document.body.appendChild(c); c.style.cssText = 'position:fixed;left:0;top:0';
  });
  await p.screenshot({ path: '/home/claude/sprites_sheet.png' });
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
