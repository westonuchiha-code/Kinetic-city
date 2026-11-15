// Effects film strip: each combat effect and pickup, a few moments apiece, cropped round the hero.
// Writes screenshots/fx_sheet_<n>.png, nine frames a sheet (needs Pillow for the sheets; raw frames go to a temp folder).
//   node test/fx.js [out-prefix]
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const os = require('os'); const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..'), PRE = process.argv[2] || ROOT + '/screenshots/fx_sheet_', TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'kcfx-'));
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  await p.goto('file://' + ROOT + '/dist/kinetic_city.html'); await p.waitForTimeout(400);
  await p.evaluate(() => { localStorage.clear(); }); await p.reload(); await p.waitForTimeout(600);
  await p.evaluate(() => {
    KC.start(); KC.skip(); G.seen = new Proxy({}, { get: () => 1, set: () => true }); SETTINGS.hud = .7; SETTINGS.shake = false;
    window.clearScene = () => { const x = 1008, y = 1392; for (const e of ents) if (e !== P && !e.dead && e.kind !== 'hideout' && e.kind !== 'tower' && Math.hypot(e.x - x, e.y - y) < 600) e.dead = true; KC.tp(x, y); P.vx = P.vy = 0; P.hp = S.maxHp; P.energy = S.maxEn; P.invT = 1e9; P.ang = .5; G.heat = 0; G.combo = 0; bullets.length = 0; parts.length = 0; rings.length = 0; zones.length = 0; warns.length = 0; wells.length = 0; pickups.length = 0; decals.length = 0; texts.length = 0; G.toasts.length = 0; G.hint = null; P.repCd = P.wellCd = P.dashCd = 0; aim.ang = 0; aim.dx = 1; aim.dy = 0; };
  });
  const frames = [];
  const shot = async (label) => { const s = await p.evaluate(() => { G.hint = null; G.toasts.length = 0; const q = isoToScreen(P.x, P.y, 10); return [q.x, q.y]; }); const f = TMP + '/' + String(frames.length).padStart(2, '0') + '.png'; await p.screenshot({ path: f, clip: { x: Math.min(600, Math.max(0, s[0] - 420)), y: Math.min(280, Math.max(0, s[1] - 310)), width: 1000, height: 620 } }); frames.push([f, label]); };
  // a scene: clear the plaza, point the mouse east of the hero, run the setup (page code, or a function given the page), then shoot at the listed times
  const scene = async (setup, shots) => {
    await p.evaluate(() => clearScene()); await p.waitForTimeout(700);
    const s = await p.evaluate(() => { const q = isoToScreen(P.x + 160, P.y, 0); return [q.x + FRAME.x, q.y + FRAME.y]; }); await p.mouse.move(s[0], s[1]); await p.waitForTimeout(60);
    if (setup.length) await setup(p); else await p.evaluate(setup);
    let t = 0; for (const [ms, label] of shots) { await p.waitForTimeout(Math.max(0, ms - t)); t = ms; await shot(label); }
  };
  await scene(() => { KC.explosion(P.x + 70, P.y - 10, 96, 0, 'player'); }, [[50, 'Explosion · start'], [170, 'Explosion · bloom'], [420, 'Explosion · smoke']]);
  await scene(() => { for (let i = 0; i < 3; i++) { const g = KC.spawnGang('grunt', P.x + 46 + i * 10, P.y - 26 + i * 26); g.cd = 9; } repulse(); }, [[50, 'Push · start'], [150, 'Push · ring'], [300, 'Push · fading']]);
  await scene(() => { for (let i = 0; i < 4; i++) { const g = KC.spawnGang('grunt', P.x + 80 + (i % 2) * 40, P.y - 30 + i * 20); g.cd = 9; } KC.spawn('crate', P.x + 130, P.y + 40); placeWell(); }, [[250, 'Gravity well · opening'], [1200, 'Gravity well · pulling'], [3300, 'Gravity well · collapse']]);
  await scene(async (p) => { await p.evaluate(() => { for (let i = 0; i < 3; i++) { const g = KC.spawnGang('grunt', P.x + 70 + i * 12, P.y - 30 + i * 30); g.cd = 99; g.sight = 0; } }); await p.keyboard.down('q'); await p.waitForTimeout(250); await p.evaluate(() => { P.charge = S.absCap * .8; }); await p.waitForTimeout(120); await shot('Absorb · shield up'); await p.keyboard.up('q'); }, [[50, 'Absorb · blast'], [190, 'Absorb · blast ring']]);
  await scene(() => { pickups.push({ x: P.x + 100, y: P.y - 40, vx: 0, vy: 0, type: 'hp', life: 30 }, { x: P.x + 110, y: P.y + 50, vx: 0, vy: 0, type: 'en', life: 30 }, { x: P.x + 40, y: P.y - 110, type: 'shard', id: 999, life: 1e9 }); }, [[400, 'Pickups · health, energy, shard']]);
  await scene(() => { const g = KC.spawnGang('grunt', P.x + 90, P.y); g.cd = 9; const c = KC.spawn('crate', P.x + 36, P.y); grab(c); c.z = 16; aim.ang = 0; aim.dx = 1; aim.dy = 0; throwHeld(); }, [[130, 'Hit · impact'], [330, 'Hit · numbers']]);
  await scene(() => { warnCircle(P.x + 80, P.y + 10, 60, 1.2, '#ff7a2a'); warnLine(P.x - 150, P.y - 60, .3, 200, 26, 1.2); for (let i = 0; i < 4; i++) zones.push({ x: P.x - 20 + i * 24, y: P.y + 70 + i * 4, r: 24, t: 3, max: 3, dmg: 0, col: '#ff7a2a' }); }, [[500, 'Warnings and fire']]);
  await scene(() => { const g = KC.spawnGang('grunt', P.x + 150, P.y - 20); g.tgt = P; g.cd = .1; const s = KC.spawnGang('sup', P.x + 120, P.y + 70); s.tgt = P; s.cd2 = .2; }, [[900, 'Gunfire'], [1500, 'Elite bolts']]);
  await scene(() => { addXP(xpNeed() + 5); }, [[120, 'Level up'], [350, 'Level up · ring']]);
  await scene(async (p) => { await p.evaluate(() => { const c = spawnCiv(P.x + 34, P.y + 6); c.hp = 1; c.state = 'wounded'; c.woundT = 60; }); await p.waitForTimeout(300); await p.keyboard.down('f'); await p.waitForTimeout(500); await shot('Heal beam'); await p.keyboard.up('f'); }, []);
  console.log(errs.join('\n') || 'no errors'); await b.close();
  // contact sheets, 3 x 3 frames each
  const py = `
import sys, json
from PIL import Image, ImageDraw, ImageFont
frames = json.loads(sys.argv[1]); pre = sys.argv[2]
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
except OSError: font = ImageFont.load_default()
W, H, per = 800, 496, 9
for k in range(0, len(frames), per):
    sheet = Image.new('RGB', (W * 3, H * 3), (10, 10, 14)); d = ImageDraw.Draw(sheet)
    for j, (f, cap) in enumerate(frames[k:k + per]):
        im = Image.open(f).convert('RGB').resize((W, H), Image.LANCZOS); x, y = (j % 3) * W, (j // 3) * H; sheet.paste(im, (x, y))
        tw = d.textlength(cap, font=font); d.rectangle((x + 6, y + H - 36, x + 6 + tw + 12, y + H - 6), fill=(0, 0, 0)); d.text((x + 12, y + H - 34), cap, fill=(255, 220, 120), font=font)
    sheet.save(pre + str(k // per + 1) + '.png')
print(len(frames), 'frames')
`;
  try { console.log(String(execFileSync('python3', ['-c', py, JSON.stringify(frames), PRE])).trim()); } catch (e) { console.log('could not build the sheets (Pillow missing?); raw frames are in ' + TMP); }
})();
