/*!
 * scenes/before-after.js — two states of one measure. The "before" value
 * lands first, in muted ink; a rule wipes across and the "after" value lands
 * in full ink. Side by side in square and wide frames, stacked in tall ones.
 *
 *   { "type": "before-after", "copy": { "kicker", "title", "units" },
 *     "before": { "label": "2025", "value": "F2" }, "after": { "label": "2026", "value": "F3" } }
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  M.registerScene({
    type: 'before-after',
    slots: { kicker: { words: 4 }, title: { words: 10, required: true }, units: { words: 8 } },
    data: 'before, after: { label (<= 3 words), value: claim id }',
    build(s, api) {
      const d = api.design, T = api.T, ctx = api.ctx, K = M.layout.K;
      if (!s.before || !s.after) throw new Error('needs "before" and "after"');
      const [b, a] = M.chart.rows(api, [s.before, s.after], 'before/after');
      const c = M.card(api, { kicker: api.copy('kicker'), headline: api.copy('title'), units: api.copy('units'), chart: true, split: false, sourceIds: api.used() });
      const box = c.chart;
      const tall = api.frame.cls === 'tall';
      const cellW = tall ? box.w : (box.w - 20 * K) / 2;
      const cellH = tall ? (box.h - 20 * K) / 2 : box.h;
      const maxSize = Math.min(M.layout.TYPE.display.max, cellH * 0.45);
      const fitV = str => T.fit(ctx, str, { weight: d.weights.value, family: d.font, maxW: cellW, maxH: maxSize * 1.1, min: Math.min(M.layout.TYPE.display.min, maxSize), max: maxSize, lh: 1.05, maxLines: 1 });
      const size = Math.min(fitV(b.display).size, fitV(a.display).size);
      const vF = T.font(d.weights.value, size, d.font);
      const labF = T.font(d.weights.category, d.size.label, d.font);
      const labLh = d.size.label * 1.4;
      const blockH = labLh + size * 1.1;
      const layers = c.layers.slice();
      const cell = (i, r, color, at) => {
        const x = tall ? box.x : box.x + i * (cellW + 20 * K);
        const y = (tall ? box.y + i * (cellH + 20 * K) : box.y) + Math.max(0, (cellH - blockH) * 0.4);
        layers.push({ kind: 'text', id: 'label-' + i, role: 'label', font: labF, size: d.size.label, color: d.label, reveal: 'fade',
          lines: T.place(ctx, [r.label], labF, x, y, labLh, 'left', cellW), at, dur: 0.4 });
        layers.push({ kind: 'counter', id: 'value-' + i, role: 'value', display: r.display, parsed: T.parseDisplay(r.display),
          font: vF, size, color, x, y: y + labLh, h: size * 1.1, align: 'left', boxW: cellW, at: at + 0.1, dur: 0.9 });
        return { x, y };
      };
      cell(0, b, d.muted, 0.6);
      const p1 = cell(1, a, d.ink, 1.9);
      // The wipe: a rule sweeping into the "after" cell just before its value lands.
      layers.push({ kind: 'draw', id: 'wipe', at: 1.5, dur: 0.5, ease: 'expoInOut', fn(cx, p) {
        if (tall) M.paint.line(cx, box.x, p1.y - 10 * K, box.x + box.w * p, p1.y - 10 * K, d.subject, M.layout.RULE.accentH);
        else M.paint.line(cx, p1.x - 10 * K, box.y + box.h * (1 - p), p1.x - 10 * K, box.y + box.h, d.subject, M.layout.RULE.accentH);
      } });
      const read = Math.max(M.READ.number, M.readTime(c.primaryWords) + 0.15 * (c.words - c.primaryWords) + 0.6);
      return { layers, rule: c.rule, read };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
