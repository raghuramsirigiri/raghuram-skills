# Theme tokens (`Charts.theme`)

Part of the charts-lib API ([`../chart-api.md`](../chart-api.md)). Read this when
you recolour the page or reference a named token; the brand-recolour workflow
itself is in [`../theming.md`](../theming.md).

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
