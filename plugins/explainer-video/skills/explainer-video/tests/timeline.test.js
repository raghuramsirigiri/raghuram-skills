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
  const { C } = compile(FIXTURE_SPEC(), 'main');
  for (let i = 1; i < C.scenes.length; i++) {
    const a = C.scenes[i - 1], b = C.scenes[i];
    assert.ok(Math.abs(a.t1 - b.t0 - (a.t1 - a.cEnd)) < 1e-9);
    assert.ok(Math.abs((a.t1 - b.t0) - b.trIn.dur) < 1e-9);
  }
});

test('every scene after the first arrives by the one transition, whatever the spec asks for', () => {
  const s = FIXTURE_SPEC();
  s.scenes[1].transitionIn = 'morph-bar';
  s.scenes[2].transitionIn = 'flood';
  const { C, M } = compile(s, 'main');
  assert.deepStrictEqual(Object.keys(M.transitions.list).sort(), ['cut', 'swap']);
  assert.strictEqual(C.scenes[0].trIn.name, 'cut');
  for (const sc of C.scenes.slice(1)) {
    assert.strictEqual(sc.trIn.name, 'swap', sc.id);
    assert.ok(sc.exit > 0 || sc.last, `${sc.id}: content leaves before the next arrives`);
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

test('read-time formula: max(1.2, 0.5 + 0.25 per word)', () => {
  const M = load({ scenes: [] }).Motion;
  assert.strictEqual(M.readTime(1), 1.2);
  assert.ok(Math.abs(M.readTime(8) - 2.5) < 1e-9);
});

test('reading starts when the headline lands: the hold is what the read still needs', () => {
  const s = FIXTURE_SPEC();
  s.data = [{ id: 'D1', source: 'A', locator: 't1', unit: 'litres', x: ['2022', '2023', '2024', '2025'], y: [150, 146, 141, 140] }];
  s.scenes.splice(2, 0, { id: 'trend', type: 'trend-line', copy: { title: 'Use has fallen every year' }, series: 'D1' });
  s.cuts.main.scenes.splice(2, 0, 'trend');
  const { C } = compile(s, 'main');
  const sc = C.scenes.find(x => x.id === 'trend');
  const head = sc.layers.find(l => l.id === 'headline');
  const headLanded = sc.cStart + head.at + head.dur;
  // The line draws long after the headline lands; the read runs alongside it.
  assert.ok(sc.enter > head.at + head.dur + 0.5, 'the chart draws after the headline lands');
  assert.ok(sc.exitStart - headLanded >= sc.built.read - 1e-9, 'the read is all there, counted from the headline');
  assert.ok(sc.dur < sc.enter + sc.built.read + sc.exit - 0.5, `the scene is shorter than entrance + read: ${sc.dur}`);
});

test('every layer is on screen long enough to read once it lands', () => {
  const { C, M } = compile(FIXTURE_SPEC(), 'main');
  for (const sc of C.scenes) {
    for (const l of sc.layers) {
      if (l.kind !== 'text' && l.kind !== 'counter') continue;
      const landed = sc.cStart + (l.at || 0) + (l.dur || 0);
      const words = l.lines ? l.lines.reduce((n, ln) => n + M.text.wordCount(ln.text), 0) : 0;
      const need = l.role === 'value' ? M.READ.number : l.role === 'label' ? M.READ.min : M.readTime(words);
      const end = sc.last ? C.duration : sc.exitStart;
      assert.ok(end - landed >= Math.min(need, sc.last ? Math.max(M.READ.final, sc.read) : need) - 1e-9, `${sc.id}/${l.id}: ${end - landed} s`);
    }
  }
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

test('scene content drifts in slowly the whole time it is on screen, never past its layout', () => {
  const w = load();
  const C = w.Motion.compile(FIXTURE_SPEC(), 'main', { measure: mockCtx() });
  const sc = C.scenes[1];
  const scaleAt = t => {
    const log = [];
    w.Motion.seek(mockCtx(log), C, t);
    const m = log.map(l => /^scale\(([\d.]+),/.exec(l)).filter(Boolean);
    return +m[0][1];
  };
  const ts = [sc.cStart, sc.enterEnd, (sc.enterEnd + sc.exitStart) / 2, sc.cEnd - 0.01];
  const ss = ts.map(scaleAt);
  assert.ok(Math.abs(ss[0] - 0.97) < 1e-3, `starts at ${ss[0]}`);
  for (let i = 1; i < ss.length; i++) assert.ok(ss[i] > ss[i - 1], `drifts in: ${ss}`);
  assert.ok(ss[ss.length - 1] <= 1 + 1e-9, `never past its layout: ${ss}`);
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
