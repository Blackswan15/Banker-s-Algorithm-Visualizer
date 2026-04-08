/**
 * app.js — Application Controller
 * Wires UI module ↔ Banker's algorithm.
 * Handles state, events, presets.
 */

/* ── Tiny event bus ──────────────────────────── */
const Events = (() => {
  const listeners = {};
  return {
    on(evt, fn)  { (listeners[evt] = listeners[evt] || []).push(fn); },
    emit(evt, d) { (listeners[evt] || []).forEach(fn => fn(d)); }
  };
})();

/* ── App state ───────────────────────────────── */
const State = {
  nP: 5,
  nR: 3,
  built: false,
  lastResult: null
};

/* ── Preset examples ─────────────────────────── */
const PRESETS = {
  classic: {
    name: 'Classic (Silberschatz)',
    nP: 5, nR: 3,
    alloc: [[0,1,0],[2,0,0],[3,0,2],[2,1,1],[0,0,2]],
    max:   [[7,5,3],[3,2,2],[9,0,2],[2,2,2],[4,3,3]],
    avail: [3,3,2]
  },
  small: {
    name: 'Small (3P × 2R)',
    nP: 3, nR: 2,
    alloc: [[1,0],[2,1],[0,1]],
    max:   [[3,2],[4,2],[2,3]],
    avail: [1,1]
  },
  unsafe: {
    name: 'Unsafe State Demo',
    nP: 4, nR: 3,
    alloc: [[0,1,0],[2,0,0],[3,0,2],[2,1,1]],
    max:   [[7,5,3],[3,2,2],[9,0,2],[4,4,4]],
    avail: [0,0,0]
  }
};

/* ── Build all tables ─────────────────────────── */
function buildTables(preset = null) {
  const nP = preset ? preset.nP : parseInt(document.getElementById('cfg-proc').value) || 5;
  const nR = preset ? preset.nR : parseInt(document.getElementById('cfg-res').value)  || 3;

  State.nP = Math.min(8, Math.max(1, nP));
  State.nR = Math.min(5, Math.max(1, nR));
  State.built = true;

  if (preset) {
    document.getElementById('cfg-proc').value = State.nP;
    document.getElementById('cfg-res').value  = State.nR;
  }

  UI.renderEditableMatrix('alloc-table', 'alloc', State.nP, State.nR, preset?.alloc);
  UI.renderEditableMatrix('max-table',   'max',   State.nP, State.nR, preset?.max);
  UI.renderAvailRow(State.nR, preset?.avail);

  // Show computed-on-the-fly need if available
  if (preset) {
    const { need } = BankersAlgorithm.computeNeed(preset.alloc, preset.max);
    UI.renderNeedMatrix(need, State.nR);
    document.getElementById('need-section').classList.remove('hidden');
  } else {
    document.getElementById('need-section').classList.add('hidden');
  }

  // Update stats
  const alloc = UI.readMatrix('alloc', State.nP, State.nR);
  const avail = UI.readAvail(State.nR);
  UI.updateStats(State.nP, State.nR, alloc, avail);

  document.getElementById('tables-section').classList.remove('hidden');
  UI.setResultIdle();
  UI.clearSequence();
  UI.clearLog();
}

/* ── Live need recompute on every input change ── */
Events.on('matrix-changed', () => {
  if (!State.built) return;
  const alloc = UI.readMatrix('alloc', State.nP, State.nR);
  const max   = UI.readMatrix('max',   State.nP, State.nR);
  const avail = UI.readAvail(State.nR);
  const { need } = BankersAlgorithm.computeNeed(alloc, max);
  UI.renderNeedMatrix(need, State.nR);
  document.getElementById('need-section').classList.remove('hidden');
  UI.updateStats(State.nP, State.nR, alloc, avail);
});

/* ── Run safety algorithm ─────────────────────── */
function runSafety() {
  if (!State.built) {
    alert('Please build tables first.');
    return;
  }

  const alloc = UI.readMatrix('alloc', State.nP, State.nR);
  const max   = UI.readMatrix('max',   State.nP, State.nR);
  const avail = UI.readAvail(State.nR);

  // Compute need
  const { need, errors } = BankersAlgorithm.computeNeed(alloc, max);

  UI.renderNeedMatrix(need, State.nR);
  document.getElementById('need-section').classList.remove('hidden');

  // Warn but don't block
  if (errors.length > 0) {
    const errBox = document.getElementById('error-box');
    errBox.textContent = 'Warning: ' + errors.join('; ');
    errBox.classList.remove('hidden');
  } else {
    document.getElementById('error-box').classList.add('hidden');
  }

  // Clear previous log
  UI.clearLog();

  // Run algorithm
  const result = BankersAlgorithm.safetyCheck(alloc, need, avail);
  State.lastResult = result;

  // Update result banner
  if (result.safe) {
    UI.setResultSafe(result.sequence);
    UI.animateSequence(result.sequence);
  } else {
    UI.setResultUnsafe();
    UI.clearSequence();
  }

  // Append debug log if panel visible
  const dot = document.querySelector('.debug-dot');
  UI.appendLog(result, dot);

  // Scroll to result
  setTimeout(() => {
    document.getElementById('result-section')
      .scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 200);
}

/* ── Reset ────────────────────────────────────── */
function resetAll() {
  State.built = false;
  document.getElementById('tables-section').classList.add('hidden');
  document.getElementById('need-section').classList.add('hidden');
  document.getElementById('error-box').classList.add('hidden');
  UI.setResultIdle();
  UI.clearSequence();
  UI.clearLog();
}

/* ── Load preset ──────────────────────────────── */
function loadPreset(key) {
  const preset = PRESETS[key];
  if (preset) buildTables(preset);
}

/* ── Init ─────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Bind buttons
  document.getElementById('btn-build').addEventListener('click', () => buildTables());
  document.getElementById('btn-run').addEventListener('click', runSafety);
  document.getElementById('btn-reset').addEventListener('click', resetAll);

  document.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => loadPreset(btn.dataset.preset));
  });

  // Clamp config inputs
  ['cfg-proc', 'cfg-res'].forEach(id => {
    document.getElementById(id).addEventListener('change', e => {
      const max = id === 'cfg-proc' ? 8 : 5;
      e.target.value = Math.min(max, Math.max(1, parseInt(e.target.value) || 1));
    });
  });

  UI.setResultIdle();
});