// node --test plugins/diorama-slides/skills/diorama-slides/tests/stage.test.js
//
// The stage: the page's own world, drawn as a pure function of what the
// story has done so far. The engine gives it time (each beat's progress,
// story time eased between beats), exact running totals of rates the page
// gives, the claims, and one camera angle that pans and zooms the world
// while the card stays put. It decides nothing about what happens.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { load, mockCtx, FIXTURE_SPEC } = require('./harness');

function compile(spec, cut) {
  const w = load();
  return { C: w.Motion.compile(spec, cut || 'main', { measure: mockCtx() }), M: w.Motion, w };
}
const mid = sc => (sc.enterEnd + sc.exitStart) / 2;

test('every video names a shape and the page\'s world painter', () => {
  const a = FIXTURE_SPEC(); delete a.stage;
  assert.throws(() => compile(a), /spec\.stage is missing/);
  const b = FIXTURE_SPEC(); b.stage.shape = 'montage';
  assert.throws(() => compile(b), /stage\.shape must be one of transformation, lineup, assembly, episodes, journey/);
  const c = FIXTURE_SPEC(); delete c.stage.world;
  assert.throws(() => compile(c), /stage\.world/);
});

test('any shape compiles: the shape guides the story, it does not decide what happens', () => {
  for (const shape of ['lineup', 'assembly', 'episodes', 'journey']) {
    const s = FIXTURE_SPEC(); s.stage.shape = shape;
    const { C, M } = compile(s);
    assert.strictEqual(C.shape, shape);
    M.seek(mockCtx(), C, mid(C.scenes[1]));
  }
});

test('story time holds through a beat and eases to the next beat\'s over its action', () => {
  const { C, M } = compile(FIXTURE_SPEC());
  const S = C.stage;
  assert.strictEqual(M.stage.timeAt(S, mid(C.scenes[0])), 1990);
  assert.strictEqual(M.stage.timeAt(S, mid(C.scenes[1])), 2005);
  const act = S.beats[1].act, half = M.stage.timeAt(S, (act[0] + act[1]) / 2);
  assert.ok(half > 1990 && half < 2005);
  assert.ok(act[0] >= C.scenes[0].exitStart - 1e-9, 'the action waits for the words to leave');
  assert.strictEqual(M.stage.timeAt(S, mid(C.scenes[3])), 2020, 'a beat with no time keeps the one before');
});

test('story time may be a claim', () => {
  const s = FIXTURE_SPEC(); s.scenes[2].stage.time = 'F3';
  const { C, M } = compile(s);
  assert.strictEqual(M.stage.timeAt(C.stage, mid(C.scenes[2])), 55);
  const bad = FIXTURE_SPEC(); bad.scenes[2].stage.time = 'F9';
  assert.throws(() => compile(bad), /"F9" is not a number or a claim/);
});

test('a beat whose story time changes holds the words\' swap longer; one that doesn\'t, swaps', () => {
  const { C } = compile(FIXTURE_SPEC());
  assert.strictEqual(C.scenes[1].trIn.name, 'travel');
  assert.strictEqual(C.scenes[3].trIn.name, 'swap');
  const s = FIXTURE_SPEC(); s.scenes[3].stage.wait = 2;
  const c2 = compile(s).C;
  assert.strictEqual(c2.scenes[3].trIn.name, 'travel');
  assert.strictEqual(c2.scenes[3].trIn.dur, 2);
});

test('each beat\'s progress runs 0 to 1 over its action, and stays 1 after', () => {
  const { C, M } = compile(FIXTURE_SPEC());
  const S = C.stage, a = S.beats[2].act;
  assert.strictEqual(M.stage.progress(S, 2, a[0] - 0.01), 0);
  assert.ok(Math.abs(M.stage.progress(S, 2, (a[0] + a[1]) / 2) - 0.5) < 1e-9);
  assert.strictEqual(M.stage.progress(S, 2, C.duration - 0.1), 1);
});

