const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message + '\n' + e.stack));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('file:///home/claude/kc/dist/gravitation.html');
  await p.waitForTimeout(500);
  await p.evaluate(() => { KC.start(); KC.skip(); });
  for (let d = 0; d < 3; d++) {
    // destroy hideouts in district d
    const r = await p.evaluate((d) => {
      const hs = KC.ents.filter(e => e.kind === 'hideout' && e.did === d);
      for (const h of hs) { KC.tp(h.x, h.y + 120); KC.step(2); h.lastHitBy = 'player'; h.hp = 1; window.hurtTest = h; }
      return hs.length;
    }, d);
    await p.evaluate((d) => { for (const h of KC.ents.filter(e => e.kind === 'hideout' && e.did === d)) {
      for (const g of KC.ents.filter(e => e.guardOf === h.hid)) KC.hurt(g, 9999, { by: 'player' });
      KC.P.invT = 999; KC.step(5); KC.tp(h.x, h.rect.y + h.rect.h + 8); KC.step(5); } }, d);
    await p.evaluate(() => KC.step(150));
    let st = await p.evaluate((d) => ({ left: KC.DS[d].hideoutsLeft, boss: !!KC.G.boss, mode: KC.G.mode }), d);
    console.log('district', d, 'hideouts found', r, JSON.stringify(st));
    await p.evaluate(() => KC.skip());
    // fight the boss for 25s of sim time with an invulnerable player orbiting
    await p.evaluate(() => { const bo = KC.G.boss; KC.tp(bo.x + 200, bo.y); KC.P.invT = 999; });
    for (let i = 0; i < 25; i++) { await p.evaluate(() => { KC.P.invT = 999; KC.step(60); KC.skip(); }); }
    await p.screenshot({ path: `shots/3${d}_boss.png` });
    st = await p.evaluate(() => ({ bhp: KC.G.boss && Math.round(KC.G.boss.hp), act: KC.G.boss && KC.G.boss.act, gang: KC.ents.filter(e => e.team === 'gang' && !e.static).length, bullets: KC.bullets.length }));
    console.log(' boss after 25s', JSON.stringify(st));
    // finish boss
    await p.evaluate(() => { const bo = KC.G.boss; bo.hp = 1; bo.stagger = 0; window.__hurtBoss = bo; });
    await p.evaluate(() => { const bo = window.__hurtBoss; KC.P.invT = 999; KC.G.mode = 'play'; KC.step(1); bo.lastHitBy = 'player'; KC.ents.includes(bo) && (bo.hp = 0); });
    await p.evaluate(() => { const bo = window.__hurtBoss; if (!bo.dead) { bo.hp = -1; } });
    await p.evaluate(() => (() => { const bo = window.__hurtBoss; if (bo && !bo.dead) KC.hurt(bo, 9999, { by: "player" }); })());
    await p.evaluate(() => { KC.step(200); });
    const ch = await p.evaluate(() => { const c = KC.skip(); return c ? c.map(x => x.label) : null; });
    console.log(' choices', JSON.stringify(ch), 'mode', await p.evaluate(() => KC.G.mode));
    if (ch) { await p.waitForTimeout(700); await p.evaluate(() => { document.querySelector('.choice').click(); }); await p.waitForTimeout(50); await p.evaluate(() => KC.skip()); await p.evaluate(() => KC.skip()); }
    st = await p.evaluate((d) => ({ status: KC.DS[d].status, done: KC.DS[d].bossDone, mode: KC.G.mode, karma: KC.G.karma, finished: KC.G.finished }), d);
    console.log(' after choice', JSON.stringify(st));
    if (d < 2) { await p.evaluate((d) => { const x = [1300, 2450][d]; KC.tp(x, 48 + 384); KC.step(30); KC.skip(); }, d); }
  }
  await p.evaluate(() => { KC.skip(); });
  await p.waitForTimeout(300);
  await p.screenshot({ path: 'shots/39_end.png' });
  console.log('final', JSON.stringify(await p.evaluate(() => ({ mode: KC.G.mode, finished: KC.G.finished, lvl: KC.G.level, obj: null }))));
  console.log(errs.slice(0, 8).join('\n'));
  await b.close();
})();
