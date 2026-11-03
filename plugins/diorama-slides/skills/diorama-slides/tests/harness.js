// Shared test harness: loads charts-lib's theme.js and motion-lib into Node
// with a recording mock 2D context. Not a test file itself (no .test.js).
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SKILL = path.join(__dirname, '..');
const LIB = path.join(SKILL, 'assets', 'motion-lib');
const ORDER = ['core', 'ease', 'text', 'paint', 'layout', 'design', 'transitions', 'art', 'iso', 'stage'];

function sceneFiles() {
  return fs.readdirSync(path.join(LIB, 'scenes')).filter(f => f.endsWith('.js')).sort();
}

// A fresh sandbox per call, so no state leaks between tests.
function load(opts) {
  opts = opts || {};
  const sandbox = { console, Intl, Math, Date, JSON, Map, Set, Uint8Array, ArrayBuffer, DataView, Error, Promise, setTimeout };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const run = f => vm.runInContext(fs.readFileSync(f, 'utf8'), sandbox, { filename: f });
  run(path.join(SKILL, 'assets', 'charts-lib', 'theme.js'));
  ORDER.forEach(n => run(path.join(LIB, n + '.js')));
  (opts.scenes || sceneFiles()).forEach(f => run(path.join(LIB, 'scenes', f)));
  (opts.extra || []).forEach(n => run(path.join(LIB, n + '.js')));
  // The page's own painter for the fixture's subject: a block whose length
  // is its form's `len`.
  vm.runInContext(PAINTER, sandbox);
  return sandbox;
}

