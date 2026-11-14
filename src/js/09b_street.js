/* ============================== 09b STREET LIFE ============================== */
/* GTA-style ambient life. None of it is clever; it just fills the world:
   - Pedestrians walk loops around the sidewalk of a block, sometimes crossing the road at a corner to
     the next block, sometimes walking into a building door (and vanishing), and new ones walk out of doors.
   - Drivers occasionally pull over and park on the curb, get out, and walk off. Pedestrians sometimes walk
     up to a curb-parked car, get in, and drive away.
   - Population streams around the player: people and traffic are topped up just off-screen and removed
     when far away, so the streets near you stay busy without simulating the whole city. */
const RING = 1024;                       // sidewalk loop length around a block (4 sides x 256)
const blockAt = (x, y) => blocks[clamp(Math.round((y - 240) / BAND), 0, BROWS - 1) * BCOLS + clamp(Math.round((x - 240) / BAND), 0, BCOLS - 1)];
function ringPt(b, s) {
  s = ((s % RING) + RING) % RING; const side = (s / 256) | 0, t = s - side * 256;
  if (side === 0) return { x: b.x + 16 + t, y: b.y + 16 };
  if (side === 1) return { x: b.x + 272, y: b.y + 16 + t };
  if (side === 2) return { x: b.x + 272 - t, y: b.y + 272 };
  return { x: b.x + 16, y: b.y + 272 - t };
}
function ringProject(b, x, y) {
  const cx = clamp(x, b.x + 16, b.x + 272), cy = clamp(y, b.y + 16, b.y + 272);
  const c = [[Math.abs(y - (b.y + 16)), cx - b.x - 16], [Math.abs(x - (b.x + 272)), 256 + cy - b.y - 16], [Math.abs(y - (b.y + 272)), 512 + b.x + 272 - cx], [Math.abs(x - (b.x + 16)), 768 + b.y + 272 - cy]];
  c.sort((p, q) => p[0] - q[0]); return c[0][1];
}
/* doors: one per building wall that faces the sidewalk loop */
function computeDoors() {
  for (const blk of blocks) {
    blk.doors = [];
    for (const b of blk.bld) {
      const mx = b.x + b.w / 2, my = b.y + b.h / 2;
      if (b.y + b.h === blk.y + blk.h - TILE) { blk.doors.push({ x: mx, y: b.y + b.h + 2, s: 512 + (blk.x + 272 - mx), front: true }); b.door = { u: .5 }; }
      if (b.y === blk.y + TILE) blk.doors.push({ x: mx, y: b.y - 2, s: mx - blk.x - 16 });
      if (b.x === blk.x + TILE) blk.doors.push({ x: b.x - 2, y: my, s: 768 + blk.y + 272 - my });
      if (b.x + b.w === blk.x + blk.w - TILE) blk.doors.push({ x: b.x + b.w + 2, y: my, s: 256 + my - blk.y - 16 });
    }
  }
}

