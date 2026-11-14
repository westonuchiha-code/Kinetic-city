const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  await p.goto('file:///home/claude/kc/dist/kinetic_city.html'); await p.waitForTimeout(400);
  console.log(await p.evaluate(() => { KC.start(); KC.skip(); const H = KC.ents.find(e => e.kind === 'hideout' && e.did === 0);
    return JSON.stringify({ H: [H.x, H.y], gang: KC.ents.filter(e => e.team === "gang" && !e.static && e.did === 0).map(e => [e.kind, Math.round(e.x), Math.round(e.y), e.home && Math.round(e.home.x), e.terr]) }); }));
  await b.close();
})();
