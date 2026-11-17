// Character sheet: every character type in all 8 facings (stand + a step frame), plus close-ups of the main cast.
// Writes screenshots/sprites_sheet.png and screenshots/sprites_closeup.png.
const { chromium } = require('playwright');
const path = require('path'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + e.stack));
  await p.goto('file://' + ROOT + '/dist/gravitation.html'); await p.waitForTimeout(400);
  await p.evaluate(() => { KC.start(); KC.skip(); });
  const bad = await p.evaluate(() => { const bad = [], chk = (rows, n, w) => rows && rows.forEach((r, i) => { if (r.length !== w) bad.push(n + ' row ' + i + ': ' + r); });
    for (const [set, w] of [[CHAR_ART, 16], [BIG_ART, 22]]) for (const d in set) { const A = set[d]; chk(A.head, d + ' head', 16); A.torso.forEach((t, i) => chk(t, d + ' torso ' + i, w)); chk(A.cheer, d + ' cheer', w); A.legs.forEach((t, i) => chk(t, d + ' legs ' + i, w)); for (const k in A.pose || {}) chk(A.pose[k], d + ' pose ' + k, w); }
    for (const s in HAIR_ART) for (const d in HAIR_ART[s]) chk(HAIR_ART[s][d], s + ' ' + d, 16); return bad; });
  console.log(bad.length ? 'rows with the wrong width:\n' + bad.join('\n') : 'all art rows are the right width');
  const CAST = [['player'], ['civ', 0], ['civ', 1], ['civ', 2], ['civ', 3], ['civ', 5], ['civ', 8], ['grunt', 0], ['grunt', 1], ['grunt', 2], ['cop'], ['brute', 0], ['sup'], ['boss', 0], ['boss', 1], ['boss', 2]];
  const draw = (cast, SC, cols, cw, rh, bg) => p.evaluate(([cast, SC, cols, cw, rh, bg]) => {
    let c = document.getElementById('sheet'); if (!c) { c = document.createElement('canvas'); c.id = 'sheet'; document.body.innerHTML = ''; document.body.appendChild(c); c.style.cssText = 'position:fixed;left:0;top:0'; }
    c.width = 1600; c.height = 900; const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, 1600, 900); x.imageSmoothingEnabled = false;
    const CIVC = ['#c84a4a', '#4a8ac8', '#d8c050', '#9a5ac8', '#5fbf8a', '#e08a4a', '#d0d0d8', '#e0a0c0', '#5ab0e0'], HAIRC = ['#1a1410', '#c8a060', '#7a4a2a', '#3a2a1a', '#d0d0d0'];
    cast.forEach(([k, v], row) => {
      const e = k === 'player' ? KC.P : { kind: k, id: k === 'civ' ? v : 5, did: v || 0, col: CIVC[(v || 0) % 9], hair: HAIRC[(v || 0) % 5], umb: null, state: '', flash: 0, hp: 1, maxhp: 1, team: 'x' };
      cols.forEach(([d, f, flip], i) => { const L = charLook(e), s = charSprite(d, f, L.o, L.pal), X = 8 + i * cw + ((cw - s.width * SC) >> 1), Y = 6 + (row + 1) * rh - s.height * SC - 4;
        x.save(); if (flip) { x.translate(X + s.width * SC, Y); x.scale(-1, 1); x.drawImage(s, 0, 0, s.width * SC, s.height * SC); } else x.drawImage(s, X, Y, s.width * SC, s.height * SC); x.restore(); });
    });
  }, [cast, SC, cols, cw, rh, bg]);
  // the whole cast, 8 facings x (stand, step), at 2x
  const all = []; for (const [d, flip] of [['S', 0], ['SE', 0], ['E', 0], ['NE', 0], ['N', 0], ['NE', 1], ['E', 1], ['SE', 1]]) for (const f of [0, 1]) all.push([d, f, flip]);
  await draw(CAST, 2, all, 99, 55, '#2a2f3d'); await p.screenshot({ path: ROOT + '/screenshots/sprites_sheet.png' });
  // close-up: main cast, five drawn facings, at 6x
  await draw([['player'], ['grunt', 0], ['grunt', 1], ['grunt', 2], ['cop']], 6, [['S', 0, 0], ['S', 1, 0], ['SE', 0, 0], ['E', 0, 0], ['E', 1, 0], ['E', 3, 0], ['NE', 0, 0], ['N', 0, 0], ['N', 1, 0]], 176, 176, '#2a2f3d');
  await p.screenshot({ path: ROOT + '/screenshots/sprites_closeup.png' });
  await draw([['civ', 0], ['civ', 1], ['civ', 2], ['civ', 5], ['brute', 0], ['sup'], ['boss', 0]].slice(0, 5), 6, [['S', 0, 0], ['S', 1, 0], ['SE', 0, 0], ['E', 0, 0], ['E', 1, 0], ['E', 3, 0], ['NE', 0, 0], ['N', 0, 0], ['N', 1, 0]], 176, 176, '#2a2f3d');
  await p.screenshot({ path: ROOT + '/screenshots/sprites_closeup2.png' });
  // the three bosses, larger
  await draw([['boss', 0], ['boss', 1], ['boss', 2]], 6, [['S', 0, 0], ['S', 1, 0], ['SE', 0, 0], ['E', 0, 0], ['E', 1, 0], ['NE', 0, 0], ['N', 0, 0]], 226, 290, '#2a2f3d');
  await p.screenshot({ path: ROOT + '/screenshots/sprites_bosses.png' });
  // action poses: hero casting, gunmen aiming, brute slam and charge, bosses using powers
  await p.evaluate(() => {
    const c = document.getElementById('sheet'), SC = 6; c.width = 1600; c.height = 900; const x = c.getContext('2d'); x.fillStyle = '#2a2f3d'; x.fillRect(0, 0, 1600, 900); x.imageSmoothingEnabled = false;
    const mk = (k, did, extra) => Object.assign({ kind: k, id: 5, did: did || 0, col: '#fff', umb: null, state: '', flash: 0, hp: 1, maxhp: 1, team: 'x' }, extra);
    const rows = [['hero casting', KC.P, () => { KC.P.throwT = 1; }], ['grunt aiming', mk('grunt', 0, { aimT: .3 })], ['cop aiming', mk('cop', 0, { aimT: .3 })], ['brute slam', mk('brute', 1, { state: 'slamWind' })], ['brute charge', mk('brute', 1, { state: 'charging' })],
                  ['Cinder power', mk('boss', 0, { act: 'hurl' })], ['Krag charge', mk('boss', 1, { act: 'charging' })], ['Architect power', mk('boss', 2, { act: 'pull' })]];
    const dirs = [['S', 0], ['SE', 0], ['E', 0], ['NE', 0], ['N', 0], ['E', 1], ['SE', 1]];
    x.font = 'bold 15px sans-serif'; x.textBaseline = 'middle';
    let X0 = 20, Y0 = 0;
    rows.forEach(([name, e, pre], r) => { const col = r < 5 ? 0 : 1, rr = r < 5 ? r : r - 5, rh = r < 5 ? 176 : 290, Y = (r < 5 ? 10 : 10) + rr * rh + rh, X = col ? 870 : 0;
      if (pre) pre(); x.fillStyle = '#3ce0ff'; x.fillText(name, X + 14, Y - rh + 16);
      dirs.slice(0, col ? 5 : 7).forEach(([d, flip], i) => { const L = charLook(e), s = charSprite(d, 1 * 0, L.o, L.pal), cw = col ? 142 : 118, px0 = X + 14 + i * cw + ((cw - s.width * SC) >> 1), py = Y - s.height * SC - 6;
        x.save(); if (flip) { x.translate(px0 + s.width * SC, py); x.scale(-1, 1); x.drawImage(s, 0, 0, s.width * SC, s.height * SC); } else x.drawImage(s, px0, py, s.width * SC, s.height * SC); x.restore(); }); });
    KC.P.throwT = 0;
  });
  await p.screenshot({ path: ROOT + '/screenshots/sprites_poses.png' });
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
