/* ============================== 11b ISO VIEW ============================== */
/* Isometric pixel renderer. The game world is unchanged (same tiles, same physics); only the drawing
   changes. Everything is drawn into a small 320x180 "art" canvas and scaled up with hard pixels
   (5x on a 1600x900 frame).
   Projection: world (x, y, z) -> art pixels
     X = ox + (x - y) * ISO_K
     Y = oy + (x + y) * ISO_K / 2 - z * ISO_KZ
   - the ground (asphalt, markings, puddles, lights, shadows, effects) is drawn with the same code as
     before through an affine transform, so it simply lies flat in the iso view
   - buildings, hideouts, barricades, trees and lamps are drawn as crisp pixel boxes
   - characters, cars and props still use their old drawings, standing upright (replaced in steps 2-3)
   - controls are rotated so "up" on the stick is up on the screen
   These declarations come after 11_render, so the functions here replace the ones there. */
const ART_W = 320, ART_H = 180, ISO_K = .5, ISO_KZ = .25, SPR_K = .6;
const artCv = document.createElement('canvas'); artCv.width = ART_W; artCv.height = ART_H;
const artCtx = artCv.getContext('2d');
const ISO = { ox: 0, oy: 0, upright: false, lasers: [] };

/* ---------- camera & projection ---------- */
function placeCam() {
  cam.scale = W / ART_W;
  cam.cx = clamp(cam.cx, 0, WORLD_W); cam.cy = clamp(cam.cy, 0, WORLD_H);
  // world-space box that covers everything the iso view can show (used for culling)
  cam.w = cam.h = 760; cam.x = cam.cx - 380; cam.y = cam.cy - 380;
}
function isoOrigin() {
  const cx = cam.cx + (cam.sx || 0), cy = cam.cy + (cam.sy || 0);
  ISO.ox = Math.round(ART_W / 2 - (cx - cy) * ISO_K); ISO.oy = Math.round(ART_H / 2 - (cx + cy) * ISO_K / 2);
}
const isoXY = (x, y, z = 0) => [ISO.ox + (x - y) * ISO_K, ISO.oy + (x + y) * ISO_K / 2 - z * ISO_KZ];
function groundT() { ctx.setTransform(ISO_K, ISO_K / 2, -ISO_K, ISO_K / 2, ISO.ox, ISO.oy); }
function artT() { ctx.setTransform(1, 0, 0, 1, 0, 0); }
// screen (CSS px inside the frame) -> world ground point
function screenToWorld(sx, sy) {
  const dx = (sx - FRAME.x) * ART_W / W - ISO.ox, dy = (sy - FRAME.y) * ART_W / W - ISO.oy;
  return { x: (dx / ISO_K + 2 * dy / ISO_K) / 2, y: (2 * dy / ISO_K - dx / ISO_K) / 2 };
}
// world point (+ height in sprite units) -> CSS px inside the frame, for the HUD
function isoToScreen(x, y, h = 0) { const a = isoXY(x, y, 0), k = W / ART_W; return { x: a[0] * k, y: (a[1] - h * SPR_K) * k }; }
// a stick direction on screen -> the world direction that moves that way on screen (same length)
function isoDir(v) {
  if (!v) return v;
  const m = Math.hypot(v.x, v.y); if (m < 1e-6) return v;
  let x = v.x + 2 * v.y, y = 2 * v.y - v.x; const n = Math.hypot(x, y);
  return Object.assign({}, v, { x: x / n * m, y: y / n * m });
}

