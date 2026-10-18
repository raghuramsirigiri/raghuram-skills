// node --test plugins/social-post/skills/social-post/tests/shared-files.test.js
//
// social-post is installed on its own, so it carries its own copy of the
// chart library, the freeze runtime, the build scripts and the two
// templates. The same files ship in chart-dashboard, which makes the social
// format there. Two copies of one engine must not drift: a fix made in one
// and not the other means the same post comes out differently depending on
// which plugin built it.
//
// So in this repo, every shared file must match chart-dashboard's copy. When
// the plugin is installed alone there is no sibling to compare with, and the
// test skips. A change to any of these files goes into both copies in the
// same commit; charts-lib itself is a vendored library, and its rule
// (CHARTS-LIB-UPSTREAM.md) holds for both.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const HERE = path.join(__dirname, '..');
const SIBLING = path.join(HERE, '..', '..', '..', 'chart-dashboard', 'skills', 'chart-dashboard');

const SHARED = [
  'assets/charts-lib/charts.css',
  'assets/charts-lib/charts.js',
  'assets/charts-lib/charts.manifest.json',
  'assets/charts-lib/theme.js',
  'assets/audit.js',
  'assets/chart-convert.js',
  'assets/email-snapshot.js',
  'assets/page-editor.js',
  'assets/page-runtime.js',
  'scripts/check-page.js',
  'scripts/extract-theme.js',
  'scripts/fetch-design.js',
  'scripts/finalize.js',
  'scripts/finalize.ps1',
  'scripts/finalize.sh',
  'scripts/generate-theme.js',
  'scripts/inline-lib.js',
  'templates/social.html',
  'templates/social-editable.html'
];

// Line endings are git's business (core.autocrlf), not the file's.
const read = f => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');

test('every shared file is present in this plugin', () => {
  const missing = SHARED.filter(f => !fs.existsSync(path.join(HERE, f)));
  assert.deepStrictEqual(missing, []);
});

test('every shared file matches chart-dashboard\'s copy', { skip: !fs.existsSync(SIBLING) && 'chart-dashboard is not beside this plugin' }, () => {
  const drifted = SHARED.filter(f => read(path.join(HERE, f)) !== read(path.join(SIBLING, f)));
  assert.deepStrictEqual(drifted, [],
    'these differ from plugins/chart-dashboard/skills/chart-dashboard — copy the change into both plugins');
});

test('finalize stages only files this plugin carries', () => {
  const src = read(path.join(HERE, 'scripts', 'finalize.js'));
  const names = [...src.matchAll(/'([a-z-]+\.(?:js|css))'/g)].map(m => m[1]);
  const missing = names.filter(n => !fs.existsSync(path.join(HERE, 'assets', n)) &&
    !fs.existsSync(path.join(HERE, 'assets', 'charts-lib', n)) && !fs.existsSync(path.join(HERE, 'scripts', n)));
  assert.deepStrictEqual(missing, []);
});
