// node --test plugins/explainer-video/skills/explainer-video/tests/world.test.js
//
// The continuous style (world.js, iso.js, pictures/): one 2.5D world the
// camera pans across, the words in a band at the top. These hold the rules
// from the prototype reviews: the words never meet the world; places sit on
// one screen row so every pan is level; nothing zooms; a picture's units are
// its figure; two states of one measure play last year, then now; and a
// picture refuses what it can't show honestly.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { load, mockCtx } = require('./harness');

const SURVEY = () => JSON.parse(JSON.stringify(require('./fixtures/continuous-survey.json')));
const BANKING = () => JSON.parse(JSON.stringify(require('./fixtures/continuous-banking.json')));
const STORIES = { survey: SURVEY, banking: BANKING };
function compile(spec, cut) {
  const w = load();
  return { w, C: w.Motion.compile(spec, cut || 'main', { measure: mockCtx() }) };
}
function withFormat(format, story) {
  const s = (STORIES[story] || SURVEY)();
  s.cuts.main.format = format;
  return s;
}
const scene = (C, id) => C.scenes.find(s => s.id === id);
const hold = sc => (sc.enterEnd + sc.exitStart) / 2;
// Every record (words and shapes) painted at t.
function records(w, C, t) {
  w.Motion.debug.record = [];
  w.Motion.seek(mockCtx(), C, t);
  const r = w.Motion.debug.record.filter(x => !x.skip);
  w.Motion.debug.record = null;
  return r;
}
// Values made inside the engine's sandbox, as plain data for deepStrictEqual.
const plain = x => JSON.parse(JSON.stringify(x));
const meets = (a, b) => a[0] + 1 < b[0] + b[2] - 1 && b[0] + 1 < a[0] + a[2] - 1 && a[1] + 2 < b[1] + b[3] - 2 && b[1] + 2 < a[1] + a[3] - 2;

test('a continuous spec compiles to beats the player, the export and the audit can use', () => {
  const { C } = compile(SURVEY());
  assert.strictEqual(C.style, 'continuous');
  assert.ok(C.world && C.world.places.length === 3, 'three places: members, delivery, desk');
  for (const sc of C.scenes) {
    for (const k of ['t0', 't1', 'cStart', 'enterEnd', 'exitStart', 'cEnd', 'read']) assert.ok(Number.isFinite(sc[k]), sc.id + '.' + k);
    assert.ok(sc.place, sc.id + ' has a place in view');
  }
  assert.strictEqual(C.scenes[0].trIn.name, 'cut');
});

test('a slide spec is untouched: no world, the one swap between scenes', () => {
  const s = SURVEY();
  s.meta.style = 'slides';
  ['ctx', 'hook', 'e1', 'e2', 'e3', 'why', 'e5'].forEach(id => { delete s.scenes.find(x => x.id === id).picture; });
  const { C } = compile(s);
  assert.strictEqual(C.world, null);
  C.scenes.slice(1).forEach(sc => assert.strictEqual(sc.trIn.name, 'swap', sc.id));
});

test('the places sit on one screen row, so every pan between places is level', () => {
  const { C } = compile(SURVEY());
  const B = C.world.beats;
  for (let i = 1; i < B.length; i++) {
    if (B[i].place === B[i - 1].place || B[i].restOnly) continue;
    assert.strictEqual(B[i].cam.y, B[i - 1].cam.y, B[i - 1].scene + ' -> ' + B[i].scene + ' pans up or down');
    assert.strictEqual(C.scenes[i].trIn.name, 'pan', B[i].scene + ' arrives by a pan');
  }
});

test('a new place joins the row beside the place the story comes from', () => {
  const { C } = compile(SURVEY());
  const x = id => C.world.byScene[id].sx;
  // delivery to the right of the members; the desk the answers drift to, on their left
  assert.ok(x('why') < x('ctx') && x('ctx') < x('hook'), 'desk, members, delivery from left to right');
});

test('a figure a place already shows brings the camera back to it', () => {
  const { C } = compile(SURVEY());
  assert.strictEqual(C.world.byScene.e1, C.world.byScene.hook, 'the before-after of the hook\'s figure revisits its pallet');
  assert.strictEqual(scene(C, 'e1').trIn.name, 'swap', 'same place: only the words change');
});

test('nothing zooms: the world is drawn at one scale, the camera only pans', () => {
  const { w, C } = compile(SURVEY());
  for (let n = 0; n < C.frames; n += 4) {
    const log = [];
    w.Motion.seek(mockCtx(log), C, n / C.fps);
    assert.ok(!log.some(l => l.startsWith('scale(')), `frame ${n} scales`);
  }
  assert.ok(C.world.s > 0 && C.world.s <= 1.3);
});

