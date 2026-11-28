/* ============================== 09d PEOPLE ============================== */
/* Civilians get a role, so the street reads as people with lives rather than a crowd:
     walkers (streamed in like before): commuter (brisk), stroller (slow, stops to look about), jogger (runs, never
       stops), gawker (films trouble instead of running), and anyone may stop to chat with someone passing.
     fixed (placed at spots, always there): busker (plays; people stop to listen), vendor (a food cart; people queue),
       gardener (tends a planter), tinkerer (fixes things at a charging post: sparks), kids (chase each other in parks).
   Small speech bubbles show what they are doing. No sprites change: this is behaviour, a few particles and an iso cart. */
const WALKER_ROLES = { commuter: 5, stroller: 3, jogger: 1.4, gawker: 1.6 };
function pickWalkerRole() { let s = 0; for (const k in WALKER_ROLES) s += WALKER_ROLES[k]; let r = Math.random() * s; for (const k in WALKER_ROLES) { r -= WALKER_ROLES[k]; if (r <= 0) return k; } return 'commuter'; }
function giveRole(e, role) {
  e.role = role;
  e.speed = { commuter: 64, stroller: 34, jogger: 112, gawker: 50, busker: 0, vendor: 0, gardener: 30, tinkerer: 30, kid: 90 }[role] || 52;
  if (role === 'jogger') e.umb = null;
  if (role === 'commuter' && Math.random() < .5) e.umb = e.umb;   // commuters carry umbrellas as before
  return e;
}
function civSay(e, txt, t = 1.6) { e.say = { txt, t, max: t }; }
const SAY_IDLE = { commuter: ['…', '!'], stroller: ['…', '♪', '?'], gawker: ['…'], kid: ['!', '♪'] };

/* ---------- placed people ---------- */
function populatePeople() {
  const placed = [];
  const put = (role, x, y, o) => { if (!walkable(x, y, 6)) return null; const c = giveRole(spawnCiv(x, y, Object.assign({ fixed: true, home: { x, y }, umb: null }, o || {})), role); placed.push(c); return c; };
  // gardeners and tinkerers at the street furniture
  for (const f of streetFurniture()) {
    const fx = f.side ? f.x - 10 : f.x + 10, fy = f.side ? f.y + 10 : f.y - 10;   // stand on the pavement side of it
    if (f.k === 'planter' && f.s < .35) put('gardener', f.side ? f.x - 14 : f.x + 11, f.side ? f.y + 11 : f.y - 12, { spot: { x: f.x + 10, y: f.y + 4 } });
    if (f.k === 'kiosk' && f.s < .4) put('tinkerer', f.side ? f.x - 12 : f.x + 2, f.side ? f.y + 2 : f.y - 12, { spot: { x: f.x + 2, y: f.y + 2 } });
  }
  for (const b of blocks) {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, r = mulberry(hash2(b.x + 7, b.y + 13));
    if (b.kind === 'park' && r() < .7) { for (let i = 0; i < 2 + (r() < .5 ? 1 : 0); i++) put('kid', cx + rnd(-40, 40), cy + rnd(-40, 40)); }   // kids on the park paths
    if ((b.kind === 'bld' || b.kind === 'park') && r() < .28) {   // a busker on a street corner
      const c = put('busker', b.x + 16, b.y + b.h - 16); if (c) c.inst = pick(['guitar', 'sax', 'drum']);
    }
    if ((b.kind === 'bld' || b.kind === 'court') && r() < .32) {   // a food cart on the pavement (not in car parks)
      const x = b.x + 60 + r() * 150, y = b.y + b.h - 18; const c = put('vendor', x, y - 12); if (c) { c.cart = { x, y: y + 2 }; c.food = pick(['NOODLES', 'TACOS', 'COFFEE', 'DUMPLINGS']); c.ang = Math.PI / 2; }
    }
  }
  return placed;
}

