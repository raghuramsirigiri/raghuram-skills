/*!
 * pictures/charts.js — regular charts in the world: flat, facing the viewer,
 * in charts-lib's design system (the slide charts' colours, type and
 * strokes), filling the stage. The camera pans to them like any place.
 *
 *   compare-bars + "picture": { "chart": "columns" }   2 to 6 values in one unit, from zero
 *   compare-bars + "picture": { "chart": "funnel" }    stages that only narrow; each loss a ghost
 *   ranked-list  + "picture": { "chart": "bars" }      a ranking, largest first, rank numbers
 *   trend-line   + "picture": { "chart": "line" }      ordered time; gaps stay gaps, a forecast dashed
 *
 * Every value is labelled with its claim's own display, every name with the
 * spec's own label. Columns grow from the baseline with the value riding the
 * top; a funnel's stage narrows from the one above, leaving what was lost as
 * a ghost; bars grow from the left; the line draws left to right behind a
 * leading dot.
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  const clamp = v => (v < 0 ? 0 : v > 1 ? 1 : v);
  const sstep = (a, b, x) => { const q = clamp((x - a) / (b - a)); return q * q * (3 - 2 * q); };
  const CHARTS = {};

  // Type at the frame's step, as the slide charts set it; values a step larger.
  function type(W) {
    const d = W.design, tf = W.tf;
    return { lab: d.size.label * tf, val: d.size.value * tf * 1.2, tick: d.size.tick * tf, d };
  }
  const colorOf = (rows, r, d) => (r.emph ? d.subject : rows.some(x => x.emph) ? d.context : d.series[0]);
  // A label's lines within a width, at most n.
  function wrap(ctx, str, size, weight, font, w, n) {
    const f = M.text.font(weight, size, font);
    const lines = M.text.balance(ctx, String(str), f, w);
    return lines.length > n ? null : lines;
  }
  // How shown the place's words are: once built, while the place is in view.
  const shown = (place, W) => (W.cam ? (W.cam.view[place.id] || 0) * W.cam.labels : 1);
  const grow = (place, t, at, dur) => (place.enter ? M.ease.expoOut(clamp((t - place.enter.t0 - at) / dur)) : 1);

  // ── columns ──────────────────────────────────────────────────────────
  CHARTS.columns = {
    data: 'series', enterDur: place => 0.9 + 0.22 * (place.rows.length - 1) + 0.3,
    layout(place, box, W, ctx) {
      const Y = type(W), rows = place.rows, n = rows.length;
      const step = Math.min(box.w / n, 300), w = step * n, x0 = box.x + (box.w - w) / 2;
      const names = rows.map(r => wrap(ctx, r.label, Y.lab, 400, W.font, step - 16, 3) || [r.label]);
      const nameH = Math.max(...names.map(l => l.length)) * Y.lab * 1.25;
      const base = box.y + box.h - nameH - 14, top = box.y + Y.val * 1.3 + 12;
      const max = Math.max(...rows.map(r => r.value)) || 1;
      place.geo = { step, x0, base, top, max, barW: Math.min(step * 0.56, 170), names, box: { x: x0, y: box.y, w, h: box.h } };
    },
    draw(F, place, t, W) {
      const Y = type(W), G = place.geo, rows = place.rows, d = Y.d, a = shown(place, W);
      const show0 = place.enter ? sstep(place.enter.t0, place.enter.t0 + 0.4, t) : 1;
      F.line(G.x0, G.base, G.x0 + G.step * rows.length, G.base, d.axis, d.stroke.axis * 1.4);
      rows.forEach((r, i) => {
        const cx = G.x0 + (i + 0.5) * G.step, g = grow(place, t, 0.15 + i * 0.22, 0.9);
        const h = (G.base - G.top) * r.value / G.max * g;
        if (h > 0.5) F.rect(cx - G.barW / 2, G.base - h, G.barW, h, colorOf(rows, r, d), 3);
        F.text(r.display, cx, G.base - h - Y.val * 1.3 - 8, { size: Y.val, weight: d.weights.value, color: d.value, align: 'center', alpha: a * sstep(0.55, 1, g), id: 'v' + i, role: 'value' });
        G.names[i].forEach((ln, k) => F.text(ln, cx, G.base + 10 + k * Y.lab * 1.25, { size: Y.lab, weight: 400, color: d.label, align: 'center', alpha: a * show0, id: 'n' + i + '.' + k }));
      });
    },
    icon(F, x, y, W) { [0.45, 0.7, 1].forEach((k, i) => F.rect(x - 26 + i * 18, y + 18 - 40 * k, 12, 40 * k, i === 2 ? W.design.subject : W.design.context, 2)); }
  };

  // ── funnel ───────────────────────────────────────────────────────────
  CHARTS.funnel = {
    data: 'stages', enterDur: place => 0.9 + 0.75 * (place.rows.length - 1) + 0.4,
    layout(place, box, W, ctx) {
      const Y = type(W), rows = place.rows, n = rows.length;
      for (let i = 1; i < n; i++) if (rows[i].value > rows[i - 1].value) throw new Error('funnel: each stage must be no larger than the one before ("' + rows[i].label + '" grows)');
      const textH = Y.val * 1.35, rowH = Math.min(box.h / n, 230);
      const barH = Math.max(28, Math.min(rowH - textH - 26, 96)), used = rowH * n;
      const maxW = Math.min(box.w, 920), cx = box.x + box.w / 2, y0 = box.y + (box.h - used) / 2;
      place.geo = { rowH, barH, textH, maxW, cx, y0, max: rows[0].value || 1, box: { x: cx - maxW / 2, y: y0, w: maxW, h: used } };
    },
    draw(F, place, t, W) {
      const Y = type(W), G = place.geo, rows = place.rows, d = Y.d, a = shown(place, W), mix = M.design.mix;
      const ghost = mix(d.bg, d.context, 0.38);
      rows.forEach((r, i) => {
        const y = G.y0 + i * G.rowH, by = y + G.textH + 8, w = G.maxW * r.value / G.max;
        const start = 0.1 + i * 0.75;
        let bw;
        if (i === 0) bw = w * grow(place, t, start, 0.8);
        else {
          const prev = G.maxW * rows[i - 1].value / G.max;
          const appear = grow(place, t, start, 0.35), narrow = place.enter ? M.ease.outQuint(clamp((t - place.enter.t0 - start - 0.35) / 0.8)) : 1;
          if (appear <= 0.001) return;
          // What this stage lost, a ghost at the width of the stage before.
          F.rect(G.cx - prev / 2, by, prev, G.barH, ghost, 3);
          bw = prev + (w - prev) * narrow;
          if (narrow < 0.02) bw = prev * appear;
        }
        if (bw > 0.5) F.rect(G.cx - bw / 2, by, bw, G.barH, colorOf(rows, r, d), 3);
        const ta = a * (place.enter ? sstep(place.enter.t0 + start + (i ? 0.9 : 0.5), place.enter.t0 + start + (i ? 1.2 : 0.8), t) : 1);
        const vw = F.measure(r.display, Y.val, d.weights.value), nw = F.measure(r.label, Y.lab, 400), gap = Y.lab * 0.5;
        const x = G.cx - (vw + gap + nw) / 2;
        F.text(r.display, x, y, { size: Y.val, weight: d.weights.value, color: d.value, alpha: ta, id: 'v' + i, role: 'value' });
        F.text(r.label, x + vw + gap, y + (Y.val - Y.lab) * 0.62, { size: Y.lab, weight: 400, color: d.label, alpha: ta, id: 'n' + i });
      });
    },
    icon(F, x, y, W) { [1, 0.66, 0.4].forEach((k, i) => F.rect(x - 28 * k, y - 18 + i * 14, 56 * k, 10, W.design.context, 2)); }
  };

  // ── bars: a ranking ──────────────────────────────────────────────────
  CHARTS.bars = {
    data: 'ranking', enterDur: place => 0.9 + 0.18 * (place.rows.length - 1) + 0.3,
    layout(place, box, W, ctx) {
      const Y = type(W), rows = place.rows, n = rows.length;
      for (let i = 1; i < n; i++) if (rows[i].value > rows[i - 1].value) throw new Error('bars: rows must be in rank order, largest first ("' + rows[i].label + '" is larger than "' + rows[i - 1].label + '")');
      const labH = Y.lab * 1.3, rowH = Math.min(box.h / n, 170);
      const barH = Math.max(22, Math.min(rowH - labH - 22, 66)), used = rowH * n;
      const rankW = F0(ctx, String(n), Y.val, W) + 22;
      const valW = Math.max(...rows.map(r => F0(ctx, r.display, Y.val, W))) + 16;
      const w = Math.min(box.w, 980), x0 = box.x + (box.w - w) / 2, y0 = box.y + (box.h - used) / 2;
      place.geo = { rowH, barH, labH, rankW, valW, x0, y0, w, maxW: w - rankW - valW, max: rows[0].value || 1, box: { x: x0, y: y0, w, h: used } };
    },
    draw(F, place, t, W) {
      const Y = type(W), G = place.geo, rows = place.rows, d = Y.d, a = shown(place, W);
      rows.forEach((r, i) => {
        const y = G.y0 + i * G.rowH, x = G.x0 + G.rankW, g = grow(place, t, 0.15 + i * 0.18, 0.9);
        const la = a * (place.enter ? sstep(place.enter.t0 + 0.05 + i * 0.18, place.enter.t0 + 0.45 + i * 0.18, t) : 1);
        F.text(String(i + 1), G.x0, y + G.labH + 2 + (G.barH - Y.val * 1.25) / 2, { size: Y.val, weight: d.weights.value, color: d.muted, alpha: la, id: 'r' + i });
        F.text(r.label, x, y, { size: Y.lab, weight: 400, color: d.label, alpha: la, id: 'n' + i });
        const w = Math.max(3, G.maxW * r.value / G.max) * g;
        F.rect(x, y + G.labH + 2, w, G.barH, colorOf(rows, r, d), 3);
        F.text(r.display, x + w + 10, y + G.labH + 2 + (G.barH - Y.val * 1.25) / 2, { size: Y.val, weight: d.weights.value, color: d.value, alpha: a * sstep(0.6, 1, g), id: 'v' + i, role: 'value' });
      });
    },
    icon(F, x, y, W) { [1, 0.7, 0.45].forEach((k, i) => F.rect(x - 28, y - 18 + i * 14, 56 * k, 10, i === 0 ? W.design.subject : W.design.context, 2)); }
  };
  function F0(ctx, s, size, W) { return M.text.measure(ctx, s, M.text.font(W.design.weights.value, size, W.font)); }

  // ── line: ordered time ───────────────────────────────────────────────
  CHARTS.line = {
    data: 'line', enterDur: place => Math.min(2.6, 1.0 + place.line.y.length * 0.08),
    layout(place, box, W, ctx) {
      const Y = type(W), D = place.line, d = Y.d;
      const vals = D.y.filter(v => v != null);
      if (vals.length < 2) throw new Error('line: needs at least two values that are not gaps');
      const min = Math.min(...vals), max = Math.max(...vals);
      const lo0 = min >= 0 && min < 0.4 * max ? 0 : min;
      const ticks = M.chart.niceTicks(lo0, max, box.h > 520 ? 4 : 3);
      const tl = ticks.map(v => M.chart.tickLabel(v, W.locale, D.unit));
      const tf = M.text.font(d.weights.tick, Y.tick, W.font);
      const yLabW = Math.max(...tl.map(l => M.text.measure(ctx, l, tf))) + 14;
      const end = D.end ? D.end.display : null;
      const endW = end ? M.text.measure(ctx, end, M.text.font(d.weights.value, Y.val, W.font)) + 18 : 10;
      const px = box.x + yLabW, pw = Math.max(80, box.w - yLabW - endW), py = box.y + Y.tick, ph = Math.max(80, box.h - Y.tick * 3.2);
      const n = D.x.length, lo = ticks[0], hi = ticks[ticks.length - 1];
      const X = i => px + (n === 1 ? 0 : i / (n - 1)) * pw, Yv = v => py + ph - (v - lo) / (hi - lo || 1) * ph;
      const xw = D.x.map(x => M.text.measure(ctx, String(x), tf));
      const at = i => (i === 0 ? X(0) : i === n - 1 ? X(n - 1) - xw[i] : X(i) - xw[i] / 2);
      const xIdx = [0];
      for (let i = 1; i < n - 1; i++) { const p = xIdx[xIdx.length - 1]; if (at(i) >= at(p) + xw[p] + 18 && at(i) + xw[i] + 18 <= at(n - 1)) xIdx.push(i); }
      if (n > 1) { while (xIdx.length > 1 && at(xIdx[xIdx.length - 1]) + xw[xIdx[xIdx.length - 1]] + 18 > at(n - 1)) xIdx.pop(); xIdx.push(n - 1); }
      place.geo = { ticks, tl, px, pw, py, ph, X, Yv, xIdx, xw, at, end, box: { x: box.x, y: box.y, w: box.w, h: box.h } };
    },
    draw(F, place, t, W) {
      const Y = type(W), G = place.geo, D = place.line, d = Y.d, a = shown(place, W), n = D.x.length;
      const ax = place.enter ? sstep(place.enter.t0, place.enter.t0 + 0.5, t) : 1;
      G.ticks.forEach((v, i) => {
        const y = G.Yv(v);
        if (ax > 0.01) F.line(G.px, y, G.px + G.pw, y, d.grid, d.stroke.grid);
        F.text(G.tl[i], G.px - 14, y - Y.tick * 0.62, { size: Y.tick, weight: d.weights.tick, color: d.tick, align: 'right', alpha: a * ax, id: 't' + i, role: 'tick' });
      });
      F.line(G.px, G.py + G.ph, G.px + G.pw, G.py + G.ph, d.axis, d.stroke.axis);
      G.xIdx.forEach(i => F.text(String(D.x[i]), G.at(i), G.py + G.ph + 10, { size: Y.tick, weight: d.weights.tick, color: d.tick, alpha: a * ax, id: 'x' + i, role: 'tick' }));
      const p = place.enter ? M.ease.sineInOut(clamp((t - place.enter.t0 - 0.4) / Math.max(0.6, place.enter.dur - 0.7))) : 1;
      const pts = D.y.map((v, i) => (v == null ? null : [G.X(i), G.Yv(v)]));
      const ff = D.forecastFrom, hl = D.highlight, base = hl ? d.context : d.series[0];
      const sub = (from, to) => pts.map((q, i) => (i >= from && i <= to ? q : null));
      const measured = ff != null ? ff : n - 1;
      const tip = F.path(sub(0, measured), p, base, d.stroke.line * 1.3);
      if (ff != null) F.path(sub(ff, n - 1), p, base, d.stroke.line * 1.3, [d.stroke.line * 2.2, d.stroke.line * 1.6]);
      if (hl) F.path(sub(hl[0], Math.min(hl[1], measured)), p, d.subject, d.stroke.line * 1.3);
      if (tip && p < 1) F.dot(tip[0], tip[1], d.stroke.line * 1.9, base);
      const last = pts[n - 1];
      if (last && p >= 1) {
        F.dot(last[0], last[1], d.stroke.line * 2, hl && hl[1] >= n - 1 ? d.subject : base);
        if (G.end) F.text(G.end, last[0] + 14, last[1] - Y.val * 0.66, { size: Y.val, weight: d.weights.value, color: d.value, alpha: a * sstep(place.enter.t0 + place.enter.dur - 0.3, place.enter.t0 + place.enter.dur, t), id: 'end', role: 'value' });
      }
    },
    icon(F, x, y, W) { F.path([[x - 28, y + 12], [x - 10, y], [x + 6, y + 6], [x + 28, y - 16]], 1, W.design.series[0], 5); }
  };

  M.charts = CHARTS;
})(typeof window !== 'undefined' ? window : globalThis);
