# Waffle (`Charts.waffle`)

Part of the charts-lib API — the shared options, sizing and interactions are in
[`../chart-api.md`](../chart-api.md). Every option below is optional; the library picks sensible defaults.

One panel per statistic — headline stat, dot grid, label, description — split
evenly across the content width. Reach for it when the reader has to *feel* a
proportion rather than compare magnitudes: survey shares, adoption rates, "x in
100" facts. A bar compares lengths; a waffle counts units.

```js
Charts.waffle('chart', {
  title: 'Key Strategic Priorities',
  subtitle: 'Percentage of surveyed organizations reporting on key focus areas',
  series: [{ name: 'Share of organizations', data: [
    { name: 'Growth Focus',        y: 29, description: 'Organizations focusing 30% or more of their time on long-term growth' },
    { name: 'Resource Allocation', y: 30, description: 'Companies that increase resourcing during market volatility' },
    { name: 'Customer Centricity', y: 15, description: 'Firms that incorporate direct customer input into decisions' }
  ] }]
});
```

- **Data**: same shapes as `barList` — `[{name, y, description, color}]`, `[name, y]` pairs, or bare numbers with `xAxis.categories` (descriptions via a parallel `rows: [{description}]`).
- **Grid**: `rows` / `cols` (default `10 × 10`); `total` (default `100`) is what the value is a share *of*, so `total: 500` with `y: 430` fills 86 dots. Values round to whole dots.
- **Fill**: bottom-up by default so the block reads as a level; `fillDirection: 'top'` fills downward.
- **Dots**: `dotSize` caps the diameter, `dotGap` is the gap as a share of it, `emptyColor` / `emptyOpacity` style the remainder.
- **Text**: `statSize`, `nameSize`, `descriptionSize`, `descriptionLines`; the headline uses `format: '{y}'` / `valueSuffix` (default `'%'`). Panels size to the tallest description so baselines line up.
- **Color**: walks the series palette per panel; `series.color` or a point `color` overrides, `colorByPoint: false` gives every panel one color.
- **Negative values are clamped to zero** — a part-of-whole grid can't show them honestly, same rule as the donut.
- **Other**: `dividers: false` drops the vertical rules, `panelPadding` sets the gutter inside each panel.
