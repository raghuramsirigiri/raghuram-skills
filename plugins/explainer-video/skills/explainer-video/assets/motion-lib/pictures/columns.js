/*!
 * pictures/columns.js — values in one unit, as blocks standing in a row
 * across the screen: `columns` for two to six values (quarters, stages),
 * `funnel` for stages that only narrow, each stage's loss a ghost above it,
 * and `podium` for a ranking, largest first with the first in the accent and
 * long names wrapped under each column. Heights start from zero; every value
 * is labelled with its claim's own display, every name with the spec's own
 * label.
 *
 *   compare-bars + "picture": { "kind": "columns" }   (the default for a series)
 *   compare-bars + "picture": { "kind": "funnel" }
 *   ranked-list  + "picture": { "kind": "podium" }    (the default for a ranking)
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  const COS = 0.8660254, HMAX = 300, PLATE = 8;

  const lab = () => M.world.LABEL;
  const stepOf = n => Math.min(210, 880 / n);

  // Shared: the values, and which one carries the accent.
  function prepare(place, it) {
    const rows = it.built.values || [];
    if (rows.length < 2) throw new Error(place.kind + ': needs two or more values');
    if (rows.some(r => !(r.value >= 0))) throw new Error(place.kind + ': values must be zero or more');
    place.rows = rows;
    place.max = Math.max(...rows.map(r => r.value)) || 1;
    place.lead = rows.findIndex(r => r.emph);
    // The room a column needs on screen: its longest word, or its value, at label size.
    const word = s => Math.max(...String(s).split(/\s+/).map(w => w.length));
    place.need = Math.max(...rows.map(r => Math.max(word(r.label), String(r.display).length))) * lab() * 0.62 + 22;
    if (place.kind === 'funnel') for (let i = 1; i < rows.length; i++) if (rows[i].value > rows[i - 1].value) throw new Error('funnel: each stage must be no larger than the one before ("' + rows[i].label + '" grows)');
  }
  const toneOf = (place, i, m) => (i === place.lead || (place.lead < 0 && place.kind === 'podium' && i === 0) ? m.A : m.N2);
  const grown = (place, i, t, stag) => (place.enter ? M.ease.outQuint(M.world.clamp((t - place.enter.t0 - i * stag) / 0.75)) : 1);

  // Words in the world: centred, or left-aligned, at a screen point; wrapped to a width.
  function words(V, place, str, x, y, align, maxW, weight, alpha, id, sz) {
    if (alpha <= 0.001) return;
    const size = sz || lab(), f = M.text.font(weight, size, V.font || place.font);
    const lines = M.text.balance(V.ctx, str, f, maxW);
    lines.forEach((ln, n) => {
      const w = M.text.measure(V.ctx, ln, f);
      M.paint.text(V.ctx, ln, align === 'center' ? x - w / 2 : x, y + n * size * 1.2, { font: f, color: place.ink, h: size * 1.2, w, alpha, layer: 'world-label:' + place.id + ':' + id + ':' + n, role: 'label', size });
    });
  }

  // ── columns, funnel, podium ────────────────────────────────────────
  // A ranking's names run long: a size smaller, up to three lines.
  const nameSize = place => (place.kind === 'podium' ? lab() * 0.87 : lab());
  const nameLines = place => (place.kind === 'podium' ? 3 : place.kind === 'funnel' ? 3 : 2);
  // Columns stand stepOf(n) apart in the world, but never closer on screen
  // than their names need: a smaller world spreads them a little wider.
  const screenStep = (place, s) => Math.max(stepOf(place.rows.length) * s, place.need);
  function colGeo(place, s) {
    const n = place.rows.length, st = screenStep(place, s), a = stepOf(n) * 0.3 * s, L = lab();
    return { x0: -n * st / 2 - 30 * s, x1: n * st / 2 + 30 * s, y0: -(HMAX + PLATE) * s - a / 2 - L * 1.8, y1: a / 2 + 28 + nameSize(place) * 1.2 * nameLines(place) + (place.kind === 'funnel' ? L * 1.25 : 0) };
  }
  function drawColumns(V, place, t, W) {
    const m = W.mat, n = place.rows.length, a = stepOf(n) * 0.3, stag = 0.35;
    const step = screenStep(place, V.s) / V.s;   // in world px at scale 1, like everything V.P draws
    place.ink = m.ink; V.font = W.font;
    const along = o => ({ x: place.x + o / (2 * COS), y: place.y - o / (2 * COS) });
    // The plate they stand on, its edges along the screen row.
    const Ls = n * step / 2 + 30, Ds = a / 2 + 16;
    const c = (o, d, z) => { const p = along(o); return [p.x + d, p.y + d, z]; };
    V.quad(c(-Ls, -Ds, PLATE), c(Ls, -Ds, PLATE), c(Ls, Ds, PLATE), c(-Ls, Ds, PLATE), m.N.top);
    V.quad(c(-Ls, Ds, PLATE), c(Ls, Ds, PLATE), c(Ls, Ds, 0), c(-Ls, Ds, 0), m.N2.left);
    place.rows.forEach((r, i) => {
      const o = (i - (n - 1) / 2) * step, p = along(o);
      const h = HMAX * r.value / place.max, g = grown(place, i, t, stag);
      if (g > 0.001) V.box(p.x - a / 2, p.y - a / 2, PLATE, a, a, Math.max(0.5, h * g), toneOf(place, i, m));
      // A funnel shows what each stage lost: a ghost up to the stage before.
      if (place.kind === 'funnel' && i > 0) {
        const prev = HMAX * place.rows[i - 1].value / place.max;
        const q = place.enter ? M.world.sstep(place.enter.t0 + n * stag + 0.5, place.enter.t0 + n * stag + 1.1, t) : 1;
        if (q > 0.001 && prev > h) {
          V.ctx.save(); V.ctx.globalAlpha *= 0.55 * q;
          V.box(p.x - a / 2, p.y - a / 2, PLATE + h, a, a, prev - h, m.between(m.N, m.A, M.world.GHOST * 1.4));
          V.ctx.restore();
        }
      }
      // Labels are read with the beat's words, and leave with them when the camera moves on.
      const show = M.world.sstep(0.85, 1, g) * (W.cam ? (W.cam.view[place.id] || 0) * W.cam.labels : 1);
      const [tx, ty] = V.P(p.x, p.y, PLATE + h);
      const [fx, fy] = V.P(p.x + Ds, p.y + Ds, 0);
      // The value sits on its column; in a funnel, where a ghost stands
      // above, it sits under the plate, over the stage's name.
      if (place.kind === 'funnel') {
        words(V, place, r.display, fx, fy + 10, 'center', step * V.s - 14, 700, show, 'v' + i);
        words(V, place, r.label, fx, fy + 10 + lab() * 1.25, 'center', step * V.s - 14, 400, show, 'c' + i, nameSize(place));
      } else {
        words(V, place, r.display, tx, ty - (a / 2) * V.s - lab() * 1.45, 'center', step * V.s, 700, show, 'v' + i);
        words(V, place, r.label, fx, fy + 10, 'center', step * V.s - 14, 400, show, 'c' + i, nameSize(place));
      }
    });
  }

  const SERIES = { data: true, series: true, enterAt: 0.15, prepare };
  M.pictures.register(Object.assign({}, SERIES, {
    kind: 'columns', enterDur: place => 0.75 + 0.35 * (place.rows.length - 1),
    footprint: place => ({ w: 0, d: 0, h: 0 }), geo: colGeo, draw: drawColumns,
    icon(V, place, W) { [0.5, 0.75, 1].forEach((k, i) => V.box(i * 22 - 30, -i * 22 + 4, 0, 16, 16, 42 * k, i === 2 ? W.mat.A : W.mat.N2)); }
  }));
  M.pictures.register(Object.assign({}, SERIES, {
    kind: 'funnel', enterDur: place => 0.75 + 0.35 * (place.rows.length - 1) + 1.2,
    footprint: place => ({ w: 0, d: 0, h: 0 }), geo: colGeo, draw: drawColumns,
    icon(V, place, W) { [1, 0.6, 0.4].forEach((k, i) => V.box(i * 22 - 30, -i * 22 + 4, 0, 16, 16, 42 * k, W.mat.N2)); }
  }));
  M.pictures.register(Object.assign({}, SERIES, {
    kind: 'podium', enterDur: place => 0.75 + 0.35 * (place.rows.length - 1),
    footprint: place => ({ w: 0, d: 0, h: 0 }), geo: colGeo, draw: drawColumns,
    icon(V, place, W) { [1, 0.7, 0.45].forEach((k, i) => V.box(i * 22 - 30, -i * 22 + 4, 0, 16, 16, 42 * k, i === 0 ? W.mat.A : W.mat.N2)); }
  }));
})(typeof window !== 'undefined' ? window : globalThis);
