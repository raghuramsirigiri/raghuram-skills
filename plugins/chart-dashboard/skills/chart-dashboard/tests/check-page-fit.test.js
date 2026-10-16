// node --test plugins/chart-dashboard/skills/chart-dashboard/tests/check-page-fit.test.js
//
// The checks that stand in for a screenshot: a chart in a grid cell smaller
// than its engine's minimum size, a title too long for two lines at its cell
// width, and donut options written where the engine never reads them. Each is
// arithmetic on the page's own grid CSS and the manifest, so the pages below
// carry the dashboard template's grid rules.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'check-page.js');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-fit-'));
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

const CSS = `<style>
  .page { max-width:1600px; margin:0 auto; padding:32px; }
  .bento { display:grid; grid-template-columns:repeat(12,1fr); gap:16px; grid-auto-rows:340px; }
  .cell { background:#fff; padding:6px; overflow:hidden; }
  .bento.flow { grid-auto-rows:auto; }
</style>`;

// One chart in one cell; returns the named result row.
function check(name, { cell = 'w6', flow = false, call }, row) {
  const file = path.join(dir, name + '.html');
  fs.writeFileSync(file, `${CSS}<div class="page"><div class="bento${flow ? ' flow' : ''}">` +
    `<div class="cell ${cell}"><div class="chart" id="c1"></div></div></div></div>\n<script>\n${call}\n</script>\n`);
  const out = spawnSync(process.execPath, [SCRIPT, file], { encoding: 'utf8' }).stdout;
  const line = out.split('\n').find(l => l.includes(row));
  assert.ok(line, 'no "' + row + '" row in:\n' + out);
  return { passed: /^\s*(PASS|----)/.test(line), line };
}

test('a wide table in a narrow cell fails and names a width that fits', () => {
  const r = check('narrow-table', { cell: 'w4', flow: true,
    call: `Charts.reportTable('c1', { columns: [], rows: [] });` }, 'charts fit their cells');
  assert.ok(!r.passed, r.line);
  assert.match(r.line, /reportTable\) in w4 is ~\d+px wide, needs 640 {2}→ w6 or wider/);
});

test('a tall chart in a one-row cell fails; the same chart in h2 passes', () => {
  const call = `Charts.geofacet('c1', { title: 'T', data: [] });`;
  const short = check('geofacet-h1', { cell: 'w6', call }, 'charts fit their cells');
  assert.ok(!short.passed, short.line);
  assert.match(short.line, /needs 420 {2}→ h2/);
  assert.ok(check('geofacet-h2', { cell: 'w6 h2', call }, 'charts fit their cells').passed);
});

test('a self-sizing chart in a flow row is not held to a height', () => {
  const r = check('flow-table', { cell: 'w8', flow: true,
    call: `Charts.barInsightTable('c1', { rows: [] });` }, 'charts fit their cells');
  assert.ok(r.passed, r.line);
});

test('a title past two lines at the cell width fails; the same title in a wider cell passes', () => {
  const title = 'Carrier no-shows and late trailers caused 27% of all delay events in the quarter, most of them in the Newark hub';
  const call = `Charts.column('c1', { title: '${title}', xAxis: { categories: ['A', 'B'] }, series: [{ data: [1, 2] }] });`;
  const narrow = check('title-w4', { cell: 'w4', call }, 'titles fit their charts');
  assert.ok(!narrow.passed, narrow.line);
  assert.match(narrow.line, /c1 in w4: \d+ chars, ~\d+ fit/);
  assert.ok(check('title-w8', { cell: 'w8', call }, 'titles fit their charts').passed);
});

test('donut options at the top level fail; nested under plotOptions.pie they pass', () => {
  const top = check('donut-top', {
    call: `Charts.donut('c1', { centerText: 'Total', valueSuffix: '%', series: [{ data: [] }] });` }, 'donut options nested');
  assert.ok(!top.passed, top.line);
  assert.match(top.line, /c1: centerText, valueSuffix/);
  const nested = check('donut-nested', {
    call: `Charts.donut('c1', { startColor: '#000', plotOptions: { pie: { centerText: 'Total' } }, series: [{ data: [] }] });` },
    'donut options nested');
  assert.ok(nested.passed, nested.line);
});

