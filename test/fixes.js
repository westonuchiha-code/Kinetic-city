// Checks for bugs fixed after the code review: pad disconnect (and the pause that goes with it), pad switching, civilian blame, ally kill, thrown parked car, boss-kill save window, tribute level-up.
const { chromium } = require('playwright');
const path = require('path'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    const mk = i => ({ buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0], connected: true, id: 'pad' + i, index: i, mapping: 'standard' });
    window.__pads = [mk(0), mk(1)]; navigator.getGamepads = () => window.__pads;
  });
  await p.goto('file://' + ROOT + '/dist/gravitation.html'); await p.waitForTimeout(400);
  const R = f => p.evaluate(f); const ok = (n, v) => console.log((v ? 'ok   ' : 'FAIL ') + n);
  await R(() => { KC.start(); KC.skip(); KC.tp(200, 816); KC.P.invT = 1e9; });
  // pad switching: silent pad 0, real pad 1 pushes the stick and presses A
  await R(() => { __pads[1].buttons[0] = { pressed: true, value: 1 }; __pads[1].axes[0] = 1; }); await p.waitForTimeout(200);
  ok('follows the pad that is being used', await R(() => KC.Input.move().x > .5));
  // disconnect while holding the stick
  await R(() => { __pads[1].connected = false; __pads[1] = null; dispatchEvent(new Event('gamepaddisconnected')); }); await p.waitForTimeout(200);
  ok('stick released when the pad disconnects', await R(() => Math.abs(KC.Input.move().x) < .01));
  ok('the game pauses when the controller in use disconnects', await R(() => KC.G.mode === 'pause'));
  await R(() => UI.closePause()); await p.waitForTimeout(100);
  await R(() => dispatchEvent(new Event('blur'))); await p.waitForTimeout(100);
  ok('the game pauses when the window loses focus', await R(() => KC.G.mode === 'pause'));
  await R(() => UI.closePause()); await p.waitForTimeout(100);
  // civilian brushed by the player, later dies to something else: not the player's kill
  ok('brushed civilian killed by others is not blamed on you', await R(() => { const c = spawnCiv(KC.P.x + 60, KC.P.y); c.lastHitBy = 'player'; const k = KC.G.karma, n = KC.G.civKills; KC.kill(c, { by: 'time' }); return KC.G.karma === k && KC.G.civKills === n; }));
  ok('civilian you kill still counts', await R(() => { const c = spawnCiv(KC.P.x + 60, KC.P.y); const n = KC.G.civKills; KC.hurt(c, 999, { by: 'player' }); return KC.G.civKills === n + 1; }));
  // ally cop
  ok('killing an allied cop costs the ally penalty', await R(() => { const c = KC.spawn('cop', KC.P.x + 60, KC.P.y, { ally: true }); const k = KC.G.karma; KC.hurt(c, 999, { by: 'player' }); return Math.abs((KC.G.karma - k) - KARMA.allyKill) < 1e-6; }));
  // grabbed curb car
  ok('a grabbed parked car stops being a curb car', await R(() => { const c = KC.spawn('car', KC.P.x + 60, KC.P.y, { curb: true, claimed: true }); grab(c); const r = !c.curb && !c.claimed; dropHeld(); c.dead = true; return r; }));
  // tribute level-up
  ok('tribute XP levels you up', await R(() => { KC.DS[2].status = 'dominated'; KC.G.xp = xpNeed() - 1; const l = KC.G.level; KC.G.tribT = 0; KC.step(2); KC.DS[2].status = 'enemy'; return KC.G.level === l + 1; }));
  // boss-kill window
  ok('saving right after a boss falls keeps the win', await R(() => { KC.spawnBoss(0); KC.skip(); KC.hurt(KC.G.boss, 99999, { by: 'player' }); const o = objective().text; saveGame(); const s = loadSave(); return s.ds[0].bossDone && s.gates[0] && !/Wait for/.test(o); }));
  console.log(errs.join('|') || 'no errors'); await b.close();
})();
