# charts-lib

**Contents**

- [API](#api)
- [The manifest (`charts.manifest.json` / `Charts.meta`)](#the-manifest-chartsmanifestjson--chartsmeta)
- [Variations catalog](#variations-catalog)
  - [Line (`Charts.line`)](#line-chartsline)
  - [Column & bar (`Charts.column`, `Charts.bar`)](#column--bar-chartscolumn-chartsbar)
  - [Bar list (`Charts.barList`)](#bar-list-chartsbarlist)
  - [Dumbbell (`Charts.dumbbell`)](#dumbbell-chartsdumbbell)
  - [Bar insight table (`Charts.barInsightTable`)](#bar-insight-table-chartsbarinsighttable)
  - [Histogram (`Charts.histogram`, `Charts.histogramPercent`, `Charts.histogramCumulative`)](#histogram-chartshistogram-chartshistogrampercent-chartshistogramcumulative)
  - [Waffle (`Charts.waffle`)](#waffle-chartswaffle)
  - [Report table (`Charts.reportTable`)](#report-table-chartsreporttable)
  - [Panels (`Charts.panels`)](#panels-chartspanels)
  - [Radar (`Charts.radar`)](#radar-chartsradar)
  - [Donut & pie (`Charts.donut`, `Charts.pie`)](#donut--pie-chartsdonut-chartspie)
  - [Scatter / bubble / packed (`Charts.scatter`, `Charts.bubble`, `Charts.packedBubble`)](#scatter--bubble--packed-chartsscatter-chartsbubble-chartspackedbubble)
  - [Geofacet (`Charts.geofacet`)](#geofacet-chartsgeofacet)
  - [Waterfall (`Charts.waterfall`)](#waterfall-chartswaterfall)
  - [Sankey (`Charts.sankey`)](#sankey-chartssankey)
  - [Heatmap & calendar (`Charts.heatmap`, `Charts.calendarHeatmap`)](#heatmap--calendar-chartsheatmap-chartscalendarheatmap)
- [Chart lifecycle: handle, resizing, animation, transparency](#chart-lifecycle-handle-resizing-animation-transparency)
- [Sizing (all charts)](#sizing-all-charts)
- [Titles and subtitles wrap](#titles-and-subtitles-wrap)
- [Interactions (all charts)](#interactions-all-charts)
- [Live examples](#live-examples)


A tiny, self-contained SVG chart library styled to the clean-charts theme
(cream background, Inter typography, black + blue gradient palette,
top-left title, thin dark spines).

Zero dependencies. Drop `charts.js` into your page and call one of the
factory functions. Every chart is inline SVG with native tooltip, hover, and
legend interactions — no canvas, no external framework.

```html
<link rel="stylesheet" href="charts.css">
<div id="chart" style="width:800px;height:500px"></div>
<script src="charts.js"></script>
<script>
  Charts.line('chart', {
    title: 'Monthly Average Temperature',
    subtitle: 'Source: WorldClimate.com',
    // Line x-labels must parse as dates — 'Jan' alone does not, 'Jan 2025' does.
    xAxis: { categories: ['Jan 2025','Feb 2025','Mar 2025','Apr 2025','May 2025','Jun 2025'] },
    yAxis: { suffix: '°C' },
    series: [
      { name: 'Tokyo',   data: [7, 6.9, 9.5, 14.5, 18.4, 21.5] },
      { name: 'London',  data: [3.9, 4.2, 5.7, 8.5, 11.9, 15.2] }
    ]
  });
</script>
```

## API

| Function              | Purpose                                                                     |
| :-------------------- | :-------------------------------------------------------------------------- |
| `Charts.line`         | Line / spline / step chart. **Ordered x only** — linear, datetime, or parseable date labels; never named categories. |
| `Charts.column`       | Vertical columns: grouped, stacked, percent-stacked, range, pyramid, 3D.    |
| `Charts.bar`          | Horizontal bars — same options as `column`, including population pyramid.   |
| `Charts.barList`      | Axis-free horizontal bars; category label sits above each bar.              |
| `Charts.dumbbell`     | Two dots joined by a rod, one row per category — the **gap** between two states. Exactly two series. |
| `Charts.barInsightTable` | One row per category: label · bars · insight headline + description · a large stat. |
| `Charts.histogram`    | Takes **raw numbers** and bins them itself; y-axis is counts.               |
| `Charts.histogramPercent` | Same bins, y-axis as a share of the total.                             |
| `Charts.histogramCumulative` | Same bins, y-axis running 0 → 100%.                                 |
| `Charts.waffle`       | Part-of-whole dot grids; one panel per statistic, headline stat + caption.  |
| `Charts.reportTable`  | Table whose columns are `text`, `insight`, `kpi` or `chart` cells (a real chart per row). |
| `Charts.panels`       | Compositor: up to 4 charts of any type side by side under one shared title. |
| `Charts.radar`        | One closed polygon per series over the same named axes; the reading is the shape. Three axes minimum. |
| `Charts.donut`        | Donut (default 60% hole) — variable radius, semi-circle, gradient, sliced. |
| `Charts.pie`          | Full pie (donut with `innerSize:0`).                                        |
| `Charts.scatter`      | 2D scatter + optional linear regression + point labels.                     |
| `Charts.bubble`       | Scatter with third dimension mapped to bubble radius (and color gradient).  |
| `Charts.packedBubble` | Bubbles clustered via physics relaxation; per-series clusters when >1.      |
| `Charts.geofacet`     | Small multiples on a geographic grid — bar, heat, or gauge tiles.           |
| `Charts.waterfall`    | Bridge: opening value, signed steps each starting where the last ended, computed totals. |
| `Charts.sankey`       | Flows between nodes in left-to-right columns; band thickness is the amount moved. |
| `Charts.heatmap`      | A value per cell of a grid whose two directions are **ordered** (hour × weekday), drawn as colour. |
| `Charts.calendarHeatmap` | One cell per day, weeks as columns and weekdays as rows — the weekly rhythm of a daily measure. |

Also on the namespace: `Charts.meta` (the manifest — data shape, refusals, sizing, `gridSpan` per chart), `Charts.validate(type, config)` — see [The manifest](#the-manifest-chartsmanifestjson--chartsmeta) — and `Charts.version`, the version of the vendored build.

All functions take `(container, config)` where `container` is a DOM element
or its id, and `config` is a Highcharts-compatible options object.

**Data labels are on by default in every chart type.** The value a mark encodes
is what the reader came for, so making them read it off an axis is a needless
indirection. Turn them off per chart with `dataLabels: false` (or
`{ enabled: false }`) in that engine's `plotOptions` block — or per series,
where the engine has series. Scatter/bubble point labels use `showLabels: false`,
and they only ever draw for points that carry a `name`.

## The manifest (`charts.manifest.json` / `Charts.meta`)

`assets/charts-lib/charts.manifest.json` is the machine-readable index of every
factory — the same object the library carries at runtime as `Charts.meta`, since
the build inlines it and refuses to build if a factory and its entry disagree.
Read it when you want one fact fast (does this engine self-size? how many tracks
should it span? what does it refuse?) rather than the prose section below.

Per factory:

| Field | Says |
| :-- | :-- |
| `purpose` | The one-line reason to pick it |
| `data` | The shape the factory expects |
| `requires` / `refuses` | Hard preconditions, and what it will not draw — with the alternative it names in the refusal panel |
| `selfSizing` | `true` = grows to its content **when the container has no height** |
| `aspect` | `free`, `radial` or `grid` — `radial` and `grid` keep their shape and centre in whatever box they are given, so they are safe in any cell |
| `minWidth` / `minHeight` | Below these, labels crowd and the chart stops being readable |
| `gridSpan` / `gridSpanWhen` | Tracks to occupy, and when to widen to two |
| `keyOptions` | The options worth knowing before reading the full section |
| `notes` | The one thing callers most often get wrong |

Two shared blocks sit beside the per-chart entries: `plotBox` (the 62/20 plot
box and where the plot starts, which is why mixed charts align in a grid) and
`grid` (`minCellWidth: 480`, `recommendedGap: 16`, and the span/height rules —
never `grid-column: 1 / -1`, and keep the height rule consistent across a grid
or rows will not line up).

At runtime the same data is one property away, so a page can check itself:

```js
Charts.meta.charts.dumbbell.refuses     // → why a 3-series dumbbell won't draw
Charts.meta.charts.barList.selfSizing   // → true
Charts.meta.grid.minCellWidth           // → 480
```

## Variations catalog

Every option below is optional; the library picks sensible defaults.

### Line (`Charts.line`)

- **Series type per series**: `type: 'line' | 'spline' | 'step'`. **The
  default is `'spline'`**, not `'line'` — opt out per series with
  `type:'line'`, or for the whole chart with `chart: { smooth: false }`.
  This matters for more than looks: the smoothing routine **drops `null`
  points instead of breaking the path**, so a series with an interior gap
  is drawn as one unbroken curve straight through the missing data. Any
  series containing a real hole must set `type:'line'`.
- **Colour, `lineWidth` and `dashStyle` are per-series**, and there is no
  `zones` option — a line that changes appearance partway along is two
  series sharing an x-axis. See `annotation.md` § Intervention and forecast.
- **Step alignment**: `step: 'left' | 'center' | 'right'` (for step series)
- **Dash style**: `dashStyle: 'Solid'|'ShortDash'|'ShortDot'|'Dot'|'Dash'|'LongDash'|'DashDot'`
- **Markers**: `marker: { enabled, symbol: 'circle'|'square'|'diamond'|'triangle'|'triangle-down', radius }`
- **Data labels**: on by default; `dataLabels: false` (or `{ enabled: false }`),
  globally via `plotOptions.series` or per series, turns them off, `{ format }`
  reformats them. Placement is collision-aware — a label that would overlap one
  already drawn is dropped rather than stacked on top of it, so a dense line
  ends up partly labelled and is usually better off with them off.
- **X must be continuous or temporal.** The engine *refuses to draw* a line
  over named categories and renders an error panel instead — see `chart-selection.md`
  § Input contract. Valid axes:
  - Linear (default): numeric `x`, or `data: [[x, y], …]`
  - Datetime: `xAxis: { type: 'datetime', tickInterval: 'auto'|'year'|'quarter'|'month'|'week'|'day'|'hour'|'minute'|'second' }` with epoch-ms `x` values. `'auto'` (the default) walks the ladder of periods and stops at the first whose labels fit the axis width.
  - Ordered categories: `xAxis: { categories: [...] }` where the list passes
    **either** test. (1) Every label parses as a date — a 4-digit year or a
    `d/d` pair *and* `Date.parse` succeeds: `'2019'`, `'Jan 2025'`,
    `'2024-01-01'`, `'3/14'`. (2) The labels are a strictly rising sequence —
    month names (`'Jan'…'Dec'`), weekday names (`'Mon'…'Sun'`), or one stem
    numbered upwards (`'Q1'…'Q4'`, `'Week 1'…'Week 12'`, `'Band 1'…'Band 5'`).
    A shuffled or partial run fails both, as does an unordered set of names.
    Date-parsing categories collapse to a coarser calendar period (day → week →
    month → quarter → year) as the axis gets crowded.
  - Logarithmic Y: `yAxis: { type: 'logarithmic' }` — **strictly positive
    values only.** A zero or negative point is clamped to the axis floor and
    plots as a flat line along the bottom; the axis silently starts at 1 when
    the data minimum is ≤ 0.
- **Reference regions & lines**:
  - `xAxis.plotBands` / `yAxis.plotBands`: `[{ from, to, color, alpha, label:{text}, paragraph, paragraphY }]`
    — `label.text` draws centred above the plot area (keep it short);
    `paragraph` draws a boxed note inside it, `paragraphY` (0–1, default
    0.85) sets its height
  - `xAxis.plotLines` / `yAxis.plotLines`: `[{ value, color, width, dashStyle, label:{text}, paragraph, paragraphY }]`
- **Callouts (annotations)**: `callouts: [{ x, series, text, color, dx, dy }]`
  — `series` matches by series **name** and falls back to the *first*
  series when omitted or unmatched; `x` snaps to the nearest point, so on a
  category axis it is the category index
- **Negative color**: `series[i].negativeColor` + `threshold`
- **Zoom**: `chart: { zoomType: 'x' }` — drag to zoom, "Reset zoom" button appears
- **Legend**: auto-shown at the top below the subtitle whenever there are 2+ series, wraps to multiple rows. Opt in to inline line-end labels instead with `lineLabels: 'inline' | 'name' | 'value' | 'both'`.
- **Value suffix / prefix / decimals**: `tooltip: { valueSuffix, valuePrefix, valueDecimals }`
- **Live update**: returned `{ addPoint(seriesIdx, x, y), shift(seriesIdx), redraw() }`

### Column & bar (`Charts.column`, `Charts.bar`)

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

### Bar list (`Charts.barList`)

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
- **Height**: a height on the container is an instruction to **fill it**; the chart grows to fit its own rows only when the container has no height. `autoHeight: true` asks for the growing behaviour back. See [Sizing](#sizing-all-charts).
- **Color**: one theme color for all bars by default; `colorByPoint: true` walks the series palette; `color` on any point overrides
- **Value labels**: always outside the bar end. `valueSuffix`, `format: '{y}%'`, `valueColor: 'series'` to tint each value to its bar.
- **Negative values**: fully supported — bars run left from a shared zero baseline in the theme's negative color, with gutter space reserved on both ends so a negative label can't clip
- **Long names**: truncated with an ellipsis rather than wrapped, keeping rows equal height
- Hover highlight + shared tooltip, same as the other engines

### Dumbbell (`Charts.dumbbell`)

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
  row-based engines — see [Sizing](#sizing-all-charts).
- **Value axis**: `yAxis: { min, max, suffix }`, `tickCount` (5),
  `gridlines: false`, `valuePrefix` / `valueSuffix` / `format: '{y}%'`.
- **Legend** is on whenever the chart draws — with two states it is the only
  thing saying which dot is which — and does **not** toggle, since hiding one
  series leaves a rod with one end.

### Bar insight table (`Charts.barInsightTable`)

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
  See [Sizing](#sizing-all-charts).

### Histogram (`Charts.histogram`, `Charts.histogramPercent`, `Charts.histogramCumulative`)

The one engine that takes **raw numbers** and does the aggregation itself. Every
other type wants values you have already aggregated; asking an author to bin
their own data before they can look at its shape is asking them to do the
analysis in order to find out whether it is worth doing.

```js
Charts.histogram('container', {
  title: 'API response time',
  subtitle: '900 requests sampled over one hour',
  data: latencies,                       // just the measurements
  xAxis: { title: 'Response time (ms)' },
  plotOptions: { histogram: { mean: true, median: true } }
});
```

Three factories, one per reading of the same bins — the mode is the chart, not a
flag to remember:

| Function | y-axis | The question it answers |
| :-- | :-- | :-- |
| `Charts.histogram` | counts | How many fell in each bin? |
| `Charts.histogramPercent` | % of total | What share fell in each bin? |
| `Charts.histogramCumulative` | 0 → 100% | What share fell at or below this value? |

- **Data**: `data: [ … numbers ]` at the top level, or the first series' `data`.
  Points may also be `[x, y]` pairs or `{y}` / `{value}` objects, so a column
  lifted straight out of a table works without reshaping.
- **`null`, `''`, `undefined` and booleans are held out** before any coercion —
  `+null` is `0`, which would count a missing reading as a real measurement of
  zero and put a spike at the origin that is not in the data. They are counted
  out in a footnote, as is anything outside an explicit `xAxis.min`/`max`.
- **Bins choose themselves** by Freedman–Diaconis, falling back to Sturges under
  30 samples, then rounded to 1 / 2 / 2.5 / 5 / 10 × a power of ten so the edges
  are numbers a reader can check a value against. Override with `bins: 12` (a
  target count), `binWidth: 10` (exact), `binStart`, or `maxBins`.
- **Bin edges are half-open** — `[from, to)` — except the last, which closes at
  its top edge so the largest value has somewhere to land.
- **The bars touch**: the x-axis is continuous, so `barGap` (default `1`) is a
  hairline for legibility, never a category gap. **X labels sit at bin edges**,
  not centres, and a count axis ticks in whole numbers.
- **Stat rules**: `mean: true`, `median: true` draw labelled rules in the
  annotation ink above the bars; `xAxis.plotLines: [{ value, label, dashStyle }]`
  adds your own.
- **Named categories are refused**, for the reason `Charts.line` refuses them —
  bins are intervals on a number line. Counting how often each *name* occurs is
  `Charts.column`.
- **Returns** `{ getBins(), getStats(), redraw() }`; `getStats()` gives
  `{ n, min, max, mean, median, binWidth, bins, dropped, outside }`, so the
  numbers behind the picture are available to the prose without recomputing.

### Waffle (`Charts.waffle`)

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

### Report table (`Charts.reportTable`)

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
- **Shared scale**: `line`, `column`, `bar`, `dumbbell` cells in one column share `yAxis.min/max`; opt out with `sharedScale: false` when rows differ in unit.
- **Colour**: `kpi` columns take `colorBySign: true`, or `colorByScale: true` (+ a `scale` id to share one domain across columns). Any `kpi`/`text`/`insight` cell may carry its own `fill`. One colour per series name across the whole table.
- **Row labels**: `row.name` as text or `{ head, body }`; contiguous `row.group` headings.
- **Column groups are all or nothing** — if one column has a `group`, every column needs one.
- **Pie/donut cells** are ≥220px wide; past 4 slices (`sliceKeyAt`) they show a key instead of callouts.
- **Sizing — height**: as tall as its rows (chart rows `rowHeight`, default 140; they grow rather than clip). It grows only in a container **without** a height; given one (a fixed bento cell, `.h2`), it stretches each row by a capped amount and leaves the rest blank. Put it in a `<div class="bento flow">` row — see `layout.md` § Tables size themselves.
- **Sizing — width**: text, insight (≤240px) and kpi columns stop at their preferred width; a **chart column takes all the remaining width**. Set the chart column's `width` from its data (≈80–100px per bar/category, 240–320px for a sparkline) and pick the smallest grid span that holds the table (often `w8`), not `w12` by default.
- **Other options**: `striped`, `dividers`, `labelHeader`, `threshold`, `blank`; type sizes `insightSize`, `descriptionSize`, `descriptionLines` (3), `statSize`. Otherwise behaves like a table (width allocation, horizontal scroll, same refusals).

### Panels (`Charts.panels`)

Not an engine — a compositor. One shared title/subtitle, the width split into up
to four panels per line, each handed to whichever factory you name. Use it when
a bar and a donut are **one** exhibit with one headline, not two panels in the
dashboard grid.

```js
Charts.panels('chart', {
  title: 'Q3 commercial review',
  subtitle: 'Bookings trajectory, where the revenue came from, and the accounts driving it',
  plotOptions: { panels: { columns: 3, separators: true, panelHeight: 300 } },
  charts: [
    { type: 'column', title: 'Bookings by month',
      xAxis: { categories: ['Jul','Aug','Sep'] },
      series: [{ name: 'Bookings', data: [42, 51, 68] }] },
    { type: 'donut', title: 'Revenue mix',
      series: [{ name: 'Revenue', data: [['New business',48],['Expansion',31],['Renewal',21]] }] },
    { type: 'barList', title: 'Top accounts',
      plotOptions: { barList: { valueSuffix: 'k', sort: 'desc' } },
      series: [{ name: 'ARR', data: [['Northwind',210],['Acme',184],['Globex',121]] }] }
  ]
});
```

- **Panels**: `charts: [...]` (alias `panels:`). Each entry is an ordinary chart config plus `type` — any factory on the namespace (`line`, `column`, `bar`, `barList`, `barInsightTable`, `waffle`, `donut`, `pie`, `scatter`, `bubble`, `packedBubble`, `geofacet`) — and an optional per-panel `height`. Everything else passes through untouched, so a panel is configured exactly as it would be standalone, keeping its own title, legend and tooltip.
- **Columns**: `columns` (default: the number of charts, capped at **4** — past four a panel is too narrow to read). Extra charts wrap onto further rows, so a 2×2 is just `columns: 2`.
- **Separators**: hairlines between panels, on by default; `separators: false` turns them off.
- **Heading**: the group title is a size up from a panel's own title (`titleSize`, `subtitleSize` override).
- **Sizing**: `panelHeight` (default 320) is handed to every panel, the row-based types (`barList`, `dumbbell`, `barInsightTable`, `waffle`) included — they fill it rather than growing, unless that panel sets `autoHeight: true`. `gap` between panels, `rowGap` between rows.
- **Returns**: `{ charts: [...], panels: [...] }` — each engine's handle, and the panel `<div>`s.

### Radar (`Charts.radar`)

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

### Donut & pie (`Charts.donut`, `Charts.pie`)

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
  **Always the object** — `centerText: 'Final mile'` is truthy but has no
  `value`, so the ring silently prints its own total instead of the string.
  Omitting `value` (or `centerText: true`) is how you ask for that total.
- **Legend**: auto-shown at the top below the subtitle whenever there are 2+ wedges, wraps to multiple rows for many categories. Force off with `legend: { enabled: false }` to fall back to connector labels around the donut.
- **Value suffix**: `valueSuffix: '%'`
- **Show percentages instead of raw values**: `showPercentages: true`
- **Negative values are dropped.** A donut shows parts of a whole, so a negative part can't be drawn. Points with a negative or non-finite `y` are excluded from the ring, the total, and the legend, warned once on the console, and named in a footnote at the bottom-left (*"Not shown: North (-10M) — negative values can't be part of a whole"*), which falls back to a count when the list is too long. Suppress with `plotOptions.pie.droppedNote: false`. If nothing positive is left, the chart draws *"No positive values to chart"*. Use a bar chart for data that goes below zero.
- **Every wedge always gets a callout.** What adapts is the detail it carries. The engine takes the first layout that fits: two-line (name over value) → one-line → drop the legend and retry → name-only (or value-only when a legend is showing) → shrink the type down to a 0.72× floor. Turn callouts off with `plotOptions.pie.dataLabels: { enabled: false }`.

### Scatter / bubble / packed (`Charts.scatter`, `Charts.bubble`, `Charts.packedBubble`)

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

### Geofacet (`Charts.geofacet`)

One tile per region, positioned by `(row, col)` on a grid that approximates the
real map. Pick the tile style with `chart.variant`:

- **`'bar'`** (default) — code + value on one line, mini progress bar below
- **`'heat'`** — solid choropleth tile, color scaled across the value range
- **`'gauge'`** — radial progress ring with the value in the middle

**The default is a default, not a recommendation.** `'bar'` gets used for every
geofacet on the page because it is what you get by typing nothing, and that is
the wrong reason to pick it. The variant encodes the value differently, so it
should follow what the reader is meant to do with the number:

| The reader needs to… | Variant | Why |
|:--|:--|:--|
| Read the exact value per region and compare a few | `'bar'` | The number is printed at full weight and the bar gives a rough rank next to it |
| See the *spatial pattern* — where the high band is, whether it clusters | `'heat'` | Color fills the whole tile, so the map reads as a shape at a glance; individual values recede |
| Judge each region against a shared target or capacity | `'gauge'` | The ring encodes fraction-of-max, so "80% of quota" reads as a ring position without arithmetic |

Two consequences worth stating plainly:

- **`'heat'` needs `min`/`max` pinned** when the page has more than one heat
  facet, or each one auto-scales to its own range and the colors stop being
  comparable between them.
- **`'gauge'` needs a meaningful `max`.** A ring against the data's own maximum
  says only "biggest region", which the bar variant says better. Pass the real
  ceiling — quota, capacity, 100% — or use a different variant.

A page with three geofacets that are all `'bar'` is usually three panels that
should have been one; a page with a `'heat'` for the pattern and a `'gauge'`
for attainment is two panels answering two questions.

```js
Charts.geofacet('chart', {
  title: 'Electric Vehicle Adoption',
  subtitle: 'Percentage of total vehicle sales in %',
  chart: { variant: 'heat' },              // 'bar' | 'heat' | 'gauge'
  plotOptions: { geofacet: {
    max: 100,                              // scale ceiling (default: data max)
    min: 0,                                // bar/gauge start at 0; heat starts at data min
    valueSuffix: '%',
    format: v => v.toFixed(0),             // value formatter
    showEmpty: true,                       // faint labels for regions with no data
    borderRadius: 6                        // tile corner radius
  } },
  series: [{ data: { CA: 98, TX: 78, NY: 96 } }]
});
```

- **Data shapes**: `{CODE: value}`, `[['CA', 98], …]`, or `[{code:'CA', value:98, name:'California'}]`
- **Grid**: `chart.grid` accepts `'us'` (default, 50 states + DC) or an array of `{code, row, col, name?}` for any other geography. Registered grids live in `Charts.geofacet.grids`.
- **Partial data**: regions in the grid but missing from the data render as faint placeholder labels, so the map keeps its shape
- **Spacing is not configurable**: cells are always square with a derived gap, so the tiles stay one block at any container aspect ratio
- Hover a tile for a tooltip with the region name and value

### Waterfall (`Charts.waterfall`)

How a total got from one value to another: an opening balance, signed steps that each start where the last ended, and totals measured from zero.

```js
Charts.waterfall('container', {
  title: 'Operating profit bridge, FY25 → FY26',
  series: [{ data: [
    { name: 'FY25', y: 120 },
    { name: 'Price', y: 18 },
    { name: 'Volume', y: 9 },
    { name: 'Input costs', y: -22 },
    { name: 'FY26', isSum: true }
  ] }]
});
```

- **Data**: `series[0].data` as numbers or `{ name, y }` steps; `{ name, isSum: true }` for a total the engine computes (omit `y`).
- **Exactly one series**, numeric value on every step (a blank shifts every bar after it). Two bridges → `column` with grouped series, or one waterfall per panel in `panels`.
- **Refuses** a declared total that doesn't match its steps (the gap is named, not drawn) and data with only totals (that's `column`/`bar`).
- **Options**: `plotOptions.waterfall.connectors`, `showSign`, `upColor` / `downColor` / `sumColor`; `yAxis.plotLines`.
- **The value axis always includes zero.**
- **Sizing**: free aspect, min 480×280; span 2 grid tracks with 8+ steps or slanted names. **Returns** `getSteps()`, `getTotal()`.

### Sankey (`Charts.sankey`)

Where an amount goes: nodes in left-to-right columns joined by bands whose thickness is the amount moved — splits, merges and losses are the reading.

```js
Charts.sankey('container', {
  title: 'Signup funnel, September',
  stages: ['Source', 'Signup', 'Plan'],
  series: [{
    data: [
      ['Organic', 'Signed up', 4200], ['Paid', 'Signed up', 2600],
      ['Signed up', 'Free', 5100], ['Signed up', 'Pro', 1300]
    ]
  }]
});
```

- **Data**: `series[0].data` as `[from, to, weight]` or `{ from, to, weight }`; optional `series[0].nodes: [{ id, name?, color?, column? }]`.
- **Exactly one series of links**; weights ≥ 0; flow forward only. Refuses multiple series, negative/non-numeric weights (signed net flow → `waterfall`), self-links and loops.
- **One pixels-per-unit scale** across all columns; a node is as tall as the larger of its in/outflow. Whatever a stage receives but doesn't pass on flows into a counter-coloured **"Unaccounted"** node with its amount and share (`dropLabel`, `dropoff`).
- **Options**: `stages` (a header per column); `plotOptions.sankey.linkColor: 'source'|'target'|'gradient'|'neutral'|<css>`, `colorBy: 'level'|'source'|'node'|'none'`, `nodeWidth`, `nodePadding`, `align: 'justify'|'left'`, `valuePrefix` / `valueSuffix`; `nodes[].column` pins a node.
- **Sizing**: free aspect, min 480×300; **span 2 grid tracks** (1 only for 2–3 short-named columns). **Returns** `getLinks()`, `getNodes()`.

### Heatmap & calendar (`Charts.heatmap`, `Charts.calendarHeatmap`)

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
## Chart lifecycle: handle, resizing, animation, transparency

**The handle.** Every factory returns the same core methods, whatever the chart:

```js
const chart = Charts.column('el', config);
chart.redraw();                // re-render in place
chart.update(patch);           // merge a config patch and redraw; returns the handle
chart.on('click', fn);         // subscribe; returns an unsubscribe function
chart.off('click', fn);        // or off('click') for all of a type, off() for everything
chart.getData();               // the points, series or bins the chart holds
chart.toSVG();                 // a standalone .svg document, as a string
await chart.toPNG({ scale });  // a PNG Blob, 2x by default
chart.destroy();               // unbind listeners, empty the container
```

- **`update(patch)`** merges into the config the chart was built from: objects
  key by key, arrays replaced, except `series`, which merges **by position** so
  new numbers keep each series' name, colour and legend visibility. Because it
  merges, a key left out of the patch is *not* removed. To replace a config
  wholesale, `destroy()` and call the factory again.
- **Events**: `render` `{ reason }`, `hover` / `hoverEnd` `{ name, series?,
  index?, … }`, `click` (the hovered mark's detail), `legendToggle` `{ series,
  visible, index }`, `destroy`. `config.events: { click: fn }` is the same as
  `on`. An unknown event name throws. Listeners live on the handle, so they
  survive resizes and `update()`. `Charts.meta.events` lists them.
- **`toSVG()` / `toPNG()`** export the chart as drawn, including `panels` and
  `reportTable` cells; tooltips are not exported. A page needs them only if it
  offers a "download chart" button, so don't add one unasked.

Engines add extras on top (`getSeries`, `addPoint`/`shift` on `line`, `getBins`/`getStats`
on histograms, `charts`/`panels` on `panels`). The manifest's `api` array for
each chart lists exactly what its handle has. A refused chart still returns a
handle, with an `error` string saying why.

**Call `destroy()` before redrawing or removing a chart.** It disconnects the
resize observer and unbinds `window` listeners. It is safe to call twice, and
`panels` destroys its children.

**Charts follow their container.** A debounced `ResizeObserver` redraws the
chart when its container changes size, so charts in fluid grids, resized
windows and printed pages re-lay themselves. Two consequences for pages:
- **Hidden tabs, accordions and modals work.** A chart drawn into a
  `display:none` container redraws at its real size once it is shown, so no
  "draw on tab open" workaround is needed.
- Legend-toggled series survive a resize; per-slice donut toggles and a `line`
  chart's zoom do not.
- Opt out per chart with `chart: { responsive: false }` (a fixed-size export,
  say).

The chart also redraws once when `document.fonts.ready` settles. The skill
inlines everything and ships no webfont, so this rarely matters.

**Charts animate in.** On first draw bars grow from their baseline, dots scale
from their centre, lines draw along their length, and slices, areas, links and
tiles fade in; `update()` moves each bar and dot from its old place to its new
one. Resizes and font redraws are not animated. It is off under
`prefers-reduced-motion`, and a chart with more than 400 marks fades in whole.
`chart: { animation: false }` turns it off (a deck captured to PDF or images,
say); `chart: { animation: { duration: 900 } }` sets the length. Nothing is
written to the DOM, so the finished markup is identical either way.

**Transparent background.** Charts paint `theme.bg` behind themselves by
default. `chart: { transparent: true }` (one chart) or
`Charts.theme.transparent = true` (all charts) lets the surface underneath show
through. Tooltips, value-label halos and colour scales keep `bg` as their
paper. Use it when a chart sits on a surface that is *not* `theme.bg`, like a
tinted callout, a highlighted card or a slide band, instead of re-theming the
chart to match. `panels` passes it to its panels, and `reportTable` chart cells
are always transparent so stripes, cell fills and row hover show through. On a
normal card keep the default: the template already syncs `--card` to
`theme.bg`.

## Sizing (all charts)

Every engine draws into the box it is given. **A height on the container is an
instruction to fill it**, and the four row-based engines — `barList`,
`dumbbell`, `barInsightTable` and `waffle` — grow to fit their own content only
when the container has no height of its own. `plotOptions.<type>.autoHeight:
true` asks for the growing behaviour back.

That default used to be the other way round, and a container's height was
quietly ignored: a 30-row `barList` dropped into a 300px dashboard cell wrote
2022px into it and pushed the layout around it out of shape. **Any page written
against the older library that relied on `autoHeight: false` should drop that
flag** — filling is now what happens without it.

**Filling moves the spacing, not the marks.** A bar encodes its value in
*length*; once its thickness approaches that length the eye reads area instead,
and the shortest bars gain weight they have not earned. So bar thickness is
fixed and the row gap absorbs the difference, capped at 2.5× its own value,
after which the block is centred rather than stretched further. Too *little*
room reverses the order: gaps close to a floor before any mark is thinned. The
`waffle` is the exception that proves the rule — there the value is the *number*
of dots and a dot is one unit at any size, so the dot grows and the gaps hold
their proportion.

The charts with a fixed form still fill their box but keep their shape inside
it: a `donut` grows its ring until the narrower axis binds, a `radar` grows its
web the same way, a `geofacet` grows its square tiles until they hit their cap
and centres the leftover as margin.

**The plot box.** Every axis engine draws its plot 62px in from the left and
20px from the right, with the y-tick labels floating in that left margin and no
left spine — so a line chart beside a column chart in a grid has its gridlines
starting and ending on the same pixels. Two engines differ, and should: a
horizontal `Charts.bar` sizes its left gutter to its own row labels, and
`Charts.barInsightTable` is a table whose rules span the full content width.

**The heading band.** Every engine starts its plot at exactly
`titleBlockH + legendZone + plotGap`, so two chart types with the same title and
subtitle begin drawing on the same line — which is what makes a grid of mixed
charts read as one exhibit rather than several. The clearance does not depend on
whether a legend happens to be shown. `Charts.bar` is the one documented
exception: its value axis is labelled *above* the plot, so it reserves
`topAxisBand` on top of the shared clearance.

## Titles and subtitles wrap

Every engine measures the heading against the container width and wraps it:
**titles up to 2 lines, subtitles up to 3**, with the plot area shrinking to make
room so a longer heading never overlaps the chart. Anything past the line limit
is clipped with an ellipsis, so length still has a ceiling — it just isn't a
single-line ceiling any more.

Roughly what fits, measured at the template's cell widths:

| Cell | Title chars per line | Comfortable title length |
|:--|:--|:--|
| `w4` (~500px) | ~35 | up to ~70 (uses both lines) |
| `w6` (~750px) | ~72 | up to ~140 |
| `w8` (~1000px) | ~95 | up to ~190 |
| `w12` (~1520px) | ~145 | plenty |

So a finding-style title — "Carrier no-shows and late trailers cause 27% of
delay events" — fits on one line from `w6` up and wraps to two in a `w4`. Aim
under ~70 characters and it works in any cell; past ~90 in a narrow cell you
risk the ellipsis. Nothing needs configuring; there are no wrap options to pass.

All visual tokens (colors, fonts, sizes, weights, spacing) are stored in a single
`Charts.theme` object, which is **derived** from two source objects:
`Charts.palette` (the `n*`/`s*` color scale) and `Charts.metrics` (the type
scale, strokes, spacing). Every role in `Charts.theme` is a function of those
two, so edit the source and re-derive rather than patching roles one by one:

```html
<script src="theme.js"></script>
<script src="charts.js"></script>
<script>
  // Re-derives every colour role — including the ones a hand-written list
  // forgets: tileSurface, tileTrack, tooltipBorder, dimmed, hoverInk.
  Charts.applyPalette({
    n0: '#1a1a2e',  n0a: '#22223c',  n1: '#2a2a4a',
    n7: '#cccccc',  n8: '#ffffff',   n9: '#e0e0e0',  nInverse: '#1a1a2e',
    s1: '#e94560',  s2: '#0f3460',   s3: '#533483'
  });

  Charts.line('chart', { ... }); // uses the dark theme
</script>
```

`Charts.applyMetrics({ titleSize: 20 })` is the same contract for the non-colour
half. The two are separate so a colour edit no longer discards a metric edit —
but for dashboards built with this skill, **leave the metrics alone**: the type
scale and spacing are what make eight chart types read as one family.

Assigning a single role directly (`Charts.theme.bg = '#1a1a2e'`) still works and
is fine for a one-off tweak; it is just not replayed when `applyPalette` next
runs.

The full list of theme tokens lives in
[theme.js](theme.js) and includes:

| Token | Default | Purpose |
|:------|:--------|:--------|
| `bg` | `#f4f4f0` | Chart background (`n0`) |
| `tileSurface` | `#eae8e4` | Fill of a repeated panel drawn **on** the canvas — geofacet tiles. One soft step off `bg` (`n0a`), so a tile reads as a box, not a hole |
| `tileTrack` | `#f4f4f0` | Empty part of a bar/ring inside such a tile |
| `grid` | `#dcdbd7` | Gridline color |
| `axis` | `#000000` | Primary spine / tick color |
| `titleColor` | `#111111` | Title text |
| `subtitleColor` | `#666666` | Subtitle text |
| `labelColor` | `#333333` | Axis / tick label text |
| `secondaryColor` | `#666666` | Secondary text |
| `categoryColor` / `categoryWeight` | `#111111` / `600` | Category & series names |
| `tickColor` / `tickWeight` | `#333333` / `400` | Numeric axis ticks |
| `valueColor` / `valueWeight` | `#111111` / `700` | Data value readouts |
| `inverseText` | `#FFFFFF` | White-on-dark text |
| `muted` | `#8f8d87` | De-emphasised fill — the bars/lines that are context, not the finding. Derived to clear 3:1 on the canvas |
| `mutedScale` | `['#8f8d87','#a8a6a0','#c2c0ba']` | Ordered de-emphasis ramp, darkest first — for muted groups that keep internal order |
| `highlight` | `#243E63` | Zoom / plot-band accent |
| `callout` | `#B31B38` | Callout leaders, boxes, threshold rules |
| `aboveThreshold` | `#2323FF` | Value on the upper side of the threshold — see `annotation.md` § Threshold shift |
| `belowThreshold` | `#9a0060` | Value on the lower side. Named for the threshold, **not** for good/bad. Darkened from `#D1107A`, which collapsed onto `muted` under red-green colour blindness |
| `positive` / `negative` | `#2323FF` / `#9a0060` | Aliases of the two above, kept for existing configs |
| `trend` | `#2323FF` | Regression line color |
| `connectorLabel` | `#555555` | Donut connector label text |
| `connectorLine` / `connectorWidth` | `#333333` / `1.4` | Donut callout rule |
| `colors` | `['#000000',…]` | Series palette (7 colors) |
| `defaultColor` | `#000000` | Single-series default |
| `gradientStart` | `#000000` | Donut/bubble gradient start |
| `gradientEnd` | `#2323FF` | Donut/bubble gradient end |
| `font` | `'Inter',…` | Font stack |
| `titleSize` / `titleWeight` | `17` / `700` | Title font size (px) and weight |
| `subtitleSize` / `subtitleWeight` | `12` / `400` | Subtitle font size and weight |
| `labelSize` | `11.5` | Label font size |
| `tickSize` | `11` | Tick font size |
| `lineWidth` | `3` | Default line series width |
| `axisWidth` | `1.8` | Spine stroke width |
| `gridWidth` | `0.8` | Gridline stroke width |
| `titleLineHeight` / `subtitleLineHeight` | `1.24` / `1.34` | Leading, as **ratios** of the matching size — so a bigger title does not collide with itself |
| `headingPadTop` / `headingSubGap` / `headingGap` / `headingGutter` | `17` / `8` / `18` / `20` | The title-and-subtitle band above every plot. One set of values across all engines, which is why headings line up across a grid |
| `plotGap` / `topAxisBand` | `16` / `20` | Clearance from the heading band (title, subtitle, and the legend when there is one) to the top of the plot, applied whether or not a legend is drawn. `topAxisBand` is the extra band `Charts.bar` reserves because its value axis is labelled above the plot |
| `calloutSize` / `calloutPad` / `calloutMaxWidth` / `calloutLeaderWidth` / `calloutAnchorRadius` | `10` / `8` / `220` / `1.2` / `4.5` | The annotation box and its leader |
| `legendSize` / `legendWeight` / `legendRowHeight` / `legendGap` | `12` / `600` / `20` / `18` | Legend type and rhythm |
| `tooltipSize` / `tooltipBorder` | `12` / `#dcdbd7` | Tooltip type and hairline |
| `noticeSize` | `13` | Headline an engine draws in place of a chart it cannot render |
| `dimmed` | `#c2c0ba` | Legend key for a series toggled off |
| `hoverInk` | `#000000` | Ink of the low-opacity hover / crosshair wash |

## Interactions (all charts)

- Hover a marker/wedge/bar → tooltip with all series values at that x/category, plus a hover highlight
- Click a legend item (when the legend is shown) → toggle series visibility
- Click a donut wedge → explode / restore
- Drag horizontally on a `chart.zoomType:'x'` line → zoom into the range; a "Reset zoom" button appears
- **Keyboard, with no config**: a chart with marks is one tab stop. Arrow keys, Home and End walk its marks (tooltip and `hover` event), Enter clicks, Escape clears; legend items that toggle a series are buttons. Tables add no tab stop. Don't put a `tabindex` on the chart's container, or the chart becomes two stops

## Live examples

Open the skill's `templates/dashboard.html` and `templates/report.html` for working starting points.
