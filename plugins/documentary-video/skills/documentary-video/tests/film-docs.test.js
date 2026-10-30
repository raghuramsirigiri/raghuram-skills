// node --test plugins/documentary-video/skills/documentary-video/tests/film-docs.test.js
//
// The pre-production checks (brief, screenplay, bible). The ride-dashboard
// fixture's files are the passing case; each failing case breaks them in
// one way the checks exist to catch.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const D = require('../scripts/film-docs');

const F = path.join(__dirname, '..', 'evals', 'fixtures');
const doc = D.read(path.join(F, 'ride-dashboard.md'));
const brief = D.read(path.join(F, 'ride-dashboard', 'film', 'brief.md'));
const sp = D.read(path.join(F, 'ride-dashboard', 'film', 'screenplay.md'));
const bible = D.read(path.join(F, 'ride-dashboard', 'film', 'bible.md'));
const has = (res, re) => res.errors.some(e => re.test(e));

test('the fixture passes all three checks', () => {
  assert.deepStrictEqual(D.checkBrief(brief, doc).errors, []);
  assert.deepStrictEqual(D.checkScreenplay(sp, brief).errors, []);
  assert.deepStrictEqual(D.checkBible(bible, brief, sp).errors, []);
});

test('brief: a quote that is not in the document fails', () => {
  const b = brief.replace('"Average pickup wait: 6.2 minutes across the quarter."', '"Average pickup wait fell to 6.2 minutes."');
  assert.ok(has(D.checkBrief(b, doc), /C3: quote not found/));
});

test('brief: a figure that is not in its quote fails', () => {
  const b = brief.replace('| 6.2 minutes |', '| 6.5 minutes |');
  assert.ok(has(D.checkBrief(b, doc), /C3: figure 6\.5 is not in its quote/));
});

test('brief: quotes match across line breaks, curly quotes and dashes', () => {
  // C8's quote spans a line break in the document
  assert.ok(!has(D.checkBrief(brief, doc), /C8/));
  const curly = brief.replace('"Midday waits average 4.1 minutes."', '“Midday waits average 4.1 minutes.”');
  assert.ok(!has(D.checkBrief(curly, doc), /C7/));
});

test('brief: an abstract noun with nothing standing for it fails', () => {
  const b = brief.replace(/(\| N11 \| cancellation \| abstract \| C4 C8 C12 \|)[^\n]*/, '$1 |');
  assert.ok(has(D.checkBrief(b, doc), /N11 \(cancellation\): an abstract noun needs "stands for"/));
});

test('screenplay: a number in a caption that its claims do not hold fails', () => {
  const s = sp.replace('waited 6.2 minutes', 'waited 7 minutes');
  assert.ok(has(D.checkScreenplay(s, brief), /B2: caption number 7 is not in the claims it cites/));
});

test('screenplay: a hedged, rounded number is allowed; an unhedged one is not', () => {
  const ok = sp.replace('waits reach 9.8 minutes', 'waits reach about 10 minutes');
  assert.ok(!has(D.checkScreenplay(ok, brief), /B3/));
  const bad = sp.replace('waits reach 9.8 minutes', 'waits reach 10 minutes');
  assert.ok(has(D.checkScreenplay(bad, brief), /B3: caption number 10/));
});

test('screenplay: a count needs its key, beats need claims or a tag, length must fit', () => {
  assert.ok(has(D.checkScreenplay(sp.replace('Key: 1 car = 1% of online drivers\n', ''), brief), /B4: a Count needs a Key/));
  assert.ok(has(D.checkScreenplay(sp.replace('Claims: C3', 'Claims: —'), brief), /B2: a beat with no claims/));
  assert.ok(has(D.checkScreenplay(sp.replace('### B4 · 9 s', '### B4 · 30 s'), brief), /beats add up to 111 s/));
  assert.ok(has(D.checkScreenplay(sp.replace('Claims: C3', 'Claims: C99'), brief), /claim C99 is not in the brief/));
});

test('screenplay: a count that matches no figure is flagged', () => {
  const r = D.checkScreenplay(sp.replace('Count: 38 of 100 cars lit', 'Count: 45 of 100 cars lit'), brief);
  assert.ok(r.warnings.some(w => /B4: Count/.test(w)));
});

test('bible: an item that traces to no brief noun fails', () => {
  const b = bible.replace('### K4 · rider\'s phone · N4', '### K4 · taxi roof sign · N40');
  assert.ok(has(D.checkBible(b, brief, sp), /K4: noun N40 is not in the brief/));
  const none = bible.replace('### K4 · rider\'s phone · N4', '### K4 · rider\'s phone · phone');
  assert.ok(has(D.checkBible(none, brief, sp), /K4 .*traces to no noun/));
});

test('bible: a noun the screenplay shows with no item to build it fails', () => {
  const b = bible.replace(/### K7 · pickup point[\s\S]*?(?=### K8)/, '');
  assert.ok(has(D.checkBible(b, brief, sp), /N7 \(pickup point at the kerb\) is in the screenplay but no bible item builds it/));
});

test('bible: each item needs its fields', () => {
  const b = bible.replace('Tell apart from: nothing; any kerb in the city\n', '');
  assert.ok(has(D.checkBible(b, brief, sp), /K7: missing "Tell apart from:"/));
});
