// film-lib/rig.js: a jointed body, with no costume and no species.
//
// Film.figure(spec) builds a skeleton of groups (pelvis, torso, head, arms,
// legs) with plain rounded parts on them, sized by the spec. Who the figure
// is (a nurse, a legionary, a hominin, a delivery rider, a dog walker) comes
// from the spec's proportions, colours and `dress` function, which the film's
// bible writes. Animals with four legs are built from solids directly; the
// rig is for things that stand on two.
//
// The figure stands on z = 0 facing -y (towards the default camera). Its own
// left is +x.
(function (root) {
  'use strict';
  const Film = root.Film = root.Film || {};

  // Fractions of height. Stylised like the reference crowd: a big head, a
  // soft block of a body, short arms. Every one can be overridden.
  const P = {
    height: 1.72,
    head: 0.095,      // head radius
    neck: 0.015,      // gap from torso top to head
    torso: 0.30,      // torso length (hip joint to shoulder top)
    shoulders: 0.12,  // half-width at the shoulders
    depth: 0.08,      // half-depth of the torso, front to back
    hips: 0.058,      // half-distance between the hip joints
    arm: 0.33,        // shoulder to fingertip
    leg: 0.47,        // hip joint to sole
    limb: 0.042,      // arm and leg radius
    hand: 0,          // hand radius (0: none, the default; the arm just ends)
    foot: 0,          // foot length (0: none, the default; legs stand on their ends)
    stoop: 0          // a lean of the spine the figure always has (degrees forward)
  };
  const COLORS = { skin: 'n2a', hair: 'n4', top: 'n1', bottom: 'n3', shoes: 'n5' };
  const NAMES = ['pelvis', 'torso', 'head', 'shoulderL', 'elbowL', 'handL', 'shoulderR', 'elbowR', 'handR',
    'hipL', 'kneeL', 'footL', 'hipR', 'kneeR', 'footR'];

  // spec: { height, ...fractions above, colors: { skin, hair, top, bottom, shoes },
  //         skip: ['torso', 'armL', ...] default parts not to draw,
  //         dress(bones, dims): add costume parts to bones (each a Film.group),
  //         pose: a pose (see Figure.pose) }
  Film.figure = function (spec) {
    spec = spec || {};
    const k = Object.assign({}, P, spec);
    const H = k.height;
    Film._check('figure', H > 0.1, 'height must be in metres (e.g. 1.7), got ' + H);
    const d = {};
    for (const n of Object.keys(P)) d[n] = n === 'height' || n === 'stoop' ? k[n] : k[n] * H;
    const col = Object.assign({}, COLORS, spec.colors);
    const skip = new Set(spec.skip || []);

    const fig = Film.group({ name: spec.name || 'figure' });
    const b = {};
    const r = d.limb;
    const upperArm = d.arm * 0.47, foreArm = d.arm * 0.53 - d.hand;
    const footH = d.foot ? r : 0;
    const thigh = (d.leg - footH) * 0.5, shin = (d.leg - footH) * 0.5;

    b.pelvis = fig.group({ name: 'pelvis', at: [0, 0, d.leg] });
    b.torso = b.pelvis.group({ name: 'torso' });
    b.head = b.torso.group({ name: 'head', at: [0, 0, d.torso + d.neck] });
    for (const side of ['L', 'R']) {
      const sx = side === 'L' ? 1 : -1;
      b['shoulder' + side] = b.torso.group({ name: 'shoulder' + side, at: [sx * (d.shoulders - r * 0.35), 0, d.torso - r * 1.9] });
      b['elbow' + side] = b['shoulder' + side].group({ name: 'elbow' + side, at: [0, 0, -upperArm] });
      b['hand' + side] = b['elbow' + side].group({ name: 'hand' + side, at: [0, 0, -foreArm] });
      b['hip' + side] = b.pelvis.group({ name: 'hip' + side, at: [sx * d.hips, 0, 0] });
      b['knee' + side] = b['hip' + side].group({ name: 'knee' + side, at: [0, 0, -thigh] });
      b['foot' + side] = b['knee' + side].group({ name: 'foot' + side, at: [0, 0, -shin] });
    }

    // default body: rounded parts the dress can cover or replace
    const down = [180, 0, 0];
    if (!skip.has('torso')) {
      const w = d.shoulders, len = d.torso + w * 0.15;
      b.torso.capsule(w, Math.max(2 * w, len), { name: 'top', color: col.top, at: [0, 0, -w * 0.35], scale: [1, d.depth / w, 1] });
    }
    if (!skip.has('head')) b.head.sphere(d.head, { name: 'skin', color: col.skin, at: [0, 0, d.head] });
    for (const side of ['L', 'R']) {
      if (!skip.has('arm' + side)) {
        b['shoulder' + side].capsule(r, upperArm + r, { name: 'top', color: col.top, rot: down, at: [0, 0, r * 0.5] });
        b['elbow' + side].capsule(r * 0.95, foreArm + r, { name: 'top', color: col.top, rot: down, at: [0, 0, r * 0.5] });
        if (d.hand) b['hand' + side].sphere(d.hand, { name: 'skin', color: col.skin, at: [0, 0, -d.hand * 0.6] });
      }
      if (!skip.has('leg' + side)) {
        b['hip' + side].capsule(r * 1.15, thigh + r, { name: 'bottom', color: col.bottom, rot: down, at: [0, 0, r * 0.6] });
        b['knee' + side].capsule(r, shin + r * 0.5, { name: 'bottom', color: col.bottom, rot: down, at: [0, 0, r * 0.5] });
        if (d.foot) b['foot' + side].box([r * 2.2, d.foot, footH * 1.1], { name: 'shoes', color: col.shoes, at: [0, -d.foot * 0.3, -footH], bevel: r * 0.9 });
      }
    }
    if (spec.dress) spec.dress(b, Object.assign({ upperArm, foreArm, thigh, shin, colors: col }, d));

    fig.bones = b;
    fig.dims = d;
    fig.pose = pose;
    fig.reach = reach;
    fig.pose(Object.assign({}, spec.pose));
    return fig;
  };

  // A pose, in degrees. Every field is optional; anything left out is the
  // standing pose. Forward means towards the way the figure faces.
  //   spine     lean forward (+) or back (-), added to the figure's stoop
  //   twist     torso turned about the vertical
  //   head      [nod forward, turn left]
  //   armL/armR [swing forward, raise out to the side]
  //   elbowL/R  bend (forearm comes forward and up)
  //   legL/legR [swing forward, out to the side]
  //   kneeL/R   bend (shin goes back)
  //   crouch    lowers the pelvis by this many metres (bend the knees to match)
  function pose(p) {
    p = p || {};
    this._pose = p;
    const b = this.bones, d = this.dims;
    const pair = (v, def) => Array.isArray(v) ? v : [v || 0, def];
    b.pelvis.set({ at: [0, 0, d.leg - (p.crouch || 0)] });
    b.torso.set({ rot: [(d.stoop || 0) + (p.spine || 0), 0, p.twist || 0] });
    const h = pair(p.head, 0);
    b.head.set({ rot: [h[0], 0, h[1]] });
    for (const side of ['L', 'R']) {
      const sx = side === 'L' ? 1 : -1;
      const a = pair(p['arm' + side], 5), l = pair(p['leg' + side], 0);
      b['shoulder' + side].set({ rot: [-a[0], -sx * a[1], 0] });
      b['elbow' + side].set({ rot: [-(p['elbow' + side] || 0), 0, 0] });
      b['hip' + side].set({ rot: [-l[0], -sx * l[1], 0] });
      b['knee' + side].set({ rot: [p['knee' + side] || 0, 0, 0] });
      b['foot' + side].set({ rot: [-(p['knee' + side] || 0) + l[0], 0, 0] });
    }
    return this;
  }
  // Put a hand on a point (in the space the figure is placed in): the arm's
  // swing, raise and elbow are solved, the rest of the pose kept. Returns the
  // distance left (0 when it reaches). Two hands on one tool: reach twice.
  function reach(side, target) {
    const p = Object.assign({}, this._pose), key = 'arm' + side, ek = 'elbow' + side;
    const x = Array.isArray(p[key]) ? p[key].slice() : [p[key] || 0, 5];
    let e = p[ek] || 0;
    const tip = () => {
      this.pose(Object.assign({}, p, { [key]: x, [ek]: e }));
      return Film.V.len(Film.V.sub(this.locate(this.bones['hand' + side]), target));
    };
    const knobs = [
      [() => x[0], v => { x[0] = v; }],
      [() => x[1], v => { x[1] = Math.max(-40, Math.min(170, v)); }],
      [() => e, v => { e = Math.max(0, Math.min(150, v)); }]
    ];
    let best = tip();
    for (let step = 40; step > 0.2; step /= 2) {
      let moved = true, guard = 0;
      while (moved && guard++ < 200) {
        moved = false;
        for (const [get, set] of knobs) for (const dir of [1, -1]) {
          const old = get(); set(old + dir * step);
          const d = tip();
          if (d < best - 1e-5) { best = d; moved = true; } else set(old);
        }
      }
    }
    p[key] = x; p[ek] = e;
    this.pose(p);
    return best;
  }

  Film.figure.bones = NAMES;
})(typeof window !== 'undefined' ? window : globalThis);
