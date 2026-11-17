// Window shapes a PC player may have (ultrawide, 5:4, 1366x768, 125% scaling, small, narrow): letterboxing, menus
// inside the picture, pixel scale and mouse aim. Prints one line per shape and writes screenshots/tour/w_<shape>_*.png.
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs'); const ROOT = path.resolve(__dirname, '..'), OUT = ROOT + '/screenshots/tour'; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch();
  for (const [w, h, dpr, nm] of [[2560, 1080, 1, 'ultrawide'], [1280, 1024, 1, 'tall_5x4'], [1366, 768, 1, 'laptop_1366'], [1536, 864, 1.25, 'windows_125pct'], [960, 540, 1, 'small_window'], [700, 900, 1, 'narrow_window']]) {
    const p = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr })).newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + ROOT + '/dist/gravitation.html'); await p.waitForTimeout(500);
    await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(600);
    await p.screenshot({ path: OUT + '/w_' + nm + '_title.png' });
    const title = await p.evaluate(() => { const r = document.getElementById('bNew').getBoundingClientRect(), l = document.querySelector('.logo').getBoundingClientRect(); return { btn: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], logo: [Math.round(l.left), Math.round(l.top), Math.round(l.right), Math.round(l.bottom)], frame: [Math.round(FRAME.x), Math.round(FRAME.y), Math.round(W), Math.round(H)] }; });
    await p.evaluate(() => { KC.start(); KC.skip(); G.seen = new Proxy({}, { get: () => 1, set: () => true }); }); await p.waitForTimeout(500);
    // mouse aim: point at a spot 120 px east of the hero and compare
    const aimErr = await (async () => { const s = await p.evaluate(() => { const q = isoToScreen(P.x + 120, P.y + 30, 0); return [q.x + FRAME.x, q.y + FRAME.y]; }); await p.mouse.move(s[0], s[1]); await p.waitForTimeout(200); return p.evaluate(() => { const want = Math.atan2(30, 120); let d = Math.abs(aim.ang - want); if (d > Math.PI) d = 2 * Math.PI - d; return +(d * 180 / Math.PI).toFixed(1); }); })();
    await p.screenshot({ path: OUT + '/w_' + nm + '_play.png' });
    await p.keyboard.press('Escape'); await p.waitForTimeout(400); await p.screenshot({ path: OUT + '/w_' + nm + '_pause.png' });
    const pause = await p.evaluate(() => { const r = document.getElementById('pause').firstElementChild.getBoundingClientRect(); const bb = document.getElementById('bResume').getBoundingClientRect(); return { panel: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], resume: [Math.round(bb.left), Math.round(bb.top), Math.round(bb.right), Math.round(bb.bottom)], scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight }; });
    const scale = await p.evaluate(() => +(cv.width / ART_W).toFixed(3));
    console.log(nm + ' ' + w + 'x' + h + ' @' + dpr + ': frame ' + title.frame + ' | art pixel = ' + scale + ' device px' + (Number.isInteger(scale) ? '' : ' (uneven)') + ' | mouse aim off by ' + aimErr + '° | title button ' + title.btn + ' | pause panel ' + pause.panel + ' resume ' + pause.resume + ' | page scroll ' + pause.scrollW + 'x' + pause.scrollH + (errs.length ? ' ERR ' + errs.join('|') : ''));
    await p.close();
  }
  await b.close();
})();