/* ---------- per role ---------- */
function nearestRole(e, role, r) { let b = null, bd = r * r; for (const o of act) if (o !== e && !o.dead && o.role === role) { const d = dist2(o, e); if (d < bd) { bd = d; b = o; } } return b; }
function bigNoiseNear(e, r) { for (const l of dlights) if (l.r > 120 && Math.hypot(l.x - e.x, l.y - e.y) < r) return l; return null; }
// returns true if the role handled this tick (aiCivilian then skips its usual walking)
function roleTick(e, dt) {
  const k = e.role; if (!k) return false;
  if (e.say) { e.say.t -= dt; if (e.say.t <= 0) e.say = null; }
  // a pause in place: chatting, listening, queueing, looking about, filming
  if (e.pauseT > 0) {
    e.pauseT -= dt; steer(e, 0, 0, 0, dt, 6);
    if (e.faceTo) face(e, Math.atan2(e.faceTo.y - e.y, e.faceTo.x - e.x), dt, 8);
    if (e.filming && Math.random() < dt * 1.2) { FX.flash(e.x, e.y - 6, 14, '#ffffff', .06, .8); civSay(e, '◉', .5); }
    if (e.pauseT <= 0) { e.faceTo = null; e.filming = false; }
    return true;
  }
  if (k === 'busker') {
    face(e, Math.PI / 2, dt, 4); steer(e, 0, 0, 0, dt);
    if (P && dist(P, e) < 520 && Math.random() < dt * 2.2) parts.push({ k: 'd', x: e.x + rnd(-4, 4), y: e.y - 6, vx: rnd(-14, 14), vy: -36, life: 1.1, max: 1.1, col: pick(['#e0b040', '#f6e7c1', '#c8452e']), w: 2 });
    if (Math.random() < dt * .25) civSay(e, '♪', 1.2);
    return true;
  }
  if (k === 'vendor') {
    face(e, Math.PI / 2, dt, 4); steer(e, (e.home.x - e.x) * 4, (e.home.y - e.y) * 4, 30, dt);
    if (Math.random() < dt * .12) civSay(e, e.food === 'COFFEE' ? '☕' : '!', 1.4);
    if (e.cart && Math.random() < dt * 1.5) parts.push({ k: 'm', x: e.cart.x + rnd(-3, 3), y: e.cart.y - 2, vx: rnd(-4, 4), vy: -8, life: 1.2, max: 1.2, col: '#d8d8de', w: rnd(2, 4), g: 1.6 });   // steam off the grill
    return true;
  }
  if (k === 'gardener' || k === 'tinkerer') {
    const s = e.spot || e.home; steer(e, (e.home.x - e.x) * 4, (e.home.y - e.y) * 4, 30, dt); face(e, Math.atan2(s.y - e.y, s.x - e.x), dt, 6);
    e.workT = (e.workT || 0) - dt;
    if (e.workT <= 0) {
      e.workT = rnd(.6, 1.6);
      if (k === 'gardener') { parts.push({ k: 'd', x: s.x + rnd(-6, 6), y: s.y - 2, vx: rnd(-10, 10), vy: -22, life: .7, max: .7, col: pick(['#4e8e3a', '#3e7e32', '#6a4a2a']), w: 2 }); if (Math.random() < .2) civSay(e, '♪', 1); }
      else { FX.sparks(s.x, s.y, 3, ZAP_COL, 90); if (Math.random() < .25) civSay(e, '!', .8); }
    }
    e.walk = 0; return true;
  }
  if (k === 'kid') {   // kids chase each other round the park
    e.chaseT = (e.chaseT || 0) - dt;
    if (e.chaseT <= 0 || !e.it || e.it.dead) { e.chaseT = rnd(2, 4); e.it = nearestRole(e, 'kid', 120); if (Math.random() < .3) civSay(e, '!', .8); }
    const it = e.it, h = e.home;
    if (it) { const away = Math.floor(G.time / 3 + e.id) % 2; const dx = (it.x - e.x) * (away ? -1 : 1), dy = (it.y - e.y) * (away ? -1 : 1); steer(e, dx + (h.x - e.x) * .6, dy + (h.y - e.y) * .6, e.speed, dt, 7); face(e, Math.atan2(e.vy, e.vx), dt, 10); }
    else wander(e, dt, 60, civWalk);
    e.walk += dt * Math.hypot(e.vx, e.vy) * .07; return true;
  }
  // walkers: little stops that make the street feel lived in
  e.lookT = (e.lookT === undefined ? rnd(3, 9) : e.lookT) - dt;
  if (e.lookT <= 0) {
    e.lookT = k === 'stroller' ? rnd(4, 9) : k === 'jogger' ? 999 : rnd(8, 18);
    const friend = k !== 'jogger' ? (() => { for (const o of act) if (o !== e && !o.dead && o.kind === 'civ' && (o.role === 'commuter' || o.role === 'stroller' || o.role === 'gawker') && !(o.pauseT > 0) && dist2(o, e) < 26 * 26) return o; return null; })() : null;
    if (friend && Math.random() < .55) { const t = rnd(2.5, 5); e.pauseT = friend.pauseT = t; e.faceTo = friend; friend.faceTo = e; civSay(e, '…', 1.4); later(1.2, () => !friend.dead && civSay(friend, Math.random() < .5 ? '!' : '…', 1.2)); return true; }   // stop and chat
    const b = nearestRole(e, 'busker', 70) || nearestRole(e, 'vendor', 60);
    if (b && k !== 'jogger' && Math.random() < .6) { e.pauseT = rnd(2.5, 6); e.faceTo = b; if (b.role === 'vendor') civSay(e, '?', 1); return true; }   // listen to the busker, queue at the cart
    if (k === 'stroller' && Math.random() < .6) { e.pauseT = rnd(1.2, 2.6); e.faceTo = { x: e.x + rnd(-40, 40), y: e.y + rnd(-40, 40) }; return true; }   // stop and look about
  }
  if (k === 'gawker') {   // when something big goes off nearby, film it (from a safe-ish distance) instead of running
    const n = bigNoiseNear(e, 360);
    if (n && Math.hypot(n.x - e.x, n.y - e.y) > 110 && !(e.pauseT > 0)) { e.pauseT = rnd(2.5, 4); e.faceTo = { x: n.x, y: n.y }; e.filming = true; civSay(e, '!', .8); return true; }
  }
  if (k === 'jogger' && Math.random() < dt * .05) civSay(e, '♪', 1);
  return false;
}
// how jumpy each role is: gawkers and buskers hold their ground longer, kids and strollers bolt
function roleFear(e) { return { gawker: .6, busker: .8, vendor: .8, jogger: .9, kid: 1.2, stroller: 1.1 }[e.role] || 1; }

