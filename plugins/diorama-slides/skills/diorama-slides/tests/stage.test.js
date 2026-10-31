// node --test plugins/diorama-slides/skills/diorama-slides/tests/stage.test.js
//
// The stage: the shapes this version builds and refuses, the transformation
// grammar (the subject passes its stop mid-beat, never stops, changes form
// between beats, branches onto a lane), the one camera angle that pans and
// zooms the world while the card stays put, and words on the stage at one
// size on screen.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { load, mockCtx, FIXTURE_SPEC } = require('./harness');

function compile(spec, cut) {
  const w = load();
  return { C: w.Motion.compile(spec, cut || 'main', { measure: mockCtx() }), M: w.Motion };
}
const mid = sc => (sc.enterEnd + sc.exitStart) / 2;

test('every video needs a stage, a shape and a built grammar', () => {
  const a = FIXTURE_SPEC(); delete a.stage;
  assert.throws(() => compile(a), /spec\.stage is missing/);
  const b = FIXTURE_SPEC(); b.stage.shape = 'montage';
  assert.throws(() => compile(b), /stage\.shape must be one of transformation, lineup, assembly, episodes, journey/);
  const c = FIXTURE_SPEC(); c.stage.shape = 'lineup';
  assert.throws(() => compile(c), /"lineup" is not built yet in this version: the built shapes are transformation/);
});

test('a beat naming an unknown state fails, naming the beat', () => {
  const s = FIXTURE_SPEC();
  s.scenes[1].stage.state = 'huge';
  assert.throws(() => compile(s), /scene "mid": stage\.state "huge" is not one of small, mid, big/);
});

test('the subject passes its stop at the middle of each beat, and never stops', () => {
  const { C, M } = compile(FIXTURE_SPEC());
  const T = M.stage.shapes.transformation;
  C.scenes.slice(0, 3).forEach((sc, i) => {
    const st = C.stage.plan.beats[i].state;
    const a = T.subjectAt(C.stage, mid(sc));
    assert.ok(Math.abs(a.x - C.stage.plan.node[st].x) < 1e-6, sc.id + ' is at its stop mid-beat');
  });
  let last = -Infinity;
  for (let t = 0; t < C.duration; t += 0.1) {
    const x = T.subjectAt(C.stage, t).x;
    assert.ok(x > last, 'moving forward at ' + t.toFixed(1));
    last = x;
  }
});

test('the form changes between beats, smoothly, and has settled by the next beat\'s middle', () => {
  const { C, M } = compile(FIXTURE_SPEC());
  const T = M.stage.shapes.transformation;
  const [hook, next] = C.scenes;
  const w = C.stage.windows[1];
  assert.strictEqual(T.subjectAt(C.stage, w[0] - 0.01).k, 1);
  assert.strictEqual(T.subjectAt(C.stage, w[0] - 0.01).to, 'small');
  const half = T.subjectAt(C.stage, (w[0] + w[1]) / 2);
  assert.ok(half.k > 0.3 && half.k < 0.7 && half.from === 'small' && half.to === 'mid');
  assert.strictEqual(T.subjectAt(C.stage, mid(next)).to, 'mid');
  assert.ok(w[0] >= hook.exitStart - 1e-9, 'the change waits for the words to leave');
});

test('a state whose parent is not the one before starts a branch on a lane behind', () => {
  const s = FIXTURE_SPEC();
  s.stage.states.push({ id: 'side', label: '2010', parent: 'mid', form: { len: 12, h: 5 } });
  s.scenes.splice(3, 0, { id: 'side', type: 'beat', copy: { title: 'A branch' }, stage: { state: 'side' } });
  s.cuts.main.scenes.splice(3, 0, 'side');
  const { C } = compile(s);
  const n = C.stage.plan.node;
  assert.strictEqual(n.big.y, n.mid.y, 'the first child stays on its parent\'s lane');
  assert.ok(n.side.y < n.mid.y, 'a second child goes behind');
  assert.strictEqual(n.side.depth, n.big.depth);
});

