// node --test plugins/documentary-video/skills/documentary-video/tests/film-lib.test.js
//
// The parts of film-lib that don't need a GPU: matrices, the solids, groups,
// colours, framing and the rig's proportions. Rendering is checked in the
// browser with the contact sheet.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

globalThis.window = globalThis;
const LIB = path.join(__dirname, '..', 'assets', 'film-lib');
require(path.join(LIB, 'theme.js'));
require(path.join(LIB, 'geom.js'));
require(path.join(LIB, 'scene.js'));
require(path.join(LIB, 'rig.js'));
const { Film } = globalThis;
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

function area(g) {
  let s = 0;
  for (let i = 0; i < g.pos.length; i += 9) {
    const a = [g.pos[i], g.pos[i + 1], g.pos[i + 2]], b = [g.pos[i + 3], g.pos[i + 4], g.pos[i + 5]], c = [g.pos[i + 6], g.pos[i + 7], g.pos[i + 8]];
    s += Film.V.len(Film.V.cross(Film.V.sub(b, a), Film.V.sub(c, a))) / 2;
  }
  return s;
}

test('a matrix times its inverse is the identity', () => {
  const m = Film.M.trs([1, 2, 3], [10, 20, 30], [2, 3, 4]);
  const i = Film.M.mul(m, Film.M.invert(m));
  Film.M.identity().forEach((v, k) => assert.ok(near(i[k], v, 1e-9), 'cell ' + k));
});

test('a box is 12 triangles with the surface area of its six faces', () => {
  const g = Film.geom.box(2, 3, 4);
  assert.strictEqual(g.count, 36);
  assert.ok(near(area(g), 2 * (6 + 8 + 12), 1e-4));
  assert.deepStrictEqual(g.bounds, { lo: [-1, -1.5, 0], hi: [1, 1.5, 4] });
});

test('a concave outline extrudes with its true area (ear clipping)', () => {
  const L = [[0, 0], [2, 0], [2, 1], [1, 1], [1, 2], [0, 2]];   // area 3, perimeter 8
  const g = Film.geom.extrude(L, 1);
  assert.ok(near(area(g), 3 * 2 + 8 * 1, 1e-4), 'got ' + area(g));
});

test('extrude along x and y turns the outline upright', () => {
  const tri = [[-1, 0], [1, 0], [0, 1]];
  const gx = Film.geom.extrude(tri, 4, 'x');
  assert.deepStrictEqual(gx.bounds.lo.map(Math.round), [-2, -1, 0]);
  assert.deepStrictEqual(gx.bounds.hi.map(Math.round), [2, 1, 1]);
  const gy = Film.geom.extrude(tri, 4, 'y');
  assert.deepStrictEqual(gy.bounds.hi.map(Math.round), [1, 2, 1]);
});

test('lathe, cylinder, sphere and capsule have the sizes asked for', () => {
  const cy = Film.geom.cylinder(0.5, 0.5, 2);
  assert.ok(near(cy.bounds.hi[2], 2) && near(cy.bounds.hi[0], 0.5, 1e-6));
  const sp = Film.geom.sphere(1);
  assert.ok(near(sp.bounds.lo[2], -1, 1e-6) && near(sp.bounds.hi[2], 1, 1e-6));
  const ca = Film.geom.capsule(0.1, 1);
  assert.ok(near(ca.bounds.lo[2], 0, 1e-6) && near(ca.bounds.hi[2], 1, 1e-6));
});

test('solids refuse impossible sizes with a message naming the solid', () => {
  assert.throws(() => Film.geom.box(0, 1, 1), /Film\.box/);
  assert.throws(() => Film.geom.extrude([[0, 0], [1, 1]], 1), /Film\.extrude/);
  assert.throws(() => Film.geom.capsule(0.5, 0.5), /Film\.capsule/);
});

test('colour tokens come from the theme, and unknown ones fail', () => {
  assert.strictEqual(Film.hex('ground'), window.Charts.palette.n0.toLowerCase());
  assert.strictEqual(Film.hex('hl'), window.Charts.palette.s2.toLowerCase());
  assert.strictEqual(Film.hex('#abc'), '#aabbcc');
  assert.throws(() => Film.color('laptopGrey'), /unknown colour token/);
  assert.throws(() => Film.group().box([1, 1, 1], { color: 'nope' }), /unknown colour token/);
});

