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
function shapeFiles() {
  return fs.readdirSync(path.join(LIB, 'shapes')).filter(f => f.endsWith('.js')).sort();
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
  shapeFiles().forEach(f => run(path.join(LIB, 'shapes', f)));
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

const PAINTER = `Motion.things.block = { draw(V, s, api) {
  const f = s.form;
  V.block(-f.len / 2, -4, 0, f.len, 8, f.h, api.mat.N3);
} };`;

const FIXTURE_SPEC = () => ({
  meta: { title: 'Test', locale: 'en-GB', preset: 'default', fps: 30, seed: 3, audio: { score: 'off' } },
  stage: {
    shape: 'transformation', subject: 'block', size: [20, 8, 10],
    states: [
      { id: 'small', label: '1990', form: { len: 10, h: 4 } },
      { id: 'mid', label: '2005', form: { len: 15, h: 7 } },
      { id: 'big', label: '2020', form: { len: 20, h: 10 } }
    ]
  },
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
    { id: 'hook', type: 'beat', copy: { kicker: 'Northvale', title: 'Water use fell {F1} this winter' }, stage: { state: 'small' } },
    { id: 'mid', type: 'beat', copy: { kicker: '2005', title: 'The works grew' }, stage: { state: 'mid', zoom: 1.2 } },
    { id: 'big', type: 'beat', copy: { kicker: '2020', title: 'Pumps rose from {F2} to {F3}' }, stage: { state: 'big' },
      chart: { kind: 'bars', bars: [{ label: '2005', value: 'F2' }, { label: '2020', value: 'F3', emph: true }] } },
    { id: 'src', type: 'source-card' }
  ],
  caption: 'Water use fell 12% this winter.', alt: 'A water works grows across three eras; use fell 12%.'
});

module.exports = { load, mockCtx, SKILL, LIB, ORDER, sceneFiles, shapeFiles, FIXTURE_SPEC, PAINTER };
