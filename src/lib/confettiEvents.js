const listeners = new Set();

export function addConfettiListener(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitConfetti() {
  listeners.forEach(fn => { try { fn(); } catch {} });
}
