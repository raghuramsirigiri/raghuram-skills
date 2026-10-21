/*!
 * scenes/timeline.js — up to five dated events. The rail draws, each date
 * ticks on with its dot, the event text follows. Vertical, in a wide frame's
 * chart column too; horizontal only across a full-width wide frame. The
 * events spread down the height they have.
 *
 *   { "type": "timeline", "copy": { "kicker", "title" },
 *     "events": [ { "date": "March 2026", "text": "New harbour route opens" }, ... ] }
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  M.registerScene({
    type: 'timeline',
    slots: { kicker: { words: 4 }, title: { words: 10, required: true } },
    data: 'events: 2-5 of { date, text (<= 6 words) }',
    build(s, api) {
      const d = api.design, T = api.T, ctx = api.ctx, K = M.layout.K;
      const ev = (s.events || []).map((e, i) => ({ date: api.R.fill(e.date, 'events[' + i + '].date'), text: api.R.fill(e.text, 'events[' + i + '].text') }));
      if (ev.length < 2 || ev.length > 5) throw new Error('events: use 2 to 5');
      const c = M.card(api, { kicker: api.copy('kicker'), headline: api.copy('title'), chart: true, sourceIds: api.used() });
      const box = c.chart;
      const vertical = !(api.frame.cls === 'wide' && !c.split);
      // Event text takes the frame's type step, and a size more when the
      // rows have room (a tall frame, a wide frame's chart column).
      const lab = d.size.label * api.frame.profile.type * (vertical ? Math.max(1, Math.min(1.35, box.h / ev.length / (80 * K))) : 1);
      const dateF = T.font(d.weights.value, lab, d.font);
      const txtF = T.font(400, lab * 1.15, d.font);
      const txtLh = lab * 1.15 * 1.3;
      const r = 7 * K;
      const layers = c.layers.slice();
      const step = 0.35;
      const at0 = 0.7;
      if (vertical) {
        const rowH = Math.min(box.h / ev.length, 140 * K);
        const x = box.x + r;
        // The rows sit a little above the middle of the height they leave.
        const used = rowH * (ev.length - 1) + r * 2 + lab * 0.8 + txtLh * 2;
        const y0 = box.y + r + Math.max(0, (box.h - used) * 0.35);
        const y1 = y0 + rowH * (ev.length - 1);
        layers.push({ kind: 'draw', id: 'rail', at: at0, dur: step * ev.length, ease: 'linear', fn(cx, p) {
          M.paint.line(cx, x, y0, x, y0 + (y1 - y0) * p, d.hair, d.stroke.axis);
        } });
        ev.forEach((e, i) => {
          const y = y0 + i * rowH, at = at0 + i * step;
          layers.push({ kind: 'draw', id: 'dot-' + i, at, dur: 0.3, fn(cx, p) { M.paint.dot(cx, x, y, r * M.ease.outQuint(p), i === ev.length - 1 ? d.subject : d.ink); } });
          const tx = x + r + 10 * K, w = box.x + box.w - tx;
          layers.push({ kind: 'text', id: 'date-' + i, role: 'label', font: dateF, size: lab, color: d.ink, reveal: 'mask-left',
            lines: T.place(ctx, [e.date], dateF, tx, y - lab * 0.75, lab * 1.5, 'left', w), at, dur: 0.4 });
          const tl = T.balance(ctx, e.text, txtF, w);
          layers.push({ kind: 'text', id: 'event-' + i, role: 'body', font: txtF, size: lab * 1.15, color: d.label, reveal: 'fade',
            lines: T.place(ctx, tl, txtF, tx, y + lab * 0.8, txtLh, 'left', w), at: at + 0.12, dur: 0.4 });
        });
      } else {
        const colW = box.w / ev.length;
        const y = box.y + box.h * 0.3;
        layers.push({ kind: 'draw', id: 'rail', at: at0, dur: step * ev.length, ease: 'linear', fn(cx, p) {
          M.paint.line(cx, box.x, y, box.x + (box.w - colW + r) * p, y, d.hair, d.stroke.axis);
        } });
        ev.forEach((e, i) => {
          const x = box.x + i * colW, at = at0 + i * step;
          layers.push({ kind: 'draw', id: 'dot-' + i, at, dur: 0.3, fn(cx, p) { M.paint.dot(cx, x + r, y, r * M.ease.outQuint(p), i === ev.length - 1 ? d.subject : d.ink); } });
          const w = colW - 12 * K;
          layers.push({ kind: 'text', id: 'date-' + i, role: 'label', font: dateF, size: d.size.label, color: d.ink, reveal: 'mask-up',
            lines: T.place(ctx, [e.date], dateF, x, y + r + 8 * K, d.size.label * 1.5, 'left', w), at, dur: 0.4 });
          const tl = T.balance(ctx, e.text, txtF, w);
          layers.push({ kind: 'text', id: 'event-' + i, role: 'body', font: txtF, size: d.size.label * 1.15, color: d.label, reveal: 'fade',
            lines: T.place(ctx, tl, txtF, x, y + r + 8 * K + d.size.label * 1.6, txtLh, 'left', w), at: at + 0.12, dur: 0.4 });
        });
      }
      const words = ev.reduce((n, e) => n + T.wordCount(e.text), 0);
      const read = M.readTime(c.primaryWords) + 0.15 * (c.words - c.primaryWords) + 0.3 * words;
      return { layers, rule: c.rule, read };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
