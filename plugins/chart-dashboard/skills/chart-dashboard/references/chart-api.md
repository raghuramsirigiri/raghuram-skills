# charts-lib

**Contents**

- [API](#api)
- [The manifest (`charts.manifest.json` / `Charts.meta`)](#the-manifest-chartsmanifestjson--chartsmeta)
- [Per-chart options — read only the files for the charts you use](#per-chart-options--read-only-the-files-for-the-charts-you-use)
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
| `Charts.table`        | Exact numbers a reader looks up: grouped rows, spanning column headers, cells coloured by sign or on a scale. |
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
should it span? what does it refuse?) rather than the per-chart file.

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

## Per-chart options — read only the files for the charts you use

Each engine's options live in their own file under `references/charts/`. Once
the plan names its chart types, read those files and no others — a page with a
line, a column and a table needs three short files, not the whole catalogue.
Every option in them is optional; the library picks sensible defaults.

| Factory | File |
| :-- | :-- |
| `Charts.line` | [`charts/line.md`](charts/line.md) |
| `Charts.column`, `Charts.bar` | [`charts/column-bar.md`](charts/column-bar.md) |
| `Charts.barList` | [`charts/bar-list.md`](charts/bar-list.md) |
| `Charts.dumbbell` | [`charts/dumbbell.md`](charts/dumbbell.md) |
| `Charts.barInsightTable` | [`charts/bar-insight-table.md`](charts/bar-insight-table.md) |
| `Charts.histogram`, `Charts.histogramPercent`, `Charts.histogramCumulative` | [`charts/histogram.md`](charts/histogram.md) |
| `Charts.waffle` | [`charts/waffle.md`](charts/waffle.md) |
| `Charts.table` | [`charts/table.md`](charts/table.md) |
| `Charts.reportTable` | [`charts/report-table.md`](charts/report-table.md) |
| `Charts.panels` | [`charts/panels.md`](charts/panels.md) |
| `Charts.radar` | [`charts/radar.md`](charts/radar.md) |
| `Charts.donut`, `Charts.pie` | [`charts/donut-pie.md`](charts/donut-pie.md) |
| `Charts.scatter`, `Charts.bubble`, `Charts.packedBubble` | [`charts/scatter-bubble.md`](charts/scatter-bubble.md) |
| `Charts.geofacet` | [`charts/geofacet.md`](charts/geofacet.md) |
| `Charts.waterfall` | [`charts/waterfall.md`](charts/waterfall.md) |
| `Charts.sankey` | [`charts/sankey.md`](charts/sankey.md) |
| `Charts.heatmap`, `Charts.calendarHeatmap` | [`charts/heatmap.md`](charts/heatmap.md) |

Two cross-cutting topics also have their own files:

- [`charts/lifecycle.md`](charts/lifecycle.md) — the handle every factory
  returns, `destroy()` before redraw, resize, animation, transparency. Read it
  when the page has a control or redraws charts.
- [`charts/theme-tokens.md`](charts/theme-tokens.md) — every `Charts.theme`
  token and `applyPalette`/`applyMetrics`. Read it when recolouring or
  referencing a named token.

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

## Interactions (all charts)

- Hover a marker/wedge/bar → tooltip with all series values at that x/category, plus a hover highlight
- Click a legend item (when the legend is shown) → toggle series visibility
- Click a donut wedge → explode / restore
- Drag horizontally on a `chart.zoomType:'x'` line → zoom into the range; a "Reset zoom" button appears
- **Keyboard, with no config**: a chart with marks is one tab stop. Arrow keys, Home and End walk its marks (tooltip and `hover` event), Enter clicks, Escape clears; legend items that toggle a series are buttons. Tables add no tab stop. Don't put a `tabindex` on the chart's container, or the chart becomes two stops

## Live examples

Open the skill's `templates/dashboard.html` and `templates/report.html` for working starting points.
