/* ============================== 02 INPUT ============================== */
/* Everything gameplay reads goes through Input:
     Input.held(a)     action is down (keys, mouse, pad buttons, analog triggers with hysteresis)
     Input.pressed(a)  action went down since the last simulation tick (consumed by endTick)
     Input.ui(a)       same, but for menus: once per rendered frame, with stick/d-pad auto-repeat
     Input.move()      left stick / WASD vector, length <= 1
     Input.aimStick()  right stick vector (or null when centred)
   Controller layout (standard mapping):
     LS move  RS aim  RT telekinesis (hold grab, release throw)  LT absorb (hold, release = blast)
     RB repulse  LB gravity well  A dash  X heal (hold)  Y drain (hold)  B drop  Start pause  Back map */
const SETTINGS = { music: .6, sfx: .8, rumble: true, shake: true, deadzone: .18, assist: 1, hud: 1, see: 2, time: 'sunset', full: true, sv: 2, costume: 'raincoat', binds: { key: {}, pad: {} } };   // deadzone: left stick (right stick +.04); assist: aim-assist cone multiplier; hud: HUD scale; see: how the hero shows behind buildings; full: go fullscreen when a game starts
try { const s = JSON.parse(localStorage.getItem('kc_settings') || 'null'); if (s) { Object.assign(SETTINGS, s); if (s.sv !== 2) { SETTINGS.see = 2; SETTINGS.sv = 2; } } } catch (e) { }   // sv 2: the hero shows through a window in the wall by default (settings saved before that are moved over once)
function saveSettings() { try { localStorage.setItem('kc_settings', JSON.stringify(SETTINGS)); } catch (e) { } }

