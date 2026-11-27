/* ============================== 09c MACHINES AND HAZARDS ============================== */
/* The world's home-made and corporate tech (see HANDOFF "world's flavour"): solar street sweepers, hired drones and
   crawlers, sentry posts, a loader mech, mite swarms, battery banks and downed power lines. Drawing is in 11k.
   Enemies use team 'gang' so the usual rules apply (they defend a turf, police fight them, you get XP); the sweepers
   are team 'bot': nobody's side, no karma either way. Electricity is pale yellow-white, never neon blue. */
Object.assign(DEFS, {
  sweeper: { r: 8, m: 2.5, hp: 30, team: 'bot', rest: .3, grab: 1, speed: 34 },
  zapper:  { r: 9, m: 1.2, hp: 30, team: 'gang', rest: .4, grab: 1, xp: 15, speed: 95, hover: 22 },
  crawler: { r: 9, m: 2, hp: 26, team: 'gang', rest: .3, grab: 1, xp: 12, speed: 150 },
  sentry:  { r: 10, m: 4, hp: 70, team: 'gang', static: 1, rest: .2, xp: 15 },
  loader:  { r: 16, m: 9, hp: 170, team: 'gang', rest: .15, xp: 35, speed: 66 },
  mite:    { r: 5, m: .5, hp: 9, team: 'gang', rest: .5, grab: 1, xp: 4, speed: 190, hover: 12 },
  cell:    { r: 10, m: 3, hp: 20, team: 'prop', prop: 1, grab: 1, rest: .35, fric: .93, elec: 1 }
});
const MACH = { sweeper: 1, zapper: 1, crawler: 1, sentry: 1, loader: 1, mite: 1 };
const ZAP_COL = '#fff2b0', ZAP_HOT = '#ffffff';
const zaps = [];          // lightning drawn for a moment: { pts, life, max }
const hazards = [];       // downed power lines: { x0, y0, x1, y1, t, arc, warn }

/* ---------- electricity ---------- */
function boltPts(x0, y0, x1, y1, n = 7, jag = 6) { const pts = [[x0, y0]]; for (let i = 1; i < n; i++) { const k = i / n; pts.push([lerp(x0, x1, k) + rnd(-jag, jag), lerp(y0, y1, k) + rnd(-jag, jag)]); } pts.push([x1, y1]); return pts; }
function zapFx(x0, y0, x1, y1, life = .16) { zaps.push({ pts: boltPts(x0, y0, x1, y1), life, max: life }); if (zaps.length > 40) zaps.shift(); }
// an electric burst: hurts and stuns everything nearby (props get shoved), sparks and a warm white flash
function elecBurst(x, y, r, dmg, by) {
  sfx('zap', x, y); sfx('boom', x, y, .5); shake(.4); hitstop(.04);
  FX.flash(x, y, r * 2.4, '#fff0c0', .4, 1); FX.ring(x, y, r, ZAP_COL, .3, 4); FX.sparks(x, y, 26, ZAP_COL, 380); FX.smoke(x, y, 4, '#4a4e58', 1);
  for (let i = 0; i < 6; i++) { const a = rnd(TAU), d = rnd(r * .4, r); zapFx(x, y, x + Math.cos(a) * d, y + Math.sin(a) * d, .22); }
  decals.push({ x, y, r: r * .4, life: 30, k: 'scorch' });
  for (const e of act) {
    if (e.dead || e.static || e.held) continue;
    if (e.kind === 'player' && by === 'player') continue;
    const d = Math.hypot(e.x - x, e.y - y); if (d > r + e.r) continue;
    const f = 1 - clamp(d / r, 0, 1) * .6, a = Math.atan2(e.y - y, e.x - x), k = 260 / Math.sqrt(e.m);
    e.vx += Math.cos(a) * k * f; e.vy += Math.sin(a) * k * f;
    if (e.prop) { if (e.kind === 'cell' && e !== P.holding) later(.12, () => { if (!e.dead) kill(e, { by }); }); continue; }   // batteries set each other off
    hurt(e, dmg * f, { by }); if (e.kind !== 'player' && !e.dead) { e.stun = Math.max(e.stun, 1.1 * f); e.flung = true; if (by === 'player') e.lastHitBy = 'player'; }
  }
}

