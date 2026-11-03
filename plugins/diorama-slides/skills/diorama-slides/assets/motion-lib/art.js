/*!
 * motion-lib/art.js — a halftone texture from two opposite corners of the
 * frame.
 *
 *   meta.art: "halftone" (default) | "off"
 *
 * A grid of dots, fixed to the frame, whose sizes follow soft flowing bands
 * of noise. It comes in from the top-right and bottom-left corners of the
 * frame and runs off its edges, so the frame edge is its only hard edge; it
 * may fill the margins outside the content area. Toward the middle of the
 * frame it thins out, and near anything a scene shows (text, a chart's whole
 * plot, the bar, the kicker, the footer) its dots shrink away gradually, so
 * it flows around each scene's content and never sits on it.
 *
 * Only the dot sizes follow the scene. Between two scenes that leave every
 * dot the same size the art doesn't move at all; otherwise every dot, in both
 * corners, eases to its new size together, in the short window when neither
 * scene's content is on screen.
 *
 * One tone, from the theme: the background mixed a third of the way toward
 * the ink.
 */
(function (root) {
  'use strict';
  const M = root.Motion = root.Motion || {};
  const CORNERS = ['tr', 'bl'];
  const REACH = 0.8;     // a corner's field radius, as a share of the frame's short side
  const PITCH = 78;      // grid steps across the frame's short side
  const TONE = 0.36;     // share of the way from background to ink
  const CLEAR = 44;      // px: the art stops this far from content...
  const EASE = 240;      // ...and eases in over this much more distance

  function resolve(meta) {
    const a = meta && meta.art != null ? meta.art : 'halftone';
    if (a === 'off' || a === false) return null;
    if (a === 'halftone') return { motif: 'halftone' };
    throw new Error('meta.art: "' + (a && a.motif || a) + '" is not available — use "off" or "halftone" (references/design.md § Artwork)');
  }

  function tone(d) { return M.design.mix(d.bg, d.ink, TONE); }

  // ── deterministic noise, seeded by the video ─────────────────────────
  function hash(i, j, s) {
    let h = (i * 374761393 + j * 668265263 + s * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  const smooth = t => t * t * (3 - 2 * t);
  function vnoise(x, y, s) {
    const i = Math.floor(x), j = Math.floor(y), fx = smooth(x - i), fy = smooth(y - j);
    const a = hash(i, j, s), b = hash(i + 1, j, s), c = hash(i, j + 1, s), d = hash(i + 1, j + 1, s);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  const fbm = (x, y, s) => vnoise(x, y, s) * 0.55 + vnoise(x * 2.1, y * 2.1, s + 7) * 0.3 + vnoise(x * 4.3, y * 4.3, s + 13) * 0.15;
  const sstep = (a, b, x) => smooth(Math.max(0, Math.min(1, (x - a) / (b - a))));

  // The grid, once per cut: every dot that either corner's field reaches,
  // with the size it has before any scene's content is taken into account.
  function grid(fr, seed) {
    const short = Math.min(fr.W, fr.H), p = Math.round(short / PITCH), f = 1 / (short * 0.3), R = short * REACH;
    const xs = [], ys = [], base = [];
    const fields = CORNERS.map(c => ({ ox: c[1] === 'r' ? fr.W : 0, oy: c[0] === 'b' ? fr.H : 0 }));
    for (let y = 0; y <= fr.H; y += p) {
      for (let x = 0; x <= fr.W; x += p) {
        // Strongest at its corner, thinning out smoothly toward the middle.
        const m = Math.max(...fields.map(F => Math.pow(1 - sstep(0, 1, Math.hypot(x - F.ox, y - F.oy) / R), 1.4)));
        if (m <= 0.001) continue;
        const n = fbm(x * f, y * f, 3 + (seed | 0));
        const ridge = 1 - Math.abs(2 * ((n * 2.4 + 0.15) % 1) - 1);
        const dens = Math.min(1, 0.1 + 0.9 * Math.pow(ridge, 2.2)) * m;
        if (p * 0.5 * Math.sqrt(dens) < 0.45) continue;
        xs.push(x); ys.push(y); base.push(dens);
      }
    }
    return { p, x: Float32Array.from(xs), y: Float32Array.from(ys), base: Float32Array.from(base) };
  }

  // Boxes a scene's layout occupies, in frame pixels.
  function boxes(layers, reserved, ctx) {
    const out = reserved.slice();
    layers.forEach(L => {
      if (L.kind === 'text') L.lines.forEach(ln => out.push({ x: ln.x, y: ln.y, w: ln.w, h: ln.h }));
      else if (L.kind === 'counter') out.push({ x: L.x, y: L.y, w: M.text.measure(ctx, L.display, L.font) * 1.05, h: L.h });
      else if (L.kind === 'rect' || L.kind === 'image') out.push({ x: L.x, y: L.y, w: L.w, h: L.h });
      else if (L.kind === 'hair') out.push({ x: L.x, y: L.y - 2, w: L.w, h: 4 });
      else if (L.box) out.push(L.box);
    });
    return out;
  }

  // A scene's dot sizes: each dot shrinks as it nears the scene's content.
  // Returns `prev` itself when nothing would change, so the art stays put.
  function sizes(G, occupied, prev) {
    const n = G.x.length, r = new Float32Array(n);
    const bx = occupied.filter(b => b.w > 0 && b.h > 0);
    for (let i = 0; i < n; i++) {
      const x = G.x[i], y = G.y[i];
      let d = Infinity;
      for (const b of bx) {
        const dx = Math.max(b.x - x, 0, x - (b.x + b.w)), dy = Math.max(b.y - y, 0, y - (b.y + b.h));
        const e = Math.hypot(dx, dy);
        if (e < d) d = e;
        if (d <= CLEAR) break;
      }
      const rr = G.p * 0.5 * Math.sqrt(G.base[i] * sstep(CLEAR, CLEAR + EASE, d));
      r[i] = rr < 0.45 ? 0 : rr;
    }
    if (prev && prev.length === n) {
      let same = true;
      for (let i = 0; i < n && same; i++) if (Math.abs(prev[i] - r[i]) > 0.01) same = false;
      if (same) return prev;
    }
    return r;
  }

  // Paint the dots at sizes eased from `a` toward `b` by k (either may be null:
  // no art). One path, one fill.
  function draw(ctx, C, a, b, k) {
    if (!C.art || (!a && !b)) return;
    const G = C.art.grid, n = G.x.length;
    ctx.save();
    ctx.fillStyle = C.art.tone;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const ra = a ? a[i] : 0, rb = b ? b[i] : 0;
      const r = ra + (rb - ra) * k;
      if (r < 0.45) continue;
      ctx.moveTo(G.x[i] + r, G.y[i]);
      ctx.arc(G.x[i], G.y[i], r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();
  }

  M.art = { resolve, tone, grid, boxes, sizes, draw, CLEAR };
  if (typeof module !== 'undefined' && module.exports) module.exports = M.art;
})(typeof window !== 'undefined' ? window : globalThis);
