/* ============================== 11k MACHINES: DRAWING ============================== */
/* Small hand-placed pixel drawings for the machines in 09c, plus lightning and downed power lines. Each machine is
   drawn around its ground point; flyers hover above a shadow. Hit flash = white. */
function mr(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
function solarLid(x, y, w, h) { mr(x - 1, y - 1, w + 2, h + 2, '#0a0c12'); mr(x, y, w, h, '#1c2e50'); for (let i = 2; i < w; i += 3) mr(x + i, y, 1, h, '#2f4a7a'); mr(x, y, w, 1, '#8aa6d8'); }
function drawMachine(e) {
  const a = isoXY(e.x, e.y, 0), X = Math.round(a[0]), Y = Math.round(a[1]), t = G.time, fl = e.flash > 0, k = e.kind;
  const sx = Math.cos(e.ang || 0) - Math.sin(e.ang || 0) >= 0 ? 1 : -1;   // facing right or left on screen
  const W = c => fl ? '#ffffff' : c;
  if (k === 'cell') {   // battery bank: a chunky case, two terminals, charge bars, a warning label
    mr(X - 7, Y - 11, 14, 12, '#07080c'); mr(X - 6, Y - 10, 12, 10, W('#3a4a3a')); mr(X - 6, Y - 10, 12, 2, W('#5a6e58')); mr(X + 3, Y - 9, 3, 9, W('#2a362a'));
    mr(X - 4, Y - 13, 2, 3, '#9aa0aa'); mr(X + 2, Y - 13, 2, 3, '#c8503a');
    const lvl = 2 + ((t * 1.5 + e.id) % 3 | 0); for (let i = 0; i < 4; i++) mr(X - 4 + i * 2, Y - 6, 1, 3, i < lvl ? '#e0c040' : '#1a2018');
    mr(X - 4, Y - 3, 6, 1, '#e0b020'); if (e.hp < e.maxhp && Math.random() < .3) FX.sparks(e.x, e.y, 1, ZAP_COL, 90);
    return;
  }
  if (k === 'sweeper') {   // municipal street sweeper: orange body, solar lid, spinning brushes, amber beacon
    const b = (Math.floor(e.walk * 4) & 1);
    mr(X - 2, Y - 1, 10, 2, 'rgba(0,0,0,.35)');
    mr(X - 8, Y - 10, 16, 9, '#07080c'); mr(X - 7, Y - 9, 14, 7, W('#e0a030')); mr(X - 7, Y - 3, 14, 1, W('#a8701c')); mr(X - 7, Y - 9, 14, 1, W('#f0c060'));
    mr(X - 5 + (sx > 0 ? 6 : 0), Y - 7, 3, 2, '#2a2a32');   // a little window
    solarLid(X - 6, Y - 13, 12, 3);
    for (const bx of [X + sx * 7, X + sx * 4]) { mr(bx - 1, Y - 2, 3, 3, '#3a3228'); mr(bx - 1 + b, Y - 2, 1, 1, '#c8b890'); mr(bx + 1 - b, Y, 1, 1, '#c8b890'); }
    const on = Math.sin(t * 6 + e.id) > 0; mr(X - 1, Y - 15, 2, 2, on ? '#ffb030' : '#6a4a1a'); if (on) iglow(X, Y - 14, 5, '#ffb030', .45);
    return;
  }
  if (k === 'zapper' || k === 'mite') {   // flyers: hover over a shadow
    const small = k === 'mite', hov = (e.def.hover || 20) + Math.sin(t * 5 + e.id) * 1.5, hy = Y - Math.round(hov * .5);
    ctx.globalAlpha = .35; iellipse(X, Y, small ? 3 : 6, small ? 1.5 : 3, '#000'); ctx.globalAlpha = 1;
    const spin = Math.floor(t * 30) & 1;
    if (small) {
      mr(X - 3, hy - 2, 7, 4, '#07080c'); mr(X - 2, hy - 1, 5, 2, W('#8a8e98')); mr(X - 1, hy - 3, 3, 1, '#1c2e50');
      mr(X - 4, hy - 3 + spin, 2, 1, '#c8ccd6'); mr(X + 3, hy - 2 - spin, 2, 1, '#c8ccd6'); mr(X, hy + 1, 1, 1, Math.sin(t * 9 + e.id) > 0 ? '#ff5a3a' : '#5a1a10');
      return;
    }
    // spark drone: four rotors on arms, a solar deck on top, a coil underneath that glows as it charges
    for (const [ox, oy] of [[-8, -4], [8, -4], [-6, 1], [6, 1]]) { mr(X + ox - 3, hy + oy - 1, 6, 1, spin ? '#c8ccd6' : '#7a7f8c'); mr(X + ox, hy + oy, 1, 2, '#3a3e4a'); }
    mr(X - 7, hy - 3, 14, 1, '#3a3e4a'); mr(X - 5, hy - 5, 10, 8, '#07080c'); mr(X - 4, hy - 4, 8, 6, W('#b8bcc6')); mr(X - 4, hy + 1, 8, 1, W('#6a6e78'));
    solarLid(X - 4, hy - 7, 8, 2);
    const ch = e.chargeT > 0 ? 1 - e.chargeT / .75 : 0; mr(X - 1, hy + 2, 3, 3, ch > 0 ? (Math.random() < ch ? '#ffffff' : ZAP_COL) : '#5a5040');
    if (ch > 0) { iglow(X, hy + 4, 6 + ch * 8, '#fff0b0', .5 + ch * .4); if (Math.random() < .5) zapFx(e.x, e.y, e.x + rnd(-10, 10), e.y + rnd(-10, 10), .06); }
    mr(X + sx * 3, hy - 2, 1, 1, '#ff5a3a');
    return;
  }
  if (k === 'crawler') {   // repo crawler: low body on four legs, a battery pack on its back, one red eye
    const armed = e.state === 'arm', g = Math.floor(e.walk * 3) & 1;
    mr(X - 7, Y - 1, 14, 2, 'rgba(0,0,0,.35)');
    for (const [lx, ph] of [[-6, 0], [-2, 1], [2, 0], [6, 1]]) { const up = (ph ^ g) ? 1 : 0; mr(X + lx, Y - 4 - up, 1, 4 + up, '#2a2d36'); mr(X + lx + (lx < 0 ? -1 : 1), Y - 1, 1, 1, '#2a2d36'); }
    mr(X - 7, Y - 9, 14, 6, '#07080c'); mr(X - 6, Y - 8, 12, 4, W('#4a5240')); mr(X - 6, Y - 8, 12, 1, W('#6a7458'));
    mr(X - 4, Y - 11, 8, 3, '#07080c'); mr(X - 3, Y - 10, 6, 2, W(armed && Math.sin(t * 30) > 0 ? '#ffffff' : '#c89a28')); mr(X - 3, Y - 10, 1, 2, '#1a1a1a'); mr(X + 1, Y - 10, 1, 2, '#1a1a1a');
    mr(X + sx * 6, Y - 7, 1, 1, '#ff3a2a'); if (armed) iglow(X, Y - 8, 14, '#fff0b0', .6);
    return;
  }
  if (k === 'sentry') {    // sentry post: a tripod, a small solar panel, a turret that swivels
    mr(X - 6, Y - 1, 12, 1, 'rgba(0,0,0,.35)');
    for (const lx of [-5, 0, 5]) iline([X, Y - 10], [X + lx, Y], '#3a3e4a');
    mr(X - 1, Y - 16, 3, 7, '#4a4e5a');
    const c = Math.cos(e.ang || 0), s = Math.sin(e.ang || 0), gx = c - s, gy = (c + s) / 2, gl = Math.hypot(gx, gy) || 1;
    mr(X - 4, Y - 20, 9, 6, '#07080c'); mr(X - 3, Y - 19, 7, 4, W('#7a7462')); mr(X - 3, Y - 19, 7, 1, W('#9a9480'));
    iline([X + .5, Y - 17], [X + gx / gl * 8, Y - 17 + gy / gl * 4], '#202228');
    solarLid(X - 5, Y - 24, 10, 2);
    const lit = e.aimT > 0; mr(X, Y - 18, 1, 1, lit ? '#ff4030' : '#5a1a10');
    if (lit) { const L = 120, ex = e.x + Math.cos(e.ang) * L, ey = e.y + Math.sin(e.ang) * L, p = isoXY(ex, ey, 0); ctx.globalAlpha = .55; iline([X, Y - 17], [p[0], p[1] - 17 * (1 - .9)], '#ff4030'); ctx.globalAlpha = 1; }
    if (e.hp < e.maxhp) { const bw = 12, bx = X - 6, by = Y - 28; mr(bx - 1, by - 1, bw + 2, 3, 'rgba(0,0,0,.7)'); mr(bx, by, Math.max(0, Math.round(bw * e.hp / e.maxhp)), 1, '#ff3d5a'); }
    return;
  }
  if (k === 'loader') {    // loader mech: a caged cab on two hydraulic legs, big claws, solar panels on its back
    const g = Math.floor(e.walk * 2) & 1, raise = e.state === 'slamWind' ? -4 : 0, lean = e.state === 'chargeWind' || e.state === 'charging' ? sx * 2 : 0;
    mr(X - 10, Y - 1, 20, 2, 'rgba(0,0,0,.35)');
    for (const [lx, ph] of [[-5, 0], [4, 1]]) { const up = (ph ^ g) ? 2 : 0; mr(X + lx - 1, Y - 12 - up, 4, 12 + up, '#07080c'); mr(X + lx, Y - 11 - up, 2, 11 + up, '#5a5e6a'); mr(X + lx - 2, Y - 2, 6, 2, '#2a2d36'); }
    const cx = X + lean, cy = Y - 26;
    solarLid(cx - 9 - sx * 2, cy - 5, 14, 3);
    mr(cx - 9, cy - 2, 18, 15, '#07080c'); mr(cx - 8, cy - 1, 16, 13, W('#d8a838')); mr(cx - 8, cy - 1, 16, 1, W('#f0c860'));
    for (let i = 0; i < 16; i += 4) { mr(cx - 8 + i, cy + 10, 2, 2, '#1a1608'); }   // hazard stripes
    mr(cx - 5 + sx * 2, cy + 1, 8, 6, '#1a2028'); mr(cx - 4 + sx * 2, cy + 2, 6, 1, '#4a5868'); mr(cx - 4 + sx * 2, cy + 2, 1, 4, '#2a3440');   // caged window
    for (const ax of [-1, 1]) { const arm = cx + ax * 11, ay = cy + 4 + raise; mr(arm - 2, ay - 1, 4, 9, '#07080c'); mr(arm - 1, ay, 2, 7, W('#8a8e98')); mr(arm - 3, ay + 7, 6, 3, '#3a3e4a'); mr(arm - 3, ay + 9, 1, 2, '#3a3e4a'); mr(arm + 2, ay + 9, 1, 2, '#3a3e4a'); }
    const on = Math.sin(t * 5 + e.id) > 0; mr(cx - 1, cy - 7, 2, 2, on ? '#ffb030' : '#6a4a1a');
    if (e.hp < e.maxhp && (e.sinceHit || 0) < 4) { const bw = 20, bx = X - 10, by = cy - 11; mr(bx - 1, by - 1, bw + 2, 3, 'rgba(0,0,0,.7)'); mr(bx, by, Math.max(0, Math.round(bw * e.hp / e.maxhp)), 1, '#ff3d5a'); }
    e.sinceHit = (e.sinceHit || 0) + 1 / 60;
  }
}
// lightning: a jagged pale line with a white core, fading fast
function drawZaps() {
  for (const z of zaps) {
    const a = clamp(z.life / z.max, 0, 1); ctx.globalAlpha = a;
    for (let i = 1; i < z.pts.length; i++) { const p = isoXY(z.pts[i - 1][0], z.pts[i - 1][1], 8), q = isoXY(z.pts[i][0], z.pts[i][1], 8); iline([p[0], p[1] + 1], [q[0], q[1] + 1], ZAP_COL); iline(p, q, ZAP_HOT); }
    const m = z.pts[z.pts.length >> 1], c = isoXY(m[0], m[1], 8); iglow(c[0], c[1], 12, '#fff0b0', .5 * a);
  }
  ctx.globalAlpha = 1;
}
// downed power lines: the cable on the ground, a spark crawling along it, the whole line flaring when it arcs
function drawHazards() {
  const t = G.time;
  for (const h of hazards) {
    if (!inView((h.x0 + h.x1) / 2, (h.y0 + h.y1) / 2, 80)) continue;
    const a = isoXY(h.x0, h.y0, 0), b = isoXY(h.x1, h.y1, 0), mid = [(a[0] + b[0]) / 2 + 2, (a[1] + b[1]) / 2 + 2];
    const warn = h.arc <= 0 && h.t < .5;
    if (h.arc > 0 || warn) { ctx.globalAlpha = h.arc > 0 ? .25 : .12; gDither((h.x0 + h.x1) / 2, (h.y0 + h.y1) / 2, 28, ZAP_COL); ctx.globalAlpha = 1; }
    const cc = h.arc > 0 ? (Math.random() < .5 ? ZAP_HOT : ZAP_COL) : warn && Math.sin(t * 40) > 0 ? '#c8b070' : '#16161c';
    iline([a[0], a[1] - 12], mid, '#16161c'); iline(mid, b, cc); iline([mid[0], mid[1] + 1], [b[0], b[1] + 1], '#0a0a0e');
    const k = (t * .7 + h.x0 * .01) % 1, s = [lerp(mid[0], b[0], k), lerp(mid[1], b[1], k)]; if (Math.sin(t * 13 + h.y0) > -.2) { ipx(s[0], s[1] - 1, ZAP_HOT); iglow(s[0], s[1], 5, '#fff0b0', .5); }
    ipx(b[0], b[1], '#5a5a62'); if (h.arc > 0) iglow(b[0], b[1], 14, '#fff0b0', .6);
  }
}
