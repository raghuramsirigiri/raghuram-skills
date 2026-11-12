/*!
 * motion-lib/transitions.js — what happens between two scenes.
 *
 * One transition, the same between every pair of scenes: real explainers use
 * one grammar, and a different move at each change reads as random. The
 * outgoing content rises and fades out (its exit, in core.js); over the short
 * overlap that follows, the shared chrome (the accent bar, the kicker line,
 * the footer) stays still and only swaps its words; then the incoming
 * content rises in through its masks. Nothing sweeps, floods or wipes the
 * frame, and nothing resizes the bar.
 *
 * `cut` is internal: the first scene has nothing before it.
 *
 * `pan` is the continuous style's (world.js): the words leave, the camera
 * pans level to the next place, the next words rise in. Its length is set
 * per change from how far the camera travels.
 */
(function (root) {
  'use strict';
  const M = root.Motion = root.Motion || {};

  const T = {
    cut: {
      dur: 0, ownsExit: true,
      draw(ctx, p, x) { x.drawB(); }
    },
    swap: {
      dur: 0.25, ownsExit: false, reveal: 'mask-up',
      draw(ctx, p, x) { x.drawB(); }
    },
    pan: {
      dur: 1.5, ownsExit: false, reveal: 'mask-up',
      draw(ctx, p, x) { x.drawB(); }
    }
  };
  Object.keys(T).forEach(k => { T[k].name = k; });

  function get(name) {
    const t = T[name || 'swap'];
    if (!t) throw new Error('unknown transition "' + name + '" — use ' + Object.keys(T).join(', '));
    return t;
  }

  M.transitions = { get, list: T };
  if (typeof module !== 'undefined' && module.exports) module.exports = M.transitions;
})(typeof window !== 'undefined' ? window : globalThis);
