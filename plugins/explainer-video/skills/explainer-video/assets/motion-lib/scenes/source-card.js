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
      const d = api.design, T = api.T, S = api.frame.safe, K = M.layout.K;
      const locale = api.spec.meta.locale;
      const ill = (api.spec.claims || []).some(c => c.kind === 'illustrative');
      const srcs = api.spec.sources || [];
      const note = api.copy('note');
      const W = api.frame.cls === 'wide' ? Math.round(S.w * 0.8) : S.w;
      const TY0 = M.layout.typeFor(api.frame);
      // "Source" goes in the shared kicker line, where every scene's kicker
      // sits; the card's own block centres between it and the footer.
      const label = srcs.length > 1 ? 'Sources' : 'Source';
      const Z = M.design.frameZone(api.frame, api.footerRows != null ? api.footerRows : 0);
      api.footerUsed = Z.rows;
      api.chrome = { kicker: label, source: null };
      const room = Z.bottom - Z.top;

      // The card at scale f of the frame's type.
      function layout(f) {
        const sz = t => ({ size: t.size * f, lh: t.lh * f, gap: t.gap * f });
        const TY = { headline: sz(TY0.headline), units: sz(TY0.units) };
        const nameSize = TY.headline.size * 0.8, nameLh = TY.headline.lh * 0.8;
        const blocks = [];
        srcs.forEach(src => {
          blocks.push({ str: src.name, size: nameSize, lh: nameLh, weight: 600, color: d.ink, gap: 2 * K * f });
          const rest = [M.formatDate(src.date, locale), src.asOf ? 'as of ' + M.formatDate(src.asOf, locale) : '']
            .filter(Boolean).join(' · ');
          if (rest) blocks.push({ str: rest, size: TY.units.size, lh: TY.units.lh, weight: 400, color: d.muted, gap: 10 * K * f });
        });
        if (ill) blocks.push({ str: 'Illustrative figures, not measurements', size: TY.units.size, lh: TY.units.lh, weight: 600, color: d.ink, gap: 6 * K * f });
        if (note) blocks.push({ str: note, size: TY.units.size, lh: TY.units.lh, weight: 400, color: d.muted, gap: 0 });
        blocks.forEach(b => { b.f = T.font(b.weight, b.size, d.font); b.lines = T.balance(api.ctx, b.str, b.f, W); });
        const h = blocks.reduce((n, b) => n + b.lines.length * b.lh + b.gap, 0);
        return { TY, blocks, h };
      }
      // The card grows until it holds about three quarters of its room, up to
      // three times the frame's type: a closing card, not a footnote in a big
      // frame.
      let Lc = layout(1);
      for (let f = 3; f > 1.001; f -= 0.1) { const t = layout(f); if (t.h <= room * 0.75) { Lc = t; break; } }
      const blocks = Lc.blocks, h = Lc.h;

      // A wide frame centres the block across its width, as the outro does;
      // the lines stay left-aligned inside it.
      const blockW = Math.max(...blocks.map(b => Math.max(...b.lines.map(l => T.measure(api.ctx, l, b.f)))));
      const x0 = api.frame.cls === 'wide' ? S.x + Math.max(0, (S.w - blockW) / 2) : S.x;
      let y = Z.top + Math.max(0, (room - h) * 0.42);
      const layers = [];
      let words = 1;
      blocks.forEach((b, i) => {
        layers.push({
          kind: 'text', id: 'row-' + i, role: i === 0 ? 'headline' : 'body', font: b.f, size: b.size, color: b.color,
          lines: T.place(api.ctx, b.lines, b.f, x0, y, b.lh, 'left', W), at: 0.1 + i * 0.08, dur: 0.6, reveal: 'fade',
          large: M.design.isLarge(b.size, b.weight)
        });
        y += b.lines.length * b.lh + b.gap;
        words += T.wordCount(b.str);
      });
      const read = Math.max(M.READ.source, M.readTime(words) * 0.75);
      return { layers, rule: true, read };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
