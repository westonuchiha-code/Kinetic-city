/* ============================== 04 WORLD ============================== */
/* The city is a grid of blocks separated by 3-tile roads. Each block has a 1-tile sidewalk ring and
   a 7x7 interior that is BUILDINGS (1-5 rects with heights and alleys), a PARK, or a PLAZA (hideout /
   boss arena). Collision and pathfinding use the tile map; rendering uses the building rects.
   Some building blocks are swapped for open blocks that break up the grid and are full of things to throw:
     LOT   parking lot: painted bays with parked cars
     COURT street basketball court with two hoops
     YARD  construction site: fenced dirt lot, an unfinished steel frame, crates, barrels, a dumpster */
const T = { ROAD: 0, WALK: 1, BLD: 2, GRASS: 3, GATE: 4, TREE: 5, PLAZA: 6, FENCE: 7 };
const isSolidT = t => t === T.BLD || t === T.GATE || t === T.TREE || t === T.FENCE;
const map = new Uint8Array(MAP_W * MAP_H);
const tileAt = (tx, ty) => (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) ? T.BLD : map[ty * MAP_W + tx];
const tileOf = (x, y) => tileAt(Math.floor(x / TILE), Math.floor(y / TILE));
const solidAt = (x, y) => isSolidT(tileOf(x, y));
const roadAt = (x, y) => tileOf(x, y) === T.ROAD;
const districtAt = x => x < DIST_SPLIT[0] ? 0 : x < DIST_SPLIT[1] ? 1 : 2;

const DIST = [
  { name: 'GROUND ZERO', gang: 'RUSTLERS', boss: 'MR. CINDER', col: '#ff8a2a', neon: ['#ff9d3c', '#3ce0ff', '#ff4fa0', '#ffd23c'], lamp: '#ffd7a6',
    roof: ['#283044', '#2f3850', '#252c40', '#343e58'], wall: '#3e4a66', ground: '#0f121b', side: '#1a1e2b', plaza: '#181c28', ht: [60, 160], lit: .34 },
  { name: 'THE SLUMS', gang: 'BREAKERS', boss: 'KRAG', col: '#ff4a3a', neon: ['#ff3b3b', '#ffb13b', '#ff5ad1', '#ff7a3b'], lamp: '#ff9a55',
    roof: ['#3a2c2a', '#42322b', '#332625', '#4a382c'], wall: '#54403a', ground: '#141219', side: '#221d22', plaza: '#1e1a1f', ht: [34, 90], lit: .24 },
  { name: 'THE TOWER', gang: 'ARCHITECTS', boss: 'THE ARCHITECT', col: '#b06bff', neon: ['#b26bff', '#5ab4ff', '#ff6bf1', '#7affea'], lamp: '#cfe0ff',
    roof: ['#2a2846', '#312e54', '#25233e', '#3a3768'], wall: '#433f72', ground: '#100f1a', side: '#1c1b2a', plaza: '#1a1928', ht: [110, 240], lit: .45 }
];
const NEON_GOOD = ['#c8452e', '#2e7a5a', '#e0b040', '#3a6aa8'], NEON_EVIL = ['#a83228', '#7a2e2a', '#b8642a', '#6a3038'];   // not neon any more: painted shop signs (red, green, mustard, blue), and all reds where a district is dominated
// per district: block (column within the district, row) of each hideout, the boss arena and the parks
const LAYOUT = [
  { hide: [[0, 1], [3, 2], [1, 5]], boss: [2, 3], parks: [[2, 0], [0, 3], [3, 5], [2, 6]], open: [[3, 0, 'lot'], [1, 3, 'court'], [2, 4, 'yard'], [0, 6, 'lot']] },
  { hide: [[1, 0], [3, 3], [0, 5]], boss: [1, 3], parks: [[0, 1], [2, 5], [3, 6]], open: [[2, 1, 'yard'], [0, 3, 'lot'], [2, 4, 'court'], [1, 6, 'yard']] },
  { hide: [[0, 0], [3, 1], [2, 5]], boss: [1, 3], parks: [[3, 4], [1, 0], [0, 6]], open: [[2, 0, 'lot'], [0, 2, 'court'], [3, 3, 'yard'], [1, 5, 'lot']] }
];
const PATTERNS = {
  full: [[0, 0, 7, 7]], v: [[0, 0, 3, 7], [4, 0, 3, 7]], h: [[0, 0, 7, 3], [0, 4, 7, 3]], quad: [[0, 0, 3, 3], [4, 0, 3, 3], [0, 4, 3, 3], [4, 4, 3, 3]],
  vu: [[0, 0, 4, 7], [5, 0, 2, 7]], L: [[0, 0, 7, 3], [0, 4, 3, 3], [4, 4, 3, 3]], three: [[0, 0, 3, 7], [4, 0, 3, 3], [4, 4, 3, 3]],
  court: [[0, 0, 7, 2], [0, 5, 3, 2], [4, 5, 3, 2], [0, 2, 2, 3], [5, 2, 2, 3]]
};
const PAT_W = [
  { full: 1, v: 3, h: 3, vu: 2, L: 2, three: 2 },
  { quad: 4, L: 2, three: 3, court: 2, v: 1 },
  { full: 4, v: 2, h: 2, vu: 2 }
];
function wpick(w) { let s = 0; for (const k in w) s += w[k]; let r = srand() * s; for (const k in w) { r -= w[k]; if (r <= 0) return k; } return Object.keys(w)[0]; }

