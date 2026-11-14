/* ============================== 09 AI ============================== */
/* Chasers follow a BFS flow field toward the player (recomputed when the player changes tile), so
   nobody snags on buildings. Every enemy attack is telegraphed: aim lasers, red charge lanes, slam rings. */
function steer(e, dx, dy, speed, dt, agility = 9) {
  if (e.stun > 0) return;
  const l = Math.hypot(dx, dy) || 1, k = Math.min(1, dt * agility);
  e.vx += (dx / l * speed - e.vx) * k; e.vy += (dy / l * speed - e.vy) * k;
  if (speed > 10 && Math.hypot(e.vx, e.vy) < speed * .25) { e.stuckT = (e.stuckT || 0) + dt; if (e.stuckT > .45) { e.sideT = .5; e.sideDir = Math.random() < .5 ? 1 : -1; e.stuckT = 0; } } else e.stuckT = 0;
  if (e.sideT > 0) { e.sideT -= dt; e.vx += -dy / l * e.sideDir * speed * dt * 9; e.vy += dx / l * e.sideDir * speed * dt * 9; }
}
function seesTarget(e) {
  e.losT = (e.losT || 0) - STEP;
  if (e.losT <= 0) { e.losT = .15 + Math.random() * .1; e.losC = e.tgt ? los(e, e.tgt) : false; }
  return e.losC;
}
function chase(e, t, speed, dt) {
  if (t === P && !seesTarget(e)) { const f = flowDir(e); if (f) { steer(e, f.x, f.y, speed, dt); return; } }
  steer(e, t.x - e.x, t.y - e.y, speed, dt);
}
function face(e, ang, dt, rate = 10) { e.ang += angDiff(ang, e.ang) * Math.min(1, dt * rate); }
function wander(e, dt, speed, pred) {
  e.wt = (e.wt || 0) - dt;
  if (e.wt <= 0) {
    const home = e.home || e, p = findFree(home.x, home.y, 130, e.r + 1, pred);
    e.wtgt = (p && Math.random() < .7) ? p : null; e.wt = rnd(1.5, 4);
  }
  if (e.wtgt) {
    const dx = e.wtgt.x - e.x, dy = e.wtgt.y - e.y;
    if (Math.hypot(dx, dy) > 6) { steer(e, dx, dy, speed, dt); face(e, Math.atan2(dy, dx), dt, 6); } else { e.wtgt = null; steer(e, 0, 0, 0, dt); }
  } else steer(e, 0, 0, 0, dt);
}
/* TERRITORY: every gang member guards a home area. They only go after you while you're inside it,
   or for a few seconds after you hit them. Leave the area and they give up and walk home. */
const TERRITORY_R = 270;
function inTerritory(e) { const h = e.home || e; return dist(P, h) < (e.terr || TERRITORY_R); }
function isHostile(a, b) {
  if (b.dead || b.state === 'grabbed') return false;
  if (a.team === 'gang') return b.team === 'police' || (b.team === 'player' && (a.kind === 'boss' || inTerritory(a) || a.provT > 0));
  if (a.team === 'police') return b.team === 'gang' && !b.static || (b.team === 'player' && !a.ally && G.heat >= 1);
  return false;
}
function nearestHostile(e, r) {
  let b = null, bd = r * r;
  for (const o of act) { if (o === e || !isHostile(e, o)) continue; const d = dist2(e, o); if (d < bd) { bd = d; b = o; } }
  return b;
}
function shoot(e, ang, o = {}) {
  const sp = o.speed || 300;
  bullets.push({ x: e.x + Math.cos(ang) * (e.r + 5), y: e.y + Math.sin(ang) * (e.r + 5), vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, team: e.team, dmg: o.dmg || 7, life: o.life || 2.2, col: o.col || (e.team === 'police' ? '#8fc0ff' : '#ffcf5a'), r: o.r || 3, by: e.kind, fire: o.fire });
  if (!o.quiet) { sfx(o.fire ? 'zap' : 'shot', e.x, e.y, .7); FX.flash(e.x + Math.cos(ang) * (e.r + 8), e.y + Math.sin(ang) * (e.r + 8), 46, o.col || '#ffd27a', .07, .9); }
}
function warnLine(x, y, ang, len, w, life, col = '#ff3355') { warns.push({ k: 'line', x, y, ang, len, w, life, max: life, col }); }
function warnCircle(x, y, r, life, col = '#ff3355') { warns.push({ k: 'circle', x, y, r, life, max: life, col }); }

