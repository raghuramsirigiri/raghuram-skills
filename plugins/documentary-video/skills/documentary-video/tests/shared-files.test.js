// node --test plugins/documentary-video/skills/documentary-video/tests/shared-files.test.js
//
// documentary-video draws its own 3D world, but in charts-lib's design
// system, so it carries its own copy of charts-lib's theme.js; and it writes
// MP4 and WebM with the same muxers explainer-video ships. The copies must
// not drift: in this repo each must match its source plugin's; installed
// alone there is no sibling and the comparison skips. A change to one goes
// into every plugin that carries it, in the same commit.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const HERE = path.join(__dirname, '..');
const PLUGINS = path.join(HERE, '..', '..', '..');
const sibling = name => path.join(PLUGINS, name, 'skills', name);
const SHARED = [
  ['assets/film-lib/theme.js', 'chart-dashboard', 'assets/charts-lib/theme.js'],
  ['assets/film-lib/mux-mp4.js', 'explainer-video', 'assets/motion-lib/mux-mp4.js'],
  ['assets/film-lib/mux-webm.js', 'explainer-video', 'assets/motion-lib/mux-webm.js']
];
const read = f => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');

test('every shared file is present in this plugin', () => {
  assert.deepStrictEqual(SHARED.filter(([mine]) => !fs.existsSync(path.join(HERE, mine))), []);
});

for (const [mine, plugin, theirs] of SHARED) {
  test(mine + ' matches the copy in ' + plugin, { skip: !fs.existsSync(sibling(plugin)) && plugin + ' is not beside this plugin' }, () => {
    assert.ok(read(path.join(HERE, mine)) === read(path.join(sibling(plugin), theirs)), 'copy the change into every plugin that carries it');
  });
}
