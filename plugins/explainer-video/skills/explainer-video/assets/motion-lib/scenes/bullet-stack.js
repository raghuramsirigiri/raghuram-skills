/*!
 * scenes/bullet-stack.js — up to three short points. Each enters as the one
 * before it settles; all three stay for the read.
 *
 *   { "type": "bullet-stack", "copy": { "kicker", "title" }, "points": ["...", "...", "..."] }
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  M.registerScene({
    type: 'bullet-stack',
    slots: { kicker: { words: 4 }, title: { words: 10 } },
    data: 'points: 1-3 strings, <= 7 words each',
    build(s, api) {
      const d = api.design, T = api.T, ctx = api.ctx, K = M.layout.K;
      const pts = (s.points || []).map((t, i) => api.R.fill(t, 'points[' + i + ']'));
      if (pts.length < 1 || pts.length > 3) throw new Error('points: use 1 to 3');
      const c = M.card(api, { kicker: api.copy('kicker'), headline: api.copy('title'), chart: true, split: false, sourceIds: api.used() });
      const box = c.chart;
      const size = M.layout.TYPE.headline.size * 0.9;
      const f = T.font(d.weights.title, size, d.font);
      const lh = size * 1.25;
      const mark = size * 0.32;
      const indent = mark + 10 * K;
      const lines = pts.map(t => T.balance(ctx, t, f, box.w - indent));
      const gap = 14 * K;
      const total = lines.reduce((n, l) => n + l.length * lh, 0) + gap * (pts.length - 1);
      let y = box.y + Math.max(0, (box.h - total) * 0.3);
      const layers = c.layers.slice();
      const words = [];
      pts.forEach((t, i) => {
        const at = 0.7 + i * 0.6;
        layers.push({ kind: 'rect', id: 'mark-' + i, x: box.x, y: y + (lh - mark) / 2, w: mark, h: mark, color: d.subject, grow: 'x', at, dur: 0.3 });
        layers.push({ kind: 'text', id: 'point-' + i, role: 'body', font: f, size, color: d.ink, reveal: 'mask-up',
          lines: T.place(ctx, lines[i], f, box.x + indent, y, lh, 'left', box.w - indent), at: at + 0.05, dur: 0.55, large: M.design.isLarge(size, d.weights.title) });
        y += lines[i].length * lh + gap;
        words.push(T.wordCount(t));
      });
      // The last point needs its own read time once it lands.
      const read = Math.max(M.readTime(words[words.length - 1]), M.readTime(c.primaryWords)) + 0.15 * (c.words - c.primaryWords);
      return { layers, rule: c.rule, read };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
