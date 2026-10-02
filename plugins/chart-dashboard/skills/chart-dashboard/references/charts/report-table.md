# Report table (`Charts.reportTable`)

Part of the charts-lib API — the shared options, sizing and interactions are in
[`../chart-api.md`](../chart-api.md). Every option below is optional; the library picks sensible defaults.

A table whose cells are not only numbers. Every column needs a `kind`:
`text` (wrapping paragraph), `insight` (`{ head, body }`), `kpi` (one large stat — a number or `{ value, note, fill }`) or `chart` (a real chart per row). There is **no `number` kind** — put figures in a `kpi` column.

```js
Charts.reportTable('container', {
  title: 'Q3 business review',
  columns: [
    { key: 'trend', kind: 'chart',   name: 'Last six months', group: 'Performance', chart: { type: 'line' } },
    { key: 'why',   kind: 'insight', name: 'What happened',   group: 'Outcome' },
    { key: 'yoy',   kind: 'kpi',     name: 'YoY', suffix: '%', decimals: 1, colorBySign: true, group: 'Outcome' },
    { key: 'note',  kind: 'text',    name: 'Owner notes',     group: 'Context' }
  ],
  rows: [
    { group: 'Income', name: 'Revenue', trend: [41, 44, 43, 48, 51, 55],
      why: { head: 'Topline growth', body: 'Renewals landed early.' },
      yoy: { value: 12.4, note: 'vs 9.0% plan' }, note: 'Expect a softer October.' }
  ]
});
```

- **Chart cells**: `column.chart` holds defaults (`type` required); each row's value is laid over it — a full config or a bare data array. Refused types: `panels`, `table`, `barInsightTable`, `reportTable`. Cell titles/legends are dropped; 2+ series names show once as a legend above the table. Cells are `compact: true` by default (column `compact: false` keeps axes).
- **Name the bars in a `bar`/`column` cell with categories**, set once on the column (`chart: { type: 'bar', xAxis: { categories: ['Before', 'After'] } }`), and give each row one series whose points carry any colour (`{ y, color }`). Each row then labels its own bars. Without categories the cell labels its one unnamed category by index, so every row shows a stray `0` beside its bars; splitting the bars into two named series does not avoid it.
- **Shared scale**: `line`, `column`, `bar`, `dumbbell` cells in one column share `yAxis.min/max`; opt out with `sharedScale: false` when rows differ in unit.
- **Colour**: `kpi` columns take `colorBySign: true`, or `colorByScale: true` (+ a `scale` id to share one domain across columns). Any `kpi`/`text`/`insight` cell may carry its own `fill`. One colour per series name across the whole table.
- **Row labels**: `row.name` as text or `{ head, body }`; contiguous `row.group` headings.
- **Column groups are all or nothing** — if one column has a `group`, every column needs one.
- **Pie/donut cells** are ≥220px wide; past 4 slices (`sliceKeyAt`) they show a key instead of callouts.
- **Sizing — height**: as tall as its rows (chart rows `rowHeight`, default 140; they grow rather than clip). It grows only in a container **without** a height; given one (a fixed bento cell, `.h2`), it stretches each row by a capped amount and leaves the rest blank. Put it in a `<div class="bento flow">` row — see `layout-dashboard.md` § Tables size themselves.
- **Sizing — width**: text, insight (≤240px) and kpi columns stop at their preferred width; a **chart column takes all the remaining width**. Set the chart column's `width` from its data (≈80–100px per bar/category, 240–320px for a sparkline) and pick the smallest grid span that holds the table (often `w8`), not `w12` by default.
- **Other options**: `striped`, `dividers`, `labelHeader`, `threshold`, `blank`; type sizes `insightSize`, `descriptionSize`, `descriptionLines` (3), `statSize`. Otherwise behaves like a table (width allocation, horizontal scroll, same refusals).
