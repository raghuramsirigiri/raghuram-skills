/*!
 * motion-lib/iso.js — the 2.5D kit the stage is built from.
 *
 *   const mat = Motion.iso.materials(C.design);
 *   const V = Motion.iso.view(ctx, { ax, ay, cx, cy, s, origin }, 'owner');
 *   V.box(x, y, z, w, d, h, mat.N)            a plain box
 *   V.block(x, y, z, w, d, h, mat.N, { r, b }) a toy block: corners cut, top edge bevelled
 *   V.prism(footprint, z, h, mat.N, b)        any convex footprint, bevelled on top
 *   V.extrude(profile, 'y', y0, y1, mat.N)    a side profile pushed across its depth
 *   V.cone(x, y, z, r, h, mat.N, n)           a faceted cone (a tree, a roof, a horn)
 *   V.shadow(x, y, w, d, h)   V.P(x, y, z) -> [sx, sy]
 *
 * One isometric view (30 degrees) for the whole video: world point (x, y, z)
 * lands at ax + (x - y) cos30 s - cx, ay + ((x + y) / 2 - z) s - cy. The
 * camera (cx, cy) pans and the scale s zooms the world; the angle never
 * changes. The viewer looks along (-1, -1, -1): a face whose normal has
 * nx + ny + nz > 0 faces the viewer.
 *
 * The look is a toy diorama in charts-lib's colours: chunky masses with cut
 * corners and bevelled tops, a few low-poly facets, no outlines, and one light
 * from the top left (the top lightest, the +y face mid, the +x face darkest;
 * a slanted face mixes the three by its normal). Every colour is mixed from
 * the design's background, ink and accent; the accent is for data only.
 * These are primitives: a car, a tower or a creature is built from them by
 * the video's own painter, never shipped here.
 *
 * Every shape is a pure function of its inputs. When the audit records
 * (Motion.debug.record), each filled shape reports its screen box as
 * { role: 'shape', owner }, so the audit can tell the stage from the words.
 */
