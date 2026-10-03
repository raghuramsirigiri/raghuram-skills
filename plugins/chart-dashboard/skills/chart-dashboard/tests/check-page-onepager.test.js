// node --test plugins/chart-dashboard/skills/chart-dashboard/tests/check-page-onepager.test.js
//
// The one-pager's own checks. The format's promise is that the file prints as
// ONE sheet of paper on A4 or Letter, and most of what backs that is arithmetic
// nobody can see: the sheet plus its @page margin against both papers, the
// figures in a column added up against the column, a chart against its engine's
// minimum at column width, and the two engines that quietly shrink their marks
// rather than refusing a box that is too small. None of it is visible to
// whoever built the page — it is visible to whoever prints it, once.
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
const css = ({ w = 730, h = 990, cols = 2, margin = 8, size = 'auto' } = {}) => `<style>
  :root { --sheet-w:${w}px; --sheet-h:${h}px; --cols:${cols}; --margin:30px;
          --band-head:136px; --band-foot:26px; --gap:12px; --col-gap:10px;
          --fig-sm:200px; --fig-md:265px; --fig-lg:310px; --fig-xl:430px; }
  .fig figcaption { font-size:9.5px; margin-top:5px; padding-top:5px; }
  @page { size:${size}; margin:${margin}mm; }
</style>`;

// `columns` is an array of arrays of figure classes ('' for the default md).
// `wide` is an array of classes for the full-width band above them.
function page(name, { columns, calls, wide = [], geometry }) {
  const file = path.join(dir, name + '.html');
  let n = 0;
  const fig = cls => `<figure class="fig${cls ? ' ' + cls : ''}"><div class="chart" id="c${++n}"></div>` +
    `<figcaption>Cap</figcaption></figure>`;
  fs.writeFileSync(file, css(geometry) +
    '<div class="sheet"><header class="masthead"><h1>T</h1></header>' +
    '<div class="body">' + wide.map(c => fig('wide' + (c ? ' ' + c : ''))).join('') +
    '<div class="cols">' +
    columns.map(col => '<div class="col">' + col.map(fig).join('') + '</div>').join('') +
    '</div></div>' +
    '<footer class="sheet-foot">Sources.</footer></div>\n<script>\n' + calls + '\n</script>\n');
  const out = spawnSync(process.execPath, [SCRIPT, file], { encoding: 'utf8' }).stdout;
  return row => {
    const line = out.split('\n').find(l => l.includes(row));
    assert.ok(line, 'no "' + row + '" row in:\n' + out);
    return { passed: /^\s*PASS/.test(line), note: /^\s*----/.test(line), line };
  };
}

const line = id => `Charts.line('${id}', { title: 'T', xAxis: { categories: ['Week 1','Week 2','Week 3'] }, ` +
  `series: [{ name: 'V', data: [1,2,3] }] });`;
const barList = (id, rows) => `Charts.barList('${id}', { title: 'T', series: [{ name: 'V', data: [` +
  Array.from({ length: rows }, (_, i) => `{ name: 'R${i}', y: ${100 - i} }`).join(',') + `] }] });`;
const donut = id => `Charts.donut('${id}', { title: 'T', series: [{ name: 'S', data: [{ name: 'A', y: 60 }, { name: 'B', y: 40 }] }] });`;
const waffle = id => `Charts.waffle('${id}', { title: 'T', series: [{ name: 'S', data: [{ name: 'A', y: 54 }] }] });`;

test('the shipped template passes its own checks', () => {
  const out = spawnSync(process.execPath, [SCRIPT, TEMPLATE], { encoding: 'utf8' }).stdout;
  for (const row of ['fits one page', 'paper-ready', 'charts fit their cells', 'bars sized to their cell']) {
    const l = out.split('\n').find(x => x.includes(row));
    assert.ok(l && /^\s*PASS/.test(l), row + ' did not pass:\n' + out);
  }
  assert.match(out, /730x990 sheet, 2 columns of 360x504px under a full-width band/);
});

