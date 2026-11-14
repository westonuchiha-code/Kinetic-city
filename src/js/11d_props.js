/* ============================== 11d PIXEL PROPS ============================== */
/* Cars, crates, dumpsters and barrels as crisp isometric pixel objects.
   Each is a real 3D box (or cylinder) turned to the object's angle and projected through the iso view,
   so a car driving along a road lines up with it. Faces are filled pixel by pixel; only the faces
   that turn toward the camera are drawn, each lit by which way it points.
   Footprints keep their world size (they are the physics shapes); heights use PROP_KZ, which is taller
   than the buildings' scale so these throwable things read big next to the characters. */
const PROP_KZ = .75;   // art px per unit of prop height
const OUT = '#07070c';
function propFrame(e) {
  const ca = Math.cos(e.ang || 0), sa = Math.sin(e.ang || 0), lift = (e.z || 0) * .5;
  // local (along, across, height) -> art pixels
  return (lx, ly, h) => { const p = isoXY(e.x + lx * ca - ly * sa, e.y + lx * sa + ly * ca, 0); return [p[0], p[1] - h * PROP_KZ - lift]; };
}
/* Oriented box. deco(i, quad, line, k) decorates visible side i (0 front, 1 right, 2 back, 3 left);
   topDeco(tp) decorates the top (tp(u, v): u 0..1 front->back, v 0..1 left->right). */
function pixBox(e, P3, cx, L, Wd, z0, z1, faceCol, topCol, deco, topDeco) {
  const ca = Math.cos(e.ang || 0), sa = Math.sin(e.ang || 0);
  const c = [[cx + L / 2, -Wd / 2], [cx + L / 2, Wd / 2], [cx - L / 2, Wd / 2], [cx - L / 2, -Wd / 2]];
  const N = [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([nx, ny]) => [nx * ca - ny * sa, nx * sa + ny * ca]);
  const vis = N.map(n => n[0] + n[1] > .02);
  const pt = (i, u, z) => { const a = c[i], b = c[(i + 1) % 4]; return P3(lerp(a[0], b[0], u), lerp(a[1], b[1], u), z); };
  const quad = (i, u0, u1, za, zb, col) => ipoly([pt(i, u0, za), pt(i, u1, za), pt(i, u1, zb), pt(i, u0, zb)], col);
  const line = (i, u0, za, u1, zb, col) => iline(pt(i, u0, za), pt(i, u1, zb), col);
  for (let i = 0; i < 4; i++) {
    if (!vis[i]) continue;
    const n = N[i], k = .62 + .22 * n[1] - .12 * n[0];   // south-facing sides brightest, east-facing darker
    quad(i, 0, 1, z0 - 1.4, z1, shade(faceCol, k));   // runs a pixel under the bottom outline so no gaps show
    if (deco) deco(i, quad, line, k);
  }
  const top = c.map(p => P3(p[0], p[1], z1));
  ipoly(top, topCol);
  const tp = (u, v) => P3(cx + L / 2 - u * L, -Wd / 2 + v * Wd, z1);
  if (topDeco) topDeco(tp);
  // outlines: silhouette dark, edges between two lit faces as highlights
  for (let i = 0; i < 4; i++) {
    const j = (i + 3) % 4;   // the side sharing corner i
    iline(top[i], top[(i + 1) % 4], vis[i] ? shade(topCol, 1.35) : OUT);
    if (vis[i] !== vis[j]) iline(P3(c[i][0], c[i][1], z0), P3(c[i][0], c[i][1], z1), OUT);
    else if (vis[i]) iline(P3(c[i][0], c[i][1], z0), P3(c[i][0], c[i][1], z1), shade(faceCol, .4));
  }
  for (let i = 0; i < 4; i++) if (vis[i]) iline(pt(i, 0, z0), pt(i, 1, z0), OUT);   // bottom outline last, so it caps the corner edges
  return { top, tp };
}
function iellipse(cx, cy, rx, ry, col) {
  ctx.fillStyle = col;
  for (let dy = -Math.ceil(ry); dy <= ry; dy++) { const h = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry)))); if (h > 0) ctx.fillRect(Math.round(cx) - h, Math.round(cy) + dy, h * 2, 1); }
}

