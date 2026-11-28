/* ============================== 07 COMBAT / STATE / FEEDBACK ============================== */
const G = {
  mode: 'title', time: 0, karma: 0, xp: 0, level: 1, points: 0, heat: 0, heatT: 0, shards: 0, shardIds: [], kills: 0, civKills: 0, saves: 0,
  combo: 0, comboT: 0, comboBest: 0, hitstop: 0, slowT: 0, flash: 0, flashCol: '#fff', civHitT: 0, encT: 26, copT: 3, allyT: 8, tribT: 10,
  toasts: [], boss: null, marker: null, check: { x: 60, y: 60 }, deadT: 0, curD: 0, finished: false, hint: null, hintT: 0, seen: {}, started: false
};
const DS = [0, 1, 2].map(i => ({ i, hideoutsLeft: 3, bossAlive: false, bossDone: false, status: 'enemy', intro: i === 0 }));
const gatesOpen = [false, false];
const dlights = [];

function later(sec, fn) { timers.push({ t: sec, fn }); }
function toast(text, col = '#e8ecf7', big = false) { G.toasts.push({ text, col, life: big ? 3.6 : 2.8, max: big ? 3.6 : 2.8, big }); if (G.toasts.length > 4) G.toasts.shift(); }
function floatText(x, y, text, col = '#fff', size = 1) { texts.push({ x, y, text: String(text), col, life: .9, max: .9, size, vy: -46 }); if (texts.length > 70) texts.shift(); }

/* ---------- particles & lights ---------- */
const FX = {
  sparks(x, y, n, col, sp = 220) { for (let i = 0; i < n; i++) { const a = rnd(TAU), s = rnd(.3, 1) * sp; parts.push({ k: 's', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(.15, .4), max: .4, col, w: rnd(1, 2) }); } },
  dots(x, y, n, col, sp = 120, life = .6) { for (let i = 0; i < n; i++) { const a = rnd(TAU), s = rnd(.2, 1) * sp; parts.push({ k: 'd', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(.3, 1) * life, max: life, col, w: rnd(1.5, 3) }); } },
  dust(x, y, n, col = '#8a8fa0') { for (let i = 0; i < n; i++) { const a = rnd(TAU), s = rnd(10, 70); parts.push({ k: 'm', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(.4, .9), max: .9, col, w: rnd(4, 9), g: 1.6 }); } },
  smoke(x, y, n, col = '#3a3d48', big = 1) { for (let i = 0; i < n; i++) { const a = rnd(TAU), s = rnd(5, 40) * big; parts.push({ k: 'm', x: x + rnd(-6, 6), y: y + rnd(-6, 6), vx: Math.cos(a) * s, vy: Math.sin(a) * s - 10, life: rnd(.8, 1.8), max: 1.8, col, w: rnd(8, 16) * big, g: 2.2 }); } },
  debris(x, y, n, col, sp = 200) { for (let i = 0; i < n; i++) { const a = rnd(TAU), s = rnd(.3, 1) * sp; parts.push({ k: 'r', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(.5, 1.1), max: 1.1, col, w: rnd(2, 5), a: rnd(TAU), va: rnd(-14, 14) }); } },
  embers(x, y, n) { for (let i = 0; i < n; i++) parts.push({ k: 'd', x: x + rnd(-8, 8), y: y + rnd(-8, 8), vx: rnd(-20, 20), vy: rnd(-60, -15), life: rnd(.5, 1.2), max: 1.2, col: pick(['#ffb040', '#ff7020', '#ffd080']), w: rnd(1, 2.2) }); },
  fire(x, y, rad) {   // the body of an explosion: puffs that rise and cool (drawn in 11j_fx.js)
    const n = Math.round(clamp(rad / 6, 8, 20)), w0 = clamp(rad / 10, 4, 11);
    for (let i = 0; i < n; i++) { const a = rnd(TAU), d = Math.sqrt(Math.random()) * rad * .34, s = rnd(8, 55), life = rnd(.32, .78); parts.push({ k: 'f', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, z: rnd(0, 8), vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rnd(18, 58), life, max: life * rnd(1, 1.25), w: w0 * rnd(.45, 1) * (1 - d / rad) }); }
    parts.push({ k: 'f', x, y, z: 4, vx: 0, vy: 0, vz: 30, life: .5, max: .5, w: w0 * 1.25, heart: 1 });   // the heart of it
  },
  ring(x, y, max, col, life = .35, w = 3, r0 = 4) { rings.push({ x, y, r: r0, max, col, life, ml: life, w }); },
  flash(x, y, r, col, life = .15, a = 1) { dlights.push({ x, y, r, col, life, max: life, a }); if (dlights.length > 60) dlights.shift(); }
};