test('a dashboard page is not held to any of it', () => {
  const file = path.join(dir, 'dash.html');
  fs.writeFileSync(file, '<div class="bento"><div class="cell w12"><div class="chart" id="c1"></div></div></div>' +
    '\n<script>\n' + line('c1') + '\n</script>\n');
  const out = spawnSync(process.execPath, [SCRIPT, file], { encoding: 'utf8' }).stdout;
  assert.match(out, /PASS {2}fits one page\s+not a one-pager/);
  assert.match(out, /PASS {2}paper-ready\s+not a one-pager/);
});

// ── the columns ──────────────────────────────────────────────────────
test('a column reports its own geometry, and the band it sits under', () => {
  const r = page('geometry', { columns: [[''], ['']], wide: [''],
    calls: [1, 2, 3].map(i => donut('c' + i)).join('\n') })('fits one page');
  assert.ok(r.passed, r.line);
  assert.match(r.line, /2 columns of 360x504px under a full-width band · figures use 302\/302px of each column/);
});

test('without a lead band the columns get the whole body', () => {
  const r = page('no-band', { columns: [[''], ['']], calls: donut('c1') + '\n' + donut('c2') })('fits one page');
  assert.match(r.line, /2 columns of 360x804px · figures use/);
  assert.ok(!/under a full-width band/.test(r.line), r.line);
});

test('figures that already overflow a column fail before a word of text is set', () => {
  const r = page('overfull', { columns: [['lg', 'lg'], ['']], wide: [''],
    calls: [1, 2, 3, 4].map(i => donut('c' + i)).join('\n') })('fits one page');
  assert.ok(!r.passed, r.line);
  assert.match(r.line, /column 1: 2 figure\(s\) total ~\d+px in a 504px column, before a word of text/);
  assert.match(r.line, /a smaller figure class, or one figure fewer/);
});

// ── which charts fit a column ────────────────────────────────────────
test('a line chart in a column is too narrow, and the fix named is the wide band', () => {
  const r = page('line-in-col', { columns: [['']], calls: line('c1') })('charts fit their cells');
  assert.ok(!r.passed, r.line);
  assert.match(r.line, /in \.fig is ~360px wide, needs 480/);
  assert.match(r.line, /move it to the \.wide band \(730px\), or use a column-width engine \(barList, radar, donut, pie, packedBubble\)/);
});

test('the same line chart in the wide band fits', () => {
  const r = page('line-wide', { columns: [], wide: [''], calls: line('c1') })('charts fit their cells');
  assert.ok(r.passed, r.line);
});

test('a donut fits a portrait column but not a landscape one', () => {
  assert.ok(page('donut-portrait', { columns: [['lg']], calls: donut('c1') })('charts fit their cells').passed);
  const land = page('donut-landscape', { columns: [['lg']], calls: donut('c1'),
    geometry: { w: 990, h: 730, cols: 3, size: 'landscape' } })('charts fit their cells');
  assert.ok(land.passed, land.line);   // 323px still clears the donut's 320
});

// ── the engines that shrink rather than refuse ───────────────────────
test('a four-row barList in a 200px figure fails, and .lg is the class named', () => {
  const r = page('barlist-short', { columns: [['sm']], calls: barList('c1', 4) })('bars sized to their cell');
  assert.ok(!r.passed, r.line);
  assert.match(r.line, /barList, 4 rows\) in \.fig\.sm has ~200px for 315px of rows/);
  assert.match(r.line, /→ \.lg \(310px\)/);
  assert.match(r.line, /it thins the bars rather than saying so/);
});

test('the same list at .lg passes; six rows needs .xl', () => {
  assert.ok(page('barlist-lg', { columns: [['lg']], calls: barList('c1', 4) })('bars sized to their cell').passed);
  const six = page('barlist-six', { columns: [['lg']], calls: barList('c1', 6) })('bars sized to their cell');
  assert.ok(!six.passed, six.line);
  assert.match(six.line, /→ \.xl \(430px\)/);
});

test('a waffle at column width fails below .xl — its dots shrink to nothing', () => {
  const r = page('waffle-col', { columns: [['lg']], calls: waffle('c1') })('bars sized to their cell');
  assert.ok(!r.passed, r.line);
  assert.match(r.line, /waffle\) in \.fig\.lg is 360x310px — its dots shrink/);
  assert.match(r.line, /→ \.xl, the \.wide band, or a donut/);
});