test('forms blend: numbers and number arrays smoothly, profiles point by point, the rest halfway', () => {
  const { M } = compile(FIXTURE_SPEC());
  const f = M.stage.blendForm({ a: 0, b: [0, 10], p: [[0, 0], [2, 2]], tag: 'x' }, { a: 10, b: [10, 20], p: [[4, 4], [6, 6]], tag: 'y' }, 0.25);
  assert.strictEqual(f.a, 2.5);
  assert.strictEqual(JSON.stringify(f.b), '[2.5,12.5]');
  assert.strictEqual(JSON.stringify(f.p), '[[1,1],[3,3]]');
  assert.strictEqual(f.tag, 'x');
});

test('one camera angle: zoom changes the world\'s scale and nothing in the card', () => {
  const a = FIXTURE_SPEC(), b = FIXTURE_SPEC();
  b.scenes[1].stage.zoom = 2;
  const ca = compile(a).C, cb = compile(b).C;
  assert.strictEqual(ca.stage.cams[1].zoom, 1.2);
  assert.strictEqual(cb.stage.cams[1].zoom, 2);
  const at = C => JSON.stringify(C.scenes[1].layers.map(l => l.lines && l.lines.map(x => [x.x, x.y])));
  assert.strictEqual(at(cb), at(ca));
  const s = FIXTURE_SPEC(); s.scenes[1].stage.zoom = 5;
  assert.throws(() => compile(s), /stage\.zoom must be between 0\.5 and 3/);
});

test('the camera eases into each beat over its window, and holds within a beat', () => {
  const s = FIXTURE_SPEC(); s.scenes[1].stage.zoom = 2;
  const { C, M } = compile(s);
  const w = C.stage.windows[1];
  assert.strictEqual(M.stage.cameraAt(C.stage, w[0] - 0.01).zoom, 1);
  assert.strictEqual(M.stage.cameraAt(C.stage, w[0] - 0.01).index, 0);
  const z = M.stage.cameraAt(C.stage, (w[0] + w[1]) / 2).zoom;
  assert.ok(z > 1 && z < 2);
  assert.strictEqual(M.stage.cameraAt(C.stage, mid(C.scenes[1])).zoom, 2);
});

test('the stage keeps clear of the card: its room starts under every beat\'s words', () => {
  for (const format of ['9:16', '4:5', '1:1', '16:9']) {
    const s = FIXTURE_SPEC(); s.cuts.main.format = format;
    const { C } = compile(s);
    C.scenes.forEach(sc => {
      const B = sc.stageBox;
      sc.layers.filter(l => l.kind === 'text').forEach(l => l.lines.forEach(ln => {
        const clear = ln.y + ln.h <= B.y || ln.x + ln.w <= B.x;
        assert.ok(clear, format + ' ' + sc.id + ': "' + ln.text + '" sits clear of the stage');
      }));
    });
  }
});

test('stage labels are painted at one size on screen whatever the zoom, as role "stage"', () => {
  const sizes = [1, 1.6].map(zoom => {
    const s = FIXTURE_SPEC(); s.scenes.forEach(sc => { sc.stage = Object.assign({}, sc.stage, { zoom }); });
    const { C, M } = compile(s);
    const out = [];
    for (let t = 0.7; t < C.duration; t += 0.25) {
      M.debug.record = [];
      M.seek(mockCtx(), C, t);
      M.debug.record.filter(r => r.role === 'stage').forEach(r => out.push(r.size));
    }
    M.debug.record = null;
    return out;
  });
  assert.ok(sizes[0].length > 0 && sizes[1].length > 0, 'labels are painted at both zooms');
  assert.strictEqual(JSON.stringify([...new Set(sizes[0])]), JSON.stringify([...new Set(sizes[1])]));
});

test('every frame is a pure function of t', () => {
  const { C, M } = compile(FIXTURE_SPEC());
  const at = t => { const log = []; M.seek(mockCtx(log), C, t); return log.join('\n'); };
  const t = [0.4, 5.2, 9.9, C.duration - 0.2];
  const first = t.map(at), again = t.slice().reverse().map(at).reverse();
  assert.deepStrictEqual(again, first);
});

test('a missing painter is named', () => {
  const s = FIXTURE_SPEC(); s.stage.subject = 'ghost';
  const { C, M } = compile(s);
  assert.throws(() => M.seek(mockCtx(), C, 1), /no painter Motion\.things\.ghost/);
});
