/* ============================== 11j EFFECTS, SECOND PASS ============================== */
/* The first pixel pass (11e) made the effects crisp but thin: an explosion was a ring and a smudge, smoke was a blur,
   pickups were soft dots. This pass gives them body: explosions get a fireball that rises and cools from white through
   yellow, orange and red into smoke; smoke and dust are chunky puffs that break up as they fade; shockwaves are a
   dithered band behind a bright edge; the gravity well has spiral arms and light falling in; pickups are small sprites.
   The sizes that matter for play (blast radius ring, well reach, warning shapes) are unchanged. */

/* ---------- pixel helpers (art space) ---------- */
function iring(cx, cy, r, col) {   // one-pixel circle
  ctx.fillStyle = col; cx = Math.round(cx); cy = Math.round(cy); let x = Math.round(r), y = 0, err = 1 - x;
  while (x >= y) {
    ctx.fillRect(cx + x, cy + y, 1, 1); ctx.fillRect(cx + y, cy + x, 1, 1); ctx.fillRect(cx - x, cy + y, 1, 1); ctx.fillRect(cx - y, cy + x, 1, 1);
    ctx.fillRect(cx + x, cy - y, 1, 1); ctx.fillRect(cx + y, cy - x, 1, 1); ctx.fillRect(cx - x, cy - y, 1, 1); ctx.fillRect(cx - y, cy - x, 1, 1);
    y++; if (err < 0) err += 2 * y + 1; else { x--; err += 2 * (y - x) + 1; }
  }
}
function iarcPx(cx, cy, r, a0, a1, col) { ctx.fillStyle = col; const n = Math.max(2, Math.round(r * Math.abs(a1 - a0) * 1.3)); for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1); } }
// filled ellipse; thin: 0 solid, 1 three pixels in four, 2 checkerboard, 3 one pixel in four
function iblob(cx, cy, rx, ry, col, thin = 0) {
  ctx.fillStyle = col; cx = Math.round(cx); cy = Math.round(cy); if (thin) ctx.beginPath();   // dithered pixels go into one path and one fill: far cheaper than a call per pixel
  for (let dy = -Math.ceil(ry); dy <= ry; dy++) {
    const h = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry)))); if (h <= 0) continue;
    if (!thin) { ctx.fillRect(cx - h, cy + dy, h * 2, 1); continue; }
    for (let dx = -h; dx < h; dx++) { const e = ((dx + cx) & 1) + ((dy + cy) & 1) * 2; if (thin === 1 ? e !== 0 : thin === 2 ? (e === 0 || e === 3) : e === 0) ctx.rect(cx + dx, cy + dy, 1, 1); }
  }
  if (thin) ctx.fill();
}
// dithered ring on the ground between two radii
function gBand(x, y, r0, r1, col) {
  if (r1 <= 0) return; r0 = Math.max(0, r0);
  const c = isoXY(x, y, 0), cx = Math.round(c[0]), cy = Math.round(c[1]), ax = r1 * ISO_RX, ay = r1 * ISO_RY, bx = r0 * ISO_RX, by = r0 * ISO_RY; ctx.fillStyle = col; ctx.beginPath();
  for (let dy = Math.max(-Math.ceil(ay), -cy - 1); dy <= ay && cy + dy <= ART_H; dy++) {
    const ho = Math.round(ax * Math.sqrt(Math.max(0, 1 - dy * dy / (ay * ay)))), hi = by > 0 && Math.abs(dy) < by ? Math.round(bx * Math.sqrt(Math.max(0, 1 - dy * dy / (by * by)))) : 0;
    for (let dx = Math.max(-ho, -cx - 1); dx < ho && cx + dx <= ART_W; dx++) { if (dx >= -hi && dx < hi) { dx = hi - 1; continue; } if (((dx + dy + cx + cy) & 1) === 0) ctx.rect(cx + dx, cy + dy, 1, 1); }
  }
  ctx.fill();
}
// the ground arc from the first pass, with its pixels batched into one fill
function gArc(x, y, r, a0, a1, col, z = 0) {
  const n = Math.max(6, Math.round(r * ISO_RX * Math.abs(a1 - a0) * 1.2));
  ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n), p = isoXY(x + Math.cos(a) * r, y + Math.sin(a) * r, z), X = Math.round(p[0]), Y = Math.round(p[1]); if (X >= -1 && Y >= -1 && X <= ART_W && Y <= ART_H) ctx.rect(X, Y, 1, 1); }
  ctx.fill();
}
// and the dithered ground disc
function gDither(x, y, r, col) {
  const c = isoXY(x, y, 0), rx = r * ISO_RX, ry = r * ISO_RY, cx = Math.round(c[0]), cy = Math.round(c[1]); ctx.fillStyle = col; ctx.beginPath();
  for (let dy = Math.max(-Math.ceil(ry), -cy - 1); dy <= ry && cy + dy <= ART_H; dy++) { const h = Math.round(rx * Math.sqrt(Math.max(0, 1 - dy * dy / (ry * ry)))); for (let dx = Math.max(-h, -cx - 1); dx < h && cx + dx <= ART_W; dx++) if (((dx + dy + cx + cy) & 1) === 0) ctx.rect(cx + dx, cy + dy, 1, 1); }
  ctx.fill();
}
const _pale = c => typeof c === 'string' && c.length === 7 ? mix(c, '#ffffff', .55) : c;
const FIRE_RAMP = ['#ffffff', '#fff2a8', '#ffc640', '#ff8a24', '#d8421c', '#7a2c22', '#3d3038', '#2a2830'];

