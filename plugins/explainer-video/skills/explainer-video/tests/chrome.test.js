// node --test plugins/explainer-video/skills/explainer-video/tests/chrome.test.js
//
// The chrome every scene shares (the accent bar, the kicker line, the footer:
// a hairline over the source line) sits in one place for the whole video and
// stays still through transitions. Only its words change, in place, and only
// when the next scene's words differ. Scene content lives between them.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { load, mockCtx } = require('./harness');

const claim = (id, value, display, source) => ({ id, value, display, source: source || 'A', locator: 'p. 4', verbatim: display, kind: 'copied' });
function spec() {
  return {
    meta: { title: 'C', locale: 'en-GB', preset: 'default', fps: 30, seed: 1, audio: { score: 'off' }, brand: { name: 'Port Halden Transit' } },
    cuts: {},
    sources: [
      { id: 'A', name: 'Port Halden Transit annual report', date: '2026-03-02' },
      // Long enough to need two footer rows in a narrow frame.
      { id: 'B', name: 'Port Halden Transit Authority annual report and accounts, statistical annex, passenger tables', date: '2026-03-02' }
    ],
    claims: [claim('F1', 41, '41%'), claim('F2', 1.9, '1.9m'), claim('F3', 1.4, '1.4m'), claim('F4', 2.1, '2.1m', 'B')],
    data: [{ id: 'D1', source: 'B', locator: 't2', unit: 'm', x: ['2021', '2022', '2023', '2024'], y: [0.8, 1.1, 1.4, 1.9] }],
    scenes: [
      { id: 'hook', type: 'big-number', copy: { kicker: 'Ferries', value: 'F1', line: 'more trips than the year before' } },
      { id: 'same', type: 'big-number', copy: { kicker: 'Ferries', value: 'F2', line: 'trips, the highest since 2009' } },
      { id: 'bars', type: 'compare-bars', transitionIn: 'morph-bar', copy: { kicker: 'Year on year', title: 'Up from {F3} to {F2}' }, bars: [{ label: '2024', value: 'F3' }, { label: '2025', value: 'F2', emph: true }] },
      { id: 'ctx', type: 'kicker-title', copy: { kicker: 'Year on year', title: 'Commuters came back' } },
      { id: 'trend', type: 'trend-line', transitionIn: 'scan', copy: { title: 'Back above 2021' }, series: 'D1', end: 'F4' },
      { id: 'src', type: 'source-card', transitionIn: 'flood' },
      { id: 'outro', type: 'outro', copy: { cta: 'Timetables at the terminal' } }
    ]
  };
}
const FORMATS = ['9:16', '4:5', '1:1', '16:9'];
function compile(format) {
  const w = load();
  const s = spec();
  s.cuts.c = { format, scenes: s.scenes.map(x => x.id) };
  return { w, C: w.Motion.compile(s, 'c', { measure: mockCtx() }) };
}
// Text records of the chrome at time t.
function chromeAt(w, C, t) {
  w.Motion.debug.record = [];
  const log = [];
  w.Motion.seek(mockCtx(log), C, t);
  const recs = w.Motion.debug.record.filter(r => /^chrome-/.test(r.layer || ''));
  w.Motion.debug.record = null;
  return { kicker: recs.filter(r => r.layer === 'chrome-kicker'), source: recs.filter(r => /^chrome-source-/.test(r.layer)), log };
}
const hold = sc => (sc.enterEnd + sc.exitStart) / 2;
const mid = sc => sc.t0 + sc.ovIn / 2;
const scene = (C, id) => C.scenes.find(s => s.id === id);

test('the kicker and the source line are the frame\'s, never a scene\'s own layers', () => {
  const { C } = compile('9:16');
  for (const sc of C.scenes) {
    assert.ok(!sc.layers.some(l => l.id === 'kicker' || /^source-/.test(l.id)), `${sc.id} still builds its own kicker or source line`);
  }
});

test('the kicker sits in one place on every scene, in every format', () => {
  for (const f of FORMATS) {
    const { w, C } = compile(f);
    let checked = 0;
    for (const sc of C.scenes) {
      if (!sc.chrome || !sc.chrome.kicker) continue;
      checked++;
      const k = chromeAt(w, C, hold(sc)).kicker;
      assert.strictEqual(k.length, 1, `${f} ${sc.id}: one kicker`);
      assert.strictEqual(k[0].bbox[0], C.safe.x, `${f} ${sc.id}: kicker x`);
      assert.strictEqual(k[0].bbox[1], C.zone.kickerY, `${f} ${sc.id}: kicker y`);
    }
    assert.ok(checked >= 4, `${f}: only ${checked} scenes with a kicker`);
  }
});

