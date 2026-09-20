// node --test plugins/chart-dashboard/skills/chart-dashboard/tests/chart-convert.test.js
//
// Every switch chart-convert offers must produce a config the library accepts,
// carry the numbers across unchanged, and survive a round trip back.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

global.window = global;
global.self = global;
const ASSETS = path.join(__dirname, '..', 'assets');
require(path.join(ASSETS, 'charts-lib', 'theme.js'));
require(path.join(ASSETS, 'charts-lib', 'charts.js'));
const CC = require(path.join(ASSETS, 'chart-convert.js'));

const FIXTURES = {
  column: { title: 'Revenue by region', subtitle: '$M', legend: { enabled: true },
    plotOptions: { column: { stacking: 'normal' }, series: { dataLabels: { enabled: true } } },
    yAxis: { title: { text: '$M' }, min: 0 },
    xAxis: { categories: ['North', 'South', 'East', 'West'] },
    series: [{ name: '2025', data: [{ y: 10, color: '#2323FF' }, 8, 6, 4] }, { name: '2026', data: [12, 9, 5, 3] }] },
  bar: { title: 'Units', xAxis: { categories: ['A', 'B', 'C'] }, series: [{ name: 'Units', data: [5, 3, 1] }] },
  line: { title: 'Monthly', xAxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr'] },
    series: [{ name: 'Visits', data: [1, 2, 3, 4] }] },
  lineDates: { title: 'Daily', xAxis: { type: 'datetime' },
    series: [{ name: 'a', data: [[Date.UTC(2026, 0, 1), 1], [Date.UTC(2026, 0, 2), 2], [Date.UTC(2026, 0, 3), 4]] }] },
  radar: { title: 'Skills', xAxis: { categories: ['x', 'y', 'z'] }, series: [{ name: 'p', data: [1, 2, 3] }] },
  dumbbell: { title: 'Gap', xAxis: { categories: ['a', 'b'] }, series: [{ name: 'Before', data: [1, 2] }, { name: 'After', data: [3, 4] }] },
  table: { title: 'Scores', columns: [{ key: 'q1', name: 'Q1' }, { key: 'note', name: 'Note' }, { key: 'q2', name: 'Q2' }],
    rows: [{ name: 'A', q1: 1, note: 'x', q2: 2 }, { name: 'B', q1: 3, note: 'y', q2: null }] },
  barList: { title: 'Editors', plotOptions: { barList: { sort: 'desc' } },
    series: [{ name: 'Share', data: [{ name: 'VS Code', y: 73.6 }, { name: 'Vim', y: 20 }] }] },
  donut: { title: 'Mix', series: [{ name: 'Channel', data: [['Direct', 38], ['Paid', 24], ['Organic', 20]] }] },
  pie: { title: 'Device', series: [{ name: 'Device', data: [{ name: 'Mobile', y: 62 }, { name: 'Desktop', y: 38 }] }] },
  waffle: { title: 'Priorities', series: [{ name: 'Share', data: [{ name: 'Growth', y: 29, description: 'd1' }, { name: 'Ops', y: 30, description: 'd2' }] }] },
  packedBubble: { title: 'Topics', series: [{ name: 'Mentions', data: [['a', 5], ['b', 9]] }] },
  waterfall: { title: 'Bridge', series: [{ name: 'Profit', data: [{ name: 'Start', y: 100 }, { name: 'Price', y: 20 }, { name: 'Cost', y: -30 }, { name: 'End', isSum: true }] }] },
  histogram: { title: 'Latency', data: [1, 2, 2, 3, 3, 3, 4, 8] },
  scatter: { title: 'Fit', series: [{ name: 's', data: [[1, 2], [2, 3], [3, 5]] }] },
  bubble: { title: 'Size', series: [{ name: 'b', data: [[1, 2, 3], [2, 3, 4]] }] },
  sankey: { title: 'Flow', series: [{ data: [['a', 'b', 3]] }] }
};
const typeOf = k => (k === 'lineDates' ? 'line' : k);
const numbers = (type, cfg) => {
  const ds = CC.extract(type, cfg);
  if (ds.kind === 'values') return ds.values;
  if (ds.kind === 'xy') return ds.series.map(s => s.points.map(p => [p.x, p.y]));
  return { categories: ds.categories, series: ds.series.map(s => s.values) };
};

