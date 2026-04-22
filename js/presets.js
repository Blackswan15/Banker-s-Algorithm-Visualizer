/**
 * presets.js — Preset example configurations
 */
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
