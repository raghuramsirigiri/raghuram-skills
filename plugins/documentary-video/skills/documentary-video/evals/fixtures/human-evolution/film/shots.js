// Shots: Walking first (step 6). Captions, callouts and keys from film/screenplay.md.
window.FILM_META = { name: 'walking-first', source: 'Source: "Seven million years in a few pages" (test document; dates approximate)' };

window.buildShots = function (W) {
  const F = Film, E = F.ease, VB = F.verbs, P = W.places;
  const label = (text, at, a, b) => ({ text, at, window: [a == null ? 0.15 : a, b == null ? 1 : b] });
  const date = (value, decimals, prefix, suffix) => ({ value, decimals: decimals || 0, prefix: prefix || '', suffix: suffix || '', label: 'years ago', still: true });
  const dotsUpTo = (r, f) => r.dots.forEach((d, i) => d.set({ visible: i < Math.round(r.dots.length * f) }));
  const walkRoute = (key, f) => {
    const w = W.mapWalkers.find(m => m.key === key), r = W.routes[key];
    w.fig.set({ visible: f > 0 && f < 1.05 });
    if (f > 0) VB.walk(w.fig, r.pts, Math.min(1, f));
  };

  return [
    { id: 'B1', dur: 4, sky: 'dawn',
      card: { title: 'Walking first', sub: 'How we became human, in about a minute' },
      cam: { from: { target: [10, 0, 0], az: -112, el: 46, dist: 150 }, to: { target: [6, 0, 0], az: -100, el: 36, dist: 105 } },
      setup() { W.rest(); } },

    { id: 'B2', act: 'Walking first', dur: 5, claims: 'C1', sky: 'dawn',
      stat: date(7, 0, 'about ', ' million'),
      caption: 'Sahelanthropus, in Chad, may be among the first of our line.',
      labels: [label('Chad', P.chad, 0.3)],
      cam: { from: { target: [6, 0, 1], az: -118, el: 20, dist: 34 }, to: { target: [6, -0.5, 0.9], az: -100, el: 10, dist: 9 } },
      setup() { W.rest(); },
      update(t) { const u = E.smooth(E.span(t, 0.25, 0.75)); W.sahel.pose({ crouch: 0.3 * (1 - u), kneeL: 50 * (1 - u), kneeR: 50 * (1 - u), legL: [30 * (1 - u), 0], legR: [30 * (1 - u), 0], spine: 25 * (1 - u) }); } },

    { id: 'B3', act: 'Walking first', dur: 5, claims: 'C2', cut: true, sky: 'day',
      stat: date(3.66, 2, '', ' million'),
      caption: 'Footprints at Laetoli: an upright stride.',
      labels: [label('Laetoli, Tanzania', [96, 0, 1], 0.3)],
      cam: t => { const x = 80 + t * 6; return F.camera({ target: [x - 0.5, 0, 0.6], az: -150 + t * 25, el: 13, dist: 8 }); },
      setup() { W.rest(); W.walkers.forEach(f => f.set({ visible: true })); },
      update(t) {
        const x = 80 + t * 6;
        W.walkers.forEach((f, i) => VB.walk(f, [[x - 1, i ? -0.55 : 0.55, 0.01], [x, i ? -0.55 : 0.55, 0.01]], 1, {}));
        W.walkers.forEach((f, i) => VB.stride(f, t * 6 * 0.65 * 1.4 + i * 0.5, 1));
        W.ash.prints.forEach(p => p.set({ visible: 89 + p.at[1] < x - 0.3 }));
      } },

    { id: 'B4', act: 'Walking first', dur: 5, claims: 'C3', cut: true, sky: 'day',
      stat: date(3.2, 1, '', ' million'),
      caption: 'Lucy: a little over 1 metre tall, upright, still climbing.',
      labels: [label('Ethiopia', P.ethiopia, 0.2)],
      cam: { from: { target: [141.6, 3.9, 0.35], az: -124, el: 16, dist: 6.5 }, to: { target: [141.6, 3.9, 0.45], az: -90, el: 18, dist: 5.8 } },
      setup() { W.rest(); },
      update(t) { const u = E.smooth(E.span(t, 0.45, 0.8)); W.lucy.pose({ armR: [5 + 150 * u, 8], armL: [5 + 130 * u, 5], elbowR: 20 * u, spine: -6 * u }); } },

    { id: 'B5', act: 'Tools and a new body', dur: 5, claims: 'C5', cut: true, sky: 'day',
      stat: date(3.3, 1, '', ' million'),
      caption: 'The oldest known stone tools, from Lomekwi in Kenya.',
      cam: { from: { target: [168.7, -0.4, 0.1], az: -125, el: 26, dist: 1.4 }, to: { target: [168.65, -0.4, 0.08], az: -100, el: 22, dist: 1.1 } },
      setup() { W.rest(); W.tools.hammer.set({ at: [0.25, 0.05, 0.3] }); W.tools.flake.set({ at: [0.07, -0.02, 0.06], rot: 0 }); },
      update(t) {
        const down = E.in(E.span(t, 0.2, 0.42)), up = E.out(E.span(t, 0.42, 0.7));
        const z = 0.3 - 0.2 * down + 0.15 * up, x = 0.25 - 0.16 * down + 0.1 * up;
        W.tools.hammer.set({ at: [x, 0.03, z] });
        const fly = E.out(E.span(t, 0.42, 0.65));
        W.tools.flake.set({ at: [0.07 + 0.12 * fly, -0.02 - 0.05 * fly, 0.06 * (1 - fly) + 0.003], rot: [0, 0, 70 * fly] });
      } },

    { id: 'B6', act: 'Tools and a new body', dur: 5, claims: 'C6', cut: true, sky: 'day',
      stat: date(1.9, 1, '', ' million'),
      caption: 'Homo erectus: long legs, a body much like ours.',
      cam: t => F.camera({ target: [205 + t * 8, 0, 1.1], az: -100 + t * 25, el: 9, dist: 8.5 }),
      setup() { W.rest(); W.erectus.set({ visible: true }); },
      update(t) { VB.walk(W.erectus, [[204, 0, 0], [222, 0, 0]], t * 8 / 18); } },

    { id: 'B7', act: 'Tools and a new body', dur: 6, claims: 'C8', sky: 'day',
      stat: date(1.8, 1, '', ' million'),
      caption: 'The first humans known to leave Africa, at Dmanisi in Georgia.',
      labels: [label('Africa', P.mapAfrica, 0.4, 1), label('Dmanisi, Georgia', P.mapDmanisi, 0.75, 1)],
      // rise off the grassland, then the map: one move up, one cut
      cam: t => t < 0.3
        ? F.lerpCamera(F.camera({ target: [213, 0, 1.1], az: -75, el: 9, dist: 8.5 }), F.camera({ target: [213, 0, 4], az: -80, el: 55, dist: 70 }), E.smooth(t / 0.3))
        : F.lerpCamera(F.camera({ target: W.onMap(38, 20), az: -100, el: 60, dist: 190 }), F.camera({ target: W.onMap(40, 26), az: -92, el: 54, dist: 160 }), E.smooth((t - 0.3) / 0.7)),
      setup() { W.rest(); W.erectus.set({ visible: true }); },
      update(t) {
        VB.walk(W.erectus, [[212, 0, 0], [222, 0, 0]], t / 0.3 * 0.2);
        const f = E.span(t, 0.35, 0.92);
        dotsUpTo(W.routes.erectus, f); walkRoute('erectus', f);
      } },

    { id: 'B8', act: 'Tools and a new body', dur: 5, claims: 'C9', cut: true, sky: 'night',
      stat: date(1, 0, 'about ', ' million'),
      caption: 'Early evidence of fire, Wonderwerk Cave.',
      labels: [label('Wonderwerk Cave, South Africa', P.wonderwerk, 0.3)],
      cam: { from: { target: [312, 7, 0.7], az: -112, el: 14, dist: 10 }, to: { target: [312, 7.5, 0.6], az: -95, el: 11, dist: 6.5 } },
      setup() { W.rest(); },
      update(t, s) { W.fire.flames.forEach((f, i) => f.set({ scale: [1, 1, 0.8 + 0.25 * Math.sin(s * 9 + i * 1.7) + 0.1 * Math.sin(s * 23 + i)] })); } },

    { id: 'B9', act: 'Other humans', dur: 5, claims: 'C11', cut: true, sky: 'day',
      stat: { value: 400000, prefix: '', suffix: ' to 40,000', label: 'years ago', still: true },
      caption: 'Neanderthals, built for the cold of Europe.',
      labels: [label('Ice-age Europe', P.europe, 0.15, 0.6)],
      cam: { from: { target: [578, 0, 1], az: -122, el: 40, dist: 95 }, to: { target: [579, 0, 1], az: -100, el: 14, dist: 15 } },
      setup() { W.rest(); W.neanderthals.forEach(f => f.set({ visible: true })); },
      update(t) {
        W.neanderthals.forEach((f, i) => {
          const y = [-1.2, 0.4, 1.6, -0.2][i], x0 = 570 + [0, 1.4, -0.8, 2.6][i];
          VB.walk(f, [[x0, y, 0], [x0 + 12, y, 0]], t * 7 / 12);
        });
      } },

    { id: 'B10', act: 'Our species', dur: 5, claims: 'C13', cut: true, sky: 'day',
      stat: date(300000),
      caption: 'The oldest known Homo sapiens, Jebel Irhoud, Morocco.',
      labels: [label('Jebel Irhoud, Morocco', P.jebel, 0.3)],
      cam: { from: { target: [359.5, 0.4, 1.3], az: -112, el: 4, dist: 7 }, to: { target: [359.6, 0.4, 1.4], az: -84, el: 6, dist: 5.5 } },
      setup() { W.rest(); } },

    { id: 'B11', act: 'Our species', dur: 6, claims: 'C4 C7 C12 C14', cut: true, sky: 'day',
      key: '1 pebble = 50 cubic centimetres of brain',
      stat: { count: (t, b) => b.lit == null ? null : b.lit * 50, max: 1350, label: 'cubic centimetres' },
      caption: "Brains grew from 400 to 500 in Lucy's species to about 1,350 in ours.",
      cam: t => F.camera({ target: [398.4 + t * 8.2, 0, 0.75], az: -96 + t * 8, el: 17, dist: 6.4 }),
      setup() { W.rest(); },
      update(t) {
        // each pile builds while the camera passes it; ours, the last, lights as it builds
        W.row.forEach((r, i) => {
          const a = 0.04 + i * 0.22, f = E.span(t, a, a + 0.18), k = Math.round(r.n * f);
          r.pebbles.stones.forEach((s, j) => s.set({ visible: j < k }));
          if (i === 3) { r.pebbles.stones.forEach(s => s.paint('hl')); this.lit = f > 0 ? k : null; }
        });
      } },

    { id: 'B12', act: 'Our species', dur: 6, claims: 'C15', cut: true, sky: 'day',
      stat: { value: 60000, suffix: '–70,000', label: 'years ago', still: true },
      caption: 'Our species spreads out of Africa.',
      labels: [label('Africa', P.mapAfrica, 0.05, 1), label('Europe', P.mapEurope, 0.6, 1), label('Asia', P.mapAsia, 0.75, 1)],
      cam: { from: { target: W.onMap(42, 20), az: -100, el: 58, dist: 230 }, to: { target: W.onMap(70, 30), az: -94, el: 52, dist: 290 } },
      setup() { W.rest(); },
      update(t) {
        const f = E.span(t, 0.1, 0.95);
        dotsUpTo(W.routes.sapiensWest, f); walkRoute('sapiensWest', f);
        dotsUpTo(W.routes.sapiensEast, f * 0.45); walkRoute('sapiensEast', f * 0.45);
        dotsUpTo(W.routes.sapiensNorth, f * 0.25); walkRoute('sapiensNorth', f * 0.25);
      } },

    { id: 'B13', act: 'Our species', dur: 5, claims: 'C16', sky: 'day',
      stat: date(50000, 0, 'about '),
      caption: 'People reach Australia, and the Americas by at least 15,000 years ago.',
      labels: [label('Australia', P.mapAustralia, 0.35, 1), label('Americas', P.mapAmericas, 0.8, 1)],
      cam: { from: { target: W.onMap(70, 30), az: -94, el: 52, dist: 290 }, to: { target: W.onMap(160, 20), az: -96, el: 54, dist: 360 } },
      setup() { W.rest(); dotsUpTo(W.routes.sapiensWest, 1); },
      update(t) {
        const e = 0.45 + 0.55 * E.span(t, 0, 0.55), n = 0.25 + 0.75 * E.span(t, 0.3, 0.95);
        dotsUpTo(W.routes.sapiensEast, e); walkRoute('sapiensEast', e);
        dotsUpTo(W.routes.sapiensNorth, n); walkRoute('sapiensNorth', n);
      } },

    { id: 'B14', act: 'Our species', dur: 5, claims: 'C17', cut: true, sky: 'day',
      key: "1 bead = 1% of a person's DNA",
      stat: { value: 2, prefix: '1 to ', suffix: '%', label: 'Neanderthal', still: true },
      caption: 'in people of non-African descent today.',
      cam: t => {
        // close on the chest, looking slightly up at the loop of beads
        const p = W.traveller.locate(W.necklace, [0, -0.04, -0.1]);
        return F.lerpCamera(F.camera({ target: p, az: -104, el: -4, dist: 0.75 }), F.camera({ target: p, az: -90, el: -2, dist: 0.5 }), E.smooth(t));
      },
      setup() { W.rest(); },
      update(t) {
        W.necklace.beads[50].paint(t > 0.3 ? 'hl' : 'paper');
        W.necklace.beads[51].paint(t > 0.55 ? 'hlSoft' : 'paper');
      } },

    { id: 'B15', dur: 4, sky: 'dawn',
      card: { title: 'Upright first, big brains later, and a young species.', sub: 'Seven million years, one path' },
      cam: { from: { target: [380, 0, 0], az: -100, el: 30, dist: 120 }, to: { target: [250, 0, 0], az: -95, el: 42, dist: 340 } },
      setup() { W.rest(); } }
  ];
};