/* ---------- AI ---------- */
function machTarget(e) {
  e.tgtT -= STEP; if (e.tgtT > 0) return e.tgt;
  e.tgtT = .4 + Math.random() * .2; const n = nearestHostile(e, e.sight); if (n) e.tgt = n; else if (e.tgt && (e.tgt.dead || !isHostile(e, e.tgt))) e.tgt = null;
  if (e.tgt === P && G.mode === 'dead') e.tgt = null; return e.tgt;
}
function goHome(e, dt) { const h = e.home; if (h && dist(e, h) > 90) { steer(e, h.x - e.x, h.y - e.y, e.speed * .6, dt); face(e, Math.atan2(h.y - e.y, h.x - e.x), dt, 6); } else wander(e, dt, e.speed * .35); }
function aiMachine(e, dt) {
  e.cd -= dt; e.t += dt; if (e.provT > 0) e.provT -= dt;
  if (e.state === 'grabbed') return;
  if (e.stun > 0) { e.stun -= dt; if (!(e.kind === 'crawler' && e.state === 'arm')) { e.state = ''; e.chargeT = 0; e.aimT = 0; return; } }   // an armed crawler still goes off
  e.walk += dt * Math.hypot(e.vx, e.vy) * .07;
  const k = e.kind;
  if (k === 'sweeper') {   // trundles along the pavement; scoots away from trouble
    if (e.scared > 0) { e.scared -= dt; steer(e, e.fx, e.fy, 120, dt); face(e, Math.atan2(e.fy, e.fx), dt, 8); return; }
    wander(e, dt, e.speed, civWalk); face(e, Math.atan2(e.vy, e.vx), dt, 4);
    if (Math.random() < dt * .8) FX.dust(e.x + Math.cos(e.ang) * 8, e.y + Math.sin(e.ang) * 8, 1, '#6a6458');
    return;
  }
  if (k === 'sentry') {    // a turret on a post: sweeps, locks on, fires three-round bursts
    const on = P && dist(P, e.home || e) < (e.terr || 280) && dist(e, P) < 330 && G.mode !== 'dead';
    e.losT = (e.losT || 0) - dt; if (e.losT <= 0) { e.losT = .2; e.losC = on && los(e, P); }
    if (!on || !e.losC) { e.aimT = 0; e.ang += dt * .9; return; }
    e.ang += angDiff(Math.atan2(P.y - e.y, P.x - e.x), e.ang) * Math.min(1, dt * 7);
    if (e.aimT > 0) { e.aimT -= dt; if (e.aimT <= 0) { for (let i = 0; i < 3; i++) later(i * .11, () => { if (!e.dead) shoot(e, e.ang + rnd(-.07, .07), { dmg: 5, speed: 340, col: '#ffd27a' }); }); e.cd = 1.8 + rnd(.6); } }
    else if (e.cd <= 0) e.aimT = .6;
    return;
  }
  const t = machTarget(e);
  if (!t) { e.chargeT = 0; if (e.state !== 'arm') e.state = ''; goHome(e, dt); return; }
  const dx = t.x - e.x, dy = t.y - e.y, d = Math.hypot(dx, dy) || 1, seen = seesTarget(e);
  if (k === 'zapper') {    // keeps its distance, circles, charges a bolt (you see the line), then lightning
    face(e, Math.atan2(dy, dx), dt, 10);
    if (e.chargeT > 0) {
      e.chargeT -= dt; steer(e, 0, 0, 0, dt, 5);
      if (e.chargeT <= 0) {
        const a = e.cang, R = 250; let hit = null, hd = R;
        for (const o of act) { if (o === e || o.dead || o.static || !(o.team === 'player' || o.team === 'police')) continue; const px = o.x - e.x, py = o.y - e.y, along = px * Math.cos(a) + py * Math.sin(a), off = Math.abs(-px * Math.sin(a) + py * Math.cos(a)); if (along > 0 && along < hd && off < o.r + 6) { hd = along; hit = o; } }
        const wall = raycast(e.x, e.y, Math.cos(a), Math.sin(a), R); if (wall < hd) hit = null;
        const L = hit ? hd : Math.min(R, wall); zapFx(e.x, e.y - 4, e.x + Math.cos(a) * L, e.y + Math.sin(a) * L); sfx('zap', e.x, e.y);
        if (hit) { if (hit === P && P.absorbing) absorb(14); else hurt(hit, 14, { by: 'gang', src: e }); FX.sparks(hit.x, hit.y, 10, ZAP_COL, 220); }
        e.cd = 1.9 + rnd(.8);
      }
      return;
    }
    e.orb = e.orb || (Math.random() < .5 ? 1 : -1); if (Math.random() < dt * .3) e.orb *= -1;
    if (!seen || d > 230) chase(e, t, e.speed, dt); else if (d < 130) steer(e, -dx, -dy, e.speed, dt); else steer(e, -dy * e.orb, dx * e.orb, e.speed * .7, dt);
    if (seen && d < 240 && e.cd <= 0) { e.chargeT = .75; e.cang = Math.atan2(dy, dx); warnLine(e.x, e.y, e.cang, 250, 8, .75, ZAP_COL); sfx('charge', e.x, e.y, .5); }
    return;
  }
  if (k === 'crawler') {   // runs at you on four legs; close enough, it arms its battery and bursts
    if (e.state === 'arm') { e.stateT -= dt; steer(e, 0, 0, 0, dt, 8); if (e.stateT <= 0) { e.hp = 0; kill(e, { by: 'gang' }); } return; }
    face(e, Math.atan2(dy, dx), dt, 10); chase(e, t, e.speed, dt);
    if (d < 58) { e.state = 'arm'; e.stateT = .85; warnCircle(e.x, e.y, 72, .85, ZAP_COL); sfx('charge', e.x, e.y, .6); }
    return;
  }
  if (k === 'mite') {      // darts in, nips, darts out
    e.dartT = (e.dartT || 0) - dt;
    if (e.dartT > 0) { steer(e, e.fx, e.fy, e.speed * 1.1, dt, 12); return; }
    face(e, Math.atan2(dy, dx), dt, 14); steer(e, dx + rnd(-30, 30), dy + rnd(-30, 30), e.speed, dt, 10);
    if (d < e.r + t.r + 4 && e.cd <= 0) { if (t === P && P.absorbing) absorb(4); else hurt(t, 4, { by: 'gang', src: e }); FX.sparks(t.x, t.y, 4, ZAP_COL, 140); sfx('zap', e.x, e.y, .3); e.cd = .9; e.dartT = .45; const a = rnd(TAU); e.fx = Math.cos(a); e.fy = Math.sin(a); }
    return;
  }
  if (k === 'loader') { e.tgt = t; aiBrute(e, dt); return; }   // a heavy walker: slams and charges like a brute
}

