// Machines and hazards: a line-up sheet of every new machine, then each one in action. Writes screenshots/machines_*.png.
const { chromium } = require('playwright'); const path = require('path'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  const ok = (n, v) => console.log((v ? 'ok   ' : 'FAIL ') + n);
  await p.goto('file://' + ROOT + '/dist/gravitation.html'); await p.waitForTimeout(400);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(500);
  await p.evaluate(() => { KC.start(); KC.skip(); G.seen = new Proxy({}, { get: () => 1, set: () => true }); KC.time('day'); KC.weather('dry'); SETTINGS.hud = .7; });
  const counts = await p.evaluate(() => { const c = {}; for (const e of ents) if (!e.dead && (MACH[e.kind] || e.kind === 'cell')) c[e.kind] = (c[e.kind] || 0) + 1; c.powerLines = hazards.length; return c; });
  console.log('in the world:', JSON.stringify(counts));
  ok('every machine is placed in the world', ['sweeper', 'zapper', 'crawler', 'sentry', 'loader', 'cell', 'hive', 'scanner', 'mirror'].every(k => counts[k] > 0) && counts.powerLines > 0);
  const stage = async (setup, ms, name) => { await p.evaluate(setup); await p.waitForTimeout(ms); await p.evaluate(() => { G.hint = null; G.toasts.length = 0; }); await p.screenshot({ path: ROOT + '/screenshots/machines_' + name + '.png' }); };
  const clear = `const x = 1008, y = 1392; for (const e of ents) if (e !== P && !e.dead && e.kind !== 'hideout' && e.kind !== 'tower' && Math.hypot(e.x - x, e.y - y) < 600) e.dead = true; KC.tp(x, y); P.invT = 1e9; P.hp = S.maxHp; P.energy = S.maxEn;`;
  // line-up: everything standing still, facing the camera
  await stage(new Function(clear + `const L = ['sweeper', 'cell', 'crawler', 'sentry', 'zapper', 'mite', 'loader'];   // a row across the screen, the hero out of the way
    L.forEach((k, i) => { const dx = (i - 3) * 34 + 70, dy = -(i - 3) * 34 + 70; const m = mk(k, P.x + dx, P.y + dy, { col: '#e0a030', home: { x: P.x + 900, y: P.y }, terr: 10 }); m.ang = .6; m.sight = 0; m.cd = 99; m.speed = 0; });`), 600, 'lineup');
  await stage(new Function(clear + `const z = spawnGang('zapper', P.x + 150, P.y - 30, { home: { x: P.x, y: P.y }, terr: 400 }); z.cd = 0; window.__z = z;`), 1100, 'zapper_charge');
  ok('a spark drone fires lightning', await p.evaluate(() => new Promise(r => setTimeout(() => r(zaps.length > 0 || __z.cd > 0), 900))));
  await stage(new Function(clear + `for (let i = 0; i < 2; i++) spawnGang('crawler', P.x + 160 + i * 20, P.y + 20 * i, { home: { x: P.x, y: P.y }, terr: 400 });`), 1300, 'crawler_arm');
  await p.waitForTimeout(900); await p.screenshot({ path: ROOT + '/screenshots/machines_crawler_burst.png' });
  await stage(new Function(clear + `spawnGang('sentry', P.x + 120, P.y - 40, { home: { x: P.x, y: P.y }, terr: 400 });`), 1400, 'sentry');
  await stage(new Function(clear + `spawnGang('loader', P.x + 90, P.y + 10, { home: { x: P.x, y: P.y }, terr: 400 }); for (let i = 0; i < 4; i++) spawnGang('mite', P.x - 80 + i * 10, P.y - 60, { home: { x: P.x, y: P.y }, terr: 400 });`), 1500, 'loader_mites');
  await stage(new Function(clear + `for (let i = 0; i < 3; i++) mk('cell', P.x + 80 + i * 22, P.y + 10 * i); const g = spawnGang('grunt', P.x + 120, P.y + 40); g.cd = 99; for (const e of ents) if (e.kind === 'cell' && !e.dead && Math.hypot(e.x - P.x, e.y - P.y) < 200) { KC.hurt(e, 99, { by: 'player' }); break; }`), 150, 'battery_chain');
  await stage(new Function(clear + `spawnGang('hive', P.x + 110, P.y - 20, { home: { x: P.x + 110, y: P.y - 20 }, terr: 400 });`), 3500, 'hive');
  await stage(new Function(clear + `const s = spawnGang('scanner', P.x + 90, P.y - 40, { home: { x: P.x, y: P.y }, terr: 600 }); s.sweep = Math.atan2(40, -90); s.ang = s.sweep; s.sweepT = 9; for (let i = 0; i < 2; i++) spawnGang('grunt', P.x + 200, P.y + 100 + i * 20, { home: { x: P.x + 200, y: P.y + 100 }, terr: 50 }).cd = 9;`), 900, 'scanner');
  await stage(new Function(clear + `KC.time('day'); spawnGang('mirror', P.x + 120, P.y - 60, { home: { x: P.x, y: P.y }, terr: 400 }); spawnGang('mirror', P.x - 60, P.y + 120, { home: { x: P.x, y: P.y }, terr: 400 });`), 2200, 'mirror');
  const h = await p.evaluate(() => { const h = hazards[0]; KC.tp(h.x1 + 30, h.y1 + 30); P.invT = 1e9; return { x: h.x1, y: h.y1 }; });
  await p.waitForTimeout(1200); await p.evaluate(() => { const h = hazards[0]; h.arc = .9; h.t = 0; G.hint = null; G.toasts.length = 0; }); await p.waitForTimeout(250); await p.screenshot({ path: ROOT + '/screenshots/machines_power_line.png' });
  await stage(new Function(`KC.time('sunset'); const s = ents.find(e => e.kind === 'sweeper' && !e.dead); KC.tp(s.x + 40, s.y + 30); P.invT = 1e9;`), 1500, 'sweeper_street');
  // a few minutes of play near them: nothing breaks
  const soak = await p.evaluate(() => { let bad = 0; for (const b of blocks.filter(b => b.kind === 'yard' || b.kind === 'lot').slice(0, 4)) { KC.tp(b.x + b.w / 2, b.y + b.h + 30); P.invT = 1e9; for (let i = 0; i < 60 * 25; i++) { KC.step(1); for (const e of ents) if (!e.dead && (!isFinite(e.x) || !isFinite(e.y))) bad++; } } return bad; });
  ok('100 s of fighting machines: no broken positions', soak === 0);
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