test('the same waffle in the wide band is fine', () => {
  const r = page('waffle-wide', { columns: [], wide: [''], calls: waffle('c1') })('bars sized to their cell');
  assert.ok(r.passed, r.line);
});

// ── the paper ────────────────────────────────────────────────────────
test('a taller sheet still fits A4 but spills Letter, and the check names Letter', () => {
  const r = page('tall', { columns: [['']], calls: donut('c1'), geometry: { h: 1050 } })('fits one page');
  assert.ok(!r.passed, r.line);
  assert.match(r.line, /past letter \(216x279\.4\)/);
  assert.ok(!/past a4/.test(r.line), 'A4 has the room; only Letter should be named: ' + r.line);
});

test('a wider @page margin is the other way to lose the guarantee', () => {
  const r = page('fat-margin', { columns: [['']], calls: donut('c1'), geometry: { margin: 20 } })('fits one page');
  assert.ok(!r.passed, r.line);
  assert.match(r.line, /past a4 \(210x297\) and letter/);
});

test('a landscape sheet on a portrait @page is split in two, and the check names the fix', () => {
  const r = page('landscape-portrait-page', { columns: [['lg']], calls: donut('c1'),
    geometry: { w: 990, h: 730, cols: 3 } })('fits one page');
  assert.ok(!r.passed, r.line);
  assert.match(r.line, /the sheet is landscape but @page is not: add "size: landscape"/);
});

test('with size: landscape the same sheet fits, and the check says so', () => {
  const r = page('landscape-ok', { columns: [['lg']], calls: donut('c1'),
    geometry: { w: 990, h: 730, cols: 3, size: 'landscape' } })('fits one page');
  assert.ok(r.passed, r.line);
  assert.match(r.line, /990x730 sheet, 3 columns of 323x544px .* fits A4 and Letter landscape at 8mm/);
});

test('no @page margin at all fails: the sheet is sized against a known one', () => {
  const file = path.join(dir, 'no-margin.html');
  fs.writeFileSync(file, css().replace(/@page[^}]*}/, '') +
    '<div class="sheet"><div class="body"><div class="cols"><div class="col">' +
    '<figure class="fig lg"><div class="chart" id="c1"></div></figure></div></div></div>' +
    '<footer class="sheet-foot">S</footer></div>\n<script>\n' + donut('c1') + '\n</script>\n');
  const out = spawnSync(process.execPath, [SCRIPT, file], { encoding: 'utf8' }).stdout;
  assert.match(out, /FAIL {2}fits one page\s+no "@page \{ margin: Nmm \}"/);
});

// ── nothing that needs a pointer ─────────────────────────────────────
test('a control fails: it prints as a grey box', () => {
  const file = path.join(dir, 'with-filter.html');
  fs.writeFileSync(file, css() +
    '<div class="sheet"><div class="body"><select id="f"><option>All</option></select>' +
    '<div class="cols"><div class="col">' +
    '<figure class="fig lg"><div class="chart" id="c1"></div></figure></div></div></div>' +
    '<footer class="sheet-foot">S</footer></div>\n<script>\n' + donut('c1') + '\n</script>\n');
  const out = spawnSync(process.execPath, [SCRIPT, file], { encoding: 'utf8' }).stdout;
  assert.match(out, /FAIL {2}paper-ready\s+1 control\(s\) on the page \(select\)/);
  assert.match(out, /a page that needs a filter is a dashboard/);
});

test('dataLabels off is a note, not a failure — the numbers are just not printed', () => {
  const r = page('no-labels', { columns: [['lg']],
    calls: `Charts.donut('c1', { title: 'T', plotOptions: { series: { dataLabels: { enabled: false } } }, ` +
      `series: [{ name: 'S', data: [{ name: 'A', y: 60 }, { name: 'B', y: 40 }] }] });` })('paper-ready');
  assert.ok(r.note, r.line);
  assert.match(r.line, /dataLabels off on c1/);
});
