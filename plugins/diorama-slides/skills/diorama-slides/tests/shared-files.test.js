// node --test plugins/diorama-slides/skills/diorama-slides/tests/shared-files.test.js
//
// diorama-slides draws its own stage, but in charts-lib's design system, so
// it carries its own copy of charts-lib's theme.js and the brand-recolour
// scripts; and it writes MP4 and WebM with the muxers explainer-video ships.
// The copies must not drift: in this repo each must match its source
// plugin's; installed alone there is no sibling and the comparison skips. A
// change to one goes into every plugin that carries it, in the same commit.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const HERE = path.join(__dirname, '..');
const PLUGINS = path.join(HERE, '..', '..', '..');
const sibling = name => path.join(PLUGINS, name, 'skills', name);
const SHARED = [
  ['assets/charts-lib/theme.js', 'chart-dashboard', 'assets/charts-lib/theme.js'],
  ['scripts/generate-theme.js', 'chart-dashboard', 'scripts/generate-theme.js'],
  ['scripts/extract-theme.js', 'chart-dashboard', 'scripts/extract-theme.js'],
  ['scripts/fetch-design.js', 'chart-dashboard', 'scripts/fetch-design.js'],
  ['assets/motion-lib/mux-mp4.js', 'explainer-video', 'assets/motion-lib/mux-mp4.js'],
  ['assets/motion-lib/mux-webm.js', 'explainer-video', 'assets/motion-lib/mux-webm.js']
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

test('the engine never loads charts.js or a WebGL film library', () => {
  assert.ok(!fs.existsSync(path.join(HERE, 'assets', 'charts-lib', 'charts.js')));
  assert.ok(!fs.existsSync(path.join(HERE, 'assets', 'film-lib')));
  const lib = path.join(HERE, 'assets', 'motion-lib');
  const all = fs.readdirSync(lib, { recursive: true }).filter(f => String(f).endsWith('.js')).map(f => fs.readFileSync(path.join(lib, String(f)), 'utf8')).join('\n');
  assert.ok(!/getContext\(\s*['"]webgl/.test(all), 'Canvas 2D only');
});

test('explainer-video\'s continuous engine stayed behind', () => {
  const lib = path.join(HERE, 'assets', 'motion-lib');
  assert.ok(!fs.existsSync(path.join(lib, 'world.js')));
  assert.ok(!fs.existsSync(path.join(lib, 'pictures')));
  assert.ok(!fs.existsSync(path.join(HERE, 'references', 'continuous.md')));
});
