/* ============================== 11c PIXEL CHARACTERS ============================== */
/* Hand-placed pixel sprites for every character, drawn 1:1 into the iso art canvas.
   - one body template per facing: S (toward camera), SE, E, NE, N (away). SW, W and NW are mirrors.
   - each template = head+torso grid, arm strips (they swing while walking) and 4 leg frames
   - outfits are palettes + small edits to the grid: hair styles (spiky, bald, beanie, cap, hood),
     chest stripes, badges, zips; brutes and bosses are widened and lengthened versions of the same body
   - finished frames are cached as small canvases, so drawing a character is one drawImage
   Letters: k outline, h/H/J hair (light/mid/dark), s/S skin, e eye, C/c/d shirt (light/mid/dark),
   T trim, p/P pants, b shoes, w/W hat, Y hat band, Q badge, n hand. '.' is transparent. */
const mirHalf = rows => rows.map(r => r + r.split('').reverse().join(''));
const ARM = ['.kk', 'kck', 'kck', 'kck', 'knk', '.k.'];
const LEGS_SN = [
  ['...kpPk..kPpk...', '...kpPk..kPpk...', '...kbbk..kbbk...'],
  ['...kpPk..kPpk...', '...kpPk..kbbk...', '...kbbk.........'],
  null,
  ['...kpPk..kPpk...', '...kbbk..kPpk...', '.........kbbk...']
];
const LEGS_SE = [
  ['....kpPk.kpPk...', '....kpPk.kpPk...', '....kbbbkkbbbk..'],
  ['....kpPk.kpPk...', '....kbbbk.kpPk..', '..........kbbbk.'],
  null,
  ['....kpPk.kpPk...', '....kpPk.kbbbk..', '...kbbbk........']
];
const LEGS_E = [
  ['.....kpPk.......', '.....kpPk.......', '.....kbbbk......'],
  ['....kpPPk.......', '...kpk.kPk......', '..kbbk..kbbk....'],
  null,
  ['....kPppk.......', '...kPk.kpk......', '..kbbk..kbbk....']
];
const CHAR_T = {
  S: { body: mirHalf(['........', '....kkkk', '...khhhh', '..khhhhh', '.khhhhhh', '.kHhhhhh', '.kHHhhHh', '.kJssHss', '.kSssess', '..kSsSss',
                      '...kkCCC', '..kCCCCC', '..kcCCCC', '..kccCCc', '..kdcccc', '..kddddd', '..kkdddd']),
       arms: [{ x: 0, side: 0 }, { x: 13, side: 1 }], swing: 'y', legs: LEGS_SN, zip: [8], badge: [12, 5], stripe: 13, cap: 'front', capBadge: [4, 8] },
  N: { body: mirHalf(['........', '....kkkk', '...khhhh', '..khhhhh', '.khhhhhh', '.kHhhhhh', '.kHHhhhh', '.kJHHhHh', '.kJJHHHH', '..kJJJJJ',
                      '...kkCCC', '..kCCCCC', '..kcCCCC', '..kccCCC', '..kdcccc', '..kddddd', '..kkdddd']),
       arms: [{ x: 0, side: 0 }, { x: 13, side: 1 }], swing: 'y', legs: LEGS_SN, zip: [], badge: null, stripe: 13, cap: 'back' },
  E: { body: ['................', '.....kkkkk......', '....khhhhhk.....', '...khhhhhhhk....', '..khhhhhhhhhk...', '..kHhhhhhhhhk...', '..kJHhhhhHsssk..', '..kJJHHhsssesk..', '..kJJJHssssssk..', '...kJJkSSSSk....',
              '.....kkCCk......', '....kCCCCCk.....', '....kcCCCCk.....', '....kccCCCk.....', '....kdcccck.....', '....kddddck.....', '....kkdddkk.....'],
       arms: [{ x: 6, side: 1, front: true }], swing: 'x', legs: LEGS_E, zip: [9], badge: [12, 8], stripe: 13, cap: 'side', capBadge: [4, 9] },
  SE: { body: ['................', '.....kkkkk......', '....khhhhhkk....', '...khhhhhhhhk...', '..khhhhhhhhhhk..', '..kHhhhhhhhhhk..', '..kHHhhhhhHhhk..', '..kJHHhsssssHk..', '..kJHssessesk...', '...kJSsssssk....',
               '.....kkCCCk.....', '....kCCCCCCk....', '....kcCCCCCk....', '....kccCCCck....', '....kdccccck....', '....kdddddck....', '....kkddddkk....'],
        arms: [{ x: 2, side: 0 }, { x: 11, side: 1 }], swing: 'y', legs: LEGS_SE, zip: [9], badge: [12, 9], stripe: 13, cap: 'side', capBadge: [4, 9] },
  NE: { body: ['................', '.....kkkkk......', '....khhhhhkk....', '...khhhhhhhhk...', '..khhhhhhhhhhk..', '..kHhhhhhhhhhk..', '..kHHhhhhhhhhk..', '..kJHHhhhhhHSk..', '..kJJHHHHHHHSk..', '...kJJJJJJJSk...',
               '.....kkCCCk.....', '....kCCCCCCk....', '....kcCCCCCk....', '....kccCCCCk....', '....kdcccCck....', '....kddddddk....', '....kkddddkk....'],
        arms: [{ x: 2, side: 0 }, { x: 11, side: 1 }], swing: 'y', legs: LEGS_SE, zip: [], badge: null, stripe: 13, cap: 'back' }
};
for (const k in CHAR_T) { const L = CHAR_T[k].legs; L[2] = L[0]; }
// screen octant -> template + mirror. Octants: 0 E, 1 SE, 2 S, 3 SW, 4 W, 5 NW, 6 N, 7 NE (screen directions)
const OCT = [['E', 0], ['SE', 0], ['S', 0], ['SE', 1], ['E', 1], ['NE', 1], ['N', 0], ['NE', 0]];
function screenOctant(ang) { const c = Math.cos(ang), s = Math.sin(ang); return ((Math.round(Math.atan2((c + s) / 2, c - s) / (Math.PI / 4)) % 8) + 8) % 8; }

