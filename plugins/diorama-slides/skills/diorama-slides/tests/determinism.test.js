// node --test plugins/explainer-video/skills/explainer-video/tests/determinism.test.js
//
// Every frame is a pure function of t: painting frame n gives the same draw
// calls whether frames are visited in order, reversed or shuffled.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { load, mockCtx, FIXTURE_SPEC } = require('./harness');

function frames(order, spec) {
  const w = load();
  const C = w.Motion.compile(spec || FIXTURE_SPEC(), 'main', { measure: mockCtx() });
  const out = {};
  for (const n of order(C.frames)) {
    const log = [];
    w.Motion.seek(mockCtx(log), C, n / C.fps);
    out[n] = log.join('\n');
  }
  return { out, N: C.frames };
}

const seq = N => Array.from({ length: N }, (_, i) => i);
const shuffled = N => {
  const a = seq(N);
  let s = 12345;
  for (let i = a.length - 1; i > 0; i--) { s = (s * 1103515245 + 12345) % 2147483648; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

test('same frame, same draw calls, in any visiting order', () => {
  const fwd = frames(seq);
  const rev = frames(N => seq(N).reverse());
  const shuf = frames(shuffled);
  for (let n = 0; n < fwd.N; n++) {
    assert.strictEqual(rev.out[n], fwd.out[n], `frame ${n} differs reversed`);
    assert.strictEqual(shuf.out[n], fwd.out[n], `frame ${n} differs shuffled`);
  }
});

test('painting the same t twice in one context gives the same calls (no carried state)', () => {
  const w = load();
  const C = w.Motion.compile(FIXTURE_SPEC(), 'main', { measure: mockCtx() });
  const t = C.duration * 0.37;
  const a = [], b = [];
  const ctx = mockCtx(a);
  w.Motion.seek(ctx, C, t);
  w.Motion.seek(ctx, C, C.duration * 0.9);
  const ctx2 = mockCtx(b);
  w.Motion.seek(ctx2, C, t);
  assert.strictEqual(a.slice(0, b.length).join('\n'), b.join('\n'));
});

test('save and restore are balanced on every frame', () => {
  const w = load();
  const C = w.Motion.compile(FIXTURE_SPEC(), 'main', { measure: mockCtx() });
  for (let n = 0; n < C.frames; n += 3) {
    const log = [];
    w.Motion.seek(mockCtx(log), C, n / C.fps);
    const s = log.filter(l => l.startsWith('save(')).length, r = log.filter(l => l.startsWith('restore(')).length;
    assert.strictEqual(s, r, `frame ${n}`);
  }
});

test('the seeded rng is stable per key and independent of call order', () => {
  const M = load({ scenes: [] }).Motion;
  const a = M.rng(7, 'scene', 'el', 3)(), b = M.rng(7, 'scene', 'el', 3)();
  assert.strictEqual(a, b);
  M.rng(7, 'other')();
  assert.strictEqual(M.rng(7, 'scene', 'el', 3)(), a);
  assert.notStrictEqual(M.rng(8, 'scene', 'el', 3)(), a);
});

test('t = duration is never drawn: seek clamps into [0, D)', () => {
  const w = load();
  const C = w.Motion.compile(FIXTURE_SPEC(), 'main', { measure: mockCtx() });
  const a = [], b = [];
  w.Motion.seek(mockCtx(a), C, C.duration);
  w.Motion.seek(mockCtx(b), C, C.duration - 1e-9);
  assert.strictEqual(a.join('\n'), b.join('\n'));
});
