// Shots: Waiting at the kerb (step 6). One entry per screenplay beat, with
// its caption, key and claims copied from film/screenplay.md.
window.FILM_META = { source: 'Source: Metro Rides operations dashboard, Q3 2026 (fictional)' };

window.buildShots = function (W) {
  const F = Film, E = F.ease, VB = F.verbs;
  const PLAZA = [-10, -89, 1];
  const RANK = [230, -12, 0];
  const cityWide = { target: [20, -40, 0], az: -125, el: 42, dist: 470, fov: 30 };
  const kerbLow = { target: [-9, -92, 1.1], az: -128, el: 13, dist: 21, fov: 30 };

  const nightOn = on => W.setNight(on);
  const noCars = () => W.cars.forEach(c => c.set({ visible: false }));

  return [
    { id: 'B1', act: 'The city', dur: 8, claims: 'C1',
      caption: 'In Q3, Metro Rides completed 4.6 million trips, up 9%.',
      sky: t => F.mixSky('dawn', 'day', t),
      cam: { from: { target: [0, -40, 0], az: -150, el: 50, dist: 560 }, to: cityWide },
      setup() { nightOn(false); W.carsAt('city'); W.crowd(0); },
      update(t) { for (let i = 0; i < 100; i++) W.cruise(i, t, 70); } },

    { id: 'B2', act: 'The city', dur: 7, claims: 'C3', cut: true,
      caption: 'The average rider waited 6.2 minutes for a car.',
      sky: 'day',
      cam: { from: { target: [-15, -95.5, 1], az: -128, el: 14, dist: 15 }, to: { target: [-8, -95.5, 1], az: -104, el: 12, dist: 14 } },
      setup() {
        nightOn(false); noCars(); W.crowd(0);
        const f = W.riders[4]; f.set({ visible: true, at: [-10, -93.9, 0.15], rot: 0 }); f.pose({});
        W.cars[0].set({ visible: true });
      },
      update(t) {
        const c = W.cars[0], f = W.riders[4];
        if (t < 0.45) VB.move(c, [[-60, -97.5, 0], [-10, -97.5, 0]], E.out(t / 0.45));
        else if (t < 0.62) { VB.move(c, [[-11, -97.5, 0], [-10, -97.5, 0]], 1); f.set({ visible: t < 0.55 }); }
        else { f.set({ visible: false }); VB.move(c, [[-10, -97.5, 0], [60, -97.5, 0]], E.in((t - 0.62) / 0.38)); }
      } },

    { id: 'B3', act: 'The morning peak', dur: 8, claims: 'C5', cut: true,
      caption: 'From 07:00 to 09:00, waits reach 9.8 minutes.',
      sky: 'dawn',
      cam: { from: { target: [10, -50, 0], az: -128, el: 38, dist: 240 }, to: { target: [-9, -90, 1], az: -122, el: 24, dist: 34 } },
      setup() { nightOn(false); noCars(); W.crowd(0); },
      update(t) { const n = Math.round(100 * E.out(E.span(t, 0.1, 0.9))); W.riders.forEach((f, i) => f.set({ visible: i < n })); } },

    { id: 'B4', act: 'The morning peak', dur: 9, claims: 'C9', cut: true,
      caption: 'At the same hour, 38% of online drivers sit on the airport rank.',
      key: '1 car = 1% of online drivers',
      sky: 'dawn',
      cam: { from: { target: [60, -50, 0], az: -112, el: 52, dist: 560 }, to: { target: RANK, az: -142, el: 42, dist: 125 } },
      setup() { nightOn(false); W.carsAt('peak'); W.crowd(100); },
      update(t) {
        const k = Math.round(38 * E.span(t, 0.35, 0.9));
        W.paintCars(new Set(Array.from({ length: k }, (_, i) => i)));
      } },

    { id: 'B5', act: 'The morning peak', dur: 7, claims: 'C10',
      caption: 'Yet the airport is only 14% of trips.',
      key: '1 car = 1% of trips',
      sky: 'dawn',
      cam: { from: { target: RANK, az: -142, el: 42, dist: 125 }, to: { target: [70, -55, 0], az: -118, el: 54, dist: 540 } },
      setup() {
        nightOn(false); W.crowd(100);
        // 100 trips leaving pickup points: 14 from the terminal kerb, 86 from kerbs in the city
        W.cars.forEach((c, i) => {
          c.set({ visible: true });
          if (i < 14) c.set({ at: [182 + i * 7, -42.5, 0], rot: -90 });
          else c.set(W.kerbSpots[i]);
        });
        W.paintCars(new Set(Array.from({ length: 14 }, (_, i) => i)));
      },
      update(t) {
        W.cars.forEach((c, i) => {
          if (i < 14) c.set({ at: [182 + i * 7 - 30 * E.inOut(E.span(t, 0.2, 1)), -42.5, 0] });
        });
      } },

    { id: 'B6', act: 'The morning peak', dur: 8, claims: 'C8', cut: true,
      caption: 'Shown a wait over 10 minutes, 27% of riders cancel.',
      key: '1 rider = 1% of riders shown that wait',
      sky: 'day',
      cam: t => {
        const p = W.holder.locate('handR');
        const a = F.camera({ target: [p[0], p[1], p[2] + 0.1], az: -90, el: 16, dist: 1.3, fov: 30 });
        const b = F.camera(kerbLow);
        return F.lerpCamera(a, b, E.inOut(E.span(t, 0.15, 0.6)));
      },
      setup() { nightOn(false); noCars(); W.crowd(100, { phone: 'long' }); this.who = W.pick(27, 11); },
      update(t) { W.walkAway(this.who, t, 0.55, 1); } },

    { id: 'B7', act: 'The morning peak', dur: 6, claims: 'C8',
      caption: 'Under 5 minutes, only 6% do.',
      key: '1 rider = 1% of riders shown that wait',
      sky: 'day',
      cam: { from: kerbLow, to: Object.assign({}, kerbLow, { az: -122, dist: 20 }) },
      setup() { nightOn(false); noCars(); W.crowd(100, { phone: 'short' }); this.who = W.pick(6, 23); },
      update(t) { W.walkAway(this.who, t, 0.3, 0.9); } },

    { id: 'B8', act: 'Through the day', dur: 8, claims: 'C7 C6', cut: true,
      caption: 'Waits fall to 4.1 minutes at midday and climb to 12.4 on weekend nights.',
      sky: t => F.mixSky('day', 'night', E.span(t, 0.35, 0.8)),
      cam: { from: { target: [-10, -70, 0], az: -150, el: 36, dist: 150 }, to: { target: [-10, -80, 0], az: -95, el: 30, dist: 130 } },
      setup() { W.carsAt('city'); W.crowd(100); },
      update(t) {
        nightOn(t > 0.6);
        for (let i = 0; i < 40; i++) W.cruise(i, t, 40);
        const n = t < 0.4 ? Math.round(100 - 70 * E.inOut(t / 0.4)) : Math.round(30 + 70 * E.inOut(E.span(t, 0.5, 0.95)));
        W.riders.forEach((f, i) => f.set({ visible: i < n }));
      } },

    { id: 'B9', act: 'Through the day', dur: 7, claims: 'C4', cut: true,
      caption: 'Across the quarter, 11% of riders gave up before pickup.',
      key: '1 rider = 1% of requested trips',
      sky: 'night',
      cam: { from: { target: [-10, -91, 1], az: -158, el: 12, dist: 20 }, to: { target: [-9, -90, 1], az: -138, el: 14, dist: 19 } },
      setup() { nightOn(true); noCars(); W.crowd(100); this.who = W.pick(11, 31); },
      update(t) { W.walkAway(this.who, t, 0.3, 0.95); } },

    { id: 'B10', act: 'The rain week', dur: 8, claims: 'C11', cut: true,
      caption: 'In the rain week of 14 September, requests rose 31%.',
      sky: 'rain',
      cam: { from: { target: [0, -50, 0], az: -120, el: 46, dist: 330 }, to: { target: [-10, -85, 0], az: -125, el: 36, dist: 120 } },
      setup() { nightOn(false); W.carsAt('city'); W.crowd(76); },
      update(t) {
        for (let i = 0; i < 30; i++) W.cruise(i, t, 30);
        const n = Math.round(76 + 24 * E.inOut(E.span(t, 0.25, 0.9)));
        W.riders.forEach((f, i) => f.set({ visible: i < n }));
      } },

    { id: 'B11', act: 'The rain week', dur: 7, claims: 'C12 C13',
      caption: 'Waits hit 11.0 minutes and 19% cancelled. Surge drivers came after the peak.',
      key: '1 rider = 1% of requested trips',
      sky: 'rain',
      cam: { from: { target: [-10, -91, 1], az: -150, el: 14, dist: 26 }, to: { target: [-6, -92, 1], az: -128, el: 16, dist: 26 } },
      setup() { nightOn(false); noCars(); W.crowd(100); this.who = W.pick(19, 47); [1, 2, 3].forEach(i => W.cars[i].set({ visible: true })); W.paintCars(null); },
      update(t) {
        W.walkAway(this.who, t, 0.08, 0.6);
        [1, 2, 3].forEach((i, k) => VB.move(W.cars[i], [[-70 - k * 9, -97.5, 0], [-22 + k * 8, -97.5, 0]], E.out(E.span(t, 0.6 + k * 0.08, 0.98))));
      } },

    { id: 'B12', act: 'What changes', dur: 7, claims: 'C14 C15', cut: true,
      caption: 'Q4 trials fewer cars at the airport and more downtown before 07:00. Goal: under 5 minutes.',
      sky: 'dawn',
      cam: { from: { target: RANK, az: -140, el: 40, dist: 115 }, to: { target: [40, -70, 0], az: -125, el: 44, dist: 330 } },
      setup() { nightOn(false); W.carsAt('peak'); W.crowd(100); },
      update(t) {
        // 20 cars leave the rank and drive west to the business district's kerbs
        for (let i = 0; i < 20; i++) {
          const s = W.rankSlots[i], u = VB.stagger(E.span(t, 0.05, 0.95), i, 20, 0.5);
          VB.move(W.cars[i], [s, [s[0], -37.5, 0], [-20 + i * 3, -37.5, 0], [-20 + i * 3, -96.5, 0]], E.inOut(u));
        }
        const n = Math.round(100 - 55 * E.inOut(E.span(t, 0.45, 1)));
        W.riders.forEach((f, i) => f.set({ visible: i < n }));
      } }
  ];
};