test('a donut inside Charts.panels is checked too', () => {
  const r = check('panels-donut', { cell: 'w12', call:
    `Charts.panels('c1', { title: 'T', charts: [{ type: 'column' }, { type: 'donut', showPercentages: true }] });` },
    'donut options nested');
  assert.ok(!r.passed, r.line);
  assert.match(r.line, /c1 › panel 2: showPercentages/);
});

// ── bars sized to their cell ─────────────────────────────────────────
const cols = (n, extra = '') => `Charts.column('c1', { title: 'T', xAxis: { categories: [${
  Array.from({ length: n }, (_, i) => `'C${i}'`).join(',')}] }, series: [{ name: 'A', data: [${Array(n).fill(1).join(',')}] }]${extra} });`;
const bars = n => `Charts.bar('c1', { title: 'T', xAxis: { categories: [${
  Array.from({ length: n }, (_, i) => `'R${i}'`).join(',')}] }, series: [{ name: 'A', data: [${Array(n).fill(1).join(',')}] }] });`;
const ROW = 'bars sized to their cell';

test('five columns across a w12 fail as slabs and name the spans that fit', () => {
  const r = check('cols5-w12', { cell: 'w12', call: cols(5) }, ROW);
  assert.ok(!r.passed, r.line);
  assert.match(r.line, /5 categories\) in w12: \d+px-wide bars {2}→ w4 or w6/);
  assert.ok(check('cols5-w6', { cell: 'w6', call: cols(5) }, ROW).passed);
});

test('forty columns in a w4 fail as crowded; the same in a w12 pass', () => {
  const r = check('cols40-w4', { cell: 'w4', call: cols(40) }, ROW);
  assert.ok(!r.passed, r.line);
  assert.match(r.line, /px per category {2}→ w12/);
  assert.ok(check('cols40-w12', { cell: 'w12', call: cols(40) }, ROW).passed);
});

test('grouped columns share the slot, so the same categories fit a wider cell', () => {
  const grouped = cols(5).replace("}] }", "}, { name: 'B', data: [1,1,1,1,1] }] }");
  assert.ok(check('cols5x2-w8', { cell: 'w8', call: grouped }, ROW).passed);
  assert.ok(!check('cols5-w8', { cell: 'w8', call: cols(5) }, ROW).passed);
});

test('stacked columns are one bar per category, however many series', () => {
  const stacked = cols(5, ", plotOptions: { column: { stacking: 'percent' } }")
    .replace("}] }", "}, { name: 'B', data: [1,1,1,1,1] }] }");
  assert.ok(!check('stack5-w12', { cell: 'w12', call: stacked }, ROW).passed);
});

test('horizontal bars are sized by the height: too many rows want h2, too few drop it', () => {
  const many = check('bar20-h1', { cell: 'w6', call: bars(20) }, ROW);
  assert.ok(!many.passed, many.line);
  assert.match(many.line, /px per row {2}→ h2/);
  assert.ok(check('bar20-h2', { cell: 'w6 h2', call: bars(20) }, ROW).passed);
  const few = check('bar4-h2', { cell: 'w6 h2', call: bars(4) }, ROW);
  assert.ok(!few.passed, few.line);
  assert.match(few.line, /drop the h2/);
});

// ── cells match their chart's shape ──────────────────────────────────
// A cell is a shape (width over height), and the span alone doesn't say which:
// w8 h2 is the same shape as w4. Round charts want square-ish cells, a short
// series doesn't fill a strip, and a few list rows float in a wide band.
const SHAPE = "cells match their chart's shape";
const line = n => `Charts.line('c1', { title: 'T', xAxis: { categories: [${
  Array.from({ length: n }, (_, i) => `'Week ${i + 1}'`).join(',')}] }, series: [{ name: 'A', data: [${Array(n).fill(1).join(',')}] }] });`;
const donut = `Charts.donut('c1', { title: 'T', series: [{ data: [{ name: 'A', y: 1 }, { name: 'B', y: 2 }] }] });`;

test('a donut in a one-row w6 fails as a half-empty card; in a w4 or w6 h2 it passes', () => {
  const r = check('donut-w6', { cell: 'w6', call: donut }, SHAPE);
  assert.ok(!r.passed, r.line);
  assert.match(r.line, /c1 \(donut\) in w6 \(2\.\d:1\): .*% of the card is empty {2}→ w4/);
  assert.ok(check('donut-w4', { cell: 'w4', call: donut }, SHAPE).passed);
  assert.ok(check('donut-w6h2', { cell: 'w6 h2', call: donut }, SHAPE).passed);
  assert.ok(!check('donut-w4h2', { cell: 'w4 h2', call: donut }, SHAPE).passed);
});

