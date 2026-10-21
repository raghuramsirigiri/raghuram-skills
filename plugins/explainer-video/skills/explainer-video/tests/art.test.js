// node --test plugins/explainer-video/skills/explainer-video/tests/art.test.js
//
// Monochrome artwork (art.js) goes only where a scene's layout leaves room:
// inside the safe area, below the accent bar, clear of every text line,
// bar, image and data area; in one tone the audit reads as ground, not ink.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { load, mockCtx } = require('./harness');

const LOGO = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="10"/>').toString('base64');
const claim = (id, value, display) => ({ id, value, display, source: 'A', locator: 'p. 4', verbatim: display, kind: 'copied' });
function spec(art) {
  return {
    meta: { title: 'A', locale: 'en-GB', preset: 'default', fps: 30, seed: 1, audio: { score: 'off' }, art, brand: { name: 'Port Halden Transit', logo: LOGO } },
    cuts: {},
    sources: [{ id: 'A', name: 'Port Halden Transit annual report', date: '2026-03-02' }],
    claims: [claim('F1', 41, '41%'), claim('F2', 1.4, '1.4m'), claim('F3', 1.9, '1.9m'), claim('F4', 68, '68%')],
    data: [{ id: 'D1', source: 'A', locator: 't2', unit: 'm', x: ['2021', '2022', '2023', '2024'], y: [0.8, 1.1, 1.4, 1.9] }],
    scenes: [
      { id: 'hook', type: 'hook-headline', copy: { kicker: 'Ferries', headline: 'Trips rose {F1} in a year' } },
      { id: 'title', type: 'kicker-title', copy: { kicker: 'The year', title: 'Commuters came back' } },
      { id: 'big', type: 'big-number', copy: { value: 'F3', line: 'trips, the highest since 2009' } },
      { id: 'bars', type: 'compare-bars', copy: { title: 'Up from {F2} to {F3}' }, bars: [{ label: '2024', value: 'F2' }, { label: '2025', value: 'F3', emph: true }] },
      { id: 'trend', type: 'trend-line', copy: { title: 'Back above 2021' }, series: 'D1' },
      { id: 'share', type: 'share-split', copy: { title: 'Commuters made {F4}' }, parts: [{ label: 'Commuters', value: 'F4', emph: true }] },
      { id: 'ba', type: 'before-after', copy: { title: 'A year of growth' }, before: { label: '2024', value: 'F2' }, after: { label: '2025', value: 'F3' } },
      { id: 'steps', type: 'steps', copy: { title: 'Three steps' }, steps: ['Buy a card', 'Tap on', 'Ride'] },
      { id: 'tl', type: 'timeline', copy: { title: 'What changed' }, events: [{ date: 'March', text: 'Route opens' }, { date: 'June', text: 'Fares frozen' }] },
      { id: 'bullets', type: 'bullet-stack', copy: { title: 'Next year' }, points: ['Two new boats', 'Later sailings'] },
      { id: 'src', type: 'source-card' },
      { id: 'outro', type: 'outro', copy: { cta: 'Timetables at the terminal' } }
    ]
  };
}
const FORMATS = ['9:16', '4:5', '1:1', '16:9'];
// Art is off by default; these tests turn it on with "auto" unless they say otherwise.
function compile(format, art = 'auto') {
  const w = load();
  const s = spec(art);
  s.cuts.c = { format, scenes: s.scenes.map(x => x.id) };
  return { w, C: w.Motion.compile(s, 'c', { measure: mockCtx() }) };
}
const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

test('art sits inside the safe area, below the bar, clear of everything the scene shows', () => {
  for (const f of FORMATS) {
    const { w, C } = compile(f);
    const S = C.safe, R = w.Motion.layout.RULE;
    let placed = 0;
    for (const sc of C.scenes) {
      const a = sc.art;
      if (!a) continue;
      placed++;
      assert.ok(a.x >= S.x - 0.5 && a.y >= S.y + R.accentH && a.x + a.w <= S.x + S.w + 0.5 && a.y + a.h <= S.y + S.h + 0.5, `${f} ${sc.id}: art leaves the safe area`);
      const boxes = w.Motion.art.boxes(sc.layers, [], mockCtx());
      for (const b of boxes) assert.ok(!hit(a, b), `${f} ${sc.id}: art overlaps ${JSON.stringify(b)}`);
    }
    assert.ok(placed >= 4, `${f}: art placed in only ${placed} scenes`);
  }
});

