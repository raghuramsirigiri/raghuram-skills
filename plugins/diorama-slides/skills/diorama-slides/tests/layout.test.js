// node --test plugins/explainer-video/skills/explainer-video/tests/layout.test.js
//
// Each aspect class has its own composition (references/formats.md § Layout
// per format), not one square card placed in a bigger frame. The audit's fill
// check measures the result in the browser (tests/layout-gallery.html); these
// pin the geometry that produces it.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { load, mockCtx } = require('./harness');

const claim = (id, value, display) => ({ id, value, display, source: 'A', locator: 'p. 4', verbatim: display, kind: 'copied' });
function spec() {
  return {
    meta: { title: 'L', locale: 'en-GB', preset: 'default', fps: 30, seed: 1, audio: { score: 'off' } },
    cuts: {},
    sources: [{ id: 'A', name: 'Port Halden Transit annual report', date: '2026-03-02' }],
    claims: [claim('F1', 41, '41%'), claim('F2', 1.4, '1.4m'), claim('F3', 1.9, '1.9m'), claim('F4', 68, '68%')],
    data: [{ id: 'D1', source: 'A', locator: 't2', unit: 'm', x: ['2021', '2022', '2023', '2024'], y: [0.8, 1.1, 1.4, 1.9] }],
    scenes: [
      { id: 'title', type: 'kicker-title', copy: { kicker: 'The year', title: 'Commuters came back to the harbour line' } },
      { id: 'big', type: 'big-number', copy: { value: 'F3', line: 'trips, the highest total since 2009' } },
      { id: 'bars', type: 'compare-bars', copy: { title: 'Trips rose from {F2} to {F3}' }, bars: [{ label: '2024', value: 'F2' }, { label: '2025', value: 'F3', emph: true }] },
      { id: 'trend', type: 'trend-line', copy: { title: 'Trips are back above 2021' }, series: 'D1' },
      { id: 'share', type: 'share-split', copy: { title: 'Commuters made {F4} of trips' }, parts: [{ label: 'Commuters', value: 'F4', emph: true }] },
      { id: 'ba', type: 'before-after', copy: { title: 'A year of growth' }, before: { label: '2024', value: 'F2' }, after: { label: '2025', value: 'F3' } },
      { id: 'steps', type: 'steps', copy: { title: 'Riding takes three steps' }, steps: ['Buy a card', 'Tap on', 'Ride'] },
      { id: 'tl', type: 'timeline', copy: { title: 'What changed' }, events: [{ date: 'March', text: 'Route opens' }, { date: 'June', text: 'Fares frozen' }] },
      { id: 'bullets', type: 'bullet-stack', copy: { title: 'Next year' }, points: ['Two new boats', 'Later sailings'] },
      { id: 'src', type: 'source-card' }
    ]
  };
}
function compile(format) {
  const w = load();
  const s = spec();
  s.cuts.c = { format, scenes: s.scenes.map(x => x.id) };
  return { w, C: w.Motion.compile(s, 'c', { measure: mockCtx() }) };
}
const scene = (C, id) => C.scenes.find(s => s.id === id);
const layer = (sc, id) => sc.layers.find(l => l.id === id);
const right = l => Math.max(...l.lines.map(ln => ln.x + ln.w));

test('every format has a profile for its aspect class', () => {
  const { w } = compile('1:1');
  for (const [k, f] of Object.entries(w.Motion.layout.FORMATS)) {
    const fr = w.Motion.layout.frame(k);
    assert.ok(w.Motion.layout.PROFILE[f.cls], k);
    assert.strictEqual(fr.profile, w.Motion.layout.PROFILE[f.cls], k);
  }
});

test('16:9 puts the words in a left column and the chart beside them', () => {
  const { C } = compile('16:9');
  const S = C.safe, col = S.x + S.w * 0.4;
  for (const id of ['bars', 'trend', 'share', 'ba', 'steps', 'tl', 'bullets']) {
    const sc = scene(C, id);
    const head = layer(sc, 'headline');
    assert.ok(right(head) <= col + 1, `${id}: headline runs to ${right(head)}, past the column at ${col}`);
    // Everything that isn't the card's own text starts right of the column.
    const own = new Set(['headline', 'units']);
    const rest = sc.layers.filter(l => !own.has(l.id) && !/^source-/.test(l.id) && l.kind !== 'draw');
    for (const l of rest) {
      const x = l.lines ? Math.min(...l.lines.map(ln => ln.x)) : l.x;
      assert.ok(x >= col, `${id}: ${l.id} starts at ${x}, inside the words' column`);
    }
  }
});