/* ---------- drawing: speech bubbles and the vendor's cart ---------- */
function drawCivExtras(e, cx, topY) {
  if (e.say) {
    const a = Math.min(1, e.say.t * 3, (e.say.max - e.say.t) * 8); if (a > .05) {
      ctx.globalAlpha = a; const X = Math.round(cx) + 3, Y = Math.round(topY) - 9;
      ctx.fillStyle = '#07070c'; ctx.fillRect(X - 1, Y - 1, 9, 7); ctx.fillStyle = '#f6e7c1'; ctx.fillRect(X, Y, 7, 5); ctx.fillRect(X, Y + 5, 2, 1); ctx.fillStyle = '#07070c'; ctx.fillRect(X - 1, Y + 6, 1, 1);
      ctx.fillStyle = '#2a1614'; const s = e.say.txt;
      if (s === '…') { ctx.fillRect(X + 1, Y + 2, 1, 1); ctx.fillRect(X + 3, Y + 2, 1, 1); ctx.fillRect(X + 5, Y + 2, 1, 1); }
      else if (s === '!') { ctx.fillStyle = '#c8452e'; ctx.fillRect(X + 3, Y + 1, 1, 2); ctx.fillRect(X + 3, Y + 4, 1, 1); }
      else if (s === '?') { ctx.fillRect(X + 2, Y + 1, 3, 1); ctx.fillRect(X + 4, Y + 2, 1, 1); ctx.fillRect(X + 3, Y + 3, 1, 1); ctx.fillRect(X + 3, Y + 4, 1, 1); }
      else if (s === '♪') { ctx.fillStyle = '#3a6aa8'; ctx.fillRect(X + 4, Y + 1, 1, 3); ctx.fillRect(X + 2, Y + 3, 2, 1); ctx.fillRect(X + 4, Y + 1, 2, 1); }
      else if (s === '◉') { ctx.fillStyle = '#2a1614'; ctx.fillRect(X + 1, Y + 1, 5, 3); ctx.fillStyle = '#f6e7c1'; ctx.fillRect(X + 3, Y + 2, 1, 1); }
      else if (s === '☕') { ctx.fillStyle = '#6a4a2a'; ctx.fillRect(X + 2, Y + 2, 3, 2); ctx.fillRect(X + 5, Y + 2, 1, 1); }
      ctx.globalAlpha = 1;
    }
  }
  if (e.role === 'busker' && e.inst) {   // the instrument case open in front, a few coins in it
    const g = isoXY(e.x + 6, e.y + 8, 0); ctx.fillStyle = '#07070c'; ctx.fillRect(Math.round(g[0]) - 4, Math.round(g[1]) - 2, 9, 3); ctx.fillStyle = '#6a2a2a'; ctx.fillRect(Math.round(g[0]) - 3, Math.round(g[1]) - 1, 7, 1); ctx.fillStyle = '#e0c040'; ctx.fillRect(Math.round(g[0]) - 1, Math.round(g[1]) - 1, 1, 1); ctx.fillRect(Math.round(g[0]) + 2, Math.round(g[1]) - 1, 1, 1);
  }
}
function drawVendorCart(c) {   // a food cart drawn in iso: a box on wheels, a striped awning on poles, a hand-painted sign
  const x = c.x - 12, y = c.y - 6, cols = { NOODLES: '#c8452e', TACOS: '#e0b040', COFFEE: '#6a4a2a', DUMPLINGS: '#2e7a5a' }, col = cols[c.food] || '#c8452e';
  for (const [ox, oy] of [[3, 12], [21, 12]]) { const p = isoXY(x + ox, y + oy, 0); idisc(p[0], p[1] - 1, 1.6, '#1a1a20'); }
  ibox(x, y, 24, 12, 2, 14, '#c8c8c0', shade(col, 1), shade(col, .7));
  { const q = [isoXY(x + 2, y + 12, 9), isoXY(x + 22, y + 12, 9), isoXY(x + 22, y + 12, 13), isoXY(x + 2, y + 12, 13)]; ipoly(q, '#f6e7c1'); }   // the sign board on the front
  for (const [ox, oy] of [[0, 0], [24, 0], [0, 12], [24, 12]]) iline(isoXY(x + ox, y + oy, 16), isoXY(x + ox, y + oy, 30), '#5a5e6a');
  for (let i = 0; i < 6; i++) { const u0 = i * 4 - 2, q = [isoXY(x + u0, y - 2, 31), isoXY(x + u0 + 4, y - 2, 31), isoXY(x + u0 + 4, y + 14, 28), isoXY(x + u0, y + 14, 28)]; ipoly(q, i % 2 ? '#f6e7c1' : col); }
  const lamp = isoXY(x + 12, y + 6, 27); if (LIGHT.lamps) { ipx(lamp[0], lamp[1], '#fff0c8'); iglow(lamp[0], lamp[1], 10, '#ffd9a0', .45); }
}
