/*!
 * scenes/compare-bars.js — two to six values in the same unit. Bars grow from
 * a zero baseline on expo-out (never past their value) and each value label
 * lands at its bar's end. `emph: true` on a bar gives it the accent; the rest
 * go muted.
 *
 *   { "type": "compare-bars", "copy": { "kicker", "title", "units" },
 *     "bars": [ { "label": "2025", "value": "F2" }, { "label": "2026", "value": "F3", "emph": true } ] }
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  M.registerScene({
    type: 'compare-bars',
    slots: { kicker: { words: 4 }, title: { words: 10, required: true }, units: { words: 8 } },
    data: 'bars: 2-6 of { label (<= 3 words), value: claim id, emph? }',
    build(s, api) {
      const rows = M.chart.rows(api, s.bars, 'bars');
      if (rows.length < 2 || rows.length > 6) throw new Error('bars: use 2 to 6 bars (got ' + rows.length + ')');
      const c = M.card(api, { kicker: api.copy('kicker'), headline: api.copy('title'), units: api.copy('units'), chart: true, sourceIds: api.used() });
      const layers = c.layers.concat(M.chart.hbars(api, c.chart, rows, { at: 0.6 }));
      const read = M.readTime(c.primaryWords) + 0.15 * (c.words - c.primaryWords) + 0.3 * (rows.length - 1);
      return { layers, rule: c.rule, read };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
