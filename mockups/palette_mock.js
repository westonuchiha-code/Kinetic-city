// Mock-up only: repaints the running game with "ordinary city" palettes (no source changes) and shoots the same
// three street views in each. Writes screenshots/mock_palette/<look>_<spot>.png.   node mockups/palette_mock.js
const { chromium } = require('playwright'); const path = require('path'); const ROOT = path.resolve(__dirname, '..'), OUT = ROOT + '/screenshots/mock_palette/';
const LOOKS = {
  now: null,
  dusk: {   // golden hour: warm brick, long light, lamps just coming on
    walls: [['#a8563e', '#b8664a', '#96483a', '#c07a52', '#8a5a4a', '#b89a78'], ['#9a4a38', '#8a4434', '#a86048', '#7a5446', '#a07a5a'], ['#b0a698', '#9aa4b0', '#c0b49e', '#8e98a8', '#a89888']],
    roofs: [['#5a5560', '#645e66', '#504c58'], ['#5a4e4a', '#665650', '#4e4442'], ['#62646e', '#6c6e78', '#585a64']],
    ground: ['#4a4252', '#4c4250', '#484456'], side: ['#9a7e74', '#927468', '#9c847c'], plaza: ['#806a70', '#7a6466', '#84707a'],
    signs: ['#c8452e', '#2e7a5a', '#e0b040', '#3a6aa8'], lamp: '#ffd9a0', win: ['#ffd890', '#ffe7b0', '#ffc878', '#fff0c8'], lit: .3, glow: .5, pools: .5, rain: false, tint: 'rgba(255,120,60,.2)', grass: 1.9
  },
  night: {  // an ordinary city night: sodium lamps, lit windows, no neon
    walls: [['#5e3a34', '#6a4238', '#553430', '#70503e', '#4e3e3a', '#6a5e52'], ['#583028', '#4e2c26', '#603c30', '#463630', '#5c4a3c'], ['#5a5a62', '#50586a', '#66605a', '#4a5262', '#5c5650']],
    roofs: [['#2e2e38', '#34343e', '#2a2a32'], ['#30292a', '#382e2c', '#2a2424'], ['#30323c', '#363842', '#2a2c36']],
    ground: ['#1d1e26', '#1e1c22', '#1c1e28'], side: ['#3c3c44', '#38343a', '#3e4048'], plaza: ['#32323a', '#302c32', '#34363e'],
    signs: ['#c8452e', '#2e7a5a', '#e0b040', '#3a6aa8'], lamp: '#ffb866', win: ['#ffd890', '#ffe7b0', '#ffc878', '#cfe4ff'], lit: .34, glow: .6, pools: 1, rain: true, tint: null, grass: 1.25
  },
  day: {    // overcast afternoon
    walls: [['#b0604a', '#c07256', '#a05244', '#c88a62', '#96685a', '#c4aa8a'], ['#a4543e', '#94503e', '#b06a52', '#866052', '#aa8866'], ['#bcb4a8', '#a8b2c0', '#ccc2ae', '#9ca8b8', '#b4a698']],
    roofs: [['#6c6a74', '#76727a', '#62606a'], ['#6a5e5a', '#766660', '#5e5450'], ['#74767e', '#7e8088', '#6a6c76']],
    ground: ['#5c5e68', '#5e5a60', '#5c5e6a'], side: ['#a8a6a2', '#9e9690', '#aeaeac'], plaza: ['#928e94', '#8a8486', '#96969c'],
    signs: ['#c8452e', '#2e7a5a', '#e0b040', '#3a6aa8'], lamp: '#fff2d8', win: ['#6a7a8a', '#7a8898', '#5e6c7c', '#8a96a4'], lit: .5, glow: 0, pools: 0, rain: false, tint: null, grass: 2.4
  }
};
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && errs.length < 3) errs.push(m.text().slice(0, 300)); });
  await p.goto('file://' + ROOT + '/dist/gravitation.html'); await p.waitForTimeout(500);
  await p.evaluate(() => { localStorage.clear(); KC.start(); KC.skip(); G.seen = new Proxy({}, { get: () => 1, set: () => true }); gatesOpen[0] = gatesOpen[1] = true; SETTINGS.hud = .7; window.__orig = { iglow, drawGroundLights, drawRain, glow }; });
  for (const [name, L] of Object.entries(LOOKS)) {
    if (L) await p.evaluate((L) => {
      const pick = (arr, h) => arr[h % arr.length];
      for (let d = 0; d < 3; d++) Object.assign(DIST[d], { ground: L.ground[d], side: L.side[d], plaza: L.plaza[d], neon: L.signs, lamp: L.lamp, roof: L.roofs[d] });
      NEON_GOOD.splice(0, 4, ...L.signs); NEON_EVIL.splice(0, 4, ...L.signs);
      for (const bl of buildings) { const h = hash2(bl.x, bl.y); if (!bl.frame) { bl.wall = pick(L.walls[bl.d], h); bl.roof = pick(L.roofs[bl.d], h >>> 5); bl.lit = L.lit * (.6 + (h % 80) / 100); bl.trim = null; for (const s of bl.win) for (const w of s) w.c = pick(L.win, (w.roll * 977) | 0); } bl._art = null; }
      for (const t of trees) { t._cv = null; }
      GND.clear(); drawMinimapBase();
      iglow = (x, y, r, col, a) => __orig.iglow(x, y, r, col, a * L.glow);
      glow = (x, y, r, col, a, sy, sx) => __orig.glow(x, y, r, col, (a === undefined ? 1 : a) * L.pools, sy, sx);
      drawRain = L.rain ? __orig.drawRain : () => {};
      window.__tint = L.tint;
    }, L);
    for (const [spot, x, y] of [['street', 432, 432], ['park', 1008, 250], ['slums', 1968, 816]]) {
      await p.evaluate(([x, y]) => { KC.tp(x, y); P.vx = P.vy = 0; P.invT = 1e9; G.heat = 0; for (const e of ents) if (e !== P && !e.dead && (e.team === 'gang' || e.kind === 'cop') && e.kind !== 'hideout' && e.kind !== 'tower' && Math.hypot(e.x - x, e.y - y) < 600) e.dead = true; }, [x, y]);
      await p.waitForTimeout(1600);
      await p.evaluate(() => { G.hint = null; G.toasts.length = 0; if (window.__tint) { mainCtx.save(); mainCtx.setTransform(1, 0, 0, 1, 0, 0); mainCtx.fillStyle = __tint; mainCtx.fillRect(0, 0, cv.width, cv.height); mainCtx.restore(); } });
      await p.screenshot({ path: OUT + name + '_' + spot + '.png' });
    }
  }
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
