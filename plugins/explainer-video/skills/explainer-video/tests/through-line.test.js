// node --test plugins/explainer-video/skills/explainer-video/tests/through-line.test.js
//
// The through-line is a progress bar fixed along the top of the safe area:
// it never moves up or down between scenes, and its fill only grows.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { load, mockCtx, FIXTURE_SPEC } = require('./harness');

// The bar's fill is the subject-coloured fillRect starting at the safe area's left edge.
function barFills(C, w, n) {
  const log = [];
  w.Motion.seek(mockCtx(log), C, n / C.fps);
  const re = /^fillRect\(([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+)\)\|[\d.]+\|([^|]+)\|/;
  return log.map(l => re.exec(l)).filter(m => m && m[5] === C.design.subject && +m[1] === C.safe.x)
    .map(m => ({ y: +m[2], w: +m[3], h: +m[4] }));
}

for (const cut of ['main', 'short']) {
  test(`bar stays at the top of the safe area on every frame (${cut})`, () => {
    const w = load();
    const C = w.Motion.compile(FIXTURE_SPEC(), cut, { measure: mockCtx() });
    const R = w.Motion.layout.RULE;
    let last = 0, seen = 0;
    for (let n = 0; n < C.frames; n++) {
      const bars = barFills(C, w, n).filter(b => b.h >= R.accentH && b.w <= C.safe.w + 1e-6);
      bars.forEach(b => {
        assert.strictEqual(b.y, C.safe.y, `frame ${n}: bar at y=${b.y}, not the safe top ${C.safe.y}`);
        assert.ok(b.w + 1e-6 >= last, `frame ${n}: fill shrank from ${last} to ${b.w}`);
        last = b.w; seen++;
      });
    }
    assert.ok(seen > C.frames / 2, 'the bar is drawn on most frames');
  });
}

test('morph-bar swells the bar in place and nothing else moves it', () => {
  const spec = FIXTURE_SPEC();
  spec.scenes[1].transitionIn = 'morph-bar';
  const w = load();
  const C = w.Motion.compile(spec, 'main', { measure: mockCtx() });
  const R = w.Motion.layout.RULE;
  const hook = C.scenes[1];
  const mid = Math.round((hook.t0 + hook.ovIn / 2) * C.fps);
  const bars = barFills(C, w, mid);
  assert.ok(bars.length, 'bar drawn mid-transition');
  assert.ok(bars[0].h > R.accentH * 1.5, `swollen to ${bars[0].h}`);
  assert.strictEqual(bars[0].y, C.safe.y);
});
