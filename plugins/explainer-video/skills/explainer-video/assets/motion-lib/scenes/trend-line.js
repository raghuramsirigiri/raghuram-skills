/*!
 * scenes/trend-line.js — change over ordered time. The line draws left to
 * right; a missing value is a gap, never a zero; forecast points are dashed.
 * The end value is a claim, drawn beside the last point.
 *
 *   "data": [ { "id": "D1", "source": "A", "locator": "table 2", "unit": "days",
 *               "x": ["Jan 2025", ...], "y": [41, null, ...], "forecastFrom": null } ]
 *   { "type": "trend-line", "copy": { "kicker", "title", "units" },
 *     "series": "D1", "end": "F5", "highlight": [14, 17] }
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  M.registerScene({
    type: 'trend-line',
    slots: { kicker: { words: 4 }, title: { words: 10, required: true }, units: { words: 8 } },
    data: 'series: id of a data table with ordered x and y (null = gap); end?: claim id; highlight?: [from, to]',
    build(s, api) {
      const d = api.design, T = api.T, ctx = api.ctx, K = M.layout.K;
      const D = api.R.data[s.series];
      if (!D) throw new Error('series: no data table "' + s.series + '"');
      if (!Array.isArray(D.x) || !Array.isArray(D.y) || D.x.length !== D.y.length || D.x.length < 3) {
        throw new Error('data "' + D.id + '": x and y must be arrays of the same length, at least 3');
      }
      const endClaim = s.end ? api.claim(String(s.end).replace(/[{}]/g, '')) : null;
      // The source line names the claims' sources and the table's own.
      const c = M.card(api, {
        kicker: api.copy('kicker'), headline: api.copy('title'), units: api.copy('units'), chart: true,
        sourceIds: api.used(), sources: D.source ? [D.source] : []
      });
      const box = c.chart;
      api.reserved.push(box);   // the plot is data area: no art in it
      const vals = D.y.filter(v => v != null);
      const min = Math.min(...vals), max = Math.max(...vals);
      const lo0 = min >= 0 && min < 0.4 * max ? 0 : min;
      const ticks = M.chart.niceTicks(lo0, max, box.h > 500 ? 4 : 3);
      const lo = ticks[0], hi = ticks[ticks.length - 1];
      const tickF = T.font(d.weights.tick, d.size.tick, d.font);
      const labels = ticks.map(v => M.chart.tickLabel(v, api.spec.meta.locale, D.unit));
      const yLabW = Math.max(...labels.map(l => T.measure(ctx, l, tickF))) + 6 * K;
      const valF = T.font(d.weights.value, d.size.value, d.font);
      const endDisp = endClaim ? (endClaim.display != null ? endClaim.display : String(endClaim.value)) : null;
      const endW = endDisp ? T.measure(ctx, endDisp, valF) + 8 * K : 6 * K;
      const xLabH = d.size.tick * 1.6;
      const px = box.x + yLabW, pw = Math.max(50, box.w - yLabW - endW);
      const py = box.y + d.size.tick * 0.7, ph = Math.max(50, box.h - xLabH - d.size.tick * 0.7);
      const n = D.x.length;
      const X = i => px + (n === 1 ? 0 : i / (n - 1)) * pw;
      const Y = v => py + ph - (v - lo) / (hi - lo || 1) * ph;
      const pts = D.y.map((v, i) => (v == null ? null : [X(i), Y(v)]));
      const ff = D.forecastFrom != null ? D.forecastFrom : null;
      const hl = Array.isArray(s.highlight) ? s.highlight : null;
      const base = hl ? d.context : d.series[0];

      // x labels: the first sits left-aligned on its point, the last right-aligned,
      // the rest centred; a label that would touch its neighbour is dropped.
      const xw = D.x.map(x => T.measure(ctx, String(x), tickF));
      const lab = i => (i === 0 ? X(0) : i === n - 1 ? X(n - 1) - xw[i] : X(i) - xw[i] / 2);
      const gapX = 8 * K;
      const xIdx = [0];
      for (let i = 1; i < n - 1; i++) {
        const prev = xIdx[xIdx.length - 1];
        if (lab(i) >= lab(prev) + xw[prev] + gapX && lab(i) + xw[i] + gapX <= lab(n - 1)) xIdx.push(i);
      }
      if (lab(n - 1) >= lab(0) + xw[0] + gapX) {
        // Keep the last; drop the one before it if they touch.
        while (xIdx.length > 1 && lab(xIdx[xIdx.length - 1]) + xw[xIdx[xIdx.length - 1]] + gapX > lab(n - 1)) xIdx.pop();
        xIdx.push(n - 1);
      }

      const layers = c.layers.slice();
      // Grid, ticks and baseline.
      layers.push({ kind: 'draw', id: 'axes', at: 0.55, dur: 0.5, fn(cx, p) {
        cx.save();
        cx.globalAlpha *= p;
        ticks.forEach((v, i) => {
          const y = Y(v);
          M.paint.line(cx, px, y, px + pw, y, d.grid, d.stroke.grid);
          M.paint.text(cx, labels[i], box.x, y - d.size.tick * 0.65, { font: tickF, color: d.tick, h: d.size.tick * 1.3, layer: 'tick-' + i, role: 'tick', size: d.size.tick });
        });
        M.paint.line(cx, px, py + ph, px + pw, py + ph, d.axis, d.stroke.axis);
        xIdx.forEach(i => {
          const x = X(i);
          M.paint.line(cx, x, py + ph, x, py + ph + d.stroke.tickLen, d.axis, d.stroke.tick);
          M.paint.text(cx, String(D.x[i]), lab(i), py + ph + d.stroke.tickLen + 2, { w: xw[i], font: tickF, color: d.tick, h: d.size.tick * 1.3, layer: 'x-' + i, role: 'tick', size: d.size.tick });
        });
        cx.restore();
      } });

      // The line, drawn left to right; highlight and forecast as their own strokes.
      const LINE_AT = 0.85, LINE_DUR = 1.4;
      layers.push({ kind: 'draw', id: 'line', at: LINE_AT, dur: LINE_DUR, ease: 'sineInOut', fn(cx, p) {
        const xEnd = px + pw * p;
        const sub = (from, to) => pts.map((pt, i) => (i >= from && i <= to ? pt : null));
        const stroke = (arr, color, dash) => {
          const flat = arr.filter(Boolean);
          if (flat.length < 2) return null;
          const a = flat[0][0], b = flat[flat.length - 1][0];
          if (xEnd <= a) return null;
          return M.paint.polyline(cx, arr, (xEnd - a) / (b - a || 1), color, d.stroke.line, dash);
        };
        const measuredTo = ff != null ? ff : n - 1;
        stroke(sub(0, measuredTo), base);
        if (ff != null) stroke(sub(ff, n - 1), base, [d.stroke.line * 2.2, d.stroke.line * 1.6]);
        if (hl) stroke(sub(hl[0], Math.min(hl[1], measuredTo)), d.subject);
      } });

      // End dot and end value.
      const last = pts[n - 1];
      if (last) {
        const endColor = hl && hl[1] >= n - 1 ? d.subject : base;
        layers.push({ kind: 'draw', id: 'end-dot', at: LINE_AT + LINE_DUR - 0.05, dur: 0.3, fn(cx, p) {
          M.paint.dot(cx, last[0], last[1], d.stroke.line * 1.4 * M.ease.outQuint(p), endColor);
        } });
        if (endDisp) {
          layers.push({ kind: 'text', id: 'end-value', role: 'value', font: valF, size: d.size.value, color: d.value, reveal: 'fade',
            lines: T.place(ctx, [endDisp], valF, last[0] + 4 * K, last[1] - d.size.value * 0.65, d.size.value * 1.3, 'left', endW),
            at: LINE_AT + LINE_DUR, dur: 0.4 });
        }
      }
      const read = M.readTime(c.primaryWords) + 0.15 * (c.words - c.primaryWords) + 0.8;
      return { layers, rule: c.rule, read };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