/* ---------- downed power lines ---------- */
function updateHazards(dt) {
  for (const h of hazards) {
    if (Math.abs((h.x0 + h.x1) / 2 - P.x) > ACTIVE_R || Math.abs((h.y0 + h.y1) / 2 - P.y) > ACTIVE_R) continue;
    h.t -= dt;
    if (h.arc > 0) {
      h.arc -= dt; h.tick = (h.tick || 0) - dt;
      if (Math.random() < dt * 30) { const k = Math.random(), x = lerp(h.x0, h.x1, k), y = lerp(h.y0, h.y1, k); zapFx(x, y, x + rnd(-22, 22), y + rnd(-22, 22), .1); }
      if (h.tick <= 0) { h.tick = .25;
        for (const e of act) { if (e.dead || e.static || e.prop || e.team === 'civ' || e.team === 'bot' || e.held) continue; const vx = h.x1 - h.x0, vy = h.y1 - h.y0, L2 = vx * vx + vy * vy, k = clamp(((e.x - h.x0) * vx + (e.y - h.y0) * vy) / L2, 0, 1), d = Math.hypot(h.x0 + vx * k - e.x, h.y0 + vy * k - e.y);
          if (d < 20 + e.r) { hurt(e, 6, { by: e.kind === 'player' ? 'world' : (e.lastHitBy === 'player' && e.flung ? 'player' : 'world') }); if (e.kind !== 'player' && !e.dead) e.stun = Math.max(e.stun, .5); FX.sparks(e.x, e.y, 4, ZAP_COL, 160); } }
      }
      if (h.arc <= 0) h.t = rnd(2.2, 4.2);
    } else if (h.t <= 0) { h.arc = .9; sfx('zap', (h.x0 + h.x1) / 2, (h.y0 + h.y1) / 2, .7); }
  }
  for (const z of zaps) z.life -= dt; for (let i = zaps.length - 1; i >= 0; i--) if (zaps[i].life <= 0) zaps.splice(i, 1);
}

