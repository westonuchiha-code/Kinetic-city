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

/* ---------- swept solids: vehicles ---------- */
/* A vehicle is built from solids made by sweeping a side profile across its width, so bonnets, windscreens
   and boots can slope instead of everything being a box. prof is the side outline as [along, height] points
   going round counter-clockwise (rear-bottom, front-bottom, up the nose, back over the top). w is the half
   width. Like pixBox, only faces turned toward the camera are drawn, each lit by the way it points.
   o.side / o.top are the colours; o.strip(j) can recolour strip j (the surface between profile points j and
   j+1); o.sideDeco(api, after) and o.stripDeco(j, api) add detail. Coordinates in decos are the car's own:
   side api works in [along, height]; strip api in (v across the width 0..1, t along the strip 0..1).
   Detail is skipped on faces seen nearly edge-on, where it would only be noise. */
function pixSweep(e, P3, prof, w, o) {
  const ca = Math.cos(e.ang || 0), sa = Math.sin(e.ang || 0), n = prof.length, yc = o.yc || 0;
  const face = (nx, ny, nz) => { const wx = nx * ca - ny * sa, wy = nx * sa + ny * ca, dot = wx + wy + nz * .667; return { vis: dot > .02, flat: dot > .34, k: clamp(.62 + .22 * wy - .12 * wx + .46 * Math.max(0, nz), .32, 1.12), nz }; };
  const pt = (j, sg) => P3(prof[j % n][0], yc + sg * w, prof[j % n][1]);
  const strips = [];
  for (let j = 0; j < n; j++) {
    const a = prof[j], b = prof[(j + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, f = face(dz / l, 0, -dx / l);
    const mx = (a[0] + b[0]) / 2; f.j = j; f.a = a; f.b = b; f.key = (mx * ca - yc * sa) + (mx * sa + yc * ca) + (a[1] + b[1]) / 2 * .667;
    f.col = (o.strip && o.strip(j, f)) || (f.nz > .3 ? o.top : o.side);
    strips.push(f);
  }
  const sides = [1, -1].map(sg => Object.assign(face(0, sg, 0), { sg }));
  const sideApi = sg => {
    const q = p => P3(p[0], yc + sg * w, p[1]);
    return { sg, poly: (pts, c) => ipoly(pts.map(q), c), line: (a, b, c) => iline(q(a), q(b), c),
      disc: (x, z, r, c) => { const pts = []; for (let i = 0; i < 8; i++) { const t = i * TAU / 8 + TAU / 16; pts.push(q([x + Math.cos(t) * r, z + Math.sin(t) * r])); } ipoly(pts, c); } };
  };
  // far faces first: visible strips back to front, then the visible side
  for (const f of strips.filter(f => f.vis).sort((p, q) => p.key - q.key)) {
    const S = (v, t) => P3(lerp(f.a[0], f.b[0], t), yc + (v * 2 - 1) * w, lerp(f.a[1], f.b[1], t));
    ipoly([S(0, 0), S(1, 0), S(1, 1), S(0, 1)], shade(f.col, f.nz > .3 ? 1 : f.k / .84));
    if (o.stripDeco && f.flat) o.stripDeco(f.j, { k: f.k, quad: (v0, v1, t0, t1, c) => ipoly([S(v0, t0), S(v1, t0), S(v1, t1), S(v0, t1)], c), line: (v0, t0, v1, t1, c) => iline(S(v0, t0), S(v1, t1), c), at: S });
  }
  for (const sd of sides) if (sd.vis) {
    ipoly(prof.map((p, j) => pt(j, sd.sg)), shade(o.side, sd.k / .84));
    if (o.sideDeco && sd.flat) o.sideDeco(Object.assign(sideApi(sd.sg), { k: sd.k }), false);
  }
  // outlines: dark where a drawn face meets a hidden one, a lighter or darker crease where two drawn faces meet
  const hi = shade(o.top, 1.18), lo = shade(o.side, .45);
  for (let pass = 0; pass < 2; pass++) for (let j = 0; j < n; j++) {
    const A = strips[(j + n - 1) % n], B = strips[j], topA = A.nz > .3, topB = B.nz > .3;
    const base = o.noBase && (j === 0 || j === 1);   // a solid standing on another one has no outline round its foot
    if (A.vis !== B.vis) { if (pass && !base) iline(pt(j, -1), pt(j, 1), OUT); }
    else if (A.vis && !pass && topA !== topB) iline(pt(j, -1), pt(j, 1), hi);   // where the top meets a wall
    for (const sd of sides) { if (sd.vis !== B.vis) { if (pass && !(o.noBase && j === 0)) iline(pt(j, sd.sg), pt(j + 1, sd.sg), OUT); } else if (sd.vis && sd.flat && !pass) iline(pt(j, sd.sg), pt(j + 1, sd.sg), topB ? hi : lo); }
  }
  for (const sd of sides) if (sd.vis && o.sideDeco) o.sideDeco(Object.assign(sideApi(sd.sg), { k: sd.k, thin: !sd.flat }), true);
  return { strips, sides };
}
/* Vehicles. Physics sizes come from VEHICLES (L, Wd, bh body height, ch cabin roof, cL/cx cabin length and offset). */
function drawIsoCar(e) {
  const fl = e.flash > 0, P3 = propFrame(e), v = e.vs || VEHICLES.sedan, L = v.L, Wd = v.Wd, bh = v.bh, h = L / 2, w = Wd / 2;
  const hurt = e.hp < e.maxhp * .35;
  const base = fl ? '#ffffff' : (hurt ? shade(e.col, .55) : e.col), top = fl ? '#ffffff' : shade(base, 1.12);
  const glass = fl ? '#ffffff' : '#172338', glassHi = fl ? '#ffffff' : '#4a6c96', trim = fl ? '#ffffff' : '#23252e', chrome = fl ? '#ffffff' : '#9aa1b0';
  const headOn = fl ? '#fff' : e.driving ? '#fff6d0' : '#a8a48c', tailOn = fl ? '#fff' : e.driving ? '#ff3838' : '#7a1c1c';
  const tyre = fl ? '#ffffff' : '#15161c', hub = fl ? '#ffffff' : '#8a8f9c', crack = '#a9bcd6', dent = shade(e.col, .3);
  const wheels = (api, xs, r) => { for (const x of xs) { api.disc(x, r + .4, r + 1.1, OUT); api.disc(x, r + .2, r, tyre); api.disc(x, r + .2, r * .45, hub); } };
  const lights = (api, col, z0, z1, T) => { const t0 = T(z0), t1 = T(z1); api.quad(.07, .3, t0, t1, col); api.quad(.7, .93, t0, t1, col); };
  let roofZ = bh;
  if (!v.ch) {
    /* ---- van and bus: one tall body with a raked windscreen ---- */
    const bus = e.vt === 'bus', nose = bus ? 2.5 : 8, wr = bus ? 4.3 : 3.7, wx = bus ? [h - 13, -h + 15] : [h - 10, -h + 10];
    const prof = bus ? [[-h, 3], [h, 3], [h, 13], [h - nose, bh - 4], [h - nose - 1.5, bh], [-h, bh]]
                     : [[-h, 3], [h, 3], [h, 11], [h - 3.5, 13.5], [h - nose, bh], [-h, bh]];
    const fz = z => (z - 3) / (prof[2][1] - 3), rz = z => (bh - z) / (bh - 3);
    pixSweep(e, P3, prof, w, {
      side: base, top,
      strip: j => (bus ? j === 2 : j === 3) ? glass : null,
      stripDeco: (j, a) => {
        if (j === 1) { a.quad(0, 1, 0, fz(5.5), shade(trim, a.k / .6)); lights(a, headOn, 6.5, 10, fz); a.quad(.36, .64, fz(6), fz(10), trim); if (bus) a.quad(.05, .95, fz(11), fz(12.5), shade(base, .6)); }
        else if (bus ? j === 2 : j === 3) { a.quad(.1, .28, .25, .6, glassHi); a.line(.5, .05, .5, .95, shade(base, .8)); if (hurt && !fl) { a.line(.15, .2, .4, .7, crack); a.line(.4, .7, .3, .95, crack); a.line(.4, .7, .46, .4, crack); } }
        else if (j === 5) { a.quad(0, 1, rz(5.5), 1, shade(trim, a.k / .6)); lights(a, tailOn, 7, 10.5, z => rz(z)); if (bus) a.quad(.2, .8, rz(bh - 4), rz(bh - 11), glass); else { a.quad(.12, .45, rz(bh - 4), rz(bh - 10), glass); a.quad(.55, .88, rz(bh - 4), rz(bh - 10), glass); a.line(.5, rz(bh - 2), .5, rz(5), shade(base, .5)); } }
        else if (j === 4 && bus && !fl) { a.quad(.3, .7, .12, .3, shade(base, .8)); a.quad(.3, .7, .55, .78, shade(base, .8)); a.quad(.34, .66, .14, .26, shade(base, 1.25)); a.quad(.34, .66, .57, .74, shade(base, 1.25)); }   // roof units
      },
      sideDeco: (a, after) => {
        if (after) { if (!a.thin) wheels(a, wx, wr); return; }
        const dk = shade(base, a.k * .62), lt = shade(base, 1.3);
        if (hurt && !fl) { a.poly([[-6, 7], [1, 7.6], [-1, 12], [-7, 11]], dent); a.poly([[h - 26, 6], [h - 22, 6.4], [h - 23, 9.5], [h - 26.5, 9]], dent); }
        a.poly([[-h, 3], [h, 3], [h, 5.2], [-h, 5.2]], shade(trim, a.k / .7));                        // sill
        if (bus) {
          for (let x = -h + 5; x < h - 16; x += 8.6) a.poly([[x, 15.5], [x + 6.8, 15.5], [x + 6.8, 24.5], [x, 24.5]], glass);
          a.poly([[h - 12.5, 6], [h - 6, 6], [h - 6, 25], [h - 12.5, 25]], shade(base, a.k * .5)); a.poly([[h - 11.6, 9], [h - 9.6, 9], [h - 9.6, 24], [h - 11.6, 24]], glass); a.poly([[h - 8.8, 9], [h - 6.8, 9], [h - 6.8, 24], [h - 8.8, 24]], glass);   // doors
          a.poly([[-h + 2, 11], [h - 14, 11], [h - 14, 13.2], [-h + 2, 13.2]], fl ? '#fff' : shade(base, 1.45));   // stripe
        } else {
          a.poly([[h - 17, 15], [h - 7.2, 15], [h - 10.4, bh - 2], [h - 17, bh - 2]], glass); a.line([h - 16.2, bh - 3], [h - 13, bh - 3], glassHi);   // cab window
          a.line([h - 18.5, 5.5], [h - 18.5, bh - 1.5], dk); a.line([-h + 14, 5.5], [-h + 14, bh - 1.5], dk);                                        // door seams
          a.poly([[-h + 3, 12.5], [h - 20, 12.5], [h - 20, 14.5], [-h + 3, 14.5]], fl ? '#fff' : shade(base, .74));                                   // side rub strip
          a.line([h - 21, 11], [h - 20, 11], chrome);
        }
      }
    });
  } else {
    /* ---- cars: a body with a sloped nose and tail, and a glasshouse on top ---- */
    const cruiser = e.vt === 'cruiser', taxi = e.vt === 'taxi', hatch = e.vt === 'compact';
    const body = [[-h, 3], [h, 3], [h, bh - 3], [h - 2.5, bh - .4], [-h + (hatch ? 1 : 2), bh], [-h, bh - 2.2]];
    const fz = z => (z - 3) / (bh - 6), rz = z => (bh - 2.2 - z) / (bh - 5.2);
    const x0 = v.cx - v.cL / 2 - (hatch ? 1 : .5), x1 = v.cx + v.cL / 2 + 1.5, r0 = x0 + (hatch ? 1.6 : 4.2), r1 = x1 - 5.2, ch = v.ch, cw = w - 1.6;
    pixSweep(e, P3, body, w, {
      side: base, top,
      stripDeco: (j, a) => {
        if (j === 1) { a.quad(0, 1, 0, fz(4.6), shade(chrome, a.k / .7)); lights(a, headOn, 5.2, 8, fz); a.quad(.38, .62, fz(5.2), fz(7.6), trim); }
        else if (j === 5) { a.quad(0, 1, rz(4.6), 1, shade(chrome, a.k / .7)); lights(a, tailOn, 5.6, 8.4, z => rz(z)); }
      },
      sideDeco: (a, after) => {
        if (after) { if (!a.thin) wheels(a, [h - 8.5, -h + 9], 3.4); return; }
        const dk = shade(base, a.k * .55), lt = shade(base, 1.32);
        a.poly([[-h + 1, 3], [h - 1, 3], [h - 1, 4.6], [-h + 1, 4.6]], shade(trim, a.k / .7));          // sill
        if (cruiser && !fl) a.poly([[-h + 12, 4.6], [h - 13, 4.6], [h - 13, bh - .8], [-h + 12, bh - .8]], shade('#e8eaf0', a.k / .84));   // white doors
        a.line([v.cx + 1.5, 4.8], [v.cx + 1.5, bh - 1.2], dk);                                          // door seam
        a.line([v.cx - 2.2, bh - 2.9], [v.cx - 1.2, bh - 2.9], chrome);                                 // handle
        if (hurt && !fl) { a.poly([[h - 15, 6], [h - 11, 6.5], [h - 12, 9], [h - 15.5, 8.4]], dent); a.poly([[-h + 13, 5.5], [-h + 17, 6], [-h + 16, 8], [-h + 13.5, 8.5]], dent); }   // dents
      }
    });
    const cab = pixSweep(e, P3, [[x0, bh], [x1, bh], [r1, ch], [r0, ch]], cw, {
      noBase: true, side: base, top: fl ? '#ffffff' : shade(base, .98), strip: j => j === 1 || j === 3 ? glass : null,
      stripDeco: (j, a) => { if (j === 1) { a.quad(.12, .3, .25, .6, glassHi); if (hurt && !fl) { a.line(.3, .15, .55, .6, crack); a.line(.55, .6, .8, .35, crack); a.line(.55, .6, .5, .95, crack); } } else if (j === 3) a.quad(.7, .86, .3, .6, shade(glassHi, .7)); },
      sideDeco: (a, after) => {
        if (after) return; const mid = (x0 + x1) / 2 + .6;
        a.poly([[mid + .8, bh + 1], [x1 - 1.9, bh + 1], [r1 - .5, ch - 1.1], [mid + .8, ch - 1.1]], glass);
        a.poly([[x0 + (hatch ? 1 : 1.9), bh + 1], [mid - .8, bh + 1], [mid - .8, ch - 1.1], [r0 + .5, ch - 1.1]], glass);
      }
    });
    const m = P3((r0 + r1) / 2, 0, ch).map(Math.round);
    if (taxi) { ctx.fillStyle = OUT; ctx.fillRect(m[0] - 3, m[1] - 3, 7, 4); ctx.fillStyle = fl ? '#fff' : '#ffe680'; ctx.fillRect(m[0] - 2, m[1] - 3, 5, 2); ctx.fillStyle = fl ? '#fff' : '#c89a20'; ctx.fillRect(m[0] - 2, m[1] - 1, 5, 1); }
    if (cruiser) { // light bar: flashes red/blue while the police are after you
      const on = G.heat >= 1 ? Math.sin(G.time * 14 + e.id) > 0 : null;
      ctx.fillStyle = OUT; ctx.fillRect(m[0] - 4, m[1] - 3, 9, 3);
      ctx.fillStyle = on === null ? '#5a2030' : on ? '#ff2040' : '#401018'; ctx.fillRect(m[0] - 3, m[1] - 3, 3, 2);
      ctx.fillStyle = on === null ? '#20305a' : !on ? '#2060ff' : '#101840'; ctx.fillRect(m[0] + 1, m[1] - 3, 3, 2);
      if (on !== null) iglow(m[0], m[1] - 2, 10, on ? '#ff2040' : '#2060ff', .7);
    }
    roofZ = ch;
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
  const fl = e.flash > 0, P3 = propFrame(e), wood = fl ? '#ffffff' : '#a07440', dark = fl ? '#dddddd' : '#5a3c1e', metal = fl ? '#ffffff' : '#8d93a0';
  pixBox(e, P3, 0, 22, 22, 0, 18, wood, fl ? '#fff' : '#b4864c', (i, quad, line, k) => {
    const fr = shade(dark, k * 1.2), gap = shade(wood, k * .66), m = shade(metal, k / .84);
    quad(i, 0, .13, 0, 18, fr); quad(i, .87, 1, 0, 18, fr); quad(i, 0, 1, 0, 2.6, fr); quad(i, 0, 1, 15.4, 18, fr);   // frame
    line(i, .38, 3, .38, 15, gap); line(i, .62, 3, .62, 15, gap);                                                     // plank gaps
    line(i, .14, 3.2, .86, 14.8, fr); line(i, .14, 4.2, .86, 15.4, shade(fr, 1.25));                                  // brace, with a lit edge
    quad(i, 0, .13, 15.4, 18, m); quad(i, .87, 1, 15.4, 18, m); quad(i, 0, .13, 0, 2.6, shade(m, .7)); quad(i, .87, 1, 0, 2.6, shade(m, .7));   // metal corners
  }, tp => {
    const fr = dark;
    ipoly([tp(0, 0), tp(1, 0), tp(1, .14), tp(0, .14)], fr); ipoly([tp(0, .86), tp(1, .86), tp(1, 1), tp(0, 1)], fr);
    ipoly([tp(0, 0), tp(.14, 0), tp(.14, 1), tp(0, 1)], fr); ipoly([tp(.86, 0), tp(1, 0), tp(1, 1), tp(.86, 1)], fr);
    iline(tp(.14, .38), tp(.86, .38), shade(wood, .78)); iline(tp(.14, .62), tp(.86, .62), shade(wood, .78));
    for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]]) ipoly([tp(u ? .86 : 0, v ? .86 : 0), tp(u ? 1 : .14, v ? .86 : 0), tp(u ? 1 : .14, v ? 1 : .14), tp(u ? .86 : 0, v ? 1 : .14)], metal);
  });
  return P3(0, 0, 18)[1];
}
function drawIsoDumpster(e) {
  const fl = e.flash > 0, P3 = propFrame(e), green = fl ? '#ffffff' : '#2f6a50', lid = fl ? '#ffffff' : '#2b3038', rim = fl ? '#ffffff' : '#3f8263';
  pixBox(e, P3, 0, 36, 24, 2, 20, green, lid, (i, quad, line, k) => {
    quad(i, 0, 1, 2, 4.2, shade(green, k * .5));                                                                        // skirt
    const n = i % 2 === 0 ? 2 : 4; for (let r = 1; r <= n; r++) line(i, r / (n + 1), 4.2, r / (n + 1), 17, shade(green, k * .62));   // pressed ribs
    quad(i, 0, 1, 17, 20, shade(rim, k / .84)); line(i, 0, 17, 1, 17, shade(green, k * .5));                            // rim band under the lids
    if (i % 2 === 1) { quad(i, .1, .22, 0, 3, OUT); quad(i, .78, .9, 0, 3, OUT); quad(i, .13, .19, .6, 2, '#6a6e7a'); quad(i, .81, .87, .6, 2, '#6a6e7a'); }   // castors
    if (i % 2 === 0) { quad(i, .08, .22, 9, 14, shade(green, k * .45)); quad(i, .78, .92, 9, 14, shade(green, k * .45)); }   // lifting pockets
    if (i % 2 === 1 && !fl) { quad(i, .4, .6, 8, 13, '#d8b23c'); line(i, .44, 10.5, .56, 10.5, '#5a4a14'); }            // label
  }, tp => {
    iline(tp(.5, .02), tp(.5, .98), shade(lid, .5));                                                                    // the two lids
    ipoly([tp(.06, .08), tp(.44, .08), tp(.44, .2), tp(.06, .2)], shade(lid, 1.45)); ipoly([tp(.56, .08), tp(.94, .08), tp(.94, .2), tp(.56, .2)], shade(lid, 1.45));   // lid highlights
    iline(tp(.2, .9), tp(.3, .9), shade(lid, 1.8)); iline(tp(.7, .9), tp(.8, .9), shade(lid, 1.8));                      // handles
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
  if (MACH[e.kind] || e.kind === 'cell') { artT(); drawMachine(e); return; }
  if (PROPS_ISO[e.kind]) { artT(); drawIsoProp(e); return; }
  if (e.kind === 'tower') { artT(); drawIsoTower(e); if (e.lk && e.lk.aimT > 0) drawAimLaser(e.lk); return; }
  uprightT(e.x, e.y);
  const ang = e.ang; if (ang !== undefined) e.ang = ang + Math.PI / 4;
  drawEntity(e);
  e.ang = ang;
}
