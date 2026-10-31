// node --test plugins/diorama-slides/skills/diorama-slides/tests/check-video.test.js
//
// check-video.js on pages built from the template: a good page passes, and
// each thing this skill refuses fails with a row that says why.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { SKILL, FIXTURE_SPEC, PAINTER } = require('./harness');

const CHECK = path.join(SKILL, 'scripts', 'check-video.js');
const TEMPLATE = fs.readFileSync(path.join(SKILL, 'templates', 'video.html'), 'utf8')
  .replace('<title>TITLE', '<title>Valley water').replace('<h1>TITLE</h1>', '<h1>Valley water</h1>')
  .replace('ONE LINE: what the video shows and where its figures come from.', 'What the valley used, from the water board.');

function page(spec, painters) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'diorama-check-'));
  const f = path.join(dir, 'v.html');
  const html = TEMPLATE
    .replace(/<script type="application\/json" id="video-spec">[\s\S]*?<\/script>/, '<script type="application/json" id="video-spec">\n' + JSON.stringify(spec) + '\n</script>')
    .replace('(async function () {', (painters == null ? PAINTER : painters) + '\n(async function () {');
  fs.writeFileSync(f, html);
  return f;
}
function check(spec, painters) {
  const r = spawnSync(process.execPath, [CHECK, page(spec, painters), '--json'], { encoding: 'utf8' });
  return { status: r.status, rows: JSON.parse(r.stdout).rows };
}
const fails = r => r.rows.filter(x => x.level === 'FAIL').map(x => x.name + ': ' + x.detail);

test('the fixture page passes', () => {
  const r = check(FIXTURE_SPEC());
  assert.deepStrictEqual(fails(r), []);
  assert.strictEqual(r.status, 0);
  assert.ok(r.rows.some(x => x.name === 'timing' && /transformation/.test(x.detail)));
});

test('meta.style fails: this skill has one mode', () => {
  const s = FIXTURE_SPEC(); s.meta.style = 'slides';
  assert.ok(fails(check(s)).some(x => /one mode/.test(x)));
});

test('a shape that is named but not built fails before anything renders', () => {
  const s = FIXTURE_SPEC(); s.stage.shape = 'journey';
  assert.ok(fails(check(s)).some(x => /"journey" is not built yet/.test(x)));
});

test('a stage thing with no painter in the page fails', () => {
  const s = FIXTURE_SPEC(); s.stage.scenery = 'trees';
  assert.ok(fails(check(s)).some(x => /registers no Motion\.things\.trees/.test(x)));
});

test('a figure typed onto a stage label fails', () => {
  const s = FIXTURE_SPEC(); s.stage.states[1].label = '40 pumps';
  assert.ok(fails(check(s)).some(x => /typed onto the stage/.test(x)));
});

test('a painter that paints text itself fails: stage words go through api.label', () => {
  const p = 'Motion.things.block = { draw(V, s, api) { V.ctx.fillText("Pumps", 0, 0); } };';
  assert.ok(fails(check(FIXTURE_SPEC(), p)).some(x => /api\.label/.test(x)));
});

test('a painter using Math.random fails', () => {
  const p = 'Motion.things.block = { draw(V, s, api) { V.box(0, 0, 0, Math.random(), 1, 1, api.mat.N); } };';
  assert.ok(fails(check(FIXTURE_SPEC(), p)).some(x => /Math\.random/.test(x)));
});

test('a cut must end on a source card', () => {
  const s = FIXTURE_SPEC(); s.cuts.main.scenes = ['hook', 'mid'];
  assert.ok(fails(check(s)).some(x => /must end on a source-card/.test(x)));
});

test('a dropped hedge fails', () => {
  const s = FIXTURE_SPEC();
  s.claims[0].hedge = 'about';
  assert.ok(fails(check(s)).some(x => /without its hedge "about"/.test(x)));
});

test('a typed number in copy fails', () => {
  const s = FIXTURE_SPEC(); s.scenes[1].copy.title = 'The works grew 40%';
  assert.ok(fails(check(s)).some(x => /typed into copy/.test(x)));
});
