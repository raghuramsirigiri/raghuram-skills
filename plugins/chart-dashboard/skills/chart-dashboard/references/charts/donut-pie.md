# Donut & pie (`Charts.donut`, `Charts.pie`)

Part of the charts-lib API — the shared options, sizing and interactions are in
[`../chart-api.md`](../chart-api.md). Every option below is optional; the library picks sensible defaults.

> **Nesting:** every donut option below except `startColor`/`endColor` is read
> from `plotOptions.pie`, even where the shorthand lines below omit it. Write
> `plotOptions: { pie: { centerText: {…}, valueSuffix: '%', variableRadius: true,
> startAngle: -90, endAngle: 90, showPercentages: true } }` — at the top level
> they are silently ignored.

- **Hole**: `plotOptions.pie.innerSize` — fraction of outer radius (`'50%'`, `'80%'`) or px. `0` = full pie.
- **Semi-circle**: `startAngle: -90, endAngle: 90` (top half; use other angles for other slices)
- **Variable radius**: `variableRadius: true` + data with `z` values + `minPointSize`
- **Gradient palette**: `startColor`, `endColor` (defaults black → blue)
- **Sliced / exploded**: `{ sliced: true }` on any data point; click any wedge to toggle
- **Center text**: `centerText: { value, label, valueFontSize, color }` — `color`
  tints the center value; set it to the focal wedge's color so the number and
  the wedge read as one statement (see `chart-selection.md` § Pie and donut).
  A bare string or number is shorthand for `value`
  (`centerText: 'Final mile'`). Omitting `value` (or `centerText: true`) prints
  the ring's own total.
- **Legend**: auto-shown at the top below the subtitle whenever there are 2+ wedges, wraps to multiple rows for many categories. Force off with `legend: { enabled: false }` to fall back to connector labels around the donut.
- **Value suffix**: `valueSuffix: '%'`
- **Show percentages instead of raw values**: `showPercentages: true`
- **Negative values are dropped.** A donut shows parts of a whole, so a negative part can't be drawn. Points with a negative or non-finite `y` are excluded from the ring, the total, and the legend, warned once on the console, and named in a footnote at the bottom-left (*"Not shown: North (-10M) — negative values can't be part of a whole"*), which falls back to a count when the list is too long. Suppress with `plotOptions.pie.droppedNote: false`. If nothing positive is left, the chart draws *"No positive values to chart"*. Use a bar chart for data that goes below zero.
- **Every wedge always gets a callout.** What adapts is the detail it carries. The engine takes the first layout that fits: two-line (name over value) → one-line → drop the legend and retry → name-only (or value-only when a legend is showing) → shrink the type down to a 0.72× floor. Turn callouts off with `plotOptions.pie.dataLabels: { enabled: false }`.
