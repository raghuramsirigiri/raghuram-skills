// Shared test harness: loads charts-lib's theme.js and motion-lib into Node
// with a recording mock 2D context. Not a test file itself (no .test.js).
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SKILL = path.join(__dirname, '..');
const LIB = path.join(SKILL, 'assets', 'motion-lib');
const ORDER = ['core', 'ease', 'text', 'paint', 'layout', 'design', 'transitions', 'art', 'iso', 'world', 'arrange', 'act'];

function sceneFiles() {
  return fs.readdirSync(path.join(LIB, 'scenes')).filter(f => f.endsWith('.js')).sort();
}
function pictureFiles() {
  return fs.readdirSync(path.join(LIB, 'pictures')).filter(f => f.endsWith('.js')).sort();
}
function thingFiles() {
  return fs.readdirSync(path.join(LIB, 'things')).filter(f => f.endsWith('.js')).sort();
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
  thingFiles().forEach(f => run(path.join(LIB, 'things', f)));
  pictureFiles().forEach(f => run(path.join(LIB, 'pictures', f)));
  (opts.scenes || sceneFiles()).forEach(f => run(path.join(LIB, 'scenes', f)));
  (opts.extra || []).forEach(n => run(path.join(LIB, n + '.js')));
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
    roundRect(...a) { rec('roundRect', a); }
  };
  ['fillRect', 'strokeRect', 'clearRect', 'fillText', 'strokeText', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'rect', 'clip', 'fill', 'stroke', 'drawImage', 'bezierCurveTo', 'quadraticCurveTo', 'ellipse']
    .forEach(n => { ctx[n] = (...a) => rec(n, a); });
  ['font', 'globalAlpha', 'fillStyle', 'strokeStyle', 'lineWidth', 'textBaseline', 'textAlign', 'lineCap', 'lineJoin', 'letterSpacing']
    .forEach(k => Object.defineProperty(ctx, k, { get: () => state[k], set: v => { state[k] = v; } }));
  return ctx;
}

const FIXTURE_SPEC = () => ({
  meta: { title: 'Test', locale: 'en-GB', preset: 'default', fps: 30, seed: 3, audio: { score: 'off' } },
  cuts: {
    main: { format: '9:16', scenes: ['ctx', 'hook', 'src'] },
    short: { format: '1:1', scenes: ['hook', 'src'] }
  },
  sources: [{ id: 'A', name: 'Northvale Water Board bulletin', date: '2026-03-02', kind: 'report' }],
  claims: [
    { id: 'F1', value: 12, unit: '%', display: '12%', text: 'Use fell 12%', source: 'A', locator: '¶1', verbatim: 'use fell 12%', kind: 'copied' }
  ],
  scenes: [
    { id: 'ctx', type: 'kicker-title', copy: { kicker: 'Northvale', title: 'Water use fell this winter' } },
    { id: 'hook', type: 'big-number', copy: { value: 'F1', line: 'less water used than last winter' } },
    { id: 'src', type: 'source-card' }
  ]
});

module.exports = { load, mockCtx, SKILL, LIB, ORDER, sceneFiles, pictureFiles, thingFiles, FIXTURE_SPEC };
