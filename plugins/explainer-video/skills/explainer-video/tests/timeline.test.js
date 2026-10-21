// node --test plugins/explainer-video/skills/explainer-video/tests/timeline.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { load, mockCtx, FIXTURE_SPEC } = require('./harness');

function compile(spec, cut) {
  const w = load();
  return { C: w.Motion.compile(spec, cut, { measure: mockCtx() }), M: w.Motion };
}

test('duration is a whole number of frames and frames = round(D * fps)', () => {
  const { C } = compile(FIXTURE_SPEC(), 'main');
  assert.strictEqual(C.frames, Math.round(C.duration * C.fps));
  assert.ok(Math.abs(C.duration * C.fps - C.frames) < 1e-9);
});

test('scenes overlap by exactly their incoming transition', () => {
  const { C, M } = compile(FIXTURE_SPEC(), 'main');
  for (let i = 1; i < C.scenes.length; i++) {
    const a = C.scenes[i - 1], b = C.scenes[i];
    assert.ok(Math.abs(a.t1 - b.t0 - (a.t1 - a.cEnd)) < 1e-9);
    assert.ok(Math.abs((a.t1 - b.t0) - M.transitions.get(b.spec.transitionIn).dur) < 1e-9);
  }
});

test('the first scene starts at 0 with no transition in', () => {
  const { C } = compile(FIXTURE_SPEC(), 'main');
  assert.strictEqual(C.scenes[0].t0, 0);
  assert.strictEqual(C.scenes[0].ovIn, 0);
});

test('auto durations grow with word count (read-time rule)', () => {
  const a = FIXTURE_SPEC(), b = FIXTURE_SPEC();
  b.scenes[0].copy.title = 'Water use fell sharply across the whole of the valley this winter';
  const da = compile(a, 'main').C.scenes[0].dur, db = compile(b, 'main').C.scenes[0].dur;
  assert.ok(db > da + 1, `${da} vs ${db}`);
});

test('read-time formula: max(1.2, 0.6 + 0.3 per word)', () => {
  const M = load({ scenes: [] }).Motion;
  assert.strictEqual(M.readTime(1), 1.2);
  assert.ok(Math.abs(M.readTime(7) - 2.7) < 1e-9);
});

test('a numeric dur below the minimum fails, naming the scene', () => {
  const s = FIXTURE_SPEC();
  s.scenes[1].dur = 0.8;
  assert.throws(() => compile(s, 'main'), /scene "hook": dur 0.8 s is below its minimum/);
});

test('a numeric dur above the minimum is kept as the content length', () => {
  const s = FIXTURE_SPEC();
  s.scenes[1].dur = 9;
  const { C } = compile(s, 'main');
  assert.strictEqual(C.scenes[1].dur, 9);
});

test('the big number holds at least 1.5 s after its counter lands', () => {
  const { C } = compile(FIXTURE_SPEC(), 'main');
  const hook = C.scenes.find(s => s.id === 'hook');
  const counter = hook.layers.find(l => l.kind === 'counter');
  const landed = hook.cStart + counter.at + counter.dur;
  assert.ok(hook.exitStart - landed >= 1.5 - 1e-9, `${hook.exitStart - landed}`);
});

test('the last scene has no exit and holds at least 1 s', () => {
  const { C } = compile(FIXTURE_SPEC(), 'main');
  const last = C.scenes[C.scenes.length - 1];
  assert.strictEqual(last.exit, 0);
  assert.ok(C.duration - last.enterEnd >= 1);
});

test('a transition that owns the exit skips the outgoing exit', () => {
  const { C } = compile(FIXTURE_SPEC(), 'main');
  const hook = C.scenes.find(s => s.id === 'hook');   // followed by flood
  const ctx = C.scenes.find(s => s.id === 'ctx');     // followed by mask-up
  assert.strictEqual(hook.exit, 0);
  assert.ok(ctx.exit > 0);
});

test('unknown claim, scene, type and cut fail with readable errors', () => {
  let s = FIXTURE_SPEC(); s.scenes[1].copy.value = 'F9';
  assert.throws(() => compile(s, 'main'), /unknown claim "F9"/);
  s = FIXTURE_SPEC(); s.cuts.main.scenes.push('nope');
  assert.throws(() => compile(s, 'main'), /no scene with id "nope"/);
  s = FIXTURE_SPEC(); s.scenes[0].type = 'spinning-logo';
  assert.throws(() => compile(s, 'main'), /unknown type "spinning-logo"/);
  assert.throws(() => compile(FIXTURE_SPEC(), 'long'), /no cut named "long"/);
});

test('two cuts compile from one spec with their own formats', () => {
  const s = FIXTURE_SPEC();
  const a = compile(s, 'main').C, b = compile(s, 'short').C;
  assert.strictEqual(a.format, '9:16'); assert.strictEqual(b.format, '1:1');
  assert.ok(b.duration < a.duration);
});

test('claim ids in copy resolve to their display text', () => {
  const s = FIXTURE_SPEC();
  s.scenes[0].copy.title = 'Use fell {F1} this winter';
  const { C } = compile(s, 'main');
  const head = C.scenes[0].layers.find(l => l.id === 'headline');
  assert.match(head.lines.map(l => l.text).join(' '), /Use fell 12% this winter/);
  assert.strictEqual(JSON.stringify(C.scenes[0].used), '["F1"]');
});
