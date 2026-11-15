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
  ctx.fillStyle = c; y0 = Math.max(Math.round(y0), -2); y1 = Math.min(Math.round(y1), ctx.canvas.height + 2);
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
// drawIsoBuilding lives in 11g_buildings.js

/* ---------- hideouts ---------- */
// drawIsoHideout lives in 11f_blocks.js

/* ---------- trees, lamps, barricades ---------- */
// drawIsoTree and drawIsoLamp live in 11i_street.js
function drawGateStripes() { // the barricade's footprint on the ground (affine pass): a dark sill with yellow and red hazard bars
  for (let i = 0; i < 2; i++) {
    if (gatesOpen[i]) continue;
    const x = GATE_TX[i] * TILE, y0 = Math.max(0, Math.floor(cam.y / 96) * 96), y1 = Math.min(WORLD_H, cam.y + cam.h + 96);
    if (x + 32 < cam.x - 40 || x > cam.x + cam.w + 40) continue;
    ctx.fillStyle = '#08090d'; ctx.fillRect(x + 4, y0, 24, y1 - y0);
    ctx.fillStyle = '#23262f'; ctx.fillRect(x + 4, y0, 2, y1 - y0); ctx.fillRect(x + 26, y0, 2, y1 - y0);               // kerbs
    for (let y = y0; y < y1; y += 16) { ctx.fillStyle = '#d02a40'; ctx.fillRect(x + 8, y, 16, 6); ctx.fillStyle = '#e0b020'; ctx.fillRect(x + 8, y + 8, 16, 2); }
    ctx.fillStyle = 'rgba(255,60,90,.10)'; ctx.fillRect(x - 10, y0, 52, y1 - y0);                                        // red spill on the road
  }
}
function drawIsoGateSeg(g) { // one pylon and the laser beams to the next pylon
  const cx = g.cx, y = g.y, top = 60, t = G.time, p0 = isoXY(cx, y, 0), p1 = isoXY(cx, y, top), X = Math.round(p0[0]), Yb = Math.round(p0[1]), Yt = Math.round(p1[1]);
  // beams first, so this pylon and the next one cover their ends: a pale core with a red halo, pulsing out of step
  for (const hh of [.3, .62, .94]) {
    const a = isoXY(cx, y, top * hh), b = isoXY(cx, y + 96, top * hh), k = .65 + .3 * Math.sin(t * 8 + y + hh * 60);
    ctx.globalAlpha = k * .3; iline([a[0], a[1] - 1], [b[0], b[1] - 1], '#ff3355'); iline([a[0], a[1] + 1], [b[0], b[1] + 1], '#ff3355');
    ctx.globalAlpha = k; iline(a, b, '#ff8296');
    const s = ((t * 40 + y + hh * 200) % 96) / 96, m = isoXY(cx, y + 96 * s, top * hh); ctx.globalAlpha = 1; ipx(m[0], m[1], '#ffffff');   // a spark running along the beam
  }
  ctx.globalAlpha = 1;
  // pylon: dark outline, steel body lit from the left, hazard foot, an emitter block at each beam, warning lamp on top
  const h = Yb - Yt;
  ctx.fillStyle = '#07070c'; ctx.fillRect(X - 2, Yt - 3, 5, h + 4);
  ctx.fillStyle = '#414756'; ctx.fillRect(X - 1, Yt - 2, 3, h + 2); ctx.fillStyle = '#687083'; ctx.fillRect(X - 1, Yt - 2, 1, h + 2); ctx.fillStyle = '#272b36'; ctx.fillRect(X + 1, Yt - 2, 1, h + 2);
  for (let k = 0; k < 3; k++) { ctx.fillStyle = k % 2 ? '#17130a' : '#e0b020'; ctx.fillRect(X - 1, Yb - 2 - k * 2, 3, 2); }
  for (const hh of [.3, .62, .94]) { const yy = Yb - Math.round(top * hh * ISO_KZ); ctx.fillStyle = '#12131a'; ctx.fillRect(X - 2, yy - 1, 5, 3); ctx.fillStyle = '#ffb0bc'; ctx.fillRect(X, yy, 1, 1); }
  const on = Math.sin(t * 4 + y * .05) > -.3; ctx.fillStyle = on ? '#ff3355' : '#5a1220'; ctx.fillRect(X - 1, Yt - 4, 3, 2);
  if (on) iglow(X + .5, Yt - 3, 9, '#ff3355', .6);
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

/* ---------- seeing the hero behind buildings ----------
   SETTINGS.see picks how (Settings > Display): 0 = he is simply hidden, 1 = his silhouette shows on the wall in the karma colour,
   2 = a round window with a dithered rim opens in the wall around him, 3 = the whole wall turns see-through (every
   other pixel). 2 and 3 work by keeping a copy of the picture from just before the building is drawn and putting part of
   it back on top, so the building itself is drawn exactly as usual. */
const seeCv = document.createElement('canvas'); seeCv.width = ART_W; seeCv.height = ART_H; const seeCtx = seeCv.getContext('2d');
const SEE_R = 24, _holes = {};
const ghostCv = document.createElement('canvas'), ghostCtx = ghostCv.getContext('2d');
let _checker = null;
function boxHex(b) { return [isoXY(b.x0, b.y1, 0), isoXY(b.x1, b.y1, 0), isoXY(b.x1, b.y0, 0), isoXY(b.x1, b.y0, b.ht), isoXY(b.x0, b.y0, b.ht), isoXY(b.x0, b.y1, b.ht)]; }
function inPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > y) !== (b[1] > y) && x < a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0])) inside = !inside; }
  return inside;
}
function holeMask(r) {   // a disc: solid inside, then three rings that thin out (75%, 50%, 25% of the pixels)
  let c = _holes[r]; if (c) return c;
  c = _holes[r] = document.createElement('canvas'); c.width = c.height = r * 2 + 1; const g = c.getContext('2d'); g.fillStyle = '#fff';
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const d = Math.hypot(x, y * 1.25), k = d < r - 6 ? 4 : d < r - 4 ? 3 : d < r - 2 ? 2 : d < r ? 1 : 0, e = (x & 1) + (y & 1) * 2;   // squashed a little, like a circle lying on the ground
    if (k === 4 || (k === 3 && e !== 0) || (k === 2 && (e === 0 || e === 3)) || (k === 1 && e === 0)) g.fillRect(x + r, y + r, 1, 1);
  }
  return c;
}
function checker() {
  if (_checker) return _checker;
  _checker = document.createElement('canvas'); _checker.width = ART_W; _checker.height = ART_H; const g = _checker.getContext('2d'); g.fillStyle = '#fff';
  for (let y = 0; y < ART_H; y++) for (let x = y & 1; x < ART_W; x += 2) g.fillRect(x, y, 1, 1);
  return _checker;
}
// is the hero behind this box? (feet, chest or head covered by its outline; fences and gate posts are too low to matter)
function heroBehind(b, hp) { if (b.ht < 40 || b.draw === drawIsoGateSeg || b.draw === drawIsoFence) return false; const hx = boxHex(b); return inPoly(hp[0], hp[1] - 2, hx) || inPoly(hp[0], hp[1] - 10, hx) || inPoly(hp[0], hp[1] - 18, hx) ? hx : false; }
function drawBoxSeeThrough(b, hp, dt) {   // returns true if it drew the box
  const o = b.o, hx = heroBehind(b, hp), k = o._see = clamp((o._see || 0) + (hx ? dt : -dt) * 7, 0, 1);
  if (k <= 0) return false;
  const poly = hx || boxHex(b);
  seeCtx.setTransform(1, 0, 0, 1, 0, 0); seeCtx.globalCompositeOperation = 'copy'; seeCtx.drawImage(artCv, 0, 0);   // what is behind the building
  seeCtx.globalCompositeOperation = 'destination-in';
  if (SETTINGS.see === 2) { const r = Math.max(4, Math.round(SEE_R * (1 - (1 - k) * (1 - k)))); seeCtx.drawImage(holeMask(r), Math.round(hp[0]) - r, Math.round(hp[1]) - 10 - r); }
  else { seeCtx.globalAlpha = k; seeCtx.drawImage(checker(), 0, 0); seeCtx.globalAlpha = 1; }
  seeCtx.fillStyle = '#fff'; seeCtx.beginPath(); for (const p of poly) seeCtx.lineTo(Math.round(p[0]), Math.round(p[1])); seeCtx.closePath(); seeCtx.fill();   // only inside this building's outline
  seeCtx.globalCompositeOperation = 'source-over';
  b.draw(o); artT(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(seeCv, 0, 0);
  return true;
}
function drawHeroSilhouette(from, hp) {   // mode 1: the hero's shape in the karma colour wherever a building covers him
  const lift = Math.round((P.z || 0) * .5), x0 = hp[0] - 14, y0 = hp[1] - 30 - lift, x1 = hp[0] + 14, y1 = hp[1] + 3;
  let any = false; seeCtx.setTransform(1, 0, 0, 1, 0, 0); seeCtx.globalCompositeOperation = 'source-over'; seeCtx.clearRect(0, 0, ART_W, ART_H); seeCtx.fillStyle = '#fff';
  for (let i = Math.max(0, from); i < _boxes.length; i++) {
    const b = _boxes[i]; if (b.rt < x0 || b.l > x1 || b.bot < y0 || b.top > y1) continue;
    seeCtx.beginPath(); for (const p of boxHex(b)) seeCtx.lineTo(Math.round(p[0]), Math.round(p[1])); seeCtx.closePath(); seeCtx.fill(); any = true;
  }
  if (!any) return;
  const look = charLook(P), moving = Math.hypot(P.vx || 0, P.vy || 0) > 14, frame = moving ? Math.floor(((P.walk || 0) % TAU + TAU) % TAU / (Math.PI / 2)) % 4 : 0;
  const [dir, flip] = OCT[screenOctant(P.ang || 0)], spr = charSprite(dir, frame, look.o, look.pal), w = spr.width, h = spr.height, X = Math.round(hp[0] - w / 2), Y = Math.round(hp[1]) - h + 1 - lift;
  // the ghost: a one-pixel rim in the karma colour with the hero himself faint inside it
  const g = ghostCtx; ghostCv.width = w + 2; ghostCv.height = h + 2;
  for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) g.drawImage(spr, dx, dy);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = mix(kcol(), '#ffffff', .2); g.fillRect(0, 0, w + 2, h + 2);
  g.globalCompositeOperation = 'destination-out'; g.drawImage(spr, 1, 1);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = .5; g.drawImage(spr, 1, 1); g.globalAlpha = 1;
  seeCtx.globalCompositeOperation = 'source-in';
  if (flip) { seeCtx.save(); seeCtx.translate(X + w + 1, Y - 1); seeCtx.scale(-1, 1); seeCtx.drawImage(ghostCv, 0, 0); seeCtx.restore(); } else seeCtx.drawImage(ghostCv, X - 1, Y - 1);
  seeCtx.globalCompositeOperation = 'source-over';
  artT(); ctx.globalAlpha = .85 + .15 * Math.sin(G.time * 5); ctx.drawImage(seeCv, 0, 0); ctx.globalAlpha = 1;
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
  artT(); drawSeaArt(); groundT();
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
    if (inArt(l, top, rt, bot)) _boxes.push({ x0, y0, x1, y1, ht, key: x0 + y0 + x1 + y1, l, rt, top, bot, draw, o, pts: null });
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
    _pts.push({ key, slot, draw, o }); return slot;
  };
  for (const e of _vis) {
    if (e.kind === 'hideout') continue;
    const r = e.r || 10, z = e.z || 0;
    if (e.kind === 'tower') { addPt(e.x, e.y, e.x + e.y, 18, 66, drawUpright, e); continue; }
    addPt(e.x, e.y, e.state === 'wounded' ? -1e6 : e.x + e.y + z * 4, r * SPR_K * 1.8 + 6, r * SPR_K * 3.2 + z * SPR_K + 10, drawUpright, e);
  }
  let heroSlot = -1; if (G.mode !== 'dead' && G.mode !== 'title') { const sl = addPt(P.x, P.y, P.x + P.y + (P.z || 0) * 4, 20, 34, drawUpright, P); if (sl !== undefined) heroSlot = sl; }
  for (const t of trees) if (inView(t.x, t.y, 60)) addPt(t.x, t.y, t.x + t.y, t.r + 4, t.h * ISO_KZ + t.r * 2 + 6, drawIsoTree, t);
  for (const d of decos) if (inView(d.x, d.y, 60)) addPt(d.x, d.y, d.x + d.y, 14, 40, drawIsoHoop, d);
  for (const sg of streetSignals()) if (inView(sg.x, sg.y, 30)) addPt(sg.x, sg.y, sg.x + sg.y, 4, 24, drawIsoSignal, sg);
  for (const l of lamps) if (inView(l.x, l.y, 40)) addPt(l.x, l.y, l.x + l.y, 3, 20, drawIsoLamp, l);
  for (const p of pickups) if (inView(p.x, p.y, 30)) addPt(p.x, p.y, p.x + p.y, 8, 12, pp => { uprightT(pp.x, pp.y); drawPickup(pp); }, p);
  _pts.sort((a, b) => a.slot - b.slot || a.key - b.key);
  ISO.upright = true; ISO.lasers.length = 0;
  let pi = 0; const heroPt = isoXY(P.x, P.y, 0);
  for (let i = 0; i <= _boxes.length; i++) {
    while (pi < _pts.length && _pts[pi].slot === i) { const p = _pts[pi++]; p.draw(p.o); artT(); ctx.globalAlpha = 1; }
    if (i < _boxes.length) { const b = _boxes[i]; if (!(SETTINGS.see >= 2 && heroSlot >= 0 && i >= heroSlot && drawBoxSeeThrough(b, heroPt, dt))) b.draw(b.o); }
  }
  if (SETTINGS.see === 1 && heroSlot >= 0) drawHeroSilhouette(heroSlot, heroPt);
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
