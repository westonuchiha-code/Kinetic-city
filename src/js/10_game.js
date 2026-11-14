/* ============================== 10 GAME: population, encounters, story, upgrades, save ============================== */
const START = { x: 48, y: 210 };
const isAlley = (x, y) => { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE), lx = tx % PERIOD - ROAD, ly = ty % PERIOD - ROAD; return tileAt(tx, ty) === T.WALK && lx >= 1 && lx <= 7 && ly >= 1 && ly <= 7; };

function populate(save) {
  const destroyed = save ? save.ds.map(s => s.destroyed || []) : [[], [], []];
  const hidIdx = [0, 0, 0];
  for (const h of spots.hide) {
    const d = h.d, hid = d * 3 + hidIdx[d]++;
    if (destroyed[d].includes(hid) || (save && (save.ds[d].bossDone || save.ds[d].hideoutsLeft === 0))) { mk('hideout', h.x, h.y - 48, { did: d, hid, r: 34, spot: h, rect: hideoutRect(h), gateOpen: true, gateT: 1, cleared: true, col: DIST[d].col }); continue; }
    mk('hideout', h.x, h.y - 48, { did: d, hid, r: 34, spot: h, rect: hideoutRect(h), gateOpen: false, col: DIST[d].col });
    if (!(save && (save.ds[d].towers || []).includes(hid))) mk('tower', h.x + (hid % 2 ? 88 : -88), h.y + 20, { did: d, hid, guardOf: hid, ang: 0, col: DIST[d].col, home: { x: h.x, y: h.y + 50 }, terr: 290 });
    for (let i = 0; i < 3 + d; i++) { const p = findFree(h.x, h.y + 60, 70, 12); if (p) spawnGang(i === 0 && d > 0 ? 'brute' : 'grunt', p.x, p.y, { home: { x: h.x, y: h.y + 50 }, terr: 290, guardOf: hid }); }
    for (let i = 0; i < 3; i++) { const p = findFree(h.x, h.y + 40, 110, 14); if (p) mk(i === 2 ? 'barrel' : 'crate', p.x, p.y); }
  }
  for (let d = 0; d < 3; d++) {
    if (d > 0 && !(save && save.ds[d].bossDone)) { const b = spots.boss[d], p = findFree(b.x, b.y, 80, 12); if (p) spawnGang('sup', p.x, p.y); }
    for (let i = 0; i < 4; i++) { const p = randomInDistrict(d, t => t === T.PLAZA, 20); if (p && ['hide', 'boss'].includes(blockAt(p.x, p.y).kind)) mk('car', p.x, p.y, { col: pick(CAR_COLS), ang: rnd(TAU) }); }
    for (let i = 0; i < 5; i++) { const p = randomInDistrict(d, null, 18); if (p && isAlley(p.x, p.y)) mk(Math.random() < .5 ? 'car' : 'dumpster', p.x, p.y, { col: pick(CAR_COLS), ang: Math.random() < .5 ? 0 : Math.PI / 2 }); }
    for (let i = 0; i < 18; i++) { const p = randomInDistrict(d, t => t === T.WALK || t === T.PLAZA, 13); if (p) mk(Math.random() < .35 ? 'barrel' : Math.random() < .2 ? 'dumpster' : 'crate', p.x, p.y, { ang: rnd(TAU) }); }
  }
  for (const s of spots.props) mk(s.k, s.x, s.y, { ang: s.ang, col: pick(CAR_COLS) });   // parked cars and material piles in open blocks
  for (const s of spots.shards) if (!(save && save.shardIds.includes(s.id))) pickups.push({ x: s.x, y: s.y, type: 'shard', id: s.id, life: 1e9 });
  if (!save) { // a small kit of throwables right where the game starts
    mk('crate', START.x + 26, START.y - 60); mk('crate', START.x - 14, START.y + 70, { ang: .4 }); mk('barrel', START.x + 70, START.y + 36);
    mk('car', 112, START.y + 120, { col: '#2f5fb8', ang: Math.PI / 2 });
  }
}
function spawnTraffic(d) {
  for (let tries = 0; tries < 10; tries++) {
    let x, y, dx = 0, dy = 0;
    if (Math.random() < .5) { const k = rndi(0, BROWS); dx = Math.random() < .5 ? 1 : -1; y = laneFor(dx, 0, k * BAND); x = rnd(d === 0 ? 60 : DIST_SPLIT[d - 1] + 80, d === 2 ? WORLD_W - 60 : DIST_SPLIT[d] - 80); }
    else { const k = d * DCOLS + rndi(d === 0 ? 0 : 1, DCOLS - 1); dy = Math.random() < .5 ? 1 : -1; x = laneFor(0, dy, k * BAND); y = rnd(60, WORLD_H - 60); }
    if (!roadAt(x, y) || !walkable(x, y, 16) || dist({ x, y }, START) < 150) continue;
    return mk('car', x, y, { driving: true, hasDriver: true, dx, dy, ang: Math.atan2(dy, dx), col: pick(CAR_COLS) });
  }
}

