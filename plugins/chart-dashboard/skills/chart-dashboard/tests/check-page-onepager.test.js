// node --test plugins/chart-dashboard/skills/chart-dashboard/tests/check-page-onepager.test.js
//
// The one-pager's own checks. The format's promise is that the file prints as
// ONE sheet of paper on A4 or Letter, and most of what backs that is arithmetic
// nobody can see: the sheet plus its @page margin against both papers, the
// column tracks the author picked, how much of each column the figures have
// already claimed, and the engine that quietly thins its bars rather than
// refusing a box that is too small.
//
// The sizing policy is the part worth stating. The manifest's minWidth and
// minHeight are the sizes a chart WANTS; no engine refuses below them. On a
// one-pager, where the job is fitting more onto a fixed sheet, falling under
// them is a note, and only 60% of the wanted size is a failure. On a dashboard
// the cell is supposed to be sized to the chart, so it stays a failure there.
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

const css = (o) => {
  const g = Object.assign({ w: 730, h: 990, cols: '1fr 1fr', margin: 8, size: 'auto' }, o || {});
  return '<style>\n' +
    '  :root { --sheet-w:' + g.w + 'px; --sheet-h:' + g.h + 'px; --cols: ' + g.cols + '; --margin:30px;\n' +
    '          --band-head:118px; --band-foot:22px; --gap:10px; --col-gap:16px; }\n' +
    '  .fig { margin:0 0 12px; }\n' +
    '  .fig .chart { width:100%; height:var(--fig-h, 180px); }\n' +
    '  .fig figcaption { font-size:8.5px; margin-top:4px; padding-top:4px; }\n' +
    '  @page { size:' + g.size + '; margin:' + g.margin + 'mm; }\n' +
    '</style>';
};

// `columns` is an array of arrays; each entry is a figure height in px, or
// 'auto' for a self-sizing figure. `wide` is the full-width band above them.
function page(name, opts) {
  const columns = opts.columns, wide = opts.wide || [];
  const file = path.join(dir, name + '.html');
  let n = 0;
  const fig = (hArg, isWide) => {
    const cls = 'fig' + (isWide ? ' wide' : '') + (hArg === 'auto' ? ' auto' : '');
    const style = hArg === 'auto' ? '' : ' style="--fig-h:' + hArg + 'px"';
    return '<figure class="' + cls + '"' + style + '><div class="chart" id="c' + (++n) +
      '"></div><figcaption>Cap</figcaption></figure>';
  };
  fs.writeFileSync(file, css(opts.geometry) +
    '<div class="sheet"><header class="masthead"><h1>T</h1></header>' +
    '<div class="body">' + wide.map(x => fig(x, true)).join('') +
    '<div class="cols">' +
    columns.map(col => '<div class="col">' + col.map(x => fig(x, false)).join('') + '</div>').join('') +
    '</div></div>' +
    '<footer class="sheet-foot">Sources.</footer></div>\n<script>\n' + opts.calls + '\n</script>\n');
  const out = spawnSync(process.execPath, [SCRIPT, file], { encoding: 'utf8' }).stdout;
  return row => {
    const line = out.split('\n').find(l => l.includes(row));
    assert.ok(line, 'no "' + row + '" row in:\n' + out);
    return { passed: /^\s*PASS/.test(line), note: /^\s*----/.test(line), line: line };
  };
}

const line = id => 'Charts.line("' + id + '", { title: "T", xAxis: { categories: ["Week 1","Week 2","Week 3"] }, ' +
  'series: [{ name: "V", data: [1,2,3] }] });';
const barList = (id, rows, po) => {
  const data = [];
  for (let i = 0; i < rows; i++) data.push('{ name: "R' + i + '", y: ' + (100 - i) + ' }');
  return 'Charts.barList("' + id + '", { title: "T"' +
    (po ? ', plotOptions: { barList: ' + po + ' }' : '') +
    ', series: [{ name: "V", data: [' + data.join(',') + '] }] });';
};

test('the shipped template passes its own checks', () => {
  const out = spawnSync(process.execPath, [SCRIPT, TEMPLATE], { encoding: 'utf8' }).stdout;
  ['fits one page', 'paper-ready', 'bars sized to their cell'].forEach(row => {
    const l = out.split('\n').find(x => x.includes(row));
    assert.ok(l && /^\s*PASS/.test(l), row + ' did not pass:\n' + out);
  });
  assert.match(out, /columns \[1fr 1fr\] = 357\/357px wide, 830px tall/);
});