test('group bounds follow at, rot and scale through nesting', () => {
  const g = Film.group({ at: [10, 0, 0] });
  g.group({ rot: 90 }).box([2, 1, 1], { at: [0, 0, 1] });
  const b = g.bounds();
  assert.ok(near(b.lo[0], 9.5, 1e-9) && near(b.hi[0], 10.5, 1e-9));
  assert.ok(near(b.lo[1], -1, 1e-9) && near(b.hi[2], 2, 1e-9));
});

test('a rod runs from its first point to its second', () => {
  const g = Film.group();
  g.rod([0, 0, 0], [1, 1, 1], 0.05);
  const b = g.bounds();
  assert.ok(near(b.lo[0], -0.05, 0.02) && near(b.hi[0], 1.05, 0.02) && near(b.hi[2], 1.05, 0.02), JSON.stringify(b));
});

test('find and paint reach named parts', () => {
  const g = Film.group();
  g.group({ name: 'lid' }).box([1, 1, 0.1], { name: 'panel', color: 'n1' });
  assert.ok(g.find('lid'));
  g.paint('hl', 'panel');
  assert.strictEqual(g.find('panel').color, 'hl');
});

test('a framed camera sees all of the group', () => {
  const g = Film.group(); g.box([4, 1, 2]);
  const cam = Film.frame(g, { az: -60, el: 30, fov: 30, aspect: 1 });
  const R = Film.V.len(Film.V.sub(g.bounds().hi, g.bounds().lo)) / 2;
  assert.ok(Film.V.len(Film.V.sub(cam.eye, cam.target)) * Math.sin(15 * Math.PI / 180) >= R);
});

test('a figure is as tall as its spec, and a crouch makes it shorter', () => {
  for (const h of [1.1, 1.72, 1.95]) {
    const b = Film.figure({ height: h }).bounds();
    assert.ok(Math.abs(b.hi[2] - h) < h * 0.04, h + ' → ' + b.hi[2]);
    assert.ok(b.lo[2] > -0.01, 'feet on the ground');
  }
  const f = Film.figure();
  const tall = f.bounds().hi[2];
  f.pose({ crouch: 0.3, kneeL: 60, kneeR: 60, legL: [40, 0], legR: [40, 0] });
  assert.ok(f.bounds().hi[2] < tall - 0.25);
});

test('a figure exposes every bone to dress, and skip drops default parts', () => {
  let seen;
  const f = Film.figure({ skip: ['head'], dress: b => { seen = Object.keys(b); } });
  assert.deepStrictEqual(seen.sort(), Film.figure.bones.slice().sort());
  assert.strictEqual(f.bones.head.children.length, 0);
});

test('a forward arm swing moves the hand forward (-y)', () => {
  const f = Film.figure();
  f.pose({ armL: [80, 0] });
  const handY = f.locate('handL')[1];
  assert.ok(handY < -0.3, 'hand y ' + handY);
});

test('rounded and tray stand on the ground at the size asked for', () => {
  for (const g of [Film.geom.rounded(1, 0.6, 0.8, 0.3), Film.geom.tray(1, 0.6, 0.8, 0.04), Film.geom.tray(1, 0.6, 0.8, 0.04, '-y')]) {
    const b = g.bounds;
    assert.ok(near(b.lo[2], 0, 1e-6) && near(b.hi[2], 0.8, 1e-6) && near(b.hi[0], 0.5, 1e-6) && near(b.hi[1], 0.3, 1e-6), JSON.stringify(b));
  }
  assert.throws(() => Film.geom.tray(1, 1, 1, 0.6), /Film\.tray/);
});

test('rng repeats for the same seed', () => {
  const a = Film.rng(7), b = Film.rng(7);
  const xs = [a(), a(), a()];
  assert.deepStrictEqual(xs, [b(), b(), b()]);
  assert.ok(xs.every(x => x >= 0 && x < 1));
});
