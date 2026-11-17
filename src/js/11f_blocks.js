/* ============================== 11f OPEN-BLOCK PIECES ============================== */
/* Pixel drawings for the things that only appear in open blocks:
   chain-link fence (construction yard), basketball hoops (court), unfinished steel frame (yard). */
const FENCE_H = 44;
function drawIsoFence(f) {
  const a = isoXY(f.x0, f.y0, 0), b = isoXY(f.x1, f.y1, 0), hz = FENCE_H * ISO_KZ, n = Math.max(1, Math.round(Math.abs(b[0] - a[0])));
  // chain link: checkerboard of grey pixels between the rails, so it reads see-through
  ctx.fillStyle = 'rgba(150,156,170,.55)';
  for (let i = 0; i <= n; i++) {
    const x = Math.round(lerp(a[0], b[0], i / n)), y = Math.round(lerp(a[1], b[1], i / n));
    for (let z = 1; z < hz; z++) if (((x + z) & 1) === 0) ctx.fillRect(x, y - z, 1, 1);
  }
  iline([a[0], a[1] - hz], [b[0], b[1] - hz], '#8a8e9a');   // top rail
  iline([a[0], a[1] - 1], [b[0], b[1] - 1], '#4a4e5a');     // bottom rail
  for (const p of [a, b]) { ctx.fillStyle = '#2a2c34'; ctx.fillRect(Math.round(p[0]), Math.round(p[1] - hz - 1), 1, Math.round(hz) + 2); }
  // a strip of hazard tape on some panels
  if ((Math.round(f.x0 + f.y0) / 32 | 0) % 3 === 0) { const y0 = hz * .55; for (let i = 0; i <= n; i++) ipx(lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n) - y0, (i >> 1) & 1 ? '#1a1a1a' : '#e0b020'); }
}
function drawIsoHoop(h) {
  // pole on the baseline, arm reaching over the court, backboard and orange rim
  const base = isoXY(h.x - h.dir * 10, h.y, 0), top = isoXY(h.x - h.dir * 10, h.y, 110), arm = isoXY(h.x, h.y, 110);
  ctx.fillStyle = '#3a3e4a'; ctx.fillRect(Math.round(base[0]), Math.round(top[1]), 2, Math.round(base[1] - top[1]));
  iline(top, arm, '#3a3e4a');
  const bb = [isoXY(h.x, h.y - 14, 100), isoXY(h.x, h.y + 14, 100), isoXY(h.x, h.y + 14, 132), isoXY(h.x, h.y - 14, 132)];
  ipoly(bb, '#e8ecf4'); for (let i = 0; i < 4; i++) iline(bb[i], bb[(i + 1) % 4], '#5a5e6a');
  const sq = [isoXY(h.x, h.y - 5, 104), isoXY(h.x, h.y + 5, 104), isoXY(h.x, h.y + 5, 116), isoXY(h.x, h.y - 5, 116)]; for (let i = 0; i < 4; i++) iline(sq[i], sq[(i + 1) % 4], '#d04a3a');
  const rim = isoXY(h.x + h.dir * 9, h.y, 102); iellipse(rim[0], rim[1], 3, 1.5, '#ff7a2a'); iellipse(rim[0], rim[1], 2, 1, '#1c2a3e');
  ctx.fillStyle = 'rgba(230,236,250,.6)'; for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(rim[0]) - 2 + i * 2, Math.round(rim[1]) + 1, 1, 3);   // net
}
function drawIsoFrame(b) {
  // unfinished building: concrete slabs at each floor, rust-red steel columns and beams, a work lamp
  const x0 = b.x, y0 = b.y, x1 = b.x + b.w, y1 = b.y + b.h, fh = b.ht / b.floors;
  const steel = '#a0502a', steelD = '#6a3218';
  const cols = []; for (let x = x0; x <= x1 + .1; x += TILE) for (const y of [y0, y1]) cols.push([x, y]); for (let y = y0 + TILE; y < y1; y += TILE) cols.push([x0, y], [x1, y]);
  cols.sort((p, q) => (p[0] + p[1]) - (q[0] + q[1]));   // back columns first
  // base slab
  ipoly([isoXY(x0, y1, 0), isoXY(x1, y1, 0), isoXY(x1, y1, 4), isoXY(x0, y1, 4)], '#4a4a50'); ipoly([isoXY(x1, y1, 0), isoXY(x1, y0, 0), isoXY(x1, y0, 4), isoXY(x1, y1, 4)], '#38383e');
  for (const [x, y] of cols) { const p0 = isoXY(x, y, 0), p1 = isoXY(x, y, b.ht); const front = x === x1 || y === y1; ctx.fillStyle = front ? steel : steelD; ctx.fillRect(Math.round(p1[0]), Math.round(p1[1]), front ? 2 : 1, Math.round(p0[1] - p1[1])); }
  for (let f = 1; f <= b.floors; f++) {
    const z = fh * f, done = f < b.floors;   // the top floor has beams but no slab yet
    if (done) {
      ipoly([isoXY(x0, y0, z), isoXY(x1, y0, z), isoXY(x1, y1, z), isoXY(x0, y1, z)], '#55555c');
      ipoly([isoXY(x0, y1, z - 6), isoXY(x1, y1, z - 6), isoXY(x1, y1, z), isoXY(x0, y1, z)], '#45454c'); ipoly([isoXY(x1, y1, z - 6), isoXY(x1, y0, z - 6), isoXY(x1, y0, z), isoXY(x1, y1, z)], '#36363c');
    }
    iline(isoXY(x0, y0, z), isoXY(x1, y0, z), steelD); iline(isoXY(x0, y0, z), isoXY(x0, y1, z), steelD);
    iline(isoXY(x0, y1, z), isoXY(x1, y1, z), steel); iline(isoXY(x1, y1, z), isoXY(x1, y0, z), steel);
    if (!done) for (let x = x0 + TILE; x < x1; x += TILE) iline(isoXY(x, y0, z), isoXY(x, y1, z), steelD);   // open joists on top
  }
  // diagonal bracing on the front faces
  iline(isoXY(x0, y1, 4), isoXY(x0 + TILE, y1, fh), steel); iline(isoXY(x1, y1, 4), isoXY(x1, y1 - TILE, fh), steel);
  // work lamp on top
  const lp = isoXY(x1 - 6, y1 - 6, b.ht + 10); ctx.fillStyle = '#ffeec0'; ctx.fillRect(Math.round(lp[0]), Math.round(lp[1]), 2, 1); iglow(lp[0], lp[1], 10, '#ffe0a0', .6);
}

