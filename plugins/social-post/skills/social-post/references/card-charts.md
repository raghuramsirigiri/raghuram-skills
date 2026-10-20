# A chart for a card

Read this when you pick the chart for each card. A card's chart is about 384px
wide and read on a phone in a second and a half, so the choice is narrower than
on a page: one finding, few marks, every value printed.

`chart-selection.md` is the library's full guide. Read its § Input contract and
the § Emphasis section named below, and treat everything there about grids,
tables and dashboards as not applying to a card.

All examples use invented figures.

## First: what is one item of this data?

| One item carries… | On a card use | Not |
|:--|:--|:--|
| One number per period | `Charts.line` (ordered x) when the headline is about change across the run (rose, doubled, peaked, fell): months, weeks, quarters. `Charts.column` only for a few periods (~6 or fewer, such as yearly totals) where each bar is compared as its own item | A column of months for a trend; a donut of months |
| One number per named category | `Charts.column` (≤6–8 categories), `Charts.barList` for a ranking or long names | `Charts.line` over names: the engine refuses it |
| Two states per category: before/after, plan/actual | `Charts.dumbbell` (exactly two series) | Grouped columns with a legend to decode |
| How a total moved through signed steps | `Charts.waterfall` (≤6 steps on portrait) | A column of deltas with no start or end |
| A share the reader should *feel* ("29 in 100") | `Charts.waffle` | A donut with one wedge |
| Two to five parts of one whole | `Charts.barList`, or a sentence for two parts | A donut, unless the whole itself is the finding |
| The spread of raw values | `Charts.histogram` | A column of hand-made bins |
| Two numeric measures against each other | `Charts.scatter` (portrait or square only) | A scatter with a category on an axis |
| A value per cell of two ordered dimensions (hour × weekday) | `Charts.heatmap` on a portrait card, with few enough cells to label | A year of daily values: a feed card can't hold one |

**Never on a card:** `Charts.table`, `reportTable` and `barInsightTable` (they
draw HTML that the freeze cannot paint, and a table in a feed isn't read),
`Charts.panels` (two charts on one card is two findings), `radar`, `geofacet`
and `sankey` (they need more room and more labels than the card has). A finding
that only one of these can show isn't a feed post; say so.

**The input contract still decides.** A line needs an ordered x: dates
(`'Mar 2026'`), numbers, or a complete rising run (`'Jan'…'Jun'`, `'Q1'…'Q4'`,
`'Week 1'…'Week 12'`). Named categories, or a shuffled or partial run, render
an error panel, so use a column. Donut and pie options (`centerText`,
`valueSuffix`, `showPercentages`…) live under `plotOptions.pie`, not at the top
level. Details in `chart-selection.md` § Input contract.

## How much fits

| Card | Chart box | Holds |
|:--|:--|:--|
| portrait | ~384 × 360 | a line up to ~16 points, a column up to ~8 categories, a bar list up to ~8 rows |
| square | ~384 × 260 | a line up to ~12 points, a column up to ~6 categories |
| landscape | ~444 × 140 | a line, or a column of ~5. Nothing with a long axis or many labels |

More values than that is a sign the card is carrying the whole dataset rather
than the finding. Cut to the range the headline talks about (the last 12 weeks,
the top 6 regions and "Other"), and say on the units line what was cut.

**Short plots need round axis bounds.** The engine picks about five y-ticks
however short the plot is. In a 140px plot that stacks labels 15px apart. Set
`yAxis: { min, max }` to round numbers that give ~4 ticks.

## Emphasis

The headline names a subject: a region, a series, a moment. That subject takes
the accent and everything else takes the mute, so the picture says what the
headline says before anyone reads the axis.

- **Categories:** a per-point `color`, `Charts.theme.colors[1]` (or `T.positive`)
  on the bars the headline names, `Charts.theme.muted`
  on the rest. `chart-selection.md` § Emphasis has the code.
- **One line among several:** that series gets the accent and a heavier
  `lineWidth`; the others share one identical mute.
- **A moment:** one `callouts: [{ x, text }]` on that point. One callout per
  card, at most.
- **At most two accented items**, two colours on the card, and "Other" is
  always muted.
- **No subject, no emphasis.** When the headline is about the overall shape,
  one colour across all marks is right. Highlighting an arbitrary bar invents a
  claim.

## Labels, legends and notation

- **Data labels stay on.** A picture has no tooltip, so every value the reader
  needs is printed. If they collide, cut values (above), don't turn labels off.
- **No legend on a one-series card** (`legend: { enabled: false }`). With two
  series, the legend stays where the library puts it, or name the series in the
  units line and drop it.
- **No title or subtitle in the config.** They are the card's headline and
  units line.
- **Measured and projected never share a stroke.** A forecast is its own dashed
  series, and the units line says what the dash means (`annotation.md`
  § Intervention and forecast).
- **A gap is `null`, never `0`.** Every line type breaks its path at a
  `null`; a zero draws a collapse that never happened.

## Then write the config

Read `chart-api.md` for the shared options, then `charts/<type>.md` for the one
or two types you picked, in one read:

```bash
cd <skill-dir>/references && cat chart-api.md charts/line.md charts/column-bar.md
```

Never guess an option name. For one fact about one engine (what it refuses, its
minimum size), read its entry in `assets/charts-lib/charts.manifest.json`.
Don't read `assets/charts-lib/charts.js` to learn an option.
