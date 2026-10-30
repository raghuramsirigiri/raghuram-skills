// node --test plugins/documentary-video/skills/documentary-video/tests/film-lib-shapes.test.js
//
// The shapes and helpers added after the first cast gate: tube, loft, torus,
// round solids laid on their side, glass, locate and reach.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

globalThis.window = globalThis;
const LIB = path.join(__dirname, '..', 'assets', 'film-lib');
for (const f of ['theme.js', 'geom.js', 'scene.js', 'rig.js']) require(path.join(LIB, f));
const { Film } = globalThis;
const near = (a, b, eps) => Math.abs(a - b) <= eps;

test('a tube follows its path with its radius', () => {
  const g = Film.geom.tube([[0, 0, 0], [1, 0, 0.5], [2, 0, 0]], 0.05);
  assert.ok(near(g.bounds.lo[0], 0, 0.06) && near(g.bounds.hi[0], 2, 0.06), JSON.stringify(g.bounds));
  assert.ok(near(g.bounds.hi[2], 0.55, 0.02));
  const short = Film.group();
  short.tube([[0, 0, 0], [0.01, 0, 0]], 0.05);   // shorter than it is thick: a rod refuses, a tube doesn't
  assert.ok(short.bounds().hi[0] > 0);
});

test('a loft along x passes through every section', () => {
  const sq = s => [[-s, 0], [s, 0], [s, s], [-s, s]];
  const g = Film.geom.loft([[0, sq(0.2)], [3, sq(1)], [6, sq(0.4)]], 'x');
  assert.ok(near(g.bounds.lo[0], 0, 1e-6) && near(g.bounds.hi[0], 6, 1e-6));
  assert.ok(near(g.bounds.hi[1], 1, 1e-6) && near(g.bounds.hi[2], 1, 1e-6));
  assert.throws(() => Film.geom.loft([[0, sq(1)], [1, [[0, 0], [1, 0], [0, 1]]]]), /same number of points/);
});

test('a torus has its outer radius and its thickness', () => {
  const g = Film.geom.torus(0.3, 0.05);
  assert.ok(near(g.bounds.hi[0], 0.35, 1e-6) && near(g.bounds.hi[2], 0.05, 1e-6));
});

test('axis lays a cylinder on its side, centred on its at', () => {
  const g = Film.group();
  g.cylinder(0.3, 0.2, { axis: 'y', at: [0, 0, 0.3] });
  const b = g.bounds();
  assert.ok(near(b.lo[1], -0.1, 1e-6) && near(b.hi[1], 0.1, 1e-6), 'runs along y, centred');
  assert.ok(near(b.lo[2], 0, 1e-6) && near(b.hi[2], 0.6, 1e-6), 'a wheel standing on the ground');
});

test('glass casts no shadow', () => {
  const m = Film.group().box([1, 1, 1], { opacity: 0.3 });
  assert.strictEqual(m.shadow, false);
});

test('locate finds a posed joint, and reach puts the hand on a point', () => {
  const f = Film.figure();
  const home = f.locate('handL');
  assert.ok(home[2] > 0.5 && home[2] < 1, 'a hanging hand at hip height: ' + home);
  const target = [0.2, -0.45, 1.1];
  const left = f.reach('L', target);
  assert.ok(left < 0.02, 'distance left ' + left);
  const h = f.locate('handL');
  assert.ok(Film.V.len(Film.V.sub(h, target)) < 0.02);
  f.reach('R', [-0.1, -0.45, 1.0]);
  assert.ok(Film.V.len(Film.V.sub(f.locate('handL'), target)) < 0.02, 'the second reach keeps the first hand');
});

test('axis on an extrude orients its outline once, not twice', () => {
  const g = Film.group();
  g.extrude([[-1, 0], [1, 0], [0, 1]], 4, { axis: 'x' });
  const b = g.bounds();
  assert.ok(near(b.lo[0], -2, 1e-6) && near(b.hi[0], 2, 1e-6) && near(b.hi[2], 1, 1e-6), JSON.stringify(b));
});

test('a bevelled box keeps its size and closes its surface', () => {
  const g = Film.geom.box(2, 1, 3, 0.1);
  assert.deepStrictEqual(g.bounds.lo.map(v => +v.toFixed(6)), [-1, -0.5, 0]);
  assert.deepStrictEqual(g.bounds.hi.map(v => +v.toFixed(6)), [1, 0.5, 3]);
  assert.strictEqual(g.count, (6 * 2 + 12 * 2 + 8) * 3, '6 faces, 12 edge bevels, 8 corners');
});

test('a facet lump sits on the ground, keeps its seed, and points its faces out', () => {
  const a = Film.geom.facet(2, 2, 1.5, { seed: 3 }), b = Film.geom.facet(2, 2, 1.5, { seed: 3 });
  assert.ok(near(a.bounds.lo[2], 0, 1e-6) && a.bounds.hi[2] > 1.2);
  assert.deepStrictEqual(Array.from(a.pos), Array.from(b.pos));
  assert.strictEqual(Film.geom.facet(1, 1, 1, { detail: 0 }).count, 60);
  for (let i = 0; i < a.pos.length; i += 9) {
    const c = [0, 1, 2].map(k => (a.pos[i + k] + a.pos[i + 3 + k] + a.pos[i + 6 + k]) / 3);
    assert.ok(a.nrm[i] * c[0] + a.nrm[i + 1] * c[1] + a.nrm[i + 2] * (c[2] - 0.75) > 0);
  }
});
