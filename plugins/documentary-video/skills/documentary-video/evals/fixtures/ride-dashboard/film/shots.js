// Shots: Waiting at the kerb (step 6). One entry per screenplay beat, with
// its caption, callout, key and claims copied from film/screenplay.md.
window.FILM_META = { source: 'Source: Metro Rides operations dashboard, Q3 2026 (fictional)' };

window.buildShots = function (W) {
  const F = Film, E = F.ease, VB = F.verbs;
  const RANK = [230, -12, 0];
  const KERB = [-9, -91, 1];
  const kerbLow = { target: KERB, az: -122, el: 13, dist: 19, fov: 30 };
  const PLACES = {
    plaza: { text: 'Business district', at: [-10, -80, 6] },
    rank: { text: 'Airport rank', at: [230, -12, 2] },
    terminal: { text: 'Airport', at: [230, -72, 14] }
  };
  const traffic = (t, n, speed) => { for (let i = 38; i < 38 + n; i++) W.cruise(i, t, speed); };
  const nightOn = on => W.setNight(on);
  const noCars = () => W.cars.forEach(c => c.set({ visible: false }));
  const roadCars = () => { W.cars.forEach((c, i) => c.set({ visible: i >= 38 && i < 78 })); W.paintCars(null); };
  const crowdCount = n => W.riders.forEach((f, i) => f.set({ visible: i < n }));

  return [
    { id: 'B1', dur: 4, cut: true, sky: 'dawn',
      card: { title: 'Waiting at the kerb', sub: 'A quarter at Metro Rides, told through its riders and drivers' },
      cam: { from: { target: [20, -40, 0], az: -150, el: 58, dist: 620 }, to: { target: [10, -50, 0], az: -138, el: 50, dist: 520 } },
      setup() { nightOn(false); roadCars(); W.crowd(0); },
      update(t) { traffic(t, 40, 30); } },

    { id: 'B2', act: 'The city', dur: 5, claims: 'C1', sky: t => F.mixSky('dawn', 'day', t),
      stat: { value: 4.6, decimals: 1, suffix: 'm', label: 'trips, up 9%', window: [0.05, 0.6] },
      caption: 'completed in Q3.',
      cam: { from: { target: [10, -50, 0], az: -138, el: 50, dist: 520 }, to: { target: [0, -60, 0], az: -112, el: 36, dist: 260 } },
      setup() { nightOn(false); roadCars(); W.crowd(0); },
      update(t) { traffic(t + 0.12, 40, 34); } },

    { id: 'B3', act: 'The city', dur: 5, claims: 'C3', cut: true, sky: 'day',
      stat: { value: 6.2, decimals: 1, label: 'minutes', window: [0.05, 0.5] },
      caption: 'The average wait for a car.',
      timer: { at: [-10, -93.9, 2.2], value: 6.2, unit: 'min', window: [0.02, 0.5] },
      cam: { from: { target: [-13, -95, 1], az: -128, el: 13, dist: 14 }, to: { target: [-6, -95.5, 1], az: -100, el: 11, dist: 14 } },
      setup() {
        nightOn(false); noCars(); W.crowd(0);
        const f = W.riders[4]; f.set({ visible: true, at: [-10, -93.9, 0.15], rot: 0 }); f.pose({});
        W.cars[0].set({ visible: true }); W.paintCars(null);
      },
      update(t) {
        const c = W.cars[0], f = W.riders[4];
        if (t < 0.5) VB.move(c, [[-55, -97.5, 0], [-10, -97.5, 0]], E.out(t / 0.5));
        else if (t < 0.66) { VB.move(c, [[-11, -97.5, 0], [-10, -97.5, 0]], 1); f.set({ visible: t < 0.58 }); }
        else { f.set({ visible: false }); VB.move(c, [[-10, -97.5, 0], [50, -97.5, 0]], E.in((t - 0.66) / 0.34)); }
      } },

    { id: 'B4', act: 'The morning peak', dur: 5, claims: 'C5', cut: true, sky: 'dawn',
      stat: { value: 9.8, decimals: 1, label: 'minutes', window: [0.15, 0.8] },
      caption: 'The wait from 07:00 to 09:00.',
      labels: [Object.assign({ window: [0.05, 1] }, PLACES.plaza)],
      timer: { at: [-10, -88, 2.4], value: 9.8, unit: 'min', window: [0.15, 0.8] },
      cam: { from: { target: [0, -70, 0], az: -132, el: 40, dist: 150 }, to: { target: [-9, -89, 1], az: -118, el: 24, dist: 34 } },
      setup() { nightOn(false); noCars(); W.crowd(0); },
      update(t) { crowdCount(Math.round(100 * E.out(E.span(t, 0, 0.7)))); } },

    { id: 'B5', act: 'The morning peak', dur: 6, claims: 'C9', cut: true, sky: 'dawn',
      key: '1 car = 1% of online drivers',
      stat: { count: t => VB.litCount(38, E.span(t, 0.4, 0.92)), label: 'of online drivers', suffix: '%' },
      caption: 'are parked at the airport at the same hour.',
      labels: [Object.assign({ window: [0.45, 1] }, PLACES.rank)],
      cam: { from: { target: [40, -55, 0], az: -110, el: 50, dist: 470 }, to: { target: RANK, az: -146, el: 40, dist: 105 } },
      setup() { nightOn(false); W.carsAt('peak'); W.crowd(100); },
      update(t) { VB.light(W.cars.slice(0, 38), 38, E.span(t, 0.4, 0.92), 'hl', 'paper', 'body'); } },

    { id: 'B6', act: 'The morning peak', dur: 4, claims: 'C10', sky: 'dawn',
      key: '1 car = 1% of trips',
      stat: { count: t => VB.litCount(14, E.span(t, 0.1, 0.5)), label: 'of trips', suffix: '%' },
      caption: 'start at the airport.',
      labels: [Object.assign({ window: [0.3, 1] }, PLACES.terminal)],
      cam: { from: { target: RANK, az: -146, el: 40, dist: 105 }, to: { target: [150, -50, 0], az: -128, el: 50, dist: 380 } },
      setup() {
        nightOn(false); W.crowd(100);
        W.cars.forEach((c, i) => { c.set({ visible: true }); if (i < 14) c.set({ at: [182 + i * 7, -42.5, 0], rot: -90 }); else c.set(W.kerbSpots[i]); });
        W.paintCars(null);
      },
      update(t) {
        VB.light(W.cars.slice(0, 14), 14, E.span(t, 0.1, 0.5), 'hl', 'paper', 'body');
        for (let i = 0; i < 14; i++) W.cars[i].set({ at: [182 + i * 7 - 40 * E.inOut(E.span(t, 0.3, 1)), -42.5, 0] });
        for (let i = 14; i < 100; i++) {
          const k = W.kerbSpots[i], a = k.rot === 90 ? [1, 0] : [0, 1], d = 18 * E.inOut(E.span(t, 0.3, 1));
          W.cars[i].set({ at: [k.at[0] + a[0] * d, k.at[1] + a[1] * d, 0] });
        }
      } },

    { id: 'B7', act: 'The morning peak', dur: 5, claims: 'C8', cut: true, sky: 'day',
      key: '1 rider = 1% of riders shown that wait',
      stat: { count: (t, b) => b.lit || 0, label: 'cancel', suffix: '%' },
      caption: 'when the app shows a wait over 10 minutes.',
      cam: t => {
        const p = W.holder.locate('handR');
        const a = F.camera({ target: [p[0], p[1], p[2] + 0.05], az: -90, el: 14, dist: 0.9, fov: 30 });
        return F.lerpCamera(a, F.camera(kerbLow), E.smooth(E.span(t, 0.08, 0.45)));
      },
      setup() { nightOn(false); noCars(); W.crowd(100, { phone: 'long' }); this.who = W.pick(27, 11); },
      update(t) { this.lit = W.walkAway(this.who, t, 0.35, 0.8, this.dur); } },

    { id: 'B8', act: 'The morning peak', dur: 4, claims: 'C8', sky: 'day',
      key: '1 rider = 1% of riders shown that wait',
      stat: { count: (t, b) => b.lit || 0, label: 'cancel', suffix: '%' },
      caption: 'when it shows under 5 minutes.',
      cam: { from: kerbLow, to: Object.assign({}, kerbLow, { az: -134, dist: 18 }) },
      setup() { nightOn(false); noCars(); W.crowd(100, { phone: 'short' }); this.who = W.pick(6, 23); },
      update(t) { this.lit = W.walkAway(this.who, t, 0.15, 0.6, this.dur); } },

    { id: 'B9', act: 'Through the day', dur: 5, claims: 'C7 C6', cut: true,
      sky: t => F.mixSky('day', 'night', E.span(t, 0.3, 0.75)),
      stat: { value: 12.4, from: 4.1, decimals: 1, label: 'minutes, midday to weekend nights', window: [0.35, 0.9] },
      caption: 'Waits run from 4.1 minutes at midday to 12.4 on weekend nights.',
      cam: { from: { target: [-10, -78, 0], az: -150, el: 34, dist: 110 }, to: { target: [-10, -84, 0], az: -100, el: 28, dist: 95 } },
      setup() { roadCars(); W.crowd(100); },
      update(t) {
        nightOn(t > 0.55);
        traffic(t, 40, 25);
        crowdCount(t < 0.35 ? Math.round(100 - 70 * E.inOut(t / 0.35)) : Math.round(30 + 70 * E.inOut(E.span(t, 0.4, 0.9))));
      } },

    { id: 'B10', act: 'Through the day', dur: 4, claims: 'C4', cut: true, sky: 'night',
      key: '1 rider = 1% of requested trips',
      stat: { count: (t, b) => b.lit || 0, label: 'gave up', suffix: '%' },
      caption: 'before pickup, across the quarter.',
      cam: { from: { target: KERB, az: -156, el: 12, dist: 19 }, to: { target: KERB, az: -136, el: 14, dist: 18 } },
      setup() { nightOn(true); noCars(); W.crowd(100); this.who = W.pick(11, 31); },
      update(t) { this.lit = W.walkAway(this.who, t, 0.1, 0.65, this.dur); } },

    { id: 'B11', act: 'The rain week', dur: 5, claims: 'C11', cut: true, sky: 'rain',
      stat: { value: 31, prefix: '+', suffix: '%', label: 'requests', window: [0.2, 0.8] },
      caption: 'in the rain week of 14 September.',
      labels: [Object.assign({ window: [0.3, 1] }, PLACES.plaza)],
      cam: { from: { target: [0, -60, 0], az: -118, el: 44, dist: 300 }, to: { target: [-10, -86, 0], az: -128, el: 30, dist: 70 } },
      setup() { nightOn(false); roadCars(); W.crowd(76); },
      update(t) { traffic(t, 40, 22); crowdCount(Math.round(76 + 24 * E.inOut(E.span(t, 0.2, 0.85)))); } },

    { id: 'B12', act: 'The rain week', dur: 5, claims: 'C12 C13', sky: 'rain',
      key: '1 rider = 1% of requested trips',
      stat: { count: (t, b) => b.lit || 0, label: 'cancelled', suffix: '%' },
      caption: 'Waits hit 11.0 minutes. Surge drivers came after the peak.',
      cam: { from: { target: KERB, az: -146, el: 14, dist: 24 }, to: { target: [-5, -92, 1], az: -124, el: 15, dist: 24 } },
      setup() { nightOn(false); noCars(); W.crowd(100); this.who = W.pick(19, 47); [1, 2, 3].forEach(i => W.cars[i].set({ visible: true })); W.paintCars(null); },
      update(t) {
        this.lit = W.walkAway(this.who, t, 0.05, 0.5, this.dur);
        [1, 2, 3].forEach((i, k) => VB.move(W.cars[i], [[-70 - k * 9, -97.5, 0], [-22 + k * 8, -97.5, 0]], E.out(E.span(t, 0.55 + k * 0.08, 0.98))));
      } },

    { id: 'B13', act: 'What changes', dur: 5, claims: 'C14 C15', cut: true, sky: 'dawn',
      stat: { value: 5, still: true, prefix: 'under ', label: 'minutes' },
      caption: 'The Q4 goal: fewer cars at the airport, more downtown.',
      labels: [Object.assign({ window: [0.05, 0.45] }, PLACES.rank), Object.assign({ window: [0.55, 1] }, PLACES.plaza)],
      // two shots in one beat, cut at the middle: cars leave the rank, then the same cars arrive downtown
      cam: t => t < 0.5
        ? F.lerpCamera(F.camera({ target: [215, -30, 0], az: -150, el: 30, dist: 70 }), F.camera({ target: [200, -36, 0], az: -128, el: 28, dist: 64 }), E.smooth(t / 0.5))
        : F.lerpCamera(F.camera({ target: [-14, -92, 1], az: -140, el: 18, dist: 40 }), F.camera({ target: [-8, -92, 1], az: -118, el: 16, dist: 34 }), E.smooth((t - 0.5) / 0.5)),
      setup() { nightOn(false); W.carsAt('peak'); W.crowd(100); },
      update(t) {
        for (let i = 0; i < 12; i++) {
          const c = W.cars[i];
          if (t < 0.5) {
            // pull out of the bays and turn west on the airport road, at city speed (about 9 m/s)
            const s = W.rankSlots[i], u = Math.max(0, t * 5 - i * 0.12);
            const path = [s, [s[0], -37.5, 0], [s[0] - 60, -37.5, 0]];
            VB.move(c, path, Math.min(1, u * 9 / VB.along(path, 1).length));
          } else {
            // arriving downtown along the plaza road, stopping at the kerb one behind another
            const u = Math.max(0, (t - 0.5) * 5 - i * 0.1);
            const stop = -2 - i * 5.5;
            VB.move(c, [[stop - 40, -97.5, 0], [stop, -97.5, 0]], E.out(Math.min(1, u / 1.6)));
          }
        }
        crowdCount(t < 0.5 ? 100 : Math.round(100 - 45 * E.inOut(E.span(t, 0.65, 1))));
      } },

    { id: 'B14', dur: 3, sky: 'day',
      card: { title: 'Put the drivers where the riders wait.', sub: 'Metro Rides, Q3 2026 operations' },
      cam: { from: { target: [-10, -84, 0], az: -128, el: 34, dist: 120 }, to: { target: [0, -60, 0], az: -118, el: 50, dist: 420 } },
      setup() { nightOn(false); roadCars(); W.crowd(45); },
      update(t) { traffic(t, 40, 30); } }
  ];
};
