/* MOCK-UP: characters redrawn for double-resolution art (about 24 x 40 pixels instead of 16 x 20).
   Same inputs as charSprite (facing template, walk frame, outfit options, palette) so it can stand in for it.
   Each facing is painted part by part (hair, face, torso, arms, legs) and outlined afterwards. */
function char32(dir, frame, o, pal) {
  const wd = o.widen || 0, tl = o.tall || 0;                    // brutes and bosses: wider and taller bodies
  const hw = 7 + Math.round(wd * .5), TT = 17, TB = 28 + tl * 2, LT = TB + 1, LB = LT + 7;
  const PAD = 5, W = 36 + wd * 2 + (wd ? 2 : 0), H = LB + 5 + PAD, cx = W >> 1;      // PAD: headroom for spiked hair
  const g = Array.from({ length: H }, () => Array(W).fill(null));
  const set = (x, y, c) => { y += PAD; if (c && y >= 0 && y < H && x >= 0 && x < W) g[y][x] = c; };
  const clr = (x, y) => { y += PAD; if (y >= 0 && y < H && x >= 0 && x < W) g[y][x] = null; };
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
  const K = pal.k, EW = pal.k === pal.s ? pal.s : '#f2f4ff', EP = '#16182a';
  const bald = o.style === 'bald', hood = o.style === 'hood', beanie = o.style === 'beanie', cap = o.style === 'cap', spiky = o.style === 'spiky';
  const brow = bald || hood ? shade(pal.S, .55) : pal.J, lip = shade(pal.S, .72), skinHi = shade(pal.s, 1.08);
  const hair = hood ? [pal.C, pal.c, pal.d] : beanie || cap ? [pal.w, pal.w, pal.W] : [pal.h, pal.H, pal.J];
  const side = dir === 'E', back = dir === 'N' || dir === 'NE', q3 = dir === 'SE' || dir === 'NE';
  const f = q3 ? 2 : 0;                                         // three-quarter views: features slide toward the facing side
  const step = frame === 1 ? 1 : frame === 3 ? -1 : 0;

  /* ---------------- legs ---------------- */
  const shoe = pal.b === pal.k ? '#1c1d2a' : pal.b, sole = '#0a0a10';
  function leg(x0, x1, lift, toe, dark) {
    rect(x0, LT, x1, LB - lift, dark ? pal.P : pal.p);
    rect(x1 - 1, LT, x1, LB - lift, pal.P);                                    // shaded inner side
    if (!dark) rect(x0, LT + 3, x0, LT + 4, shade(pal.p, 1.25));                // knee catch-light
    rect(x0 - (toe < 0 ? 1 : 0), LB - lift + 1, x1 + (toe > 0 ? 1 : 0), LB - lift + 2, shoe);
    rect(x0 - (toe < 0 ? 1 : 0), LB - lift + 2, x1 + (toe > 0 ? 1 : 0), LB - lift + 2, sole);
    set(x0 + 1, LB - lift + 1, shade(shoe, 1.9));
  }
  if (side) {
    const s = step * 3;
    if (s) { leg(cx - 2 - s, cx + 1 - s, 1, 1, true); leg(cx - 2 + s, cx + 2 + s, 0, 1, false); }
    else leg(cx - 2, cx + 2, 0, 1, false);
  } else {
    const lw = 4 + Math.round(wd * .34), gap = 1, toe = q3 ? 1 : 0;
    leg(cx - gap - 1 - lw, cx - gap - 1, step === -1 ? 2 : 0, toe ? toe : -1, false);
    leg(cx + gap, cx + gap + lw, step === 1 ? 2 : 0, toe ? toe : 1, false);
  }

  /* ---------------- torso ---------------- */
  const tw = side ? 4 + Math.round(wd * .4) : hw;
  rect(cx - tw, TT, cx + tw - 1, TB, pal.c);
  rect(cx - tw, TT, cx - tw + (side ? 1 : 3), TB, side ? pal.d : pal.C);        // lit side (left), or the back in profile
  if (side) rect(cx + tw - 3, TT, cx + tw - 1, TB, pal.C); else rect(cx + tw - 3, TT, cx + tw - 1, TB, pal.d);
  rect(cx - tw, TB - 1, cx + tw - 1, TB - 1, pal.d);                            // hem
  rect(cx - tw, TB, cx + tw - 1, TB, shade(pal.P, .8));                         // belt
  if (!back) { set(cx - 1 + (side ? tw - 1 : f), TB, pal.T); set(cx + (side ? tw - 1 : f), TB, pal.T); }
  clr(cx - tw, TT); clr(cx + tw - 1, TT);                                       // rounded shoulders
  if (!back && !side) {                                                         // collar, zip, pockets
    rect(cx - 2 + f, TT, cx + 1 + f, TT, pal.S); set(cx - 1 + f, TT + 1, pal.S); set(cx + f, TT + 1, pal.S);
    set(cx - 3 + f, TT, pal.T); set(cx + 2 + f, TT, pal.T); set(cx - 2 + f, TT + 1, pal.T); set(cx + 1 + f, TT + 1, pal.T);
    if (o.zip) rect(cx - 1 + f, TT + 2, cx - 1 + f, TB - 2, pal.T);
    else rect(cx - 1 + f, TT + 2, cx - 1 + f, TB - 2, pal.d);
    rect(cx - 5, TB - 4, cx - 3, TB - 4, pal.d); rect(cx + 2 + f, TB - 4, cx + 4, TB - 4, shade(pal.d, .8));
    if (o.badge) { rect(cx + 2 + f, TT + 3, cx + 3 + f, TT + 4, pal.Q); set(cx + 2 + f, TT + 3, '#ffffff'); }
  } else if (back) { rect(cx - 1, TT + 1, cx - 1, TB - 2, pal.d); rect(cx - 3, TT, cx + 2, TT, pal.d); }
  if (o.stripe) rect(cx - tw, TT + 5, cx + tw - 1, TT + 6, pal.T);
  if (o.pads && !side) { rect(cx - tw - 2, TT - 1, cx - tw + 3, TT + 1, pal.T); rect(cx + tw - 4, TT - 1, cx + tw + 1, TT + 1, shade(pal.T, .75)); rect(cx - tw - 2, TT - 1, cx - tw + 3, TT - 1, shade(pal.T, 1.3)); }
  if (o.pads && side) { rect(cx - 3, TT - 1, cx + 2, TT + 1, pal.T); rect(cx - 3, TT - 1, cx + 2, TT - 1, shade(pal.T, 1.3)); }

  /* ---------------- arms ---------------- */
  const up = o.armsUp ? 9 : 0, aLen = 10 + tl;
  function arm(x0, w, dy, col, colD) {
    const y0 = TT + 1 + dy - up, y1 = y0 + aLen - 1;
    if (up) { rect(x0, TT - 10, x0 + w - 1, TT + 2, col); rect(x0 + w - 1, TT - 10, x0 + w - 1, TT + 2, colD); rect(x0, TT - 12, x0 + w - 1, TT - 11, pal.n); return; }
    rect(x0, y0, x0 + w - 1, y1, col); rect(x0 + w - 1, y0, x0 + w - 1, y1, colD);
    rect(x0, y1 - 1, x0 + w - 1, y1 - 1, pal.T === pal.C ? colD : shade(colD, .9));   // cuff
    rect(x0, y1 + 1, x0 + w - 1, y1 + 2, pal.n); set(x0 + w - 1, y1 + 2, shade(pal.n, .8));
  }
  if (side) {
    const ax = cx - 1 + step * 2;
    rect(ax - 1, TT + 1, ax + 3, TT + aLen + 3, K);                                    // dark edge so the arm reads over the torso
    arm(ax, 3, 0, pal.C, pal.c);
  } else {
    const aw = 3 + (wd > 2 ? 1 : 0);
    arm(cx - tw - aw, aw, step === 1 ? 1 : 0, pal.C, pal.c);
    arm(cx + tw, aw, step === -1 ? 1 : 0, pal.c, pal.d);
  }

  /* ---------------- head ---------------- */
  const hx0 = cx - 7 + (side ? 1 : 0), hx1 = cx + 6, hy0 = 3, hy1 = 15;
  rect(cx - 2 + (side ? 1 : f), 16, cx + 1 + (side ? 1 : f), 16, pal.S);                // neck
  rect(hx0, hy0, hx1, hy1, pal.s);
  rect(hx1 - 1, hy0, hx1, hy1, pal.S); rect(hx0, hy1 - 1, hx1, hy1, pal.S);             // jaw and far-cheek shade
  rect(hx0 + 2, 8, hx0 + 3, 9, skinHi);
  for (const [x, y] of [[hx0, hy0], [hx0 + 1, hy0], [hx0, hy0 + 1], [hx1, hy0], [hx1 - 1, hy0], [hx1, hy0 + 1], [hx0, hy1], [hx0 + 1, hy1], [hx0, hy1 - 1], [hx1, hy1], [hx1 - 1, hy1], [hx1, hy1 - 1]]) clr(x, y);
  if (side) { clr(hx0, hy1 - 2); clr(hx0 + 1, hy1 - 1); clr(hx0 + 2, hy1); set(hx1 + 1, 11, pal.s); set(hx1 + 1, 12, pal.S); }   // nose
  // face
  if (!back) {
    if (side) {
      rect(cx + 2, 9, cx + 5, 9, brow);
      rect(cx + 3, 10, cx + 4, 12, EW); rect(cx + 4, 10, cx + 4, 11, EP); set(cx + 3, 12, pal.S); set(cx + 4, 12, pal.S);
      rect(cx + 4, 14, cx + 5, 14, lip);
      rect(cx - 2, 10, cx - 1, 12, pal.S); set(cx - 2, 10, shade(pal.S, .8));                                    // ear
    } else {
      const lx = cx - 5 + f, rx = cx + 2 + f, rw = q3 ? 1 : 2;
      rect(lx - 1, 9, lx + 2, 9, brow); rect(rx, 9, rx + rw + 1, 9, brow);
      rect(lx, 10, lx + 2, 12, EW); rect(lx + 1, 10, lx + 2, 12, EP); set(lx + 1, 10, '#ffffff'); set(lx, 12, pal.S);
      rect(rx, 10, rx + rw, 12, EW); rect(rx, 10, rx + rw - 1, 12, EP); if (rw > 1) set(rx, 10, '#ffffff'); set(rx + rw, 12, pal.S);
      set(cx + f, 12, pal.S);                                                                                    // nose shadow
      rect(cx - 1 + f, 14, cx + f, 14, lip);
      if (!q3) { rect(hx0 - 1, 10, hx0 - 1, 11, pal.S); rect(hx1 + 1, 10, hx1 + 1, 11, shade(pal.S, .85)); }      // ears
      else rect(hx0, 10, hx0, 12, pal.S);
    }
  } else if (dir === 'NE') { rect(hx1 - 1, 9, hx1, 13, pal.s); rect(hx1 - 3, 10, hx1 - 2, 12, pal.S); set(hx1, 10, brow); }
  // hair / headwear
  if (!bald) {
    const [h1, h2, h3] = hair;
    const top = cap || beanie ? 6 : 7;
    rect(hx0, hy0, hx1, top, h2); rect(hx0 + 1, hy0, hx1 - 3, hy0 + 2, h1); rect(hx1 - 2, hy0 + 1, hx1, top, h3);
    rect(hx0 - 0, hy0 - 1, hx1, hy0 - 1, h2); rect(hx0 + 2, hy0 - 1, hx1 - 3, hy0 - 1, h1);
    clr(hx0, hy0 - 1); clr(hx0 + 1, hy0 - 1); clr(hx1, hy0 - 1); clr(hx1 - 1, hy0 - 1); clr(hx0, hy0); clr(hx1, hy0);
    if (back) { rect(hx0, top, hx1, 13, h2); rect(hx1 - 2, top, hx1, 13, h3); rect(hx0, 12, hx1, 13, h3); rect(hx0 + 2, 5, hx0 + 4, 9, h1); clr(hx0, 13); clr(hx1, 13);
      if (dir === 'NE') { rect(hx1 - 1, 9, hx1, 13, pal.s); set(hx1 - 2, 10, pal.S); set(hx1 - 2, 11, pal.S); } }
    else if (side) { rect(hx0, top, cx - 3, 13, h2); rect(hx0, 11, cx - 3, 13, h3); rect(hx0 + 1, 5, hx0 + 2, 9, h1); clr(hx0, 13); rect(cx - 2, 8, cx - 1, 9, h2); rect(cx, 8, cx + 4, 8, h2); set(cx + 5, 8, h3); }
    else {
      rect(hx0, top, hx0 + 1 + (q3 ? 1 : 0), 10, h2); if (!q3) rect(hx1 - 1, top, hx1, 10, h3); else rect(hx1, top, hx1, 9, h3);
      for (let x = hx0 + 2; x <= hx1 - 2; x++) if ((x + f) % 3 !== 0) set(x, 8, x > cx + 2 ? h3 : h2);          // fringe
    }
    if (spiky) {   // tall swept spikes: [base x, height]
      const sp = side ? [[hx0, 3], [hx0 + 3, 5], [hx0 + 6, 6], [hx0 + 9, 4], [hx0 + 11, 2]] : back ? [[hx0 + 1, 3], [hx0 + 4, 5], [hx0 + 7, 6], [hx0 + 10, 4]] : [[hx0, 3], [hx0 + 3, 5], [hx0 + 6, 6], [hx0 + 9, 5], [hx0 + 12, 3]];
      for (const [x, n] of sp) for (let i = 0; i < n; i++) { const y = hy0 - 2 - i, lean = i > n - 3 ? 1 : 0; set(x + lean, y, h1); if (i < n - 1) set(x + 1 + lean, y, i < n - 2 ? h2 : h1); if (i < n - 3) set(x + 2, y, h3); }
      if (!back && !side) { set(hx0 + 3, 9, h2); set(hx0 + 4, 9, h2); set(hx0 + 4, 10, h3); set(cx + 1 + f, 9, h2); }   // fringe points over the brow
    }
    if (beanie) { rect(hx0, top, hx1, top + 1, pal.Y); rect(hx1 - 2, top, hx1, top + 1, shade(pal.Y, .7)); rect(cx - 1, hy0 - 2, cx, hy0 - 2, h2);
      if (back) { rect(hx0, top + 2, hx1, 13, pal.J); rect(hx0, 12, hx1, 13, shade(pal.J, .8)); clr(hx0, 13); clr(hx1, 13); } }
    if (cap) {
      rect(hx0, top, hx1, top, shade(pal.W, .7));
      if (side) rect(cx + 2, top + 1, hx1 + 3, top + 1, pal.W); else if (!back) { rect(hx0 - 1 + f, top + 1, hx1 + 1 + (q3 ? 2 : 0), top + 1, pal.W); rect(hx0 + f, top + 2, hx1 + (q3 ? 1 : 0), top + 2, shade(pal.W, .6)); rect(cx - 1 + f, hy0 + 1, cx + f, hy0 + 2, pal.Q); }
      else { rect(hx0, top + 1, hx1, 12, pal.J); rect(hx0, 11, hx1, 12, shade(pal.J, .8)); }
    }
    if (hood) {
      if (!back) { rect(hx0 - 1, 5, hx0 + (side ? 2 : 0), 15, h2); if (!side) rect(hx1, 5, hx1 + 1, 15, h3); rect(hx0, hy0 - 1, hx1, hy0 + 3, h2); rect(hx0 + 2, hy0 - 1, hx1 - 4, hy0, h1); rect(hx0 + 1, hy1 + 1, hx1 - 1, hy1 + 1, h3); clr(hx0, hy0 - 1); clr(hx1, hy0 - 1); }
      else { rect(hx0 - 1, 5, hx1 + 1, 15, h2); rect(hx1 - 1, 5, hx1 + 1, 15, h3); rect(hx0 + 1, hy1 + 1, hx1 - 1, hy1 + 1, h3); rect(cx - 1, 6, cx - 1, 14, h3); }
    }
  } else {
    rect(hx0 + 3, hy0, hx0 + 6, hy0, skinHi); rect(hx0 + 2, hy0 + 1, hx0 + 4, hy0 + 2, skinHi);                  // shine on a shaved head
    if (back) { rect(hx0 + 1, 12, hx1 - 1, 12, pal.S); }
  }

  /* ---------------- outline, then to a canvas ---------------- */
  const out = g.map(r => r.slice());
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (g[y][x]) continue;
    if ((g[y - 1] && g[y - 1][x]) || (g[y + 1] && g[y + 1][x]) || g[y][x - 1] || g[y][x + 1]) out[y][x] = K;
  }
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x2 = c.getContext('2d');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (out[y][x]) { x2.fillStyle = out[y][x]; x2.fillRect(x, y, 1, 1); }
  return c;
}