for (const [story, format] of [['survey', '9:16'], ['survey', '4:5'], ['survey', '1:1'], ['survey', '16:9'], ['banking', '9:16'], ['banking', '4:5'], ['banking', '1:1'], ['banking', '16:9']]) {
  test(`the words never meet the world, and the world stays above the footer (${story}, ${format})`, () => {
    const { w, C } = compile(withFormat(format, story));
    for (let n = 0; n < C.frames; n += 2) {
      const t = n / C.fps;
      const recs = records(w, C, t);
      const shapes = recs.filter(r => r.role === 'shape' && r.alpha > 0.06 && r.kind !== 'shadow');
      const words = recs.filter(r => r.role !== 'shape' && r.alpha > 0.3 && !/^world-face:/.test(r.layer || ''));
      for (const wd of words) {
        const own = /^world-label:([^:]+)/.exec(wd.layer || '');
        const hit = shapes.find(sh => !(own && sh.kind === 'line' && String(sh.owner).indexOf(own[1]) === 0) && meets(wd.bbox, sh.bbox));
        assert.ok(!hit, `${format} ${t.toFixed(2)} s: "${wd.text}" meets ${hit && hit.owner}`);
      }
      const low = Math.max(-Infinity, ...shapes.map(r => r.bbox[1] + r.bbox[3]));
      assert.ok(low <= C.zone.ruleY, `${format} ${t.toFixed(2)} s: the world reaches ${Math.round(low)}, past the footer at ${Math.round(C.zone.ruleY)}`);
    }
  });
}

test('while a beat holds, its place sits wholly in the frame, clear of its words', () => {
  for (const [story, format] of [['survey', '9:16'], ['survey', '4:5'], ['survey', '1:1'], ['survey', '16:9'], ['banking', '9:16'], ['banking', '4:5'], ['banking', '1:1'], ['banking', '16:9']]) {
    const { w, C } = compile(withFormat(format, story));
    for (const sc of C.scenes) {
      const recs = records(w, C, hold(sc));
      const mine = recs.filter(r => r.role === 'shape' && r.owner === sc.place && r.alpha > 0.06);
      if (!mine.length) continue;
      // The words' room: above the world, or a wide frame's column beside it.
      const band = recs.filter(r => r.role !== 'shape' && r.scene === sc.id && !/^(world-|chrome-)/.test(r.layer || ''));
      const x0 = Math.min(...mine.map(r => r.bbox[0])), x1 = Math.max(...mine.map(r => r.bbox[0] + r.bbox[2]));
      const y0 = Math.min(...mine.map(r => r.bbox[1])), y1 = Math.max(...mine.map(r => r.bbox[1] + r.bbox[3]));
      assert.ok(x0 >= 0 && x1 <= C.W, `${story} ${format} ${sc.id}: the place runs off the frame (${Math.round(x0)}..${Math.round(x1)})`);
      const hit = band.find(r => meets(r.bbox, [x0, y0 - 12, x1 - x0, y1 - y0 + 12]));
      assert.ok(!hit, `${story} ${format} ${sc.id}: the place (${[x0, y0, x1, y1].map(Math.round)}) reaches the words "${hit && hit.text}"`);
    }
  }
});

test('the units are the figure: the lit units match the claim when the counter lands', () => {
  const { w, C } = compile(SURVEY());
  const W = C.world, hook = scene(C, 'hook');
  const p = W.byScene.hook;
  const counter = hook.layers.find(l => l.kind === 'counter');
  const t = hook.cStart + counter.at + counter.dur + 0.3;
  let lit = 0;
  for (let k = 0; k < 100; k++) if (w.Motion.world.litAt(p, k, t) > 0.5) lit++;
  assert.strictEqual(lit, 72, '72 of 100 parcels for 72%');
  // The crowd: one dot per member.
  assert.strictEqual(W.byScene.ctx.dots, 1204);
});

test('two states of one measure play last year, then now', () => {
  const { C } = compile(SURVEY());
  const W = C.world;
  // Delivery, revisited showing 72%: back to 61%, then 72% again.
  const d = W.byScene.e1, e1 = scene(C, 'e1');
  const f1 = d.fills.filter(f => f.t0 >= e1.cStart && f.t0 < e1.cEnd).map(f => [f.from, f.to]);
  assert.deepStrictEqual(plain(f1), [[72, 61], [61, 72]]);
  const fig = e1.layers.find(l => l.kind === 'figure');
  assert.deepStrictEqual(plain(fig.keys.map(k => [k.display, k.label])), [['61%', 'last year'], ['72%', 'this year']]);
  assert.strictEqual(fig.start.display, '72%', 'it starts from what the place shows');
  // Recommend, on the members: 64% of 1,204 lit and marked, then down to 58% leaving a ghost.
  const m = W.byScene.e3, e3 = scene(C, 'e3');
  const f3 = m.fills.filter(f => f.t0 >= e3.cStart).map(f => [f.from, f.to, f.ghost]);
  assert.deepStrictEqual(plain(f3), [[0, 771, false], [771, 698, true]]);
  assert.deepStrictEqual(plain(m.marks.map(k => [k.units, k.label])), [[771, '2025: 64%']]);
});

