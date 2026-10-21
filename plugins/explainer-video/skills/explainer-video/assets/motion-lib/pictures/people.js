/*!
 * pictures/people.js — a field of people, one dot each (or one dot per
 * `per` people, said in the key). They arrive in a diagonal sweep while the
 * count rolls. A share of them lights up from the back row forward; two
 * states of one measure mark the first with a line across the field, then
 * move to the second, a fall leaving a ghost of the share that was lost.
 *
 *   "picture": { "kind": "people" }                       the scene's figure is the count
 *   "picture": { "kind": "people", "whole": "F3", "at": "ctx" }   shares of a count shown earlier
 *
 * `dots` is the same field for a small share of anything: 1,000 dots, one
 * per 0.1% of `of`, lit from the front row and raised a little, so 1.5% reads
 * as the handful it is.
 *
 *   "picture": { "kind": "dots", "of": "product page visits" }
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  const SP = 14, R = 4.4, H = 7, MAX = 2000, SIDE = 490;

  // Where unit k stands in the grid: from the back row, or from the front.
  const at = (place, k) => (place.front ? place.dots - 1 - k : k);

  const FIELD = {
    data: true, shares: true, enterDur: 2.85, unitDur: 0.2,
    footprint(place) { const rows = Math.ceil(place.dots / place.cols); return { w: (place.cols + 1) * place.sp, d: (rows + 1) * place.sp, h: H + 26, shadow: 0 }; },
    keyIcon(V, x, y, place, W) {
      const K = M.iso.view(V.ctx, { ax: x, ay: y, cx: 0, cy: 0, s: 1, font: W.font }, V.owner);
      K.token(0, 0, 0, R * 1.3, H * 1.3, W.mat.N.top, W.mat.N.right);
    },
    unitPos(place, k) {
      const c = place.cols, sp = place.sp, x0 = place.x - (c - 1) * sp / 2, y0 = place.y - (Math.ceil(place.dots / c) - 1) * sp / 2, g = at(place, k);
      return { x: x0 + (g % c) * sp, y: y0 + Math.floor(g / c) * sp };
    },
    draw(V, place, t, W) { field(V, place, t, W); },
    icon(V, place, W) {
      const fill = M.design.mix(W.mat.N.right, W.mat.ink, 0.25);
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) V.token(i * 14 - 21, j * 14 - 21, 0, 4.6, 5, fill, fill);
    }
  };

  M.pictures.register(Object.assign({}, FIELD, {
    kind: 'dots', markable: false, needs: ['of'],
    fillDur: n => Math.max(0.6, Math.min(2.2, n * 0.06)),
    prepare(place) {
      // 40 x 25: every row whole, so a small share is one strip along the front.
      place.dots = 1000; place.per = null; place.front = true;
      place.cols = 40;
      place.sp = Math.min(SP, SIDE / place.cols);
      place.unitsFor = v => {
        if (!/%\s*$/.test(v.display)) throw new Error('dots: "' + v.display + '" is not a share in %');
        return Math.round(Math.max(0, Math.min(100, v.value)) * 10);
      };
    },
    key(place) { return '1 dot = 0.1% of ' + place.pic.of; }
  }));

  M.pictures.register(Object.assign({}, FIELD, {
    kind: 'people', counts: true, markable: true,
    enterDur: 2.85, unitDur: 0.2,
    fillDur: n => Math.max(0.6, Math.min(2.2, n * 0.0029)),
    prepare(place, it, Rs) {
      const id = place.pic.whole ? String(place.pic.whole).replace(/[{}]/g, '') : null;
      const c = id ? Rs.claim(id, 'scene "' + it.id + '" picture.whole') : (it.built.values && it.built.values[0] && it.built.values[0].claim);
      if (!c || /%\s*$/.test(String(c.display != null ? c.display : ''))) throw new Error('people: needs a count of people — the scene\'s own figure, or "whole" naming one');
      const n = Math.round(+c.value), per = Math.max(1, Math.round(place.pic.per || 1));
      if (!(n > 0)) throw new Error('people: the count must be above zero');
      if (n / per > MAX) throw new Error('people: ' + n + ' is more than ' + MAX + ' dots — set "per" (people per dot), which the key states');
      place.dots = Math.ceil(n / per); place.per = per;
      place.cols = Math.ceil(Math.sqrt(place.dots));
      place.sp = Math.min(SP, SIDE / place.cols);
      if (place.claims.indexOf(c.id) < 0) place.claims.push(c.id);
      place.unitsFor = v => {
        if (!/%\s*$/.test(v.display)) throw new Error('people: "' + v.display + '" is not a share in %');
        return Math.round(Math.max(0, Math.min(100, v.value)) / 100 * place.dots);
      };
    },
    key(place) { return place.per > 1 ? '1 dot = ' + place.per.toLocaleString('en-GB') + ' people' : '1 dot = 1 person'; }
  }));

  // The field: dots arriving in a sweep, lit ones raised a little, and a share's line.
  function field(V, place, t, W) {
    const m = W.mat, ctx = V.ctx, a0 = ctx.globalAlpha, mix = M.design.mix;
    const c = place.cols, sp = place.sp, r = R * sp / SP, h = H * sp / SP;
    const x0 = place.x - (c - 1) * sp / 2, y0 = place.y - (Math.ceil(place.dots / c) - 1) * sp / 2;
    for (let g = 0; g < place.dots; g++) {
      const i = g % c, j = Math.floor(g / c), k = at(place, g);
      const q = M.world.arrivedAt(place, i, j, c, t, 0.45);
      if (q <= 0) continue;
      const lit = M.world.litAt(place, k, t);
      ctx.globalAlpha = a0 * Math.min(1, q * 1.6);
      V.token(x0 + i * sp, y0 + j * sp, (1 - M.ease.outQuint(q)) * 26, r, h * (1 + (place.front ? lit * 0.8 : 0)), mix(m.N.top, m.A.top, lit), mix(m.N.right, m.A.left, lit));
    }
    ctx.globalAlpha = a0;
    // A share's line: the boundary of the first `units` dots, stepping
    // down where it falls part way along a row.
    place.marks.forEach(mk => {
      const p = M.world.clamp((t - mk.t0) / mk.dur);
      if (p <= 0) return;
      const J = Math.floor(mk.units / c), I = mk.units % c;
      const xb = i => x0 + i * sp - sp / 2, yb = j => y0 + j * sp - sp / 2;
      const xL = xb(0) - sp, xR = xb(c) + sp;
      const pts = I === 0 ? [[xL, yb(J), 10], [xR, yb(J), 10]] : [[xL, yb(J + 1), 10], [xb(I), yb(J + 1), 10], [xb(I), yb(J), 10], [xR, yb(J), 10]];
      V.path(cut(pts, M.ease.outQuint(p)), m.ink, 3.5 * V.s);
      const lab = M.world.sstep(mk.t0 + 0.45, mk.t0 + 0.8, t) * (W.cam ? (W.cam.view[place.id] || 0) * W.cam.labels : 1);
      if (lab > 0.001) {
        // Beside the line's right end, or its left end when that would leave
        // the safe area: far enough out that its height clears the field's
        // slanted edge (30 degrees, so sqrt 3 across for each px up or down).
        const f = M.text.font(600, M.world.LABEL, W.font), lw = M.text.measure(ctx, mk.label, f);
        const [rx, ry] = V.P(xR, yb(J), 10), [qx, qy] = V.P(xL, I === 0 ? yb(J) : yb(J + 1), 10);
        const clear = 10 + (M.world.LABEL * 0.6 + 6) * 1.732;
        const right = rx + clear + lw <= W.safe.x + W.safe.w;
        const x = right ? rx + clear : qx - clear - lw, y = (right ? ry : qy) - M.world.LABEL * 0.6;
        M.paint.text(ctx, mk.label, x, y, { font: f, color: m.ink, h: M.world.LABEL * 1.2, w: lw, alpha: lab, layer: 'world-label:' + place.id + ':mark', role: 'label', size: M.world.LABEL });
      }
    });
  }

  // The first fraction p of a polyline's length.
  function cut(pts, p) {
    const segs = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(d); total += d; }
    let left = total * p;
    const out = [pts[0]];
    for (let i = 1; i < pts.length && left > 0; i++) {
      const d = segs[i - 1];
      if (left >= d) { out.push(pts[i]); left -= d; continue; }
      const k = left / d, a = pts[i - 1], b = pts[i];
      out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2]]);
      left = 0;
    }
    return out.length > 1 ? out : [pts[0], pts[0]];
  }
})(typeof window !== 'undefined' ? window : globalThis);
