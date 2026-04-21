/**
 * ui.js — DOM Rendering Module
 * Handles table generation, need display, result animation.
 * Depends on: banker.js (via global BankersAlgorithm)
 */

const UI = (() => {

  /* ── Resource name helper ──────────────────── */
  const resName = j => String.fromCharCode(65 + j);  // R0→A, R1→B …

  /* ── Build header row for a matrix table ───── */
  function buildTableHeader(table, nR, leftLabel = 'Process') {
    table.innerHTML = '';
    const thead = table.createTHead();
    const tr    = thead.insertRow();
    const th0   = document.createElement('th');
    th0.textContent = leftLabel;
    tr.appendChild(th0);
    for (let j = 0; j < nR; j++) {
      const th = document.createElement('th');
      th.textContent = resName(j);
      tr.appendChild(th);
    }
  }

  /* ── Render editable Allocation or Max table ── */
  function renderEditableMatrix(tableId, prefix, nP, nR, values = null) {
    const table = document.getElementById(tableId);
    buildTableHeader(table, nR);
    const tbody = table.createTBody();

    for (let i = 0; i < nP; i++) {
      const tr = tbody.insertRow();
      const td0 = tr.insertCell();
      td0.textContent = `P${i}`;

      for (let j = 0; j < nR; j++) {
        const td  = tr.insertCell();
        const inp = document.createElement('input');
        inp.type  = 'number';
        inp.min   = '0';
        inp.value = values ? (values[i]?.[j] ?? 0) : 0;
        inp.className  = 'cell-in';
        inp.id         = `${prefix}_${i}_${j}`;
        inp.dataset.proc = i;
        inp.dataset.res  = j;

        inp.addEventListener('input', () => {
          inp.classList.remove('flash-ok', 'flash-err');
          void inp.offsetWidth;
          const v = parseInt(inp.value);
          if (!isNaN(v) && v >= 0) inp.classList.add('flash-ok');
          else                      inp.classList.add('flash-err');
          Events.emit('matrix-changed');
        });

        td.appendChild(inp);
      }
    }
  }

  /* ── Render Available row ───────────────────── */
  function renderAvailRow(nR, values = null) {
    const table = document.getElementById('avail-table');
    buildTableHeader(table, nR, 'Resource');

    const tbody = table.createTBody();
    const tr = tbody.insertRow();
    const td0 = tr.insertCell();
    td0.textContent = 'Available';

    for (let j = 0; j < nR; j++) {
      const td  = tr.insertCell();
      const inp = document.createElement('input');
      inp.type  = 'number';
      inp.min   = '0';
      inp.value = values ? (values[j] ?? 0) : 0;
      inp.className = 'cell-in';
      inp.id        = `avail_${j}`;

      inp.addEventListener('input', () => {
        inp.classList.remove('flash-ok', 'flash-err');
        void inp.offsetWidth;
        const v = parseInt(inp.value);
        if (!isNaN(v) && v >= 0) inp.classList.add('flash-ok');
        else                      inp.classList.add('flash-err');
        Events.emit('matrix-changed');
      });

      td.appendChild(inp);
    }
  }

  /* ── Render Need matrix (read-only) ─────────── */
  function renderNeedMatrix(need, nR) {
    const table = document.getElementById('need-table');
    buildTableHeader(table, nR);
    const tbody = table.createTBody();
    const nP = need.length;

    for (let i = 0; i < nP; i++) {
      const tr = tbody.insertRow();
      const td0 = tr.insertCell();
      td0.textContent = `P${i}`;

      for (let j = 0; j < nR; j++) {
        const td  = tr.insertCell();
        const val = need[i][j];
        const span = document.createElement('span');
        span.className = 'need-val '
          + (val > 0 ? 'need-pos' : val === 0 ? 'need-zero' : 'need-neg');
        span.textContent = val;
        td.appendChild(span);
      }
    }
  }

  /* ── Read matrix values from DOM ─────────────── */
  function readMatrix(prefix, nP, nR) {
    return Array.from({ length: nP }, (_, i) =>
      Array.from({ length: nR }, (_, j) => {
        const el = document.getElementById(`${prefix}_${i}_${j}`);
        return parseInt(el?.value ?? '0') || 0;
      })
    );
  }

  function readAvail(nR) {
    return Array.from({ length: nR }, (_, j) => {
      const el = document.getElementById(`avail_${j}`);
      return parseInt(el?.value ?? '0') || 0;
    });
  }

  /* ── Update stats row ─────────────────────────── */
  function updateStats(nP, nR, alloc, avail) {
    const totalAlloc = alloc.flat().reduce((a, b) => a + b, 0);
    const totalAvail = avail.reduce((a, b) => a + b, 0);

    setText('stat-processes', nP);
    setText('stat-resources', nR);
    setText('stat-allocated', totalAlloc);
    setText('stat-available', totalAvail);
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  /* ── Result banner ─────────────────────────── */
  function setResultIdle() {
    const banner = document.getElementById('result-banner');
    banner.className = 'result-banner result-idle';
    banner.innerHTML = `
      <div class="result-icon-wrap">⏳</div>
      <div class="result-text">
        <h2>Awaiting analysis</h2>
        <p>Configure matrices and click <em>Run Safety Check</em>.</p>
      </div>`;
  }

  function setResultSafe(sequence) {
    const banner = document.getElementById('result-banner');
    banner.className = 'result-banner result-safe';
    banner.style.animation = 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both';
    banner.innerHTML = `
      <div class="result-icon-wrap">✓</div>
      <div class="result-text">
        <h2>Safe State</h2>
        <p>No deadlock possible. A valid safe sequence exists.</p>
      </div>`;
  }

  function setResultUnsafe() {
    const banner = document.getElementById('result-banner');
    banner.className = 'result-banner result-unsafe';
    banner.style.animation = 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both';
    banner.innerHTML = `
      <div class="result-icon-wrap">✕</div>
      <div class="result-text">
        <h2>Unsafe State</h2>
        <p>Deadlock may occur. No safe sequence exists.</p>
      </div>`;
  }

  /* ── Safe sequence animation ─────────────────── */
  function animateSequence(sequence) {
    const container = document.getElementById('seq-flow');
    container.innerHTML = '';

    sequence.forEach((proc, idx) => {
      if (idx > 0) {
        const arrow = document.createElement('span');
        arrow.className = 'seq-arrow';
        arrow.textContent = '→';
        container.appendChild(arrow);
        setTimeout(() => arrow.classList.add('show'), idx * 220 + 60);
      }

      const node = document.createElement('div');
      node.className = `seq-node sn-${idx % 8}`;
      node.textContent = `P${proc}`;
      container.appendChild(node);

      setTimeout(() => node.classList.add('show'), idx * 220 + 100);
    });

    document.getElementById('seq-section').classList.remove('hidden');
  }

  function clearSequence() {
    document.getElementById('seq-section').classList.add('hidden');
    document.getElementById('seq-flow').innerHTML = '';
  }

  /* ── Debug/computation log ───────────────────── */
  function appendLog(step, dot) {
    const body  = document.getElementById('debug-body');
    const steps = step.steps || [];

    dot.className = 'debug-dot';  // active pulse

    steps.forEach((s, i) => {
      setTimeout(() => {
        const line = document.createElement('div');
        const typeMap = { ok:'log-ok', wait:'log-fail', info:'log-info', safe:'log-ok', unsafe:'log-fail' };
        line.className = `log-line ${typeMap[s.type] || ''}`;

        line.innerHTML = `
          <span class="log-step">step ${i + 1}</span>
          <span class="log-msg">
            ${s.proc !== undefined ? `<span class="log-proc">P${s.proc}</span> — ` : ''}
            ${s.msg}
            ${s.detail ? `<br><span style="opacity:0.65;font-size:0.72rem">${s.detail}</span>` : ''}
            ${s.allocDetail ? `<br><span style="opacity:0.55;font-size:0.70rem">${s.allocDetail}</span>` : ''}
          </span>`;

        body.appendChild(line);
        requestAnimationFrame(() => line.classList.add('visible'));
        body.scrollTop = body.scrollHeight;

        if (i === steps.length - 1) {
          const last = steps[steps.length - 1];
          dot.className = `debug-dot ${last.type === 'safe' ? 'safe' : last.type === 'unsafe' ? 'unsafe' : ''}`;
        }
      }, i * 90);
    });
  }

  function clearLog() {
    document.getElementById('debug-body').innerHTML = '';
    document.querySelector('.debug-dot').className = 'debug-dot idle';
  }

  return {
    renderEditableMatrix,
    renderAvailRow,
    renderNeedMatrix,
    readMatrix,
    readAvail,
    updateStats,
    setResultIdle,
    setResultSafe,
    setResultUnsafe,
    animateSequence,
    clearSequence,
    appendLog,
    clearLog
  };
})();

if (typeof module !== 'undefined') module.exports = UI;

/* Theme & Font controls — persistence and application */
(function ThemeAndFont(){
  const root = document.documentElement;
  function applyTheme(theme){
    if(theme === 'dark') root.setAttribute('data-theme','dark');
    else root.removeAttribute('data-theme');
    try { localStorage.setItem('theme', theme); } catch(e){}
  }

  const fontMap = {
    default: { display: "'Lora', Georgia, serif", body: "'Outfit', sans-serif", mono: "'DM Mono', monospace" },
    serif:   { display: "'Lora', Georgia, serif", body: "'Lora', Georgia, serif", mono: "'DM Mono', monospace" },
    sans:    { display: "'Lora', Georgia, serif", body: "'Outfit', sans-serif", mono: "'DM Mono', monospace" },
    mono:    { display: "'Lora', Georgia, serif", body: "'DM Mono', monospace", mono: "'DM Mono', monospace" }
  };

  function applyFont(choice){
    const cfg = fontMap[choice] || fontMap.default;
    root.style.setProperty('--font-display', cfg.display);
    root.style.setProperty('--font-body', cfg.body);
    root.style.setProperty('--font-mono', cfg.mono);
    try { localStorage.setItem('fontChoice', choice); } catch(e){}
  }

  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('theme-toggle');
    const select = document.getElementById('font-select');

    const savedTheme = (function(){ try { return localStorage.getItem('theme') || 'light'; } catch(e){ return 'light'; } })();
    const savedFont  = (function(){ try { return localStorage.getItem('fontChoice') || 'default'; } catch(e){ return 'default'; } })();

    applyTheme(savedTheme);
    applyFont(savedFont);

    if(select){ select.value = savedFont; select.addEventListener('change', e => applyFont(e.target.value)); }
    if(toggle){ toggle.checked = (savedTheme === 'dark'); toggle.addEventListener('change', e => applyTheme(e.target.checked ? 'dark' : 'light')); }
  });
})();