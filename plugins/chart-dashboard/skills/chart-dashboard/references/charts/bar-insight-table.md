# Bar insight table (`Charts.barInsightTable`)

Part of the charts-lib API — the shared options, sizing and interactions are in
[`../chart-api.md`](../chart-api.md). Every option below is optional; the library picks sensible defaults.

One row per category, read left to right as a sentence:

```
Gross Revenue │ ▇▇▇▇▇▇   FY22   │ Topline Growth               │ +30%
              │ ▇▇▇▇▇▇▇▇ FY23   │ Year-over-year expansion     │
 [row label]    [single or grouped bars]  [insight headline     [big stat]
                                           + description]
```

Reach for it when a bar alone under-sells the story and every row has to carry
three things at once: the comparison, what it means, and the one number the
reader should walk away with.

```js
Charts.barInsightTable('container', {
  title: 'Fiscal Year Income Statement',
  subtitle: 'FY23 vs FY22 · $ millions',
  xAxis: { categories: ['Gross Revenue', 'Cost of Goods Sold', 'Gross Profit'] },
  rows: [                                   // parallel to xAxis.categories
    { insight: 'Topline Growth', description: 'Year-over-year revenue expansion' },
    { insight: 'COGS',           description: 'Direct production costs' },
    { insight: 'Margin',         description: 'Gross profit generated' }
  ],
  plotOptions: { barInsightTable: { valueSuffix: 'M', statColorBySign: true } },
  series: [
    { name: 'FY 2022', data: [1000, 400, 600] },
    { name: 'FY 2023', data: [1300, 500, 800] }
  ]
});
```

- **Row extras**: `rows: [{ label, insight, description, stat, statNote, statColor }, …]`
  runs parallel to `xAxis.categories`. The same keys can hang off a data point
  instead (`data: [{ name, y, insight, description, stat, statNote }]`), which is
  the shape for a single-series table.
- **The stat writes itself.** With 2+ series and no `stat`, each row shows the
  percent change from the first series to the last — the question a two-column
  comparison is already asking. Disable with `autoStat: false`; tint negatives
  with `statColorBySign: true`.
- **Columns collapse when empty**: no insight text → no insight column; no stats
  → no stat column, with the bars absorbing the freed width. Override with
  `columns: { label, bars, insight, stat }` as a fraction (`0.25`) or px (`180`).
- **One shared scale** across all rows, so rows stay comparable.
- **Bar metrics**: `barHeight` (20), `barGap` (4), `rowPadding` (18), `columnGap` (22).
- **Long text wraps**: row labels up to `labelLines` (2), insight headlines 2,
  descriptions `descriptionLines` (2); only the last line is ellipsized, and the
  row grows to its tallest column so nothing overlaps.
- **Type follows the theme**: insight headline is `labelSize + 1.5`, description
  `tickSize`, stat `round(titleSize × 1.5)`. Per-chart overrides: `insightSize`,
  `descriptionSize`, `statSize`.
- **Colors** as in `column`/`bar`: one series takes `defaultColor`, two or more
  walk `theme.colors`; `statColor` tints an individual stat.
- **Value labels**: bar-end values are on by default like everywhere else
  (`dataLabels: false` removes them); the row's *stat* is the readout that
  carries the finding. `valueSuffix` and `format: '{y}%'` work as elsewhere.
- **Dividers** are hairlines between rows only; `dividers: false` removes them.
- **Height**: the container's height is filled when it has one, and the table
  grows to fit its rows when it does not; `autoHeight: true` forces growing.
  See [Sizing](../chart-api.md#sizing-all-charts).
