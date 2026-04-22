/**
 * events.js — Tiny event bus
 * Decouples matrix input changes from app logic.
 */
const Events = (() => {
  const _ls = {};
  return {
    on(evt, fn)  { (_ls[evt] = _ls[evt] || []).push(fn); },
    emit(evt, d) { (_ls[evt] || []).forEach(fn => fn(d)); }
  };
})();
