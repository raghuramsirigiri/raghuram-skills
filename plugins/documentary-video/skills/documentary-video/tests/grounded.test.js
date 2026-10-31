// node --test plugins/documentary-video/skills/documentary-video/tests/grounded.test.js
//
// No figure floats. For every beat of the human-evolution film, at its start,
// middle and end, each visible figure's body (not what its hands hold) must
// touch the ground: a standing or walking figure on its feet, a seated one on
// its seat. Raghuram caught both faults on screen: a spear planted instead of
// the feet, and a chair pose with no chair.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

globalThis.window = globalThis;
const LIB = path.join(__dirname, '..', 'assets', 'film-lib');
for (const f of ['theme.js', 'geom.js', 'scene.js', 'rig.js', 'film.js']) require(path.join(LIB, f));
const FILM = path.join(__dirname, '..', 'evals', 'fixtures', 'human-evolution', 'film');
for (const f of ['cast.js', 'world.js', 'shots.js']) require(path.join(FILM, f));
const { Film } = globalThis, M = Film.M;

function bodyLow(fig, W) {
  const held = new Set([fig.bones.handL, fig.bones.handR]);
  let lo = Infinity;
  (function v(g, Wg) {
    if (held.has(g)) return;
    for (const c of g.children) {
      const Wc = M.mul(Wg, c.matrix);
      if (c.children) { if (c.visible !== false) v(c, Wc); continue; }
      if (c.name === 'spot' || c.visible === false) continue;
      const bb = c.geom.bounds;
      for (let k = 0; k < 8; k++) lo = Math.min(lo, M.point(Wc, [k & 1 ? bb.hi[0] : bb.lo[0], k & 2 ? bb.hi[1] : bb.lo[1], k & 4 ? bb.hi[2] : bb.lo[2]])[2]);
    }
  })(fig, W);
  return lo;
}

test('every visible figure touches the ground in every beat', () => {
  const W = window.buildWorld(), beats = window.buildShots(W);
  const off = [];
  for (const b of beats) for (const t of [0, 0.5, 1]) {
    if (b.setup) b.setup();
    if (b.update) b.update(t, t * b.dur);
    (function visit(n, Wn) {
      if (n.visible === false) return;
      const Wx = M.mul(Wn, n.matrix);
      if (n.bones) {
        const lo = bodyLow(n, Wx), ground = Wx[14];   // the figure's own feet-level (it may stand on a map)
        if (Math.abs(lo - ground) > 0.03) off.push(b.id + '@' + t + ' ' + n.name + ' ' + (lo - ground).toFixed(3) + ' m');
        if (n.floating) off.push(b.id + '@' + t + ' ' + n.name + ' sits on nothing');
      }
      for (const c of n.children || []) if (c.children) visit(c, Wx);
    })(W.root, M.identity());
  }
  assert.deepStrictEqual(off, []);
});
