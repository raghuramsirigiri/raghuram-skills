/*!
 * motion-lib/stage.js — the living stage under the card layer.
 *
 *   spec.stage: { "shape": "transformation", "subject": "car", "size": [w, d, h], … }
 *   scene.stage: { "state": "saloon", "zoom": 1.3, "look": [x, y, z] }
 *   Motion.things.car = { draw(V, s, api) { … } }      // the page's own painter
 *
 * A diorama world seen from one isometric angle for the whole video. The
 * card layer (core.js, beat.js) owns the top of the frame (a wide frame's
 * left column) and never moves; the stage owns the room it leaves, down to
 * the footer, and dissolves into the paper at its inner edges, so the card's
 * words never sit on it.
 *
 * The story's shape (shapes/*.js) is a grammar: it reads each beat's `stage`
 * directions, lays out the world, and says, at any t, where the camera looks
 * and what is drawn. It has no content in it. Every thing on the stage is a
 * painter the page registers on Motion.things, drawn from the story's own
 * nouns with the iso kit.
 *
 * The camera: one angle, always. Between beats it pans and zooms on the
 * world only (eased on glide, over the words' swap and a little past it);
 * during a beat it follows the shape's subject. The scale is fitted to the
 * stage box per beat and multiplied by the beat's `zoom`.
 *
 * Everything is a pure function of t.
 */
