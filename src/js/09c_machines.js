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
  cell:    { r: 10, m: 3, hp: 20, team: 'prop', prop: 1, grab: 1, rest: .35, fric: .93, elec: 1 },
  hive:    { r: 13, m: 6, hp: 90, team: 'gang', static: 1, rest: .2, xp: 25 },
  scanner: { r: 8, m: 1, hp: 22, team: 'gang', rest: .4, grab: 1, xp: 10, speed: 70, hover: 30 },
  mirror:  { r: 9, m: 4, hp: 60, team: 'gang', static: 1, rest: .2, xp: 10 },
  vendbot: { r: 9, m: 4, hp: 40, team: 'bot', rest: .3, grab: 1, speed: 26 },
  fixer:   { r: 7, m: 1, hp: 20, team: 'bot', rest: .4, grab: 1, speed: 80, hover: 26 },
  panels:  { r: 14, m: 8, hp: 30, team: 'prop', prop: 1, static: 1, rest: .2 },
  wtank:   { r: 14, m: 10, hp: 70, team: 'prop', prop: 1, static: 1, rest: .2 },
  courier: { r: 9, m: 1.2, hp: 26, team: 'gang', rest: .4, grab: 1, xp: 14, speed: 120, hover: 60 }
});
const MACH = { sweeper: 1, zapper: 1, crawler: 1, sentry: 1, loader: 1, mite: 1, hive: 1, scanner: 1, mirror: 1, vendbot: 1, fixer: 1, courier: 1 };
const ZAP_COL = '#fff2b0', ZAP_HOT = '#ffffff';
const zaps = [];          // lightning drawn for a moment: { pts, life, max }
const hazards = [];       // downed power lines: { x0, y0, x1, y1, t, arc, warn }
const floods = [];        // water from a burst tank: { x, y, r, t, max }. Machines in it short out; electricity in it hits everyone standing in it
const inFlood = e => floods.some(f => Math.hypot(e.x - f.x, e.y - f.y) < f.r);
function floodShock(x, y, by) {   // electricity reaching water: everyone standing in that pool gets it
  for (const f of floods) { if (Math.hypot(x - f.x, y - f.y) > f.r + 30) continue;
    for (let i = 0; i < 5; i++) { const a = rnd(TAU), r = rnd(0, f.r); zapFx(f.x, f.y, f.x + Math.cos(a) * r, f.y + Math.sin(a) * r, .25); }
    for (const e of act) if (!e.dead && !e.static && !e.prop && Math.hypot(e.x - f.x, e.y - f.y) < f.r) { if (e.kind === 'player' && by === 'player') continue; hurt(e, 18, { by }); if (e.kind !== 'player' && !e.dead) { e.stun = Math.max(e.stun, 1.2); if (by === 'player') e.lastHitBy = 'player'; } } }
}

