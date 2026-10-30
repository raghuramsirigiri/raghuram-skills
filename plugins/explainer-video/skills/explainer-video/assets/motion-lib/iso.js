/*!
 * motion-lib/iso.js — the drawing kit of the continuous style: 2.5D things,
 * flat charts and labels, and the things registry.
 *
 *   const mat = Motion.iso.materials(C.design);
 *   const V = Motion.iso.view(ctx, { ax, ay, cx, cy, s }, 'place-id');
 *   V.box(x, y, z, w, d, h, mat.N);   V.shadow(x, y, w, d, h);   V.P(x, y, z) -> [sx, sy]
 *   const F = Motion.iso.flat(ctx, 'place-id', font);
 *   F.rect(x, y, w, h, color);   F.text('Started', x, y, { size, weight, align });
 *
 * An isometric view (30 degrees) through a camera: world point (x, y, z)
 * lands at ax + (x - y) cos30 s - cx, ay + ((x + y) / 2 - z) s - cy. The
 * camera (cx, cy) only pans; the scale s is fixed for the whole video, so
 * nothing ever zooms. Things (people, papers, buildings) stand in 2.5D;
 * charts are flat, facing the viewer, in frame pixels.
 *
 * The look is flat and corporate: no outlines, three tints per surface from
 * one light at the top left (top lightest, the +y face mid, the +x face
 * darkest), a soft contact shadow toward the front right. Every colour is
 * mixed from the design's background, ink and accent; the accent is for data
 * only.
 *
 * Every shape is a pure function of its inputs. When the audit records
 * (Motion.debug.record), each filled shape reports its screen box as
 * { role: 'shape', owner, kind }, so the audit can tell the world from the
 * words: kind 'line' is a stroke its own labels may sit beside, kind
 * 'shadow' is ground tint that words may cross.
 */