/* ---------- civilians ---------- */
const civWalk = t => t === T.WALK || t === T.PLAZA || t === T.GRASS;
function aiCivilian(e, dt) {
  e.t += dt;
  if (e.fadeIn > 0) e.fadeIn -= dt;
  if (e.fadeOut !== undefined) { e.fadeOut -= dt; steer(e, 0, 0, 0, dt); if (e.fadeOut <= 0) e.dead = true; return; }
  if (e.state === 'wounded') { e.woundT -= dt; steer(e, 0, 0, 0, dt); if (e.woundT <= 0) kill(e, { by: 'time' }); return; }
  if (e.state === 'grabbed') return;
  if (e.stun > 0) { e.stun -= dt; return; }
  e.thrT = (e.thrT || 0) - dt;
  if (e.thrT <= 0) {
    e.thrT = .2 + Math.random() * .15;
    let thr = null, td = 1e9;
    for (const o of act) {
      if (o === e || o.dead) continue; let danger = false; const d = dist2(o, e);
      if (o.team === 'gang' && !o.static && d < 150 * 150 && (o.tgt || o.kind !== 'grunt')) danger = true;
      else if (o.prop && Math.hypot(o.vx, o.vy) > 200 && d < 130 * 130) danger = true;
      else if (o.kind === 'player' && (G.karma < -25 || G.heat >= 1 || o.dashT > 0 || o.absorbing) && d < 120 * 120) danger = true;
      else if (o.kind === 'cop' && !o.ally && G.heat >= 1 && d < 110 * 110) danger = true;
      if (danger && d < td) { td = d; thr = o; }
    }
    if (thr) { e.state = 'flee'; e.stateT = 2; e.fx = e.x - thr.x; e.fy = e.y - thr.y; }
  }
  if (e.state === 'flee') { e.stateT -= dt; steer(e, e.fx, e.fy, 128, dt, 10); face(e, Math.atan2(e.fy, e.fx), dt, 12); e.walk += dt * 9; if (e.stateT <= 0) e.state = ''; return; }
  if (e.state === 'cheer') { e.stateT -= dt; steer(e, 0, 0, 0, dt); face(e, Math.atan2(P.y - e.y, P.x - e.x), dt); if (Math.random() < dt * 2.5) parts.push({ k: 'd', x: e.x, y: e.y - 8, vx: rnd(-12, 12), vy: -40, life: .8, max: .8, col: pick(['#ff7aa8', '#7affea', '#ffd23c']), w: 2 }); if (e.stateT <= 0) e.state = ''; return; }
  if (G.karma > 25 && G.heat < 1 && dist2(e, P) < 90 * 90 && Math.random() < dt * .5) { e.state = 'cheer'; e.stateT = 2.5; return; }
  walkStreet(e, dt);
  if (Math.hypot(e.vx, e.vy) > 8) e.walk += dt * Math.hypot(e.vx, e.vy) * .07;
}