test('art keeps clear of a data area, not just of what is drawn in it', () => {
  for (const f of FORMATS) {
    const { C } = compile(f);
    for (const id of ['trend', 'bars']) {
      const sc = C.scenes.find(s => s.id === id);
      if (!sc.art) continue;
      const plot = sc.layers.find(l => l.id === 'line' || l.id === 'bar-0');
      // The trend plot spans its whole box; the bars span their row's full width.
      const rows = sc.layers.filter(l => /^bar-/.test(l.id));
      const box = id === 'bars' ? { x: Math.min(...rows.map(r => r.x)), y: Math.min(...rows.map(r => r.y)), w: C.safe.w * 0.5, h: Math.max(...rows.map(r => r.y + r.h)) - Math.min(...rows.map(r => r.y)) } : null;
      if (box) assert.ok(!hit(sc.art, box), `${f} ${id}: art inside the bars' plot`);
      assert.ok(plot, id);
    }
  }
});

test('art is off by default; "auto" uses the user logo when there is one; the outro never has art', () => {
  const w = load();
  const d = spec(); delete d.meta.art; d.cuts.c = { format: '9:16', scenes: d.scenes.map(x => x.id) };
  const def = w.Motion.compile(d, 'c', { measure: mockCtx() });
  assert.strictEqual(def.art, null, 'no art unless asked for');
  assert.ok(def.scenes.every(s => !s.art));
  const { C } = compile('9:16', 'auto');
  assert.strictEqual(C.scenes.find(s => s.id === 'outro').art, null);
  assert.strictEqual(C.art.motif, 'logo');
  const off = compile('9:16', 'off').C;
  assert.strictEqual(off.art, null);
  assert.ok(off.scenes.every(s => !s.art));
});

test('art stays put from scene to scene while its spot stays free', () => {
  const w = load();
  const fr = w.Motion.layout.frame('9:16'), S = fr.safe;
  // Scene A: text across the top half. Scene B: the same, plus a short line lower down
  // that leaves A's spot free but changes where the largest empty area is.
  const top = [{ x: S.x, y: S.y + 40, w: S.w, h: S.h * 0.4 }];
  const a = w.Motion.art.place(fr, top, null);
  assert.ok(a, 'A gets art');
  const b = w.Motion.art.place(fr, top.concat([{ x: a.x + a.w + 80, y: a.y, w: 40, h: 40 }]), a);
  assert.strictEqual(b, a, 'B keeps the placement A had');
  // When content lands on A's spot, B moves.
  const c = w.Motion.art.place(fr, top.concat([{ x: a.cx - 10, y: a.cy - 10, w: 20, h: 20 }]), a);
  assert.notStrictEqual(c, a, 'B moves off a spot that is no longer free');
});

test('the tone is ground, not ink: under the audit\'s ink threshold on every preset', () => {
  const w = load();
  const rgb = h => { const n = parseInt(h.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  for (const preset of Object.keys(w.Charts.presets)) {
    const d = w.Motion.design.resolve({ preset });
    const t = rgb(w.Motion.art.tone(d)), b = rgb(d.bg);
    const step = Math.max(...t.map((v, i) => Math.abs(v - b[i])));
    assert.ok(step > 4 && step <= w.Motion.art.STEP + 1, `${preset}: tone is ${step} from the background`);
  }
});

test('bad art settings fail with a readable error', () => {
  assert.throws(() => compile('1:1', { motif: 'stars' }), /unknown motif "stars"/);
  const w = load();
  const s = spec({ motif: 'logo' }); s.meta.brand = { name: 'X' }; s.cuts.c = { format: '1:1', scenes: ['hook', 'src'] };
  assert.throws(() => w.Motion.compile(s, 'c', { measure: mockCtx() }), /needs meta.brand.logo/);
});

test('every motif paints without throwing, in every format', () => {
  for (const motif of ['contour', 'rings', 'dots', 'lines', 'logo']) {
    for (const f of FORMATS) {
      const { w, C } = compile(f, { motif });
      for (const sc of C.scenes) assert.doesNotThrow(() => w.Motion.seek(mockCtx(), C, (sc.enterEnd + sc.exitStart) / 2), `${motif} ${f} ${sc.id}`);
    }
  }
});
