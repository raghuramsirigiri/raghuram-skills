# Column & bar (`Charts.column`, `Charts.bar`)

Part of the charts-lib API — the shared options, sizing and interactions are in
[`../chart-api.md`](../chart-api.md). Every option below is optional; the library picks sensible defaults.

- **Series type**: `type: 'column' | 'bar' | 'columnrange' | 'columnpyramid'`
- **Stacking**: `plotOptions.column.stacking: 'normal' | 'percent'`
- **Padding**: `pointPadding`, `groupPadding`
- **3D effect**: `chart: { options3d: { enabled: true, depth: 40 } }`
- **Negative values**: bars flip below zero baseline; `negativeColor` overrides bar color for negatives
- **Population pyramid**: horizontal bar + a series with all-negative values + `tooltip.absoluteX:true`
- **Data labels**: **on by default** — above the bar (column) or at the right
  end (bar), with automatic contrast text color. In a **stacked** chart they
  move inside each segment, since above a segment is where the next one sits,
  and segments too small to hold the number go unlabelled — except where a
  category has a single segment on that side of zero (the population-pyramid
  shape), where the label takes the bar's outer end. `format: '{y}%'` templates
  the label. Turn off with `dataLabels: false` at `plotOptions.column` /
  `.bar` / `.series`, or per series via `series[i].dataLabels`.
- **Per-point color**: any data point may be written as an object with its own
  `color`, which wins over the series color and over `negativeColor`:
  ```js
  series: [{ name: 'Revenue', data: [
    { y: 4200, color: T.colors[1] },   // emphasised
    { y: 3900, color: T.colors[1] },   // emphasised
    { y: 610,  color: T.muted },       // context
    { y: 480,  color: T.muted }
  ]}]
  ```
  Points may still be plain numbers in the same array; mix freely. This is the
  mechanism behind every "highlight the bars the finding is about" chart — see
  `chart-selection.md` § Emphasis.
- **Re-rendering with new data**: `destroy()` the previous handle, then call
  the factory again on the same container. Calling the factory alone clears the
  container but leaves the old chart's `ResizeObserver` running. Every resize
  then repaints the stale config (a visible flash) before the current one, and
  these redraws pile up with each update. Build a
  `render(state)` function that draws through a `draw(factory, id, config)`
  helper doing both (see `controls.md`). Don't mutate the returned object's
  internals; `redraw()` only re-paints the *existing* config.
- **Legend**: auto-shown at the top below the subtitle whenever there are 2+ series, wraps to multiple rows. Force off with `legend: { enabled: false }`.
- **Scenario notation**: `series[i].scenario` or `point.scenario` —
  `'actual'` (solid, default), `'plan'`/`'budget'` (outlined), or
  `'forecast'`/`'estimate'` (hatched). Encodes whether a number was measured,
  agreed, or projected in the *fill style*, leaving color free for emphasis.
  Legend swatches render in the series' own notation. Value labels move outside
  the bar automatically on outlined bars, which have no fill to sit on. See
  `chart-selection.md` § Scenario notation.
- **Subdued legend entry**: `series[i].legendColor` overrides that entry's label
  color (the swatch always follows the series color). Set it to
  `Charts.theme.secondaryColor` on de-emphasised series so a legend on an
  emphasis chart doesn't present every series as equally important. Supported on
  line, column/bar, and scatter/bubble.
- **Category labels are never dropped.** A partly-labelled axis ("Chrome, ?, ?,
  Safari") is worse than none, so crowding is solved by presentation, in order:
  full width → a size smaller → wrapped onto two lines → two staggered rows →
  45° slant → 90° vertical, with an ellipsis only after wrapping has been tried.
  Categories that parse as dates are the exception — they collapse to a coarser
  calendar period instead. Horizontal bars skip all of this: each category owns
  a row, so the label already has the room.
- **Target & threshold marks**: `yAxis.plotLines` / `yAxis.plotBands` draw a
  labelled target, budget, or break-even. They are drawn **above** the bars — a
  target hidden behind a bar is useless — and follow the chart's orientation, so
  the same config works for `Charts.column` and `Charts.bar`. Values outside the
  axis range are clamped to it. See `annotation.md` § Threshold shift.
- **Column range**: `type:'columnrange'` with `data: [[low, high], …]`
