// node --test plugins/documentary-video/skills/documentary-video/tests/color.test.js
//
// Colour is an option, never the default. Material roles resolve to theme
// neutrals in monotone (so a film looks as it always did) and to muted hues
// in colour; the highlights are the same in both.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
globalThis.window = globalThis;
const LIB = path.join(__dirname, '..', 'assets', 'film-lib');
for (const f of ['theme.js', 'geom.js', 'scene.js']) require(path.join(LIB, f));
const { Film } = globalThis;

test('the world is monotone by default, and roles are theme neutrals there', () => {
  Film.worldColor(false);
  assert.strictEqual(Film.worldColor(), false);
  assert.strictEqual(Film.hex('leaf'), Film.hex('n2a'));
  assert.strictEqual(Film.hex('roof'), Film.hex('n2'));
  assert.strictEqual(Film.hex('wall'), Film.hex('paper'));
});

test('in colour, roles are hues, and every role has both', () => {
  Film.worldColor(true);
  try {
    assert.notStrictEqual(Film.hex('leaf'), Film.hex('n2a'));
    for (const m of Film.materials) {
      const [r, g, b] = Film.color(m);
      assert.ok([r, g, b].every(v => v >= 0 && v <= 1), m);
    }
    // the highlight doesn't change with the world
    Film.worldColor(false); const hlMono = Film.hex('hl'); Film.worldColor(true);
    assert.strictEqual(Film.hex('hl'), hlMono);
  } finally { Film.worldColor(false); }
});

test('a brand can set a role through the theme palette', () => {
  window.Charts.palette['w-roof'] = '#123456';
  Film.worldColor(true);
  try { assert.strictEqual(Film.hex('roof'), '#123456'); }
  finally { Film.worldColor(false); delete window.Charts.palette['w-roof']; }
});

test('colour hues stay muted: none is as saturated as the highlight', () => {
  Film.worldColor(true);
  try {
    const sat = c => { const [r, g, b] = Film.color(c); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx ? (mx - mn) / mx : 0; };
    const hl = sat('hl');
    for (const m of Film.materials) assert.ok(sat(m) < hl * 0.6, m + ' is ' + sat(m).toFixed(2) + ' saturated');
  } finally { Film.worldColor(false); }
});

test('paint reaches hidden parts, so a thing shows its colour when it appears', () => {
  const g = Film.group();
  const inner = g.group({ visible: false });
  const m = inner.box([1, 1, 1], { color: 'n1' });
  g.set({ visible: false });
  g.paint('hl');
  assert.strictEqual(m.color, 'hl');
});