/* ---------- electricity ---------- */
function boltPts(x0, y0, x1, y1, n = 7, jag = 6) { const pts = [[x0, y0]]; for (let i = 1; i < n; i++) { const k = i / n; pts.push([lerp(x0, x1, k) + rnd(-jag, jag), lerp(y0, y1, k) + rnd(-jag, jag)]); } pts.push([x1, y1]); return pts; }
function zapFx(x0, y0, x1, y1, life = .16) { zaps.push({ pts: boltPts(x0, y0, x1, y1), life, max: life }); if (zaps.length > 40) zaps.shift(); }
// an electric burst: hurts and stuns everything nearby (props get shoved), sparks and a warm white flash
function elecBurst(x, y, r, dmg, by) {
  sfx('zap', x, y); sfx('boom', x, y, .5); shake(.4); hitstop(.04);
  FX.flash(x, y, r * 2.4, '#fff0c0', .4, 1); FX.ring(x, y, r, ZAP_COL, .3, 4); FX.sparks(x, y, 26, ZAP_COL, 380); FX.smoke(x, y, 4, '#4a4e58', 1);
  for (let i = 0; i < 6; i++) { const a = rnd(TAU), d = rnd(r * .4, r); zapFx(x, y, x + Math.cos(a) * d, y + Math.sin(a) * d, .22); }
  decals.push({ x, y, r: r * .4, life: 30, k: 'scorch' }); floodShock(x, y, by);
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
  if (k === 'vendbot') {   // a walking vending machine: trundles the pavement, stops for customers, and if you stand by it, hands you a drink (energy)
    if (e.scared > 0) { e.scared -= dt; steer(e, e.fx, e.fy, 70, dt); return; }
    const pd = P ? dist(P, e) : 1e9;
    if (pd < 34 && G.mode === 'play') { steer(e, 0, 0, 0, dt); face(e, Math.atan2(P.y - e.y, P.x - e.x), dt, 6); e.sell = (e.sell || 0) + dt;
      if (e.sell > 1.2 && e.cd <= 0) { e.cd = 25; e.sell = 0; pickups.push({ x: e.x + Math.cos(e.ang) * 12, y: e.y + Math.sin(e.ang) * 12, vx: 0, vy: 0, type: 'en', life: 20 }); sfx('pickup', e.x, e.y, .5); civSay(e, '☕', 1.4); }
      return; }
    e.sell = 0; let cust = 0; for (const o of act) if (o.kind === 'civ' && !o.dead && o.faceTo === e) cust++;
    if (cust) { steer(e, 0, 0, 0, dt); return; }
    wander(e, dt, e.speed, civWalk); face(e, Math.atan2(e.vy, e.vx), dt, 4);
    for (const o of act) if (o.kind === 'civ' && !o.dead && !(o.pauseT > 0) && o.role && o.role !== 'jogger' && !o.fixed && dist2(o, e) < 30 * 30 && Math.random() < dt * .3) { o.pauseT = rnd(2, 4); o.faceTo = e; civSay(o, '?', 1); }
    if (e.say) { e.say.t -= dt; if (e.say.t <= 0) e.say = null; }
    return;
  }
  if (k === 'fixer') {     // repair drone: flies to downed power lines and makes them safe for a while, otherwise tends the charging posts
    if (e.say) { e.say.t -= dt; if (e.say.t <= 0) e.say = null; }
    if (!e.job || e.job.done) {
      let best = null, bd = 900 * 900; for (const h of hazards) { if (h.safeT > 0) continue; const mx = (h.x0 + h.x1) / 2, my = (h.y0 + h.y1) / 2, d = (mx - e.x) ** 2 + (my - e.y) ** 2; if (d < bd) { bd = d; best = h; } }
      if (best) e.job = { h: best, x: (best.x0 + best.x1) / 2, y: (best.y0 + best.y1) / 2, t: 0 };
      else { const ks = streetFurniture().filter(f => f.k === 'kiosk' && Math.hypot(f.x - e.x, f.y - e.y) < 700); const kk = ks.length ? pick(ks) : null; e.job = kk ? { x: kk.x + 2, y: kk.y + 2, t: 0, kiosk: true } : { x: e.home.x + rnd(-200, 200), y: e.home.y + rnd(-200, 200), t: 0, kiosk: true }; }
    }
    const j = e.job, dx = j.x - e.x, dy = j.y - e.y, d = Math.hypot(dx, dy);
    if (d > 10) { steer(e, dx, dy, e.speed, dt, 4); face(e, Math.atan2(dy, dx), dt, 6); return; }   // flies straight over everything
    steer(e, 0, 0, 0, dt, 6); j.t += dt; if (Math.random() < dt * 8) FX.sparks(e.x, e.y, 2, '#ffd27a', 100);
    if (j.h && j.t > 4) { j.h.safeT = 60; j.h.arc = 0; j.done = true; civSay(e, '!', 1); }
    else if (j.kiosk && j.t > rnd(5, 9)) j.done = true;
    return;
  }
  if (k === 'sentry') {    // a turret on a post: sweeps, locks on, fires three-round bursts
    const on = P && dist(P, e.home || e) < (e.terr || 280) && dist(e, P) < 330 && G.mode !== 'dead';
    e.losT = (e.losT || 0) - dt; if (e.losT <= 0) { e.losT = .2; e.losC = on && los(e, P); }
    if (!on || !e.losC) { e.aimT = 0; e.ang += dt * .9; return; }
    e.ang += angDiff(Math.atan2(P.y - e.y, P.x - e.x), e.ang) * Math.min(1, dt * 7);
    if (e.aimT > 0) { e.aimT -= dt; if (e.aimT <= 0) { for (let i = 0; i < 3; i++) later(i * .11, () => { if (!e.dead) shoot(e, e.ang + rnd(-.07, .07), { dmg: 5, speed: 340, col: '#ffd27a' }); }); e.cd = 1.8 + rnd(.6); } }
    else if (e.cd <= 0 && takeTurn(Object.assign(e, { tgt: P }), 1.2)) e.aimT = .7;
    return;
  }
  if (k === 'hive') {      // a mite hive: a squat solar-topped box that releases mites while you are near
    const near = P && dist(P, e) < 300 && G.mode !== 'dead'; let n = 0; for (const o of act) if (!o.dead && o.kind === 'mite' && o.hiveOf === e.id) n++;
    if (near && n < 6 && e.cd <= 0) { e.cd = 1.4; const a = rnd(TAU), m = spawnGang('mite', e.x + Math.cos(a) * 16, e.y + Math.sin(a) * 16, { home: { x: e.x, y: e.y }, terr: 320, hiveOf: e.id }); m.tgt = P; m.provT = 8; FX.sparks(m.x, m.y, 4, ZAP_COL, 90); }
    return;
  }
  if (k === 'mirror') {    // heliostat: a mirror on a post that bounces sunlight into a burning spot that tracks you (not at night)
    if (LIGHT.name === 'night' || !P || dist(P, e) > 300 || G.mode === 'dead' || !los(e, P)) { e.beam = null; e.ang += dt * .3; return; }
    if (!e.beam) e.beam = { x: P.x, y: P.y, heat: 0 };
    const bm = e.beam; bm.x += (P.x - bm.x) * Math.min(1, dt * 1.2); bm.y += (P.y - bm.y) * Math.min(1, dt * 1.2); e.ang = Math.atan2(bm.y - e.y, bm.x - e.x);
    bm.heat = Math.min(1, bm.heat + dt * .6);
    if (bm.heat >= 1) { bm.tick = (bm.tick || 0) - dt; if (bm.tick <= 0) { bm.tick = .3; for (const o of act) if (!o.dead && !o.static && !o.prop && o.team !== 'bot' && Math.hypot(o.x - bm.x, o.y - bm.y) < 20 + o.r) { hurt(o, 5, { by: 'gang' }); FX.embers(o.x, o.y, 2); } } }
    return;
  }
  if (k === 'scanner') {   // corporate scanner: drifts on a patrol; when its cone finds you, everything nearby comes for you
    e.ang += angDiff(e.sweep || 0, e.ang) * Math.min(1, dt * 3); e.sweepT = (e.sweepT || 0) - dt; if (e.sweepT <= 0) { e.sweepT = rnd(1.2, 2.4); e.sweep = rnd(TAU); }
    wander(e, dt, e.speed * .6);
    const d = P ? dist(P, e) : 1e9, inCone = d < 170 && Math.abs(angDiff(Math.atan2(P.y - e.y, P.x - e.x), e.ang)) < .45 && G.mode !== 'dead' && los(e, P);
    e.spot = Math.max(0, Math.min(1, (e.spot || 0) + (inCone ? dt * 1.6 : -dt)));
    if (inCone) e.ang += angDiff(Math.atan2(P.y - e.y, P.x - e.x), e.ang) * Math.min(1, dt * 6);
    if (e.spot >= 1 && e.cd <= 0) { e.cd = 6; sfx('siren', e.x, e.y, .4); toast('Scanner alert', '#ff9a3a'); for (const o of act) if (!o.dead && o.team === 'gang' && !o.static && dist(o, e) < 420) { o.tgt = P; o.provT = 10; o.sight = Math.max(o.sight, 500); } }
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
    if (seen && d < 240 && e.cd <= 0 && takeTurn(e, 1.1)) { e.chargeT = .75; e.cang = Math.atan2(dy, dx); warnLine(e.x, e.y, e.cang, 250, 8, .75, ZAP_COL); sfx('charge', e.x, e.y, .5); }
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
    if (e.lungeT > 0) {   // the tell: it stops, its eye flashes for .4 s, then it lunges in a straight line
      e.lungeT -= dt; if (e.lungeT > .15) { steer(e, 0, 0, 0, dt, 12); return; }
      steer(e, e.lx, e.ly, e.speed * 2.2, dt, 14);
      if (d < e.r + t.r + 4) { if (t === P && P.absorbing) absorb(4); else hurt(t, 5, { by: 'gang', src: e }); FX.sparks(t.x, t.y, 4, ZAP_COL, 140); sfx('zap', e.x, e.y, .3); e.lungeT = 0; e.cd = 1.4; e.dartT = .5; const a = rnd(TAU); e.fx = Math.cos(a); e.fy = Math.sin(a); }
      if (e.lungeT <= 0 && e.dartT <= 0) { e.cd = 1; e.dartT = .3; e.fx = -e.lx; e.fy = -e.ly; }
      return;
    }
    face(e, Math.atan2(dy, dx), dt, 14);
    if (d > 70) steer(e, dx + rnd(-30, 30), dy + rnd(-30, 30), e.speed, dt, 10); else steer(e, -dy * (e.id % 2 ? 1 : -1), dx * (e.id % 2 ? 1 : -1), e.speed * .7, dt, 8);   // circles at a little distance
    if (d < 70 && e.cd <= 0 && takeTurn(e, .8)) { e.lungeT = .55; e.lx = dx / d; e.ly = dy / d; warnLine(e.x, e.y, Math.atan2(dy, dx), 80, 10, .4, ZAP_COL); sfx('charge', e.x, e.y, .25); }
    return;
  }
  if (k === 'loader') { e.tgt = t; aiBrute(e, dt); return; }
  if (k === 'courier') {   // rogue delivery drone: circles high, then marks a spot on you and drops its parcel (a small blast)
    if (e.dropT > 0) { e.dropT -= dt; steer(e, e.dx - e.x, e.dy - e.y, e.speed * 1.4, dt, 6); if (e.dropT <= 0) { explosion(e.dx, e.dy, 52, 18, 'gang'); e.cd = 3.2; e.parcel = false; later(2.4, () => { if (!e.dead) e.parcel = true; }); } return; }
    face(e, Math.atan2(dy, dx), dt, 6); e.orb = e.orb || (Math.random() < .5 ? 1 : -1);
    if (d > 160) chase(e, t, e.speed, dt); else steer(e, -dy * e.orb + dx * .2, dx * e.orb + dy * .2, e.speed * .8, dt);
    if (e.parcel !== false && d < 220 && e.cd <= 0 && takeTurn(e, 1.2)) { e.dx = t.x + (t.vx || 0) * .5; e.dy = t.y + (t.vy || 0) * .5; e.dropT = .9; warnCircle(e.dx, e.dy, 52, .9, '#ff9a3a'); sfx('charge', e.x, e.y, .4); }
    return;
  }   // a heavy walker: slams and charges like a brute
}

