// World: Waiting at the kerb (step 5). One city the camera travels across:
// the business district with the pickup plaza in the middle, houses and a
// park around it, the airport to the east. Metres; z up; south is -y.
//
// Returns the root group and the handles the shots move: 100 cars, 100
// riders at the plaza, the phone, and helpers that put them in each beat's
// starting state.
window.buildWorld = function () {
  const F = Film, C = window.Cast, V = F.V;
  const root = F.group({ name: 'city' });
  const ROADS = [-160, -100, -40, 20, 80];          // x of north-south roads, y of east-west roads
  const BLOCKS = [-130, -70, -10, 50];              // block centres between them, 50 m square

  // roads: slightly darker strips at ground level; pavements raised a little
  for (const v of ROADS) {
    root.flat([[-185, v - 5], [105, v - 5], [105, v + 5], [-185, v + 5]], { color: 'n1', at: [0, 0, 0.005] });
    root.flat([[v - 5, -185], [v + 5, -185], [v + 5, 105], [v - 5, 105]], { color: 'n1', at: [0, 0, 0.006] });
  }
  root.flat([[105, -45], [320, -45], [320, -35], [105, -35]], { color: 'n1', at: [0, 0, 0.005] });   // the airport road

  const business = new Set(['-10,-10', '50,-10', '50,-70', '-10,-70']);
  let seed = 1;
  for (const cx of BLOCKS) for (const cy of BLOCKS) {
    const b = root.group({ at: [cx, cy, 0] });
    b.box([50, 50, 0.15], { color: 'n0a' });
    const key = cx + ',' + cy;
    if (key === '-10,-70') {
      // the pickup plaza: an open pavement on the south side, one tower behind it
      b.add(C.tower(26, 18, 54, 4), { at: [0, 12, 0.15] });
      for (const x of [-20, 18]) b.add(C.tree(seed++), { at: [x, 4, 0.15] });
    } else if (business.has(key)) {
      const r = F.rng(seed++);
      b.add(C.tower(18, 16, 30 + r() * 40, seed++), { at: [-12, -12, 0.15] });
      b.add(C.tower(16, 18, 20 + r() * 30, seed++), { at: [12, 12, 0.15] });
      if (r() < 0.6) b.add(C.tower(14, 14, 16 + r() * 16, seed++), { at: [13, -13, 0.15] });
    } else if (key === '-10,-130') {
      // an open square across the road from the plaza: the kerb-level shots look over it
      for (const x of [-18, 0, 18]) b.add(C.tree(seed++), { at: [x, -17, 0.15] });
    } else if (key === '-130,50') {
      for (let i = 0; i < 9; i++) b.add(C.tree(seed++), { at: [-16 + (i % 3) * 16, -16 + Math.floor(i / 3) * 16, 0.15] });
    } else {
      const r = F.rng(seed++);
      for (const [x, y] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) {
        if (r() < 0.8) b.add(C.house(16 + r() * 4, 12 + r() * 3, 6 + r() * 6, seed++), { at: [x, y, 0.15], rot: r() < 0.5 ? 0 : 90 });
        else b.add(C.tree(seed++), { at: [x, y, 0.15] });
      }
    }
  }
  // lamps along the plaza kerb (the south edge of the plaza block, y = -95)
  const lamps = [];
  for (const x of [-30, -10, 10]) lamps.push(root.add(C.lamp(), { at: [x, -93.8, 0.15], rot: 180 }));

  // the airport: terminal facing the road, the rank's car park across it
  root.add(C.terminal(), { at: [230, -72, 0], rot: 180 });
  root.add(C.carPark(80, 40), { at: [230, -12, 0] });

  // ── 100 cars ──
  const cars = [];
  for (let i = 0; i < 100; i++) cars.push(root.add(C.car(), { name: 'car' + i }));
  const rankSlots = [];                       // 4 rows of bays, nose to the road
  for (let row = 0; row < 4; row++) for (let k = 0; k < 14; k++) rankSlots.push([196 + k * 5.2, -26 + row * 9.5, 0]);
  const kerbSpots = [];                       // parked at kerbs around the city
  const r = F.rng(99);
  for (let i = 0; i < 140; i++) {
    const horiz = r() < 0.5, road = ROADS[Math.floor(r() * 5)], along = -175 + r() * 270;
    kerbSpots.push(horiz ? { at: [along, road + 3.6, 0], rot: 90 } : { at: [road + 3.6, along, 0], rot: 0 });
  }
  function paintCars(lit) { cars.forEach((c, i) => c.paint(lit && lit.has(i) ? 'hl' : 'paper', 'body')); }
  function carsAt(mode) {
    // 'peak': 38 on the rank, 62 parked around the city (B4)
    cars.forEach((c, i) => {
      c.set({ visible: true });
      if (mode === 'peak' && i < 38) c.set({ at: rankSlots[i], rot: 0 });
      else c.set(kerbSpots[i]);
    });
    paintCars(null);
  }
  // driving loops for the busy-city shots: car i on a road, lane by direction
  function cruise(i, t, speed) {
    const horiz = i % 2 === 0, road = ROADS[i % 5], lane = (i % 4 < 2 ? 2.5 : -2.5);
    const dir = lane > 0 ? 1 : -1, span = 290, start = (i * 37) % span;
    const d = ((start + t * speed * dir) % span + span) % span - 185;
    const c = cars[i];
    if (horiz) c.set({ at: [d, road + lane, 0], rot: dir > 0 ? 90 : -90 });
    else c.set({ at: [road - lane, d, 0], rot: dir > 0 ? 180 : 0 });
  }

  // ── 100 riders at the plaza, a 10 x 10 crowd behind the kerb ──
  const riders = [], spots = [];
  for (let i = 0; i < 100; i++) {
    const col = i % 10, row = Math.floor(i / 10);
    spots.push([-13.4 + col * 0.75 + (row % 2) * 0.2, -92.6 + row * 0.75, 0.15]);
    riders.push(root.add(C.rider(i + 1), { at: spots[i] }));
  }
  // the phone, in the hand of a rider in the front row
  const holder = riders[4];
  const phoneLong = holder.bones.handR.add(C.phone(true), { at: [0, -0.02, -0.06], rot: [-60, 0, 0] });
  const phoneShort = holder.bones.handR.add(C.phone(false), { at: [0, -0.02, -0.06], rot: [-60, 0, 0] });
  const HOLD = { armR: [55, 4], elbowR: 75 };
  function crowd(n, opts) {
    riders.forEach((f, i) => {
      f.set({ at: spots[i], rot: 0, visible: i < n });
      f.pose(i === 4 ? HOLD : {});
      f.paint(f._top || (f._top = f.find('top').color), 'top');
    });
    phoneLong.set({ visible: !!(opts && opts.phone === 'long') });
    phoneShort.set({ visible: !!(opts && opts.phone === 'short') });
  }
  // a fixed, scattered choice of k riders (not the phone holder), the same every time
  function pick(k, s) {
    const order = riders.map((_, i) => i).filter(i => i !== 4);
    const rr = F.rng(s || 5);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rr() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    return order.slice(0, k);
  }
  // k riders light up, step out of the crowd and walk away east along the pavement
  function walkAway(idx, t, a, b) {
    idx.forEach((ri, n) => {
      const f = riders[ri], s = spots[ri];
      const local = F.verbs.stagger(F.ease.span(t, a, b), n, idx.length, 0.7);
      f.paint(local > 0 || t > a ? 'hl' : f._top, 'top');
      const lightUp = F.ease.span(t, a - 0.12, a);
      if (lightUp > 0) f.paint('hl', 'top');
      const path = [s, [s[0], -94.2, 0.15], [s[0] + 28, -94.2, 0.15]];
      if (local > 0) F.verbs.walk(f, path, local);
    });
  }

  function setNight(on) {
    root.walk(m => { if (m.name === 'windows' || m.name === 'lampHead') m.glow = on; });
    root.walk(m => { if (m.name === 'lampHead') m.paint(on ? 'paper' : 'n1'); });
  }

  return { root, cars, riders, spots, rankSlots, kerbSpots, carsAt, paintCars, cruise, crowd, pick, walkAway, setNight, holder };
};
