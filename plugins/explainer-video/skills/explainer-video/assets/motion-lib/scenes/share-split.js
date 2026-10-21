/*!
 * scenes/share-split.js — part of a whole, never a pie. One or two parts
 * fill a 10 x 10 waffle; three to five fill one stacked bar. Each part's label
 * and value sit in a list under the shape. A remainder below 100% is drawn
 * as a muted "Other" without a figure of its own.
 *
 *   { "type": "share-split", "copy": { "kicker", "title", "units" },
 *     "parts": [ { "label": "By ferry", "value": "F6", "emph": true } ], "style": "waffle" }
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  M.registerScene({
    type: 'share-split',
    slots: { kicker: { words: 4 }, title: { words: 10, required: true }, units: { words: 8 } },
    data: 'parts: 1-5 of { label, value: claim id in %, emph? }; style?: waffle | bar',
    build(s, api) {
      const d = api.design, T = api.T, ctx = api.ctx, K = M.layout.K;
      const parts = M.chart.rows(api, s.parts, 'parts');
      if (parts.length > 5) throw new Error('parts: at most 5');
      const total = parts.reduce((n, p) => n + p.value, 0);
      if (total > 100.5) throw new Error('parts add up to ' + total + '%, more than 100%');
      const style = s.style || (parts.length <= 2 ? 'waffle' : 'bar');
      const c = M.card(api, { kicker: api.copy('kicker'), headline: api.copy('title'), units: api.copy('units'), chart: true, sourceIds: api.used() });
      const box = c.chart;
      const anyEmph = parts.some(p => p.emph);
      const colors = parts.map((p, i) => (p.emph ? d.subject : anyEmph ? d.contextScale[Math.min(i, d.contextScale.length - 1)] : d.series[Math.min(i, d.series.length - 1)]));
      const rest = Math.max(0, 100 - total);
      const restColor = d.hair;

      // Chart text takes the frame's type step, like the card's words.
      const tf = api.frame.profile.type;
      const labSize = d.size.label * tf, valSize = d.size.value * tf;
      const labF = T.font(d.weights.category, labSize, d.font);
      const valF = T.font(d.weights.value, valSize, d.font);
      const rowLh = labSize * (tf > 1 ? 1.8 : 1.5);
      const legendH = parts.length * rowLh;
      const shapeH = Math.max(80, box.h - legendH - 14 * K);
      const layers = c.layers.slice();

      if (style === 'waffle') {
        // As large as the box allows: the waffle is the chart.
        const side = Math.min(shapeH, box.w);
        const gap = Math.max(2, side * 0.02);
        const cell = (side - gap * 9) / 10;
        // Cells fill row by row from the top left; each part takes its share of 100.
        const owner = [];
        parts.forEach((p, i) => { for (let k = 0; k < Math.round(p.value); k++) owner.push(i); });
        layers.push({ kind: 'draw', id: 'waffle', box: { x: box.x, y: box.y, w: side, h: side }, at: 0.6, dur: 1.2, ease: 'linear', fn(cx, p) {
          for (let k = 0; k < 100; k++) {
            const r = Math.floor(k / 10), col = k % 10;
            const x = box.x + col * (cell + gap), y = box.y + r * (cell + gap);
            const own = owner[k];
            const q = M.ease.clamp01(p * 100 - k * 0.6) ;
            M.paint.rect(cx, x, y, cell, cell, restColor);
            if (own != null && q > 0) {
              cx.save(); cx.globalAlpha *= M.ease.outQuint(Math.min(1, q)); M.paint.rect(cx, x, y, cell, cell, colors[own]); cx.restore();
            }
          }
        } });
        layers.push(...legend(box.y + side + 14 * K));
      } else {
        // The bar thickens with the room it has, and the bar and its list sit
        // a little above the box's middle rather than at its top.
        const barH = Math.max(Math.min(shapeH, 40 * K), Math.min(shapeH * 0.3, 80 * K));
        const free = Math.max(0, box.h - barH - 14 * K - legendH);
        box.y += free * 0.3;
        let x = box.x;
        parts.forEach((p, i) => {
          const w = box.w * p.value / 100;
          layers.push({ kind: 'rect', id: 'seg-' + i, x, y: box.y, w: Math.max(0, w - 2), h: barH, color: colors[i], grow: 'x', at: 0.6 + i * 0.25, dur: 0.5, ease: 'expoOut' });
          x += w;
        });
        if (rest > 0.5) layers.push({ kind: 'rect', id: 'seg-other', x, y: box.y, w: box.x + box.w - x, h: barH, color: restColor, grow: 'x', at: 0.6 + parts.length * 0.25, dur: 0.4, ease: 'expoOut' });
        layers.push(...legend(box.y + barH + 14 * K));
      }

      function legend(y0) {
        const out = [];
        const sw = labSize * 0.8;
        parts.forEach((p, i) => {
          const y = y0 + i * rowLh;
          const at = 1.0 + i * 0.12;
          out.push({ kind: 'rect', id: 'key-' + i, x: box.x, y: y + (rowLh - sw) / 2, w: sw, h: sw, color: colors[i], grow: 'x', at, dur: 0.3 });
          const vw = T.measure(ctx, p.display, valF);
          out.push({ kind: 'text', id: 'pval-' + i, role: 'value', font: valF, size: valSize, color: d.value, reveal: 'fade',
            lines: T.place(ctx, [p.display], valF, box.x + sw + 4 * K, y, rowLh, 'left', vw), at, dur: 0.4 });
          out.push({ kind: 'text', id: 'plabel-' + i, role: 'label', font: labF, size: labSize, color: d.label, reveal: 'fade',
            lines: T.place(ctx, [p.label], labF, box.x + sw + 8 * K + vw, y, rowLh, 'left', box.w), at, dur: 0.4 });
        });
        return out;
      }
      const read = M.readTime(c.primaryWords) + 0.15 * (c.words - c.primaryWords) + 0.4 * parts.length;
      return { layers, rule: c.rule, read };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
