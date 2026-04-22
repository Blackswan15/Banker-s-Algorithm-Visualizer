/**
 * banker.js — Core Algorithm Module
 * Pure computation: no DOM, no side effects.
 */
const BankersAlgorithm = (() => {

  /** Compute Need = Max - Allocation */
  function computeNeed(alloc, max) {
    const errors = [];
    const nP = alloc.length;
    const nR = alloc[0]?.length ?? 0;
    const need = [];

    for (let i = 0; i < nP; i++) {
      need[i] = [];
      for (let j = 0; j < nR; j++) {
        need[i][j] = max[i][j] - alloc[i][j];
        if (alloc[i][j] > max[i][j]) {
          errors.push(`P${i}, R${j}: allocation (${alloc[i][j]}) exceeds max (${max[i][j]})`);
        }
      }
    }
    return { need, errors };
  }

  /** Safety Algorithm — returns safe sequence if system is safe */
  function safetyCheck(alloc, need, avail) {
    const nP = alloc.length;
    const nR = avail.length;
    const work = [...avail];
    const finish = new Array(nP).fill(false);
    const sequence = [];
    const steps = [];
    const workHistory = [work.slice()];

    steps.push({
      type: 'info',
      msg: 'Initialise',
      detail: `Work = [${work}] | Finish = [${finish.map(() => 'F')}]`
    });

    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < nP; i++) {
        if (finish[i]) continue;

        const canAllocate = need[i].every((n, j) => n <= work[j]);
        const needStr = `[${need[i]}]`, workStr = `[${work}]`;

        if (canAllocate) {
          steps.push({ type: 'ok', proc: i, msg: `P${i} can execute`, detail: `Need${needStr} ≤ Work${workStr} ✓`, allocDetail: `Release Alloc[${alloc[i]}] → Work` });
          for (let j = 0; j < nR; j++) work[j] += alloc[i][j];
          finish[i] = true;
          sequence.push(i);
          changed = true;
          workHistory.push(work.slice());
          steps.push({ type: 'ok', proc: i, msg: `P${i} finishes`, detail: `New Work = [${work}]` });
          break;
        } else {
          const blocked = need[i].map((n, j) => n > work[j] ? `R${j}(need ${n} > work ${work[j]})` : null).filter(Boolean).join(', ');
          steps.push({ type: 'wait', proc: i, msg: `P${i} must wait`, detail: `Need${needStr} ⊄ Work${workStr} — blocked on ${blocked}` });
        }
      }
    }

    const safe = finish.every(Boolean);
    steps.push({
      type: safe ? 'safe' : 'unsafe',
      msg: safe ? 'System is in a SAFE STATE' : 'System is in an UNSAFE STATE — deadlock possible',
      detail: safe
        ? `Safe sequence: ${sequence.map(i => 'P' + i).join(' → ')}`
        : `Unfinished processes: [${finish.map((f, i) => f ? null : 'P' + i).filter(Boolean)}]`
    });

    return { safe, sequence, steps, workHistory };
  }

  return { computeNeed, safetyCheck };
})();

if (typeof module !== 'undefined') module.exports = BankersAlgorithm;
