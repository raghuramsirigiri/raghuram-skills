/*!
 * scenes/ranked-list.js — top-N, up to five rows, largest first. Rows arrive
 * in rank order and their bars grow from zero.
 *
 *   { "type": "ranked-list", "copy": { "kicker", "title", "units" },
 *     "rows": [ { "label": "Harbour line", "value": "F4", "emph": true }, ... ] }
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  M.registerScene({
    type: 'ranked-list',
    slots: { kicker: { words: 4 }, title: { words: 10, required: true }, units: { words: 8 } },
    data: 'rows: 2-5 of { label (<= 4 words), value: claim id, emph? }, in rank order',
    build(s, api) {
      const rows = M.chart.rows(api, s.rows, 'rows');
      if (rows.length < 2 || rows.length > 5) throw new Error('rows: use 2 to 5 rows (got ' + rows.length + ')');
      for (let i = 1; i < rows.length; i++) {
        if (rows[i].value > rows[i - 1].value) throw new Error('rows must be in rank order, largest first');
      }
      const c = M.card(api, { kicker: api.copy('kicker'), headline: api.copy('title'), units: api.copy('units'), chart: true, sourceIds: api.used() });
      const layers = c.layers.concat(M.chart.hbars(api, c.chart, rows, { at: 0.6, stagger: 0.11, rank: true, valign: 'top' }));
      const read = M.readTime(c.primaryWords) + 0.15 * (c.words - c.primaryWords) + 0.3 * (rows.length - 1);
      return { layers, rule: c.rule, read };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
