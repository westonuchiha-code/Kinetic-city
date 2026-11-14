/* ============================== 08 PLAYER & POWERS ============================== */
/* TELEKINESIS, rebuilt around a controller:
   - Target lock: the right stick sweeps an aim cone; the best grabbable object in the cone (angle first,
     distance second, line of sight required) is highlighted, with hysteresis so it doesn't flicker.
   - Hold RT: the object is yanked onto a damped spring in front of you. Heavier objects lag and swing,
     and anything swung fast enough bats enemies aside.
   - Release RT: thrown along your aim with light aim assist + target leading. A trajectory line shows
     exactly where it will land while you hold it. B drops it gently.
   Other powers: RB repulse (shove + reflect bullets), LB gravity well, A dash (i-frames, dash strike),
   LT absorb (hold to soak damage into charge, release = blast). X / Y: hold to heal / drain civilians. */
const aim = { x: 0, y: 0, dx: 1, dy: 0, ang: 0, dist: 170, idle: 0 };
let tkTarget = null, traj = null;

function screenToWorld(sx, sy) { return { x: cam.x + (sx - FRAME.x) / cam.scale, y: cam.y + (sy - FRAME.y) / cam.scale }; }

function updateAim(dt, mv) {
  const p = P;
  if (Input.device === 'kbm') {
    const w = screenToWorld(Input.mouse.sx, Input.mouse.sy), dx = w.x - p.x, dy = w.y - p.y;
    aim.ang = Math.atan2(dy, dx); aim.dist = Math.hypot(dx, dy);
  } else {
    const s = isoDir(Input.aimStick());   // stick up = up on the iso screen
    if (s && s.m > .22) { aim.ang = Math.atan2(s.y, s.x); aim.idle = .35; aim.dist = 150 + 110 * s.m; }
    else {
      aim.idle -= dt;
      if (aim.idle <= 0 && !p.holding && Math.hypot(mv.x, mv.y) > .3) aim.ang += angDiff(Math.atan2(mv.y, mv.x), aim.ang) * Math.min(1, dt * 9);
    }
  }
  aim.dx = Math.cos(aim.ang); aim.dy = Math.sin(aim.ang);
  aim.x = p.x + aim.dx * aim.dist; aim.y = p.y + aim.dy * aim.dist;
}