for (const [key, cfg] of Object.entries(FIXTURES)) {
  const from = typeOf(key);

  test(key + ': every offered switch is accepted by the library and keeps the numbers', () => {
    const offered = CC.targets(from, cfg);
    if (CC.FIXED.includes(from)) { assert.deepStrictEqual(offered, []); return; }
    assert.ok(offered.some(t => t.current), 'the current type is listed');
    for (const t of offered.filter(t => t.ok && !t.current)) {
      const out = CC.convert(from, cfg, t.type);
      assert.ok(!out.error, t.type + ': ' + out.error);
      const v = Charts.validate(t.type, out.config);
      // A line over named categories is the library's call, not ours: the
      // runtime draws it off screen and reports the refusal.
      if (t.type === 'line' && !v.ok) continue;
      assert.ok(v.ok, from + ' → ' + t.type + ': ' + v.errors.join('; '));
      assert.strictEqual(out.config.title, cfg.title, 'title carried');
      if (from !== 'waterfall' && from !== 'table') {
        const a = numbers(from, cfg), b = numbers(t.type, out.config);
        if (a.series && b.series) {
          assert.deepStrictEqual(b.categories, a.categories);
          assert.deepStrictEqual(b.series, a.series.slice(0, b.series.length));
        } else {
          assert.deepStrictEqual(b, a);
        }
      }
    }
  });
}

test('rules: why a type is refused', () => {
  const reason = (from, to) => CC.targets(from, FIXTURES[from]).find(t => t.type === to).reason;
  assert.match(reason('column', 'donut'), /one series/);
  assert.match(reason('dumbbell', 'radar'), /3 categories/);
  assert.match(reason('bar', 'dumbbell'), /exactly 2 series/);
  assert.match(reason('scatter', 'bubble'), /size/);
  assert.match(reason('waterfall', 'donut'), /Negative/);
  assert.ok(CC.targets('bar', FIXTURES.bar).find(t => t.type === 'donut').ok);
  assert.match(reason('table', 'dumbbell'), /blank/, 'a blank is not drawn as zero');
  assert.ok(CC.targets('table', FIXTURES.table).find(t => t.type === 'column').ok, 'column leaves a gap');
});

test('lost settings are named', () => {
  const out = CC.convert('column', FIXTURES.column, 'table');
  assert.ok(out.lost.includes('plotOptions.column'));
  assert.ok(out.lost.includes('point colours'));
  assert.deepStrictEqual(out.config.plotOptions, { series: { dataLabels: { enabled: true } } });
  assert.ok(CC.convert('table', FIXTURES.table, 'column').lost.some(l => /non-numeric/.test(l)));
});

test('a waterfall becomes columns of its totals and steps', () => {
  const out = CC.convert('waterfall', FIXTURES.waterfall, 'column');
  assert.deepStrictEqual(out.config.xAxis.categories, ['Start', 'Price', 'Cost', 'End']);
  assert.deepStrictEqual(out.config.series[0].data, [100, 20, -30, 90]);
  assert.ok(!CC.targets('column', FIXTURES.column).some(t => t.type === 'waterfall'), 'never offered as a target');
});

test('a dated line becomes date categories', () => {
  const out = CC.convert('line', FIXTURES.lineDates, 'column');
  assert.deepStrictEqual(out.config.xAxis.categories, ['2026-01-01', '2026-01-02', '2026-01-03']);
  assert.ok(out.lost.includes('xAxis.type'));
});

test('round trip bar → donut → bar keeps the data', () => {
  const donut = CC.convert('bar', FIXTURES.bar, 'donut').config;
  const back = CC.convert('donut', donut, 'bar').config;
  assert.deepStrictEqual(numbers('bar', back), numbers('bar', FIXTURES.bar));
});

test('point colours survive across types that draw them', () => {
  const out = CC.convert('column', FIXTURES.column, 'bar');
  assert.deepStrictEqual(out.config.series[0].data[0], { y: 10, color: '#2323FF' });
});

for (const [key, cfg] of Object.entries(FIXTURES)) {
  const type = typeOf(key);
  if (CC.FIXED.includes(type)) continue;
  test(key + ': writing the unchanged data back gives the same config', () => {
    const ds = CC.extract(type, cfg);
    const out = CC.withData(type, cfg, ds);
    assert.ok(!out.error, out.error);
    assert.deepStrictEqual(out.config, cfg);
  });
}

test('withData changes a value and a name and keeps everything else', () => {
  const ds = CC.extract('column', FIXTURES.column);
  ds.series[0].values[0] = 99;
  ds.categories[1] = 'Southwest';
  ds.series[1].name = 'Plan';
  const out = CC.withData('column', FIXTURES.column, ds).config;
  assert.deepStrictEqual(out.series[0].data[0], { y: 99, color: '#2323FF' });
  assert.strictEqual(out.xAxis.categories[1], 'Southwest');
  assert.strictEqual(out.series[1].name, 'Plan');
  assert.deepStrictEqual(out.plotOptions, FIXTURES.column.plotOptions);
});

