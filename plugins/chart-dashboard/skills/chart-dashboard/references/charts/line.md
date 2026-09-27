# Line (`Charts.line`)

Part of the charts-lib API — the shared options, sizing and interactions are in
[`../chart-api.md`](../chart-api.md). Every option below is optional; the library picks sensible defaults.

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