/* ---------- feel: hitstop, shake, rumble ---------- */
function hitstop(s) { G.hitstop = Math.max(G.hitstop, s); }
function shake(t) { cam.trauma = Math.min(1, cam.trauma + t * (SETTINGS.shake ? 1 : .2)); }
function impactFeedback(dmg, x, y, byP) {
  if (dmg >= 12) hitstop(Math.min(.09, .02 + dmg * .0007));
  shake(Math.min(.55, dmg * .009));
  if (byP) Input.rumble(Math.min(1, .15 + dmg * .012), Math.min(1, .3 + dmg * .01), 80 + dmg * 1.6);
  FX.sparks(x, y, Math.min(18, 4 + dmg * .25) | 0, '#ffe2b0', 160 + dmg * 4);
  FX.flash(x, y, 40 + dmg * 1.2, '#ffcf90', .12, .8);
  sfx(dmg > 35 ? 'heavy' : 'hit', x, y, Math.min(1, .5 + dmg * .02));
}

/* ---------- karma / heat / xp ---------- */
function karmaColor(k = G.karma) { return k >= 0 ? mix('#d8dfee', '#38d0ff', k / 100) : mix('#d8dfee', '#ff3355', -k / 100); }
/* KARMA (inFamous-style): everyday acts nudge it by tiny amounts, so a few accidents in a fight don't
   flip who you are. Going from fully good to fully evil takes hundreds of deliberate acts. Big swings are
   reserved for big moments (future missions and choices). Internal range is -100..100; shown x10. */
const KARMA = { civHit: -.05, civKill: -.4, drain: -.3, heal: .4, copKill: -.5, allyKill: -1 };
function karmaTier(k = G.karma) { return k >= 60 ? 'HERO' : k >= 20 ? 'GOOD' : k > -20 ? 'NEUTRAL' : k > -60 ? 'BAD' : 'INFAMOUS'; }
function karmaAdd(n) {
  const t0 = karmaTier(); G.karma = clamp(G.karma + n, -KARMA_MAX, KARMA_MAX);
  if (P && Math.abs(n) >= 5) floatText(P.x, P.y - 28, (n > 0 ? '+' : '') + Math.round(n) + ' KARMA', n > 0 ? '#38d0ff' : '#ff3355', 1);
  const t1 = karmaTier();
  if (t0 !== t1) { toast('You are now: ' + t1, n > 0 ? '#38d0ff' : '#ff3355', true); sfx(n > 0 ? 'good' : 'bad'); }
}
function heatAdd(n) { const before = Math.floor(G.heat); G.heat = clamp(G.heat + n, 0, 5); if (n > 0) G.heatT = 0; if (Math.floor(G.heat) > before && G.heat >= 1) sfx('siren'); }
const xpNeed = () => 60 + G.level * 45;
function comboMult() { return 1 + Math.min(4, Math.floor(G.combo / 3)); }
function addXP(n, x, y) {
  n = Math.round(n * comboMult()); G.xp += n;
  if (P && n > 0) floatText(x !== undefined ? x : P.x + 12, (y !== undefined ? y : P.y) - 34, '+' + n + ' XP', '#ffc24a', .85);
  while (G.xp >= xpNeed()) {
    G.xp -= xpNeed(); G.level++; G.points++; P.hp = Math.min(S.maxHp, P.hp + S.maxHp * .35);
    toast('Level ' + G.level + '  ·  +1 skill point', '#ffc24a', true); sfx('level'); FX.ring(P.x, P.y, 120, '#ffc24a', .6, 3);
    showHint([{ a: 'menu' }, { t: 'Spend skill points' }], 'skillpt');
    saveGame();
  }
}
function comboHit() { G.combo++; G.comboT = 3.5; G.comboBest = Math.max(G.comboBest, G.combo); }

