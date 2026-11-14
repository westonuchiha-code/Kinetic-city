/* ============================== 05 ENTITIES ============================== */
/* One flat shape for everything physical. `kind` selects DEFS, AI and drawing.
   team: player | gang | police | civ | prop.  grab: telekinesis can lift it. */
const DEFS = {
  player:   { r: 10, m: 3, hp: 100, team: 'player', rest: .3 },
  civ:      { r: 8, m: 1, hp: 20, team: 'civ', rest: .3 },
  grunt:    { r: 10, m: 1.4, hp: 34, team: 'gang', rest: .35, xp: 10, grab: 1, speed: 100 },
  brute:    { r: 15, m: 5, hp: 130, team: 'gang', rest: .2, xp: 30, speed: 80 },
  sup:      { r: 11, m: 2, hp: 95, team: 'gang', rest: .3, xp: 45, speed: 118 },
  boss:     { r: 22, m: 14, hp: 450, team: 'gang', rest: .1, xp: 250, speed: 86 },
  cop:      { r: 10, m: 1.4, hp: 42, team: 'police', rest: .35, xp: 12, grab: 1, speed: 104 },
  crate:    { r: 12, m: 2, hp: 28, team: 'prop', prop: 1, grab: 1, rest: .45, fric: .935 },
  barrel:   { r: 10, m: 2, hp: 16, team: 'prop', prop: 1, grab: 1, rest: .45, fric: .935, explosive: 1 },
  dumpster: { r: 16, m: 5, hp: 110, team: 'prop', prop: 1, grab: 1, rest: .3, fric: .92 },
  car:      { r: 17, m: 9, hp: 95, team: 'prop', prop: 1, grab: 1, rest: .35, fric: .93, explosive: 1 },
  hideout:  { r: 30, m: 1e6, hp: 240, team: 'gang', static: 1, rest: 0 }
};
const ents = [], bullets = [], parts = [], texts = [], pickups = [], wells = [], decals = [], timers = [], rings = [], zones = [], warns = [];
let act = [];
let P = null;
let uid = 1;
function mk(kind, x, y, o) {
  const d = DEFS[kind];
  const e = {
    id: uid++, kind, def: d, x, y, vx: 0, vy: 0, z: 0, r: d.r, m: d.m, hp: d.hp, maxhp: d.hp, rest: d.rest, team: d.team,
    prop: !!d.prop, static: !!d.static, ang: rnd(TAU), dead: false, stun: 0, cd: rnd(.5, 1.5), tgt: null, tgtT: 0, flash: 0,
    t: rnd(10), state: '', stateT: 0, lastHitBy: null, thrower: null, thrownT: 0, held: false, driving: false, sight: 300,
    speed: d.speed || 50, col: '#fff', spin: 0, walk: rnd(10), did: districtAt(x), sinceHit: 9
  };
  Object.assign(e, o || {}); if (kind === 'car') applyVehicle(e); ents.push(e); return e;
}
/* Vehicle types. L/Wd = footprint, bh = body height, ch = cabin roof height (0 = one tall box),
   r/m/hp = physics (heavier vehicles throw slower, cost more energy to hold and hit much harder),
   spd = cruising speed factor. Traffic and parked cars pick from different mixes (no parked buses). */
const VEHICLES = {
  sedan:   { L: 42, Wd: 20, bh: 11, ch: 18, cL: 21, cx: -2, r: 17, m: 9,  hp: 95,  spd: 1 },
  compact: { L: 34, Wd: 18, bh: 10, ch: 17, cL: 18, cx: -3, r: 14, m: 7,  hp: 70,  spd: 1.05 },
  taxi:    { L: 42, Wd: 20, bh: 11, ch: 18, cL: 21, cx: -2, r: 17, m: 9,  hp: 95,  spd: 1.1, col: '#e8d040' },
  cruiser: { L: 44, Wd: 20, bh: 11, ch: 18, cL: 21, cx: -3, r: 17, m: 10, hp: 120, spd: 1.15, col: '#16181f' },
  van:     { L: 46, Wd: 22, bh: 25, ch: 0,  r: 19, m: 13, hp: 130, spd: .95, cols: ['#d8d8de', '#8a8e98', '#2a3a5a', '#6a2a2a', '#3a5a3a'] },
  bus:     { L: 72, Wd: 26, bh: 31, ch: 0,  r: 24, m: 20, hp: 220, spd: .8, cols: ['#d07a2a', '#2a6ab0', '#c8c8c8'] }
};
const TRAFFIC_MIX = { sedan: 4, compact: 3, taxi: 2, van: 2, cruiser: 1, bus: 1 }, PARKED_MIX = { sedan: 4, compact: 3, taxi: 1, van: 2, cruiser: 1 };
function applyVehicle(e) {
  if (!e.vt) {
    if (e.col === '#e8d040') e.vt = 'taxi';
    else { const w = e.driving ? TRAFFIC_MIX : PARKED_MIX; let s = 0; for (const k in w) s += w[k]; let r = Math.random() * s; for (const k in w) { r -= w[k]; if (r <= 0) { e.vt = k; break; } } }
  }
  const v = VEHICLES[e.vt] || VEHICLES.sedan; e.vs = v;
  e.r = v.r; e.m = v.m; e.hp = e.maxhp = v.hp;
  if (v.col) e.col = v.col; else if (v.cols) e.col = pick(v.cols); else if (e.col === '#e8d040' || e.col === '#fff') e.col = pick(CAR_COLS.slice(0, -1));
}
const CIV_COLS = ['#d9c25a', '#5fbf8a', '#e08a4a', '#a98be0', '#5ab0e0', '#d0d0d8', '#c46a6a', '#7a8a9a', '#e0a0c0'];
const UMB_COLS = ['#ff3d8b', '#3ce0ff', '#ffd23c', '#7affea', '#b26bff', '#ff7a3b', '#e8e8f0', '#2b2f3a'];
const CAR_COLS = ['#b8323a', '#2f5fb8', '#c8a23a', '#2f9a62', '#c8c8d0', '#6a3ab8', '#d06a2a', '#202430', '#e8d040'];
function spawnGang(kind, x, y, o) {
  const d = districtAt(x);
  return mk(kind, x, y, Object.assign({ col: DIST[d].col, home: { x, y }, sight: kind === 'brute' ? 330 : 310 }, o || {}));
}
function spawnCiv(x, y, o) {
  return mk('civ', x, y, Object.assign({ col: pick(CIV_COLS), umb: Math.random() < .45 ? pick(UMB_COLS) : null, hair: pick(['#1a1410', '#3a2a1a', '#c8a060', '#0a0a0a', '#7a4a2a', '#d0d0d0']), speed: 52, home: { x, y } }, o || {}));
}