function drawIsoCar(e) {
  const fl = e.flash > 0, P3 = propFrame(e), v = e.vs || VEHICLES.sedan, L = v.L, Wd = v.Wd, bh = v.bh;
  const base = fl ? '#ffffff' : (e.hp < e.maxhp * .35 ? shade(e.col, .55) : e.col), glass = fl ? '#ffffff' : '#1b2a40', shine = fl ? '#fff' : '#3a5a80';
  const headOn = e.driving ? '#fff6d0' : '#8a8670', tailOn = e.driving ? '#ff3030' : '#6a1818';
  const wheels = (i, quad, us) => { for (const u of us) { quad(i, u - .09, u + .09, 0, 7, OUT); quad(i, u - .05, u + .05, 2, 5, '#4a4d58'); } };
  let roofZ;
  if (!v.ch) { // one tall box: van or bus
    const bus = e.vt === 'bus', wu = bus ? [.16, .8] : [.2, .78];
    const top = pixBox(e, P3, 0, L, Wd, 3, bh, base, shade(base, 1.08), (i, quad, line) => {
      if (i === 1 || i === 3) {
        wheels(i, quad, wu);
        if (bus) { for (let k = 0; k < 6; k++) { const u0 = .1 + k * .14; quad(i, u0, u0 + .11, bh * .55, bh * .88, glass); } line(i, .04, bh * .45, .96, bh * .45, shade(base, 1.4)); quad(i, i === 1 ? .9 : .02, i === 1 ? .98 : .1, 3, bh * .8, shade(base, .5)); }
        else { quad(i, i === 1 ? .78 : .02, i === 1 ? .98 : .22, bh * .55, bh * .85, glass); line(i, .05, bh * .4, .95, bh * .4, shade(base, 1.35)); line(i, .5, 4, .5, bh * .85, shade(base, .5)); }
      } else if (i === 0) { quad(i, .08, .92, bh * .5, bh * .9, glass); quad(i, .2, .4, bh * .6, bh * .8, shine); quad(i, .06, .2, 5, 9, headOn); quad(i, .8, .94, 5, 9, headOn); quad(i, .3, .7, 4, 8, '#15161b'); if (bus) quad(i, .15, .85, bh * .9, bh * .98, '#ffb040'); }
      else { quad(i, .06, .2, 6, 10, tailOn); quad(i, .8, .94, 6, 10, tailOn); if (!bus) line(i, .5, 4, .5, bh * .9, shade(base, .5)); }
    });
    if (bus && !fl) { const a = top.tp(.35, .3), c = top.tp(.6, .7); ctx.fillStyle = shade(base, 1.3); ctx.fillRect(Math.round(Math.min(a[0], c[0])), Math.round(Math.min(a[1], c[1])), Math.max(3, Math.round(Math.abs(c[0] - a[0]))), 3); }
    roofZ = bh;
  } else { // two boxes: body + glass cabin
    const cruiser = e.vt === 'cruiser';
    pixBox(e, P3, 0, L, Wd, 3, bh, base, shade(base, 1.08), (i, quad, line) => {
      if (i === 1 || i === 3) {
        wheels(i, quad, [.22, .78]);
        if (cruiser && !fl) quad(i, .3, .7, 4, bh - .6, '#e8eaf0');   // white doors
        line(i, .5, 4, .5, bh - 1, shade(base, .45)); line(i, .05, bh - .6, .95, bh - .6, shade(base, 1.35));
      } else if (i === 0) { quad(i, .08, .3, 6, 9, headOn); quad(i, .7, .92, 6, 9, headOn); quad(i, .36, .64, 5, 8, '#15161b'); }
      else { quad(i, .06, .28, 6, 9, tailOn); quad(i, .72, .94, 6, 9, tailOn); }
    });
    const cab = pixBox(e, P3, v.cx, v.cL, Wd - 4, bh, v.ch, base, shade(base, .92), (i, quad) => {
      if (i === 1 || i === 3) { quad(i, .08, .46, bh + 1, v.ch - 1, glass); quad(i, .54, .92, bh + 1, v.ch - 1, glass); quad(i, .12, .3, v.ch - 3, v.ch - 1.5, shine); }
      else quad(i, .1, .9, bh + 1, v.ch - 1, glass);
    });
    const m = (() => { const a = cab.tp(.35, .25), b2 = cab.tp(.65, .75); return [Math.round((a[0] + b2[0]) / 2), Math.round((a[1] + b2[1]) / 2)]; })();
    if (e.vt === 'taxi') { ctx.fillStyle = OUT; ctx.fillRect(m[0] - 3, m[1] - 3, 7, 4); ctx.fillStyle = '#ffe680'; ctx.fillRect(m[0] - 2, m[1] - 3, 5, 2); }
    if (cruiser) { // light bar: flashes red/blue while the police are after you
      const on = G.heat >= 1 ? Math.sin(G.time * 14 + e.id) > 0 : null;
      ctx.fillStyle = OUT; ctx.fillRect(m[0] - 4, m[1] - 3, 9, 3);
      ctx.fillStyle = on === null ? '#5a2030' : on ? '#ff2040' : '#401018'; ctx.fillRect(m[0] - 3, m[1] - 3, 3, 2);
      ctx.fillStyle = on === null ? '#20305a' : !on ? '#2060ff' : '#101840'; ctx.fillRect(m[0] + 1, m[1] - 3, 3, 2);
      if (on !== null) iglow(m[0], m[1] - 2, 10, on ? '#ff2040' : '#2060ff', .7);
    }
    roofZ = v.ch;
  }
  if (e.hp < e.maxhp * .45 && Math.random() < .25) FX.smoke(e.x, e.y - 18, 1, '#2a2c34', .7);
  if (e.hp < e.maxhp * .25 && Math.random() < .3) FX.embers(e.x, e.y - 12, 1);
  return P3(0, 0, roofZ)[1];
}
// ground shadow sized to the vehicle (cars) or prop
function shadowOf(e) {
  const z = e.z || 0; ctx.fillStyle = `rgba(0,0,0,${.38 - Math.min(.2, z * .006)})`;
  if (e.kind === 'car' || e.kind === 'dumpster') {
    const v = e.kind === 'car' ? (e.vs || VEHICLES.sedan) : { L: 36, Wd: 24 };
    ctx.save(); ctx.translate(e.x + 3 + z * .3, e.y + 5 + z * .5); ctx.rotate(e.ang); ctx.fillRect(-v.L / 2, -v.Wd / 2, v.L, v.Wd); ctx.restore(); return;
  }
  ellipse(e.x + 1 + z * .3, e.y + 1 + z * .5, e.r * .8, e.r * .35);
}
function drawIsoCrate(e) {
  const fl = e.flash > 0, P3 = propFrame(e), wood = fl ? '#ffffff' : '#8a6238', dark = fl ? '#dddddd' : '#4a321a';
  pixBox(e, P3, 0, 22, 22, 0, 18, wood, fl ? '#fff' : '#9a7244', (i, quad, line, k) => {
    const fr = shade(dark, k * 1.2);
    quad(i, 0, .12, 0, 18, fr); quad(i, .88, 1, 0, 18, fr); quad(i, 0, 1, 0, 2.5, fr); quad(i, 0, 1, 15.5, 18, fr);
    line(i, .38, 3, .38, 15, shade(wood, k * .7)); line(i, .62, 3, .62, 15, shade(wood, k * .7));
    line(i, .12, 3, .88, 15, fr);
  }, tp => {
    const fr = dark;
    ipoly([tp(0, 0), tp(1, 0), tp(1, .14), tp(0, .14)], fr); ipoly([tp(0, .86), tp(1, .86), tp(1, 1), tp(0, 1)], fr);
    ipoly([tp(0, 0), tp(.14, 0), tp(.14, 1), tp(0, 1)], fr); ipoly([tp(.86, 0), tp(1, 0), tp(1, 1), tp(.86, 1)], fr);
    iline(tp(.14, .38), tp(.86, .38), shade(wood, .75)); iline(tp(.14, .62), tp(.86, .62), shade(wood, .75));
  });
  return P3(0, 0, 18)[1];
}
function drawIsoDumpster(e) {
  const fl = e.flash > 0, P3 = propFrame(e), green = fl ? '#ffffff' : '#2f5f4a', lid = fl ? '#ffffff' : '#3a6e56';
  pixBox(e, P3, 0, 36, 24, 2, 20, green, lid, (i, quad, line, k) => {
    quad(i, 0, 1, 2, 4, shade(green, k * .55));
    const n = i % 2 === 0 ? 2 : 4; for (let r = 1; r <= n; r++) line(i, r / (n + 1), 4, r / (n + 1), 18, shade(green, k * .65));
    quad(i, 0, 1, 18, 20, shade(lid, k * 1.15));
    if (i % 2 === 1) { quad(i, .1, .22, 0, 3, OUT); quad(i, .78, .9, 0, 3, OUT); }
    if (i % 2 === 0 && !fl) quad(i, .3, .7, 9, 13, '#c8a838');
  }, tp => {
    iline(tp(.5, .03), tp(.5, .97), shade(lid, .55));
    iline(tp(.03, .5), tp(.47, .5), shade(lid, 1.2));
  });
  return P3(0, 0, 20)[1];
}
function drawIsoBarrel(e) {
  const fl = e.flash > 0, a = isoXY(e.x, e.y, 0), lift = (e.z || 0) * .5;
  const cx = Math.round(a[0]), by = Math.round(a[1] - 2 * PROP_KZ - lift), ht = Math.round(22 * PROP_KZ), rx = 7, ry = 3.5, ty = by - ht;
  // body: columns shaded so it reads as a cylinder
  const tones = fl ? ['#dddddd', '#ffffff', '#ffffff', '#cccccc'] : ['#4a100c', '#8e261c', '#c23a2a', '#a82e22', '#6a1a14'];
  for (let dx = -rx; dx < rx; dx++) {
    const u = (dx + rx) / (2 * rx), ti = Math.min(tones.length - 1, Math.floor(u * tones.length)), curve = Math.round(ry * Math.sqrt(Math.max(0, 1 - Math.pow((dx + .5) / rx, 2))));
    ctx.fillStyle = tones[ti]; ctx.fillRect(cx + dx, ty, 1, ht + curve);
    if (!fl) { // ribs and hazard band follow the curve
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(cx + dx, ty + Math.round(ht * .22) + curve, 1, 1); ctx.fillRect(cx + dx, ty + Math.round(ht * .78) + curve, 1, 1);
      ctx.fillStyle = (dx + 20) % 4 < 2 ? '#ffcf3a' : '#2a2a2a'; ctx.fillRect(cx + dx, ty + Math.round(ht * .48) + curve, 1, 2);
    }
    ctx.fillStyle = OUT; ctx.fillRect(cx + dx, ty + ht + curve, 1, 1);
  }
  ctx.fillStyle = OUT; ctx.fillRect(cx - rx - 1, ty, 1, ht); ctx.fillRect(cx + rx, ty, 1, ht);
  // lid
  iellipse(cx, ty, rx + 1, ry + 1, OUT); iellipse(cx, ty, rx, ry, fl ? '#fff' : '#9e2a22'); iellipse(cx, ty, rx - 2, ry - 1.2, fl ? '#fff' : '#7a1e16');
  if (!fl) { ctx.fillStyle = '#3a0c08'; ctx.fillRect(cx + 2, ty - 1, 2, 1); }
  return ty;
}
function drawIsoProp(e) {
  let top;
  if (e.kind === 'car') top = drawIsoCar(e);
  else if (e.kind === 'crate') top = drawIsoCrate(e);
  else if (e.kind === 'dumpster') top = drawIsoDumpster(e);
  else top = drawIsoBarrel(e);
  // explosive barrels pulse; damaged props show a health bar
  if (e.kind === 'barrel' && e.def.explosive) { const a = isoXY(e.x, e.y, 0); iglow(a[0], a[1] - 8, 8, '#ff4020', .15 + .1 * Math.sin(G.time * 6 + e.id)); }
  if ((e.kind === 'car' || e.kind === 'dumpster') && !e.static && e.hp < e.maxhp && (e.sinceHit || 0) < 4) {
    const a = isoXY(e.x, e.y, 0), bw = 14, bx = Math.round(a[0] - bw / 2), by = Math.round(top) - 4;
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(bx - 1, by - 1, bw + 2, 3); ctx.fillStyle = '#ffb040'; ctx.fillRect(bx, by, Math.max(0, Math.round(bw * e.hp / e.maxhp)), 1);
  }
  e.sinceHit = (e.sinceHit || 0) + 1 / 60;
}
const PROPS_ISO = { car: 1, crate: 1, dumpster: 1, barrel: 1 };
// every person and prop is now pixel art; anything else (none at the moment) falls back to the old drawing
function drawUpright(e) {
  if (PEOPLE[e.kind] || e === P) { artT(); drawChar(e); if (e.aimT > 0 && (e.kind === 'grunt' || e.kind === 'cop')) drawAimLaser(e); return; }
  if (PROPS_ISO[e.kind]) { artT(); drawIsoProp(e); return; }
  uprightT(e.x, e.y);
  const ang = e.ang; if (ang !== undefined) e.ang = ang + Math.PI / 4;
  drawEntity(e);
  e.ang = ang;
}