/* ---------- building a frame ---------- */
const HAIR = { h: 1, H: 1, J: 1 };
function buildCharGrid(dir, frame, o) {
  const T = CHAR_T[dir], g = T.body.map(r => r.split(''));
  while (g.length < 17) g.push('................'.split(''));
  // head styles
  const set = (r, c, ch) => { if (g[r] && c >= 0 && c < g[r].length) g[r][c] = ch; };
  if (o.style === 'spiky') {
    for (let c = 0; c < 16; c++) { let r = 0; while (r < 4 && g[r][c] === '.') r++; if (r > 0 && r < 4 && g[r][c] === 'k' && c % 2 === 0) { set(r - 1, c, 'k'); set(r, c, 'h'); } }
  }
  for (let r = 0; r < 10; r++) for (let c = 0; c < 16; c++) {
    const ch = g[r][c]; if (!HAIR[ch]) continue;
    if (o.style === 'bald') g[r][c] = ch === 'h' ? 's' : 'S';
    else if (o.style === 'hood') g[r][c] = ch === 'h' ? 'C' : ch === 'H' ? 'c' : 'd';
    else if (o.style === 'beanie' && r <= 6) g[r][c] = r === 6 ? 'Y' : ch === 'h' ? 'w' : 'W';
    else if (o.style === 'cap' && r <= 6) g[r][c] = ch === 'h' ? 'w' : 'W';
  }
  if (o.style === 'cap') {   // brim
    if (T.cap === 'front') for (let c = 1; c < 15; c++) { if (g[6][c] !== '.') g[6][c] = 'k'; }
    else if (T.cap === 'side') { let last = 0; for (let c = 0; c < 16; c++) if (g[6][c] !== '.') { g[6][c] = c > 8 ? 'k' : g[6][c]; last = c; } set(6, last + 1, 'k'); set(6, last + 2, 'k'); }
    if (T.capBadge) set(T.capBadge[0], T.capBadge[1], 'Q');
  }
  if (o.stripe) for (let c = 0; c < 16; c++) if ('Ccd'.includes(g[T.stripe][c])) g[T.stripe][c] = 'T';
  if (o.zip) for (const c of T.zip) for (let r = 11; r <= 15; r++) if ('Ccd'.includes(g[r][c])) g[r][c] = 'T';
  if (o.badge && T.badge) set(T.badge[0], T.badge[1], 'Q');
  if (o.pads) for (const r of [11]) for (let c = 0; c < 16; c++) if (g[r][c] === 'C' && (c < 6 || c > 9)) g[r][c] = 'T';
  // legs
  for (const row of T.legs[frame]) g.push(row.split(''));
  // arms: swing with the walk (forward arm drops a pixel / slides forward)
  const back = [], front = [];
  for (const a of T.arms) {
    let dx = 0, dy = 0;
    if (T.swing === 'y') dy = (frame === 1 && a.side === 1) || (frame === 3 && a.side === 0) ? 1 : 0;
    else dx = frame === 1 ? 1 : frame === 3 ? -1 : 0;
    if (o.armsUp) dy = -3;
    (a.front ? front : back).push([a.x + dx, 11 + dy]);
  }
  for (const [ax, ay] of back.concat(front)) for (let r = 0; r < ARM.length; r++) for (let c = 0; c < 3; c++) {
    const ch = ARM[r][c]; if (ch === '.') continue;
    const R = ay + r, C = ax + c; if (R < 0 || R >= g.length) continue;
    if (ch === 'k' && g[R][C] !== '.' && g[R][C] !== 'k' && !(T.swing === 'x')) continue;   // keep the torso colour where the arm outline meets it
    g[R][C] = ch;
  }
  // big bodies: repeat the middle columns / torso rows
  // (the head keeps its size: head rows are padded, body rows repeat their middle column)
  for (let i = 0; i < (o.widen || 0); i++) g.forEach((r, ri) => { if (ri >= 10) { const c = [8, 7, 9, 6, 10, 5, 11].find(q => r[q] !== 'k') ?? 8; r.splice(c, 0, r[c]); } else if (i % 2) r.push('.'); else r.unshift('.'); });
  for (let i = 0; i < (o.tall || 0); i++) g.splice(13, 0, g[13].slice());
  return g;
}
const sprCache = new Map();
function charSprite(dir, frame, o, pal) {
  const key = dir + frame + JSON.stringify(o) + JSON.stringify(pal);
  let c = sprCache.get(key); if (c) return c;
  if (sprCache.size > 900) sprCache.clear();
  const g = buildCharGrid(dir, frame, o);
  c = document.createElement('canvas'); c.width = g[0].length; c.height = g.length; const x = c.getContext('2d');
  for (let r = 0; r < g.length; r++) for (let q = 0; q < g[r].length; q++) { const ch = g[r][q]; if (ch === '.') continue; x.fillStyle = pal[ch] || '#ff00ff'; x.fillRect(q, r, 1, 1); }
  sprCache.set(key, c); return c;
}
// a palette from a few base colours (shades are derived)
function mkPal(b) {
  const p = { k: '#07070c', e: '#0c0d14', b: '#0c0d14' };
  p.h = b.hair; p.H = shade(b.hair, .78); p.J = shade(b.hair, .58);
  p.s = b.skin; p.S = shade(b.skin, .8);
  p.C = b.shirt; p.c = shade(b.shirt, .74); p.d = shade(b.shirt, .52);
  p.T = b.trim || shade(b.shirt, 1.4); p.p = b.pants; p.P = shade(b.pants, .7);
  p.w = b.hat || '#26262e'; p.W = shade(p.w, .7); p.Y = b.band || '#c83a3a'; p.Q = b.badge || '#ffd23c';
  p.n = b.hand || b.skin;
  if (b.white) for (const k in p) if (k !== 'k') p[k] = '#ffffff';
  return p;
}

