// Cast: Walking first (step 4), from film/bible.md. window.Cast: builders for
// the world; window.CAST: the contact sheet.
(function () {
  const F = Film;

  // ── the hominins (K1, K2, K3, K6, K7, K8): one plain body, told apart by build ──
  function brow(b, d, k) {
    // a brow ridge and a jaw that juts: older species more, sapiens none
    b.head.rounded([d.head * 1.5, d.head * 0.9, d.head * 0.5], { at: [0, -d.head * 0.35, d.head * 1.05], round: 0.9, color: k.skin, name: 'skin' });   // a soft overhang, the same skin
    if (k.jaw) b.head.rounded([d.head * 1.1, d.head * 0.9, d.head * 0.7], { at: [0, -d.head * 0.55, d.head * 0.25], round: 0.7, color: k.skin, name: 'skin' });
  }
  const KINDS = {
    sahelanthropus: { height: 1.2, stoop: 24, arm: 0.45, leg: 0.38, head: 0.1, skin: 'n4', jaw: true, brow: true },
    walker: { height: 1.2, stoop: 8, arm: 0.42, leg: 0.42, head: 0.1, skin: 'n3', jaw: true, brow: true },
    lucy: { height: 1.1, stoop: 8, arm: 0.42, leg: 0.41, head: 0.1, skin: 'n3', jaw: true, brow: true },
    erectus: { height: 1.7, stoop: 0, arm: 0.34, leg: 0.5, head: 0.085, skin: 'n2', jaw: true, brow: true },
    neanderthal: { height: 1.65, stoop: 3, arm: 0.33, leg: 0.44, head: 0.09, shoulders: 0.14, depth: 0.1, skin: 'n2a', brow: true, cape: true },
    sapiens: { height: 1.75, stoop: 0, arm: 0.34, leg: 0.49, head: 0.09, shoulders: 0.11, depth: 0.07, skin: 'n1', wrap: true }
  };
  function hominin(kind, o) {
    o = o || {};
    const k = KINDS[kind];
    F._check('hominin', k, 'unknown kind ' + kind);
    const fig = F.figure({
      height: (o.height || 1) * k.height, stoop: k.stoop, arm: k.arm, leg: k.leg, head: k.head,
      hand: o.hero ? 0.032 : 0, foot: o.hero ? 0.075 : 0,
      shoulders: k.shoulders || 0.12, depth: k.depth || 0.08,
      colors: { skin: k.skin, top: k.skin, bottom: k.skin, hair: 'n5' },
      dress(b, d) {
        // faces stay plain: these figures are told apart by build, and a brow
        // or jaw added to a plain round head reads as goggles, not as a face
        // heroes get what a close camera sees: hands and feet (see dims below)
        if (k.cape) b.torso.rounded([d.shoulders * 2.25, d.depth * 2.4, d.torso * 0.5], { at: [0, 0.01, d.torso * 0.58], round: 0.75, color: 'n4', name: 'top' });
        if (k.wrap) {
          b.pelvis.box([d.hips * 3.6, d.depth * 2.4, d.leg * 0.22], { at: [0, 0, -d.leg * 0.16], bevel: 0.03, color: 'paper', name: 'top' });
          b.torso.tube([[-d.shoulders * 0.8, -d.depth * 1.05, d.torso * 0.95], [d.shoulders * 0.6, -d.depth * 1.05, 0.05]], 0.03, { color: 'paper', smooth: false });
        }
        if (o.axe) b.handR.add(handAxe(), { at: [0, -0.02, -0.06], rot: [0, 90, 0] });
        if (o.spear) b.handR.rod([0, 0, -(d.leg + d.arm * 0.5) * 0.98], [0, 0, 0.9], 0.015, { color: 'n4' });   // the tip rests at the ground
      }
    });
    return fig;
  }

  // ── K5 trees: told apart by silhouette only ──
  function tree(kind, seed) {
    const g = F.group({ name: 'tree' }), s = seed || 1;
    if (kind === 'acacia') {
      g.rod([0, 0, 0], [0.4, 0, 3.2], 0.16, { color: 'n3' });
      g.rod([0.4, 0, 3.2], [-1.2, 0.3, 4.6], 0.1, { color: 'n3' });
      g.rod([0.4, 0, 3.2], [1.6, -0.2, 4.7], 0.1, { color: 'n3' });
      g.facet([7.5, 6, 1.3], { at: [0.2, 0, 4.4], seed: s, jitter: 0.08, color: 'n2a' });
    } else if (kind === 'conifer') {
      g.cylinder(0.22, 2, { seg: 6, color: 'n3' });
      [[3.6, 1.2], [2.8, 2.8], [2.0, 4.3], [1.2, 5.6]].forEach(([w, z], i) => {
        g.cone(w / 2, 2.2, { at: [0, 0, z], seg: 7, color: 'n3' });
        g.cone(w / 2 * 0.62, 1.0, { at: [0, 0, z + 1.2], seg: 7, color: 'paper' });   // snow on each tier
      });
    } else if (kind === 'round-hero') {
      // seen close (Lucy's tree): a tapered trunk, two limbs, three lumps in two tones
      g.cylinder(0.3, 3.4, { top: 0.2, seg: 14, color: 'n3' });
      g.rod([0, 0, 2.4], [1.3, 0.4, 3.8], 0.11, { color: 'n3' });
      g.rod([0, 0, 2.8], [-1.1, -0.3, 4.0], 0.1, { color: 'n3' });
      g.facet([4.2, 4, 3.4], { at: [0, 0, 3.3], detail: 1, seed: s, jitter: 0.05, color: 'n2a' });
      g.facet([2.6, 2.5, 2.2], { at: [1.6, 0.5, 3.6], detail: 1, seed: s + 2, jitter: 0.05, color: 'n2' });
      g.facet([2.4, 2.3, 2.1], { at: [-1.4, -0.4, 3.9], detail: 1, seed: s + 4, jitter: 0.05, color: { mix: ['n2a', 'n1', 0.4] } });
    } else {
      g.cylinder(0.25, 3.2, { seg: 6, color: 'n3' });
      g.facet([5, 5, 4.2], { at: [0, 0, 2.6], seed: s, color: 'n2a' });
      g.facet([3, 3, 2.6], { at: [1.6, 0.6, 4.2], seed: s + 3, color: 'n2a' });
    }
    return g;
  }

  // ── K4 footprints: a strip of ash and two staggered trails that appear in turn ──
  function footprints(n) {
    const g = F.group({ name: 'ash' });
    g.flat([[-2, -14], [2, -14], [2, 14], [-2, 14]], { at: [0, 0, 0.01], color: 'n2a' });
    g.prints = [];
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1, y = -12 + i * 0.6;
      for (const dx of [-0.55, 0.55]) {
        const p = g.flat([[-0.05, -0.1], [0.05, -0.1], [0.06, 0.06], [0, 0.11], [-0.06, 0.06]], { at: [dx + side * 0.09, y + (dx > 0 ? 0.3 : 0), 0.015], color: 'n4' });
        g.prints.push(p);
      }
    }
    return g;
  }

  // ── K9 stone tools: a core, a hammer stone, a flake ──
  function stoneTools() {
    const g = F.group({ name: 'tools' });
    g.facet([0.16, 0.13, 0.1], { detail: 0, seed: 4, color: 'n3', name: 'core' });
    g.hammer = g.group({ at: [0.25, 0.05, 0.25] });
    g.hammer.facet([0.11, 0.1, 0.09], { detail: 0, seed: 7, color: 'n2' });
    g.flake = g.group({ at: [0.07, -0.02, 0.06] });
    g.flake.extrude([[0, 0], [0.06, 0.01], [0.05, 0.05], [0.01, 0.06]], 0.012, { axis: 'y', color: 'n1' });
    return g;
  }

  // ── K10 hand axe: a flat teardrop ──
  function handAxe() {
    const g = F.group({ name: 'axe' });
    const pts = [];
    for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI * 2; pts.push([0.045 * Math.sin(a) * (1 - 0.35 * Math.cos(a)), 0.075 * Math.cos(a)]); }
    g.extrude(pts, 0.025, { axis: 'y', color: 'n2' });
    return g;
  }

  // ── K11 fire: a ring of stones, sticks, glowing flames ──
  function fire() {
    const g = F.group({ name: 'fire' });
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.facet([0.18, 0.16, 0.12], { detail: 0, seed: i + 2, at: [Math.cos(a) * 0.38, Math.sin(a) * 0.38, 0], color: 'n3' }); }
    g.rod([-0.25, -0.1, 0.05], [0.2, 0.12, 0.12], 0.025, { color: 'n4' });
    g.rod([0.15, -0.22, 0.05], [-0.1, 0.2, 0.14], 0.025, { color: 'n4' });
    g.flames = [[0, 0, 0.32], [0.08, 0.06, 0.24], [-0.07, 0.05, 0.22], [0.02, -0.08, 0.2]].map(([x, y, h], i) =>
      g.cone(0.07 + i * 0.01, h * 1.6, { at: [x, y, 0.06], seg: 6, color: 'paper', glow: true, shadow: false, name: 'flame' }));
    return g;
  }

  // ── K12 pebbles: n small rounded stones in a heap, one per 50 cc ──
  function pebbles(n) {
    const g = F.group({ name: 'pebbles' });
    g.stones = [];
    // a low heap: the base ring sized to the count, each layer smaller
    const base = Math.max(4, Math.ceil(n / 2.6));
    let i = 0;
    for (let layer = 0; i < n; layer++) {
      const per = Math.max(1, Math.min(n - i, Math.round(base - layer * base / 4)));
      for (let k = 0; k < per && i < n; k++, i++) {
        const a = k / per * Math.PI * 2 + layer * 0.5, r = per > 1 ? 0.035 * per - layer * 0.02 : 0;
        g.stones.push(g.rounded([0.12, 0.11, 0.08], { at: [Math.cos(a) * r, Math.sin(a) * r, layer * 0.065], round: 0.8, color: 'n2a', name: 'pebble' }));
      }
    }
    return g;
  }

  // ── K13 a string of 100 beads: a loop of small beads on a cord ──
  function beads() {
    const g = F.group({ name: 'beads' });
    const pts = [];
    for (let i = 0; i <= 100; i++) { const a = i / 100 * Math.PI * 2; pts.push([0.12 * Math.sin(a), -0.09 * (1 - Math.cos(a)) * 0.9, -0.16 * (1 - Math.cos(a)) * 0.5]); }
    g.tube(pts, 0.002, { color: 'n4', closed: true });
    g.beads = [];
    for (let i = 0; i < 100; i++) g.beads.push(g.rounded([0.011, 0.011, 0.006], { at: pts[i], round: 0.7, color: 'paper', name: 'bead', rot: [90, 0, 0] }));
    return g;
  }

  // ── K14 Africa's ground pieces; K15 Europe's snow ──
  function tuft(seed) { const g = F.group(); g.facet([0.5, 0.5, 0.35], { detail: 0, seed, color: 'n2a' }); return g; }
  function boulder(w, seed, color) { const g = F.group(); g.facet([w, w * 0.8, w * 0.6], { detail: 0, seed, color: color || 'n2' }); return g; }
  function cave() {
    const g = F.group({ name: 'cave' });
    g.facet([16, 10, 9], { detail: 1, seed: 11, jitter: 0.15, color: 'n2' });
    g.decal(4, 3.2, (c, w, h) => { c.fillStyle = Film.hex('n7'); c.beginPath(); c.ellipse(w / 2, h, w / 2, h, 0, Math.PI, 0); c.fill(); },
      { at: [0, -4.7, 1.6], px: 40, key: 'cavemouth', twoSided: true });
    return g;
  }

  // ── K16 the raised map: continents on a sea plate, 1.6 m per degree ──
  const MAP = {
    toXY: (lon, lat) => [(lon - 110) * 1.6, (lat - 15) * 1.6],
    land: {
      africa: [[-17, 15], [-10, 30], [10, 37], [32, 31], [43, 12], [51, 12], [40, -15], [32, -28], [20, -35], [12, -5], [8, 4], [-8, 5]],
      eurasia: [[-10, 36], [-9, 43], [-2, 48], [5, 52], [10, 58], [25, 70], [60, 70], [100, 75], [140, 70], [180, 66], [170, 60], [140, 45], [122, 30], [110, 20], [105, 10], [100, 13], [95, 17], [80, 8], [73, 20], [60, 25], [57, 25], [48, 30], [36, 36], [26, 40], [23, 37], [10, 44], [3, 43]],
      arabia: [[34, 28], [43, 13], [59, 22], [56, 26], [48, 30], [35, 32]],
      australia: [[114, -22], [130, -12], [142, -11], [153, -28], [146, -39], [135, -35], [115, -34]],
      americas: [[190, 62], [200, 71], [250, 70], [250, 15], [240, 15], [235, 32], [225, 50], [205, 58]]
    }
  };
  function worldMap() {
    const g = F.group({ name: 'map' });
    g.box([480, 280, 0.6], { at: [0, 30, 0], color: 'n1' });
    for (const k of Object.keys(MAP.land)) g.extrude(MAP.land[k].map(p => MAP.toXY(p[0], p[1])), 2, { at: [0, 0, 0.6], color: 'n0a' });
    return g;
  }

  window.Cast = { hominin, tree, footprints, stoneTools, handAxe, fire, pebbles, beads, tuft, boulder, cave, worldMap, MAP };

  window.CAST_TITLE = 'Cast: Walking first';
  const lit = (g, c) => { g.paint(c || 'hl', 'skin'); g.paint(c || 'hl', 'top'); return g; };
  window.CAST = [
    { name: 'Sahelanthropus', note: 'K1 · N1', make: () => hominin('sahelanthropus') },
    { name: 'Lucy', note: 'K3 · N4', states: [{ label: 'standing' }, { label: 'reaching up', pose: { armR: [160, 10], armL: [140, 5], elbowR: 20 } }, { label: 'lit', hl: true }],
      make: s => { const f = hominin('lucy'); if (s.pose) f.pose(s.pose); return s.hl ? lit(f) : f; } },
    { name: 'Homo erectus', note: 'K6 · N7', states: [{ label: 'with hand axe' }], make: () => hominin('erectus', { axe: true }) },
    { name: 'Neanderthal', note: 'K7 · N10', make: () => hominin('neanderthal') },
    { name: 'Homo sapiens', note: 'K8 · N11', states: [{ label: 'standing' }, { label: 'with spear', spear: true }], make: s => hominin('sapiens', { spear: s.spear }) },
    { name: 'the row, oldest to newest', note: 'K3 K6 K7 K8', make: () => {
      const g = F.group();
      ['lucy', 'erectus', 'neanderthal', 'sapiens'].forEach((k, i) => g.add(hominin(k), { at: [i * 1.6, 0, 0] }));
      return g; } },
    { name: 'trees', note: 'K5 · N5', make: () => { const g = F.group(); g.add(tree('round', 1), { at: [-9, 0, 0] }); g.add(tree('acacia', 2)); g.add(tree('conifer'), { at: [8, 0, 0] }); return g; } },
    { name: 'footprints in ash', note: 'K4 · N3', make: () => footprints(20), view: { az: -100, el: 35 } },
    { name: 'stone tools', note: 'K9 · N6', make: () => stoneTools() },
    { name: 'hand axe', note: 'K10 · N8', make: () => handAxe(), view: { az: -90, el: 20 } },
    { name: 'fire', note: 'K11 · N9', make: () => fire() },
    { name: 'pebbles', note: 'K12 · N16', states: [{ label: '9' , n: 9 }, { label: '27, lit', n: 27, hl: true }],
      make: s => { const g = pebbles(s.n); if (s.hl) g.paint('hl', 'pebble'); return g; } },
    { name: 'beads', note: 'K13 · N18', states: [{ label: '1 lit, 1 soft' }], make: () => { const g = beads(); g.beads[50].paint('hl'); g.beads[51].paint('hlSoft'); return g; }, view: { az: -90, el: 30 } },
    { name: 'cave mouth', note: 'K14 · N12', make: () => cave() },
    { name: 'the raised map', note: 'K16 · N12 N14 N15', make: () => worldMap(), view: { el: 55 } }
  ];
})();