/* ---------- absorb / explosions ---------- */
function absorb(amount) {
  P.charge = Math.min(S.absCap, P.charge + amount); sfx('absorb', P.x, P.y); FX.dots(P.x, P.y, 3, '#9ff', 60, .4);
  if (S.g_guard) P.hp = Math.min(S.maxHp, P.hp + amount * .5 * S.g_guard);
  Input.rumble(.1, .35, 60);
}
function explosion(x, y, rad, dmg, by) {
  sfx('boom', x, y); shake(.7); hitstop(.06);
  if (by === 'player' || dist({ x, y }, P) < 300) Input.rumble(.9, .7, 260);
  FX.flash(x, y, rad * 3.2, '#ff9a40', .45, 1.2); FX.ring(x, y, rad * 1.1, '#ffb060', .3, 5);
  FX.smoke(x, y, 10, '#454852', 1.6); FX.fire(x, y, rad);
  FX.dots(x, y, 26, '#ffb030', 260, .7); FX.dots(x, y, 12, '#ff5020', 180, .6); FX.sparks(x, y, 18, '#ffe0a0', 420); FX.debris(x, y, 10, '#555a66', 300);
  decals.push({ x, y, r: rad * .55, life: 40, k: 'scorch' }); if (decals.length > 60) decals.shift();
  for (const e of act) {
    if (e.dead || (e.static && e.kind !== 'hideout' && e.kind !== 'tower')) continue;
    if (e.kind === 'player' && by === 'player') continue;
    if (by === 'boss' && e.team === 'gang') continue;
    const d = Math.hypot(e.x - x, e.y - y); if (d > rad + e.r) continue;
    const f = 1 - clamp(d / rad, 0, 1) * .7;
    if (!e.static) {
      const a = Math.atan2(e.y - y, e.x - x), k = 520 * f / Math.sqrt(e.m); e.vx += Math.cos(a) * k; e.vy += Math.sin(a) * k; e.vz = 160 * f;
      if (!e.prop) { e.stun = Math.max(e.stun, .7); e.flung = true; if (by === 'player') e.lastHitBy = 'player'; }
      else if (!e.held) { e.thrower = by === 'player' ? 'player' : e.thrower; e.thrownT = .8; e.driving = false; }
    }
    hurt(e, dmg * f, { by, boom: true });
  }
}

