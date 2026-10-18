# Scatter / bubble / packed (`Charts.scatter`, `Charts.bubble`, `Charts.packedBubble`)

Part of the charts-lib API — the shared options, sizing and interactions are in
[`../chart-api.md`](../chart-api.md). Every option below is optional; the library picks sensible defaults.

- **Series type per series**: `type: 'scatter' | 'bubble' | 'packedbubble'`
- **Marker symbol**: `marker: { symbol: 'circle'|'square'|'diamond'|'triangle'|'triangle-down', radius }`
- **Trend line**: `series[i].regression: true` — dashed blue linear least-squares
- **Point labels**: on by default, but drawn only for points that carry a `name`; `series[i].showLabels: false` turns them off
- **Bubble size scale (area)**: `plotOptions.bubble: { minSize, maxSize }` — area in "points²", radius derived
- **Bubble color gradient**: automatically applied when there's only one bubble series (larger bubbles → bluer)
- **Packed clusters**: with N series → N separate clusters; with 1 series → single cluster and color-by-size gradient
- **Both axes are numeric measures.** `xAxis.categories` is *ignored* by these
  engines: a `[name, value]` pair plots at `x = index`, so a categorical scatter
  silently draws its points against a meaningless 0,1,2… axis. If one dimension
  is a category, the chart is a bar/column, not a scatter.
- **`bubble` needs three numbers per point** — `[x, y, z]` or `{x, y, z}`; a
  point with no `z` has no size to encode. `packedBubble` is the one that takes
  `[name, value]`, because it drops the axes entirely.
- **Axis limits & suffix**: `xAxis: { min, max, suffix, title }`, `yAxis: { … }`