/* ---------- crisp pixel primitives (art space) ---------- */
function ipoly(pts, c) {
  let y0 = Infinity, y1 = -Infinity; for (const p of pts) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
  ctx.fillStyle = c; y0 = Math.max(Math.round(y0), -2); y1 = Math.min(Math.round(y1), ART_H + 2);
  const xs = [];
  for (let y = y0; y < y1; y++) {
    const yc = y + .5; xs.length = 0;
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) { const xa = Math.round(xs[i]), xb = Math.round(xs[i + 1]); if (xb > xa) ctx.fillRect(xa, y, xb - xa, 1); }
  }
}
function ipx(x, y, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); }
function iline(a, b, c) {
  ctx.fillStyle = c; const n = Math.max(1, Math.round(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))));
  for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(a[0] + (b[0] - a[0]) * i / n), Math.round(a[1] + (b[1] - a[1]) * i / n), 1, 1);
}
function idisc(cx, cy, r, c) {
  ctx.fillStyle = c; cx = Math.round(cx); cy = Math.round(cy);
  for (let dy = -Math.floor(r); dy <= r; dy++) { const h = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy))); if (h > 0) ctx.fillRect(cx - h, cy + dy, h * 2, 1); }
}
function iglow(x, y, r, col, a) { ctx.globalCompositeOperation = 'lighter'; glow(x, y, r, col, a); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
// a small box sitting on a surface at height z0 (roof clutter, gate posts)
function ibox(x, y, w, d, z0, hz, top, south, east) {
  const P_ = (a, b, z) => isoXY(a, b, z);
  ipoly([P_(x, y + d, z0), P_(x + w, y + d, z0), P_(x + w, y + d, z0 + hz), P_(x, y + d, z0 + hz)], south);
  ipoly([P_(x + w, y + d, z0), P_(x + w, y, z0), P_(x + w, y, z0 + hz), P_(x + w, y + d, z0 + hz)], east);
  ipoly([P_(x, y, z0 + hz), P_(x + w, y, z0 + hz), P_(x + w, y + d, z0 + hz), P_(x, y + d, z0 + hz)], top);
}

/* ---------- buildings ---------- */
// lit window: a 3x2 pixel slab that follows the slope of its wall
function iwin(p, slope, c) { ctx.fillStyle = c; const X = Math.round(p[0]), Y = Math.round(p[1]); for (let k = -1; k <= 1; k++) ctx.fillRect(X + k, Y - 1 + Math.round(k * slope), 1, 2); }
function drawIsoBuilding(b) {
  const x0 = b.x, y0 = b.y, x1 = b.x + b.w, y1 = b.y + b.h, ht = b.ht, t = G.time;
  const st = DS[b.d].status, pal = neonPal(b.d), litK = st === 'liberated' ? 1.35 : st === 'dominated' ? .75 : 1;
  const S_ = shade(b.wall, .95), E_ = shade(b.wall, .6);
  const A = [isoXY(x0, y1, 0), isoXY(x1, y1, 0), isoXY(x1, y1, ht), isoXY(x0, y1, ht)];   // south wall
  const B = [isoXY(x1, y1, 0), isoXY(x1, y0, 0), isoXY(x1, y0, ht), isoXY(x1, y1, ht)];   // east wall
  ipoly(A, S_); ipoly(B, E_);
  // dark base and floor lines
  iline(isoXY(x0, y1, 2), isoXY(x1, y1, 2), shade(b.wall, .5)); iline(isoXY(x1, y1, 2), isoXY(x1, y0, 2), shade(b.wall, .35));
  for (let f = 30; f < ht - 6; f += 30) { iline(isoXY(x0, y1, f), isoXY(x1, y1, f), shade(b.wall, .8)); iline(isoXY(x1, y1, f), isoXY(x1, y0, f), shade(b.wall, .5)); }
  // windows (one row per floor; unlit ones are dark panes)
  const lit = [];
  for (const [side, list] of [[2, b.win[2]], [1, b.win[1]]]) for (const wn of list) {
    if (wn.v * ht < 34 || Math.round(wn.v * ht / 15) % 2) continue;
    let on = wn.roll < b.lit * litK; if (wn.roll > .97 && Math.sin(t * .7 + wn.u * 50) > .6) on = !on;
    const p = side === 2 ? isoXY(lerp(x1, x0, wn.u), y1, wn.v * ht) : isoXY(x1, lerp(y0, y1, wn.u), wn.v * ht);
    const col = on ? (st === 'dominated' && wn.roll < .1 ? '#ff4a3a' : wn.c) : shade(b.wall, side === 2 ? .55 : .38);
    iwin(p, side === 2 ? .5 : -.5, on && side === 1 ? shade(col, .8) : col);
    if (on && wn.roll < .08) lit.push(p, col);
  }
  for (let i = 0; i < lit.length; i += 2) iglow(lit[i][0], lit[i][1], 6, lit[i + 1], .3);
  // door
  if (b.door) {
    const dx = (x0 + x1) / 2, dh = Math.min(ht - 4, 28);
    ipoly([isoXY(dx - 8, y1, 0), isoXY(dx + 8, y1, 0), isoXY(dx + 8, y1, dh), isoXY(dx - 8, y1, dh)], '#0b0a0d');
    ipoly([isoXY(dx - 5, y1, 0), isoXY(dx + 5, y1, 0), isoXY(dx + 5, y1, dh - 4), isoXY(dx - 5, y1, dh - 4)], '#e0b878');
    iline(isoXY(dx - 10, y1, dh + 2), isoXY(dx + 10, y1, dh + 2), shade(b.wall, .4));
    const g = isoXY(dx, y1, 4); iglow(g[0], g[1], 8, '#ffd696', .5);
  }
  // ground-floor shopfronts
  for (const sh of b.shops) {
    if (sh.side !== 2 && sh.side !== 1) continue;
    const col = pal[sh.ci], top = Math.min(ht - 3, 22);
    const Pt = (u, z) => sh.side === 2 ? isoXY(lerp(x1, x0, u), y1, z) : isoXY(x1, lerp(y0, y1, u), z);
    ipoly([Pt(sh.u0, 2), Pt(sh.u1, 2), Pt(sh.u1, top), Pt(sh.u0, top)], sh.side === 2 ? col : shade(col, .75));
    iline(Pt(sh.u0, top * .55), Pt(sh.u1, top * .55), '#ffffff');
    iline(Pt(sh.u0 - .02, top + 4), Pt(sh.u1 + .02, top + 4), shade(col, .45));   // awning
    const m = Pt((sh.u0 + sh.u1) / 2, top / 2); iglow(m[0], m[1], 16, col, .45);
  }
  // neon signs
  for (const sg of b.signs) {
    if (sg.side !== 2 && sg.side !== 1) continue;
    const on = sg.blink ? (Math.sin(t * 3 + sg.ph) > -.2 ? 1 : .15) : 1, col = pal[sg.ci];
    const Pt = (u, v) => sg.side === 2 ? isoXY(lerp(x1, x0, u), y1, v * ht) : isoXY(x1, y0 + b.h * u, v * ht);
    const a = Pt(sg.u, sg.v0), c = Pt(sg.u2, sg.v1);
    ctx.globalAlpha = on; iline(a, c, col); iline([a[0] + 1, a[1]], [c[0] + 1, c[1]], col);
    const n = Math.max(1, Math.round(Math.hypot(c[0] - a[0], c[1] - a[1]) / 3));
    for (let i = 0; i <= n; i += 2) ipx(lerp(a[0], c[0], i / n), lerp(a[1], c[1], i / n), '#ffffff');
    ctx.globalAlpha = 1; iglow((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, 24, col, .55 * on);
  }
  // roof
  const T = [isoXY(x0, y0, ht), isoXY(x1, y0, ht), isoXY(x1, y1, ht), isoXY(x0, y1, ht)];
  ipoly(T, b.roof);
  const I = [isoXY(x0 + 5, y0 + 5, ht), isoXY(x1 - 5, y0 + 5, ht), isoXY(x1 - 5, y1 - 5, ht), isoXY(x0 + 5, y1 - 5, ht)];
  for (let i = 0; i < 4; i++) iline(I[i], I[(i + 1) % 4], shade(b.roof, .75));
  iline(T[0], T[1], shade(b.roof, 1.3)); iline(T[0], T[3], shade(b.roof, 1.3));
  iline(T[3], T[2], shade(b.roof, 1.7)); iline(T[2], T[1], shade(b.roof, 1.5));
  for (const p of b.props) {
    if (p.k === 'box') ibox(p.x, p.y, p.w, p.h, ht, 10, shade(b.roof, 1.6), shade(b.roof, 1.25), shade(b.roof, .95));
    else if (p.k === 'tank') { const c = isoXY(p.x + p.w / 2, p.y + p.w / 2, ht); const r = p.w * ISO_K * .55; ctx.fillStyle = shade(b.roof, 1.1); ctx.fillRect(Math.round(c[0] - r), Math.round(c[1] - 5), Math.round(r * 2), 5); idisc(c[0], c[1] - 5, r, shade(b.roof, 1.75)); idisc(c[0], c[1] - 5, r * .5, shade(b.roof, 1.4)); }
    else if (p.k === 'pad') { ctx.save(); ctx.setTransform(ISO_K, ISO_K / 2, -ISO_K, ISO_K / 2, ISO.ox, ISO.oy - ht * ISO_KZ); ctx.strokeStyle = rgba(pal[0], .8); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, p.w, 0, TAU); ctx.stroke(); ctx.fillStyle = rgba(pal[0], .8); ctx.fillRect(p.x - p.w * .35, p.y - p.w * .45, 4, p.w * .9); ctx.fillRect(p.x + p.w * .35 - 4, p.y - p.w * .45, 4, p.w * .9); ctx.fillRect(p.x - p.w * .35, p.y - 2, p.w * .7, 4); ctx.restore(); }
  }
  if (b.trim !== null) {
    const col = pal[b.trim]; for (let i = 0; i < 4; i++) iline(T[i], T[(i + 1) % 4], col);
    iglow((T[2][0] + T[3][0]) / 2, (T[2][1] + T[3][1]) / 2, 22, col, .3); iglow((T[1][0] + T[2][0]) / 2, (T[1][1] + T[2][1]) / 2, 18, col, .25);
  }
  if ((hash2(b.x, b.y) & 3) === 0) { const on = Math.sin(t * 2.4 + b.x) > 0, p = isoXY(x1 - 8, y0 + 8, ht); ctx.fillStyle = on ? '#ff2a2a' : '#401010'; ctx.fillRect(Math.round(p[0]), Math.round(p[1]) - 1, 1, 2); if (on) iglow(p[0], p[1], 6, '#ff2a2a', .7); }
  // edges: dark far-left edge, bright front corner
  iline(A[0], A[3], shade(b.wall, .45)); iline(A[1], A[2], shade(b.wall, 1.25));
}

/* ---------- hideouts ---------- */
function drawIsoHideout(e) {
  const r = e.rect, x0 = r.x, y0 = r.y, x1 = r.x + r.w, y1 = r.y + r.h, ht = 96, t = G.time, fl = e.flash > 0, col = e.col;
  const brickS = fl ? '#ffffff' : '#2c2321', brickE = fl ? '#ffffff' : '#1d1716', mortS = '#161110', mortE = '#0f0b0b';
  ipoly([isoXY(x0, y1, 0), isoXY(x1, y1, 0), isoXY(x1, y1, ht), isoXY(x0, y1, ht)], brickS);
  ipoly([isoXY(x1, y1, 0), isoXY(x1, y0, 0), isoXY(x1, y0, ht), isoXY(x1, y1, ht)], brickE);
  if (!fl) { // brick courses with staggered joints
    for (let z = 8, row = 0; z < ht; z += 8, row++) {
      iline(isoXY(x0, y1, z), isoXY(x1, y1, z), mortS); iline(isoXY(x1, y1, z), isoXY(x1, y0, z), mortE);
      for (let u = (row % 2 ? 8 : 0) + 4; u < r.w; u += 16) ipx(...isoXY(x0 + u, y1, z + 4), mortS);
      for (let u = (row % 2 ? 8 : 0) + 4; u < r.h; u += 16) ipx(...isoXY(x1, y0 + u, z + 4), mortE);
    }
    // graffiti tag in gang colour
    ctx.globalAlpha = .85;
    iline(isoXY(x0 + 14, y1, 56), isoXY(x0 + 20, y1, 34), col); iline(isoXY(x0 + 20, y1, 34), isoXY(x0 + 28, y1, 52), col);
    iline(isoXY(x0 + 8, y1, 30), isoXY(x0 + 14, y1, 56), col);
    iline(isoXY(x1, y0 + 14, 40), isoXY(x1, y0 + 24, 26), col); iline(isoXY(x1, y0 + 24, 26), isoXY(x1, y0 + 36, 48), col);
    ctx.globalAlpha = 1;
  }
  // barred windows with a sickly glow
  for (const u of [16, r.w - 28]) {
    const z0 = 66, z1 = 82, a = .55 + .2 * Math.sin(t * 3 + u);
    ctx.globalAlpha = a; ipoly([isoXY(x0 + u, y1, z0), isoXY(x0 + u + 14, y1, z0), isoXY(x0 + u + 14, y1, z1), isoXY(x0 + u, y1, z1)], col); ctx.globalAlpha = 1;
    for (let i = 3; i < 14; i += 4) iline(isoXY(x0 + u + i, y1, z0), isoXY(x0 + u + i, y1, z1), '#0a0808');
  }
  // gate in the middle of the south wall; the shutter rolls up once the guards are down
  const gx0 = (x0 + x1) / 2 - 16, gx1 = gx0 + 32, gh = 40, open = e.gateOpen ? (e.gateT || 0) : 0;
  ipoly([isoXY(gx0, y1, 0), isoXY(gx1, y1, 0), isoXY(gx1, y1, gh), isoXY(gx0, y1, gh)], '#050404');
  if (open > 0 && !e.cleared) { const m = isoXY((gx0 + gx1) / 2, y1, gh * .4); iglow(m[0], m[1], 16, col, .6 * open); }
  const sb = gh * open;   // bottom edge of the shutter
  if (gh - sb > .5) {
    ipoly([isoXY(gx0, y1, sb), isoXY(gx1, y1, sb), isoXY(gx1, y1, gh), isoXY(gx0, y1, gh)], fl ? '#fff' : '#4a4644');
    for (let z = sb + 4; z < gh; z += 6) iline(isoXY(gx0, y1, z), isoXY(gx1, y1, z), '#2a2726');
    for (let u = 0; u < 32; u += 4) ipx(...isoXY(gx0 + u + 2, y1, sb + 1), (u / 4) % 2 ? '#1a1408' : '#e0b020');
  }
  iline(isoXY(gx0 - 1, y1, 0), isoXY(gx0 - 1, y1, gh + 2), '#6a6260'); iline(isoXY(gx1 + 1, y1, 0), isoXY(gx1 + 1, y1, gh + 2), '#6a6260'); iline(isoXY(gx0 - 1, y1, gh + 2), isoXY(gx1 + 1, y1, gh + 2), '#6a6260');
  // roof with razor wire on the edges
  const T = [isoXY(x0, y0, ht), isoXY(x1, y0, ht), isoXY(x1, y1, ht), isoXY(x0, y1, ht)];
  ipoly(T, fl ? '#fff' : '#1c1817');
  ibox(x0 + 10, y0 + 10, 18, 12, ht, 8, '#3a3230', '#2a2422', '#201a19');
  ibox(x1 - 34, y1 - 26, 22, 14, ht, 6, '#3a3230', '#2a2422', '#201a19');
  for (const [a, b] of [[T[0], T[1]], [T[0], T[3]], [T[3], T[2]], [T[2], T[1]]]) {
    const n = Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]));
    for (let i = 0; i <= n; i++) ipx(lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n) - 1 - (i % 3 === 1 ? 1 : 0), i % 3 ? '#8a8682' : '#5a5652');
  }
  iline(isoXY(x0, y1, 0), isoXY(x0, y1, ht), '#100c0c'); iline(isoXY(x1, y1, 0), isoXY(x1, y1, ht), '#4a3a36');
  if (e.cleared) return;
  // gang flag, blinking warning light, floodlights
  const fp = isoXY(x1 - 12, y0 + 12, ht); iline(fp, [fp[0], fp[1] - 14], '#888');
  const wv = Math.round(Math.sin(t * 6) * 1.5);
  ipoly([[fp[0] + 1, fp[1] - 14], [fp[0] + 9 + wv, fp[1] - 12], [fp[0] + 1, fp[1] - 9]], col);
  const on = Math.sin(t * 5) > 0, lp = isoXY(x0 + 12, y1 - 10, ht);
  ctx.fillStyle = on ? '#ff2a2a' : '#401010'; ctx.fillRect(Math.round(lp[0]), Math.round(lp[1]) - 2, 2, 2); if (on) iglow(lp[0], lp[1], 8, '#ff2a2a', .8);
  for (const u of [4, r.w - 6]) { const f = isoXY(x0 + u, y1, ht - 6); ctx.fillStyle = '#ddd'; ctx.fillRect(Math.round(f[0]), Math.round(f[1]), 2, 1); iglow(f[0], f[1] + 1, 7, '#ffeedd', .5); }
}

