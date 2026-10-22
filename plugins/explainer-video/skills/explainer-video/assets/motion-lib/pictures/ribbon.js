/*!
 * pictures/ribbon.js — a series over ordered time, as a ribbon standing
 * over a plate: it draws itself left to right at the height of each value.
 * A gap (null) is a gap, never a zero. Points from the table's
 * `forecastFrom` are ghosted; a `highlight` stretch takes the accent and the
 * rest go neutral. The end value is labelled with its claim. When the
 * baseline isn't zero, a scale post at the start says what the bottom and
 * top of the ribbon stand for; when it is, a faint curtain falls to the
 * plate.
 *
 *   trend-line + "picture": { "kind": "ribbon" }   (the default for a trend line)
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  const COS = 0.8660254, H = 320, PLATE = 8, DEPTH = 20, LIFT = 24, FACE = 16;

  const lab = () => M.world.LABEL;
  const along = (place, o) => ({ x: place.x + o / (2 * COS), y: place.y - o / (2 * COS) });
  const lenOf = n => Math.min(780, Math.max(420, n * 60));

  M.pictures.register({
    kind: 'ribbon', data: true, series: true, enterAt: 0.15,
    enterDur: place => Math.min(2.4, 0.8 + place.line.y.length * 0.08),
    prepare(place, it) {
      const L = it.built.line;
      if (!L) throw new Error('ribbon: draws a trend-line\'s data table');
      const vals = L.y.filter(v => v != null);
      if (vals.length < 2) throw new Error('ribbon: needs at least two values that are not gaps');
      const min = Math.min(...vals), max = Math.max(...vals);
      // The slide's rule: start from zero unless the values sit far above it.
      const lo0 = min >= 0 && min < 0.4 * max ? 0 : min;
      const ticks = M.chart.niceTicks(lo0, max, 3);
      place.line = L; place.lo = ticks[0]; place.hi = ticks[ticks.length - 1];
    },
    footprint: () => ({ w: 0, d: 0, h: 0 }),
    geo(place, s) {
      const n = place.line.y.length, len = lenOf(n) * s, L = lab();
      return { x0: -len / 2 - (place.lo !== 0 ? L * 3.2 : 20), x1: len / 2 + L * 4, y0: -(H + PLATE + LIFT) * s - L * 1.6, y1: (DEPTH + 30) * s + L * 1.6 };
    },
    draw(V, place, t, W) {
      const m = W.mat, Ln = place.line, n = Ln.y.length, len = lenOf(n), ctx = V.ctx;
      const z = v => PLATE + LIFT + H * (v - place.lo) / (place.hi - place.lo || 1);
      const pt = i => { const p = along(place, -len / 2 + i * len / (n - 1)); return { x: p.x, y: p.y, z: Ln.y[i] == null ? null : z(Ln.y[i]) }; };
      const show = place.enter ? M.world.clamp((t - place.enter.t0) / place.enter.dur) : 1;
      const labels = W.cam ? (W.cam.view[place.id] || 0) * W.cam.labels : 1;
      // The plate, its edges along the screen row.
      const c = (o, d, zz) => { const p = along(place, o); return [p.x + d, p.y + d, zz]; };
      const Ls = len / 2 + 30, Ds = DEPTH + 24;
      V.quad(c(-Ls, -Ds, PLATE), c(Ls, -Ds, PLATE), c(Ls, Ds, PLATE), c(-Ls, Ds, PLATE), m.N.top);
      V.quad(c(-Ls, Ds, PLATE), c(Ls, Ds, PLATE), c(Ls, Ds, 0), c(-Ls, Ds, 0), m.N2.left);
      const hl = Ln.highlight, ff = Ln.forecastFrom;
      const tone = i => (hl ? (i >= hl[0] && i < hl[1] ? m.A : m.N2) : m.A);
      // Segments drawn up to the reveal, left to right.
      const upto = show * (n - 1);
      // Light posts stand each value on the plate, as the ribbon passes them.
      for (let i = 0; i < n; i++) {
        const p = pt(i);
        if (p.z == null || i > upto + 1e-6) continue;
        ctx.save(); if (ff != null && i >= ff) ctx.globalAlpha *= 0.45;
        V.box(p.x + DEPTH / 2 - 3, p.y + DEPTH / 2 - 3, PLATE, 6, 6, Math.max(0, p.z - FACE - PLATE), m.N);
        ctx.restore();
      }
      for (let i = 0; i < n - 1; i++) {
        const a = pt(i), b0 = pt(i + 1);
        if (a.z == null || b0.z == null || i >= upto) continue;
        const k = Math.min(1, upto - i);
        const b = { x: a.x + (b0.x - a.x) * k, y: a.y + (b0.y - a.y) * k, z: a.z + (b0.z - a.z) * k };
        const ghost = ff != null && i + 1 > ff;
        ctx.save();
        if (ghost) ctx.globalAlpha *= 0.45;
        if (place.lo === 0) {
          // A faint curtain to the plate: the area under a line that starts at zero.
          ctx.save(); ctx.globalAlpha *= 0.12;
          V.quad([a.x + DEPTH, a.y + DEPTH, PLATE], [b.x + DEPTH, b.y + DEPTH, PLATE], [b.x + DEPTH, b.y + DEPTH, b.z], [a.x + DEPTH, a.y + DEPTH, a.z], m.A.left);
          ctx.restore();
        }
        const T = tone(i);
        V.quad([a.x, a.y, a.z], [b.x, b.y, b.z], [b.x + DEPTH, b.y + DEPTH, b.z], [a.x + DEPTH, a.y + DEPTH, a.z], T.top);
        V.quad([a.x + DEPTH, a.y + DEPTH, a.z], [b.x + DEPTH, b.y + DEPTH, b.z], [b.x + DEPTH, b.y + DEPTH, b.z - FACE], [a.x + DEPTH, a.y + DEPTH, a.z - FACE], T.left);
        ctx.restore();
      }
      // The end: a marker and its value, once the ribbon reaches it.
      const last = (() => { for (let i = n - 1; i >= 0; i--) if (Ln.y[i] != null) return i; return -1; })();
      const reached = M.world.sstep(last - 0.2, last, upto);
      if (last >= 0 && reached > 0.001) {
        const e = pt(last);
        ctx.save(); ctx.globalAlpha *= reached;
        V.token(e.x + DEPTH / 2, e.y + DEPTH / 2, e.z - 4, 9, 10, m.A.top, m.A.left);
        ctx.restore();
        if (Ln.end) {
          const [ex, ey] = V.P(e.x + DEPTH / 2, e.y + DEPTH / 2, e.z + 6);
          text(V, place, W, Ln.end.display, ex + 22 * V.s, ey - lab() * 0.7, 700, reached * labels, 'end');
        }
      }
      // The first and last x labels under the plate.
      [0, n - 1].forEach((i, k) => {
        const p = along(place, -len / 2 + i * len / (n - 1));
        const [fx, fy] = V.P(p.x + Ds, p.y + Ds, 0);
        const f = M.text.font(400, lab(), W.font), w = M.text.measure(ctx, String(Ln.x[i]), f);
        text(V, place, W, String(Ln.x[i]), k === 0 ? fx - w * 0.2 : fx - w * 0.8, fy + 10, 400, M.world.sstep(0, 0.3, show) * labels, 'x' + k);
      });
      // A baseline that isn't zero is said on a scale post at the start.
      if (place.lo !== 0) {
        const p = along(place, -len / 2 - 22);
        V.box(p.x - 3, p.y - 3, PLATE, 6, 6, z(place.hi) - PLATE, m.N2);
        [place.lo, place.hi].map(v => [v, M.chart.tickLabel(v, W.locale, Ln.unit)]).forEach(([v, s0], k) => {
          const [tx, ty] = V.P(p.x, p.y, z(v));
          const f = M.text.font(400, lab() * 0.87, W.font), w = M.text.measure(ctx, s0, f);
          text(V, place, W, s0, tx - w - 12 * V.s, ty - lab() * 0.5, 400, M.world.sstep(0, 0.3, show) * labels, 't' + k, lab() * 0.87);
        });
      }
    },
    icon(V, place, W) {
      const m = W.mat;
      [[-30, 8], [-10, 18], [10, 12], [30, 30]].reduce((a, b) => { V.quad([a[0], -a[0], a[1]], [b[0], -b[0], b[1]], [b[0] + 6, -b[0] + 6, b[1]], [a[0] + 6, -a[0] + 6, a[1]], m.A.top); return b; });
    }
  });

  function text(V, place, W, str, x, y, weight, alpha, id, size) {
    if (alpha <= 0.001) return;
    const sz = size || lab(), f = M.text.font(weight, sz, W.font), w = M.text.measure(V.ctx, str, f);
    M.paint.text(V.ctx, str, x, y, { font: f, color: W.mat.ink, h: sz * 1.2, w, alpha, layer: 'world-label:' + place.id + ':' + id, role: 'label', size: sz });
  }
})(typeof window !== 'undefined' ? window : globalThis);
