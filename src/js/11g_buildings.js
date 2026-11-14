/* ============================== 11g BUILDINGS ============================== */
/* Ordinary city buildings. The still picture of a building (walls, windows, shopfronts, the roof and everything standing
   on it) is painted once into a small canvas and stamped every frame; whatever glows, blinks or drifts is drawn live on
   top. The picture is repainted when the district changes hands, because window light and neon colours change with it.
   What stands on a roof is made up here from the building's position (roofPlan), so the city generator and the save file
   know nothing about it. */
const BLD_PADX = 2, BLD_PADT = 30;

/* ---------- small upright pixel pictures (water tower, dish, sign art) ---------- */
const _pxCv = {};
function pxCanvas(key, rows, pal, outline) {   // rows of characters -> canvas, with a 1 px margin (used by the outline)
  let c = _pxCv[key]; if (c) return c;
  const w = rows[0].length, h = rows.length; c = _pxCv[key] = document.createElement('canvas'); c.width = w + 2; c.height = h + 2; const g = c.getContext('2d');
  const at = (x, y) => y >= 0 && y < h && x >= 0 && x < w && pal[rows[y][x]];
  if (outline) { g.fillStyle = outline; for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) if (!at(x, y) && (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1))) g.fillRect(x + 1, y + 1, 1, 1); }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const col = at(x, y); if (col) { g.fillStyle = col; g.fillRect(x + 1, y + 1, 1, 1); } }
  return c;
}
const ROOF_ART = {
  tank: px(`
    .....R.....
    ...rRRRr...
    ..rRRRRRr..
    .rrRRRRRrr.
    .wwlwwlwwd.
    .bbbbbbbbb.
    .wwlwwlwwd.
    .wwlwwlwwd.
    .bbbbbbbbb.
    .wwlwwlwwd.
    ..k.....k..
    ..k.k.k.k..
    ..kk...kk..
    ..k.....k..`),
  dish: px(`
    ..www..
    .wllllw
    wlllldw
    wllddw.
    .wwww..
    ...k...
    ..kkk..`)
};
const ROOF_PAL = {
  wood: { R: '#5c4a44', r: '#3a2e2c', w: '#7a5636', l: '#946c44', d: '#553a26', b: '#2b2d36', k: '#3a3d48' },
  steel: { R: '#8a90a0', r: '#5a6070', w: '#7a8192', l: '#a2a9b9', d: '#555b6a', b: '#2b2d36', k: '#3a3d48' },
  dish: { w: '#c8ccd6', l: '#9aa0ae', d: '#6a7080', k: '#3a3d48' }
};
/* Neon sign pictures: '#' first tube colour, '+' second. 9 x 9 each. */
const SIGN_PIC = [
  px(`
    ..+..+...
    .+..+..+.
    ..+..+...
    #########
    #.......#
    .#.....#.
    .#.....#.
    ..#####..
    ...###...`),   // noodle bowl
  px(`
    #########
    .#.....#.
    ..#.+.#..
    ...#+#...
    ....#....
    ....#....
    ....#....
    ..#####..
    .........`),   // cocktail
  px(`
    .##...##.
    #..#.#..#
    #...#...#
    #.......#
    .#.....#.
    ..#...#..
    ...#.#...
    ....#....
    .........`),   // heart
  px(`
    ....#....
    ...###...
    #########
    .#######.
    ..#####..
    .###.###.
    .##...##.
    ##.....##
    .........`),   // star
  px(`
    .........
    ..#####..
    .#.....#.
    #..+++..#
    #..+++..#
    .#.....#.
    ..#####..
    .........
    .........`),   // eye
  px(`
    ...###...
    ...###...
    ...###...
    ...###...
    #########
    .#######.
    ..#####..
    ...###...
    ....#....`),   // arrow
  px(`
    ...###...
    ...###...
    ...###...
    #########
    #########
    #########
    ...###...
    ...###...
    ...###...`),   // cross
  px(`
    ...######
    ...#....#
    ...#....#
    ...#....#
    ...#....#
    .###..###
    ####.####
    .##...##.
    .........`),   // music
  px(`
    ..+.+.+..
    ...+.+...
    .........
    #######..
    #.....###
    #.....#.#
    #.....###
    .#####...
    #########`),   // cup
  px(`
    .........
    ..####..#
    .#....###
    #.+....##
    #......##
    .#....###
    ..####..#
    .........
    .........`)    // fish
];
/* made-up sign lettering, 5 x 7 each: reads as writing, says nothing */
const SIGN_GLYPH = [
  px(`
    ..#..
    #####
    ..#..
    #####
    ..#..
    ..#..
    ..#..`),
  px(`
    .....
    #####
    #...#
    #...#
    #...#
    #####
    .....`),
  px(`
    .....
    .#.#.
    .#.#.
    .#..#
    #...#
    #...#
    #...#`),
  px(`
    .#...
    .#...
    .###.
    .#..#
    .#...
    .#...
    .#...`),
  px(`
    .....
    .###.
    .....
    .....
    #####
    .....
    ..#..`),
  px(`
    ....#
    .#.#.
    ..#..
    ..##.
    .#..#
    #....
    .....`)
];

