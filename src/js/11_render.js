/* ============================== 11 RENDER ============================== */
/* Night city in plain Canvas 2D:
   - ground (asphalt, sidewalks, parks, plazas, markings, puddles) drawn from block rects each frame
   - additive light pass ('lighter') with cached radial glow sprites: lamps, neon spill, headlights, powers
   - fake-3D buildings: each roof corner is projected away from the view centre by CAM_D/(CAM_D-height),
     walls are the quads between base and roof edges that face the camera; windows/signs sit on them
   - screen-space rain streaks + world-space splashes, vignette, karma tint */
const cv = document.getElementById('game'), mainCtx = cv.getContext('2d');
let ctx = mainCtx;
const FRAME = { x: 0, y: 0 };
let W = 1, H = 1, DPR = 1, vignette = null, lightCv = null, lightCtx = null;
const LIGHT_DS = 4;   // the additive street-light pass renders at 1/4 resolution, then is composited once
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  // the game always renders in a 16:9 TV frame, letterboxed on any other screen shape
  const sw = innerWidth, sh = innerHeight; W = Math.min(sw, sh * 16 / 9); H = W * 9 / 16;
  FRAME.x = (sw - W) / 2; FRAME.y = (sh - H) / 2;
  cv.style.left = FRAME.x + 'px'; cv.style.top = FRAME.y + 'px'; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  lightCv = document.createElement('canvas'); lightCv.width = Math.ceil(cv.width / LIGHT_DS); lightCv.height = Math.ceil(cv.height / LIGHT_DS); lightCtx = lightCv.getContext('2d');
  vignette = document.createElement('canvas'); vignette.width = 256; vignette.height = 256;
  const g = vignette.getContext('2d'), gr = g.createRadialGradient(128, 128, 60, 128, 128, 182);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,8,.75)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  initRain();
}
addEventListener('resize', resize);

/* ---------- camera ---------- */
function camScale() { return H / cam.viewH; }
function snapCamera() { cam.cx = P.x; cam.cy = P.y; placeCam(); }
function placeCam() {
  cam.scale = camScale(); cam.w = W / cam.scale; cam.h = H / cam.scale;
  cam.cx = cam.w >= WORLD_W ? WORLD_W / 2 : clamp(cam.cx, cam.w / 2, WORLD_W - cam.w / 2);
  cam.cy = cam.h >= WORLD_H ? WORLD_H / 2 : clamp(cam.cy, cam.h / 2, WORLD_H - cam.h / 2);
  cam.x = cam.cx - cam.w / 2; cam.y = cam.cy - cam.h / 2;
}
function updateCamera(dt) {
  const look = P.holding ? 70 : 40;
  const k = Input.device === 'pad' ? (Input.aimStick() ? 1 : .45) : clamp(aim.dist / 320, 0, 1);
  let tx = P.x + aim.dx * look * k + P.vx * .18, ty = P.y + aim.dy * look * k * .8 + P.vy * .18;
  if (G.boss && !G.boss.dead && dist(G.boss, P) < 700) { tx = lerp(tx, G.boss.x, .28); ty = lerp(ty, G.boss.y, .28); }
  cam.viewH = lerp(cam.viewH, G.boss && dist(G.boss, P) < 700 ? 400 : VIEW_H, Math.min(1, dt * 2));
  const f = 1 - Math.exp(-dt * 6); cam.cx = lerp(cam.cx, tx, f); cam.cy = lerp(cam.cy, ty, f);
  placeCam();
  cam.trauma = Math.max(0, cam.trauma - dt * 1.5);
  const s = cam.trauma * cam.trauma * 16, t = performance.now() / 1000;
  cam.sx = s * (Math.sin(t * 61) * .6 + Math.sin(t * 97) * .4); cam.sy = s * (Math.sin(t * 71 + 2) * .6 + Math.sin(t * 89 + 1) * .4);
}

