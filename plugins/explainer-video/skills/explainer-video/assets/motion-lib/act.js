/*!
 * motion-lib/act.js — what a picture's things do: their moves over time,
 * and how a place of things is drawn at t.
 *
 * world.js gives each place its steps: the count each bin should reach by
 * when (`W` is the whole; 0, 1, … the parts, share first). The first parting
 * moves things out of the whole into their parts — the share steps out of
 * the line, gathers apart, slides to its own pile, is dealt to its
 * destination. Every later change (last year, then now) fades things or
 * brings fresh ones in: a thing never moves from one part to another
 * between two states, which would say the same person or account changed.
 *
 * How things arrive: cards to be sorted fly in from the left, a line files
 * in toward its head, a crowd walks in, a pile's things drop onto it.
 *
 * Each thing's moves are a pure function of t: people walk (a stride cycle
 * from the distance), objects arc or drop, a fall can leave a ghost.
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  const clamp = v => (v < 0 ? 0 : v > 1 ? 1 : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const GHOST = 0.32;
  const R2 = Math.SQRT2;
  const hash = n => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
  const uOf = p => (p.x - p.y) / R2, vOf = p => (p.x + p.y) / R2;
  const pt = (u, v, z) => ({ x: (u + v) / R2, y: (v - u) / R2, z: z || 0 });

  // ── from steps to each thing's moves ────────────────────────────────
  function plan(place) {
    const L = place.layout, mode = place.arrange;
    const bins = { W: { slots: L.whole, occ: new Array(L.whole.length).fill(0) } };
    L.parts.forEach((p, i) => { if (!p.stays) bins[i] = { slots: p.slots, occ: new Array(p.slots.length).fill(0) }; });
    // A part that stays is the whole, after the others have left it.
    const binOf = i => (L.parts[i] && L.parts[i].stays ? 'W' : String(i));
    const list = {};
    Object.keys(bins).forEach(b => { list[b] = bins[b].slots.map(() => []); });
    const push = (b, j, e) => list[b][j].push(e);
    const count = b => bins[b].occ.filter(o => o === 1).length;
    const free = b => { const o = bins[b].occ; let j = o.indexOf(2); if (j < 0) j = o.indexOf(0); return j; };
    const top = b => { const o = bins[b].occ; for (let j = o.length - 1; j >= 0; j--) if (o[j] === 1) return j; return -1; };

    place.steps.slice().sort((a, b) => a.t0 - b.t0).forEach(st => {
      const target = {};
      Object.keys(st.counts).forEach(k => { const b = k === 'W' ? 'W' : binOf(+k); target[b] = st.counts[k]; });
      const ins = [], outs = [];
      Object.keys(target).forEach(b => {
        const d = target[b] - count(b);
        for (let n = 0; n < Math.abs(d); n++) (d > 0 ? ins : outs).push(b);
      });
      const at = (k, n) => (st.times && st.times[k] != null ? st.times[k] : st.t0 + (n > 1 ? k / (n - 1) : 0) * Math.max(0, st.dur - st.unit));
      if (st.parting) {
        // Out of the whole, into the parts: the deal interleaves the parts in
        // proportion; elsewhere each part leaves in turn.
        const want = ins.filter(b => b !== 'W');
        const seq = mode === 'sort' ? deal(want) : want;
        const used = {}, moves = [];
        seq.forEach(b => {
          const fl = L.parts[+b] && L.parts[+b].from;
          const q = used[b] = (used[b] || 0) + 1;
          const src = fl ? fl[q - 1] : top('W');
          if (src == null || src < 0) return;
          bins.W.occ[src] = 0;
          const slot = free(b);
          bins[b].occ[slot] = 1;
          moves.push({ b, slot, src });
        });
        moves.forEach((mv, k) => {
          const s0 = at(k, moves.length);
          push(mv.b, mv.slot, { type: 'in', how: 'move', st: s0, ud: st.unit, src: mv.src });
          push('W', mv.src, { type: 'gone', st: s0 });
        });
        return;
      }
      // Fresh things in, others out, in step.
      const n = Math.max(ins.length, outs.length, 1);
      ins.forEach((b, k) => {
        const slot = free(b);
        if (slot < 0) return;
        const relight = bins[b].occ[slot] === 2;
        bins[b].occ[slot] = 1;
        push(b, slot, { type: 'in', how: relight ? 'relight' : arrival(place, b), st: at(k, n), ud: st.unit });
      });
      outs.forEach((b, k) => {
        const slot = top(b);
        if (slot < 0) return;
        const ghost = !!st.ghost && b !== 'W' && (st.ghost === true || st.ghost.indexOf(+b) >= 0);
        bins[b].occ[slot] = ghost ? 2 : 0;
        push(b, slot, { type: ghost ? 'ghost' : 'fade', st: at(k, n), ud: st.unit });
      });
    });
    Object.keys(list).forEach(b => list[b].forEach(l => l.sort((a, c) => a.st - c.st)));
    place.moves = list;
    place.bins = Object.keys(bins);
  }
  // Interleave the parts in proportion, as a dealer would.
  function deal(want) {
    const n = {}, tot = want.length;
    want.forEach(b => { n[b] = (n[b] || 0) + 1; });
    const keys = Object.keys(n), done = {};
    keys.forEach(k => { done[k] = 0; });
    const out = [];
    for (let k = 0; k < tot; k++) {
      let best = keys[0], lag = -Infinity;
      keys.forEach(b => { const l = (k + 1) * n[b] / tot - done[b]; if (l > lag && done[b] < n[b]) { lag = l; best = b; } });
      done[best]++; out.push(best);
    }
    return out;
  }
  // How a fresh thing arrives: people walk in (a line files in toward its
  // head), the cards of a sort fly in from the left, a pile's things drop on it.
  function arrival(place, b) {
    if (place.thing.people) return place.arrange === 'queue' ? 'file' : 'walk';
    if (place.arrange === 'sort' && b === 'W') return 'fly';
    return 'drop';
  }

  // ── a thing's state at t ─────────────────────────────────────────────
  // { show: 0..1, ghost: 0..1, q (progress of the move under way), e (that move) }
  function state(place, b, j, t) {
    const evs = place.moves[b][j];
    let on = 0, ghost = 0;
    for (const e of evs) {
      if (t < e.st) break;
      const q = e.ud ? clamp((t - e.st) / e.ud) : 1;
      if (e.type === 'in') {
        if (q < 1) return { show: 1, ghost: e.how === 'relight' ? 1 - q : 0, q, e };
        on = 1; ghost = 0;
      } else if (e.type === 'gone') { on = 0; ghost = 0; }
      else if (e.type === 'fade') { if (q < 1) return { show: 1 - q, ghost, q, e }; on = 0; }
      else if (e.type === 'ghost') { if (q < 1) return { show: 1, ghost: q, q, e }; ghost = 1; on = 1; }
    }
    return { show: on, ghost, q: 1, e: null };
  }

  // Where a thing in flight is: walking, arcing, flying in, dropping.
  function flight(place, b, j, s) {
    const L = place.layout, to = slotOf(place, b, j);
    const e = s.e, q = s.q;
    if (!e || e.type !== 'in' || e.how === 'relight') return { p: to, walk: false };
    const people = place.thing.people;
    if (e.how === 'move') {
      const fr = L.whole[e.src], d = Math.hypot(to.x - fr.x, to.y - fr.y);
      if (people) {
        const k = M.ease.sineInOut(q);
        return { p: { x: lerp(fr.x, to.x, k), y: lerp(fr.y, to.y, k), z: 0 }, walk: q < 1 && d > 4, phase: k * d / 9 };
      }
      // A stream (sort) comes in fast and settles; a move between piles arcs.
      const k = L.stream ? M.ease.cubicOut(q) : M.ease.glide(q), hump = L.stream ? 60 : Math.min(150, 40 + d * 0.32);
      return { p: ceil(place, { x: lerp(fr.x, to.x, k), y: lerp(fr.y, to.y, k), z: lerp(fr.z, to.z, k) + hump * Math.sin(Math.PI * k) }, to.z), walk: false };
    }
    if (e.how === 'fly') {
      // From beyond the frame's left, high, gliding down onto its spot.
      const fr = pt(uOf(to) - 900 - hash(j) * 160, vOf(to), to.z + 150 + hash(j + 5) * 50);
      const k = M.ease.outQuint(q);
      return { p: ceil(place, { x: lerp(fr.x, to.x, k), y: lerp(fr.y, to.y, k), z: lerp(fr.z, to.z, M.ease.sineInOut(q)) }, to.z), walk: false };
    }
    if (e.how === 'walk') {
      const side = hash(j * 3 + (b === 'W' ? 1 : 7)) < 0.5 ? -1 : 1, dist = 380 + hash(j) * 120;
      const fr = { x: to.x + side * dist / R2, y: to.y - side * dist / R2, z: 0 };
      const k = M.ease.sineInOut(q);
      return { p: { x: lerp(fr.x, to.x, k), y: lerp(fr.y, to.y, k), z: 0 }, walk: q < 1, phase: k * dist / 9 };
    }
    if (e.how === 'file') {
      // Up the line from behind, toward its head.
      const dist = 150 + hash(j) * 90, k = M.ease.sineInOut(q);
      const fr = pt(uOf(to) + dist, vOf(to), 0);
      return { p: { x: lerp(fr.x, to.x, k), y: lerp(fr.y, to.y, k), z: 0 }, walk: q < 1, phase: k * dist / 9 };
    }
    // drop
    const k = M.ease.outQuint(q);
    return { p: ceil(place, { x: to.x, y: to.y, z: to.z + (1 - k) * 110 }, to.z), walk: false };
  }
  // A thing in flight stays below the stage's top edge (world.js sets place.ceil).
  function ceil(place, p, floor) {
    if (place.ceil == null) return p;
    const zMax = 0.7071 * vOf(p) - place.ceil - (place.thing.size.h + (place.thing.size.w + place.thing.size.d) / 4);
    if (p.z > zMax) p.z = Math.max(floor, zMax);
    return p;
  }
  const slotOf = (place, b, j) => (b === 'W' ? place.layout.whole[j] : place.layout.parts[+b].slots[j]);
  // How far the share is lifted for a highlight (it stays lifted).
  const liftAt = (place, t) => (place.lifts || []).reduce((m, l) => Math.max(m, M.ease.outQuint(clamp((t - l.t0) / l.dur))), 0);

  // ── drawing a place of things ────────────────────────────────────────
  // Every thing (and prop) is collected with its depth, then drawn back to
  // front: x + y, then height.
  function draw(V, place, t, W) {
    const m = W.mat, th = place.thing, items = [];
    const natural = th.natural ? m[th.natural] : m.N2;
    const kindOf = b => (b === 'W' ? 'rest' : place.parts[+b].kind);
    const tintOf = b => (b === 'W' ? m.N : place.parts[+b].tint(m));
    const active = place.layout.props.map(() => 0);
    const lift = liftAt(place, t);
    place.bins.forEach(b => {
      const slots = b === 'W' ? place.layout.whole : place.layout.parts[+b].slots;
      for (let j = 0; j < slots.length; j++) {
        const s = state(place, b, j, t);
        if (s.show <= 0.001) continue;
        const f = flight(place, b, j, s);
        const inFlight = s.e && s.e.type === 'in' && s.q < 1 && s.e.how !== 'relight';
        // A thing on its way to a destination lights it; a line walking up lights its head.
        if (inFlight && place.arrange === 'sort' && b !== 'W') { const pi = place.layout.props.findIndex(pr => pr.part === +b); if (pi >= 0) active[pi] = Math.max(active[pi], Math.sin(Math.PI * s.q)); }
        if (inFlight && place.arrange === 'queue' && active.length) active[0] = Math.max(active[0], 0.6 * Math.sin(Math.PI * s.q));
        // In flight, a thing leaving the whole takes its part's tint as it lifts.
        const up = inFlight && s.e.how === 'move' ? clamp(s.q * 4) : 1;
        let kind = kindOf(b);
        let body = b === 'W' ? m.N : m.between(m.N, tintOf(b), up);
        if (b !== 'W' && up < 0.5 && kind !== 'rest') kind = 'part';
        if (s.ghost > 0) { body = m.between(tintOf(b), m.between(m.N, m.A, GHOST), s.ghost); kind = 'part'; }
        // Every tenth thin thing in a pile a shade darker, so the tens can be counted.
        if (!th.people && !th.bulky && place.arrange !== 'queue' && j % 10 === 9) {
          body = m.between(kind === 'rest' ? natural : body, { top: m.ink, left: m.ink, right: m.ink }, kind === 'rest' ? 0.1 : 0.12);
          kind = 'part';
        }
        let p = f.p;
        // A highlight lifts the share (objects) or brings it a step forward (people).
        if (lift > 0 && b !== 'W' && place.parts[+b].kind === 'share') p = th.people ? pt(uOf(p), vOf(p) + 18 * lift, p.z) : { x: p.x, y: p.y, z: p.z + 26 * lift };
        const jit = th.people || th.bulky || inFlight ? 0 : (hash(j * 7 + (b === 'W' ? 0 : 3)) - 0.5) * 2.4;
        const x = p.x + jit, y = p.y - jit * 0.6, z = p.z;
        const pose = f.walk ? 'walk' : (b !== 'W' && place.hold && kind === 'share' ? place.hold : 'stand');
        items.push({
          x, y, z,
          draw: () => {
            const a0 = V.ctx.globalAlpha;
            V.ctx.globalAlpha = a0 * s.show * (s.ghost > 0 && th.people ? 1 - 0.45 * s.ghost : 1);
            th.draw(V, x, y, z, { mat: m, body, kind, seed: (b === 'W' ? 0 : 1000 * (+b + 1)) + j, pose, phase: f.phase || 0 });
            V.ctx.globalAlpha = a0;
          }
        });
      }
    });
    place.layout.props.forEach((pr, i) => {
      const g = pr.def.size;
      items.push({ x: pr.pos.x, y: pr.pos.y, z: -1, depth: pr.pos.x + pr.pos.y - (g.w + g.d) * 0.25, draw: () => pr.def.draw(V, pr.pos.x, pr.pos.y, 0, { mat: m, active: active[i] || 0 }) });
    });
    items.sort((a, c) => (a.depth != null ? a.depth : a.x + a.y) - (c.depth != null ? c.depth : c.x + c.y) || a.z - c.z);
    items.forEach(it => it.draw());
  }

  M.act = { plan, state, flight, draw, deal, GHOST };
  if (typeof module !== 'undefined' && module.exports) module.exports = M.act;
})(typeof window !== 'undefined' ? window : globalThis);