const blocks = [], buildings = [], lamps = [], signGlows = [], shopGlows = [], puddles = [], trees = [], fences = [], decos = [], spots = { hide: [], boss: [], shards: [], props: [] };

function blockRect(bx, by) { const x = (bx * PERIOD + ROAD) * TILE, y = (by * PERIOD + ROAD) * TILE; return { x, y, w: 9 * TILE, h: 9 * TILE }; }
function blockKind(bx, by) {
  const d = (bx / DCOLS) | 0, cx = bx % DCOLS, L = LAYOUT[d], has = list => list.some(b => b[0] === cx && b[1] === by);
  if (has(L.hide)) return 'hide'; if (L.boss[0] === cx && L.boss[1] === by) return 'boss'; if (has(L.parks)) return 'park';
  const o = L.open.find(b => b[0] === cx && b[1] === by); if (o) return o[2];
  return 'bld';
}

function buildCity() {
  srand = mulberry(1337);
  blocks.length = buildings.length = lamps.length = signGlows.length = shopGlows.length = puddles.length = trees.length = fences.length = decos.length = 0;
  spots.hide = []; spots.boss = []; spots.shards = []; spots.props = [];
  map.fill(T.ROAD);
  for (let by = 0; by < BROWS; by++) for (let bx = 0; bx < BCOLS; bx++) {
    const d = (bx / DCOLS) | 0, kind = blockKind(bx, by), r = blockRect(bx, by), D_ = DIST[d];
    const blk = { bx, by, d, kind, ...r, bld: [] }; blocks.push(blk);
    const tx0 = bx * PERIOD + ROAD, ty0 = by * PERIOD + ROAD;
    for (let ly = 0; ly < 9; ly++) for (let lx = 0; lx < 9; lx++) {
      const edge = lx === 0 || ly === 0 || lx === 8 || ly === 8;
      let t = T.WALK;
      if (!edge) {
        if (kind === 'park') { const ix = lx - 1, iy = ly - 1; t = (ix === 3 || iy === 3) ? T.WALK : T.GRASS; }
        else if (kind === 'hide' || kind === 'boss' || kind === 'lot' || kind === 'court' || kind === 'yard') t = T.PLAZA;
        else t = T.WALK; // building interiors are stamped below; leftover = alley
      }
      map[(ty0 + ly) * MAP_W + tx0 + lx] = t;
    }
    if (kind === 'bld') {
      const pat = PATTERNS[wpick(PAT_W[d])];
      for (const [px, py, pw, ph] of pat) {
        const b = makeBuilding(d, (tx0 + 1 + px) * TILE, (ty0 + 1 + py) * TILE, pw * TILE, ph * TILE, pat.length === 1);
        buildings.push(b); blk.bld.push(b);
        for (let ty = 0; ty < ph; ty++) for (let tx = 0; tx < pw; tx++) map[(ty0 + 1 + py + ty) * MAP_W + tx0 + 1 + px + tx] = T.BLD;
      }
    } else if (kind === 'park') {
      for (let iy = 0; iy < 7; iy++) for (let ix = 0; ix < 7; ix++) {
        if (ix === 3 || iy === 3) continue;
        if (srand() < .26) {
          const tx = tx0 + 1 + ix, ty = ty0 + 1 + iy; map[ty * MAP_W + tx] = T.TREE;
          trees.push({ x: (tx + .5) * TILE + srange(-3, 3), y: (ty + .5) * TILE + srange(-3, 3), r: srange(15, 21), h: srange(26, 40), c: spick(['#12301f', '#163a24', '#0f2a1c']) });
        }
      }
    } else if (kind === 'lot' || kind === 'court' || kind === 'yard') openBlock(blk, tx0, ty0);
    else if (kind === 'hide') { const s = { d, x: r.x + r.w / 2, y: r.y + r.h / 2 }; spots.hide.push(s); setHideoutTiles(s, true); }
    else if (kind === 'boss') spots.boss[d] = { d, x: r.x + r.w / 2, y: r.y + r.h / 2 };
    // street lamps around the block, on the curb side of the sidewalk
    for (let i = 1; i < 9; i += 3) {
      const o = i * TILE + 16, inset = 5;
      for (const [lx, ly] of [[r.x + o, r.y + inset], [r.x + o, r.y + r.h - inset], [r.x + inset, r.y + o], [r.x + r.w - inset, r.y + o]]) {
        const broken = d === 1 && srand() < .18;
        lamps.push({ x: lx, y: ly, d, col: D_.lamp, flick: d === 1 ? srand() < .35 : srand() < .06, broken, ph: srand() * 100 });
      }
    }
  }
  for (const gx of GATE_TX) for (let ty = 0; ty < MAP_H; ty++) map[ty * MAP_W + gx] = T.GATE;
  computeDoors();
  // puddles on roads and sidewalks
  for (let i = 0; i < 420; i++) {
    const x = srange(20, WORLD_W - 20), y = srange(20, WORLD_H - 20), t = tileOf(x, y);
    if (t === T.ROAD || t === T.WALK || t === T.PLAZA) puddles.push({ x, y, rx: srange(10, 34), ry: srange(5, 13), a: srand() * .5 });
  }
  // shards: 4 hidden per district (parks, alleys, plazas)
  for (let d = 0; d < 3; d++) {
    let n = 0, guard = 0;
    while (n < 4 && guard++ < 500) {
      const x = srange(d === 0 ? 40 : DIST_SPLIT[d - 1] + 40, d === 2 ? WORLD_W - 40 : DIST_SPLIT[d] - 40), y = srange(40, WORLD_H - 40), t = tileOf(x, y);
      const ok = (n < 2 ? t === T.GRASS : (t === T.WALK && tileOf(x, y - 40) !== T.ROAD && tileOf(x, y + 40) !== T.ROAD && tileOf(x - 40, y) !== T.ROAD && tileOf(x + 40, y) !== T.ROAD));
      if (ok && walkable(x, y, 10)) { spots.shards.push({ id: spots.shards.length, d, x, y }); n++; }
    }
  }
}