/* ---------- gang / cops ---------- */
function aiGunman(e, dt) {
  const t = e.tgt, dx = t.x - e.x, dy = t.y - e.y, d = Math.hypot(dx, dy) || 1, seen = seesTarget(e);
  face(e, Math.atan2(dy, dx), dt, 12);
  if (e.aimT > 0) {
    e.aimT -= dt; steer(e, 0, 0, 0, dt, 6);
    if (e.aimT <= 0) {
      const n = e.kind === 'cop' ? 1 : (Math.random() < .35 ? 2 : 1);
      for (let i = 0; i < n; i++) later(i * .14, () => { if (!e.dead && e.stun <= 0 && e.tgt) shoot(e, Math.atan2(e.tgt.y - e.y, e.tgt.x - e.x) + rnd(-.06, .06), { dmg: e.kind === 'cop' ? 6 : 7 }); });
      e.cd = 1.4 + rnd(.9);
    }
    return;
  }
  const pref = 190;
  e.strafeT = (e.strafeT || 0) - dt; if (e.strafeT <= 0) { e.strafeT = rnd(1, 2.4); e.strafeDir = Math.random() < .5 ? 1 : -1; }
  const nx = dx / d, ny = dy / d;
  if (!seen || d > pref + 50) chase(e, t, e.speed, dt);
  else if (d < pref - 70) steer(e, -nx, -ny, e.speed * .8, dt);
  else steer(e, -ny * e.strafeDir, nx * e.strafeDir, e.speed * .6, dt);
  if (seen && d < 400 && e.cd <= 0) { e.aimT = .42; }
}
function aiBrute(e, dt) {
  const t = e.tgt, dx = t.x - e.x, dy = t.y - e.y, d = Math.hypot(dx, dy) || 1;
  e.cd2 = (e.cd2 === undefined ? 2 : e.cd2) - dt;
  if (e.state === 'slamWind') {
    e.stateT -= dt; steer(e, 0, 0, 0, dt);
    if (e.stateT <= 0) { e.state = ''; e.cd = 1.5; slamAt(e, 70, 18, 'brute'); }
    return;
  }
  if (e.state === 'chargeWind') { e.stateT -= dt; steer(e, 0, 0, 0, dt); face(e, e.cang, dt, 20); if (e.stateT <= 0) { e.state = 'charging'; e.stateT = .6; e.hitP = false; sfx('dash', e.x, e.y); } return; }
  if (e.state === 'charging') {
    e.stateT -= dt; e.vx = Math.cos(e.cang) * 440; e.vy = Math.sin(e.cang) * 440;
    if (Math.random() < .6) FX.dust(e.x, e.y, 1);
    if (!e.hitP && dist(e, P) < e.r + P.r + 4) { e.hitP = true; hurt(P, 20, { by: 'brute' }); P.vx += Math.cos(e.cang) * 380; P.vy += Math.sin(e.cang) * 380; }
    if (e.wallHit > 150) { e.state = ''; e.stun = 1.1; shake(.3); FX.dust(e.x, e.y, 10); sfx('heavy', e.x, e.y); }
    else if (e.stateT <= 0) { e.state = ''; e.cd = .8; }
    return;
  }
  face(e, Math.atan2(dy, dx), dt, 7);
  chase(e, t, e.speed, dt);
  if (d < e.r + t.r + 22 && e.cd <= 0) { e.state = 'slamWind'; e.stateT = .45; warnCircle(e.x, e.y, 70, .45); }
  else if (d > 120 && d < 330 && e.cd2 <= 0 && seesTarget(e)) { e.state = 'chargeWind'; e.stateT = .6; e.cang = Math.atan2(dy, dx); e.cd2 = 4.5; warnLine(e.x, e.y, e.cang, 300, e.r * 2, .6); sfx('charge', e.x, e.y); }
}
function slamAt(e, R, dmg, by) {
  FX.ring(e.x, e.y, R, '#ffae60', .3, 4); FX.dust(e.x, e.y, 12); sfx('heavy', e.x, e.y); shake(.35);
  for (const o of act) {
    if (o === e || o.dead || o.static) continue; const d = dist(o, e); if (d > R + o.r) continue;
    const a = Math.atan2(o.y - e.y, o.x - e.x), k = 420 / Math.sqrt(o.m); o.vx += Math.cos(a) * k; o.vy += Math.sin(a) * k;
    if (o.kind === 'player') hurt(o, dmg, { by }); else if (!o.prop && o.team !== e.team) { hurt(o, dmg, { by }); o.stun = .5; }
  }
}
function aiSuper(e, dt) {
  const t = e.tgt, dx = t.x - e.x, dy = t.y - e.y, d = Math.hypot(dx, dy) || 1, seen = seesTarget(e);
  face(e, Math.atan2(dy, dx), dt, 12);
  e.dashT = (e.dashT || 0) - dt; e.cd2 = (e.cd2 === undefined ? 1.6 : e.cd2) - dt;
  if (e.dashT > 0) { e.vx = e.dvx; e.vy = e.dvy; parts.push({ k: 'g', x: e.x, y: e.y, ang: e.ang, life: .25, max: .25, col: '#b66bff', sup: 1 }); return; }
  if (e.cd2 <= 0 && d < 420 && seen) {
    const s = Math.random() < .5 ? 1 : -1; e.dvx = (-dy / d * s * .8 + dx / d * .3) * 480; e.dvy = (dx / d * s * .8 + dy / d * .3) * 480; e.dashT = .26; e.cd2 = 2.8; sfx('dash', e.x, e.y, .6);
    later(.32, () => {
      if (e.dead || e.stun > 0 || !e.tgt) return; const a0 = Math.atan2(e.tgt.y - e.y, e.tgt.x - e.x);
      for (let i = -2; i <= 2; i++) shoot(e, a0 + i * .17, { dmg: 7, speed: 250, col: '#d9a6ff', r: 4, quiet: i !== 0 });
    });
    later(.06, () => { if (!e.dead && e.tgt) warnLine(e.x, e.y, Math.atan2(e.tgt.y - e.y, e.tgt.x - e.x), 260, 40, .26, '#c080ff'); });
    return;
  }
  if (d > 230 || !seen) chase(e, t, e.speed, dt); else steer(e, -dy, dx, e.speed * .7, dt);
}

