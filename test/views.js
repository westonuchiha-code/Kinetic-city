const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message + '\n' + e.stack));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('file:///home/claude/kc/dist/kinetic_city.html');
  await p.waitForTimeout(600);
  await p.evaluate(() => { KC.start(); KC.skip(); });
  const shots = process.argv.slice(2);
  // D0 street
  await p.evaluate(() => { KC.tp(1*384+48, 2*384+150); KC.P.invT = 999; });
  await p.waitForTimeout(900); await p.screenshot({ path: 'shots/20_d0.png' });
  await p.evaluate(() => { KC.skipTo(1); KC.skip(); KC.tp(4*384+48, 1*384+200); KC.P.invT = 999; });
  await p.waitForTimeout(900); await p.evaluate(() => KC.skip()); await p.waitForTimeout(300); await p.screenshot({ path: 'shots/21_d1.png' });
  await p.evaluate(() => { KC.skipTo(2); KC.skip(); KC.tp(7*384+48, 2*384+200); KC.P.invT = 999; });
  await p.waitForTimeout(900); await p.evaluate(() => KC.skip()); await p.waitForTimeout(300); await p.screenshot({ path: 'shots/22_d2.png' });
  const perf = await p.evaluate(() => new Promise(res => { let n = 0, t0 = performance.now(); function f() { n++; if (n < 120) requestAnimationFrame(f); else res((performance.now() - t0) / n); } requestAnimationFrame(f); }));
  console.log('avg frame ms', perf.toFixed(1));
  console.log(errs.slice(0, 8).join('\n'));
  await b.close();
})();
