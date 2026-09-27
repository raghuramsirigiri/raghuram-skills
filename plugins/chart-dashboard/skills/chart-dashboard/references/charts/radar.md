# Radar (`Charts.radar`)

Part of the charts-lib API — the shared options, sizing and interactions are in
[`../chart-api.md`](../chart-api.md). Every option below is optional; the library picks sensible defaults.

One closed polygon per series over the same named axes. The reading is the
**shape** — how far out a profile reaches and where it caves in — which only
works if every axis shares one scale measured from a common centre.

```js
Charts.radar('container', {
  title: 'Platform scorecard, two quarters apart',
  xAxis: { categories: ['Reliability','Latency','Documentation','Onboarding','Cost control','Test coverage'] },
  yAxis: { max: 10 },
  series: [
    { name: 'Q1', data: [6, 4, 3, 5, 7, 4] },
    { name: 'Q3', data: [8, 7, 6, 6, 7, 8] }
  ]
});
```

- **Data**: `series[].data` is a flat list of numbers, one per
  `xAxis.categories` entry, **in that order** — the axes belong to the chart,
  not to one series.
- **Three axes minimum.** With two the polygon collapses to a line through the
  centre, so the shape carries nothing; fewer than three draws the refusal panel
  naming `column` or `dumbbell`.
- **The centre is zero and the scale is shared.** `yAxis.min` defaults to `0`,
  and is *not* inferred from the data the way a cartesian y-axis is: on a radial
  scale a cropped baseline multiplies a difference's **area**. Axes in different
  units want normalising to a common index before they get here, or they want
  separate charts.
- **Scale**: `yAxis.min`, `max`, `suffix`, `decimals`; `tickCount` (4) sets the
  rings. **Grid shape**: `shape: 'polygon'` (default) or `'circle'` — a circular
  ring behind an angular series reads as a second, contradicting geometry.
- **Fill**: `fillOpacity` (0.16), overridable per series; `0` gives outlines
  only, which is the right choice for a benchmark line and for any chart with
  more than about three profiles.
- **Also**: `startAngle`, `markers: false`, `axisLabels: false`;
  `series[].dashStyle` and `series[].color` behave as everywhere else.
- **A missing value opens the ring** rather than being bridged — a polygon
  closed over a missing axis claims a value nobody measured.
- **Hover targets the axis, not the dot**: pointing anywhere in a spoke's sector
  shows every visible series on that axis, because "who is furthest out on
  *this* axis" is the question the chart exists to answer.
- **Callouts**: `callouts: [{ category, series, text }]` — `category` names the
  axis, `series` the profile. Boxes are pushed out from the centre so the leader
  reads as one more spoke.
- **Past three or four profiles, stop.** Overlapping translucent polygons stop
  being separable; use `Charts.panels` with one small radar each instead.