/* ---------- bosses ---------- */
function releaseLifted(e) { if (!e.lifted) return; for (const o of e.lifted) { o.held = false; o.bossHeld = null; o.z = Math.max(o.z, 10); o.vx *= .2; o.vy *= .2; } e.lifted.length = 0; if (e.act === 'hurl' || e.act === 'volley') e.act = ''; }
const BOSS_PATS = [
  [['burst', 'trail', 'summon', 'burst', 'trail'], ['burst', 'rain', 'trail', 'burst', 'summon', 'rain']],
  [['charge', 'slam', 'hurl', 'charge', 'slam'], ['charge', 'charge', 'hurl', 'slam', 'summon', 'charge']],
  [['blink', 'volley', 'pull', 'summon', 'blink', 'volley'], ['blink', 'volley', 'pull', 'blink', 'summon', 'volley', 'pull']]
];
function radial(e, n, sp, col, dmg = 9, fire) { const off = rnd(TAU); for (let i = 0; i < n; i++) shoot(e, off + i / n * TAU, { speed: sp, col, dmg, r: 5, life: 3, fire, quiet: i > 0 }); sfx('boom', e.x, e.y, .5); }
function gangCount() { let n = 0; for (const o of act) if (o.team === 'gang' && !o.static && o.kind !== 'boss' && !o.dead) n++; return n; }
function aiBoss(e, dt) {
  const t = P, dx = t.x - e.x, dy = t.y - e.y, d = Math.hypot(dx, dy) || 1;
  if (e.stagger > 0) { releaseLifted(e); e.stagger -= dt; steer(e, 0, 0, 0, dt, 4); if (Math.random() < dt * 8) FX.dots(e.x, e.y - e.r, 1, '#ffd23c', 40, .5); return; }
  const ph2 = e.hp < e.maxhp * .5;
  if (ph2 && !e.ph2) { e.ph2 = true; toast(e.name + ' is enraged', '#ff7a3b', true); FX.ring(e.x, e.y, 160, e.col, .5, 5); shake(.4); sfx('charge', e.x, e.y); }
  const pats = BOSS_PATS[e.did][ph2 ? 1 : 0];
  e.pt = (e.pt === undefined ? 1.8 : e.pt) - dt;
  if (e.act === 'charging' || e.act === 'trail') {
    e.actT -= dt; e.vx = e.cvx; e.vy = e.cvy;
    parts.push({ k: 'g', x: e.x, y: e.y, ang: e.ang, life: .3, max: .3, col: e.col, boss: 1 });
    if (e.act === 'trail') { e.trailD = (e.trailD || 0) + Math.hypot(e.cvx, e.cvy) * dt; if (e.trailD > 26) { e.trailD = 0; zones.push({ x: e.x, y: e.y, r: 24, t: 3.2, max: 3.2, dmg: 16, col: '#ff7a2a' }); } }
    if (!e.hitP && dist(e, P) < e.r + P.r + 4) { e.hitP = true; hurt(P, e.act === 'trail' ? 18 : 28, { by: 'boss' }); P.vx += e.cvx * .8; P.vy += e.cvy * .8; }
    if (e.wallHit > 160 && e.act === 'charging') {
      e.act = ''; e.charging = false; e.stagger = 2.3; e.vx *= -.2; e.vy *= -.2; shake(.7); hitstop(.08); sfx('heavy', e.x, e.y); FX.dust(e.x, e.y, 16); FX.sparks(e.x, e.y, 20, '#ffd27a', 400);
      toast(e.name + ' is staggered  ·  hit him now', '#ffc24a'); Input.rumble(.8, .5, 300); return;
    }
    if (e.actT <= 0) { e.act = ''; e.charging = false; e.stun = .5; e.vx *= .25; e.vy *= .25; }
    return;
  }
  if (e.act === 'pull') {
    e.actT -= dt; steer(e, 0, 0, 0, dt);
    const pull = 330 * dt; P.vx -= dx / d * pull * 2.4; P.vy -= dy / d * pull * 2.4;
    for (const o of act) if (o.prop && !o.held && dist(o, e) < 340) { o.vx += (e.x - o.x) / (dist(o, e) || 1) * 500 * dt; o.vy += (e.y - o.y) / (dist(o, e) || 1) * 500 * dt; }
    if (Math.random() < .7) { const a = rnd(TAU), r = rnd(80, 220); parts.push({ k: 'd', x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r, vx: -Math.cos(a) * 260, vy: -Math.sin(a) * 260, life: .4, max: .4, col: '#c9a6ff', w: 2 }); }
    if (e.actT <= 0) { e.act = ''; radial(e, ph2 ? 22 : 16, 230, '#c9a6ff'); }
    return;
  }
  if (e.act === 'hurl' || e.act === 'volley') {
    e.actT -= dt; steer(e, 0, 0, 0, dt); face(e, Math.atan2(dy, dx), dt);
    for (let i = 0; i < e.lifted.length; i++) {
      const o = e.lifted[i]; if (o.dead) continue; const a = e.t * 2 + i * TAU / e.lifted.length, rr = e.r + o.r + 18;
      o.vx = (e.x + Math.cos(a) * rr - o.x) * 10; o.vy = (e.y + Math.sin(a) * rr - o.y) * 10; o.z = 20;
    }
    if (e.actT <= 0) {
      const o = e.lifted.shift();
      if (o && !o.dead) {
        o.bossHeld = null; o.held = false; const a = Math.atan2(P.y + P.vy * .3 - o.y, P.x + P.vx * .3 - o.x), sp = e.did === 2 ? 560 : 520;
        o.vx = Math.cos(a) * sp; o.vy = Math.sin(a) * sp; o.thrower = 'boss'; o.thrownT = 1.6; o.spin = rnd(-10, 10); sfx('throw', o.x, o.y); warnLine(o.x, o.y, a, 360, o.r * 2, .25, '#ff3355');
      }
      if (e.lifted.length) e.actT = e.did === 2 ? .45 : .6; else e.act = '';
    }
    return;
  }
  e.t += dt;
  face(e, Math.atan2(dy, dx), dt, 6);
  if (e.pt > 0) { if (d > 240) chase(e, t, e.speed * (ph2 ? 1.25 : 1), dt); else steer(e, -dy * (e.orbit || 1), dx * (e.orbit || 1), e.speed * .8, dt); return; }
  const a = pats[(e.pi = ((e.pi === undefined ? -1 : e.pi) + 1) % pats.length)];
  e.pt = (ph2 ? 1.1 : 1.7) + rnd(.6); e.orbit = Math.random() < .5 ? 1 : -1;
  FX.ring(e.x, e.y, 40, '#ffffff', .3, 2);
  if (a === 'burst') { warnCircle(e.x, e.y, 90, .55, '#ff7a2a'); sfx('charge', e.x, e.y); later(.55, () => { if (!e.dead) { radial(e, ph2 ? 20 : 14, 220, '#ff9a3a', 9, 1); if (ph2) later(.3, () => !e.dead && radial(e, 14, 180, '#ffcf5a', 8, 1)); } }); }
  else if (a === 'trail' || a === 'charge') {
    const ang = Math.atan2(P.y + P.vy * .25 - e.y, P.x + P.vx * .25 - e.x), wind = a === 'charge' ? .8 : .55, sp = a === 'charge' ? 580 : 400;
    warnLine(e.x, e.y, ang, sp * (a === 'charge' ? .9 : .8), e.r * 2.2, wind); sfx('charge', e.x, e.y);
    e.pt += wind; later(wind, () => { if (e.dead || e.stagger > 0) return; e.ang = ang; e.cvx = Math.cos(ang) * sp; e.cvy = Math.sin(ang) * sp; e.act = a === 'charge' ? 'charging' : 'trail'; e.actT = a === 'charge' ? .95 : .8; e.hitP = false; e.charging = a === 'charge'; sfx('dash', e.x, e.y); });
  }
  else if (a === 'summon') {
    const kinds = e.did === 0 ? ['grunt', 'grunt'] : e.did === 1 ? (ph2 ? ['brute'] : ['grunt', 'grunt']) : ['sup', 'grunt'];
    for (const k of kinds) { const p = findFree(e.x, e.y, 90, 14); if (p && gangCount() < 9) { const g = spawnGang(k, p.x, p.y, { home: { x: e.x, y: e.y }, terr: 700 }); g.tgt = P; g.sight = 600; FX.ring(p.x, p.y, 30, e.col, .3, 2); } }
    toast(e.name + ' calls for backup', '#ff9a3a');
  }
  else if (a === 'rain') {
    for (let i = 0; i < 5; i++) { const px = P.x + rnd(-110, 110) + P.vx * .5, py = P.y + rnd(-110, 110) + P.vy * .5; warnCircle(px, py, 52, .95, '#ff7a2a'); later(.95, () => { if (!e.dead) explosion(px, py, 52, 16, 'boss'); }); }
  }
  else if (a === 'slam') {
    const R = 120; warnCircle(e.x, e.y, R, .55); sfx('charge', e.x, e.y); e.pt += .55;
    later(.55, () => { if (!e.dead && e.stagger <= 0) { slamAt(e, R, 22, 'boss'); FX.ring(e.x, e.y, R * 1.3, '#ffae60', .4, 6); for (let i = 0; i < 10; i++) { const aa = i / 10 * TAU; shoot(e, aa, { speed: 200, col: '#ffae60', dmg: 7, r: 4, quiet: true }); } } });
  }
  else if (a === 'hurl' || a === 'volley') {
    e.lifted = [];
    const cands = act.filter(o => o.prop && !o.dead && !o.held && dist(o, e) < 360).sort((p1, p2) => dist(p1, e) - dist(p2, e));
    for (const o of cands.slice(0, a === 'volley' ? 3 : 1)) { o.bossHeld = e; o.held = true; o.driving = false; e.lifted.push(o); FX.flash(o.x, o.y, 50, '#c080ff', .3); }
    if (!e.lifted.length) { // nothing to throw: conjure a fan of kinetic bolts instead
      const a0 = Math.atan2(dy, dx); warnLine(e.x, e.y, a0, 300, 70, .4, '#c080ff');
      later(.4, () => { if (!e.dead) for (let i = -3; i <= 3; i++) shoot(e, a0 + i * .13, { speed: 300, col: '#d9a6ff', dmg: 8, r: 4, quiet: i !== 0 }); });
    } else { e.act = a; e.actT = .7; sfx('grab', e.x, e.y); }
  }
  else if (a === 'pull') { e.act = 'pull'; e.actT = 1.4; sfx('well', e.x, e.y); warnCircle(e.x, e.y, 140, 1.4, '#c080ff'); }
  else if (a === 'blink') {
    const ang = rnd(TAU), r = rnd(170, 250), p = findFree(P.x + Math.cos(ang) * r, P.y + Math.sin(ang) * r, 40, e.r + 2);
    if (p) {
      for (let i = 0; i < 6; i++) parts.push({ k: 'g', x: lerp(e.x, p.x, i / 6), y: lerp(e.y, p.y, i / 6), ang: e.ang, life: .4, max: .4, col: e.col, boss: 1 });
      FX.flash(e.x, e.y, 120, '#b06bff', .3); e.x = p.x; e.y = p.y; e.vx = e.vy = 0; FX.flash(e.x, e.y, 120, '#b06bff', .3); sfx('zap', e.x, e.y);
      later(.35, () => { if (!e.dead && e.stagger <= 0) { const a0 = Math.atan2(P.y - e.y, P.x - e.x); for (let i = -2; i <= 2; i++) shoot(e, a0 + i * .2, { speed: 280, col: '#d9a6ff', dmg: 8, r: 4, quiet: i !== 0 }); } });
    }
  }
}

