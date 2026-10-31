/*!
 * scenes/beat.js — one beat of the card layer. The card sits still over the
 * stage for the whole video: the accent bar, the kicker line and the footer
 * are the shared frame (core.js), and the headline and units always start in
 * the same place. Only the words change from beat to beat.
 *
 *   { "id": "e2", "type": "beat",
 *     "copy": { "kicker": "1934", "title": "A closed steel body reached {F3}", "units": "Top speed",
 *               "value": "F3" },
 *     "chart": { "kind": "bars", "bars": [ { "label": "1912", "value": "F1" }, … ] },
 *     "stage": { "state": "saloon", "zoom": 1.2 } }
 *
 * Under the units, a beat may carry one figure (`copy.value`, a counter that
 * lands on the claim's display) or one flat chart (`chart`: `bars` for two to
 * six values in one unit, `line` for an ordered series from `data`), never
 * both. A quote beat sets `copy.quote` (a claim marked quote) and `copy.name`.
 * The stage takes the room the card leaves (stage.js); its directions are
 * read by the story's shape, not here.
 */
(function (root) {
  'use strict';
  const M = root.Motion;

  // The words' column: the full safe width, or the left share of a wide frame.
  function column(F) {
    const S = F.safe;
    return F.cls === 'wide' ? Math.round(S.w * M.layout.PROFILE.wide.col) : S.w;
  }

  // A flat line chart in box: an ordered series, a gap where y is null,
  // forecast points dashed, the end value (a claim) beside the last point.
  function lineChart(api, box, D, endClaim, at) {
    const d = api.design, T = api.T, ctx = api.ctx, K = M.layout.K;
    if (!Array.isArray(D.x) || !Array.isArray(D.y) || D.x.length !== D.y.length || D.x.length < 3) {
      throw new Error('data "' + D.id + '": x and y must be arrays of the same length, at least 3');
    }
    const vals = D.y.filter(v => v != null);
    const min = Math.min(...vals), max = Math.max(...vals);
    const ticks = M.chart.niceTicks(min >= 0 && min < 0.4 * max ? 0 : min, max, 3);
    const lo = ticks[0], hi = ticks[ticks.length - 1];
    const tickF = T.font(d.weights.tick, d.size.tick, d.font);
    const labels = ticks.map(v => M.chart.tickLabel(v, api.spec.meta.locale, D.unit));
    const yLabW = Math.max(...labels.map(l => T.measure(ctx, l, tickF))) + 6 * K;
    const valF = T.font(d.weights.value, d.size.value, d.font);
    const endDisp = endClaim ? (endClaim.display != null ? endClaim.display : String(endClaim.value)) : null;
    const endW = endDisp ? T.measure(ctx, endDisp, valF) + 8 * K : 6 * K;
    const px = box.x + yLabW, pw = Math.max(50, box.w - yLabW - endW);
    const py = box.y + d.size.tick * 0.7, ph = Math.max(50, box.h - d.size.tick * 2.3);
    const n = D.x.length;
    const X = i => px + i / (n - 1) * pw;
    const Y = v => py + ph - (v - lo) / (hi - lo || 1) * ph;
    const pts = D.y.map((v, i) => (v == null ? null : [X(i), Y(v)]));
    const ff = D.forecastFrom != null ? D.forecastFrom : null;
    const xs = [0, n - 1];
    const layers = [];
    layers.push({ kind: 'draw', id: 'axes', at, dur: 0.5, fn(cx, p) {
      cx.save(); cx.globalAlpha *= p;
      ticks.forEach((v, i) => {
        M.paint.line(cx, px, Y(v), px + pw, Y(v), d.grid, d.stroke.grid);
        M.paint.text(cx, labels[i], box.x, Y(v) - d.size.tick * 0.65, { font: tickF, color: d.tick, h: d.size.tick * 1.3, layer: 'tick-' + i, role: 'tick', size: d.size.tick });
      });
      M.paint.line(cx, px, py + ph, px + pw, py + ph, d.axis, d.stroke.axis);
      xs.forEach(i => {
        const w = T.measure(cx, String(D.x[i]), tickF), x = i === 0 ? X(0) : X(n - 1) - w;
        M.paint.text(cx, String(D.x[i]), x, py + ph + d.stroke.tickLen + 2, { w, font: tickF, color: d.tick, h: d.size.tick * 1.3, layer: 'x-' + i, role: 'tick', size: d.size.tick });
      });
      cx.restore();
    } });
    const LINE_DUR = 1.3;
    layers.push({ kind: 'draw', id: 'line', at: at + 0.3, dur: LINE_DUR, ease: 'sineInOut', fn(cx, p) {
      const sub = (a, b) => pts.map((pt, i) => (i >= a && i <= b ? pt : null));
      const stroke = (arr, dash) => { if (arr.filter(Boolean).length >= 2) M.paint.polyline(cx, arr, p, d.subject, d.stroke.line, dash); };
      stroke(sub(0, ff != null ? ff : n - 1));
      if (ff != null) stroke(sub(ff, n - 1), [d.stroke.line * 2.2, d.stroke.line * 1.6]);
    } });
    const last = pts[n - 1];
    if (last && endDisp) {
      layers.push({ kind: 'text', id: 'end-value', role: 'value', font: valF, size: d.size.value, color: d.value, reveal: 'fade',
        lines: T.place(ctx, [endDisp], valF, last[0] + 4 * K, last[1] - d.size.value * 0.65, d.size.value * 1.3, 'left', endW),
        at: at + 0.3 + LINE_DUR, dur: 0.4 });
    }
    return layers;
  }

  M.registerScene({
    type: 'beat',
    slots: {
      kicker: { words: 4 }, title: { words: 10 }, units: { words: 8 },
      value: { claim: true }, quote: { claim: true }, name: { words: 6 }
    },
    data: 'chart?: { kind: "bars", bars: [{ label, value: claim, emph }] } | { kind: "line", series: data id, end?: claim }; stage?: the shape\'s directions for this beat',
    build(s, api) {
      const d = api.design, T = api.T, F = api.frame, S = F.safe, K = M.layout.K;
      const copy = s.copy || {};
      if (copy.value && s.chart) throw new Error('a beat carries one figure or one chart, not both');
      let title = api.copy('title');
      let units = api.copy('units');
      if (copy.quote) {
        const q = api.claim(String(copy.quote).replace(/[{}]/g, ''));
        if (!q.quote) throw new Error('copy.quote names claim ' + q.id + ', which is not marked "quote": true');
        title = '“' + (q.display != null ? q.display : q.verbatim) + '”';
        units = api.copy('name') || units;
      }
      if (!title) throw new Error('a beat needs copy.title (or copy.quote)');
      const value = copy.value ? api.claim(String(copy.value).replace(/[{}]/g, '')) : null;
      const chart = s.chart || null;
      let chartRows = null, series = null, endClaim = null;
      if (chart) {
        if (chart.kind === 'bars') {
          chartRows = M.chart.rows(api, chart.bars, 'chart.bars');
          if (chartRows.length < 2 || chartRows.length > 6) throw new Error('chart.bars takes two to six bars');
        } else if (chart.kind === 'line') {
          series = api.R.data[chart.series];
          if (!series) throw new Error('chart.series: no data table "' + chart.series + '"');
          if (chart.end) endClaim = api.claim(String(chart.end).replace(/[{}]/g, ''));
        } else throw new Error('chart.kind must be "bars" or "line"');
      }
      // The card gives the bar, the kicker and the source line; the words
      // below are laid out here at one fixed size, so every beat's headline
      // starts in the same place.
      const c = M.card(api, { kicker: api.copy('kicker'), chart: false, valign: 'top', sourceIds: api.used(), sources: series && series.source ? [series.source] : [] });
      const TY = c.TY, colW = column(F), Z = c.zone;
      const layers = c.layers.slice();
      let y = Z.top;
      const text = (id, role, str, size, lh, weight, color, at, dur) => {
        const f = T.font(weight, size, d.font);
        const placed = T.place(api.ctx, T.balance(api.ctx, str, f, colW), f, S.x, y, lh, 'left', colW);
        let wi = 0;
        const wordIndex = placed.map(l => { const st = wi; wi += l.words.length; return st; });
        layers.push({ kind: 'text', id, role, font: f, size, color, lines: placed, wordIndex, wordTotal: wi, at, dur, large: M.design.isLarge(size, weight) });
        y += placed.length * lh;
      };
      text('headline', 'headline', title, TY.headline.size, TY.headline.lh, d.weights.title, d.ink, 0.15, 0.7);
      if (units) { y += TY.headline.gap; text('units', 'units', units, TY.units.size, TY.units.lh, 400, d.muted, 0.45, 0.5); }
      const wordsBottom = y;
      let extra = 0;
      if (value) {
        // The figure under its words, as large as the column allows up to
        // twice the headline: the card's own type, scaled.
        const display = value.display != null ? value.display : String(value.value);
        const vf = T.fit(api.ctx, display, { weight: d.weights.value, family: d.font, maxW: colW, maxH: TY.headline.size * 2.4, min: TY.headline.size * 1.4, max: TY.headline.size * 2.2, lh: 1.05, maxLines: 1 });
        y += TY.units.gap;
        const h = vf.size * 1.1;
        layers.push({ kind: 'counter', id: 'value', role: 'value', display, parsed: T.parseDisplay(display),
          font: vf.font, size: vf.size, color: d.ink, x: S.x, y, h, align: 'left', boxW: colW, at: 0.35, dur: 1.1 });
        api.reserved.push({ x: S.x, y, w: colW, h });
        y += h; extra = 1;
      } else if (chartRows) {
        y += TY.units.gap;
        const tf = F.profile.type, labLh = d.size.label * tf * 1.3;
        // Compact rows: the chart shares the frame with the stage.
        const h = Math.round(chartRows.length * (labLh + 2 * K + 26 * K + 22 * K) * 0.72);
        layers.push(...M.chart.hbars(api, { x: S.x, y, w: colW, h }, chartRows, { at: 0.6, valign: 'top' }));
        y += h; extra = 1;
      } else if (series) {
        y += TY.units.gap;
        const h = Math.round(Math.min(F.H * 0.22, colW * 0.55));
        const box = { x: S.x, y, w: colW, h };
        api.reserved.push(box);
        layers.push(...lineChart(api, box, series, endClaim, 0.6));
        y += h; extra = 1;
      }
      const read = Math.max(2.0, M.readTime(T.wordCount(title)) + 0.15 * (T.wordCount(units) + T.wordCount(api.copy('kicker')))) + (chart ? 1.0 : 0);
      // What the stage needs from this beat: where the words end.
      return { layers, rule: c.rule, read, card: { wordsBottom, bottom: y, extra: !!extra, colW } };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