/* ---------- encounters, police, district effects ---------- */
function spotAround(c, d, spread = 60, r = 12, pred) { // try many angles so spawns work near the map edge too
  const a0 = rnd(TAU);
  for (let i = 0; i < 12; i++) { const a = a0 + i * TAU / 12, p = findFree(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, spread, r, pred); if (p) return p; }
  return null;
}
function updateEncounters(dt) {
  const d = districtAt(P.x), st = DS[d];
  G.encT -= dt;
  if (G.encT <= 0 && st.status === 'enemy' && !st.bossAlive && G.mode === 'play') {
    G.encT = rnd(24, 40); const roll = Math.random();
    if (false) {   // ambushes around the player removed: gangs now hold territory instead
      toast('Ambush', '#ff9a3a');
      const c = spotAround(P, 330, 40); if (c) for (let i = 0; i < 3 + d; i++) { const p = findFree(c.x, c.y, 90, 12); if (p) { const g = spawnGang(i === 3 ? 'brute' : 'grunt', p.x, p.y); g.tgt = P; g.sight = 600; } }
    } else if (false) {
      const p = spotAround(P, 360); if (p) { const g = spawnGang('sup', p.x, p.y); g.tgt = P; g.sight = 600; toast('Superpowered patrol', '#c080ff'); }
    } else if (roll < .85) {
      const c = spotAround(P, 340, 60, 12, civWalk);
      if (c) {
        for (let i = 0; i < 2; i++) { const p = findFree(c.x, c.y, 30, 9, civWalk); if (p) { const cv = spawnCiv(p.x, p.y); cv.hp = 1; cv.state = 'wounded'; cv.woundT = 45; } }
        for (let i = 0; i < 3; i++) { const p = findFree(c.x, c.y, 100, 12); if (p) spawnGang('grunt', p.x, p.y, { home: { x: c.x, y: c.y }, terr: 230 }); }
        G.marker = { x: c.x, y: c.y, t: 60 }; toast('Civilians in danger', '#38d0ff', true);
      }
    } else {
      const p = spotAround(P, 220, 50, 10);
      if (p) { for (let i = 0; i < 3; i++) pickups.push({ x: p.x + rnd(-20, 20), y: p.y + rnd(-20, 20), vx: 0, vy: 0, type: i ? 'en' : 'hp', life: 30 }); toast('Supply drop nearby', '#6fcf97'); G.marker = { x: p.x, y: p.y, t: 25 }; }
    }
  }
  // police: hostile while heat is up
  G.heatT += dt; if (G.heatT > 7) G.heat = Math.max(0, G.heat - dt * .15);
  G.copT -= dt;
  let cops = 0, allies = 0; for (const e of act) if (e.kind === 'cop' && !e.dead) { if (e.ally) allies++; else cops++; }
  if (G.copT <= 0 && G.heat >= 1 && cops < Math.floor(G.heat) * 2) {
    G.copT = 3; const p = spotAround(P, 520);
    if (p) { mk('cop', p.x, p.y, { col: '#2a4aa0', tgt: P, sight: 600, home: p }); if (cops === 0) toast('Police are after you', '#ff3355', true); }
  }
  G.allyT -= dt;
  if (G.allyT <= 0) {
    G.allyT = 9;
    if (G.karma >= 30 && allies < 2 && G.heat < 1) { const p = spotAround(P, 480); if (p) { mk('cop', p.x, p.y, { col: '#58c0ff', ally: true, sight: 380, home: p }); if (!G.seen.ally) { G.seen.ally = 1; toast('The police have started backing you up', '#38d0ff', true); } } }
  }
  G.tribT -= dt;
  if (G.tribT <= 0) {
    G.tribT = 10;
    for (const s of DS) if (s.status === 'dominated') G.xp += 8;
    if (st.status === 'liberated') { let n = 0; for (const e of act) if (e.kind === 'civ') n++; if (n < 18) { const p = randomInDistrict(d, civWalk, 9); if (p && dist(p, P) > 450) spawnCiv(p.x, p.y); } }
    // keep traffic alive
    let cars = 0; for (const e of act) if (e.kind === 'car' && e.driving) cars++;

  }
  if (G.marker) { G.marker.t -= dt; if (G.marker.t <= 0 || dist(G.marker, P) < 60) G.marker = null; }
}
function updatePickups(dt) {
  for (const p of pickups) {
    p.life -= dt; if (p.vx) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .92; p.vy *= .92; }
    const d = Math.hypot(p.x - P.x, p.y - P.y);
    if (p.type !== 'shard' && d < 80) { p.x += (P.x - p.x) * dt * 7; p.y += (P.y - p.y) * dt * 7; }
    if (p.type === 'shard' && d < 160 && !p.seen) { p.seen = true; sfx('shard', p.x, p.y, .4); }
    if (d < (p.type === 'shard' ? 22 : 16)) {
      p.life = -1;
      if (p.type === 'hp') { P.hp = Math.min(S.maxHp, P.hp + 25); sfx('pickup'); floatText(P.x, P.y - 24, '+25 HP', '#5fffa0'); }
      else if (p.type === 'en') { P.energy = Math.min(S.maxEn, P.energy + 35); sfx('pickup'); floatText(P.x, P.y - 24, '+35 EN', '#3ce0ff'); }
      else {
        G.shards++; G.shardIds.push(p.id); addXP(25); sfx('shard'); FX.flash(p.x, p.y, 120, '#7affea', .5); FX.dots(p.x, p.y, 20, '#7affea', 120, .8);
        toast('Kinetic shard ' + G.shards + '/12', '#7affea', true);
        if (G.shards % 3 === 0) { G.points++; toast('+1 skill point for shards', '#ffc24a'); }
        saveGame();
      }
    }
  }
  for (let i = pickups.length - 1; i >= 0; i--) if (pickups[i].life <= 0) pickups.splice(i, 1);
}