/* ---------- hideouts ---------- */
/* HIDEOUT ASSAULT (outside): kill the guards -> the gate rolls up -> waves pour out of the building ->
   a lieutenant comes out last. Drop him and the hideout is cleared. */
const HIDEOUT_WAVES = d => [
  ['grunt', 'grunt', 'grunt'].concat(d > 0 ? ['grunt'] : []),
  ['grunt', 'grunt', 'brute'].concat(d > 1 ? ['sup'] : d > 0 ? ['grunt'] : []),
  ['leader']
];
function aiHideout(e, dt) {
  e.t += dt;
  if (e.cleared) return;
  const gx = e.x, gy = e.rect.y + e.rect.h + 14;
  if (!e.gateOpen) {
    let left = 0; for (const o of ents) if (!o.dead && o.guardOf === e.hid) left++;
    e.guardsLeft = left;
    if (left === 0) {
      e.gateOpen = true; e.gateT = 0; e.wave = 0; e.waveT = 1.8;
      sfx('heavy', gx, gy); shake(.3); FX.dust(gx, gy, 14); FX.flash(gx, gy - 10, 120, e.col, .4);
      toast('The gate is open · they\'re coming out', '#ffc24a', true);
    }
    return;
  }
  e.gateT = Math.min(1, (e.gateT || 0) + dt * 1.5);
  let alive = 0; for (const o of ents) if (!o.dead && o.waveOf === e.hid) alive++;
  e.waveAlive = alive;
  const waves = HIDEOUT_WAVES(e.did);
  if (alive > 0 || e.spawning) return;
  if (e.wave >= waves.length) { clearHideout(e); return; }
  if (dist(P, { x: gx, y: gy }) > 480) return;          // waits for you to come back
  e.waveT -= dt; if (e.waveT > 0) return;
  const list = waves[e.wave]; e.wave++; e.spawning = true; e.waveT = 2.2;
  if (list[0] === 'leader') toast('The ' + DIST[e.did].gang + ' lieutenant steps out', '#ff9a3a', true);
  else toast('Wave ' + e.wave + ' / ' + (waves.length - 1), '#ffc24a');
  list.forEach((k, i) => later(i * .45, () => {
    if (e.cleared) return;
    const leader = k === 'leader', g = spawnGang(leader ? 'brute' : k, gx + rnd(-8, 8), gy, { home: { x: gx, y: gy + 40 }, terr: 420, waveOf: e.hid, provT: 8 });
    g.vy = 120; g.tgt = P; g.sight = 600;
    if (leader) { g.leader = true; g.maxhp = g.hp = 260 + e.did * 80; g.r = 17; g.m = 7; g.name = DIST[e.did].gang + ' LIEUTENANT'; }
    FX.dust(gx, gy, 5); sfx('dash', gx, gy, .5);
    if (i === list.length - 1) e.spawning = false;
  }));
}

