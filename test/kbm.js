const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/kc/dist/gravitation.html'); await p.waitForTimeout(400);
  await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  for (let i = 0; i < 12; i++) { await p.keyboard.press('Enter'); await p.waitForTimeout(60); }
  console.log('mode', await p.evaluate(() => KC.G.mode));
  const c = await p.evaluate(() => { const c = KC.ents.filter(e => e.kind === 'crate').sort((a, b) => Math.hypot(a.x - KC.P.x, a.y - KC.P.y) - Math.hypot(b.x - KC.P.x, b.y - KC.P.y))[0]; window.__c = c; const s = isoToScreen(c.x, c.y); return { x: s.x + FRAME.x, y: s.y + FRAME.y }; });
  await p.mouse.move(c.x, c.y, { steps: 5 }); await p.waitForTimeout(150);
  console.log('target', await p.evaluate(() => KC.tkTarget && KC.tkTarget.kind));
  await p.mouse.down(); await p.waitForTimeout(400);
  console.log('holding', await p.evaluate(() => KC.P.holding && KC.P.holding.kind));
  await p.mouse.move(c.x + 300, c.y + 200, { steps: 5 }); await p.waitForTimeout(200);
  await p.mouse.up(); await p.waitForTimeout(30);
  console.log('thrown', await p.evaluate(() => [Math.round(Math.hypot(__c.vx, __c.vy)), __c.thrower]));
  await p.keyboard.down('KeyD'); await p.waitForTimeout(300); await p.keyboard.up('KeyD');
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  console.log('esc ->', await p.evaluate(() => KC.G.mode));
  await p.keyboard.press('ArrowRight'); await p.keyboard.press('Enter'); await p.waitForTimeout(100);
  await p.screenshot({ path: 'shots/40_kbm_pause.png' });
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  console.log('esc ->', await p.evaluate(() => KC.G.mode));
  console.log(errs.join('\n'));
  await b.close();
})();
