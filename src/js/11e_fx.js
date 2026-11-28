/* ============================== 11e PIXEL EFFECTS ============================== */
/* Combat effects redrawn as crisp pixels in the iso art canvas: sparks, debris, smoke, bullets,
   shockwave rings, gravity wells, fire zones, attack warnings, the telekinesis tether and throw line,
   aim lasers, rain splashes and the ground rings under characters.
   Everything on the ground is placed through the iso projection (a circle on the ground becomes a flat
   pixel ellipse). Light itself (lamp pools, muzzle flashes, glows) stays soft. */
const ISO_RX = ISO_K * Math.SQRT2, ISO_RY = ISO_RX / 2;   // a ground circle of radius r -> ellipse r*ISO_RX by r*ISO_RY
function gArc(x, y, r, a0, a1, col, z = 0) {          // pixel arc on the ground
  const n = Math.max(6, Math.round(r * ISO_RX * Math.abs(a1 - a0) * 1.2));
  ctx.fillStyle = col;
  for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n), p = isoXY(x + Math.cos(a) * r, y + Math.sin(a) * r, z); ctx.fillRect(Math.round(p[0]), Math.round(p[1]), 1, 1); }
}
const gRing = (x, y, r, col) => gArc(x, y, r, 0, TAU, col);
function gDisc(x, y, r, col) { const c = isoXY(x, y, 0); iellipse(c[0], c[1], Math.max(1, r * ISO_RX), Math.max(1, r * ISO_RY), col); }
function gDither(x, y, r, col) { // checkerboard-filled ground ellipse (see-through without blending)
  const c = isoXY(x, y, 0), rx = r * ISO_RX, ry = r * ISO_RY, cx = Math.round(c[0]), cy = Math.round(c[1]); ctx.fillStyle = col;
  for (let dy = -Math.ceil(ry); dy <= ry; dy++) { const h = Math.round(rx * Math.sqrt(Math.max(0, 1 - dy * dy / (ry * ry)))); for (let dx = -h; dx < h; dx++) if (((dx + dy + cx + cy) & 1) === 0) ctx.fillRect(cx + dx, cy + dy, 1, 1); }
}
const gLine = (x0, y0, x1, y1, col) => iline(isoXY(x0, y0, 0), isoXY(x1, y1, 0), col);

