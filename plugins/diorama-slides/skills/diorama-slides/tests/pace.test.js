// node --test plugins/diorama-slides/skills/diorama-slides/tests/pace.test.js
//
// The stage acts out the story: a pace bound to a claim moves the subject in
// proportion and from zero, a halt stops it where the story stops, stops are
// set where the subject arrives, things can stand where beats happen, and
// check-video holds the card to any figure the motion carries.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { load, mockCtx, FIXTURE_SPEC, PAINTER, SKILL } = require('./harness');

function compile(spec) {
  const w = load();
  return { C: w.Motion.compile(spec, 'main', { measure: mockCtx() }), M: w.Motion };
}
const mid = sc => (sc.enterEnd + sc.exitStart) / 2;
// Speeds of 40 and 55: the fixture's F2 and F3.
function paced() {
  const s = FIXTURE_SPEC();
  s.stage.states[1].pace = 'F2';
  s.stage.states[2].pace = 'F3';
  return s;
}

test('a pace bound to a claim moves the subject in proportion, the largest at topPace', () => {
  const { C, M } = compile(paced());
  const T = M.stage.shapes.transformation;
  const len = C.stage.plan.len;
  const v = sc => T.subjectAt(C.stage, mid(sc)).speed;
  assert.ok(Math.abs(v(C.scenes[2]) - 2) < 1e-6, 'the largest claim at 2 lengths per second');
  assert.ok(Math.abs(v(C.scenes[1]) / v(C.scenes[2]) - 40 / 55) < 1e-6, 'in proportion, from zero');
  assert.ok(Math.abs(v(C.scenes[0]) - M.stage.shapes.transformation.IDLE) < 1e-6, 'a state with no pace drifts at the fallback');
  assert.ok(len > 0);
});

test('pace 0 halts the subject, and it pulls away again on the next pace', () => {
  const s = paced();
  s.scenes[2].stage.pace = 0;
  const { C, M } = compile(s);
  const T = M.stage.shapes.transformation;
  const big = C.scenes[2];
  const a = T.subjectAt(C.stage, big.enterEnd + 0.1), b = T.subjectAt(C.stage, big.exitStart - 0.05);
  assert.strictEqual(a.speed, 0);
  assert.ok(Math.abs(a.x - b.x) < 1e-9, 'it stands still through the beat');
  assert.ok(Math.abs(a.x - C.stage.plan.node.big.x) < 1e-9, 'it halts on its stop');
});

test('a new state\'s stop is set where the subject arrives: a faster story spreads its stops', () => {
  const slow = compile(FIXTURE_SPEC()).C, fast = compile(paced()).C;
  const gap = C => C.stage.plan.node.big.x - C.stage.plan.node.mid.x;
  assert.ok(gap(fast) > gap(slow) * 2);
});

test('painters learn where each beat happens, and read claims by id', () => {
  const s = paced();
  const w = load();
  let seen = null;
  w.Motion.things.block = { draw(V, st, api) { seen = { beats: api.beats, v: api.value('F3'), beat: st.beat }; } };
  const C = w.Motion.compile(s, 'main', { measure: mockCtx() });
  w.Motion.seek(mockCtx(), C, mid(C.scenes[1]));
  assert.strictEqual(seen.beats.length, C.scenes.length);
  assert.strictEqual(seen.beats[1].id, 'mid');
  assert.strictEqual(seen.v, 55);
  assert.strictEqual(seen.beat.id, 'mid');
});

test('a pace that is not a claim fails, naming where', () => {
  const s = FIXTURE_SPEC(); s.stage.states[1].pace = 'F9';
  assert.throws(() => compile(s), /pace "F9" is not a claim/);
});

const TEMPLATE = fs.readFileSync(path.join(SKILL, 'templates', 'video.html'), 'utf8')
  .replace('<title>TITLE', '<title>Valley water').replace('<h1>TITLE</h1>', '<h1>Valley water</h1>')
  .replace('ONE LINE: what the video shows and where its figures come from.', 'What the valley used, from the water board.');
function check(spec) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'diorama-pace-'));
  const f = path.join(dir, 'v.html');
  fs.writeFileSync(f, TEMPLATE.replace(/<script type="application\/json" id="video-spec">[\s\S]*?<\/script>/, '<script type="application/json" id="video-spec">\n' + JSON.stringify(spec) + '\n</script>')
    .replace('(async function () {', PAINTER + '\n(async function () {'));
  const r = spawnSync(process.execPath, [path.join(SKILL, 'scripts', 'check-video.js'), f, '--json'], { encoding: 'utf8' });
  return JSON.parse(r.stdout).rows;
}

test('check-video fails a pace whose figure no beat in the cut states', () => {
  const s = paced();
  s.cuts.main.scenes = ['hook', 'mid', 'src'];      // F2 is only on the dropped beat
  s.scenes[1].copy.title = 'The works grew';
  const rows = check(s);
  assert.ok(rows.some(r => r.level === 'FAIL' && /pace of F2, which no beat in the cut states/.test(r.detail)), JSON.stringify(rows.filter(r => r.level !== 'PASS')));
});

test('check-video warns when a beat has no stage.shows, and when nothing sets a pace', () => {
  const rows = check(FIXTURE_SPEC());
  assert.ok(rows.some(r => r.level === 'WARN' && /no stage\.shows/.test(r.detail)));
  assert.ok(rows.some(r => r.level === 'WARN' && /only drifts at the fallback pace/.test(r.detail)));
});
