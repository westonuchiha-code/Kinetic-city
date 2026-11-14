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
const SETTINGS = { music: .6, sfx: .8, rumble: true, shake: true };
try { const s = JSON.parse(localStorage.getItem('kc_settings') || 'null'); if (s) Object.assign(SETTINGS, s); } catch (e) { }
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
  const keyToActs = {};
  for (const a in KEYMAP) for (const k of KEYMAP[a]) (keyToActs[k] = keyToActs[k] || []).push(a);

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
    if (e.target && e.target.id !== 'game') return;
    mouse.sx = e.clientX; mouse.sy = e.clientY; mouse.down[e.button] = true; setDevice('kbm');
    if (e.button === 0) edge('tk'); if (e.button === 2) edge('rep');
    Audio2.unlock();
  });
  addEventListener('mouseup', e => { mouse.down[e.button] = false; });
  addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('gamepadconnected', e => { st.padSeen = true; for (const f of st.listeners) f(); });
  addEventListener('gamepaddisconnected', () => { pad.idx = -1; for (const f of st.listeners) f(); });

  function readPads() {
    let list;
    try { list = navigator.getGamepads ? navigator.getGamepads() : []; }
    catch (e) { st.blocked = true; return null; }
    let best = null;
    for (const gp of list || []) {
      if (!gp || !gp.connected) continue;
      if (!best || gp.index === pad.idx) best = gp;
      if (gp.index === pad.idx) break;
    }
    return best;
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
      let active = false;
      for (let i = 0; i < 18; i++) {
        const b = gp.buttons[i]; const v = b ? (typeof b === 'object' ? (b.value || (b.pressed ? 1 : 0)) : b) : 0;
        pad.btn[i] = v;
        const was = pad.on[i], isTrig = i === 6 || i === 7;
        const now = isTrig ? (was ? v > .18 : v > .38) : v > .5;
        pad.on[i] = now ? 1 : 0;
        if (now && !was) { active = true; for (const a in PADMAP) if (PADMAP[a] === i) edge(a); }
      }
      const ax = gp.axes || [];
      const L = deadzone(ax[0] || 0, ax[1] || 0, .18), R = deadzone(ax[2] || 0, ax[3] || 0, .22);
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
    if (a === 'tk' && mouse.down[0]) return true;
    if (a === 'rep' && mouse.down[2]) return true;
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
  function glyph(act, forceDevice) {
    const dev = forceDevice || st.device, g = GL[act]; if (!g) return { kind: 'key', text: act };
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
    poll, held, move, aimStick, rumble, glyph, mouse, pad, st,
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
