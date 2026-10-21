/*!
 * scenes/photo-pan.js — a picture the user supplied (a data URI in
 * copy.image). It fades in and holds still at its size: no push, no zoom.
 * The picture fills the chart area (beside the words in a wide frame) and is
 * clipped to it, so nothing falls outside the safe zone. Never a fetched,
 * stock or generated image. (The type keeps its old name so specs still
 * compile.)
 *
 *   { "type": "photo-pan", "copy": { "kicker", "caption", "image": "data:image/jpeg;base64,..." } }
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  M.registerScene({
    type: 'photo-pan',
    slots: { kicker: { words: 4 }, caption: { words: 12, required: true }, image: { asset: true, required: true } },
    build(s, api) {
      const img = s.copy && s.copy.image;
      if (!img || !/^data:image\//.test(img)) throw new Error('copy.image must be a data:image/... URI the user supplied');
      const c = M.card(api, { kicker: api.copy('kicker'), headline: api.copy('caption'), chart: true, sourceIds: api.used() });
      const box = c.chart;
      const layers = c.layers.slice();
      layers.push({ kind: 'image', id: 'photo', src: img, x: box.x, y: box.y, w: box.w, h: box.h, at: 0.3, dur: 0.6 });
      const read = M.readTime(c.primaryWords) + 0.15 * (c.words - c.primaryWords) + 0.8;
      return { layers, rule: c.rule, read };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
