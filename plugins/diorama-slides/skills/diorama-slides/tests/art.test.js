// node --test plugins/explainer-video/skills/explainer-video/tests/art.test.js
//
// The art (art.js, meta.art: "halftone") is a dot grid fixed to the frame,
// coming in from its top-right and bottom-left corners. Its dots shrink away
// near everything a scene shows, so it never sits on content; between scenes
// it either holds perfectly still or every dot eases to its new size at once.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { load, mockCtx } = require('./harness');

const claim = (id, value, display) => ({ id, value, display, source: 'A', locator: 'p. 4', verbatim: display, kind: 'copied' });
function spec(art) {
  const s = {
    meta: { title: 'A', locale: 'en-GB', preset: 'default', fps: 30, seed: 1, audio: { score: 'off' }, brand: { name: 'Port Halden Transit' } },
    cuts: {},
    sources: [{ id: 'A', name: 'Port Halden Transit annual report', date: '2026-03-02' }],
    claims: [claim('F1', 41, '41%'), claim('F2', 1.4, '1.4m'), claim('F3', 1.9, '1.9m'), claim('F4', 68, '68%')],
    data: [{ id: 'D1', source: 'A', locator: 't2', unit: 'm', x: ['2021', '2022', '2023', '2024'], y: [0.8, 1.1, 1.4, 1.9] }],
    scenes: [
      { id: 'hook', type: 'big-number', copy: { kicker: 'Ferries', value: 'F1', line: 'more trips than the year before' } },
      { id: 'again', type: 'big-number', copy: { kicker: 'Ferries', value: 'F1', line: 'more trips than the year before' } },
      { id: 'title', type: 'kicker-title', copy: { kicker: 'The year', title: 'Commuters came back' } },
      { id: 'bars', type: 'compare-bars', copy: { title: 'Up from {F2} to {F3}' }, bars: [{ label: '2024', value: 'F2' }, { label: '2025', value: 'F3', emph: true }] },
      { id: 'trend', type: 'trend-line', copy: { title: 'Back above 2021' }, series: 'D1' },
      { id: 'share', type: 'share-split', copy: { title: 'Commuters made {F4}' }, parts: [{ label: 'Commuters', value: 'F4', emph: true }] },
      { id: 'src', type: 'source-card' },
      { id: 'outro', type: 'outro', copy: { cta: 'Timetables at the terminal' } }
    ]
  };
  if (art !== undefined) s.meta.art = art;
  return s;
}
const FORMATS = ['9:16', '4:5', '1:1', '16:9'];
function compile(format, art = 'halftone') {
  const w = load();
  const s = spec(art);
  s.cuts.c = { format, scenes: s.scenes.map(x => x.id) };
  return { w, C: w.Motion.compile(s, 'c', { measure: mockCtx() }) };
}
const scene = (C, id) => C.scenes.find(s => s.id === id);
const distToBox = (x, y, b) => Math.hypot(Math.max(b.x - x, 0, x - (b.x + b.w)), Math.max(b.y - y, 0, y - (b.y + b.h)));
// Everything a scene shows: its layers, its data areas and its chrome.
function occupied(w, C, sc) {
  const out = w.Motion.art.boxes(sc.layers, sc.reserved, mockCtx());
  const S = C.safe, R = w.Motion.layout.RULE;
  if (sc.chrome) {
    out.push({ x: S.x, y: S.y, w: R.accentW, h: R.accentH });
    if (sc.chrome.kicker) out.push(sc.chrome.kicker);
    if (C.zone.rows) out.push({ x: S.x, y: C.zone.ruleY - 2, w: S.w, h: 4 });
    if (sc.chrome.source) sc.chrome.source.runs.forEach(r => out.push(r));
  }
  return out;
}

test('the halftone is on by default, and "off" turns it off', () => {
  const w = load();
  const s = spec();            // no meta.art at all
  s.cuts.c = { format: '9:16', scenes: s.scenes.map(x => x.id) };
  const on = w.Motion.compile(s, 'c', { measure: mockCtx() });
  assert.strictEqual(on.art.motif, 'halftone');
  const off = compile('9:16', 'off').C;
  assert.strictEqual(off.art, null);
  assert.ok(off.scenes.every(x => !x.art));
});

test('no dot sits within the clear distance of anything a scene shows, in every format', () => {
  for (const f of FORMATS) {
    const { w, C } = compile(f);
    const G = C.art.grid, clear = w.Motion.art.CLEAR;
    let drawn = 0;
    for (const sc of C.scenes) {
      if (!sc.art) continue;
      const boxes = occupied(w, C, sc);
      for (let i = 0; i < G.x.length; i++) {
        if (!sc.art[i]) continue;
        drawn++;
        for (const b of boxes) assert.ok(distToBox(G.x[i], G.y[i], b) >= clear - 1e-6, `${f} ${sc.id}: a dot at ${G.x[i]},${G.y[i]} is ${distToBox(G.x[i], G.y[i], b).toFixed(1)}px from ${JSON.stringify(b)}`);
      }
    }
    assert.ok(drawn > 100, `${f}: only ${drawn} dots drawn`);
  }
});

