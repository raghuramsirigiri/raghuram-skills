// node --test plugins/documentary-video/skills/documentary-video/tests/tiers.test.js
//
// Every bible item carries a tier (hero, supporting, background), read off
// the camera; the bible check requires it, and it is what decides how much
// care step 4 spends on an item.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const D = require('../scripts/film-docs');

const F = path.join(__dirname, '..', 'evals', 'fixtures', 'ride-dashboard', 'film');
const brief = D.read(path.join(F, 'brief.md')), sp = D.read(path.join(F, 'screenplay.md')), bible = D.read(path.join(F, 'bible.md'));

test('an item with no tier fails the bible check', () => {
  const b = bible.replace(/Tier: hero \(B7 opens on it in close-up\)\n/, '');
  assert.ok(D.checkBible(b, brief, sp).errors.some(e => /K4: missing "Tier:"/.test(e)));
});

test('a tier must be hero, supporting or background', () => {
  const b = bible.replace('Tier: hero (B7 opens on it in close-up)', 'Tier: important');
  assert.ok(D.checkBible(b, brief, sp).errors.some(e => /K4: Tier starts with hero, supporting or background/.test(e)));
});

test('the tier samples stage with the sheet', () => {
  const fs = require('fs');
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'templates', 'samples', 'tiers.js')));
});
