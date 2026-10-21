/*!
 * motion-lib/art.js — monochrome artwork in the space a scene leaves empty.
 *
 * One tone, taken from the theme: the background moved a short way toward
 * the ink, so it reads as part of the ground, never as content. The engine
 * places one shape per scene in the largest empty rectangle the scene's layout
 * leaves inside the safe area (never behind text, a chart, the progress bar
 * or the source line; never in the platform margins), keeps it where it was
 * while that spot stays free, and lets it drift slowly so the frame is never
 * fully still.
 *
 *   meta.art: "auto" (default) | "off" | { "motif": "contour" | "rings" | "dots" | "lines" | "logo" }
 *
 * "auto" is the user's own logo when meta.brand.logo holds one, otherwise
 * contour lines. "logo" uses only meta.brand.logo, recoloured to the tone;
 * the engine never fetches or invents one.
 *
 * Fixing the layout comes first (formats.md § Layout per format): the art
 * fills what a good layout leaves, it doesn't stand in for one. Its tone sits
 * under the audit's ink threshold, so it never counts toward fill.
 */
(function (root) {
  'use strict';
  const M = root.Motion = root.Motion || {};
  const MOTIFS = ['contour', 'rings', 'dots', 'lines', 'logo'];
  // Largest step from the background, per channel (0-255). The audit counts a
  // pixel as ink from 28 up, so the art stays ground.
  const STEP = 20;
  const CELLS = 24;          // grid cells across the safe area's short side
  const MIN = 0.16;          // shortest side of a shape, as a share of the safe area's short side

  function resolve(meta) {
    const a = meta && meta.art != null ? meta.art : 'auto';
    if (a === 'off' || a === false) return null;
    const logo = meta && meta.brand && /^data:image\//.test(meta.brand.logo || '') ? meta.brand.logo : null;
    const motif = a === 'auto' ? (logo ? 'logo' : 'contour') : (a && a.motif) || a;
    if (MOTIFS.indexOf(motif) < 0) throw new Error('meta.art: unknown motif "' + motif + '" — use "auto", "off" or one of ' + MOTIFS.join(', '));
    if (motif === 'logo' && !logo) throw new Error('meta.art: "logo" needs meta.brand.logo, a data URI the user supplied');
    return { motif, logo };
  }

  function tone(d) {
    const rgb = h => { const n = parseInt(String(h).replace('#', '').slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const a = rgb(d.bg), b = rgb(d.ink);
    const span = Math.max(...a.map((v, i) => Math.abs(b[i] - v))) || 1;
    return M.design.mix(d.bg, d.ink, Math.min(1, STEP / span));
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

  // The largest empty rectangle (no longer than 2.5:1) on a grid over the
  // safe area, below the bar's strip. Keeps `prev` (the last scene's) when it
  // is still empty and not much smaller than the best, so the art stays put
  // from scene to scene; otherwise prefers one on an edge of the safe area.
  const ASPECT = 2.5;
  function place(fr, occupied, prev) {
    const S = fr.safe, K = M.layout.K, R = M.layout.RULE;
    const top = S.y + R.accentH + 8 * K;
    const short = Math.min(S.w, S.h);
    const cell = short / CELLS;
    const nx = Math.floor(S.w / cell), ny = Math.floor((S.y + S.h - top) / cell);
    const pad = 24 * K;     // breathing room around content
    const busy = new Uint8Array(nx * ny);
    occupied.forEach(b => {
      if (!(b.w > 0 && b.h > 0)) return;
      const x0 = Math.max(0, Math.floor((b.x - pad - S.x) / cell)), x1 = Math.min(nx - 1, Math.floor((b.x + b.w + pad - S.x) / cell));
      const y0 = Math.max(0, Math.floor((b.y - pad - top) / cell)), y1 = Math.min(ny - 1, Math.floor((b.y + b.h + pad - top) / cell));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) busy[y * nx + x] = 1;
    });
    const free = r => {
      if (r.gx < 0 || r.gy < 0 || r.gx + r.gw > nx || r.gy + r.gh > ny) return false;
      for (let j = r.gy; j < r.gy + r.gh; j++) for (let i = r.gx; i < r.gx + r.gw; i++) if (busy[j * nx + i]) return false;
      return true;
    };
    const minN = Math.ceil(short * MIN / cell);
    // Histogram method: for each row, every bar's widest run at its height,
    // trimmed to the aspect limit toward the nearer edge.
    const hgt = new Uint16Array(nx);
    let best = null;
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) hgt[x] = busy[y * nx + x] ? 0 : hgt[x] + 1;
      for (let x = 0; x < nx; x++) {
        const h0 = hgt[x];
        if (h0 < minN) continue;
        let l = x, r = x;
        while (l > 0 && hgt[l - 1] >= h0) l--;
        while (r < nx - 1 && hgt[r + 1] >= h0) r++;
        let gw = r - l + 1, gh = h0, gx = l;
        if (gw < minN) continue;
        if (gw > gh * ASPECT) { const w2 = Math.floor(gh * ASPECT); gx = (l === 0 || nx - 1 - r > l) ? l : r - w2 + 1; gw = w2; }
        if (gh > gw * ASPECT) gh = Math.floor(gw * ASPECT);
        const gy = y - gh + 1;
        const edges = (gx === 0) + (gy === 0) + (gx + gw === nx) + (y === ny - 1);
        const score = gw * gh * (1 + 0.08 * edges);
        if (!best || score > best.score) best = { gx, gy, gw, gh, score };
      }
    }
    if (!best) return null;
    if (prev && prev.gw * prev.gh >= best.gw * best.gh * 0.8 && free(prev)) return prev;
    const w = best.gw * cell, h = best.gh * cell;
    const x = S.x + best.gx * cell, y = top + best.gy * cell;
    return { gx: best.gx, gy: best.gy, gw: best.gw, gh: best.gh, x, y, w, h, cx: x + w / 2, cy: y + h / 2, rx: w * 0.46, ry: h * 0.46 };
  }

  // ── motifs: pure functions of t ──────────────────────────────────────
  const recoloured = new Map();
  function logoImage(C, src, color) {
    const key = src + '|' + color;
    if (recoloured.has(key)) return recoloured.get(key);
    const img = C.images[src];
    if (!img || typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    try {
      // One tone, kept tonal: each pixel's strength is how far its colour sits
      // from the background, so a light shape inside a dark badge stays a
      // shape instead of melting into a silhouette.
      const im = g.getImageData(0, 0, c.width, c.height), px = im.data;
      const lum = (r, gg, b) => 0.2126 * r + 0.7152 * gg + 0.0722 * b;
      const n = parseInt(String(C.design.bg).replace('#', '').slice(0, 6), 16);
      const bgL = lum((n >> 16) & 255, (n >> 8) & 255, n & 255);
      const m = parseInt(String(color).replace('#', '').slice(0, 6), 16);
      const tc = [(m >> 16) & 255, (m >> 8) & 255, m & 255];
      let far = 1;
      for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 8) far = Math.max(far, Math.abs(lum(px[i], px[i + 1], px[i + 2]) - bgL));
      for (let i = 0; i < px.length; i += 4) {
        const w = Math.abs(lum(px[i], px[i + 1], px[i + 2]) - bgL) / far;
        px[i + 3] = Math.round(px[i + 3] * (0.3 + 0.7 * w));
        px[i] = tc[0]; px[i + 1] = tc[1]; px[i + 2] = tc[2];
      }
      g.putImageData(im, 0, 0);
    } catch (e) {
      // A canvas the browser won't read back: a plain silhouette.
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = color;
      g.fillRect(0, 0, c.width, c.height);
    }
    recoloured.set(key, c);
    return c;
  }

  function draw(ctx, C, p, t, alpha) {
    if (!p || alpha <= 0.001 || !C.art) return;
    const col = C.art.tone, K = M.layout.K;
    const { cx, cy, rx, ry } = p;
    const r = Math.min(rx, ry);
    const rng = M.rng(C.seed, 'art');
    const ph = [0, 1, 2, 3, 4, 5, 6, 7].map(() => rng() * Math.PI * 2);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = M.layout.RULE.hair * 2;
    const motif = C.art.motif;
    // Every motif is drawn in the unit disc stretched to the ellipse (rx, ry),
    // with strokes kept at their own width.
    const loop = (fr, a0) => {
      ctx.beginPath();
      for (let k = 0; k <= 120; k++) {
        const a = k / 120 * Math.PI * 2;
        const q = fr(a);
        const x = cx + rx * q * Math.cos(a), y = cy + ry * q * Math.sin(a);
        if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();
    };
    if (motif === 'contour') {
      // Topographic loops, wobbling slowly.
      const n = Math.max(6, Math.round(r / (14 * K)));
      for (let i = 1; i <= n; i++) {
        const base = i / n / 1.14;
        loop(a => base * (1 + 0.09 * Math.sin(3 * a + ph[i % 8] + t * 0.12) + 0.05 * Math.sin(5 * a - ph[(i + 3) % 8] - t * 0.08)));
      }
    } else if (motif === 'rings') {
      // Concentric rings, their dashes turning slowly.
      const n = Math.max(6, Math.round(r / (14 * K)));
      if (ctx.setLineDash) ctx.setLineDash([18 * K, 6 * K]);
      for (let i = 1; i <= n; i++) {
        ctx.lineDashOffset = (i % 2 ? 1 : -1) * t * 6 * K + ph[i % 8] * 10;
        ctx.beginPath(); ctx.ellipse(cx, cy, rx * i / n, ry * i / n, 0, 0, Math.PI * 2); ctx.stroke();
      }
    } else if (motif === 'dots') {
      // A halftone field: dots shrink toward its rim; the grid turns slowly.
      const s = Math.max(12 * K, r / 7), a = 0.5 + t * 0.01;
      const ca = Math.cos(a), sa = Math.sin(a);
      const n = Math.ceil(Math.max(rx, ry) * 1.5 / s);
      for (let j = -n; j <= n; j++) {
        for (let i = -n; i <= n; i++) {
          const x = (i * ca - j * sa) * s, y = (i * sa + j * ca) * s;
          const dd = Math.hypot(x / rx, y / ry);
          if (dd >= 1) continue;
          ctx.beginPath(); ctx.arc(cx + x, cy + y, s * 0.38 * Math.sqrt(1 - dd), 0, Math.PI * 2); ctx.fill();
        }
      }
    } else if (motif === 'lines') {
      // A hatched field, the hatching turning slowly.
      const a = Math.PI / 6 + t * 0.03, step = Math.max(12 * K, r / 9), R2 = Math.max(rx, ry);
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
      ctx.translate(cx, cy); ctx.rotate(a);
      ctx.beginPath();
      for (let y = -R2; y <= R2; y += step) { ctx.moveTo(-R2, y); ctx.lineTo(R2, y); }
      ctx.stroke();
    } else if (motif === 'logo') {
      const img = logoImage(C, C.art.logo, col);
      if (img) {
        const k = Math.min(rx * 1.8 / img.width, ry * 1.8 / img.height) * (1 + 0.02 * Math.sin(t * 0.25));
        ctx.drawImage(img, cx - img.width * k / 2, cy - img.height * k / 2, img.width * k, img.height * k);
      }
    }
    ctx.restore();
  }

  M.art = { resolve, tone, boxes, place, draw, MOTIFS, STEP };
  if (typeof module !== 'undefined' && module.exports) module.exports = M.art;
})(typeof window !== 'undefined' ? window : globalThis);