/* ---------- telekinesis ---------- */
function grabbable(e) {
  if (e.dead || e.held || e.static || !e.def.grab || e === P) return false;
  if (e.kind === 'grunt' || e.kind === 'cop') return e.hp < e.maxhp * .6 || e.stun > 0 || S.tkRange >= 1.4;   // people must be softened up first
  return true;
}
function tkScore(e) {
  const p = P, dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy), range = TK_RANGE * S.tkRange;
  if (d > range + e.r) return Infinity;
  const a = Math.abs(angDiff(Math.atan2(dy, dx), aim.ang));
  if (Input.device === 'kbm') {
    const dm = Math.hypot(e.x - aim.x, e.y - aim.y);
    if (dm > 70 + e.r && !(d < 46 && a < 1.2)) return Infinity;
    return dm / 70 + d / range * .3;
  }
  const cone = d < 52 ? 1.6 : .62;
  if (a > cone) return Infinity;
  return a * 1.5 + d / range * .8 - (e.kind === 'car' ? .04 : 0);
}
function updateTKTarget() {
  if (P.holding || G.mode !== 'play') { tkTarget = null; return; }
  let best = null, bs = Infinity;
  for (const e of act) {
    if (!grabbable(e)) continue;
    let s = tkScore(e); if (s === Infinity) continue;
    if (e === tkTarget) s *= .72;                  // hysteresis: keep the current lock unless clearly beaten
    if (s < bs && los(P, e)) { bs = s; best = e; }
  }
  tkTarget = best;
  if (best && !G.seen.grab) showHint([{ a: 'tk' }, { t: 'Hold to lift it with telekinesis' }], 'grab');
}
function grab(e) {
  const p = P;
  e.held = true; e.heldBy = p; e.thrower = 'player'; e.thrownT = 99; e.spin = 0;
  if (e.kind === 'car') { e.curb = false; e.claimed = false; e.parkTo = null; }
  if (e.kind === 'car' && e.driving) ejectDriver(e);
  if (!e.prop) { e.stun = 1; e.tgt = null; e.state = 'grabbed'; }
  p.holding = e; p.holdT = 0; tkTarget = null;
  sfx('grab', e.x, e.y); Input.rumble(.15, .45, 110); Audio2.humStart();
  FX.dots(e.x, e.y, 10, karmaColor(), 90, .5); FX.flash(e.x, e.y, 60, karmaColor(), .2, .7);
  showHint([{ t: 'Aim, then' }, { a: 'tk' }, { t: 'release to throw' }, { a: 'drop' }, { t: 'drop' }], 'throw', 6);
}
function releaseHeld(h) {
  h.held = false; h.heldBy = null;
  if (!h.prop) { h.state = ''; }
  P.holding = null; Audio2.humStop();
}
function dropHeld() {
  if (!P || !P.holding) return; const h = P.holding; releaseHeld(h);
  h.vx *= .3; h.vy *= .3; h.vz = 0; h.thrownT = .4; if (!h.prop) h.stun = .6;
}
function assistTarget(from, ang, spd) {
  const cone = Input.device === 'pad' ? .27 : .09; let best = null, bs = Infinity;
  for (const o of act) {
    if (o.dead || o === from || o.held) continue;
    const hostile = (o.team === 'gang') || (o.team === 'police' && !o.ally && G.heat >= 1);
    if (!hostile) continue;
    const d = Math.hypot(o.x - from.x, o.y - from.y); if (d > 660 || d < 10) continue;
    const a = Math.abs(angDiff(Math.atan2(o.y - from.y, o.x - from.x), ang)); if (a > cone) continue;
    const s = a * 3 + d / 660; if (s < bs && los(from, o)) { bs = s; best = o; }
  }
  if (!best) return null;
  const d = Math.hypot(best.x - from.x, best.y - from.y), t = d / spd * .75;
  const px = best.static ? best.x : best.x + best.vx * t, py = best.static ? best.y : best.y + best.vy * t;
  return { e: best, ang: Math.atan2(py - from.y, px - from.x) };
}
const throwSpeed = m => 740 / (1 + m * .045) * S.tkSpd;
function throwHeld() {
  const p = P, h = p.holding; if (!h) return;
  releaseHeld(h);
  const spd = throwSpeed(h.m), as = assistTarget(h, aim.ang, spd), ang = as ? as.ang : aim.ang;
  h.vx = Math.cos(ang) * spd + p.vx * .4; h.vy = Math.sin(ang) * spd + p.vy * .4; h.vz = 115; h.z = Math.max(h.z, 14);
  h.thrower = 'player'; h.thrownT = 1.5; h.spin = (h.kind === 'car' || h.kind === 'dumpster') ? rnd(-5, 5) : rnd(-15, 15);
  if (h.kind === 'car') h.ang = ang;
  if (!h.prop) { h.stun = 1.4; h.flung = true; h.lastHitBy = 'player'; }
  p.vx -= Math.cos(ang) * h.m * 9; p.vy -= Math.sin(ang) * h.m * 9; p.throwT = .18;
  sfx('throw', p.x, p.y); Input.rumble(.3 + h.m * .05, .55, 130); shake(.08 + h.m * .012);
  FX.ring(h.x, h.y, 34, karmaColor(), .22, 2); FX.flash(p.x + aim.dx * 16, p.y + aim.dy * 16, 70, karmaColor(), .15, .8);
}
function updateTrajectory() {
  traj = null; const h = P.holding; if (!h) return;
  const spd = throwSpeed(h.m), as = assistTarget(h, aim.ang, spd), ang = as ? as.ang : aim.ang, dx = Math.cos(ang), dy = Math.sin(ang);
  let len = raycast(h.x, h.y, dx, dy, 470), hitE = null;
  for (const o of act) {
    if (o.dead || o === h || o === P || o.held) continue;
    const ox = o.x - h.x, oy = o.y - h.y, t = ox * dx + oy * dy; if (t < 0 || t > len) continue;
    const perp = Math.abs(ox * dy - oy * dx); if (perp < o.r + h.r * .6) { len = t - o.r * .5; hitE = o; }
  }
  traj = { x0: h.x, y0: h.y, x1: h.x + dx * len, y1: h.y + dy * len, hit: hitE, assist: as ? as.e : null };
}

