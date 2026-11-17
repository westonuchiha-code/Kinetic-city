// Hero costume sheet: every stored costume in all five drawn facings with a step frame, plus good/evil karma colours.
// Writes screenshots/hero_costumes.png, then checks unlocking and picking a costume from the pause menu (mouse and controller).
const { chromium } = require('playwright');
const path = require('path'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + e.stack));
  await p.addInitScript(() => {
    const mkb = () => ({ pressed: false, value: 0 });
    window.__pad = { buttons: Array.from({ length: 17 }, mkb), axes: [0, 0, 0, 0], connected: true, id: 'Xbox Wireless Controller (STANDARD GAMEPAD)', index: 0, mapping: 'standard' };
    navigator.getGamepads = () => [window.__pad];
    window.tap = async (i) => { window.__pad.buttons[i] = { pressed: true, value: 1 }; await new Promise(r => setTimeout(r, 70)); window.__pad.buttons[i] = { pressed: false, value: 0 }; await new Promise(r => setTimeout(r, 90)); };
  });
  await p.goto('file://' + ROOT + '/dist/gravitation.html'); await p.waitForTimeout(400);
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
  // unlocking and choosing
  const ok = (n, v) => console.log((v ? 'ok   ' : 'FAIL ') + n);
  await p.evaluate(() => { localStorage.removeItem('grav_costumes'); localStorage.removeItem('grav_settings'); }); await p.reload(); await p.waitForTimeout(400);
  await p.evaluate(() => { KC.start(); KC.skip(); KC.P.invT = 1e9; });
  ok('only the rain jacket is open at the start', await p.evaluate(() => Object.keys(COSTUMES).filter(costumeUnlocked).join() === 'raincoat'));
  ok('a locked costume cannot be worn', await p.evaluate(() => setCostume('scarf') === false && heroCostume === 'raincoat'));
  await p.evaluate(() => { KC.G.shards = 4; KC.G.level = 5; KC.step(70); });
  ok('4 shards and level 5 unlock headphones and varsity', await p.evaluate(() => costumeUnlocked('headphones') && costumeUnlocked('varsity') && !costumeUnlocked('scarf')));
  await p.waitForTimeout(300); await p.screenshot({ path: ROOT + '/screenshots/costume_unlocked.png' });
  // pick one from the Costumes tab with the mouse
  await p.keyboard.press('Escape'); await p.waitForTimeout(200); await p.evaluate(() => document.querySelector('.tab[data-tab="looks"]').click()); await p.waitForTimeout(200);
  await p.screenshot({ path: ROOT + '/screenshots/costume_tab.png' });
  await p.evaluate(() => document.querySelector('.look[data-id="varsity"]').click()); await p.waitForTimeout(150);
  ok('choosing from the tab changes the costume', await p.evaluate(() => heroCostume === 'varsity' && document.querySelector('.look.on').dataset.id === 'varsity'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.screenshot({ path: ROOT + '/screenshots/costume_worn.png' });
  await p.reload(); await p.waitForTimeout(400); await p.evaluate(() => { KC.start(); KC.skip(); });
  ok('unlocks and the choice survive a new game', await p.evaluate(() => heroCostume === 'varsity' && costumeUnlocked('headphones')));
  // controller: pause, RB to the Costumes tab, d-pad along the row, A to wear
  await p.evaluate(() => tap(9)); await p.evaluate(() => tap(5)); await p.waitForTimeout(150);
  ok('RB from Skills lands on Costumes with the worn one focused', await p.evaluate(() => document.querySelector('.tab.sel').dataset.tab === 'looks' && document.querySelector('.focus').dataset.id === 'varsity'));
  await p.evaluate(() => tap(14)); await p.evaluate(() => tap(14));
  ok('d-pad left moves along the row', await p.evaluate(() => document.querySelector('.focus').dataset.id === 'headphones'));
  await p.evaluate(() => tap(0)); await p.waitForTimeout(100);
  ok('A wears the focused costume and keeps focus on it', await p.evaluate(() => heroCostume === 'headphones' && document.querySelector('.focus').dataset.id === 'headphones'));
  await p.evaluate(() => tap(14)); await p.evaluate(() => tap(0)); await p.waitForTimeout(100);
  ok('A on a locked costume does nothing', await p.evaluate(() => document.querySelector('.focus').dataset.id === 'scarf' && heroCostume === 'headphones'));
  await p.evaluate(() => { setCostume('raincoat'); });
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
