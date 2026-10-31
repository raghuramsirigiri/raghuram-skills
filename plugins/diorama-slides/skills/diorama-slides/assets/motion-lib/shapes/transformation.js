/*!
 * shapes/transformation.js — one subject, its states.
 *
 *   "stage": { "shape": "transformation", "subject": "car", "size": [46, 20, 18],
 *              "states": [ { "id": "tourer", "label": "1912", "form": { … } },
 *                          { "id": "saloon", "label": "1934", "form": { … } }, … ],
 *              "trail": "none", "scenery": "town", "ground": "road", "topPace": 2 }
 *   state: { "id": "saloon", "pace": "F4", … }       (a claim, or lengths per second)
 *   scene: "stage": { "state": "saloon", "pace": 0, "zoom": 1.2, "look": [10, 0, 4],
 *                     "shows": "the saloon pulls away faster than the tourer" }
 *
 * The grammar: the states stand in order along one path on a diorama base,
 * a stop for each. The subject travels the path at the pace the story gives
 * it, and the camera follows it, so the ground slides by. A pace is a claim
 * (a top speed, a walking rate): drawn proportional and from zero, the
 * story's largest such claim at `topPace` subject lengths per second; or a
 * plain number of lengths per second when the motion carries no figure; or
 * 0, and the subject halts. A beat takes its state's pace unless it sets its
 * own. During a beat the subject passes its point at the middle of the beat;
 * when a beat names a new state, it travels on and changes form in the quiet
 * stretch between the words, and the new state's stop is set where it
 * arrives, so the stops sit as far apart as the story's pace carries it.
 * A pace that changes without a new state (pulling in, pulling away) eases
 * over the same stretch. With no pace anywhere, a slow drift keeps the stage
 * alive; it is a fallback, never the story's motion. A state with a
 * `parent` other than the state before it starts a branch (a lineage): the
 * branch runs on its own lane behind the main line, and the subject crosses
 * to it. `trail: "keep"` leaves each state standing at its stop once the
 * subject moves on, so the lineage stays in view.
 *
 * The form: each state's `form` is the page's own description of the
 * subject in that state (numbers, number arrays, profiles). The subject's
 * painter gets the form blended between the two states as it changes,
 * `s.from`, `s.to` and `s.k` (0..1), the distance it has travelled
 * (`s.dist`, for wheels and feet), its speed in lengths per second
 * (`s.speed`), the beat it is in (`s.beat`) and the time. Painters also get
 * `api.beats` (where the subject is at each beat's middle, so a pump goes
 * where the story stops for fuel) and `api.value(id)` for claims. Nothing
 * here knows what the subject is.
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  const ST = M.stage;
  const IDLE = 0.15;         // the fallback drift, in subject lengths per second
  const TOP = 2;             // the largest pace claim, in subject lengths per second
  const ARRIVE = 0.45;       // the change runs this far into the next beat's words

  function plan(S, list) {
    const st = S.st;
    if (!st.subject) throw new Error('stage.subject: the name of the page\'s painter for the subject (Motion.things.<name>)');
    if (!Array.isArray(st.size) || st.size.length !== 3 || st.size.some(v => !(v > 0))) throw new Error('stage.size: the subject\'s largest extent [w, d, h] in its own units');
    const states = st.states || [];
    if (states.length < 2) throw new Error('stage.states: a transformation needs at least two states');
    const byId = {};
    states.forEach((x, i) => {
      if (!x.id) throw new Error('stage.states[' + i + '] has no id');
      if (byId[x.id]) throw new Error('stage.states: two states share the id "' + x.id + '"');
      byId[x.id] = x;
    });
    // The tree: each state's parent is the state before it unless it names
    // one. A branch is a child that isn't its parent's first.
    const kids = {};
    states.forEach((x, i) => {
      const parent = x.parent !== undefined ? x.parent : (i ? states[i - 1].id : null);
      if (parent != null && !byId[parent]) throw new Error('stage.states "' + x.id + '": parent "' + parent + '" is not a state');
      x._parent = parent;
      if (parent != null) (kids[parent] = kids[parent] || []).push(x.id);
    });
    const [w, d] = st.size;
    const gap = Math.max(w, d) * (st.spacing || 2.6);
    const lane = d * 3.2;
    const width = d * 2.4;
    let lanes = 0;
    const node = {};
    const place = (id, depth, ln) => {
      node[id] = { id, x: depth * gap, y: -ln * lane, depth, lane: ln, state: byId[id] };
      (kids[id] || []).forEach((k, j) => place(k, depth + 1, j === 0 ? ln : ++lanes));
    };
    states.filter(x => x._parent == null).forEach((root0, j) => place(root0.id, 0, j === 0 ? 0 : ++lanes));
    const path = id => { const out = []; for (let n = id; n != null; n = byId[n]._parent) out.unshift(n); return out; };
    const steps = (a, b) => { const pa = path(a), pb = path(b); let c = 0; while (c < pa.length && c < pb.length && pa[c] === pb[c]) c++; return pa.length - c + pb.length - c; };
    // Paces: a claim is drawn proportional and from zero, the largest claim
    // at `topPace` lengths per second; a number is lengths per second.
    const len = w;
    const cid = p => String(p).replace(/[{}]/g, '');
    const claimed = [];
    states.forEach(x => { if (typeof x.pace === 'string') claimed.push(x.pace); });
    list.forEach(it => { const p = it.spec && it.spec.stage && it.spec.stage.pace; if (typeof p === 'string') claimed.push(p); });
    const valueOf = (p, where) => {
      const c = S.R.claims[cid(p)];
      if (!c) throw new Error(where + ': pace "' + p + '" is not a claim');
      if (!(+c.value >= 0)) throw new Error(where + ': pace claim ' + c.id + ' must be zero or more');
      return +c.value;
    };
    const maxV = Math.max(1e-9, ...claimed.map(p => valueOf(p, 'stage')));
    const top = (st.topPace || TOP) * len;
    const pace = (p, where) => {
      if (p == null) return null;
      if (typeof p === 'number') { if (!(p >= 0)) throw new Error(where + ': pace must be zero or more'); return p * len; }
      return valueOf(p, where) / maxV * top;
    };
    const idle = (st.idlePace != null ? st.idlePace : IDLE) * len;
    let prev = null;
    const beats = list.map((it, i) => {
      const dir = (it.spec && it.spec.stage) || {};
      if (dir.state != null && !byId[dir.state]) throw new Error('scene "' + it.id + '": stage.state "' + dir.state + '" is not one of ' + states.map(x => x.id).join(', '));
      const key = dir.state || prev || states[0].id;
      const change = i > 0 && key !== prev;
      const n = change ? steps(prev, key) : 0;
      const own = pace(dir.pace, 'scene "' + it.id + '"');
      const fromState = pace(byId[key].pace, 'stage.states "' + key + '"');
      const v = own != null ? own : fromState != null ? fromState : idle;
      const paceClaim = typeof dir.pace === 'string' ? cid(dir.pace) : dir.pace == null && typeof byId[key].pace === 'string' ? cid(byId[key].pace) : null;
      const b = { scene: it.id, state: key, change, v, paceClaim, travel: change ? Math.min(2.2, 1.0 + 0.4 * n) : 0 };
      prev = key;
      return b;
    });
    return { states, byId, node, gap, lane, width, beats, kids, len, size: st.size, trail: st.trail === 'keep' };
  }

  // A cubic from 0 to L over T seconds that leaves at speed va and arrives at vb.
  const hermite = (L, T, va, vb, u) => L * (3 * u * u - 2 * u * u * u) + va * T * (u - 2 * u * u + u * u * u) + vb * T * (u * u * u - u * u);

  // The route between two points on the base: along the line, with a lane
  // change made square at the middle, as a base's paths are.
  function route(p, q) {
    if (Math.abs(p[1] - q[1]) < 1e-6) return [p, q];
    const xm = (p[0] + q[0]) / 2;
    return [p, [xm, p[1]], [xm, q[1]], q];
  }
  function along(pts, s) {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (s <= L || i === pts.length - 1) { const k = L ? Math.min(1, s / L) : 1; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, b[0] - a[0], b[1] - a[1]]; }
      s -= L;
    }
    return [pts[0][0], pts[0][1], 1, 0];
  }
  const length = pts => pts.slice(1).reduce((s, b, i) => s + Math.hypot(b[0] - pts[i][0], b[1] - pts[i][1]), 0);

  // The subject's journey: runs at a steady pace, and changes (of state, of
  // pace or both) between beats, end to end. A new state's stop is set
  // where the subject arrives at the pace it travels, so a fast story
  // spreads its stops out and a halt lands on its stop.
  function finish(S, scenes) {
    const P = S.plan;
    const mid = sc => (sc.enterEnd + sc.exitStart) / 2;
    const placed = new Set();
    const pieces = [];
    const b0 = P.beats[0];
    const n0 = P.node[b0.state];
    n0.x = 0; placed.add(b0.state);
    let v = b0.v, t = 0, x = -v * mid(scenes[0]), y = n0.y, dist = 0, state = b0.state;
    for (let j = 1; j < scenes.length; j++) {
      const b = P.beats[j];
      if (!b.change && Math.abs(b.v - v) < 1e-9) continue;
      const w0 = scenes[j - 1].exitStart, w1 = Math.min(scenes[j].cStart + ARRIVE, mid(scenes[j]) - 0.05), T = w1 - w0;
      pieces.push({ kind: 'run', t0: t, t1: w0, x, y, v, dist, state });
      const x0 = x + v * (w0 - t);
      dist += v * (w0 - t);
      let q;
      if (b.change) {
        const nd = P.node[b.state];
        if (!placed.has(b.state)) {
          nd.x = x0 + Math.max((v + b.v) / 2 * T, P.len * 1.4) + b.v * (mid(scenes[j]) - w1);
          placed.add(b.state);
        }
        q = [nd.x - b.v * (mid(scenes[j]) - w1), nd.y];
      } else q = [x0 + (v + b.v) / 2 * T, y];
      const pts = route([x0, y], q), L = length(pts) * (q[0] < x0 ? -1 : 1);
      pieces.push({ kind: 'change', t0: w0, t1: w1, pts, L, va: v, vb: b.v, dist, from: state, to: b.state });
      dist += Math.abs(L); x = q[0]; y = q[1]; t = w1; v = b.v; state = b.state;
    }
    pieces.push({ kind: 'run', t0: t, t1: Infinity, x, y, v, dist, state });
    // States no beat reaches stand on beyond the last stop.
    let far = Math.max(...[...placed].map(id => P.node[id].x));
    P.states.forEach(st => { if (!placed.has(st.id)) { far += P.len * 2; P.node[st.id].x = far; } });
    P.pieces = pieces;
    // Where the subject is at each beat's middle: a thing the story puts at
    // a beat (a pump where it stops for fuel) stands there.
    P.at = scenes.map((sc, i) => { const a = subjectAt(S, mid(sc)); return { id: sc.id, index: i, state: P.beats[i].state, x: a.x, y: a.y, pace: P.beats[i].v / P.len }; });
  }

  // Where the subject is at t, its form and how far it has gone.
  function subjectAt(S, t) {
    const P = S.plan;
    const pc = P.pieces.find(x => t < x.t1) || P.pieces[P.pieces.length - 1];
    if (pc.kind === 'run') {
      const dt = Math.max(0, t - pc.t0);
      return { x: pc.x + pc.v * dt, y: pc.y, heading: [1, 0], dist: pc.dist + pc.v * dt, speed: pc.v / P.len, from: pc.state, to: pc.state, k: 1, state: pc.state };
    }
    const T = pc.t1 - pc.t0, u = ST.clamp((t - pc.t0) / T);
    const sgn = pc.L < 0 ? -1 : 1, Lm = Math.abs(pc.L);
    const h = uu => hermite(Lm, T, pc.va * sgn, pc.vb * sgn, uu);
    const sAlong = h(u);
    const e = 1e-3, ds = (h(Math.min(1, u + e)) - h(Math.max(0, u - e))) / (2 * e * T);
    const [x, y, hx, hy] = along(pc.pts, sAlong);
    const hl = Math.hypot(hx, hy) || 1;
    const k = pc.from === pc.to ? 1 : ST.sstep(0.15, 0.85, u);
    return { x, y, heading: [hx / hl, hy / hl], dist: pc.dist + Math.abs(sAlong), speed: Math.abs(ds) / P.len, from: pc.from, to: pc.to, k, state: u < 0.5 ? pc.from : pc.to };
  }

  function frame(S, t) {
    const a = subjectAt(S, t), h = S.plan.size[2];
    return { focus: [a.x, a.y, h * 0.42], extent: S.plan.size };
  }

  // ── painting ─────────────────────────────────────────────────────────
  // The base: a chunky slab under the main line, one for each branch's lane,
  // a lighter stop for each state with its label at the front edge, and quiet
  // ticks along the front edge that slide by as the subject moves.
  function paintBase(S, kit) {
    const P = S.plan, m = kit.mat, V = kit.view('ground');
    const W = P.width, slab = P.size[2] * 0.3, gap = P.len * 2.6;
    // The board: a mid tone, so the paper around it and the things on it
    // both read; each stop a lighter panel let into it.
    const board = { top: m.N2.top, left: m.N3.left, right: m.N3.right };
    const xs = Object.values(P.node).map(n => n.x);
    const x0 = Math.min(...xs) - gap * 3, x1 = Math.max(...xs) + gap * 4;
    const lo = Math.max(x0, kit.range[0]), hi = Math.min(x1, kit.range[1]);
    // Branch lanes first: they sit behind the main line.
    Object.values(P.node).filter(n => n.lane > 0 && P.byId[n.id]._parent != null && P.node[P.byId[n.id]._parent].lane !== n.lane)
      .sort((a, b) => b.lane - a.lane)
      .forEach(n => {
        const par = P.node[P.byId[n.id]._parent], xm = (par.x + n.x) / 2;
        const last = Math.max(n.x, ...Object.values(P.node).filter(k => k.lane === n.lane).map(k => k.x)) + gap * 1.2;
        V.block(xm - W / 2, n.y - W / 2, 0, last - xm + W / 2, W, slab, board, { r: W * 0.12, b: slab * 0.4 });
        V.block(xm - W / 2, n.y + W / 2, 0, W, par.y - n.y - W, slab, board, { r: 0, b: slab * 0.4 });
      });
    if (hi > lo) V.block(lo, -W / 2, 0, hi - lo, W, slab, board, { r: W * 0.12, b: slab * 0.4 });
    // The stops.
    const pad = Math.min(gap * 0.36, W * 1.1);
    Object.values(P.node).forEach(n => {
      if (n.x + pad < kit.range[0] || n.x - pad > kit.range[1]) return;
      const c = pad * 0.12, x0 = n.x - pad / 2, x1 = n.x + pad / 2, y0 = n.y - W * 0.42, y1 = n.y + W * 0.42, z = slab + 0.02;
      V.face(M.iso.soften([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], c).map(p => [p[0], p[1], z]), m.N.top);
    });
    // Ticks along the front edge, a sixth of a gap apart.
    const step = P.len * 0.45, tz = slab * 0.62;
    for (let x = Math.ceil(lo / step) * step; x < hi; x += step) {
      V.face([[x - step * 0.05, W / 2, tz], [x + step * 0.05, W / 2, tz], [x + step * 0.05, W / 2, tz - slab * 0.35], [x - step * 0.05, W / 2, tz - slab * 0.35]], m.line);
    }
    return slab;
  }

  function paint(S, ctx, t, kit) {
    const P = S.plan, st = S.st;
    const a = subjectAt(S, t);
    const slab = paintBase(S, kit);
    const top = slab;
    const ground = st.ground ? ST.thing(st.ground, 'stage.ground') : null;
    const scenery = st.scenery ? ST.thing(st.scenery, 'stage.scenery') : null;
    const subj = ST.thing(st.subject, 'stage.subject');
    const nodes = Object.values(P.node).map(n => ({ id: n.id, x: n.x, y: n.y, label: n.state.label || '', form: n.state.form || {} }));
    const R = S.R, claim = id => { const c = R.claims[String(id).replace(/[{}]/g, '')]; if (!c) throw new Error('stage painter: unknown claim "' + id + '"'); return c; };
    const info = extra => kit.api(Object.assign({ nodes, beats: P.at, width: P.width, top, len: P.len, subject: { x: a.x, y: a.y, state: a.state },
      value: id => +claim(id).value, display: id => { const c = claim(id); return c.display != null ? String(c.display) : String(c.value); } }, extra));
    // The beat the frame is in, and how far into its words.
    const scs = S.scenes, found = scs.findIndex(sc => t >= sc.t0 && t < sc.t1), bi = found < 0 ? scs.length - 1 : found;
    const beat = { id: scs[bi].id, index: bi, lt: t - scs[bi].cStart, dir: (scs[bi].spec && scs[bi].spec.stage) || {} };
    if (ground) ground.draw(kit.view('ground', [0, 0, top]), { t, beat, from: kit.range[0], to: kit.range[1] }, info());
    if (scenery) scenery.draw(kit.view('scenery', [0, 0, top]), { t, beat, layer: 'back' }, info({ layer: 'back' }));
    // What stays behind at each stop it has left, in depth order.
    if (P.trail) {
      const left = new Set();
      P.pieces.filter(pc => pc.kind === 'change' && pc.t0 <= t).forEach(pc => left.add(pc.from));
      left.delete(a.from); left.delete(a.to);
      [...left].map(id => P.node[id]).sort((p, q) => (p.x + p.y) - (q.x + q.y)).forEach(n => {
        const pc = P.pieces.find(x => x.kind === 'change' && x.from === n.id && x.t0 <= t);
        ctx.save(); ctx.globalAlpha *= ST.clamp((t - pc.t0) / 0.5);
        subj.draw(kit.view('trail', [n.x, n.y, top]), { form: n.state.form || {}, from: n.id, to: n.id, k: 1, state: n.id, dist: 0, speed: 0, heading: [1, 0], t, beat, still: true }, info({ still: true }));
        ctx.restore();
      });
    }
    const form = ST.blendForm((P.byId[a.from] || {}).form || {}, (P.byId[a.to] || {}).form || {}, a.k);
    subj.draw(kit.view('subject', [a.x, a.y, top]), { form, from: a.from, to: a.to, k: a.k, state: a.state, dist: a.dist, speed: a.speed, heading: a.heading, t, beat, still: false }, info());
    if (scenery) scenery.draw(kit.view('scenery', [0, 0, top]), { t, beat, layer: 'front' }, info({ layer: 'front' }));
    // Each stop's label, at the front edge of the base, one size on screen;
    // it gives way to the subject as it passes.
    const [w, d, h] = P.size;
    kit.avoid = [kit.rect(a.x - w / 2, a.y - d / 2, top, w, d, h)];
    nodes.forEach(n => { if (n.label) kit.label(n.label, n.x - P.width * 0.2, n.y + P.width / 2, 0, { dy: 10 }); });
  }

  ST.registerShape({ name: 'transformation', plan, finish, frame, paint, subjectAt, IDLE, TOP });
})(typeof window !== 'undefined' ? window : globalThis);
