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

/* ---------- walls ---------- */
function paintBuilding(b, st) {
  const x0 = b.x, y0 = b.y, x1 = b.x + b.w, y1 = b.y + b.h, ht = b.ht;
  const pal = neonPal(b.d), litK = st === 'liberated' ? 1.35 : st === 'dominated' ? .75 : 1;
  const fx = { flick: [], glow: [], steam: [], bills: [], beacons: [] };
  const S_ = shade(b.wall, .95), E_ = shade(b.wall, .6);
  const A = [isoXY(x0, y1, 0), isoXY(x1, y1, 0), isoXY(x1, y1, ht), isoXY(x0, y1, ht)];   // south wall
  const B = [isoXY(x1, y1, 0), isoXY(x1, y0, 0), isoXY(x1, y0, ht), isoXY(x1, y1, ht)];   // east wall
  ipoly(A, S_); ipoly(B, E_);
  // dark base and floor lines
  iline(isoXY(x0, y1, 2), isoXY(x1, y1, 2), shade(b.wall, .5)); iline(isoXY(x1, y1, 2), isoXY(x1, y0, 2), shade(b.wall, .35));
  for (let f = 30; f < ht - 6; f += 30) { iline(isoXY(x0, y1, f), isoXY(x1, y1, f), shade(b.wall, .8)); iline(isoXY(x1, y1, f), isoXY(x1, y0, f), shade(b.wall, .5)); }
  // windows (one row per floor; unlit ones are dark panes)
  for (const [side, list] of [[2, b.win[2]], [1, b.win[1]]]) for (const wn of list) {
    if (wn.v * ht < 34 || Math.round(wn.v * ht / 15) % 2) continue;
    const on = wn.roll < b.lit * litK, wx = side === 2 ? lerp(x1, x0, wn.u) : x1, wy = side === 2 ? y1 : lerp(y0, y1, wn.u), wz = wn.v * ht;
    const lc = st === 'dominated' && wn.roll < .1 ? '#ff4a3a' : wn.c, dc = shade(b.wall, side === 2 ? .55 : .38), slope = side === 2 ? .5 : -.5;
    iwin(isoXY(wx, wy, wz), slope, on ? (side === 1 ? shade(lc, .8) : lc) : dc);
    if (wn.roll > .97) fx.flick.push({ x: wx, y: wy, z: wz, slope, u: wn.u, on, alt: on ? dc : (side === 1 ? shade(lc, .8) : lc) });   // the odd window that switches on and off
    if (on && wn.roll < .08) fx.glow.push({ x: wx, y: wy, z: wz, r: 6, col: lc, a: .3 });
  }
  // door
  if (b.door) {
    const dx = (x0 + x1) / 2, dh = Math.min(ht - 4, 28);
    ipoly([isoXY(dx - 8, y1, 0), isoXY(dx + 8, y1, 0), isoXY(dx + 8, y1, dh), isoXY(dx - 8, y1, dh)], '#0b0a0d');
    ipoly([isoXY(dx - 5, y1, 0), isoXY(dx + 5, y1, 0), isoXY(dx + 5, y1, dh - 4), isoXY(dx - 5, y1, dh - 4)], '#e0b878');
    iline(isoXY(dx - 10, y1, dh + 2), isoXY(dx + 10, y1, dh + 2), shade(b.wall, .4));
    fx.glow.push({ x: dx, y: y1, z: 4, r: 8, col: '#ffd696', a: .5 });
  }
  // ground-floor shopfronts
  for (const sh of b.shops) {
    if (sh.side !== 2 && sh.side !== 1) continue;
    const col = pal[sh.ci], top = Math.min(ht - 3, 22);
    const W3 = (u, z) => sh.side === 2 ? [lerp(x1, x0, u), y1, z] : [x1, lerp(y0, y1, u), z], Pt = (u, z) => isoXY(...W3(u, z));
    ipoly([Pt(sh.u0, 2), Pt(sh.u1, 2), Pt(sh.u1, top), Pt(sh.u0, top)], sh.side === 2 ? col : shade(col, .75));
    iline(Pt(sh.u0, top * .55), Pt(sh.u1, top * .55), '#ffffff');
    iline(Pt(sh.u0 - .02, top + 4), Pt(sh.u1 + .02, top + 4), shade(col, .45));   // awning
    const m = W3((sh.u0 + sh.u1) / 2, top / 2); fx.glow.push({ x: m[0], y: m[1], z: m[2], r: 16, col, a: .45 });
  }
  paintRoof(b, st, fx, pal, litK);
  // edges: dark far-left edge, bright front corner
  iline(A[0], A[3], shade(b.wall, .45)); iline(A[1], A[2], shade(b.wall, 1.25));
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
  for (const f of fx.flick) if (Math.sin(t * .7 + f.u * 50) > .6) iwin(isoXY(f.x, f.y, f.z), f.slope, f.alt);
  for (const g of fx.glow) { const p = isoXY(g.x, g.y, g.z); iglow(p[0], p[1], g.r, g.col, g.a); }
  // neon signs on the walls
  for (const sg of b.signs) {
    if (sg.side !== 2 && sg.side !== 1) continue;
    const on = sg.blink ? (Math.sin(t * 3 + sg.ph) > -.2 ? 1 : .15) : 1, col = pal[sg.ci];
    const Pt = (u, v) => sg.side === 2 ? isoXY(lerp(x1, x0, u), y1, v * ht) : isoXY(x1, y0 + b.h * u, v * ht);
    const a2 = Pt(sg.u, sg.v0), c = Pt(sg.u2, sg.v1);
    ctx.globalAlpha = on; iline(a2, c, col); iline([a2[0] + 1, a2[1]], [c[0] + 1, c[1]], col);
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
