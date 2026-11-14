const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.addInitScript(() => {
    const mkb = () => ({ pressed: false, value: 0 });
    window.__pad = { buttons: Array.from({ length: 17 }, mkb), axes: [0, 0, 0, 0], connected: true, id: 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)', index: 0, mapping: 'standard', timestamp: 0 };
    navigator.getGamepads = () => [window.__pad];
    window.press = (i, v = 1) => { window.__pad.buttons[i] = { pressed: v > .5, value: v }; };
  });
  await p.goto('file:///home/claude/kc/dist/kinetic_city.html');
  await p.waitForTimeout(1500);
  await p.screenshot({ path: '/home/claude/kc/shots/01_title.png' });
  await p.evaluate(() => { KC.start(); });
  await p.waitForTimeout(400);
  await p.screenshot({ path: '/home/claude/kc/shots/02_dialog.png' });
  await p.evaluate(() => KC.skip());
  await p.waitForTimeout(600);
  await p.screenshot({ path: '/home/claude/kc/shots/03_play.png' });
  console.log(JSON.stringify(await p.evaluate(() => ({ mode: KC.G.mode, P: [KC.P.x, KC.P.y], ents: KC.ents.length, tk: KC.tkTarget && KC.tkTarget.kind, dev: KC.Input.device }))));
  console.log(errs.slice(0, 10).join('\n'));
  await b.close();
})();
