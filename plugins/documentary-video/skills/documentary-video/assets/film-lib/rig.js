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

  // Fractions of height, after the way isometric illustration draws people
  // (and explainer-video's people): a big round head on a visible neck, a
  // soft block of a torso with the arms tucked against it, thick legs. Every
  // one can be overridden.
  const P = {
    height: 1.72,
    head: 0.095,      // head radius
    neck: 0.03,       // neck length, torso top to head
    torso: 0.29,      // torso length (hip joint to shoulder top)
    shoulders: 0.125, // half-width at the shoulders
    depth: 0.075,     // half-depth of the torso, front to back
    hips: 0.06,       // half-distance between the hip joints
    arm: 0.33,        // shoulder to fingertip
    leg: 0.46,        // hip joint to sole
    limb: 0.06,       // leg radius (arms are about two thirds of it)
    hand: 0,          // hand radius (0: none, the default; the arm just ends)
    foot: 0,          // foot length (0: none, the default; legs stand on their ends)
    stoop: 0          // a lean of the spine the figure always has (degrees forward)
  };
  const COLORS = { skin: 'n2a', hair: 'n4', top: 'n1', bottom: 'n3', shoes: 'n5' };
  const NAMES = ['pelvis', 'torso', 'head', 'shoulderL', 'elbowL', 'handL', 'shoulderR', 'elbowR', 'handR',
    'hipL', 'kneeL', 'footL', 'hipR', 'kneeR', 'footR'];

  // The soft dark spot under a figure that tells the eye it stands on the
  // ground (the way illustration grounds people); shared by every figure.
  function spotPicture(c, w, h) {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(20,20,20,0.30)'); g.addColorStop(0.55, 'rgba(20,20,20,0.16)'); g.addColorStop(1, 'rgba(20,20,20,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  }

  // spec: { height, ...fractions above, colors: { skin, hair, top, bottom, shoes },
  //         skip: ['torso', 'hips', 'neck', 'head', 'armL', ..., 'spot'] default parts not to draw,
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
    const r = d.limb, ra = r * 0.68;
    const upperArm = d.arm * 0.47, foreArm = d.arm * 0.53 - d.hand;
    const footH = d.foot ? r * 0.8 : 0;
    const thigh = (d.leg - footH) * 0.5, shin = (d.leg - footH) * 0.5;

    b.pelvis = fig.group({ name: 'pelvis', at: [0, 0, d.leg] });
    b.torso = b.pelvis.group({ name: 'torso' });
    b.head = b.torso.group({ name: 'head', at: [0, 0, d.torso + d.neck] });
    for (const side of ['L', 'R']) {
      const sx = side === 'L' ? 1 : -1;
      b['shoulder' + side] = b.torso.group({ name: 'shoulder' + side, at: [sx * (d.shoulders + ra * 0.55), 0, d.torso - ra * 1.3] });
      b['elbow' + side] = b['shoulder' + side].group({ name: 'elbow' + side, at: [0, 0, -upperArm] });
      b['hand' + side] = b['elbow' + side].group({ name: 'hand' + side, at: [0, 0, -foreArm] });
      b['hip' + side] = b.pelvis.group({ name: 'hip' + side, at: [sx * d.hips, 0, 0] });
      b['knee' + side] = b['hip' + side].group({ name: 'knee' + side, at: [0, 0, -thigh] });
      b['foot' + side] = b['knee' + side].group({ name: 'foot' + side, at: [0, 0, -shin] });
    }

    // default body: soft blocks and rods the dress can cover or replace
    const down = [180, 0, 0];
    if (!skip.has('torso')) b.torso.rounded([d.shoulders * 2, d.depth * 2, d.torso + d.head * 0.15], { name: 'top', color: col.top, at: [0, 0, -d.head * 0.25], round: 0.42 });
    if (!skip.has('hips')) b.pelvis.rounded([(d.hips + r) * 2 * 0.98, d.depth * 1.9, d.torso * 0.38], { name: 'bottom', color: col.bottom, at: [0, 0, -d.torso * 0.24], round: 0.5 });
    if (!skip.has('neck')) b.torso.cylinder(d.head * 0.36, d.neck + d.head * 0.4, { name: 'skin', color: col.skin, at: [0, 0, d.torso - d.head * 0.1], seg: 16 });
    if (!skip.has('head')) b.head.sphere(d.head, { name: 'skin', color: col.skin, at: [0, 0, d.head], seg: 32 });
    for (const side of ['L', 'R']) {
      if (!skip.has('arm' + side)) {
        b['shoulder' + side].capsule(ra, upperArm + ra * 1.2, { name: 'top', color: col.top, rot: down, at: [0, 0, ra * 0.6] });
        b['elbow' + side].capsule(ra * 0.92, foreArm + ra, { name: 'top', color: col.top, rot: down, at: [0, 0, ra * 0.5] });
        if (d.hand) b['hand' + side].sphere(d.hand, { name: 'skin', color: col.skin, at: [0, 0, -d.hand * 0.6] });
      }
      if (!skip.has('leg' + side)) {
        b['hip' + side].capsule(r, thigh + r * 1.2, { name: 'bottom', color: col.bottom, rot: down, at: [0, 0, r * 0.6] });
        b['knee' + side].capsule(r * 0.94, shin + r, { name: 'bottom', color: col.bottom, rot: down, at: [0, 0, r * 0.5] });
        if (d.foot) b['foot' + side].box([r * 1.9, d.foot, footH], { name: 'shoes', color: col.shoes, at: [0, -d.foot * 0.3, -r * 0.4], bevel: r * 0.6 });
      }
    }
    if (!skip.has('spot')) fig.decal(H * 0.42, H * 0.42, spotPicture, { name: 'spot', rot: [-90, 0, 0], at: [0, 0, 0.004], px: 120, key: 'figure-spot' });
    if (spec.dress) spec.dress(b, Object.assign({ upperArm, foreArm, thigh, shin, armRadius: ra, colors: col }, d));

    fig.bones = b;
    fig.dims = d;
    fig.pose = pose;
    fig.plant = plant;
    fig.reach = reach;
    fig.pose(Object.assign({}, spec.pose));
    return fig;
  };

  // Lower or raise the body so its lowest point rests on the ground (z = 0 of
  // the figure's own frame), whatever the pose: a stride never sinks a foot
  // or lifts the body off. Only the body counts: whatever the hands hold (a
  // spear, a stick, a bag) may reach below the feet without lifting them.
  function plant() {
    const b = this.bones, M = Film.M;
    const held = new Set([b.handL, b.handR]);
    let lo = Infinity;
    (function visit(n, W) {
      if (held.has(n)) return;
      for (const c of n.children) {
        const Wc = M.mul(W, c.matrix);
        if (c.children) { if (c.visible !== false) visit(c, Wc); continue; }
        if (c.name === 'spot' || c.visible === false) continue;
        const bb = c.geom.bounds;
        for (let k = 0; k < 8; k++) {
          const z = M.point(Wc, [k & 1 ? bb.hi[0] : bb.lo[0], k & 2 ? bb.hi[1] : bb.lo[1], k & 4 ? bb.hi[2] : bb.lo[2]])[2];
          if (z < lo) lo = z;
        }
      }
    })(this, M.identity());
    if (lo !== Infinity) { const at = b.pelvis.at; b.pelvis.set({ at: [at[0], at[1], at[2] - lo] }); }
    return this;
  }

  // Sitting on the ground: knees up above the hips, feet in front, the seat
  // on the ground, hands resting forward. (Thighs level with the shins hanging
  // down is sitting on a chair: give it a seat height, or it sits on air.)
  // (Angles found by searching for the pose where seat and feet touch down
  // together: thighs about 26 degrees above level, knees open about 64.)
  const SIT_GROUND = { legL: [116, 12], legR: [116, 12], kneeL: 64, kneeR: 64, spine: 12, head: [-4, 0],
    armL: [58, 12], armR: [58, 12], elbowL: 28, elbowR: 28 };

  // A pose, in degrees. Every field is optional; anything left out is the
  // standing pose. Forward means towards the way the figure faces.
  //   spine     lean forward (+) or back (-), added to the figure's stoop
  //   twist     torso turned about the vertical
  //   head      [nod forward, turn left]
  //   armL/armR [swing forward, raise out to the side]
  //   elbowL/R  bend (forearm comes forward and up)
  //   legL/legR [swing forward, out to the side]
  //   kneeL/R   bend (shin goes back)
  //   sit       'ground': sit on the ground, knees up (any field above
  //             still overrides it)
  //   seat      sit on something this high (metres): the pelvis rests on it
  //   plant     false to leave the body where the pose puts it (default: the
  //             lowest point of the body is planted on the ground)
  function pose(p) {
    p = p || {};
    if (p.sit === 'ground') p = Object.assign({}, SIT_GROUND, p);
    this._pose = p;
    const b = this.bones, d = this.dims;
    const pair = (v, def) => Array.isArray(v) ? v : [v || 0, def];
    b.pelvis.set({ at: [0, 0, p.seat != null ? p.seat + d.limb * 0.9 : d.leg - (p.crouch || 0)] });
    b.torso.set({ rot: [(d.stoop || 0) + (p.spine || 0), 0, p.twist || 0] });
    const h = pair(p.head, 0);
    b.head.set({ rot: [h[0], 0, h[1]] });
    for (const side of ['L', 'R']) {
      const sx = side === 'L' ? 1 : -1;
      const a = pair(p['arm' + side], 4), l = pair(p['leg' + side], 0);
      b['shoulder' + side].set({ rot: [-a[0], -sx * a[1], 0] });
      b['elbow' + side].set({ rot: [-(p['elbow' + side] || 0), 0, 0] });
      b['hip' + side].set({ rot: [-l[0], -sx * l[1], 0] });
      b['knee' + side].set({ rot: [p['knee' + side] || 0, 0, 0] });
      b['foot' + side].set({ rot: [-(p['knee' + side] || 0) + l[0], 0, 0] });
    }
    if (p.seat == null && p.plant !== false) this.plant();
    // Sitting on nothing: thighs near level or above it, no seat, and the
    // pelvis still high off the ground. The film lists it as a warning.
    const thigh = Math.min(pair(p.legL, 0)[0], pair(p.legR, 0)[0]);   // both thighs forward (one down is kneeling)
    this.floating = p.seat == null && p.plant !== false && thigh > 55 && b.pelvis.at[2] > d.leg * 0.4;
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