/* ---------- particles, bullets, rings, wells ---------- */
function drawEffects() {
  const t = G.time;
  // gravity wells: a dark pit, three arms winding in, sparks of light falling in, the faint rim of its reach
  for (const w of wells) {
    const f = Math.min(1, w.t * 2, (w.max - w.t) * 4); if (f <= 0) continue;
    ctx.globalAlpha = .5 * f; gDither(w.x, w.y, 36, '#1a0038'); ctx.globalAlpha = .75 * f; gDisc(w.x, w.y, 19, '#0d0020');
    for (let arm = 0; arm < 3; arm++) for (let i = 0; i < 26; i++) {
      const rad = 9 + i * 2.5, ang = w.a * 1.5 + arm * TAU / 3 - i * .2, p = isoXY(w.x + Math.cos(ang) * rad, w.y + Math.sin(ang) * rad, 0);
      ctx.globalAlpha = f * (1 - i / 30); ctx.fillStyle = i < 5 ? '#ffffff' : i < 13 ? '#e0c8ff' : '#9a78e0'; ctx.fillRect(Math.round(p[0]), Math.round(p[1]), i < 9 ? 2 : 1, 1);
    }
    for (let i = 0; i < 12; i++) {
      const q = (t * .9 + i * .37 + w.x * .013) % 1, ang = i * 2.4 + w.a * .4, rad = 10 + (w.r - 10) * (1 - q) * .92, p = isoXY(w.x + Math.cos(ang) * rad, w.y + Math.sin(ang) * rad, 0);
      ctx.globalAlpha = f * Math.min(1, q * 1.6); ctx.fillStyle = q > .7 ? '#ffffff' : '#d8c4ff'; ctx.fillRect(Math.round(p[0]), Math.round(p[1]), 1, 1);
    }
    ctx.globalAlpha = .28 * f; gRing(w.x, w.y, w.r, '#c8a8ff');
    ctx.globalAlpha = f; gDisc(w.x, w.y, 8 * f, '#000000'); gRing(w.x, w.y, 9 * f, '#b090f0');
    ctx.globalAlpha = 1; const c = isoXY(w.x, w.y, 0); iglow(c[0], c[1], 26, '#8a50ff', .35 * f);
  }
  for (const b of bullets) {
    if (!inView(b.x, b.y, 20)) continue;
    const a = isoXY(b.x, b.y, 6), c = isoXY(b.x - b.vx * .03, b.y - b.vy * .03, 6);
    iline(c, a, b.col); ipx(a[0], a[1], '#ffffff');
    if (b.r > 4) { ipx(a[0] + 1, a[1], b.col); ipx(a[0], a[1] + 1, b.col); }
    iglow(a[0], a[1], b.r * 2.4, b.col, .6);
  }
  // shockwaves: heavy ones are a dithered band behind a bright leading edge
  for (const r of rings) {
    const a = Math.max(0, r.life / r.ml), R = Math.max(0, r.r);
    if (r.w >= 4) { ctx.globalAlpha = a * .5; gBand(r.x, r.y, R - 4 - r.w * 1.8, R - 1, r.col); ctx.globalAlpha = a; gRing(r.x, r.y, R, _pale(r.col)); gRing(r.x, r.y, Math.max(0, R - 1.6), r.col); }
    else { ctx.globalAlpha = a; gRing(r.x, r.y, R, r.col); if (r.w > 2.5) gRing(r.x, r.y, Math.max(0, R - 3), r.col); }
  }
  ctx.globalAlpha = 1;
  // smoke and dust: round puffs that lift a little, then break up into a dither and are gone
  for (const p of parts) {
    if (p.k !== 'm') continue;
    const smoke = p.g > 2, a = clamp(p.life / p.max, 0, 1), r = p.w * (1 + (1 - a) * (p.g - 1) * .5), v = (p.w * 7.3) % 1;   // v: this puff's own rhythm
    const c = isoXY(p.x, p.y, (1 - a) * (smoke ? 34 + v * 22 : 8)), rx = clamp(r * (smoke ? .3 : .5), 1, smoke ? 9 : 5), ry = Math.max(1, rx * .82);
    const k = a + (v - .5) * .22, thin = k > .58 ? 0 : k > .4 ? 1 : k > .2 ? 2 : 3;
    ctx.globalAlpha = thin ? .85 : .8; iblob(c[0], c[1], rx, ry, p.col, thin);
    if (thin < 2 && rx >= 3) { ctx.globalAlpha = .7; iblob(c[0] - rx * .25, c[1] - ry * .3, rx * .55, ry * .5, shade(p.col, 1.45), thin); }
    if (!thin && rx >= 4) { ctx.globalAlpha = .5; iblob(c[0] + rx * .3, c[1] + ry * .35, rx * .5, ry * .4, shade(p.col, .7), 2); }   // shaded underside
  }
  ctx.globalAlpha = 1;
  // fireballs: old cool puffs first, the hot ones on top
  for (let pass = 0; pass < 2; pass++) for (const p of parts) {
    if (p.k !== 'f') continue;
    const u = 1 - clamp(p.life / p.max, 0, 1); if ((u >= .45) !== (pass === 0)) continue;
    const c = isoXY(p.x, p.y, p.z || 0), grow = u < .12 ? .55 + u / .12 * .45 : 1 - (u - .12) * .45, r = Math.max(1, p.w * grow), i = Math.min(FIRE_RAMP.length - 1, Math.floor(u * FIRE_RAMP.length));
    if (u > .8) { ctx.globalAlpha = .8; iblob(c[0], c[1], r, r * .85, FIRE_RAMP[i], u > .9 ? 2 : 1); ctx.globalAlpha = 1; continue; }
    idisc(c[0], c[1], r + 1, FIRE_RAMP[Math.min(FIRE_RAMP.length - 1, i + 2)]);   // darker rim
    idisc(c[0], c[1], r, FIRE_RAMP[i]);
    if (i > 0 && r > 2) idisc(c[0] - r * .22, c[1] - r * .28, r * .55, FIRE_RAMP[i - 1]);   // hotter heart, up and to the left
    if (p.heart && u < .6) iglow(c[0], c[1], r * 4.5, '#ff9a40', .5 * (1 - u));   // one glow for the whole fireball, not one per puff
  }
  for (const p of parts) {
    const a = clamp(p.life / p.max, 0, 1);
    if (p.k === 's') { ctx.globalAlpha = Math.min(1, a * 1.6); const h = isoXY(p.x, p.y, 4), tl = isoXY(p.x - p.vx * .035, p.y - p.vy * .035, 4); iline(tl, h, p.col); ipx(h[0], h[1], '#ffffff'); }
    else if (p.k === 'd') { ctx.globalAlpha = a; const h = isoXY(p.x, p.y, 4), s = p.w > 2.2 ? 2 : 1; ctx.fillStyle = p.col; ctx.fillRect(Math.round(h[0]), Math.round(h[1]), s, s); }
    else if (p.k === 'r') {   // debris: a tumbling chip with a dark underside
      ctx.globalAlpha = Math.min(1, a * 2); const hop = Math.sin(clamp(1 - a, 0, 1) * Math.PI) * 10, h = isoXY(p.x, p.y, 2 + hop), s = Math.max(1, Math.round(p.w * .6)), turn = Math.floor(p.a * 2) & 1, X = Math.round(h[0]), Y = Math.round(h[1]), w = turn ? s : s + 1, hh = turn ? s + 1 : s;
      ctx.fillStyle = OUT; ctx.fillRect(X, Y + 1, w, hh); ctx.fillStyle = p.col; ctx.fillRect(X, Y, w, hh); if (s > 1) { ctx.fillStyle = shade(p.col, 1.5); ctx.fillRect(X, Y, 1, 1); }
    }
    else if (p.k === 'g') { ctx.globalAlpha = a * .45; gDither(p.x, p.y, p.boss ? 20 : p.sup ? 10 : 9, p.col); }
  }
  ctx.globalAlpha = 1;
  for (const l of dlights) { const c = isoXY(l.x, l.y, 0); iglow(c[0], c[1], l.r * ISO_RX, l.col, l.a * (l.life / l.max)); }
  ctx.globalAlpha = 1;
}

