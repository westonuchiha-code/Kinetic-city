// Scene switches for the story (no story content): time, weather and a start spot set in one call, kept in the save.
const { chromium } = require('playwright'); const path = require('path'); const ROOT = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const ok = (n, v) => console.log((v ? 'ok   ' : 'FAIL ') + n);
  await p.goto('file://' + ROOT + '/dist/gravitation.html'); await p.waitForTimeout(400);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(500);
  await p.evaluate(() => { KC.start(); KC.skip(); });
  ok('no scene at the start: the world follows Settings', await p.evaluate(() => !SCENE.time && LIGHT.name === SETTINGS.time));
  await p.evaluate(() => KC.scene({ time: 'night', weather: 'rain', at: { x: 432, y: 816 } })); await p.waitForTimeout(200);
  ok('one call sets night, rain and the start spot', await p.evaluate(() => LIGHT.name === 'night' && WEATHER.rain === 1 && Math.round(P.x) === 432 && Math.round(P.y) === 816));
  await p.evaluate(() => { for (let i = 0; i < 60 * 400; i++) updateWeather(1 / 60); });
  ok('the scene\'s rain holds (no dry spell for 400 s)', await p.evaluate(() => WEATHER.wet && WEATHER.rain === 1));
  await p.evaluate(() => { SETTINGS.time = 'day'; saveSettings(); }); await p.keyboard.press('Escape'); await p.waitForTimeout(150); await p.evaluate(() => document.querySelector('.tab[data-tab="settings"]').click()); await p.waitForTimeout(100);
  await p.evaluate(() => document.querySelector('.set[data-k="time"]').click()); await p.waitForTimeout(100); await p.keyboard.press('Escape');
  ok('changing Settings > Time of day does not break a scene', await p.evaluate(() => LIGHT.name === 'night'));
  await p.evaluate(() => saveGame()); await p.reload(); await p.waitForTimeout(500); await p.evaluate(() => document.getElementById('bCont').click()); await p.waitForTimeout(500);
  ok('the scene comes back with the saved game', await p.evaluate(() => SCENE.time === 'night' && LIGHT.name === 'night' && SCENE.weather === 'rain' && WEATHER.rain === 1));
  await p.evaluate(() => KC.scene(null));
  ok('clearing it hands back to Settings and normal weather', await p.evaluate(() => !SCENE.time && LIGHT.name === SETTINGS.time && WEATHER.hold === null));
  await p.evaluate(() => localStorage.clear());
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
