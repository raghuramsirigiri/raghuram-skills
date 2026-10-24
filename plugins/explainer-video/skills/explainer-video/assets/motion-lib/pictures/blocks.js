/*!
 * pictures/blocks.js — a share as a 10 x 10 stack on a pallet: one unit is
 * 1% of `of`, and the key under it says so. The units are set down in a
 * diagonal sweep, then the share lights up one unit at a time with the
 * figure counting at the same pace. A plinth can lift it for a verdict.
 *
 *   "picture": { "kind": "blocks", "skin": "parcel", "of": "delivery users", "props": ["home"] }
 *
 * `split` is the same stack for parts of one whole (share-split): each part
 * lights in turn in its own tone, the first in the accent, and the key lists
 * them.
 *
 *   "picture": { "kind": "split", "of": "product page visits", "props": ["phone", "laptop"] }
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  const PP = 32, PS = 27, PH = 20, PAL = 10 * PP + 6, LIFT = 40;
  const NOUN = { parcel: 'parcel', card: 'card', plain: 'block' };
  // Back to front, so nearer units cover farther ones.
  const ORDER = [...Array(100).keys()].sort((a, b) => ((a % 10) + Math.floor(a / 10)) - ((b % 10) + Math.floor(b / 10)));

  function unit(V, x, y, z, s, h, tone, lit, skin, mat) {
    const mix = M.design.mix, on = lit > 0.5;
    if (skin === 'card') {
      // A bank card lying flat: a stripe across its back, a chip at the front.
      const d = s * 0.66, ch = Math.max(3, h * 0.22), cy = y + (s - d) / 2;
      V.box(x, cy, z, s, d, ch, tone);
      V.quad([x, cy + d * 0.12, z + ch + 0.05], [x + s, cy + d * 0.12, z + ch + 0.05], [x + s, cy + d * 0.3, z + ch + 0.05], [x, cy + d * 0.3, z + ch + 0.05], mix(tone.top, mat.ink, on ? 0.45 : 0.3));
      V.quad([x + s * 0.12, cy + d * 0.5, z + ch + 0.05], [x + s * 0.3, cy + d * 0.5, z + ch + 0.05], [x + s * 0.3, cy + d * 0.78, z + ch + 0.05], [x + s * 0.12, cy + d * 0.78, z + ch + 0.05], mix(tone.top, on ? mat.bg : mat.ink, 0.35));
      return;
    }
    V.box(x, y, z, s, s, h, tone);
    if (skin !== 'parcel') return;
    // Tape across the top and down the front.
    const tw = s * 0.11;
    V.quad([x + s / 2 - tw, y, z + h], [x + s / 2 + tw, y, z + h], [x + s / 2 + tw, y + s, z + h], [x + s / 2 - tw, y + s, z + h], mix(tone.top, on ? mat.bg : mat.ink, on ? 0.4 : 0.07));
    V.quad([x + s / 2 - tw, y + s, z + h], [x + s / 2 + tw, y + s, z + h], [x + s / 2 + tw, y + s, z + h * 0.6], [x + s / 2 - tw, y + s, z + h * 0.6], mix(tone.left, on ? mat.bg : mat.ink, on ? 0.35 : 0.07));
  }

  const BLOCKS = {
    kind: 'blocks', data: true, shares: true, liftable: true,
    needs: ['of'], skins: ['parcel', 'card', 'plain'],
    enterDur: 1.75, unitDur: 0.22,
    fillDur: n => Math.max(0.4, n * 0.026),
    prepare(place) {
      place.skin = place.pic.skin || 'plain';
      place.unitsFor = v => {
        if (!/%\s*$/.test(v.display)) throw new Error('blocks show a share in %: "' + v.display + '" is not one');
        return Math.round(Math.max(0, Math.min(100, v.value)));
      };
    },
    footprint() { return { w: PAL + 12, d: PAL + 12, h: 10 + LIFT + PH + 4, shadow: 40 }; },
    key(place) { return '= 1% of ' + place.pic.of; },
    keyIcon(V, x, y, place, W) {
      const K = M.iso.view(V.ctx, { ax: x, ay: y, cx: 0, cy: 0, s: 1, font: W.font }, V.owner);
      unit(K, -11, -11, 0, 22, 16, W.mat.N, 0, place.skin, Object.assign({ bg: W.mat.PAPER.top }, W.mat));
    },
    unitPos(place, k) { const i = k % 10, j = Math.floor(k / 10); return { x: place.x - PAL / 2 + 6 + i * PP + PS / 2, y: place.y - PAL / 2 + 6 + j * PP + PS / 2 }; },
    draw(V, place, t, W) {
      const m = W.mat, ctx = V.ctx, a0 = ctx.globalAlpha;
      const mat = Object.assign({ bg: m.PAPER.top }, m);
      const lift = M.world.liftAt(place, t, LIFT);
      const x0 = place.x - PAL / 2, y0 = place.y - PAL / 2;
      V.shadow(x0 - 6, y0 - 6, PAL + 12, PAL + 12, 30 + lift, m.shadow);
      if (lift > 0.5) V.box(x0 - 6, y0 - 6, 0, PAL + 12, PAL + 12, lift, m.N2);
      V.box(x0, y0, lift, PAL, PAL, 10, m.N2);
      for (const k of ORDER) {
        const i = k % 10, j = Math.floor(k / 10);
        const q = M.world.arrivedAt(place, i, j, 10, t, 0.45);
        if (q <= 0) continue;
        const lit = M.world.litAt(place, k, t);
        const z = lift + 10 + (1 - M.ease.outQuint(q)) * 70;
        ctx.globalAlpha = a0 * Math.min(1, q * 2.5);
        unit(V, x0 + 6 + i * PP, y0 + 6 + j * PP, z, PS, PH, m.between(m.N, m.A, lit), lit, place.skin, mat);
      }
      ctx.globalAlpha = a0;
    },
    icon(V, place, W) {
      const mat = Object.assign({ bg: W.mat.PAPER.top }, W.mat);
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) unit(V, i * 24 - 24, j * 24 - 24, 0, 21, 15, W.mat.A, 1, place.skin, mat);
    },
    noun: place => NOUN[place.skin] || 'block'
  };
  M.pictures.register(BLOCKS);

  // Parts of one whole: each unit belongs to a part, in order; the first
  // part (or the one marked emph) takes the accent, the rest step darker.
  M.pictures.register(Object.assign({}, BLOCKS, {
    kind: 'split', parts: true, shares: false, liftable: false, skins: ['plain', 'card', 'parcel'],
    prepare(place, it) {
      place.skin = place.pic.skin || 'plain';
      const rows = it.built.values || [];
      const owner = [];
      rows.forEach((r, i) => { for (let k = 0; k < Math.round(r.value); k++) owner.push(i); });
      const lead = Math.max(0, rows.findIndex(r => r.emph));
      place.owner = owner; place.rows = rows; place.lead = lead;
      place.unitsFor = () => { throw new Error('split shows parts of one whole, not a single share'); };
    },
    tones(place, m) {
      const mix = M.design.mix;
      let n = 0;
      return place.rows.map((r, i) => {
        if (i === place.lead) return m.A;
        const k = 0.42 + 0.18 * n++;
        return { top: mix(m.bg || m.PAPER.top, m.ink, k * 0.55), left: mix(m.bg || m.PAPER.top, m.ink, k * 0.8), right: mix(m.bg || m.PAPER.top, m.ink, k) };
      });
    },
    // The unit, then each part with its swatch (coloured once the world has painted it).
    key(place) {
      const tones = place.mat ? this.tones(place, place.mat) : null;
      return [{ text: '= 1% of ' + place.pic.of, swatch: null }].concat(place.rows.map((r, i) => ({ text: r.label + '  ' + r.display, swatch: tones ? tones[i].left : '#888888' })));
    },
    draw(V, place, t, W) {
      place.mat = W.mat;
      const m = W.mat, ctx = V.ctx, a0 = ctx.globalAlpha;
      const mat = Object.assign({ bg: m.PAPER.top }, m);
      const tones = this.tones(place, Object.assign({ bg: m.PAPER.top }, m));
      const x0 = place.x - PAL / 2, y0 = place.y - PAL / 2;
      V.shadow(x0 - 6, y0 - 6, PAL + 12, PAL + 12, 30, m.shadow);
      V.box(x0, y0, 0, PAL, PAL, 10, m.N2);
      for (const k of ORDER) {
        const i = k % 10, j = Math.floor(k / 10);
        const q = M.world.arrivedAt(place, i, j, 10, t, 0.45);
        if (q <= 0) continue;
        const lit = M.world.litAt(place, k, t), own = place.owner[k];
        const tone = own == null ? m.N : m.between(m.N, tones[own], lit);
        ctx.globalAlpha = a0 * Math.min(1, q * 2.5);
        unit(V, x0 + 6 + i * PP, y0 + 6 + j * PP, 10 + (1 - M.ease.outQuint(q)) * 70, PS, PH, tone, own === place.lead ? lit : 0, place.skin, mat);
      }
      ctx.globalAlpha = a0;
    },
    icon(V, place, W) {
      const tones = this.tones(place, Object.assign({ bg: W.mat.PAPER.top }, W.mat));
      const mat = Object.assign({ bg: W.mat.PAPER.top }, W.mat);
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) unit(V, i * 24 - 24, j * 24 - 24, 0, 21, 15, j === 0 ? tones[0] : tones[1] || W.mat.N, 1, place.skin, mat);
    }
  }));
})(typeof window !== 'undefined' ? window : globalThis);
