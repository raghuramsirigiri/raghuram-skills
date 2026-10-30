// World: Walking first (step 5). One path east through Africa (woodland, the
// ash at Laetoli, Lucy's tree, the tools, open grassland, the cave, the rise
// in Morocco, the row of four), on into ice-age Europe; the raised map lies
// off to the north for the journeys across continents. Metres; z up.
window.buildWorld = function () {
  const F = Film, C = window.Cast;
  const root = F.group({ name: 'world' });
  const rng = F.rng(5);

  // the path itself: a band of bare earth, oldest (west) to newest (east)
  root.flat([[-70, -1.6], [640, -1.6], [640, 1.6], [-70, 1.6]], { at: [0, 0, 0.004], color: 'n0a' });

  // woodland (x -60..60): round trees
  for (let i = 0; i < 26; i++) {
    const x = -60 + rng() * 120, y = (rng() < 0.5 ? -1 : 1) * (8 + rng() * 30);
    root.add(C.tree('round', i + 1), { at: [x, y, 0], rot: rng() * 360, scale: 0.8 + rng() * 0.5 });
  }
  const sahel = root.add(C.hominin('sahelanthropus'), { at: [6, -0.5, 0] });

  // Laetoli: the ash strip runs along the path at x 75..103
  const ash = root.add(C.footprints(44), { at: [89, 0, 0], rot: -90 });
  const walkers = [C.hominin('walker', { height: 0.92 }), C.hominin('walker', { height: 1.08 })].map(f => root.add(f));

  // Lucy's tree
  root.add(C.tree('round-hero', 7), { at: [142, 5, 0] });   // seen close in B4: built at hero tier
  const lucy = root.add(C.hominin('lucy', { hero: true }), { at: [141.6, 3.9, 0] });

  // the oldest tools, on a patch of rock
  root.add(C.boulder(2.4, 3, 'n2a'), { at: [171, 1.6, 0] });
  const tools = root.add(C.stoneTools(), { at: [168.5, -0.4, 0] });

  // open grassland (x 190..290): acacias, tufts
  for (let i = 0; i < 18; i++) root.add(C.tree('acacia', i + 2), { at: [190 + rng() * 100, (rng() < 0.5 ? -1 : 1) * (9 + rng() * 34), 0], rot: rng() * 360 });
  for (let i = 0; i < 140; i++) root.add(C.tuft(i % 5 + 1), { at: [180 + rng() * 120, (rng() - 0.5) * 70, 0], scale: 0.7 + rng() * 0.8 });
  const erectus = root.add(C.hominin('erectus', { axe: true }));

  // the cave mouth, with a fire and three seated figures
  root.add(C.cave(), { at: [312, 14, 0] });
  const fire = root.add(C.fire(), { at: [312, 6.5, 0] });
  const sitters = [0, 1, 2].map(i => {
    const a = -Math.PI / 2 + (i - 1) * 1.1, f = root.add(C.hominin('erectus'));
    f.set({ at: [312 + Math.cos(a) * 1.3, 6.5 + Math.sin(a) * 1.3, 0], rot: Math.atan2(Math.cos(a), Math.sin(a)) * 180 / Math.PI + 180 });
    f.pose({ crouch: 0.45, legL: [80, 0], legR: [80, 0], kneeL: 95, kneeR: 95, spine: 15, armL: [30, 8], armR: [30, 8], elbowL: 50, elbowR: 50 });
    return f;
  });

  // the rise at Jebel Irhoud
  root.add(C.boulder(7, 21, 'n2a'), { at: [362, 6, 0] });
  root.add(C.boulder(4, 22, 'n2'), { at: [368, 2, 0] });
  const sapiensMorocco = root.add(C.hominin('sapiens', { spear: true, hero: true }), { at: [359.5, 0.4, 0] });   // in front of the rise, the rocks behind

  // the row of four, with their pebbles (1 pebble = 50 cubic centimetres)
  const ROW = [['lucy', 9], ['erectus', 20], ['neanderthal', 30], ['sapiens', 27]];
  const row = ROW.map(([k, n], i) => {
    const x = 398 + i * 2.6;
    const f = root.add(C.hominin(k), { at: [x, 0.6, 0] });
    const p = root.add(C.pebbles(n), { at: [x + 0.7, -0.4, 0] });
    return { fig: f, pebbles: p, n };
  });

  // ice-age Europe (x 520..640): snow, conifers, boulders, Neanderthals
  root.flat([[515, -50], [660, -50], [660, 50], [515, 50]], { at: [0, 0, 0.003], color: 'paper' });
  for (let i = 0; i < 40; i++) root.add(C.tree('conifer'), { at: [520 + rng() * 130, (rng() < 0.5 ? -1 : 1) * (6 + rng() * 40), 0], scale: 0.9 + rng() * 0.6 });
  for (let i = 0; i < 10; i++) root.add(C.boulder(1.5 + rng() * 2, 30 + i, 'n2'), { at: [525 + rng() * 120, (rng() - 0.5) * 60, 0] });
  const neanderthals = [0, 1, 2, 3].map(i => root.add(C.hominin('neanderthal', { height: 0.92 + i * 0.05 })));
  const traveller = root.add(C.hominin('sapiens', { hero: true }), { at: [600, -0.6, 0] });
  const necklace = traveller.bones.torso.add(C.beads(), { at: [0, -traveller.dims.depth * 0.95, traveller.dims.torso * 0.98] });

  // the raised map, off to the north
  const MAPAT = [250, 700, 0];
  const map = root.add(C.worldMap(), { at: MAPAT });
  const M = C.MAP, onMap = (lon, lat) => { const [x, y] = M.toXY(lon, lat); return [MAPAT[0] + x, MAPAT[1] + y, 2.7]; };
  // routes as rows of markers that appear in order; walkers as small figures on them
  function route(points, n) {
    const pts = points.map(p => onMap(p[0], p[1]));
    const dots = [];
    for (let i = 0; i < n; i++) {
      const a = F.verbs.along(pts, i / (n - 1));
      dots.push(root.sphere(0.9, { at: [a.at[0], a.at[1], 3.2], color: 'hl', shadow: false }));
    }
    return { pts, dots };
  }
  const routes = {
    erectus: route([[36, 2], [39, 15], [36, 32], [44, 41]], 26),
    sapiensEast: route([[38, 8], [44, 12], [52, 20], [62, 25], [75, 20], [95, 18], [105, 8], [115, -5], [125, -12], [133, -22]], 50),
    sapiensWest: route([[38, 8], [35, 30], [30, 38], [20, 44], [8, 46]], 22),
    sapiensNorth: route([[62, 25], [85, 40], [110, 42], [135, 52], [165, 64], [190, 64], [215, 55], [232, 40], [240, 22]], 50)
  };
  const mapWalkers = Object.keys(routes).map(k => {
    const f = root.add(C.hominin(k === 'erectus' ? 'erectus' : 'sapiens'), { scale: 4 });
    return { key: k, fig: f };
  });
  const places = {
    chad: [6, -0.5, 3], laetoli: [89, 0, 1], ethiopia: [142, 5, 9], lomekwi: [171, 1.6, 2.5], wonderwerk: [312, 14, 10],
    jebel: [362, 6, 6], europe: [585, 0, 8],
    mapAfrica: onMap(20, 5), mapDmanisi: onMap(44, 41), mapEurope: onMap(10, 48), mapAsia: onMap(95, 45),
    mapAustralia: onMap(133, -25), mapAmericas: onMap(235, 45), map: [MAPAT[0], MAPAT[1] + 30, 0]
  };

  // put everything not in a beat out of the way; each beat's setup shows its own
  function rest() {
    walkers.forEach(f => f.set({ visible: false }));
    ash.prints.forEach(p => p.set({ visible: false }));
    erectus.set({ visible: false });
    neanderthals.forEach(f => f.set({ visible: false }));
    mapWalkers.forEach(w => w.fig.set({ visible: false }));
    Object.values(routes).forEach(r => r.dots.forEach(d => d.set({ visible: false })));
    row.forEach(r => { r.pebbles.stones.forEach(s => s.set({ visible: false }).paint('n2a')); r.fig.paint(r.fig._skin || (r.fig._skin = r.fig.find('skin').color), 'skin'); });
    necklace.beads.forEach(b => b.paint('paper'));
    fire.flames.forEach(f => f.set({ scale: 1 }));
    lucy.pose({}); sahel.pose({}); sapiensMorocco.pose({});
  }

  return { root, sahel, ash, walkers, lucy, tools, erectus, fire, sitters, sapiensMorocco, row, neanderthals, traveller, necklace, routes, mapWalkers, places, rest, onMap };
};