/* ---------- looks per character type ---------- */
const SKINS = ['#f0c8a0', '#e0b088', '#c08a60', '#9a6a44', '#74482c'];
function charLook(e) {
  const fl = e.flash > 0;
  switch (e.kind) {
    case 'player': {
      const kc = kcol(), cast = !!(P.holding || P.absorbing || P.throwT > 0 || P.chan);
      return { o: { style: 'spiky', zip: 1, armsUp: false }, pal: mkPal({ hair: '#eef0fa', skin: '#f0c8a0', shirt: '#3a4672', trim: kc, pants: '#20243a', hand: cast ? mix('#ffffff', kc, .5) : '#f0c8a0', white: fl }) };
    }
    case 'civ': {
      const style = e.id % 3 === 0 ? 'hood' : e.id % 5 === 1 ? 'beanie' : e.id % 7 === 3 ? 'bald' : 'short';
      if (!e.pants) e.pants = pick(['#2e3a66', '#2a2a30', '#4a3a2a', '#3a3a48']);
      return { o: { style, armsUp: e.state === 'cheer' }, pal: mkPal({ hair: e.hair || '#3a2a1a', skin: SKINS[e.id % SKINS.length], shirt: e.col || '#7cc488', pants: e.pants, hat: ['#c83a3a', '#3a6ac8', '#e8e0d0'][e.id % 3], band: '#e8e0d0', white: fl }) };
    }
    case 'grunt': { const L = GANG_LOOK[e.did]; return { o: { style: 'beanie', stripe: 1 }, pal: mkPal({ hair: L.hair, skin: SKINS[(e.id * 3) % SKINS.length], shirt: L.body, trim: L.trim, pants: '#2e2e36', hat: '#26262e', band: L.band, white: fl }) }; }
    case 'cop': return { o: { style: 'cap', badge: 1 }, pal: mkPal({ hair: '#2a1a10', skin: SKINS[(e.id * 7) % SKINS.length], shirt: e.ally ? '#3a6ab8' : '#2a3a78', trim: e.ally ? '#7fd8ff' : '#ffd23c', pants: '#16224a', hat: '#0e1430', white: fl }) };
    case 'brute': { const L = GANG_LOOK[e.did]; return { o: { style: 'bald', pads: 1, stripe: e.leader ? 1 : 0, widen: 3, tall: 2 }, pal: mkPal({ hair: '#3a2a20', skin: SKINS[(e.id * 5) % SKINS.length], shirt: shade(L.body, e.leader ? .8 : 1.1), trim: e.leader ? '#ffc24a' : '#6a6f7e', pants: '#26262e', white: fl }) }; }
    case 'sup': return { o: { style: 'spiky', zip: 1 }, pal: mkPal({ hair: '#e8e0ff', skin: '#d8c8e8', shirt: '#3e2a6a', trim: '#c080ff', pants: '#1a1430', hand: '#e0b0ff', white: fl }) };
    case 'boss': {
      const B = [{ hair: '#ff6a20', skin: '#d0a070', shirt: '#4a2214', trim: '#ff8a2a', pants: '#2a1810', style: 'spiky' },
                 { hair: '#b08060', skin: '#b08060', shirt: '#4a1a1a', trim: '#ff4a3a', pants: '#26262e', style: 'bald' },
                 { hair: '#f0e8ff', skin: '#e0d8f0', shirt: '#241c44', trim: '#b06bff', pants: '#14102a', style: 'spiky' }][e.did];
      return { o: { style: B.style, pads: 1, stripe: 1, widen: 6, tall: 4 }, pal: mkPal(Object.assign({ white: fl, hand: B.trim }, B)) };
    }
  }
  return null;
}