/* ---------- trees, lamps, barricades ---------- */
function drawIsoTree(t) {
  const b = isoXY(t.x, t.y, 0), c = isoXY(t.x, t.y, t.h), r = t.r * ISO_K * .85;
  ctx.fillStyle = '#2a1c12'; ctx.fillRect(Math.round(b[0]), Math.round(c[1]), 2, Math.round(b[1] - c[1]));
  idisc(c[0], c[1] + 1, r, shade(t.c, .7));
  idisc(c[0] + r * .35, c[1] - r * .2, r * .72, t.c);
  idisc(c[0] - r * .35, c[1] + r * .15, r * .62, t.c);
  idisc(c[0] - r * .2, c[1] - r * .4, r * .4, shade(t.c, 1.45));
}
function drawIsoLamp(l) {
  const b = isoXY(l.x, l.y, 0), top = isoXY(l.x, l.y, 64), c = lampCol(l.d);
  let k = 1; if (l.broken) k = .05; else if (l.flick) k = Math.sin(G.time * 13 + l.ph) > -.7 ? 1 : .25;
  ctx.fillStyle = '#2a2e3a'; ctx.fillRect(Math.round(b[0]), Math.round(top[1]), 1, Math.round(b[1] - top[1]));
  ctx.fillStyle = '#4a4e5e'; ctx.fillRect(Math.round(b[0]) - 1, Math.round(b[1]) - 1, 3, 1); ctx.fillRect(Math.round(top[0]) - 1, Math.round(top[1]), 3, 1);
  ctx.fillStyle = k > .5 ? '#fff6d8' : '#5a5040'; ctx.fillRect(Math.round(top[0]) - 1, Math.round(top[1]) + 1, 3, 1);
  if (k > .2) iglow(top[0], top[1] + 1, 7, c, .7 * k);
}
function drawGateStripes() { // the barricade's footprint on the ground (affine pass)
  for (let i = 0; i < 2; i++) {
    if (gatesOpen[i]) continue;
    const x = GATE_TX[i] * TILE, y0 = Math.max(0, Math.floor(cam.y / 96) * 96), y1 = Math.min(WORLD_H, cam.y + cam.h + 96);
    if (x + 32 < cam.x - 40 || x > cam.x + cam.w + 40) continue;
    ctx.fillStyle = '#0c0d12'; ctx.fillRect(x + 6, y0, 20, y1 - y0);
    for (let y = y0; y < y1; y += 16) { ctx.fillStyle = (y / 16) & 1 ? '#3a1018' : '#d02a40'; ctx.fillRect(x + 8, y, 16, 8); }
  }
}
function drawIsoGateSeg(g) { // one post and the laser beams to the next post
  const cx = g.cx, y = g.y, top = 60, p0 = isoXY(cx, y, 0), p1 = isoXY(cx, y, top);
  ctx.fillStyle = '#2a2d38'; ctx.fillRect(Math.round(p1[0]) - 1, Math.round(p1[1]), 3, Math.round(p0[1] - p1[1]));
  ctx.fillStyle = '#ff3355'; ctx.fillRect(Math.round(p1[0]) - 1, Math.round(p1[1]) - 1, 3, 2);
  for (const hh of [.33, .66, 1]) { ctx.globalAlpha = .55 + .3 * Math.sin(G.time * 8 + y + hh * 60); iline(isoXY(cx, y, top * hh), isoXY(cx, y + 96, top * hh), '#ff4060'); }
  ctx.globalAlpha = 1; iglow(p1[0], p1[1], 9, '#ff3355', .6);
}

