// node --test plugins/explainer-video/skills/explainer-video/tests/ease.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness');

const E = load({ scenes: [] }).Motion.ease;

test('a critically damped spring never passes its target', () => {
  for (const w of [12, 20, 40]) {
    for (let t = 0; t <= 3; t += 0.001) assert.ok(E.spring(t, { w }) <= 1 + 1e-12, `w=${w} t=${t}`);
  }
});

test('a critically damped spring settles within 1% by about 6.6/w', () => {
  for (const w of [12, 20, 40]) assert.ok(1 - E.spring(6.64 / w, { w }) < 0.01, `w=${w}`);
});

test('an underdamped spring overshoots, which is why data never uses one', () => {
  let max = 0;
  for (let t = 0; t <= 2; t += 0.001) max = Math.max(max, E.spring(t, { w: 20, zeta: 0.8 }));
  assert.ok(max > 1);
});

test('springSum is continuous at each retarget', () => {
  const ch = [{ t: 0, from: 0, to: 10 }, { t: 0.3, from: 10, to: 4 }, { t: 0.7, from: 4, to: 8 }];
  for (const c of ch) {
    const a = E.springSum(c.t - 1e-6, ch), b = E.springSum(c.t + 1e-6, ch);
    assert.ok(Math.abs(a - b) < 1e-3, `jump at ${c.t}: ${a} vs ${b}`);
  }
  assert.ok(Math.abs(E.springSum(5, ch) - 8) < 1e-6);
});

test('cubicBezier matches known points', () => {
  const lin = E.cubicBezier(0, 0, 1, 1);
  [0, 0.25, 0.5, 0.75, 1].forEach(x => assert.ok(Math.abs(lin(x) - x) < 1e-5));
  const ease = E.cubicBezier(0.25, 0.1, 0.25, 1);   // CSS "ease"
  assert.ok(Math.abs(ease(0.5) - 0.8024) < 2e-3, String(ease(0.5)));
  assert.strictEqual(E.outQuint(0), 0);
  assert.strictEqual(E.outQuint(1), 1);
});

test('expo eases are monotonic and pinned at 0 and 1', () => {
  for (const f of [E.expoIn, E.expoOut, E.expoInOut]) {
    assert.strictEqual(f(0), 0); assert.strictEqual(f(1), 1);
    let prev = -1;
    for (let t = 0; t <= 1; t += 0.01) { const v = f(t); assert.ok(v >= prev); prev = v; }
  }
});
