/**
 * banker.js — Core Algorithm Module
 * Pure computation: no DOM, no side effects.
 * Exports: BankersAlgorithm
 */

const BankersAlgorithm = (() => {

  /**
   * Compute Need matrix = Max − Allocation
   * @param {number[][]} alloc
   * @param {number[][]} max
   * @returns {{ need: number[][], errors: string[] }}
   */
  function computeNeed(alloc, max) {
    const errors = [];
    const nP = alloc.length;
    const nR = alloc[0]?.length ?? 0;
    const need = [];

    for (let i = 0; i < nP; i++) {
      need[i] = [];
      for (let j = 0; j < nR; j++) {
        const allocVal = alloc[i][j];
        const maxVal   = max[i][j];
        const needVal  = maxVal - allocVal;

        // Surface intermediate values for transparency
        need[i][j] = needVal;

        if (allocVal > maxVal) {
          errors.push(`P${i}, R${j}: allocation (${allocVal}) exceeds max (${maxVal})`);
        }
      }
    }
    return { need, errors };
  }

  /**
   * Safety Algorithm
   * Returns safe sequence if system is in a safe state.
   *
   * @param {number[][]} alloc  — Allocation matrix
   * @param {number[][]} need   — Need matrix
   * @param {number[]}   avail  — Available vector
   * @returns {{
   *   safe: boolean,
   *   sequence: number[],
   *   steps: Step[],
   *   workHistory: number[][]
   * }}
   */
  function safetyCheck(alloc, need, avail) {
    const nP   = alloc.length;
    const nR   = avail.length;
    const work = [...avail];
    const finish  = new Array(nP).fill(false);
    const sequence = [];
    const steps    = [];
    const workHistory = [work.slice()];

    steps.push({
      type: 'info',
      msg: `Initialise`,
      detail: `Work = [${work.join(', ')}] | Finish = [${finish.map(()=>'F').join(', ')}]`
    });

    let changed = true;
    let iteration = 0;

    while (changed) {
      changed = false;
      iteration++;

      for (let i = 0; i < nP; i++) {
        if (finish[i]) continue;

        // Check: Need[i] ≤ Work?
        const canAllocate = need[i].every((n, j) => n <= work[j]);

        // Record the check with intermediate values
        const needStr  = `[${need[i].join(', ')}]`;
        const workStr  = `[${work.join(', ')}]`;
        const allocStr = `[${alloc[i].join(', ')}]`;

        if (canAllocate) {
          steps.push({
            type: 'ok',
            proc: i,
            msg: `P${i} can execute`,
            detail: `Need${needStr} ≤ Work${workStr} ✓`,
            allocDetail: `Release Alloc${allocStr} → Work`
          });

          // Process finishes: release resources
          for (let j = 0; j < nR; j++) {
            work[j] += alloc[i][j];
          }
          finish[i] = true;
          sequence.push(i);
          changed = true;
          workHistory.push(work.slice());

          steps.push({
            type: 'ok',
            proc: i,
            msg: `P${i} finishes`,
            detail: `New Work = [${work.join(', ')}]`
          });
          break; // restart scan
        } else {
          // Show which resource(s) blocked it
          const blocked = need[i]
            .map((n, j) => n > work[j] ? `R${j}(need ${n} > work ${work[j]})` : null)
            .filter(Boolean).join(', ');

          steps.push({
            type: 'wait',
            proc: i,
            msg: `P${i} must wait`,
            detail: `Need${needStr} ⊄ Work${workStr} — blocked on ${blocked}`
          });
        }
      }
    }

    const safe = finish.every(Boolean);

    steps.push({
      type: safe ? 'safe' : 'unsafe',
      msg: safe
        ? `System is in a SAFE STATE`
        : `System is in an UNSAFE STATE — deadlock possible`,
      detail: safe
        ? `Safe sequence: ${sequence.map(i=>'P'+i).join(' → ')}`
        : `Unfinished processes: [${finish.map((f,i)=>f?null:'P'+i).filter(Boolean).join(', ')}]`
    });

    return { safe, sequence, steps, workHistory };
  }

  /**
   * Validate available vector against total resources
   * (optional diagnostic)
   */
  function validateAvailable(alloc, avail, totalRes) {
    const nR = avail.length;
    const warnings = [];
    for (let j = 0; j < nR; j++) {
      const used = alloc.reduce((s, row) => s + row[j], 0);
      if (totalRes && used + avail[j] !== totalRes[j]) {
        warnings.push(`R${j}: allocated(${used}) + available(${avail[j]}) ≠ total(${totalRes[j]})`);
      }
    }
    return warnings;
  }

  return { computeNeed, safetyCheck, validateAvailable };
})();

// CommonJS + browser dual export
if (typeof module !== 'undefined') module.exports = BankersAlgorithm;