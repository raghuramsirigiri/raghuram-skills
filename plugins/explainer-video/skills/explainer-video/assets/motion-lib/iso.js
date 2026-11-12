/*!
 * motion-lib/iso.js — the 2.5D kit of the continuous style.
 *
 *   const mat = Motion.iso.materials(C.design);
 *   const V = Motion.iso.view(ctx, { ax, ay, cx, cy, s }, 'place-id');
 *   V.box(x, y, z, w, d, h, mat.N);   V.shadow(x, y, w, d, h);   V.P(x, y, z) -> [sx, sy]
 *
 * An isometric view (30 degrees) through a camera: world point (x, y, z)
 * lands at ax + (x - y) cos30 s - cx, ay + ((x + y) / 2 - z) s - cy. The
 * camera (cx, cy) only pans; the scale s is fixed for the whole video, so
 * nothing ever zooms.
 *
 * The look is flat and corporate: no outlines, three tints per surface from
 * one light at the top left (top lightest, the +y face mid, the +x face
 * darkest), a soft contact shadow toward the front right. Every colour is
 * mixed from the design's background, ink and accent; the accent is for data
 * only.
 *
 * Every shape is a pure function of its inputs. When the audit records
 * (Motion.debug.record), each filled shape reports its screen box as
 * { role: 'shape', owner }, so the audit can tell the world from the words.
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
    const A = tint(mix(d.subject, d.bg, 0.12), d.subject, mix(d.subject, d.ink, 0.28));
    const PAPER = tint(mix(d.bg, '#ffffff', 0.7), mix(d.bg, d.ink, 0.08), mix(d.bg, d.ink, 0.15));
    const between = (a, b, k) => k <= 0 ? a : k >= 1 ? b : tint(mix(a.top, b.top, k), mix(a.left, b.left, k), mix(a.right, b.right, k));
    return {
      N, N2, A, PAPER, between, bg: d.bg,
      shadow: mix(d.bg, d.ink, 0.06),
      line: mix(d.bg, d.ink, 0.28),       // writing on paper, quiet details
      roof: mix(d.bg, d.ink, 0.16), roofSide: mix(d.bg, d.ink, 0.3),
      door: mix(d.bg, d.ink, 0.34), window: mix(d.bg, d.ink, 0.03),
      dark: mix(d.bg, d.ink, 0.62), ink: d.ink, accent: d.subject
    };
  }

  // A view through the camera. cam: { ax, ay, cx, cy, s }. owner names whose
  // shapes these are, for the audit.
  function view(ctx, cam, owner) {
    const s = cam.s;
    const P = (x, y, z) => [cam.ax + (x - y) * COS * s - cam.cx, cam.ay + ((x + y) * 0.5 - (z || 0)) * s - cam.cy];
    const V = { ctx, s, P, owner: owner || null };

    // kind 'line' marks a stroke (a share's line): its own labels may sit beside it.
    // kind 'shadow' is ground tint, not an object: words may cross it.
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
      rec.push({ scene: M.debug.scene, phase: M.debug.phase, layer: 'world:' + V.owner, role: 'shape', owner: V.owner, kind: kind || 'fill', text: '', bbox: [x0, y0, x1 - x0, y1 - y0], alpha: ctx.globalAlpha });
    }
    V.note = note;

    // A filled polygon of screen points.
    V.poly = (pts, fill) => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
      note(pts);
    };
    // A quad on a world plane, from four world points.
    V.quad = (a, b, c, d, fill) => V.poly([P(...a), P(...b), P(...c), P(...d)], fill);

    // A box: its top and the two faces toward the viewer (+y on the left, +x on the right).
    V.box = (x, y, z, w, d, h, t) => {
      V.poly([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], t.left);
      V.poly([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], t.right);
      V.poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], t.top);
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

    // An open tray: over its rim you see the two far walls and the floor.
    V.tray = (x, y, z, w, d, h, t, floor) => {
      V.box(x, y, z, w, d, h, t);
      const r = Math.min(5, w / 6, d / 6), zt = z + h + 0.05;
      const mouth = [P(x + r, y + r, zt), P(x + w - r, y + r, zt), P(x + w - r, y + d - r, zt), P(x + r, y + d - r, zt)];
      ctx.save();
      ctx.beginPath(); mouth.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); ctx.clip();
      V.quad([x + r, y + r, zt], [x + w - r, y + r, zt], [x + w - r, y + r, z + 2], [x + r, y + r, z + 2], t.left);
      V.quad([x + r, y + r, zt], [x + r, y + d - r, zt], [x + r, y + d - r, z + 2], [x + r, y + r, z + 2], t.right);
      V.quad([x + r, y + r, z + 2], [x + w - r, y + r, z + 2], [x + w - r, y + d - r, z + 2], [x + r, y + d - r, z + 2], floor || t.top);
      ctx.restore();
    };

    // A token: a short cylinder standing at (x, y), radius r, height h.
    V.token = (x, y, z, r, h, top, side) => {
      const [bx, by] = P(x, y, z), [tx, ty] = P(x, y, z + h);
      const rx = r * 1.22 * s, ry = r * 0.71 * s;
      ctx.fillStyle = side;
      ctx.beginPath(); ctx.ellipse(bx, by, rx, ry, 0, 0, Math.PI); ctx.lineTo(tx - rx, ty); ctx.ellipse(tx, ty, rx, ry, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
      ctx.fillStyle = top;
      ctx.beginPath(); ctx.ellipse(tx, ty, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      note([[bx - rx, ty - ry], [bx + rx, by + ry]]);
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

    // Words painted upright onto the +y face (the one facing left), centred
    // across width w, their top at height z. Recorded like any text, so the
    // audit checks their size and contrast.
    V.faceText = (str, x, y, z, w, size, weight, color, alpha, layer) => {
      if (!str || alpha <= 0.001) return;
      const [ox, oy] = P(x, y, z);
      ctx.save();
      ctx.transform(COS, 0.5, 0, 1, ox, oy);
      const f = M.text.font(weight, size, cam.font);
      const tw = M.text.measure(ctx, str, f);
      M.paint.text(ctx, str, (w * s - tw) / 2, 0, { font: f, color, h: size * 1.1, w: tw, alpha, layer: layer || 'world-face:' + V.owner, role: 'world', size });
      ctx.restore();
    };

    return V;
  }

  M.iso = { COS, materials, view };
  if (typeof module !== 'undefined' && module.exports) module.exports = M.iso;
})(typeof window !== 'undefined' ? window : globalThis);
