// Easter egg: two tiny games in a dialog. Open by clicking the bike or pressing G.
(() => {
  const $ = id => document.getElementById(id);
  const dlg = $('arcade');
  if (!dlg || typeof dlg.showModal !== 'function') return;

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  };

  // ---------- Open / close / tabs ----------
  const tabs = { react: $('tab-react'), qubit: $('tab-qubit') };
  const panels = { react: $('panel-react'), qubit: $('panel-qubit') };
  function showTab(name) {
    for (const k in tabs) {
      tabs[k].setAttribute('aria-selected', k === name);
      panels[k].hidden = k !== name;
    }
    if (name !== 'react') reaction.stop();
  }
  tabs.react.onclick = () => showTab('react');
  tabs.qubit.onclick = () => showTab('qubit');
  $('open-arcade').onclick = () => dlg.showModal();
  $('arcade-close').onclick = () => dlg.close();
  dlg.addEventListener('close', () => reaction.stop());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });  // click backdrop
  document.addEventListener('keydown', e => {
    if (e.key.toLowerCase() === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey && !dlg.open) dlg.showModal();
  });

  // ---------- Game 1: reaction time ----------
  const reaction = (() => {
    const lights = [...document.querySelectorAll('.lights i')];
    const pad = $('pad'), msg = $('react-msg'), bestEl = $('react-best');
    let state = 'idle', timers = [], t0 = 0;
    let best = Number(store.get('reactBest')) || 0;
    const showBest = () => { bestEl.textContent = best ? best + ' ms' : '—'; };
    showBest();

    const clear = () => { timers.forEach(clearTimeout); timers = []; };
    const setLights = n => lights.forEach((l, i) => l.classList.toggle('on', i < n));

    function stop() { clear(); setLights(0); state = 'idle'; pad.textContent = 'Start'; }

    function start() {
      clear(); state = 'arming'; setLights(0);
      pad.textContent = 'Wait…'; msg.textContent = 'Lights are coming on…';
      for (let i = 1; i <= 5; i++) timers.push(setTimeout(() => setLights(i), i * 700));
      const out = 5 * 700 + 600 + Math.random() * 2400;
      timers.push(setTimeout(() => {
        setLights(0); state = 'ready'; pad.textContent = 'GO!'; msg.textContent = '';
        t0 = performance.now();
      }, out));
    }

    function hit() {
      if (state === 'idle' || state === 'result') return start();
      if (state === 'arming') {
        clear(); setLights(0); state = 'result';
        pad.textContent = 'Try again'; msg.textContent = 'Jump start! Wait for the lights to go out.';
      } else if (state === 'ready') {
        const t = Math.round(performance.now() - t0);
        state = 'result'; pad.textContent = 'Again';
        msg.textContent = t + ' ms';
        if (!best || t < best) { best = t; store.set('reactBest', String(t)); msg.textContent += ' · new best!'; showBest(); }
      }
    }

    pad.addEventListener('pointerdown', e => { e.preventDefault(); hit(); });
    pad.addEventListener('keydown', e => {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); hit(); }
    });
    return { stop };
  })();

  // ---------- Game 2: qubit gates on the Bloch sphere ----------
  const qubit = (() => {
    const S2 = Math.SQRT1_2;
    // gates as 2x2 complex matrices [[a, b], [c, d]], each entry [re, im]
    const GATES = {
      H: [[[S2, 0], [S2, 0]], [[S2, 0], [-S2, 0]]],
      X: [[[0, 0], [1, 0]], [[1, 0], [0, 0]]],
      Y: [[[0, 0], [0, -1]], [[0, 1], [0, 0]]],
      Z: [[[1, 0], [0, 0]], [[0, 0], [-1, 0]]],
      S: [[[1, 0], [0, 0]], [[0, 0], [0, 1]]],
      T: [[[1, 0], [0, 0]], [[0, 0], [S2, S2]]],
    };
    const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
    const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
    const apply = (g, [p, q]) => [add(mul(g[0][0], p), mul(g[0][1], q)), add(mul(g[1][0], p), mul(g[1][1], q))];
    const ZERO = [[1, 0], [0, 0]];

    // Bloch vector (x, y, z) of state a|0> + b|1>
    function bloch([a, b]) {
      const ab = [a[0] * b[0] + a[1] * b[1], a[0] * b[1] - a[1] * b[0]];   // conj(a) * b
      return [2 * ab[0], 2 * ab[1], a[0] ** 2 + a[1] ** 2 - b[0] ** 2 - b[1] ** 2];
    }
    const dist = (u, v) => Math.hypot(u[0] - v[0], u[1] - v[1], u[2] - v[2]);
    const run = seq => seq.reduce((s, g) => apply(GATES[g], s), ZERO);

    // levels are defined by a gate sequence; the par is found by breadth-first search
    const LEVELS = [['X'], ['H', 'Z'], ['H', 'S'], ['H', 'T'], ['H', 'S', 'H'], ['H', 'T', 'H', 'S']]
      .map(seq => ({ target: bloch(run(seq)) }));
    function par(target) {
      let frontier = [{ s: ZERO, n: 0 }];
      const seen = [bloch(ZERO)];
      while (frontier.length) {
        const next = [];
        for (const { s, n } of frontier) {
          if (dist(bloch(s), target) < 1e-6) return n;
          for (const g in GATES) {
            const t = apply(GATES[g], s), v = bloch(t);
            if (!seen.some(w => dist(w, v) < 1e-6)) { seen.push(v); next.push({ s: t, n: n + 1 }); }
          }
        }
        frontier = next;
      }
      return NaN;
    }
    LEVELS.forEach(l => { l.par = par(l.target); });

    const svg = $('bloch'), lvlEl = $('q-level'), msg = $('q-msg');
    const nextBtn = $('q-next'), undoBtn = $('q-undo'), gatesEl = $('gates');
    let level = 0, history = [], state = ZERO;

    // fixed 3D view: rotate about z, then tilt
    const AZ = 0.55, EL = 0.35;
    function project([x, y, z]) {
      const x1 = x * Math.cos(AZ) - y * Math.sin(AZ), y1 = x * Math.sin(AZ) + y * Math.cos(AZ);
      return [100 * x1, -100 * (z * Math.cos(EL) - y1 * Math.sin(EL))];
    }
    const pt = v => project(v).map(n => n.toFixed(1)).join(',');
    const ring = (f, n = 48) => Array.from({ length: n + 1 }, (_, i) => pt(f(2 * Math.PI * i / n))).join(' ');

    function draw() {
      const cur = bloch(state), tgt = LEVELS[level].target;
      const label = (v, text) => { const [x, y] = project(v.map(c => c * 1.18)); return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle">${text}</text>`; };
      svg.innerHTML = `
        <circle cx="0" cy="0" r="100" fill="var(--surface)" stroke="var(--line)" stroke-width="2"/>
        <polyline points="${ring(t => [Math.cos(t), Math.sin(t), 0])}" fill="none" stroke="var(--muted)" stroke-width="1" stroke-dasharray="3 4"/>
        <polyline points="${ring(t => [Math.cos(t), 0, Math.sin(t)])}" fill="none" stroke="var(--line)" stroke-width="1"/>
        <path d="M${pt([0, 0, -1])}L${pt([0, 0, 1])}M${pt([-1, 0, 0])}L${pt([1, 0, 0])}M${pt([0, -1, 0])}L${pt([0, 1, 0])}" stroke="var(--muted)" stroke-width="1" fill="none"/>
        <g font-family="JetBrains Mono, monospace" font-size="11" fill="var(--text)">
          ${label([0, 0, 1], '|0⟩')}${label([0, 0, -1], '|1⟩')}${label([1, 0, 0], '|+⟩')}${label([0, 1, 0], '|+i⟩')}
        </g>
        <circle cx="${project(tgt)[0]}" cy="${project(tgt)[1]}" r="9" fill="none" stroke="var(--heading)" stroke-width="2.5"/>
        <path d="M0 0L${pt(cur)}" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>
        <circle cx="${project(cur)[0]}" cy="${project(cur)[1]}" r="5.5" fill="var(--accent)"/>`;
      const l = LEVELS[level];
      lvlEl.textContent = `Level ${level + 1} / ${LEVELS.length} · par ${l.par} · moves ${history.length}`;
      undoBtn.disabled = !history.length;
      const solved = dist(cur, tgt) < 1e-6;
      gatesEl.querySelectorAll('button').forEach(b => { b.disabled = solved; });
      if (solved) {
        const n = history.length;
        msg.textContent = n <= l.par ? `Solved in ${n}. That's the minimum!` : `Solved in ${n}. The minimum is ${l.par}, can you do better?`;
        nextBtn.hidden = level === LEVELS.length - 1;
        if (nextBtn.hidden) msg.textContent += ' That was the last level.';
      } else { msg.textContent = ''; nextBtn.hidden = true; }
    }

    function reset() { history = []; state = ZERO; draw(); }
    gatesEl.innerHTML = Object.keys(GATES).map(g => `<button data-g="${g}">${g}</button>`).join('');
    gatesEl.onclick = e => {
      const g = e.target.dataset && e.target.dataset.g;
      if (!g) return;
      history.push(g); state = apply(GATES[g], state); draw();
    };
    undoBtn.onclick = () => { history.pop(); state = run(history); draw(); };
    $('q-reset').onclick = reset;
    nextBtn.onclick = () => { level = Math.min(level + 1, LEVELS.length - 1); reset(); };
    reset();
  })();
})();