/* ---------- combat dispatcher ---------- */
function aiCombat(e, dt) {
  e.cd -= dt; e.tgtT -= dt; e.t += dt; if (e.provT > 0) e.provT -= dt;
  if (e.state === 'grabbed') return;
  if (e.stun > 0) { e.stun -= dt; e.aimT = 0; if (e.state === 'chargeWind' || e.state === 'slamWind' || e.state === 'charging') e.state = ''; if (e.kind === 'boss') { e.act = e.act === 'charging' ? '' : e.act; releaseLifted(e); } return; }
  if (e.tgtT <= 0) {
    e.tgtT = .4 + Math.random() * .2;
    if (e.kind === 'boss') e.tgt = P;
    else { const n = nearestHostile(e, e.sight); if (n) e.tgt = n; else if (e.tgt && (e.tgt.dead || dist(e, e.tgt) > e.sight * 1.6 || !isHostile(e, e.tgt))) e.tgt = null; }
  }
  if (e.tgt && (e.tgt.dead || (e.tgt === P && G.mode === 'dead'))) e.tgt = null;
  if (e.kind === 'boss') { if (G.mode !== 'dead') aiBoss(e, dt); else steer(e, 0, 0, 0, dt); return; }
  if (e.kind === 'cop' && e.ally && !e.tgt) {
    const dx = P.x - e.x, dy = P.y - e.y; if (Math.hypot(dx, dy) > 110) chase(e, P, e.speed, dt); else steer(e, 0, 0, 0, dt);
    face(e, Math.atan2(dy, dx), dt, 5); e.walk += dt * Math.hypot(e.vx, e.vy) * .07; return;
  }
  if (!e.tgt) {
    const h = e.home;
    if (e.team === 'gang' && h && dist(e, h) > 140) { steer(e, h.x - e.x, h.y - e.y, e.speed * .7, dt); face(e, Math.atan2(h.y - e.y, h.x - e.x), dt, 6); e.walk += dt * Math.hypot(e.vx, e.vy) * .07; return; }   // head back to their turf
    wander(e, dt, e.speed * .4);
    if (e.team === 'gang' && e.kind === 'grunt' && e.cd <= 0) {   // gangs terrorise civilians -> wounded civilians you can save
      const c = nearestCiv(e, 220, false);
      if (c && los(e, c)) { face(e, Math.atan2(c.y - e.y, c.x - e.x), 1); shoot(e, Math.atan2(c.y - e.y, c.x - e.x), { dmg: 12 }); e.cd = 3 + rnd(2); } else e.cd = 1;
    }
  } else if (e.kind === 'grunt' || e.kind === 'cop') aiGunman(e, dt);
  else if (e.kind === 'brute') aiBrute(e, dt);
  else if (e.kind === 'sup') aiSuper(e, dt);
  e.walk += dt * Math.hypot(e.vx, e.vy) * .07;
}

