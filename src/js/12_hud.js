/* ============================== 12 HUD ============================== */
/* Drawn in CSS pixels on top of the world. Every button prompt is drawn with the live glyph for the
   device you last touched (Xbox letters, PlayStation shapes, or keys/mouse). */
const FONT = '"Chakra Petch","Segoe UI",system-ui,sans-serif';
const font = (px, w = 600) => `${w} ${Math.round(px)}px ${FONT}`;
let hs = 1, hpTrail = 100;
function hudText(str, x, y, px, col = '#e8ecf7', align = 'left', w = 600, shadow = true) {
  ctx.font = font(px, w); ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (shadow) { ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillText(str, x + 1, y + 1.5); }
  ctx.fillStyle = col; ctx.fillText(str, x, y);
  return ctx.measureText(str).width;
}
function rr(x, y, w, h, r) { roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); }

/* ---------- neon look ----------
   Same language as the menus: dark plates that lean like the menu buttons (9 degrees), a glowing coloured edge,
   one colour per thing. The glow on shapes is the edge stroked three times (wide and faint, then tight and bright),
   which costs almost nothing; only a few big words use a real blurred shadow. */
const NEON = { cyan: '#3ce0ff', pink: '#ff3d8b', gold: '#ffc24a', purple: '#b26bff', green: '#4dff9a' };
const SLANT = .16;
function slantPath(x, y, w, h, k = SLANT) { const o = h * k; ctx.beginPath(); ctx.moveTo(x + o, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - o, y + h); ctx.lineTo(x, y + h); ctx.closePath(); }
function neonStroke(col, a = 1, lw = 1.5 * hs) {   // strokes the current path as a lit tube
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(col, .09 * a); ctx.lineWidth = lw + 8 * hs; ctx.stroke();
  ctx.strokeStyle = rgba(col, .2 * a); ctx.lineWidth = lw + 3.5 * hs; ctx.stroke();
  ctx.strokeStyle = rgba(col, Math.min(1, .95 * a)); ctx.lineWidth = lw; ctx.stroke();
}
function neonFill(col, a = 1) {                     // fills the current path with a soft halo round it
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(col, .1 * a); ctx.lineWidth = 8 * hs; ctx.stroke();
  ctx.strokeStyle = rgba(col, .2 * a); ctx.lineWidth = 3.5 * hs; ctx.stroke();
  ctx.fillStyle = col; ctx.fill();
}
function plate(x, y, w, h, col, a = .8, tint = .07, k = SLANT) {   // leaning dark plate with a neon edge
  slantPath(x, y, w, h, k); ctx.fillStyle = 'rgba(7,9,18,.8)'; ctx.fill();
  if (tint) { ctx.fillStyle = rgba(col, tint); ctx.fill(); }
  neonStroke(col, a);
}
/* Glowing pieces that rarely change (sign lettering, ability tiles) are painted once into a small off-screen canvas
   and stamped from then on, so blurs and halos are not recomputed every frame. draw() paints into a w x h box at 0,0. */
const _stamps = new Map();
if (document.fonts) { document.fonts.ready.then(() => _stamps.clear()); if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => _stamps.clear()); }   // lettering stamped before the web font arrived would keep the fallback font
function stamp(key, x, y, w, h, draw) {
  key += '|' + DPR; let c = _stamps.get(key);
  if (!c) {
    if (_stamps.size > 140) _stamps.clear();
    c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w * DPR)); c.height = Math.max(1, Math.ceil(h * DPR));
    const keep = ctx; ctx = c.getContext('2d'); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    try { c.info = draw(); } finally { ctx = keep; }
    _stamps.set(key, c);
  }
  ctx.drawImage(c, Math.round(x * DPR) / DPR, Math.round(y * DPR) / DPR, c.width / DPR, c.height / DPR); return c.info;
}
function glowText(str, x, y, px, col, align = 'left', w = 700, core) {   // sign lettering: coloured glow, optional pale core
  ctx.font = font(px, w); const tw = ctx.measureText(str).width, blur = Math.max(6, px * .55), pad = blur * 1.6 + 2, bh = px * 1.3 + pad * 2;
  stamp('t|' + str + '|' + Math.round(px * 4) + '|' + col + '|' + w + '|' + (core || ''), x - (align === 'center' ? tw / 2 : align === 'right' ? tw : 0) - pad, y - bh / 2, tw + pad * 2, bh, () => {
    ctx.font = font(px, w); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillText(str, pad + 1, bh / 2 + 1.5);
    ctx.shadowColor = col; ctx.shadowBlur = blur * DPR; ctx.fillStyle = col; ctx.fillText(str, pad, bh / 2);
    if (core) { ctx.shadowBlur = px * .2 * DPR; ctx.fillStyle = core; ctx.fillText(str, pad, bh / 2); }
  });
  return tw;
}