/* ---------- hints (one-time tutorial prompts with live button glyphs) ---------- */
function showHint(items, key, life = 7) {
  if (key && G.seen[key]) return; if (key) G.seen[key] = 1;
  G.hint = { items, life };
}
function tutorial() {
  if (G.hint || !G.started || G.mode !== 'play') return;
  if (G.seen.throw && !G.seen.rep && G.kills >= 1) showHint([{ a: 'rep' }, { t: 'Shockwave shoves everything away and reflects bullets' }], 'rep');
  else if (G.seen.rep && !G.seen.well && G.kills >= 3) showHint([{ a: 'well' }, { t: 'Gravity well drags enemies into a pile' }], 'well');
  else if (G.seen.well && !G.seen.dash && G.kills >= 5) showHint([{ a: 'dash' }, { t: 'Dash: you can’t be hurt mid-dash' }], 'dash');
}

/* ---------- story ---------- */
function checkpointFor(d) { const b = spots.boss[d]; return { x: b.x, y: b.y + 170 }; }
function startStory() {   // placeholder story removed for the prototype; the game starts straight in play
  G.started = true;
  showHint([{ a: 'move' }, { t: 'Move' }, { a: 'aim' }, { t: 'Aim' }], 'move');
}
function introDistrict(d) {
  toast('Entering ' + DIST[d].name, DIST[d].col, true);
  showHint([{ a: 'map' }, { t: 'City map' }], 'map');
}
const BOSS_HP = [420, 580, 760];
function spawnBoss(d) {
  if (DS[d].bossAlive || DS[d].bossDone) return;
  const s = spots.boss[d];
  const b = mk('boss', s.x, s.y, { did: d, col: DIST[d].col, name: DIST[d].boss, sight: 900, speed: [88, 80, 92][d] });
  b.maxhp = b.hp = BOSS_HP[d]; DS[d].bossAlive = true; G.boss = b;
  FX.flash(s.x, s.y, 260, DIST[d].col, .6, 1.2); FX.ring(s.x, s.y, 200, DIST[d].col, .6, 6); shake(.8); sfx('boom', s.x, s.y);
  const ammo = ['crate', 'crate', 'barrel', 'barrel', 'crate', 'car', 'car', 'dumpster'];
  for (let i = 0; i < ammo.length; i++) { const a = i / ammo.length * TAU, p = findFree(s.x + Math.cos(a) * 110, s.y + Math.sin(a) * 110, 30, 18); if (p) mk(ammo[i], p.x, p.y, { col: pick(CAR_COLS), ang: rnd(TAU) }); }
  toast(DIST[d].boss + ' has appeared', DIST[d].col, true);
  const _unused = [
    [{ who: 'DR. VALE', text: 'All three hideouts are rubble, and Mr. Cinder is coming out himself. He\'s at the plaza. Watch the fire bursts and don\'t stand in his flames.' }],
    [{ who: 'DR. VALE', text: 'Krag. He charges in straight lines. Stand in front of a wall, sidestep, and let him hit it. A stunned Krag takes double damage.' }],
    [{ who: 'THE ARCHITECT', text: 'You came all this way. Do you know what you are? A side effect. I built the Flash. Come, little anomaly.' }]
  ];
}
function bossDefeated(d) {
  const st = DS[d]; st.bossDone = true; st.status = G.karma >= 0 ? 'liberated' : 'dominated'; G.check = checkpointFor(d);
  for (const e of ents) if (e.team === 'gang' && !e.static && !e.dead && e.did === d && dist(e, P) > 120) { e.dead = true; FX.smoke(e.x, e.y, 3); }
  toast(DIST[d].name + (G.karma >= 0 ? ' liberated' : ' dominated'), G.karma >= 0 ? '#38d0ff' : '#ff3355', true); sfx('level');
  G.points++; toast('+1 skill point', '#ffc24a');
  drawMinimapBase();
  if (d < 2) { gatesOpen[d] = true; openGate(d); toast('The barricade into ' + DIST[d + 1].name + ' is down', '#e8ecf7'); }
  else endGame();
  saveGame();
}
function endGame() {
  G.finished = true;
  toast('All districts cleared · free roam', '#ffc24a', true);
}
function objective() {
  if (G.finished) return { text: 'Free roam · find kinetic shards ' + G.shards + '/12', t: null };
  const d = G.curD, s = DS[d];
  if (s.bossAlive && G.boss) return { text: 'Defeat ' + DIST[d].boss, t: G.boss };
  if (s.hideoutsLeft > 0) {
    let best = null, bd = Infinity; for (const e of ents) if (e.kind === 'hideout' && !e.cleared && e.did === d) { const dd = dist2(e, P); if (dd < bd) { bd = dd; best = e; } }
    let sub = '';
    if (best && best.gateOpen && dist(best, P) < 600) sub = best.wave >= 3 && !best.waveAlive ? '' : best.wave === 3 ? ' · take down the lieutenant' : ' · wave ' + Math.max(1, best.wave) + '/2';
    else if (best && !best.gateOpen && dist(best, P) < 600) sub = ' · guards left ' + (best.guardsLeft || 0) + (best.towerUp ? ' · tower standing' : '');
    return { text: 'Clear ' + DIST[d].gang + ' hideouts ' + (3 - s.hideoutsLeft) + '/3' + sub, t: best };
  }
  if (!s.bossDone) return { text: 'Wait for ' + DIST[d].boss, t: spots.boss[d] };
  const nd = Math.min(2, d + 1);
  return { text: 'Head into ' + DIST[nd].name, t: { x: DIST_SPLIT[nd - 1] + 60, y: clamp(Math.round(P.y / BAND) * BAND + 48, 48, WORLD_H - 48) } };
}