/* open blocks (interior = 7x7 tiles starting one tile in from the block corner) */
function openBlock(blk, tx0, ty0) {
  const d = blk.d, ix = (tx0 + 1) * TILE, iy = (ty0 + 1) * TILE, IW = 7 * TILE;
  if (blk.kind === 'lot') {
    // two rows of 7 bays (top and bottom), aisle in the middle; most bays hold a parked car
    for (const row of [0, 1]) for (let k = 0; k < 7; k++) if (srand() < .62)
      spots.props.push({ k: 'car', x: ix + 16 + k * TILE + srange(-2, 2), y: row ? iy + IW - 34 : iy + 34, ang: (row ? -1 : 1) * Math.PI / 2 + srange(-.06, .06) });
    if (srand() < .6) spots.props.push({ k: 'dumpster', x: ix + IW - 30, y: iy + IW / 2, ang: Math.PI / 2 });
  } else if (blk.kind === 'court') {
    decos.push({ k: 'hoop', x: ix + 22, y: iy + IW / 2, dir: 1 }, { k: 'hoop', x: ix + IW - 22, y: iy + IW / 2, dir: -1 });
    for (let i = 0; i < 2; i++) spots.props.push({ k: srand() < .5 ? 'crate' : 'barrel', x: ix + srange(30, IW - 30), y: srand() < .5 ? iy + 14 : iy + IW - 14, ang: srange(0, TAU) });
  } else { // yard: fence ring (gaps in the middle of each side), steel frame, material piles
    for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
      const ring = i === 0 || j === 0 || i === 6 || j === 6; if (!ring || i === 3 || j === 3) continue;
      const tx = tx0 + 1 + i, ty = ty0 + 1 + j; map[ty * MAP_W + tx] = T.FENCE;
      const x = tx * TILE, y = ty * TILE, cx = x + 16, cy = y + 16;
      const horiz = j === 0 || j === 6, vert = i === 0 || i === 6;
      if (horiz) fences.push({ x0: (i === 0 ? cx : x), y0: cy - 1, x1: (i === 6 ? cx : x + TILE), y1: cy + 1, axis: 'x' });
      if (vert) fences.push({ x0: cx - 1, y0: (j === 0 ? cy : y), x1: cx + 1, y1: (j === 6 ? cy : y + TILE), axis: 'y' });
    }
    const fx = tx0 + 3, fy = ty0 + 2;   // 3x2-tile unfinished building, north side of the yard
    const f = { d, x: fx * TILE, y: fy * TILE, w: 3 * TILE, h: 2 * TILE, ht: srange(80, 120), frame: true, floors: 2 + ((srand() * 2) | 0), win: [[], [], [], []], signs: [], shops: [], props: [], trim: null, roof: '#3a3a40', wall: '#5a4a3a' };
    buildings.push(f);
    for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 3; tx++) map[(fy + ty) * MAP_W + fx + tx] = T.BLD;
    const piles = [[ix + 56, iy + 150], [ix + 168, iy + 156], [ix + 70, iy + 96]];
    for (const [px, py] of piles) { const n = 2 + ((srand() * 3) | 0); for (let i = 0; i < n; i++) { const k = srand() < .3 ? 'barrel' : 'crate', x = px + srange(-18, 18); let y = py + srange(-14, 14); const ang = srange(0, TAU); for (let g = 0; g < 8 && !walkable(x, y, 14); g++) y += 10;   // not inside the steel frame or the fence
      spots.props.push({ k, x, y, ang }); } }
    spots.props.push({ k: 'dumpster', x: ix + 176, y: iy + 98, ang: 0 });
  }
}
function makeBuilding(d, x, y, w, h, solo) {
  const D_ = DIST[d];
  let ht = srange(D_.ht[0], D_.ht[1]); if (solo) ht = Math.min(255, ht * (d === 2 ? 1.25 : 1.15));
  const b = { d, x, y, w, h, ht, roof: spick(D_.roof), wall: mix(D_.wall, spick(D_.roof), .3), win: [[], [], [], []], signs: [], props: [], trim: null, lit: D_.lit * srange(.6, 1.4) };
  // windows: per side (0=N,1=E,2=S,3=W) a grid of (u,v) cells, each with a fixed "on" roll
  const winCols = ['#ffd890', '#ffe7b0', '#9fd8ff', '#ffc070'];
  for (let s = 0; s < 4; s++) {
    const len = (s % 2 === 0) ? w : h, cols = Math.max(1, Math.floor(len / 14)), rows = Math.max(1, Math.floor(ht / 15));
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const roll = srand();
      b.win[s].push({ u: (c + .5) / cols, v: (r + .62) / (rows + .4), roll, c: srand() < .12 ? spick(D_.neon) : spick(winCols) });
    }
  }
  // neon signs on walls
  const nSigns = srand() < .75 ? (srand() < .35 ? 2 : 1) : 0;
  for (let i = 0; i < nSigns; i++) {
    const s = (srand() * 4) | 0, vert = srand() < .65, len = (s % 2 === 0) ? w : h;
    const u = srange(.2, .8), v0 = vert ? srange(.25, .45) : srange(.55, .8), v1 = vert ? v0 + srange(.25, .45) : v0;
    const sg = { side: s, u, u2: vert ? u : Math.min(.95, u + srange(.2, .45) * 60 / len), v0, v1: Math.min(.95, v1), ci: (srand() * 4) | 0, blink: srand() < .25, ph: srand() * 10 };
    b.signs.push(sg);
    const gx = s === 1 ? x + w + 22 : s === 3 ? x - 22 : s === 0 ? x + w * sg.u : x + w * (1 - sg.u), gy = s === 0 ? y - 22 : s === 2 ? y + h + 22 : s === 1 ? y + h * sg.u : y + h * (1 - sg.u);
    signGlows.push({ x: gx, y: gy, b, sg });
  }
  if (srand() < .3) b.trim = (srand() * 4) | 0;
  // street-level shopfronts on walls that face a sidewalk
  b.shops = [];
  for (let s = 0; s < 4; s++) {
    const len = (s % 2 === 0) ? w : h;
    if (srand() < .55 && len >= 64) {
      const u0 = srange(.08, .45), u1 = Math.min(.95, u0 + srange(.25, .5)), um = (u0 + u1) / 2, sh = { side: s, u0, u1, ci: (srand() * 4) | 0 };
      b.shops.push(sh);
      const gx = s === 1 ? x + w + 14 : s === 3 ? x - 14 : s === 0 ? x + w * um : x + w * (1 - um), gy = s === 0 ? y - 14 : s === 2 ? y + h + 14 : s === 1 ? y + h * um : y + h * (1 - um);
      shopGlows.push({ x: gx, y: gy, b, sh, horiz: s % 2 === 0, len: (u1 - u0) * len });
    }
  }
  // rooftop clutter (in base coordinates; drawn through the roof projection)
  const nP = 1 + ((srand() * 3) | 0);
  for (let i = 0; i < nP; i++) {
    const pw = srange(10, 22), ph = srange(8, 18);
    if (w - 16 < pw || h - 16 < ph) continue;
    b.props.push({ k: srand() < .25 ? 'tank' : 'box', x: x + srange(8, w - pw - 8), y: y + srange(8, h - ph - 8), w: pw, h: ph });
  }
  if (d === 2 && solo) b.props.push({ k: 'pad', x: x + w / 2, y: y + h / 2, w: Math.min(w, h) * .32, h: 0 });
  return b;
}