/* ---------- what stands on a roof ---------- */
function roofPlan(b) {
  if (b._roof) return b._roof;
  const rnd = mulberry(hash2(b.x * 7 + 3, b.y * 13 + 1)), R = [], d = b.d, w = b.w, h = b.h;
  const free = (x, y, pw, ph) => x >= 8 && y >= 8 && x + pw <= w - 8 && y + ph <= h - 8 && !R.some(o => x < o.x + o.w + 4 && x + pw + 4 > o.x && y < o.y + o.h + 4 && y + ph + 4 > o.y);
  const place = (k, pw, ph, o, yMax = 1) => {
    for (let i = 0; i < 16; i++) { const x = Math.round((8 + rnd() * (w - 16 - pw)) / 2) * 2, y = Math.round((8 + rnd() * (h - 16 - ph) * yMax) / 2) * 2; if (free(x, y, pw, ph)) { const it = Object.assign({ k, x, y, w: pw, h: ph, s: rnd() }, o); R.push(it); return it; } }
    return null;
  };
  const pad = b.props.find(p => p.k === 'pad'); if (pad) R.push({ k: 'pad', x: w / 2 - pad.w - 2, y: h / 2 - pad.w - 2, w: pad.w * 2 + 4, h: pad.w * 2 + 4, r: pad.w, s: 0 });
  // big roofs get a penthouse block (plant room / top flat) that breaks up the flat and steps the skyline
  if (!pad && w >= 96 && h >= 96 && rnd() < (w * h > 30000 ? .8 : .5)) place('pent', Math.round(w * (.34 + rnd() * .16) / 4) * 4, Math.round(h * (.34 + rnd() * .16) / 4) * 4, { hz: 14 + ((rnd() * 3) | 0) * 4 + (d === 2 ? 6 : 0) }, .6);
  // a neon sign for some roofs; it goes in first so it gets a spot towards the back, where it stands against the sky
  if (rnd() < [.34, .26, .4][d] && w >= 64) {
    const kind = rnd() < .45 ? 'pic' : rnd() < .5 ? 'txt' : 'both';
    place('bill', kind === 'pic' ? 26 : 44, 6, { kind, pic: (rnd() * SIGN_PIC.length) | 0, g: [(rnd() * 6) | 0, (rnd() * 6) | 0, (rnd() * 6) | 0], ci: (rnd() * 4) | 0, mode: rnd() < .6 ? 0 : rnd() < .5 ? 1 : 2, ph: rnd() * 10 }, .45);
  }
  const menu = [[['ac', 3], ['hut', 1.2], ['sky', 1.5], ['tank', 1], ['vent', 2], ['dish', 1], ['mast', .7]],
                [['tank', 2], ['tarp', 2], ['line', 1.6], ['hut', 1], ['vent', 2], ['ac', 1], ['sky', .5]],
                [['ac', 3], ['solar', 2.6], ['dish', 1.4], ['mast', 1], ['sky', 1], ['vent', 1]]][d];
  const size = { ac: [18, 12], hut: [20, 16], sky: [22, 14], tank: [14, 14], vent: [4, 4], dish: [8, 8], mast: [4, 4], tarp: [20, 14], line: [28, 4], solar: [30, 16] };
  const total = menu.reduce((a, m) => a + m[1], 0), n = clamp(Math.round(w * h / 2400), 2, 16);
  for (let i = 0; i < n; i++) {
    let r = rnd() * total, k = menu[0][0]; for (const m of menu) { if (r < m[1]) { k = m[0]; break; } r -= m[1]; }
    if ((k === 'hut' || k === 'mast') && R.some(o => o.k === k)) k = 'vent';
    place(k, size[k][0], size[k][1], { c: (rnd() * 4) | 0 });
  }
  if ((hash2(b.x, b.y) & 3) === 0 && !R.some(o => o.k === 'mast')) place('mast', 4, 4, {});   // the old red rooftop light keeps its place in the skyline
  R.sort((p, q) => (p.x + p.w / 2 + p.y + p.h / 2) - (q.x + q.w / 2 + q.y + q.h / 2));
  return b._roof = R;
}
// neon sign panel: returns { w, h } in art pixels and paints it at X, Y (top-left). lit = tubes on.
function signPanel(o, pal, X, Y, lit) {
  const wide = o.kind !== 'pic', pw = o.kind === 'pic' ? 13 : o.kind === 'txt' ? 21 : 25, ph = o.kind === 'txt' ? 11 : 13;
  if (!lit) {
    ctx.fillStyle = '#3a3e4a'; ctx.fillRect(X + 2, Y + ph, 1, 4); ctx.fillRect(X + pw - 3, Y + ph, 1, 4); if (wide) ctx.fillRect(X + (pw >> 1), Y + ph, 1, 4);
    ctx.fillStyle = '#07070c'; ctx.fillRect(X - 1, Y - 1, pw + 2, ph + 2); ctx.fillStyle = '#2c2f3a'; ctx.fillRect(X, Y, pw, ph); ctx.fillStyle = '#0e0d12'; ctx.fillRect(X + 1, Y + 1, pw - 2, ph - 2);
  }
  const c1 = lit ? mix(pal[o.ci], '#ffffff', .2) : '#34303a', c2 = lit ? mix(pal[(o.ci + 1) % 4], '#ffffff', .35) : '#3c3842', c3 = lit ? mix(pal[(o.ci + 2) % 4], '#ffffff', .25) : '#34303a';
  const draw = (rows, x, y, a, b_) => rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] !== '.') { ctx.fillStyle = row[i] === '+' ? b_ : a; ctx.fillRect(X + x + i, Y + y + j, 1, 1); } });
  if (o.kind === 'pic') draw(SIGN_PIC[o.pic], 2, 2, c1, c2);
  else if (o.kind === 'txt') for (let i = 0; i < 3; i++) draw(SIGN_GLYPH[o.g[i]], 2 + i * 6, 2, i === 1 ? c3 : c1, c1);
  else { draw(SIGN_PIC[o.pic], 2, 2, c1, c2); for (let i = 0; i < 2; i++) draw(SIGN_GLYPH[o.g[i]], 13 + i * 6, 3, c3, c3); }
  return { w: pw, h: ph };
}
function paintRoof(b, st, fx, pal, litK) {
  const x0 = b.x, y0 = b.y, x1 = x0 + b.w, y1 = y0 + b.h, ht = b.ht, roof = b.roof, d = b.d;
  const T = [isoXY(x0, y0, ht), isoXY(x1, y0, ht), isoXY(x1, y1, ht), isoXY(x0, y1, ht)], rr = mulberry(hash2(b.x + 11, b.y + 5));
  ipoly(T, roof);
  // worn patches, seams, puddles
  for (let i = 0, n = 1 + ((b.w * b.h) / 9000 | 0); i < n; i++) { const pw = 14 + rr() * 26, ph = 10 + rr() * 18, px_ = x0 + 6 + rr() * (b.w - pw - 12), py_ = y0 + 6 + rr() * (b.h - ph - 12); ipoly([isoXY(px_, py_, ht), isoXY(px_ + pw, py_, ht), isoXY(px_ + pw, py_ + ph, ht), isoXY(px_, py_ + ph, ht)], shade(roof, rr() < .5 ? .9 : 1.1)); }
  for (let u = 48; u < b.w - 10; u += 48) iline(isoXY(x0 + u, y0 + 6, ht), isoXY(x0 + u, y1 - 6, ht), shade(roof, .86));
  for (let v = 64; v < b.h - 10; v += 64) iline(isoXY(x0 + 6, y0 + v, ht), isoXY(x1 - 6, y0 + v, ht), shade(roof, .86));
  for (let i = 0, n = 1 + ((b.w * b.h) / 7000 | 0); i < n; i++) { const p = isoXY(x0 + 10 + rr() * (b.w - 20), y0 + 10 + rr() * (b.h - 20), ht); iellipse(p[0], p[1], 2 + rr() * 2, 1, mix(roof, '#6a86b8', .35)); ipx(p[0] - 1, p[1], mix(roof, '#b8d0f0', .5)); }
  // parapet: a ledge line just inside the edge, lit rims
  const I = [isoXY(x0 + 5, y0 + 5, ht), isoXY(x1 - 5, y0 + 5, ht), isoXY(x1 - 5, y1 - 5, ht), isoXY(x0 + 5, y1 - 5, ht)];
  for (let i = 0; i < 4; i++) iline(I[i], I[(i + 1) % 4], shade(roof, .72));
  iline(T[0], T[1], shade(roof, 1.3)); iline(T[0], T[3], shade(roof, 1.3));
  iline(T[3], T[2], shade(roof, 1.7)); iline(T[2], T[1], shade(roof, 1.5));
  // everything that stands on it, back to front
  const metal = [mix('#959cab', roof, .12), mix('#6c7383', roof, .12), mix('#494e5c', roof, .12)];
  for (const o of roofPlan(b)) {
    const X = x0 + o.x, Y = y0 + o.y, cx = X + o.w / 2, cy = Y + o.h / 2;
    if (o.k === 'pad') {
      ctx.save(); ctx.setTransform(ISO_K, ISO_K / 2, -ISO_K, ISO_K / 2, ISO.ox, ISO.oy - ht * ISO_KZ); ctx.strokeStyle = rgba(pal[0], .8); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, o.r, 0, TAU); ctx.stroke();
      ctx.fillStyle = rgba(pal[0], .8); ctx.fillRect(cx - o.r * .35, cy - o.r * .45, 4, o.r * .9); ctx.fillRect(cx + o.r * .35 - 4, cy - o.r * .45, 4, o.r * .9); ctx.fillRect(cx - o.r * .35, cy - 2, o.r * .7, 4); ctx.restore();
    } else if (o.k === 'pent') {
      const hz = o.hz, top = shade(roof, 1.12);
      ibox(X, Y, o.w, o.h, ht, hz, top, shade(b.wall, .95), shade(b.wall, .6));
      const q = [isoXY(X, Y, ht + hz), isoXY(X + o.w, Y, ht + hz), isoXY(X + o.w, Y + o.h, ht + hz), isoXY(X, Y + o.h, ht + hz)];
      iline(q[0], q[1], shade(roof, 1.4)); iline(q[0], q[3], shade(roof, 1.4)); iline(q[3], q[2], shade(roof, 1.9)); iline(q[2], q[1], shade(roof, 1.65));
      iline(isoXY(X, Y + o.h, ht + 1), isoXY(X + o.w, Y + o.h, ht + 1), shade(b.wall, .5)); iline(isoXY(X + o.w, Y + o.h, ht + 1), isoXY(X + o.w, Y, ht + 1), shade(b.wall, .35));
      const wc = ['#ffd890', '#ffe7b0', '#9fd8ff', '#ffc070'];
      for (let u = 8; u < o.w - 4; u += 12) { const on = rr() < b.lit * litK * 1.2, c = wc[(rr() * 4) | 0]; iwin(isoXY(X + u, Y + o.h, ht + hz * .55), .5, on ? c : shade(b.wall, .55)); if (on && rr() < .3) fx.glow.push({ x: X + u, y: Y + o.h, z: ht + hz * .55, r: 6, col: c, a: .3 }); }
      for (let v = 8; v < o.h - 4; v += 12) { const on = rr() < b.lit * litK * 1.2, c = wc[(rr() * 4) | 0]; iwin(isoXY(X + o.w, Y + v, ht + hz * .55), -.5, on ? shade(c, .8) : shade(b.wall, .38)); }
      iline(isoXY(X + o.w, Y + o.h, ht), isoXY(X + o.w, Y + o.h, ht + hz), shade(b.wall, 1.25));
      if (b.trim !== null && d === 2) { const col = pal[b.trim]; for (let i = 0; i < 4; i++) iline(q[i], q[(i + 1) % 4], col); }
      { const f = isoXY(X + o.w * .3, Y + o.h * .4, ht + hz); iellipse(f[0], f[1], 3, 1.5, shade(roof, .7)); const g = isoXY(X + o.w * .7, Y + o.h * .6, ht + hz); ctx.fillStyle = shade(roof, 1.9); ctx.fillRect(Math.round(g[0]), Math.round(g[1]) - 2, 2, 2); }
    } else if (o.k === 'ac') {
      ibox(X, Y, o.w, o.h, ht, 7, metal[0], metal[1], metal[2]);
      const f = isoXY(cx, cy, ht + 7); iellipse(f[0], f[1], 3.4, 1.7, '#22252e'); ipx(f[0], f[1], '#4a4f5c');
      const g = isoXY(X + 3, Y + o.h, ht + 3); ctx.fillStyle = '#2a2d38'; for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(g[0]) + i * 2, Math.round(g[1]) + i, 1, 1);
      if (o.s < .3) { const q = isoXY(X + o.w, cy, ht); ctx.fillStyle = '#e0b020'; ctx.fillRect(Math.round(q[0]) - 2, Math.round(q[1]) - 3, 1, 1); }
    } else if (o.k === 'hut') {
      ibox(X, Y, o.w, o.h, ht, 16, shade(roof, 1.75), mix(shade(b.wall, 1.25), '#8a7a70', .35), mix(shade(b.wall, .8), '#4a3e3c', .35));
      const dp = isoXY(X + o.w * .5, Y + o.h, ht); ctx.fillStyle = '#0d0b0e'; ctx.fillRect(Math.round(dp[0]) - 1, Math.round(dp[1]) - 4, 3, 4); ctx.fillStyle = '#ffe9b8'; ctx.fillRect(Math.round(dp[0]), Math.round(dp[1]) - 6, 1, 1);
      fx.glow.push({ x: X + o.w * .5, y: Y + o.h, z: ht + 22, r: 5, col: '#ffd9a0', a: .5 });
    } else if (o.k === 'sky') {
      const q = [isoXY(X, Y, ht), isoXY(X + o.w, Y, ht), isoXY(X + o.w, Y + o.h, ht), isoXY(X, Y + o.h, ht)], on = o.s < b.lit * litK * 1.5, wc = ['#ffd890', '#ffe7b0', '#9fd8ff', '#ffc070'][o.c];
      ipoly(q, on ? mix('#18202e', wc, .62) : '#161c28'); for (let i = 0; i < 4; i++) iline(q[i], q[(i + 1) % 4], shade(roof, 1.9));
      iline(isoXY(cx, Y, ht), isoXY(cx, Y + o.h, ht), shade(roof, 1.9));
      if (on) fx.glow.push({ x: cx, y: cy, z: ht, r: 9, col: wc, a: .28 });
    } else if (o.k === 'tank') {
      const p = isoXY(cx, cy, ht), c = pxCanvas('tank' + (d === 2 ? 's' : 'w'), ROOF_ART.tank, d === 2 ? ROOF_PAL.steel : ROOF_PAL.wood, '#08080d');
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(Math.round(p[0]) - 3, Math.round(p[1]), 9, 2);
      ctx.drawImage(c, Math.round(p[0]) - 6, Math.round(p[1]) - 14);
    } else if (o.k === 'dish') {
      const p = isoXY(cx, cy, ht), c = pxCanvas('dish', ROOF_ART.dish, ROOF_PAL.dish, '#08080d'); ctx.drawImage(c, Math.round(p[0]) - 4, Math.round(p[1]) - 7);
    } else if (o.k === 'vent') {
      const p = isoXY(cx, cy, ht), PX = Math.round(p[0]), PY = Math.round(p[1]);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(PX + 1, PY, 2, 1); ctx.fillStyle = '#5c616e'; ctx.fillRect(PX, PY - 2, 1, 3); ctx.fillStyle = '#9ba0ad'; ctx.fillRect(PX - 1, PY - 3, 3, 1); ctx.fillStyle = '#c9cdd6'; ctx.fillRect(PX - 1, PY - 3, 1, 1);
      if (o.s < .55) fx.steam.push({ x: cx, y: cy, s: o.s * 40 });
    } else if (o.k === 'mast') {
      const p = isoXY(cx, cy, ht), PX = Math.round(p[0]), PY = Math.round(p[1]), hh = 9 + ((o.s * 5) | 0);
      ctx.fillStyle = '#5a5f6c'; ctx.fillRect(PX, PY - hh, 1, hh); ctx.fillRect(PX - 2, PY - hh + 3, 5, 1); ctx.fillRect(PX - 1, PY - hh + 6, 3, 1); ctx.fillStyle = '#2a2d38'; ctx.fillRect(PX - 1, PY - 1, 3, 1);
      fx.beacons.push({ x: cx, y: cy, hh });
    } else if (o.k === 'tarp') {
      const tc = ['#2a6aa8', '#2e8a5a', '#b8662a', '#3a78b8'][o.c];
      ibox(X, Y, o.w, o.h, ht, 7, tc, shade(tc, .7), shade(tc, .5));
      iline(isoXY(X, Y + o.h * .5, ht + 7), isoXY(X + o.w, Y + o.h * .5, ht + 7), shade(tc, 1.3));
      const q = isoXY(X + o.w - 4, Y + o.h, ht); ctx.fillStyle = '#0d0b0e'; ctx.fillRect(Math.round(q[0]) - 2, Math.round(q[1]) - 3, 2, 3);
    } else if (o.k === 'line') {
      const a = isoXY(X, cy, ht), c = isoXY(X + o.w, cy, ht), cols = ['#e8e8f0', '#d04a4a', '#e0b020', '#4a8ad0', '#e8e8f0', '#c85aa0'];
      for (const p of [a, c]) { ctx.fillStyle = '#4a4e5a'; ctx.fillRect(Math.round(p[0]), Math.round(p[1]) - 6, 1, 6); }
      iline([a[0], a[1] - 6], [c[0], c[1] - 6], '#2e3038');
      const n = Math.round(c[0] - a[0]); for (let i = 2, k = (o.c | 0); i < n - 1; i += 3, k++) { ctx.fillStyle = cols[k % cols.length]; ctx.fillRect(Math.round(a[0]) + i, Math.round(lerp(a[1], c[1], i / n)) - 5, 2, 2 + (k & 1)); }
    } else if (o.k === 'solar') {
      const q = [isoXY(X, Y, ht + 2), isoXY(X + o.w, Y, ht + 2), isoXY(X + o.w, Y + o.h, ht + 2), isoXY(X, Y + o.h, ht + 2)];
      ipoly(q.map(p => [p[0], p[1] + 1]), '#0a0c12'); ipoly(q, '#1a2c52');
      for (let u = 6; u < o.w; u += 6) iline(isoXY(X + u, Y, ht + 2), isoXY(X + u, Y + o.h, ht + 2), '#35548e');
      iline(isoXY(X, cy, ht + 2), isoXY(X + o.w, cy, ht + 2), '#35548e'); iline(q[0], q[1], '#5a7cc0');
    } else if (o.k === 'bill') {
      const p = isoXY(cx, cy, ht), dims = { pic: [13, 13], txt: [21, 11], both: [25, 13] }[o.kind], SX = Math.round(p[0]) - (dims[0] >> 1), SY = Math.round(p[1]) - dims[1] - 4;
      signPanel(o, pal, SX, SY, false);
      const lit = document.createElement('canvas'); lit.width = dims[0]; lit.height = dims[1];
      const keep = ctx; ctx = lit.getContext('2d'); try { signPanel(o, pal, 0, 0, true); } finally { ctx = keep; }
      fx.bills.push({ x: cx, y: cy, dx: -(dims[0] >> 1), dy: -dims[1] - 4, w: dims[0], h: dims[1], cv: lit, col: pal[o.ci], mode: o.mode, ph: o.ph });
    }
  }
  if (b.trim !== null) {
    const col = pal[b.trim]; for (let i = 0; i < 4; i++) iline(T[i], T[(i + 1) % 4], col);
    fx.glow.push({ x: (x0 + x1) / 2, y: y1, z: ht, r: 22, col, a: .3 }, { x: x1, y: (y0 + y1) / 2, z: ht, r: 18, col, a: .25 });
  }
}