const Input = (() => {
  const KEYMAP = {
    up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
    tk: ['KeyJ'], abs: ['KeyQ'], rep: ['KeyR'], well: ['KeyE'], dash: ['Space', 'ShiftLeft', 'ShiftRight'],
    heal: ['KeyF'], drain: ['KeyV'], drop: ['KeyC'], menu: ['Escape', 'Tab', 'KeyP'], map: ['KeyM'],
    confirm: ['Enter', 'Space'], back: ['Escape', 'Backspace'],
    uup: ['ArrowUp', 'KeyW'], udown: ['ArrowDown', 'KeyS'], uleft: ['ArrowLeft', 'KeyA'], uright: ['ArrowRight', 'KeyD'],
    tabL: ['KeyQ'], tabR: ['KeyE']
  };
  const PADMAP = { dash: 0, drop: 1, heal: 2, drain: 3, well: 4, rep: 5, abs: 6, tk: 7, map: 8, menu: 9, confirm: 0, back: 1, tabL: 4, tabR: 5, uup: 12, udown: 13, uleft: 14, uright: 15 };
  /* Rebinding. Each of these actions has one changeable binding per device; mouse buttons are the key codes Mouse0-2.
     SETTINGS.binds holds only what the player changed. Movement, menu navigation and pause are fixed. */
  const REBIND = ['tk', 'drop', 'rep', 'well', 'abs', 'dash', 'heal', 'drain', 'map'];
  const DEF_KEY = { tk: 'Mouse0', abs: 'KeyQ', rep: 'Mouse2', well: 'KeyE', dash: 'Space', heal: 'KeyF', drain: 'KeyV', drop: 'KeyC', map: 'KeyM' };
  const DEF_PAD = { dash: 0, drop: 1, heal: 2, drain: 3, well: 4, rep: 5, abs: 6, tk: 7, map: 8 };
  const ALT_KEY = { tk: ['KeyJ'], rep: ['KeyR'], dash: ['ShiftLeft', 'ShiftRight'] };   // extra default keys, dropped when bound to something else
  const KEY_FIXED = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape', 'Tab', 'KeyP', 'Enter'];
  const PAD_OK = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11];
  const keyToActs = {};
  function applyBinds() {
    const b = SETTINGS.binds && typeof SETTINGS.binds === 'object' ? SETTINGS.binds : (SETTINGS.binds = {}); b.key = b.key || {}; b.pad = b.pad || {};
    const used = new Set(REBIND.map(a => b.key[a] || DEF_KEY[a]));
    for (const a of REBIND) { KEYMAP[a] = [b.key[a] || DEF_KEY[a]].concat((ALT_KEY[a] || []).filter(k => !used.has(k))); PADMAP[a] = b.pad[a] !== undefined ? b.pad[a] : DEF_PAD[a]; }
    for (const k in keyToActs) delete keyToActs[k];
    for (const a in KEYMAP) for (const k of KEYMAP[a]) (keyToActs[k] = keyToActs[k] || []).push(a);
  }
  applyBinds();
  const getBind = (dev, a) => dev === 'pad' ? PADMAP[a] : KEYMAP[a][0];
  function setBind(dev, a, code) {   // returns false if that key/button can't be used; a binding already in use swaps with this one
    if (!REBIND.includes(a) || (dev === 'pad' ? !PAD_OK.includes(code) : KEY_FIXED.includes(code))) return false;
    const map = dev === 'pad' ? SETTINGS.binds.pad : SETTINGS.binds.key, old = getBind(dev, a);
    for (const o of REBIND) if (o !== a && getBind(dev, o) === code) map[o] = old;
    map[a] = code; applyBinds(); saveSettings(); for (const f of st.listeners) f(); return true;
  }
  function resetBinds(dev) { SETTINGS.binds[dev === 'pad' ? 'pad' : 'key'] = {}; applyBinds(); saveSettings(); for (const f of st.listeners) f(); }
  let cap = null, swallowClick = 0;   // cap: waiting for the next key/button to bind
  function capture(dev, cb) { cap = { dev, cb }; }
  function capDone(code) { const c = cap; cap = null; c.cb(code); }
  addEventListener('click', e => { if (performance.now() < swallowClick) { e.stopPropagation(); e.preventDefault(); swallowClick = 0; } }, true);

  const keys = {};
  const mouse = { sx: 0, sy: 0, down: [false, false, false] };
  const pad = { idx: -1, id: '', style: 'xbox', btn: new Float32Array(18), on: new Uint8Array(18), axes: [0, 0, 0, 0], mapping: 'standard' };
  const tickEdges = new Set(), uiEdges = new Set(), uiPending = new Set();
  const st = { device: 'kbm', blocked: false, padSeen: false, listeners: [] };
  const navHold = { uup: 0, udown: 0, uleft: 0, uright: 0 };

  try { if (document.featurePolicy && document.featurePolicy.allowsFeature && !document.featurePolicy.allowsFeature('gamepad')) st.blocked = true; } catch (e) { }

  function setDevice(d) {
    if (st.device === d) return; st.device = d; for (const f of st.listeners) f();
  }
  function edge(a) { tickEdges.add(a); uiPending.add(a); }

  addEventListener('keydown', e => {
    if (cap) { e.preventDefault(); if (!e.repeat && cap.dev === 'kbm') capDone(e.code === 'Escape' ? null : e.code); else if (!e.repeat && e.code === 'Escape') capDone(null); return; }
    if (e.repeat) { if (keyToActs[e.code] && /^(Arrow|Tab|Space)/.test(e.code)) e.preventDefault(); return; }
    keys[e.code] = true; setDevice('kbm');
    for (const a of keyToActs[e.code] || []) edge(a);
    if (['Space', 'Enter', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape'].includes(e.code)) e.preventDefault();
    Audio2.unlock();
  });
  addEventListener('keyup', e => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down = [false, false, false]; });
  addEventListener('mousemove', e => {
    mouse.sx = e.clientX; mouse.sy = e.clientY;
    if (Math.abs(e.movementX) + Math.abs(e.movementY) > 3) setDevice('kbm');
  });
  addEventListener('mousedown', e => {
    if (cap) { if (cap.dev === 'kbm') { e.preventDefault(); swallowClick = performance.now() + 400; capDone('Mouse' + e.button); } return; }
    if (e.target && e.target.id !== 'game') return;
    mouse.sx = e.clientX; mouse.sy = e.clientY; mouse.down[e.button] = true; keys['Mouse' + e.button] = true; setDevice('kbm');
    for (const a of keyToActs['Mouse' + e.button] || []) edge(a);
    Audio2.unlock();
  });
  addEventListener('mouseup', e => { mouse.down[e.button] = false; keys['Mouse' + e.button] = false; });
  addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('gamepadconnected', e => { st.padSeen = true; for (const f of st.listeners) f(); });
  addEventListener('gamepaddisconnected', () => { pad.idx = -1; pad.btn.fill(0); pad.on.fill(0); pad.axes = [0, 0, 0, 0]; for (const f of st.listeners) f(); });

  function readPads() {
    let list;
    try { list = navigator.getGamepads ? navigator.getGamepads() : []; }
    catch (e) { st.blocked = true; return null; }
    // keep the current pad; if another pad has a button down while this one is idle (or gone), follow that one
    const down = gp => { for (const b of gp.buttons || []) if (b && (typeof b === 'object' ? b.pressed || b.value > .5 : b > .5)) return true; return false; };
    let first = null, cur = null, busy = null;
    for (const gp of list || []) {
      if (!gp || !gp.connected) continue;
      if (!first) first = gp;
      if (gp.index === pad.idx) cur = gp; else if (!busy && down(gp)) busy = gp;
    }
    if (cur && (!busy || down(cur))) return cur;
    return busy || cur || first;
  }
  function styleOf(id) {
    if (/xbox|xinput|045e/i.test(id)) return 'xbox';
    return /054c|playstation|dualsense|dualshock|wireless controller/i.test(id) ? 'ps' : 'xbox';
  }
  function deadzone(x, y, dz = .2) {
    const l = Math.hypot(x, y); if (l < dz) return [0, 0];
    const k = Math.min(1, (l - dz) / (1 - dz)) / l; return [x * k, y * k];
  }

  function poll(dt) {
    const gp = readPads();
    if (gp) {
      if (pad.idx !== gp.index || pad.id !== gp.id) { pad.idx = gp.index; pad.id = gp.id; pad.style = styleOf(gp.id); pad.mapping = gp.mapping; st.padSeen = true; for (const f of st.listeners) f(); }
      let active = false, capSkip = false;
      for (let i = 0; i < 18; i++) {
        const b = gp.buttons[i]; const v = b ? (typeof b === 'object' ? (b.value || (b.pressed ? 1 : 0)) : b) : 0;
        pad.btn[i] = v;
        const was = pad.on[i], isTrig = i === 6 || i === 7;
        const now = isTrig ? (was ? v > .18 : v > .38) : v > .5;
        pad.on[i] = now ? 1 : 0;
        if (now && !was) { active = true; if (cap) { if (cap.dev === 'pad') capDone(i === 9 ? null : i); else if (i === 1 || i === 9) capDone(null); capSkip = true; } else if (!capSkip) for (const a in PADMAP) if (PADMAP[a] === i) edge(a); }
      }
      const ax = gp.axes || [];
      const L = deadzone(ax[0] || 0, ax[1] || 0, SETTINGS.deadzone), R = deadzone(ax[2] || 0, ax[3] || 0, SETTINGS.deadzone + .04);
      pad.axes[0] = L[0]; pad.axes[1] = L[1]; pad.axes[2] = R[0]; pad.axes[3] = R[1];
      if (Math.hypot(L[0], L[1]) > .45 || Math.hypot(R[0], R[1]) > .45) active = true;
      if (active) { setDevice('pad'); Audio2.unlock(); }
    } else if (pad.idx !== -1) { pad.idx = -1; pad.btn.fill(0); pad.on.fill(0); pad.axes = [0, 0, 0, 0]; }

    // stick-as-dpad for menus with auto-repeat
    const sx = pad.axes[0], sy = pad.axes[1];
    const dirs = { uup: sy < -.55, udown: sy > .55, uleft: sx < -.55, uright: sx > .55 };
    for (const a in navHold) {
      const on = dirs[a] || (pad.idx >= 0 && pad.on[PADMAP[a]]) || KEYMAP[a].some(k => keys[k]);
      if (on) {
        if (navHold[a] === 0 && dirs[a] && !uiPending.has(a)) uiPending.add(a);
        navHold[a] += dt;
        if (navHold[a] > .38) { uiPending.add(a); navHold[a] -= .11; }
      } else navHold[a] = 0;
    }
    uiEdges.clear(); for (const a of uiPending) uiEdges.add(a); uiPending.clear();
  }

  function held(a) {
    if (KEYMAP[a] && KEYMAP[a].some(k => keys[k])) return true;
    if (pad.idx >= 0 && PADMAP[a] !== undefined && pad.on[PADMAP[a]]) return true;
    return false;
  }
  function move() {
    let x = (held('right') ? 1 : 0) - (held('left') ? 1 : 0), y = (held('down') ? 1 : 0) - (held('up') ? 1 : 0);
    x += pad.axes[0]; y += pad.axes[1];
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    return { x, y };
  }
  function aimStick() { const x = pad.axes[2], y = pad.axes[3]; return Math.hypot(x, y) > .05 ? { x, y, m: Math.min(1, Math.hypot(x, y)) } : null; }

  let rumbleUntil = 0, rumbleLevel = 0;
  function rumble(strong, weak, ms) {
    if (!SETTINGS.rumble || st.device !== 'pad' || pad.idx < 0) return;
    const now = performance.now();
    if (now < rumbleUntil && strong < rumbleLevel) return;
    rumbleUntil = now + ms; rumbleLevel = strong;
    try {
      const gp = (navigator.getGamepads() || [])[pad.idx]; const va = gp && gp.vibrationActuator;
      if (va && va.playEffect) va.playEffect(va.type || 'dual-rumble', { startDelay: 0, duration: ms, strongMagnitude: clamp(strong, 0, 1), weakMagnitude: clamp(weak, 0, 1) }).catch(() => { });
      else if (gp && gp.hapticActuators && gp.hapticActuators[0]) gp.hapticActuators[0].pulse(strong, ms);
    } catch (e) { }
  }

  /* glyph labels per action: [controller, keyboard/mouse] */
  const GL = {
    move: ['LS', 'WASD'], aim: ['RS', 'MOUSE'], tk: ['RT', 'LMB'], abs: ['LT', 'Q'], rep: ['RB', 'RMB'], well: ['LB', 'E'],
    dash: ['A', 'SPACE'], heal: ['X', 'F'], drain: ['Y', 'V'], drop: ['B', 'C'], menu: ['START', 'ESC'], map: ['BACK', 'M'],
    confirm: ['A', 'ENTER'], back: ['B', 'ESC'], tabL: ['LB', 'Q'], tabR: ['RB', 'E']
  };
  const PS = { A: 'cross', B: 'circle', X: 'square', Y: 'triangle', LB: 'L1', RB: 'R1', LT: 'L2', RT: 'R2', START: 'OPTIONS', BACK: 'SHARE', LS: 'L', RS: 'R' };
  const FACE_X = { A: '#5fd35f', B: '#ff5a4f', X: '#4f9dff', Y: '#ffcf3f' };
  const FACE_P = { cross: '#8fb4ff', circle: '#ff6b6b', square: '#ff8fd8', triangle: '#5fe0b0' };
  const PADNAME = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'BACK', 'START', 'L3', 'R3'];
  function keyName(c) {
    if (c === 'Mouse0') return 'LMB'; if (c === 'Mouse2') return 'RMB'; if (c === 'Mouse1') return 'MMB'; if (/^Mouse/.test(c)) return 'M' + (+c.slice(5) + 1);
    if (/^Key.$/.test(c)) return c[3]; if (/^Digit.$/.test(c)) return c[5]; if (/^Numpad/.test(c)) return 'NUM ' + c.slice(6).slice(0, 3).toUpperCase();
    const n = { Space: 'SPACE', ShiftLeft: 'SHIFT', ShiftRight: 'R SHIFT', ControlLeft: 'CTRL', ControlRight: 'R CTRL', AltLeft: 'ALT', AltRight: 'R ALT', Backspace: 'BKSP', CapsLock: 'CAPS', Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\' }[c];
    return n || c.toUpperCase().slice(0, 7);
  }
  function glyph(act, forceDevice) {
    const dev = forceDevice || st.device; let g = GL[act]; if (!g) return { kind: 'key', text: act };
    if (REBIND.includes(act)) g = [PADNAME[PADMAP[act]] || '?', keyName(KEYMAP[act][0])];
    if (dev === 'kbm') {
      const t = g[1];
      if (t === 'LMB' || t === 'RMB') return { kind: 'mouse', text: t[0] };
      return { kind: 'key', text: t };
    }
    const raw = g[0];
    if (pad.style === 'ps') {
      const p = PS[raw] || raw;
      if (FACE_P[p]) return { kind: 'face', shape: p, color: FACE_P[p], text: '' };
      if (raw === 'LT' || raw === 'RT') return { kind: 'trigger', text: p };
      if (raw === 'LB' || raw === 'RB') return { kind: 'shoulder', text: p };
      if (raw === 'LS' || raw === 'RS') return { kind: 'stick', text: p };
      return { kind: 'pill', text: p };
    }
    if (FACE_X[raw]) return { kind: 'face', text: raw, color: FACE_X[raw] };
    if (raw === 'LT' || raw === 'RT') return { kind: 'trigger', text: raw };
    if (raw === 'LB' || raw === 'RB') return { kind: 'shoulder', text: raw };
    if (raw === 'LS' || raw === 'RS') return { kind: 'stick', text: raw };
    return { kind: 'pill', text: raw === 'START' ? 'MENU' : raw === 'BACK' ? 'VIEW' : raw };
  }

  return {
    poll, held, move, aimStick, rumble, glyph, mouse, pad, st, REBIND, setBind, resetBinds, capture,
    get capturing() { return !!cap; }, cancelCapture() { if (cap) capDone(null); },
    pressed: a => tickEdges.has(a),
    ui: a => uiEdges.has(a),
    endTick() { tickEdges.clear(); },
    clearUI() { uiEdges.clear(); uiPending.clear(); tickEdges.clear(); },
    get device() { return st.device; },
    get padConnected() { return pad.idx >= 0; },
    get padStyle() { return pad.style; },
    get blocked() { return st.blocked; },
    onChange(f) { st.listeners.push(f); }
  };
})();
