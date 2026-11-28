/* ============================== 06 PHYSICS ============================== */
/* Per tick: integrate -> tile collision -> broadphase (spatial hash) -> circle pairs with impulses.
   KEY IDEA: PHYSICS IS THE DAMAGE SYSTEM. On contact, damage comes from kinetic energy:
     dmg = IMPACT_K * 0.5 * m_src * closing^2 * (m_src / (m_src + m_dst))
   so a thrown car flattens grunts, a crate only bruises a brute, and flinging an enemy into a wall
   or into his friends hurts everyone involved. Upgrades just scale this one formula. */
const invM = e => e.static ? 0 : 1 / e.m;

function collideTiles(e) {
  if (e.kind === 'fixer' && !e.held && e.stun <= 0) return;   // the repair drone flies above the roofs
  const r = e.r, x0 = Math.floor((e.x - r) / TILE), x1 = Math.floor((e.x + r) / TILE), y0 = Math.floor((e.y - r) / TILE), y1 = Math.floor((e.y + r) / TILE);
  let worst = 0, nxW = 0, nyW = 0;
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (!isSolidT(tileAt(tx, ty))) continue;
    const rx = tx * TILE, ry = ty * TILE, cx = clamp(e.x, rx, rx + TILE), cy = clamp(e.y, ry, ry + TILE);
    let dx = e.x - cx, dy = e.y - cy; const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    let d = Math.sqrt(d2), nx, ny;
    if (d < 1e-4) { // centre inside the tile: push out along the shortest axis
      const l = e.x - rx, rr = rx + TILE - e.x, t = e.y - ry, b = ry + TILE - e.y, m = Math.min(l, rr, t, b);
      nx = m === l ? -1 : m === rr ? 1 : 0; ny = m === t ? -1 : m === b ? 1 : 0; d = -m;
    } else { nx = dx / d; ny = dy / d; }
    e.x += nx * (r - d); e.y += ny * (r - d);
    const vn = e.vx * nx + e.vy * ny;
    if (vn < 0) { e.vx -= (1 + e.rest) * vn * nx; e.vy -= (1 + e.rest) * vn * ny; if (-vn > worst) { worst = -vn; nxW = nx; nyW = ny; e.hitTile = tx + ty * MAP_W; } }
  }
  if (worst > 0) onWallHit(e, worst, nxW, nyW);
}
function hideoutAtTile(ti) {
  const tx = ti % MAP_W, ty = (ti / MAP_W) | 0, px = tx * TILE + 16, py = ty * TILE + 16;
  for (const h of ents) if (h.kind === 'hideout' && !h.dead && px > h.rect.x && px < h.rect.x + h.rect.w && py > h.rect.y && py < h.rect.y + h.rect.h) return h;
  return null;
}
function onWallHit(e, speed, nx, ny) {
  e.wallHit = speed;
  if (speed < 170) return;
  if (e.prop && !e.driving && (e.thrower || e.held)) {
    const dmg = IMPACT_K * .35 * .5 * e.m * speed * speed;
    hurt(e, dmg, { by: e.thrower });
    if ((e.fuse || (S.e_chain && e.thrower === 'player' && e.thrownT > 0)) && !e.held && !e.dead) { e.hp = 0; kill(e, { by: 'player' }); }
    FX.sparks(e.x - nx * e.r, e.y - ny * e.r, 6, '#ffd9a0', speed * .4); sfx(e.m > 4 ? 'heavy' : 'hit', e.x, e.y, .7);
    if (e.m > 4) shake(.25);
  } else if (!e.prop && !e.static && e.stun > 0 && e.flung && e.kind !== 'player' && (e.kind !== 'boss' || e.lastHitBy === 'player')) {
    const dmg = IMPACT_K * .9 * .5 * Math.max(2, e.m) * speed * speed;
    hurt(e, dmg, { by: e.lastHitBy, slam: true }); FX.dust(e.x - nx * e.r, e.y - ny * e.r, 6); sfx('hit', e.x, e.y); shake(.18);
  }
}
function canHurt(src, dst) {
  if (src.static) return false;
  if (src.prop) {
    if (src.driving || src.bossHeld) return false;
    if (src.held) return dst.kind !== 'player' && dst.kind !== 'civ' && P.holdT > .3 && Math.hypot(src.vx, src.vy) > 260;   // swinging a held object bats enemies (never bystanders)
    if (dst.kind === 'player') return !!src.thrower && src.thrower !== 'player';
    if (src.thrower === 'boss' && dst.team === 'gang') return false;
    return !!src.thrower || Math.hypot(src.vx, src.vy) > 320;
  }
  if (src.kind === 'player') return src.dashT > 0 && dst.kind !== 'civ';
  if (src.stun > 0 && src.kind !== 'player' && src.flung) return dst.kind !== 'player';   // a flung body is a projectile too
  return false;
}
function impactHurt(src, dst, closing) {
  if (closing < IMPACT_MIN || dst.dead || src.dead || !canHurt(src, dst)) return;
  const m = src.kind === 'player' ? 6 : src.m;
  let dmg = IMPACT_K * .5 * m * closing * closing * (m / (m + dst.m));
  if (src.kind === 'player') dmg *= S.dashDmg;
  const byP = src.kind === 'player' || src.thrower === 'player' || (src.stun > 0 && src.lastHitBy === 'player');
  if (byP && src.kind !== 'player') { dmg *= S.tkDmg; if (dst.kind === 'civ' && S.g_prec) return; }
  if (src.held) dmg *= .5;
  if (src.kind === 'boss') dmg = 26;
  if (dst.kind === 'civ' && !byP) dmg = Math.min(dmg, 8);
  dmg = Math.min(dmg, 260); if (dmg < 1) return;
  hurt(dst, dmg, { by: byP ? 'player' : (src.thrower || src.kind), src });
  if (dst.kind === 'player') { const l = dist(src, dst) || 1; dst.vx += (dst.x - src.x) / l * 260; dst.vy += (dst.y - src.y) / l * 260; }
  if (!dst.prop && !dst.static) { dst.stun = Math.max(dst.stun, .45 + Math.min(.6, dmg * .012)); dst.flung = true; if (byP) dst.lastHitBy = 'player'; if (dmg > 18) { dst.vz = 140; } }
  if (dst.prop && byP && !dst.held) { dst.thrower = 'player'; dst.thrownT = Math.max(dst.thrownT, .6); }
  // the projectile pays for it too: cars crumple, crates splinter
  if (src.prop && !src.held && closing > 220) hurt(src, dmg * .35, { by: src.thrower });
  if (src.fuse && !src.held && !src.dead) { src.hp = 0; kill(src, { by: 'player' }); }
  impactFeedback(dmg, (src.x + dst.x) / 2, (src.y + dst.y) / 2, byP);
}
function resolvePair(a, b) {
  if (a.static && b.static) return;
  const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r, d2 = dx * dx + dy * dy;
  if (d2 >= rr * rr) return;
  if ((a.held && b.kind === 'player') || (b.held && a.kind === 'player')) return;
  if (a.heldBy === b || b.heldBy === a) return;
  const d = Math.sqrt(d2) || .001, nx = dx / d, ny = dy / d;
  if (a.team === 'civ' && b.team === 'civ') { const p = (rr - d) * .5; a.x -= nx * p; a.y -= ny * p; b.x += nx * p; b.y += ny * p; return; }
  const ia = invM(a), ib = invM(b), is = ia + ib; if (is === 0) return;
  const pen = rr - d;
  a.x -= nx * pen * ia / is; a.y -= ny * pen * ia / is; b.x += nx * pen * ib / is; b.y += ny * pen * ib / is;
  const ca = a.vx * nx + a.vy * ny, cb = -(b.vx * nx + b.vy * ny);
  const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (vn < 0) {
    const j = -(1 + Math.min(a.rest, b.rest)) * vn / is;
    a.vx -= j * nx * ia; a.vy -= j * ny * ia; b.vx += j * nx * ib; b.vy += j * ny * ib;
    impactHurt(a, b, ca); impactHurt(b, a, cb);
  }
}
const _grid = new Map();
function physics(dt) {
  for (const e of act) {
    if (e.static || e.dead) continue;
    if (e.thrownT > 0) e.thrownT -= dt; else if (e.fuse) e.fuse = false;   // a barrel that came to rest without hitting anything is safe again
    const sp0 = Math.hypot(e.vx, e.vy);
    if (e.thrower && !e.held && e.thrownT <= 0 && sp0 < 60) e.thrower = null;
    if (e.prop && !e.held && !e.driving) { const f = Math.pow(e.z > 1 ? .99 : e.def.fric, dt * 60); e.vx *= f; e.vy *= f; }
    if (e.flung && e.stun <= 0) e.flung = false;
    // GOOD upgrade "precision grip": thrown props curve gently into hostiles
    if (S.g_prec && e.thrower === 'player' && !e.held && e.thrownT > 0 && sp0 > 200) {
      let best = null, bd = 190 * 190;
      for (const o of act) if (!o.dead && !o.static && (o.team === 'gang' || (o.team === 'police' && G.heat >= 1))) {
        const dd = dist2(e, o); if (dd < bd && Math.abs(angDiff(Math.atan2(o.y - e.y, o.x - e.x), Math.atan2(e.vy, e.vx))) < .8) { bd = dd; best = o; }
      }
      if (best) { const want = Math.atan2(best.y - e.y, best.x - e.x), cur = Math.atan2(e.vy, e.vx), na = cur + clamp(angDiff(want, cur), -4 * dt, 4 * dt); e.vx = Math.cos(na) * sp0; e.vy = Math.sin(na) * sp0; }
    }
    const sp = Math.hypot(e.vx, e.vy); if (sp > MAX_SPEED) { e.vx *= MAX_SPEED / sp; e.vy *= MAX_SPEED / sp; }
    e.x += e.vx * dt; e.y += e.vy * dt;
    if (e.vz || e.z > 0) {
      if (!e.held) { e.vz = (e.vz || 0) - 520 * dt; e.z += e.vz * dt; if (e.z <= 0) { if (e.vz < -120 && e.prop) { FX.dust(e.x, e.y, 3); } e.z = 0; e.vz = 0; } }
    }
    if (e.spin) { e.ang += e.spin * dt; e.spin *= Math.pow(.95, dt * 60); if (Math.abs(e.spin) < .1) e.spin = 0; }
    e.wallHit = 0;
    collideTiles(e);
  }
  _grid.clear();
  for (const e of act) {
    if (e.dead) continue;
    const k = ((e.x / 64) | 0) * 1024 + ((e.y / 64) | 0); let c = _grid.get(k); if (!c) { c = []; _grid.set(k, c); } c.push(e);
  }
  for (const a of act) {
    if (a.dead) continue;
    const cx = (a.x / 64) | 0, cy = (a.y / 64) | 0;
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      const c = _grid.get((cx + ox) * 1024 + cy + oy); if (!c) continue;
      for (const b of c) if (b.id > a.id && !b.dead && !a.dead) resolvePair(a, b);
    }
  }
}