/* ---------- glyphs ---------- */
function glyphWidth(act, sz) {
  const g = Input.glyph(act); ctx.font = font(sz * .5, 700);
  if (g.kind === 'face' || g.kind === 'stick') return sz;
  if (g.kind === 'trigger') return sz * 1.2;
  if (g.kind === 'shoulder') return sz * 1.35;
  if (g.kind === 'mouse') return sz * .8;
  return Math.max(sz, ctx.measureText(g.text).width + sz * .55);
}
function drawGlyph(act, x, y, sz) { // x = left edge, y = vertical centre; returns width
  const g = Input.glyph(act), w = glyphWidth(act, sz), cx = x + w / 2, lw = Math.max(1.2, sz * .07);
  ctx.save(); ctx.lineWidth = lw; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (g.kind === 'face') {
    ctx.fillStyle = '#0d0f16'; circle(cx, y, sz / 2); ctx.strokeStyle = g.color; ctx.beginPath(); ctx.arc(cx, y, sz / 2 - lw / 2, 0, TAU); ctx.stroke();
    if (g.shape) {
      const s = sz * .2; ctx.strokeStyle = g.color; ctx.lineWidth = lw * 1.2; ctx.beginPath();
      if (g.shape === 'cross') { ctx.moveTo(cx - s, y - s); ctx.lineTo(cx + s, y + s); ctx.moveTo(cx + s, y - s); ctx.lineTo(cx - s, y + s); }
      else if (g.shape === 'circle') ctx.arc(cx, y, s * 1.1, 0, TAU);
      else if (g.shape === 'square') ctx.rect(cx - s, y - s, s * 2, s * 2);
      else { ctx.moveTo(cx, y - s * 1.2); ctx.lineTo(cx + s * 1.15, y + s * .8); ctx.lineTo(cx - s * 1.15, y + s * .8); ctx.closePath(); }
      ctx.stroke();
    } else { ctx.fillStyle = g.color; ctx.font = font(sz * .55, 700); ctx.fillText(g.text, cx, y + 1); }
  } else if (g.kind === 'trigger' || g.kind === 'shoulder' || g.kind === 'pill' || g.kind === 'key') {
    const h = g.kind === 'shoulder' ? sz * .72 : g.kind === 'pill' ? sz * .7 : sz * .9;
    ctx.fillStyle = g.kind === 'key' ? '#1a1e2a' : '#0d0f16';
    if (g.kind === 'trigger') { ctx.beginPath(); ctx.moveTo(x + 1, y + h / 2); ctx.lineTo(x + 1, y - h / 6); ctx.quadraticCurveTo(x + 1, y - h / 2, x + w * .4, y - h / 2); ctx.lineTo(x + w - w * .4, y - h / 2); ctx.quadraticCurveTo(x + w - 1, y - h / 2, x + w - 1, y - h / 6); ctx.lineTo(x + w - 1, y + h / 2); ctx.closePath(); }
    else rr(x + 1, y - h / 2, w - 2, h, g.kind === 'pill' ? h / 2 : g.kind === 'key' ? 4 : h * .4);
    ctx.fill(); ctx.strokeStyle = g.kind === 'key' ? '#5a6278' : '#9aa4c0'; ctx.stroke();
    ctx.fillStyle = '#e8ecf7'; ctx.font = font(sz * (g.text.length > 3 ? .36 : .46), 700); ctx.fillText(g.text, cx, y + 1);
  } else if (g.kind === 'stick') {
    ctx.fillStyle = '#0d0f16'; circle(cx, y, sz / 2); ctx.strokeStyle = '#9aa4c0'; ctx.beginPath(); ctx.arc(cx, y, sz / 2 - lw / 2, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, y, sz * .3, 0, TAU); ctx.stroke(); ctx.fillStyle = '#e8ecf7'; ctx.font = font(sz * .34, 700); ctx.fillText(g.text, cx, y + 1);
  } else if (g.kind === 'mouse') {
    const mw = sz * .66, mh = sz * .92; ctx.fillStyle = '#1a1e2a'; rr(cx - mw / 2, y - mh / 2, mw, mh, mw / 2); ctx.fill(); ctx.strokeStyle = '#7a84a0'; ctx.stroke();
    ctx.fillStyle = '#3ce0ff'; ctx.beginPath(); if (g.text === 'L') { ctx.moveTo(cx, y - mh / 2 + 2); ctx.lineTo(cx, y - mh * .05); ctx.lineTo(cx - mw / 2 + 2, y - mh * .05); ctx.arc(cx, y - mh / 2 + mw / 2, mw / 2 - 2, Math.PI, Math.PI * 1.5); }
    else { ctx.moveTo(cx, y - mh / 2 + 2); ctx.lineTo(cx, y - mh * .05); ctx.lineTo(cx + mw / 2 - 2, y - mh * .05); ctx.arc(cx, y - mh / 2 + mw / 2, mw / 2 - 2, 0, -Math.PI * .5, true); }
    ctx.fill();
  }
  ctx.restore(); return w;
}
function glyphLineWidth(items, sz) {
  let total = 0; const gap = sz * .3;
  for (const it of items) total += (it.a ? glyphWidth(it.a, sz) : (ctx.font = font(sz * .58), ctx.measureText(it.t).width)) + gap;
  return total;
}
function glyphLine(items, x, y, sz, align = 'left') { // items: [{a: action} | {t: text, c: colour}]
  const total = glyphLineWidth(items, sz), gap = sz * .3;
  let cx = align === 'center' ? x - total / 2 : x;
  for (const it of items) { if (it.a) cx += drawGlyph(it.a, cx, y, sz) + gap; else cx += hudText(it.t, cx, y, sz * .58, it.c || '#e8ecf7') + gap; }
  return total;
}
const toScreen = (x, y, h = 0) => isoToScreen(x, y, h);   // h = height above the ground point

