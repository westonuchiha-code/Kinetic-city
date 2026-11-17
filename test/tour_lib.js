// Shared helpers for the screenshot tour (test/tour.js): opens the game with a mocked Xbox pad, plays in real time,
// saves screenshots to screenshots/tour/ and runs a sanity check on the world at every stop.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const ROOT = path.resolve(__dirname, '..'), OUT = ROOT + '/screenshots/tour';
async function open() {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } }); const p = await ctx.newPage();
  const log = []; p.on('pageerror', e => log.push('PAGE ERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n'))); p.on('console', m => { if (m.type() === 'error') log.push('CONSOLE ERROR: ' + m.text()); });
  await p.addInitScript(() => {
    const mkb = () => ({ pressed: false, value: 0 });
    window.__pad = { buttons: Array.from({ length: 17 }, mkb), axes: [0, 0, 0, 0], connected: true, id: 'Xbox Wireless Controller (STANDARD GAMEPAD)', index: 0, mapping: 'standard' };
    navigator.getGamepads = () => [window.__pad];
    window.btn = (i, v = 1) => { window.__pad.buttons[i] = { pressed: v > .5, value: v }; };
    window.tap = async (i, ms = 70) => { btn(i, 1); await new Promise(r => setTimeout(r, ms)); btn(i, 0); await new Promise(r => setTimeout(r, 60)); };
    const scr = (dx, dy) => { const sx = dx - dy, sy = (dx + dy) / 2, m = Math.hypot(sx, sy) || 1; return [sx / m, sy / m]; };
    window.aimW = (x, y) => { const s = scr(x - P.x, y - P.y); window.__pad.axes[2] = s[0]; window.__pad.axes[3] = s[1]; };   // right stick towards a world point
    window.moveW = (dx, dy) => { const s = scr(dx, dy); window.__pad.axes[0] = s[0]; window.__pad.axes[1] = s[1]; };          // left stick in a world direction
    window.stopMove = () => { window.__pad.axes[0] = window.__pad.axes[1] = 0; };
    // clear a stretch of street for a staged scene: full health and energy, no gang, cops, traffic or bystanders within reach
    window.stage = (x, y, keepPeople) => { for (const e of ents) if (e !== P && !e.dead && e.kind !== 'hideout' && e.kind !== 'tower' && Math.hypot(e.x - x, e.y - y) < 520 && (e.team === 'gang' || e.kind === 'cop' || e.kind === 'car' || (!keepPeople && e.kind === 'civ') || ['crate', 'barrel', 'dumpster'].includes(e.kind))) e.dead = true; KC.tp(x, y); P.vx = P.vy = 0; P.hp = S.maxHp; P.energy = S.maxEn; G.heat = 0; G.combo = 0; bullets.length = 0; };
    window.near = (kind, r = 400, pred) => { let best = null, bd = r * r; for (const e of ents) if (!e.dead && e.kind === kind && (!pred || pred(e))) { const d = (e.x - P.x) ** 2 + (e.y - P.y) ** 2; if (d < bd) { bd = d; best = e; } } return best; };
    // anything in the world that should never happen
    window.sanity = () => {
      const bad = [];
      if (!isFinite(P.x) || !isFinite(P.y) || !isFinite(P.hp) || !isFinite(P.energy)) bad.push('player has a non-number in position/health/energy');
      if (P.x < -5 || P.y < -5 || P.x > WORLD_W + 5 || P.y > WORLD_H + 5) bad.push('player outside the world ' + Math.round(P.x) + ',' + Math.round(P.y));
      let nan = 0, out = 0, inWall = 0; const kinds = {}, stuck = [];
      for (const e of ents) { if (e.dead) continue; kinds[e.kind] = (kinds[e.kind] || 0) + 1; if (!isFinite(e.x) || !isFinite(e.y) || (e.hp !== undefined && !isFinite(e.hp))) nan++; else if (e.x < -40 || e.y < -40 || e.x > WORLD_W + 40 || e.y > WORLD_H + 40) out++;
        else if (e.kind !== 'hideout' && e.kind !== 'tower' && e.kind !== 'civ' && !e.driving && e !== P.holding && !(e.z > 4) && typeof walkable === 'function' && !walkable(e.x, e.y, 2) && Math.hypot(e.x - P.x, e.y - P.y) < 700) { inWall++; stuck.push(e.kind + (e.state ? '/' + e.state : '') + '@' + Math.round(e.x) + ',' + Math.round(e.y)); } }
      if (nan) bad.push(nan + ' entities with a non-number position or health'); if (out) bad.push(out + ' entities outside the world'); if (inWall) bad.push(inWall + ' inside a wall near the player: ' + stuck.slice(0, 4).join(' '));
      if (ents.length > 900) bad.push('entity list is large: ' + ents.length); if (bullets.length > 300) bad.push('bullets: ' + bullets.length); if (parts.length > 1500) bad.push('particles: ' + parts.length);
      if (G.toasts.length > 5) bad.push('toasts stacked: ' + G.toasts.length);
      return bad;
    };
  });
  await p.goto('file://' + ROOT + '/dist/gravitation.html'); await p.waitForTimeout(500);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(700);
  const T = { b, p, log, n: 0, issues: [],
    wait: ms => p.waitForTimeout(ms), run: (f, a) => p.evaluate(f, a),
    until: async (f, ms = 4000, arg) => { try { await p.waitForFunction(f, arg, { timeout: ms, polling: 16 }); return true; } catch (e) { console.log('   (waited ' + ms + ' ms for a moment that never came: ' + String(f).slice(0, 70) + ')'); return false; } },
    async shot(name, note) {
      const file = name + '.png'; await p.screenshot({ path: OUT + '/' + file });
      const s = await p.evaluate(() => typeof P !== 'undefined' && P && G.mode !== 'title' ? sanity() : []);
      for (const x of s) T.issues.push(name + ': ' + x);
      console.log('shot ' + file + (note ? '  — ' + note : '') + (s.length ? '   !! ' + s.join('; ') : ''));
    },
    async done() { console.log('\n' + (log.length ? log.join('\n') : 'no page or console errors')); console.log(T.issues.length ? 'sanity issues:\n  ' + T.issues.join('\n  ') : 'no sanity issues'); await b.close(); }
  };
  return T;
}
module.exports = { open, ROOT, OUT };