test('a twelve-point line in a w8 strip fails; as w6, w8 h2, or with 24+ points it passes', () => {
  const r = check('line12-w8', { cell: 'w8', call: line(12) }, SHAPE);
  assert.ok(!r.passed, r.line);
  assert.match(r.line, /12 points flattened into a strip \(earned at 24\+\) {2}→ w4 or w6, or w8 h2/);
  assert.ok(check('line12-w6', { cell: 'w6', call: line(12) }, SHAPE).passed);
  assert.ok(check('line12-w8h2', { cell: 'w8 h2', call: line(12) }, SHAPE).passed);
  assert.ok(check('line30-w8', { cell: 'w8', call: line(30) }, SHAPE).passed);
  const band = check('line30-w12', { cell: 'w12', call: line(30) }, SHAPE);
  assert.ok(!band.passed, band.line);
  assert.match(band.line, /flattened into a band \(earned at 40\+\) {2}→ w8/);
});

test('a plotted chart in a tall narrow cell fails', () => {
  const r = check('line12-w4h2', { cell: 'w4 h2', call: line(12) }, SHAPE);
  assert.ok(!r.passed, r.line);
  assert.match(r.line, /tall and narrow/);
});

test('a scatter is never a strip', () => {
  const call = `Charts.scatter('c1', { title: 'T', series: [{ data: [[1, 2], [3, 4]] }] });`;
  assert.ok(!check('scatter-w8', { cell: 'w8', call }, SHAPE).passed);
  assert.ok(check('scatter-w6', { cell: 'w6', call }, SHAPE).passed);
});

test('columns earn a strip by bars across; a column misfit already reported as slabs is not reported twice', () => {
  assert.ok(!check('cols8-w8', { cell: 'w8', call: cols(8) }, SHAPE).passed);
  assert.ok(check('cols14-w8', { cell: 'w8', call: cols(14) }, SHAPE).passed);
  // Five columns across w12 are slabs: that row names the fix, this one stays quiet.
  assert.ok(check('cols5-w12-shape', { cell: 'w12', call: cols(5) }, SHAPE).passed);
});

test('a few list rows in a wide band fail; the same list in a w6 passes', () => {
  const r = check('bar4-w8', { cell: 'w8', call: bars(4) }, SHAPE);
  assert.ok(!r.passed, r.line);
  assert.match(r.line, /4 rows in a wide band .* {2}→ w4 or w6/);
  assert.ok(check('bar4-w6', { cell: 'w6', call: bars(4) }, SHAPE).passed);
});

test('tables in a flow row are not held to a shape', () => {
  assert.ok(check('table-flow-shape', { cell: 'w12', flow: true,
    call: `Charts.table('c1', { columns: [], rows: [] });` }, SHAPE).passed);
});

test('a chart with its own pixel height in a flow row is held to that box', () => {
  const file = path.join(dir, 'donut-flow-fixed.html');
  fs.writeFileSync(file, `${CSS}<div class="page"><div class="bento flow">` +
    `<div class="cell w8"><div class="chart" id="c1" style="height:300px"></div></div></div></div>\n<script>\n${donut}\n</script>\n`);
  const out = spawnSync(process.execPath, [SCRIPT, file], { encoding: 'utf8' }).stdout;
  const line = out.split('\n').find(l => l.includes(SHAPE));
  assert.match(line, /FAIL .*c1 \(donut\) in w8 at 300px/);
});

test('a three-stage sankey across a band fails; in a w6 it passes', () => {
  const call = `Charts.sankey('c1', { title: 'T', stages: ['A', 'B', 'C'], series: [{ data: [['a', 'b', 1], ['b', 'c', 1]] }] });`;
  const r = check('sankey3-w12', { cell: 'w12', call }, SHAPE);
  assert.ok(!r.passed, r.line);
  assert.match(r.line, /3 stages stretched into a band {2}→ w6/);
  assert.ok(check('sankey3-w6', { cell: 'w6', call }, SHAPE).passed);
  // Without stage headers the depth comes from the links.
  assert.ok(!check('sankey3-links-w12', { cell: 'w12', call: call.replace("stages: ['A', 'B', 'C'], ", '') }, SHAPE).passed);
});
