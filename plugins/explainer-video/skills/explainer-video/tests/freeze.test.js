// node --test plugins/explainer-video/skills/explainer-video/tests/freeze.test.js
//
// The continuous style is frozen at 1.1.0 (AGENTS.md). Every round that grew
// its picture catalogue or its layout engine fixed the topic being worked on
// and nothing else, so a finding the catalogue doesn't draw is the agent's
// own custom painter (references/pictures.md § A finding the catalogue
// doesn't draw), not a new picture. This fails on any change to the world,
// the 2.5D kit or the pictures. A real bug fix there updates the hash below
// in the same commit and says why.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { SKILL } = require('./harness');

const LIB = path.join(SKILL, 'assets', 'motion-lib');
const FROZEN = {
  'world.js': 'a4c4d104cc8300dd',   // ee704e0+1: custom painters get api.value/api.display in the world too
  'iso.js': 'daa897d8c984a4b6',
  'pictures/blocks.js': '61529ef122e97e55',
  'pictures/building.js': '6d64a1b1fbde866f',
  'pictures/columns.js': 'f31284f1fd6555fc',
  'pictures/desk.js': '0ec932513fb0d050',
  'pictures/device.js': 'ca694b5e02319b95',
  'pictures/people.js': 'a7ded695f0437b89',
  'pictures/plinth.js': '9c877086ebcf2c19',
  'pictures/ribbon.js': '42f123c49d22c78e'
};
const PICTURES = ['people', 'dots', 'blocks', 'split', 'columns', 'funnel', 'podium', 'ribbon', 'building', 'device', 'desk', 'plinth'];
const hash = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(LIB, f), 'utf8').replace(/\r\n/g, '\n')).digest('hex').slice(0, 16);

test('the continuous style is frozen at 1.1.0: no new picture files', () => {
  const now = fs.readdirSync(path.join(LIB, 'pictures')).filter(f => f.endsWith('.js')).sort().map(f => 'pictures/' + f);
  assert.deepStrictEqual(now, Object.keys(FROZEN).filter(f => f.startsWith('pictures/')).sort());
  assert.ok(!fs.existsSync(path.join(LIB, 'things')), 'no things/ library: a noun the catalogue lacks is drawn by the video\'s own painter');
});

test('the continuous style is frozen at 1.1.0: the catalogue lists the same pictures', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(LIB, 'motion.manifest.json'), 'utf8'));
  assert.deepStrictEqual(Object.keys(manifest.pictures), PICTURES);
});

test('the continuous style is frozen at 1.1.0: the world, the kit and the pictures are unchanged', () => {
  for (const [f, h] of Object.entries(FROZEN)) assert.strictEqual(hash(f), h, f + ' changed: the continuous style is frozen (AGENTS.md)');
});
