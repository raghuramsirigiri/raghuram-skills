// node --test plugins/diorama-slides/skills/diorama-slides/tests/timeline.test.js
//
// The timeline: whole frames, beats overlapping by their transition, the one
// transition for the words (held longer when the stage changes), read time,
// and a card layer that never moves: the kicker and the headline start in
// the same place on every beat, in every format.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { load, mockCtx, FIXTURE_SPEC } = require('./harness');

function compile(spec, cut) {
  const w = load();
  return { C: w.Motion.compile(spec, cut, { measure: mockCtx() }), M: w.Motion };
}

test('duration is a whole number of frames', () => {
  const { C } = compile(FIXTURE_SPEC(), 'main');
  assert.strictEqual(C.frames, Math.round(C.duration * C.fps));
  assert.ok(Math.abs(C.duration * C.fps - C.frames) < 1e-9);
});

test('beats overlap by exactly their incoming transition; the first starts at 0', () => {
  const { C } = compile(FIXTURE_SPEC(), 'main');
  assert.strictEqual(C.scenes[0].t0, 0);
  assert.strictEqual(C.scenes[0].ovIn, 0);
  for (let i = 1; i < C.scenes.length; i++) {
    const a = C.scenes[i - 1], b = C.scenes[i];
    assert.ok(Math.abs((a.t1 - b.t0) - b.trIn.dur) < 1e-9);
  }
});

test('one transition for the words: a swap, held longer (travel) when story time changes', () => {
  const { C, M } = compile(FIXTURE_SPEC(), 'main');
  assert.deepStrictEqual(Object.keys(M.transitions.list).sort(), ['cut', 'swap', 'travel']);
  const [hook, mid, big, src] = C.scenes;
  assert.strictEqual(hook.trIn.name, 'cut');
  assert.strictEqual(mid.trIn.name, 'travel');
  assert.strictEqual(big.trIn.name, 'travel');
  assert.strictEqual(src.trIn.name, 'swap', 'the source card keeps story time, so the words only swap');
  assert.ok(mid.trIn.dur > src.trIn.dur);
  // The words do the same thing in both.
  assert.strictEqual(M.transitions.list.travel.reveal, M.transitions.list.swap.reveal);
  assert.strictEqual(M.transitions.list.travel.ownsExit, M.transitions.list.swap.ownsExit);
});

test('a spec\'s old transitionIn is ignored', () => {
  const s = FIXTURE_SPEC();
  s.scenes[1].transitionIn = 'flood';
  const { C } = compile(s, 'main');
  assert.strictEqual(C.scenes[1].trIn.name, 'travel');
});

test('a dur below a beat\'s minimum fails to compile, naming the beat', () => {
  const s = FIXTURE_SPEC();
  s.scenes[1].dur = 0.5;
  assert.throws(() => compile(s, 'main'), /scene "mid": dur 0.5 s is below its minimum/);
});

test('auto durations grow with the words, and every beat holds at least 2 s', () => {
  const a = FIXTURE_SPEC(), b = FIXTURE_SPEC();
  b.scenes[1].copy.title = 'The works grew across the whole of the valley that decade';
  const da = compile(a, 'main').C.scenes[1], db = compile(b, 'main').C.scenes[1];
  assert.ok(db.dur > da.dur);
  assert.ok(da.read >= 2);
});

for (const format of ['9:16', '4:5', '1:1', '16:9']) {
  test(format + ': the kicker and the headline start in the same place on every beat', () => {
    const s = FIXTURE_SPEC();
    s.cuts.main.format = format;
    const { C } = compile(s, 'main');
    const beats = C.scenes.filter(sc => sc.type === 'beat');
    const heads = beats.map(sc => sc.layers.find(l => l.role === 'headline').lines[0]);
    heads.forEach(h => { assert.strictEqual(h.x, heads[0].x); assert.strictEqual(h.y, heads[0].y); });
    const kick = C.scenes.map(sc => sc.chrome && sc.chrome.kicker).filter(Boolean);
    kick.forEach(k => { assert.strictEqual(k.x, kick[0].x); assert.strictEqual(k.y, kick[0].y); });
  });
}

test('the headline is one size on every beat (the card never grows or shrinks)', () => {
  const { C } = compile(FIXTURE_SPEC(), 'main');
  const sizes = new Set(C.scenes.filter(sc => sc.type === 'beat').map(sc => sc.layers.find(l => l.role === 'headline').size));
  assert.strictEqual(sizes.size, 1);
});

test('a beat carries one figure or one chart, not both', () => {
  const s = FIXTURE_SPEC();
  s.scenes[2].copy.value = 'F3';
  assert.throws(() => compile(s, 'main'), /one figure or one chart/);
});