/* ---------- pickups: small sprites that bob over a shadow ---------- */
const PICK_ART = {
  hp: px(`
    ..ggg..
    ..gWg..
    ggGWGgg
    gWWWWWg
    ggGWGgg
    ..gWg..
    ..ggg..`),
  en: px(`
    ...WC
    ..WC.
    .WCc.
    WCCCC
    .cCC.
    .CC..
    CC...
    c....`),
  shard: px(`
    ...w...
    ..wWc..
    .wWWcc.
    .wWccd.
    wWWccdd
    wWcccdd
    .wccdd.
    .wccdd.
    ..cdd..
    ..cd...
    ...d...`)
};
const PICK_PAL = {
  hp: { g: '#2fbf6a', G: '#5fffa0', W: '#eafff2' },
  en: { C: '#3ce0ff', c: '#1c9ad0', W: '#f0fdff' },
  shard: { w: '#ffffff', W: '#c8fff4', c: '#7affea', d: '#2aa890' }
};
function drawPickup(p) {
  artT();
  const b = isoXY(p.x, p.y, 0), t = G.time, bob = Math.round(Math.sin(t * 4 + p.x) * 1.4), X = Math.round(b[0]), Y = Math.round(b[1]);
  if (p.type === 'shard') {   // only shows itself when you are close
    const d = dist(p, P); if (d > 170) return; const a = clamp((170 - d) / 60, 0, 1), c = pxCanvas('pk_shard', PICK_ART.shard, PICK_PAL.shard, '#063a34');
    ctx.globalAlpha = a * .35; iblob(X, Y, 4, 2, '#000000'); ctx.globalAlpha = a;
    iglow(X, Y - 8 + bob, 18, '#7affea', .55 * a); ctx.globalAlpha = a; ctx.drawImage(c, X - 4, Y - 15 + bob);
    const tw = (t * 1.3 + p.x * .01) % 1; if (tw < .22) { const sx = X - 2 + ((p.x | 0) % 3), sy = Y - 12 + bob, s = tw < .11 ? 1 : 2; ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - s, sy, s * 2 + 1, 1); ctx.fillRect(sx, sy - s, 1, s * 2 + 1); }   // a glint
    ctx.globalAlpha = 1; return;
  }
  const hp = p.type === 'hp', c = pxCanvas(hp ? 'pk_hp' : 'pk_en', hp ? PICK_ART.hp : PICK_ART.en, hp ? PICK_PAL.hp : PICK_PAL.en, hp ? '#06301a' : '#062a44'), col = hp ? '#5fffa0' : '#3ce0ff';
  const fade = p.life < 3 ? (Math.sin(t * 18) > 0 ? 1 : .35) : 1;                      // blinks before it goes
  ctx.globalAlpha = .35; iblob(X, Y, 3, 1.5, '#000000');
  iglow(X, Y - 6 + bob, 11, col, .55 * fade); ctx.globalAlpha = fade; ctx.drawImage(c, X - (c.width >> 1), Y - c.height - 1 + bob); ctx.globalAlpha = 1;
}
