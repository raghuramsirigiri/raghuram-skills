# Heatmap & calendar (`Charts.heatmap`, `Charts.calendarHeatmap`)

Part of the charts-lib API — the shared options, sizing and interactions are in
[`../chart-api.md`](../chart-api.md). Every option below is optional; the library picks sensible defaults.

One engine, two factories. `heatmap` colours the cells of a grid whose two
directions are **ordered**; `calendarHeatmap` lays one cell per day out as weeks
(columns) by weekdays (rows). When to use either instead of a `table` or a
`line` is in `chart-selection.md` § Choosing among the specialist charts.

```js
Charts.heatmap('c', {
  title: 'Orders peak weekday afternoons',
  xAxis: { categories: ['0', '1', /* … */ '23'] },                  // columns, left to right
  yAxis: { categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },  // rows, top to bottom
  series: [{ name: 'Orders', data: [[0, 0, 12], [1, 0, 7] /* [x, y, value] */] }]
});

Charts.calendarHeatmap('c', {
  title: 'Deploys stop at weekends',
  series: [{ name: 'Deploys', data: [['2026-01-05', 3], ['2026-01-06', 0] /* [date, value] */] }],
  plotOptions: { heatmap: { weekStart: 1 } }                        // 1 Monday (default), 0 Sunday
});
```

- **Data**: `heatmap` takes `[x, y, value]` or `{ x, y, value }`, x and y a
  category name or its index; **both** `xAxis.categories` and
  `yAxis.categories` are required, in reading order. `calendarHeatmap` takes
  `[date, value]` or `{ date, value }`: a `"YYYY-MM-DD"` string, a timestamp
  (read in UTC) or a `Date` (read in local time). Prefer the string.
- **A blank is not zero.** An absent cell or a `null` value is drawn as an
  empty outline and left out of the colour scale. Calendar days outside the
  data's range (a band runs on to whole months) get a faint fill and no
  outline: not missing, just not in the data. Never fill a gap with `0`.
- **Colour** is the same scale as `table`'s `highlight: 'scale'`: the series
  ramp light → dark, or diverging through `aboveThreshold` / `belowThreshold`
  when values cross zero. `colorAxis: { min, max }` pins the domain so two
  heatmaps share a scale; `plotOptions.heatmap.color` uses one hue instead;
  `upColor` / `downColor` replace the diverging pair.
- **Colour key** under the heading shows the series name, the gradient and the
  domain's ends; hovering a cell marks its value on the key. Hide it with
  `legend: { enabled: false }`.
- **Labels**: matrix row labels are never thinned; column labels follow the
  category-axis rules (thin by stride, wrap, stagger, rotate). In-cell values
  are drawn only when **every** value fits; `dataLabels: false` turns them off.
  Also `valuePrefix` / `valueSuffix` / `decimals`. No callouts.
- **Calendar layout**: up to a year is one band of whole months; longer spans
  get one band per calendar year. Days stay square (`cellSize`, max 30px) and
  the calendar sits top-left of its cell.
- **Refuses** a second series, two values for one cell or day, a non-numeric
  value, a cell naming a row or column not in the categories, calendar values
  weekly or coarser (use `line`), and calendars over four years. `validate()`
  **warns** when the grid has 24 cells or fewer, or neither axis looks
  ordered; both mean `table`.
- **Sizing**: with a height, a matrix's rows stretch to fill it; with none,
  both grow to fit. **Returns** the standard handle; `getData()` gives
  `{ row, column, value }` per filled cell (calendar: `{ date, value }`).
