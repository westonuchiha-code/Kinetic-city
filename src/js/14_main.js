/* ============================== 14 MAIN LOOP & DEBUG HOOKS ============================== */
function updateFX(dt) {
  for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; const f = p.k === 'm' ? .97 : p.k === 's' ? .9 : .94; p.vx *= f; p.vy *= f; if (p.k === 'r') p.a += p.va * dt; else if (p.k === 'f') { p.z += p.vz * dt; p.vz *= .95; } p.life -= dt; }
  for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
  if (parts.length > 900) parts.splice(0, parts.length - 900);
  for (const t of texts) t.life -= dt; for (let i = texts.length - 1; i >= 0; i--) if (texts[i].life <= 0) texts.splice(i, 1);
  for (const r of rings) { r.life -= dt; r.r += (r.max - r.r) * Math.min(1, dt * 12); } for (let i = rings.length - 1; i >= 0; i--) if (rings[i].life <= 0) rings.splice(i, 1);
  for (const l of dlights) l.life -= dt; for (let i = dlights.length - 1; i >= 0; i--) if (dlights[i].life <= 0) dlights.splice(i, 1);
  for (const d of decals) d.life -= dt; for (let i = decals.length - 1; i >= 0; i--) if (decals[i].life <= 0) decals.splice(i, 1);
  for (const t of G.toasts) t.life -= dt; G.toasts = G.toasts.filter(t => t.life > 0);
}
function runTimers(dt) {
  for (const t of timers) t.t -= dt;
  for (let i = timers.length - 1; i >= 0; i--) if (timers[i].t <= 0) { const f = timers[i].fn; timers.splice(i, 1); try { f(); } catch (e) { console.error(e); } }
}
function tick(dt) { update(dt); runTimers(dt); updateFX(dt); }

/* attract mode behind the title screen: slow drift over Ground Zero with live traffic */
function titleTick(dt) {
  G.time += dt;
  cam.viewH = VIEW_H * 1.15;
  cam.cx = 980 + Math.sin(G.time * .045) * 620; cam.cy = 760 + Math.sin(G.time * .033) * 420; placeCam(); cam.sx = cam.sy = 0;
  act.length = 0; for (const e of ents) if (!e.dead && e !== P && inView(e.x, e.y, 260) && (e.kind === 'car' || e.kind === 'civ' || e.prop)) act.push(e);
  for (const e of act) { if (e.kind === 'car') aiCar(e, dt); else if (e.kind === 'civ') wander(e, dt, e.speed, civWalk), e.walk += dt * Math.hypot(e.vx, e.vy) * .07; }
  physics(dt); updateFX(dt);
}

let last = performance.now(), acc = 0;
function frame(now) {
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  try {
    Input.poll(dt);
    const wasLive = G.mode === 'play' || G.mode === 'dead';
    UI.update(dt);
    if (!wasLive || !(G.mode === 'play' || G.mode === 'dead')) Input.endTick();
    if (G.mode === 'title') titleTick(dt);
    else if (G.mode === 'play' || G.mode === 'dead') {
      if (G.hitstop > 0) G.hitstop -= dt;
      else {
        const k = G.slowT > 0 ? .3 : 1; if (G.slowT > 0) G.slowT -= dt;
        acc += dt * k; let n = 0;
        while (acc >= STEP && n < 5) { tick(STEP); Input.endTick(); acc -= STEP; n++; }
        if (n === 5) acc = 0;
      }
      updateCamera(dt);
    }
    G.flash = Math.max(0, G.flash - dt * 1.4);
    render(dt);
    if (G.mode !== 'title') drawHUD(dt);
  } catch (e) { console.error(e); }
  requestAnimationFrame(frame);
}

resize();
newGame(null);                       // builds the city for the title backdrop
G.mode = 'title';
if (document.fonts && document.fonts.load) document.fonts.load('600 16px "Chakra Petch"').catch(() => { });
requestAnimationFrame(frame);

/* Debug / test hooks: KC.step(n) runs n fixed ticks synchronously; KC.skipTo(d) jumps to district d. */
window.KC = {
  G, DS, ents, bullets, ups, S, cam, aim, wells, parts, pickups, Input, UI,
  get P() { return P; }, get tkTarget() { return tkTarget; }, get traj() { return traj; },
  step(n = 1) { for (let i = 0; i < n; i++) { tick(STEP); Input.endTick(); } },
  start() { document.getElementById('bNew').click(); },
  skip() { let g = 0; while (G.mode === 'dialog' && g++ < 50) { const l = UI.dialogLine; if (!l) break; if (l.choices) { UI.finishTyping(); return l.choices; } UI.finishTyping(); UI.nextLine(); } return null; },
  tp(x, y) { P.x = x; P.y = y; snapCamera(); }, giveXP(n) { addXP(n); }, setKarma(k) { G.karma = clamp(k, -100, 100); },
  skipTo(d) {
    for (let i = 0; i < d; i++) { gatesOpen[i] = true; openGate(i); DS[i].bossDone = true; DS[i].hideoutsLeft = 0; DS[i].status = 'liberated'; for (const e of ents) if (e.kind === 'hideout' && e.did === i) { e.cleared = true; e.gateOpen = true; e.gateT = 1; } else if (e.guardOf !== undefined && e.did === i) e.dead = true; }
    drawMinimapBase(); const c = checkpointFor(d); P.x = c.x; P.y = c.y; DS[d].intro = true; snapCamera();
  },
  costume(n) { if (HERO_COSTUMES[n]) heroCostume = n; return heroCostume; },
  weather(m) { if (m !== undefined) setWeather(m); return { rain: WEATHER.rain, wet: WEATHER.wet, hold: WEATHER.hold }; },   // 'rain' | 'dry' | 'auto'
  time(n) { if (n !== undefined) { SETTINGS.time = n; applyTime(n); } return LIGHT.name; },
  scene(o) { if (o === null) clearScene(); else if (o) setScene(o); return { ...SCENE, now: LIGHT.name }; },   // story switches: { time, weather, at }   // 'sunset' | 'night' | 'day'
  see(n) { if (n !== undefined) SETTINGS.see = n; return SETTINGS.see; },   // how the hero shows behind buildings: 0 hidden, 1 silhouette, 2 window, 3 see-through wall
  spawn: mk, spawnGang, spawnBoss, render, drawHUD, snapCamera, hurt, kill, explosion
};
