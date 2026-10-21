/*!
 * scenes/hook-headline.js — open on the one claim. The headline is set 2-3x
 * the card size, in the same face and weight, and its words rise through a
 * mask line one after another. On screen by 0.5 s.
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  M.registerScene({
    type: 'hook-headline',
    slots: { kicker: { words: 4 }, headline: { words: 7, required: true }, units: { words: 8 } },
    build(s, api) {
      const c = M.card(api, {
        kicker: api.copy('kicker'), headline: api.copy('headline'), units: api.copy('units'),
        chart: false, display: true, headlineReveal: 'words', valign: 'center', sourceIds: api.used()
      });
      // The hook's kicker and headline arrive together: the claim leads.
      c.layers.forEach(l => { if (l.id === 'headline') { l.at = 0.05; l.dur = 0.9; l.stagger = 0.075; } });
      const read = M.readTime(c.primaryWords) + 0.15 * (c.words - c.primaryWords);
      return { layers: c.layers, rule: c.rule, read };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
