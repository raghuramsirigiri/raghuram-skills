/*!
 * things/paper.js — paper that stories count: forms and applications,
 * letters, invoices and receipts, file folders, books. Thin things: they
 * pile into stacks, one sheet on another, every tenth a shade darker so the
 * tens can be counted.
 *
 *   "picture": { "things": "application", "arrange": "piles", "of": "applications started online",
 *                "parts": ["Never submitted", "Submitted"] }
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  const mix = (a, b, k) => M.design.mix(a, b, k);

  // The tint a unit wears: its natural material, or its part's tint.
  const toneOf = (o, natural) => (o.kind === 'rest' ? natural : o.body);
  const ink = (o, t) => (o.kind === 'rest' ? o.mat.line : mix(t.top, o.mat.ink, 0.28));

  function quadOn(V, x, y, z, w, d, a, b, c, e, color) {
    V.quad([x + a * w, y + b * d, z], [x + c * w, y + b * d, z], [x + c * w, y + e * d, z], [x + a * w, y + e * d, z], color);
  }

  const SHEET = 1.4;
  const things = [
    {
      name: 'form', aka: ['application', 'applications', 'form', 'claim', 'survey-form', 'document', 'page', 'sheet', 'report'],
      size: { w: 38, d: 50, h: SHEET }, stack: 3.0, natural: 'PAPER',
      draw(V, x, y, z, o) {
        const m = o.mat, t = toneOf(o, m.PAPER), x0 = x - 19, y0 = y - 25, zt = z + SHEET + 0.05, c = ink(o, t);
        V.box(x0, y0, z, 38, 50, SHEET, t);
        quadOn(V, x0, y0, zt, 38, 50, 0.12, 0.08, 0.6, 0.16, o.kind === 'rest' ? m.dark : mix(t.top, m.ink, 0.5));
        for (let l = 0; l < 4; l++) quadOn(V, x0, y0, zt, 38, 50, 0.12, 0.3 + l * 0.13, l === 3 ? 0.5 : 0.88, 0.34 + l * 0.13, c);
        quadOn(V, x0, y0, zt, 38, 50, 0.55, 0.86, 0.88, 0.885, c);           // a signature line
      }
    },
    {
      name: 'letter', aka: ['letters', 'envelope', 'mail', 'post'],
      size: { w: 46, d: 30, h: 1.8 }, stack: 3.2, natural: 'PAPER',
      draw(V, x, y, z, o) {
        const m = o.mat, t = toneOf(o, m.PAPER), x0 = x - 23, y0 = y - 15, zt = z + 1.85, c = ink(o, t);
        V.box(x0, y0, z, 46, 30, 1.8, t);
        V.path([[x0 + 1, y0 + 1, zt], [x0 + 23, y0 + 17, zt], [x0 + 45, y0 + 1, zt]], c, 1.6 * V.s);
        quadOn(V, x0, y0, zt, 46, 30, 0.7, 0.62, 0.9, 0.86, c);             // a stamp
      }
    },
    {
      name: 'invoice', aka: ['invoices', 'receipt', 'receipts', 'bill', 'bills', 'statement'],
      size: { w: 28, d: 46, h: SHEET }, stack: 3.0, natural: 'PAPER',
      draw(V, x, y, z, o) {
        const m = o.mat, t = toneOf(o, m.PAPER), x0 = x - 14, y0 = y - 23, zt = z + SHEET + 0.05, c = ink(o, t);
        V.box(x0, y0, z, 28, 46, SHEET, t);
        for (let l = 0; l < 4; l++) {
          quadOn(V, x0, y0, zt, 28, 46, 0.14, 0.14 + l * 0.14, 0.5, 0.18 + l * 0.14, c);
          quadOn(V, x0, y0, zt, 28, 46, 0.66, 0.14 + l * 0.14, 0.86, 0.18 + l * 0.14, c);
        }
        quadOn(V, x0, y0, zt, 28, 46, 0.14, 0.76, 0.86, 0.78, c);
        quadOn(V, x0, y0, zt, 28, 46, 0.5, 0.82, 0.86, 0.9, o.kind === 'rest' ? m.dark : mix(t.top, m.ink, 0.5));   // the total
      }
    },
    {
      name: 'folder', aka: ['folders', 'file', 'files', 'case', 'cases', 'record', 'records', 'dossier'],
      size: { w: 40, d: 50, h: 3.6 }, stack: 5.2, natural: 'N2',
      draw(V, x, y, z, o) {
        const m = o.mat, t = toneOf(o, m.N2), x0 = x - 20, y0 = y - 25;
        V.box(x0 + 3, y0 - 4, z + 1.2, 13, 6, 2.2, t);                       // the tab
        V.box(x0, y0, z, 40, 50, 3.6, t);
        quadOn(V, x0, y0, z + 3.65, 40, 50, 0.08, 0.04, 0.92, 0.07, mix(t.top, m.PAPER.top, 0.6));   // paper peeking out
        quadOn(V, x0, y0, z + 3.65, 40, 50, 0.2, 0.36, 0.8, 0.5, mix(t.top, m.PAPER.top, 0.75));    // the label
      }
    },
    {
      name: 'book', aka: ['books', 'manual', 'ledger'],
      size: { w: 34, d: 46, h: 7 }, stack: 7.6, natural: 'N2',
      draw(V, x, y, z, o) {
        const m = o.mat, t = toneOf(o, m.N2), x0 = x - 17, y0 = y - 23;
        V.box(x0, y0, z, 34, 46, 7, t);
        V.quad([x0 + 34, y0 + 2, z + 1.2], [x0 + 34, y0 + 44, z + 1.2], [x0 + 34, y0 + 44, z + 5.8], [x0 + 34, y0 + 2, z + 5.8], m.PAPER.left);
        quadOn(V, x0, y0, z + 7.05, 34, 46, 0.22, 0.2, 0.78, 0.3, mix(t.top, m.ink, 0.22));
      }
    }
  ];
  things.forEach(d => M.things.register(Object.assign({ role: 'unit' }, d)));
})(typeof window !== 'undefined' ? window : globalThis);
