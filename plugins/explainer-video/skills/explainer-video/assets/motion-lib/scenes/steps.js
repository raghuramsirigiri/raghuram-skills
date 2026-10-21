/*!
 * scenes/steps.js — a 1-2-3 process, up to four steps. One accent marker
 * travels from step to step; each step's text arrives as the marker reaches
 * it and stays.
 *
 *   { "type": "steps", "copy": { "kicker", "title" }, "steps": ["Book online", "Tap on board", "Ride"] }
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  M.registerScene({
    type: 'steps',
    slots: { kicker: { words: 4 }, title: { words: 10, required: true } },
    data: 'steps: 2-4 strings, <= 6 words each',
    build(s, api) {
      const d = api.design, T = api.T, ctx = api.ctx, K = M.layout.K;
      const steps = (s.steps || []).map((t, i) => api.R.fill(t, 'steps[' + i + ']'));
      if (steps.length < 2 || steps.length > 4) throw new Error('steps: use 2 to 4');
      const c = M.card(api, { kicker: api.copy('kicker'), headline: api.copy('title'), chart: true, sourceIds: api.used() });
      const box = c.chart;
      // Steps are set like bullet points, a little under the headline, and
      // spread down the height they have, up to a generous row.
      const size = c.TY.headline.size * 0.8;
      const numF = T.font(d.weights.value, size, d.font);
      const txtF = T.font(d.weights.title, size, d.font);
      const lh = size * 1.25;
      const rowH = Math.min(box.h / steps.length, 130 * K);
      const numW = T.measure(ctx, '4', numF) + 14 * K;
      const layers = c.layers.slice();
      const at0 = 0.7, step = 0.55;
      // The rows sit a little above the middle of the height they leave.
      const off = Math.max(0, (box.h - rowH * (steps.length - 1) - lh * 2) * 0.35);
      const ys = steps.map((_, i) => box.y + off + i * rowH);
      // The marker: a short accent bar beside the current step, gliding between steps.
      layers.push({ kind: 'draw', id: 'marker', box: { x: box.x, y: ys[0], w: M.layout.RULE.accentH * 1.5, h: ys[ys.length - 1] + lh - ys[0] }, at: at0, dur: step * (steps.length - 1) + 0.3, ease: 'linear', fn(cx, p, a) {
        const local = (a.lt - at0) / step;
        const i = Math.min(steps.length - 1, Math.floor(local));
        const f = M.ease.glide(M.ease.clamp01((local - i) / 0.6));
        const yA = ys[Math.max(0, i - 1)], yB = ys[i];
        const y = i === 0 ? yB : yA + (yB - yA) * f;
        const grow = M.ease.outQuint(M.ease.clamp01((a.lt - at0) / 0.3));
        M.paint.rect(cx, box.x, y + (lh - lh * 0.8) / 2, M.layout.RULE.accentH * 1.5, lh * 0.8 * grow, d.subject);
      } });
      steps.forEach((t, i) => {
        const at = at0 + i * step + 0.1;
        const x = box.x + 10 * K;
        layers.push({ kind: 'text', id: 'num-' + i, role: 'label', font: numF, size, color: d.muted, reveal: 'fade',
          lines: T.place(ctx, [String(i + 1)], numF, x, ys[i], lh, 'left', numW), at, dur: 0.3 });
        const w = box.w - numW - 10 * K;
        const tl = T.balance(ctx, t, txtF, w);
        layers.push({ kind: 'text', id: 'step-' + i, role: 'body', font: txtF, size, color: d.ink, reveal: 'mask-up',
          lines: T.place(ctx, tl, txtF, x + numW, ys[i], lh, 'left', w), at, dur: 0.5, large: M.design.isLarge(size, d.weights.title) });
      });
      const words = steps.reduce((n, t) => n + T.wordCount(t), 0);
      const read = M.readTime(c.primaryWords) + 0.15 * (c.words - c.primaryWords) + 0.25 * words;
      return { layers, rule: c.rule, read };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