/* ---------- other powers ---------- */
function repulse() {
  const p = P, R = 132 * S.repR; p.energy -= 22; p.repCd = .55; p.sinceUse = 0;
  FX.ring(p.x, p.y, R, '#9ff6ff', .32, 4); FX.ring(p.x, p.y, R * .7, '#ffffff', .22, 2); FX.flash(p.x, p.y, R * 1.6, '#7ff0ff', .2, .9);
  sfx('rep', p.x, p.y); shake(.3); Input.rumble(.6, .45, 160);
  for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; parts.push({ k: 's', x: p.x + Math.cos(a) * 14, y: p.y + Math.sin(a) * 14, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, life: .22, max: .22, col: '#bff', w: 2 }); }
  for (const e of act) {
    if (e === p || e.dead || e.static || e.held) continue;
    const d = dist(e, p); if (d > R + e.r) continue;
    const f = .5 + .5 * (1 - d / R), a = Math.atan2(e.y - p.y, e.x - p.x), k = 640 * f / Math.sqrt(e.m);
    e.vx += Math.cos(a) * k; e.vy += Math.sin(a) * k; e.vz = 90 * f;
    if (e.prop) { if (e.driving) ejectDriver(e); e.thrower = 'player'; e.thrownT = 1.2; e.spin = rnd(-8, 8); }
    else { e.stun = Math.max(e.stun, .55 * f + .25); e.flung = true; e.lastHitBy = 'player'; hurt(e, 4 * S.repDmg * f, { by: 'player' }); }
  }
  for (const b of bullets) {
    if (b.team === 'player') continue; const d = Math.hypot(b.x - p.x, b.y - p.y); if (d > R) continue;
    const sp = Math.hypot(b.vx, b.vy) * 1.5, a = Math.atan2(b.y - p.y, b.x - p.x); b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; b.team = 'player'; b.col = '#9ff6ff'; b.life = 1.6; b.dmg *= 1.5;
  }
}
function placeWell() {
  const p = P; let d = Input.device === 'kbm' ? clamp(aim.dist, 40, 270) : aim.dist;
  d = Math.min(d, raycast(p.x, p.y, aim.dx, aim.dy, d) - 10);
  const x = p.x + aim.dx * Math.max(20, d), y = p.y + aim.dy * Math.max(20, d);
  p.energy -= 32; p.wellCd = 2.2; p.sinceUse = 0;
  wells.push({ x, y, t: S.wellT, max: S.wellT, r: S.wellR, a: 0 }); sfx('well', x, y); Input.rumble(.3, .2, 300);
  FX.ring(x, y, S.wellR, '#c09bff', .4, 2, S.wellR * 1.4);
}
function updateWells(dt) {
  for (const w of wells) {
    w.t -= dt; w.a += dt * 4;
    for (const e of act) {
      if (e.dead || e.static || e === P || e.held) continue;
      const dx = w.x - e.x, dy = w.y - e.y, d = Math.hypot(dx, dy); if (d > w.r) continue;
      const pull = (540 + 1100 * (1 - d / w.r)) / Math.sqrt(e.m);
      e.vx += dx / (d || 1) * pull * dt * 2.2; e.vy += dy / (d || 1) * pull * dt * 2.2;
      e.vx += -dy / (d || 1) * 160 * dt; e.vy += dx / (d || 1) * 160 * dt;   // swirl
      if (d < 40) { const damp = Math.pow(.9, dt * 60); e.vx *= damp; e.vy *= damp; }
      if (e.prop) { e.thrower = 'player'; e.thrownT = .8; if (e.driving) ejectDriver(e); } else { e.stun = Math.max(e.stun, .2); e.flung = true; e.lastHitBy = 'player'; }
      e.z = Math.max(e.z, 6 * (1 - d / w.r));
      if (d < 32) hurt(e, S.crush * dt * (e.prop ? 1.6 : 1), { by: 'player' });
    }
    for (const b of bullets) { const dx = w.x - b.x, dy = w.y - b.y, d = Math.hypot(dx, dy); if (d < w.r) { b.vx += dx / (d || 1) * 900 * dt; b.vy += dy / (d || 1) * 900 * dt; } }
    if (Math.random() < .8) { const a = rnd(TAU), r = rnd(w.r * .5, w.r); parts.push({ k: 'd', x: w.x + Math.cos(a) * r, y: w.y + Math.sin(a) * r, vx: -Math.sin(a) * 120 - Math.cos(a) * 90, vy: Math.cos(a) * 120 - Math.sin(a) * 90, life: .55, max: .55, col: '#c9a6ff', w: 1.6 }); }
    if (w.t <= 0) {
      FX.ring(w.x, w.y, w.r, '#d9b8ff', .35, 4); FX.flash(w.x, w.y, w.r * 1.8, '#a070ff', .3, 1); sfx('collapse', w.x, w.y); shake(.25); Input.rumble(.4, .3, 150);
      for (const e of act) {
        if (e.dead || e.static || e === P || e.held) continue; const d = Math.hypot(e.x - w.x, e.y - w.y);
        if (d < w.r) { const a = Math.atan2(e.y - w.y, e.x - w.x), k = 460 / Math.sqrt(e.m); e.vx += Math.cos(a) * k; e.vy += Math.sin(a) * k; e.vz = 120; if (!e.prop) { e.stun = Math.max(e.stun, .6); hurt(e, 6, { by: 'player' }); } }
      }
    }
  }
  for (let i = wells.length - 1; i >= 0; i--) if (wells[i].t <= 0) wells.splice(i, 1);
}
function releaseAbsorb() {
  const p = P;
  if (p.charge > 8) {
    const R = 60 + p.charge * 1.3, dmg = p.charge * S.absDmg;
    FX.ring(p.x, p.y, R, '#ffffff', .4, 5); FX.ring(p.x, p.y, R * .75, '#9ff6ff', .3, 3); FX.flash(p.x, p.y, R * 2, '#bff', .35, 1.2);
    sfx('release', p.x, p.y); shake(.55); hitstop(.05); Input.rumble(1, .8, 280);
    for (const e of act) {
      if (e === p || e.dead || e.held || (e.static && e.kind !== 'hideout' && e.kind !== 'tower')) continue; const d = dist(e, p); if (d > R + e.r) continue;
      if (!e.static) { const a = Math.atan2(e.y - p.y, e.x - p.x), k = 520 / Math.sqrt(e.m); e.vx += Math.cos(a) * k; e.vy += Math.sin(a) * k; e.vz = 130; if (!e.prop) { e.stun = Math.max(e.stun, .6); e.flung = true; e.lastHitBy = 'player'; } else { e.thrower = 'player'; e.thrownT = 1; } }
      hurt(e, dmg * (1 - d / (R + e.r) * .5), { by: 'player' });
    }
  }
  p.charge = 0;
}
function nearestCiv(p, r, wounded) {
  let b = null, bd = r * r;
  for (const e of act) if (e.kind === 'civ' && !e.dead && (wounded ? e.state === 'wounded' : e.state !== 'wounded') && dist2(e, p) < bd) { bd = dist2(e, p); b = e; }
  return b;
}
function healCiv(c) {
  c.hp = c.maxhp; c.state = 'cheer'; c.stateT = 4; karmaAdd(KARMA.heal); addXP(15, c.x, c.y); heatAdd(-.25); G.saves++;
  floatText(c.x, c.y - 20, 'SAVED', '#38d0ff', 1.2); sfx('heal', c.x, c.y); FX.dots(c.x, c.y, 16, '#8ff', 90, .8); FX.flash(c.x, c.y, 90, '#5fe8ff', .4, .9); Input.rumble(.1, .4, 150);
}
function drainCiv(c) {
  const p = P; p.drainCd = .5;
  hurt(c, 18, { by: 'player' }); karmaAdd(KARMA.drain); heatAdd(.3);
  p.energy = Math.min(S.maxEn, p.energy + 22 * (1 + .5 * S.e_tithe)); p.hp = Math.min(S.maxHp, p.hp + 8 * (1 + S.e_tithe)); addXP(5, c.x, c.y);
  sfx('drain', c.x, c.y); FX.dots(c.x, c.y, 14, '#ff3366', 70, .7); FX.flash(c.x, c.y, 80, '#ff2050', .35, .9); G.combo = 0; Input.rumble(.5, .2, 220);
  if (!c.dead) { c.state = 'flee'; c.stateT = 3; c.fx = c.x - p.x; c.fy = c.y - p.y; }
}