/* ---------- particles, bullets, rings, wells ---------- */
function drawEffects() {
  const t = G.time;
  for (const w of wells) {
    const f = Math.min(1, w.t * 2, (w.max - w.t) * 4);
    ctx.globalAlpha = .55 * f; gDisc(w.x, w.y, 20, '#14002a'); ctx.globalAlpha = f;
    for (let i = 0; i < 3; i++) { const a0 = w.a * (1 + i * .3) + i * 2; gArc(w.x, w.y, 22 + i * 14 + Math.sin(w.a * 2 + i) * 3, a0, a0 + 2.2, i === 0 ? '#e0c8ff' : '#b090f0'); }
    ctx.globalAlpha = .25 * f; gRing(w.x, w.y, w.r, '#c8a8ff');
    ctx.globalAlpha = 1; gDisc(w.x, w.y, 7 * f, '#000000');
  }
  for (const b of bullets) {
    if (!inView(b.x, b.y, 20)) continue;
    const a = isoXY(b.x, b.y, 6), c = isoXY(b.x - b.vx * .03, b.y - b.vy * .03, 6);
    iline(c, a, b.col); ipx(a[0], a[1], '#ffffff');
    if (b.r > 4) { ipx(a[0] + 1, a[1], b.col); ipx(a[0], a[1] + 1, b.col); }
    iglow(a[0], a[1], b.r * 2.4, b.col, .6);
  }
  for (const r of rings) { ctx.globalAlpha = Math.max(0, r.life / r.ml); gRing(r.x, r.y, Math.max(0, r.r), r.col); if (r.w > 2.5) gRing(r.x, r.y, Math.max(0, r.r - 3), r.col); }
  ctx.globalAlpha = 1;
  for (const p of parts) {   // smoke and dust first, under the bright stuff
    if (p.k !== 'm') continue;
    const a = clamp(p.life / p.max, 0, 1), r = p.w * (1 + (1 - a) * (p.g - 1));
    ctx.globalAlpha = a * .5; gDisc(p.x, p.y, r, p.col); ctx.globalAlpha = a * .35; gDisc(p.x - r * .2, p.y - r * .3, r * .6, shade(p.col, 1.35));
  }
  ctx.globalAlpha = 1;
  for (const p of parts) {
    const a = clamp(p.life / p.max, 0, 1);
    if (p.k === 's') { ctx.globalAlpha = Math.min(1, a * 1.6); const h = isoXY(p.x, p.y, 4), tl = isoXY(p.x - p.vx * .035, p.y - p.vy * .035, 4); iline(tl, h, p.col); ipx(h[0], h[1], '#ffffff'); }
    else if (p.k === 'd') { ctx.globalAlpha = a; const h = isoXY(p.x, p.y, 4), s = p.w > 2.2 ? 2 : 1; ctx.fillStyle = p.col; ctx.fillRect(Math.round(h[0]), Math.round(h[1]), s, s); }
    else if (p.k === 'r') { ctx.globalAlpha = Math.min(1, a * 2); const h = isoXY(p.x, p.y, 2), s = Math.max(1, Math.round(p.w * .6)), turn = Math.floor(p.a * 2) & 1; ctx.fillStyle = p.col; ctx.fillRect(Math.round(h[0]), Math.round(h[1]), turn ? s : s + 1, turn ? s + 1 : s); ctx.fillStyle = OUT; ctx.fillRect(Math.round(h[0]), Math.round(h[1]) + (turn ? s + 1 : s), turn ? s : s + 1, 1); }
    else if (p.k === 'g') { ctx.globalAlpha = a * .45; gDither(p.x, p.y, p.boss ? 20 : p.sup ? 10 : 9, p.col); }
  }
  ctx.globalAlpha = 1;
  for (const l of dlights) { const c = isoXY(l.x, l.y, 0); iglow(c[0], c[1], l.r * ISO_RX, l.col, l.a * (l.life / l.max)); }
  ctx.globalAlpha = 1;
}

/* ---------- attack warnings and fire ---------- */
function drawWarns() {
  for (const w of warns) {
    const k = 1 - w.life / w.max, blink = Math.sin(G.time * 30) > 0, col = w.col;
    if (w.k === 'circle') {
      ctx.globalAlpha = .18 + .2 * k; gDither(w.x, w.y, w.r, col);
      ctx.globalAlpha = blink ? 1 : .6; gRing(w.x, w.y, w.r, col); gRing(w.x, w.y, w.r * k, mix(col, '#ffffff', .4));
    } else {
      // a thin laser-pointer line from the attacker, not a band on the ground (the user finds big floor markings gaudy).
      // It draws out from the attacker as the wind-up runs and blinks faster just before the attack.
      const c = Math.cos(w.ang), s = Math.sin(w.ang), L = w.len * Math.min(1, .35 + k * .9), a0 = isoXY(w.x, w.y, 8), a1 = isoXY(w.x + c * L, w.y + s * L, 8);
      const fast = k > .7 ? Math.sin(G.time * 60) > 0 : blink;
      ctx.globalAlpha = fast ? .95 : .55; iline(a0, a1, col); ipx(a1[0], a1[1], '#ffffff');
    }
    ctx.globalAlpha = 1;
  }
  for (const z of zones) {
    const a = Math.min(1, z.t), t = G.time;
    ctx.globalAlpha = .4 * a; gDither(z.x, z.y, z.r, '#ff6a1e');
    ctx.globalAlpha = a;
    for (let i = 0; i < 9; i++) { // little pixel flames licking up
      const q = t * 5 + i * 2.3 + z.x, rr = z.r * (.2 + .7 * ((i * 37) % 10) / 10), an = i * 2.4 + Math.sin(q * .3);
      const p = isoXY(z.x + Math.cos(an) * rr, z.y + Math.sin(an) * rr, 0), h = 2 + Math.round((Math.sin(q) * .5 + .5) * 4);
      ctx.fillStyle = '#ff7020'; ctx.fillRect(Math.round(p[0]), Math.round(p[1]) - h, 2, h); ctx.fillStyle = '#ffd080'; ctx.fillRect(Math.round(p[0]), Math.round(p[1]) - h, 1, Math.max(1, h - 2));
    }
    ctx.globalAlpha = 1;
  }
}

