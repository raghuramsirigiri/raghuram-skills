// node --test plugins/explainer-video/skills/explainer-video/tests/shared-files.test.js
//
// explainer-video draws its own animated charts, but in charts-lib's design
// system: a frame of the video, a social card and a dashboard panel from the
// same data must read as one family. So it carries its own copy of
// charts-lib's theme.js (palette, metrics, presets) and the brand-recolour
// scripts that produce palette overrides for it.
//
// Two copies must not drift. In this repo every shared file must match
// chart-dashboard's copy; installed alone there is no sibling, and the
// comparison skips. A change to any of these goes into chart-dashboard,
// social-post and explainer-video in the same commit.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const HERE = path.join(__dirname, '..');
const SIBLING = path.join(HERE, '..', '..', '..', 'chart-dashboard', 'skills', 'chart-dashboard');

const SHARED = [
  'assets/charts-lib/theme.js',
  'scripts/generate-theme.js',
  'scripts/extract-theme.js',
  'scripts/fetch-design.js'
];

const read = f => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');

test('every shared file is present in this plugin', () => {
  const missing = SHARED.filter(f => !fs.existsSync(path.join(HERE, f)));
  assert.deepStrictEqual(missing, []);
});

test('every shared file matches chart-dashboard\'s copy', { skip: !fs.existsSync(SIBLING) && 'chart-dashboard is not beside this plugin' }, () => {
  const drifted = SHARED.filter(f => read(path.join(HERE, f)) !== read(path.join(SIBLING, f)));
  assert.deepStrictEqual(drifted, [],
    'these differ from plugins/chart-dashboard/skills/chart-dashboard — copy the change into every plugin that carries them');
});

test('the engine never loads charts.js (design shared, engines not)', () => {
  assert.ok(!fs.existsSync(path.join(HERE, 'assets', 'charts-lib', 'charts.js')));
});
