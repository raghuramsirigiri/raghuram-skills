/*!
 * scenes/quote.js — an attributed quote, verbatim. The quote is a claim whose
 * `verbatim` holds the source sentence; its `display` is what goes on screen
 * and must be a substring of the verbatim (an ellipsis marks a cut). Words
 * brighten from muted to ink in reading order; the attribution follows.
 *
 *   claims: { "id": "Q1", "kind": "copied", "quote": true, "speaker": "Ana Ruiz",
 *             "verbatim": "...", "display": "...", "source": "A", "locator": "¶6" }
 *   { "type": "quote", "copy": { "quote": "Q1", "name": "Ana Ruiz", "role": "Head of operations" } }
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  M.registerScene({
    type: 'quote',
    slots: { quote: { claim: true, required: true }, name: { words: 5, required: true }, role: { words: 8 } },
    build(s, api) {
      const d = api.design, T = api.T, ctx = api.ctx, K = M.layout.K, S = api.frame.safe;
      const qid = String((s.copy && s.copy.quote) || '').replace(/[{}]/g, '');
      const q = api.claim(qid);
      const body = q.display != null ? String(q.display) : String(q.verbatim || '');
      if (!body) throw new Error('quote claim "' + qid + '" has no display or verbatim text');
      const text = '“' + body + '”';
      const name = api.copy('name'), role = api.copy('role');
      const c = M.card(api, { chart: false, valign: 'top', sourceIds: api.used() });
      const TY = c.TY;
      // The quote grows into the frame: further in a tall or wide one, which
      // has the room a square card doesn't.
      const square = api.frame.cls === 'square';
      const W = api.frame.cls === 'wide' ? Math.round(S.w * 0.85) : S.w;
      const fit = T.fit(ctx, text, { weight: 400, family: d.font, maxW: W, maxH: (c.bottom - c.textBottom) * (square ? 0.62 : 0.75), min: TY.headline.size, max: TY.headline.size * (square ? 1.6 : 2.2), lh: 1.25, maxLines: 7 });
      const nameF = T.font(600, TY.units.size, d.font), roleF = T.font(400, TY.units.size, d.font);
      const attH = TY.units.lh * (role ? 2 : 1);
      const blockH = fit.lines.length * fit.lh + 12 * K + attH;
      const y0 = c.textBottom + Math.max(0, (c.bottom - c.textBottom - blockH) * 0.4);
      const placed = T.place(ctx, fit.lines, fit.font, S.x, y0, fit.lh, 'left', W);
      let wi = 0;
      const wordIndex = placed.map(l => { const st = wi; wi += l.words.length; return st; });
      const words = wi;
      const layers = c.layers.slice();
      // All words are on screen at once (in muted) so the quote never reads as being typed.
      layers.push({ kind: 'text', id: 'quote', role: 'headline', font: fit.font, size: fit.size, color: d.ink, from: d.muted, reveal: 'brighten',
        lines: placed, wordIndex, wordTotal: words, at: 0.2, dur: Math.max(0.8, words * 0.18), ease: 'linear', large: M.design.isLarge(fit.size, 400) });
      const ay = y0 + fit.lines.length * fit.lh + 12 * K;
      const attAt = 0.2 + Math.max(0.8, words * 0.18) + 0.1;
      layers.push({ kind: 'text', id: 'name', role: 'body', font: nameF, size: TY.units.size, color: d.ink, reveal: 'fade',
        lines: T.place(ctx, ['— ' + name], nameF, S.x, ay, TY.units.lh, 'left', W), at: attAt, dur: 0.4 });
      if (role) layers.push({ kind: 'text', id: 'role', role: 'units', font: roleF, size: TY.units.size, color: d.muted, reveal: 'fade',
        lines: T.place(ctx, T.balance(ctx, role, roleF, W).slice(0, 1), roleF, S.x, ay + TY.units.lh, TY.units.lh, 'left', W), at: attAt + 0.1, dur: 0.4 });
      const read = M.readTime(words) * 0.8 + 0.15 * (T.wordCount(name) + T.wordCount(role));
      return { layers, rule: c.rule, read };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