/* ---------- walls ----------
   Walls are painted pixel by pixel into the stamp. A wall pixel is addressed as (column along the wall, row above the
   ground): S for the south wall (left face, columns run west to east), E for the east wall (right face, columns run from
   the front corner back). Each district has its own facade: Ground Zero concrete with a ledge over the ground floor and
   a cornice, the Slums brick under a tin edge, the Tower glass ribbons with a lit crown. */
function wallGeo(b) {
  const a = isoXY(b.x, b.y + b.h, 0), ax = Math.round(a[0]), ay = Math.round(a[1]), nS = b.w >> 1, nE = b.h >> 1, cx = ax + nS, cy = ay + (nS >> 1);
  return { ax, ay, cx, cy, nS, nE, nR: Math.round(b.ht * ISO_KZ), S: (i, j) => [ax + i, ay - 1 + ((i + 1) >> 1) - j], E: (i, j) => [cx + i, cy - 1 - ((i + 1) >> 1) - j] };
}
// one window: 3 wide, 3 tall, a sill under it. v is the window's own roll, used for variety.
function winPixels(put, W, side, ic, jc, lit, c, wall, v, glass) {
  if (glass) {   // Tower: a lit stretch of the glass ribbon, no sill
    if (lit) for (let k = -2; k <= 2; k++) { put(W(ic + k, jc + 1), c); put(W(ic + k, jc), k === 0 ? shade(c, .82) : c); put(W(ic + k, jc - 1), shade(c, .82)); }
    return;
  }
  if (lit) {
    const top = v < .3 ? mix(c, wall, .45) : c, low = shade(c, .86);   // some blinds are half down
    for (let k = -1; k <= 1; k++) { put(W(ic + k, jc + 1), top); put(W(ic + k, jc), c); put(W(ic + k, jc - 1), low); }
    if (v > .93) put(W(ic, jc - 1), shade(c, .35));                      // somebody at the window
  } else {
    const pane = shade(wall, side === 0 ? .55 : .38);
    for (let k = -1; k <= 1; k++) for (let r = -1; r <= 1; r++) put(W(ic + k, jc + r), pane);
    if (side === 0) put(W(ic - 1, jc + 1), shade(wall, .8));             // a glint on the glass
  }
  for (let k = -1; k <= 1; k++) put(W(ic + k, jc - 2), shade(wall, side === 0 ? 1.2 : .78));   // sill
}
const BLD_TAGS = [['#..#.', '#.#.#', '.#..#'], ['.##..', '#..#.', '#.###'], ['#.#.#', '.#.#.', '#...#'], ['##.#.', '#.##.', '#..##']];
function paintBuilding(b, st) {
  const x0 = b.x, y0 = b.y, x1 = b.x + b.w, y1 = b.y + b.h, ht = b.ht, d = b.d, wall = b.wall;
  const pal = neonPal(d), litK = st === 'liberated' ? 1.35 : st === 'dominated' ? .75 : 1;
  const fx = { flick: [], glow: [], steam: [], bills: [], beacons: [], blades: [] };
  const g = wallGeo(b), { S, E, nS, nE, nR } = g, cw = ctx.canvas.width, ch = ctx.canvas.height, img = ctx.createImageData(cw, ch), data = img.data;
  const rr = mulberry(hash2(b.x * 3 + 17, b.y * 5 + 29));
  const setRGB = (X, Y, c, k) => { if (X < 0 || Y < 0 || X >= cw || Y >= ch) return; const o = (Y * cw + X) * 4; data[o] = Math.min(255, c[0] * k); data[o + 1] = Math.min(255, c[1] * k); data[o + 2] = Math.min(255, c[2] * k); data[o + 3] = 255; };
  const put = (p, hex) => setRGB(p[0], p[1], rgb(hex), 1);
  const glassD = side => mix(wall, '#0a1030', side ? .68 : .55);
  // which rows carry windows (the Tower's glass ribbons follow them)
  const winRows = new Set(); for (const wn of b.win[2]) if (!(wn.v * ht < 34 || Math.round(wn.v * ht / 15) % 2)) winRows.add(Math.round(wn.v * ht * ISO_KZ));
  // ---- the bare walls, row by row
  const floors = new Set(); for (let f = 30; f < ht - 6; f += 30) floors.add(Math.round(f * ISO_KZ));
  const tin = [rgb('#615c68'), rgb('#3f3b46')];
  for (let side = 0; side < 2; side++) {
    const n = side ? nE : nS, W = side ? E : S, base = rgb(shade(wall, side ? .6 : .95)), gl = rgb(glassD(side));
    for (let j = 0; j <= nR; j++) {
      let rk = 1, ribbon = false;
      if (j === 0) rk = side ? .58 : .52;
      else if (d === 2) { if (winRows.has(j) || winRows.has(j - 1) || winRows.has(j + 1)) ribbon = true; else if (winRows.has(j - 2)) rk = 1.28; else if (j >= nR - 1) rk = 1.4; else if (j <= 6) rk = .82; }
      else {
        if (j <= 6) rk = .88; else if (floors.has(j)) rk = side ? .84 : .82;
        if (d === 0) { if (j === 7) rk = 1.2; if (j >= nR - 1) rk = 1.24; else if (j === nR - 2) rk = .72; }
        if (d === 1 && j > 0 && !(j & 1)) rk *= .93;
      }
      for (let i = 0; i < n; i++) {
        const p = W(i, j); let k = rk, c = base;
        if (ribbon) { c = gl; k = (i % 7 === 3) ? 1.7 : 1; }
        else if (d === 1) { if (j >= nR - 1) { c = tin[i & 1]; k = side ? .75 : 1; } else { const v = hash2((i >> 2) + side * 91 + b.x, (j >> 1) + b.y) % 100; if (v < 9) k *= 1.13; else if (v > 91) k *= .86; } }
        if (!side && i === n - 1) k *= 1.25; else if (!side && i === 0) k *= .5; else if (side && i === 0) k *= 1.12;
        setRGB(p[0], p[1], c, k);
      }
    }
  }
  // ---- windows
  const glass = d === 2;
  for (const [ws, list] of [[2, b.win[2]], [1, b.win[1]]]) for (const wn of list) {
    if (wn.v * ht < 34 || Math.round(wn.v * ht / 15) % 2) continue;
    const side = ws === 2 ? 0 : 1, W = side ? E : S, n = side ? nE : nS, ic = clamp(Math.round(n * (1 - wn.u) - .5), 2, n - 3), jc = Math.round(wn.v * ht * ISO_KZ);
    if (jc + 2 > nR - (d === 0 ? 2 : 1)) continue;
    const on = wn.roll < b.lit * litK, wx = side ? x1 : lerp(x1, x0, wn.u), wy = side ? lerp(y0, y1, wn.u) : y1, wz = wn.v * ht;
    const lc0 = st === 'dominated' && wn.roll < .1 ? '#ff4a3a' : wn.c, lc = side ? shade(lc0, .8) : lc0, vv = (wn.roll * 7919) % 1;
    winPixels(put, W, side, ic, jc, on, lc, wall, vv, glass);
    if (wn.roll > .97) fx.flick.push({ side, ic, jc, u: wn.u, lit: !on, c: lc, v: vv });   // the odd window that switches on and off
    if (on && wn.roll < .08) fx.glow.push({ x: wx, y: wy, z: wz, r: 6, col: lc0, a: .3 });
    // an air conditioner hanging under the odd window
    if (!glass && (hash2(ic + b.x, jc * 7 + b.y + side) % 100) < (d === 1 ? 14 : 7) && jc > 9) { put(W(ic, jc - 3), side ? '#7c8290' : '#aab0bc'); put(W(ic + 1, jc - 3), side ? '#565b68' : '#7c8290'); put(W(ic, jc - 4), shade(wall, side ? .45 : .7)); }
  }
  // ---- drainpipes, fire escape
  if (d !== 2) {
    for (let j = 1; j < nR - 1; j++) { put(S(2, j), shade(wall, j % 8 === 4 ? .8 : .5)); if (nE > 20) put(E(nE - 3, j), shade(wall, j % 8 === 4 ? .55 : .36)); }
    if (nS >= 40 && nR >= 18 && (hash2(b.x + 5, b.y + 9) % 3) === 0) {
      const c0 = 6 + (hash2(b.x, b.y + 3) % Math.max(1, nS - 22)), fl = [...floors].filter(j => j > 7 && j < nR - 4).sort((p, q) => p - q), iron = '#15161d', rail = '#3d414e';
      fl.forEach((j, k) => {
        for (let i = 0; i < 11; i++) { put(S(c0 + i, j), iron); if (i % 2 === 0) put(S(c0 + i, j + 1), rail); put(S(c0 + i, j + 2), rail); }
        if (k < fl.length - 1) { const j2 = fl[k + 1], nn = j2 - j; for (let q = 0; q <= nn; q++) { const i = k % 2 ? 9 - Math.round(q * 8 / nn) : 1 + Math.round(q * 8 / nn); put(S(c0 + i, j + q), iron); } }
      });
      if (fl.length) for (let j = 2; j < fl[0]; j += 2) put(S(c0 + 1, j), iron);   // the drop ladder
    }
  }
  // ---- street level: posters and tags on bare stretches of wall
  const busyS = [], busyE = [];
  // ---- door
  if (b.door) {
    const mc = nS >> 1, dh = clamp(Math.round(Math.min(ht - 4, 28) * ISO_KZ), 4, 7);
    for (let i = -4; i <= 3; i++) for (let j = 0; j <= dh; j++) put(S(mc + i, j), i === -4 || i === 3 || j === dh ? '#0b0a0d' : j === dh - 1 ? '#fff0c8' : i === -1 || i === 0 ? (j === 0 ? '#8a6a3a' : '#b88f55') : '#e0b878');
    for (let i = -5; i <= 4; i++) put(S(mc + i, dh + 1), shade(wall, 1.35));           // canopy
    put(S(mc - 1, 2), '#2a2018'); put(S(mc, 2), '#2a2018');                          // handles
    busyS.push([mc - 6, mc + 5]);
    fx.glow.push({ x: (x0 + x1) / 2, y: y1, z: 4, r: 8, col: '#ffd696', a: .5 });
  }
  // ---- ground-floor shopfronts: plinth, lit glass with goods, striped awning, sign band
  for (const sh of b.shops) {
    if (sh.side !== 2 && sh.side !== 1) continue;
    const side = sh.side === 2 ? 0 : 1, W = side ? E : S, n = side ? nE : nS, col = pal[sh.ci], dk = side ? .76 : 1;
    const i0 = clamp(Math.round(n * (1 - sh.u1)), 1, n - 4), i1 = clamp(Math.round(n * (1 - sh.u0)) - 1, i0 + 3, n - 2), doorAt = i0 + 2 + (hash2(b.x + i0, b.y + side) % Math.max(1, i1 - i0 - 4));
    (side ? busyE : busyS).push([i0 - 1, i1 + 1]);
    const glassC = shade(mix('#ffe6b0', col, .18), dk);
    for (let i = i0; i <= i1; i++) {
      const edge = i === i0 || i === i1, mull = (i - i0) % 5 === 0, door = i === doorAt || i === doorAt + 1;
      put(W(i, 0), shade(wall, side ? .3 : .4));
      for (let j = 1; j <= 3; j++) put(W(i, j), edge || (mull && !door) ? '#1c1a20' : door ? (j === 3 ? glassC : shade('#3a3038', dk)) : j === 1 && (hash2(i * 3 + b.x, b.y + side * 5) % 100) < 42 ? shade(glassC, .55) : j === 3 ? shade(glassC, 1.08) : glassC);
      // awning in the shop's colour with darker stripes, then the neon tube over it: the bright line the street is lit by
      const stripe = d === 2 || (i - i0) % 3 ? col : shade(col, .62);
      put(W(i, 4), shade(stripe, dk * .9)); if (d !== 2) put(W(i, 5), shade(stripe, dk * .6));
      const sj = d === 2 ? 5 : 6, gap = edge || (hash2((i - i0) * 5 + sh.ci, b.x + b.y + side) % 9) === 0;
      put(W(i, sj), '#121018'); put(W(i, sj + 1), gap ? '#121018' : (i - i0) % 3 === 1 ? '#ffffff' : mix(col, '#ffffff', side ? .25 : .45)); put(W(i, sj + 2), '#121018');
    }
    const um = (sh.u0 + sh.u1) / 2; fx.glow.push(side ? { x: x1, y: lerp(y0, y1, um), z: 11, r: 16, col, a: .45 } : { x: lerp(x1, x0, um), y: y1, z: 11, r: 16, col, a: .45 });
  }
  // posters and tags where nothing else is
  if (d !== 2) for (let side = 0; side < 2; side++) {
    const n = side ? nE : nS, W = side ? E : S, busy = side ? busyE : busyS, clear = (a, c) => !busy.some(q => a <= q[1] && c >= q[0]);
    for (let i = 5; i < n - 9; i += 9 + ((rr() * 8) | 0)) {
      if (!clear(i, i + 6)) continue; const roll = rr();
      if (roll < (d === 1 ? .5 : .25)) { const tg = BLD_TAGS[(rr() * 4) | 0], tc = shade([pal[(rr() * 4) | 0], '#e8ecf4', '#3ac2dc'][(rr() * 3) | 0], side ? .55 : .8); tg.forEach((row, k) => { for (let q = 0; q < row.length; q++) if (row[q] === '#') put(W(i + q, 4 - k), tc); }); }
      else if (roll < (d === 1 ? .6 : .55)) for (let q = 0; q < 2 + ((rr() * 2) | 0); q++) { const pc = shade(['#e6dcc0', '#d86a7a', '#6aa8d8', '#e0c050'][(rr() * 4) | 0], side ? .5 : .78); for (let a = 0; a < 2; a++) for (let c = 2; c <= 4; c++) put(W(i + q * 3 + a, c), c === 4 ? shade(pc, 1.15) : pc); }
    }
  }
  // ---- backing boards for the horizontal neon signs, boards for the blade signs
  ctx.putImageData(img, 0, 0);
  for (const sg of b.signs) {
    if (sg.side !== 2 && sg.side !== 1) continue;
    const side = sg.side === 2 ? 0 : 1, W = side ? E : S, n = side ? nE : nS, col = pal[sg.ci];
    if (sg.u2 !== sg.u) continue;                                                     // horizontal ones are plain tubes, drawn live
    const ic = clamp(Math.round(n * (1 - sg.u)), 3, n - 4), j1 = Math.min(nR - 2, Math.round(sg.v1 * ht * ISO_KZ)), hh = clamp(j1 - Math.round(sg.v0 * ht * ISO_KZ), 9, 19), cells = Math.floor((hh - 1) / 4), bh = cells * 4 + 1;
    const p = W(ic, j1), X = p[0] - 2, Y = p[1], seed = mulberry(hash2(b.x + ic * 7, b.y + j1 * 3 + side));
    const lit = document.createElement('canvas'); lit.width = 5; lit.height = bh; const lg = lit.getContext('2d');
    ctx.fillStyle = '#07070c'; ctx.fillRect(X - 1, Y - 1, 7, bh + 2); ctx.fillStyle = '#2c2f3a'; ctx.fillRect(X, Y, 5, bh); ctx.fillStyle = '#0e0d12'; ctx.fillRect(X + 1, Y + 1, 3, bh - 2);
    ctx.fillStyle = '#3a3e4a'; ctx.fillRect(X + (side ? -2 : 5), Y + 1, 2, 1); ctx.fillRect(X + (side ? -2 : 5), Y + bh - 2, 2, 1);   // brackets
    const tube = mix(col, '#ffffff', .25);
    for (let c = 0; c < cells; c++) { let bits = (seed() * 512) | 0; if ((bits & 0x1ff) === 0) bits = 0x1b6; for (let q = 0; q < 9; q++) if (bits >> q & 1) { ctx.fillStyle = '#34303a'; ctx.fillRect(X + 1 + q % 3, Y + 1 + c * 4 + (q / 3 | 0), 1, 1); lg.fillStyle = tube; lg.fillRect(1 + q % 3, 1 + c * 4 + (q / 3 | 0), 1, 1); } }
    fx.blades.push({ side, ic, j1, cv: lit, h: bh, col, blink: sg.blink, ph: sg.ph });
  }
  paintRoof(b, st, fx, pal, litK);
  // the tower's lit corner
  if (d === 2 && b.trim !== null) { const col = pal[b.trim]; ctx.fillStyle = col; for (let j = 1; j < nR; j++) { const p = S(nS - 1, j); ctx.fillRect(p[0], p[1], 1, 1); } fx.glow.push({ x: x1, y: y1, z: ht * .5, r: 14, col, a: .22 }); }
  return fx;
}

