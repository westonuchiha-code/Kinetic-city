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
  const fl = e.flash > 0, P3 = propFrame(e), H = 10, DECK = 34, RAIL = 44, ROOF = 54;
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
