/*!
 * scenes/big-number.js — one figure, huge. The counter rolls on expo-out to
 * the exact value and settles; the frame holds at least 1.5 s after it lands.
 * In a wide frame the figure takes the left half and its words sit beside it.
 * Copy: kicker, value (a claim id), line (what the number means, <= 8 words),
 * units (optional).
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  M.registerScene({
    type: 'big-number',
    slots: { kicker: { words: 4 }, value: { claim: true, required: true }, line: { words: 8, required: true }, units: { words: 8 } },
    build(s, api) {
      const d = api.design, T = api.T, S = api.frame.safe, K = M.layout.K;
      const cid = s.copy && s.copy.value;
      if (!cid) throw new Error('copy.value must name a claim, e.g. "F1"');
      const claim = api.claim(String(cid).replace(/[{}]/g, ''));
      const display = claim.display != null ? claim.display : String(claim.value);
      const line = api.copy('line');
      const unitsTxt = api.copy('units');
      const kicker = api.copy('kicker');
      // The card gives the bar, the kicker and the source line.
      const c = M.card(api, { kicker, chart: false, valign: 'top', sourceIds: api.used() });
      const TY = c.TY;
      const room = c.bottom - c.textBottom;
      // A wide frame sets the figure in a left column and its words beside
      // it; square and tall frames stack them, the figure as large as fits.
      const wide = api.frame.cls === 'wide';
      const gutter = 30 * K;
      const valueW = wide ? Math.round(S.w * 0.5) : S.w;
      const textX = wide ? S.x + valueW + gutter : S.x;
      const textW = wide ? S.w - valueW - gutter : S.w;
      const vf = T.fit(api.ctx, display, {
        weight: d.weights.value, family: d.font, maxW: valueW, maxH: wide ? room * 0.7 : room * 0.45,
        // A figure on its own may run past the display size, as wide as fits.
        min: TY.display.min, max: TY.display.max * 1.4, lh: 1.05, maxLines: 1
      });
      const valueH = vf.size * 1.1;
      const lf = wide
        ? T.fit(api.ctx, line, { weight: d.weights.title, family: d.font, maxW: textW, maxH: room * 0.5, min: TY.headline.size, max: TY.headline.size * 1.5, lh: 1.2, maxLines: 4 })
        : { font: T.font(d.weights.title, TY.headline.size, d.font), size: TY.headline.size, lh: TY.headline.lh, lines: null };
      const lineF = lf.font, lineLh = lf.lh;
      const lineLines = lf.lines || T.balance(api.ctx, line, lineF, textW);
      const unitsF = T.font(400, TY.units.size, d.font);
      const unitsLines = unitsTxt ? T.balance(api.ctx, unitsTxt, unitsF, textW) : [];
      const wordsH = lineLines.length * lineLh + (unitsLines.length ? TY.headline.gap + unitsLines.length * TY.units.lh : 0);
      const blockH = wide ? Math.max(valueH, wordsH) : valueH + 4 * K + wordsH;
      const y0 = c.textBottom + Math.max(0, (room - blockH) * 0.42);
      const layers = c.layers.slice();
      layers.push({
        kind: 'counter', id: 'value', role: 'value', display, parsed: T.parseDisplay(display),
        font: vf.font, size: vf.size, color: d.ink, x: S.x, y: wide ? y0 + (blockH - valueH) / 2 : y0, h: valueH, align: 'left', boxW: valueW,
        at: 0.1, dur: 1.1
      });
      let y = wide ? y0 + (blockH - wordsH) / 2 : y0 + valueH + 4 * K;
      const placed = T.place(api.ctx, lineLines, lineF, textX, y, lineLh, 'left', textW);
      let wi = 0;
      const wordIndex = placed.map(l => { const st = wi; wi += l.words.length; return st; });
      layers.push({
        kind: 'text', id: 'line', role: 'headline', font: lineF, size: lf.size, color: d.ink,
        lines: placed, wordIndex, wordTotal: wi, at: 0.5, dur: 0.7, large: true
      });
      y += lineLines.length * lineLh;
      if (unitsLines.length) {
        y += TY.headline.gap;
        layers.push({
          kind: 'text', id: 'units', role: 'units', font: unitsF, size: TY.units.size, color: d.muted,
          lines: T.place(api.ctx, unitsLines, unitsF, textX, y, TY.units.lh, 'left', textW), at: 0.8, dur: 0.5
        });
      }
      const read = Math.max(M.READ.number, M.readTime(T.wordCount(line) + 1)) +
        0.15 * (T.wordCount(kicker) + T.wordCount(unitsTxt));
      return { layers, rule: c.rule, read };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
