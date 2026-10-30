// Cast: Waiting at the kerb (step 4). Built from film/bible.md.
// Window.Cast holds the builders the world uses; window.CAST lists them for
// the contact sheet. Detail only where the bible's "tell apart from" asks.
(function () {
  const F = Film;

  // K3 · ride-hailing car (N3): one generic hatchback, all identical.
  // Bible: tell apart from nothing else moving, so: body, glasshouse, wheels.
  function car(o) {
    o = o || {};
    const g = F.group({ name: 'car' });
    g.box([1.8, 4.1, 0.72], { at: [0, 0, 0.3], bevel: 0.2, color: 'paper', name: 'body' });
    // glasshouse: a narrower, softer block, set back; dark so the car reads from above
    g.box([1.62, 2.3, 0.56], { at: [0, 0.25, 0.96], bevel: 0.22, color: 'n5', name: 'glass' });
    g.box([1.5, 1.9, 0.07], { at: [0, 0.35, 1.5], bevel: 0.03, color: 'paper', name: 'body' });
    for (const x of [-0.82, 0.82]) for (const y of [-1.3, 1.25])
      g.cylinder(0.33, 0.24, { axis: 'x', at: [x, y, 0.33], seg: 14, color: 'n7' });
    // K2 · driver (N2): a head behind the windscreen, only when someone drives
    if (o.driver !== false) g.sphere(0.13, { at: [0.35, -0.2, 1.3], color: 'n3', name: 'driver' });
    return g;
  }

  // K1 · rider (N1): plain rounded figures, varied height and tone; some carry a bag.
  const TOPS = ['n1', 'n2a', 'n0a', 'n2', 'n3'], BOTTOMS = ['n3', 'n4', 'n2', 'n5'];
  function rider(seed, o) {
    o = o || {};
    const r = F.rng(seed * 7 + 1);
    const fig = F.figure({
      height: 1.55 + r() * 0.33,
      depth: 0.075 + r() * 0.02,
      colors: { top: TOPS[Math.floor(r() * TOPS.length)], bottom: BOTTOMS[Math.floor(r() * BOTTOMS.length)], skin: 'n2a', hair: 'n5' },
      dress(b, d) {
        if (r() < 0.6) b.head.lathe([[d.head * 1.1, 0], [d.head * 1.08, d.head * 0.45], [d.head * 0.7, d.head * 0.95], [0.0001, d.head * 1.14]],
          { at: [0, 0.012, d.head * 0.92], color: r() < 0.5 ? 'n5' : 'n4', seg: 18, name: 'hair' });
        if (r() < 0.35) b.torso.box([d.shoulders * 1.2, d.depth * 1.3, d.torso * 0.55], { at: [0, d.depth * 1.3, d.torso * 0.35], bevel: 0.04, color: 'n3', name: 'bag' });
        if (o.hood) b.head.lathe([[d.head * 1.15, -d.head * 0.2], [d.head * 1.13, d.head * 0.6], [0.0001, d.head * 1.28]],
          { at: [0, 0.015, d.head * 0.9], color: 'n4', seg: 18, name: 'hood' });
      }
    });
    return fig;
  }

  // K4 · rider's phone (N4): only seen close up. A dark slab, a pale screen
  // with one bar for the wait shown at booking: short or long. No numbers.
  function phone(long) {
    const g = F.group({ name: 'phone' });
    g.box([0.075, 0.01, 0.15], { bevel: 0.006, color: 'n7' });
    g.decal(0.064, 0.13, (c, w, h) => {
      c.fillStyle = F.hex('paper'); c.fillRect(0, 0, w, h);
      c.fillStyle = F.hex('n1'); c.fillRect(w * 0.1, h * 0.1, w * 0.8, h * 0.32);         // a map-ish block
      c.fillStyle = F.hex('n3'); c.fillRect(w * 0.1, h * 0.52, w * 0.5, h * 0.04);        // a label line
      c.fillStyle = F.hex('n1'); c.fillRect(w * 0.1, h * 0.64, w * 0.8, h * 0.07);        // the wait track
      c.fillStyle = F.hex(long ? 'hl' : 'n4'); c.fillRect(w * 0.1, h * 0.64, w * 0.8 * (long ? 0.95 : 0.3), h * 0.07);
      c.fillStyle = F.hex('n4'); c.fillRect(w * 0.1, h * 0.82, w * 0.8, h * 0.08);         // the button
    }, { at: [0, -0.0055, 0.075], px: 4000, key: long ? 'phone-long' : 'phone-short' });
    return g;
  }

  // Window bands for office towers (K6), one shared picture per size.
  function windows(g, w, d, h, at, key) {
    const draw = (c, pw, ph) => {
      c.clearRect(0, 0, pw, ph);
      const rows = Math.max(2, Math.round(h / 3.6));
      c.fillStyle = F.hex('n2');
      for (let i = 0; i < rows; i++) c.fillRect(pw * 0.06, ph * (i + 0.3) / rows, pw * 0.88, ph * 0.38 / rows);
    };
    const o = { px: 6, key: key + w + 'x' + h, name: 'windows' };
    const z = at[2] + h / 2 + 1.2, H = h - 3;
    g.decal(w, H, draw, Object.assign({ at: [at[0], at[1] - d / 2 - 0.05, z] }, o));
    g.decal(w, H, draw, Object.assign({ at: [at[0], at[1] + d / 2 + 0.05, z], rot: 180 }, o, { key: o.key }));
    g.decal(d, H, draw, Object.assign({ at: [at[0] + w / 2 + 0.05, at[1], z], rot: 90 }, o, { key: key + d + 'x' + h }));
    g.decal(d, H, draw, Object.assign({ at: [at[0] - w / 2 - 0.05, at[1], z], rot: -90 }, o, { key: key + d + 'x' + h }));
  }

  // K6 · business district tower: a bevelled block with window bands, a roof box or two.
  function tower(w, d, h, seed) {
    const r = F.rng(seed || 1), g = F.group({ name: 'tower' });
    g.box([w, d, h], { bevel: 0.5, color: r() < 0.5 ? 'paper' : 'n0a' });
    windows(g, w - 2, d, h, [0, 0, 0], 'win');
    g.box([w * 0.3, d * 0.25, 2.2], { at: [w * 0.15, -d * 0.1, h], bevel: 0.25, color: 'n1' });
    if (r() < 0.6) g.box([w * 0.18, d * 0.18, 1.6], { at: [-w * 0.22, d * 0.2, h], bevel: 0.2, color: 'n1' });
    return g;
  }

  // K8 · the city: low residential blocks, plain, with a pitched roof sometimes.
  function house(w, d, h, seed) {
    const r = F.rng(seed || 1), g = F.group({ name: 'house' });
    g.box([w, d, h], { bevel: 0.3, color: r() < 0.5 ? 'paper' : 'n0a' });
    if (r() < 0.5) g.extrude([[-d / 2, 0], [d / 2, 0], [0, d * 0.3]], w, { axis: 'x', at: [0, 0, h], color: 'n1' });
    else windows(g, w - 1, d, h, [0, 0, 0], 'hwin');
    return g;
  }

  // One tree for the whole city: the story doesn't care which tree.
  function tree(seed) {
    const g = F.group({ name: 'tree' });
    g.cylinder(0.18, 2.4, { seg: 6, color: 'n3' });
    g.facet([2.6, 2.6, 2.4], { at: [0, 0, 1.9], seed: (seed || 1) % 3 + 1, color: 'n2a' });
    return g;
  }

  // K7 · street lamp at the kerb; its head glows at night.
  function lamp() {
    const g = F.group({ name: 'lamp' });
    g.cylinder(0.08, 5, { seg: 8, color: 'n3' });
    g.box([0.9, 0.3, 0.16], { at: [0.35, 0, 4.9], bevel: 0.05, color: 'n3' });
    g.box([0.6, 0.22, 0.04], { at: [0.45, 0, 4.86], color: 'n1', name: 'lampHead' });
    return g;
  }

  // K5 · airport terminal: one long low block, a canopy along the front, a tower.
  function terminal() {
    const g = F.group({ name: 'terminal' });
    g.box([120, 30, 12], { bevel: 0.8, color: 'paper' });
    windows(g, 116, 30, 12, [0, 0, 0], 'term');
    g.box([110, 9, 0.8], { at: [0, -19, 7], bevel: 0.3, color: 'n0a' });
    for (let x = -50; x <= 50; x += 20) g.cylinder(0.4, 7, { at: [x, -22.5, 0], seg: 10, color: 'n1' });
    const tw = g.group({ at: [52, 26, 0] });
    tw.cylinder(2.6, 30, { top: 2.2, seg: 12, color: 'n0a' });
    tw.cylinder(5, 4, { at: [0, 0, 30], top: 5.6, seg: 12, color: 'n4' });
    tw.cylinder(5.8, 0.8, { at: [0, 0, 34], seg: 12, color: 'paper' });
    return g;
  }

  // The rank's car park: bays painted on a flat apron.
  function carPark(w, d) {
    const g = F.group({ name: 'carPark' });
    g.flat([[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]], { at: [0, 0, 0.01], color: 'n0a' });
    g.decal(w, d, (c, pw, ph) => {
      c.strokeStyle = F.hex('paper'); c.lineWidth = pw / w * 0.2;   // a few texels wide: thinner lines shimmer in motion
      for (let row = 0; row < 4; row++) for (let x = 0; x <= w; x += 2.6) {
        const y0 = (row * d / 4 + 1.5) / d * ph, y1 = y0 + 5 / d * ph;
        c.beginPath(); c.moveTo(x / w * pw, y0); c.lineTo(x / w * pw, y1); c.stroke();
      }
    }, { rot: [-90, 0, 0], at: [0, 0, 0.02], px: 24, key: 'bays' + w + 'x' + d });
    return g;
  }

  window.Cast = { car, rider, phone, tower, house, tree, lamp, terminal, carPark };

  // The contact sheet: every item in the states the screenplay needs.
  const crowdOf = (n, lit) => () => {
    const g = F.group();
    for (let i = 0; i < n; i++) {
      const f = rider(i + 1);
      if (i < lit) f.paint('hl', 'top');
      g.add(f, { at: [(i % 10) * 0.75, Math.floor(i / 10) * 0.75, 0] });
    }
    return g;
  };
  window.CAST_TITLE = 'Cast: Waiting at the kerb';
  window.CAST = [
    { name: 'rider', note: 'K1 · N1', states: [{ label: 'standing' }, { label: 'walking', pose: { legL: [22, 0], legR: [-22, 0], kneeR: 25, armL: [-16, 6], armR: [16, 6] } }],
      make: s => { const f = rider(3); if (s.pose) f.pose(s.pose); return f; } },
    { name: 'riders at the kerb', note: 'K1 · 100, 27 lit', states: [{ label: '27 of 100 lit' }], make: crowdOf(100, 27) },
    { name: 'car with driver', note: 'K3, K2 · N3, N2', states: [{ label: 'neutral' }, { label: 'lit', hl: true }],
      make: s => { const c = car(); if (s.hl) c.paint('hl', 'body'); return c; } },
    { name: 'phone', note: 'K4 · N4', states: [{ label: 'short wait', view: { az: -90, el: 10 } }, { label: 'long wait', long: true, view: { az: -90, el: 10 } }],
      make: s => phone(s.long) },
    { name: 'office tower', note: 'K6 · N6', make: () => tower(24, 20, 48, 2) },
    { name: 'house', note: 'K8 · N8', states: [{ label: 'pitched' , seed: 3 }, { label: 'flat', seed: 2 }], make: s => house(16, 12, 8, s.seed) },
    { name: 'tree', note: 'K8 · N8', make: () => tree(1) },
    { name: 'street lamp', note: 'K7 · N7', make: () => lamp() },
    { name: 'airport terminal', note: 'K5 · N5', make: () => terminal() },
    { name: 'rank car park', note: 'K5 · N5', make: () => { const g = carPark(60, 30); for (let i = 0; i < 12; i++) g.add(car(), { at: [-26 + i * 2.6 * 2, -10, 0] }); return g; } }
  ];
})();
