// node --test plugins/diorama-slides/skills/diorama-slides/tests/scenes.test.js
//
// The manifest and the code agree: every registered scene's slots and word
// limits, every shape the manifest calls built, and the formats.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { load, LIB } = require('./harness');

const manifest = JSON.parse(fs.readFileSync(path.join(LIB, 'motion.manifest.json'), 'utf8'));

test('the manifest lists exactly the registered scenes, with the same slots', () => {
  const M = load().Motion;
  assert.deepStrictEqual(Object.keys(M.scenes).sort(), Object.keys(manifest.scenes).sort());
  for (const [type, def] of Object.entries(manifest.scenes)) {
    assert.strictEqual(JSON.stringify(M.scenes[type].slots), JSON.stringify(def.slots), type);
  }
});

test('the shapes the manifest calls built are exactly the registered grammars', () => {
  const M = load().Motion;
  const built = Object.keys(manifest.shapes).filter(k => manifest.shapes[k].built).sort();
  assert.strictEqual(JSON.stringify(Object.keys(M.stage.shapes).sort()), JSON.stringify(built));
  assert.strictEqual(JSON.stringify(Object.keys(manifest.shapes).sort()), JSON.stringify(M.stage.NAMES.slice().sort()));
});

test('lineups and journeys may run to 90 s; the rest to 60 s', () => {
  const max = Object.fromEntries(Object.entries(manifest.shapes).map(([k, v]) => [k, v.maxLength]));
  assert.deepStrictEqual(max, { transformation: 60, lineup: 90, assembly: 60, episodes: 60, journey: 90 });
});

test('the manifest\'s formats are layout.js\'s', () => {
  const M = load().Motion;
  for (const [f, def] of Object.entries(manifest.formats)) {
    const fr = M.layout.frame(f);
    assert.strictEqual(JSON.stringify([fr.W, fr.H]), JSON.stringify(def.size), f);
  }
});
