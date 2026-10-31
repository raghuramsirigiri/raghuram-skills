// node --test plugins/explainer-video/skills/explainer-video/tests/scenes.test.js
//
// Every registered scene paints at the start, middle and end of its life in
// all four formats without throwing; has a manifest entry whose slots match
// its own; and has a section in references/scenes.md.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { load, mockCtx, SKILL } = require('./harness');

const manifest = JSON.parse(fs.readFileSync(path.join(SKILL, 'assets', 'motion-lib', 'motion.manifest.json'), 'utf8'));
const scenesMd = fs.readFileSync(path.join(SKILL, 'references', 'scenes.md'), 'utf8');
const PNG = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>').toString('base64');

// One spec that uses every scene type.
function gallery() {
  const claim = (id, value, display, extra) => Object.assign({ id, value, display, source: 'A', locator: '¶1', verbatim: display, kind: 'copied' }, extra);
  return {
    meta: { title: 'G', locale: 'en-GB', preset: 'default', fps: 30, seed: 1, brand: { name: 'Example Org', logo: PNG } },
    cuts: {},
    sources: [{ id: 'A', name: 'Example source', date: '2026-01-05' }],
    claims: [claim('F1', 38, '38%'), claim('F2', 1.7, '1.7m'), claim('F3', 2.4, '2.4m'), claim('F4', 62, '62%'), claim('F5', 21, '21%'),
      claim('Q1', null, 'it was simply the quickest way', { quote: true, verbatim: 'People said it was simply the quickest way across.' })],
    data: [{ id: 'D1', source: 'A', locator: 'table 1', unit: 'days', x: ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026'], y: [40, null, 36, 31] }],
    scenes: [
      { id: 'hook', type: 'hook-headline', copy: { kicker: 'Example', headline: 'Trips up {F1} in a year' } },
      { id: 'ctx', type: 'kicker-title', copy: { title: 'Riders came back' } },
      { id: 'big', type: 'big-number', copy: { value: 'F3', line: 'trips in the year' } },
      { id: 'bars', type: 'compare-bars', copy: { title: 'Up from {F2} to {F3}' }, bars: [{ label: '2025', value: 'F2' }, { label: '2026', value: 'F3', emph: true }] },
      { id: 'trend', type: 'trend-line', copy: { title: 'Waits fell' }, series: 'D1', highlight: [2, 3] },
      { id: 'share', type: 'share-split', copy: { title: '{F4} by ferry' }, parts: [{ label: 'Ferry', value: 'F4', emph: true }, { label: 'Bus', value: 'F5' }] },
      { id: 'share-bar', type: 'share-split', copy: { title: 'Three ways across' }, style: 'bar', parts: [{ label: 'Ferry', value: 'F4' }, { label: 'Bus', value: 'F5' }] },
      { id: 'rank', type: 'ranked-list', copy: { title: 'Busiest routes' }, rows: [{ label: 'A', value: 'F3' }, { label: 'B', value: 'F2' }] },
      { id: 'ba', type: 'before-after', copy: { title: 'From {F2} to {F3}' }, before: { label: '2025', value: 'F2' }, after: { label: '2026', value: 'F3' } },
      { id: 'tl', type: 'timeline', copy: { title: 'The year' }, events: [{ date: 'March', text: 'Route opens' }, { date: 'June', text: 'Fares frozen' }] },
      { id: 'steps', type: 'steps', copy: { title: 'Three steps' }, steps: ['Buy', 'Tap', 'Ride'] },
      { id: 'quote', type: 'quote', copy: { quote: 'Q1', name: 'A. Person', role: 'Operations' } },
      { id: 'bullets', type: 'bullet-stack', copy: { title: 'Also' }, points: ['One', 'Two'] },
      { id: 'photo', type: 'photo-pan', copy: { caption: 'The terminal', image: PNG } },
      { id: 'custom', type: 'custom', draw: 'probe', copy: { title: 'Custom' } },
      { id: 'src', type: 'source-card' },
      { id: 'outro', type: 'outro', copy: { cta: 'See the timetable' } }
    ]
  };
}

const FORMATS = ['9:16', '4:5', '1:1', '16:9'];

test('every scene paints at start, middle and end in all four formats', () => {
  const w = load();
  w.Motion.custom.probe = { enter: 0.5, read: 1.2, draw(ctx, lt, api) { api.paint.rect(ctx, api.box.x, api.box.y, api.box.w * api.at(0, 0.5), 10, api.design.subject); } };
  const spec = gallery();
  for (const f of FORMATS) {
    spec.cuts[f] = { format: f, scenes: spec.scenes.map(s => s.id) };
    const C = w.Motion.compile(spec, f, { measure: mockCtx() });
    for (const sc of C.scenes) {
      for (const t of [sc.t0, (sc.cStart + sc.cEnd) / 2, sc.t1 - 1e-6]) {
        assert.doesNotThrow(() => w.Motion.seek(mockCtx(), C, Math.min(t, C.duration - 1e-6)), `${sc.type} in ${f} at ${t}`);
      }
    }
  }
});

test('every registered scene has a manifest entry with matching slots', () => {
  const w = load();
  const reg = Object.keys(w.Motion.scenes).sort();
  assert.deepStrictEqual(reg, Object.keys(manifest.scenes).sort());
  for (const k of reg) {
    assert.strictEqual(JSON.stringify(w.Motion.scenes[k].slots), JSON.stringify(manifest.scenes[k].slots), `slots of ${k}`);
  }
});

test('every registered scene has a section in references/scenes.md', () => {
  const w = load();
  const missing = Object.keys(w.Motion.scenes).filter(k => !new RegExp('^## ' + k + '$', 'm').test(scenesMd));
  assert.deepStrictEqual(missing, []);
});

test('the manifest lists every transition the engine knows', () => {
  const w = load();
  assert.deepStrictEqual(Object.keys(w.Motion.transitions.list).sort(), Object.keys(manifest.transitions).sort());
  for (const [k, v] of Object.entries(manifest.transitions)) {
    assert.strictEqual(w.Motion.transitions.list[k].dur, v.dur, k);
    assert.strictEqual(w.Motion.transitions.list[k].ownsExit, v.ownsExit, k);
  }
});

test('the manifest lists every picture the continuous style knows, with its skins and needs', () => {
  const w = load();
  const reg = w.Motion.pictures.list;
  assert.deepStrictEqual(Object.keys(reg).sort(), Object.keys(manifest.pictures).sort());
  for (const [k, v] of Object.entries(manifest.pictures)) {
    assert.deepStrictEqual(JSON.parse(JSON.stringify(reg[k].skins || null)), v.skins || null, `skins of ${k}`);
    if (v.needs) assert.deepStrictEqual(JSON.parse(JSON.stringify(reg[k].needs || [])), v.needs, `needs of ${k}`);
    // A place of its own with no data (the desk) has no skins; a prop has skins.
    const d = reg[k], role = d.emphasis ? 'emphasis' : d.data ? 'data' : d.prop && !d.skins ? 'place' : 'prop';
    assert.strictEqual(role, v.role, `role of ${k}`);
  }
});

test('the manifest formats match the layout module', () => {
  const w = load();
  for (const [k, v] of Object.entries(manifest.formats)) {
    const F = w.Motion.layout.FORMATS[k];
    assert.deepStrictEqual([F.W, F.H], v.size);
    assert.strictEqual(JSON.stringify(F.safe), JSON.stringify(v.safe));
  }
});

test('chart scenes refuse bad data with readable errors', () => {
  const w = load();
  const spec = gallery();
  const one = (scene) => { const s = JSON.parse(JSON.stringify(spec)); s.scenes = [scene, { id: 'src', type: 'source-card' }]; s.cuts = { m: { format: '1:1', scenes: [scene.id, 'src'] } }; return () => w.Motion.compile(s, 'm', { measure: mockCtx() }); };
  assert.throws(one({ id: 'x', type: 'compare-bars', copy: { title: 't' }, bars: [{ label: 'a', value: 'F2' }] }), /2 to 6 bars/);
  assert.throws(one({ id: 'x', type: 'ranked-list', copy: { title: 't' }, rows: [{ label: 'a', value: 'F2' }, { label: 'b', value: 'F3' }] }), /rank order/);
  assert.throws(one({ id: 'x', type: 'share-split', copy: { title: 't' }, parts: [{ label: 'a', value: 'F4' }, { label: 'b', value: 'F4' }] }), /more than 100%/);
  assert.throws(one({ id: 'x', type: 'trend-line', copy: { title: 't' }, series: 'nope' }), /no data table/);
  assert.throws(one({ id: 'x', type: 'photo-pan', copy: { caption: 'c', image: 'https://example.com/a.jpg' } }), /data:image/);
  assert.throws(one({ id: 'x', type: 'custom', draw: 'missing' }), /Motion.custom.missing/);
});

test('a custom painter draws its figures from the claims it names, in both styles', () => {
  for (const style of ['slides', 'continuous']) {
    const w = load();
    const seen = [];
    w.Motion.custom.cars = { enter: 0.5, read: 1.2, draw(ctx, lt, api) { seen.push([api.value('F4'), api.display('F4')]); } };
    const spec = gallery();
    spec.meta.style = style;
    spec.scenes = [
      { id: 'big', type: 'big-number', copy: { value: 'F1', line: 'of trips' }, picture: { kind: 'blocks', skin: 'plain', of: 'trips' } },
      { id: 'cars', type: 'custom', draw: 'cars', claims: ['F4'], copy: { title: 'Cars' } },
      { id: 'src', type: 'source-card' }];
    spec.cuts = { m: { format: '9:16', scenes: ['big', 'cars', 'src'] } };
    const C = w.Motion.compile(spec, 'm', { measure: mockCtx() });
    const sc = C.scenes[1];
    assert.ok([...sc.used].includes('F4'), style + ': the scene cites the claim it draws, so its source line lists it');
    w.Motion.seek(mockCtx(), C, (sc.enterEnd + sc.exitStart) / 2);
    assert.deepStrictEqual([...seen[seen.length - 1]], [62, '62%'], style);
    w.Motion.custom.cars.draw = (ctx, lt, api) => api.value('F5');
    assert.throws(() => w.Motion.seek(mockCtx(), C, (sc.enterEnd + sc.exitStart) / 2), /not in its "claims"/, style);
  }
});
