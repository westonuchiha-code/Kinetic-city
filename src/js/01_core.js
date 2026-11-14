'use strict';
/* =====================================================================================
   KINETIC CITY  -  rebuilt, controller-first
   -------------------------------------------------------------------------------------
   One HTML file, no dependencies, Canvas 2D. Built from the original prototype's design:
   physics-as-damage, five force powers, karma with visible consequences, three districts
   (hideouts -> boss -> spare/kill -> liberated/dominated), heat/police, XP/combo/upgrades.

   FILE MAP (sections are concatenated in this order)
     01 core       constants, math, colour helpers, seeded rng
     02 input      gamepad (standard mapping) + keyboard/mouse -> actions, rumble, glyph labels
     03 audio      WebAudio synth sfx, rain ambience, adaptive music
     04 world      procedural city: blocks, buildings (with heights), lamps, signs, nav grid, flow field
     05 entities   entity defs + factory
     06 physics    integration, tile collision, spatial hash, impact damage
     07 combat     damage, death, karma, xp, heat, explosions, feedback (hitstop/shake/rumble)
     08 player     movement + powers; telekinesis target lock / spring hold / aim-assisted throw
     09 ai         civilians, gang, cops, bosses, hideouts, traffic
     10 game       population, encounters, story, districts, upgrades, save/load
     11 render     camera, fake-3D buildings, additive lighting, rain, entities, effects
     12 hud        canvas HUD, minimap, waypoints, prompts, city map
     13 ui         DOM overlays (title, dialogue, pause) with controller navigation
     14 main       loop + debug hooks (window.KC)
   ===================================================================================== */

/* ---------- world scale ---------- */
const TILE = 32;
const PERIOD = 12, ROAD = 3;            // each 12-tile period = 3 road tiles + 9 block tiles
const DCOLS = 4;                        // block columns per district
const BCOLS = DCOLS * 3, BROWS = 7;     // 3 districts x 4 block columns, 7 block rows
const MAP_W = BCOLS * PERIOD + ROAD;    // 147 tiles
const MAP_H = BROWS * PERIOD + ROAD;    // 87 tiles
const WORLD_W = MAP_W * TILE, WORLD_H = MAP_H * TILE;
const GATE_TX = [DCOLS * PERIOD + 1, DCOLS * 2 * PERIOD + 1];   // tile column of the barricade between districts (middle of the road)
const DIST_SPLIT = [GATE_TX[0] * TILE + 16, GATE_TX[1] * TILE + 16];

/* ---------- simulation ---------- */
const STEP = 1 / 60;
const ACTIVE_R = 760;                   // entities this close to the player are simulated
const MAX_SPEED = 840;
const IMPACT_K = 9e-5;                  // kinetic energy -> damage. THE main balance knob.
const IMPACT_MIN = 110;                 // closing speed below this does no damage
const PLAYER_SPEED = 196, DASH_SPEED = 640, DASH_TIME = .17;
const TK_RANGE = 250;
const CAM_D = 1500;                     // virtual camera height used for building perspective
const VIEW_H = 340;                     // world units visible vertically
const KARMA_MAX = 100;

/* camera in world units (filled in by the renderer each frame) */
const cam = { x: 0, y: 0, w: 960, h: VIEW_H, zoom: 1, scale: 1, cx: 0, cy: 0, trauma: 0, sx: 0, sy: 0, viewH: VIEW_H };

/* ---------- math ---------- */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const dist2 = (a, b) => (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
const dist = (a, b) => Math.sqrt(dist2(a, b));
const TAU = Math.PI * 2;
function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }
function approach(v, t, s) { return v < t ? Math.min(t, v + s) : Math.max(t, v - s); }
function hash2(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return (h ^ (h >>> 16)) >>> 0; }
function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let srand = mulberry(1337);             // seeded rng for the static city layout
const srange = (a, b) => a + srand() * (b - a);
const spick = a => a[Math.floor(srand() * a.length)];

/* ---------- colour ---------- */
const _rgbCache = {};
function rgb(h) {
  let c = _rgbCache[h]; if (c) return c;
  const n = parseInt(h.slice(1), 16); c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; _rgbCache[h] = c; return c;
}
function hex(r, g, b) { return '#' + ((1 << 24) | (clamp(r | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(b | 0, 0, 255)).toString(16).slice(1); }
function mix(a, b, t) { const A = rgb(a), B = rgb(b); return hex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)); }
function shade(h, k) { const A = rgb(h); return hex(A[0] * k, A[1] * k, A[2] * k); }
function rgba(h, a) { const A = rgb(h); return `rgba(${A[0]},${A[1]},${A[2]},${a})`; }
