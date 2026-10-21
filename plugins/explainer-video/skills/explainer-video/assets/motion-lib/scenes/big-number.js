/*!
 * scenes/big-number.js — one figure, huge. The counter rolls on expo-out to
 * the exact value and settles; the frame holds at least 1.5 s after it lands.
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
      const d = api.design, T = api.T, TY = M.layout.TYPE, S = api.frame.safe, K = M.layout.K;
      const cid = s.copy && s.copy.value;
      if (!cid) throw new Error('copy.value must name a claim, e.g. "F1"');
      const claim = api.claim(String(cid).replace(/[{}]/g, ''));
      const display = claim.display != null ? claim.display : String(claim.value);
      const line = api.copy('line');
      const unitsTxt = api.copy('units');
      const kicker = api.copy('kicker');
      // The card gives the bar, the kicker and the source line.
      const c = M.card(api, { kicker, chart: false, valign: 'top', sourceIds: api.used() });
      const measureW = Math.min(S.w, 1240);
      const vf = T.fit(api.ctx, display, {
        weight: d.weights.value, family: d.font, maxW: measureW, maxH: TY.display.max * 1.1,
        min: TY.display.min, max: TY.display.max, lh: 1.05, maxLines: 1
      });
      const valueH = vf.size * 1.1;
      const lineF = T.font(d.weights.title, TY.headline.size, d.font);
      const lineLines = T.balance(api.ctx, line, lineF, measureW);
      const unitsF = T.font(400, TY.units.size, d.font);
      const unitsLines = unitsTxt ? T.balance(api.ctx, unitsTxt, unitsF, measureW) : [];
      const blockH = valueH + 4 * K + lineLines.length * TY.headline.lh +
        (unitsLines.length ? TY.headline.gap + unitsLines.length * TY.units.lh : 0);
      const y0 = c.textBottom + Math.max(0, (c.bottom - c.textBottom - blockH) * 0.38);
      const layers = c.layers.slice();
      layers.push({
        kind: 'counter', id: 'value', role: 'value', display, parsed: T.parseDisplay(display),
        font: vf.font, size: vf.size, color: d.ink, x: S.x, y: y0, h: valueH, align: 'left', boxW: measureW,
        at: 0.1, dur: 1.1
      });
      let y = y0 + valueH + 4 * K;
      const placed = T.place(api.ctx, lineLines, lineF, S.x, y, TY.headline.lh, 'left', measureW);
      let wi = 0;
      const wordIndex = placed.map(l => { const st = wi; wi += l.words.length; return st; });
      layers.push({
        kind: 'text', id: 'line', role: 'headline', font: lineF, size: TY.headline.size, color: d.ink,
        lines: placed, wordIndex, wordTotal: wi, at: 0.5, dur: 0.7, large: true
      });
      y += lineLines.length * TY.headline.lh;
      if (unitsLines.length) {
        y += TY.headline.gap;
        layers.push({
          kind: 'text', id: 'units', role: 'units', font: unitsF, size: TY.units.size, color: d.muted,
          lines: T.place(api.ctx, unitsLines, unitsF, S.x, y, TY.units.lh, 'left', measureW), at: 0.8, dur: 0.5
        });
      }
      const read = Math.max(M.READ.number, M.readTime(T.wordCount(line) + 1)) +
        0.15 * (T.wordCount(kicker) + T.wordCount(unitsTxt));
      return { layers, rule: c.rule, read };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
