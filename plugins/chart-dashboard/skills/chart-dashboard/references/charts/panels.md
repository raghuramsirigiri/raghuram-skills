# Panels (`Charts.panels`)

Part of the charts-lib API — the shared options, sizing and interactions are in
[`../chart-api.md`](../chart-api.md). Every option below is optional; the library picks sensible defaults.

Not an engine — a compositor. One shared title/subtitle, the width split into up
to four panels per line, each handed to whichever factory you name. Use it when
a bar and a donut are **one** exhibit with one headline, not two panels in the
dashboard grid. When to reach for it (small multiples, a before/after pair, two
cuts that prove one claim) is in `chart-selection.md` § When several charts are
one exhibit.

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

- **Panels**: `charts: [...]` (alias `panels:`). Each entry is an ordinary chart config plus `type` — the name of any factory on the namespace (`line`, `column`, `dumbbell`, `histogram`, `radar`, `heatmap`, `waffle`, `donut` and the rest; `column` when omitted; an unknown name draws a notice in that panel) — and an optional per-panel `height`. Tables (`table`, `reportTable`) and a nested `panels` are exhibits in their own right and belong in the grid, not inside a panel. Everything else passes through untouched, so a panel is configured exactly as it would be standalone, keeping its own title, legend and tooltip.
- **Columns**: `columns` (default: the number of charts, capped at **4** — past four a panel is too narrow to read). Extra charts wrap onto further rows, so a 2×2 is just `columns: 2`.
- **Separators**: hairlines between panels, on by default; `separators: false` turns them off.
- **Heading**: the group title is a size up from a panel's own title (`titleSize`, `subtitleSize` override).
- **Sizing**: `panelHeight` (default 320) is handed to every panel, the row-based types (`barList`, `dumbbell`, `barInsightTable`, `waffle`) included — they fill it rather than growing, unless that panel sets `autoHeight: true`. `gap` between panels, `rowGap` between rows.
- **Returns**: `{ charts: [...], panels: [...] }` — each engine's handle, and the panel `<div>`s.