/* ---------- damage & death ---------- */
function hurt(e, dmg, info) {
  info = info || {};
  if (e.dead || dmg <= 0) return;
  if (e.kind === 'hideout') return;   // main gang bases can't be destroyed from outside; you clear them by going in
  const by = info.by;
  if (e.kind === 'player') {
    if (e.dashT > 0 || e.invT > 0 || G.mode === 'dead' || G.mode === 'dialog') return;
    if (e.absorbing) { const a = dmg * .85; absorb(a); dmg -= a; }
    if (dmg < .05) return;
    e.hp -= dmg; e.flash = .15; e.sinceHit = 0; shake(.25 + dmg * .01); sfx('hurt');
    Input.rumble(.5, .8, 140); G.flash = Math.min(.35, G.flash + dmg * .012); G.flashCol = '#ff2040';
    if (e.hp <= 0) playerDie();
    return;
  }
  if (e.kind === 'boss' && e.stagger > 0) dmg *= 1.75;
  if (window.__dbgBoss && e.kind === 'boss') window.__dbgBoss.push([by, Math.round(dmg), info.src && info.src.kind, info.src && info.src.thrower]);
  if (by === 'player') e.lastHitBy = 'player';
  e.hp -= dmg; e.flash = .1; e.sinceHit = 0;
  if (by === 'player' && !e.prop) { // accumulate small hits so numbers don't stack into noise
    e.dmgAcc = (e.dmgAcc || 0) + dmg;
    if (e.dmgAcc >= 3 && G.time - (e.dmgT || 0) > .12) { const v = e.dmgAcc; e.dmgAcc = 0; e.dmgT = G.time; floatText(e.x + rnd(-10, 10), e.y - e.r - 6 - rnd(0, 8), Math.round(v), v > 50 ? '#ffc24a' : '#ffffff', v > 50 ? 1.5 : v > 20 ? 1.15 : .9); }
  }
  if (by === 'player') {
    if (e.kind === 'civ' && G.civHitT <= 0) { karmaAdd(KARMA.civHit); G.civHitT = 3; }
    if (e.kind === 'cop') { heatAdd(e.ally ? 1 : .45); if (e.ally) { e.ally = false; e.wasAlly = true; } }
    if ((e.team === 'gang' || e.team === 'police') && !e.static) { e.tgt = P; e.sight = Math.max(e.sight, 420); e.provT = 6; }
  }
  if (!e.prop && !e.static && dmg > 6) e.stun = Math.max(e.stun, .22);
  if (e.kind === 'car' && e.driving) ejectDriver(e);
  if (e.hp <= 0) {
    if (e.kind === 'civ' && by !== 'player' && e.state !== 'wounded') { e.hp = 1; e.state = 'wounded'; e.woundT = 30; e.vx = e.vy = 0; e.stun = 0; return; }
    kill(e, info);
  }
}
function ejectDriver(car) {
  car.driving = false;
  if (car.hasDriver) { car.hasDriver = false; const p = findFree(car.x, car.y, 30, 8); if (p) { const c = spawnCiv(p.x, p.y); c.state = 'flee'; c.stateT = 3; c.fx = c.x - P.x; c.fy = c.y - P.y; } }
}
function reward(e, byP) {
  if (!byP) return; G.kills++; comboHit(); addXP(e.def.xp || 5, e.x, e.y);
  if (S.e_tithe) { P.hp = Math.min(S.maxHp, P.hp + 7 * S.e_tithe); P.energy = Math.min(S.maxEn, P.energy + 10 * S.e_tithe); FX.dots(e.x, e.y, 6, '#ff3355', 80, .5); }
}
function kill(e, info) {
  if (e.dead) return; e.dead = true; info = info || {};
  const k = e.kind, byP = info.by === 'player' || (k !== 'civ' && e.lastHitBy === 'player');   // a civilian you once brushed is not your kill when someone else finishes them
  if (e.held || e === (P && P.holding)) { e.held = false; if (P && P.holding === e) dropHeld(); }
  if (k === 'panels') {   // solar panels shatter: a fan of glass shards that cuts anything in front of them
    FX.sparks(e.x, e.y, 30, '#c8d8f0', 380); FX.debris(e.x, e.y, 16, '#2f4a7a', 300); sfx('hit', e.x, e.y); shake(.25);
    for (const o of act) { if (o.dead || o.static || o.prop || o === P) continue; const d = Math.hypot(o.x - e.x, o.y - e.y); if (d < 90 + o.r) { hurt(o, 26 * (1 - d / 120), { by: byP ? 'player' : 'world' }); if (byP) o.lastHitBy = 'player'; } }
    if (byP) comboHit(); return;
  }
  if (k === 'wtank') {    // a water tank bursts and floods the street for a while: machines in the water short out
    FX.debris(e.x, e.y, 14, '#7a5636', 260); for (let i = 0; i < 30; i++) { const a = rnd(TAU), s = rnd(60, 220); parts.push({ k: 'd', x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(.4, .9), max: .9, col: '#7aa8d8', w: 2.5 }); }
    sfx('heavy', e.x, e.y); floods.push({ x: e.x, y: e.y, r: 70, t: 18, max: 18 }); if (byP) comboHit(); return;
  }
  if (MACH[k] || k === 'cell') {   // machines: they break up in sparks; batteries and crawlers go off
    FX.sparks(e.x, e.y, 12, ZAP_COL, 240); FX.debris(e.x, e.y, k === 'loader' ? 14 : 6, '#5a5e6a', 200); FX.smoke(e.x, e.y, 3, '#3a3d48', .8); sfx('hit', e.x, e.y);
    if (k === 'courier' && e.parcel !== false) explosion(e.x, e.y, 44, 12, byP ? 'player' : 'gang');
    if (k === 'crawler' || k === 'cell') elecBurst(e.x, e.y, k === 'cell' ? 84 : 72, k === 'cell' ? 30 : 22, byP ? 'player' : (info.by || 'gang'));
    if (e.team === 'gang') reward(e, byP); else if (k === 'cell' && byP) comboHit();
    if (k !== 'cell' && Math.random() < (k === 'sweeper' ? .5 : .35)) pickups.push({ x: e.x, y: e.y, vx: rnd(-40, 40), vy: rnd(-40, 40), type: 'en', life: 16 });   // solar cells: a bit of energy
    return;
  }
  if (k === 'civ') {
    FX.dots(e.x, e.y, 8, '#a03040', 70, .6);
    if (byP) { karmaAdd(KARMA.civKill); heatAdd(.9); G.civKills++; toast('Civilian casualty', '#ff3355'); sfx('bad'); G.combo = 0; }
  } else if (k === 'grunt' || k === 'brute' || k === 'sup') {
    FX.dots(e.x, e.y, 12, e.col, 140, .6); FX.debris(e.x, e.y, 4, shade(e.col, .5), 160);
    reward(e, byP);
    if (Math.random() < (k === 'grunt' ? .28 : .6)) pickups.push({ x: e.x, y: e.y, vx: rnd(-60, 60), vy: rnd(-60, 60), type: Math.random() < .5 ? 'hp' : 'en', life: 16 });
  } else if (k === 'cop') {
    FX.dots(e.x, e.y, 10, '#4a7ad0', 110, .5);
    const ally = e.ally || e.wasAlly;
    if (byP) { karmaAdd(ally ? KARMA.allyKill : KARMA.copKill); heatAdd(1.2); toast(ally ? 'You killed an ally' : 'Officer down', '#ff3355'); G.combo = 0; }
    reward(e, byP && !ally);
  } else if (e.prop) {
    FX.debris(e.x, e.y, k === 'car' ? 14 : 8, k === 'crate' ? '#8a6038' : k === 'car' ? shade(e.col, .7) : '#666b78', 220); FX.dust(e.x, e.y, 6);
    if (e.def.explosive) explosion(e.x, e.y, k === 'car' ? 118 : 96, k === 'car' ? 64 : 52, byP ? 'player' : (info.by || 'world'));
    else sfx('hit', e.x, e.y);
    if (byP) comboHit();
    if (k === 'car' && Math.random() < .5) pickups.push({ x: e.x, y: e.y, vx: rnd(-40, 40), vy: rnd(-40, 40), type: 'en', life: 16 });
    if (k === 'car') decals.push({ x: e.x, y: e.y, r: 26, life: 60, k: 'wreck', ang: e.ang });
  } else if (k === 'tower') {   // collapses into splinters; a couple of loose crates tumble out
    FX.debris(e.x, e.y, 14, '#6a4a2a', 240); FX.debris(e.x, e.y, 8, '#5a6070', 200); FX.dust(e.x, e.y, 10); FX.smoke(e.x, e.y, 6, '#2a2c34', 1.2);
    sfx('heavy', e.x, e.y); shake(.4); reward(e, byP);
    if (e.hid !== undefined) { const s = DS[e.did]; s.towers = s.towers || []; if (!s.towers.includes(e.hid)) s.towers.push(e.hid); saveGame(); }   // stays down in the save
    for (let i = 0; i < 2; i++) { const a = rnd(TAU), c = mk('crate', e.x + Math.cos(a) * 8, e.y + Math.sin(a) * 8); c.vx = Math.cos(a) * 160; c.vy = Math.sin(a) * 160; c.vz = 120; }
    { const a = rnd(TAU), g = spawnGang('grunt', e.x + Math.cos(a) * 6, e.y + Math.sin(a) * 6, { home: e.home, terr: e.terr, z: 42, vz: 60, stun: 1.3, flung: true, lastHitBy: byP ? 'player' : null }); g.vx = Math.cos(a) * 90; g.vy = Math.sin(a) * 90; g.hp = g.maxhp * .5; }   // the lookout comes down with it, hurt
    if (byP) toast('Watchtower down', '#ffc24a');
  } else if (k === 'boss') {
    releaseLifted(e);
    for (let i = 0; i < 5; i++) later(i * .2, () => explosion(e.x + rnd(-20, 20), e.y + rnd(-20, 20), 50, 0, 'world'));
    reward(e, true); G.boss = null; DS[e.did].bossAlive = false; DS[e.did].bossDying = true; G.slowT = 1.4; Input.rumble(1, 1, 600);
    later(1.6, () => bossDefeated(e.did));
  }
}
function clearHideout(e) {
  if (e.cleared) return; e.cleared = true;
  addXP(70, e.x, e.y);
  const d = e.did; DS[d].hideoutsLeft--; DS[d].destroyed = DS[d].destroyed || []; DS[d].destroyed.push(e.hid);
  toast(DIST[d].gang + ' hideout cleared  ' + (3 - DS[d].hideoutsLeft) + '/3', '#ffc24a', true); sfx('level');
  if (DS[d].hideoutsLeft === 0) later(1.6, () => spawnBoss(d));
  { const c = { x: e.x, y: e.rect.y + e.rect.h + 54 }; if (walkable(c.x, c.y, 12)) G.check = c; }   // you get back up here, not at the far end of the district
  saveGame();
}
function playerDie() {
  if (G.mode === 'dead') return; G.mode = 'dead'; G.deadT = 2.6; P.hp = 0; dropHeld();
  FX.dots(P.x, P.y, 30, karmaColor(), 200, .9); FX.flash(P.x, P.y, 200, karmaColor(), .6); sfx('bad'); G.combo = 0; Input.rumble(1, 1, 500);
}
function respawn() {
  P.hp = S.maxHp; P.energy = S.maxEn; P.x = G.check.x; P.y = G.check.y; P.vx = P.vy = 0; P.charge = 0; P.absorbing = false; P.invT = 2;
  G.heat = 0; bullets.length = 0; zones.length = 0; warns.length = 0; for (const e of ents) if (e.tgt === P && e.kind !== 'boss') { e.tgt = null; e.sight = 260; }
  for (const e of ents) if (e.kind === 'cop' && !e.ally) e.dead = true;
  G.mode = 'play'; toast('You get back up…');
}