test('the footer sits in one place for the whole video: hairline and first row never move', () => {
  for (const f of FORMATS) {
    const { w, C } = compile(f);
    const hair = 'moveTo(' + C.safe.x + ',' + Math.round(C.zone.ruleY * 1000) / 1000 + ')';
    for (const sc of C.scenes) {
      if (!sc.chrome) continue;
      const at = chromeAt(w, C, hold(sc));
      assert.ok(at.log.some(l => l.startsWith(hair)), `${f} ${sc.id}: hairline at ${C.zone.ruleY}`);
      if (sc.chrome.source) assert.strictEqual(Math.min(...at.source.map(r => r.bbox[1])), C.zone.rowsY, `${f} ${sc.id}: first footer row`);
    }
  }
});

test('the footer is as tall as the longest source line needs, on every scene', () => {
  const { C } = compile('9:16');
  const most = Math.max(...C.scenes.map(sc => (sc.chrome && sc.chrome.source ? new Set(sc.chrome.source.runs.map(r => r.y)).size : 0)));
  assert.ok(most >= 2, 'the long source takes two rows in 9:16');
  assert.strictEqual(C.zone.rows, most);
});

test('scene content stays between the kicker line and the footer', () => {
  for (const f of FORMATS) {
    const { C } = compile(f);
    assert.ok(C.zone && C.zone.top > C.safe.y, `${f}: no shared frame zone`);
    for (const sc of C.scenes) {
      if (!sc.chrome) continue;
      for (const l of sc.layers) {
        const boxes = l.lines ? l.lines.map(ln => [ln.y, ln.y + ln.h]) : l.kind === 'rect' || l.kind === 'image' ? [[l.y, l.y + l.h]] : [];
        for (const [y0, y1] of boxes) {
          assert.ok(y0 >= C.zone.top - 0.5 && y1 <= C.zone.ruleY + 0.5, `${f} ${sc.id}/${l.id}: ${y0}..${y1} outside ${C.zone.top}..${C.zone.ruleY}`);
        }
      }
    }
  }
});

test('the same kicker and source line stay perfectly still through a transition', () => {
  const { w, C } = compile('9:16');
  const sc = scene(C, 'same');
  const before = chromeAt(w, C, hold(scene(C, 'hook')));
  assert.strictEqual(before.kicker.length, 1, 'the hook has a kicker');
  assert.ok(before.source.length > 0, 'the hook has a source line');
  for (const t of [sc.t0 + 0.01, mid(sc), sc.cStart - 0.01]) {
    const now = chromeAt(w, C, t);
    assert.deepStrictEqual(now.kicker.map(r => [r.text, r.bbox, r.alpha]), before.kicker.map(r => [r.text, r.bbox, r.alpha]), `kicker at ${t}`);
    assert.deepStrictEqual(now.source.map(r => [r.text, r.bbox, r.alpha]), before.source.map(r => [r.text, r.bbox, r.alpha]), `source at ${t}`);
  }
});

test('a new kicker swaps in place, inside its own line, and a new source line fades where the old one was', () => {
  const { w, C } = compile('9:16');
  const sc = scene(C, 'bars');
  const k = C.zone;
  const now = chromeAt(w, C, mid(sc));
  assert.strictEqual(new Set(now.kicker.map(r => r.text)).size, 2, 'old and new kicker both mid-swap');
  for (const r of now.kicker) {
    assert.strictEqual(r.bbox[0], C.safe.x);
    assert.ok(r.bbox[1] >= k.kickerY - 4 && r.bbox[1] + r.bbox[3] <= k.kickerY + k.kickerH + 4, `kicker "${r.text}" left its line: ${r.bbox}`);
  }
  // Into the trend scene the source line changes (A to B): rows stay on the footer's rows.
  const tr = scene(C, 'trend');
  for (const t of [tr.t0 + tr.ovIn * 0.25, tr.t0 + tr.ovIn * 0.75]) {
    for (const r of chromeAt(w, C, t).source) assert.ok(r.bbox[1] >= k.rowsY - 0.5, `source row at ${r.bbox[1]}`);
  }
});

test('the chrome leaves before the outro and is not drawn on it', () => {
  const { w, C } = compile('9:16');
  const out = scene(C, 'outro');
  const src = chromeAt(w, C, hold(scene(C, 'src')));
  assert.strictEqual(src.kicker.length, 1, 'the source card carries the chrome');
  const now = chromeAt(w, C, hold(out));
  assert.strictEqual(now.kicker.length + now.source.length, 0);
  assert.strictEqual(out.chrome, null);
});