/* ---------- downed power lines ---------- */
function updateHazards(dt) {
  for (const h of hazards) {
    if (Math.abs((h.x0 + h.x1) / 2 - P.x) > ACTIVE_R || Math.abs((h.y0 + h.y1) / 2 - P.y) > ACTIVE_R) continue;
    if (h.safeT > 0) { h.safeT -= dt; h.arc = 0; continue; }   // patched by a repair drone for a while
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
  for (const f of floods) { f.t -= dt; f.tick = (f.tick || 0) - dt; if (f.tick <= 0) { f.tick = .5; for (const e of act) if (!e.dead && MACH[e.kind] && e.team !== 'bot' && !e.static && Math.hypot(e.x - f.x, e.y - f.y) < f.r && !(e.def.hover)) { hurt(e, 6, { by: e.lastHitBy === 'player' ? 'player' : 'world' }); e.stun = Math.max(e.stun, .6); FX.sparks(e.x, e.y, 4, ZAP_COL, 120); } } }
  for (let i = floods.length - 1; i >= 0; i--) if (floods[i].t <= 0) floods.splice(i, 1);
  for (const h of hazards) if (h.arc > 0 && Math.random() < dt * 4) floodShock(h.x1, h.y1, 'world');   // a live cable lying in a flood
  for (const z of zaps) z.life -= dt; for (let i = zaps.length - 1; i >= 0; i--) if (zaps[i].life <= 0) zaps.splice(i, 1);
}

/* ---------- where it all goes ---------- */
function populateMachines() {
  hazards.length = 0; zaps.length = 0;
  for (let d = 0; d < 3; d++) for (let i = 0; i < [6, 4, 7][d]; i++) { const p = randomInDistrict(d, t => t === T.WALK, 10); if (p) mk('sweeper', p.x, p.y, { col: '#e0a030' }); }
  for (let d = 0; d < 3; d++) for (let i = 0; i < [4, 3, 5][d]; i++) { const p = randomInDistrict(d, t => t === T.WALK, 10); if (p) mk('vendbot', p.x, p.y, { col: pick(['#c8452e', '#2e7a5a', '#3a6aa8']), home: p }); }
  for (let d = 0; d < 3; d++) for (let i = 0; i < 2; i++) { const p = randomInDistrict(d, t => t === T.ROAD, 10); if (p) mk('fixer', p.x, p.y, { home: p }); }
  floods.length = 0;
  for (const b of blocks) { const r = mulberry(hash2(b.x + 3, b.y + 9)), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    if ((b.kind === 'lot' || b.kind === 'yard' || b.kind === 'hide') && r() < .8) { const p = findFree(cx + rnd(-90, 90), b.y + b.h - 50, 40, 16); if (p) mk('panels', p.x, p.y, { ang: r() < .5 ? 0 : Math.PI / 2 }); }   // stacks of spare solar panels standing on edge
    if ((b.kind === 'park' || b.kind === 'yard' || b.kind === 'court') && r() < .55) { const p = findFree(cx + rnd(-70, 70), cy + rnd(-70, 70), 50, 16); if (p) mk('wtank', p.x, p.y, { ang: 0 }); }   // street water tanks
  }
  for (let d = 0; d < 3; d++) for (let i = 0; i < [1, 2, 3][d]; i++) { const p = randomInDistrict(d, t => t === T.ROAD, 10); if (p && dist(p, START) > 500) spawnGang('courier', p.x, p.y, { home: p, terr: 360 }); }   // rogue couriers
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
  for (const b of blocks) {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    if (b.kind === 'park' && (b.d === 1 || hash2(b.x, b.y) % 3 === 0)) { const p = findFree(cx + 50, cy + 50, 40, 14); if (p) spawnGang('hive', p.x, p.y, { home: p, terr: 300 }); }   // mite hives in overgrown parks
    if (b.kind === 'court' || (b.kind === 'boss' && b.d === 2)) for (const [ox, oy] of [[-120, -120], [120, 120]]) { const p = findFree(cx + ox, cy + oy, 30, 10); if (p) spawnGang('mirror', p.x, p.y, { home: p, terr: 300 }); }   // heliostats round open courts
  }
  for (let d = 0; d < 3; d++) for (let i = 0; i < [2, 1, 4][d]; i++) { const p = randomInDistrict(d, t => t === T.ROAD || t === T.WALK, 10); if (p && dist(p, START) > 400) spawnGang('scanner', p.x, p.y, { home: p, terr: 600 }); }   // scanners patrol, most in the Tower
  // downed power lines: a lamp knocked over, its cable live on the ground (mostly in the Slums)
  const pool = lamps.filter(l => l.d === 1 || Math.random() < .25); for (let i = 0; i < 9 && pool.length; i++) {
    const l = pool.splice((Math.random() * pool.length) | 0, 1)[0], a = rnd(TAU), x1 = l.x + Math.cos(a) * 46, y1 = l.y + Math.sin(a) * 46;
    if (!walkable(x1, y1, 4) || dist(l, START) < 300) continue;
    l.broken = true; hazards.push({ x0: l.x, y0: l.y, x1, y1, t: rnd(1, 4), arc: 0 });
  }
}
