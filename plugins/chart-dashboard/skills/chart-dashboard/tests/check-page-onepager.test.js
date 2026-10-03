// node --test plugins/chart-dashboard/skills/chart-dashboard/tests/check-page-onepager.test.js
//
// The one-pager's own checks. The format's promise is that the file prints as
// ONE sheet of paper on A4 or Letter, and everything here is arithmetic behind
// that promise: the sheet plus its @page margin against both papers, the row
// count against each engine's minimum height, the span against its minimum
// width, and the rule that nothing on a printed page may need a pointer.
// None of it is visible to whoever built the page — it is visible to whoever
// prints it, once.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'check-page.js');
const TEMPLATE = path.join(__dirname, '..', 'templates', 'onepager.html');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-onepager-'));
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

// The template's geometry, which is what the checker reads.
const css = ({ w = 730, h = 990, margin = 8, size = 'auto' } = {}) => `<style>
  :root { --sheet-w:${w}px; --sheet-h:${h}px; --margin:30px;
          --band-head:78px; --band-kpi:54px; --band-foot:26px; --gap:10px; }
  .cell { padding-top:6px; border-top:1px solid #ddd; }
  @page { size:${size}; margin:${margin}mm; }
</style>`;

function page(name, { cells, calls, kpis = true, extra = '', geometry }) {
  const file = path.join(dir, name + '.html');
  fs.writeFileSync(file, css(geometry) +
    '<div class="sheet">' +
    '<header class="sheet-head"><h1>T</h1></header>' +
    (kpis ? '<div class="kpis"><div class="kpi"><span>L</span><b>1</b></div></div>' : '') +
    extra +
    '<div class="sheet-grid">' +
    cells.map((c, i) => `<div class="cell ${c}"><div class="chart" id="c${i + 1}"></div></div>`).join('') +
    '</div>' +
    '<footer class="sheet-foot">Sources.</footer>' +
    '</div>\n<script>\n' + calls + '\n</script>\n');
  const out = spawnSync(process.execPath, [SCRIPT, file], { encoding: 'utf8' }).stdout;
  return row => {
    const line = out.split('\n').find(l => l.includes(row));
    assert.ok(line, 'no "' + row + '" row in:\n' + out);
    return { passed: /^\s*PASS/.test(line), note: /^\s*----/.test(line), line };
  };
}

const column = (id, n = 5) => `Charts.column('${id}', { title: 'T', ` +
  `xAxis: { categories: [${Array.from({ length: n }, (_, i) => `'C${i}'`).join(',')}] }, ` +
  `series: [{ name: 'V', data: [${Array.from({ length: n }, (_, i) => 100 - i).join(',')}] }] });`;

test('the shipped template passes its own checks', () => {
  const out = spawnSync(process.execPath, [SCRIPT, TEMPLATE], { encoding: 'utf8' }).stdout;
  for (const row of ['fits one page', 'paper-ready', 'charts fit their cells', 'bars sized to their cell']) {
    const line = out.split('\n').find(l => l.includes(row));
    assert.ok(line && /^\s*PASS/.test(line), row + ' did not pass:\n' + out);
  }
  assert.match(out, /730x990 sheet, 2 row\(s\) of 396px \(KPI band on\) — fits A4 and Letter at 8mm/);
});

test('a dashboard page is not held to any of it', () => {
  const file = path.join(dir, 'dash.html');
  fs.writeFileSync(file, '<div class="bento"><div class="cell w12"><div class="chart" id="c1"></div></div></div>' +
    '\n<script>\n' + column('c1') + '\n</script>\n');
  const out = spawnSync(process.execPath, [SCRIPT, file], { encoding: 'utf8' }).stdout;
  assert.match(out, /PASS {2}fits one page\s+not a one-pager/);
  assert.match(out, /PASS {2}paper-ready\s+not a one-pager/);
});

// ── the budget ───────────────────────────────────────────────────────
test('four portrait rows leave every chart under its minimum height, and the fix named is a row', () => {
  const r = page('four-rows', { cells: ['w12', 'w12', 'w12', 'w12'],
    calls: [1, 2, 3, 4].map(i => column('c' + i)).join('\n') })('charts fit their cells');
  assert.ok(!r.passed, r.line);
  assert.match(r.line, /needs 260 {2}→ 4 rows leaves 193px each; cut a row, or the KPI band/);
});

test('three portrait rows is the ceiling, and it clears the minimum either way', () => {
  const cells = ['w12', 'w12', 'w12'], calls = [1, 2, 3].map(i => column('c' + i)).join('\n');
  // 261px with the KPI band, 282px without. Both clear the 260px a column
  // chart needs — which is why four rows, at 193px, is where the format ends.
  assert.ok(page('three-kpi', { cells, calls })('charts fit their cells').passed);
  assert.ok(page('three-no-kpi', { cells, calls, kpis: false })('charts fit their cells').passed);
  assert.match(page('three-no-kpi2', { cells, calls, kpis: false })('fits one page').line, /3 row\(s\) of 282px/);
});