/* ---------- ability icons ---------- */
function abilityIcon(k, x, y, s, col, lw = 2) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (k === 'tk') { ctx.strokeRect(-s * .3, -s * .05, s * .6, s * .4); ctx.beginPath(); ctx.moveTo(-s * .35, -s * .25); ctx.lineTo(0, -s * .42); ctx.lineTo(s * .35, -s * .25); ctx.stroke(); }
  else if (k === 'rep') { for (let i = 1; i <= 3; i++) { ctx.globalAlpha *= i === 1 ? 1 : .72; ctx.beginPath(); ctx.arc(0, 0, s * .13 * i, 0, TAU); ctx.stroke(); } }
  else if (k === 'well') { ctx.beginPath(); for (let i = 0; i < 40; i++) { const a = i * .38, r = s * .03 + i * s * .0105; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.stroke(); }
  else if (k === 'dash') { ctx.beginPath(); ctx.moveTo(-s * .3, -s * .2); ctx.lineTo(0, 0); ctx.lineTo(-s * .3, s * .2); ctx.moveTo(-s * .02, -s * .2); ctx.lineTo(s * .28, 0); ctx.lineTo(-s * .02, s * .2); ctx.stroke(); }
  else if (k === 'abs') { ctx.beginPath(); ctx.moveTo(0, -s * .36); ctx.lineTo(s * .3, -s * .22); ctx.lineTo(s * .26, s * .12); ctx.lineTo(0, s * .36); ctx.lineTo(-s * .26, s * .12); ctx.lineTo(-s * .3, -s * .22); ctx.closePath(); ctx.stroke(); }
  ctx.restore();
}
function drawAbilities() {
  const p = P, sz = 50 * hs, gap = 10 * hs, y = H - 28 * hs - sz, x0 = 24 * hs;
  const list = [
    { a: 'well', k: 'well', name: 'Well', cd: p.wellCd / 2.2, cost: 32, col: NEON.purple },
    { a: 'abs', k: 'abs', name: 'Absorb', cd: 0, cost: 3, on: p.absorbing, col: NEON.cyan },
    { a: 'dash', k: 'dash', name: 'Dash', cd: p.dashCd / .42, cost: S.dashCost, col: NEON.gold },
    { a: 'rep', k: 'rep', name: 'Push', cd: p.repCd / .55, cost: 22, col: NEON.pink },
    { a: 'tk', k: 'tk', name: p.holding ? 'Throw' : 'Grab', cd: 0, cost: 6, on: !!p.holding, col: NEON.green }
  ];
  list.forEach((it, i) => {   // one leaning neon tile per power, each in its own colour; out of energy or cooling down = unlit
    const x = x0 + i * (sz + gap), ok = p.energy >= it.cost && it.cd <= 0, lit = ok || it.on, cx = x + sz / 2, pd = 8 * hs;
    stamp('ab|' + it.k + '|' + Math.round(sz * 4) + '|' + (it.on ? 2 : ok ? 1 : 0), x - 3 * hs - pd, y - pd, sz + 6 * hs + pd * 2, sz + pd * 2, () => {
      const X = pd, Y = pd, ix = X + 3 * hs + sz / 2, iy = Y + sz / 2 - 1 * hs;
      if (lit) plate(X, Y, sz + 6 * hs, sz, it.col, it.on ? 1.15 : .8, it.on ? .3 : .08);
      else { slantPath(X, Y, sz + 6 * hs, sz); ctx.fillStyle = 'rgba(7,9,18,.8)'; ctx.fill(); ctx.strokeStyle = rgba(it.col, .28); ctx.lineWidth = 1.5 * hs; ctx.stroke(); }
      if (lit) { ctx.globalAlpha = .22; abilityIcon(it.k, ix, iy, sz * .78, it.col, 6 * hs); ctx.globalAlpha = 1; }
      abilityIcon(it.k, ix, iy, sz * .78, lit ? mix(it.col, '#ffffff', it.on ? .8 : .55) : '#4d5466', 2 * hs);
    });
    if (it.cd > 0) {          // cooling down: a shutter over the tile that drains away downwards, with a lit lower edge
      const f = clamp(it.cd, 0, 1); ctx.save(); slantPath(x - 3 * hs, y, sz + 6 * hs, sz); ctx.clip();
      ctx.fillStyle = 'rgba(3,4,9,.62)'; ctx.fillRect(x - 4 * hs, y + sz * (1 - f), sz + 8 * hs, sz * f);
      ctx.fillStyle = rgba(it.col, .7); ctx.fillRect(x - 4 * hs, y + sz * (1 - f) - 1, sz + 8 * hs, 1.5 * hs); ctx.restore();
    }
    const gw = glyphWidth(it.a, 20 * hs); drawGlyph(it.a, cx - gw / 2 + 2 * hs, y - 2 * hs, 20 * hs);
    hudText(it.name.toUpperCase(), cx - 3 * hs, y + sz + 11 * hs, 10.5 * hs, lit ? mix(it.col, '#dfe6f5', .45) : '#5a6070', 'center', 600);
  });
}