/* ---------- stamp + live parts ---------- */
function drawIsoBuilding(b) {
  const st = DS[b.d].status, a = isoXY(b.x, b.y + b.h, 0), tp = isoXY(b.x, b.y, b.ht), X = Math.floor(a[0]) - BLD_PADX, Y = Math.floor(tp[1]) - BLD_PADT;
  if (!b._art || b._art.st !== st) {
    const cvs = (b._art && b._art.cv) || document.createElement('canvas');
    cvs.width = Math.ceil((b.w + b.h) * ISO_K) + BLD_PADX * 2 + 1; cvs.height = Math.ceil((b.w + b.h) * ISO_K / 2 + b.ht * ISO_KZ) + BLD_PADT + 3;
    const keep = ctx, ox = ISO.ox, oy = ISO.oy; ISO.ox -= X; ISO.oy -= Y; ctx = cvs.getContext('2d');
    let fx; try { fx = paintBuilding(b, st); } finally { ctx = keep; ISO.ox = ox; ISO.oy = oy; }
    b._art = { st, cv: cvs, fx };
  }
  ctx.drawImage(b._art.cv, X, Y);
  const fx = b._art.fx, t = G.time, pal = neonPal(b.d), x0 = b.x, y0 = b.y, x1 = b.x + b.w, y1 = b.y + b.h, ht = b.ht;
  const g = fx.flick.length || fx.blades.length ? wallGeo(b) : null, lput = (p, c) => { ctx.fillStyle = c; ctx.fillRect(p[0], p[1], 1, 1); };
  for (const f of fx.flick) if (Math.sin(t * .7 + f.u * 50) > .6) winPixels(lput, f.side ? g.E : g.S, f.side, f.ic, f.jc, f.lit, f.c, b.wall, f.v, b.d === 2);
  for (const q of fx.glow) { const p = isoXY(q.x, q.y, q.z); iglow(p[0], p[1], q.r, q.col, q.a); }
  // neon on the walls: blade signs are stamped lit, horizontal tubes are drawn
  for (const s of fx.blades) {
    const on = s.blink ? (Math.sin(t * 3 + s.ph) > -.2 ? 1 : .15) : 1, p = (s.side ? g.E : g.S)(s.ic, s.j1);
    ctx.globalAlpha = on; ctx.drawImage(s.cv, p[0] - 2, p[1]); ctx.globalAlpha = 1; iglow(p[0] + .5, p[1] + s.h / 2, 6 + s.h * .9, s.col, .5 * on);
  }
  for (const sg of b.signs) {
    if ((sg.side !== 2 && sg.side !== 1) || sg.u2 === sg.u) continue;
    const on = sg.blink ? (Math.sin(t * 3 + sg.ph) > -.2 ? 1 : .15) : 1, col = pal[sg.ci];
    const Pt = (u, v) => sg.side === 2 ? isoXY(lerp(x1, x0, u), y1, v * ht) : isoXY(x1, y0 + b.h * u, v * ht);
    const a2 = Pt(sg.u, sg.v0), c = Pt(sg.u2, sg.v1);
    iline([a2[0], a2[1] - 1], [c[0], c[1] - 1], '#0e0d12'); iline([a2[0], a2[1] + 2], [c[0], c[1] + 2], '#0e0d12');
    ctx.globalAlpha = on; iline(a2, c, col); iline([a2[0], a2[1] + 1], [c[0], c[1] + 1], col);
    const n = Math.max(1, Math.round(Math.hypot(c[0] - a2[0], c[1] - a2[1]) / 3));
    for (let i = 0; i <= n; i += 2) ipx(lerp(a2[0], c[0], i / n), lerp(a2[1], c[1], i / n), '#ffffff');
    ctx.globalAlpha = 1; iglow((a2[0] + c[0]) / 2, (a2[1] + c[1]) / 2, 24, col, .55 * on);
  }
  // roof: neon signs, beacons, steam
  for (const s of fx.bills) {
    const on = s.mode === 0 ? 1 : s.mode === 1 ? (Math.sin(t * 2.2 + s.ph) > -.35 ? 1 : 0) : (Math.sin(t * 1.1 + s.ph) > .9 && Math.sin(t * 37) > 0 ? 0 : 1);
    if (!on) continue;
    const p = isoXY(s.x, s.y, ht), SX = Math.round(p[0]) + s.dx, SY = Math.round(p[1]) + s.dy;
    ctx.drawImage(s.cv, SX, SY); iglow(SX + s.w / 2, SY + s.h / 2, s.w * .9, s.col, .42);
  }
  for (const m of fx.beacons) { const on = Math.sin(t * 2.4 + b.x + m.x) > 0, p = isoXY(m.x, m.y, ht), PX = Math.round(p[0]), PY = Math.round(p[1]) - m.hh - 1; ctx.fillStyle = on ? '#ff2a2a' : '#401010'; ctx.fillRect(PX, PY, 1, 2); if (on) iglow(PX + .5, PY + 1, 6, '#ff2a2a', .7); }
  for (const v of fx.steam) {
    const p = isoXY(v.x, v.y, ht);
    for (let k = 0; k < 3; k++) { const f = (t * .45 + k / 3 + v.s) % 1; ctx.fillStyle = `rgba(200,210,228,${(.34 * (1 - f)).toFixed(3)})`; ctx.fillRect(Math.round(p[0] + Math.sin(f * 5 + v.s + k) * 1.5 + f * 3), Math.round(p[1] - 4 - f * 10), f > .5 ? 2 : 1, f > .5 ? 2 : 1); }
  }
}