/* ---------- traffic ---------- */
/* Right-hand traffic. E-W road band k spans y in [k*384, k*384+96]: eastbound lane y+68, westbound y+28.
   N-S bands: southbound x+28, northbound x+68. Cars choose a turn on entering an intersection and
   commit when they cross the new lane's centre line. */
const BAND = PERIOD * TILE;
const laneFor = (dx, dy, base) => dx > 0 ? base + 68 : dx < 0 ? base + 28 : dy > 0 ? base + 28 : base + 68;
function aiCar(e, dt) {
  if (!e.driving || e.held || e.bossHeld) return;
  if (parkingTick(e, dt)) return;
  const inEW = (e.y % BAND) < 96, inNS = (e.x % BAND) < 96, inter = inEW && inNS;
  if (inter && !e.wasInter) {
    const cx = Math.floor(e.x / BAND) * BAND + 48, cy = Math.floor(e.y / BAND) * BAND + 48;
    const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([ox, oy]) => !(ox === -e.dx && oy === -e.dy) && walkable(cx + ox * 140, cy + oy * 140, 16) && roadAt(cx + ox * 140, cy + oy * 140));
    const straight = opts.find(o => o[0] === e.dx && o[1] === e.dy);
    e.plan = (straight && Math.random() < .55) ? null : (opts.filter(o => o !== straight).length ? pick(opts.filter(o => o !== straight)) : null);
    if (!straight && !e.plan) e.plan = [-e.dx, -e.dy];
  }
  e.wasInter = inter;
  if (inter && e.plan) {
    const [ndx, ndy] = e.plan;
    if (ndx === -e.dx && ndy === -e.dy) { e.dx = ndx; e.dy = ndy; e.plan = null; }
    else if (ndy !== 0) { const lx = laneFor(0, ndy, Math.floor(e.x / BAND) * BAND); if (Math.abs(e.x - lx) < 6) { e.x = lx; e.dx = 0; e.dy = ndy; e.plan = null; } }
    else { const ly = laneFor(ndx, 0, Math.floor(e.y / BAND) * BAND); if (Math.abs(e.y - ly) < 6) { e.y = ly; e.dx = ndx; e.dy = 0; e.plan = null; } }
  }
  // dead end (closed barricade / map edge): U-turn
  const look = 27 + e.r; if (!walkable(e.x + e.dx * look, e.y + e.dy * look, 12)) { e.dx = -e.dx; e.dy = -e.dy; e.plan = null; }
  let sp = 128 * (e.vs ? e.vs.spd : 1);
  e.blockT = e.blockT || 0;
  for (const o of act) {
    if (o === e || o.dead || o.static || o.held) continue;
    const rx = o.x - e.x, ry = o.y - e.y, fwd = rx * e.dx + ry * e.dy; if (fwd <= 0 || fwd > e.r + o.r + 34) continue;
    if (Math.abs(rx * e.dy - ry * e.dx) < (o.curb ? 14 : 15 + o.r * .5)) { sp = 0; break; }
  }
  if (sp === 0) { e.blockT += dt; if (e.blockT > 2.5) sp = 60; } else e.blockT = 0;
  let tvx = e.dx * sp, tvy = e.dy * sp;
  if (!inter || !e.plan) {
    if (e.dx !== 0) tvy = (laneFor(e.dx, 0, Math.floor(e.y / BAND) * BAND) - e.y) * 4;
    else tvx = (laneFor(0, e.dy, Math.floor(e.x / BAND) * BAND) - e.x) * 4;
  }
  const k = Math.min(1, dt * 4); e.vx += (tvx - e.vx) * k; e.vy += (tvy - e.vy) * k;
  if (Math.hypot(e.vx, e.vy) > 8) e.ang += angDiff(Math.atan2(e.vy, e.vx), e.ang) * Math.min(1, dt * 10);
}