test('16:9 sets a big number in the left half with its words beside it', () => {
  const { C } = compile('16:9');
  const sc = scene(C, 'big');
  const v = layer(sc, 'value'), line = layer(sc, 'line');
  assert.ok(Math.min(...line.lines.map(l => l.x)) >= C.safe.x + C.safe.w * 0.5, 'line sits right of the figure');
  assert.ok(v.size > 165, `figure is ${v.size}px, no bigger than a square frame's`);
});

test('tall frames set the words a step larger than square ones', () => {
  const sq = compile('1:1').C, tall = compile('9:16').C;
  for (const id of ['bars', 'trend', 'share']) {
    const a = layer(scene(sq, id), 'headline').size, b = layer(scene(tall, id), 'headline').size;
    assert.ok(b > a * 1.15, `${id}: tall headline ${b} vs square ${a}`);
  }
  assert.ok(layer(scene(tall, 'big'), 'value').size > layer(scene(sq, 'big'), 'value').size, 'tall big number is larger');
});

test('a title on its own grows past the card headline in every format', () => {
  for (const f of ['9:16', '4:5', '1:1', '16:9']) {
    const { w, C } = compile(f);
    const size = layer(scene(C, 'title'), 'headline').size;
    const card = w.Motion.layout.typeFor(w.Motion.layout.frame(f)).headline.size;
    assert.ok(size > card * 1.3, `${f}: title ${size}px vs card ${card}px`);
  }
});

test('a tall frame spreads steps and timeline rows down its height', () => {
  const { C } = compile('9:16');
  for (const [id, prefix] of [['steps', 'step-'], ['tl', 'date-']]) {
    const sc = scene(C, id);
    const ys = sc.layers.filter(l => l.id.startsWith(prefix)).map(l => l.lines[0].y);
    const span = Math.max(...ys) - Math.min(...ys);
    assert.ok(span > C.safe.h * 0.25, `${id}: rows span ${span}px of a ${C.safe.h}px safe area`);
  }
});

test('the headline never grows into the footer', () => {
  for (const f of ['9:16', '4:5', '1:1', '16:9']) {
    const { C } = compile(f);
    assert.ok(C.zone.rows > 0, `${f}: the video has a footer`);
    for (const sc of C.scenes) {
      const head = layer(sc, 'headline');
      if (!head) continue;
      const bottom = Math.max(...head.lines.map(l => l.y + l.h));
      assert.ok(bottom <= C.zone.ruleY, `${f} ${sc.id}: headline ends at ${bottom}, the footer's hairline is at ${C.zone.ruleY}`);
    }
  }
});

test('the outro grows its name only as far as the safe width: a long word never runs past it', () => {
  for (const f of ['9:16', '4:5', '1:1', '16:9']) {
    const w = load();
    const s = {
      meta: { title: 'O', locale: 'en-GB', preset: 'default', fps: 30, seed: 1, audio: { score: 'off' }, brand: { name: 'Northvale Co-operative' } },
      cuts: { c: { format: f, scenes: ['src', 'out'] } },
      sources: [{ id: 'A', name: 'Annual report', date: '2026-03-02' }],
      claims: [], scenes: [{ id: 'src', type: 'source-card' }, { id: 'out', type: 'outro', copy: { cta: 'Read the findings' } }]
    };
    const C = w.Motion.compile(s, 'c', { measure: mockCtx() });
    const name = layer(scene(C, 'out'), 'name');
    for (const ln of name.lines) {
      assert.ok(ln.x >= C.safe.x - 0.5 && ln.x + ln.w <= C.safe.x + C.safe.w + 0.5, `${f}: "${ln.text}" spans ${Math.round(ln.x)}..${Math.round(ln.x + ln.w)}, the safe area ${C.safe.x}..${C.safe.x + C.safe.w}`);
    }
  }
});