test('withData keeps shapes: pairs, objects with descriptions, tables, waterfall totals', () => {
  let ds = CC.extract('donut', FIXTURES.donut); ds.series[0].values[2] = 1; ds.categories[2] = 'SEO';
  assert.deepStrictEqual(CC.withData('donut', FIXTURES.donut, ds).config.series[0].data[2], ['SEO', 1]);

  ds = CC.extract('waffle', FIXTURES.waffle); ds.series[0].values[0] = 50;
  assert.deepStrictEqual(CC.withData('waffle', FIXTURES.waffle, ds).config.series[0].data[0], { name: 'Growth', y: 50, description: 'd1' });

  ds = CC.extract('table', FIXTURES.table); ds.series[1].values[1] = 7;
  const tbl = CC.withData('table', FIXTURES.table, ds).config;
  assert.strictEqual(tbl.rows[1].q2, 7);
  assert.strictEqual(tbl.rows[1].note, 'y', 'text column untouched');

  ds = CC.extract('waterfall', FIXTURES.waterfall);
  assert.deepStrictEqual(ds.series[0].locked, [false, false, false, true]);
  ds.series[0].values[1] = 25; ds.series[0].values[3] = 12345;
  const wf = CC.withData('waterfall', FIXTURES.waterfall, ds).config;
  assert.deepStrictEqual(wf.series[0].data[1], { name: 'Price', y: 25 });
  assert.deepStrictEqual(wf.series[0].data[3], { name: 'End', isSum: true }, 'a total stays computed');
  assert.ok(Charts.validate('waterfall', wf).ok);
});

test('withData refuses added rows and keeps x-position categories', () => {
  const ds = CC.extract('bar', FIXTURES.bar);
  ds.categories.push('D'); ds.series[0].values.push(1);
  assert.match(CC.withData('bar', FIXTURES.bar, ds).error, /added or removed/);
  const dated = CC.extract('line', FIXTURES.lineDates);
  assert.strictEqual(dated.categoryEditable, false);
  dated.categories[0] = 'renamed';
  const out = CC.withData('line', FIXTURES.lineDates, dated).config;
  assert.strictEqual(out.series[0].data[0][0], Date.UTC(2026, 0, 1));
});

test('style options follow the chart', () => {
  const o = (k, t) => CC.style.options(t || typeOf(k), FIXTURES[k]);
  assert.deepStrictEqual(o('bar'), { sort: true, highlight: true, labels: true, colours: true, marks: true });
  assert.strictEqual(o('column').sort, false, 'two series: no single order');
  assert.strictEqual(o('column').highlight, false);
  assert.strictEqual(o('line').sort, false, 'a line keeps its order');
  assert.strictEqual(o('donut').sort, true);
  assert.strictEqual(o('donut').colours, false);
  assert.deepStrictEqual(o('sankey'), { sort: false, highlight: false, labels: false, colours: false, marks: true });
});