/* ---------- pedestrians ---------- */
function walkStreet(e, dt) {
  if (!e.blk) { e.blk = blockAt(e.x, e.y); e.s = ringProject(e.blk, e.x, e.y); e.dir = e.dir || (Math.random() < .5 ? 1 : -1); e.street = 'walk'; }
  const sp = e.speed;
  if (e.street === 'exit' || e.street === 'enter' || e.street === 'toCar' || e.street === 'cross') {
    const t = e.goal, dx = t.x - e.x, dy = t.y - e.y, d = Math.hypot(dx, dy);
    steer(e, dx, dy, e.street === 'cross' ? sp * 1.25 : sp, dt); face(e, Math.atan2(dy, dx), dt, 8);
    if (d < 6) {
      if (e.street === 'enter') { e.fadeOut = .35; e.street = 'gone'; }
      else if (e.street === 'toCar') { const c = e.car; if (c && !c.dead && !c.held && c.curb && !c.driving) startDriving(c); e.fadeOut = .15; e.street = 'gone'; }
      else { if (e.street === 'cross') { e.blk = e.nextBlk; } e.s = ringProject(e.blk, e.x, e.y); e.street = 'walk'; }
    }
    return;
  }
  if (e.street === 'gone') { steer(e, 0, 0, 0, dt); return; }
  // walking the loop: aim a little ahead of our spot on the ring
  const target = ringPt(e.blk, e.s + e.dir * 18);
  if (dist(e, target) > 60) e.s = ringProject(e.blk, e.x, e.y);   // knocked off the path: pick up from here
  let tx = target.x, ty = target.y;
  // step around parked cars and props on the sidewalk
  for (const o of act) {
    if (o === e || o.dead || !o.prop || o.held) continue;
    const ox = o.x - e.x, oy = o.y - e.y, fx = tx - e.x, fy = ty - e.y, fl = Math.hypot(fx, fy) || 1;
    const fwd = (ox * fx + oy * fy) / fl; if (fwd < 0 || fwd > o.r + 22) continue;
    const lat = (ox * fy - oy * fx) / fl; if (Math.abs(lat) < o.r + 10) { tx += -fy / fl * (o.r + 14) * (lat >= 0 ? 1 : -1); ty += fx / fl * (o.r + 14) * (lat >= 0 ? 1 : -1); }
  }
  steer(e, tx - e.x, ty - e.y, sp, dt); face(e, Math.atan2(ty - e.y, tx - e.x), dt, 6);
  if (dist(e, ringPt(e.blk, e.s)) < 26) e.s += e.dir * sp * dt;
  e.s = ((e.s % RING) + RING) % RING;
  e.decT = (e.decT || rnd(1, 3)) - dt;
  if (e.decT > 0) return;
  e.decT = rnd(1.2, 2.6);
  // walk into a building
  if (Math.random() < .07) for (const dr of e.blk.doors || []) {
    if (Math.abs(((dr.s - e.s + RING * 1.5) % RING) - RING / 2) < 30) { e.street = 'enter'; e.goal = { x: dr.x, y: dr.y }; return; }
  }
  // get into a curb-parked car
  if (Math.random() < .6) for (const c of act) {
    if (c.kind === 'car' && c.curb && !c.driving && !c.dead && !c.held && !c.claimed && dist(c, e) < 95) { c.claimed = true; e.car = c; e.street = 'toCar'; e.goal = { x: c.x - Math.sin(c.ang) * (c.r + 4) * Math.sign(c.curbSide || 1), y: c.y + Math.cos(c.ang) * (c.r + 4) * Math.sign(c.curbSide || 1) }; return; }
  }
  // cross the road at a corner
  const corner = Math.round(e.s / 256) * 256;
  if (Math.abs(e.s - corner) < 20 && Math.random() < .35) {
    const p = ringPt(e.blk, corner), opts = [];
    for (const [ox, oy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nb = blocks[(e.blk.by + oy) * BCOLS + e.blk.bx + ox];
      if (!nb || e.blk.by + oy < 0 || e.blk.by + oy >= BROWS || e.blk.bx + ox < 0 || e.blk.bx + ox >= BCOLS) continue;
      const g = { x: p.x + ox * 128, y: p.y + oy * 128 };
      if (Math.abs(g.x - p.x) + Math.abs(g.y - p.y) > 0 && walkable(g.x, g.y, 8) && blockAt(g.x, g.y) === nb && los(p, g)) opts.push({ g, nb });
    }
    if (opts.length) { const o = pick(opts); e.street = 'cross'; e.goal = o.g; e.nextBlk = o.nb; }
  }
}

/* ---------- parking ---------- */
function curbSpot(e) {   // where this car would park on its right-hand curb, or null
  if (e.dx !== 0) { const base = Math.floor(e.y / BAND) * BAND, y = e.dx > 0 ? base + 104 : base - 8, sy = e.dx > 0 ? base + 112 : base - 16; return tileOf(e.x, sy) === T.WALK && tileOf(e.x + e.dx * 60, sy) === T.WALK ? { y, side: e.dx > 0 ? 1 : -1 } : null; }
  const base = Math.floor(e.x / BAND) * BAND, x = e.dy > 0 ? base - 8 : base + 104, sx = e.dy > 0 ? base - 16 : base + 112; return tileOf(sx, e.y) === T.WALK && tileOf(sx, e.y + e.dy * 60) === T.WALK ? { x, side: e.dy > 0 ? -1 : 1 } : null;
}
function startDriving(c) {
  c.driving = true; c.hasDriver = true; c.curb = false; c.reDrive = (c.reDrive || 0) + 1; c.claimed = false; c.parkCd = rnd(25, 50);
  const a = c.ang; if (Math.abs(Math.cos(a)) > Math.abs(Math.sin(a))) { c.dx = Math.sign(Math.cos(a)); c.dy = 0; } else { c.dx = 0; c.dy = Math.sign(Math.sin(a)); }
}
function parkingTick(e, dt) {   // called by aiCar; returns true while it is handling the car
  e.parkCd = (e.parkCd === undefined ? rnd(4, 18) : e.parkCd) - dt;
  if (!e.parkTo && e.parkCd <= 0 && e.hasDriver && !e.plan) {
    e.parkCd = rnd(8, 20);
    const inter = (e.y % BAND) < 96 && (e.x % BAND) < 96;
    let parked = 0; for (const o of act) if (o.curb) parked++;
    const s = !inter && parked < 6 && Math.random() < .8 ? curbSpot(e) : null;
    if (s) e.parkTo = s;
  }
  if (!e.parkTo) return false;
  const s = e.parkTo, k = Math.min(1, dt * 3);
  const tvx = e.dx * 50 + (s.x !== undefined ? (s.x - e.x) * 3 : 0), tvy = e.dy * 50 + (s.y !== undefined ? (s.y - e.y) * 3 : 0);
  e.vx += (tvx - e.vx) * k; e.vy += (tvy - e.vy) * k;
  if (Math.hypot(e.vx, e.vy) > 8) e.ang += angDiff(Math.atan2(e.dy, e.dx), e.ang) * Math.min(1, dt * 6);
  const off = s.x !== undefined ? Math.abs(s.x - e.x) : Math.abs(s.y - e.y);
  if (off < 3) {
    e.parkTo = null; e.driving = false; e.curb = true; e.curbSide = s.side; e.vx = e.vy = 0; e.ang = Math.atan2(e.dy, e.dx);
    if (e.hasDriver) {
      e.hasDriver = false;
      const px = e.x - Math.sin(e.ang) * (e.r + 10) * s.side * -1, py = e.y + Math.cos(e.ang) * (e.r + 10) * s.side * -1;
      const c = spawnCiv(e.x + (s.x !== undefined ? (s.side > 0 ? 22 : -22) : 0), e.y + (s.y !== undefined ? (s.side > 0 ? 22 : -22) : 0));
      c.street = undefined; c.blk = null;
    }
  }
  return true;
}

/* ---------- streaming population around the player ---------- */
const PED_TARGET = 42, CAR_TARGET = 10;
let streamT = 0;
function streamPopulation(dt) {
  streamT -= dt; if (streamT > 0) return; streamT = .35;
  let peds = 0, cars = 0;
  for (const e of ents) {
    if (e.dead) continue;
    const d = Math.hypot(e.x - P.x, e.y - P.y);
    if (e.kind === 'civ') { if (d > 1000 && e.state !== 'wounded') e.dead = true; else if (d < 650) peds++; }
    else if (e.kind === 'car' && (e.driving || e.curb)) { if (d > 1200 && !e.held) e.dead = true; else if (d < 900 && e.driving) cars++; }
  }
  for (let i = 0; i < 2 && peds + i < PED_TARGET; i++) spawnPedNear();
  if (cars < CAR_TARGET) { const c = spawnTraffic(districtAt(P.x)); if (c && (dist(c, P) < 420 || dist(c, P) > 1000)) c.dead = true; }
}
function spawnPedNear() {
  // half the time walk out of a nearby door, otherwise appear on a sidewalk just out of view
  for (let tries = 0; tries < 8; tries++) {
    const viaDoor = Math.random() < .6, a = rnd(TAU), d = viaDoor ? rnd(120, 620) : rnd(360, 620), b = blockAt(P.x + Math.cos(a) * d, P.y + Math.sin(a) * d);
    if (!b || districtAt(b.x + 144) !== districtAt(P.x) && !gatesOpen[Math.min(districtAt(b.x + 144), districtAt(P.x))]) continue;
    if (viaDoor && b.doors && b.doors.length) {
      const dr = pick(b.doors); if (dist(dr, P) < 90) continue;
      const c = spawnCiv(dr.x, dr.y); c.blk = b; c.s = dr.s; c.dir = Math.random() < .5 ? 1 : -1; c.street = 'exit'; c.goal = ringPt(b, dr.s); c.fadeIn = .35; return;
    }
    const s = rnd(RING), p = ringPt(b, s);
    if (dist(p, P) < 330 || !walkable(p.x, p.y, 8)) continue;
    const c = spawnCiv(p.x, p.y); c.blk = b; c.s = s; c.dir = Math.random() < .5 ? 1 : -1; c.street = 'walk'; return;
  }
}