// Mock 2D context. measureText approximates widths from the font size, so
// layout is stable and deterministic; every call is logged.
function mockCtx(log) {
  const state = { font: '10px sans-serif', globalAlpha: 1, fillStyle: '#000', strokeStyle: '#000', lineWidth: 1 };
  const stack = [];
  let T = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const rec = (name, args) => { if (log) log.push(name + '(' + args.map(a => (typeof a === 'number' ? Math.round(a * 1000) / 1000 : typeof a === 'string' ? a : '?')).join(',') + ')|' + state.globalAlpha.toFixed(4) + '|' + state.fillStyle + '|' + state.font); };
  const sizeOf = () => { const m = /(\d+(?:\.\d+)?)px/.exec(state.font); return m ? +m[1] : 10; };
  const ctx = {
    measureText(s) {
      const bold = /^(6|7|8|9)00/.test(state.font) ? 1.06 : 1;
      let w = 0;
      for (const ch of String(s)) w += (/[0-9]/.test(ch) ? 0.56 : /[A-Z]/.test(ch) ? 0.66 : /[ .,'·:;]/.test(ch) ? 0.28 : 0.52) * sizeOf() * bold;
      return { width: w };
    },
    save() { stack.push(Object.assign({}, state, { T: Object.assign({}, T) })); rec('save', []); },
    restore() { const s = stack.pop(); if (s) { T = s.T; delete s.T; Object.assign(state, s); } rec('restore', []); },
    getTransform() { return Object.assign({}, T); },
    translate(x, y) { T.e += x * T.a; T.f += y * T.d; rec('translate', [x, y]); },
    scale(x, y) { T.a *= x; T.d *= y; rec('scale', [x, y]); },
    rotate(a) { rec('rotate', [a]); },
    setTransform() { T = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; },
    transform(a, b, c, d, e, f) {
      T = { a: T.a * a + T.c * b, b: T.b * a + T.d * b, c: T.a * c + T.c * d, d: T.b * c + T.d * d, e: T.a * e + T.c * f + T.e, f: T.b * e + T.d * f + T.f };
      rec('transform', [a, b, c, d, e, f]);
    },
    setLineDash(d) { rec('dash', d); },
    createLinearGradient() { return { addColorStop() {} }; },
    roundRect(...a) { rec('roundRect', a); }
  };
  ['fillRect', 'strokeRect', 'clearRect', 'fillText', 'strokeText', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'rect', 'clip', 'fill', 'stroke', 'drawImage', 'bezierCurveTo', 'quadraticCurveTo', 'ellipse']
    .forEach(n => { ctx[n] = (...a) => rec(n, a); });
  ['font', 'globalAlpha', 'fillStyle', 'strokeStyle', 'lineWidth', 'textBaseline', 'textAlign', 'lineCap', 'lineJoin', 'letterSpacing']
    .forEach(k => Object.defineProperty(ctx, k, { get: () => state[k], set: v => { state[k] = v; } }));
  return ctx;
}

// The fixture's world, as a page would write it: a water works whose tank
// fills with story time (the year), pumps that run at a rate per beat, and
// a label. Its tank is the subject the camera keeps in the stage's room.
const PAINTER = `Motion.things.works = {
  marks(w) { return { tank: [0, 0, 6], pumps: [30, 0, 2] }; },
  draw(w, api) {
    const V = api.view('ground'), T = api.view('subject'), m = api.mat;
    V.block(-40, -20, 0, 100, 40, 2, m.N2);
    const h = 4 + (w.time - 1990) * 0.4;
    T.block(-8, -8, 2, 16, 16, h, m.N3);
    const turned = w.accumulate('pump', b => (b.id === 'big' ? 2 : 0.5));
    T.block(26, -3, 2, 6, 6, 3 + Math.sin(turned) * 0.5, m.N);
    api.label('Works', -8, 10, 0, { dy: 8 });
  }
};`;

const FIXTURE_SPEC = () => ({
  meta: { title: 'Test', locale: 'en-GB', preset: 'default', fps: 30, seed: 3, audio: { score: 'off' } },
  stage: { shape: 'transformation', world: 'works', size: [40, 20, 20], time: 1990,
    setting: 'a valley water works beside its reservoir', look: 'green valley floor, grey concrete tank, blue reservoir; the tank is the hero' },
  cuts: {
    main: { format: '9:16', scenes: ['hook', 'mid', 'big', 'src'] },
    short: { format: '1:1', scenes: ['hook', 'big', 'src'] }
  },
  sources: [{ id: 'A', name: 'Northvale Water Board bulletin', date: '2026-03-02' }],
  claims: [
    { id: 'F1', value: 12, unit: '%', display: '12%', source: 'A', locator: '¶1', verbatim: 'use fell 12%', kind: 'copied' },
    { id: 'F2', value: 40, unit: 'units', display: '40', source: 'A', locator: '¶2', verbatim: 'from 40 to 55', kind: 'copied' },
    { id: 'F3', value: 55, unit: 'units', display: '55', source: 'A', locator: '¶2', verbatim: 'from 40 to 55', kind: 'copied' }
  ],
  data: [],
  scenes: [
    { id: 'hook', type: 'beat', copy: { kicker: 'Northvale', title: 'Water use fell {F1} this winter' }, stage: { shows: 'the works at its smallest', focus: 'tank' } },
    { id: 'mid', type: 'beat', copy: { kicker: '2005', title: 'The works grew' }, stage: { shows: 'the tank rises', time: 2005, zoom: 1.2 } },
    { id: 'big', type: 'beat', copy: { kicker: '2020', title: 'Pumps rose from {F2} to {F3}' }, stage: { shows: 'the tank rises again and the pumps run faster', time: 2020, focus: 'pumps' },
      chart: { kind: 'bars', bars: [{ label: '2005', value: 'F2' }, { label: '2020', value: 'F3', emph: true }] } },
    { id: 'src', type: 'source-card', stage: { shows: 'the works runs on', zoom: 0.8 } }
  ],
  caption: 'Water use fell 12% this winter.', alt: 'A water works grows across three eras; use fell 12%.'
});

module.exports = { load, mockCtx, SKILL, LIB, ORDER, sceneFiles, FIXTURE_SPEC, PAINTER };
