// node --test plugins/documentary-video/skills/documentary-video/tests/second-topic.test.js
//
// The human-evolution film: the second topic the skill was run on end to
// end, as far from the ride dashboard as a document gets (dates in the
// millions, hominins, landscapes, a map). Its files are a second passing case,
// and it pins down what that run taught the checks.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const D = require('../scripts/film-docs');

const F = path.join(__dirname, '..', 'evals', 'fixtures');
const doc = D.read(path.join(F, 'human-evolution.md'));
const dir = path.join(F, 'human-evolution', 'film');
const brief = D.read(path.join(dir, 'brief.md'));
const sp = D.read(path.join(dir, 'screenplay.md'));
const bible = D.read(path.join(dir, 'bible.md'));

test('the human-evolution film passes all three checks', () => {
  assert.deepStrictEqual(D.checkBrief(brief, doc).errors, []);
  assert.deepStrictEqual(D.checkScreenplay(sp, brief).errors, []);
  assert.deepStrictEqual(D.checkBible(bible, brief, sp).errors, []);
});

test('quotes match when the document italicises a name the brief writes plainly', () => {
  // the document has *Homo erectus*; C6 quotes it without the asterisks
  assert.ok(!D.checkBrief(brief, doc).errors.some(e => /C6/.test(e)));
});

test('a count read through a unit key reconciles with its claim (27 pebbles x 50 = 1,350)', () => {
  const r = D.checkScreenplay(sp, brief);
  assert.ok(!r.warnings.some(w => /B11: Count/.test(w)), r.warnings.join('\n'));
  const off = D.checkScreenplay(sp.replace('Count: 27 pebbles', 'Count: 25 pebbles'), brief);
  assert.ok(off.warnings.some(w => /B11: Count/.test(w)));
});

test('a date callout must be a claim: a date the document does not give fails', () => {
  const r = D.checkScreenplay(sp.replace('Callout: 3.2 million years ago', 'Callout: 3.4 million years ago'), brief);
  assert.ok(r.errors.some(e => /B4: callout number 3\.4/.test(e)));
});
