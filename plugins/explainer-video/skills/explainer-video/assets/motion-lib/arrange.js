/*!
 * motion-lib/arrange.js — how a picture's things stand: the arrangements of
 * the continuous style, and the exact scale that makes a share a whole
 * number of things.
 *
 *   "picture": { "things": "application", "arrange": "piles", "of": "applications started online",
 *                "parts": ["Never submitted", "Submitted"] }
 *
 * An arrangement takes the whole (T things) and its parts — the share first,
 * the rest last — and says where every thing stands once the picture has
 * played, where the whole stands before it parts, where props stand, and
 * where each part's label and the key go. Positions are world points about
 * the place's anchor; the layout is planned in row coordinates (u along the
 * screen's row, v toward the viewer), so a layout's screen box is simple:
 * X = 1.2247 u s, Y = (0.7071 v - z) s.
 *
 *   piles  the whole as one stack that parts, one pile per part (thin things
 *          in one column of up to 100, so heights compare, every tenth a
 *          shade darker; bulky ones in blocks)
 *   sort   the whole streams in and is dealt to destinations (`to`), one per
 *          part, and piles there
 *   queue  a line, leading to `to` if given; the share steps out of it
 *   group  a crowd; the share gathers apart
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  const R2 = Math.SQRT2, COS = 0.8660254;
  const pt = (u, v, z) => ({ x: (u + v) / R2, y: (v - u) / R2, z: z || 0 });
  const uOf = p => (p.x - p.y) / R2;
  const vOf = p => (p.x + p.y) / R2;
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  // ── the exact scale ──────────────────────────────────────────────────
  // The whole a share is drawn out of: the first count, in the arrangement's
  // order of preference, at which every value the place shows is a whole
  // number of things. People prefer fewer, larger figures; papers and cards a
  // hundred, one per 1%.
  const WHOLES = {
    piles: [100, 50, 200, 20, 25, 10], sort: [100, 50, 200, 20, 25, 10],
    queue: [20, 25, 50, 100, 200, 10], group: [20, 25, 50, 100, 200, 10]
  };
  function exactWhole(values, arrange, people) {
    const order = (people && arrange !== 'queue' ? WHOLES.group : WHOLES[arrange]) || WHOLES.piles;
    for (const T of order) if (values.every(v => Math.abs(v * T / 100 - Math.round(v * T / 100)) < 1e-6)) return T;
    return null;
  }
  // "1 form = 1% of …", "1 figure = 0.5% of …", "1 figure = 20 people".
  function keyText(place) {
    const noun = place.thing.people ? 'figure' : place.thing.name;
    if (place.per) return '1 ' + noun + ' = ' + place.per.toLocaleString('en-GB') + ' ' + place.pic.of;
    if (place.count) return '1 ' + noun + ' = 1 of ' + place.pic.of;
    const pc = 100 / place.T;
    return '1 ' + noun + ' = ' + (Number.isInteger(pc) ? pc : pc.toFixed(1).replace(/\.0$/, '')) + '% of ' + place.pic.of;
  }

  // A thing's screen box about its spot, at scale s: { l, r, t, b } in px.
  function unitBox(th, s) {
    if (th.people) { const H = th.size.h * 1.06; return { l: 0.28 * H * s, r: 0.3 * H * s, t: 1.05 * H * s, b: 0.14 * H * s }; }
    const half = (th.size.w + th.size.d) / 2 * COS * s;
    return { l: half, r: half + 6 * s, t: (th.size.h + (th.size.w + th.size.d) / 4) * s, b: (th.size.w + th.size.d) / 4 * s + 4 * s };
  }
  const uWidth = th => (th.people ? (th.spacing || th.size.w + 4) : 0.7071 * (th.size.w + th.size.d));

  // ── piles ────────────────────────────────────────────────────────────
  // A part's pile is one column up to COL things, so the piles' heights
  // compare.
  const COL = 100;
  // Slot j of a pile of n things centred at (u0, v0): thin things in
  // columns of `per`, one on another; bulky ones in a block, layer by layer.
  function pileSlots(th, n, u0, v0, per) {
    const out = [];
    if (!n) return out;
    per = per || COL;
    if (!th.bulky) {
      const c = Math.ceil(n / per), step = uWidth(th) + 6;
      for (let j = 0; j < n; j++) {
        const col = Math.floor(j / per), lev = j % per;
        out.push(pt(u0 + (col - (c - 1) / 2) * step, v0, lev * th.stack));
      }
      return out;
    }
    const layers = Math.max(1, Math.min(5, Math.round(Math.cbrt(n)))), perL = Math.ceil(n / layers);
    const cols = Math.ceil(Math.sqrt(perL)), rows = Math.ceil(perL / cols);
    const w = th.size.w + 3, d = th.size.d + 3, c = pt(u0, v0, 0);
    for (let j = 0; j < n; j++) {
      const L = Math.floor(j / perL), r = j % perL, row = Math.floor(r / cols), col = r % cols;
      out.push({ x: c.x + (col - (cols - 1) / 2) * w, y: c.y + (row - (rows - 1) / 2) * d, z: L * (th.size.h + 1) });
    }
    return out;
  }
  // How wide a pile of n things is along the row.
  function pileWidth(th, n, per) {
    if (!th.bulky) return Math.max(1, Math.ceil(Math.max(1, n) / (per || COL))) * (uWidth(th) + 6);
    const layers = Math.max(1, Math.min(5, Math.round(Math.cbrt(n)))), perL = Math.ceil(n / layers), cols = Math.ceil(Math.sqrt(perL)), rows = Math.ceil(perL / cols);
    return 0.7071 * (cols * (th.size.w + 3) + rows * (th.size.d + 3));
  }

  function piles(place) {
    const th = place.thing, P = place.parts, gap = 70, half = place.labelHalfU || [];
    // The part that stays where the whole stood: the rest, or the last part.
    const stay = P.length - 1;
    const widths = P.map((p, i) => pileWidth(th, i === stay ? place.T : p.cap));
    const order = [stay].concat(P.map((p, i) => i).filter(i => i !== stay));
    // Side by side, far enough apart for their labels.
    const centre = {};
    let u = 0;
    order.forEach((i, k) => {
      if (k) { const j = order[k - 1]; u += Math.max(widths[j] / 2 + gap + widths[i] / 2, (half[j] || 0) + (half[i] || 0)); }
      centre[i] = u;
    });
    const mid = (centre[order[0]] + centre[order[order.length - 1]]) / 2;
    order.forEach(i => { centre[i] -= mid; });
    const whole = pileSlots(th, place.T, centre[stay], 0);
    const parts = P.map((p, i) => ({ slots: i === stay ? whole.slice(0, p.cap) : pileSlots(th, p.cap, centre[i], 0), stays: i === stay, u: centre[i] }));
    return { whole, parts, props: [], dealt: false };
  }

  // ── sort: dealt from the whole to a destination per part ─────────────
  // The destinations stand side by side, each part's pile in front of its
  // own. The whole streams in from beyond the frame's left and is dealt as
  // it comes, so the stage holds only the destinations and their piles.
  function sort(place) {
    const th = place.thing, P = place.parts, props = place.props, half = place.labelHalfU || [];
    if (props.length !== P.length) throw new Error('sort: give "to" one destination per part (' + P.length + ': ' + P.map(p => p.label || 'the rest').join(', ') + ')');
    const pw = props.map(pr => 0.7071 * (pr.def.size.w + pr.def.size.d));
    const centre = [];
    let u = 0;
    pw.forEach((w, i) => {
      if (i) u += Math.max(pw[i - 1] / 2 + 60 + w / 2, (half[i - 1] || 0) + (half[i] || 0));
      centre.push(u);
    });
    const mid = (centre[0] + centre[centre.length - 1]) / 2;
    const parts = P.map((p, i) => {
      const uc = centre[i] - mid, back = pw[i] * 0.42;
      props[i].pos = pt(uc, -back, 0);
      props[i].part = i;
      return { slots: pileSlots(th, p.cap, uc, back), stays: false, u: uc };
    });
    // From the front left, low, so the stream passes in front of the destinations.
    const from = pt(centre[0] - mid - pw[0] / 2 - 1100, Math.max(...pw) * 0.42 + 70, 50);
    const whole = [];
    for (let j = 0; j < place.T; j++) whole.push({ x: from.x, y: from.y, z: from.z });
    return { whole, parts, props, dealt: true, stream: true };
  }

  // ── queue: a line; the share steps out of it ─────────────────────────
  // Two abreast once it is long. The share is spread through the line, as
  // it would be: the one at the middle of each equal stretch steps out to
  // the front, holding what it came for.
  function queue(place) {
    const th = place.thing, P = place.parts, sp = th.spacing || uWidth(th) + 6;
    const lanes = place.T > 120 ? 3 : place.T > 60 ? 2 : 1, lane = th.size.h * 0.42;
    const head = place.props[0] || null;
    const headW = head ? 0.7071 * (head.def.size.w + head.def.size.d) : 0;
    const u0 = headW / 2 + (head ? 50 : 0);
    // Abreast lanes are staggered, and nobody stands exactly on the mark.
    const spot = k => {
      const L = k % lanes, i = Math.floor(k / lanes);
      return pt(u0 + i * sp + L * sp / lanes + (hash(k) - 0.5) * sp * 0.22, -L * lane + (hash(k + 51) - 0.5) * lane * 0.25, 0);
    };
    const whole = [];
    for (let k = 0; k < place.T; k++) whole.push(spot(k));
    if (head) { head.pos = pt(0, -lane * (lanes - 1) / 2, 0); head.part = -1; }
    const n = P[0].cap, picks = [];
    for (let k = 0; k < n; k++) picks.push(Math.min(place.T - 1, Math.floor((k + 0.5) * place.T / n)));
    const ahead = th.size.h * 0.75;
    const parts = [
      { slots: picks.map(k => pt(uOf(whole[k]), ahead, 0)), from: picks, stays: false, u: null },
      { slots: whole.slice(), stays: true, u: null }
    ];
    return { whole, parts, props: head ? [head] : [], dealt: false, line: { u0, u1: u0 + (Math.ceil(place.T / lanes) - 1) * sp } };
  }

  // ── group: a crowd; the share gathers apart ──────────────────────────
  function blob(n, sp, aspect) {
    const out = [];
    const R = Math.ceil(Math.sqrt(n / aspect)) + 3;
    for (let r = -R; r <= R; r++) for (let c = -R * 2; c <= R * 2; c++) {
      const u = (c + (r & 1) * 0.5) * sp, v = r * sp * 0.86;
      out.push({ u, v, d: (u / aspect) * (u / aspect) + v * v * 1.0, k: out.length });
    }
    out.sort((a, b) => a.d - b.d || a.k - b.k);
    return out.slice(0, n).map((q, i) => ({ u: q.u + (hash(i) - 0.5) * sp * 0.3, v: q.v + (hash(i + 99) - 0.5) * sp * 0.25 }));
  }
  function group(place) {
    const th = place.thing, P = place.parts, sp = th.spacing || uWidth(th) + 6;
    const n = P.length > 1 ? P[0].cap : 0;
    const all = blob(place.T, sp, 1.5);
    // The share: the ones on the right of the crowd, who then gather apart.
    const byU = all.map((q, i) => ({ q, i })).sort((a, b) => b.q.u - a.q.u);
    const sharers = new Set(byU.slice(0, n).map(e => e.i));
    const restSpots = all.filter((q, i) => !sharers.has(i));
    const fromSpots = all.filter((q, i) => sharers.has(i));
    const shareBlob = blob(n, sp, 1.3);
    const shift = n ? Math.max(...all.map(q => q.u)) + sp * 2.6 + (n ? Math.max(...shareBlob.map(q => -q.u), 0) : 0) : 0;
    // Back to front, so the far ones are drawn first.
    const byDepth = (a, b) => a.v - b.v || a.u - b.u;
    restSpots.sort(byDepth); fromSpots.sort(byDepth);
    const shareSpots = shareBlob.map(q => ({ u: q.u + shift, v: q.v })).sort(byDepth);
    const whole = restSpots.concat(fromSpots).map(q => pt(q.u, q.v, 0));
    const parts = P.length > 1
      ? [{ slots: shareSpots.map(q => pt(q.u, q.v, 0)), from: fromSpots.map((q, i) => restSpots.length + i), stays: false, u: shift },
        { slots: whole.slice(0, restSpots.length), stays: true, u: 0 }]
      : [{ slots: whole.slice(), stays: true, u: 0 }];
    // Centre the finished picture on the anchor.
    const us = parts.reduce((a, p) => a.concat(p.slots.map(uOf)), []);
    const mid = (Math.min(...us) + Math.max(...us)) / 2;
    const mv = q => { const u = uOf(q) - mid, v = vOf(q); return pt(u, v, q.z); };
    return { whole: whole.map(mv), parts: parts.map(p => Object.assign(p, { slots: p.slots.map(mv) })), props: [], dealt: false };
  }

  const ARRANGE = { piles, sort, queue, group };
  // Which arrangements a thing can take.
  function fits(th, arrange) {
    if (arrange === 'piles' || arrange === 'sort') return !th.people || arrange === 'sort';
    if (arrange === 'queue' || arrange === 'group') return true;
    return false;
  }

  // The finished layout's screen box at scale s, about the anchor, with the
  // props and the thing's own size; a queue's box is its whole line.
  function bounds(place, L, s) {
    const ub = unitBox(place.thing, s);
    let X0 = Infinity, X1 = -Infinity, Y0 = Infinity, Y1 = -Infinity;
    const add = (p, b) => {
      const X = (p.x - p.y) * COS * s, Y = ((p.x + p.y) / 2 - p.z) * s;
      X0 = Math.min(X0, X - b.l); X1 = Math.max(X1, X + b.r); Y0 = Math.min(Y0, Y - b.t); Y1 = Math.max(Y1, Y + b.b);
    };
    if (!L.stream) L.whole.forEach(p => add(p, ub));
    L.parts.forEach(pp => pp.slots.forEach(p => add(p, ub)));
    L.props.forEach(pr => {
      const g = pr.def.size, half = (g.w + g.d) / 2 * COS * s;
      add(pr.pos, { l: half, r: half + g.h * 0.3 * s, t: (g.h + (g.w + g.d) / 4) * s, b: (g.w + g.d) / 4 * s + 10 * s });
    });
    return { X0, X1, Y0, Y1 };
  }

  M.arrange = { ARRANGE, exactWhole, keyText, unitBox, bounds, fits, pt, uOf, vOf, names: Object.keys(ARRANGE) };
  if (typeof module !== 'undefined' && module.exports) module.exports = M.arrange;
})(typeof window !== 'undefined' ? window : globalThis);
