/* ============================== 11k MACHINES: DRAWING ============================== */
/* Small hand-placed pixel drawings for the machines in 09c, plus lightning and downed power lines. Each machine is
   drawn around its ground point; flyers hover above a shadow. Hit flash = white. */
/* All machines are built the same way as the crates, cars and dumpsters: oriented boxes (pixBox) in the iso view, so
   they turn with the direction they face and sit in the world like everything else. */
function mframe(e, lift = 0) { const f = propFrame(e); return lift ? (lx, ly, h) => f(lx, ly, h + lift) : f; }
function mshadow(e, rx, ry) { const c = isoXY(e.x, e.y, 0); ctx.globalAlpha = .35; iellipse(c[0], c[1], rx, ry, '#000'); ctx.globalAlpha = 1; }
const MCOL = c => c;
function solarTop(tp, u0 = .08, u1 = .92, v0 = .08, v1 = .92) {   // a solar panel laid on a box's top: dark cells, a lit front edge
  ipoly([tp(u0, v0), tp(u1, v0), tp(u1, v1), tp(u0, v1)], '#1c2e50');
  for (let k = 1; k < 4; k++) { const u = lerp(u0, u1, k / 4); iline(tp(u, v0), tp(u, v1), '#2f4a7a'); }
  iline(tp(u0, v0), tp(u0, v1), '#8aa6d8');
}
function drawMachine(e) {
  const t = G.time, fl = e.flash > 0, k = e.kind, W = c => fl ? '#ffffff' : c;
  if (k === 'cell') {      // battery bank: a squat case, two terminals, charge bars on the side
    const P3 = mframe(e); mshadow(e, 8, 4);
    const lvl = 2 + ((t * 1.5 + e.id) % 3 | 0);
    pixBox(e, P3, 0, 14, 12, 0, 12, W('#4a5c48'), W('#5e7258'), (i, quad, line, kk) => {
      if (i !== 0 && i !== 1) return;
      for (let q = 0; q < 4; q++) quad(i, .2 + q * .16, .3 + q * .16, 4, 8, q < lvl ? '#e0c040' : '#1a2018');
      quad(i, .15, .85, 1.5, 2.6, '#e0b020');
    }, tp => { ipoly([tp(.25, .2), tp(.4, .2), tp(.4, .35), tp(.25, .35)], '#9aa0aa'); ipoly([tp(.25, .65), tp(.4, .65), tp(.4, .8), tp(.25, .8)], '#c8503a'); });
    for (const v of [-3, 3]) { const p = P3(2, v, 12), q = P3(2, v, 14.5); iline(p, q, v < 0 ? '#9aa0aa' : '#c8503a'); }
    if (e.hp < e.maxhp && Math.random() < .3) FX.sparks(e.x, e.y, 1, ZAP_COL, 90);
    return;
  }
  if (k === 'sweeper') {   // street sweeper: a rounded orange cart, a solar lid, two brushes spinning at the front
    const P3 = mframe(e); mshadow(e, 9, 4.5);
    const b = Math.floor(e.walk * 4) & 1;
    for (const v of [-6, 6]) { const c = P3(10, v, 1.5); idisc(c[0], c[1], 2.4, '#3a3228'); ipx(c[0] + (b ? 1 : -1), c[1], '#c8b890'); ipx(c[0], c[1] + (b ? -1 : 1), '#c8b890'); }
    pixBox(e, P3, -1, 18, 13, 1, 10, W('#e0a030'), W('#f0c060'), (i, quad) => { quad(i, 0, 1, 1, 2.2, W('#a8701c')); if (i === 0) quad(i, .3, .7, 5, 8, '#2a2a32'); }, tp => solarTop(tp));
    const on = Math.sin(t * 6 + e.id) > 0, bp = P3(-6, 0, 13); iline(P3(-6, 0, 10), bp, '#4a4e5a'); ipx(bp[0], bp[1], on ? '#ffb030' : '#6a4a1a'); if (on) iglow(bp[0], bp[1], 5, '#ffb030', .45);
    return;
  }
  if (k === 'zapper') {    // spark drone: a body box with four rotor arms, solar deck on top, a coil underneath; hovers
    const hov = (e.def.hover || 22) + Math.sin(t * 5 + e.id) * 1.5, P3 = mframe(e, hov); mshadow(e, 7, 3.5);
    const spin = Math.floor(t * 30) & 1, arms = [[7, 7], [7, -7], [-7, 7], [-7, -7]];
    for (const [ax, ay] of arms) { iline(P3(0, 0, 4), P3(ax, ay, 4), '#3a3e4a'); const c = P3(ax, ay, 5.5); iellipse(c[0], c[1], 3.5, 1.5, spin ? 'rgba(200,204,214,.75)' : 'rgba(122,127,140,.75)'); ipx(c[0], c[1], '#2a2d36'); }
    const ch = e.chargeT > 0 ? 1 - e.chargeT / .75 : 0, coil = P3(0, 0, -1.5);
    pixBox(e, P3, 0, 10, 10, 0, 7, W('#b8bcc6'), W('#c8ccd6'), (i, quad) => { quad(i, 0, 1, 0, 1.4, W('#6a6e78')); if (i === 0) quad(i, .4, .6, 3.5, 5, '#ff5a3a'); }, tp => solarTop(tp));
    ipx(coil[0], coil[1], ch > 0 ? (Math.random() < ch ? '#ffffff' : ZAP_COL) : '#5a5040'); ipx(coil[0], coil[1] + 1, ch > 0 ? ZAP_COL : '#3a3428');
    if (ch > 0) { iglow(coil[0], coil[1], 6 + ch * 8, '#fff0b0', .5 + ch * .4); if (Math.random() < .5) zapFx(e.x, e.y, e.x + rnd(-10, 10), e.y + rnd(-10, 10), .06); }
    return;
  }
  if (k === 'mite') {      // mite: a tiny box with two rotors and a blinking eye
    const hov = (e.def.hover || 12) + Math.sin(t * 7 + e.id) * 1.2, P3 = mframe(e, hov); mshadow(e, 3, 1.5);
    const spin = Math.floor(t * 30) & 1;
    for (const v of [-4, 4]) { const c = P3(0, v, 4); iellipse(c[0], c[1], 2, 1, spin ? '#c8ccd6' : '#7a7f8c'); }
    pixBox(e, P3, 0, 6, 5, 0, 4, W('#8a8e98'), W('#9aa0aa'), (i, quad) => { if (i === 0) quad(i, .35, .65, 1.5, 3, Math.sin(t * 9 + e.id) > 0 ? '#ff5a3a' : '#5a1a10'); });
    return;
  }
  if (k === 'crawler') {   // repo crawler: a low body on four legs, a battery pack on its back
    const armed = e.state === 'arm', g = Math.floor(e.walk * 3) & 1, P3 = mframe(e); mshadow(e, 9, 4.5);
    for (const [lx, ly, ph] of [[6, 6, 0], [6, -6, 1], [-6, 6, 1], [-6, -6, 0]]) { const up = (ph ^ g) ? 2 : 0, hip = P3(lx * .6, ly * .6, 6), knee = P3(lx, ly * 1.2, 7 + up), foot = P3(lx * 1.1, ly * 1.3, up * .5); iline(hip, knee, '#2a2d36'); iline(knee, foot, '#2a2d36'); }
    pixBox(e, P3, 0, 16, 11, 5, 10, W('#4a5240'), W('#6a7458'), (i, quad) => { if (i === 0) quad(i, .42, .58, 7, 8.5, '#ff3a2a'); });
    pixBox(e, P3, -1, 9, 7, 10, 13, W(armed && Math.sin(t * 30) > 0 ? '#ffffff' : '#c89a28'), W(armed && Math.sin(t * 30) > 0 ? '#ffffff' : '#e0b040'), (i, quad) => { quad(i, .3, .38, 10, 13, '#1a1a1a'); quad(i, .62, .7, 10, 13, '#1a1a1a'); });
    if (armed) { const c = P3(0, 0, 9); iglow(c[0], c[1], 14, '#fff0b0', .6); }
    return;
  }
  if (k === 'sentry') {    // sentry post: a tripod of steel legs, a column, a turret box that swivels, a solar panel on top
    const P0 = propFrame({ x: e.x, y: e.y, ang: 0, z: 0 }), P3 = mframe(e); mshadow(e, 8, 4);
    for (const a of [0, 2.09, 4.19]) iline(P0(0, 0, 12), P0(Math.cos(a) * 8, Math.sin(a) * 8, 0), '#3a3e4a');
    iline(P0(0, 0, 12), P0(0, 0, 18), '#4a4e5a');
    pixBox(e, P3, 0, 12, 9, 18, 25, W('#7a7462'), W('#9a9480'), (i, quad) => { if (i === 0) quad(i, .4, .6, 21, 23, e.aimT > 0 ? '#ff4030' : '#5a1a10'); }, tp => solarTop(tp, .15, .85, .1, .9));
    iline(P3(6, 0, 21.5), P3(14, 0, 21.5), '#202228'); iline(P3(6, 0, 20.5), P3(14, 0, 20.5), '#3a3c44');   // barrel
    if (e.aimT > 0) { const a2 = isoXY(e.x + Math.cos(e.ang) * 14, e.y + Math.sin(e.ang) * 14, 0), L = isoXY(e.x + Math.cos(e.ang) * 130, e.y + Math.sin(e.ang) * 130, 0), m = P3(14, 0, 21); ctx.globalAlpha = .55; iline(m, [L[0], L[1] - (m[1] - a2[1]) * .2], '#ff4030'); ctx.globalAlpha = 1; }
    if (e.hp < e.maxhp) { const top = P3(0, 0, 31), bw = 12, bx = Math.round(top[0] - 6), by = Math.round(top[1]); ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(bx - 1, by - 1, bw + 2, 3); ctx.fillStyle = '#ff3d5a'; ctx.fillRect(bx, by, Math.max(0, Math.round(bw * e.hp / e.maxhp)), 1); }
    return;
  }
  if (k === 'loader') {    // loader mech: two hydraulic legs, a caged cab, two claw arms, solar panels on its back
    const g = Math.floor(e.walk * 2) & 1, raise = e.state === 'slamWind' ? 6 : 0, lean = e.state === 'chargeWind' || e.state === 'charging' ? 3 : 0, P3 = mframe(e); mshadow(e, 14, 7);
    for (const [ly, ph] of [[-6, 0], [6, 1]]) { const up = (ph ^ g) ? 3 : 0; pixBox(e, P3, up * .6, 6, 5, 0, 2, W('#2a2d36'), W('#3a3e4a')); pixBox(e, P3, 0, 4, 4, 2 + up, 18, W('#5a5e6a'), W('#6a6e7a')); }
    pixBox(e, P3, lean, 20, 22, 18, 34, W('#d8a838'), W('#e8c050'), (i, quad) => {
      quad(i, 0, 1, 18, 20.5, '#1a1608'); for (let q = 0; q < 1; q += .2) quad(i, q, q + .1, 18, 20.5, '#e0b020');   // hazard stripes
      if (i === 0) { quad(i, .25, .75, 24, 31, '#1a2028'); quad(i, .25, .75, 30, 31, '#4a5868'); quad(i, .48, .52, 24, 31, '#4a5868'); }   // caged window
    }, tp => solarTop(tp, .3, .95, .1, .9));
    for (const ay of [-14, 14]) { pixBox(e, P3, lean + 4, 6, 5, 18 + raise, 30 + raise, W('#8a8e98'), W('#9aa0aa')); pixBox(e, P3, lean + 9, 6, 7, 14 + raise, 19 + raise, W('#3a3e4a'), W('#4a4e5a')); }
    const on = Math.sin(t * 5 + e.id) > 0, bc = P3(-4, 0, 37); iline(P3(-4, 0, 34), bc, '#4a4e5a'); ipx(bc[0], bc[1], on ? '#ffb030' : '#6a4a1a'); if (on) iglow(bc[0], bc[1], 5, '#ffb030', .4);
    if (e.hp < e.maxhp && (e.sinceHit || 0) < 4) { const top = P3(0, 0, 44), bw = 20, bx = Math.round(top[0] - 10), by = Math.round(top[1]); ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(bx - 1, by - 1, bw + 2, 3); ctx.fillStyle = '#ff3d5a'; ctx.fillRect(bx, by, Math.max(0, Math.round(bw * e.hp / e.maxhp)), 1); }
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