(function (root) {
  'use strict';
  const M = root.Motion = root.Motion || {};
  const COS = 0.8660254;

  // Tints from the design: neutrals from bg and ink, the accent for data.
  function materials(d) {
    const mix = M.design.mix;
    const tint = (top, left, right) => ({ top, left, right });
    const N = tint(mix(d.bg, d.ink, 0.055), mix(d.bg, d.ink, 0.13), mix(d.bg, d.ink, 0.2));
    const N2 = tint(mix(d.bg, d.ink, 0.09), mix(d.bg, d.ink, 0.18), mix(d.bg, d.ink, 0.27));
    const N3 = tint(mix(d.bg, d.ink, 0.16), mix(d.bg, d.ink, 0.27), mix(d.bg, d.ink, 0.36));
    const DARK = tint(mix(d.bg, d.ink, 0.5), mix(d.bg, d.ink, 0.62), mix(d.bg, d.ink, 0.7));
    const A = tint(mix(d.subject, d.bg, 0.12), d.subject, mix(d.subject, d.ink, 0.28));
    const PAPER = tint(mix(d.bg, '#ffffff', 0.7), mix(d.bg, d.ink, 0.08), mix(d.bg, d.ink, 0.15));
    const between = (a, b, k) => k <= 0 ? a : k >= 1 ? b : tint(mix(a.top, b.top, k), mix(a.left, b.left, k), mix(a.right, b.right, k));
    return {
      N, N2, N3, DARK, A, PAPER, between, bg: d.bg,
      shadow: mix(d.bg, d.ink, 0.06),
      line: mix(d.bg, d.ink, 0.28),       // quiet details: seams, markings
      glass: tint(mix(d.bg, d.ink, 0.4), mix(d.bg, d.ink, 0.5), mix(d.bg, d.ink, 0.58)),
      ink: d.ink, accent: d.subject
    };
  }

  // ── colour by normal ─────────────────────────────────────────────────
  function rgb(hex) { const n = parseInt(String(hex).slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const toHex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  // A face lit by the one light: the tint's three faces mixed by the normal.
  function shade(t, nx, ny, nz) {
    const wT = Math.max(0, nz), wL = Math.max(0, ny), wR = Math.max(0, nx);
    const s = wT + wL + wR;
    if (s < 1e-6) return t.right;
    const a = rgb(t.top), b = rgb(t.left), c = rgb(t.right);
    return toHex([0, 1, 2].map(i => (a[i] * wT + b[i] * wL + c[i] * wR) / s));
  }

  // ── polygon helpers (2D, for footprints and profiles) ────────────────
  const area = pts => pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
  // Cut each corner of a polygon at distance r along its two edges: a
  // softened, low-poly mass. r is capped at a third of the shorter edge.
  function soften(pts, r) {
    if (!(r > 0)) return pts.slice();
    const out = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      const la = Math.hypot(a[0] - p[0], a[1] - p[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
      const k = Math.min(r, la / 3, lb / 3);
      out.push([p[0] + (a[0] - p[0]) / la * k, p[1] + (a[1] - p[1]) / la * k]);
      out.push([p[0] + (b[0] - p[0]) / lb * k, p[1] + (b[1] - p[1]) / lb * k]);
    }
    return out;
  }
  // A convex polygon moved in by b on every edge.
  function inset(pts, b) {
    const n = pts.length, ccw = area(pts) > 0 ? 1 : -1;
    const lines = pts.map((p, i) => {
      const q = pts[(i + 1) % n], dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L * ccw, ny = dx / L * ccw;     // inward normal
      return { p: [p[0] + nx * b, p[1] + ny * b], d: [dx, dy] };
    });
    return lines.map((l, i) => {
      const m = lines[(i + n - 1) % n];
      const den = m.d[0] * l.d[1] - m.d[1] * l.d[0];
      if (Math.abs(den) < 1e-9) return l.p;
      const t = ((l.p[0] - m.p[0]) * l.d[1] - (l.p[1] - m.p[1]) * l.d[0]) / den;
      return [m.p[0] + m.d[0] * t, m.p[1] + m.d[1] * t];
    });
  }
  // A regular n-gon: wheels, trunks, posts, in a profile or a footprint.
  function ngon(cx, cy, r, n, rot) {
    const out = [];
    for (let i = 0; i < n; i++) { const a = (rot || 0) + i / n * Math.PI * 2; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    return out;
  }
  // Two profiles of the same length blended point by point: a form between
  // two states.
  function blend(a, b, k) {
    if (a.length !== b.length) return k < 0.5 ? a : b;
    return a.map((p, i) => [p[0] + (b[i][0] - p[0]) * k, p[1] + (b[i][1] - p[1]) * k]);
  }

  // A view through the camera. cam: { ax, ay, cx, cy, s, origin: [x, y, z] }.
  // owner names whose shapes these are, for the audit.
  function view(ctx, cam, owner) {
    const s = cam.s, o = cam.origin || [0, 0, 0];
    const P = (x, y, z) => {
      x += o[0]; y += o[1]; z = (z || 0) + o[2];
      return [cam.ax + (x - y) * COS * s - cam.cx, cam.ay + ((x + y) * 0.5 - z) * s - cam.cy];
    };
    const V = { ctx, s, P, owner: owner || null };

    // kind 'line' marks a stroke; kind 'shadow' is ground tint, not an object.
    function note(pts, kind) {
      const rec = M.debug.record;
      if (!rec) return;
      const m = ctx.getTransform ? ctx.getTransform() : { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [x, y] of pts) {
        const X = m.a * x + (m.c || 0) * y + m.e, Y = (m.b || 0) * x + m.d * y + m.f;
        if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y;
      }
      if (x1 - x0 <= 0 && y1 - y0 <= 0) return;
      rec.push({ scene: M.debug.scene, phase: M.debug.phase, layer: 'stage:' + V.owner, role: 'shape', owner: V.owner, kind: kind || 'fill', text: '', bbox: [x0, y0, x1 - x0, y1 - y0], alpha: ctx.globalAlpha });
    }
    V.note = note;

    // A filled polygon of screen points.
    V.poly = (pts, fill) => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
      note(pts);
    };
    // A quad (or any polygon) on world points.
    V.quad = (a, b, c, d, fill) => V.poly([P(...a), P(...b), P(...c), P(...d)], fill);
    V.face = (pts3, fill) => V.poly(pts3.map(p => P(...p)), fill);

    // A box: its top and the two faces toward the viewer (+y on the left, +x on the right).
    V.box = (x, y, z, w, d, h, t) => {
      V.poly([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], t.left);
      V.poly([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], t.right);
      V.poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], t.top);
    };

    // A convex footprint [[x, y]…] stood up from z to z + h, its top edge
    // bevelled by b: the sides, the bevel ring, then the top.
    V.prism = (foot, z, h, t, b) => {
      b = Math.max(0, Math.min(b || 0, h * 0.9));
      const ccw = area(foot) > 0 ? 1 : -1, n = foot.length;
      const top = b > 0 ? inset(foot, b) : foot, zs = z + h - b;
      const sides = [], bevels = [];
      for (let i = 0; i < n; i++) {
        const p = foot[i], q = foot[(i + 1) % n];
        const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1;
        const nx = dy / L * ccw, ny = -dx / L * ccw;     // outward
        const depth = (p[0] + q[0] + p[1] + q[1]) / 2;
        if (nx + ny > 1e-6 && zs > z) sides.push({ depth, pts: [[p[0], p[1], z], [q[0], q[1], z], [q[0], q[1], zs], [p[0], p[1], zs]], fill: shade(t, nx, ny, 0) });
        if (b > 0 && nx + ny + 1 > 1e-6) {
          const a2 = top[i], b2 = top[(i + 1) % n];
          bevels.push({ depth, pts: [[p[0], p[1], zs], [q[0], q[1], zs], [b2[0], b2[1], z + h], [a2[0], a2[1], z + h]], fill: shade(t, nx * 0.7, ny * 0.7, 0.7) });
        }
      }
      sides.sort((a, c) => a.depth - c.depth).forEach(f => V.face(f.pts, f.fill));
      bevels.sort((a, c) => a.depth - c.depth).forEach(f => V.face(f.pts, f.fill));
      V.face(top.map(p => [p[0], p[1], z + h]), t.top);
    };
    // A toy block: a box with its vertical corners cut by r and its top edge
    // bevelled by b. The default softening reads as a toy at any size.
    V.block = (x, y, z, w, d, h, t, o) => {
      const r = o && o.r != null ? o.r : Math.min(w, d) * 0.12;
      const b = o && o.b != null ? o.b : Math.min(w, d, h) * 0.12;
      V.prism(soften([[x, y], [x + w, y], [x + w, y + d], [x, y + d]], r), z, h, t, b);
    };

    // A profile [[u, v]…] in the plane across `axis`, pushed from a0 to a1
    // along it. 'y': profile in (x, z), the near cap at y = a1 (a side view:
    // a car, a creature). 'x': profile in (y, z), cap at x = a1. 'z': profile
    // in (x, y), cap on top (a footprint with no bevel).
    V.extrude = (prof, axis, a0, a1, t) => {
      const map = axis === 'x' ? (u, v, a) => [a, u, v] : axis === 'z' ? (u, v, a) => [u, v, a] : (u, v, a) => [u, a, v];
      const nmap = axis === 'x' ? (nu, nv) => [0, nu, nv] : axis === 'z' ? (nu, nv) => [nu, nv, 0] : (nu, nv) => [nu, 0, nv];
      const ccw = area(prof) > 0 ? 1 : -1, n = prof.length;
      const strips = [];
      for (let i = 0; i < n; i++) {
        const p = prof[i], q = prof[(i + 1) % n];
        const du = q[0] - p[0], dv = q[1] - p[1], L = Math.hypot(du, dv) || 1;
        const [nx, ny, nz] = nmap(dv / L * ccw, -du / L * ccw);
        if (nx + ny + nz <= 1e-6) continue;
        const c = map((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (a0 + a1) / 2);
        strips.push({ depth: c[0] + c[1] + c[2], pts: [map(p[0], p[1], a0), map(q[0], q[1], a0), map(q[0], q[1], a1), map(p[0], p[1], a1)], fill: shade(t, nx, ny, nz) });
      }
      strips.sort((a, c) => a.depth - c.depth).forEach(f => V.face(f.pts, f.fill));
      V.face(prof.map(p => map(p[0], p[1], a1)), axis === 'x' ? t.right : axis === 'z' ? t.top : t.left);
    };

    // A faceted cone: base centre (x, y, z), radius r, height h, n facets.
    V.cone = (x, y, z, r, h, t, n) => {
      n = n || 6;
      const facets = [];
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + Math.PI / n, b = (i + 1) / n * Math.PI * 2 + Math.PI / n, m = (a + b) / 2;
        const nx = Math.cos(m) * h, ny = Math.sin(m) * h, nz = r, L = Math.hypot(nx, ny, nz);
        if ((nx + ny + nz) / L <= 1e-6) continue;
        const pa = [x + Math.cos(a) * r, y + Math.sin(a) * r, z], pb = [x + Math.cos(b) * r, y + Math.sin(b) * r, z];
        facets.push({ depth: pa[0] + pa[1] + pb[0] + pb[1], pts: [pa, pb, [x, y, z + h]], fill: shade(t, nx / L, ny / L, nz / L) });
      }
      facets.sort((p, q) => p.depth - q.depth).forEach(f => V.face(f.pts, f.fill));
    };

    // A soft contact shadow on the ground, cast toward the front right.
    V.shadow = (x, y, w, d, h, color, alpha) => {
      const k = h * 0.55;
      ctx.save(); ctx.globalAlpha *= alpha == null ? 1 : alpha;
      const pts = [P(x, y, 0), P(x + w + k, y, 0), P(x + w + k, y + d + k * 0.4, 0), P(x, y + d + k * 0.4, 0)];
      ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
      note(pts, 'shadow');
      ctx.restore();
    };

    // A straight line between world points.
    V.line = (a, b, color, width) => {
      const p = P(...a), q = P(...b);
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); ctx.restore();
      note([[Math.min(p[0], q[0]), Math.min(p[1], q[1]) - width / 2], [Math.max(p[0], q[0]), Math.max(p[1], q[1]) + width / 2]], 'line');
    };
    // A polyline between world points.
    V.path = (pts, color, width) => {
      const sp = pts.map(p => P(...p));
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); sp.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.restore();
      note(sp.map(([x, y]) => [x, y]).concat([[sp[0][0], sp[0][1] - width / 2], [sp[sp.length - 1][0], sp[sp.length - 1][1] + width / 2]]), 'line');
    };

    return V;
  }

  M.iso = { COS, materials, view, shade, soften, inset, ngon, blend, area };
  if (typeof module !== 'undefined' && module.exports) module.exports = M.iso;
})(typeof window !== 'undefined' ? window : globalThis);
