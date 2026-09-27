# Bar list (`Charts.barList`)

Part of the charts-lib API — the shared options, sizing and interactions are in
[`../chart-api.md`](../chart-api.md). Every option below is optional; the library picks sensible defaults.

Horizontal bars stripped to the two things that carry meaning — the category and
the length of its bar. **No axis, no gridlines, no ticks, no spine.** The
category label sits directly *above* its own bar at full width, and the value
sits at the bar's end.

Reach for it over `Charts.bar` when the category names are long (here they cost
nothing, instead of squeezing every row into a left gutter sized for the worst
one), or when the chart is a ranked list rather than a measurement against a
scale.

```js
Charts.barList('container', {
  title: 'Most-used editors',
  plotOptions: { barList: { sort: 'desc', colorByPoint: true, valueSuffix: '%' } },
  series: [{ name: 'Share', data: [{ name: 'Visual Studio Code', y: 73.6 }] }]
});
```

- **Sorting**: `sort: 'desc' | 'asc'` — off by default, so source order is kept
- **Bar metrics**: `barHeight` (26), `rowGap` (22) — the label→bar gap is deliberately tighter than the row→row gap, which is what lets the pairs read without a separating rule
- **Height**: a height on the container is an instruction to **fill it**; the chart grows to fit its own rows only when the container has no height. `autoHeight: true` asks for the growing behaviour back. See [Sizing](../chart-api.md#sizing-all-charts).
- **Color**: one theme color for all bars by default; `colorByPoint: true` walks the series palette; `color` on any point overrides
- **Value labels**: always outside the bar end. `valueSuffix`, `format: '{y}%'`, `valueColor: 'series'` to tint each value to its bar.
- **Negative values**: fully supported — bars run left from a shared zero baseline in the theme's negative color, with gutter space reserved on both ends so a negative label can't clip
- **Long names**: truncated with an ellipsis rather than wrapped, keeping rows equal height
- Hover highlight + shared tooltip, same as the other engines
