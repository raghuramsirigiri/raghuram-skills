/*!
 * scenes/kicker-title.js — context or a section title: what happened, who,
 * when, in one line. Masked line reveal; the bar draws above it.
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  M.registerScene({
    type: 'kicker-title',
    slots: { kicker: { words: 4 }, title: { words: 8, required: true }, sub: { words: 10 } },
    build(s, api) {
      const c = M.card(api, {
        kicker: api.copy('kicker'), headline: api.copy('title'), units: api.copy('sub'),
        chart: false, sourceIds: api.used()
      });
      const read = M.readTime(c.primaryWords) + 0.15 * (c.words - c.primaryWords);
      return { layers: c.layers, rule: c.rule, read };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