/* ---------- upright entities (old drawings, stood up in the iso view) ---------- */
function uprightT(x, y) { const a = isoXY(x, y, 0); ctx.setTransform(SPR_K, 0, 0, SPR_K, a[0] - x * SPR_K, a[1] - y * SPR_K); }
function drawUpright(e) {
  uprightT(e.x, e.y);
  // the old drawings read their facing as a ground direction in the tilted view; turning it 45 degrees
  // makes them face the matching way on the iso screen
  const ang = e.ang; if (ang !== undefined) e.ang = ang + Math.PI / 4;
  if (e === P) drawPlayer(); else drawEntity(e);
  e.ang = ang;
}
function drawAimLaser(e) {
  if (ISO.upright) { ISO.lasers.push(e); return; }   // lasers lie on the ground: drawn later in the flat pass
  const len = Math.min(380, raycast(e.x, e.y, Math.cos(e.ang), Math.sin(e.ang), 380)), a = .25 + .5 * (1 - e.aimT / .42);
  ctx.strokeStyle = e.team === 'police' ? `rgba(120,170,255,${a})` : `rgba(255,60,80,${a})`; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(e.x + Math.cos(e.ang) * 16, e.y + Math.sin(e.ang) * 16); ctx.lineTo(e.x + Math.cos(e.ang) * len, e.y + Math.sin(e.ang) * len); ctx.stroke();
}

