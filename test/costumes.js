// Hero costume sheet: every stored costume in all five drawn facings with a step frame, plus good/evil karma colours.
// Writes screenshots/hero_costumes.png. Only 'raincoat' is used by the game; the others are kept for later.
const { chromium } = require('playwright');
const path = require('path'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + e.stack));
  await p.goto('file://' + ROOT + '/dist/kinetic_city.html'); await p.waitForTimeout(400);
  await p.evaluate(() => { KC.start(); KC.skip(); });
  await p.evaluate(() => {
    const SC = 6, c = document.createElement('canvas'); c.width = 1600; c.height = 900; const x = c.getContext('2d');
    x.fillStyle = '#2a2f3d'; x.fillRect(0, 0, 1600, 900); x.imageSmoothingEnabled = false; x.textBaseline = 'middle';
    const cols = [['S', 0], ['S', 1], ['SE', 0], ['E', 0], ['E', 1], ['E', 3], ['NE', 0], ['N', 0], ['N', 1]];
    x.fillStyle = '#8790aa'; x.font = 'bold 14px sans-serif';
    ['front', 'step', '3/4 front', 'side', 'step', 'step', '3/4 back', 'back', 'step', 'good karma', 'evil karma'].forEach((t, i) => x.fillText(t, 232 + i * 122 + (i > 8 ? 20 : 0), 14));
    Object.keys(HERO_COSTUMES).forEach((name, row) => {
      KC.costume(name); const Y0 = 28 + row * 145;
      x.fillStyle = name === 'raincoat' ? '#ffc24a' : '#3ce0ff'; x.font = 'bold 19px sans-serif'; x.fillText(name.toUpperCase() + (name === 'raincoat' ? '  (in use)' : ''), 14, Y0 + 80);
      const one = (d, f, karma, X) => { KC.G.karma = karma; const L = charLook(KC.P), s = charSprite(d, f, L.o, L.pal); x.drawImage(s, X, Y0 + (24 - s.height) * SC, s.width * SC, s.height * SC); };
      cols.forEach(([d, f], i) => one(d, f, 0, 220 + i * 122));
      one('S', 0, 100, 220 + 9 * 122 + 20); one('SE', 0, -100, 220 + 10 * 122 + 20);
    });
    KC.costume('raincoat'); KC.G.karma = 0;
    document.body.innerHTML = ''; document.body.appendChild(c); c.style.cssText = 'position:fixed;left:0;top:0';
  });
  await p.screenshot({ path: ROOT + '/screenshots/hero_costumes.png' });
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