/* Hideout building: 96x64 footprint centred in its plaza, gate on the south face. */
const hideoutRect = s => ({ x: s.x - 48, y: s.y - 80, w: 96, h: 64 });
function setHideoutTiles(s, solid) {
  const r = hideoutRect(s);
  for (let ty = r.y / TILE; ty < (r.y + r.h) / TILE; ty++) for (let tx = r.x / TILE; tx < (r.x + r.w) / TILE; tx++) map[ty * MAP_W + tx] = solid ? T.BLD : T.PLAZA;
}
/* ---------- queries ---------- */
function walkable(x, y, r) { return !solidAt(x - r, y - r) && !solidAt(x + r, y - r) && !solidAt(x - r, y + r) && !solidAt(x + r, y + r); }
function findFree(x, y, rad, r = 10, pred) {
  for (let i = 0; i < 50; i++) {
    const a = rnd(TAU), d = rnd(0, rad), px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
    if (px > 10 && py > 10 && px < WORLD_W - 10 && py < WORLD_H - 10 && walkable(px, py, r) && (!pred || pred(tileOf(px, py)))) return { x: px, y: py };
  }
  return null;
}
function randomInDistrict(d, pred, r = 10) {
  const x0 = d === 0 ? 30 : DIST_SPLIT[d - 1] + 30, x1 = d === 2 ? WORLD_W - 30 : DIST_SPLIT[d] - 30;
  for (let i = 0; i < 160; i++) {
    const x = rnd(x0, x1), y = rnd(30, WORLD_H - 30);
    if (walkable(x, y, r) && (!pred || pred(tileOf(x, y)))) return { x, y };
  }
  return null;
}
function los(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, n = Math.ceil(Math.hypot(dx, dy) / 9);
  for (let i = 1; i < n; i++) if (solidAt(a.x + dx * i / n, a.y + dy * i / n)) return false;
  return true;
}
function raycast(x, y, dx, dy, max) { // distance until a solid tile
  for (let t = 0; t < max; t += 6) if (solidAt(x + dx * t, y + dy * t)) return t;
  return max;
}