/* ---------- per-tick player update ---------- */
function updatePlayer(dt) {
  const p = P; const alive = G.mode === 'play';
  p.sinceHit += dt; p.repCd -= dt; p.wellCd -= dt; p.dashCd -= dt; p.drainCd -= dt; p.invT -= dt; p.throwT -= dt; p.sinceUse += dt; p.flash -= dt;
  const mv = alive ? isoDir(Input.move()) : { x: 0, y: 0 };   // stick up = up on the iso screen
  updateAim(dt, mv); p.ang = aim.ang;
  // movement / dash
  if (p.dashT > 0) {
    p.dashT -= dt; p.vx = p.dashDx * DASH_SPEED; p.vy = p.dashDy * DASH_SPEED;
    parts.push({ k: 'g', x: p.x, y: p.y, ang: p.ang, life: .22, max: .22, col: karmaColor() });
    if (p.dashT <= 0) { p.vx *= .35; p.vy *= .35; }
  } else {
    const slow = (p.holding ? 1 - Math.min(.35, p.holding.m * .03) : 1) * (p.absorbing ? .55 : 1) * (p.chan ? .4 : 1);
    const sp = PLAYER_SPEED * slow * (alive ? 1 : 0), k = Math.min(1, dt * 14);
    p.vx += (mv.x * sp - p.vx) * k; p.vy += (mv.y * sp - p.vy) * k;
  }
  if (Math.hypot(p.vx, p.vy) > 20) p.walk += dt * Math.hypot(p.vx, p.vy) * .06;
  if (!alive) return;
  if (Input.pressed('dash') && p.dashCd <= 0 && p.energy >= S.dashCost) {
    p.energy -= S.dashCost; p.dashCd = .42; p.dashT = DASH_TIME; p.sinceUse = 0;
    const l = Math.hypot(mv.x, mv.y); p.dashDx = l > .2 ? mv.x / l : aim.dx; p.dashDy = l > .2 ? mv.y / l : aim.dy;
    sfx('dash', p.x, p.y); Input.rumble(.1, .35, 90); FX.ring(p.x, p.y, 26, karmaColor(), .2, 2);
  }
  // energy
  if (!p.holding && !p.absorbing && p.sinceUse > .35) p.energy = Math.min(S.maxEn, p.energy + S.regen * dt);
  // telekinesis
  const tkHeld = Input.held('tk');
  if (Input.pressed('tk')) p.tkBuf = .22;
  p.tkBuf -= dt;
  if (!p.holding) {
    updateTKTarget();
    if (tkHeld && p.tkBuf > 0 && tkTarget && p.energy > 6) { grab(tkTarget); p.tkBuf = 0; }
    else if (Input.pressed('tk') && !tkTarget) { sfx('deny'); FX.ring(p.x + aim.dx * 30, p.y + aim.dy * 30, 22, karmaColor(), .2, 1.5); }
  } else {
    const h = p.holding; p.holdT += dt;
    if (h.dead) { p.holding = null; Audio2.humStop(); }
    else if (!tkHeld) throwHeld();
    else if (Input.pressed('drop')) dropHeld();
    else {
      p.energy = Math.max(0, p.energy - (4 + h.m * .9) * dt); p.sinceUse = 0;
      const reach = p.r + h.r + 16, hx = p.x + aim.dx * reach, hy = p.y + aim.dy * reach;
      const k = 320 / (1 + h.m * .09), c = 2 * Math.sqrt(k) * .62;
      h.vx += ((hx - h.x) * k - (h.vx - p.vx) * c) * dt; h.vy += ((hy - h.y) * k - (h.vy - p.vy) * c) * dt;
      const s = Math.hypot(h.vx, h.vy); if (s > 900) { h.vx *= 900 / s; h.vy *= 900 / s; }
      h.z = approach(h.z, 18 + Math.sin(G.time * 4) * 2.5, 70 * dt);
      if (!h.prop) { h.stun = .5; h.spin = Math.sin(G.time * 18) * 3; }
      Audio2.humSet(s, h.m);
      if (p.energy <= 0) { dropHeld(); toast('Out of energy', '#3ce0ff'); }
      else if (dist(h, p) > TK_RANGE * S.tkRange * 1.5) dropHeld();
    }
  }
  updateTrajectory();
  // repulse / well / absorb
  if (Input.pressed('rep')) { if (p.repCd <= 0 && p.energy >= 22) repulse(); else sfx('deny'); }
  if (Input.pressed('well')) { if (p.wellCd <= 0 && p.energy >= 32) placeWell(); else sfx('deny'); }
  const absNow = Input.held('abs') && p.energy > 2 && !p.holding;
  if (absNow) { if (!p.absorbing) sfx('charge', p.x, p.y); p.absorbing = true; p.energy -= 9 * dt; p.sinceUse = 0; }
  else if (p.absorbing) { p.absorbing = false; releaseAbsorb(); }
  // heal / drain (hold to channel, so it is always a deliberate choice)
  const wc = nearestCiv(p, 48, true), cc = wc || nearestCiv(p, 40, false);
  p.near = { heal: wc, drain: cc };
  let chan = null;
  if (Input.held('heal') && wc) chan = { k: 'heal', c: wc, need: .45 };
  else if (Input.held('drain') && cc && p.drainCd <= 0) chan = { k: 'drain', c: cc, need: .6 };
  if (chan) {
    if (p.chan && p.chan.k === chan.k && p.chan.c === chan.c) p.chan.t += dt; else { p.chan = chan; p.chan.t = 0; }
    if (p.chan.t >= p.chan.need) { if (chan.k === 'heal') healCiv(chan.c); else drainCiv(chan.c); p.chan = null; }
  } else p.chan = null;
  // passive regen sources
  if (S.g_mend) { p.hp = Math.min(S.maxHp, p.hp + 1.6 * S.g_mend * dt); p.mendT = (p.mendT || 0) - dt; if (p.mendT <= 0) { p.mendT = .7; const c = nearestCiv(p, 110, true); if (c) healCiv(c); } }
  if (DS[districtAt(p.x)].status === 'liberated') p.hp = Math.min(S.maxHp, p.hp + 2.5 * dt);
  p.energy = clamp(p.energy, 0, S.maxEn); p.hp = Math.min(p.hp, S.maxHp);
}