(function (root) {
  'use strict';
  const M = root.Motion = root.Motion || {};
  M.things = M.things || {};
  const clamp = v => (v < 0 ? 0 : v > 1 ? 1 : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const sstep = (a, b, x) => { const q = clamp((x - a) / (b - a)); return q * q * (3 - 2 * q); };
  const FADE = 90;           // the stage's soft inner edges, frame px
  const SETTLE = 0.5;        // the camera keeps easing this long into the next beat's words
  const INTRO = 0.6;         // the stage arrives over the first beat's first 0.6 s

  // ── shapes ───────────────────────────────────────────────────────────
  const SHAPES = {};
  const NAMES = ['transformation', 'lineup', 'assembly', 'episodes', 'journey'];
  function registerShape(def) {
    if (!def || !def.name || typeof def.plan !== 'function' || typeof def.paint !== 'function') throw new Error('stage.registerShape: need { name, plan, finish, frame, paint }');
    SHAPES[def.name] = def;
  }

  // ── the stage's room, per beat ───────────────────────────────────────
  // A tall or square frame: under the card's words, the whole frame width,
  // down to the footer. Beats without a figure or chart share one top (the
  // lowest their words reach), so the stage holds still from beat to beat;
  // a beat with one gives the stage the room under it, and the camera
  // reframes. A wide frame: the room right of the words' column.
  function boxes(list, fr, zone) {
    const S = fr.safe, K = M.layout.K;
    const bottom = zone.ruleY - 8 * K;
    if (fr.cls === 'wide') {
      const colW = Math.round(S.w * M.layout.PROFILE.wide.col);
      const x = S.x + colW + 20 * K;
      return list.map(() => ({ x, y: 0, w: fr.W - x, h: bottom, inner: { left: true, bottom: true } }));
    }
    const card = it => it.built.card || { bottom: zone.top, extra: false };
    const common = Math.max(zone.top, ...list.filter(it => !card(it).extra).map(it => card(it).bottom));
    return list.map(it => {
      const top = (card(it).extra ? Math.max(common, card(it).bottom) : common) + 14 * K;
      return { x: 0, y: top, w: fr.W, h: Math.max(40, bottom - top), inner: { top: true, bottom: true } };
    });
  }

  // ── compile: the plan, before timing ─────────────────────────────────
  function plan(o) {
    const st = o.spec.stage;
    if (!st || typeof st !== 'object') throw new Error('spec.stage is missing: the stage\'s shape, subject and size (references/stage.md)');
    if (NAMES.indexOf(st.shape) < 0) throw new Error('stage.shape must be one of ' + NAMES.join(', '));
    const shape = SHAPES[st.shape];
    if (!shape) throw new Error('stage.shape "' + st.shape + '" is not built yet in this version: the built shapes are ' + Object.keys(SHAPES).join(', '));
    const bx = boxes(o.list, o.fr, o.zone);
    const S = { shape, st, fr: o.fr, zone: o.zone, design: o.design, spec: o.spec, R: o.R, boxes: bx, seed: o.spec.meta.seed || 0 };
    S.plan = shape.plan(S, o.list);
    // The camera's own directions, read the same way for every shape.
    S.cams = o.list.map((it, i) => {
      const dir = (it.spec && it.spec.stage) || {};
      const zoom = dir.zoom == null ? 1 : +dir.zoom;
      if (!(zoom >= 0.5 && zoom <= 3)) throw new Error('scene "' + it.id + '": stage.zoom must be between 0.5 and 3');
      const look = Array.isArray(dir.look) ? dir.look.map(Number) : [0, 0, 0];
      if (look.length !== 3 || look.some(v => !isFinite(v))) throw new Error('scene "' + it.id + '": stage.look is [x, y, z]');
      return { zoom, look, box: bx[i] };
    });
    return S;
  }

  // How long the words' swap into beat i waits for the stage: 0 is the
  // plain swap.
  function travel(S, i) { return S.plan.beats[i] ? S.plan.beats[i].travel || 0 : 0; }

  // ── once the timing is known ─────────────────────────────────────────
  function finish(S, scenes) {
    S.scenes = scenes;
    // The camera eases into beat i from the moment beat i-1's words leave
    // until a little after beat i's words arrive.
    S.windows = scenes.map((sc, i) => (i === 0 ? null : [scenes[i - 1].exitStart, Math.min(sc.cStart + SETTLE, (sc.enterEnd + sc.exitStart) / 2)]));
    S.shape.finish(S, scenes);
    scenes.forEach((sc, i) => { sc.stageBox = S.boxes[i]; });
  }

  // Which beat the camera belongs to at t, and how far into its window.
  function cameraAt(S, t) {
    const sc = S.scenes;
    let i = sc.length - 1;
    for (let j = 0; j < sc.length; j++) {
      const w = S.windows[j + 1];
      if (!w || t < w[0]) { i = j; break; }
      if (t < w[1]) { i = j + 1; break; }
    }
    const a = S.cams[Math.max(0, i - 1)], b = S.cams[i], w = S.windows[i];
    const k = w ? M.ease.glide(clamp((t - w[0]) / (w[1] - w[0]))) : 1;
    const mixBox = (p, q) => ({ x: lerp(p.x, q.x, k), y: lerp(p.y, q.y, k), w: lerp(p.w, q.w, k), h: lerp(p.h, q.h, k), inner: q.inner });
    return { index: i, k, zoom: lerp(a.zoom, b.zoom, k), look: a.look.map((v, n) => lerp(v, b.look[n], k)), box: mixBox(a.box, b.box) };
  }

  // The scale at which a subject of extent [w, d, h] fills its share of a box.
  function fit(box, ext) {
    const [w, d, h] = ext;
    return Math.min(0.58 * box.w / ((w + d) * M.iso.COS), 0.6 * box.h / ((w + d) / 2 + h));
  }

  // ── paint ────────────────────────────────────────────────────────────
  function paint(ctx, C, t, sceneId) {
    const S = C.stage;
    const cam = cameraAt(S, t);
    const fr = S.shape.frame(S, t);          // { focus: [x, y, z], extent: [w, d, h] }
    const s = fit(cam.box, fr.extent) * cam.zoom;
    const F = fr.focus.map((v, n) => v + cam.look[n]);
    const ax = cam.box.x + cam.box.w / 2, ay = cam.box.y + cam.box.h * 0.56;
    const cx = (F[0] - F[1]) * M.iso.COS * s, cy = ((F[0] + F[1]) / 2 - F[2]) * s;
    const mat = S.mat || (S.mat = M.iso.materials(S.design));
    M.debug.scene = sceneId;
    const view = (owner, origin) => M.iso.view(ctx, { ax, ay, cx, cy, s, origin, font: S.design.font }, owner);
    // Screen point -> the world x on the ground line y = yLine (for ranges).
    const worldX = (sx, yLine) => (sx - ax + cx) / (M.iso.COS * s) + (yLine || 0);
    const range = [worldX(cam.box.x) - cam.box.h / s * 1.2, worldX(cam.box.x + cam.box.w) + cam.box.h / s * 1.2];
    const labelSize = Math.max(M.layout.MIN_TEXT + 2, M.layout.typeFor(C).units.size * 0.85);
    const kit = {
      view, mat, s, cam, range, t, avoid: [],
      // The screen rectangle of a box in the world, for labels to give way to.
      rect(x, y, z, w, d, h) {
        const V = M.iso.view(ctx, { ax, ay, cx, cy, s }, 'probe');
        const pts = [];
        [x, x + w].forEach(px => [y, y + d].forEach(py => [z, z + h].forEach(pz => pts.push(V.P(px, py, pz)))));
        return { x0: Math.min(...pts.map(p => p[0])), y0: Math.min(...pts.map(p => p[1])), x1: Math.max(...pts.map(p => p[0])), y1: Math.max(...pts.map(p => p[1])) };
      },
      // Words on the stage are set at one size on screen, whatever the zoom:
      // the camera zooms the world, never the words.
      label(str, wx, wy, wz, o) {
        if (!str) return;
        const [px, py] = M.iso.view(ctx, { ax, ay, cx, cy, s }, 'label').P(wx, wy, wz);
        const f = M.text.font((o && o.weight) || 600, labelSize, S.design.font);
        const w = M.text.measure(ctx, str, f), h = labelSize * 1.25;
        const x = o && o.align === 'center' ? px - w / 2 : px, y = py + ((o && o.dy) || 0);
        // Words fade out before they reach the stage's soft edges, and give
        // way to the subject when it passes over them.
        const B = cam.box, edge = Math.min(x - B.x, B.x + B.w - (x + w), y - B.y, B.y + B.h - (y + h));
        let a = clamp(edge / FADE) * ((o && o.alpha) == null ? 1 : o.alpha);
        (kit.avoid || []).forEach(r => {
          const gx = Math.max(r.x0 - (x + w), x - r.x1, 0), gy = Math.max(r.y0 - (y + h), y - r.y1, 0);
          a *= clamp((Math.max(gx, gy) - 8) / 40);
        });
        if (a <= 0.01) return;
        M.paint.text(ctx, str, x, y, { font: f, color: (o && o.color) || S.design.muted, h, w, alpha: a, layer: 'stage-label:' + str, role: 'stage', size: labelSize });
      },
      api(extra) {
        return Object.assign({ t, mat, design: S.design, ease: M.ease, iso: M.iso, sstep, lerp, clamp, range,
          rng: (...keys) => M.rng(S.seed, 'stage', ...keys), label: kit.label }, extra);
      }
    };
    ctx.save();
    ctx.globalAlpha *= M.ease.outQuint(clamp(t / INTRO));
    S.shape.paint(S, ctx, t, kit);
    ctx.restore();
    fade(ctx, C, cam.box);
  }

  // The stage dissolves into the paper at its inner edges (toward the card's
  // words and the footer), and nothing of it shows beyond them. Frame edges
  // are the stage's own: things run off them.
  function fade(ctx, C, B) {
    const bg = C.design.bg, W = C.W, H = C.H;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = bg;
    const inner = B.inner || {};
    if (inner.top) ctx.fillRect(0, 0, W, Math.max(0, B.y));
    if (inner.left) ctx.fillRect(0, 0, Math.max(0, B.x), H);
    if (inner.bottom) ctx.fillRect(0, B.y + B.h, W, H - (B.y + B.h));
    const band = (x0, y0, x1, y1, rx, ry, rw, rh) => {
      if (!ctx.createLinearGradient) return;
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, bg); g.addColorStop(1, M.design.mix(bg, bg, 0) + '00');
      ctx.fillStyle = g; ctx.fillRect(rx, ry, rw, rh);
    };
    if (inner.top) band(0, B.y, 0, B.y + FADE, 0, B.y, W, FADE);
    if (inner.left) band(B.x, 0, B.x + FADE, 0, B.x, 0, FADE, H);
    if (inner.bottom) band(0, B.y + B.h, 0, B.y + B.h - FADE, 0, B.y + B.h - FADE, W, FADE);
    ctx.restore();
  }

  // Forms between two states: numbers and number arrays blend, profiles
  // ([[u, v]…] of the same length) blend point by point, anything else
  // switches halfway.
  function blendForm(a, b, k) {
    if (k <= 0 || !b) return a;
    if (k >= 1 || !a) return b;
    const out = {};
    new Set(Object.keys(a).concat(Object.keys(b))).forEach(key => {
      const x = a[key], y = b[key];
      if (typeof x === 'number' && typeof y === 'number') out[key] = lerp(x, y, k);
      else if (Array.isArray(x) && Array.isArray(y) && x.length === y.length && x.every(v => typeof v === 'number')) out[key] = x.map((v, n) => lerp(v, y[n], k));
      else if (Array.isArray(x) && Array.isArray(y) && x.length === y.length && x.every(v => Array.isArray(v))) out[key] = M.iso.blend(x, y, k);
      else out[key] = k < 0.5 ? (x === undefined ? y : x) : (y === undefined ? x : y);
    });
    return out;
  }

  // A painter the page registered, or a clear error naming it.
  function thing(name, where) {
    const p = M.things[name];
    if (!p || typeof p.draw !== 'function') throw new Error(where + ': no painter Motion.things.' + name + ' with a draw(V, s, api) function');
    return p;
  }

  M.stage = { registerShape, shapes: SHAPES, NAMES, plan, travel, finish, paint, cameraAt, fit, boxes, blendForm, thing, sstep, clamp, lerp, FADE };
  if (typeof module !== 'undefined' && module.exports) module.exports = M.stage;
})(typeof window !== 'undefined' ? window : globalThis);
