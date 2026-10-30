// Samples: how much care each tier gets (references/cast.md § How much
// detail). The same kinds of thing built three ways, and two faults to
// avoid. These show technique; they are not parts for a film: a film's cast
// is built from its own document's nouns.
//
// Open with: sheet.html?cast=samples/tiers.js
(function () {
  const F = Film;
  const tones = ['n1', 'n2a', 'n0a', 'n2'];

  // ── people ──
  const background = s => F.figure({ height: 1.62 + (s % 4) * 0.06, colors: { top: tones[s % 4], bottom: ['n3', 'n4'][s % 2], skin: 'n2a' } });

  // supporting: the plain body plus the one detail that says who they are
  function supporting() {
    return F.figure({
      height: 1.76, colors: { top: 'n1', bottom: 'n4', skin: 'n2a' },
      dress(b, d) {
        // a hard hat: a dome with a brim, clearly larger than the head
        b.head.lathe([[d.head * 1.32, 0], [d.head * 1.28, d.head * 0.08], [d.head * 1.1, d.head * 0.12], [d.head * 1.06, d.head * 0.6], [d.head * 0.62, d.head * 1.05], [0.0001, d.head * 1.18]],
          { at: [0, 0, d.head * 1.02], color: 'paper', seg: 28 });
        // a hi-vis band across the torso, in the torso's own shape, a few mm proud
        b.torso.rounded([d.shoulders * 2.06, d.depth * 2.08, d.torso * 0.16], { at: [0, 0, d.torso * 0.45], round: 0.42, color: 'n3' });
      }
    });
  }

  // hero: hands and shoes, hair with volume, a jacket over the torso with a
  // collar, trousers that meet the shoes, a held object placed by reach, and
  // a weight shift so the figure isn't standing to attention
  function hero() {
    const fig = F.figure({
      height: 1.74, hand: 0.03, foot: 0.085,
      colors: { top: 'n0a', bottom: 'n4', skin: 'n2a', shoes: 'n6' },
      dress(b, d) {
        b.head.lathe([[d.head * 1.07, 0], [d.head * 1.09, d.head * 0.4], [d.head * 0.95, d.head * 0.82], [d.head * 0.55, d.head * 1.06], [0.0001, d.head * 1.14]],
          { at: [0, d.head * 0.06, d.head * 0.98], color: 'n5', seg: 32, name: 'hair' });
        // jacket: a second, slightly larger soft block over the shirt, open at the front
        b.torso.rounded([d.shoulders * 2.12, d.depth * 2.2, d.torso * 0.94], { at: [0, d.depth * 0.06, -d.head * 0.22], round: 0.4, color: 'n2', name: 'jacket' });
        b.torso.box([d.shoulders * 0.5, 0.006, d.torso * 0.8], { at: [0, -d.depth * 1.12, d.torso * 0.02], color: 'n0a' });
        b.torso.rounded([d.shoulders * 1.1, d.depth * 1.7, d.head * 0.4], { at: [0, d.depth * 0.08, d.torso - d.head * 0.18], round: 0.6, color: 'n2' });
        for (const s of ['L', 'R']) {
          b['shoulder' + s].capsule(d.armRadius * 1.08, d.upperArm + d.armRadius * 1.2, { at: [0, 0, d.armRadius * 0.6], rot: [180, 0, 0], color: 'n2' });
          b['elbow' + s].capsule(d.armRadius, d.foreArm * 0.85, { at: [0, 0, d.armRadius * 0.5], rot: [180, 0, 0], color: 'n2' });
        }
      }
    });
    fig.pose({ legL: [4, 3], legR: [-3, -2], kneeL: 8, spine: -2, head: [4, 12], armL: [6, 6], armR: [40, 4], elbowR: 70 });
    const board = fig.bones.handR.group({ at: [0.02, -0.06, -0.04], rot: [-40, 0, 0] });
    board.box([0.23, 0.012, 0.31], { bevel: 0.006, color: 'n6' });
    board.decal(0.2, 0.26, (c, w, h) => { c.fillStyle = F.hex('paper'); c.fillRect(0, 0, w, h); c.fillStyle = F.hex('n2'); for (let i = 0; i < 5; i++) c.fillRect(w * 0.12, h * (0.18 + i * 0.14), w * (i === 4 ? 0.4 : 0.76), h * 0.04); }, { at: [0, -0.008, 0], px: 1200, key: 'sample-board' });
    return fig;
  }

  // ── a crate ──
  function crateBackground() { const g = F.group(); g.box([0.6, 0.45, 0.4], { bevel: 0.025, color: 'n2a' }); return g; }
  function crateHero() {
    const g = F.group(), w = 0.6, d = 0.45, h = 0.4, t = 0.035, bev = 0.006;
    g.tray([w - 0.02, d - 0.02, h - 0.01], { wall: 0.012, color: 'n3' });                                          // the dark inside
    for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.box([t, t, h], { at: [x * (w - t) / 2, y * (d - t) / 2, 0], bevel: bev, color: 'n1' });
    for (let i = 0; i < 3; i++) {
      const z = 0.03 + i * 0.125;
      g.box([w - 2 * t, 0.014, 0.09], { at: [0, -(d / 2) + 0.007, z], bevel: bev, color: 'n0a' });
      g.box([w - 2 * t, 0.014, 0.09], { at: [0, (d / 2) - 0.007, z], bevel: bev, color: 'n0a' });
      g.box([0.014, d - 2 * t, 0.09], { at: [-(w / 2) + 0.007, 0, z], bevel: bev, color: 'n0a' });
      g.box([0.014, d - 2 * t, 0.09], { at: [(w / 2) - 0.007, 0, z], bevel: bev, color: 'n0a' });
    }
    g.decal(0.16, 0.07, (c, cw, ch) => { c.fillStyle = F.hex('paper'); c.fillRect(0, 0, cw, ch); c.fillStyle = F.hex('n4'); c.fillRect(cw * 0.1, ch * 0.35, cw * 0.8, ch * 0.3); }, { at: [0.12, -d / 2 - 0.002, 0.2], px: 1000, key: 'sample-label' });
    return g;
  }

  // ── a tree ──
  function treeBackground(seed) { const g = F.group(); g.cylinder(0.16, 2.2, { seg: 6, color: 'n3' }); g.facet([2.4, 2.4, 2.2], { at: [0, 0, 1.7], seed, jitter: 0.06, color: 'n2a' }); return g; }
  function treeHero() {
    const g = F.group();
    g.cylinder(0.22, 2.6, { top: 0.15, seg: 12, color: 'n3' });
    g.rod([0, 0, 1.9], [0.9, 0.2, 3.0], 0.08, { color: 'n3' });
    g.rod([0, 0, 2.2], [-0.8, -0.3, 3.2], 0.07, { color: 'n3' });
    g.facet([2.4, 2.2, 2.0], { at: [0, 0, 2.7], detail: 1, seed: 3, jitter: 0.05, color: 'n2a' });
    g.facet([1.6, 1.5, 1.4], { at: [0.95, 0.25, 2.6], detail: 1, seed: 5, jitter: 0.05, color: 'n2' });
    g.facet([1.5, 1.4, 1.3], { at: [-0.85, -0.3, 2.8], detail: 1, seed: 8, jitter: 0.05, color: { mix: ['n2a', 'n1', 0.4] } });
    return g;
  }

  // ── a building ──
  function bands(g, w, d, h) {
    const draw = (c, pw, ph) => { const rows = Math.round(h / 3.4); c.fillStyle = F.hex('n2'); for (let i = 0; i < rows; i++) c.fillRect(pw * 0.06, ph * (i + 0.32) / rows, pw * 0.88, ph * 0.36 / rows); };
    g.decal(w - 1, h - 3, draw, { at: [0, -d / 2 - 0.03, h / 2 + 1.2], px: 8, key: 'sb' + w + h });
    g.decal(d - 1, h - 3, draw, { at: [w / 2 + 0.03, 0, h / 2 + 1.2], rot: 90, px: 8, key: 'sb' + d + h });
  }
  function buildingBackground() { const g = F.group(); g.box([14, 12, 24], { bevel: 0.35, color: 'paper' }); bands(g, 14, 12, 24); return g; }
  function buildingSupporting() {
    const g = F.group();
    g.box([14, 12, 24], { bevel: 0.35, color: 'paper' }); bands(g, 14, 12, 24);
    g.box([6, 3, 0.4], { at: [0, -7.4, 3.2], bevel: 0.12, color: 'n0a' });            // an entrance canopy
    g.box([4.4, 0.2, 3], { at: [0, -6.02, 0], color: 'n6' });                           // the doors, dark
    g.box([4, 3.5, 1.8], { at: [2.5, 1.5, 24], bevel: 0.2, color: 'n1' });              // plant on the roof
    return g;
  }

  // ── faults to avoid ──
  function faultFace() {
    // features stuck on a plain round head: they read as goggles, not a face
    return F.figure({ dress(b, d) { b.head.rounded([d.head * 1.4, d.head * 0.4, d.head * 0.25], { at: [0, -d.head * 0.82, d.head * 1.12], round: 0.6, color: 'n2' }); } });
  }
  function faultFacets() { const g = F.group(); g.facet([1.2, 1, 0.9], { detail: 0, seed: 2, jitter: 0.3, color: 'n2' }); return g; }

  window.CAST_TITLE = 'Samples: how much detail at each tier';
  window.CAST = [
    { name: 'person · background', note: 'a crowd: the plain body, varied', make: () => { const g = F.group(); for (let i = 0; i < 6; i++) g.add(background(i), { at: [(i % 3) * 0.7, Math.floor(i / 3) * 0.7, 0] }); return g; } },
    { name: 'person · supporting', note: 'plain body + one telling detail', make: supporting },
    { name: 'person · hero', note: 'hands, shoes, layers, a held thing, a weight shift', make: hero },
    { name: 'crate · background', note: 'one bevelled block', make: crateBackground },
    { name: 'crate · hero', note: 'posts, slats, a dark inside, a label', make: crateHero },
    { name: 'tree · background', note: 'trunk + one lump, low jitter', make: () => treeBackground(2) },
    { name: 'tree · hero', note: 'branches, three lumps in two tones', make: treeHero },
    { name: 'building · background', note: 'block + window bands', make: buildingBackground },
    { name: 'building · supporting', note: '+ entrance, doors, roof plant', make: buildingSupporting },
    { name: 'avoid · features on a round head', note: 'reads as goggles', make: faultFace },
    { name: 'avoid · jagged facets up close', note: 'jitter 0.3, detail 0', make: faultFacets }
  ];
})();
