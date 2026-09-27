# Dumbbell (`Charts.dumbbell`)

Part of the charts-lib API — the shared options, sizing and interactions are in
[`../chart-api.md`](../chart-api.md). Every option below is optional; the library picks sensible defaults.

One row per category, two dots joined by a rod. Reach for it when the story is
the **gap between two states** — before/after, 2019/2024, plan/actual, ours
against theirs. A grouped bar pair carries the same two numbers but asks the
reader to compute the difference by comparing two lengths against a shared
baseline; the dumbbell draws that difference directly, as the thing between the
marks, and on a fraction of the ink — twenty categories still fit on a slide.

```js
Charts.dumbbell('container', {
  title: 'Cycling share of commuter trips',
  xAxis: { categories: ['Copenhagen', 'Amsterdam', 'Helsinki'] },
  plotOptions: { dumbbell: { sort: 'desc', valueSuffix: '%' } },
  series: [
    { name: '2019', data: [29, 34, 22] },
    { name: '2024', data: [46, 41, 39] }
  ]
});
```

- **Exactly two series** — the chart type *is* the pair. One or three-plus draws
  a refusal panel naming the chart that does fit (`barList`/`bar` for one value
  per category, grouped `bar` for three states). Rows pair **by position**, so
  both series must list the same categories in the same order.
- **Sorting**: `sort: 'desc' | 'asc'` ranks by the **second** series — the
  "after" state. `sort: 'delta'` / `'delta-asc'` ranks by the size of the
  change. Off by default, so source order is kept.
- **The change writes itself**: a right-aligned column carries the delta per
  row. `showDelta: false` drops it; `deltaFormat: 'percent'` states it as a
  percentage of the first value; `deltaFormat: fn(delta, row)` takes over.
  `deltaColorBySign` (on) tints it with the above/below-threshold roles.
- **Value labels** sit *outside* the pair — lower value left of the left dot,
  higher right of the right dot — so neither lands on the rod however close the
  two states are. Each takes its own dot's color (`valueColor: 'series'`).
- **Rod**: `connectorWidth` (4), `connectorColor` (the theme's `muted` neutral —
  the rod is the space between two marks, not a third category),
  `connectorBySign`, `connectorArrow`.
- **Dots & rows**: `dotSize` (12), `rowGap` (18). Height behaves like the other
  row-based engines — see [Sizing](../chart-api.md#sizing-all-charts).
- **Value axis**: `yAxis: { min, max, suffix }`, `tickCount` (5),
  `gridlines: false`, `valuePrefix` / `valueSuffix` / `format: '{y}%'`.
- **Legend** is on whenever the chart draws — with two states it is the only
  thing saying which dot is which — and does **not** toggle, since hiding one
  series leaves a rod with one end.
