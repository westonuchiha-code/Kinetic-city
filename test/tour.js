// Screenshot tour of the whole game, played with a mocked controller in real time. Every stop saves
// screenshots/tour/<name>.png and checks the world for things that should never happen (see tour_lib.js).
//   node test/tour.js            all parts
//   node test/tour.js powers     one part: start, powers, fights, people, hideout, boss, city, menus
const { open } = require('./tour_lib');
const only = process.argv[2];
const parts = {
  /* ---------- first minutes ---------- */
  async start(T) {
    await T.shot('01_title', 'title screen');
    await T.run(() => tap(0)); await T.wait(900);
    await T.shot('02_first_seconds', 'right after New Game');
    await T.run(() => moveW(1, .2)); await T.wait(1600); await T.shot('03_walking', 'walking east'); await T.run(() => stopMove());
    await T.wait(2500); await T.shot('04_street', 'standing in the first street');
  },
  /* ---------- the five powers ---------- */
  async powers(T) {
    await T.run(() => { KC.start(); KC.skip(); });
    await T.wait(600);
    // grab the nearest crate
    await T.run(() => { const c = near('crate', 300); window.__c = c; aimW(c.x, c.y); }); await T.wait(500);
    await T.shot('10_grab_prompt', 'aiming at a crate: grab prompt over it');
    await T.run(() => btn(7, 1)); await T.wait(700);
    await T.run(() => aimW(P.x + 300, P.y + 40)); await T.wait(500);
    await T.shot('11_holding_crate', 'holding a crate, aiming east');
    await T.run(() => btn(7, 0)); await T.wait(180); await T.shot('12_crate_thrown', 'just after the throw'); await T.wait(900);
    // lift a car
    await T.run(() => { const c = near('car', 500, e => !e.driving); window.__car = c; KC.tp(c.x - 46, c.y - 30); aimW(c.x, c.y); }); await T.wait(700);
    await T.run(() => btn(7, 1)); await T.wait(1100); await T.run(() => aimW(P.x + 200, P.y + 200)); await T.wait(500);
    await T.shot('13_holding_car', 'holding a car');
    await T.run(() => btn(7, 0)); await T.wait(260); await T.shot('14_car_thrown', 'car in the air'); await T.wait(1400);
    await T.shot('15_car_landed', 'after the car lands');
    // barrel into a group (staged at a crossroads so there is room; the group stands close enough to stay in frame)
    await T.run(() => { stage(1008, 1392); const b = KC.spawn('barrel', P.x + 28, P.y + 6); window.__b = b; for (let i = 0; i < 4; i++) { const g = KC.spawnGang('grunt', P.x + 120 + (i % 2) * 22, P.y - 26 + i * 18); g.cd = 9; g.sight = 0; } aimW(b.x, b.y); });
    await T.wait(600); await T.run(() => btn(7, 1)); await T.wait(600); await T.run(() => aimW(P.x + 130, P.y)); await T.wait(450);
    await T.shot('16_holding_barrel', 'barrel held, gang ahead');
    await T.run(() => btn(7, 0)); await T.wait(260); await T.shot('17_barrel_thrown', 'barrel hits the group (it does not explode on impact)'); await T.wait(600); await T.shot('18_after_barrel', 'aftermath');
    // push
    await T.run(() => { stage(1008, 1392); for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; KC.spawn(i % 2 ? 'crate' : 'barrel', P.x + Math.cos(a) * 42, P.y + Math.sin(a) * 34); } for (let i = 0; i < 3; i++) { const g = KC.spawnGang('grunt', P.x + 64 + i * 12, P.y - 28 + i * 26); g.cd = 9; } });
    await T.wait(500); await T.shot('19_before_push', 'surrounded'); await T.run(() => { btn(5, 1); }); await T.wait(90); await T.shot('20_push', 'shockwave'); await T.run(() => btn(5, 0)); await T.wait(700);
    // gravity well
    await T.run(() => { stage(960, 1392); P.wellCd = 0; for (let i = 0; i < 5; i++) { const g = KC.spawnGang('grunt', P.x + 90 + (i % 3) * 30, P.y - 34 + i * 16); g.cd = 9; } KC.spawn('crate', P.x + 120, P.y + 34); KC.spawn('car', P.x + 170, P.y - 6, { col: '#c03a3a', ang: 1 }); aimW(P.x + 130, P.y); });
    await T.wait(500); await T.run(() => tap(4)); await T.wait(900); await T.shot('21_gravity_well', 'gravity well pulling a group'); await T.wait(1800); await T.shot('22_well_later', 'well near its end'); await T.wait(2200);
    // absorb under fire, then the blast
    await T.run(() => { stage(960, 1392); for (let i = 0; i < 4; i++) { const g = KC.spawnGang('grunt', P.x + 110 + (i % 2) * 24, P.y - 30 + i * 20); g.tgt = P; g.cd = .2 + i * .15; } aimW(P.x + 120, P.y); });
    await T.wait(300); await T.run(() => btn(6, 1)); await T.wait(1500); await T.shot('23_absorbing', 'absorbing gunfire'); await T.run(() => btn(6, 0)); await T.wait(140); await T.shot('24_absorb_blast', 'released blast'); await T.wait(700);
    // dash
    await T.run(() => { stage(930, 1392); moveW(1, 0); }); await T.wait(300); await T.run(() => tap(0, 40)); await T.wait(60); await T.shot('25_dash', 'mid-dash'); await T.run(() => stopMove()); await T.wait(500);
  }
  ,
  /* ---------- fights ---------- */
  async fights(T) {
    await T.run(() => { KC.start(); KC.skip(); G.seen = new Proxy({}, { get: () => 1, set: () => true }); }); await T.wait(400);
    // gunmen: aim lasers, bullets, damage numbers
    await T.run(() => { stage(1008, 1392); for (let i = 0; i < 4; i++) { const a = -1 + i * .6, g = KC.spawnGang('grunt', P.x + Math.cos(a) * 120, P.y + Math.sin(a) * 110); g.tgt = P; g.cd = .5 + i * .2; } aimW(P.x + 100, P.y); });
    await T.until(() => bullets.length >= 2, 4000); await T.wait(120); await T.shot('30_gunmen', 'gunmen with aim lasers, bullets in the air');
    // reflecting bullets with a push
    await T.until(() => bullets.some(b => Math.hypot(b.x - P.x, b.y - P.y) < 60), 4000); await T.run(() => btn(5, 1)); await T.wait(110); await T.shot('31_reflect', 'push reflects bullets'); await T.run(() => btn(5, 0)); await T.wait(400);
    // brute: slam warning, then the charge
    await T.run(() => { stage(1008, 1392); window.__br = KC.spawnGang('brute', P.x + 70, P.y + 10); __br.tgt = P; });
    await T.until(() => __br.state === 'slamWind', 6000); await T.wait(160); await T.shot('32_brute_slam', 'brute winding up a slam');
    await T.run(() => { KC.tp(P.x - 150, P.y); P.hp = S.maxHp; }); await T.until(() => __br.state === 'chargeWind' || __br.state === 'charging', 8000); await T.wait(250); await T.shot('33_brute_charge', 'brute charging');
    // elite
    await T.run(() => { stage(1008, 1392); window.__sp = KC.spawnGang('sup', P.x + 150, P.y - 20); __sp.tgt = P; __sp.cd2 = .6; });
    await T.until(() => __sp.dashT > 0, 5000); await T.wait(380); await T.shot('34_elite', 'superpowered elite: dash, then a fan of bolts');
    // lifting a hurt goon
    await T.run(() => { stage(1008, 1392); const g = KC.spawnGang('grunt', P.x + 60, P.y); g.cd = 9; g.hp = g.maxhp * .3; g.sinceHit = 0; window.__g = g; aimW(g.x, g.y); }); await T.wait(450);
    await T.shot('35_goon_grab_prompt', 'a hurt goon can be lifted'); await T.run(() => btn(7, 1)); await T.wait(700); await T.shot('36_goon_held', 'goon held in the air'); await T.run(() => { aimW(P.x + 100, P.y - 100); }); await T.wait(200); await T.run(() => btn(7, 0)); await T.wait(900);
    // police: heat stars, cruisers and cops
    await T.run(() => { stage(432, 432, true); G.heat = 3.2; G.heatT = 0; G.copT = 0; }); await T.until(() => ents.some(e => e.kind === 'cop' && !e.dead && Math.hypot(e.x - P.x, e.y - P.y) < 260), 15000); await T.wait(400);
    await T.shot('37_police', 'wanted: heat stars and police closing in');
    // nearly dead, then dead, then back on your feet
    await T.run(() => { stage(1008, 1392); P.hp = 18; }); await T.wait(700); await T.shot('38_low_health', 'low health warning');
    await T.run(() => { KC.hurt(P, 999, { by: 'test' }); }); await T.wait(900); await T.shot('39_dead', 'you fell'); await T.until(() => G.mode === 'play', 8000); await T.wait(700); await T.shot('40_respawn', 'back at the checkpoint');
  },
  /* ---------- people and karma ---------- */
  async people(T) {
    await T.run(() => { KC.start(); KC.skip(); G.seen = new Proxy({}, { get: () => 1, set: () => true }); }); await T.wait(400);
    await T.run(() => { stage(1008, 1392); for (let i = 0; i < 2; i++) { const c = spawnCiv(P.x + 36 + i * 30, P.y + 10 - i * 26); c.hp = 1; c.state = 'wounded'; c.woundT = 60; } });
    await T.wait(800); await T.shot('45_wounded', 'wounded civilians: heal or drain');
    await T.run(() => btn(2, 1)); await T.wait(700); await T.shot('46_healing', 'healing'); await T.until(() => !ents.some(e => e.kind === 'civ' && e.state === 'wounded' && Math.hypot(e.x - P.x, e.y - P.y) < 50) || G.karma > 0, 5000); await T.run(() => btn(2, 0)); await T.wait(500); await T.shot('47_healed', 'healed: karma up');
    await T.run(() => { const c = near('civ', 200, e => e.state === 'wounded'); if (c) KC.tp(c.x - 24, c.y + 8); }); await T.wait(500);
    await T.run(() => btn(3, 1)); await T.wait(800); await T.shot('48_draining', 'draining a civilian'); await T.wait(1500); await T.run(() => btn(3, 0)); await T.wait(500); await T.shot('49_drained', 'drained: karma down');
    // the two random street events
    await T.run(() => { stage(432, 432, true); G.karma = 0; const r = Math.random; Math.random = () => .3; G.encT = 0; KC.step(2); Math.random = r; }); await T.wait(1200); await T.shot('50_civilians_in_danger', 'event: civilians in danger');
    await T.run(() => { stage(432, 432, true); G.marker = null; const r = Math.random; Math.random = () => .95; G.encT = 0; KC.step(2); Math.random = r; }); await T.wait(1200); await T.shot('51_supply_drop', 'event: supply drop');
    // a hero and a villain
    await T.run(() => { stage(432, 432, true); KC.setKarma(80); G.allyT = 0; G.seen = {}; }); await T.until(() => ents.some(e => e.kind === 'cop' && e.ally && !e.dead && Math.hypot(e.x - P.x, e.y - P.y) < 300), 14000); await T.wait(500); await T.shot('52_hero_karma', 'hero karma: police back you up');
    await T.run(() => { for (const e of ents) if (e.kind === 'cop') e.dead = true; stage(432, 432, true); KC.setKarma(-80); }); await T.wait(1500); await T.shot('53_villain_karma', 'villain karma');
    await T.run(() => { KC.setKarma(0); stage(48, 432, true); }); await T.wait(6000); await T.shot('54_street_life', 'ordinary street: traffic and people');
  },
  /* ---------- one hideout from start to finish ---------- */
  async hideout(T) {
    await T.run(() => { KC.start(); KC.skip(); G.seen = new Proxy({}, { get: () => 1, set: () => true }); }); await T.wait(400);
    await T.run(() => { const h = ents.find(e => e.kind === 'hideout' && e.did === 0); window.__h = h; KC.tp(h.x + 150, h.rect.y + h.rect.h + 150); P.invT = 1e9; aimW(h.x, h.y); });
    await T.wait(2500); await T.shot('55_hideout_approach', 'guards and the watchtower open fire');
    await T.run(() => { const t = ents.find(e => e.kind === 'tower' && e.guardOf === __h.hid); window.__t = t; KC.hurt(t, t.hp - 10, { by: 'player' }); }); await T.wait(300); await T.shot('56_tower_damaged', 'watchtower nearly down');
    await T.run(() => KC.hurt(__t, 999, { by: 'player' })); await T.wait(350); await T.shot('57_tower_falls', 'the tower comes down');
    await T.run(() => { for (const e of ents) if (!e.dead && e.guardOf === __h.hid) KC.hurt(e, 999, { by: 'player' }); }); await T.until(() => __h.gateOpen, 4000); await T.wait(700); await T.shot('58_gate_opens', 'last guard down: the shutter rolls up');
    await T.until(() => ents.some(e => !e.dead && e.team === 'gang' && !e.static && e.kind !== 'hideout'), 8000); await T.wait(1200); await T.shot('59_wave', 'first wave comes out');
    for (let i = 0; i < 40 && !(await T.run(() => ents.some(e => !e.dead && e.leader))); i++) { await T.run(() => { for (const e of ents) if (!e.dead && e.waveOf !== undefined && !e.leader) KC.hurt(e, 999, { by: 'player' }); }); await T.wait(500); if (i === 9) await T.shot('59b_wave2', 'second wave'); }
    await T.wait(1100); await T.shot('60_lieutenant', 'the lieutenant comes out');
    await T.run(() => { const l = ents.find(e => !e.dead && e.leader); KC.hurt(l, 9999, { by: 'player' }); }); await T.wait(900); await T.shot('61_hideout_cleared', 'hideout cleared'); await T.wait(2500); await T.shot('62_after_clear', 'a moment later');
  },
  /* ---------- the three bosses ---------- */
  async boss(T) {
    await T.run(() => { KC.start(); KC.skip(); G.seen = new Proxy({}, { get: () => 1, set: () => true }); }); await T.wait(400);
    for (let d = 0; d < 3; d++) {
      const nm = ['cinder', 'krag', 'architect'][d];
      await T.run((d) => { if (d) KC.skipTo(d); for (const e of ents) if (e.did === d && (e.kind === 'hideout' || e.guardOf !== undefined)) { if (e.kind === 'hideout') { e.cleared = true; e.gateOpen = true; e.gateT = 1; } else e.dead = true; }
        DS[d].hideoutsLeft = 0; const s = spots.boss[d]; KC.tp(s.x - 110, s.y + 60); P.invT = 1e9; P.hp = S.maxHp; KC.spawnBoss(d); aimW(s.x, s.y); }, d);
      await T.wait(1300); await T.shot((63 + d * 5) + '_' + nm + '_appears', 'boss arrives');
      await T.wait(3200); await T.shot((64 + d * 5) + '_' + nm + '_attack', 'mid-fight');
      await T.wait(2600); await T.shot((65 + d * 5) + '_' + nm + '_attack2', 'a few seconds on');
      await T.run(() => { const b = G.boss; b.hp = b.maxhp * .45; }); await T.wait(1600); await T.run(() => { G.boss.stagger = 2.2; }); await T.wait(500); await T.shot((66 + d * 5) + '_' + nm + '_enraged_staggered', 'second phase, staggered');
      if (d === 1) await T.run(() => KC.setKarma(-60));   // dominate the Slums to see that look
      await T.run(() => { KC.hurt(G.boss, 99999, { by: 'player' }); }); await T.wait(700); await T.shot((67 + d * 5) + '_' + nm + '_down', 'boss going down');
      await T.until(dd => DS[dd].bossDone, 9000, d); await T.wait(2500); await T.shot((67 + d * 5) + 'b_' + nm + '_district_won', 'district changes hands');
      if (d === 1) await T.run(() => KC.setKarma(30));
    }
    await T.shot('78_all_cleared', 'all three districts done');
  },
  /* ---------- places ---------- */
  async city(T) {
    await T.run(() => { KC.start(); KC.skip(); G.seen = new Proxy({}, { get: () => 1, set: () => true }); P.invT = 1e9; }); await T.wait(400);
    const go = async (x, y, name, note, ms = 2200) => { await T.run(([x, y]) => { KC.tp(x, y); P.vx = P.vy = 0; G.heat = 0; }, [x, y]); await T.wait(ms); await T.shot(name, note); };
    await go(1392, 420, '80_parking_lot', 'parking lot');
    await go(624, 1560, '81_basketball_court', 'basketball court');
    await go(1008, 1950, '82_construction_yard', 'construction yard');
    await go(1008, 420, '83_park', 'park');
    await T.run(() => { const s = spots.shards[3]; KC.tp(s.x - 60, s.y + 30); }); await T.wait(1500); await T.shot('84_shard', 'a kinetic shard'); await T.run(() => { const s = spots.shards[3]; moveW(s.x - P.x, s.y - P.y); }); await T.until(() => G.shards > 0, 4000); await T.run(() => stopMove()); await T.wait(500); await T.shot('85_shard_taken', 'shard collected');
    await go(1540, 816, '86_barricade', 'the barricade into the Slums');
    await T.run(() => { moveW(1, 0); }); await T.wait(1500); await T.run(() => stopMove()); await T.shot('87_barricade_blocked', 'walking into the barricade');
    await T.run(() => KC.skipTo(1)); await T.wait(2500); await T.shot('88_slums_arrival', 'the Slums');
    await go(1968, 816, '89_slums_street', 'a Slums street');
    await T.run(() => { const h = ents.find(e => e.kind === 'hideout' && e.did === 1 && !e.cleared); KC.tp(h.x + 150, h.rect.y + h.rect.h + 150); }); await T.wait(2500); await T.shot('90_breakers_hideout', 'a Breakers hideout');
    await T.run(() => KC.skipTo(2)); await T.wait(2500); await T.shot('91_tower_arrival', 'the Tower district');
    await go(3504, 816, '92_tower_street', 'a Tower street');
    await T.run(() => { const h = ents.find(e => e.kind === 'hideout' && e.did === 2 && !e.cleared); KC.tp(h.x + 150, h.rect.y + h.rect.h + 150); }); await T.wait(2500); await T.shot('93_architects_hideout', 'an Architects hideout');
    await go(432, 816, '94_liberated_ground_zero', 'Ground Zero after it is freed', 3500);
  },
  /* ---------- menus ---------- */
  async menus(T) {
    await T.run(() => { KC.start(); KC.skip(); }); await T.wait(600);
    await T.run(() => { KC.giveXP(260); }); await T.wait(900); await T.shot('95_level_up', 'levelling up');
    await T.run(() => tap(9)); await T.wait(500); await T.shot('96_pause_skills', 'pause: skills');
    await T.run(() => tap(0)); await T.wait(400); await T.shot('97_skill_bought', 'a skill bought');
    await T.run(() => tap(5)); await T.wait(400); await T.shot('98_costumes', 'costumes');
    await T.run(() => tap(5)); await T.wait(400); await T.shot('99_controls', 'controls');
    await T.run(() => tap(5)); await T.wait(400); await T.shot('99b_settings', 'settings');
    await T.run(() => tap(9)); await T.wait(400);
    await T.run(() => tap(8)); await T.wait(600); await T.shot('99c_city_map', 'city map'); await T.run(() => tap(8)); await T.wait(400);
    // keyboard and mouse prompts
    await T.p.mouse.move(900, 500); await T.p.keyboard.press('KeyD'); await T.wait(600); await T.shot('99d_keyboard_prompts', 'the same HUD with keyboard and mouse prompts');
    // back to the title with a save to continue
    await T.run(() => { saveGame(); }); await T.p.keyboard.press('Escape'); await T.wait(400); await T.run(() => document.getElementById('bQuit').click()); await T.wait(900); await T.shot('99e_title_continue', 'title with a saved game');
    await T.run(() => document.getElementById('bCont').click()); await T.wait(1200); await T.shot('99f_continued', 'continued game');
  }
};
(async () => {
  const names = Object.keys(parts).filter(n => !only || n === only);
  for (const n of names) { console.log('\n=== ' + n + ' ==='); const T = await open(); try { await parts[n](T); } catch (e) { console.log('TOUR SCRIPT ERROR in ' + n + ': ' + e.message.split('\n')[0]); } await T.done(); }
})();
