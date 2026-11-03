// node --test plugins/diorama-slides/skills/diorama-slides/tests/finalize.test.js
//
// finalize.js stages the library, then inlines it in load order without
// audit.js, removes only its own staged folders, and gates on the final check.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SKILL = path.join(__dirname, '..');
const FIN = path.join(SKILL, 'scripts', 'finalize.js');
// The template with its heading filled in, as a real build writes it.
const TEMPLATE = fs.readFileSync(path.join(SKILL, 'templates', 'video.html'), 'utf8')
  .replace('<title>TITLE', '<title>Valley water').replace('<h1>TITLE</h1>', '<h1>Valley water</h1>')
  .replace('ONE LINE: what the video shows and where its figures come from.', 'What the valley used, from the water board.');

const { FIXTURE_SPEC, PAINTER } = require('./harness');
const spec = FIXTURE_SPEC();
function fresh(s) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'finalize-'));
  const f = path.join(dir, 'v.html');
  fs.writeFileSync(f, TEMPLATE.replace(/<script type="application\/json" id="video-spec">[\s\S]*?<\/script>/,
    '<script type="application/json" id="video-spec">\n' + JSON.stringify(s || spec) + '\n</script>')
    .replace('(async function () {', PAINTER + '\n(async function () {'));
  return { dir, f };
}
const run = (...a) => spawnSync(process.execPath, [FIN, ...a], { encoding: 'utf8' });

test('--stage copies theme.js and motion-lib (with audit.js) beside the page', () => {
  const { dir, f } = fresh();
  assert.strictEqual(run(f, '--stage').status, 0);
  assert.ok(fs.existsSync(path.join(dir, 'charts-lib', 'theme.js')));
  assert.ok(fs.existsSync(path.join(dir, 'motion-lib', 'core.js')));
  assert.ok(fs.existsSync(path.join(dir, 'motion-lib', 'audit.js')));
  assert.ok(fs.existsSync(path.join(dir, 'motion-lib', 'scenes', 'beat.js')));

});

test('finalize inlines in load order, leaves out audit.js, removes the staged copies, exits 0', () => {
  const { dir, f } = fresh();
  run(f, '--stage');
  const r = run(f);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const html = fs.readFileSync(f, 'utf8');
  assert.ok(!/src="(charts-lib|motion-lib)\//.test(html));
  assert.ok(!/root\.VideoAudit\s*=/.test(html), 'audit.js not inlined');
  const order = ['window.Charts = window.Charts || {}', 'motion-lib/core.js —', 'motion-lib/ease.js —', 'motion-lib/design.js —', 'motion-lib/stage.js —', 'scenes/beat.js —', 'motion-lib/export.js —', 'motion-lib/player.js —'];
  const at = order.map(s => html.indexOf(s));
  at.forEach((p, i) => assert.ok(p >= 0, order[i] + ' is in the page'));
  for (let i = 1; i < at.length; i++) assert.ok(at[i] > at[i - 1], order[i] + ' after ' + order[i - 1]);
  assert.ok(!fs.existsSync(path.join(dir, 'charts-lib')));
  assert.ok(!fs.existsSync(path.join(dir, 'motion-lib')));
});

test('a staged folder holding someone else\'s file is left alone', () => {
  const { dir, f } = fresh();
  run(f, '--stage');
  fs.writeFileSync(path.join(dir, 'motion-lib', 'mine.txt'), 'keep me');
  assert.strictEqual(run(f).status, 0);
  assert.ok(fs.existsSync(path.join(dir, 'motion-lib', 'mine.txt')));
});

test('a page that fails the static checks is not inlined and exits 1', () => {
  const bad = JSON.parse(JSON.stringify(spec));
  bad.scenes[1].copy.title = 'Sales rose 40% this year';
  const { f } = fresh(bad);
  run(f, '--stage');
  const before = fs.readFileSync(f, 'utf8');
  assert.strictEqual(run(f).status, 1);
  assert.strictEqual(fs.readFileSync(f, 'utf8'), before);
});

test('usage errors exit 2', () => {
  assert.strictEqual(run().status, 2);
  assert.strictEqual(run(path.join(os.tmpdir(), 'nope-' + Date.now() + '.html')).status, 2);
});
