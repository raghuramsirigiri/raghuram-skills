// node --test plugins/explainer-video/skills/explainer-video/tests/through-line.test.js
//
// The through-line is the card's short accent bar, fixed at the top-left of
// the safe area: the same place and size on every scene, through every
// transition. It draws in on the first scene, morph-bar stretches it along the
// top in place, and it shrinks away into a scene without one (the outro).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { load, mockCtx, FIXTURE_SPEC } = require('./harness');

// The bar is the subject-coloured fillRect starting at the safe area's left edge.
function bars(C, w, t) {
  const log = [];
  w.Motion.seek(mockCtx(log), C, t);
  const re = /^fillRect\(([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+)\)\|[\d.]+\|([^|]+)\|/;
  return log.map(l => re.exec(l)).filter(m => m && m[5] === C.design.subject && +m[1] === C.safe.x)
    .map(m => ({ y: +m[2], w: +m[3], h: +m[4] }));
}
const inTransition = (C, t) => C.scenes.some(s => s.index > 0 && t >= s.t0 && t < s.t0 + s.ovIn);

for (const cut of ['main', 'short']) {
  test(`the bar sits at the top-left of the safe area, at one size, on every frame (${cut})`, () => {
    const w = load();
    const C = w.Motion.compile(FIXTURE_SPEC(), cut, { measure: mockCtx() });
    const R = w.Motion.layout.RULE;
    let seen = 0;
    for (let n = 0; n < C.frames; n++) {
      const t = n / C.fps;
      for (const b of bars(C, w, t)) {
        assert.strictEqual(b.y, C.safe.y, `frame ${n}: bar at y=${b.y}, not the safe top ${C.safe.y}`);
        assert.strictEqual(b.h, R.accentH, `frame ${n}: bar ${b.h}px tall`);
        assert.ok(b.w <= R.accentW + 1e-6, `frame ${n}: bar ${b.w}px wide, wider than the accent bar`);
        if (t > 0.8 && !inTransition(C, t)) { assert.ok(Math.abs(b.w - R.accentW) < 1e-6, `frame ${n}: bar ${b.w}px wide on a still frame`); seen++; }
      }
    }
    assert.ok(seen > C.frames / 2, 'the bar is drawn at full size on most frames');
  });
}

test('the bar draws in from zero width on the first scene', () => {
  const w = load();
  const C = w.Motion.compile(FIXTURE_SPEC(), 'main', { measure: mockCtx() });
  const R = w.Motion.layout.RULE;
  const early = bars(C, w, 0.1)[0], later = bars(C, w, 0.7)[0];
  assert.ok(early && early.w < R.accentW * 0.9, 'part-drawn at 0.1 s');
  assert.ok(Math.abs(later.w - R.accentW) < 1e-6, 'full width by 0.7 s');
});

test('morph-bar stretches the bar along the top, in place, and it settles back', () => {
  const spec = FIXTURE_SPEC();
  spec.scenes[1].transitionIn = 'morph-bar';
  const w = load();
  const C = w.Motion.compile(spec, 'main', { measure: mockCtx() });
  const R = w.Motion.layout.RULE;
  const hook = C.scenes[1];
  const mid = bars(C, w, hook.t0 + hook.ovIn / 2)[0];
  assert.ok(mid.w > R.accentW * 3, `stretched to ${mid.w}`);
  assert.strictEqual(mid.y, C.safe.y);
  assert.strictEqual(mid.h, R.accentH);
  const after = bars(C, w, hook.cStart + 0.1)[0];
  assert.ok(Math.abs(after.w - R.accentW) < 1e-6, 'settled back after the transition');
});

test('the bar shrinks away into a scene without one (the outro)', () => {
  const spec = FIXTURE_SPEC();
  spec.scenes.push({ id: 'out', type: 'outro', copy: { name: 'Northvale Water Board' } });
  spec.cuts.main.scenes.push('out');
  const w = load();
  const C = w.Motion.compile(spec, 'main', { measure: mockCtx() });
  const R = w.Motion.layout.RULE;
  const out = C.scenes[C.scenes.length - 1];
  const mid = bars(C, w, out.t0 + out.ovIn / 2)[0];
  assert.ok(mid && mid.w > 0 && mid.w < R.accentW, `shrinking: ${mid && mid.w}`);
  assert.strictEqual(bars(C, w, out.cStart + 0.5).length, 0, 'gone on the outro');
});
