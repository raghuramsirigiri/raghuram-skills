/*!
 * motion-lib/transitions.js — what happens between two scenes.
 *
 * A transition runs over the overlap between the outgoing scene's tail and
 * the incoming scene's head. The through-line, a progress bar along the top
 * of the safe area, never moves: core.js draws it over every transition, and
 * a transition may only swell its thickness (morph-bar) or paint over it
 * (flood, whose accent field covers the whole frame). Transitions that own the
 * exit (cut, flood, scan, push) move the outgoing hold frame themselves; the
 * rest run after the outgoing text has already left.
 *
 * No full-frame crossfade by default: `fade` exists only for when the user
 * asks for one.
 */
(function (root) {
  'use strict';
  const M = root.Motion = root.Motion || {};

  const T = {
    cut: {
      dur: 0, ownsExit: true,
      draw(ctx, p, x) { x.drawB(); }
    },
    // Line reveals: the incoming text rises (or slides) through a mask.
    'mask-up': { dur: 0.4, ownsExit: false, reveal: 'mask-up', draw: incoming },
    'mask-left': { dur: 0.4, ownsExit: false, reveal: 'mask-left', draw: incoming },
    'morph-bar': {
      dur: 0.55, ownsExit: false,
      // The progress bar swells to twice its thickness at mid-transition, in
      // place, then settles: a beat that marks a turn in the story.
      swell: p => 1 + Math.sin(Math.PI * p),
      draw: incoming
    },
    flood: {
      dur: 0.6, ownsExit: true, coversBar: true,
      draw(ctx, p, x) {
        // An accent shape floods the frame with a hard edge, then recedes the
        // same way, leaving the incoming scene.
        const C = x.C;
        const e = M.ease.expoInOut(p);
        if (p < 0.5) x.holdA(); else x.drawB();
        const a = Math.min(1, e * 2), b = Math.max(0, e * 2 - 1);
        const x0 = C.W * b, x1 = C.W * a;
        M.paint.rect(ctx, x0, 0, x1 - x0, C.H, C.design.subject);
      }
    },
    scan: {
      dur: 0.5, ownsExit: true,
      draw(ctx, p, x) {
        // One horizontal line wipes down: above it the incoming scene, below it the outgoing hold.
        const C = x.C, y = C.H * M.ease.glide(p);
        ctx.save(); M.paint.clipRect(ctx, 0, y, C.W, C.H - y); x.holdA(); ctx.restore();
        ctx.save(); M.paint.clipRect(ctx, 0, 0, C.W, y); x.background(); x.drawB(); ctx.restore();
        M.paint.line(ctx, 0, y, C.W, y, C.design.ink, M.layout.RULE.hair * 2);
      }
    },
    push: {
      dur: 0.5, ownsExit: true,
      draw(ctx, p, x) {
        // The camera pushes into the outgoing hold (1.0 -> 1.06) as it fades to the card.
        const C = x.C, s = 1 + 0.06 * M.ease.expoIn(p);
        ctx.save();
        ctx.globalAlpha = 1 - M.ease.expoIn(p);
        ctx.translate(C.W / 2, C.H / 2); ctx.scale(s, s); ctx.translate(-C.W / 2, -C.H / 2);
        x.holdA();
        ctx.restore();
        x.drawB();
      }
    },
    fade: {
      dur: 0.4, ownsExit: true,
      draw(ctx, p, x) {
        ctx.save(); ctx.globalAlpha = 1 - p; x.holdA(); ctx.restore();
        x.drawB();
      }
    }
  };
  function incoming(ctx, p, x) { x.drawB(); }
  Object.keys(T).forEach(k => { T[k].name = k; });

  function get(name) {
    const t = T[name || 'mask-up'];
    if (!t) throw new Error('unknown transition "' + name + '" — use ' + Object.keys(T).join(', '));
    return t;
  }

  M.transitions = { get, list: T };
  if (typeof module !== 'undefined' && module.exports) module.exports = M.transitions;
})(typeof window !== 'undefined' ? window : globalThis);
