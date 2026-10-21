/*!
 * motion-lib/ease.js — closed-form easing. Every function is pure: give it
 * the same time and it gives back the same value, whatever frame came before.
 *
 * Data never overshoots. A bar, a line or a counter uses `spring` at zeta = 1
 * (critically damped) or `expoOut`: a bar that bounces past its value shows a
 * false number for a few frames. A tiny overshoot (zeta about 0.8) is for
 * non-data shapes only.
 */
(function (root) {
  'use strict';
  const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);

  // Critically damped: 1 - (1 + w t) e^(-w t). Underdamped closed form for zeta < 1.
  function spring(t, o) {
    const w = (o && o.w) || 20, z = o && o.zeta != null ? o.zeta : 1;
    if (t <= 0) return 0;
    if (z >= 1) return 1 - (1 + w * t) * Math.exp(-w * t);
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
  }

  // One spring response per target change, summed: retargeting stays a pure
  // function of time. changes: [{ t, from, to }] in time order.
  function springSum(t, changes, o) {
    if (!changes.length) return 0;
    let v = changes[0].from;
    for (const c of changes) v += (c.to - c.from) * spring(t - c.t, o);
    return v;
  }

  const expoIn = t => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, 10 * t - 10));
  const expoOut = t => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
  const expoInOut = t => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2);
  const linear = t => clamp01(t);
  const cubicOut = t => 1 - Math.pow(1 - clamp01(t), 3);
  const sineInOut = t => -(Math.cos(Math.PI * clamp01(t)) - 1) / 2;

  // CSS-style cubic-bezier, Newton then bisection on x.
  function cubicBezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = u => ((ax * u + bx) * u + cx) * u;
    const sy = u => ((ay * u + by) * u + cy) * u;
    const dx = u => (3 * ax * u + 2 * bx) * u + cx;
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let u = x;
      for (let i = 0; i < 8; i++) {
        const e = sx(u) - x, d = dx(u);
        if (Math.abs(e) < 1e-7) return sy(u);
        if (Math.abs(d) < 1e-6) break;
        u -= e / d;
      }
      let lo = 0, hi = 1;
      u = x;
      for (let i = 0; i < 40; i++) {
        const v = sx(u);
        if (Math.abs(v - x) < 1e-7) break;
        if (v < x) lo = u; else hi = u;
        u = (lo + hi) / 2;
      }
      return sy(u);
    };
  }

  const outQuint = cubicBezier(0.16, 1, 0.3, 1);   // entrances
  const glide = cubicBezier(0.45, 0, 0.15, 1);     // morphs, the through-line
  // Ease an iris by area, not radius, or its first frames jump.
  const areaEase = (t, base) => Math.sqrt((base || expoInOut)(clamp01(t)));

  const named = { linear, expoIn, expoOut, expoInOut, cubicOut, sineInOut, outQuint, glide };
  function get(name) {
    if (typeof name === 'function') return name;
    return named[name] || outQuint;
  }

  const api = { spring, springSum, expoIn, expoOut, expoInOut, linear, cubicOut, sineInOut, cubicBezier, outQuint, glide, areaEase, clamp01, get, named };
  const M = root.Motion = root.Motion || {};
  M.ease = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
