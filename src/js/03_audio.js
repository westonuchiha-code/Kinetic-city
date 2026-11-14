/* ============================== 03 AUDIO ============================== */
/* Synthesised everything: no audio files. sfx(name, x, y) pans/attenuates by distance to the camera.
   Music is a tiny step sequencer (D minor, 96 bpm) whose drum/bass layer follows combat intensity. */
const Audio2 = (() => {
  let ac = null, master, sfxBus, musBus, noiseBuf, started = false, intensity = 0, targetI = 0, hum = null;
  const last = {};
  function unlock() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; return; }
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ac.destination);
    master = ac.createGain(); master.gain.value = .9; master.connect(comp);
    sfxBus = ac.createGain(); sfxBus.connect(master);
    musBus = ac.createGain(); musBus.connect(master);
    applyVolumes();
    const n = ac.sampleRate * 2; noiseBuf = ac.createBuffer(1, n, ac.sampleRate); const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  function applyVolumes() { if (!ac) return; sfxBus.gain.value = SETTINGS.sfx; musBus.gain.value = SETTINGS.music * .7; }
  function out(pan) {
    if (!pan) return sfxBus;
    const p = ac.createStereoPanner(); p.pan.value = clamp(pan, -.85, .85); p.connect(sfxBus); return p;
  }
  function tone(f, dur, o = {}) {
    if (!ac) return; const t = ac.currentTime + (o.delay || 0), osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.type || 'square'; osc.frequency.setValueAtTime(f, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f + o.slide), t + dur);
    if (o.detune) osc.detune.value = o.detune;
    const v = (o.vol || .05) * (o.k || 1), a = o.attack || .004;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    let node = osc;
    if (o.lp) { const f2 = ac.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = o.lp; osc.connect(f2); node = f2; }
    node.connect(g); g.connect(o.bus || out(o.pan)); osc.start(t); osc.stop(t + dur + .05);
  }
  function noise(dur, o = {}) {
    if (!ac) return; const t = ac.currentTime + (o.delay || 0), s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    s.buffer = noiseBuf; f.type = o.ft || 'lowpass'; f.frequency.setValueAtTime(o.f || 2000, t); if (o.q) f.Q.value = o.q;
    if (o.fTo) f.frequency.exponentialRampToValueAtTime(o.fTo, t + dur);
    const v = (o.vol || .1) * (o.k || 1);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + (o.attack || .003)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(o.bus || out(o.pan)); s.start(t, Math.random() * 1.5); s.stop(t + dur + .05);
  }
  const S = {
    grab: o => { tone(180, .18, { type: 'sawtooth', vol: .05, slide: 260, lp: 1400, ...o }); noise(.15, { f: 3000, fTo: 600, vol: .04, ...o }); },
    throw: o => { noise(.22, { ft: 'bandpass', f: 600, fTo: 2400, q: 1.2, vol: .14, ...o }); tone(260, .16, { type: 'triangle', vol: .05, slide: -160, ...o }); },
    hit: o => { noise(.14, { f: 1400, fTo: 200, vol: .22, ...o }); tone(110, .12, { type: 'square', vol: .07, slide: -60, lp: 700, ...o }); },
    heavy: o => { noise(.3, { f: 900, fTo: 80, vol: .32, ...o }); tone(70, .3, { type: 'sine', vol: .25, slide: -35, ...o }); },
    boom: o => { noise(.9, { f: 1600, fTo: 60, vol: .45, attack: .01, ...o }); tone(60, .7, { type: 'sine', vol: .35, slide: -30, ...o }); tone(120, .25, { type: 'sawtooth', vol: .06, slide: -80, lp: 500, ...o }); },
    shot: o => { noise(.07, { ft: 'highpass', f: 1800, vol: .09, ...o }); tone(900, .05, { type: 'square', vol: .025, slide: -500, ...o }); },
    zap: o => { tone(1200, .12, { type: 'sawtooth', vol: .03, slide: -900, lp: 3000, ...o }); },
    rep: o => { noise(.35, { ft: 'bandpass', f: 300, fTo: 3000, q: .8, vol: .25, ...o }); tone(90, .3, { type: 'sine', vol: .2, slide: 140, ...o }); },
    well: o => { tone(55, 1.2, { type: 'sawtooth', vol: .07, slide: 40, lp: 300, attack: .1, ...o }); tone(330, .8, { type: 'sine', vol: .04, slide: -250, ...o }); },
    collapse: o => { noise(.4, { f: 400, fTo: 3000, vol: .18, ...o }); },
    dash: o => { noise(.18, { ft: 'bandpass', f: 1200, fTo: 4000, q: 1.5, vol: .1, ...o }); },
    absorb: o => { tone(880, .06, { type: 'sine', vol: .04, slide: 400, ...o }); },
    release: o => { noise(.5, { f: 4000, fTo: 120, vol: .35, ...o }); tone(160, .45, { type: 'sawtooth', vol: .09, slide: 300, lp: 1500, ...o }); },
    pickup: o => { tone(880, .07, { vol: .035, ...o }); tone(1320, .09, { vol: .035, delay: .06, ...o }); },
    shard: o => { [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, .25, { type: 'triangle', vol: .04, delay: i * .07, ...o })); },
    level: o => { [523, 659, 784, 1046].forEach((f, i) => tone(f, .2, { type: 'square', vol: .045, delay: i * .09, lp: 3000, ...o })); },
    hurt: o => { tone(140, .18, { type: 'sawtooth', vol: .09, slide: -70, lp: 900, ...o }); noise(.1, { f: 800, vol: .08, ...o }); },
    heal: o => { tone(523, .25, { type: 'sine', vol: .06, ...o }); tone(784, .35, { type: 'sine', vol: .05, delay: .1, ...o }); },
    drain: o => { tone(330, .5, { type: 'sawtooth', vol: .05, slide: -240, lp: 900, ...o }); noise(.4, { ft: 'bandpass', f: 500, q: 3, vol: .06, ...o }); },
    bad: o => { tone(98, .5, { type: 'square', vol: .06, slide: -20, lp: 600, ...o }); tone(92, .5, { type: 'square', vol: .05, lp: 600, ...o }); },
    good: o => { tone(659, .2, { type: 'triangle', vol: .05, ...o }); tone(988, .3, { type: 'triangle', vol: .04, delay: .08, ...o }); },
    ui: o => { tone(660, .04, { type: 'square', vol: .02, lp: 2500, ...o }); },
    select: o => { tone(520, .06, { type: 'square', vol: .03, ...o }); tone(780, .08, { type: 'square', vol: .03, delay: .05, ...o }); },
    deny: o => { tone(180, .12, { type: 'square', vol: .04, lp: 800, ...o }); },
    charge: o => { tone(110, .6, { type: 'sawtooth', vol: .06, slide: 300, lp: 900, ...o }); },
    siren: o => { tone(700, .35, { type: 'triangle', vol: .02, slide: 300, ...o }); tone(1000, .35, { type: 'triangle', vol: .02, slide: -300, delay: .35, ...o }); }
  };
  function sfx(name, x, y, k = 1) {
    if (!ac || !S[name]) return;
    const now = performance.now(); if (last[name] && now - last[name] < 45) return; last[name] = now;
    let pan = 0, vol = k;
    if (x !== undefined && typeof cam !== 'undefined') {
      const dx = x - (cam.x + cam.w / 2), dy = y - (cam.y + cam.h / 2), d = Math.hypot(dx, dy);
      vol *= clamp(1.15 - d / 900, .12, 1); pan = dx / 700;
      if (vol < .13) return;
    }
    try { S[name]({ k: vol, pan }); } catch (e) { }
  }

  /* ---- rain + music ---- */
  const BPM = 96, SPB = 60 / BPM / 4;
  const PROG = [[62, 65, 69, 38], [58, 62, 65, 34], [55, 58, 62, 31], [57, 61, 64, 33]];
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  let nextT = 0, step = 0;
  function startAmbience() {
    if (!ac || started) return; started = true;
    const rain = ac.createBufferSource(); rain.buffer = noiseBuf; rain.loop = true;
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
    const g = ac.createGain(); g.gain.value = .045; rain.connect(hp); hp.connect(lp); lp.connect(g); g.connect(sfxBus); rain.start();
    const rum = ac.createBufferSource(); rum.buffer = noiseBuf; rum.loop = true; rum.playbackRate.value = .5;
    const lp2 = ac.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 160;
    const g2 = ac.createGain(); g2.gain.value = .05; rum.connect(lp2); lp2.connect(g2); g2.connect(sfxBus); rum.start();
    nextT = ac.currentTime + .1;
    setInterval(schedule, 30);
  }
  function schedule() {
    if (!ac || ac.state !== 'running') return;
    intensity = lerp(intensity, targetI, .04);
    while (nextT < ac.currentTime + .15) { playStep(step, nextT); nextT += SPB; step = (step + 1) % 64; }
  }
  function mnote(f, t, dur, type, vol, lpf, detune = 0) {
    const o = ac.createOscillator(), g = ac.createGain(), fl = ac.createBiquadFilter();
    o.type = type; o.frequency.value = f; o.detune.value = detune; fl.type = 'lowpass'; fl.frequency.value = lpf;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(.4, dur * .25)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(fl); fl.connect(g); g.connect(musBus); o.start(t); o.stop(t + dur + .05);
  }
  function mnoise(t, dur, ft, f, vol) {
    const s = ac.createBufferSource(), g = ac.createGain(), fl = ac.createBiquadFilter();
    s.buffer = noiseBuf; fl.type = ft; fl.frequency.value = f;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(musBus); s.start(t, Math.random()); s.stop(t + dur + .02);
  }
  function playStep(st, t) {
    const bar = (st / 16) | 0, s = st % 16, ch = PROG[bar], I = intensity;
    if (s === 0) for (let i = 0; i < 3; i++) { mnote(mtof(ch[i]), t, SPB * 16, 'sawtooth', .018, 700 + I * 600, (i - 1) * 7); mnote(mtof(ch[i] - 12), t, SPB * 16, 'triangle', .03, 900); }
    if ([0, 6, 8, 14].includes(s) || (I > .4 && s % 2 === 0)) mnote(mtof(ch[3] + (s === 14 ? 12 : 0)), t, SPB * 1.8, 'sawtooth', .08 + .03 * I, 260 + 900 * I);
    if (s % 2 === 0) { const n = ch[(s / 2) % 3] + 12 + (s >= 8 ? 12 : 0); mnote(mtof(n), t, SPB * 1.2, 'square', .012 * (1 - I * .5), 2200); }
    if (I > .08) {
      if (s % 4 === 0) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + .12); g.gain.setValueAtTime(.32 * I, t); g.gain.exponentialRampToValueAtTime(.0001, t + .2); o.connect(g); g.connect(musBus); o.start(t); o.stop(t + .25); }
      if (s === 4 || s === 12) mnoise(t, .16, 'bandpass', 1800, .14 * I);
      if (s % 2 === 1) mnoise(t, .04, 'highpass', 7000, .05 * I);
    }
  }

  /* ---- telekinesis hum (continuous while holding) ---- */
  function humStart() {
    if (!ac || hum) return;
    const o = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; o.frequency.value = 55; o2.type = 'sine'; o2.frequency.value = 110.7; f.type = 'lowpass'; f.frequency.value = 300; f.Q.value = 6;
    g.gain.value = .0001; g.gain.exponentialRampToValueAtTime(.06, ac.currentTime + .15);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(sfxBus); o.start(); o2.start(); hum = { o, o2, f, g };
  }
  function humSet(speed, mass) {
    if (!hum) return; const t = ac.currentTime;
    hum.f.frequency.setTargetAtTime(220 + Math.min(1800, speed * 2.2), t, .05);
    hum.o.frequency.setTargetAtTime(40 + 30 / Math.sqrt(mass), t, .1);
  }
  function humStop() {
    if (!hum) return; const h = hum; hum = null; const t = ac.currentTime;
    h.g.gain.cancelScheduledValues(t); h.g.gain.setValueAtTime(h.g.gain.value, t); h.g.gain.exponentialRampToValueAtTime(.0001, t + .12);
    h.o.stop(t + .15); h.o2.stop(t + .15);
  }
  return {
    unlock, sfx, startAmbience, applyVolumes, humStart, humSet, humStop,
    setIntensity(v) { targetI = clamp(v, 0, 1); },
    get ready() { return !!ac; }
  };
})();
const sfx = Audio2.sfx;