/* ---------- per tick ---------- */
function updateAI(dt) {
  let threat = 0;
  for (const e of act) {
    if (e.dead) continue; e.flash -= dt;
    switch (e.kind) {
      case 'civ': aiCivilian(e, dt); break;
      case 'grunt': case 'brute': case 'sup': case 'boss': case 'cop': aiCombat(e, dt); if (e.tgt === P && dist2(e, P) < 520 * 520) threat += e.kind === 'boss' ? 4 : 1; break;
      case 'hideout': aiHideout(e, dt); break;
      case 'car': aiCar(e, dt); break;
    }
  }
  Audio2.setIntensity(threat / 4);
}
function updateBullets(dt) {
  for (const b of bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life <= 0 || solidAt(b.x, b.y)) { b.dead = true; if (b.life > 0) FX.sparks(b.x, b.y, 3, b.col, 120); continue; }
    if (P.absorbing && b.team !== 'player' && Math.hypot(b.x - P.x, b.y - P.y) < 28) { absorb(b.dmg * 1.5); b.dead = true; FX.flash(b.x, b.y, 30, '#9ff', .1); continue; }
    for (const e of act) {
      if (e.dead || e.prop || e.held) continue; if (Math.abs(e.x - b.x) > e.r + 5 || Math.abs(e.y - b.y) > e.r + 5) continue;
      let hit = false;
      if (b.team === 'gang') hit = e.team === 'player' || e.team === 'police' || (e.team === 'civ' && e.state !== 'wounded');
      else if (b.team === 'police') hit = (e.team === 'gang' && !e.static) || (e.team === 'player' && G.heat >= 1);
      else if (b.team === 'player') hit = e.team === 'gang' || (e.team === 'police' && !e.ally);
      if (hit && Math.hypot(e.x - b.x, e.y - b.y) < e.r + b.r) {
        if (e.kind === 'player' && !G.seen.absorb) showHint([{ a: 'abs' }, { t: 'Hold to absorb bullets, release to blast them back' }], 'absorb');
        hurt(e, b.dmg, { by: b.team === 'player' ? 'player' : b.by }); b.dead = true; FX.sparks(b.x, b.y, 4, b.col, 140);
        if (!e.static && e.kind !== 'player') { e.vx += b.vx * .08; e.vy += b.vy * .08; }
        break;
      }
    }
  }
  for (let i = bullets.length - 1; i >= 0; i--) if (bullets[i].dead) bullets.splice(i, 1);
  for (const z of zones) {
    z.t -= dt; if (Math.random() < dt * 6) FX.embers(z.x, z.y, 1);
    if (dist2(z, P) < (z.r + P.r) * (z.r + P.r)) { P.burnT = (P.burnT || 0) - dt; if (P.burnT <= 0) { P.burnT = .25; hurt(P, z.dmg * .25, { by: 'fire' }); } }
  }
  for (let i = zones.length - 1; i >= 0; i--) if (zones[i].t <= 0) zones.splice(i, 1);
  for (const w of warns) w.life -= dt; for (let i = warns.length - 1; i >= 0; i--) if (warns[i].life <= 0) warns.splice(i, 1);
}