/* ---------- upgrades ---------- */
const UPS = [
  { id: 'hp', name: 'Vitality', desc: '+25 max health', max: 3, cost: 1, br: 'core' },
  { id: 'en', name: 'Reserves', desc: '+25 max energy', max: 3, cost: 1, br: 'core' },
  { id: 'regen', name: 'Flow', desc: '+30% energy regeneration', max: 3, cost: 1, br: 'core' },
  { id: 'tk1', name: 'Heavy Hands', desc: '+25% thrown-object damage', max: 3, cost: 1, br: 'core' },
  { id: 'tk2', name: 'Far Reach', desc: '+40% grab range, faster throws. Rank 1 lets you lift unhurt goons.', max: 2, cost: 1, br: 'core' },
  { id: 'rep', name: 'Shockwave+', desc: 'Bigger repulse radius, much more damage', max: 2, cost: 1, br: 'core' },
  { id: 'well', name: 'Singularity', desc: 'Gravity wells last longer and reach wider', max: 2, cost: 1, br: 'core' },
  { id: 'dash', name: 'Afterburn', desc: 'Cheaper dash that hits harder', max: 2, cost: 1, br: 'core' },
  { id: 'abs', name: 'Capacitor', desc: 'Absorb stores more and blasts harder', max: 2, cost: 1, br: 'core' },
  { id: 'g_prec', name: 'Precision Grip', desc: 'Thrown objects curve into enemies and never hurt civilians', max: 1, cost: 2, br: 'good' },
  { id: 'g_guard', name: 'Guardian Shield', desc: 'Absorbed attacks heal you', max: 2, cost: 2, br: 'good' },
  { id: 'g_mend', name: 'Mending Pulse', desc: 'Auto-heal nearby wounded civilians; slow health regen', max: 2, cost: 2, br: 'good' },
  { id: 'e_vortex', name: 'Crush Vortex', desc: 'Gravity wells crush three times harder', max: 2, cost: 2, br: 'evil' },
  { id: 'e_chain', name: 'Chain Reaction', desc: 'Thrown objects detonate when they hit a wall', max: 1, cost: 2, br: 'evil' },
  { id: 'e_tithe', name: 'Blood Tithe', desc: 'Kills and drains restore health and energy', max: 2, cost: 2, br: 'evil' }
];
const ups = {}; const S = {};
const rk = id => ups[id] || 0;
function computeStats() {
  S.maxHp = 100 + 25 * rk('hp'); S.maxEn = 100 + 25 * rk('en'); S.regen = 17 * (1 + .3 * rk('regen'));
  S.tkDmg = 1 + .25 * rk('tk1'); S.tkRange = 1 + .4 * rk('tk2'); S.tkSpd = 1 + .12 * rk('tk2');
  S.repR = 1 + .25 * rk('rep'); S.repDmg = 1 + 1.5 * rk('rep');
  S.wellT = 3.5 + .8 * rk('well'); S.wellR = 140 + 24 * rk('well'); S.crush = 28 * (1 + 2 * rk('e_vortex'));
  S.dashCost = Math.max(8, 16 - 3 * rk('dash')); S.dashDmg = 1 + .5 * rk('dash');
  S.absCap = 60 + 25 * rk('abs'); S.absDmg = 1.15 + .3 * rk('abs');
  S.g_prec = rk('g_prec'); S.g_guard = rk('g_guard'); S.g_mend = rk('g_mend'); S.e_vortex = rk('e_vortex'); S.e_chain = rk('e_chain'); S.e_tithe = rk('e_tithe');
}
function lockedReason(u) { if (u.br === 'good' && G.karma < 20) return 'Needs Good rank (karma 200+)'; if (u.br === 'evil' && G.karma > -20) return 'Needs Bad rank (karma −200 or lower)'; return ''; }
function buyUpgrade(id) {
  const u = UPS.find(x => x.id === id), r = rk(id);
  if (lockedReason(u) || r >= u.max || G.points < u.cost) { sfx('deny'); return false; }
  G.points -= u.cost; ups[id] = r + 1; computeStats(); sfx('select'); saveGame(); return true;
}

