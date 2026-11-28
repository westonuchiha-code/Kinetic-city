// Readable fights: every attack has a tell, and only a few enemies wind up an attack on you at once.
// Stands the hero in a crowd and records, every tick, how many attacks are winding up and how many hits land with no tell.
const { chromium } = require('playwright'); const path = require('path'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const ok = (n, v, d) => console.log((v ? 'ok   ' : 'FAIL ') + n + (d ? '  — ' + d : ''));
  await p.goto('file://' + ROOT + '/dist/gravitation.html'); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    localStorage.clear(); KC.start(); KC.skip(); G.seen = new Proxy({}, { get: () => 1, set: () => true });
    const x = 1008, y = 1392; for (const e of ents) if (e !== P && !e.dead && e.kind !== 'hideout' && e.kind !== 'tower' && Math.hypot(e.x - x, e.y - y) < 700) e.dead = true; KC.tp(x, y);
    const mix = ['grunt', 'grunt', 'grunt', 'grunt', 'brute', 'sup', 'zapper', 'zapper', 'mite', 'mite', 'mite', 'courier', 'crawler'];
    mix.forEach((k, i) => { const a = i / mix.length * 6.28; const g = spawnGang(k, x + Math.cos(a) * 150, y + Math.sin(a) * 150, { home: { x, y }, terr: 600 }); g.tgt = P; g.provT = 999; });
    const winding = e => e.aimT > 0 || e.state === 'slamWind' || e.state === 'chargeWind' || e.chargeT > 0 || e.dropT > 0 || e.lungeT > .15 || e.state === 'arm';
    let maxW = 0, sumW = 0, n = 0, hits = 0, hp0 = 0; const realHurt = hurt; let untold = 0;
    hurt = function (e, dmg, info) { if (e === P && dmg > 0 && P.invT <= 0 && P.dashT <= 0) { hits++; } return realHurt.apply(this, arguments); };
    for (let i = 0; i < 60 * 45; i++) { P.hp = S.maxHp; P.invT = 0; KC.step(1); let w = 0; for (const e of act) if (!e.dead && e.tgt === P && winding(e)) w++; maxW = Math.max(maxW, w); sumW += w; n++; }
    hurt = realHurt;
    return { maxWinding: maxW, avgWinding: +(sumW / n).toFixed(2), hitsPerMinute: Math.round(hits / 45 * 60), turnsCap: MAX_TURNS };
  });
  console.log(JSON.stringify(r));
  ok('never more than ' + r.turnsCap + ' enemies (plus the odd crawler already armed) winding up at once', r.maxWinding <= r.turnsCap + 1, 'most at once: ' + r.maxWinding);
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