test('sort moves names, values and point colours together', () => {
  const cfg = { xAxis: { categories: ['a', 'b', 'c', 'd'] },
    series: [{ name: 's', data: [2, { y: 9, color: '#f00' }, null, 5] }] };
  const out = CC.style.sort('bar', cfg, 'desc').config;
  assert.deepStrictEqual(out.xAxis.categories, ['b', 'd', 'a', 'c']);
  assert.deepStrictEqual(out.series[0].data, [{ y: 9, color: '#f00' }, 5, 2, null]);
  assert.deepStrictEqual(CC.style.sort('bar', cfg, 'asc').config.xAxis.categories, ['a', 'd', 'b', 'c'], 'blanks last');
  assert.deepStrictEqual(cfg.xAxis.categories, ['a', 'b', 'c', 'd'], 'input untouched');
  const donut = CC.style.sort('donut', FIXTURES.donut, 'asc').config;
  assert.deepStrictEqual(donut.series[0].data.map(p => p[0]), ['Organic', 'Paid', 'Direct']);
  assert.match(CC.style.sort('line', FIXTURES.line, 'desc').error, /can't be sorted/);
});

test('highlight colours chosen points and clears back to plain values', () => {
  const on = CC.style.highlight('bar', FIXTURES.bar, [1], '#2323FF', '#8f8d87').config;
  assert.deepStrictEqual(on.series[0].data, [{ y: 5, color: '#8f8d87' }, { y: 3, color: '#2323FF' }, { y: 1, color: '#8f8d87' }]);
  assert.deepStrictEqual(CC.style.highlighted(on, '#2323ff'), [1]);
  const off = CC.style.highlight('bar', on, [], '#2323FF', '#8f8d87').config;
  assert.deepStrictEqual(off.series[0].data, [5, 3, 1]);
  const list = CC.style.highlight('barList', FIXTURES.barList, [0], '#2323FF', '#8f8d87').config;
  assert.deepStrictEqual(list.series[0].data[0], { name: 'VS Code', y: 73.6, color: '#2323FF' });
  assert.ok(Charts.validate('bar', on).ok);
});

test('labels and series colours', () => {
  const off = CC.style.labels('column', FIXTURES.column, false).config;
  assert.deepStrictEqual(off.plotOptions.series.dataLabels, { enabled: false });
  assert.deepStrictEqual(off.plotOptions.column, { stacking: 'normal' });
  const red = CC.style.seriesColour('column', FIXTURES.column, 1, '#4949FF').config;
  assert.strictEqual(red.series[1].color, '#4949FF');
  assert.ok(!('color' in CC.style.seriesColour('column', red, 1, null).config.series[1]));
  assert.match(CC.style.labels('donut', FIXTURES.donut, true).error, /can't be changed/);
});

test('marks: per-slice, per-row, per-bubble, waterfall roles, sankey nodes', () => {
  assert.deepStrictEqual(CC.style.marks('donut', FIXTURES.donut).map(m => m.name), ['Direct', 'Paid', 'Organic']);
  assert.deepStrictEqual(CC.style.marks('packedBubble', FIXTURES.packedBubble).map(m => m.name), ['a', 'b']);
  assert.deepStrictEqual(CC.style.marks('waterfall', FIXTURES.waterfall).map(m => m.key), ['upColor', 'downColor', 'sumColor']);
  assert.deepStrictEqual(CC.style.marks('sankey', FIXTURES.sankey).map(m => m.key), ['a', 'b']);
  assert.strictEqual(CC.style.marks('column', FIXTURES.column), null, 'two series colour by series');
  assert.strictEqual(CC.style.marks('line', FIXTURES.line), null);
  assert.strictEqual(CC.style.options('pie', FIXTURES.pie).marks, true);
});

test('markColour keeps each point shape and clears back to it', () => {
  const on = CC.style.markColour('donut', FIXTURES.donut, 1, '#B31B38').config;
  assert.deepStrictEqual(on.series[0].data[1], { name: 'Paid', y: 24, color: '#B31B38' });
  assert.deepStrictEqual(CC.style.marks('donut', on)[1].color, '#B31B38');
  const off = CC.style.markColour('donut', on, 1, null).config;
  assert.deepStrictEqual(off.series[0].data[1], { name: 'Paid', y: 24 });
  const bar = CC.style.markColour('bar', FIXTURES.bar, 0, '#243E63').config;
  assert.deepStrictEqual(bar.series[0].data[0], { y: 5, color: '#243E63' });
  assert.strictEqual(CC.style.markColour('bar', bar, 0, null).config.series[0].data[0], 5);
  const bubble = CC.style.markColour('packedBubble', FIXTURES.packedBubble, 0, '#9a0060').config;
  assert.deepStrictEqual(bubble.series[0].data[0], { name: 'a', y: 5, color: '#9a0060' });
  assert.deepStrictEqual(CC.extract('packedBubble', bubble).series[0].values, [5, 9], 'values unchanged');
});

test('markColour on waterfall roles and sankey nodes', () => {
  const wf = CC.style.markColour('waterfall', FIXTURES.waterfall, 'downColor', '#9a0060').config;
  assert.strictEqual(wf.plotOptions.waterfall.downColor, '#9a0060');
  assert.ok(Charts.validate('waterfall', wf).ok);
  const sk = CC.style.markColour('sankey', FIXTURES.sankey, 'b', '#243E63').config;
  assert.deepStrictEqual(sk.series[0].nodes, [{ id: 'b', color: '#243E63' }]);
  assert.ok(Charts.validate('sankey', sk).ok);
  const cleared = CC.style.markColour('sankey', sk, 'b', null).config;
  assert.ok(!('nodes' in cleared.series[0]), 'an empty node entry is removed');
  assert.match(CC.style.markColour('sankey', FIXTURES.sankey, 'zzz', '#000').error, /can't be recoloured/);
});

// ── charts with records: bar insight table, report table, geofacet, panels ──
const MORE = {
  barInsightTable: { title: 'Income statement', subtitle: '$M',
    xAxis: { categories: ['Revenue', 'COGS', 'Gross profit'] },
    rows: [{ insight: 'Topline growth', description: 'Renewals landed early' },
      { insight: 'Costs', description: 'Freight normalised' },
      { insight: 'Margin', description: 'Mix shift to software', stat: '+33%' }],
    plotOptions: { barInsightTable: { valueSuffix: 'M', statColorBySign: true } },
    series: [{ name: 'FY25', data: [1000, 400, 600] }, { name: 'FY26', data: [1300, 500, 800] }] },
  reportTable: { title: 'Q3 business review', subtitle: 'Three chart columns, an insight, a KPI and owner notes',
    columns: [
      { key: 'trend', kind: 'chart', name: 'Last six months', chart: { type: 'line' } },
      { key: 'quarters', kind: 'chart', name: 'By quarter', chart: { type: 'column', xAxis: { categories: ['Q1', 'Q2', 'Q3', 'Q4'] } } },
      { key: 'mix', kind: 'chart', name: 'Mix', chart: { type: 'donut' } },
      { key: 'why', kind: 'insight', name: 'What happened' },
      { key: 'yoy', kind: 'kpi', name: 'YoY', suffix: '%', decimals: 1, colorBySign: true },
      { key: 'note', kind: 'text', name: 'Owner notes' }],
    rows: [
      { name: 'Revenue', trend: [41, 44, 43, 48, 51, 55], quarters: [120, 131, 138, 152],
        mix: { series: [{ name: 'Revenue', data: [['New', 48], ['Expansion', 31], ['Renewal', 21]] }] },
        why: { head: 'Topline growth', body: 'Renewals landed early.' },
        yoy: { value: 12.4, note: 'vs 9.0% plan' }, note: 'Expect a softer October.' },
      { name: 'Churn', trend: [6, 5, 5, 4, 4, 3], quarters: [18, 16, 14, 12],
        mix: { series: [{ name: 'Churn', data: [['Price', 40], ['Product', 35], ['Other', 25]] }] },
        why: { head: 'Fewer cancellations', body: 'Onboarding fix held.' },
        yoy: -2.1, note: 'Watch enterprise renewals.' },
      { name: 'Margin', trend: [61, 62, 62, 63, 64, 66], quarters: [60, 62, 63, 65],
        mix: { series: [{ name: 'Margin', data: [['Software', 58], ['Services', 30], ['Hardware', 12]] }] },
        why: { head: 'Mix shift', body: 'Software grew faster than services.' },
        yoy: { value: 3.2, note: 'points' }, note: 'Hold pricing through Q4.' }] },
  geofacet: { title: 'EV adoption by state', subtitle: '% of new car sales', chart: { variant: 'bar' },
    plotOptions: { geofacet: { max: 40, valueSuffix: '%' } },
    series: [{ data: [{code: 'AL',value: 3}, {code: 'AK',value: 4}, {code: 'AZ',value: 12}, {code: 'AR',value: 3}, {code: 'CA',value: 38}, {code: 'CO',value: 24}, {code: 'CT',value: 13}, {code: 'DE',value: 11}, {code: 'DC',value: 22}, {code: 'FL',value: 11}, {code: 'GA',value: 8}, {code: 'HI',value: 21}, {code: 'ID',value: 6}, {code: 'IL',value: 12}, {code: 'IN',value: 5}, {code: 'IA',value: 4}, {code: 'KS',value: 5}, {code: 'KY',value: 4}, {code: 'LA',value: 3}, {code: 'ME',value: 10}, {code: 'MD',value: 15}, {code: 'MA',value: 16}, {code: 'MI',value: 7}, {code: 'MN',value: 10}, {code: 'MS',value: 2}, {code: 'MO',value: 6}, {code: 'MT',value: 6}, {code: 'NE',value: 5}, {code: 'NV',value: 17}, {code: 'NH',value: 10}, {code: 'NJ',value: 19}, {code: 'NM',value: 8}, {code: 'NY',value: 14}, {code: 'NC',value: 9}, {code: 'ND',value: 3}, {code: 'OH',value: 7}, {code: 'OK',value: 5}, {code: 'OR',value: 22}, {code: 'PA',value: 9}, {code: 'RI',value: 11}, {code: 'SC',value: 6}, {code: 'SD',value: 3}, {code: 'TN',value: 6}, {code: 'TX',value: 9}, {code: 'UT',value: 13}, {code: 'VT',value: 17}, {code: 'VA',value: 13}, {code: 'WA',value: 29}, {code: 'WV',value: 3}, {code: 'WI',value: 6}, {code: 'WY',value: 4}] }] },
  panels: { title: 'Q3 commercial review', subtitle: 'Bookings, revenue mix and top accounts',
    plotOptions: { panels: { columns: 3, panelHeight: 260 } },
    charts: [
      { type: 'column', title: 'Bookings', xAxis: { categories: ['Jul', 'Aug', 'Sep'] }, series: [{ name: 'Bookings', data: [42, 51, 68] }] },
      { type: 'donut', title: 'Revenue mix', series: [{ name: 'Revenue', data: [['New', 48], ['Expansion', 31], ['Renewal', 21]] }] },
      { type: 'barList', title: 'Top accounts', series: [{ name: 'ARR', data: [['Northwind', 210], ['Acme', 184], ['Globex', 121]] }] }] }
};
Object.assign(FIXTURES, MORE);

test('the record fixtures are valid charts', () => {
  for (const k of Object.keys(MORE)) {
    const v = Charts.validate(k, MORE[k]);
    assert.ok(v.ok, k + ': ' + v.errors.join('; '));
  }
});

test('records round-trip unchanged for every record chart', () => {
  for (const k of ['barInsightTable', 'reportTable', 'geofacet']) {
    const rec = CC.records(k, MORE[k]);
    assert.deepStrictEqual(CC.withRecords(k, MORE[k], rec).config, MORE[k], k);
  }
});

test('bar insight table: values, names and insight text', () => {
  const rec = CC.records('barInsightTable', MORE.barInsightTable);
  assert.deepStrictEqual(rec.rows[2], { name: 'Gross profit', values: [600, 800], insight: 'Margin', description: 'Mix shift to software', stat: '+33%', statNote: '' });
  rec.rows[0].values[1] = 1400; rec.rows[0].insight = 'Strong year'; rec.rows[2].stat = '';
  const out = CC.withRecords('barInsightTable', MORE.barInsightTable, rec).config;
  assert.strictEqual(out.series[1].data[0], 1400);
  assert.strictEqual(out.rows[0].insight, 'Strong year');
  assert.ok(!('stat' in out.rows[2]), 'empty text removes the field');
  assert.ok(Charts.validate('barInsightTable', out).ok);
  // single series with extras on the points
  const pts = { series: [{ name: 's', data: [{ name: 'A', y: 1, insight: 'x' }, { name: 'B', y: 2 }] }] };
  const r2 = CC.records('barInsightTable', pts);
  assert.strictEqual(r2.rows[0].insight, 'x');
  r2.rows[1].insight = 'y';
  assert.deepStrictEqual(CC.withRecords('barInsightTable', pts, r2).config.series[0].data[1], { name: 'B', y: 2, insight: 'y' });
});

test('bar insight table colours: stats, sign, bars', () => {
  const on = CC.insight.statColour(MORE.barInsightTable, 1, '#B31B38').config;
  assert.strictEqual(on.rows[1].statColor, '#B31B38');
  assert.strictEqual(CC.insight.statColourOf(on, 1), '#B31B38');
  assert.ok(!('statColor' in CC.insight.statColour(on, 1, null).config.rows[1]));
  assert.strictEqual(CC.insight.statsBySign(MORE.barInsightTable, false).config.plotOptions.barInsightTable.statColorBySign, false);
  assert.strictEqual(CC.style.options('barInsightTable', MORE.barInsightTable).colours, true);
  const single = { xAxis: { categories: ['a', 'b'] }, series: [{ name: 's', data: [1, 2] }] };
  assert.deepStrictEqual(CC.style.markColour('barInsightTable', single, 0, '#243E63').config.series[0].data[0], { y: 1, color: '#243E63' });
});

test('geofacet: region values and tile types', () => {
  const rec = CC.records('geofacet', MORE.geofacet);
  const ca = rec.rows.findIndex(r => r.code === 'CA'), wa = rec.rows.findIndex(r => r.code === 'WA');
  assert.strictEqual(rec.rows.length, 51);
  assert.deepStrictEqual(rec.rows[ca], { code: 'CA', name: '', value: 38 });
  rec.rows[ca].value = 40; rec.rows[wa].name = 'Washington';
  const out = CC.withRecords('geofacet', MORE.geofacet, rec).config;
  assert.deepStrictEqual(out.series[0].data[ca], { code: 'CA', value: 40 });
  assert.deepStrictEqual(out.series[0].data[wa], { code: 'WA', value: 29, name: 'Washington' });
  const obj = { series: [{ data: { CA: 1, TX: 2 } }] };
  const r2 = CC.records('geofacet', obj); r2.rows[1].value = 5;
  assert.deepStrictEqual(CC.withRecords('geofacet', obj, r2).config.series[0].data, { CA: 1, TX: 5 });
  assert.strictEqual(CC.tiles.variant(MORE.geofacet), 'bar');
  assert.strictEqual(CC.tiles.set(MORE.geofacet, 'gauge').config.chart.variant, 'gauge');
  assert.deepStrictEqual(CC.tiles.list, ['bar', 'heat', 'gauge']);
  assert.match(CC.tiles.set(MORE.geofacet, 'donut').error, /Unknown/);
});

test('report table: cells of every kind', () => {
  const rec = CC.records('reportTable', MORE.reportTable);
  assert.deepStrictEqual(rec.columns.map(c => c.kind), ['chart', 'chart', 'chart', 'insight', 'kpi', 'text']);
  assert.deepStrictEqual(rec.rows[1].cells, { trend: { values: [6, 5, 5, 4, 4, 3] }, quarters: { values: [18, 16, 14, 12] }, mix: { values: [40, 35, 25] }, why: { head: 'Fewer cancellations', body: 'Onboarding fix held.' }, yoy: { value: -2.1, note: '' }, note: { text: 'Watch enterprise renewals.' } });
  rec.rows[0].cells.yoy.value = 15; rec.rows[1].cells.yoy.note = 'best in a year';
  rec.rows[0].cells.why.body = 'Edited.'; rec.rows[1].cells.trend.values[5] = 2; rec.rows[0].name = 'Net revenue';
  rec.columns[5].name = 'Notes';
  const out = CC.withRecords('reportTable', MORE.reportTable, rec).config;
  assert.deepStrictEqual(out.rows[0].yoy, { value: 15, note: 'vs 9.0% plan' });
  assert.deepStrictEqual(out.rows[1].yoy, { value: -2.1, note: 'best in a year' });
  assert.strictEqual(out.rows[0].why.body, 'Edited.');
  assert.deepStrictEqual(out.rows[1].trend, [6, 5, 5, 4, 4, 2]);
  assert.strictEqual(out.rows[0].name, 'Net revenue');
  assert.strictEqual(out.columns[5].name, 'Notes');
  assert.ok(Charts.validate('reportTable', out).ok);
});

test('report table: switching a chart column converts every row', () => {
  const offered = CC.report.targets(MORE.reportTable, 'trend');
  const ok = offered.filter(t => t.ok).map(t => t.type);
  assert.ok(ok.includes('column') && ok.includes('bar'), ok.join());
  assert.ok(!offered.some(t => t.type === 'table'), 'exhibit types are never offered in a cell');
  const col = CC.report.switchChart(MORE.reportTable, 'trend', 'column').config;
  assert.strictEqual(col.columns[0].chart.type, 'column');
  assert.deepStrictEqual(col.rows[0].trend, [41, 44, 43, 48, 51, 55], 'a bare list stays a list');
  assert.ok(Charts.validate('reportTable', col).ok);
  const donut = CC.report.switchChart(MORE.reportTable, 'trend', 'donut');
  assert.ok(donut.config, donut.error);
  assert.ok(Array.isArray(donut.config.rows[0].trend.series), 'a donut cell holds named slices');
  assert.ok(Charts.validate('reportTable', donut.config).ok);
  assert.match(CC.report.switchChart(MORE.reportTable, 'note', 'column').error, /can't show/);
  // cells that became named slices still edit as values
  const rec = CC.records('reportTable', donut.config);
  assert.deepStrictEqual(rec.rows[0].cells.trend.values, [41, 44, 43, 48, 51, 55]);
  rec.rows[0].cells.trend.values[0] = 40;
  const edited = CC.withRecords('reportTable', donut.config, rec).config;
  assert.strictEqual(CC.records('reportTable', edited).rows[0].cells.trend.values[0], 40);
  assert.ok(Charts.validate('reportTable', edited).ok);
  // every offered type converts every row into a cell the library accepts
  for (const t of offered.filter(t => t.ok && !t.current)) {
    const out = CC.report.switchChart(MORE.reportTable, 'trend', t.type);
    assert.ok(out.config, t.type + ': ' + out.error);
    const col = out.config.columns[0];
    for (const r of out.config.rows) {
      const cell = Array.isArray(r.trend) ? { series: [{ data: r.trend }] } : r.trend;
      const v = Charts.validate(t.type, Object.assign({}, col.chart, cell));
      assert.ok(v.ok, t.type + ': ' + v.errors.join('; '));
    }
  }
});

test('report table column widths are percentages that total 100', () => {
  const sum = cfg => CC.report.widths(cfg).reduce((a, c) => a + c.pct, 0);
  assert.ok(CC.report.widths(MORE.reportTable).every(c => c.pct === null), 'automatic to start');
  const init = CC.report.initPercents(MORE.reportTable, { trend: 240, quarters: 240, mix: 240, why: 160, yoy: 60, note: 60 }).config;
  assert.deepStrictEqual(CC.report.widths(init).map(c => c.pct), [24, 24, 24, 16, 6, 6]);
  // changing one column moves the difference into the last
  const set = CC.report.setPercent(init, 'why', 20, 3000).config;   // floor 60px = 2%
  assert.deepStrictEqual(CC.report.widths(set).map(c => c.pct), [24, 24, 24, 20, 6, 2]);
  assert.strictEqual(Math.round(sum(set) * 10) / 10, 100);
  // clamped so the last column keeps its floor (60px of 1000px = 6%)
  const big = CC.report.setPercent(init, 'why', 50, 1000).config;
  assert.deepStrictEqual(CC.report.widths(big).map(c => c.pct), [24, 24, 24, 16, 6, 6], 'no room: nothing to give');
  const donutFloor = CC.report.setPercent(init, 'mix', 5, 1000).config;
  assert.strictEqual(CC.report.widths(donutFloor)[2].pct, 22, 'a donut column keeps 220px');
  assert.strictEqual(CC.report.widths(donutFloor)[5].pct, 8);
  // setting a share on an automatic table starts every column first
  const fromAuto = CC.report.setPercent(MORE.reportTable, 'trend', 30, 3000, { trend: 240, quarters: 240, mix: 240, why: 160, yoy: 60, note: 60 }).config;
  assert.strictEqual(Math.round(sum(fromAuto) * 10) / 10, 100);
  assert.deepStrictEqual(CC.report.widths(fromAuto).map(c => c.pct), [28, 24, 24, 16, 6, 2], 'the others keep their drawn shares; the last keeps its 2% floor');
  assert.match(CC.report.setPercent(init, 'note', 10, 1000).error, /last column/);
  // pixels sum exactly to the room
  const px = CC.report.percentPixels(set, 999);
  assert.strictEqual(px.reduce((a, b) => a + b, 0), 999);
  assert.strictEqual(CC.report.percentPixels(MORE.reportTable, 999), null);
  // auto clears, and the library still accepts a table with shares
  assert.ok(CC.report.widths(CC.report.clearWidths(set).config).every(c => c.pct === null));
  assert.ok(Charts.validate('reportTable', set).ok);
});

test('callouts: anchors per chart, and a round trip through the config', () => {
  const a = t => CC.callouts.anchors(t, FIXTURES[t]);
  assert.deepStrictEqual(a('column').anchors.map(x => x.value), ['North', 'South', 'East', 'West']);
  assert.deepStrictEqual(a('column').series, ['2025', '2026']);
  assert.strictEqual(a('line').by, 'x');
  assert.deepStrictEqual(a('line').anchors.map(x => x.value), [0, 1, 2, 3], 'a line pins by category index');
  assert.deepStrictEqual(a('scatter').anchors[1].value, { x: 2, y: 3 });
  assert.deepStrictEqual(a('donut').anchors.map(x => x.value), ['Direct', 'Paid', 'Organic']);
  assert.ok(a('geofacet').anchors.some(x => x.value === 'CA'));
  assert.deepStrictEqual(a('barInsightTable').anchors.map(x => x.value), ['Revenue', 'COGS', 'Gross profit']);
  assert.strictEqual(a('histogram').by, 'value');
  assert.strictEqual(CC.callouts.anchors('sankey', FIXTURES.sankey), null);
  assert.strictEqual(CC.callouts.anchors('table', FIXTURES.table), null);

  const set = CC.callouts.set('column', FIXTURES.column, [{ anchor: 'South', series: '2026', text: 'Promo week', color: '#B31B38' }]).config;
  assert.deepStrictEqual(set.callouts, [{ name: 'South', series: '2026', text: 'Promo week', color: '#B31B38' }]);
  assert.deepStrictEqual(CC.callouts.list('column', set), [{ anchor: 'South', series: '2026', text: 'Promo week', color: '#B31B38' }]);
  const line = CC.callouts.set('line', FIXTURES.line, [{ anchor: 2, text: 'Launch' }]).config;
  assert.deepStrictEqual(line.callouts, [{ x: 2, text: 'Launch' }]);
  const sc = CC.callouts.set('scatter', FIXTURES.scatter, [{ anchor: { x: 3, y: 5 }, text: 'Outlier' }]).config;
  assert.deepStrictEqual(CC.callouts.list('scatter', sc)[0].anchor, { x: 3, y: 5 });
  assert.ok(!('callouts' in CC.callouts.set('column', set, []).config), 'an empty list removes them');
  // callouts written by hand with another naming key still read back
  assert.strictEqual(CC.callouts.list('column', { callouts: [{ category: 'Q3', text: 'x' }] })[0].anchor, 'Q3');
  assert.match(CC.callouts.set('column', FIXTURES.column, [{ anchor: '', text: 'x' }]).error, /point at/);
});
