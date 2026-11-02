/*!
 * motion-lib/stage.js — the living stage under the card layer.
 *
 *   spec.stage: { "shape": "transformation", "world": "town", "size": [w, d, h] }
 *   scene.stage: { "shows": "…", "time": 1958, "focus": "car", "zoom": 1.2, "look": [x, y, z], "wait": 1.4 }
 *   Motion.things.town = { marks(w) { … }, draw(w, api) { … } }      // the page's own world
 *
 * The world is the video's own. The page writes one painter that draws the
 * whole stage as a pure function of what the story has done so far, and
 * each beat's insight is something that painter makes happen. The engine
 * decides nothing about what happens on the stage; it gives the painter the
 * means to make the story happen, and keeps it honest and in view:
 *
 *   - time: `w.t` (seconds), `w.beat` (the beat the frame is in: id, index,
 *     `lt` seconds into its words, `p` its action's progress), and
 *     `w.progress(id)` for any beat, 0 before its action, 1 after, and
 *     `w.since(id)`, seconds since its action finished;
 *   - story time: each beat may set `time` (a year, an hour, an age, a floor,
 *     any number or a claim), and `w.time` eases from one beat's to the
 *     next's over the action, so anything the story says changes with time
 *     is a function of `w.time`;
 *   - accumulation: `w.accumulate(key, rate)` is the exact running total of
 *     a rate the painter gives per beat (distance from a speed, water from a
 *     flow, people from an arrival rate, money from a wage), easing from one
 *     beat's rate to the next's;
 *   - the claims: `w.value(id)`, `w.display(id)`, and `w.share(id, of)` for
 *     an amount drawn in proportion from zero;
 *   - the camera: one isometric angle for the whole video. Each beat frames
 *     a point (`focus`: a mark the painter names in `marks(w)`, which may
 *     move, or [x, y, z]) at its `zoom`; between beats the camera pans and
 *     zooms on the world only. The card never moves.
 *
 * A beat's action runs from the moment the previous beat's words leave
 * until the middle of its own read; `wait` holds the words' swap longer
 * when the action needs the stage to itself (by default 1.4 s when story
 * time changes, else the plain swap).
 *
 * The shape (`stage.shape`) names the story's structure; it guides how the
 * world is laid out and framed (references/story.md) and sets the longest
 * length, but it does not decide what happens.
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
  const WAIT = 1.4;          // the swap's quiet stretch when story time changes
  const NAMES = ['transformation', 'lineup', 'assembly', 'episodes', 'journey'];

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
    if (!st || typeof st !== 'object') throw new Error('spec.stage is missing: the story\'s shape, its world and its size (references/stage.md)');
    if (NAMES.indexOf(st.shape) < 0) throw new Error('stage.shape must be one of ' + NAMES.join(', '));
    if (!st.world) throw new Error('stage.world: the name of the page\'s painter for the whole stage (Motion.things.<name>)');
    if (!Array.isArray(st.size) || st.size.length !== 3 || st.size.some(v => !(v > 0))) throw new Error('stage.size: the extent [w, d, h] a beat frames at zoom 1, in the world\'s units');
    const R = o.R;
    const num = (v, where) => {
      if (typeof v === 'number') return v;
      const c = R.claims[String(v).replace(/[{}]/g, '')];
      if (!c) throw new Error(where + ': "' + v + '" is not a number or a claim');
      return +c.value;
    };
    const bx = boxes(o.list, o.fr, o.zone);
    let time = st.time != null ? num(st.time, 'stage.time') : 0, focus = null;
    const beats = o.list.map((it, i) => {
      const dir = (it.spec && it.spec.stage) || {};
      const where = 'scene "' + it.id + '"';
      const prev = time;
      if (dir.time != null) time = num(dir.time, where + ': stage.time');
      const zoom = dir.zoom == null ? 1 : +dir.zoom;
      if (!(zoom >= 0.1 && zoom <= 80)) throw new Error(where + ': stage.zoom must be between 0.1 and 80');
      const look = Array.isArray(dir.look) ? dir.look.map(Number) : [0, 0, 0];
      if (look.length !== 3 || look.some(v => !isFinite(v))) throw new Error(where + ': stage.look is [x, y, z]');
      if (dir.focus != null) {
        if (!(typeof dir.focus === 'string' || (Array.isArray(dir.focus) && dir.focus.length === 3))) throw new Error(where + ': stage.focus is a mark\'s name or [x, y, z]');
        focus = dir.focus;
      }
      const wait = dir.wait != null ? +dir.wait : (i > 0 && time !== prev ? WAIT : 0);
      if (!(wait >= 0 && wait <= 3)) throw new Error(where + ': stage.wait must be between 0 and 3 seconds');
      return { id: it.id, index: i, time, zoom, look, focus, wait: i ? wait : 0, box: bx[i], dir };
    });
    return { st, fr: o.fr, zone: o.zone, design: o.design, spec: o.spec, R, boxes: bx, beats, seed: o.spec.meta.seed || 0, override: null, cache: {} };
  }

  // How long the words' swap into beat i waits for the stage: 0 is the swap.
  function travel(S, i) { return S.beats[i] ? S.beats[i].wait : 0; }

  // ── once the timing is known ─────────────────────────────────────────
  function finish(S, scenes) {
    S.scenes = scenes;
    const mid = sc => (sc.enterEnd + sc.exitStart) / 2;
    // The camera eases into beat i from the moment beat i-1's words leave
    // until a little after beat i's words arrive.
    S.windows = scenes.map((sc, i) => (i === 0 ? null : [scenes[i - 1].exitStart, Math.min(sc.cStart + SETTLE, mid(sc))]));
    // A beat's action: from the previous words leaving to the middle of its
    // own read. The first beat acts from the stage's arrival.
    S.beats.forEach((b, i) => {
      b.mid = mid(scenes[i]);
      b.act = i === 0 ? [INTRO * 0.5, b.mid] : [scenes[i - 1].exitStart, b.mid];
      b.t0 = scenes[i].t0; b.t1 = scenes[i].t1; b.cStart = scenes[i].cStart;
    });
    scenes.forEach((sc, i) => { sc.stageBox = S.boxes[i]; });
    S.cache = {};
  }

  // A beat as the world sees it: under an override (the audit asking "what
  // if this beat's insight hadn't happened?") it is the beat before.
  const eff = (S, j) => (S.override === j && j > 0 ? S.beats[j - 1] : S.beats[j]);

  // The action's progress of beat j at t, 0..1 (linear: the painter eases).
  function progress(S, j, t) {
    if (S.override === j) return 0;
    const a = S.beats[j].act;
    return clamp((t - a[0]) / Math.max(1e-6, a[1] - a[0]));
  }

  // Story time at t: each beat's, eased (glide) over its action.
  function timeAt(S, t) {
    const B = S.beats;
    let v = eff(S, 0).time;
    for (let j = 1; j < B.length; j++) {
      const a = B[j].act;
      if (t < a[0]) break;
      const from = v, to = eff(S, j).time;
      if (t < a[1]) return lerp(from, to, M.ease.glide(clamp((t - a[0]) / (a[1] - a[0]))));
      v = to;
    }
    return v;
  }

  // The running total of a rate the painter gives per beat, exact: the rate
  // holds through a beat and ramps to the next beat's over its action.
  function accumulate(S, key, rateFn, t) {
    const ck = key + '|' + S.override;
    let pw = S.cache[ck];
    if (!pw) {
      const B = S.beats;
      const r = B.map((b, j) => {
        const v = +rateFn(eff(S, j));
        if (!isFinite(v)) throw new Error('accumulate("' + key + '"): the rate for beat "' + b.id + '" is not a number');
        return v;
      });
      // Pieces: [t0, t1, r0, r1], a steady rate or a ramp.
      const pieces = [];
      let at = -Infinity;
      for (let j = 1; j < B.length; j++) {
        const a = B[j].act;
        pieces.push([at, a[0], r[j - 1], r[j - 1]]);
        pieces.push([a[0], a[1], r[j - 1], r[j]]);
        at = a[1];
      }
      pieces.push([at, Infinity, r[B.length - 1], r[B.length - 1]]);
      pw = S.cache[ck] = pieces;
    }
    // Total from t = 0.
    let sum = 0;
    for (const [a, b, r0, r1] of pw) {
      const lo = Math.max(a, 0), hi = Math.min(b, t);
      if (hi <= lo) { if (a >= t) break; continue; }
      const span = b - a, k0 = isFinite(span) ? (lo - a) / span : 0, k1 = isFinite(span) ? (hi - a) / span : 0;
      sum += (hi - lo) * (lerp(r0, r1, k0) + lerp(r0, r1, k1)) / 2;
    }
    return sum;
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
    const a = S.beats[Math.max(0, i - 1)], b = S.beats[i], w = S.windows[i];
    const k = w ? M.ease.glide(clamp((t - w[0]) / (w[1] - w[0]))) : 1;
    const mixBox = (p, q) => ({ x: lerp(p.x, q.x, k), y: lerp(p.y, q.y, k), w: lerp(p.w, q.w, k), h: lerp(p.h, q.h, k), inner: q.inner });
    return { index: i, k, from: a, to: b, zoom: lerp(a.zoom, b.zoom, k), look: a.look.map((v, n) => lerp(v, b.look[n], k)), box: mixBox(a.box, b.box) };
  }

  // The scale at which an extent [w, d, h] fills its share of a box.
  function fit(box, ext) {
    const [w, d, h] = ext;
    return Math.min(0.58 * box.w / ((w + d) * M.iso.COS), 0.6 * box.h / ((w + d) / 2 + h));
  }

  // A painter the page registered, or a clear error naming it.
  function thing(name, where) {
    const p = M.things[name];
    if (!p || typeof p.draw !== 'function') throw new Error(where + ': no painter Motion.things.' + name + ' with a draw(w, api) function');
    return p;
  }

  // What the world painter gets at t.
  function worldAt(S, t) {
    const B = S.beats, R = S.R;
    const found = S.scenes.findIndex(sc => t >= sc.t0 && t < sc.t1), bi = found < 0 ? B.length - 1 : found;
    const claim = id => { const c = R.claims[String(id).replace(/[{}]/g, '')]; if (!c) throw new Error('stage world: unknown claim "' + id + '"'); return c; };
    const idx = id => { const j = B.findIndex(b => b.id === id); if (j < 0) throw new Error('stage world: no beat "' + id + '" in this cut'); return j; };
    const has = id => B.some(b => b.id === id);
    return {
      t, time: timeAt(S, t),
      beat: { id: B[bi].id, index: bi, lt: t - B[bi].cStart, p: progress(S, bi, t), dir: eff(S, bi).dir },
      beats: B.map(b => ({ id: b.id, index: b.index, time: b.time, mid: b.mid, act: b.act.slice() })),
      has, progress: id => (has(id) ? progress(S, idx(id), t) : 0),
      // Seconds since a beat's action finished (0 until then, and under the
      // audit's "what if it never happened"): a consequence that plays on
      // through the beat's hold, or after it.
      since: id => { if (!has(id)) return 0; const j = idx(id); return S.override === j ? 0 : Math.max(0, t - B[j].act[1]); },
      timeAt: tt => timeAt(S, tt),
      accumulate: (key, rate, tt) => accumulate(S, key, rate, tt == null ? t : tt),
      value: id => +claim(id).value,
      display: id => { const c = claim(id); return c.display != null ? String(c.display) : String(c.value); },
      // An amount drawn in proportion, from zero: this claim against another
      // (or a number) as the whole.
      share: (id, of) => { const v = +claim(id).value, m = typeof of === 'number' ? of : +claim(of).value; if (!(m > 0) || v < 0) throw new Error('stage world: share needs values of zero or more'); return v / m; },
      blend: blendForm
    };
  }

  // ── paint ────────────────────────────────────────────────────────────
  function paint(ctx, C, t, sceneId) {
    const S = C.stage;
    const world = thing(S.st.world, 'stage.world');
    const w = worldAt(S, t);
    const cam = cameraAt(S, t);
    const marks = typeof world.marks === 'function' ? world.marks(w) || {} : {};
    const point = f => {
      if (Array.isArray(f)) return f.map(Number);
      if (typeof f === 'string') { if (!marks[f]) throw new Error('stage.focus "' + f + '": the world names no such mark (marks: ' + Object.keys(marks).join(', ') + ')'); return marks[f]; }
      const first = Object.values(marks)[0];
      return first ? first.slice() : [0, 0, 0];
    };
    const fa = point(cam.from.focus), fb = point(cam.to.focus);
    const s = fit(cam.box, S.st.size) * cam.zoom;
    const F = fa.map((v, n) => lerp(v, fb[n], cam.k) + cam.look[n]);
    const ax = cam.box.x + cam.box.w / 2, ay = cam.box.y + cam.box.h * 0.56;
    const cx = (F[0] - F[1]) * M.iso.COS * s, cy = ((F[0] + F[1]) / 2 - F[2]) * s;
    const mat = S.mat || (S.mat = M.iso.materials(S.design));
    M.debug.scene = sceneId;
    // A view named after the mark this beat frames draws the beat's subject:
    // the audit keeps it inside the stage's room while the words hold.
    const framed = typeof cam.to.focus === 'string' ? cam.to.focus : null;
    const view = (owner, origin) => M.iso.view(ctx, { ax, ay, cx, cy, s, origin, font: S.design.font }, owner && (owner === framed || owner === 'subject') ? 'subject' : owner || 'world');
    const worldX = sx => (sx - ax + cx) / (M.iso.COS * s);
    const range = [worldX(cam.box.x) - cam.box.h / s * 1.2, worldX(cam.box.x + cam.box.w) + cam.box.h / s * 1.2];
    const labelSize = Math.max(M.layout.MIN_TEXT + 2, M.layout.typeFor(C).units.size * 0.85);
    const avoid = [];
    const api = {
      ctx, view, mat, design: S.design, ease: M.ease, iso: M.iso, sstep, lerp, clamp, range, s,
      rng: (...keys) => M.rng(S.seed, 'stage', ...keys),
      // The screen rectangle of a box in the world, for labels to give way to.
      rect(x, y, z, bw, bd, bh) {
        const V = view('probe'), pts = [];
        [x, x + bw].forEach(px => [y, y + bd].forEach(py => [z, z + bh].forEach(pz => pts.push(V.P(px, py, pz)))));
        return { x0: Math.min(...pts.map(p => p[0])), y0: Math.min(...pts.map(p => p[1])), x1: Math.max(...pts.map(p => p[0])), y1: Math.max(...pts.map(p => p[1])) };
      },
      avoid: r => avoid.push(r),
      // Words on the stage are set at one size on screen, whatever the zoom:
      // the camera zooms the world, never the words.
      label(str, wx, wy, wz, o) {
        if (!str) return;
        const [px, py] = view('label').P(wx, wy, wz);
        const f = M.text.font((o && o.weight) || 600, labelSize, S.design.font);
        const tw = M.text.measure(ctx, str, f), h = labelSize * 1.25;
        const x = o && o.align === 'center' ? px - tw / 2 : px, y = py + ((o && o.dy) || 0);
        // Words fade out before the stage's soft edges, and give way to
        // whatever the painter asked them to avoid.
        const B = cam.box, edge = Math.min(x - B.x, B.x + B.w - (x + tw), y - B.y, B.y + B.h - (y + h));
        let a = clamp(edge / FADE) * ((o && o.alpha) == null ? 1 : o.alpha);
        avoid.forEach(r => {
          const gx = Math.max(r.x0 - (x + tw), x - r.x1, 0), gy = Math.max(r.y0 - (y + h), y - r.y1, 0);
          a *= clamp((Math.max(gx, gy) - 8) / 40);
        });
        if (a <= 0.01) return;
        M.paint.text(ctx, str, x, y, { font: f, color: (o && o.color) || S.design.muted, h, w: tw, alpha: a, layer: 'stage-label:' + str, role: 'stage', size: labelSize });
      }
    };
    ctx.save();
    ctx.globalAlpha *= M.ease.outQuint(clamp(t / INTRO));
    world.draw(w, api);
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
      g.addColorStop(0, bg); g.addColorStop(1, bg + '00');
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

  M.stage = { NAMES, plan, travel, finish, paint, cameraAt, fit, boxes, blendForm, thing, worldAt, timeAt, accumulate, progress, sstep, clamp, lerp, FADE, WAIT };
  if (typeof module !== 'undefined' && module.exports) module.exports = M.stage;
})(typeof window !== 'undefined' ? window : globalThis);