/* ---------- rain (pixel streaks in art space) ---------- */
function initRain() {
  rain = []; for (let i = 0; i < 110; i++) rain.push({ x: rnd(ART_W), y: rnd(ART_H), l: rnd(3, 6) | 0, s: rnd(150, 230) });
}
function drawRain(dt) {
  ctx.fillStyle = 'rgba(170,195,240,.28)';
  for (const r of rain) {
    r.y += r.s * dt; r.x += r.s * .16 * dt; if (r.y > ART_H) { r.y = -r.l; r.x = rnd(-20, ART_W); } if (r.x > ART_W) r.x -= ART_W + 10;
    const X = Math.round(r.x), Y = Math.round(r.y);
    for (let k = 0; k < r.l; k++) ctx.fillRect(X - (k / 6 | 0), Y - k, 1, 1);
  }
}

/* ---------- frame ---------- */
const _boxes = [], _pts = [];
function render(dt) {
  mainCtx.setTransform(1, 0, 0, 1, 0, 0); mainCtx.globalAlpha = 1; mainCtx.globalCompositeOperation = 'source-over';
  mainCtx.fillStyle = '#05060b'; mainCtx.fillRect(0, 0, cv.width, cv.height);
  if (!P) return;
  isoOrigin();
  ctx = artCtx; ctx.imageSmoothingEnabled = true;
  artT(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#05060b'; ctx.fillRect(0, 0, ART_W, ART_H);
  // ---- flat pass: ground, light pools, shadows ----
  groundT();
  drawGround();
  ctx.globalCompositeOperation = 'lighter'; drawGroundLights(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  drawGateStripes();
  _vis.length = 0;
  for (const e of ents) if (!e.dead && inView(e.x, e.y, 60) && e !== P) _vis.push(e);
  for (const e of _vis) if (e.kind !== 'hideout') shadowOf(e);
  if (G.mode !== 'dead' && G.mode !== 'title') shadowOf(P);
  artT(); drawCharsFlatUnder(); groundT();
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  for (const t of trees) if (inView(t.x, t.y, 60)) ellipse(t.x + 6, t.y + 6, t.r * .9, t.r * .9);
  // ---- standing pass: boxes (buildings, hideouts, barricade posts) and points, back to front ----
  artT();
  const inArt = (x0, y0, x1, y1) => x1 >= -4 && x0 <= ART_W + 4 && y1 >= -4 && y0 <= ART_H + 4;
  _boxes.length = 0; _pts.length = 0;
  const addBox = (x0, y0, x1, y1, ht, draw, o) => {
    const l = isoXY(x0, y1, 0)[0], rt = isoXY(x1, y0, 0)[0], top = isoXY(x0, y0, ht)[1] - 16, bot = isoXY(x1, y1, 0)[1];
    if (inArt(l, top, rt, bot)) _boxes.push({ x0, y0, x1, y1, key: x0 + y0 + x1 + y1, l, rt, top, bot, draw, o, pts: null });
  };
  for (const b of buildings) if (b.x < cam.x + cam.w && b.x + b.w > cam.x && b.y < cam.y + cam.h && b.y + b.h > cam.y) addBox(b.x, b.y, b.x + b.w, b.y + b.h, b.ht, b.frame ? drawIsoFrame : drawIsoBuilding, b);
  for (const e of _vis) if (e.kind === 'hideout') addBox(e.rect.x, e.rect.y, e.rect.x + e.rect.w, e.rect.y + e.rect.h, 96, drawIsoHideout, e);
  for (let i = 0; i < 2; i++) if (!gatesOpen[i]) {
    const cx = GATE_TX[i] * TILE + 16; if (cx < cam.x - 40 || cx > cam.x + cam.w + 40) continue;
    for (let y = Math.max(0, Math.floor(cam.y / 96) * 96) + 48; y < Math.min(WORLD_H, cam.y + cam.h + 96); y += 96) addBox(cx - 2, y, cx + 2, y + 96, 60, drawIsoGateSeg, { cx, y });
  }
  for (const f of fences) if (inView((f.x0 + f.x1) / 2, (f.y0 + f.y1) / 2, 40)) addBox(f.x0, f.y0, f.x1, f.y1, FENCE_H, drawIsoFence, f);
  _boxes.sort((a, b) => a.key - b.key);
  const addPt = (x, y, key, hw, hh, draw, o) => {
    const a = isoXY(x, y, 0), l = a[0] - hw, rt = a[0] + hw, top = a[1] - hh, bot = a[1] + 4;
    if (!inArt(l, top, rt, bot)) return;
    let slot = 0;
    for (let i = 0; i < _boxes.length; i++) { const b = _boxes[i]; if (rt < b.l || l > b.rt || bot < b.top || top > b.bot) continue; if (x > b.x1 - 1 || y > b.y1 - 1) slot = i + 1; }
    _pts.push({ key, slot, draw, o });
  };
  for (const e of _vis) {
    if (e.kind === 'hideout') continue;
    const r = e.r || 10, z = e.z || 0;
    addPt(e.x, e.y, e.state === 'wounded' ? -1e6 : e.x + e.y + z * 4, r * SPR_K * 1.8 + 6, r * SPR_K * 3.2 + z * SPR_K + 10, drawUpright, e);
  }
  if (G.mode !== 'dead' && G.mode !== 'title') addPt(P.x, P.y, P.x + P.y + (P.z || 0) * 4, 20, 34, drawUpright, P);
  for (const t of trees) if (inView(t.x, t.y, 60)) addPt(t.x, t.y, t.x + t.y, t.r, t.h * ISO_KZ + t.r, drawIsoTree, t);
  for (const d of decos) if (inView(d.x, d.y, 60)) addPt(d.x, d.y, d.x + d.y, 14, 40, drawIsoHoop, d);
  for (const l of lamps) if (inView(l.x, l.y, 40)) addPt(l.x, l.y, l.x + l.y, 3, 20, drawIsoLamp, l);
  for (const p of pickups) if (inView(p.x, p.y, 30)) addPt(p.x, p.y, p.x + p.y, 8, 12, pp => { uprightT(pp.x, pp.y); drawPickup(pp); }, p);
  _pts.sort((a, b) => a.slot - b.slot || a.key - b.key);
  ISO.upright = true; ISO.lasers.length = 0;
  let pi = 0;
  for (let i = 0; i <= _boxes.length; i++) {
    while (pi < _pts.length && _pts[pi].slot === i) { const p = _pts[pi++]; p.draw(p.o); artT(); ctx.globalAlpha = 1; }
    if (i < _boxes.length) { const b = _boxes[i]; b.draw(b.o); }
  }
  ISO.upright = false;
  // ---- overlays on the ground (pixel effects, art space): warnings, aim lasers, hostile markers, telekinesis, effects, splashes ----
  artT();
  drawWarns();
  for (const e of ISO.lasers) drawAimLaser(e);
  drawHostileMarks();
  drawTKOverlay(); drawCharsFlatOver(); drawEffects();
  updateSplashes(dt);
  artT(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  drawRain(dt);
  // ---- scale the art up with hard pixels, then full-res post effects ----
  ctx = mainCtx;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false; ctx.drawImage(artCv, 0, 0, cv.width, cv.height); ctx.imageSmoothingEnabled = true;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (G.mode !== 'title') {
    if (G.karma > 15) { ctx.fillStyle = `rgba(60,160,255,${.05 * G.karma / 100})`; ctx.fillRect(0, 0, W, H); }
    else if (G.karma < -15) { ctx.fillStyle = `rgba(255,30,50,${.09 * -G.karma / 100})`; ctx.fillRect(0, 0, W, H); }
  }
  ctx.drawImage(vignette, 0, 0, W, H);
  if (G.mode !== 'title' && P.hp < S.maxHp * .3 && G.mode !== 'dead') { ctx.globalAlpha = .45 + .25 * Math.sin(G.time * 7); ctx.drawImage(redVig(), 0, 0, W, H); ctx.globalAlpha = 1; }
  if (G.flash > 0) { ctx.fillStyle = rgba(G.flashCol, Math.min(.4, G.flash)); ctx.fillRect(0, 0, W, H); }
}