/* ---------- where it all goes ---------- */
function populateMachines() {
  hazards.length = 0; zaps.length = 0;
  for (let d = 0; d < 3; d++) for (let i = 0; i < [6, 4, 7][d]; i++) { const p = randomInDistrict(d, t => t === T.WALK, 10); if (p) mk('sweeper', p.x, p.y, { col: '#e0a030' }); }
  for (const b of blocks) {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, d = b.d, home = { x: cx, y: cy };
    if (b.kind === 'yard') {   // the machine yard: a loader and its crawlers
      let p = findFree(cx, b.y + b.h + 40, 40, 18); if (p) spawnGang('loader', p.x, p.y, { home: { x: cx, y: b.y + b.h + 40 }, terr: 260 });   // too big for the fence gaps: it guards the yard from the street
      for (let i = 0; i < 2 + (d > 0 ? 1 : 0); i++) { p = findFree(cx, cy + 40, 90, 10); if (p) spawnGang('crawler', p.x, p.y, { home, terr: 230 }); }
      for (let i = 0; i < 2; i++) { p = findFree(cx + rnd(-60, 60), cy + rnd(-60, 60), 60, 12); if (p) mk('cell', p.x, p.y, { ang: rnd(TAU) }); }
    } else if (b.kind === 'lot') {   // spark drones keep watch over the car parks
      for (let i = 0; i < 1 + d; i++) { const p = findFree(cx + rnd(-50, 50), cy, 70, 10); if (p) spawnGang('zapper', p.x, p.y, { home, terr: 260 }); }
    } else if (b.kind === 'hide') {  // a sentry post by every hideout gate (it does not hold the gate shut)
      const p = findFree(cx + (b.bx % 2 ? -70 : 70), b.y + b.h - 40, 40, 12); if (p) spawnGang('sentry', p.x, p.y, { home: { x: cx, y: cy + 60 }, terr: 290, ang: Math.PI / 2 });
    }
  }
  for (let d = 0; d < 3; d++) for (let i = 0; i < [3, 3, 2][d]; i++) { const p = randomInDistrict(d, t => t === T.WALK || t === T.PLAZA, 12); if (p) mk('cell', p.x, p.y, { ang: rnd(TAU) }); }
  // downed power lines: a lamp knocked over, its cable live on the ground (mostly in the Slums)
  const pool = lamps.filter(l => l.d === 1 || Math.random() < .25); for (let i = 0; i < 9 && pool.length; i++) {
    const l = pool.splice((Math.random() * pool.length) | 0, 1)[0], a = rnd(TAU), x1 = l.x + Math.cos(a) * 46, y1 = l.y + Math.sin(a) * 46;
    if (!walkable(x1, y1, 4) || dist(l, START) < 300) continue;
    l.broken = true; hazards.push({ x0: l.x, y0: l.y, x1, y1, t: rnd(1, 4), arc: 0 });
  }
}