test('a standard chart at w6 portrait is too narrow, and w8 is the span named', () => {
  const r = page('half-width', { cells: ['w6', 'w6'], calls: column('c1') + '\n' + column('c2') })('charts fit their cells');
  assert.ok(!r.passed, r.line);
  assert.match(r.line, /in w6 is ~360px wide, needs 480 {2}→ w8 or wider/);
});

test('the same chart at w6 fits once the sheet is landscape', () => {
  const r = page('landscape', { cells: ['w6', 'w6'], calls: column('c1') + '\n' + column('c2'),
    geometry: { w: 990, h: 730, size: 'landscape' } })('charts fit their cells');
  assert.ok(r.passed, r.line);
});

test('a landscape sheet on a portrait @page is split in two, and the check names the fix', () => {
  // `size: auto` takes the dialog's orientation, which is portrait: the sheet is
  // then 277.9mm across a 210mm page. The geometry is right and the paper is not.
  const r = page('landscape-portrait-page', { cells: ['w6', 'w6'],
    calls: column('c1') + '\n' + column('c2'), geometry: { w: 990, h: 730 } })('fits one page');
  assert.ok(!r.passed, r.line);
  assert.match(r.line, /the sheet is landscape but @page is not: add "size: landscape"/);
});

test('with size: landscape the same sheet fits, and the check says so', () => {
  const r = page('landscape-ok', { cells: ['w6', 'w6'], calls: column('c1') + '\n' + column('c2'),
    geometry: { w: 990, h: 730, size: 'landscape' } })('fits one page');
  assert.ok(r.passed, r.line);
  // Two w6 cells are one row of twelve tracks, so the pair gets the whole grid.
  assert.match(r.line, /990x730 sheet, 1 row\(s\) of 542px \(KPI band on\) — fits A4 and Letter landscape at 8mm/);
});

// ── the paper ────────────────────────────────────────────────────────
test('a taller sheet still fits A4 but spills Letter, and the check names Letter', () => {
  const r = page('tall', { cells: ['w12'], calls: column('c1'), geometry: { h: 1050 } })('fits one page');
  assert.ok(!r.passed, r.line);
  assert.match(r.line, /past letter \(216x279\.4\)/);
  assert.ok(!/past a4/.test(r.line), 'A4 has the room; only Letter should be named: ' + r.line);
});

test('a wider @page margin is the other way to lose the guarantee', () => {
  const r = page('fat-margin', { cells: ['w12'], calls: column('c1'), geometry: { margin: 20 } })('fits one page');
  assert.ok(!r.passed, r.line);
  assert.match(r.line, /past a4 \(210x297\) and letter/);
});

test('no @page margin at all fails: the sheet is sized against a known one', () => {
  const file = path.join(dir, 'no-margin.html');
  fs.writeFileSync(file, css().replace(/@page[^}]*}/, '') +
    '<div class="sheet"><div class="sheet-grid"><div class="cell w12"><div class="chart" id="c1"></div></div></div></div>' +
    '\n<script>\n' + column('c1') + '\n</script>\n');
  const out = spawnSync(process.execPath, [SCRIPT, file], { encoding: 'utf8' }).stdout;
  assert.match(out, /FAIL {2}fits one page\s+no "@page \{ margin: Nmm \}"/);
});

// ── nothing that needs a pointer ─────────────────────────────────────
test('a control fails: it prints as a grey box', () => {
  const r = page('with-filter', { cells: ['w12'], calls: column('c1'),
    extra: '<div class="filter-bar"><select id="f"><option>All</option></select></div>' })('paper-ready');
  assert.ok(!r.passed, r.line);
  assert.match(r.line, /1 control\(s\) on the page \(select\)/);
  assert.match(r.line, /a page that needs a filter is a dashboard/);
});

test('a commented-out control does not count', () => {
  const r = page('commented-filter', { cells: ['w12'], calls: column('c1'),
    extra: '<!-- <select id="f"><option>All</option></select> -->' })('paper-ready');
  assert.ok(r.passed, r.line);
});

test('dataLabels off is a note, not a failure — the numbers are just not printed', () => {
  const r = page('no-labels', { cells: ['w12'],
    calls: `Charts.column('c1', { title: 'T', plotOptions: { series: { dataLabels: { enabled: false } } }, ` +
      `xAxis: { categories: ['A','B'] }, series: [{ name: 'V', data: [1,2] }] });` })('paper-ready');
  assert.ok(r.note, r.line);
  assert.match(r.line, /dataLabels off on c1/);
});
