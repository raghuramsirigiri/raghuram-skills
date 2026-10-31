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
 * `travel` is the same swap with a longer quiet stretch: when a beat changes
 * the stage (a new state, a new place), the words leave, the stage moves
 * (stage.js) and the camera pans or zooms on the world, and the next words
 * rise in. Its length is set per change by the story's shape. The card
 * layer does exactly what it does in the swap.
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
    travel: {
      dur: 1.4, ownsExit: false, reveal: 'mask-up',
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