/* ---------- flow field toward the player (BFS over walkable tiles) ---------- */
const flow = new Int16Array(MAP_W * MAP_H);
const flowQ = new Int32Array(MAP_W * MAP_H);
let flowSrc = -1;
function computeFlow(x, y) {
  const tx = clamp(Math.floor(x / TILE), 0, MAP_W - 1), ty = clamp(Math.floor(y / TILE), 0, MAP_H - 1), s = ty * MAP_W + tx;
  if (s === flowSrc) return; flowSrc = s;
  flow.fill(-1); let h = 0, t = 0; flow[s] = 0; flowQ[t++] = s;
  while (h < t) {
    const c = flowQ[h++], cx = c % MAP_W, cy = (c / MAP_W) | 0, nd = flow[c] + 1;
    if (nd > 90) continue;
    for (let k = 0; k < 4; k++) {
      const nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = cy + (k === 2 ? 1 : k === 3 ? -1 : 0);
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      const n = ny * MAP_W + nx; if (flow[n] !== -1 || isSolidT(map[n])) continue;
      flow[n] = nd; flowQ[t++] = n;
    }
  }
}
function flowDir(e) {
  const tx = Math.floor(e.x / TILE), ty = Math.floor(e.y / TILE);
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return null;
  const here = flow[ty * MAP_W + tx]; if (here < 0) return null;
  let best = here, bx = 0, by = 0;
  for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
    if (!ox && !oy) continue;
    const nx = tx + ox, ny = ty + oy; if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
    if (ox && oy && (isSolidT(map[ty * MAP_W + nx]) || isSolidT(map[ny * MAP_W + tx]))) continue; // no corner cutting
    const v = flow[ny * MAP_W + nx]; if (v < 0) continue;
    const score = v + (ox && oy ? .4 : 0);
    if (score < best) { best = score; bx = ox; by = oy; }
  }
  if (!bx && !by) return null;
  const gx = (tx + bx + .5) * TILE - e.x, gy = (ty + by + .5) * TILE - e.y, l = Math.hypot(gx, gy) || 1;
  return { x: gx / l, y: gy / l };
}

