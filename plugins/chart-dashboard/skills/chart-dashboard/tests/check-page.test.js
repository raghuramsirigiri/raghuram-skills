// node --test plugins/chart-dashboard/skills/chart-dashboard/tests/check-page.test.js
//
// The "line x-axes ordered" check must find a line wherever the page draws
// one — a direct Charts.line call, a line panel inside Charts.panels, or a
// line chart column in a reportTable — because each renders the same error
// panel over named categories.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'check-page.js');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-page-'));
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

// Runs the checker on a one-panel page and returns the line-axes result row.
function lineCheck(name, script) {
  const file = path.join(dir, name + '.html');
  fs.writeFileSync(file, '<div class="chart" id="c1"></div>\n<script>\n' + script + '\n</script>\n');
  const out = spawnSync(process.execPath, [SCRIPT, file], { encoding: 'utf8' }).stdout;
  const row = out.split('\n').find(l => l.includes('line x-axes ordered'));
  assert.ok(row, 'no line-axes row in:\n' + out);
  return { passed: /^\s*PASS/.test(row), row };
}

test('panels with an ordered line pass', () => {
  const r = lineCheck('panels-ordered', `
    Charts.panels('c1', {
      title: 'Bookings',
      charts: [
        { type: 'line', title: 'Trend', xAxis: { categories: ['Jan 2025', 'Feb 2025', 'Mar 2025'] },
          tooltip: { formatter: function () { return this.y + '%'; } },
          series: [{ name: 'Bookings', data: [42, 51, 68] }] },
        { type: 'column', xAxis: { categories: ['North', 'South'] }, series: [{ name: 'x', data: [1, 2] }] }
      ]
    });`);
  assert.ok(r.passed, r.row);
  assert.match(r.row, /1 line chart/);
});

test('panels with a line over named categories fail', () => {
  const r = lineCheck('panels-named', `
    Charts.panels('c1', {
      title: 'By region',
      panels: [
        { type: 'donut', series: [{ name: 'Mix', data: [['a', 1], ['b', 2]] }] },
        { type: 'line', title: 'Regions', xAxis: { categories: ['North', 'South', 'East'] },
          series: [{ name: 'Sales', data: [3, 1, 2] }] }
      ]
    });`);
  assert.ok(!r.passed, r.row);
  assert.match(r.row, /c1 › panel 2 "Regions": North, South, East/);
});

test('a panel with no type is a column, not a line', () => {
  const r = lineCheck('panels-untyped', `
    Charts.panels('c1', { charts: [
      { xAxis: { categories: ['North', 'South'] }, series: [{ name: 'x', data: [1, 2] }] }
    ] });`);
  assert.ok(r.passed, r.row);
  assert.match(r.row, /no line charts/);
});

test('a reportTable line column over named categories fails', () => {
  const r = lineCheck('report-named', `
    Charts.reportTable('c1', {
      columns: [
        { key: 'trend', kind: 'chart', name: 'By region',
          chart: { type: 'line', xAxis: { categories: ['North', 'South', 'East'] } } },
        { key: 'yoy', kind: 'kpi', name: 'YoY' }
      ],
      rows: [{ name: 'Revenue', trend: [1, 2, 3], yoy: 4 }]
    });`);
  assert.ok(!r.passed, r.row);
  assert.match(r.row, /c1 › column trend: North/);
});

test('a reportTable sparkline with no categories passes', () => {
  const r = lineCheck('report-spark', `
    Charts.reportTable('c1', {
      columns: [{ key: 'trend', kind: 'chart', chart: { type: 'line' } }],
      rows: [{ name: 'Revenue', trend: [41, 44, 43] }]
    });`);
  assert.ok(r.passed, r.row);
  assert.match(r.row, /1 line chart/);
});

test('a direct Charts.line over named categories still fails', () => {
  const r = lineCheck('direct-named', `
    Charts.line('c1', { xAxis: { categories: ['Retail', 'Wholesale'] }, series: [{ name: 'x', data: [1, 2] }] });`);
  assert.ok(!r.passed, r.row);
  assert.match(r.row, /c1: Retail, Wholesale/);
});

// A chart id may be written in any of JavaScript's three quote styles, in
// either call shape. Reading only one of them reports a drawn panel as
// unwired (and misses the line on it). Charts.validate takes a quoted type,
// not an id, and the inlined library mentions it in its own messages.
test('chart ids in single, double and back quotes all count as wired', () => {
  const file = path.join(dir, 'quote-styles.html');
  fs.writeFileSync(file,
    '<div class="chart" id="c1"></div>\n<div class="chart" id="c2"></div>\n<div class="chart" id="c3"></div>\n' +
    '<script>\n' +
    "Charts.column('c1', { xAxis: { categories: ['North', 'South'] }, series: [{ name: 'x', data: [1, 2] }] });\n" +
    'SocialSnapshot.draw(Charts.line, "c2", { xAxis: { categories: ["Jan 2026", "Feb 2026"] }, series: [{ name: "x", data: [1, 2] }] });\n' +
    'draw(Charts.bar, `c3`, { xAxis: { categories: [`North`, `South`] }, series: [{ name: `x`, data: [1, 2] }] });\n' +
    'var hint = \'Charts.validate("table", config) lists every problem at once.\';\n' +
    '</script>\n');
  const out = spawnSync(process.execPath, [SCRIPT, file], { encoding: 'utf8' }).stdout;
  const wired = out.split('\n').find(l => l.includes('panels wired to charts'));
  assert.match(wired, /^\s*PASS.*3 panels, all wired/, out);
  const lines = out.split('\n').find(l => l.includes('line x-axes ordered'));
  assert.match(lines, /1 line chart/, out);
});

test('a page with no lines reports none', () => {
  const r = lineCheck('no-lines', `
    Charts.column('c1', { xAxis: { categories: ['North', 'South'] }, series: [{ name: 'x', data: [1, 2] }] });`);
  assert.ok(r.passed, r.row);
  assert.match(r.row, /no line charts on the page/);
});
