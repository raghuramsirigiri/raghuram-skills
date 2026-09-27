# Histogram (`Charts.histogram`, `Charts.histogramPercent`, `Charts.histogramCumulative`)

Part of the charts-lib API — the shared options, sizing and interactions are in
[`../chart-api.md`](../chart-api.md). Every option below is optional; the library picks sensible defaults.

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
