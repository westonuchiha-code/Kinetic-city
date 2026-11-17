/* ============================== 11i STREET ============================== */
/* The ground as pixel art. Each city cell (one block plus the road to its west and north) is painted once into a small
   canvas with the crisp primitives (ipoly, iline) and stamped every frame, like the buildings; only the things that
   change stay live (boss ring, wet sheen, scorch marks). Every district has its own street: Ground Zero plain asphalt
   with yellow dashes, the Slums cracked, patched and potholed with worn paint, the Tower clean with lit lane studs and
   neon kerbs. Also here: street lamps, trees and traffic lights. */
const GND = new Map(); let _gndCity = null, _gndBudget = 0;
const GND_PAD = 2, GND_KEEP = 32, GND_PER_FRAME = 3;
const gR = (x, y, w, h, c) => ipoly([isoXY(x, y, 0), isoXY(x + w, y, 0), isoXY(x + w, y + h, 0), isoXY(x, y + h, 0)], c);
const gPx = (x, y, c) => { const p = isoXY(x, y, 0); ipx(p[0], p[1], c); };

function paintGroundCell(kx, ky) {
  const X0 = kx * BAND, Y0 = ky * BAND, X1 = Math.min(X0 + BAND, WORLD_W), Y1 = Math.min(Y0 + BAND, WORLD_H);
  const rnd = mulberry(hash2(kx * 131 + 7, ky * 197 + 3)), R = (a, b) => a + rnd() * (b - a);
  for (let q = 0; q < 3; q++) { const a = Math.max(X0, q === 0 ? 0 : DIST_SPLIT[q - 1]), b = Math.min(X1, q === 2 ? WORLD_W : DIST_SPLIT[q]); if (b > a) gR(a, Y0, b - a, Y1 - Y0, DIST[q].ground); }
  const d = districtAt(Math.min(X0 + 200, WORLD_W - 1)), D_ = DIST[d], g = D_.ground, blk = kx < BCOLS && ky < BROWS ? blocks[ky * BCOLS + kx] : null;
  const hasV = Y1 - Y0 > 96, hasH = X1 - X0 > 96;                 // does the road run on south / east of the crossing?
  const onRoad = (x, y) => x > X0 + 2 && y > Y0 + 2 && x < X1 - 2 && y < Y1 - 2 && (x - X0 < 94 || y - Y0 < 94);
  // ---- asphalt: grain, repair patches, cracks, potholes, manholes
  for (let i = 0; i < 170; i++) { const x = R(X0, X1), y = R(Y0, Y1); if (onRoad(x, y)) gPx(x, y, shade(g, rnd() < .5 ? 1.32 : .7)); }
  for (let i = 0, n = [3, 6, 1][d]; i < n; i++) {
    const along = rnd() < .5, l = R(14, 34), t = R(8, 16), x = along ? R(X0 + 100, X0 + 340) : R(X0 + 6, X0 + 88 - t), y = along ? R(Y0 + 6, Y0 + 88 - t) : R(Y0 + 100, Y0 + 340), w = along ? l : t, h = along ? t : l;
    if (x + w > X1 - 3 || y + h > Y1 - 3) continue;
    gR(x, y, w, h, shade(g, d === 1 ? .76 : .84)); gLine(x, y, x + w, y, shade(g, 1.18)); gLine(x, y, x, y + h, shade(g, 1.1));
  }
  for (let i = 0, n = [2, 7, 0][d]; i < n; i++) {
    let x = R(X0 + 6, X1 - 6), y = R(Y0 + 6, Y1 - 6), a = R(0, 6.28);
    for (let s = 0; s < 6; s++) { const nx = x + Math.cos(a) * R(5, 11), ny = y + Math.sin(a) * R(5, 11); if (!onRoad(x, y) || !onRoad(nx, ny)) break; gLine(x, y, nx, ny, shade(g, .5)); x = nx; y = ny; a += R(-.9, .9); }
  }
  if (d === 1) for (let i = 0; i < 3; i++) { const x = R(X0 + 10, X1 - 10), y = R(Y0 + 10, Y1 - 10), r = R(4, 8); if (!onRoad(x - r, y - r) || !onRoad(x + r, y + r)) continue; gDisc(x, y, r, '#09080c'); gDisc(x + 1, y + 1, r * .55, '#1a2230'); gPx(x - 1, y - 1, '#4a5a78'); }
  for (let i = 0; i < 2; i++) { const along = i === 0, x = along ? R(X0 + 130, X0 + 350) : X0 + (rnd() < .5 ? 24 : 72), y = along ? Y0 + (rnd() < .5 ? 24 : 72) : R(Y0 + 130, Y0 + 350); if (!onRoad(x - 6, y - 6) || !onRoad(x + 6, y + 6)) continue; gDisc(x, y, 5.5, shade(g, 1.75)); gDisc(x, y, 4, shade(g, .9)); gLine(x - 3, y, x + 3, y, shade(g, 1.5)); }
  // ---- paint: centre dashes and zebra crossings
  const dashC = d === 2 ? mix(g, '#f0f0f4', .45) : mix(g, '#ffcd6e', d === 1 ? .3 : .5), zebra = mix(g, '#eef0f6', d === 1 ? .2 : .32);
  if (hasH) for (let x = X0 + 96; x < X1; x += 32) { if (d === 1 && hash2(x, Y0) % 10 < 3) continue; gLine(x + 4, Y0 + 47, x + 20, Y0 + 47, dashC); gLine(x + 4, Y0 + 49, x + 20, Y0 + 49, dashC); }
  if (hasV) for (let y = Y0 + 96; y < Y1; y += 32) { if (d === 1 && hash2(X0, y) % 10 < 3) continue; gLine(X0 + 47, y + 4, X0 + 47, y + 20, dashC); gLine(X0 + 49, y + 4, X0 + 49, y + 20, dashC); if (d === 2) gPx(X0 + 48, y + 4, '#e8fbff'); }
  const bar = (x, y, w, h) => { if (x + w > X1 || y + h > Y1) return; if (d === 1 && hash2(x | 0, y | 0) % 10 < 2) return; gR(x, y, w, h, zebra); };
  for (let i = 0; i < 7; i++) {
    const o = 8 + i * 12;
    if (hasV) { bar(X0 + o, Y0 + 100, 6, 20); if (Y0 + BAND < WORLD_H) bar(X0 + o, Y0 + 360, 6, 20); }
    if (hasH) { bar(X0 + 100, Y0 + o, 20, 6); if (X0 + BAND < WORLD_W) bar(X0 + 360, Y0 + o, 20, 6); }
  }
  if (d === 2) {   // lit strips along the kerbs
    const c = shade(g, 1.3);
    if (hasH) { gLine(X0 + 100, Y0 + 4, X1 - 4, Y0 + 4, c); gLine(X0 + 100, Y0 + 92, X1 - 4, Y0 + 92, c); }
    if (hasV) { gLine(X0 + 4, Y0 + 100, X0 + 4, Y1 - 4, c); gLine(X0 + 92, Y0 + 100, X0 + 92, Y1 - 4, c); }
  }
  if (!blk) return;
  // ---- the block: pavement ring, kerb, crossings' warning strips, then whatever is inside
  const b = blk, side = D_.side, ix = b.x + TILE, iy = b.y + TILE, iw = b.w - TILE * 2;
  gR(b.x, b.y, b.w, b.h, side);
  for (let j = 0; j < 18; j++) for (let i = 0; i < 18; i++) {
    if (i > 1 && i < 16 && j > 1 && j < 16) continue;
    const v = hash2(b.x + i * 7, b.y + j * 13) % 100, worn = v < (d === 1 ? 20 : 8);
    if (worn || ((i + j) & 1)) gR(b.x + i * 16, b.y + j * 16, 16, 16, shade(side, worn ? (d === 1 ? .74 : .88) : 1.08));
  }
  const seam = shade(side, .68);
  for (let i = 1; i < 9; i++) { const o = i * TILE; gLine(b.x + o, b.y, b.x + o, b.y + TILE, seam); gLine(b.x + o, b.y + b.h - TILE, b.x + o, b.y + b.h, seam); gLine(b.x, b.y + o, b.x + TILE, b.y + o, seam); gLine(b.x + b.w - TILE, b.y + o, b.x + b.w, b.y + o, seam); }
  if (d === 1) for (let i = 0; i < 26; i++) { const e = (rnd() * 4) | 0, u = R(4, b.w - 4), v = R(3, 29), x = e < 2 ? b.x + u : (e === 2 ? b.x + v : b.x + b.w - v), y = e < 2 ? (e === 0 ? b.y + v : b.y + b.h - v) : b.y + u; gPx(x, y, rnd() < .4 ? '#2c4a2c' : rnd() < .5 ? '#6a6458' : '#3a3440'); }   // weeds and litter
  const tact = mix(side, '#e8b830', d === 1 ? .2 : .32);
  for (const o of [4, 264]) { gR(b.x + o, b.y + 1, 20, 5, tact); gR(b.x + o, b.y + b.h - 6, 20, 5, tact); gR(b.x + 1, b.y + o, 5, 20, tact); gR(b.x + b.w - 6, b.y + o, 5, 20, tact); }
  const kerb = mix(side, '#e6e8f0', d === 1 ? .22 : .36);
  gLine(b.x, b.y, b.x + b.w, b.y, kerb); gLine(b.x, b.y, b.x, b.y + b.h, kerb); gLine(b.x, b.y + b.h - 1, b.x + b.w, b.y + b.h - 1, kerb); gLine(b.x + b.w - 1, b.y, b.x + b.w - 1, b.y + b.h, kerb);
  gLine(b.x - 2, b.y + b.h + 2, b.x + b.w + 2, b.y + b.h + 2, shade(g, .55)); gLine(b.x + b.w + 2, b.y - 2, b.x + b.w + 2, b.y + b.h + 2, shade(g, .55));   // gutter shadow on the two near sides
  for (const [x, y] of [[b.x + 40, b.y - 4], [b.x + b.w - 46, b.y + b.h + 2], [b.x - 5, b.y + b.h - 46], [b.x + b.w + 2, b.y + 40]]) gR(x, y, 6, 3, '#07080b');   // drains
  const inner = shade(side, .74);
  gR(ix, iy, iw, iw, inner);
  if (b.kind === 'park') {
    const grass = shade(d === 1 ? '#161f15' : d === 2 ? '#0e2a22' : '#10281b', LIGHT.green), path = side;
    gR(ix, iy, iw, iw, grass);
    for (let i = 0; i < 110; i++) { const x = ix + R(2, iw - 2), y = iy + R(2, iw - 2), v = rnd(); gPx(x, y, v < .45 ? shade(grass, 1.45) : v < .8 ? shade(grass, .62) : shade(grass, 1.8)); if (v > .9) gPx(x + 2, y, shade(grass, 1.45)); }
    if (d === 1) for (let i = 0; i < 6; i++) gDisc(ix + R(14, iw - 14), iy + R(14, iw - 14), R(6, 12), '#1c1712');
    gR(ix + 3 * TILE, iy, TILE, iw, path); gR(ix, iy + 3 * TILE, iw, TILE, path);
    const pe = shade(path, 1.3);
    for (const o of [3 * TILE, 4 * TILE - 1]) for (const [a0, a1] of [[0, 3 * TILE], [4 * TILE, iw]]) { gLine(ix + o, iy + a0, ix + o, iy + a1, pe); gLine(ix + a0, iy + o, ix + a1, iy + o, pe); }
    for (let i = 1; i < 7; i++) { gLine(ix + 3 * TILE, iy + i * TILE, ix + 4 * TILE, iy + i * TILE, shade(path, .72)); gLine(ix + i * TILE, iy + 3 * TILE, ix + i * TILE, iy + 4 * TILE, shade(path, .72)); }
    const fl = d === 1 ? ['#8a8460'] : ['#ff8fb8', '#ffe08a', '#e8f0ff', '#9ad0ff'];
    for (let i = 0; i < (d === 1 ? 6 : 22); i++) { const q = (rnd() * 4) | 0, x = ix + (q & 1 ? 4 * TILE + 3 : 3) + R(0, 3 * TILE - 8), y = iy + (q & 2 ? 4 * TILE + 3 : 3) + R(0, 3 * TILE - 8); gPx(x, y, mix(grass, fl[(rnd() * fl.length) | 0], .8)); }
  } else if (b.kind === 'hide' || b.kind === 'boss') {
    gR(ix, iy, iw, iw, D_.plaza);
    for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) if ((i + j) & 1) gR(ix + i * TILE, iy + j * TILE, TILE, TILE, shade(D_.plaza, 1.09));
    const gl = mix(D_.plaza, '#ffffff', .07); for (let i = 1; i < 7; i++) { gLine(ix + i * TILE, iy, ix + i * TILE, iy + iw, gl); gLine(ix, iy + i * TILE, ix + iw, iy + i * TILE, gl); }
  } else if (b.kind === 'lot') {
    const a = '#15161d', wh = mix(a, '#dce2f0', .42); gR(ix, iy, iw, iw, a);
    for (let i = 0; i < 9; i++) gDisc(ix + R(14, iw - 14), iy + R(10, iw - 10), R(4, 8), shade(a, .72));               // oil stains
    for (let k = 0; k <= 7; k++) { gLine(ix + k * TILE, iy + 2, ix + k * TILE, iy + 64, wh); gLine(ix + k * TILE, iy + iw - 64, ix + k * TILE, iy + iw - 2, wh); }
    gLine(ix, iy + 65, ix + iw, iy + 65, wh); gLine(ix, iy + iw - 66, ix + iw, iy + iw - 66, wh);
    const yl = mix(a, '#ffcd6e', .4); for (let x = ix + 8; x < ix + iw - 14; x += 26) { gLine(x, iy + iw / 2, x + 12, iy + iw / 2, yl); gLine(x + 12, iy + iw / 2, x + 8, iy + iw / 2 - 4, yl); gLine(x + 12, iy + iw / 2, x + 8, iy + iw / 2 + 4, yl); }   // arrows along the aisle
  } else if (b.kind === 'court') {
    const cx = ix + iw / 2, cy = iy + iw / 2, floor = '#243a58', ln = mix(floor, '#e6ecfa', .6), key = mix(floor, '#c8503c', .55);
    gR(ix, iy, iw, iw, '#1c2a3e'); gR(ix + 10, iy + 26, iw - 20, iw - 52, floor);
    gR(ix + 10, cy - 24, 52, 48, key); gR(ix + iw - 62, cy - 24, 52, 48, key);
    const box = (x, y, w, h) => { gLine(x, y, x + w, y, ln); gLine(x + w, y, x + w, y + h, ln); gLine(x + w, y + h, x, y + h, ln); gLine(x, y + h, x, y, ln); };
    box(ix + 10, iy + 26, iw - 20, iw - 52); box(ix + 10, cy - 24, 52, 48); box(ix + iw - 62, cy - 24, 52, 48);
    gLine(cx, iy + 26, cx, iy + iw - 26, ln); gArc(cx, cy, 24, 0, TAU, ln);
    gArc(ix + 62, cy, 24, -Math.PI / 2, Math.PI / 2, ln); gArc(ix + iw - 62, cy, 24, Math.PI / 2, Math.PI * 1.5, ln);
    gArc(ix + 22, cy, 80, -1.15, 1.15, ln); gArc(ix + iw - 22, cy, 80, Math.PI - 1.15, Math.PI + 1.15, ln);
  } else if (b.kind === 'yard') {
    const dirt = '#231e1a'; gR(ix, iy, iw, iw, dirt);
    gR(ix + 96, iy + 120, 8, iw - 120, shade(dirt, .72)); gR(ix + 120, iy + 120, 8, iw - 120, shade(dirt, .72)); gR(ix, iy + 104, iw, 6, shade(dirt, .72));   // tyre tracks
    for (let i = 0; i < 90; i++) { const x = ix + R(2, iw - 2), y = iy + R(2, iw - 2), v = rnd(); gPx(x, y, v < .5 ? shade(dirt, 1.5) : v < .8 ? shade(dirt, .6) : '#5a5448'); }
  }
}
function groundCell(kx, ky) {
  const key = kx + ',' + ky; let c = GND.get(key);
  if (c) return c;
  if (_gndBudget <= 0) return null; _gndBudget--;
  const X0 = kx * BAND, Y0 = ky * BAND, X1 = Math.min(X0 + BAND, WORLD_W), Y1 = Math.min(Y0 + BAND, WORLD_H);
  const cvs = document.createElement('canvas'); cvs.width = (X1 - X0 + Y1 - Y0) * ISO_K + GND_PAD * 2; cvs.height = (X1 - X0 + Y1 - Y0) * ISO_K / 2 + GND_PAD * 2;
  const keep = ctx, ox = ISO.ox, oy = ISO.oy; ISO.ox = GND_PAD - (X0 - Y1) * ISO_K; ISO.oy = GND_PAD - (X0 + Y0) * ISO_K / 2; ctx = cvs.getContext('2d');
  try { paintGroundCell(kx, ky); } finally { ctx = keep; ISO.ox = ox; ISO.oy = oy; }
  c = { cv: cvs, X0, Y0, X1, Y1 }; GND.set(key, c);
  if (GND.size > GND_KEEP) GND.delete(GND.keys().next().value);
  return c;
}
// called with the ground transform set, and leaves it set
function drawGround() {
  drawSea();
  if (_gndCity !== blocks[0]) { GND.clear(); _gndCity = blocks[0]; }
  _gndBudget = GND.size ? GND_PER_FRAME : 12;                    // the first screenful all at once, then a few new cells a frame
  const kx0 = Math.max(0, Math.floor(cam.x / BAND)), kx1 = Math.min(Math.floor((WORLD_W - 1) / BAND), Math.floor((cam.x + cam.w) / BAND)), ky0 = Math.max(0, Math.floor(cam.y / BAND)), ky1 = Math.min(Math.floor((WORLD_H - 1) / BAND), Math.floor((cam.y + cam.h) / BAND));
  for (let ky = ky0; ky <= ky1; ky++) for (let kx = kx0; kx <= kx1; kx++) {
    const c = groundCell(kx, ky);
    if (c) { artT(); const a = isoXY(c.X0, c.Y1, 0), t = isoXY(c.X0, c.Y0, 0); ctx.drawImage(c.cv, a[0] - GND_PAD, t[1] - GND_PAD); groundT(); }
    else { const X0 = kx * BAND, Y0 = ky * BAND; ctx.fillStyle = DIST[districtAt(Math.min(X0 + 200, WORLD_W - 1))].ground; ctx.fillRect(X0, Y0, Math.min(BAND, WORLD_W - X0), Math.min(BAND, WORLD_H - Y0)); }   // not painted yet: plain road for a frame or two
  }
  // live: the boss ring, wet sheen, scorch marks and wrecks
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, WORLD_W, WORLD_H); ctx.clip();
  for (const b of blocks) {
    if (b.kind !== 'boss' || b.x > cam.x + cam.w || b.x + b.w < cam.x || b.y > cam.y + cam.h || b.y + b.h < cam.y) continue;
    const ix = b.x + TILE, iy = b.y + TILE, iw = b.w - TILE * 2;
    ctx.strokeStyle = rgba(DIST[b.d].col, DS[b.d].bossAlive ? .5 : .16); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ix + iw / 2, iy + iw / 2, iw * .38, 0, TAU); ctx.stroke(); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ix + iw / 2, iy + iw / 2, iw * .2, 0, TAU); ctx.stroke();
  }
  for (const p of puddles) {
    if (!inView(p.x, p.y, 40)) continue;
    ctx.fillStyle = 'rgba(110,130,175,.07)'; ellipse(p.x, p.y, p.rx, p.ry);
    ctx.fillStyle = 'rgba(160,185,235,.05)'; ellipse(p.x - p.rx * .2, p.y - p.ry * .2, p.rx * .55, p.ry * .4);
  }
  for (const d of decals) {
    if (!inView(d.x, d.y, 60)) continue;
    const a = Math.min(1, d.life / 10);
    if (d.k === 'scorch') {
      ctx.fillStyle = `rgba(0,0,0,${.16 * a})`; ellipse(d.x, d.y, d.r * 1.35, d.r * 1.2); ctx.fillStyle = `rgba(0,0,0,${.26 * a})`; ellipse(d.x, d.y, d.r, d.r * .9); ctx.fillStyle = `rgba(0,0,0,${.22 * a})`; ellipse(d.x + d.r * .1, d.y - d.r * .05, d.r * .55, d.r * .5);
      if (d.r > 40) { ctx.fillStyle = `rgba(70,66,60,${.8 * a})`; for (let i = 0; i < 14; i++) { const h = hash2(d.x | 0, i * 7 + (d.y | 0)), aa = (h % 628) / 100, rr = d.r * ((h >> 10) % 100) / 110; ctx.fillRect(d.x + Math.cos(aa) * rr, d.y + Math.sin(aa) * rr, 3 + (h >> 4) % 6, 2 + (h >> 7) % 4); } }
    }
    else if (d.k === 'wreck') { ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.ang || 0); ctx.globalAlpha = a; ctx.fillStyle = '#16171c'; ctx.fillRect(-19, -10, 38, 20); ctx.fillStyle = '#26272e'; ctx.fillRect(-12, -7, 20, 14); ctx.restore(); ctx.globalAlpha = 1; }
  }
  ctx.restore();
}