test('a chart\'s whole plot is kept clear, not just its marks', () => {
  const { C } = compile('9:16');
  const sc = scene(C, 'trend');
  const plot = sc.reserved[0];
  assert.ok(plot && plot.w > 100, 'the trend scene reserves its plot');
  const G = C.art.grid;
  for (let i = 0; i < G.x.length; i++) {
    if (sc.art[i]) assert.ok(distToBox(G.x[i], G.y[i], plot) > 0, `a dot inside the plot at ${G.x[i]},${G.y[i]}`);
  }
});

test('the art comes from the top-right and bottom-left corners and may fill the margins', () => {
  const { C } = compile('9:16');
  const G = C.art.grid, sc = scene(C, 'hook'), S = C.safe;
  const near = (cx, cy) => { for (let i = 0; i < G.x.length; i++) if (sc.art[i] && Math.hypot(G.x[i] - cx, G.y[i] - cy) < 300) return true; return false; };
  assert.ok(near(C.W, 0), 'dots near the top-right corner');
  assert.ok(near(0, C.H), 'dots near the bottom-left corner');
  assert.ok(!near(C.W, C.H) && !near(0, 0), 'none from the other two corners');
  let outside = 0;
  for (let i = 0; i < G.x.length; i++) if (sc.art[i] && (G.y[i] > S.y + S.h || G.y[i] < S.y)) outside++;
  assert.ok(outside > 20, `dots in the margins outside the safe area: ${outside}`);
});

// The dots drawn on a frame, as "x,y" -> radius.
function dotsAt(w, C, t) {
  const log = [];
  w.Motion.seek(mockCtx(log), C, t);
  const out = new Map();
  log.forEach(l => {
    const m = /^arc\(([-\d.]+),([-\d.]+),([\d.]+),0,/.exec(l);
    if (m) out.set(m[1] + ',' + m[2], +m[3]);
  });
  return out;
}
const key = (x, y) => Math.round(x * 1000) / 1000 + ',' + Math.round(y * 1000) / 1000;

test('between scenes that leave the art the same, it holds perfectly still', () => {
  const { w, C } = compile('9:16');
  const a = scene(C, 'hook'), b = scene(C, 'again');
  assert.strictEqual(b.art, a.art, 'the same sizes come back as the same array');
  const G = C.art.grid;
  const mid = dotsAt(w, C, b.t0 + b.ovIn / 2);
  let n = 0;
  for (let i = 0; i < G.x.length; i++) {
    if (a.art[i] < 0.45) continue;
    n++;
    assert.ok(Math.abs(mid.get(key(G.x[i], G.y[i])) - a.art[i]) < 1e-2, `dot ${G.x[i]},${G.y[i]} moved`);
  }
  assert.ok(n > 100, `${n} dots checked`);
});

test('when the art changes, every dot in both corners eases to its new size together', () => {
  const { w, C } = compile('9:16');
  const a = scene(C, 'title'), b = scene(C, 'bars');
  assert.notStrictEqual(a.art, b.art);
  const G = C.art.grid, M = w.Motion;
  const t = b.t0 + b.ovIn / 2, k = M.ease.glide(M.ease.clamp01((t - a.cEnd) / b.trIn.dur));
  assert.ok(k > 0.1 && k < 0.9, 'mid-window');
  // Mid-window, no scene's content is on screen: the swap's quiet stretch.
  assert.ok(t >= a.cEnd && t <= b.cStart);
  const mid = dotsAt(w, C, t);
  const moved = { top: 0, bottom: 0 };
  for (let i = 0; i < G.x.length; i++) {
    const want = a.art[i] + (b.art[i] - a.art[i]) * k;
    if (want >= 0.45) assert.ok(Math.abs((mid.get(key(G.x[i], G.y[i])) || 0) - want) < 1e-2, `dot ${G.x[i]},${G.y[i]} is not mid-ease`);
    if (Math.abs(a.art[i] - b.art[i]) > 0.5) moved[G.y[i] < C.H / 2 ? 'top' : 'bottom']++;
  }
  assert.ok(moved.top + moved.bottom > 0, 'some dots change size');
});

test('the outro has no art, and the art leaves before it', () => {
  const { w, C } = compile('9:16');
  const out = scene(C, 'outro'), src = scene(C, 'src');
  assert.strictEqual(out.art, null);
  const before = dotsAt(w, C, (src.enterEnd + src.exitStart) / 2).size;
  const onOutro = dotsAt(w, C, (out.enterEnd + out.exitStart) / 2).size;
  assert.ok(before > 100, `${before} dots on the source card`);
  assert.ok(onOutro < 5, `${onOutro} arcs on the outro`);
});

test('the old motifs are gone, with a readable error', () => {
  for (const art of ['contour', 'auto', { motif: 'logo' }]) {
    assert.throws(() => compile('1:1', art), /is not available — use "off" or "halftone"/);
  }
});

test('the art paints without throwing in every format, through every scene', () => {
  for (const f of FORMATS) {
    const { w, C } = compile(f);
    for (const sc of C.scenes) {
      for (const t of [sc.t0, (sc.enterEnd + sc.exitStart) / 2, sc.t1 - 1e-6]) assert.doesNotThrow(() => w.Motion.seek(mockCtx(), C, Math.min(t, C.duration - 1e-6)), `${f} ${sc.id}`);
    }
  }
});