/* ---------- main HUD ---------- */
function drawHUD(dt) {
  hs = clamp(H / 760, .5, 1.6) * SETTINGS.hud;
  const p = P, m = 24 * hs;
  if (G.mode === 'map') { drawCityMap(); return; }
  // world-anchored: floating numbers, prompts, objective marker
  for (const e of ents) if (e.leader && !e.dead && inView(e.x, e.y, 40)) { // hideout lieutenant: name + health
    const s = toScreen(e.x, e.y, 52), bw = 70 * hs;
    hudText(e.name, s.x, s.y, 12 * hs, '#ffc24a', 'center', 700);
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(s.x - bw / 2, s.y + 9 * hs, bw, 5 * hs); ctx.fillStyle = '#ff3d5a'; ctx.fillRect(s.x - bw / 2 + 1, s.y + 9 * hs + 1, (bw - 2) * Math.max(0, e.hp / e.maxhp), 5 * hs - 2);
  }
  for (const t of texts) {
    const s = toScreen(t.x, t.y, 12 - (t.max - t.life) * t.vy), a = clamp(t.life / t.max * 2, 0, 1), pop = 1 + Math.max(0, (t.life - t.max + .12) * 4);
    ctx.globalAlpha = a; hudText(t.text, s.x, s.y, 14 * hs * t.size * pop, t.col, 'center', 700); ctx.globalAlpha = 1;
  }
  if (G.mode === 'play') {
    if (tkTarget && !p.holding) { const s = toScreen(tkTarget.x, tkTarget.y, (tkTarget.z || 0) * .8 + tkTarget.r * 2.6 + 14); const w = glyphWidth('tk', 22 * hs); drawGlyph('tk', s.x - w / 2, s.y, 22 * hs); }
    if (p.near && (p.near.heal || p.near.drain) && !p.holding) {
      const c = p.near.heal || p.near.drain, s = toScreen(c.x, c.y, 44), items = [];
      if (p.near.heal) items.push({ a: 'heal' }, { t: 'Heal', c: '#5fe8ff' });
      if (p.near.drain && (p.near.heal || G.karma < 0 || S.e_tithe)) items.push({ a: 'drain' }, { t: 'Drain', c: '#ff5a7a' });
      if (items.length) { const w = glyphLineWidth(items, 22 * hs); ctx.fillStyle = 'rgba(6,8,16,.7)'; rr(s.x - w / 2 - 8, s.y - 15 * hs, w + 12, 30 * hs, 8); ctx.fill(); glyphLine(items, s.x, s.y, 22 * hs, 'center'); }
    }
    drawWaypoint();
  }
  // ---- top-left: vitals
  hpTrail = Math.max(p.hp, hpTrail - dt * 40); if (hpTrail < p.hp) hpTrail = p.hp;
  const bw = 250 * hs, bh = 13 * hs, bx = m + 50 * hs, by = m + 4 * hs;
  stamp('vit|' + Math.round(hs * 400), m - 30 * hs, m - 22 * hs, bw + 110 * hs, 122 * hs, () => {   // the plate: dark, leaning, with the menus' cyan-to-pink sign line along the top
    const px = 12 * hs, py = 12 * hs, pw = bw + 86 * hs, ph = 98 * hs, o = ph * SLANT;
    slantPath(px, py, pw, ph); ctx.fillStyle = 'rgba(7,9,18,.78)'; ctx.fill(); ctx.strokeStyle = 'rgba(150,175,225,.16)'; ctx.lineWidth = 1; ctx.stroke();
    const lg = ctx.createLinearGradient(px + o, 0, px + pw, 0); lg.addColorStop(0, NEON.cyan); lg.addColorStop(.6, NEON.pink); lg.addColorStop(1, rgba(NEON.pink, 0));
    ctx.beginPath(); ctx.moveTo(px + o, py); ctx.lineTo(px + pw, py); ctx.strokeStyle = lg; ctx.lineCap = 'round';
    ctx.globalAlpha = .12; ctx.lineWidth = 10 * hs; ctx.stroke(); ctx.globalAlpha = .28; ctx.lineWidth = 5 * hs; ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 2 * hs; ctx.stroke(); ctx.lineCap = 'butt';
  });
  // level badge
  ctx.save(); ctx.translate(m + 18 * hs, by + 14 * hs); ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.rect(-15 * hs, -15 * hs, 30 * hs, 30 * hs); ctx.fillStyle = '#10131f'; ctx.fill(); ctx.fillStyle = rgba(NEON.gold, .1); ctx.fill(); neonStroke(NEON.gold, 1, 2 * hs); ctx.restore();
  glowText(String(G.level), m + 18 * hs, by + 15 * hs, 17 * hs, NEON.gold, 'center', 700, '#fff3d6');
  const lean = (x0, x1, y, h) => { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.lineTo(x1 - h * .6, y + h); ctx.lineTo(x0 - h * .6, y + h); ctx.closePath(); };
  const bar = (y, h, frac, col, trail, w = bw) => {   // a lit tube in a dark track
    lean(bx, bx + w, y, h); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill(); ctx.strokeStyle = rgba(col, .22); ctx.lineWidth = 1; ctx.stroke();
    if (trail !== undefined) { lean(bx, bx + w * clamp(trail, 0, 1), y, h); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); }
    const fw = w * clamp(frac, 0, 1); if (fw <= 0) return;
    lean(bx, bx + fw, y, h); neonFill(col, h > 4 * hs ? 1 : .7);
    if (h > 5 * hs) { lean(bx - h * .1, bx + fw - h * .1, y + h * .12, h * .3); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fill(); }   // highlight along the top of the tube
  };
  const low = p.hp < S.maxHp * .3, hpCol = low ? (Math.sin(G.time * 9) > 0 ? '#ff2a4a' : '#ff6a80') : '#ff3d6e';
  bar(by, bh, p.hp / S.maxHp, hpCol, hpTrail / S.maxHp);
  hudText(Math.ceil(p.hp) + '', bx + bw + 8 * hs, by + bh / 2, 12 * hs, '#ffb0c0', 'left', 700);
  bar(by + bh + 6 * hs, 8 * hs, p.energy / S.maxEn, NEON.cyan, undefined, bw * .86);
  ctx.fillStyle = 'rgba(4,6,12,.75)'; for (let e = 25; e < S.maxEn; e += 25) { const x = bx + bw * .86 * e / S.maxEn; lean(x - 1, x + 1, by + bh + 6 * hs, 8 * hs); ctx.fill(); }
  bar(by + bh + 19 * hs, 3 * hs, G.xp / xpNeed(), NEON.gold, undefined, bw * .86);
  // karma meter
  const ky = by + bh + 36 * hs, kw = bw * .86;
  const kg = ctx.createLinearGradient(bx, 0, bx + kw, 0); kg.addColorStop(0, '#ff3355'); kg.addColorStop(.5, '#4a5064'); kg.addColorStop(1, '#38d0ff');
  ctx.fillStyle = kg; ctx.globalAlpha = .22; ctx.fillRect(bx - 2 * hs, ky - 2.5 * hs, kw + 4 * hs, 9 * hs); ctx.globalAlpha = 1; ctx.fillRect(bx, ky, kw, 4 * hs);
  const kx = bx + (G.karma + 100) / 200 * kw; ctx.fillStyle = rgba(karmaColor(), .3); ctx.fillRect(kx - 4.5, ky - 5.5 * hs, 9, 15 * hs); ctx.fillStyle = '#fff'; ctx.fillRect(kx - 1.5, ky - 4 * hs, 3, 12 * hs);
  ctx.fillStyle = 'rgba(255,255,255,.35)'; for (const f of [.2, .4, .6, .8]) ctx.fillRect(bx + kw * f, ky + 5 * hs, 1, 3 * hs);   // rank boundaries
  glowText(karmaTier(), bx, ky + 17 * hs, 12 * hs, karmaColor(), 'left', 700);
  hudText('KARMA ' + (G.karma > 0 ? '+' : '') + Math.round(G.karma * 10), bx + kw, ky + 17 * hs, 11 * hs, '#8790aa', 'right', 600);
  if (G.points > 0) { const y = m + 104 * hs; plate(m - 8 * hs, y - 14 * hs, 236 * hs, 28 * hs, NEON.gold, .55 + .25 * Math.sin(G.time * 4)); glyphLine([{ a: 'menu' }, { t: G.points + ' skill point' + (G.points > 1 ? 's' : '') + ' to spend', c: '#ffc24a' }], m + 2 * hs, y, 20 * hs); }
  // ---- top-right: minimap, district, heat
  drawMinimap(W - m - 210 * hs, m + 24 * hs, 210 * hs, 132 * hs);
  // ---- top-centre: objective + toasts
  const ob = objective();
  let oy = m + 6 * hs;
  ctx.font = font(15 * hs, 600); const ow = ctx.measureText(ob.text).width + 40 * hs;
  plate(W / 2 - ow / 2 - 4 * hs, oy - 14 * hs, ow + 8 * hs, 28 * hs, NEON.gold, .6, .05);
  ctx.save(); ctx.translate(W / 2 - ow / 2 + 16 * hs, oy); ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.rect(-4 * hs, -4 * hs, 8 * hs, 8 * hs); neonFill(NEON.gold); ctx.restore();
  hudText(ob.text, W / 2 + 8 * hs, oy, 15 * hs, '#e8ecf7', 'center', 600);
  oy += 19 * hs;
  for (const t of G.toasts) {
    const a = Math.min(1, t.life, (t.max - t.life) * 6), sz = (t.big ? 20 : 15) * hs, row = sz * 1.5;
    oy += row / 2; ctx.font = font(sz, 700); const tw = ctx.measureText(t.text).width;
    ctx.globalAlpha = a * .5; slantPath(W / 2 - tw / 2 - 16 * hs, oy - row / 2 + 1, tw + 32 * hs, row - 2); ctx.fillStyle = '#070912'; ctx.fill();   // readable over bright walls and signs
    ctx.globalAlpha = a; if (t.big) glowText(t.text, W / 2, oy, sz, t.col, 'center', 700); else hudText(t.text, W / 2, oy, sz, t.col, 'center', 700); ctx.globalAlpha = 1; oy += row / 2;
  }
  // ---- combo
  if (G.combo >= 2 && G.comboT > 0) {
    const x = W - m, y = H * .42, mlt = comboMult();
    const cc = mlt >= 4 ? NEON.pink : mlt >= 3 ? NEON.gold : mlt >= 2 ? NEON.cyan : '#e8ecf7';   // the sign heats up with the multiplier
    glowText('×' + mlt, x, y, 40 * hs, cc, 'right', 700, mlt >= 2 ? mix(cc, '#ffffff', .72) : 0);
    hudText(G.combo + ' hit combo', x, y + 30 * hs, 13 * hs, '#aeb6cc', 'right', 600);
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x - 110 * hs, y + 44 * hs, 110 * hs, 3 * hs);
    ctx.beginPath(); ctx.rect(x - 110 * hs * G.comboT / 3.5, y + 44 * hs, 110 * hs * G.comboT / 3.5, 3 * hs); neonFill(cc, .8);
  }
  // ---- boss bar
  let bottomY = H - m;
  if (G.boss && !G.boss.dead) {
    const b = G.boss, w = Math.min(560 * hs, W * .5), x = W / 2 - w / 2, y = H - m - 96 * hs;
    const bh2 = 14 * hs, bc = b.stagger > 0 ? NEON.gold : b.col, fr = Math.max(0, b.hp / b.maxhp), g2 = 3 * hs;
    glowText(b.name, W / 2, y - 16 * hs, 16 * hs, b.col, 'center', 700);
    plate(x - g2 * 2, y - g2, w + g2 * 4, bh2 + g2 * 2, b.col, .75, .04, .45);
    if (fr > 0) { slantPath(x, y, w * fr + bh2 * .45 * (1 - fr), bh2, .45); neonFill(bc, .9); slantPath(x + bh2 * .32, y + bh2 * .14, w * fr + bh2 * .45 * (1 - fr) - bh2 * .2, bh2 * .28, .45); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fill(); }
    slantPath(x + w * .5 - 1, y, 2 + bh2 * .45, bh2, .45); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fill();
    if (b.stagger > 0) glowText('STAGGERED · DOUBLE DAMAGE', W / 2, y + 28 * hs, 12 * hs, NEON.gold, 'center', 700);
    bottomY = y - 56 * hs;   // keeps the hint plate clear of the boss name
  }
  // ---- abilities + hint
  if (G.mode === 'play' || G.mode === 'dead') drawAbilities();
  if (G.hint && G.mode === 'play') {
    G.hint.life -= dt; if (G.hint.life <= 0) G.hint = null;
    else {
      const h = G.hint, a = Math.min(1, h.life * 2), items = h.items;
      ctx.globalAlpha = a; const w = glyphLineWidth(items, 30 * hs); const y = Math.min(bottomY - 18 * hs, H - 150 * hs);
      plate(W / 2 - w / 2 - 22 * hs, y - 24 * hs, w + 38 * hs, 48 * hs, kcol(), .75, .05);
      glyphLine(items, W / 2, y, 30 * hs, 'center'); ctx.globalAlpha = 1;
    }
  }
  if (G.mode === 'dead') {
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 0, W, H);
    glowText('YOU FELL', W / 2, H / 2 - 10, 64 * hs, '#ff3355', 'center', 700, '#ffe3e8');
    hudText('Getting back up at the last checkpoint…', W / 2, H / 2 + 40 * hs, 16 * hs, '#aeb6cc', 'center', 500);
  }
}
function drawWaypoint() {
  const ob = objective(); let t = ob.t;
  const targets = []; if (t) targets.push({ t, col: '#ffc24a' }); if (G.marker) targets.push({ t: G.marker, col: '#38d0ff' });
  for (const { t, col } of targets) {
    const s = toScreen(t.x, t.y), d = Math.round(dist(t, P) / 10), pad = 46 * hs;
    if (s.x > pad && s.x < W - pad && s.y > pad + 40 * hs && s.y < H - pad) {
      if (d < 18) continue;
      const lift = t.kind === 'boss' ? 62 : t.kind === 'hideout' ? 80 : 0;   // tall things: sit above the head / the roof sign
      const y = (lift ? toScreen(t.x, t.y, lift).y - 14 * hs : s.y - 48 * hs) + Math.sin(G.time * 4) * 3;
      ctx.save(); ctx.translate(s.x, y); ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.rect(-6 * hs, -6 * hs, 12 * hs, 12 * hs); neonFill(col); ctx.restore();
      hudText(d + ' m', s.x, y - 18 * hs, 12 * hs, col, 'center', 700);
    } else {
      const cx = W / 2, cy = H / 2, a = Math.atan2(s.y - cy, s.x - cx);
      let k = Math.min((W / 2 - pad) / Math.abs(Math.cos(a) || 1e-6), (H / 2 - pad) / Math.abs(Math.sin(a) || 1e-6));
      // pull the arrow in along its own direction until it is clear of the HUD panels (status, minimap, objective, abilities)
      const m = 24 * hs, g = 26 * hs, panels = [[0, 0, m + 350 * hs, 122 * hs], [W - m - 210 * hs, 0, W, m + 156 * hs], [W / 2 - 240 * hs, 0, W / 2 + 240 * hs, 56 * hs], [0, H - 108 * hs, 332 * hs, H]];
      const hit = (px, py) => panels.some(r => px > r[0] - g && px < r[2] + g && py > r[1] - g && py < r[3] + g);
      while (k > 60 && hit(cx + Math.cos(a) * k, cy + Math.sin(a) * k)) k -= 4;
      const x = cx + Math.cos(a) * k, y = cy + Math.sin(a) * k;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(14 * hs, 0); ctx.lineTo(-6 * hs, -9 * hs); ctx.lineTo(-2 * hs, 0); ctx.lineTo(-6 * hs, 9 * hs); ctx.closePath(); neonFill(col); ctx.restore();
      hudText(d + ' m', x - Math.cos(a) * 26 * hs, y - Math.sin(a) * 22 * hs, 12 * hs, col, 'center', 700);
    }
  }
}
function drawMinimap(x, y, w, h) {
  const d = districtAt(P.x), st = DS[d].status;
  const dcol = st === 'liberated' ? '#38d0ff' : st === 'dominated' ? '#ff3355' : DIST[d].col;   // the frame is lit in the district's colour
  glowText(DIST[d].name, x + w, y - 14 * hs, 14 * hs, dcol, 'right', 700);
  if (st !== 'enemy') hudText(st.toUpperCase(), x, y - 14 * hs, 11 * hs, dcol, 'left', 700);
  const cut = 12 * hs, frame = () => { ctx.beginPath(); ctx.moveTo(x + cut, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + cut); ctx.closePath(); };
  ctx.save(); frame(); ctx.fillStyle = 'rgba(7,9,18,.86)'; ctx.fill(); ctx.clip();
  const span = 1500, sc = w / span, vx = P.x - span / 2, vy = P.y - (h / sc) / 2;
  ctx.imageSmoothingEnabled = false; ctx.globalAlpha = .9;
  ctx.drawImage(mmCanvas, vx / TILE, vy / TILE, span / TILE, (h / sc) / TILE, x, y, w, h);
  ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = true;
  const M = (wx, wy) => [x + (wx - vx) * sc, y + (wy - vy) * sc];
  for (const e of ents) {
    if (e.dead) continue;
    if (e.kind === 'hideout' && !e.cleared) { const [px, py] = M(e.x, e.y); ctx.fillStyle = '#ff9a3a'; ctx.fillRect(px - 4, py - 4, 8, 8); ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.strokeRect(px - 4, py - 4, 8, 8); }
    else if (e.kind === 'boss') { const [px, py] = M(e.x, e.y); ctx.fillStyle = '#ff3355'; circle(px, py, 6 + Math.sin(G.time * 6)); }
    else if (e.kind === 'tower') { const [px, py] = M(e.x, e.y); ctx.fillStyle = '#ff4a5a'; ctx.fillRect(px - 2.5, py - 2.5, 5, 5); ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.strokeRect(px - 2.5, py - 2.5, 5, 5); }
    else if (dist2(e, P) < 700 * 700) {
      if (e.team === 'gang' && !e.static) { const [px, py] = M(e.x, e.y); ctx.fillStyle = '#ff4a5a'; circle(px, py, 2.2); }
      else if (e.kind === 'cop') { const [px, py] = M(e.x, e.y); ctx.fillStyle = e.ally ? '#38d0ff' : '#6a8aff'; circle(px, py, 2.2); }
      else if (e.kind === 'civ' && e.state === 'wounded') { const [px, py] = M(e.x, e.y); ctx.fillStyle = Math.sin(G.time * 8) > 0 ? '#5fe8ff' : '#fff'; circle(px, py, 2.6); }
    }
  }
  const ob = objective();
  if (ob.t) { const [px, py] = M(ob.t.x, ob.t.y); ctx.fillStyle = '#ffc24a'; ctx.save(); ctx.translate(clamp(px, x + 6, x + w - 6), clamp(py, y + 6, y + h - 6)); ctx.rotate(Math.PI / 4); ctx.fillRect(-4, -4, 8, 8); ctx.restore(); }
  if (G.marker) { const [px, py] = M(G.marker.x, G.marker.y); ctx.fillStyle = '#38d0ff'; circle(clamp(px, x + 6, x + w - 6), clamp(py, y + 6, y + h - 6), 4); }
  const [px, py] = M(P.x, P.y); ctx.save(); ctx.translate(px, py); ctx.rotate(P.ang); ctx.fillStyle = kcol(); ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -5); ctx.lineTo(-2, 0); ctx.lineTo(-5, 5); ctx.fill(); ctx.restore();
  ctx.restore();
  frame(); neonStroke(dcol, .7);
  ctx.fillStyle = dcol; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + cut * .55, y); ctx.lineTo(x, y + cut * .55); ctx.fill();   // tab in the cut corner
  // heat stars
  if (G.heat >= .3) {
    for (let i = 0; i < 5; i++) {
      const on = i < Math.floor(G.heat), part = i === Math.floor(G.heat) ? G.heat % 1 : 0, sx = x + w - 10 * hs - i * 20 * hs, sy = y + h + 16 * hs;
      const sc2 = Math.sin(G.time * 10) > 0 ? '#ff3355' : '#6a8aff';
      if (on) { ctx.fillStyle = rgba(sc2, .22); star(sx, sy, 12 * hs); }
      ctx.fillStyle = on ? sc2 : `rgba(255,255,255,${.12 + part * .4})`; star(sx, sy, 8 * hs);
    }
  }
}
function star(x, y, r) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * .45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } ctx.closePath(); ctx.fill(); }

