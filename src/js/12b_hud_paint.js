/* ============================== 12b HUD, PAINTED ============================== */
/* The HUD in the ordinary-city look, matching the title screen and pause menu: flat painted plates with a hard drop
   shadow instead of glowing neon edges. Same layout; only the helpers that 12_hud.js draws with are replaced, plus
   its colours (NEON keeps its old name). */
Object.assign(NEON, { cyan: '#4a90d0', pink: '#c8452e', gold: '#e0b040', purple: '#8a64b8', green: '#3a9a64' });
const PAINT = { ink: '#f6e7c1', shadow: '#170e0c', panel: '#2e2422' };
const SIGN_FONT = '"Bungee","Impact","Arial Black",sans-serif';
function slantPath(x, y, w, h) { rr(x, y, w, h, Math.min(5 * hs, h / 3)); }   // plain sign plates, no lean
function neonStroke(col, a = 1, lw = 1.5 * hs) {                               // a painted outline with a hard shadow
  ctx.lineJoin = 'round';
  ctx.save(); ctx.translate(2 * hs, 2 * hs); ctx.globalAlpha *= a; ctx.strokeStyle = PAINT.shadow; ctx.lineWidth = lw + hs; ctx.stroke(); ctx.restore();
  ctx.save(); ctx.globalAlpha *= Math.min(1, a); ctx.strokeStyle = col; ctx.lineWidth = lw + hs * .5; ctx.stroke(); ctx.restore();
}
function neonFill(col, a = 1) {                                                 // a flat fill with a hard shadow
  ctx.save(); ctx.translate(1.5 * hs, 1.5 * hs); ctx.globalAlpha *= Math.min(1, a); ctx.fillStyle = PAINT.shadow; ctx.fill(); ctx.restore();
  ctx.save(); ctx.globalAlpha *= Math.min(1, a); ctx.fillStyle = col; ctx.fill(); ctx.restore();
}
function plate(x, y, w, h, col, a = .8, tint = .07) {                          // dark painted plate, coloured border, hard shadow
  slantPath(x + 3 * hs, y + 3 * hs, w, h); ctx.fillStyle = 'rgba(23,14,12,.85)'; ctx.fill();
  slantPath(x, y, w, h); ctx.fillStyle = 'rgba(46,36,34,.92)'; ctx.fill();
  if (tint) { ctx.fillStyle = rgba(col, Math.min(.55, tint * 1.6)); ctx.fill(); }
  ctx.strokeStyle = col; ctx.globalAlpha = Math.min(1, .55 + a * .45); ctx.lineWidth = 2 * hs; ctx.stroke(); ctx.globalAlpha = 1;
}
function glowText(str, x, y, px, col, align = 'left', w = 700) {               // sign lettering: solid colour over a hard shadow
  ctx.save(); ctx.font = `${Math.round(px)}px ${SIGN_FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  const d = Math.max(1, px * .07); ctx.fillStyle = PAINT.shadow; ctx.fillText(str, x + d, y + d); ctx.fillStyle = col; ctx.fillText(str, x, y);
  const tw = ctx.measureText(str).width; ctx.restore(); return tw;
}
