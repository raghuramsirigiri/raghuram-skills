/*!
 * things/money.js — money and goods: bank cards, coins, banknotes, parcels
 * and crates. Cards, coins and notes pile into stacks; parcels and crates
 * are bulky, so they pile in blocks.
 *
 *   "picture": { "things": "card", "arrange": "sort", "of": "new business current accounts",
 *                "parts": ["Online", "Branch or phone"], "to": ["laptop", "branch"] }
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  const mix = (a, b, k) => M.design.mix(a, b, k);
  const toneOf = (o, natural) => (o.kind === 'rest' ? natural : o.body);
  function quadOn(V, x, y, z, w, d, a, b, c, e, color) {
    V.quad([x + a * w, y + b * d, z], [x + c * w, y + b * d, z], [x + c * w, y + e * d, z], [x + a * w, y + e * d, z], color);
  }

  const things = [
    {
      name: 'card', aka: ['cards', 'account', 'accounts', 'bank-card', 'credit-card', 'debit-card', 'membership', 'payment', 'payments'],
      size: { w: 36, d: 23, h: 2.2 }, stack: 3.4, natural: 'N2',
      draw(V, x, y, z, o) {
        const m = o.mat, t = toneOf(o, m.N2), x0 = x - 18, y0 = y - 11.5, zt = z + 2.25;
        V.box(x0, y0, z, 36, 23, 2.2, t);
        quadOn(V, x0, y0, zt, 36, 23, 0.1, 0.32, 0.3, 0.6, mix(t.top, m.PAPER.top, 0.7));       // the chip
        quadOn(V, x0, y0, zt, 36, 23, 0.1, 0.74, 0.78, 0.82, mix(t.top, m.ink, 0.25));         // the number
      }
    },
    {
      name: 'coin', aka: ['coins', 'cash', 'money', 'pound', 'pounds', 'dollar', 'dollars', 'euro', 'euros', 'saving', 'savings'],
      size: { w: 22, d: 22, h: 3 }, stack: 3.6, natural: 'N2',
      draw(V, x, y, z, o) {
        const t = toneOf(o, o.mat.N2);
        V.token(x, y, z, 11, 3, t.top, t.right);
      }
    },
    {
      name: 'note', aka: ['notes', 'banknote', 'banknotes', 'bill-note'],
      size: { w: 48, d: 24, h: 1.2 }, stack: 2.4, natural: 'N2',
      draw(V, x, y, z, o) {
        const m = o.mat, t = toneOf(o, m.N2), x0 = x - 24, y0 = y - 12, zt = z + 1.25;
        V.box(x0, y0, z, 48, 24, 1.2, t);
        quadOn(V, x0, y0, zt, 48, 24, 0.06, 0.12, 0.94, 0.88, mix(t.top, m.ink, 0.08));
        quadOn(V, x0, y0, zt, 48, 24, 0.38, 0.3, 0.62, 0.7, mix(t.top, m.PAPER.top, 0.5));
      }
    },
    {
      name: 'parcel', aka: ['parcels', 'package', 'packages', 'delivery', 'deliveries', 'order', 'orders', 'shipment', 'shipments', 'box', 'boxes'],
      size: { w: 28, d: 28, h: 22 }, bulky: true, natural: 'N',
      draw(V, x, y, z, o) {
        const m = o.mat, t = toneOf(o, m.N), x0 = x - 14, y0 = y - 14, on = o.kind !== 'rest';
        V.box(x0, y0, z, 28, 28, 22, t);
        const tape = mix(t.top, on ? m.PAPER.top : m.ink, on ? 0.4 : 0.08);
        V.quad([x0 + 11, y0, z + 22.05], [x0 + 17, y0, z + 22.05], [x0 + 17, y0 + 28, z + 22.05], [x0 + 11, y0 + 28, z + 22.05], tape);
        V.quad([x0 + 11, y0 + 28.05, z + 22], [x0 + 17, y0 + 28.05, z + 22], [x0 + 17, y0 + 28.05, z + 14], [x0 + 11, y0 + 28.05, z + 14], mix(t.left, on ? m.PAPER.top : m.ink, on ? 0.35 : 0.08));
      }
    },
    {
      name: 'crate', aka: ['crates', 'stock', 'goods', 'product', 'products', 'item', 'items', 'unit', 'units'],
      size: { w: 30, d: 30, h: 24 }, bulky: true, natural: 'N2',
      draw(V, x, y, z, o) {
        const m = o.mat, t = toneOf(o, m.N2), x0 = x - 15, y0 = y - 15;
        V.box(x0, y0, z, 30, 30, 24, t);
        const slat = mix(t.left, m.ink, 0.14);
        [7, 15].forEach(h => V.quad([x0, y0 + 30.05, z + h], [x0 + 30, y0 + 30.05, z + h], [x0 + 30, y0 + 30.05, z + h + 1.4], [x0, y0 + 30.05, z + h + 1.4], slat));
        [7, 15].forEach(h => V.quad([x0 + 30.05, y0, z + h], [x0 + 30.05, y0 + 30, z + h], [x0 + 30.05, y0 + 30, z + h + 1.4], [x0 + 30.05, y0, z + h + 1.4], mix(t.right, m.ink, 0.14)));
      }
    }
  ];
  things.forEach(d => M.things.register(Object.assign({ role: 'unit' }, d)));
})(typeof window !== 'undefined' ? window : globalThis);