/* ---------- gang watchtower: steel legs, plank deck with a rail, tin roof in the gang's colour ---------- */
function drawIsoTower(e) {
  const fl = e.flash > 0, P3 = propFrame(e), H = 10, DECK = 34, RAIL = 44, ROOF = 72;
  const steel = fl ? '#ffffff' : '#5a6070', dark = fl ? '#dddddd' : '#343844', wood = fl ? '#ffffff' : '#6a4a2a', tin = fl ? '#ffffff' : shade(e.col, .55);
  const post = (lx, ly, z0, z1, c) => { const a = P3(lx, ly, z0), b = P3(lx, ly, z1), X = Math.round(b[0]), Y = Math.round(b[1]); ctx.fillStyle = OUT; ctx.fillRect(X - 1, Y, 3, Math.round(a[1]) - Y + 1); ctx.fillStyle = c; ctx.fillRect(X - 1, Y, 2, Math.round(a[1]) - Y); };
  const brace = (ax, ay, bx, by, c) => { iline(P3(ax, ay, 2), P3(bx, by, DECK - 4), c); iline(P3(bx, by, 2), P3(ax, ay, DECK - 4), c); iline(P3(ax, ay, DECK * .5), P3(bx, by, DECK * .5), c); };
  // back to front: far leg and far bracing, side legs, near bracing, near leg
  brace(-H, -H, -H, H, dark); brace(-H, -H, H, -H, dark);
  post(-H, -H, 0, DECK, dark); post(-H, H, 0, DECK, steel); post(H, -H, 0, DECK, steel);
  brace(-H, H, H, H, steel); brace(H, -H, H, H, shade(steel, .8));
  post(H, H, 0, DECK, steel);
  // deck
  pixBox(e, P3, 0, 26, 26, DECK, DECK + 3, wood, fl ? '#fff' : '#7a5632', null, tp => { for (let i = 1; i < 4; i++) iline(tp(i / 4, .04), tp(i / 4, .96), shade(wood, .7)); });
  const R = 12;
  // far rail and roof posts, lookout lamp, near rail
  iline(P3(-R, -R, RAIL), P3(-R, R, RAIL), dark); iline(P3(-R, -R, RAIL), P3(R, -R, RAIL), dark);
  post(-R, -R, DECK + 3, ROOF, dark); post(-R, R, DECK + 3, ROOF, steel); post(R, -R, DECK + 3, ROOF, steel);
  if (e.lk) { drawChar(e.lk); artT(); ctx.globalAlpha = 1; }   // the lookout, standing on the deck
  if (!fl) { const l = P3(0, 0, ROOF - 3); ipx(l[0], l[1], '#fff'); iglow(l[0], l[1] + 2, 9, e.col, .3 + .08 * Math.sin(G.time * 3 + e.id)); }
  iline(P3(-R, R, RAIL), P3(R, R, RAIL), steel); iline(P3(R, -R, RAIL), P3(R, R, RAIL), shade(steel, .8));
  iline(P3(-R, R, RAIL - 5), P3(R, R, RAIL - 5), dark); iline(P3(R, -R, RAIL - 5), P3(R, R, RAIL - 5), dark);
  post(R, R, DECK + 3, ROOF, steel);
  // roof
  pixBox(e, P3, 0, 30, 30, ROOF, ROOF + 3, tin, fl ? '#fff' : shade(e.col, .75), null, tp => { for (let i = 1; i < 5; i++) iline(tp(i / 5, .04), tp(i / 5, .96), shade(e.col, .5)); });
  const top = P3(0, 0, ROOF + 3)[1];
  if (e.hp < e.maxhp && (e.sinceHit || 0) < 4) {
    const a = isoXY(e.x, e.y, 0), bw = 16, bx = Math.round(a[0] - bw / 2), by = Math.round(top) - 11;
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(bx - 1, by - 1, bw + 2, 3); ctx.fillStyle = '#ff4a5a'; ctx.fillRect(bx, by, Math.max(0, Math.round(bw * e.hp / e.maxhp)), 1);
  }
  e.sinceHit = (e.sinceHit || 0) + 1 / 60;
  return top;
}