test('a dashboard page is not held to any of it', () => {
  const file = path.join(dir, 'dash.html');
  fs.writeFileSync(file, '<div class="bento"><div class="cell w12"><div class="chart" id="c1"></div></div></div>' +
    '\n<script>\n' + line('c1') + '\n</script>\n');
  const out = spawnSync(process.execPath, [SCRIPT, file], { encoding: 'utf8' }).stdout;
  assert.match(out, /PASS {2}fits one page\s+not a one-pager/);
  assert.match(out, /PASS {2}paper-ready\s+not a one-pager/);
});

// ── the column tracks, whatever the author chose ─────────────────────
test('equal tracks, an uneven split and three columns are all read back', () => {
  const r1 = page('eq', { columns: [[170], [170]], calls: line('c1') + line('c2') })('fits one page');
  assert.match(r1.line, /columns \[1fr 1fr\] = 357\/357px wide/);
  const r2 = page('split', { columns: [[170], [170]], calls: line('c1') + line('c2'),
    geometry: { cols: '1.4fr 1fr' } })('fits one page');
  assert.match(r2.line, /columns \[1\.4fr 1fr\] = 417\/298px wide/);
  const r3 = page('three', { columns: [[170], [170], [170]],
    calls: line('c1') + line('c2') + line('c3'), geometry: { cols: '1fr 1fr 1fr' } })('fits one page');
  assert.match(r3.line, /= 233\/233\/233px wide/);
});

test('a fixed track takes its pixels off the top and the rest shares the remainder', () => {
  const r = page('fixed', { columns: [[170], [170]], calls: line('c1') + line('c2'),
    geometry: { cols: '240px 1fr' } })('fits one page');
  assert.match(r.line, /= 240\/474px wide/);
});

test('each column is sized by its own track, not by the first', () => {
  // 265px is under 60% of a line chart's 480, so the narrow column fails while
  // the wide one only earns a note.
  const r = page('per-col', { columns: [[170], [170]], calls: line('c1') + line('c2'),
    geometry: { cols: '2fr 1fr' } })('charts fit their cells');
  assert.ok(!r.passed && !r.note, r.line);
  assert.match(r.line, /c2 \(line\) in column 2/);
  assert.ok(!/c1 \(line\)/.test(r.line), 'the wide column should not fail: ' + r.line);
});

// ── how full the columns are ─────────────────────────────────────────
test('the report says how much of each column the figures hold', () => {
  const r = page('fill', { columns: [[170, 200], [170]],
    calls: [line('c1'), line('c2'), line('c3')].join('\n') })('fits one page');
  assert.ok(r.passed, r.line);
  assert.match(r.line, /figures hold \d+\/830 and \d+\/830px/);
});

test('figures that already overflow a column fail before a word of text is set', () => {
  const r = page('overfull', { columns: [[430, 430], [170]],
    calls: [line('c1'), line('c2'), line('c3')].join('\n') })('fits one page');
  assert.ok(!r.passed, r.line);
  assert.match(r.line, /column 1: 2 figure\(s\) total ~\d+px in a 830px column, before a word of text/);
});

test('a full-width band takes its height off every column', () => {
  const r = page('band', { columns: [[170], [170]], wide: [250],
    calls: [line('c1'), line('c2'), line('c3')].join('\n') })('fits one page');
  assert.match(r.line, /under 1 full-width band\(s\)/);
  assert.match(r.line, /px tall/);
});

// ── sizing is advice on a one-pager, a failure on a dashboard ────────
test('a line chart under the wanted size is a note, not a failure', () => {
  const r = page('cramped', { columns: [[170]], calls: line('c1') })('charts fit their cells');
  assert.ok(r.note, r.line);
  assert.match(r.line, /~357px wide \(wants 480\) and ~170px tall \(wants 260\)/);
  assert.match(r.line, /often the right trade/);
});

test('past 60% of the wanted size it is a failure', () => {
  const r = page('tiny', { columns: [[140]], calls: line('c1') })('charts fit their cells');
  assert.ok(!r.passed && !r.note, r.line);
  assert.match(r.line, /past the point of reading/);
});

test('the same undersized cell on a dashboard still fails', () => {
  const file = path.join(dir, 'dash-small.html');
  fs.writeFileSync(file,
    '<style>\n  .page { max-width:900px; padding:32px; }\n' +
    '  .bento { gap:16px; grid-auto-rows:340px; }\n  .cell { padding:6px; }\n</style>' +
    '<div class="page"><div class="bento"><div class="cell w4"><div class="chart" id="c1"></div></div></div></div>' +
    '\n<script>\n' + line('c1') + '\n</script>\n');
  const out = spawnSync(process.execPath, [SCRIPT, file], { encoding: 'utf8' }).stdout;
  const l = out.split('\n').find(x => x.includes('charts fit their cells'));
  assert.ok(/^\s*FAIL/.test(l), 'a dashboard cell under the minimum must still fail: ' + l);
});

