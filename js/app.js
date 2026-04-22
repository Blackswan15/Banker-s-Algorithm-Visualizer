/**
 * app.js — Application Controller
 * Wires UI ↔ Banker's algorithm. Handles state & events.
 */

const State = { nP: 5, nR: 3, built: false };
const $ = id => document.getElementById(id);

/* Build all tables */
function buildTables(preset = null) {
  const nP = preset ? preset.nP : parseInt($('cfg-proc').value) || 5;
  const nR = preset ? preset.nR : parseInt($('cfg-res').value) || 3;

  State.nP = Math.min(8, Math.max(1, nP));
  State.nR = Math.min(5, Math.max(1, nR));
  State.built = true;

  if (preset) {
    $('cfg-proc').value = State.nP;
    $('cfg-res').value  = State.nR;
  }

  UI.renderEditableMatrix('alloc-table', 'alloc', State.nP, State.nR, preset?.alloc);
  UI.renderEditableMatrix('max-table',   'max',   State.nP, State.nR, preset?.max);
  UI.renderAvailRow(State.nR, preset?.avail);

  if (preset) {
    const { need } = BankersAlgorithm.computeNeed(preset.alloc, preset.max);
    UI.renderNeedMatrix(need, State.nR);
    $('need-section').classList.remove('hidden');
  } else {
    $('need-section').classList.add('hidden');
  }

  const alloc = UI.readMatrix('alloc', State.nP, State.nR);
  const avail = UI.readAvail(State.nR);
  UI.updateStats(State.nP, State.nR, alloc, avail);

  $('tables-section').classList.remove('hidden');
  UI.setResultBanner('idle');
  UI.clearSequence();
  UI.clearLog();
}

/* Live need recompute on input change */
Events.on('matrix-changed', () => {
  if (!State.built) return;
  const alloc = UI.readMatrix('alloc', State.nP, State.nR);
  const max   = UI.readMatrix('max',   State.nP, State.nR);
  const avail = UI.readAvail(State.nR);
  const { need } = BankersAlgorithm.computeNeed(alloc, max);
  UI.renderNeedMatrix(need, State.nR);
  $('need-section').classList.remove('hidden');
  UI.updateStats(State.nP, State.nR, alloc, avail);
});

/* Run safety algorithm */
function runSafety() {
  if (!State.built) { alert('Please build tables first.'); return; }

  const alloc = UI.readMatrix('alloc', State.nP, State.nR);
  const max   = UI.readMatrix('max',   State.nP, State.nR);
  const avail = UI.readAvail(State.nR);
  const { need, errors } = BankersAlgorithm.computeNeed(alloc, max);

  UI.renderNeedMatrix(need, State.nR);
  $('need-section').classList.remove('hidden');

  const errBox = $('error-box');
  if (errors.length > 0) {
    errBox.textContent = 'Warning: ' + errors.join('; ');
    errBox.classList.remove('hidden');
  } else {
    errBox.classList.add('hidden');
  }

  UI.clearLog();
  const result = BankersAlgorithm.safetyCheck(alloc, need, avail);

  if (result.safe) {
    UI.setResultBanner('safe');
    UI.animateSequence(result.sequence);
  } else {
    UI.setResultBanner('unsafe');
    UI.clearSequence();
  }

  UI.appendLog(result, document.querySelector('.debug-dot'));
  setTimeout(() => $('result-section').scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
}

/* Reset */
function resetAll() {
  State.built = false;
  $('tables-section').classList.add('hidden');
  $('need-section').classList.add('hidden');
  $('error-box').classList.add('hidden');
  UI.setResultBanner('idle');
  UI.clearSequence();
  UI.clearLog();
}

/* Init */
document.addEventListener('DOMContentLoaded', () => {
  $('btn-build').addEventListener('click', () => buildTables());
  $('btn-run').addEventListener('click', runSafety);
  $('btn-reset').addEventListener('click', resetAll);

  document.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => { const p = PRESETS[btn.dataset.preset]; if (p) buildTables(p); });
  });

  ['cfg-proc', 'cfg-res'].forEach(id => {
    $(id).addEventListener('change', e => {
      const max = id === 'cfg-proc' ? 8 : 5;
      e.target.value = Math.min(max, Math.max(1, parseInt(e.target.value) || 1));
    });
  });

  UI.setResultBanner('idle');
});