test("since counts the seconds after a beat's action, and is 0 under the override", () => {
  const { C, M } = compile(FIXTURE_SPEC());
  const S = C.stage, end = S.beats[2].act[1];
  assert.strictEqual(M.stage.worldAt(S, end - 0.5).since('big'), 0);
  assert.ok(Math.abs(M.stage.worldAt(S, end + 1.5).since('big') - 1.5) < 1e-9);
  S.override = 2;
  assert.strictEqual(M.stage.worldAt(S, end + 1.5).since('big'), 0);
  S.override = null;
});

test('accumulate is the exact running total of a rate given per beat, easing between beats', () => {
  const { C, M } = compile(FIXTURE_SPEC());
  const S = C.stage, rate = b => (b.id === 'big' ? 3 : 1);
  const at = t => M.stage.accumulate(S, 'r', rate, t);
  const a = S.beats[2].act;
  assert.ok(Math.abs(at(a[0]) - a[0]) < 1e-9, 'rate 1 until big\'s action');
  assert.ok(Math.abs(at(a[1]) - (a[0] + 2 * (a[1] - a[0]))) < 1e-9, 'a linear ramp from 1 to 3 averages 2');
  assert.ok(Math.abs(at(a[1] + 1) - at(a[1]) - 3) < 1e-9, 'then rate 3');
  let last = -1;
  for (let x = 0; x < C.duration; x += 0.2) { assert.ok(at(x) >= last); last = at(x); }
});

test('the world gets the claims, in proportion from zero', () => {
  const { C, M } = compile(FIXTURE_SPEC());
  const w = M.stage.worldAt(C.stage, 1);
  assert.strictEqual(w.value('F3'), 55);
  assert.strictEqual(w.display('F2'), '40');
  assert.ok(Math.abs(w.share('F2', 'F3') - 40 / 55) < 1e-12);
  assert.throws(() => w.value('F9'), /unknown claim "F9"/);
});

test('the "what if this beat never happened" override takes the beat before\'s time, progress and rates', () => {
  const { C, M } = compile(FIXTURE_SPEC());
  const S = C.stage, t = mid(C.scenes[2]);
  const rate = b => (b.id === 'big' ? 3 : 1);
  const real = [M.stage.timeAt(S, t), M.stage.accumulate(S, 'r', rate, t)];
  S.override = 2;
  assert.strictEqual(M.stage.timeAt(S, t), 2005);
  assert.strictEqual(M.stage.progress(S, 2, t), 0);
  assert.ok(Math.abs(M.stage.accumulate(S, 'r', rate, t) - t) < 1e-9);
  S.override = null;
  assert.strictEqual(real[0], 2020);
  assert.ok(real[1] > t);
});

test('the camera frames each beat\'s focus at its zoom, and the card never moves with it', () => {
  const a = FIXTURE_SPEC(), b = FIXTURE_SPEC();
  b.scenes[1].stage.zoom = 2;
  const ca = compile(a).C, cb = compile(b).C;
  assert.strictEqual(cb.stage.beats[1].zoom, 2);
  const at = C => JSON.stringify(C.scenes[1].layers.map(l => l.lines && l.lines.map(x => [x.x, x.y])));
  assert.strictEqual(at(cb), at(ca));
  const s = FIXTURE_SPEC(); s.scenes[1].stage.zoom = 120;
  assert.throws(() => compile(s), /stage.zoom must be between 0.1 and 80/);
  const f = FIXTURE_SPEC(); f.scenes[1].stage.focus = 'nowhere';
  const { C, M } = compile(f);
  assert.throws(() => M.seek(mockCtx(), C, mid(C.scenes[1])), /the world names no such mark/);
});

