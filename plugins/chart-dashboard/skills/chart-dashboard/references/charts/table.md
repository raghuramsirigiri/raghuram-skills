# Table (`Charts.table`)

Part of the charts-lib API — the shared options, sizing and interactions are in
[`../chart-api.md`](../chart-api.md). Every option below is optional; the library picks sensible defaults.

Exact numbers a reader will look up rather than estimate. Rows can be grouped
under headings, columns under a spanning header, and a column can colour its
cells by value. Reach for it when each row carries several measures and the
reader needs the figures themselves, not their shape (`chart-selection.md`).

```js
Charts.table('container', {
  title: 'Backend is the only department growing into FY 2026',
  subtitle: 'Headcount and budget · USD m',
  columns: [
    { key: 'hc25', name: 'Headcount',  group: 'FY 2025' },
    { key: 'b25',  name: 'Budget',     group: 'FY 2025', prefix: '$', suffix: 'M', decimals: 1,
      highlight: 'scale', scale: 'budget' },
    { key: 'g25',  name: 'YoY growth', group: 'FY 2025', suffix: '%', decimals: 1, showSign: true,
      highlight: 'sign' },
    { key: 'b26',  name: 'Budget',     group: 'FY 2026', prefix: '$', suffix: 'M', decimals: 1,
      highlight: 'scale', scale: 'budget' }
  ],
  rows: [
    { group: 'Software', name: 'Backend',  hc25: 450, b25: 31.5, g25: 8.2,  b26: 34.5 },
    { group: 'Software', name: 'Frontend', hc25: 210, b25: 14.0, g25: -1.3, b26: 13.8 },
    { group: 'Hardware', name: 'Chips',    hc25: 85,  b25: 12.5, g25: -4.1, b26: 11.0 }
  ]
});
```

- **Columns**: `key` (required, unique), `name`, `group` (consecutive columns
  with the same group share a spanning header), `align` (numbers default right,
  text left), `headerAlign`, `prefix`, `suffix`, `decimals`, `showSign`,
  `format(value, row)`, `width` (a floor, never a cap), `bold`, `wrap` (a column
  with no numbers wraps its text to ~340px a line; a column with any number
  never wraps).
- **Rows**: `name`, optional `group`, and one value per column key. A row group
  must be one contiguous run — sort the rows first.
- **`highlight`**: `'sign'` fills above/below `plotOptions.table.threshold`
  (default 0) with `aboveThreshold` / `belowThreshold`. `'scale'` walks the
  series ramp (lightest for the smallest value), or diverges through the
  threshold pair when the domain crosses zero. A function `(value, row, column)`
  returning a colour or null does anything else. Cell ink is picked by contrast
  with the fill. Colour a column only when the pattern is part of the finding.
  That is usually one or two columns, the ones the title is about. Shading
  every measure column turns the table into a heatmap with no emphasis left;
  if the reader needs each region's standing on every measure, a rank column
  or sorted rows say it without colour.
- **`scale: 'id'`** gives several columns one colour domain, so the same amount
  is the same shade in each. Columns sharing a scale must share a unit
  (`prefix`/`suffix`) or the table is refused.
- **Blanks** (`null`, `''`, `NaN`) draw as `–` (`plotOptions.table.blank`), take
  no fill and are left out of the scale. A blank is not zero.
- **Never truncates a number.** Headers and row labels wrap; if the numbers
  still do not fit, the table keeps its natural width and the container scrolls.
- **Column groups are all or nothing**: any `group` means every column needs
  one, or the table is refused; a lone qualifier goes in the column name.
- **Also**: `plotOptions.table.striped`, `rowGroupDivider` (true),
  `columnGroupDivider` (true), `labelHeader`, `labelGap` (28px gutter after the
  row labels), `pills` (false colours the text instead of a fill).
- **Sizing**: grows to its rows with no container height; given a taller one,
  the rows open up to half again their height and the rest is blank. Put it in a
  `<div class="bento flow">` row — see `layout-dashboard.md` § Tables size themselves. It
  needs about 480px; with four or fewer data columns one grid track holds it.
- **Known overflow by the scrollbar's width.** When the table is what makes the
  page tall enough to scroll, it keeps the width it measured before the
  scrollbar appeared, and the layout audit reports `overflow-x` on it by 15–17px.
  That is a library bug (`CHARTS-LIB-UPSTREAM.md` change 5), not your layout: if
  the overflow equals `innerWidth - document.documentElement.clientWidth`,
  leave it. The same applies to any self-sizing chart (`reportTable`,
  `barInsightTable`, `barList`).
- **Returns** the standard handle plus `getRows()`.
