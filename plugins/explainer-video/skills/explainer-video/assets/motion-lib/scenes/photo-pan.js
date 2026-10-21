/*!
 * scenes/photo-pan.js — a picture the user supplied (a data URI in
 * copy.image), with a slow push from 1.03 to 1.07 across the scene. The
 * picture fills the chart area and is clipped to it, so nothing falls outside
 * the safe zone. Never a fetched, stock or generated image.
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
      const c = M.card(api, { kicker: api.copy('kicker'), headline: api.copy('caption'), chart: true, split: false, sourceIds: api.used() });
      const box = c.chart;
      const layers = c.layers.slice();
      let span = 6;
      layers.push({ kind: 'image', id: 'photo', src: img, x: box.x, y: box.y, w: box.w, h: box.h, at: 0.3, dur: 0.6,
        scale: lt => 1.03 + 0.04 * M.ease.clamp01(lt / span) });
      const read = M.readTime(c.primaryWords) + 0.15 * (c.words - c.primaryWords) + 0.8;
      span = 0.9 + read + 0.35;
      return { layers, rule: c.rule, read };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