test('a mark\u2019s fourth number scales the zoom, so a world can reveal during a beat', () => {
  const near = FIXTURE_SPEC(), far = FIXTURE_SPEC();
  const run = (spec, mul) => {
    const w = load();
    w.Motion.things.works.marks = () => ({ tank: [0, 0, 6, mul], pumps: [30, 0, 2] });
    const C = w.Motion.compile(spec, 'main', { measure: mockCtx() });
    w.Motion.debug.record = [];
    w.Motion.seek(mockCtx(), C, mid(C.scenes[0]));
    const r = w.Motion.debug.record.filter(x => x.owner === 'subject');
    w.Motion.debug.record = null;
    return Math.max(...r.map(x => x.bbox[2]));
  };
  assert.ok(run(far, 2) > run(near, 1) * 1.8, 'twice the zoom draws the subject about twice as wide');
});

test('the kit draws a ball as one lit disc, recorded for the audit', () => {
  const w = load();
  const ctx = mockCtx();
  w.Motion.debug.record = [];
  const V = w.Motion.iso.view(ctx, { ax: 100, ay: 100, cx: 0, cy: 0, s: 2 }, 'subject');
  V.ball(0, 0, 0, 10, { top: '#eeeeee', left: '#cccccc', right: '#999999' });
  const r = w.Motion.debug.record;
  w.Motion.debug.record = null;
  assert.strictEqual(r.length, 1);
  assert.strictEqual(JSON.stringify(r[0].bbox.map(Math.round)), '[80,80,40,40]');
});

test('the stage keeps clear of the card in every format', () => {
  for (const format of ['9:16', '4:5', '1:1', '16:9']) {
    const s = FIXTURE_SPEC(); s.cuts.main.format = format;
    const { C } = compile(s);
    C.scenes.forEach(sc => {
      const B = sc.stageBox;
      sc.layers.filter(l => l.kind === 'text').forEach(l => l.lines.forEach(ln => {
        assert.ok(ln.y + ln.h <= B.y || ln.x + ln.w <= B.x, format + ' ' + sc.id + ': "' + ln.text + '" sits clear of the stage');
      }));
    });
  }
});

test('stage labels are one size on screen whatever the zoom, as role "stage"', () => {
  const sizes = [1, 1.6].map(zoom => {
    const s = FIXTURE_SPEC(); s.scenes.forEach(sc => { sc.stage = Object.assign({}, sc.stage, { zoom }); });
    const { C, M } = compile(s);
    const out = [];
    for (let t = 0.7; t < C.duration; t += 0.5) {
      M.debug.record = [];
      M.seek(mockCtx(), C, t);
      M.debug.record.filter(r => r.role === 'stage').forEach(r => out.push(r.size));
    }
    M.debug.record = null;
    return out;
  });
  assert.ok(sizes[0].length > 0 && sizes[1].length > 0);
  assert.strictEqual(JSON.stringify([...new Set(sizes[0])]), JSON.stringify([...new Set(sizes[1])]));
});

test('every frame is a pure function of t', () => {
  const { C, M } = compile(FIXTURE_SPEC());
  const at = t => { const log = []; M.seek(mockCtx(log), C, t); return log.join('\n'); };
  const t = [0.4, 5.2, 9.9, C.duration - 0.2];
  assert.deepStrictEqual(t.slice().reverse().map(at).reverse(), t.map(at));
});

test('a missing world painter is named', () => {
  const s = FIXTURE_SPEC(); s.stage.world = 'ghost';
  const { C, M } = compile(s);
  assert.throws(() => M.seek(mockCtx(), C, 1), /no painter Motion\.things\.ghost/);
});

test('forms blend: numbers and arrays smoothly, profiles point by point, the rest halfway', () => {
  const { M } = compile(FIXTURE_SPEC());
  const f = M.stage.blendForm({ a: 0, b: [0, 10], p: [[0, 0], [2, 2]], tag: 'x' }, { a: 10, b: [10, 20], p: [[4, 4], [6, 6]], tag: 'y' }, 0.25);
  assert.strictEqual(f.a, 2.5);
  assert.strictEqual(JSON.stringify(f.b), '[2.5,12.5]');
  assert.strictEqual(JSON.stringify(f.p), '[[1,1],[3,3]]');
  assert.strictEqual(f.tag, 'x');
});