(function (root) {
  'use strict';
  const M = root.Motion = root.Motion || {};
  const COS = 0.8660254;

  // Tints from the design: neutrals from bg and ink, the accent for data.
  function materials(d) {
    const mix = M.design.mix;
    const tint = (top, left, right) => ({ top, left, right });
    const gray = k => tint(mix(d.bg, d.ink, k * 0.42), mix(d.bg, d.ink, k * 0.72), mix(d.bg, d.ink, k));
    const N = tint(mix(d.bg, d.ink, 0.055), mix(d.bg, d.ink, 0.13), mix(d.bg, d.ink, 0.2));
    const N2 = tint(mix(d.bg, d.ink, 0.09), mix(d.bg, d.ink, 0.18), mix(d.bg, d.ink, 0.27));
    const A = tint(mix(d.subject, d.bg, 0.12), d.subject, mix(d.subject, d.ink, 0.28));
    const PAPER = tint(mix(d.bg, '#ffffff', 0.7), mix(d.bg, d.ink, 0.16), mix(d.bg, d.ink, 0.27));
    const DARK = tint(mix(d.bg, d.ink, 0.5), mix(d.bg, d.ink, 0.62), mix(d.bg, d.ink, 0.72));
    const between = (a, b, k) => k <= 0 ? a : k >= 1 ? b : tint(mix(a.top, b.top, k), mix(a.left, b.left, k), mix(a.right, b.right, k));
    return {
      N, N2, A, PAPER, DARK, gray, between, bg: d.bg,
      shadow: mix(d.bg, d.ink, 0.06),
      line: mix(d.bg, d.ink, 0.28),       // writing on paper, quiet details
      roof: mix(d.bg, d.ink, 0.16), roofSide: mix(d.bg, d.ink, 0.3),
      door: mix(d.bg, d.ink, 0.34), window: mix(d.bg, d.ink, 0.03),
      dark: mix(d.bg, d.ink, 0.62), ink: d.ink, accent: d.subject,
      // People: monochrome, faceless; a few tones so a crowd isn't clones.
      skin: [mix(d.bg, d.ink, 0.16), mix(d.bg, d.ink, 0.24), mix(d.bg, d.ink, 0.32)],
      hair: [mix(d.bg, d.ink, 0.78), mix(d.bg, d.ink, 0.6), mix(d.bg, d.ink, 0.88)],
      legs: [mix(d.bg, d.ink, 0.58), mix(d.bg, d.ink, 0.7), mix(d.bg, d.ink, 0.5)],
      shirts: [gray(0.14), gray(0.26), gray(0.38), gray(0.5)]
    };
  }

  // A shape's screen box into the audit's record, through any transform, cut
  // to the world's clip (Motion.iso.clipBox, set while the world paints).
  function record(ctx, owner, pts, kind) {
    const rec = M.debug.record;
    if (!rec) return;
    const m = ctx.getTransform ? ctx.getTransform() : { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) {
      const X = m.a * x + (m.c || 0) * y + m.e, Y = (m.b || 0) * x + m.d * y + m.f;
      if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y;
    }
    const c = M.iso.clipBox;
    if (c) { x0 = Math.max(x0, c.x0); y0 = Math.max(y0, c.y0); x1 = Math.min(x1, c.x1); y1 = Math.min(y1, c.y1); if (x1 <= x0 || y1 <= y0) return; }
    if (x1 - x0 <= 0 && y1 - y0 <= 0) return;
    rec.push({ scene: M.debug.scene, phase: M.debug.phase, layer: 'world:' + owner, role: 'shape', owner, kind: kind || 'fill', text: '', bbox: [x0, y0, x1 - x0, y1 - y0], alpha: ctx.globalAlpha });
  }

  // A view through the camera. cam: { ax, ay, cx, cy, s }. owner names whose
  // shapes these are, for the audit.
  function view(ctx, cam, owner) {
    const s = cam.s;
    const P = (x, y, z) => [cam.ax + (x - y) * COS * s - cam.cx, cam.ay + ((x + y) * 0.5 - (z || 0)) * s - cam.cy];
    const V = { ctx, s, P, owner: owner || null, font: cam.font };
    const note = (pts, kind) => record(ctx, V.owner, pts, kind);
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
    // A round shadow under someone standing at (x, y).
    V.spot = (x, y, r, color, alpha) => {
      const [px, py] = P(x, y, 0);
      ctx.save(); ctx.globalAlpha *= alpha == null ? 1 : alpha;
      ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(px + r * 0.25 * s, py + r * 0.06 * s, r * 1.22 * s, r * 0.62 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      note([[px - r * s, py - r * 0.6 * s], [px + r * 1.5 * s, py + r * 0.7 * s]], 'shadow');
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
    // A ball (a head, a knob): a disc lit from the top left.
    V.ball = (x, y, z, r, color, shade) => {
      const [cx, cy] = P(x, y, z + r), R = r * s;
      ctx.fillStyle = shade || color; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
      if (shade) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx - R * 0.16, cy - R * 0.16, R * 0.84, 0, Math.PI * 2); ctx.fill(); }
      note([[cx - R, cy - R], [cx + R, cy + R]]);
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

  // ── flat: charts and labels, facing the viewer, in frame pixels ──────
  function flat(ctx, owner, font) {
    const F = { ctx, owner, font };
    const note = (x0, y0, x1, y1, kind) => record(ctx, owner, [[x0, y0], [x1, y1]], kind);
    F.note = note;
    F.rect = (x, y, w, h, color, r) => {
      if (w <= 0 || h <= 0) return;
      M.paint.rect(ctx, x, y, w, h, color, r);
      note(x, y, x + w, y + h);
    };
    F.poly = (pts, color) => {
      ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
      ctx.fillStyle = color; ctx.fill();
      record(ctx, owner, pts);
    };
    F.line = (x1, y1, x2, y2, color, width, dash) => {
      M.paint.line(ctx, x1, y1, x2, y2, color, width, dash);
      note(Math.min(x1, x2), Math.min(y1, y2) - width / 2, Math.max(x1, x2), Math.max(y1, y2) + width / 2, 'line');
    };
    // A polyline drawn to fraction p of its x span; null points are gaps.
    F.path = (pts, p, color, width, dash) => {
      const tip = M.paint.polyline(ctx, pts, p, color, width, dash);
      const flat = pts.filter(Boolean);
      if (tip && flat.length) {
        const shown = flat.filter(q => q[0] <= tip[0] + 0.5).concat([tip]);
        record(ctx, owner, shown.map(q => [q[0], q[1] - width / 2]).concat(shown.map(q => [q[0], q[1] + width / 2])), 'line');
      }
      return tip;
    };
    F.dot = (x, y, r, color) => { M.paint.dot(ctx, x, y, r, color); note(x - r, y - r, x + r, y + r, 'line'); };
    F.measure = (str, size, weight) => M.text.measure(ctx, str, M.text.font(weight || 400, size, font));
    // A label in the world: role 'label' unless said, layer world-label:<owner>:<id>.
    F.text = (str, x, y, o) => {
      if (!str) return 0;
      const size = o.size, f = M.text.font(o.weight || 400, size, font), w = M.text.measure(ctx, str, f);
      const left = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
      M.paint.text(ctx, str, left, y, { font: f, color: o.color, h: size * 1.25, w, alpha: o.alpha == null ? 1 : o.alpha, layer: 'world-label:' + owner + ':' + (o.id || str.slice(0, 16)), role: o.role || 'label', size, large: o.large });
      return w;
    };
    return F;
  }

  // ── things: what a picture's units are, and the props they meet ──────
  //
  //   Motion.things.register({ name, aka, role: 'unit' | 'prop' | 'set',
  //     size: { w, d, h }, stack, bulky, natural, poses, draw(V, x, y, z, o), mouth(o) })
  //
  // A unit is drawn centred on (x, y), standing on z; o carries its tint
  // (o.body: the tint of a part — the accent for the share; o.kind 'rest':
  // its own material), its pose and a seed. `stack` is how high one unit
  // adds to a pile; `bulky` units pile in blocks rather than one stack;
  // `natural` names its own material (PAPER, N, N2). A prop's mouth is where
  // units leave it or reach it. A set piece (the desk) is a place of its own.
  const THINGS = {};
  function register(def) {
    if (!def || !def.name || typeof def.draw !== 'function' || !def.size) throw new Error('things.register: need { name, size, draw }');
    def.role = def.role || 'unit';
    THINGS[def.name] = def;
    (def.aka || []).forEach(a => { THINGS[a] = def; });
  }
  function get(name, where, custom) {
    const d = (custom && custom[name]) || THINGS[name];
    if (!d) throw new Error(where + ': no thing "' + name + '" — use one from the library (' + names().join(', ') + ') or compose it in meta.things (references/pictures.md)');
    return d;
  }
  const names = () => [...new Set(Object.values(THINGS).map(d => d.name))].sort();

  // A thing composed from the kit, for a noun the library lacks:
  //   "meta": { "things": { "ticket": [ { "sheet": [60, 34] }, { "box": [8, 34, 2], "at": [26, 0, 1.6], "tone": "dark" } ] } }
  // Parts: box [w, d, h], sheet [w, d] (a thin slab with marks), cyl [r, h], ball r.
  // Tones: body (the unit's own tint: neutral, or the accent for the share),
  // neutral, dark, paper. Marks on a sheet or box top: lines, header, stripe, window.
  const TONES = ['body', 'neutral', 'dark', 'paper'];
  const MARKS = ['lines', 'header', 'stripe', 'window'];
  function compose(name, parts) {
    const where = 'meta.things.' + name;
    if (!/^[a-z][a-z-]{1,23}$/.test(name)) throw new Error(where + ': a name is 2 to 24 lowercase letters or hyphens');
    if (!Array.isArray(parts) || !parts.length || parts.length > 12) throw new Error(where + ': use 1 to 12 parts');
    const num = (v, i, what) => { if (!(typeof v === 'number' && v > 0 && v <= 240)) throw new Error(where + '[' + i + '].' + what + ': numbers from 0 to 240'); return v; };
    let x1 = 0, y1 = 0, z1 = 0;
    const P = parts.map((p, i) => {
      const kinds = ['box', 'sheet', 'cyl', 'ball'].filter(k => p[k] != null);
      if (kinds.length !== 1) throw new Error(where + '[' + i + ']: one of box, sheet, cyl or ball');
      const k = kinds[0], at = p.at || [0, 0, 0];
      if (!Array.isArray(at) || at.length !== 3 || at.some(v => !(typeof v === 'number' && v >= 0 && v <= 240))) throw new Error(where + '[' + i + '].at: [x, y, z], each from 0 to 240');
      const tone = p.tone || 'body';
      if (TONES.indexOf(tone) < 0) throw new Error(where + '[' + i + '].tone: use ' + TONES.join(', ') + ' (the accent is the data\'s, never a part\'s)');
      if (p.mark && MARKS.indexOf(p.mark) < 0) throw new Error(where + '[' + i + '].mark: use ' + MARKS.join(', '));
      let w, d, h;
      if (k === 'box') { if (!Array.isArray(p.box) || p.box.length !== 3) throw new Error(where + '[' + i + '].box: [w, d, h]'); [w, d, h] = p.box.map((v, j) => num(v, i, 'box[' + j + ']')); }
      else if (k === 'sheet') { if (!Array.isArray(p.sheet) || p.sheet.length !== 2) throw new Error(where + '[' + i + '].sheet: [w, d]'); [w, d] = p.sheet.map((v, j) => num(v, i, 'sheet[' + j + ']')); h = 1.6; }
      else if (k === 'cyl') { if (!Array.isArray(p.cyl) || p.cyl.length !== 2) throw new Error(where + '[' + i + '].cyl: [r, h]'); const r = num(p.cyl[0], i, 'cyl[0]'); h = num(p.cyl[1], i, 'cyl[1]'); w = d = 2 * r; }
      else { const r = num(p.ball, i, 'ball'); w = d = h = 2 * r; }
      x1 = Math.max(x1, at[0] + w); y1 = Math.max(y1, at[1] + d); z1 = Math.max(z1, at[2] + h);
      return { k, at, w, d, h, tone, mark: p.mark || (k === 'sheet' ? 'lines' : null) };
    });
    const tintOf = (tone, o, m) => (tone === 'body' ? o.body : tone === 'dark' ? m.DARK : tone === 'paper' ? m.PAPER : m.N2);
    const thin = z1 <= 8;
    return {
      name, role: 'unit', custom: true, size: { w: x1, d: y1, h: z1 }, stack: thin ? Math.max(2.2, z1 + 0.6) : z1, bulky: !thin,
      draw(V, x, y, z, o) {
        const m = o.mat, ox = x - x1 / 2, oy = y - y1 / 2;
        P.forEach(p => {
          const t = tintOf(p.tone, o, m), px = ox + p.at[0], py = oy + p.at[1], pz = z + p.at[2];
          if (p.k === 'cyl') V.token(px + p.w / 2, py + p.d / 2, pz, p.w / 2, p.h, t.top, t.right);
          else if (p.k === 'ball') V.ball(px + p.w / 2, py + p.d / 2, pz, p.w / 2, t.top, t.right);
          else V.box(px, py, pz, p.w, p.d, p.h, t);
          if (p.mark && p.k !== 'cyl' && p.k !== 'ball') marks(V, p.mark, px, py, pz + p.h + 0.05, p.w, p.d, m);
        });
      }
    };
  }
  // Marks on a top face: lines of writing, a header band, a stripe, a window.
  function marks(V, kind, x, y, z, w, d, m) {
    const q = (a, b, c, e, col) => V.quad([x + a * w, y + b * d, z], [x + c * w, y + b * d, z], [x + c * w, y + e * d, z], [x + a * w, y + e * d, z], col);
    if (kind === 'header') q(0, 0, 1, 0.18, m.dark);
    else if (kind === 'stripe') q(0, 0.18, 1, 0.34, m.dark);
    else if (kind === 'window') q(0.12, 0.12, 0.88, 0.6, m.window);
    else for (let l = 0; l < 3; l++) q(0.14, 0.3 + l * 0.18, l === 2 ? 0.55 : 0.86, 0.36 + l * 0.18, m.line);
  }

  M.iso = { COS, materials, view, flat, record, marks };
  M.things = { register, get, list: THINGS, names, compose };
  if (typeof module !== 'undefined' && module.exports) module.exports = M.iso;
})(typeof window !== 'undefined' ? window : globalThis);
