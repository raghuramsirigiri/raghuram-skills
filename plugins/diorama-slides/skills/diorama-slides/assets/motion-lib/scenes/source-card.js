/*!
 * scenes/source-card.js — every cut ends here: each source by name with its
 * date, "as of" for anything fast-moving, and an illustrative line when any
 * figure in the ledger is illustrative. It is a beat like any other: the
 * words sit where every headline sits, and the stage keeps moving under
 * them. Built from `sources` and `claims`; its only copy is an optional note.
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  M.registerScene({
    type: 'source-card',
    slots: { note: { words: 12 } },
    build(s, api) {
      const d = api.design, T = api.T, F = api.frame, S = F.safe, K = M.layout.K;
      const locale = api.spec.meta.locale;
      const ill = (api.spec.claims || []).some(c => c.kind === 'illustrative');
      const srcs = api.spec.sources || [];
      const note = api.copy('note');
      const colW = F.cls === 'wide' ? Math.round(S.w * M.layout.PROFILE.wide.col) : S.w;
      // "Sources" goes in the shared kicker line; the footer has no source
      // line of its own here, the card is the source.
      const c = M.card(api, { kicker: srcs.length > 1 ? 'Sources' : 'Source', chart: false, valign: 'top', source: false });
      const TY = c.TY, layers = c.layers.slice();
      let y = c.zone.top, at = 0.15;
      const put = (id, str, size, lh, weight, color) => {
        const f = T.font(weight, size, d.font);
        const placed = T.place(api.ctx, T.balance(api.ctx, str, f, colW), f, S.x, y, lh, 'left', colW);
        layers.push({ kind: 'text', id, role: id === 'name-0' ? 'headline' : 'body', font: f, size, color, lines: placed, at, dur: 0.6, large: M.design.isLarge(size, weight) });
        y += placed.length * lh;
        at += 0.12;
      };
      srcs.forEach((src, i) => {
        put('name-' + i, src.name, TY.headline.size, TY.headline.lh, 600, d.ink);
        const rest = [M.formatDate(src.date, locale), src.asOf ? 'as of ' + M.formatDate(src.asOf, locale) : ''].filter(Boolean).join(' · ');
        if (rest) { y += 2 * K; put('date-' + i, rest, TY.units.size, TY.units.lh, 400, d.muted); }
        y += TY.units.gap;
      });
      if (ill) put('illustrative', 'Illustrative figures: not measurements', TY.units.size, TY.units.lh, 400, d.muted);
      if (note) put('note', note, TY.units.size, TY.units.lh, 400, d.muted);
      const words = layers.reduce((n, l) => n + (l.lines ? l.lines.reduce((m, ln) => m + T.wordCount(ln.text), 0) : 0), 0);
      const read = Math.max(M.READ.source, M.readTime(words) * 0.8);
      return { layers, rule: c.rule, read, card: { wordsBottom: y, bottom: y, extra: false, colW } };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