test('every beat lasts long enough for what its picture does', () => {
  const { C } = compile(SURVEY());
  C.world.beats.forEach((bt, i) => {
    const sc = C.scenes[i];
    const end = bt.acts.reduce((mx, a) => Math.max(mx, (a.at || 0) + a.dur), 0);
    assert.ok(sc.cStart + end <= sc.exitStart + 1e-6, `${sc.id}: its picture is still moving when its words leave`);
  });
});

test('the summary and the source rest together on the last place', () => {
  const { C } = compile(SURVEY());
  const W = C.world, a = W.beats.find(b => b.scene === 'e5'), b = W.beats.find(b => b.scene === 'src');
  assert.strictEqual(a.place, b.place);
  assert.deepStrictEqual(plain(a.cam), plain(b.cam), 'one camera for the closing run');
});

test('the same frame paints the same, whatever came before', () => {
  const { w, C } = compile(SURVEY());
  const paint = t => { const log = []; w.Motion.seek(mockCtx(log), C, t); return log.join('\n'); };
  const t = scene(C, 'why').t0 + 0.6;
  const a = paint(t);
  paint(3.3); paint(40);
  assert.strictEqual(paint(t), a);
});

test('pictures refuse what they cannot show honestly, with a readable error', () => {
  const bad = (edit, re) => { const s = SURVEY(); edit(s); assert.throws(() => compile(s), re); };
  bad(s => { delete s.scenes.find(x => x.id === 'hook').picture.of; }, /needs "of"/);
  bad(s => { s.scenes.find(x => x.id === 'hook').copy.value = 'F3'; }, /share in %/);
  bad(s => { s.claims.find(c => c.id === 'F3').value = 5000; }, /set "per"/);
  bad(s => { s.scenes.find(x => x.id === 'why').picture.due = 'October'; }, /words from the scene's copy/);
  bad(s => { s.scenes.find(x => x.id === 'hook').picture.kind = 'rocket'; }, /unknown picture "rocket"/);
  bad(s => { s.scenes.find(x => x.id === 'e2').picture.at = 'nope'; }, /is not a scene with a place before this one/);
  bad(s => { s.scenes.find(x => x.id === 'hook').picture.props = ['blocks']; }, /is not a prop/);
  bad(s => { s.scenes.find(x => x.id === 'hook').picture = { kind: 'building' }; }, /is a prop/);
  bad(s => { s.meta.style = 'cinematic'; }, /meta.style must be/);
  bad(s => {
    s.data = [{ id: 'D1', source: 'A', locator: 't1', unit: '%', x: ['2023', '2024', '2025'], y: [50, 60, 64] }];
    s.scenes.push({ id: 'tr', type: 'trend-line', copy: { title: 'Up three years running' }, series: 'D1', picture: { kind: 'blocks', of: 'members' } });
    s.cuts.main.scenes.splice(5, 0, 'tr');
  }, /cannot show trend-line/);
  bad(s => {
    s.data = [{ id: 'D1', source: 'A', locator: 't1', unit: '%', x: ['2023', '2024', '2025'], y: [null, 60, null] }];
    s.scenes.push({ id: 'tr', type: 'trend-line', copy: { title: 'One value is not a line' }, series: 'D1' });
    s.cuts.main.scenes.splice(5, 0, 'tr');
  }, /at least two values that are not gaps/);
});

test('a people field over 2,000 dots takes a stated scale, and its key says so', () => {
  const s = SURVEY();
  s.claims.find(c => c.id === 'F3').value = 12040;
  s.claims.find(c => c.id === 'F3').display = '12,040';
  s.scenes.find(x => x.id === 'ctx').picture.per = 10;
  const { C } = compile(s);
  const p = C.world.byScene.ctx;
  assert.strictEqual(p.dots, 1204);
  assert.strictEqual(p.def.key(p), '1 dot = 10 people');
});

// ── the banking story: the pictures for series, rankings and parts ──

test('a story of series, rankings and parts gets a place for each finding', () => {
  const { C } = compile(BANKING());
  const kinds = Object.fromEntries(Object.entries(C.world.byScene).map(([id, p]) => [id, p.kind]));
  assert.deepStrictEqual(plain(kinds), { hook: 'blocks', ctx: 'blocks', conv: 'dots', funnel: 'funnel', quarters: 'columns', device: 'split', products: 'podium', src: 'podium' });
  assert.deepStrictEqual(plain(C.world.byScene.hook.props.map(p => p.pic.skin)), ['branch']);
});

test('the default picture follows the scene: columns for a series, a podium for a ranking, a split for parts', () => {
  const s = BANKING();
  ['quarters', 'products', 'device'].forEach(id => { const p = s.scenes.find(x => x.id === id).picture; delete p.kind; });
  s.scenes.find(x => x.id === 'device').picture = { of: 'product page visits' };
  const { C } = compile(s);
  assert.strictEqual(C.world.byScene.quarters.kind, 'columns');
  assert.strictEqual(C.world.byScene.products.kind, 'podium');
  assert.strictEqual(C.world.byScene.device.kind, 'split');
});

test('small shares get the finer field: 1.5% lights 15 of 1,000 dots, one strip along the front', () => {
  const { w, C } = compile(BANKING());
  const p = C.world.byScene.conv, sc = scene(C, 'conv');
  const counter = sc.layers.find(l => l.kind === 'counter');
  const t = sc.cStart + counter.at + counter.dur + 0.3;
  const lit = [];
  for (let k = 0; k < p.dots; k++) if (w.Motion.world.litAt(p, k, t) > 0.5) lit.push(k);
  assert.strictEqual(p.dots, 1000);
  assert.strictEqual(lit.length, 15);
  const rows = new Set(lit.map(k => Math.round(p.def.unitPos(p, k).y)));
  assert.strictEqual(rows.size, 1, 'the lit dots share one row');
});

test('a split gives each part its share of the hundred, in turn', () => {
  const { C } = compile(BANKING());
  const p = C.world.byScene.device;
  const count = i => p.owner.filter(o => o === i).length;
  assert.deepStrictEqual([count(0), count(1)], [58, 42]);
  assert.deepStrictEqual(plain(p.fills.map(f => [f.from, f.to])), [[0, 58], [58, 100]]);
  assert.deepStrictEqual(plain(p.def.key(p).map(l => l.text)), ['= 1% of product page visits', 'Mobile  58%', 'Desktop and tablet  42%']);
});

test('columns stand from zero, heights in proportion; a funnel only narrows; a ranking is in order', () => {
  const { C } = compile(BANKING());
  const q = C.world.byScene.quarters;
  assert.deepStrictEqual(plain(q.rows.map(r => r.value)), [4.2, 4.8, 5.5, 6.1]);
  assert.strictEqual(q.max, 6.1);
  const bad = (edit, re) => { const s = BANKING(); edit(s); assert.throws(() => compile(s), re); };
  bad(s => { s.scenes.find(x => x.id === 'funnel').bars.reverse(); }, /no larger than the one before/);
  bad(s => { s.scenes.find(x => x.id === 'products').rows.reverse(); }, /rank order/);
  bad(s => { s.scenes.find(x => x.id === 'quarters').picture = { kind: 'blocks', of: 'accounts' }; }, /cannot show compare-bars/);
});

test('the world settles on a scale and keeps it: every place fits the stage in every format', () => {
  for (const format of ['9:16', '4:5', '1:1', '16:9']) {
    const { C } = compile(withFormat(format, 'banking'));
    const W = C.world;
    assert.ok(W.s > 0.4 && W.s <= 1.3, `${format}: scale ${W.s}`);
    for (const p of W.places) {
      assert.ok(W.rowY + p.box.y1 <= W.bottom + 0.5, `${format} ${p.id}: below the footer`);
      assert.ok(p.box.x1 - p.box.x0 <= C.W, `${format} ${p.id}: wider than the frame`);
    }
  }
});

// ── every scene type, in every format ──

// A spec that uses the rest of the catalog: a hook headline, a trend line,
// a timeline, steps, a quote, a photo, a custom painter and an outro.
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
function CATALOG(format) {
  const s = SURVEY();
  s.meta.brand = { name: 'Northvale Co-op' };
  s.claims.push({ id: 'Q1', kind: 'copied', quote: true, source: 'A', locator: 'p. 3', verbatim: 'Members told us delivery is now the thing they would tell a friend about.', display: 'delivery is now the thing they would tell a friend about' });
  s.data = [{ id: 'D1', source: 'A', locator: 'Table 2', unit: '%', x: ['2021', '2022', '2023', '2024', '2025', '2026'], y: [55, 58, null, 63, 61, 72] }];
  s.scenes = [
    { id: 'hk', type: 'hook-headline', copy: { kicker: 'Members survey', headline: 'Delivery is rated higher than ever asked' } },
    s.scenes.find(x => x.id === 'hook'),
    { id: 'tr', type: 'trend-line', copy: { kicker: 'Six years', title: 'Delivery ratings, survey by survey', units: '% rating it good or very good' }, series: 'D1', end: 'F1', highlight: [4, 6] },
    { id: 'tl', type: 'timeline', copy: { kicker: 'What happened', title: 'The year in delivery' }, events: [{ date: 'March', text: 'New delivery partner' }, { date: 'July', text: 'Survey in the field' }, { date: 'August', text: 'Findings published' }] },
    { id: 'st', type: 'steps', copy: { kicker: 'Next', title: 'What happens now' }, steps: ['Code the open answers', 'Share the themes', 'Plan the changes'] },
    { id: 'q', type: 'quote', copy: { quote: 'Q1', name: 'Research team', role: 'Northvale Co-op' } },
    { id: 'ph', type: 'photo-pan', copy: { kicker: 'On the road', caption: 'One of the new delivery vans', image: PNG } },
    { id: 'cu', type: 'custom', draw: 'crates', copy: { kicker: 'Drawn by hand', title: 'A custom picture in the same world' } },
    s.scenes.find(x => x.id === 'src'),
    { id: 'out', type: 'outro', copy: { cta: 'Read the findings' } }
  ];
  s.cuts.main = { format, scenes: s.scenes.map(x => x.id) };
  return s;
}
function compileCatalog(format) {
  const w = load();
  w.Motion.custom.crates = { enter: 1, read: 1.5, draw(ctx, lt, api) { const V = api.iso(0.8); V.box(-40, -40, 0, 80, 80, 60 * api.at(0, 1), api.mat.N2); } };
  return { w, C: w.Motion.compile(CATALOG(format), 'main', { measure: mockCtx(), images: { [PNG]: { width: 4, height: 3 } } }) };
}

for (const format of ['9:16', '4:5', '1:1', '16:9']) {
  test(`every scene type has a continuous form, and its words never meet the world (${format})`, () => {
    const { w, C } = compileCatalog(format);
    const B = id => C.world.beats.find(b => b.scene === id);
    assert.strictEqual(C.world.byScene.tr.kind, 'ribbon', 'a trend line gets a ribbon');
    ['ph', 'cu', 'out'].forEach(id => assert.strictEqual(B(id).cam.alpha, 0, id + ' takes the stage: the world steps aside'));
    ['tl', 'st', 'q'].forEach(id => assert.ok(B(id).restOnly, id + ' rests on the place in view'));
    for (let n = 0; n < C.frames; n += 3) {
      const t = n / C.fps;
      const recs = records(w, C, t);
      const shapes = recs.filter(r => r.role === 'shape' && r.alpha > 0.06 && r.kind !== 'shadow' && !/^custom:/.test(r.owner || ''));
      const words = recs.filter(r => r.role !== 'shape' && r.alpha > 0.3 && !/^world-face:/.test(r.layer || ''));
      for (const wd of words) {
        const own = /^world-label:([^:]+)/.exec(wd.layer || '');
        const hit = shapes.find(sh => !(own && sh.kind === 'line' && String(sh.owner).indexOf(own[1]) === 0) && meets(wd.bbox, sh.bbox));
        assert.ok(!hit, `${format} ${t.toFixed(2)} s: "${wd.text}" meets ${hit && hit.owner}`);
      }
    }
  });
}

test('a ribbon keeps its gaps, ghosts its forecast and says a baseline that is not zero', () => {
  const { w, C } = compileCatalog('9:16');
  const p = C.world.byScene.tr;
  assert.strictEqual(p.line.y[2], null, 'the gap stays a gap');
  assert.ok(p.lo > 0, 'values far above zero start the ribbon above it');
  const sc = C.scenes.find(x => x.id === 'tr');
  const recs = records(w, C, (sc.enterEnd + sc.exitStart) / 2);
  const texts = recs.filter(r => /^world-label:/.test(r.layer || '')).map(r => r.text);
  assert.ok(texts.indexOf('72%') >= 0, 'the end value, with its claim\'s display');
  assert.ok(texts.some(x => /%$/.test(x) && x !== '72%'), 'the scale post states the baseline');
  assert.ok(texts.indexOf('2021') >= 0 && texts.indexOf('2026') >= 0, 'first and last x labels');
});