/* ---------- street lamps: one design per district ---------- */
// which way a lamp's arm reaches: out over the road next to its kerb (as a step on screen: [dx, dy])
function lampArm(l) {
  if (l._arm) return l._arm;
  const b = blockAt(l.x, l.y), dn = Math.abs(l.y - b.y), ds = Math.abs(l.y - (b.y + b.h)), dw = Math.abs(l.x - b.x), de = Math.abs(l.x - (b.x + b.w)), m = Math.min(dn, ds, dw, de);
  return l._arm = m === dn ? [1, -1] : m === ds ? [-1, 1] : m === dw ? [-1, -1] : [1, 1];
}
function drawIsoLamp(l) {
  const b = isoXY(l.x, l.y, 0), X = Math.round(b[0]), Y = Math.round(b[1]), c = lampCol(l.d), d = l.d;
  let k = 1; if (l.broken || !LIGHT.lamps) k = .05; else if (l.flick) k = Math.sin(G.time * 13 + l.ph) > -.7 ? 1 : .25;
  const lit = k > .5, px1 = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
  if (d === 2) {            // Tower: a slim post whose top third is a light bar
    px1(X - 1, Y - 1, 3, 2, '#14151f'); px1(X, Y - 12, 1, 11, '#3d4058'); px1(X - 1, Y - 13, 3, 1, '#14151f');
    px1(X - 1, Y - 19, 3, 6, '#14151f'); px1(X, Y - 18, 1, 5, lit ? '#ffffff' : '#3a3d52'); if (lit) { ctx.fillStyle = rgba(c, .75); ctx.fillRect(X - 1, Y - 18, 1, 5); ctx.fillRect(X + 1, Y - 18, 1, 5); }
    if (k > .2) iglow(X + .5, Y - 15.5, 8, c, .7 * k);
    return;
  }
  const [ax, ay] = lampArm(l), wood = d === 1, pole = wood ? '#5c4232' : '#4c5264', dark = wood ? '#33241b' : '#262a36', top = wood ? 19 : 17;
  px1(X - 1, Y - 1, 3, 2, dark); px1(X, Y - top, 1, top - 1, pole); px1(X, Y - 3, 1, 2, dark);
  if (wood) { px1(X - 2, Y - top + 2, 5, 1, dark); px1(X - 2, Y - top + 1, 1, 1, '#8a8478'); px1(X + 2, Y - top + 1, 1, 1, '#8a8478'); }   // cross-arm with insulators
  // arm: three steps out over the road, then the head hanging from its end
  const hx = X + ax * 4, hy = Y - top + (ay < 0 ? -2 : 1);
  iline([X, Y - top], [hx, hy], pole);
  px1(hx - 1, hy, 3, 1, wood ? '#6a5a4a' : '#727a8e'); px1(hx - 1, hy + 1, 3, 1, lit ? '#fff6d8' : '#5a5040');
  if (wood && !lit) px1(hx, hy + 1, 1, 1, '#2a2420');
  if (k > .2) iglow(hx + .5, hy + 2, 7, c, .7 * k);
}

