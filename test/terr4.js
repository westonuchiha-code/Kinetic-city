const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  await p.goto('file:///home/claude/kc/dist/kinetic_city.html'); await p.waitForTimeout(400);
  const R = f => p.evaluate(f);
  await R(() => { KC.start(); KC.skip(); });
  await R(() => { window.H = KC.ents.find(e => e.kind === 'hideout' && e.did === 0); });
  console.log(await R(() => JSON.stringify({ H: [H.x, H.y, H.dead], mode: KC.G.mode, n: KC.ents.filter(e => e.team === 'gang' && !e.static && Math.hypot(e.x - H.x, e.y - H.y) < 320).length, sameP: KC.ents.includes(KC.P) })));
  await p.waitForTimeout(300);
  console.log(await R(() => JSON.stringify({ H: [H.x, H.y, H.dead, KC.ents.includes(H)], mode: KC.G.mode, n: KC.ents.filter(e => e.team === 'gang' && !e.static && Math.hypot(e.x - H.x, e.y - H.y) < 320).length })));
  await b.close();
})();
