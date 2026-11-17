// Times of day: the same four views in sunset, night and day. Writes screenshots/time_<time>_<spot>.png and checks the setting.
const { chromium } = require('playwright'); const path = require('path'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && errs.length < 3) errs.push(m.text().slice(0, 300)); });
  const ok = (n, v) => console.log((v ? 'ok   ' : 'FAIL ') + n);
  await p.goto('file://' + ROOT + '/dist/gravitation.html'); await p.waitForTimeout(400);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(600);
  await p.evaluate(() => { KC.start(); KC.skip(); G.seen = new Proxy({}, { get: () => 1, set: () => true }); gatesOpen[0] = gatesOpen[1] = true; SETTINGS.hud = .7; KC.weather('dry'); });
  ok('a new game starts at sunset', await p.evaluate(() => KC.time() === 'sunset'));
  for (const time of ['sunset', 'night', 'day']) {
    await p.evaluate(t => { KC.time(t); KC.weather(t === 'night' ? 'rain' : 'dry'); }, time);
    for (const [spot, x, y] of [['street', 432, 432], ['park', 1008, 250], ['slums', 1968, 816], ['tower', 3504, 816], ['waterfront', 48, 300]]) {
      await p.evaluate(([x, y]) => { KC.tp(x, y); P.vx = P.vy = 0; P.invT = 1e9; G.heat = 0; for (const e of ents) if (e !== P && !e.dead && (e.team === 'gang' || e.kind === 'cop') && e.kind !== 'hideout' && e.kind !== 'tower' && Math.hypot(e.x - x, e.y - y) < 600) e.dead = true; }, [x, y]);
      await p.waitForTimeout(1500); await p.evaluate(() => { G.hint = null; G.toasts.length = 0; }); await p.waitForTimeout(80);
      await p.screenshot({ path: ROOT + '/screenshots/time_' + time + '_' + spot + '.png' });
    }
  }
  // weather is its own thing: it can rain or be dry at any time of day, and umbrellas follow the rain
  const umb = () => p.evaluate(() => { let n = 0; const d = drawUmbrella; drawUmbrella = function () { n++; return d.apply(this, arguments); }; render(1 / 60); drawUmbrella = d; return n; });
  await p.evaluate(() => { KC.time('day'); KC.weather('rain'); KC.tp(432, 432); for (let i = 0; i < 6; i++) { const c = spawnCiv(P.x + 30 + i * 14, P.y + 20); c.umb = '#3a6aa8'; } }); await p.waitForTimeout(600);
  ok('it can rain by day, and people put umbrellas up', await umb() >= 6 && await p.evaluate(() => WEATHER.rain === 1));
  await p.screenshot({ path: ROOT + '/screenshots/weather_day_rain.png' });
  await p.evaluate(() => { KC.time('night'); KC.weather('dry'); }); await p.waitForTimeout(600);
  ok('a dry night: no rain and not one umbrella', await umb() === 0 && await p.evaluate(() => WEATHER.rain === 0));
  await p.screenshot({ path: ROOT + '/screenshots/weather_night_dry.png' });
  ok('left alone, showers and dry spells take turns (20 simulated minutes: wet 35-75% of the time, at least 6 changes)', await p.evaluate(() => { KC.weather('auto'); let wet = 0, ch = 0, last = WEATHER.wet; for (let i = 0; i < 1200 * 4; i++) { updateWeather(.25); if (WEATHER.wet) wet++; if (WEATHER.wet !== last) { ch++; last = WEATHER.wet; } } const f = wet / 4800; window.__w = [f, ch]; return f > .35 && f < .75 && ch >= 6; }));
  console.log('   wet fraction and changes:', JSON.stringify(await p.evaluate(() => __w)));
  await p.evaluate(() => KC.time('night'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(200); await p.evaluate(() => document.querySelector('.tab[data-tab="settings"]').click()); await p.waitForTimeout(150);
  await p.evaluate(() => document.querySelector('.set[data-k="time"]').click()); await p.waitForTimeout(150);
  ok('the Time of day setting steps night -> day', await p.evaluate(() => SETTINGS.time === 'day' && LIGHT.name === 'day' && /Day/.test(document.querySelector('.set[data-k="time"]').textContent)));
  await p.reload(); await p.waitForTimeout(500);
  ok('and is remembered', await p.evaluate(() => SETTINGS.time === 'day' && LIGHT.name === 'day'));
  await p.evaluate(() => localStorage.clear());
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
