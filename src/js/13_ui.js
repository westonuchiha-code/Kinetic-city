/* ============================== 13 UI (DOM overlays) ============================== */
/* Title, dialogue and pause menus are DOM. Everything is reachable with a controller: d-pad / left stick
   moves focus spatially between .nav elements, A selects, B backs out, LB/RB switch pause tabs. */
const UI = (() => {
  const $ = id => document.getElementById(id);
  let layer = 'title', focus = null, tab = 'skills', fromTitle = false;

  /* ---------- glyph SVGs (DOM twins of the canvas glyphs) ---------- */
  function glyphSVG(act, dev) {
    const g = Input.glyph(act, dev), F = 'font-family="Chakra Petch,system-ui,sans-serif" font-weight="700"';
    if (g.kind === 'face') {
      let inner;
      if (g.shape === 'cross') inner = `<path d="M8 8L16 16M16 8L8 16" stroke="${g.color}" stroke-width="2.2" stroke-linecap="round"/>`;
      else if (g.shape === 'circle') inner = `<circle cx="12" cy="12" r="5" fill="none" stroke="${g.color}" stroke-width="2.2"/>`;
      else if (g.shape === 'square') inner = `<rect x="7.5" y="7.5" width="9" height="9" fill="none" stroke="${g.color}" stroke-width="2.2"/>`;
      else if (g.shape === 'triangle') inner = `<path d="M12 6.5L17.5 16H6.5Z" fill="none" stroke="${g.color}" stroke-width="2.2" stroke-linejoin="round"/>`;
      else inner = `<text x="12" y="16.3" text-anchor="middle" font-size="12.5" ${F} fill="${g.color}">${g.text}</text>`;
      return `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="#0d0f16" stroke="${g.color}" stroke-width="1.8"/>${inner}</svg>`;
    }
    if (g.kind === 'stick') return `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="#0d0f16" stroke="#9aa4c0" stroke-width="1.6"/><circle cx="12" cy="12" r="6.5" fill="none" stroke="#9aa4c0" stroke-width="1.2"/><text x="12" y="15.3" text-anchor="middle" font-size="8" ${F} fill="#e8ecf7">${g.text}</text></svg>`;
    if (g.kind === 'mouse') { const L = g.text === 'L'; return `<svg viewBox="0 0 18 24"><rect x="2" y="1.5" width="14" height="21" rx="7" fill="#1a1e2a" stroke="#7a84a0" stroke-width="1.4"/><path d="${L ? 'M9 3V11H3.5V9A5.5 5.5 0 0 1 9 3Z' : 'M9 3V11H14.5V9A5.5 5.5 0 0 0 9 3Z'}" fill="#3ce0ff"/></svg>`; }
    const w = Math.max(24, g.text.length * (g.text.length > 3 ? 6.4 : 7.6) + 12), h = g.kind === 'shoulder' ? 17 : g.kind === 'pill' ? 16 : 21, y = (24 - h) / 2;
    const shape = g.kind === 'trigger' ? `<path d="M1.5 ${y + h}V${y + 6}Q1.5 ${y} ${w * .4} ${y}H${w * .6}Q${w - 1.5} ${y} ${w - 1.5} ${y + 6}V${y + h}Z" fill="#0d0f16" stroke="#9aa4c0" stroke-width="1.4"/>`
      : `<rect x="1" y="${y}" width="${w - 2}" height="${h}" rx="${g.kind === 'pill' ? h / 2 : g.kind === 'key' ? 4 : 6}" fill="${g.kind === 'key' ? '#1a1e2a' : '#0d0f16'}" stroke="${g.kind === 'key' ? '#5a6278' : '#9aa4c0'}" stroke-width="1.4"/>`;
    return `<svg viewBox="0 0 ${w} 24" style="height:1.5em">${shape}<text x="${w / 2}" y="16" text-anchor="middle" font-size="${g.text.length > 3 ? 8.5 : 10}" ${F} fill="#e8ecf7">${g.text}</text></svg>`;
  }
  function refreshGlyphs() { document.querySelectorAll('.g[data-act]').forEach(el => { el.innerHTML = glyphSVG(el.dataset.act, el.dataset.dev); }); updatePadStatus(); }
  Input.onChange(() => { refreshGlyphs(); if (layer === 'pause' && tab === 'controls') renderTab(); });

  function updatePadStatus() {
    const box = $('padstat'), t = $('padtxt'); if (!box) return;
    box.classList.remove('ok', 'warn');
    if (Input.blocked) { box.classList.add('warn'); t.textContent = 'This frame blocks controller access. Open the game in its own browser tab to use a controller, or play with keyboard and mouse.'; }
    else if (Input.padConnected) { box.classList.add('ok'); t.textContent = 'Controller connected · ' + (Input.padStyle === 'ps' ? 'PlayStation' : 'Xbox') + ' layout. Use the left stick or d-pad and ' + (Input.padStyle === 'ps' ? '✕' : 'A') + ' to choose.'; }
    else if (matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches) t.textContent = 'Kinetic City is played with a controller. Pair a Bluetooth controller with this device, then press any button on it.';
    else t.textContent = 'No controller detected yet. Press any button on a connected controller, or play with keyboard and mouse.';
  }

  /* ---------- layers & focus ---------- */
  function show(id) { for (const l of ['title', 'dlg', 'pause']) $(l).classList.toggle('on', l === id); layer = id; setFocus(null); }
  function hide(id) { $(id).classList.remove('on'); if (layer === id) { layer = null; setFocus(null); } }
  function focusables() { if (!layer) return []; return [...$(layer).querySelectorAll('.nav')].filter(el => !el.disabled && el.offsetParent !== null); }
  function setFocus(el) {
    if (focus) focus.classList.remove('focus'); focus = el;
    if (el) { el.classList.add('focus'); try { el.focus({ preventScroll: true }); } catch (e) { } el.scrollIntoView({ block: 'nearest' }); }
  }
  function moveFocus(dx, dy) {
    const list = focusables(); if (!list.length) return;
    if (!focus || !list.includes(focus)) { setFocus(list[0]); return; }
    const r = focus.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let best = null, bs = Infinity;
    for (const el of list) {
      if (el === focus) continue;
      const q = el.getBoundingClientRect(), qx = q.left + q.width / 2, qy = q.top + q.height / 2, ox = qx - cx, oy = qy - cy;
      const along = ox * dx + oy * dy; if (along <= 4) continue;
      const across = Math.abs(ox * dy - oy * dx), s = along + across * 2.2;
      if (s < bs) { bs = s; best = el; }
    }
    if (best) { setFocus(best); sfx('ui'); }
  }
  document.addEventListener('mouseover', e => { const el = e.target.closest && e.target.closest('.nav'); if (el && layer && $(layer).contains(el) && el !== focus) setFocus(el); });

  /* ---------- dialogue ---------- */
  let dq = [], dcb = null, cur = null, typed = 0, choiceLock = 0;
  const WHO_COL = { 'DR. VALE': '#6fe0a0', NARRATOR: '#8790aa', 'MR. CINDER': '#ff8a2a', KRAG: '#ff4a3a', 'THE ARCHITECT': '#b06bff' };
  function say(lines, cb) { dq = lines.slice(); dcb = cb || null; G.mode = 'dialog'; show('dlg'); nextLine(); }
  function nextLine() {
    const l = dq.shift();
    if (!l) { hide('dlg'); cur = null; if (G.mode === 'dialog') G.mode = P && P.hp <= 0 ? 'dead' : 'play'; const cb = dcb; dcb = null; if (cb) cb(); return; }
    cur = l; typed = 0;
    const who = $('dwho'); who.textContent = l.who || '';
    who.style.color = l.who === 'YOU' ? karmaColor() : /^EPILOGUE|THE END/.test(l.who || '') ? '#ffc24a' : WHO_COL[l.who] || '#e8ecf7';
    $('dbox').style.borderLeftColor = who.style.color;
    $('dtext').textContent = ''; $('dchoices').innerHTML = ''; $('dhint').style.visibility = 'hidden';
  }
  function finishTyping() {
    typed = cur.text.length; $('dtext').textContent = cur.text;
    if (cur.choices) {
      const box = $('dchoices'); box.innerHTML = '';
      cur.choices.forEach(c => {
        const b = document.createElement('button'); b.className = 'choice nav ' + (c.good ? 'good' : 'evil');
        b.innerHTML = `<span>${c.label}</span><small>${c.note}</small>`;
        b.onclick = ev => { ev.stopPropagation(); if (cur !== null && cur.choices && choiceLock <= 0) { const more = c.fn(); sfx('select'); if (more) dq.unshift(...more); nextLine(); } };
        box.appendChild(b);
      });
      setFocus(box.querySelector('.nav')); choiceLock = .5;   // a short beat so mashing A through dialogue can't pick a karma choice
    } else $('dhint').style.visibility = 'visible';
  }
  function advance() {
    if (!cur) return;
    if (typed < cur.text.length) { finishTyping(); return; }
    if (!cur.choices) { sfx('ui'); nextLine(); }
  }
  $('dlg').addEventListener('click', e => { if (!e.target.closest('.choice')) advance(); });

  /* ---------- pause ---------- */
  function openPause(asControls) {
    fromTitle = !!asControls; G.prevMode = G.mode; if (!fromTitle) G.mode = 'pause';
    tab = fromTitle ? 'controls' : 'skills';
    $('ptitle').textContent = fromTitle ? 'Controls' : 'Paused';
    $('tabs').style.display = fromTitle ? 'none' : 'flex';
    $('bQuit').style.display = fromTitle ? 'none' : '';
    $('bResume').textContent = fromTitle ? 'Back' : 'Resume';
    show('pause'); renderTab(); sfx('ui'); Audio2.humStop();
  }
  function closePause() {
    hide('pause'); sfx('ui');
    if (fromTitle) { show('title'); setFocus($('bCtl')); return; }
    G.mode = G.prevMode === 'dead' ? 'dead' : 'play';
    if (P && P.holding) Audio2.humStart();
  }
  function switchTab(d) { const order = ['skills', 'controls', 'settings']; tab = order[(order.indexOf(tab) + d + 3) % 3]; renderTab(); sfx('ui'); }
  function renderTab(keepId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('sel', t.dataset.tab === tab));
    const body = $('pbody');
    if (tab === 'skills') {
      let h = `<div class="stats"><span>Level <b>${G.level}</b></span><span>Skill points <b style="color:var(--gold)">${G.points}</b></span><span>Karma <b style="color:${karmaColor()}">${Math.round(G.karma * 10)} · ${karmaTier()}</b></span><span>Shards <b>${G.shards}/12</b></span></div><div class="cols" style="margin-top:14px">`;
      for (const [br, title, req] of [['core', 'Core powers', 'Always available'], ['good', 'Hero path', 'Unlocks at Good rank (karma 200+)'], ['evil', 'Villain path', 'Unlocks at Bad rank (karma −200 or lower)']]) {
        h += `<div class="col ${br}"><h3>${title}</h3><p class="req">${req}</p>`;
        for (const u of UPS.filter(x => x.br === br)) {
          const r = rk(u.id), lock = lockedReason(u), maxed = r >= u.max, can = !lock && !maxed && G.points >= u.cost;
          let pips = ''; for (let i = 0; i < u.max; i++) pips += `<i class="${i < r ? 'f' : ''}"></i>`;
          h += `<button class="card nav ${can ? 'can' : ''} ${lock ? 'lock' : ''}" data-id="${u.id}"><div class="row"><span class="nm">${u.name}</span><span class="pips">${pips}</span></div><div class="ds">${u.desc}</div><div class="st">${maxed ? 'Maxed' : lock || (can ? 'Buy · ' : '') + u.cost + ' point' + (u.cost > 1 ? 's' : '')}</div></button>`;
        }
        h += '</div>';
      }
      body.innerHTML = h + '</div>';
      body.querySelectorAll('.card').forEach(b => b.onclick = () => { if (buyUpgrade(b.dataset.id)) { renderTab(b.dataset.id); } });
      const keep = keepId && body.querySelector(`.card[data-id="${keepId}"]`);
      setFocus(keep || body.querySelector('.card.can') || body.querySelector('.card'));
    } else if (tab === 'controls') {
      const rows = [['move', 'Move'], ['aim', 'Aim'], ['tk', 'Telekinesis: hold to lift, release to throw'], ['drop', 'Drop what you are holding'], ['rep', 'Repulse: shove everything, reflect bullets'], ['well', 'Gravity well at your aim point'], ['abs', 'Absorb: hold to soak hits, release to blast'], ['dash', 'Dash (invulnerable, hits on contact)'], ['heal', 'Hold near a wounded civilian: heal'], ['drain', 'Hold near a civilian: drain their life'], ['map', 'City map'], ['menu', 'Pause and skills']];
      const list = dev => rows.map(([a, d]) => `<li><span class="k"><span class="g" data-act="${a}" data-dev="${dev}"></span></span><span class="d">${d}</span></li>`).join('');
      body.innerHTML = `<div class="ctl"><div><h3>Controller · ${Input.padStyle === 'ps' ? 'PlayStation' : 'Xbox'} layout</h3><ul>${list('pad')}</ul></div><div><h3>Keyboard and mouse</h3><ul>${list('kbm')}</ul></div></div>`;
      refreshGlyphs(); setFocus($('bResume'));
    } else {
      const pct = v => Math.round(v * 100) + '%';
      body.innerHTML = `<div class="setgrid">
        <button class="set nav" data-k="music"><span>Music volume</span><span class="v">◀ ${pct(SETTINGS.music)} ▶</span></button>
        <button class="set nav" data-k="sfx"><span>Effects volume</span><span class="v">◀ ${pct(SETTINGS.sfx)} ▶</span></button>
        <button class="set nav" data-k="rumble"><span>Controller rumble</span><span class="v">${SETTINGS.rumble ? 'On' : 'Off'}</span></button>
        <button class="set nav" data-k="shake"><span>Screen shake</span><span class="v">${SETTINGS.shake ? 'On' : 'Off'}</span></button></div>`;
      body.querySelectorAll('.set').forEach(b => b.onclick = () => adjustSetting(b.dataset.k, 1, true));
      setFocus(keepId ? body.querySelector(`.set[data-k="${keepId}"]`) : body.querySelector('.set'));
    }
    document.querySelectorAll('#tabs .tab').forEach(t => t.onclick = () => { tab = t.dataset.tab; renderTab(); });
  }
  function adjustSetting(k, d, wrap) {
    if (k === 'music' || k === 'sfx') { let v = Math.round((SETTINGS[k] + d * .1) * 10) / 10; if (wrap && v > 1.001) v = 0; SETTINGS[k] = clamp(v, 0, 1); Audio2.applyVolumes(); }
    else { SETTINGS[k] = !SETTINGS[k]; if (k === 'rumble' && SETTINGS.rumble) Input.rumble(.6, .6, 200); }
    saveSettings(); sfx('ui'); renderTab(k);
  }

  /* ---------- title actions ---------- */
  function startNew() { Audio2.unlock(); Audio2.startAmbience(); hide('title'); newGame(null); G.mode = 'play'; startStory(); }
  function continueGame() { const s = loadSave(); if (!s) return; Audio2.unlock(); Audio2.startAmbience(); hide('title'); newGame(s); G.mode = 'play'; toast('Welcome back to Halcyon', '#e8ecf7', true); }
  function toTitle() { saveGame(); hide('pause'); Audio2.humStop(); G.mode = 'title'; show('title'); $('bCont').disabled = !loadSave(); setFocus($('bNew')); }
  $('bNew').onclick = startNew; $('bCont').onclick = continueGame; $('bCtl').onclick = () => openPause(true);
  $('bResume').onclick = closePause; $('bQuit').onclick = toTitle;
  const goFull = async () => { try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); } catch (e) { } try { await screen.orientation.lock('landscape'); } catch (e) { } };
  $('bFull').onclick = goFull; $('bNew').addEventListener('click', goFull); $('bCont').addEventListener('click', goFull);

  /* ---------- per-frame ---------- */
  function update(dt) {
    const m = G.mode;
    if (layer === 'title' && m === 'title') {
      if (!focus) setFocus($('bCont').disabled ? $('bNew') : $('bCont'));
    }
    if (layer) {
      if (Input.ui('uup')) moveFocus(0, -1); if (Input.ui('udown')) moveFocus(0, 1); if (Input.ui('uleft')) { if (focus && focus.classList.contains('set')) adjustSetting(focus.dataset.k, -1); else moveFocus(-1, 0); } if (Input.ui('uright')) { if (focus && focus.classList.contains('set')) adjustSetting(focus.dataset.k, 1); else moveFocus(1, 0); }
    }
    if (layer === 'dlg') {
      choiceLock -= dt;
      if (cur && typed < cur.text.length) { typed += dt * 75; if (typed >= cur.text.length) finishTyping(); else $('dtext').textContent = cur.text.slice(0, typed | 0); }
      if (Input.ui('confirm')) { if (cur && cur.choices && typed >= cur.text.length) { if (focus) focus.click(); } else advance(); }
      else if (Input.ui('back')) { if (cur && typed < cur.text.length) finishTyping(); }
    } else if (layer === 'pause') {
      if (Input.ui('confirm') && focus) focus.click();
      else if (Input.ui('back') || (!fromTitle && Input.ui('menu'))) closePause();
      else if (!fromTitle && Input.ui('tabL') && Input.device === 'pad') switchTab(-1);
      else if (!fromTitle && Input.ui('tabR') && Input.device === 'pad') switchTab(1);
    } else if (layer === 'title') {
      if (Input.ui('confirm') && focus) focus.click();
    } else if (m === 'play') {
      if (Input.ui('menu')) openPause(false);
      else if (Input.ui('map')) { G.mode = 'map'; sfx('ui'); }
    } else if (m === 'map') {
      if (Input.ui('map') || Input.ui('back') || Input.ui('menu')) { G.mode = 'play'; sfx('ui'); }
    }
  }
  $('bCont').disabled = !loadSave();
  refreshGlyphs();
  return { update, say, show, hide, refreshGlyphs, openPause, closePause, get layer() { return layer; }, advance, nextLine, get dialogLine() { return cur; }, finishTyping };
})();
const say = UI.say;
