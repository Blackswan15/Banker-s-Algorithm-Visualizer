/**
 * ui.js — DOM Rendering Module
 * Handles table generation, need display, result banners, animations.
 */
const UI = (() => {
  const $ = id => document.getElementById(id);
  const resName = j => String.fromCharCode(65 + j);

  /* Shared input handler for matrix cells */
  function bindCellInput(inp) {
    inp.addEventListener('input', () => {
      inp.classList.remove('flash-ok', 'flash-err');
      void inp.offsetWidth;
      const v = parseInt(inp.value);
      inp.classList.add(!isNaN(v) && v >= 0 ? 'flash-ok' : 'flash-err');
      Events.emit('matrix-changed');
    });
  }

  /* Build header row for a matrix table */
  function buildHeader(table, nR, leftLabel = 'Process') {
    table.innerHTML = '';
    const tr = table.createTHead().insertRow();
    const th0 = document.createElement('th');
    th0.textContent = leftLabel;
    tr.appendChild(th0);
    for (let j = 0; j < nR; j++) {
      const th = document.createElement('th');
      th.textContent = resName(j);
      tr.appendChild(th);
    }
  }

  /* Render editable Allocation or Max table */
  function renderEditableMatrix(tableId, prefix, nP, nR, values = null) {
    const table = $(tableId);
    buildHeader(table, nR);
    const tbody = table.createTBody();

    for (let i = 0; i < nP; i++) {
      const tr = tbody.insertRow();
      tr.insertCell().textContent = `P${i}`;
      for (let j = 0; j < nR; j++) {
        const inp = document.createElement('input');
        Object.assign(inp, { type: 'number', min: '0', value: values ? (values[i]?.[j] ?? 0) : 0, className: 'cell-in', id: `${prefix}_${i}_${j}` });
        bindCellInput(inp);
        tr.insertCell().appendChild(inp);
      }
    }
  }

  /* Render Available row */
  function renderAvailRow(nR, values = null) {
    const table = $('avail-table');
    buildHeader(table, nR, 'Resource');
    const tr = table.createTBody().insertRow();
    tr.insertCell().textContent = 'Available';

    for (let j = 0; j < nR; j++) {
      const inp = document.createElement('input');
      Object.assign(inp, { type: 'number', min: '0', value: values ? (values[j] ?? 0) : 0, className: 'cell-in', id: `avail_${j}` });
      bindCellInput(inp);
      tr.insertCell().appendChild(inp);
    }
  }

  /* Render Need matrix (read-only) */
  function renderNeedMatrix(need, nR) {
    const table = $('need-table');
    buildHeader(table, nR);
    const tbody = table.createTBody();

    for (let i = 0; i < need.length; i++) {
      const tr = tbody.insertRow();
      tr.insertCell().textContent = `P${i}`;
      for (let j = 0; j < nR; j++) {
        const val = need[i][j];
        const span = document.createElement('span');
        span.className = 'need-val ' + (val > 0 ? 'need-pos' : val === 0 ? 'need-zero' : 'need-neg');
        span.textContent = val;
        tr.insertCell().appendChild(span);
      }
    }
  }

  /* Read matrix values from DOM */
  function readMatrix(prefix, nP, nR) {
    return Array.from({ length: nP }, (_, i) =>
      Array.from({ length: nR }, (_, j) => parseInt($(`${prefix}_${i}_${j}`)?.value ?? '0') || 0)
    );
  }
  function readAvail(nR) {
    return Array.from({ length: nR }, (_, j) => parseInt($(`avail_${j}`)?.value ?? '0') || 0);
  }

  /* Update stats row */
  function updateStats(nP, nR, alloc, avail) {
    const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
    set('stat-processes', nP);
    set('stat-resources', nR);
    set('stat-allocated', alloc.flat().reduce((a, b) => a + b, 0));
    set('stat-available', avail.reduce((a, b) => a + b, 0));
  }

  /* Result banner — single method replaces 3 */
  const BANNER_CFG = {
    idle:   { cls: 'result-idle',   icon: '⏳', title: 'Awaiting analysis',  desc: 'Configure matrices and click <em>Run Safety Check</em>.' },
    safe:   { cls: 'result-safe',   icon: '✓',  title: 'Safe State',         desc: 'No deadlock possible. A valid safe sequence exists.' },
    unsafe: { cls: 'result-unsafe', icon: '✕',  title: 'Unsafe State',       desc: 'Deadlock may occur. No safe sequence exists.' }
  };
  function setResultBanner(type) {
    const banner = $('result-banner');
    const cfg = BANNER_CFG[type];
    banner.className = `result-banner ${cfg.cls}`;
    if (type !== 'idle') banner.style.animation = 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both';
    banner.innerHTML = `<div class="result-icon-wrap">${cfg.icon}</div><div class="result-text"><h2>${cfg.title}</h2><p>${cfg.desc}</p></div>`;
  }

  /* Safe sequence animation */
  function animateSequence(sequence) {
    const container = $('seq-flow');
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
    $('seq-section').classList.remove('hidden');
  }

  function clearSequence() {
    $('seq-section').classList.add('hidden');
    $('seq-flow').innerHTML = '';
  }

  /* Debug / computation log */
  function appendLog(result, dot) {
    const body = $('debug-body');
    const steps = result.steps || [];
    dot.className = 'debug-dot';
    const typeMap = { ok: 'log-ok', wait: 'log-fail', info: 'log-info', safe: 'log-ok', unsafe: 'log-fail' };

    steps.forEach((s, i) => {
      setTimeout(() => {
        const line = document.createElement('div');
        line.className = `log-line ${typeMap[s.type] || ''}`;
        line.innerHTML = `<span class="log-step">step ${i + 1}</span><span class="log-msg">${s.proc !== undefined ? `<span class="log-proc">P${s.proc}</span> — ` : ''}${s.msg}${s.detail ? `<br><span style="opacity:0.65;font-size:0.72rem">${s.detail}</span>` : ''}${s.allocDetail ? `<br><span style="opacity:0.55;font-size:0.70rem">${s.allocDetail}</span>` : ''}</span>`;
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
    $('debug-body').innerHTML = '';
    document.querySelector('.debug-dot').className = 'debug-dot idle';
  }

  return {
    renderEditableMatrix, renderAvailRow, renderNeedMatrix,
    readMatrix, readAvail, updateStats,
    setResultBanner, animateSequence, clearSequence,
    appendLog, clearLog
  };
})();