/* ---------- gang hideout: a fortified brick warehouse ----------
   South wall (left face): roll-up shutter gate under a hazard lintel, two barred windows, graffiti.
   East wall (right face): the gang's initial sprayed large, a steel side door, a vent.
   Roof: the gang's mark painted on a rusting steel sign facing the camera, stair hut, skylight, air-conditioning unit, flag, beacon,
   razor wire on the front parapets.
   The still parts are painted once per hideout into a small canvas and stamped; only what moves or glows is drawn
   live on top (window light, emblem, shutter, lamps, flag, fan). Wall pixels are addressed as (column, row from the
   ground) so hand-placed details sit exactly on the brick. */
const HIDE_HT = 96, HIDE_ROWS = 24;
const HIDE_EMBLEM = [   // the mark painted on the roof sign, one per gang: '#' paint, '+' highlight
  px(`
    ##...........##
    .##.........##.
    .###.......###.
    ..####...####..
    ...###+++###...
    ....+++++++....
    ....+..+..+....
    ....+++++++....
    .....+++++.....
    .....+.+.+.....
    ......+++......
    .......+.......`),    // Rustlers: a bull's skull
  px(`
    .....#####.....
    ...##.....##...
    ..#.......++#..
    .#.......++..#.
    .#......++...#.
    #......++.....#
    #.....++++++..#
    .#.......++..#.
    .#......++...#.
    ..#....++...#..
    ...##.++..##...
    .....#####.....`),    // Breakers: a bolt cracking a ring
  px(`
    .......#.......
    ......###......
    ......#.#......
    .....##.##.....
    .....#...#.....
    ....##.+.##....
    ....#.+++.#....
    ...##..+..##...
    ...#.......#...
    ..##.......##..
    ..#.........#..
    .#############.`)     // Architects: the eye in the pyramid
];
const HIDE_TAG = [        // the gang's initial sprayed on the east wall
  ['#####..', '##..##.', '##..##.', '##..##.', '#####..', '####...', '##.##..', '##..##.', '##..##.'],
  ['#####..', '##..##.', '##..##.', '#####..', '#####..', '##..##.', '##..##.', '##..##.', '#####..'],
  ['..###..', '.##.##.', '##...##', '##...##', '#######', '#######', '##...##', '##...##', '##...##']
];
// the rooftop sign stands upright facing the camera: X, Y = top-left pixel of its panel
function hideoutSign(e) { const r = e.rect, p = isoXY(r.x + 50, r.y + 8, HIDE_HT); return [Math.round(p[0]) - 8, Math.round(p[1]) - 17]; }
function hideoutGeo(e) {
  const r = e.rect, a = isoXY(r.x, r.y + r.h, 0), ax = Math.round(a[0]), ay = Math.round(a[1]), nS = r.w >> 1, nE = r.h >> 1, cx = ax + nS, cy = ay + (nS >> 1);
  return { ax, ay, cx, cy, nS, nE, S: (i, j) => [ax + i, ay - 1 + ((i + 1) >> 1) - j], E: (i, j) => [cx + i, cy - 1 - ((i + 1) >> 1) - j] };
}
function hideoutStatic(e, g) {
  const r = e.rect, x0 = r.x, y0 = r.y, x1 = x0 + r.w, y1 = y0 + r.h, ht = HIDE_HT, live = !e.cleared, col = e.col, { S, E, nS, nE } = g;
  const put = (p, c) => { ctx.fillStyle = c; ctx.fillRect(p[0], p[1], 1, 1); };
  const fill = (W, i0, i1, j0, j1, c) => { for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) put(W(i, j), typeof c === 'function' ? c(i, j) : c); };
  // ---- roof slab (the walls are painted over its lower edges)
  const T = [isoXY(x0, y0, ht), isoXY(x1, y0, ht), isoXY(x1, y1, ht), isoXY(x0, y1, ht)];
  ipoly([T[0], T[1], [T[2][0], T[2][1] + 2], T[3]], '#332b2d');
  for (const u of [32, 64]) iline(isoXY(x0 + u, y0, ht), isoXY(x0 + u, y1, ht), '#2a2325');             // tar-paper seams
  iline(isoXY(x0 + 2, y0 + 2, ht), isoXY(x1 - 2, y0 + 2, ht), '#4b4143'); iline(isoXY(x0 + 2, y0 + 2, ht), isoXY(x0 + 2, y1 - 2, ht), '#4b4143');   // back parapets
  for (const [px_, py_] of [[20, 44], [52, 52], [78, 14], [70, 30]]) { const p = isoXY(x0 + px_, y0 + py_, ht); ctx.fillStyle = '#46506a'; ctx.fillRect(Math.round(p[0]), Math.round(p[1]), 2, 1); }   // puddles
  // ---- brick walls
  const rnd2 = (a, b) => (hash2(a + e.hid * 57, b) % 1000) / 1000;
  const brick = (side, n) => (i, j) => {
    const lit = side === 0;
    if (j === 0) return lit ? '#26262c' : '#1b1b21';
    if (j === 1) return lit ? '#6f6f76' : '#4b4b53';
    if (j === 23) return lit ? '#978b82' : '#655c5c';                                  // coping
    if (j === 22) return lit ? '#353945' : '#262933';                                  // steel band
    if (j === 21) return live ? shade(col, lit ? .78 : .5) : (lit ? '#4c4c54' : '#36363d');   // the gang's stripe
    const c0 = (j - 2) / 3 | 0, jj = (j - 2) % 3, off = (c0 & 1) * 2, bi = (i + off) >> 2;
    let base = lit ? '#5c3c31' : '#3f2a28';
    if (jj === 2) return shade(base, .74);                                             // mortar course
    if (((i + off) & 3) === 0) return shade(base, .86);                                // joint
    const v = rnd2(c0 * 31 + side * 7, bi);
    let k = v < .16 ? 1.16 : v > .86 ? .86 : 1;
    if (j >= 18) k *= .9; else if (j <= 5) k *= 1.07;                                  // shaded under the band, lit near the ground
    if (lit && i === n - 1) k *= 1.25; if (lit && i === 0) k *= .75; if (!lit && i === n - 1) k *= .8;   // corner edges
    return shade(base, k);
  };
  fill(S, 0, nS - 1, 0, HIDE_ROWS - 1, brick(0, nS)); fill(E, 0, nE - 1, 0, HIDE_ROWS - 1, brick(1, nE));
  // ---- south wall: gate, windows, graffiti, floodlights
  const g0 = (nS >> 1) - 8, g1 = g0 + 15;                                             // gate opening columns
  fill(S, g0, g1, 0, 9, '#050404');
  fill(S, g0 - 1, g0 - 1, 0, 10, '#7d828f'); fill(S, g1 + 1, g1 + 1, 0, 10, '#555a67');
  fill(S, g0, g1, 10, 10, i => ((i - g0) >> 1) & 1 ? '#17130a' : '#e0b020');           // hazard lintel
  fill(S, g0 - 1, g1 + 1, 11, 11, '#2b2e39'); fill(S, g0 - 1, g1 + 1, 12, 12, '#444956');   // shutter housing
  for (const w0 of [3, nS - 11]) { fill(S, w0, w0 + 7, 13, 18, '#1a1414'); fill(S, w0 + 1, w0 + 6, 14, 17, '#0e0a0b'); fill(S, w0, w0 + 7, 12, 12, '#7a6f68'); }   // window frames and sills
  const tag = (W, i0, j0, rows, c) => rows.forEach((row, k) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') put(W(i0 + i, j0 + rows.length - 1 - k), c); });
  tag(S, 2, 3, ['.#...#...', '#.#.#.#.#', '#..#...#.', '.......#.'], shade(col, live ? .95 : .55));
  tag(S, nS - 12, 4, ['#..#.##.', '####.#.#', '#..#.##.'], live ? '#3ac2dc' : '#2c6470');
  put(S(1, 20), '#dfe2ea'); put(S(nS - 3, 20), '#dfe2ea');                              // floodlight heads
  // ---- east wall: the gang's initial sprayed large (with a drop shadow), side door, vent
  tag(E, 12, 5, HIDE_TAG[e.did % 3], '#1c1516'); tag(E, 11, 6, HIDE_TAG[e.did % 3], shade(col, live ? 1 : .5));
  tag(E, 19, 4, ['#.#', '.#.', '#.#'], live ? '#e8ecf4' : '#6a6e78');
  fill(E, 25, 29, 2, 10, '#4a505e'); fill(E, 25, 25, 2, 10, '#262932'); fill(E, 29, 29, 2, 10, '#31343f'); fill(E, 25, 29, 11, 11, '#262932');   // steel door
  fill(E, 26, 28, 8, 9, '#161a24'); put(E(28, 5), '#b8bcc6');                           // its slot window and handle
  fill(E, 1, 5, 14, 16, '#262932'); fill(E, 1, 5, 15, 15, '#525866'); fill(E, 2, 3, 6, 13, (i, j) => shade('#3f2a28', .8));   // vent and the stain under it
  // ---- roof clutter
  ibox(x0 + 6, y0 + 6, 22, 18, ht, 18, '#4a4042', '#684a3d', '#463230');                // stair hut
  { const d = isoXY(x0 + 13, y0 + 24, ht); ctx.fillStyle = '#16110f'; ctx.fillRect(Math.round(d[0]) + 1, Math.round(d[1]) - 3, 3, 4); }   // its door
  const sk = [isoXY(x0 + 38, y0 + 14, ht), isoXY(x0 + 62, y0 + 14, ht), isoXY(x0 + 62, y0 + 34, ht), isoXY(x0 + 38, y0 + 34, ht)];
  ipoly(sk, '#171b26'); for (let i = 0; i < 4; i++) iline(sk[i], sk[(i + 1) % 4], '#5a5e6c');   // skylight
  ibox(x1 - 36, y1 - 28, 20, 14, ht, 8, '#767c8a', '#5b6170', '#414654');               // air-conditioning unit
  { const f = isoXY(x1 - 26, y1 - 21, ht + 8); iellipse(f[0], f[1], 4, 2, '#23262f'); ctx.fillStyle = '#343844'; const s = isoXY(x1 - 36, y1 - 14, ht + 4); for (let i = 1; i < 9; i += 2) ctx.fillRect(Math.round(s[0]) + i, Math.round(s[1]) + (i >> 1), 1, 1); }
  { const m = isoXY(x0 + 12, y1 - 10, ht); ctx.fillStyle = '#6a6e7a'; ctx.fillRect(Math.round(m[0]), Math.round(m[1]) - 5, 1, 5); }   // beacon mast
  { const fp = isoXY(x1 - 12, y0 + 12, ht); ctx.fillStyle = '#9a9ea8'; ctx.fillRect(Math.round(fp[0]), Math.round(fp[1]) - 17, 1, 17); ctx.fillStyle = '#5a5e68'; ctx.fillRect(Math.round(fp[0]) - 1, Math.round(fp[1]) - 1, 3, 1); }   // flag pole
  // ---- rooftop sign: a rusting steel plate on two legs with the gang's mark painted on it (industrial, not neon)
  { const [X, Y] = hideoutSign(e), em = HIDE_EMBLEM[e.did % 3], paint = live ? mix(col, '#f0e4c8', .25) : '#6a6058', hi = live ? '#f6ecd2' : '#847a70';
    ctx.fillStyle = '#3a3e4a'; ctx.fillRect(X + 2, Y + 14, 1, 4); ctx.fillRect(X + 14, Y + 14, 1, 4); ctx.fillRect(X + 3, Y + 15, 11, 1);
    ctx.fillStyle = '#07070c'; ctx.fillRect(X - 1, Y - 1, 19, 16); ctx.fillStyle = '#6a5348'; ctx.fillRect(X, Y, 17, 14); ctx.fillStyle = '#3a2c28'; ctx.fillRect(X + 1, Y + 1, 15, 12);
    for (let i = 0; i < 14; i++) { const h = hash2(e.hid * 31 + i, 77), rx = X + 1 + h % 15, ry = Y + 1 + (h >> 5) % 12; ctx.fillStyle = (h >> 9) & 1 ? '#5a3424' : '#2c2220'; ctx.fillRect(rx, ry, 1 + ((h >> 11) & 1), 1); }   // rust and grime
    ctx.fillStyle = '#8a7a70'; for (const [rx, ry] of [[0, 0], [16, 0], [0, 13], [16, 13]]) ctx.fillRect(X + rx, Y + ry, 1, 1);   // rivets
    em.forEach((row, k) => { for (let i = 0; i < row.length; i++) if (row[i] !== '.') { ctx.fillStyle = row[i] === '+' ? hi : paint; ctx.fillRect(X + 1 + i, Y + 1 + k, 1, 1); } });
    ctx.fillStyle = '#5a3424'; ctx.fillRect(X + 4, Y + 14, 1, 2); ctx.fillRect(X + 11, Y + 14, 1, 1); }   // rust streaks under it
  // ---- razor wire: loose coils on the front parapets, a plain strand along the back
  for (let i = 1; i < nS; i += 2) put(S(i, 24), i % 4 === 1 ? '#b4b8c2' : '#5e616b');
  for (let i = 1; i < nE; i += 2) put(E(i, 24), i % 4 === 1 ? '#9296a0' : '#4e515a');
  for (const [a, b] of [[T[0], T[1]], [T[0], T[3]]]) { const n = Math.round(Math.hypot(b[0] - a[0], b[1] - a[1])); for (let i = 0; i <= n; i += 2) ipx(lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n) - 1, '#6a6d77'); }
}
function drawIsoHideout(e) {
  const r = e.rect, x0 = r.x, y0 = r.y, x1 = x0 + r.w, y1 = y0 + r.h, ht = HIDE_HT, t = G.time, col = e.col, live = !e.cleared, g = hideoutGeo(e), { S, E, nS } = g;
  // ---- the still picture, repainted only when the hideout changes state
  const key = live ? 1 : 0;
  if (!e._art || e._art.key !== key) {
    const cvs = document.createElement('canvas'); cvs.width = nS + g.nE + 4; cvs.height = 84;
    const keep = ctx, ox = ISO.ox, oy = ISO.oy; ISO.ox += 2 - g.ax; ISO.oy += 56 - g.ay; ctx = cvs.getContext('2d');
    try { hideoutStatic(e, hideoutGeo(e)); } finally { ctx = keep; ISO.ox = ox; ISO.oy = oy; }
    const wh = document.createElement('canvas'); wh.width = cvs.width; wh.height = cvs.height; const wc = wh.getContext('2d'); wc.drawImage(cvs, 0, 0); wc.globalCompositeOperation = 'source-in'; wc.fillStyle = '#fff'; wc.fillRect(0, 0, wh.width, wh.height);
    e._art = { key, cv: cvs, white: wh };
  }
  ctx.drawImage(e._art.cv, g.ax - 2, g.ay - 56);
  const put = (p, c) => { ctx.fillStyle = c; ctx.fillRect(p[0], p[1], 1, 1); };
  // ---- gate: the shutter rolls up once the guards and the tower are down
  const g0 = (nS >> 1) - 8, open = e.gateOpen ? (e.gateT === undefined ? 1 : e.gateT) : 0, sb = Math.round(10 * clamp(open, 0, 1));
  if (open > 0 && live) { const m = S(g0 + 8, 4); iglow(m[0], m[1], 15, '#ffb060', .5 * open); for (let i = 0; i < 16; i++) for (let j = 0; j < Math.min(sb, 4); j++) put(S(g0 + i, j), rgba('#ffb060', .16 - j * .035)); }   // light from inside on the floor of the doorway
  for (let j = sb; j < 10; j++) for (let i = 0; i < 16; i++) put(S(g0 + i, j), j === sb ? ((i >> 1) & 1 ? '#17130a' : '#e0b020') : (j - sb) & 1 ? '#666b78' : '#4a4e5a');   // slats, hazard strip on the bottom edge
  if (sb < 9) { put(S(g0 + 7, sb + 2), '#1d1f26'); put(S(g0 + 8, sb + 2), '#1d1f26'); }   // handle
  const lamp = S(g0 + 8, 12);
  if (live) { const locked = !e.gateOpen, on = locked ? Math.sin(t * 5) > 0 : true, c = locked ? '#ff2a3a' : '#4dff9a'; put(lamp, on ? c : '#4a1016'); if (on) iglow(lamp[0], lamp[1], 6, c, .7); } else put(lamp, '#2a2c34');
  if (!live) return;
  // ---- lit windows behind their bars
  for (const w0 of [3, nS - 11]) {
    const a = .5 + .22 * Math.sin(t * 3 + w0) + (Math.sin(t * 17 + w0 * 3) > .93 ? -.3 : 0);
    for (let i = 1; i <= 6; i++) for (let j = 14; j <= 17; j++) put(S(w0 + i, j), i % 2 ? rgba('#ffc878', clamp(a, .1, .9)) : '#0a0707');   // plain bulb light
    const m = S(w0 + 4, 15); iglow(m[0], m[1], 7, '#ffc878', .25);
  }
  // ---- a work lamp on a gooseneck lights the painted sign after dark
  { const [sx, sy] = hideoutSign(e); put([sx + 8, sy - 3], '#3a3e4a'); put([sx + 8, sy - 2], '#3a3e4a'); put([sx + 7, sy - 3], '#3a3e4a');
    if (LIGHT.lamps) { put([sx + 7, sy - 2], '#fff0c8'); iglow(sx + 8, sy + 4, 13, '#ffd9a0', .4); } }
  { const d = E(27, 12); put(d, '#ffe9b8'); iglow(d[0], d[1] + 1, 5, '#ffd9a0', .45); }   // lamp over the side door
  // ---- roof: skylight glow, fan, flag, beacon, floodlights
  const sk = [isoXY(x0 + 40, y0 + 16, ht), isoXY(x0 + 60, y0 + 16, ht), isoXY(x0 + 60, y0 + 32, ht), isoXY(x0 + 40, y0 + 32, ht)];
  ctx.globalAlpha = .3 + .12 * Math.sin(t * 1.7 + e.hid); ipoly(sk, '#ffc878'); ctx.globalAlpha = 1;
  iline(isoXY(x0 + 50, y0 + 14, ht), isoXY(x0 + 50, y0 + 34, ht), '#5a5e6c'); iline(isoXY(x0 + 38, y0 + 24, ht), isoXY(x0 + 62, y0 + 24, ht), '#5a5e6c');
  { const m = isoXY(x0 + 50, y0 + 24, ht); iglow(m[0], m[1], 12, '#ffc878', .22); }
  { const f = isoXY(x1 - 26, y1 - 21, ht + 8), X = Math.round(f[0]), Y = Math.round(f[1]), ph = Math.floor(t * 12) % 3; ctx.fillStyle = '#5d6372';   // fan blade: one short bar turning
    if (ph === 0) ctx.fillRect(X - 2, Y, 5, 1); else if (ph === 1) { ctx.fillRect(X - 2, Y - 1, 2, 1); ctx.fillRect(X, Y, 1, 1); ctx.fillRect(X + 1, Y + 1, 2, 1); } else { ctx.fillRect(X + 1, Y - 1, 2, 1); ctx.fillRect(X, Y, 1, 1); ctx.fillRect(X - 2, Y + 1, 2, 1); } }
  { const fp = isoXY(x1 - 12, y0 + 12, ht), X = Math.round(fp[0]) + 1, Y = Math.round(fp[1]) - 17;   // flag: 9 x 6, rippling
    for (let i = 0; i < 9; i++) { const dy = Math.round(Math.sin(t * 6 - i * .9) * (i / 8) * 1.6); ctx.fillStyle = i % 4 === 3 ? shade(col, .78) : col; ctx.fillRect(X + i, Y + dy, 1, i < 7 ? 6 : 5 - (i - 7)); }
    ctx.fillStyle = '#1a1210'; ctx.fillRect(X + 3, Y + 2 + Math.round(Math.sin(t * 6 - 2.7) * .6), 2, 2); }
  { const on = Math.sin(t * 5) > 0, m = isoXY(x0 + 12, y1 - 10, ht), X = Math.round(m[0]), Y = Math.round(m[1]) - 7; ctx.fillStyle = on ? '#ff2a2a' : '#401010'; ctx.fillRect(X, Y, 2, 2); if (on) iglow(X + 1, Y + 1, 8, '#ff2a2a', .8); }
  for (const i of [1, nS - 3]) { const f = S(i, 20); iglow(f[0], f[1] + 2, 8, '#ffeedd', .5); for (let j = 19; j >= 12; j--) { const w = (19 - j) >> 1; for (let k = -w; k <= w; k++) put(S(i + k, j), 'rgba(255,238,214,.07)'); } }   // floodlights and their cones on the brick
  if (e.flash > 0) { ctx.globalAlpha = .8; ctx.drawImage(e._art.white, g.ax - 2, g.ay - 56); ctx.globalAlpha = 1; }
}