/* ---------- trees: painted once each into a small canvas ---------- */
function treeArt(t) {
  if (t._cv) return t._cv;
  const d = districtAt(t.x), rnd = mulberry(hash2(Math.round(t.x), Math.round(t.y))), r = Math.round(t.r * ISO_K * .85), trunkH = Math.round(t.h * ISO_KZ) - 1;
  const bare = d === 1 && rnd() < .35, blossom = d === 2 && rnd() < .55;
  const leaf = blossom ? ['#3a1c3a', '#5c2a56', '#8e3f7a', '#d766b0', '#ffa6dc'] : d === 1 ? ['#10190f', '#1b2a17', '#27391e', '#35482a', '#4a5c38'] : ['#081a12', '#0f2a1c', '#174028', '#1f5634', '#2f7446'];
  for (let i = 0; i < leaf.length; i++) leaf[i] = shade(leaf[i], 1 + (LIGHT.green - 1) * .55);   // brighter by day
  const W = r * 2 + 8, H = r * 2 + trunkH + 8, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), cx = W >> 1, base = H - 3, cy = base - trunkH - r + 2;
  const px1 = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  // trunk with a root flare
  px1(cx - 1, base - trunkH - 2, 3, trunkH + 3, '#0a0806'); px1(cx - 1, base - trunkH - 2, 2, trunkH + 2, '#3a281a'); px1(cx, base - trunkH - 2, 1, trunkH + 2, '#2a1c12'); px1(cx - 2, base, 5, 1, '#0a0806'); px1(cx - 1, base - 1, 3, 1, '#3a281a');
  if (bare) {               // winter tree: forked branches, a few last leaves
    const br = (x, y, dx, n, col) => { for (let i = 0; i < n; i++) px1(Math.round(x + dx * i), y - i, 1, 1, col); };
    const ty = base - trunkH - 2;
    br(cx - 1, ty, -1, r, '#3a281a'); br(cx + 1, ty, 1, r - 1, '#2a1c12'); br(cx, ty, -.3, r + 2, '#3a281a'); br(cx - 3, ty - 3, -1.2, 4, '#2a1c12'); br(cx + 3, ty - 3, 1.3, 4, '#2a1c12'); br(cx + 1, ty - 4, .4, r - 2, '#3a281a');
    for (let i = 0; i < 5; i++) px1(cx + ((rnd() * (r * 2 - 2)) | 0) - r + 1, ty - 2 - ((rnd() * r) | 0), 1, 1, '#5a4a2a');
    return t._cv = { cv, ox: cx, oy: base };
  }
  // canopy: a lumpy crown made of overlapping discs, shaded from the upper left, with leaf texture and an outline
  const lumps = [[0, 0, r]]; for (let i = 0, n = 4 + ((rnd() * 3) | 0); i < n; i++) { const a = rnd() * 6.28, q = r * (.35 + rnd() * .3); lumps.push([Math.cos(a) * q, Math.sin(a) * q * .7, r * (.45 + rnd() * .25)]); }
  const inside = (x, y) => lumps.some(l => (x - l[0]) ** 2 + ((y - l[1]) * 1.12) ** 2 <= l[2] * l[2]);
  for (let y = -r - 3; y <= r + 3; y++) for (let x = -r - 3; x <= r + 3; x++) {
    if (!inside(x, y)) { if (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1)) px1(cx + x, cy + y, 1, 1, '#05070a'); continue; }
    const lightK = (-x * .6 - y) / r, n = (hash2(x * 7 + 31 + (t.x | 0), y * 13 + (t.y | 0)) % 100) / 100;   // lit from the upper left
    let tone = lightK > .55 ? 3 : lightK > .1 ? 2 : lightK > -.45 ? 1 : 0;
    if (n < .14 && tone < 4) tone++; else if (n > .86 && tone > 0) tone--;
    if (tone === 3 && n > .5 && n < .58) tone = 4;
    px1(cx + x, cy + y, 1, 1, leaf[tone]);
  }
  if (blossom) for (let i = 0; i < 5; i++) px1(cx + ((rnd() * W) | 0) - (W >> 1), base - ((rnd() * 3) | 0), 1, 1, '#b05a96');   // petals on the ground
  return t._cv = { cv, ox: cx, oy: base, blossom };
}
function drawIsoTree(t) {
  const a = treeArt(t), b = isoXY(t.x, t.y, 0);
  ctx.drawImage(a.cv, Math.round(b[0]) - a.ox, Math.round(b[1]) - a.oy);
  if (a.blossom) iglow(b[0], b[1] - t.h * ISO_KZ - 2, 12, '#ff7ac8', .12);
}