// ── barList, measured against the metrics the page actually set ──────
test('a four-row barList is measured against its own bar metrics', () => {
  const loose = page('bl-default', { columns: [[200]], calls: barList('c1', 4) })('bars sized to their cell');
  assert.ok(!loose.passed, loose.line);
  assert.match(loose.line, /barList, 4 rows at barHeight 26\/rowGap 22\) in column 1 has ~200px for 313px of rows/);
  // Tightening the bars is what buys the space back.
  const tight = page('bl-tight', { columns: [[230]],
    calls: barList('c1', 4, '{ barHeight: 15, rowGap: 11 }') })('bars sized to their cell');
  assert.ok(tight.passed, tight.line);
});

test('class="fig auto" lets it grow, so there is nothing to check', () => {
  const r = page('bl-auto', { columns: [['auto']], calls: barList('c1', 6) })('bars sized to their cell');
  assert.ok(r.passed, r.line);
});

// ── the paper ────────────────────────────────────────────────────────
test('a taller sheet still fits A4 but spills Letter, and the check names Letter', () => {
  const r = page('tall', { columns: [[170]], calls: line('c1'), geometry: { h: 1050 } })('fits one page');
  assert.ok(!r.passed, r.line);
  assert.match(r.line, /past letter \(216x279\.4\)/);
  assert.ok(!/past a4/.test(r.line), 'A4 has the room; only Letter should be named: ' + r.line);
});

test('a wider @page margin is the other way to lose the guarantee', () => {
  const r = page('fat-margin', { columns: [[170]], calls: line('c1'), geometry: { margin: 20 } })('fits one page');
  assert.ok(!r.passed, r.line);
  assert.match(r.line, /past a4 \(210x297\) and letter/);
});

test('a landscape sheet on a portrait @page is split in two, and the check names the fix', () => {
  const r = page('landscape-portrait', { columns: [[170], [170], [170]],
    calls: [line('c1'), line('c2'), line('c3')].join('\n'),
    geometry: { w: 990, h: 730, cols: '1fr 1fr 1fr' } })('fits one page');
  assert.ok(!r.passed, r.line);
  assert.match(r.line, /the sheet is landscape but @page is not: add "size: landscape"/);
});

test('with size: landscape the same sheet fits, and the check says so', () => {
  const r = page('landscape-ok', { columns: [[170], [170], [170]],
    calls: [line('c1'), line('c2'), line('c3')].join('\n'),
    geometry: { w: 990, h: 730, cols: '1fr 1fr 1fr', size: 'landscape' } })('fits one page');
  assert.ok(r.passed, r.line);
  assert.match(r.line, /= 319\/319\/319px wide, 570px tall/);
  assert.match(r.line, /fits A4 and Letter landscape at 8mm/);
});

test('no @page margin at all fails: the sheet is sized against a known one', () => {
  const file = path.join(dir, 'no-margin.html');
  fs.writeFileSync(file, css().replace(/@page[^}]*}/, '') +
    '<div class="sheet"><div class="body"><div class="cols"><div class="col">' +
    '<figure class="fig" style="--fig-h:170px"><div class="chart" id="c1"></div></figure>' +
    '</div></div></div><footer class="sheet-foot">S</footer></div>\n<script>\n' + line('c1') + '\n</script>\n');
  const out = spawnSync(process.execPath, [SCRIPT, file], { encoding: 'utf8' }).stdout;
  assert.match(out, /FAIL {2}fits one page\s+no "@page \{ margin: Nmm \}"/);
});

// ── nothing that needs a pointer ─────────────────────────────────────
test('a control fails: it prints as a grey box', () => {
  const file = path.join(dir, 'with-filter.html');
  fs.writeFileSync(file, css() +
    '<div class="sheet"><div class="body"><select id="f"><option>All</option></select>' +
    '<div class="cols"><div class="col">' +
    '<figure class="fig" style="--fig-h:170px"><div class="chart" id="c1"></div></figure>' +
    '</div></div></div><footer class="sheet-foot">S</footer></div>\n<script>\n' + line('c1') + '\n</script>\n');
  const out = spawnSync(process.execPath, [SCRIPT, file], { encoding: 'utf8' }).stdout;
  assert.match(out, /FAIL {2}paper-ready\s+1 control\(s\) on the page \(select\)/);
});