/* ---------- glow sprites ---------- */
const glowCache = new Map();
let _glowK = 1;   // LIGHT.pools for light on the ground, LIGHT.glow inside iglow
function glowSprite(col) {
  let c = glowCache.get(col); if (c) return c;
  if (glowCache.size > 300) glowCache.clear();
  c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), [r, gg, b] = rgb(col);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `rgba(${r},${gg},${b},1)`); gr.addColorStop(.22, `rgba(${r},${gg},${b},.5)`); gr.addColorStop(.55, `rgba(${r},${gg},${b},.13)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); glowCache.set(col, c); return c;
}
function glow(x, y, r, col, a = 1, sy = 1, sx = 1) { a *= _glowK; if (a <= .01) return; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(glowSprite(col), x - r * sx, y - r * sy, r * 2 * sx, r * 2 * sy); }
const kcol = () => karmaColor(Math.round(G.karma / 5) * 5);
function neonPal(d) { const s = DS[d].status; return s === 'liberated' ? NEON_GOOD : s === 'dominated' ? NEON_EVIL : DIST[d].neon; }
function lampCol(d) { const s = DS[d].status; return s === 'liberated' ? '#bfeaff' : s === 'dominated' ? '#ff5a4a' : DIST[d].lamp; }
const inView = (x, y, m) => x > cam.x - m && x < cam.x + cam.w + m && y > cam.y - m && y < cam.y + cam.h + m;
function ellipse(x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); }
function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }

/* ---------- ground ---------- */
function drawGround() {
  drawSea();
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, WORLD_W, WORLD_H); ctx.clip();   // road markings and the rest stop at the edge of the map (they used to run on into the dark)
  for (let d = 0; d < 3; d++) {
    const x0 = d === 0 ? 0 : DIST_SPLIT[d - 1], x1 = d === 2 ? WORLD_W : DIST_SPLIT[d];
    ctx.fillStyle = DIST[d].ground; ctx.fillRect(x0, 0, x1 - x0, WORLD_H);
  }
  // road markings: dashed centre lines + crosswalks
  const kx0 = Math.max(0, Math.floor(cam.x / BAND)), kx1 = Math.min(BCOLS, Math.ceil((cam.x + cam.w) / BAND)), ky0 = Math.max(0, Math.floor(cam.y / BAND)), ky1 = Math.min(BROWS, Math.ceil((cam.y + cam.h) / BAND));
  ctx.fillStyle = 'rgba(255,205,110,.32)';
  for (let k = ky0; k <= ky1; k++) { const y = k * BAND + 47; for (let x = Math.floor(cam.x / 32) * 32; x < cam.x + cam.w; x += 32) if (x % BAND >= 96) ctx.fillRect(x + 4, y, 16, 2); }
  for (let k = kx0; k <= kx1; k++) { const x = k * BAND + 47; for (let y = Math.floor(cam.y / 32) * 32; y < cam.y + cam.h; y += 32) if (y % BAND >= 96) ctx.fillRect(x, y + 4, 2, 16); }
  ctx.fillStyle = 'rgba(215,222,240,.13)';
  for (let ky = ky0; ky <= ky1; ky++) for (let kx = kx0; kx <= kx1; kx++) {
    const ix = kx * BAND, iy = ky * BAND;
    for (let i = 0; i < 7; i++) {
      const o = 8 + i * 12;
      if (ky < BROWS) ctx.fillRect(ix + o, iy + 100, 6, 20);
      if (ky > 0) ctx.fillRect(ix + o, iy - 24, 6, 20);
      if (kx < BCOLS) ctx.fillRect(ix + 100, iy + o, 20, 6);
      if (kx > 0) ctx.fillRect(ix - 24, iy + o, 20, 6);
    }
  }
  // blocks
  for (const b of blocks) {
    if (b.x > cam.x + cam.w || b.x + b.w < cam.x || b.y > cam.y + cam.h || b.y + b.h < cam.y) continue;
    const D_ = DIST[b.d];
    ctx.fillStyle = D_.side; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(b.x + TILE, b.y + TILE, b.w - TILE * 2, b.h - TILE * 2);
    const ix = b.x + TILE, iy = b.y + TILE, iw = b.w - TILE * 2;
    if (b.kind === 'park') {
      ctx.fillStyle = '#0d2016'; ctx.fillRect(ix, iy, iw, iw);
      ctx.fillStyle = '#122b1d'; for (let i = 0; i < 18; i++) { const h = hash2(b.bx * 31 + i, b.by * 17 + i); ctx.fillRect(ix + h % iw, iy + (h >> 9) % iw, 3, 2); }
      ctx.fillStyle = D_.side; ctx.fillRect(ix + 3 * TILE, iy, TILE, iw); ctx.fillRect(ix, iy + 3 * TILE, iw, TILE);
    } else if (b.kind === 'hide' || b.kind === 'boss') {
      ctx.fillStyle = D_.plaza; ctx.fillRect(ix, iy, iw, iw);
      ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 1; i < 7; i++) { ctx.moveTo(ix + i * TILE, iy); ctx.lineTo(ix + i * TILE, iy + iw); ctx.moveTo(ix, iy + i * TILE); ctx.lineTo(ix + iw, iy + i * TILE); }
      ctx.stroke();
      if (b.kind === 'boss') { ctx.strokeStyle = rgba(DIST[b.d].col, DS[b.d].bossAlive ? .5 : .16); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ix + iw / 2, iy + iw / 2, iw * .38, 0, TAU); ctx.stroke(); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ix + iw / 2, iy + iw / 2, iw * .2, 0, TAU); ctx.stroke(); }
    }
    else if (b.kind === 'lot') {   // asphalt with painted bays top and bottom
      ctx.fillStyle = '#15161d'; ctx.fillRect(ix, iy, iw, iw);
      ctx.fillStyle = 'rgba(220,226,240,.35)';
      for (let k = 0; k <= 7; k++) { ctx.fillRect(ix + k * TILE - 1, iy + 2, 2, 62); ctx.fillRect(ix + k * TILE - 1, iy + iw - 64, 2, 62); }
      ctx.fillRect(ix, iy + 64, iw, 2); ctx.fillRect(ix, iy + iw - 66, iw, 2);
      ctx.fillStyle = 'rgba(255,205,110,.3)'; for (let x = ix + 8; x < ix + iw - 8; x += 26) ctx.fillRect(x, iy + iw / 2 - 1, 12, 2);   // aisle arrows/dashes
      ctx.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 9; i++) { const h = hash2(b.bx * 11 + i, b.by * 5 + i); ctx.fillRect(ix + h % (iw - 30), iy + (h >> 8) % (iw - 20), 20 + (h >> 4) % 14, 8 + (h >> 6) % 6); }   // oil stains
    } else if (b.kind === 'court') {   // basketball court
      const cx = ix + iw / 2, cy = iy + iw / 2;
      ctx.fillStyle = '#1c2a3e'; ctx.fillRect(ix, iy, iw, iw);
      ctx.fillStyle = '#243a58'; ctx.fillRect(ix + 10, iy + 26, iw - 20, iw - 52);
      ctx.strokeStyle = 'rgba(230,236,250,.5)'; ctx.lineWidth = 2; ctx.strokeRect(ix + 10, iy + 26, iw - 20, iw - 52);
      ctx.beginPath(); ctx.moveTo(cx, iy + 26); ctx.lineTo(cx, iy + iw - 26); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 24, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(200,80,60,.45)'; ctx.fillRect(ix + 10, cy - 24, 52, 48); ctx.fillRect(ix + iw - 62, cy - 24, 52, 48);   // painted keys
      ctx.strokeRect(ix + 10, cy - 24, 52, 48); ctx.strokeRect(ix + iw - 62, cy - 24, 52, 48);
      ctx.beginPath(); ctx.arc(ix + 62, cy, 24, -Math.PI / 2, Math.PI / 2); ctx.stroke(); ctx.beginPath(); ctx.arc(ix + iw - 62, cy, 24, Math.PI / 2, Math.PI * 1.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(ix + 22, cy, 80, -1.15, 1.15); ctx.stroke(); ctx.beginPath(); ctx.arc(ix + iw - 22, cy, 80, Math.PI - 1.15, Math.PI + 1.15); ctx.stroke();
    } else if (b.kind === 'yard') {   // packed dirt with tyre tracks and gravel
      ctx.fillStyle = '#231e1a'; ctx.fillRect(ix, iy, iw, iw);
      ctx.fillStyle = '#2c2520'; for (let i = 0; i < 40; i++) { const h = hash2(b.bx * 31 + i, b.by * 17 + i * 3); ctx.fillRect(ix + h % iw, iy + (h >> 9) % iw, 3 + (h >> 3) % 5, 2); }
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(ix + 96, iy + 120, 8, iw - 120); ctx.fillRect(ix + 120, iy + 120, 8, iw - 120); ctx.fillRect(ix, iy + 104, iw, 6);
    }
    // sidewalk seams + curb
    ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 1; i < 9; i++) { ctx.moveTo(b.x + i * TILE, b.y); ctx.lineTo(b.x + i * TILE, b.y + TILE); ctx.moveTo(b.x + i * TILE, b.y + b.h - TILE); ctx.lineTo(b.x + i * TILE, b.y + b.h); ctx.moveTo(b.x, b.y + i * TILE); ctx.lineTo(b.x + TILE, b.y + i * TILE); ctx.moveTo(b.x + b.w - TILE, b.y + i * TILE); ctx.lineTo(b.x + b.w, b.y + i * TILE); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(190,200,225,.16)'; ctx.lineWidth = 2; ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
  }
  // puddles (wet sheen)
  for (const p of puddles) {
    if (!inView(p.x, p.y, 40)) continue;
    ctx.fillStyle = 'rgba(110,130,175,.07)'; ellipse(p.x, p.y, p.rx, p.ry);
    ctx.fillStyle = 'rgba(160,185,235,.05)'; ellipse(p.x - p.rx * .2, p.y - p.ry * .2, p.rx * .55, p.ry * .4);
  }
  // decals
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

/* ---------- light pass (additive) ---------- */
function drawGroundLights() {
  const t = G.time;
  for (const l of lamps) {
    if (!inView(l.x, l.y, 110)) continue;
    let k = 1; if (l.broken) k = Math.random() < .03 ? .6 : .05; else if (l.flick) k = (Math.sin(t * 13 + l.ph) > -.7 ? 1 : .25) * (.85 + .15 * Math.sin(t * 40 + l.ph));
    const c = lampCol(l.d);
    glow(l.x, l.y, 78, c, .3 * k); glow(l.x, l.y + 26, 22, c, .16 * k, 2.8);
  }
  for (const s of shopGlows) {
    if (!inView(s.x, s.y, 120)) continue;
    const c = neonPal(s.b.d)[s.sh.ci], k = s.len / 70;
    if (s.horiz) glow(s.x, s.y, 40, c, .42, .8, Math.max(1, k)); else glow(s.x, s.y, 40, c, .42, Math.max(1, k), .8);
  }
  for (const s of signGlows) {
    if (!inView(s.x, s.y, 100)) continue;
    const pal = neonPal(s.b.d), c = pal[s.sg.ci], on = s.sg.blink ? (Math.sin(t * 3 + s.sg.ph) > -.2 ? 1 : .2) : 1;
    glow(s.x, s.y, 70, c, .3 * on); glow(s.x, s.y + 24, 26, c, .18 * on, 3);
  }
  for (const e of ents) {
    if (e.dead || !inView(e.x, e.y, 120)) continue;
    if (e.kind === 'car' && e.driving) {
      const c = Math.cos(e.ang), s = Math.sin(e.ang);
      ctx.globalAlpha = .26; ctx.save(); ctx.translate(e.x + c * 46, e.y + s * 46); ctx.rotate(e.ang); ctx.drawImage(glowSprite('#ffeec0'), -38, -24, 76, 48); ctx.restore();
      glow(e.x - c * 22, e.y - s * 22, 20, '#ff2a2a', .35);
    } else if (e.kind === 'cop') {
      const on = Math.sin(t * 14 + e.id) > 0;
      if (!e.ally ? G.heat >= 1 : true) glow(e.x, e.y, 46, on ? '#ff2040' : '#2060ff', .45);
    } else if (e.kind === 'hideout' && !e.cleared) { const fy = e.rect.y + e.rect.h; glow(e.rect.x + 6, fy + 18, 70, '#ff3030', .4); glow(e.rect.x + e.rect.w - 6, fy + 18, 70, '#ff3030', .4); glow(e.x, fy + 14, 60, e.col, e.gateOpen ? .7 : .3); }
    else if (e.kind === 'sup') glow(e.x, e.y, 50, '#a050ff', .4);
    else if (e.kind === 'boss') glow(e.x, e.y, 120, e.col, .45 + .1 * Math.sin(t * 5));
    else if (e.kind === 'barrel' && e.def.explosive) glow(e.x, e.y, 22, '#ff4020', .2 + .1 * Math.sin(t * 6 + e.id));
    else if (e.kind === 'civ' && e.state === 'wounded') glow(e.x, e.y, 40, '#40e0ff', .25 + .2 * Math.sin(t * 6));
  }
  for (const z of zones) if (inView(z.x, z.y, 60)) glow(z.x, z.y, z.r * 2.4, '#ff6a20', .4 * Math.min(1, z.t));
  for (const w of wells) glow(w.x, w.y, w.r * 1.3, '#8040ff', .35 * Math.min(1, w.t * 2));
  if (P && G.mode !== 'dead' && G.mode !== 'title') glow(P.x, P.y, 95, kcol(), .38 + (P.absorbing ? .2 : 0) + (P.holding ? .1 : 0));
  // closed barricades
  for (let i = 0; i < 2; i++) if (!gatesOpen[i]) { const x = GATE_TX[i] * TILE + 16; for (let y = Math.floor(cam.y / 96) * 96; y < cam.y + cam.h + 96; y += 96) glow(x, y + 48, 70, '#ff2a4a', .3); }
  ctx.globalAlpha = 1;
}

/* ---------- entities ---------- */
function shadowOf(e) {
  const z = e.z || 0; ctx.fillStyle = `rgba(0,0,0,${.38 - Math.min(.2, z * .006)})`;
  if (e.kind === 'car' || e.kind === 'dumpster') { ctx.save(); ctx.translate(e.x + 3 + z * .3, e.y + 5 + z * .5); ctx.rotate(e.ang); const L = e.kind === 'car' ? 21 : 18, Wd = e.kind === 'car' ? 11 : 12; ctx.fillRect(-L, -Wd, L * 2, Wd * 2); ctx.restore(); return; }
  ellipse(e.x + 1 + z * .3, e.y + 1 + z * .5, e.r * .8, e.r * .35);
}
/* tilted view: people stand upright. Feet sit at the entity position; the body rises up the screen.
   Facing is shown by which way the face, arms and gun point, not by rotating the sprite. */
/* CHARACTERS, drawn for the high tilted camera (same as the buildings):
   - the head is the biggest shape and you mostly see its crown; the face is a window low on the head
     that slides around with the facing direction, so characters turn smoothly through every angle
   - shoulders are seen from above, legs are short stubs under the body, feet step along the facing
   Units: feet at 0, head centre at -22; scaled by the entity radius. */
const OUTLINE = '#0a0a10';
function pShape(fill, lw = 1.5) { ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = lw; ctx.stroke(); }
function pEll(x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, TAU); }
function drawPerson(e, o) {
  const white = e.flash > 0, z = (e.z || 0) * .8, sc = e.r / 10 * .82, C = k => white ? '#ffffff' : k;
  ctx.save(); ctx.translate(e.x, e.y - z); ctx.scale(sc, sc);
  if (e.stun > 0 && e.flung) { // tumbling body
    ctx.translate(0, -9); ctx.rotate(G.time * 14);
    pEll(0, 2, 6.5, 8); pShape(C(o.body)); pEll(0, -9, 6.5, 6.5); pShape(C(o.hair || '#1a1410')); ctx.restore(); return;
  }
  const fx = Math.cos(e.ang), fy = Math.sin(e.ang), px = -fy, py = fx;   // facing and its right-hand side, on the ground
  const W = o.wide ? 1.32 : 1, sw = Math.sin(e.walk || 0) * 2.6, toward = fy > -.3;
  const gp = (gx, gy, h) => [gx, gy * .5 - h];   // ground offset + height -> screen (ground squashed like the street)
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,.35)'; pEll(0, .5, 8 * W, 3.2 * W); ctx.fill();
  // feet + leg stubs, stepping along the facing direction
  const feet = [-1, 1].map(sd => { const st = sd * sw; return gp(px * sd * 2.8 * W + fx * st, py * sd * 2.8 * W + fy * st, 0); }).sort((a, b) => a[1] - b[1]);
  for (const [x, y] of feet) {
    ctx.beginPath(); roundRect(x - 2, y - 7, 4, 7, 1.6); pShape(C(o.pants || '#1e2130'), 1.2);
    pEll(x + fx * 1, y - .3 + fy * .5, 2.4, 1.6); pShape(C(o.shoe || '#111218'), 1.1);
  }
  // hero coat tail trails behind
  if (o.coatTail) {
    const b = gp(-fx * 11 - Math.abs(sw) * fx * .3, -fy * 11, 3), l = gp(px * 6, py * 6, 14), r = gp(-px * 6, -py * 6, 14), bl = gp(-fx * 9 + px * 5, -fy * 9 + py * 5, 4), br = gp(-fx * 9 - px * 5, -fy * 9 - py * 5, 4);
    ctx.beginPath(); ctx.moveTo(l[0], l[1]); ctx.lineTo(bl[0], bl[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(br[0], br[1]); ctx.lineTo(r[0], r[1]); ctx.closePath(); pShape(C(shade(o.body, .78)), 1.3);
    if (o.trim) { ctx.strokeStyle = o.trim; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(bl[0], bl[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(br[0], br[1]); ctx.stroke(); }
  }
  // arms: each hangs from a shoulder; the one further from the camera is drawn before the body
  const arm = sd => {
    const reach = (o.gun || o.cast) && sd > 0, st = -sd * sw * .7;
    const sh = gp(px * sd * 6.6 * W, py * sd * 6.6 * W, 15);
    let hd = reach ? gp(fx * 8 + px * 2.5, fy * 8 + py * 2.5, 10) : gp(px * sd * 7.4 * W + fx * st, py * sd * 7.4 * W + fy * st, 7);
    if (o.cheer) hd = gp(px * sd * 7 * W, py * sd * 7 * W, 26);
    if (o.cast && sd < 0) hd = gp(fx * 8 - px * 2.5, fy * 8 - py * 2.5, 10);
    ctx.strokeStyle = OUTLINE; ctx.lineCap = 'round'; ctx.lineWidth = 4.4; ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.lineTo(hd[0], hd[1]); ctx.stroke();
    ctx.strokeStyle = C(o.arm || o.body); ctx.lineWidth = 2.8; ctx.stroke(); ctx.lineCap = 'butt';
    pEll(hd[0], hd[1], 1.9, 1.9); pShape(C(o.glowHands || o.skin || '#c9a080'), 1.1);
    if (o.gun && reach && !white) { const g = gp(fx * 14 + px * 2.5, fy * 14 + py * 2.5, 10.5); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(hd[0], hd[1]); ctx.lineTo(g[0], g[1]); ctx.stroke(); }
  };
  const armsBehind = [-1, 1].filter(sd => py * sd < 0), armsFront = [-1, 1].filter(sd => py * sd >= 0);
  armsBehind.forEach(arm);
  // body: a short rounded trunk with the top of the shoulders visible from above
  ctx.beginPath(); ctx.moveTo(-6.6 * W, -15); ctx.lineTo(-5.6 * W, -7.5); ctx.ellipse(0, -7.5, 5.6 * W, 2.6, 0, Math.PI, 0, true); ctx.lineTo(6.6 * W, -15); ctx.closePath(); pShape(C(o.body));
  pEll(0, -15, 6.8 * W, 3.4); pShape(C(shade(o.body, 1.18)), 1.3);
  if (o.pads) { for (const sd of [-1, 1]) { const q = gp(px * sd * 6 * W, py * sd * 6 * W, 15.5); pEll(q[0], q[1], 3.2, 2.2); pShape(C(o.pads), 1.1); } }
  if (o.trim && toward) { const t0 = gp(fx * 5.5 * W, fy * 5.5, 14), t1 = gp(fx * 5 * W, fy * 5, 8); ctx.strokeStyle = o.trim; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(t0[0], t0[1]); ctx.lineTo(t1[0], t1[1]); ctx.stroke(); }
  if (o.collar) { pEll(0, -16.5, 5.6, 2.6); pShape(C(shade(o.body, .9)), 1.2); }
  if (o.hood) { const hb = gp(-fx * 4, -fy * 4, 17); pEll(hb[0], hb[1], 5, 2.8); pShape(C(shade(o.body, .85)), 1.2); }
  armsFront.forEach(arm);
  // head
  const hr = 7.6 * (o.headK || 1), hx = 0, hy = -22.5;
  pEll(hx, hy, hr, hr * .96); pShape(C(o.hair || '#1a1410'), 1.7);
  const fc = [hx + fx * hr * .5, hy + 2.6 + fy * 1.6];      // face window centre (slides with facing)
  const faceVis = fy > -.55;
  if (faceVis) {
    ctx.save(); pEll(hx, hy, hr - .4, hr * .96 - .4); ctx.clip();
    const fw = 5.4 - Math.abs(fx) * 1.6, fh = 4.4 * Math.min(1, (fy + .55) * 1.3);
    pEll(fc[0], fc[1], fw, fh); ctx.fillStyle = C(o.skin || '#c9a080'); ctx.fill();
    if (!white) {
      for (const sd of [-1, 1]) {
        if (Math.abs(fx) > .85 && sd * px * Math.sign(fx || 1) < 0) continue;   // profile: one eye
        const ex = fc[0] + px * sd * 2.3 * (1 - Math.abs(fx) * .45), ey = fc[1] - .6;
        pEll(ex, ey, 1.25, 1.45); ctx.fillStyle = '#fff'; ctx.fill(); pEll(ex + fx * .45, ey + .3, .75, .95); ctx.fillStyle = o.eyeCol || '#10121a'; ctx.fill();
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(ex - 1.4, ey - 1.9 + (o.angry ? sd * px * .5 + .4 : 0)); ctx.lineTo(ex + 1.4, ey - 1.9 - (o.angry ? sd * px * .5 - .4 : 0)); ctx.stroke();
      }
      if (o.band) { ctx.fillStyle = o.band; ctx.fillRect(fc[0] - 6, fc[1] + .9, 12, 4); ctx.strokeStyle = OUTLINE; ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(fc[0] - 6, fc[1] + .9); ctx.lineTo(fc[0] + 6, fc[1] + .9); ctx.stroke(); }
      else { ctx.strokeStyle = OUTLINE; ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(fc[0] - 1.3 + fx * .6, fc[1] + 2.1); ctx.quadraticCurveTo(fc[0] + fx * .8, fc[1] + 2.8, fc[0] + 1.3 + fx * .6, fc[1] + 2); ctx.stroke(); }
    }
    ctx.restore();
  }
  // headwear / hair styles, seen from above
  if (o.spiky) {
    ctx.beginPath();
    for (let i = 0; i <= 9; i++) { const a = Math.PI + i / 9 * Math.PI + (fx * .25), r = i % 2 ? hr * 1.42 : hr * .98; ctx.lineTo(hx + Math.cos(a) * r, hy + Math.sin(a) * r * .9 - 1); }
    if (faceVis) ctx.quadraticCurveTo(fc[0], fc[1] - 6, hx - hr, hy - .5); else { ctx.lineTo(hx + hr, hy + 3); ctx.lineTo(hx - hr, hy + 3); }
    ctx.closePath(); pShape(C(o.hair), 1.4);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(hx - 2, hy - 5); ctx.lineTo(hx + 1, hy - 8); ctx.stroke();
  } else if (o.beanie) {
    ctx.save(); pEll(hx, hy, hr + .2, hr * .96 + .2); ctx.clip();
    pEll(hx - fx * 1.5, hy - 2.6 - fy * .6, hr + 1, hr * .8); ctx.fillStyle = C(o.beanie); ctx.fill();
    ctx.restore(); pEll(hx, hy, hr, hr * .96); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.7; ctx.stroke();
    ctx.strokeStyle = C(shade(o.beanie, 1.7)); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(hx - fx * 1.5, hy - 2.6 - fy * .6 + hr * .55, hr * .9, 1.6, 0, 0, Math.PI); ctx.stroke();
  } else if (o.cap) {
    ctx.save(); pEll(hx, hy, hr + .2, hr * .96 + .2); ctx.clip(); pEll(hx - fx * 1.2, hy - 2.4 - fy * .5, hr + .6, hr * .78); ctx.fillStyle = C(o.cap); ctx.fill(); ctx.restore();
    const b = [hx + fx * hr * .85, hy - 1 + fy * hr * .45]; pEll(b[0], b[1], 4.2 - Math.abs(fy) * .8, 2.2, Math.atan2(fy * .5, fx) + Math.PI / 2); pShape(C(shade(o.cap, .7)), 1.1);
    pEll(hx, hy, hr, hr * .96); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.7; ctx.stroke();
    if (o.badge) { ctx.fillStyle = '#ffd23c'; pEll(hx - fx * 1.2, hy - 4.2, 1.3, 1); ctx.fill(); }
  } else if (o.bald) {
    ctx.fillStyle = C(o.skin || '#c9a080'); pEll(hx, hy - 1.2, hr - .8, hr * .8); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.25)'; pEll(hx - 2, hy - 4, 2.4, 1.4); ctx.fill();
    pEll(hx, hy, hr, hr * .96); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.7; ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(255,255,255,.14)'; pEll(hx - 2.2, hy - 4, 2.8, 1.6); ctx.fill();   // hair sheen
  }
  ctx.restore();
}
function drawCiv(e) {
  if (e.state === 'wounded') {
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.ang);
    ctx.fillStyle = e.col; ellipse(0, 0, e.r * 1.1, e.r * .55); ctx.fillStyle = '#c9a080'; circle(e.r * 1.1, 0, e.r * .4); ctx.restore();
    const p = .5 + .5 * Math.sin(G.time * 6);
    ctx.strokeStyle = `rgba(64,224,255,${.4 + .4 * p})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(e.x, e.y, 14 + p * 6, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#e8fbff'; ctx.fillRect(e.x - 1.5, e.y - 26 - p * 2, 3, 9); ctx.fillRect(e.x - 4.5, e.y - 23 - p * 2, 9, 3);
    return;
  }
  const flee = e.state === 'flee', cheer = e.state === 'cheer';
  drawPerson(e, { body: e.col, hair: e.hair, cheer, pants: e.pants || (e.pants = pick(['#2e3a66', '#2a2a30', '#4a3a2a', '#3a3a48'])), hood: e.id % 3 === 0, beanie: e.id % 5 === 1 ? pick(['#c83a3a', '#3a6ac8', '#e8e0d0']) : null, bald: e.id % 7 === 3 });
  if (e.umb && !cheer) {
    const x = e.x, y = e.y - e.r * 2.75 - (flee ? 2 : 0), R = e.r * 1.65;
    ctx.strokeStyle = '#222'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, e.y - e.r * 1.1); ctx.stroke();
    ctx.fillStyle = e.flash > 0 ? '#fff' : e.umb; ctx.beginPath(); ctx.ellipse(x, y, R, R * .55, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + e.id; ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R * .55); } ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.ellipse(x - R * .3, y - R * .15, R * .45, R * .25, 0, 0, TAU); ctx.fill();
  }
}
const GANG_LOOK = [
  { body: '#7a4220', trim: '#ff9a3a', band: '#ffb04a', hair: '#1a1410', arm: '#5a3018' },
  { body: '#6a2020', trim: '#ff5a4a', band: '#ff5a4a', hair: '#0a0a0a', arm: '#4a1616' },
  { body: '#3e2c6a', trim: '#c080ff', band: '#e0c8ff', hair: '#e0e0f0', arm: '#2c2050' }
];
function drawEntity(e) {
  const z = e.z || 0;
  switch (e.kind) {
    case 'civ': { const a = e.fadeOut !== undefined ? Math.max(0, e.fadeOut / .35) : e.fadeIn > 0 ? 1 - e.fadeIn / .35 : 1; ctx.globalAlpha = a; drawCiv(e); ctx.globalAlpha = 1; break; }
    case 'grunt': { const L = GANG_LOOK[e.did]; drawPerson(e, { body: L.body, trim: L.trim, band: L.band === '#e0c8ff' ? '#6a3aa0' : shade(L.band, .55), beanie: '#26262e', arm: L.arm, angry: true, gun: e.state !== 'grabbed', cast: e.state === 'grabbed' }); if (e.aimT > 0) drawAimLaser(e); break; }
    case 'cop': drawPerson(e, { body: e.ally ? '#2a5aa0' : '#1d2c5a', trim: e.ally ? '#7fd8ff' : '#ffd23c', cap: '#0e1430', badge: true, skin: '#c9a080', pants: '#141a30', gun: e.state !== 'grabbed' }); if (e.aimT > 0) drawAimLaser(e); break;
    case 'brute': drawPerson(e, { body: shade(GANG_LOOK[e.did].body, e.leader ? .8 : 1.1), trim: e.leader ? '#ffc24a' : GANG_LOOK[e.did].trim, pads: e.leader ? '#c8a040' : '#5a5f6e', hair: '#3a2a20', skin: '#c9a080', arm: '#a88468', band: e.leader ? '#c8a040' : null, wide: true, angry: true, headK: .9, bald: true });
      if (e.leader) { const ty = e.y - e.r * 2.7; ctx.font = '700 7px "Chakra Petch",sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillText(e.name, e.x + .6, ty + .6); ctx.fillStyle = '#ffc24a'; ctx.fillText(e.name, e.x, ty);
        ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(e.x - 20, ty + 3, 40, 3.5); ctx.fillStyle = '#ff3d5a'; ctx.fillRect(e.x - 20, ty + 3.5, 40 * Math.max(0, e.hp / e.maxhp), 2.5); }
      break;
    case 'sup': {
      const p = .5 + .5 * Math.sin(G.time * 8 + e.id);
      ctx.strokeStyle = `rgba(190,120,255,${.35 + .3 * p})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 6 + p * 3, 0, TAU); ctx.stroke();
      drawPerson(e, { body: '#2e1d50', trim: '#c080ff', hair: '#e8e0ff', cast: true, arm: '#5a3a90', eyeCol: '#c080ff', angry: true });
      break;
    }
    case 'boss': drawBoss(e); break;
    case 'hideout': drawHideout(e); break;
    case 'crate': case 'barrel': case 'dumpster': case 'car': drawProp(e); break;
  }
  if ((e.team === 'gang' || e.team === 'police' || e.kind === 'car' || e.kind === 'dumpster') && !e.static && e.hp < e.maxhp && e.kind !== 'boss' && e.sinceHit < 4) {
    const w = Math.max(18, e.r * 2), y = e.y - z * .8 - e.r * 2.6 - 4;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(e.x - w / 2 - 1, y - 1, w + 2, 4);
    ctx.fillStyle = e.prop ? '#ffb040' : '#ff3d5a'; ctx.fillRect(e.x - w / 2, y, w * Math.max(0, e.hp / e.maxhp), 2);
  }
  e.sinceHit = (e.sinceHit || 0) + 1 / 60;
}
function drawAimLaser(e) {
  const len = Math.min(380, raycast(e.x, e.y, Math.cos(e.ang), Math.sin(e.ang), 380)), a = .25 + .5 * (1 - e.aimT / .42);
  ctx.strokeStyle = e.team === 'police' ? `rgba(120,170,255,${a})` : `rgba(255,60,80,${a})`; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(e.x + Math.cos(e.ang) * 16, e.y + Math.sin(e.ang) * 16); ctx.lineTo(e.x + Math.cos(e.ang) * len, e.y + Math.sin(e.ang) * len); ctx.stroke();
}
/* Car as two boxes (body + cabin) seen from the tilted camera. Each side face is drawn only if it faces
   the camera (down-screen), so the car shows the correct sides at any rotation. */
const CAR_K = .8;   // on-screen height per unit of car height
function drawCar(e) {
  const fl = e.flash > 0, lift = (e.z || 0) * .8, x = e.x, y = e.y - lift, ca = Math.cos(e.ang), sa = Math.sin(e.ang);
  const base = fl ? '#ffffff' : (e.hp < e.maxhp * .35 ? shade(e.col, .55) : e.col);
  const W2 = (lx, ly) => [x + lx * ca - ly * sa, y + lx * sa + ly * ca];
  const P3 = (p, z) => [p[0], p[1] - z * CAR_K];
  const NORM = [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([nx, ny]) => [nx * ca - ny * sa, nx * sa + ny * ca]);
  function box(cx, L, Wd, z0, z1, faceCol, topCol, deco) {
    const c = [W2(cx + L / 2, -Wd / 2), W2(cx + L / 2, Wd / 2), W2(cx - L / 2, Wd / 2), W2(cx - L / 2, -Wd / 2)];
    const pt = (i, u, zz) => { const a = c[i], b = c[(i + 1) % 4]; return P3([lerp(a[0], b[0], u), lerp(a[1], b[1], u)], zz); };
    const quad = (i, u0, u1, za, zb, col) => { const q = [pt(i, u0, za), pt(i, u1, za), pt(i, u1, zb), pt(i, u0, zb)]; ctx.fillStyle = col; ctx.beginPath(); q.forEach((v, k) => k ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1])); ctx.closePath(); ctx.fill(); };
    for (let i = 0; i < 4; i++) {
      const ny = NORM[i][1]; if (ny <= -.02) continue;
      const lightK = .55 + .25 * NORM[i][0] * -.3 + .2 * (1 - ny);
      quad(i, 0, 1, z0, z1, shade(faceCol, lightK));
      if (deco) deco(i, quad);
    }
    const t = c.map(p => P3(p, z1)); ctx.fillStyle = topCol; ctx.beginPath(); t.forEach((v, k) => k ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1])); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = .8; ctx.stroke();
    return t;
  }
  // lower body: wheels, door line, lights
  box(0, 42, 20, 3, 11, base, shade(base, 1.08), (i, quad) => {
    if (i === 1 || i === 3) { // sides: wheels + door seams
      quad(i, .14, .3, 0, 7, '#0a0a0d'); quad(i, .7, .86, 0, 7, '#0a0a0d');
      quad(i, .16, .28, 2, 5, '#3a3d46'); quad(i, .72, .84, 2, 5, '#3a3d46');
      quad(i, .495, .505, 4, 10.5, 'rgba(0,0,0,.35)');
      quad(i, 0, 1, 9.6, 11, 'rgba(255,255,255,.12)');
    } else if (i === 0) { // front: headlights + grille
      const on = e.driving ? '#fff6d0' : '#8a8670';
      quad(i, .1, .3, 6, 9, on); quad(i, .7, .9, 6, 9, on); quad(i, .35, .65, 5, 8, '#15161b');
    } else { // back: taillights
      const on = e.driving ? '#ff3030' : '#6a1818';
      quad(i, .08, .28, 6, 9, on); quad(i, .72, .92, 6, 9, on);
    }
  });
  // cabin: glass all round, roof on top
  const glass = '#1b2a40';
  const roof = box(-2, 21, 16, 11, 18, base, shade(base, .92), (i, quad) => {
    if (i === 1 || i === 3) { quad(i, .08, .47, 12, 17, glass); quad(i, .53, .92, 12, 17, glass); quad(i, .1, .3, 15, 16.5, 'rgba(160,200,255,.3)'); }
    else quad(i, .1, .9, 12, 17, glass);
  });
  if (e.col === '#e8d040') { const cx = (roof[0][0] + roof[2][0]) / 2, cy = (roof[0][1] + roof[2][1]) / 2; ctx.fillStyle = '#ffe680'; ctx.fillRect(cx - 4, cy - 3, 8, 3); ctx.fillStyle = '#111'; ctx.fillRect(cx - 4, cy, 8, 1.5); }
  if (e.hp < e.maxhp * .45 && Math.random() < .25) FX.smoke(e.x, y - 18, 1, '#2a2c34', .7);
  if (e.hp < e.maxhp * .25 && Math.random() < .3) FX.embers(e.x, y - 12, 1);
}
/* Generic tilted box: draws camera-facing sides (with per-face decoration) then the top. */
function boxModel(x, y, ang, L, Wd, z0, z1, K, faceCol, topCol, deco, topDeco) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const W2 = (lx, ly) => [x + lx * ca - ly * sa, y + lx * sa + ly * ca];
  const c = [W2(L / 2, -Wd / 2), W2(L / 2, Wd / 2), W2(-L / 2, Wd / 2), W2(-L / 2, -Wd / 2)];
  const NORM = [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([nx, ny]) => [nx * ca - ny * sa, nx * sa + ny * ca]);
  const P3 = (p, z) => [p[0], p[1] - z * K];
  const pt = (i, u, z) => { const a = c[i], b = c[(i + 1) % 4]; return P3([lerp(a[0], b[0], u), lerp(a[1], b[1], u)], z); };
  const poly = (pts, col, stroke) => { ctx.beginPath(); pts.forEach((v, k) => k ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1])); ctx.closePath(); if (col) { ctx.fillStyle = col; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke[0]; ctx.lineWidth = stroke[1]; ctx.stroke(); } };
  const quad = (i, u0, u1, za, zb, col) => poly([pt(i, u0, za), pt(i, u1, za), pt(i, u1, zb), pt(i, u0, zb)], col);
  const line = (i, u0, za, u1, zb, col, w) => { const A = pt(i, u0, za), B = pt(i, u1, zb); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); };
  for (let i = 0; i < 4; i++) {
    const ny = NORM[i][1]; if (ny <= -.02) continue;
    const k = .62 + .25 * (1 - ny) - .08 * NORM[i][0];
    quad(i, 0, 1, z0, z1, shade(faceCol, k));
    if (deco) deco(i, quad, line, k);
  }
  const top = c.map(p => P3(p, z1));
  // top-face helper in local (u along length 0..1 front->back, v across 0..1)
  const tp = (u, v) => { const lx = L / 2 - u * L, ly = -Wd / 2 + v * Wd; return P3(W2(lx, ly), z1); };
  poly(top, topCol, ['rgba(0,0,0,.4)', .8]);
  if (topDeco) topDeco(tp, poly);
  return top;
}
function drawCrateBox(e) {
  const fl = e.flash > 0, x = e.x, y = e.y - (e.z || 0) * .8;
  if (e.kind === 'crate') {
    const wood = fl ? '#ffffff' : '#8a6238', dark = '#4a321a';
    boxModel(x, y, e.ang, 22, 22, 0, 18, .85, wood, fl ? '#fff' : '#9a7244', (i, quad, line, k) => {
      // frame, planks and a diagonal brace on every visible side
      quad(i, 0, .1, 0, 18, shade(dark, k * 1.2)); quad(i, .9, 1, 0, 18, shade(dark, k * 1.2));
      quad(i, 0, 1, 0, 2.2, shade(dark, k * 1.2)); quad(i, 0, 1, 15.8, 18, shade(dark, k * 1.2));
      for (const u of [.37, .63]) line(i, u, 2, u, 16, 'rgba(0,0,0,.28)', .8);
      line(i, .1, 2.2, .9, 15.8, shade(dark, k * 1.3), 2.2);
    }, (tp, poly) => {
      poly([tp(0, 0), tp(1, 0), tp(1, .12), tp(0, .12)], dark); poly([tp(0, .88), tp(1, .88), tp(1, 1), tp(0, 1)], dark);
      poly([tp(0, 0), tp(.12, 0), tp(.12, 1), tp(0, 1)], dark); poly([tp(.88, 0), tp(1, 0), tp(1, 1), tp(.88, 1)], dark);
      for (const v of [.37, .63]) { const a = tp(.12, v), b = tp(.88, v); ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    });
  } else {
    const green = fl ? '#ffffff' : '#2f5f4a';
    boxModel(x, y, e.ang, 36, 24, 2, 20, .85, green, fl ? '#fff' : '#3a6e56', (i, quad, line, k) => {
      quad(i, 0, 1, 2, 4, 'rgba(0,0,0,.35)');                                         // base lip
      const n = (i % 2 === 0) ? 2 : 4; for (let r = 1; r <= n; r++) quad(i, r / (n + 1) - .02, r / (n + 1) + .02, 4, 19, shade('#2f5f4a', k * .7));   // ribs
      quad(i, 0, 1, 18, 20, shade('#3a6e56', k * 1.1));                               // lid edge
      if (i % 2 === 1) { quad(i, .12, .24, 0, 4, '#0a0a0d'); quad(i, .76, .88, 0, 4, '#0a0a0d'); }   // casters
      if (i % 2 === 0) quad(i, .3, .7, 9, 13, 'rgba(255,210,60,.55)');                // hazard label
    }, (tp, poly) => {
      poly([tp(0, .02), tp(.49, .02), tp(.49, .98), tp(0, .98)], shade('#3a6e56', 1.1), ['rgba(0,0,0,.35)', .8]);
      poly([tp(.51, .02), tp(1, .02), tp(1, .98), tp(.51, .98)], shade('#3a6e56', .95), ['rgba(0,0,0,.35)', .8]);
    });
  }
}
function drawBarrel(e) {
  const fl = e.flash > 0, x = e.x, y = e.y - (e.z || 0) * .8, R = 10, H = 20, ry = R * .5;
  const top = y - H;
  // body: horizontal shading so it reads as a cylinder
  const g = ctx.createLinearGradient(x - R, 0, x + R, 0);
  g.addColorStop(0, fl ? '#ddd' : '#5a1410'); g.addColorStop(.35, fl ? '#fff' : '#c23a2a'); g.addColorStop(.6, fl ? '#fff' : '#a82e22'); g.addColorStop(1, fl ? '#ccc' : '#4a100c');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - R, top); ctx.lineTo(x - R, y); ctx.ellipse(x, y, R, ry, 0, Math.PI, 0, true); ctx.lineTo(x + R, top); ctx.closePath(); ctx.fill();
  // ribs and hazard band follow the curve
  const arc = (yy, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(x, yy, R, ry, 0, 0, Math.PI); ctx.stroke(); };
  arc(y - H * .25, 'rgba(0,0,0,.4)', 1.4); arc(y - H * .75, 'rgba(0,0,0,.4)', 1.4);
  arc(y - H * .5, '#ffcf3a', 3.2); arc(y - H * .5, 'rgba(0,0,0,.6)', .6);
  ctx.fillStyle = '#1a1a1a'; ctx.font = 'bold 6px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // lid
  ctx.fillStyle = fl ? '#fff' : '#8e261c'; ctx.beginPath(); ctx.ellipse(x, top, R, ry, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#4a100c'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(x, top, R - 1.5, ry - .8, 0, 0, TAU); ctx.stroke();
  ctx.fillStyle = '#3a0c08'; ctx.beginPath(); ctx.ellipse(x + 4, top - .5, 1.8, 1, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x - R * .45, top + 2, 2, H - 4);
}
const PROP_H = { crate: 20, barrel: 22, dumpster: 22, car: 14 };
function drawProp(e) {
  if (e.kind === 'car') { drawCar(e); return; }
  if (e.kind === 'crate' || e.kind === 'dumpster') { drawCrateBox(e); return; }
  if (e.kind === 'barrel') { drawBarrel(e); return; }
  const z = (e.z || 0) * .8, fl = e.flash > 0, h = PROP_H[e.kind] * TILT * 1.6, x = e.x, y = e.y - z;
  const foot = () => { // the footprint shape in local rotated coords
    if (e.kind === 'crate') ctx.rect(-11, -11, 22, 22);
    else if (e.kind === 'barrel') ctx.arc(0, 0, 10, 0, TAU);
    else if (e.kind === 'dumpster') ctx.rect(-18, -12, 36, 24);
    else roundRect(-21, -10.5, 42, 21, 5);
  };
  const side = e.kind === 'crate' ? '#4a3018' : e.kind === 'barrel' ? '#6a1a14' : e.kind === 'dumpster' ? '#163024' : shade(e.col, .5);
  // sides: stack the footprint from the ground up
  for (let k = 0; k <= h; k += 1.5) {
    ctx.save(); ctx.translate(x, y - k); if (e.kind !== 'barrel') ctx.rotate(e.ang);
    ctx.fillStyle = fl ? '#ddd' : (k < 1 ? '#000' : side); ctx.beginPath(); foot(); ctx.fill(); ctx.restore();
  }
  // top face
  ctx.save(); ctx.translate(x, y - h); ctx.rotate(e.kind === 'barrel' ? 0 : e.ang);
  if (e.kind === 'crate') {
    ctx.fillStyle = fl ? '#fff' : '#8a6238'; ctx.fillRect(-11, -11, 22, 22);
    ctx.strokeStyle = '#4a321a'; ctx.lineWidth = 1.5; ctx.strokeRect(-9, -9, 18, 18); ctx.beginPath(); ctx.moveTo(-9, -9); ctx.lineTo(9, 9); ctx.moveTo(9, -9); ctx.lineTo(-9, 9); ctx.stroke();
  } else if (e.kind === 'barrel') {
    ctx.fillStyle = fl ? '#fff' : '#9e2a22'; circle(0, 0, 10);
    ctx.strokeStyle = '#ffcf3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#5a1410'; circle(0, 0, 3.5);
  } else if (e.kind === 'dumpster') {
    ctx.fillStyle = fl ? '#fff' : '#2f5f4a'; ctx.fillRect(-18, -12, 36, 24);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-1, -12, 2, 24);
  }
  ctx.restore();
  if (e.kind === 'car' && e.hp < e.maxhp * .45 && Math.random() < .25) FX.smoke(e.x, e.y - h, 1, '#2a2c34', .7);
  if (e.kind === 'car' && e.hp < e.maxhp * .25 && Math.random() < .3) FX.embers(e.x, e.y - h, 1);
}
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawBoss(e) {
  const t = G.time, d = e.did;
  if (e.stagger > 0) { ctx.fillStyle = '#ffd23c'; for (let i = 0; i < 3; i++) { const a = t * 4 + i * TAU / 3; circle(e.x + Math.cos(a) * 18, e.y - 30 + Math.sin(a) * 5, 2.5); } }
  ctx.strokeStyle = rgba(e.col, .5 + .3 * Math.sin(t * 6)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 8, 0, TAU); ctx.stroke();
  if (d === 0) { drawPerson(e, { body: '#3a1a10', trim: '#ff8a2a', pads: '#5a2a14', hair: '#ff6a20', skin: '#d0a070', arm: '#4a2414' }); if (Math.random() < .5) FX.embers(e.x, e.y - 6, 1); }
  else if (d === 1) drawPerson(e, { body: '#3a1515', trim: '#ff4a3a', pads: '#6a6f7e', hair: '#b08060', skin: '#b08060', arm: '#9a7058' });
  else {
    for (let i = 0; i < 2; i++) { ctx.strokeStyle = rgba('#d0a0ff', .7); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r + 14 + i * 8, (e.r + 14 + i * 8) * .35, t * (i ? -1.3 : 1) + i, 0, TAU); ctx.stroke(); }
    drawPerson(e, { body: '#1a1530', trim: '#b06bff', hair: '#f0e8ff', skin: '#e0d8f0', cast: true, arm: '#2a2050' });
  }
}
function drawBox(x, y, w, h, ht, roof, wall) { // small tilted building (hideouts): front wall + lifted roof
  const lh = ht * TILT;
  const g = ctx.createLinearGradient(0, y + h, 0, y + h - lh); g.addColorStop(0, shade(wall, .55)); g.addColorStop(1, shade(wall, 1.1));
  ctx.fillStyle = g; ctx.fillRect(x, y + h - lh, w, lh);
  const r = [[x, y - lh], [x + w, y - lh], [x + w, y + h - lh], [x, y + h - lh]];
  ctx.fillStyle = roof; ctx.fillRect(x, y - lh, w, h);
  return r;
}
/* Gang hideout: squat fortified brick block. Barred windows glow in gang colour, razor wire on the roof,
   red floodlights, a graffiti tag, and a steel gate in the front that rolls up once every guard is down. */
function drawHideout(e) {
  const r = e.rect, x0 = r.x, w = r.w, y1 = r.y + r.h, ht = 110, h = ht * TILT, t = G.time, fl = e.flash > 0, col = e.col;
  // front wall: dark brick
  const g = ctx.createLinearGradient(0, y1, 0, y1 - h); g.addColorStop(0, fl ? '#fff' : '#120f0f'); g.addColorStop(1, fl ? '#fff' : '#2e2523');
  ctx.fillStyle = g; ctx.fillRect(x0, y1 - h, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = .8; ctx.beginPath();
  for (let yy = y1 - 4, row = 0; yy > y1 - h; yy -= 4, row++) { ctx.moveTo(x0, yy); ctx.lineTo(x0 + w, yy); for (let xx = x0 + (row % 2 ? 4 : 0); xx < x0 + w; xx += 8) { ctx.moveTo(xx, yy); ctx.lineTo(xx, yy - 4); } }
  ctx.stroke();
  // graffiti tag in gang colour
  ctx.strokeStyle = rgba(col, .75); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
  ctx.moveTo(x0 + 8, y1 - h * .35); ctx.quadraticCurveTo(x0 + 16, y1 - h * .7, x0 + 22, y1 - h * .4); ctx.quadraticCurveTo(x0 + 26, y1 - h * .2, x0 + 31, y1 - h * .55);
  ctx.moveTo(x0 + w - 30, y1 - h * .5); ctx.lineTo(x0 + w - 22, y1 - h * .28); ctx.lineTo(x0 + w - 14, y1 - h * .58); ctx.stroke(); ctx.lineCap = 'butt';
  // barred windows with a sickly glow
  for (const wx of [x0 + 14, x0 + w - 26]) {
    const wy = y1 - h * .88; ctx.fillStyle = rgba(col, .35 + .1 * Math.sin(t * 3 + wx)); ctx.fillRect(wx, wy, 12, 7);
    ctx.fillStyle = '#0a0808'; for (let i = 1; i < 4; i++) ctx.fillRect(wx + i * 3 - .5, wy, 1, 7);
  }
  // gate
  const gw = 30, gh = Math.min(h - 6, 26), gx = x0 + w / 2 - gw / 2, gy = y1 - gh, open = e.gateOpen ? (e.gateT || 0) : 0;
  ctx.fillStyle = '#050404'; ctx.fillRect(gx, gy, gw, gh);
  if (open > 0 && !e.cleared) { ctx.globalCompositeOperation = 'lighter'; glow(gx + gw / 2, gy + gh * .6, 26, col, .5 * open); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
  const shutter = gh * (1 - open);
  if (shutter > .5) {
    ctx.fillStyle = fl ? '#fff' : '#3a3634'; ctx.fillRect(gx, gy, gw, shutter);
    ctx.fillStyle = 'rgba(0,0,0,.45)'; for (let yy = gy + 2; yy < gy + shutter; yy += 3) ctx.fillRect(gx, yy, gw, 1);
    ctx.fillStyle = '#d0a020'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(gx + i * 6, gy + shutter); ctx.lineTo(gx + i * 6 + 3, gy + shutter - 3); ctx.lineTo(gx + i * 6 + 6, gy + shutter); ctx.fill(); }
  }
  ctx.strokeStyle = '#5a5250'; ctx.lineWidth = 2; ctx.strokeRect(gx - 1, gy - 1, gw + 2, gh + 1);
  // roof
  const ry = r.y - h;
  ctx.fillStyle = fl ? '#fff' : '#1c1817'; ctx.fillRect(x0, ry, w, r.h);
  ctx.strokeStyle = '#3a3230'; ctx.lineWidth = 2; ctx.strokeRect(x0 + 1, ry + 1, w - 2, r.h - 2);
  ctx.fillStyle = '#2a2422'; ctx.fillRect(x0 + 10, ry + 10, 18, 12); ctx.fillRect(x0 + w - 34, ry + r.h - 24, 22, 14);
  // razor wire along the roof edge
  ctx.strokeStyle = '#8a8682'; ctx.lineWidth = .9; ctx.beginPath();
  for (let xx = x0 + 2; xx <= x0 + w - 2; xx += 4) { ctx.moveTo(xx, ry + 3); ctx.lineTo(xx + 2, ry + 0); ctx.lineTo(xx + 4, ry + 3); }
  for (let xx = x0 + 2; xx <= x0 + w - 2; xx += 4) { ctx.moveTo(xx, ry + r.h - 3); ctx.lineTo(xx + 2, ry + r.h - 6); ctx.lineTo(xx + 4, ry + r.h - 3); }
  ctx.stroke();
  // gang flag + blinking warning light
  if (e.cleared) return;
  const fx = x0 + w - 14, fy = ry + 12; ctx.fillStyle = '#777'; ctx.fillRect(fx, fy - 22, 1.5, 22);
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(fx + 1.5, fy - 22); ctx.lineTo(fx + 15 + Math.sin(t * 6) * 2, fy - 18); ctx.lineTo(fx + 1.5, fy - 13); ctx.fill();
  const on = Math.sin(t * 5) > 0; ctx.fillStyle = on ? '#ff2a2a' : '#401010'; circle(x0 + 12, ry + r.h - 10, 2.5);
  if (on) { ctx.globalCompositeOperation = 'lighter'; glow(x0 + 12, ry + r.h - 10, 14, '#ff2a2a', .7); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
  // floodlight housings at the front corners
  ctx.fillStyle = '#ddd'; ctx.fillRect(x0 + 2, y1 - h + 2, 5, 3); ctx.fillRect(x0 + w - 7, y1 - h + 2, 5, 3);
}
/* ---------- buildings & trees ---------- */
function proj(x, y, h) { const f = CAM_D / (CAM_D - h); return [cam.cx + (x - cam.cx) * f, cam.cy + (y - cam.cy) * f]; }
function drawTree(t) {
  const x = t.x, y = t.y - t.h * TILT;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; circle(t.x + 4, t.y + 5, t.r * .9);
  ctx.fillStyle = '#1c140e'; circle(t.x, t.y, 3);
  ctx.fillStyle = t.c; circle(x, y, t.r); circle(x + t.r * .45, y - t.r * .2, t.r * .7); circle(x - t.r * .4, y + t.r * .25, t.r * .65);
  ctx.fillStyle = 'rgba(120,200,150,.07)'; circle(x - t.r * .3, y - t.r * .35, t.r * .55);
}
const TILT = .55;   // how tall building fronts appear on screen, as a fraction of their height
function drawBuilding(b) {
  const x0 = b.x, y1 = b.y + b.h, w = b.w, ht = b.ht, h = ht * TILT;
  const st = DS[b.d].status, pal = neonPal(b.d), t = G.time;
  const litK = st === 'liberated' ? 1.35 : st === 'dominated' ? .75 : 1;
  // front wall
  const g = ctx.createLinearGradient(0, y1, 0, y1 - h);
  g.addColorStop(0, shade(b.wall, .5)); g.addColorStop(.25, shade(b.wall, .85)); g.addColorStop(1, shade(b.wall, 1.15));
  ctx.fillStyle = g; ctx.fillRect(x0, y1 - h, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let f = 40 * TILT; f < h - 4; f += 40 * TILT) { ctx.moveTo(x0, y1 - f); ctx.lineTo(x0 + w, y1 - f); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.beginPath(); ctx.moveTo(x0 + .5, y1); ctx.lineTo(x0 + .5, y1 - h); ctx.moveTo(x0 + w - .5, y1); ctx.lineTo(x0 + w - .5, y1 - h); ctx.stroke();
  const fx = u => lerp(x0 + w, x0, u), fy = v => y1 - v;   // front wall = generated south side (u runs right to left)
  // windows
  const lit = [];
  for (const wn of b.win[2]) {
    let on = wn.roll < b.lit * litK; if (wn.roll > .97 && Math.sin(t * .7 + wn.u * 50) > .6) on = !on;
    if (!on || wn.v * ht < 34 || Math.round(wn.v * ht / 15) % 2) continue;   // one row per (taller) floor
    const px = fx(wn.u), py = fy(wn.v * h), col = st === 'dominated' && wn.roll < .1 ? '#ff4a3a' : wn.c;
    ctx.fillStyle = col; ctx.fillRect(px - 3.8, py - 3.6, 7.6, 7.2);
    if (wn.roll < .08) lit.push(px, py, col);
  }
  if (lit.length) { ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < lit.length; i += 3) glow(lit[i], lit[i + 1], 12, lit[i + 2], .35); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
  // street door (people walk in and out of it)
  if (b.door) { const dx = x0 + w / 2, dh = Math.min(h - 4, 27); ctx.fillStyle = '#0b0a0d'; ctx.fillRect(dx - 8, y1 - dh, 16, dh); ctx.fillStyle = 'rgba(255,214,150,.55)'; ctx.fillRect(dx - 6.5, y1 - dh + 1.5, 13, dh - 1.5); ctx.fillStyle = shade(b.wall, .4); ctx.fillRect(dx - 10, y1 - dh - 3, 20, 3);
    ctx.globalCompositeOperation = 'lighter'; glow(dx, y1 - 4, 16, '#ffd696', .5); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
  // ground-floor shopfronts
  for (const sh of b.shops) {
    if (sh.side !== 2) continue;
    const col = pal[sh.ci], xa = fx(sh.u1), xb = fx(sh.u0), top = y1 - Math.min(h - 3, 20);
    ctx.fillStyle = rgba(col, .8); ctx.fillRect(xa, top, xb - xa, y1 - 2 - top);
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(xa, (top + y1) / 2); ctx.lineTo(xb, (top + y1) / 2); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter'; glow((xa + xb) / 2, (top + y1) / 2, 30, col, .45, 1, 1.6); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  // neon signs
  for (const sg of b.signs) {
    if (sg.side !== 2) continue;
    const on = sg.blink ? (Math.sin(t * 3 + sg.ph) > -.2 ? 1 : .15) : 1, col = pal[sg.ci];
    const X0 = fx(sg.u), Y0 = fy(sg.v0 * h), X1 = fx(sg.u2), Y1 = fy(sg.v1 * h);
    ctx.globalAlpha = on; ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.lineCap = 'butt'; ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter'; glow((X0 + X1) / 2, (Y0 + Y1) / 2, 50, col, .6 * on); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  // roof: the footprint lifted straight up by the wall height
  ctx.save(); ctx.translate(0, -h);
  const y0 = b.y, x1 = x0 + w;
  const rg = ctx.createLinearGradient(x0, y0, x1, y1); rg.addColorStop(0, shade(b.roof, 1.18)); rg.addColorStop(1, shade(b.roof, .85));
  ctx.fillStyle = rg; ctx.fillRect(x0, y0, w, b.h);
  ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 2; ctx.strokeRect(x0 + 5, y0 + 5, w - 10, b.h - 10);
  ctx.strokeStyle = shade(b.roof, 1.9); ctx.lineWidth = 1.5; ctx.strokeRect(x0 + .75, y0 + .75, w - 1.5, b.h - 1.5);
  for (const p of b.props) {
    if (p.k === 'box') { ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(p.x + 3, p.y + 4, p.w, p.h); ctx.fillStyle = shade(b.roof, 1.55); ctx.fillRect(p.x, p.y, p.w, p.h); ctx.fillStyle = shade(b.roof, 1.9); ctx.fillRect(p.x, p.y, p.w, 1.5); ctx.fillStyle = 'rgba(0,0,0,.3)'; for (let i = 3; i < p.w - 2; i += 4) ctx.fillRect(p.x + i, p.y + 3, 1.5, p.h - 5); }
    else if (p.k === 'tank') { ctx.fillStyle = 'rgba(0,0,0,.4)'; circle(p.x + p.w / 2 + 3, p.y + p.w / 2 + 4, p.w / 2); ctx.fillStyle = shade(b.roof, 1.75); circle(p.x + p.w / 2, p.y + p.w / 2, p.w / 2); ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x + p.w / 2, p.y + p.w / 2, p.w / 3, 0, TAU); ctx.stroke(); }
    else if (p.k === 'pad') { ctx.strokeStyle = rgba(pal[0], .7); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(p.x, p.y, p.w, 0, TAU); ctx.stroke(); ctx.fillStyle = rgba(pal[0], .7); ctx.fillRect(p.x - p.w * .35, p.y - p.w * .45, 3, p.w * .9); ctx.fillRect(p.x + p.w * .35 - 3, p.y - p.w * .45, 3, p.w * .9); ctx.fillRect(p.x - p.w * .35, p.y - 1.5, p.w * .7, 3); }
  }
  if (b.trim !== null) {
    const col = pal[b.trim]; ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.strokeRect(x0 + 1, y0 + 1, w - 2, b.h - 2);
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(col, .25); ctx.lineWidth = 7; ctx.strokeRect(x0 + 1, y0 + 1, w - 2, b.h - 2); ctx.globalCompositeOperation = 'source-over';
  }
  if ((hash2(b.x, b.y) & 3) === 0) { const on = Math.sin(t * 2.4 + b.x) > 0; ctx.fillStyle = on ? '#ff2a2a' : '#401010'; circle(x0 + w - 8, y0 + 8, 2); if (on) { ctx.globalCompositeOperation = 'lighter'; glow(x0 + w - 8, y0 + 8, 10, '#ff2a2a', .6); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; } }
  ctx.restore();
}
function wallPt(a, c, u, h) { const bx = lerp(a[0], c[0], u), by = lerp(a[1], c[1], u), f = CAM_D / (CAM_D - h); return [cam.cx + (bx - cam.cx) * f, cam.cy + (by - cam.cy) * f]; }
function drawGates() {
  for (let i = 0; i < 2; i++) {
    if (gatesOpen[i]) continue;
    const x = GATE_TX[i] * TILE, y0 = Math.max(0, Math.floor(cam.y / 96) * 96), y1 = Math.min(WORLD_H, cam.y + cam.h + 96);
    if (x + 32 < cam.x - 40 || x > cam.x + cam.w + 40) continue;
    const top = 60 * TILT, cx = x + 16;
    ctx.fillStyle = '#0c0d12'; ctx.fillRect(x + 6, y0, 20, y1 - y0);
    for (let y = y0; y < y1; y += 16) { ctx.fillStyle = (y / 16) & 1 ? '#3a1018' : '#d02a40'; ctx.fillRect(x + 8, y, 16, 8); }
    for (let y = y0; y < y1; y += 96) {
      ctx.strokeStyle = '#2a2d38'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, y + 48); ctx.lineTo(cx, y + 48 - top); ctx.stroke();
      ctx.fillStyle = '#ff3355'; circle(cx, y + 48 - top, 4);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let y = y0; y < y1; y += 96) {
      for (const hh of [.33, .66, 1]) { ctx.strokeStyle = `rgba(255,50,80,${.35 + .2 * Math.sin(G.time * 8 + y + hh * 60)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, y + 48 - top * hh); ctx.lineTo(cx, y + 144 - top * hh); ctx.stroke(); }
      glow(cx, y + 48 - top, 18, '#ff3355', .6);
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
}
/* ---------- overlays & effects ---------- */
function drawWarns() {
  for (const w of warns) {
    const k = 1 - w.life / w.max, a = .18 + .3 * k + .15 * Math.sin(G.time * 30);
    ctx.fillStyle = rgba(w.col, a * .5); ctx.strokeStyle = rgba(w.col, a + .2); ctx.lineWidth = 1.5;
    if (w.k === 'circle') { ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(w.x, w.y, w.r * k, 0, TAU); ctx.stroke(); }
    else { ctx.save(); ctx.translate(w.x, w.y); ctx.rotate(w.ang); ctx.fillRect(0, -w.w / 2, w.len, w.w); ctx.strokeRect(0, -w.w / 2, w.len, w.w); ctx.fillStyle = rgba(w.col, a); ctx.fillRect(0, -w.w / 2, w.len * k, w.w); ctx.restore(); }
  }
  for (const z of zones) {
    const a = Math.min(1, z.t);
    ctx.fillStyle = `rgba(255,110,30,${.25 * a})`; circle(z.x, z.y, z.r);
    ctx.fillStyle = `rgba(255,190,80,${.35 * a})`; for (let i = 0; i < 3; i++) { const q = G.time * 6 + i * 2 + z.x; circle(z.x + Math.sin(q) * z.r * .4, z.y + Math.cos(q * 1.3) * z.r * .4, z.r * .3); }
  }
}
function drawTKOverlay() {
  const t = G.time, kc = kcol();
  if (tkTarget && !P.holding && G.mode === 'play') {
    const e = tkTarget, r = e.r + 7 + Math.sin(t * 8) * 1.5, y = e.y - (e.z || 0) * .8;
    ctx.strokeStyle = kc; ctx.lineWidth = 2; ctx.globalAlpha = .9;
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + t * 1.5; ctx.beginPath(); ctx.arc(e.x, y, r, a, a + .7); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  const h = P.holding;
  if (h && !h.dead) {
    const hx = P.x + aim.dx * 12, hy = P.y + aim.dy * 12, ox = h.x, oy = h.y - (h.z || 0) * .8;
    ctx.globalCompositeOperation = 'lighter';
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass ? '#ffffff' : kc; ctx.lineWidth = pass ? 1.2 : 4; ctx.globalAlpha = pass ? .8 : .35;
      ctx.beginPath(); ctx.moveTo(hx, hy);
      const n = 8; for (let i = 1; i <= n; i++) { const q = i / n, wob = Math.sin(t * 30 + i * 1.7) * 3 * Math.sin(q * Math.PI); ctx.lineTo(lerp(hx, ox, q) - aim.dy * wob, lerp(hy, oy, q) + aim.dx * wob); }
      ctx.stroke();
    }
    glow(ox, oy, h.r * 2.6, kc, .5); glow(hx, hy, 18, kc, .8);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    if (traj) {
      const L = Math.hypot(traj.x1 - traj.x0, traj.y1 - traj.y0), dx = (traj.x1 - traj.x0) / (L || 1), dy = (traj.y1 - traj.y0) / (L || 1);
      const tc = mix(kc, '#ffffff', .35);
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(tc, .18); ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(traj.x0, traj.y0); ctx.lineTo(traj.x1, traj.y1); ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = tc;
      for (let s = (t * 260) % 18; s < L; s += 18) { ctx.globalAlpha = .95 - s / L * .5; ctx.fillRect(traj.x0 + dx * s - dx * 4 - 1.5 * -dy, traj.y0 + dy * s - dy * 4, 1, 1); circle(traj.x0 + dx * s, traj.y0 + dy * s, 2.6); }
      ctx.globalAlpha = 1;
      const tg = traj.hit && (traj.hit.team === 'gang' || traj.hit.team === 'police') ? traj.hit : traj.assist;
      if (tg) {
        const r = tg.r + 10, c = tg.team === 'police' && !(G.heat >= 1) ? '#8fb4ff' : '#ff3d5a';
        ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(tg.x, tg.y, r, 0, TAU); ctx.stroke();
        ctx.beginPath(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + t * 2; ctx.moveTo(tg.x + Math.cos(a) * (r - 5), tg.y + Math.sin(a) * (r - 5)); ctx.lineTo(tg.x + Math.cos(a) * (r + 6), tg.y + Math.sin(a) * (r + 6)); } ctx.stroke();
      } else { ctx.strokeStyle = rgba(kc, .8); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(traj.x1, traj.y1, 7, 0, TAU); ctx.stroke(); }
    }
  }
  // well reticle while aiming with a pad
  if (Input.device === 'pad' && G.mode === 'play' && P.wellCd <= 0 && P.energy >= 32 && Input.aimStick() && !P.holding) {
    const d = Math.min(aim.dist, raycast(P.x, P.y, aim.dx, aim.dy, aim.dist) - 10), x = P.x + aim.dx * d, y = P.y + aim.dy * d;
    ctx.strokeStyle = 'rgba(200,170,255,.25)'; ctx.lineWidth = 1; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(x, y, 14, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  }
}
function drawPlayer() {
  const p = P; if (G.mode === 'dead' || G.mode === 'title') return;
  const kc = kcol(), t = G.time;
  if (p.invT > 0 && Math.floor(t * 20) % 2) ctx.globalAlpha = .5;
  const casting = p.holding || p.absorbing || p.throwT > 0 || p.chan;
  ctx.strokeStyle = rgba(kc, .55); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, 13, 6, 0, 0, TAU); ctx.stroke();
  ctx.fillStyle = rgba(kc, .1); ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, 13, 6, 0, 0, TAU); ctx.fill();
  drawPerson(p, { body: '#232a44', trim: kc, hair: '#eef0fa', skin: '#e8bf98', cast: !!casting, arm: '#2a3250', spiky: true, collar: true, coatTail: true, glowHands: mix('#ffffff', kc, .6), pants: '#1a1d28' });
  ctx.globalAlpha = 1;
  if (casting) { ctx.globalCompositeOperation = 'lighter'; const c = Math.cos(p.ang), s = Math.sin(p.ang); glow(p.x + c * 7, p.y - 7 + s * 3, 12, kc, .9); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
  if (p.absorbing) {
    const k = p.charge / S.absCap, pu = .5 + .5 * Math.sin(t * 10);
    ctx.fillStyle = `rgba(140,240,255,${.08 + .06 * pu})`; circle(p.x, p.y, 26);
    ctx.strokeStyle = `rgba(160,250,255,${.6 + .3 * pu})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, 26, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, 31, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
  }
  if (p.chan) {
    const c = p.chan.c, k = p.chan.t / p.chan.need, col = p.chan.k === 'heal' ? '#5fe8ff' : '#ff3366';
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(c.x, c.y, 18, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(col, .6); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(c.x, c.y); ctx.stroke(); glow(c.x, c.y, 40, col, .6); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
}
function drawEffects() {
  // wells
  for (const w of wells) {
    const f = Math.min(1, w.t * 2, (w.max - w.t) * 4);
    ctx.fillStyle = `rgba(20,0,40,${.5 * f})`; circle(w.x, w.y, 18);
    ctx.strokeStyle = `rgba(200,160,255,${.5 * f})`; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(w.x, w.y, 22 + i * 14 + Math.sin(w.a * 2 + i) * 3, w.a * (1 + i * .3) + i * 2, w.a * (1 + i * .3) + i * 2 + 2.2); ctx.stroke(); }
    ctx.strokeStyle = `rgba(200,160,255,${.12 * f})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#000'; circle(w.x, w.y, 7 * f);
  }
  ctx.globalCompositeOperation = 'lighter';
  for (const b of bullets) {
    if (!inView(b.x, b.y, 20)) continue;
    ctx.strokeStyle = b.col; ctx.lineWidth = b.r * 1.1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(b.x - b.vx * .035, b.y - b.vy * .035); ctx.lineTo(b.x, b.y); ctx.stroke();
    glow(b.x, b.y, b.r * 5, b.col, .7); ctx.globalAlpha = 1;
  }
  ctx.lineCap = 'butt';
  for (const r of rings) { ctx.globalAlpha = Math.max(0, r.life / r.ml); ctx.strokeStyle = r.col; ctx.lineWidth = r.w; ctx.beginPath(); ctx.arc(r.x, r.y, Math.max(0, r.r), 0, TAU); ctx.stroke(); }
  ctx.globalAlpha = 1;
  for (const p of parts) {
    const a = clamp(p.life / p.max, 0, 1);
    if (p.k === 's') { ctx.globalAlpha = a; ctx.strokeStyle = p.col; ctx.lineWidth = p.w; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * .04, p.y - p.vy * .04); ctx.stroke(); }
    else if (p.k === 'd') { ctx.globalAlpha = a; ctx.fillStyle = p.col; circle(p.x, p.y, p.w); }
  }
  for (const l of dlights) glow(l.x, l.y, l.r, l.col, l.a * (l.life / l.max));
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  for (const p of parts) {
    const a = clamp(p.life / p.max, 0, 1);
    if (p.k === 'm') { ctx.globalAlpha = a * .45; ctx.fillStyle = p.col; circle(p.x, p.y, p.w * (1 + (1 - a) * (p.g - 1))); }
    else if (p.k === 'r') { ctx.globalAlpha = a; ctx.fillStyle = p.col; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillRect(-p.w / 2, -p.w / 3, p.w, p.w * .66); ctx.restore(); }
    else if (p.k === 'g') { ctx.globalAlpha = a * .35; ctx.fillStyle = p.col; circle(p.x, p.y, p.boss ? 22 : p.sup ? 11 : 10); }
  }
  ctx.globalAlpha = 1;
}

/* ---------- rain ---------- */
let rain = [], splashes = [];
function initRain() {
  const n = clamp(Math.round(170 * W * H / (1600 * 900)), 70, 260); rain = [];
  for (let i = 0; i < n; i++) rain.push({ x: rnd(W), y: rnd(H), l: rnd(10, 22), s: rnd(700, 1100) });
}
function drawRain(dt) {
  ctx.strokeStyle = 'rgba(170,195,240,.2)'; ctx.lineWidth = 1; ctx.beginPath();
  for (const r of rain) {
    r.y += r.s * dt; r.x += r.s * .16 * dt; if (r.y > H) { r.y = -r.l; r.x = rnd(-60, W); } if (r.x > W) r.x -= W + 40;
    ctx.moveTo(r.x, r.y); ctx.lineTo(r.x - r.l * .16, r.y - r.l);
  }
  ctx.stroke();
}
function updateSplashes(dt) {
  const n = dt * 60; for (let i = 0; i < n; i++) if (splashes.length < 70) splashes.push({ x: cam.x + rnd(cam.w), y: cam.y + rnd(cam.h), t: 0 });
  for (const s of splashes) s.t += dt * 3; splashes = splashes.filter(s => s.t < 1);
  ctx.strokeStyle = 'rgba(190,210,255,.22)'; ctx.lineWidth = .8; ctx.beginPath();
  for (const s of splashes) { ctx.moveTo(s.x + 6 * s.t, s.y); ctx.ellipse(s.x, s.y, 6 * s.t, 2.6 * s.t, 0, 0, TAU); }
  ctx.stroke();
}

/* ---------- frame ---------- */
const _vis = [];
function render(dt) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#05060b'; ctx.fillRect(0, 0, cv.width, cv.height);
  if (!P) return;
  const s = cam.scale * DPR;
  ctx.setTransform(s, 0, 0, s, -(cam.x + cam.sx) * s, -(cam.y + cam.sy) * s);
  drawGround();
  { // light map: draw glows at low resolution, then add it onto the frame in one go
    const ls = s / LIGHT_DS; lightCtx.setTransform(1, 0, 0, 1, 0, 0); lightCtx.globalCompositeOperation = 'source-over'; lightCtx.globalAlpha = 1;
    lightCtx.clearRect(0, 0, lightCv.width, lightCv.height);
    lightCtx.setTransform(ls, 0, 0, ls, -(cam.x + cam.sx) * ls, -(cam.y + cam.sy) * ls); lightCtx.globalCompositeOperation = 'lighter';
    ctx = lightCtx; drawGroundLights(); ctx = mainCtx;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true; ctx.drawImage(lightCv, 0, 0, cv.width, cv.height); ctx.restore();
  }
  _vis.length = 0;
  for (const e of ents) if (!e.dead && inView(e.x, e.y, 60) && e !== P) _vis.push(e);
  _vis.sort((a, b) => (a.state === 'wounded' ? -1e6 : a.y + (a.z || 0) * 4) - (b.state === 'wounded' ? -1e6 : b.y + (b.z || 0) * 4));
  for (const e of _vis) shadowOf(e); if (G.mode !== 'dead' && G.mode !== 'title') shadowOf(P);
  for (const p of pickups) if (inView(p.x, p.y, 30)) drawPickup(p);
  // tilted view: buildings and everything on the street are drawn back-to-front by where they touch the ground
  const items = [];
  for (const e of _vis) items.push({ y: e.kind === 'hideout' ? e.rect.y + e.rect.h : e.state === 'wounded' ? e.y - 30 : e.y + (e.z || 0) * 4, e });
  items.push({ y: P.y, e: P });
  for (const t of trees) if (inView(t.x, t.y, 60)) items.push({ y: t.y, t });
  for (const b of buildings) if (b.x < cam.x + cam.w + 20 && b.x + b.w > cam.x - 20 && b.y - b.ht * TILT < cam.y + cam.h + 20 && b.y + b.h > cam.y - 20) items.push({ y: b.y + b.h, b });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) { if (it.t) drawTree(it.t); else if (it.b) drawBuilding(it.b); else if (it.e === P) drawPlayer(); else drawEntity(it.e); }
  drawWarns();
  drawGates();
  // hostiles behind buildings get a faint outline so you never lose track of them
  ctx.lineWidth = 1.5;
  for (const e of _vis) if ((e.team === 'gang' && !e.static) || (e.kind === 'cop' && !e.ally && G.heat >= 1)) {
    const c = e.team === 'gang' ? '#ff4a5a' : '#6a9aff', y = e.y - (e.z || 0) * .8;
    ctx.fillStyle = rgba(c, .14); ctx.beginPath(); ctx.arc(e.x, y, e.r + 2, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(c, .4); ctx.stroke();
    if (e.kind === 'boss') { ctx.globalAlpha = .4; drawBoss(e); ctx.globalAlpha = 1; }
  }
  drawTKOverlay(); drawEffects();
  updateSplashes(dt);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawRain(dt);
  // post: karma tint, vignette, damage flash
  if (G.mode !== 'title') {
    if (G.karma > 15) { ctx.fillStyle = `rgba(60,160,255,${.05 * G.karma / 100})`; ctx.fillRect(0, 0, W, H); }
    else if (G.karma < -15) { ctx.fillStyle = `rgba(255,30,50,${.09 * -G.karma / 100})`; ctx.fillRect(0, 0, W, H); }
  }
  ctx.drawImage(vignette, 0, 0, W, H);
  if (G.mode !== 'title' && P.hp < S.maxHp * .3 && G.mode !== 'dead') { ctx.globalAlpha = .45 + .25 * Math.sin(G.time * 7); ctx.drawImage(redVig(), 0, 0, W, H); ctx.globalAlpha = 1; }
  if (G.flash > 0) { ctx.fillStyle = rgba(G.flashCol, Math.min(.4, G.flash)); ctx.fillRect(0, 0, W, H); }
}
let _redVig = null;
function redVig() {
  if (_redVig) return _redVig; _redVig = document.createElement('canvas'); _redVig.width = _redVig.height = 256; const g = _redVig.getContext('2d'), gr = g.createRadialGradient(128, 128, 80, 128, 128, 182);
  gr.addColorStop(0, 'rgba(255,0,30,0)'); gr.addColorStop(1, 'rgba(255,0,30,.55)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return _redVig;
}
function drawPickup(p) {
  const y = p.y - 4 + Math.sin(G.time * 4 + p.x) * 2;
  if (p.type === 'shard') {
    const d = dist(p, P); if (d > 170) return; const a = clamp((170 - d) / 60, 0, 1);
    ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter'; glow(p.x, y, 34, '#7affea', .7 * a); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a;
    ctx.fillStyle = '#c8fff4'; ctx.save(); ctx.translate(p.x, y); ctx.rotate(G.time * 1.5); ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(5, 0); ctx.lineTo(0, 9); ctx.lineTo(-5, 0); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1;
    return;
  }
  const c = p.type === 'hp' ? '#5fffa0' : '#3ce0ff';
  ctx.globalCompositeOperation = 'lighter'; glow(p.x, y, 20, c, .7); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.fillStyle = c; circle(p.x, y, 5); ctx.fillStyle = '#05160c';
  if (p.type === 'hp') { ctx.fillRect(p.x - 3, y - 1, 6, 2); ctx.fillRect(p.x - 1, y - 3, 2, 6); } else { ctx.beginPath(); ctx.moveTo(p.x + 1, y - 4); ctx.lineTo(p.x - 2, y + 1); ctx.lineTo(p.x + 1, y + 1); ctx.lineTo(p.x - 1, y + 4); ctx.lineTo(p.x + 2, y - 1); ctx.lineTo(p.x - 1, y - 1); ctx.fill(); }
}
