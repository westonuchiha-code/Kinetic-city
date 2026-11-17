const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    const mkb = () => ({ pressed: false, value: 0 });
    window.__pad = { buttons: Array.from({ length: 17 }, mkb), axes: [0, 0, 0, 0], connected: true, id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: 0, mapping: 'standard' };
    navigator.getGamepads = () => [window.__pad];
    window.tap = async (i) => { window.__pad.buttons[i] = { pressed: true, value: 1 }; await new Promise(r => setTimeout(r, 70)); window.__pad.buttons[i] = { pressed: false, value: 0 }; await new Promise(r => setTimeout(r, 90)); };
  });
  await p.goto('file:///home/claude/kc/dist/gravitation.html'); await p.waitForTimeout(500);
  const foc = () => p.evaluate(() => { const f = document.querySelector('.focus'); return f ? f.textContent.trim().slice(0, 30) : null; });
  console.log('title focus', await foc());
  await p.evaluate(() => tap(13)); await p.evaluate(() => tap(13)); console.log('after down x2', await foc());
  await p.evaluate(() => tap(0)); await p.waitForTimeout(150);
  await p.screenshot({ path: 'shots/41_ps_controls.png' });
  await p.evaluate(() => tap(1)); await p.waitForTimeout(150); console.log('back to', await foc(), await p.evaluate(() => KC.G.mode));
  await p.evaluate(() => tap(12)); await p.evaluate(() => tap(12)); await p.evaluate(() => tap(0)); await p.waitForTimeout(200);
  console.log('mode', await p.evaluate(() => KC.G.mode));
  for (let i = 0; i < 10; i++) await p.evaluate(() => tap(0));
  console.log('mode after dialog', await p.evaluate(() => KC.G.mode));
  // jump to boss defeat choice
  await p.evaluate(() => { KC.spawnBoss(0); KC.skip(); const bo = KC.G.boss; KC.hurt(bo, 99999, { by: 'player' }); KC.step(200); });
  await p.waitForTimeout(300);
  for (let i = 0; i < 3; i++) await p.evaluate(() => tap(0));
  await p.screenshot({ path: 'shots/42_choice.png' });
  console.log('choice focus', await foc());
  await p.evaluate(() => tap(13)); console.log('choice focus after down', await foc());
  await p.evaluate(() => tap(0)); await p.waitForTimeout(100);
  for (let i = 0; i < 4; i++) await p.evaluate(() => tap(0));
  console.log('result', JSON.stringify(await p.evaluate(() => ({ mode: KC.G.mode, karma: KC.G.karma, st: KC.DS[0].status }))));
  // pause -> settings via R1 twice, adjust music with right
  await p.evaluate(() => tap(9)); await p.evaluate(() => tap(5)); await p.evaluate(() => tap(5)); await p.evaluate(() => tap(5)); await p.waitForTimeout(100);
  console.log('settings focus', await foc()); await p.evaluate(() => tap(15)); console.log('after right', await foc());
  await p.screenshot({ path: 'shots/43_settings.png' });
  console.log(errs.join('\n'));
  await b.close();
})();
