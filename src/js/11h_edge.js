/* ============================== 11h THE EDGE OF THE MAP ============================== */
/* The city is ringed by roads, so nothing leads off the map; past the outer road there used to be flat black. Now the
   outer road is a waterfront: a kerb, a quay wall on the two sides that face the camera, and dark water with slow
   ripples and the odd channel buoy. Nothing here collides or is simulated; it is only drawn. */
const SEA = { base: '#0b1729', deep: '#081120', kerb: '#4a5163', wallS: '#262b38', wallE: '#1a1e28', rip: '#1d3458', hi: '#3d6399' };
function seaInView() { return cam.x < 0 || cam.y < 0 || cam.x + cam.w > WORLD_W || cam.y + cam.h > WORLD_H; }
// ground pass (affine): water under everything, a paler band near the shore, the kerb along the edge of the road
function drawSea() {
  if (!seaInView()) return;
  const x0 = cam.x - 80, y0 = cam.y - 80, w = cam.w + 160, h = cam.h + 160;
  ctx.fillStyle = SEA.deep; ctx.fillRect(x0, y0, w, h);
  ctx.fillStyle = SEA.base; ctx.fillRect(-150, -150, WORLD_W + 300, WORLD_H + 300);           // shallower, a touch lighter, near the quay
  ctx.fillStyle = 'rgba(80,130,200,.06)'; ctx.fillRect(-70, -70, WORLD_W + 140, WORLD_H + 140);
  ctx.fillStyle = SEA.kerb; ctx.fillRect(-5, -5, WORLD_W + 10, WORLD_H + 10);                 // kerb; the districts' ground is painted over its inside
}
// art pass: quay wall faces (south and east only: the other two face away), ripples, buoys
function drawSeaArt() {
  if (!seaInView()) return;
  const t = G.time, D = 14;   // the water lies this far below the street
  if (cam.y + cam.h > WORLD_H) { const a = isoXY(-5, WORLD_H + 5, 0), b = isoXY(WORLD_W + 5, WORLD_H + 5, 0); ipoly([a, b, [b[0], b[1] + D * ISO_KZ], [a[0], a[1] + D * ISO_KZ]], SEA.wallS); iline([a[0], a[1] + D * ISO_KZ], [b[0], b[1] + D * ISO_KZ], '#2c4a78'); }
  if (cam.x + cam.w > WORLD_W) { const a = isoXY(WORLD_W + 5, WORLD_H + 5, 0), b = isoXY(WORLD_W + 5, -5, 0); ipoly([a, b, [b[0], b[1] + D * ISO_KZ], [a[0], a[1] + D * ISO_KZ]], SEA.wallE); iline([a[0], a[1] + D * ISO_KZ], [b[0], b[1] + D * ISO_KZ], '#223a60'); }
  // ripples: one possible dash per 40 px cell of water, each with its own slow rhythm
  const C = 26, cx0 = Math.floor((cam.x - 40) / C), cx1 = Math.ceil((cam.x + cam.w + 40) / C), cy0 = Math.floor((cam.y - 40) / C), cy1 = Math.ceil((cam.y + cam.h + 40) / C);
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
    const wx = cx * C, wy = cy * C; if (wx > -14 && wy > -14 && wx < WORLD_W + 14 && wy < WORLD_H + 14) { if (wx > 0 && wy > 0 && wx < WORLD_W && wy < WORLD_H) { cx = Math.max(cx, Math.min(cx1, Math.floor(WORLD_W / C))); } continue; }
    const hsh = hash2(cx + 9000, cy + 9000), ph = (hsh & 1023) / 1023 * 6.28, s = Math.sin(t * (.5 + ((hsh >> 10) & 7) * .06) + ph);
    if (s < .1) continue;
    const p = isoXY(wx + ((hsh >> 13) & 31) * .8, wy + ((hsh >> 18) & 31) * .8, -D), X = Math.round(p[0] + Math.sin(t * .4 + ph) * 2), Y = Math.round(p[1]);
    if (X < -6 || Y < -2 || X > ART_W + 6 || Y > ART_H + 2) continue;
    const off = Math.max(-wx, wx - WORLD_W, -wy, wy - WORLD_H), len = 2 + ((hsh >> 23) & 3);   // how far from the quay
    let c = s > .78 ? SEA.hi : SEA.rip;
    if (off < 190 && ((hsh >> 26) & 3) === 0) { const d = districtAt(clamp(wx, 1, WORLD_W - 1)); c = mix(SEA.base, neonPal(d)[(hsh >> 28) & 3], (s > .78 ? .75 : .45) * (1 - off / 230)); }   // city lights on the water
    ctx.fillStyle = c; ctx.fillRect(X, Y, len, 1); if (s > .78 && len > 3) { ctx.fillStyle = SEA.rip; ctx.fillRect(X + 1, Y + 1, len - 1, 1); }
  }
  // channel buoys far out: a slow red or green blink
  const B = 420;
  for (let by = Math.floor((cam.y - 60) / B); by <= Math.ceil((cam.y + cam.h + 60) / B); by++) for (let bx = Math.floor((cam.x - 60) / B); bx <= Math.ceil((cam.x + cam.w + 60) / B); bx++) {
    const hsh = hash2(bx + 500, by + 700), wx = bx * B + (hsh & 255), wy = by * B + ((hsh >> 8) & 255);
    if (wx > -110 && wy > -110 && wx < WORLD_W + 110 && wy < WORLD_H + 110) continue;
    const p = isoXY(wx, wy, -D), X = Math.round(p[0]), Y = Math.round(p[1]) + (Math.sin(t * 1.3 + hsh) > 0 ? 0 : 1); if (X < -4 || Y < -4 || X > ART_W + 4 || Y > ART_H + 4) continue;
    const col = hsh & 65536 ? '#ff3b4a' : '#3bff8a', on = Math.sin(t * 1.6 + (hsh & 63)) > .2;
    ctx.fillStyle = '#0d1118'; ctx.fillRect(X - 1, Y - 1, 3, 2); ctx.fillStyle = '#39404e'; ctx.fillRect(X, Y - 3, 1, 2);
    ctx.fillStyle = on ? col : shade(col, .25); ctx.fillRect(X, Y - 4, 1, 1); if (on) { iglow(X + .5, Y - 3.5, 5, col, .7); ctx.fillStyle = rgba(col, .35); ctx.fillRect(X, Y + 1, 1, 2); }
  }
}
