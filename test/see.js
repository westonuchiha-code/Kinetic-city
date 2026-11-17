// "Hero behind buildings" setting: stands the hero behind a tall building and shoots each mode (hidden, outline,
// window, see-through wall) at the same moment. Writes screenshots/see_<mode>.png and checks the setting itself.
const { chromium } = require('playwright');
const path = require('path'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + e.stack));
  const ok = (n, v) => console.log((v ? 'ok   ' : 'FAIL ') + n);
  await p.goto('file://' + ROOT + '/dist/kinetic_city.html'); await p.waitForTimeout(400);
  await p.evaluate(() => { localStorage.clear(); }); await p.reload(); await p.waitForTimeout(600);
  await p.evaluate(() => { KC.start(); KC.skip(); KC.time('night'); KC.P.invT = 0; G.hint = null; G.seen = new Proxy({}, { get: () => 1 }); });
  ok('the setting starts on Window', await p.evaluate(() => SETTINGS.see === 2));
  await p.evaluate(() => { localStorage.setItem('kc_settings', JSON.stringify({ music: .3, see: 0 })); }); await p.reload(); await p.waitForTimeout(500);
  ok('settings saved by an older build are moved to Window once', await p.evaluate(() => SETTINGS.see === 2 && SETTINGS.music === .3 && SETTINGS.sv === 2));
  await p.evaluate(() => { SETTINGS.see = 0; saveSettings(); }); await p.reload(); await p.waitForTimeout(500);
  ok('choosing Hidden afterwards sticks', await p.evaluate(() => SETTINGS.see === 0));
  await p.evaluate(() => { localStorage.clear(); }); await p.reload(); await p.waitForTimeout(500);
  await p.evaluate(() => { KC.start(); KC.skip(); KC.time('night'); KC.P.invT = 0; G.hint = null; G.seen = new Proxy({}, { get: () => 1 }); });
  const B = await p.evaluate(() => { const b = buildings.filter(b => !b.frame && Math.hypot(b.x + b.w / 2 - P.x, b.y + b.h / 2 - P.y) < 900).sort((a, b) => b.ht - a.ht)[0]; return { x: b.x, y: b.y, w: b.w, h: b.h }; });
  const x = B.x - 14, y = B.y + B.h * .5;
  await p.evaluate(([x, y]) => { KC.tp(x, y); P.vx = P.vy = 0; for (const e of ents) if (e !== P && !e.dead && e.kind !== 'hideout' && Math.hypot(e.x - x, e.y - y) < 500) e.dead = true; KC.step(40); G.toasts.length = 0; P.x = x; P.y = y; P.ang = .6; }, [x, y]);
  await p.waitForTimeout(1500);
  const sums = [];
  for (let m = 0; m < 4; m++) {
    const pos = await p.evaluate(([x, y, m]) => { KC.see(m); G.hint = null; P.x = x; P.y = y; P.vx = P.vy = 0; const s = isoToScreen(P.x, P.y, 12); return [s.x, s.y]; }, [x, y, m]);
    await p.waitForTimeout(350);
    const cx = Math.max(330, Math.min(1270, pos[0])), cy = Math.max(230, Math.min(670, pos[1]));
    await p.screenshot({ path: ROOT + '/screenshots/see_' + m + '.png', clip: { x: cx - 330, y: cy - 230, width: 660, height: 460 } });
    // how much hero-jacket yellow is on screen around him
    sums.push(await p.evaluate(([sx, sy]) => { const k = cv.width / W, d = mainCtx.getImageData(Math.round((sx - 40) * k), Math.round((sy - 70) * k), Math.round(80 * k), Math.round(100 * k)).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 150 && d[i + 1] > 120 && d[i + 2] < 90) n++; return n; }, pos));
  }
  console.log('jacket pixels seen per mode:', sums.join(' '));
  ok('hidden mode really hides him', sums[0] < sums[2] * .2);
  ok('window mode shows him', sums[2] > 200);
  ok('see-through wall shows part of him', sums[3] > sums[0] && sums[3] > 60);
  // the setting row
  await p.evaluate(() => KC.see(0));
  await p.keyboard.press('Escape'); await p.waitForTimeout(200); await p.evaluate(() => document.querySelector('.tab[data-tab="settings"]').click()); await p.waitForTimeout(150);
  await p.evaluate(() => document.querySelector('.set[data-k="see"]').click()); await p.waitForTimeout(100);
  ok('clicking the row steps to Outline', await p.evaluate(() => SETTINGS.see === 1 && /Outline/.test(document.querySelector('.set[data-k="see"]').textContent)));
  await p.evaluate(() => { for (let i = 0; i < 3; i++) document.querySelector('.set[data-k="see"]').click(); });
  ok('and wraps back to Hidden', await p.evaluate(() => SETTINGS.see === 0));
  await p.evaluate(() => document.querySelector('.set[data-k="see"]').click());
  await p.reload(); await p.waitForTimeout(500);
  ok('the choice is remembered', await p.evaluate(() => SETTINGS.see === 1));
  await p.evaluate(() => { localStorage.clear(); });
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
