// Rebinding: controller and keyboard, swap on conflict, reserved keys, cancel, reset, persistence, and that play uses the new bindings.
const { chromium } = require('playwright');
const path = require('path'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window.__pad = { buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0], connected: true, id: 'Xbox pad', index: 0, mapping: 'standard' };
    navigator.getGamepads = () => [window.__pad];
    window.tap = async (i) => { window.__pad.buttons[i] = { pressed: true, value: 1 }; await new Promise(r => setTimeout(r, 70)); window.__pad.buttons[i] = { pressed: false, value: 0 }; await new Promise(r => setTimeout(r, 110)); };
  });
  const R = (f, a) => p.evaluate(f, a), ok = (n, v) => console.log((v ? 'ok   ' : 'FAIL ') + n), tap = i => R(i => tap(i), i);
  const g = (dev, a) => R(([dev, a]) => Input.glyph(a, dev).text, [dev, a]);
  await p.goto('file://' + ROOT + '/dist/kinetic_city.html'); await p.waitForTimeout(400);
  await R(() => { localStorage.removeItem('kc_settings'); }); await p.reload(); await p.waitForTimeout(400);
  await R(() => { KC.start(); KC.skip(); KC.P.invT = 1e9; KC.tp(200, 816); });
  await tap(9); await tap(5); await p.waitForTimeout(150);                       // pause -> controls tab
  ok('controls tab focuses the telekinesis row', await R(() => document.querySelector('.focus').dataset.act === 'tk'));
  await tap(0); await p.waitForTimeout(100); await p.screenshot({ path: ROOT + '/screenshots/ui/15_rebind_waiting.png' });
  await tap(2);                                                                  // bind telekinesis to X: swaps with heal
  ok('pad: telekinesis is now X', await g('pad', 'tk') === 'X'); ok('pad: heal took RT (swap)', await g('pad', 'heal') === 'RT');
  await tap(0); await tap(12); ok('pad: d-pad refused as a binding', await g('pad', 'tk') === 'X' && /reserved/.test(await R(() => document.querySelector('.bindmsg').textContent)));
  await tap(0); await tap(9); ok('pad: Start cancels and the menu stays open', await g('pad', 'tk') === 'X' && await R(() => KC.G.mode === 'pause'));
  // keyboard column
  await R(() => document.querySelector('.bind[data-dev="kbm"][data-act="dash"]').click()); await p.keyboard.press('KeyG');
  ok('keyboard: dash is now G', await g('kbm', 'dash') === 'G');
  await R(() => document.querySelector('.bind[data-dev="kbm"][data-act="well"]').click()); await p.keyboard.press('KeyW');
  ok('keyboard: W (movement) refused', await g('kbm', 'well') === 'E');
  await R(() => document.querySelector('.bind[data-dev="kbm"][data-act="abs"]').click()); await p.mouse.move(800, 450); await p.mouse.down({ button: 'middle' }); await p.mouse.up({ button: 'middle' });
  ok('keyboard: absorb on middle mouse', await g('kbm', 'abs') === 'MMB');
  await p.waitForTimeout(500); await p.screenshot({ path: ROOT + '/screenshots/ui/16_rebound.png' });
  // persistence + play uses the new bindings
  await p.reload(); await p.waitForTimeout(400);
  ok('bindings survive a reload', await g('pad', 'tk') === 'X' && await g('kbm', 'dash') === 'G');
  await R(() => { KC.start(); KC.skip(); KC.P.invT = 1e9; KC.tp(200, 816); }); await p.waitForTimeout(200);
  await p.keyboard.press('KeyG'); await p.waitForTimeout(60);
  ok('G dashes in play', await R(() => KC.P.dashCd > 0));
  await R(() => { window.__c = KC.spawn('crate', KC.P.x + 50, KC.P.y); }); await p.waitForTimeout(400);
  await R(() => { __pad.axes[2] = 1; __pad.buttons[2] = { pressed: true, value: 1 }; }); await p.waitForTimeout(500);
  ok('holding X lifts with telekinesis', await R(() => !!KC.P.holding));
  await R(() => { __pad.buttons[2] = { pressed: false, value: 0 }; __pad.axes[2] = 0; }); await p.waitForTimeout(300);
  await p.screenshot({ path: ROOT + '/screenshots/ui/17_rebound_hud.png' });
  // reset
  await tap(9); await tap(5); await R(() => document.querySelectorAll('.rst').forEach(b => b.click()));
  ok('reset restores defaults', await g('pad', 'tk') === 'RT' && await g('kbm', 'dash') === 'SPACE' && await g('kbm', 'abs') === 'Q');
  console.log(errs.join('|') || 'no errors'); await b.close();
})();
