// node --test plugins/documentary-video/skills/documentary-video/tests/shared-files.test.js
//
// documentary-video draws its own 3D world, but in charts-lib's design
// system, so it carries its own copy of charts-lib's theme.js. The copy must
// not drift: in this repo it must match chart-dashboard's; installed alone
// there is no sibling and the comparison skips. A change to it goes into
// every plugin that carries it, in the same commit.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const HERE = path.join(__dirname, '..');
const SIBLING = path.join(HERE, '..', '..', '..', 'chart-dashboard', 'skills', 'chart-dashboard');
const SHARED = [['assets/film-lib/theme.js', 'assets/charts-lib/theme.js']];
const read = f => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');

test('every shared file is present in this plugin', () => {
  assert.deepStrictEqual(SHARED.filter(([mine]) => !fs.existsSync(path.join(HERE, mine))), []);
});

test('every shared file matches the chart-dashboard copy', { skip: !fs.existsSync(SIBLING) && 'chart-dashboard is not beside this plugin' }, () => {
  const drifted = SHARED.filter(([mine, theirs]) => read(path.join(HERE, mine)) !== read(path.join(SIBLING, theirs)));
  assert.deepStrictEqual(drifted, [], 'copy the change into every plugin that carries it');
});