/* ---------- traffic lights: one at the corner of every block (for show; nobody obeys them) ---------- */
let _signals = null, _sigCity = null;
function streetSignals() {
  if (_sigCity === blocks[0] && _signals) return _signals;
  _sigCity = blocks[0]; _signals = [];
  for (const b of blocks) _signals.push({ x: b.x + 7, y: b.y + 7, ph: (hash2(b.x, b.y) % 1000) / 1000 * 11, d: b.d });
  return _signals;
}
function drawIsoSignal(s) {
  const b = isoXY(s.x, s.y, 0), X = Math.round(b[0]), Y = Math.round(b[1]), t = (G.time + s.ph) % 11, on = t < 5 ? 2 : t < 6 ? 1 : 0;   // green 5 s, amber 1 s, red 5 s
  const px1 = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
  px1(X - 1, Y - 1, 3, 2, '#1c1f28'); px1(X, Y - 13, 1, 12, '#474c5c');
  px1(X - 1, Y - 21, 3, 8, '#0b0c11'); px1(X - 2, Y - 20, 1, 6, '#0b0c11'); px1(X + 2, Y - 20, 1, 6, '#0b0c11');
  const cols = ['#ff3b3b', '#ffb52e', '#39e86b'];
  for (let i = 0; i < 3; i++) px1(X, Y - 20 + i * 2, 1, 2, i === on ? cols[i] : shade(cols[i], .22));
  px1(X, Y - 20 + on * 2, 1, 1, '#ffffff'); iglow(X + .5, Y - 19 + on * 2, 5, cols[on], .6);
}
