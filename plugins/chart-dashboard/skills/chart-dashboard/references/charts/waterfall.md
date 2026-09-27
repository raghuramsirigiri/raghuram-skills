# Waterfall (`Charts.waterfall`)

Part of the charts-lib API — the shared options, sizing and interactions are in
[`../chart-api.md`](../chart-api.md). Every option below is optional; the library picks sensible defaults.

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