/* ---------- telekinesis: target brackets, tether, throw line ---------- */
function drawTKOverlay() {
  const t = G.time, kc = kcol();
  if (tkTarget && !P.holding && G.mode === 'play') {
    const e = tkTarget, r = e.r + 7 + (Math.sin(t * 8) > 0 ? 1 : 0);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + t * 1.5; gArc(e.x, e.y, r, a, a + .7, kc); }
  }
  const h = P.holding;
  if (h && !h.dead) {
    const hand = isoXY(P.x + aim.dx * 8, P.y + aim.dy * 8, 0); hand[1] -= 9;
    const obj = isoXY(h.x, h.y, 0); obj[1] -= 6 + (h.z || 0) * .5;
    // jittery pixel tether: a karma-coloured strand with a white core
    let prev = hand; const n = 7, nx = -(obj[1] - hand[1]), ny = obj[0] - hand[0], nl = Math.hypot(nx, ny) || 1;
    for (let i = 1; i <= n; i++) {
      const q = i / n, wob = Math.round(Math.sin(t * 30 + i * 1.7) * 2 * Math.sin(q * Math.PI));
      const p = [lerp(hand[0], obj[0], q) + nx / nl * wob, lerp(hand[1], obj[1], q) + ny / nl * wob];
      iline([prev[0], prev[1] + 1], [p[0], p[1] + 1], kc); iline(prev, p, '#ffffff'); prev = p;
    }
    iglow(obj[0], obj[1], h.r * 1.3, kc, .45); iglow(hand[0], hand[1], 8, kc, .8);
    if (traj) {
      const L = Math.hypot(traj.x1 - traj.x0, traj.y1 - traj.y0), dx = (traj.x1 - traj.x0) / (L || 1), dy = (traj.y1 - traj.y0) / (L || 1), tc = mix(kc, '#ffffff', .35);
      for (let s = (t * 260) % 18; s < L; s += 18) { ctx.globalAlpha = .95 - s / L * .5; const p = isoXY(traj.x0 + dx * s, traj.y0 + dy * s, 0); ctx.fillStyle = OUT; ctx.fillRect(Math.round(p[0]) - 1, Math.round(p[1]) + 1, 3, 2); ctx.fillStyle = tc; ctx.fillRect(Math.round(p[0]) - 1, Math.round(p[1]), 3, 2); }
      ctx.globalAlpha = 1;
      const tg = traj.hit && (traj.hit.team === 'gang' || traj.hit.team === 'police') ? traj.hit : traj.assist;
      if (tg) {
        const r = tg.r + 10, c = tg.team === 'police' && !(G.heat >= 1) ? '#8fb4ff' : '#ff3d5a';
        gRing(tg.x, tg.y, r, c);
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + t * 2; gLine(tg.x + Math.cos(a) * (r - 5), tg.y + Math.sin(a) * (r - 5), tg.x + Math.cos(a) * (r + 6), tg.y + Math.sin(a) * (r + 6), c); }
      } else gRing(traj.x1, traj.y1, 7, kc);
    }
  }
  if (Input.device === 'pad' && G.mode === 'play' && P.wellCd <= 0 && P.energy >= 32 && Input.aimStick() && !P.holding) {   // gravity-well reticle
    const d = Math.min(aim.dist, raycast(P.x, P.y, aim.dx, aim.dy, aim.dist) - 10), x = P.x + aim.dx * d, y = P.y + aim.dy * d;
    ctx.globalAlpha = .5; for (let i = 0; i < 8; i++) gArc(x, y, 14, i * TAU / 8, i * TAU / 8 + .35, '#c8aaff'); ctx.globalAlpha = 1;
  }
}

