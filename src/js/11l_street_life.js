/* ============================== 11l STREET LIFE ============================== */
/* Street furniture of a city that feeds and powers itself, plus delivery drones crossing overhead. Everything is drawn
   in the iso view with ibox / isoXY, like the buildings. Nothing here collides; it is dressing. */
let _furn = null, _furnCity = null;
function streetFurniture() {
  if (_furnCity === blocks[0] && _furn) return _furn;
  _furnCity = blocks[0]; _furn = [];
  for (const b of blocks) {
    if (b.kind !== 'bld' && b.kind !== 'park') continue;
    const r = mulberry(hash2(b.x * 3 + 5, b.y * 7 + 11)), d = b.d;
    // along the inside edge of the pavement (against the building line), on the two sides that face the camera
    for (const side of [0, 1]) for (let i = 0; i < 3; i++) {
      if (r() > [.55, .6, .5][d]) continue;
      const u = 48 + i * 80 + r() * 30, kind = (() => { const q = r(); return q < .45 ? 'planter' : q < .7 ? 'kiosk' : q < .88 ? 'bench' : 'bins'; })();
      const x = side ? b.x + b.w - 26 : b.x + u, y = side ? b.y + u : b.y + b.h - 26;
      _furn.push({ k: kind, x, y, side, d, s: r() });
    }
  }
  return _furn;
}
function drawFurniture(f) {
  const t = G.time, x = f.x, y = f.y, sd = f.side;   // sd 0: along the south pavement (long in x), 1: along the east pavement (long in y)
  const box = (ox, oy, w, dd, z0, hz, top, s, e) => sd ? ibox(x + oy, y + ox, dd, w, z0, hz, top, s, e) : ibox(x + ox, y + oy, w, dd, z0, hz, top, s, e);
  const P = (ox, oy, z) => sd ? isoXY(x + oy, y + ox, z) : isoXY(x + ox, y + oy, z);
  if (f.k === 'planter') {   // a timber planter of vegetables
    box(0, 0, 22, 9, 0, 8, '#2c2018', '#7a5636', '#55391f');
    for (let i = 2; i < 21; i += 3) { const p = P(i, 4.5, 8), h = hash2(x + i, y), gc = ['#2e6a2a', '#3e7e32', '#4e8e3a'][h % 3]; ctx.fillStyle = gc; ctx.fillRect(Math.round(p[0]), Math.round(p[1]) - 3, 2, 3); ctx.fillStyle = shade(gc, 1.35); ctx.fillRect(Math.round(p[0]), Math.round(p[1]) - 4, 1, 1); if (h % 5 === 0) ipx(p[0] + 1, p[1] - 3, '#d04a32'); }
  } else if (f.k === 'kiosk') {   // a solar charging post: a pillar, a little screen, a panel canopy on a pole
    box(0, 0, 5, 5, 0, 22, '#5a6070', '#7a8192', '#4a5060');
    { const p = P(5, 2.5, 14); ctx.fillStyle = '#10161e'; ctx.fillRect(Math.round(p[0]) - 1, Math.round(p[1]) - 4, 3, 4); ctx.fillStyle = Math.sin(t * 2 + x) > 0 ? '#7ad08a' : '#3a6a46'; ctx.fillRect(Math.round(p[0]), Math.round(p[1]) - 3, 1, 1); }
    iline(P(2.5, 2.5, 22), P(2.5, 2.5, 40), '#3a3e4a');
    const q = [P(-6, -5, 40), P(12, -5, 40), P(12, 10, 36), P(-6, 10, 36)]; ipoly(q.map(p => [p[0] + 1, p[1] + 1]), '#0a0c12'); ipoly(q, '#1c2e50'); iline(q[0], q[1], '#8aa6d8');
    for (let i = 1; i < 4; i++) iline(P(-6 + i * 4.5, -5, 40), P(-6 + i * 4.5, 10, 36), '#2f4a7a');
    { const c = P(14, 3, 4); ctx.fillStyle = '#2a2a30'; ctx.fillRect(Math.round(c[0]) - 1, Math.round(c[1]) - 6, 2, 6); iline([c[0], c[1] - 6], P(5, 2.5, 10), '#22222a'); }   // a cable to someone's scooter
  } else if (f.k === 'bench') {   // a bench made from an old solar panel on two crates
    box(0, 0, 4, 7, 0, 5, '#6a4a2a', '#8a6038', '#5a3c1e'); box(16, 0, 4, 7, 0, 5, '#6a4a2a', '#8a6038', '#5a3c1e');
    const q = [P(-1, 0, 6), P(21, 0, 6), P(21, 7, 6), P(-1, 7, 6)]; ipoly(q, '#1c2e50'); for (let i = 1; i < 5; i++) iline(P(-1 + i * 4.4, 0, 6), P(-1 + i * 4.4, 7, 6), '#2f4a7a'); iline(q[3], q[2], '#8aa6d8');
  } else {   // sorting bins: compost, cans, glass (colour-coded lids)
    for (const [i, c] of [[0, '#4e7e3a'], [7, '#c8a030'], [14, '#3a6aa8']]) box(i, 0, 6, 6, 0, 9, c, '#5a5e6a', '#43464f');
  }
}

/* ---------- delivery drones: ambient traffic above the roofs, each carrying a parcel ---------- */
const skyDrones = [];
function updateSkyDrones(dt) {
  if (!P) return;
  if (skyDrones.length < 4 && Math.random() < dt * .35) {
    const a = rnd(TAU), d = 520, sx = P.x + Math.cos(a) * d, sy = P.y + Math.sin(a) * d, b = a + Math.PI + rnd(-.5, .5);
    skyDrones.push({ x: sx, y: sy, vx: Math.cos(b) * rnd(70, 110), vy: Math.sin(b) * rnd(70, 110), z: rnd(220, 300), life: 14, col: pick(['#d8d8de', '#e0a030', '#c8452e', '#3a6aa8']), ph: rnd(TAU) });
  }
  for (const s of skyDrones) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; }
  for (let i = skyDrones.length - 1; i >= 0; i--) if (skyDrones[i].life <= 0) skyDrones.splice(i, 1);
}
function drawSkyDrones() {
  const t = G.time;
  for (const s of skyDrones) {
    if (!inView(s.x, s.y, 200)) continue;
    const g = isoXY(s.x, s.y, 0); ctx.globalAlpha = .18; iellipse(g[0], g[1], 6, 3, '#000'); ctx.globalAlpha = 1;   // its shadow on the street
    const z = s.z + Math.sin(t * 3 + s.ph) * 3, spin = Math.floor(t * 30) & 1;
    ibox(s.x - 3, s.y - 3, 6, 6, z - 8, 5, '#a08058', '#8a6a44', '#6a5034');   // the parcel
    iline(isoXY(s.x, s.y, z - 3), isoXY(s.x, s.y, z), '#2a2d36');
    ibox(s.x - 5, s.y - 5, 10, 10, z, 4, shade(s.col, 1.15), s.col, shade(s.col, .7));
    for (const [ox, oy] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) { iline(isoXY(s.x, s.y, z + 3), isoXY(s.x + ox, s.y + oy, z + 3), '#3a3e4a'); const c = isoXY(s.x + ox, s.y + oy, z + 5); iellipse(c[0], c[1], 3.5, 1.6, spin ? 'rgba(200,204,214,.7)' : 'rgba(122,127,140,.7)'); }
    const bl = isoXY(s.x, s.y, z - 1); if (Math.sin(t * 6 + s.ph) > .4) { ipx(bl[0], bl[1], '#ff5a3a'); }
  }
}