/* ---------- full city map (Back / M) ---------- */
function drawCityMap() {
  ctx.fillStyle = 'rgba(4,5,10,.9)'; ctx.fillRect(0, 0, W, H);
  const pad = 60 * hs, sc = Math.min((W - pad * 2) / WORLD_W, (H - pad * 2 - 110 * hs) / WORLD_H), mw = WORLD_W * sc, mh = WORLD_H * sc, x = (W - mw) / 2, y = (H - mh) / 2;
  glowText('CITY MAP', x, y - 36 * hs, 26 * hs, NEON.cyan, 'left', 700, '#ffffff');
  { const lg = ctx.createLinearGradient(x, 0, x + mw, 0); lg.addColorStop(0, NEON.cyan); lg.addColorStop(.55, NEON.pink); lg.addColorStop(1, rgba(NEON.pink, 0));
    ctx.beginPath(); ctx.moveTo(x, y - 14 * hs); ctx.lineTo(x + mw, y - 14 * hs); ctx.strokeStyle = lg; ctx.globalAlpha = .25; ctx.lineWidth = 6 * hs; ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 2 * hs; ctx.stroke(); }
  hudText(`Kinetic shards ${G.shards}/12 · ${G.saves} civilians saved · ${G.kills} takedowns`, x + mw, y - 34 * hs, 13 * hs, '#8790aa', 'right', 600);
  ctx.imageSmoothingEnabled = false; ctx.drawImage(mmCanvas, x, y, mw, mh); ctx.imageSmoothingEnabled = true;
  ctx.beginPath(); ctx.rect(x, y, mw, mh); neonStroke(NEON.cyan, .5);
  for (let d = 0; d < 3; d++) {
    const x0 = d === 0 ? 0 : DIST_SPLIT[d - 1], x1 = d === 2 ? WORLD_W : DIST_SPLIT[d], st = DS[d].status, locked = d > 0 && !gatesOpen[d - 1];
    if (locked) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x + x0 * sc, y, (x1 - x0) * sc, mh); }
    const col = st === 'liberated' ? '#38d0ff' : st === 'dominated' ? '#ff3355' : DIST[d].col;
    glowText(DIST[d].name, x + (x0 + x1) / 2 * sc, y + mh + 20 * hs, 15 * hs, col, 'center', 700);
    hudText(locked ? 'SEALED' : st === 'enemy' ? DIST[d].gang + ' territory · ' + (3 - DS[d].hideoutsLeft) + '/3 hideouts' : st.toUpperCase(), x + (x0 + x1) / 2 * sc, y + mh + 40 * hs, 12 * hs, '#8790aa', 'center', 600);
  }
  for (const e of ents) {
    if (e.dead) continue;
    if (e.kind === 'hideout' && !e.cleared) { ctx.fillStyle = '#ff9a3a'; ctx.fillRect(x + e.x * sc - 5, y + e.y * sc - 5, 10, 10); }
    if (e.kind === 'tower') { ctx.fillStyle = '#ff4a5a'; ctx.fillRect(x + e.x * sc - 3, y + e.y * sc - 3, 6, 6); }
    if (e.kind === 'boss') { ctx.fillStyle = '#ff3355'; circle(x + e.x * sc, y + e.y * sc, 7); }
  }
  for (let d = 0; d < 3; d++) if (!DS[d].bossDone && (d === 0 || gatesOpen[d - 1])) { const b = spots.boss[d]; ctx.strokeStyle = '#ff3355'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + b.x * sc, y + b.y * sc, 9, 0, TAU); ctx.stroke(); }
  if (G.marker) { ctx.fillStyle = '#38d0ff'; circle(x + G.marker.x * sc, y + G.marker.y * sc, 5); }
  ctx.save(); ctx.translate(x + P.x * sc, y + P.y * sc); ctx.rotate(P.ang); ctx.fillStyle = kcol(); ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-7, -7); ctx.lineTo(-3, 0); ctx.lineTo(-7, 7); ctx.fill(); ctx.restore();
  glyphLine([{ a: 'back' }, { t: 'Close' }], x + mw - 90 * hs, y - 62 * hs, 22 * hs);
}