/* ---------- lasers, splashes, character rings ---------- */
function drawAimLaser(e) {
  if (ISO.upright) { ISO.lasers.push(e); return; }
  const c = Math.cos(e.ang), s = Math.sin(e.ang), len = Math.min(380, raycast(e.x, e.y, c, s, 380)), k = 1 - e.aimT / .42;
  ctx.globalAlpha = .35 + .55 * k;
  const a = isoXY(e.x + c * 16, e.y + s * 16, 0), b = isoXY(e.x + c * len, e.y + s * len, 0); a[1] -= 8; b[1] -= 8;
  iline(a, b, e.team === 'police' ? '#78aaff' : '#ff3c50'); ipx(b[0], b[1], '#ffffff');
  ctx.globalAlpha = 1;
}
function updateSplashes(dt) {
  const n = dt * 60; for (let i = 0; i < n; i++) if (splashes.length < 70) splashes.push({ x: cam.x + rnd(cam.w), y: cam.y + rnd(cam.h), t: 0 });
  for (const s of splashes) s.t += dt * 3; splashes = splashes.filter(s => s.t < 1);
  ctx.fillStyle = 'rgba(190,210,255,.4)';
  for (const s of splashes) {
    const p = isoXY(s.x, s.y, 0), X = Math.round(p[0]), Y = Math.round(p[1]), r = Math.round(1 + s.t * 2.5);
    if (s.t < .3) ctx.fillRect(X, Y - 1, 1, 1);
    else { ctx.fillRect(X - r, Y, 1, 1); ctx.fillRect(X + r, Y, 1, 1); if (r > 1) { ctx.fillRect(X, Y - 1, 1, 1); ctx.fillRect(X, Y + 1, 1, 1); } }
  }
}
function drawCharsFlatUnder() {
  if (!P || G.mode === 'dead' || G.mode === 'title') return;
  const kc = kcol();
  ctx.globalAlpha = .25; gDisc(P.x, P.y, 15, kc); ctx.globalAlpha = .9; gRing(P.x, P.y, 15, kc); ctx.globalAlpha = 1;
}
function drawCharsFlatOver() {
  if (!P || !P.chan) return;
  const c = P.chan.c, k = P.chan.t / P.chan.need, col = P.chan.k === 'heal' ? '#5fe8ff' : '#ff3366';
  gArc(c.x, c.y, 20, -Math.PI / 2, -Math.PI / 2 + TAU * k, col); gArc(c.x, c.y, 21, -Math.PI / 2, -Math.PI / 2 + TAU * k, col);
  const a = isoXY(P.x, P.y, 0), b = isoXY(c.x, c.y, 0); a[1] -= 9; b[1] -= 7;
  ctx.globalAlpha = .8; iline(a, b, col); ctx.globalAlpha = 1; iglow(b[0], b[1], 16, col, .5);
}
function drawHostileMarks() { // faint ground rings so enemies behind buildings are never lost
  for (const e of _vis) if ((e.team === 'gang' && !e.static) || (e.kind === 'cop' && !e.ally && G.heat >= 1)) {
    ctx.globalAlpha = .55; gRing(e.x, e.y, e.r + 3, e.team === 'gang' ? '#ff4a5a' : '#6a9aff');
  }
  ctx.globalAlpha = 1;
}