/* ---------- drawing (art space) ---------- */
const PEOPLE = { player: 1, civ: 1, grunt: 1, cop: 1, brute: 1, sup: 1, boss: 1 };
function drawChar(e) {
  const look = charLook(e); if (!look) return;
  const a = isoXY(e.x, e.y, 0), lift = Math.round((e.z || 0) * .5), t = G.time;
  const moving = Math.hypot(e.vx || 0, e.vy || 0) > 14;
  const frame = moving ? Math.floor(((e.walk || 0) % TAU + TAU) % TAU / (Math.PI / 2)) % 4 : 0;
  const oct = screenOctant(e.ang || 0), [dir, flip] = OCT[oct];
  const spr = charSprite(dir, frame, look.o, look.pal), w = spr.width, h = spr.height;
  const X = Math.round(a[0] - w / 2), Y = Math.round(a[1]) - h + 1 - lift;
  let alpha = 1;
  if (e.kind === 'civ') alpha = e.fadeOut !== undefined ? Math.max(0, e.fadeOut / .35) : e.fadeIn > 0 ? 1 - e.fadeIn / .35 : 1;
  if (e === P && P.invT > 0 && Math.floor(t * 20) % 2) alpha = .5;
  ctx.globalAlpha = alpha;
  const lying = e.kind === 'civ' && e.state === 'wounded', tumbling = e.stun > 0 && e.flung;
  if (lying || tumbling) {   // quarter-turn rotations keep the pixels crisp
    const q = lying ? 1 : Math.floor(t * 9) % 4;
    ctx.save(); ctx.translate(Math.round(a[0]), Math.round(a[1] - (lying ? 4 : h / 2) - lift)); ctx.rotate(q * Math.PI / 2); if (flip) ctx.scale(-1, 1);
    ctx.drawImage(spr, -Math.round(w / 2), -Math.round(h / 2)); ctx.restore(); ctx.globalAlpha = 1;
    if (lying) { const p = Math.sin(t * 6) > 0 ? 1 : 0; ctx.fillStyle = '#e8fbff'; ctx.fillRect(Math.round(a[0]) - 1, Math.round(a[1]) - 16 - p, 3, 1); ctx.fillRect(Math.round(a[0]), Math.round(a[1]) - 17 - p, 1, 3); }
    return;
  }
  const gun = (e.kind === 'grunt' || e.kind === 'cop') && e.state !== 'grabbed';
  const c = Math.cos(e.ang || 0), s = Math.sin(e.ang || 0), gx = c - s, gy = (c + s) / 2, gl = Math.hypot(gx, gy) || 1;
  const drawGun = () => { const hx = a[0] + gx / gl * 4, hy = a[1] - 8 - lift + gy / gl * 2; iline([hx, hy], [hx + gx / gl * 4, hy + gy / gl * 3], '#2a2a32'); ipx(hx + gx / gl * 4, hy + gy / gl * 3, '#5a5a66'); };
  if (gun && gy < -.1) drawGun();
  if (flip) { ctx.save(); ctx.translate(X + w, Y); ctx.scale(-1, 1); ctx.drawImage(spr, 0, 0); ctx.restore(); } else ctx.drawImage(spr, X, Y);
  if (gun && gy >= -.1) drawGun();
  ctx.globalAlpha = 1;
  // extras
  if (e.kind === 'civ' && e.umb && e.state !== 'cheer') drawUmbrella(a[0], Y - 1, e.umb, e.state === 'flee');
  if (e.kind === 'sup') { const p = .5 + .5 * Math.sin(t * 8 + e.id); ctx.globalAlpha = .4 + .4 * p; ctx.strokeStyle = '#c080ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(Math.round(a[0]) + .5, Math.round(a[1]) + .5, 10, 5, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
  if (e.kind === 'boss') {
    if (e.stagger > 0) for (let i = 0; i < 3; i++) { const an = t * 4 + i * TAU / 3; ipx(a[0] + Math.cos(an) * 10, Y - 3 + Math.sin(an) * 3, '#ffd23c'); }
    if (e.did === 0 && Math.random() < .5) FX.embers(e.x, e.y - 6, 1);
    iglow(a[0], Y + h * .5, 26, e.col, .25);
  }
  if (e === P && (P.holding || P.absorbing || P.throwT > 0 || P.chan)) iglow(a[0], a[1] - 8 - lift, 12, kcol(), .6);
  if (e === P && P.absorbing) {
    const k = P.charge / S.absCap, pu = .5 + .5 * Math.sin(t * 10), cx = Math.round(a[0]) + .5, cy = Math.round(a[1] - 9 - lift) + .5;
    ctx.fillStyle = `rgba(140,240,255,${.1 + .06 * pu})`; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(160,250,255,${.6 + .3 * pu})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, cy, 16, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
  }
  // health bar (art pixels)
  if ((e.team === 'gang' || e.team === 'police') && e.kind !== 'boss' && e.hp < e.maxhp && (e.sinceHit || 0) < 4) {
    const bw = Math.max(10, w - 4), bx = Math.round(a[0] - bw / 2), by = Y - 3;
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(bx - 1, by - 1, bw + 2, 3); ctx.fillStyle = '#ff3d5a'; ctx.fillRect(bx, by, Math.max(0, Math.round(bw * e.hp / e.maxhp)), 1);
  }
  e.sinceHit = (e.sinceHit || 0) + 1 / 60;
}
function drawUmbrella(cx, top, col, tilt) {
  cx = Math.round(cx) + (tilt ? 2 : 0); top = Math.round(top) - 2;
  const R = 8;
  for (let dy = 0; dy < 4; dy++) {
    const hw = Math.round(R * Math.sqrt(1 - Math.pow((3 - dy) / 4, 2)));
    ctx.fillStyle = '#07070c'; ctx.fillRect(cx - hw - 1, top + dy, hw * 2 + 2, 1);
    ctx.fillStyle = dy === 0 ? shade(col, 1.25) : dy === 3 ? shade(col, .7) : col; ctx.fillRect(cx - hw, top + dy, hw * 2, 1);
  }
  for (let i = -R + 2; i < R; i += 4) ipx(cx + i, top + 4, '#07070c');
  ctx.fillStyle = '#3a3a40'; ctx.fillRect(cx, top + 4, 1, 4);
}
// characters use the pixel sprites; cars, crates and the rest keep their old drawings for now
function drawUpright(e) {
  if (PEOPLE[e.kind] || e === P) { artT(); drawChar(e); if (e.aimT > 0 && (e.kind === 'grunt' || e.kind === 'cop')) drawAimLaser(e); return; }
  uprightT(e.x, e.y);
  const ang = e.ang; if (ang !== undefined) e.ang = ang + Math.PI / 4;
  drawEntity(e);
  e.ang = ang;
}
// flat (ground) pieces that belong to characters: the player's karma ring under the feet, drain/heal links
function drawCharsFlatUnder() {
  if (!P || G.mode === 'dead' || G.mode === 'title') return;
  const kc = kcol();
  ctx.strokeStyle = rgba(kc, .6); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(P.x, P.y, 15, 0, TAU); ctx.stroke();
  ctx.fillStyle = rgba(kc, .12); ctx.beginPath(); ctx.arc(P.x, P.y, 15, 0, TAU); ctx.fill();
}
function drawCharsFlatOver() {
  if (!P || !P.chan) return;
  const c = P.chan.c, k = P.chan.t / P.chan.need, col = P.chan.k === 'heal' ? '#5fe8ff' : '#ff3366';
  ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(c.x, c.y, 20, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
  ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(col, .6); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(c.x, c.y); ctx.stroke(); glow(c.x, c.y, 40, col, .6); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}
