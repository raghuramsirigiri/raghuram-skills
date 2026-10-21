/*!
 * scenes/source-card.js — every cut ends here (or just before the outro):
 * each source by name with its date, "as of" for anything fast-moving, and an
 * illustrative line when any figure in the ledger is illustrative. Built from
 * `sources` and `claims`; its only copy is an optional note.
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  M.registerScene({
    type: 'source-card',
    slots: { note: { words: 12 } },
    build(s, api) {
      const d = api.design, T = api.T, TY = M.layout.TYPE, S = api.frame.safe, K = M.layout.K;
      const locale = api.spec.meta.locale;
      const ill = (api.spec.claims || []).some(c => c.kind === 'illustrative');
      const srcs = api.spec.sources || [];
      const note = api.copy('note');
      const W = Math.min(S.w, 1240);
      const nameSize = TY.headline.size * 0.8, nameLh = TY.headline.lh * 0.8;

      const blocks = [];
      srcs.forEach(src => {
        blocks.push({ str: src.name, size: nameSize, lh: nameLh, weight: 600, color: d.ink, gap: 2 * K });
        const rest = [M.formatDate(src.date, locale), src.asOf ? 'as of ' + M.formatDate(src.asOf, locale) : '']
          .filter(Boolean).join(' · ');
        if (rest) blocks.push({ str: rest, size: TY.units.size, lh: TY.units.lh, weight: 400, color: d.muted, gap: 10 * K });
      });
      if (ill) blocks.push({ str: 'Illustrative figures, not measurements', size: TY.units.size, lh: TY.units.lh, weight: 600, color: d.ink, gap: 6 * K });
      if (note) blocks.push({ str: note, size: TY.units.size, lh: TY.units.lh, weight: 400, color: d.muted, gap: 0 });
      blocks.forEach(b => { b.f = T.font(b.weight, b.size, d.font); b.lines = T.balance(api.ctx, b.str, b.f, W); });

      const kF = T.font(400, TY.kicker.size, d.font);
      const head = M.layout.RULE.accentH + 8 * K + TY.kicker.lh + TY.kicker.gap * 2;
      const h = head + blocks.reduce((n, b) => n + b.lines.length * b.lh + b.gap, 0);
      let y = S.y + Math.max(0, (S.h - h) * 0.42);
      const rule = { x: S.x, y, w: M.layout.RULE.accentW, h: M.layout.RULE.accentH };
      y += M.layout.RULE.accentH + 8 * K;
      const layers = [{
        kind: 'text', id: 'kicker', role: 'kicker', font: kF, size: TY.kicker.size, color: d.muted, reveal: 'fade',
        lines: T.place(api.ctx, [srcs.length > 1 ? 'Sources' : 'Source'], kF, S.x, y, TY.kicker.lh, 'left', W), at: 0, dur: 0.5
      }];
      y += TY.kicker.lh + TY.kicker.gap * 2;
      let words = 0;
      blocks.forEach((b, i) => {
        layers.push({
          kind: 'text', id: 'row-' + i, role: i === 0 ? 'headline' : 'body', font: b.f, size: b.size, color: b.color,
          lines: T.place(api.ctx, b.lines, b.f, S.x, y, b.lh, 'left', W), at: 0.1 + i * 0.08, dur: 0.6, reveal: 'fade',
          large: M.design.isLarge(b.size, b.weight)
        });
        y += b.lines.length * b.lh + b.gap;
        words += T.wordCount(b.str);
      });
      const read = Math.max(M.READ.source, M.readTime(words) * 0.75);
      return { layers, rule, read };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