/* ---------- minimap base (1px per tile) ---------- */
let mmCanvas = null;
function drawMinimapBase() {
  if (!mmCanvas) { mmCanvas = document.createElement('canvas'); mmCanvas.width = MAP_W; mmCanvas.height = MAP_H; }
  const c = mmCanvas.getContext('2d'), im = c.createImageData(MAP_W, MAP_H);
  for (let ty = 0; ty < MAP_H; ty++) for (let tx = 0; tx < MAP_W; tx++) {
    const i = ty * MAP_W + tx, t = map[i], d = districtAt(tx * TILE + 16), st = typeof DS !== 'undefined' ? DS[d].status : 'enemy';
    let k;
    switch (t) {
      case T.ROAD: k = [24, 27, 38]; break; case T.WALK: k = [44, 48, 62]; break; case T.PLAZA: k = [54, 56, 72]; break;
      case T.GRASS: k = [22, 64, 40]; break; case T.TREE: k = [16, 48, 30]; break; case T.GATE: k = [255, 51, 85]; break; case T.FENCE: k = [80, 78, 72]; break;
      default: { const b = rgb(DIST[d].col); k = [70 + b[0] * .12, 74 + b[1] * .12, 96 + b[2] * .12]; if (st === 'liberated') k = [56, 110, 140]; if (st === 'dominated') k = [120, 52, 60]; }
    }
    im.data[i * 4] = k[0]; im.data[i * 4 + 1] = k[1]; im.data[i * 4 + 2] = k[2]; im.data[i * 4 + 3] = 255;
  }
  c.putImageData(im, 0, 0);
}
function openGate(i) {
  for (let ty = 0; ty < MAP_H; ty++) map[ty * MAP_W + GATE_TX[i]] = T.ROAD;
  flowSrc = -1; drawMinimapBase();
}
