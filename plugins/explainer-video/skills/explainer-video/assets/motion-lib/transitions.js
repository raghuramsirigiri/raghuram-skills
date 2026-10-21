/*!
 * motion-lib/transitions.js — what happens between two scenes.
 *
 * A transition runs over the overlap between the outgoing scene's tail and
 * the incoming scene's head. During it the through-line bar glides from the
 * outgoing scene's position to the incoming one's. Transitions that own the
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
      draw(ctx, p, x) { x.drawB(); x.drawRule(x.B.rule); }
    },
    // Line reveals: the incoming text rises (or slides) through a mask. The
    // transition itself is the bar's glide.
    'mask-up': { dur: 0.4, ownsExit: false, reveal: 'mask-up', draw: glideOnly },
    'mask-left': { dur: 0.4, ownsExit: false, reveal: 'mask-left', draw: glideOnly },
    'morph-bar': {
      dur: 0.55, ownsExit: false,
      draw(ctx, p, x) {
        // The bar stretches across the safe width at mid-transition, then settles.
        const C = x.C, r = x.rule;
        if (!r) return glideOnly(ctx, p, x);
        const s = Math.sin(Math.PI * p);
        const w = r.w + (C.safe.w - r.w) * s * 0.6;
        x.drawB();
        x.drawRule({ x: r.x, y: r.y, w, h: r.h });
      }
    },
    flood: {
      dur: 0.6, ownsExit: true,
      draw(ctx, p, x) {
        // An accent shape floods the frame with a hard edge, then recedes the
        // same way, leaving the incoming scene.
        const C = x.C;
        const e = M.ease.expoInOut(p);
        if (p < 0.5) { x.holdA(); x.drawRule(x.A.rule); } else { x.drawB(); x.drawRule(x.B.rule); }
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
        ctx.save(); M.paint.clipRect(ctx, 0, y, C.W, C.H - y); x.holdA(); x.drawRule(x.A.rule); ctx.restore();
        ctx.save(); M.paint.clipRect(ctx, 0, 0, C.W, y); x.background(); x.drawB(); x.drawRule(x.B.rule); ctx.restore();
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
        x.drawRule(x.rule);
      }
    },
    fade: {
      dur: 0.4, ownsExit: true,
      draw(ctx, p, x) {
        ctx.save(); ctx.globalAlpha = 1 - p; x.holdA(); ctx.restore();
        x.drawB(); x.drawRule(x.rule);
      }
    }
  };
  function glideOnly(ctx, p, x) { x.drawB(); x.drawRule(x.rule); }
  Object.keys(T).forEach(k => { T[k].name = k; });

  function get(name) {
    const t = T[name || 'mask-up'];
    if (!t) throw new Error('unknown transition "' + name + '" — use ' + Object.keys(T).join(', '));
    return t;
  }

  M.transitions = { get, list: T };
  if (typeof module !== 'undefined' && module.exports) module.exports = M.transitions;
})(typeof window !== 'undefined' ? window : globalThis);