/* ---------- save / load (localStorage, optional) ---------- */
const SAVE_KEY = 'kinetic_city_v2';
function saveGame() {
  if (!G.started) return;
  const data = {
    v: 2, karma: G.karma, xp: G.xp, level: G.level, points: G.points, ups: { ...ups }, shards: G.shards, shardIds: G.shardIds, kills: G.kills, civKills: G.civKills, saves: G.saves,
    ds: DS.map(s => ({ hideoutsLeft: s.hideoutsLeft, destroyed: s.destroyed || [], towers: s.towers || [], bossDone: s.bossDone, status: s.status, intro: s.intro })), gates: gatesOpen.slice(), check: G.check, finished: G.finished, seen: G.seen
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { }
}
function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); return s && s.v === 2 ? s : null; } catch (e) { return null; } }

/* ---------- lifecycle ---------- */
function resetState() {
  ents.length = bullets.length = parts.length = texts.length = pickups.length = wells.length = decals.length = timers.length = rings.length = zones.length = warns.length = dlights.length = 0;
  Object.assign(G, { time: 0, karma: 0, xp: 0, level: 1, points: 0, heat: 0, heatT: 0, shards: 0, shardIds: [], kills: 0, civKills: 0, saves: 0, combo: 0, comboT: 0, comboBest: 0, hitstop: 0, slowT: 0, flash: 0, civHitT: 0, encT: 30, copT: 3, allyT: 8, tribT: 10, toasts: [], boss: null, marker: null, check: { ...START }, deadT: 0, curD: 0, finished: false, hint: null, seen: {}, started: false });
  DS.forEach((s, i) => Object.assign(s, { hideoutsLeft: 3, bossAlive: false, bossDone: false, status: 'enemy', intro: i === 0, destroyed: [], towers: [] }));
  gatesOpen[0] = gatesOpen[1] = false;
  for (const k in ups) delete ups[k];
  tkTarget = null; traj = null;
}
function newGame(save) {
  resetState(); buildCity();
  if (save) {
    Object.assign(G, { karma: save.karma, xp: save.xp, level: save.level, points: save.points, shards: save.shards, shardIds: save.shardIds.slice(), kills: save.kills, civKills: save.civKills, saves: save.saves || 0, check: save.check, finished: save.finished, seen: save.seen || {} });
    Object.assign(ups, save.ups);
    save.ds.forEach((s, i) => Object.assign(DS[i], s));
    save.gates.forEach((g, i) => { gatesOpen[i] = g; if (g) for (let ty = 0; ty < MAP_H; ty++) map[ty * MAP_W + GATE_TX[i]] = T.ROAD; });
  }
  drawMinimapBase(); computeStats();
  P = mk('player', (save ? save.check.x : START.x), (save ? save.check.y : START.y), { dashT: 0, dashCd: 0, repCd: 0, wellCd: 0, drainCd: 0, energy: 100, charge: 0, absorbing: false, holding: null, invT: 0, throwT: 0, sinceUse: 9, holdT: 0, tkBuf: 0, chan: null, near: {} });
  P.hp = S.maxHp; P.energy = S.maxEn;
  populate(save);
  if (save) { G.started = true; for (let d = 0; d < 3; d++) if (DS[d].hideoutsLeft === 0 && !DS[d].bossDone) later(1.5, () => spawnBoss(d)); }
  flowSrc = -1;
  snapCamera();
}
function buildActive() {
  act.length = 0;
  for (const e of ents) { if (e.dead) continue; if (e === P || e.static || e.kind === 'boss' || (Math.abs(e.x - P.x) < ACTIVE_R && Math.abs(e.y - P.y) < ACTIVE_R)) act.push(e); }
}
function update(dt) {
  G.time += dt;
  if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
  G.civHitT -= dt;
  G.curD = DS.findIndex(s => !s.bossDone); if (G.curD < 0) G.curD = 2;
  buildActive();
  computeFlow(P.x, P.y);
  if (G.mode === 'dead') { G.deadT -= dt; if (G.deadT <= 0) respawn(); }
  updatePlayer(dt); updateAI(dt); updateWells(dt); physics(dt); updateBullets(dt);
  if (G.mode === 'play') { updateEncounters(dt); updatePickups(dt); tutorial(); }
  streamPopulation(dt);
  const dd = districtAt(P.x);
  if (dd > 0 && !DS[dd].intro && gatesOpen[dd - 1] && G.mode === 'play') { DS[dd].intro = true; G.check = checkpointFor(dd - 1); introDistrict(dd); saveGame(); }
  for (let i = ents.length - 1; i >= 0; i--) if (ents[i].dead) ents.splice(i, 1);
  if (G.boss && G.boss.dead) G.boss = null;
}
