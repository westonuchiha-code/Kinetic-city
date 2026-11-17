/* ============================== 04b TIME OF DAY ============================== */
/* The city is an ordinary one now (brick and brownstone, plain street lamps, painted shop signs), and it comes in three
   times of day. A time of day is ONLY colours and light: no drawing changes shape. `applyTime` repaints the district
   palettes and every building's wall, roof and window colours, sets the light levels in LIGHT, and throws away the
   cached pictures so they are painted again. The story can call `applyTime('day')` and so on per chapter later.
   The old neon-night palette is gone on purpose (the user found it generic). */
const TIMES = {
  sunset: { label: 'Sunset',
    walls: [['#a8563e', '#b8664a', '#96483a', '#c07a52', '#8a5a4a', '#b89a78'], ['#9a4a38', '#8a4434', '#a86048', '#7a5446', '#a07a5a'], ['#b0a698', '#9aa4b0', '#c0b49e', '#8e98a8', '#a89888']],
    roofs: [['#5a5560', '#645e66', '#504c58'], ['#5a4e4a', '#665650', '#4e4442'], ['#62646e', '#6c6e78', '#585a64']],
    ground: ['#4a4252', '#4c4250', '#484456'], side: ['#9a7e74', '#927468', '#9c847c'], plaza: ['#806a70', '#7a6466', '#84707a'],
    lamp: '#ffd9a0', win: ['#ffd890', '#ffe7b0', '#ffc878', '#fff0c8'], lit: .3,
    glow: .5, pools: .5, lamps: true, tint: 'rgba(255,120,60,.2)', green: 2.1, sea: 2.6, seaTint: '#c8785a' },
  night: { label: 'Night',
    walls: [['#5e3a34', '#6a4238', '#553430', '#70503e', '#4e3e3a', '#6a5e52'], ['#583028', '#4e2c26', '#603c30', '#463630', '#5c4a3c'], ['#5a5a62', '#50586a', '#66605a', '#4a5262', '#5c5650']],
    roofs: [['#2e2e38', '#34343e', '#2a2a32'], ['#30292a', '#382e2c', '#2a2424'], ['#30323c', '#363842', '#2a2c36']],
    ground: ['#1d1e26', '#1e1c22', '#1c1e28'], side: ['#3c3c44', '#38343a', '#3e4048'], plaza: ['#32323a', '#302c32', '#34363e'],
    lamp: '#ffb866', win: ['#ffd890', '#ffe7b0', '#ffc878', '#cfe4ff'], lit: .34,
    glow: .6, pools: 1, lamps: true, tint: null, green: 1.25, sea: 1, seaTint: null },
  day: { label: 'Day',
    walls: [['#b0604a', '#c07256', '#a05244', '#c88a62', '#96685a', '#c4aa8a'], ['#a4543e', '#94503e', '#b06a52', '#866052', '#aa8866'], ['#bcb4a8', '#a8b2c0', '#ccc2ae', '#9ca8b8', '#b4a698']],
    roofs: [['#6c6a74', '#76727a', '#62606a'], ['#6a5e5a', '#766660', '#5e5450'], ['#74767e', '#7e8088', '#6a6c76']],
    ground: ['#5c5e68', '#5e5a60', '#5c5e6a'], side: ['#a8a6a2', '#9e9690', '#aeaeac'], plaza: ['#928e94', '#8a8486', '#96969c'],
    lamp: '#fff2d8', win: ['#6a7a8a', '#7a8898', '#5e6c7c', '#8a96a4'], lit: .5,
    glow: .3, pools: .12, lamps: false, tint: null, green: 2.6, sea: 3.4, seaTint: '#5a8ab0' }
};
const TIME_ORDER = ['sunset', 'night', 'day'];
const SIGN_COLS = NEON_GOOD;   // painted shop signs and awnings (the lists live in 04_world.js under their old names)
// light levels the renderer reads: glow (signs, windows, flashes), pools (light on the ground), lamps lit, a wash over the picture, how green the green is, how light the water is
const LIGHT = { glow: 1, pools: 1, lamps: true, tint: null, green: 1, sea: 1, seaTint: null, name: 'night' };
function applyTime(name) {
  const L = TIMES[name] || TIMES.sunset; name = TIMES[name] ? name : 'sunset';
  Object.assign(LIGHT, { glow: L.glow, pools: L.pools, lamps: L.lamps, tint: L.tint, green: L.green, sea: L.sea, seaTint: L.seaTint, name });
  for (let d = 0; d < 3; d++) Object.assign(DIST[d], { ground: L.ground[d], side: L.side[d], plaza: L.plaza[d], neon: SIGN_COLS, lamp: L.lamp, roof: L.roofs[d], wall: L.walls[d][0] });
  for (const b of buildings) {
    b._art = null; if (b.frame) continue;
    const h = hash2(b.x, b.y);
    b.wall = L.walls[b.d][h % L.walls[b.d].length]; b.roof = L.roofs[b.d][(h >>> 5) % L.roofs[b.d].length]; b.lit = L.lit * (.6 + (h % 80) / 100); b.trim = null;
    for (const side of b.win) for (const w of side) w.c = L.win[((w.roll * 977) | 0) % L.win.length];
  }
  for (const t of trees) t._cv = null;
  if (typeof GND !== 'undefined') GND.clear();
  if (typeof drawMinimapBase === 'function' && mmCanvas) drawMinimapBase();
}

/* ---------- weather ----------
   A rainy city (think Seattle): showers come and go on their own at any time of day, a bit more often wet than dry.
   WEATHER.rain is how hard it is raining right now, 0 to 1; it fades in and out over a few seconds. Rain streaks,
   splashes, the rain sound, the overcast wash and people's umbrellas all read it, so nobody carries an umbrella in the
   dry. `setWeather('rain' | 'dry' | 'auto')` lets the story (or a test) fix it. */
const WEATHER = { rain: 0, wet: false, t: 0, hold: null };
function setWeather(m) { WEATHER.hold = m === 'rain' ? true : m === 'dry' ? false : null; if (WEATHER.hold !== null) { WEATHER.wet = WEATHER.hold; WEATHER.rain = WEATHER.wet ? 1 : 0; } }
function startWeather() { WEATHER.wet = Math.random() < .55; WEATHER.rain = WEATHER.wet ? 1 : 0; WEATHER.t = WEATHER.wet ? rnd(50, 120) : rnd(40, 90); }
function updateWeather(dt) {
  if (WEATHER.hold === null) { WEATHER.t -= dt; if (WEATHER.t <= 0) { WEATHER.wet = !WEATHER.wet; WEATHER.t = WEATHER.wet ? rnd(70, 160) : rnd(50, 110); } }   // showers 70-160 s, dry spells 50-110 s
  WEATHER.rain = approach(WEATHER.rain, WEATHER.wet ? 1 : 0, dt / 6);
  if (typeof Audio2 !== 'undefined' && Audio2.setRain) Audio2.setRain(WEATHER.rain);
}
