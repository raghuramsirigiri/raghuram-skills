# Choosing a chart

Which chart the data allows, and which one shows the finding.

**Contents**

- [Input contract — check this before the table](#input-contract--check-this-before-the-table)
- [Choosing between the three bar treatments](#choosing-between-the-three-bar-treatments)
- [Choosing among the specialist charts](#choosing-among-the-specialist-charts)
- [Anti-patterns](#anti-patterns)
- [Emphasis](#emphasis)
  - [The three heuristics](#the-three-heuristics)
  - [Scenario notation: measured, planned, projected](#scenario-notation-measured-planned-projected)
  - [Grouped columns and bars](#grouped-columns-and-bars)
  - [Line charts](#line-charts)
  - [Pie and donut](#pie-and-donut)
- [Data labels](#data-labels)
- [Reference marks, intervention, thresholds, annotation](#reference-marks-intervention-thresholds-annotation)


## Input contract — check this before the table

Chart type is not a free choice on top of the data; each engine accepts a
particular *kind* of x and a particular *kind* of y, and picking one whose
contract the data doesn't meet produces a broken panel, not a stylistic
mismatch. Check the row before you write the config.

The same contracts are machine-readable in
`assets/charts-lib/charts.manifest.json` (`requires` / `refuses` per factory,
and `Charts.meta` at runtime) — use it to check one engine quickly, and this
table to see them against each other.

| Chart | x / rows accept | y accepts | Violating it gives you |
|:--|:--|:--|:--|
| `line` (incl. spline, step) | **Ordered continuous or temporal only** — numbers, epoch-ms with `type:'datetime'`, or category labels that either all parse as dates or form a rising sequence (`'Jan'…'Dec'`, `'Q1'…'Q4'`, `'Week 1'…`) | Numbers; `null` for a gap | An error panel — the engine refuses unordered named categories outright |
| `column`, `bar` | Named categories (the normal case), or any ordered labels | Numbers, may be negative; `[low, high]` pairs for `columnrange` | Nothing breaks; this is the permissive engine |
| `barList` | Named categories | Numbers, one per row | — |
| `barInsightTable` | Named categories, each with an `insight` and/or `stat` | Numbers, one per row | Collapsed empty columns — a slower `barList` |
| `dumbbell` | Named categories, **paired by position** across both series | Numbers — **exactly two series**, no more, no fewer | A refusal panel naming `barList`/`bar` (one state) or grouped `bar` (three or more) |
| `histogram` (and `Percent`, `Cumulative`) | **Raw unaggregated numbers** — the engine bins them itself | n/a — the y-axis *is* the count/share it computes | Named categories are refused outright, as in `line` |
| `radar` | Named axes, **three minimum**, shared by every series | Numbers on **one scale from a common centre** | Fewer than three axes draws a refusal panel naming `column`/`dumbbell` |
| `waterfall` | Named steps, in order, one series | Signed numbers; `{isSum:true}` totals the engine computes | Refusal panel on 2+ series or a declared total that doesn't match its steps; a blank step shifts every later bar |
| `sankey` | `[from, to, weight]` links, one series, forward-only | Weights ≥ 0 | Refusal panel on negative weights, self-links, loops |
| `reportTable` | Rows, with typed columns (`text`/`insight`/`kpi`/`chart`) | Per column kind | Refusal panel on a missing `kind`, a `number` kind, or an exhibit-type chart column |
| `waffle` | Named categories, each a share of the *same* whole | Non-negative numbers ≤ `total` | Negatives silently clamped to zero |
| `donut`, `pie` | Named categories that sum to a whole | Positive numbers only | Negative/non-finite wedges dropped, console warning, footnote |
| `scatter`, `bubble` | **A numeric measure** — `xAxis.categories` is ignored | A numeric measure (`bubble`: plus a numeric `z`) | Points plotted against a meaningless 0,1,2… index axis |
| `packedBubble` | Named categories (`[name, value]`) | Non-negative magnitudes | — |
| `geofacet` | **Region codes present in the grid** (`'us'` by default) | One number per region | Unmatched codes vanish; missing regions draw as faint placeholders |
| `panels` | n/a — each panel carries its own contract | n/a | Whatever the inner chart would do |
| `yAxis: {type:'logarithmic'}` | any | **Strictly positive** numbers | Zero/negative clamped to the floor; axis silently restarts at 1 |

Three of these are worth stating as rules, because they are the mistakes that
actually get made:

**A line needs an ordered x, and "ordered" means time or number.** Browsers,
regions, product SKUs, survey answers, departments — these have no order and no
distance between them, so the segment joining two of them encodes nothing. Sort
them differently and the line changes shape while the data doesn't; that is the
tell. charts-lib enforces this and draws *"Line charts need a continuous or
temporal x-axis"* instead of the chart. When you catch yourself reaching for a
line over categories, you want `Charts.column` (or `Charts.bar`), and the
finding you were about to draw is a ranking, not a trend.

Two cases look like exceptions and aren't:

- *Categories measured at several periods* — "revenue by region, 2019–2025" —
  is a time series **per region**: one series each, time on x. That is a line,
  and it is what the error message means by "give each category its own series
  over a date or numeric x-axis".
- *Ordered non-temporal bins* — age bands, deciles, funnel stages, Likert
  points — genuinely have order, and a line over them is legitimate. The guard
  accepts them as long as the labels carry their own sequence (see below);
  labels that don't, like `'Strongly agree' … 'Strongly disagree'`, need the
  bin's numeric midpoint on a linear x, or columns. Don't fake a date to get
  past the guard.

**What counts as an ordered x-label.** The engine accepts a category list when
*either* test passes:

- **Every label parses as a date** — it carries a 4-digit year or a `d/d` pair
  *and* survives `Date.parse`: `'2019'`, `'Jan 2025'`, `'2024-01-01'`, `'3/14'`.
- **The labels are a rising, evenly-spaced sequence** — month names (`'Jan' …
  `'Dec'`), weekday names (`'Mon' … 'Sun'`), or one stem numbered upwards
  (`'Q1'…'Q4'`, `'Week 1'…'Week 12'`, `'Band 1'…'Band 5'`, `'2019'…'2025'`).
  Strictly increasing is required, so a shuffled or partial run still fails.

Anything else — `'Chrome', 'Safari', 'Firefox'` — is refused. Where a bare
sequence is ambiguous to the *reader* (`'Jan'` in a chart spanning two years),
still write `'Jan 2025'`: the guard is about whether a line is meaningful, the
label is about whether the axis is.

**Part-of-whole charts need parts of one whole.** Donut, pie, and waffle all
assume the values are non-negative shares that add up to something meaningful.
A donut of "revenue by region" where one region lost money, or a waffle of two
unrelated percentages, has no honest drawing — the library drops or clamps the
offending values rather than lying about them, which means your panel quietly
loses data. Use a column chart with `negativeColor` instead.

| The data is… | Use | charts-lib call |
|:--|:--|:--|
| A value over time, 1–4 series | line / spline | `Charts.line` (`type:'spline'` per series to smooth) — x must be dates or numbers, never names |
| A value over time, irregular timestamps | datetime line | `Charts.line` + `xAxis:{type:'datetime'}` |
| A level that holds between changes | step line | `Charts.line` + `type:'step'` |
| A trend interrupted by an event, or continued as a projection | line + separator, split actual/forecast | `Charts.line` — see `annotation.md` § Intervention and forecast |
| A series with a real hole in it | line, **unsmoothed** | `Charts.line` + `type:'line'` — the default spline hides interior `null`s |
| Comparison across ≤12 named categories | columns | `Charts.column` — the answer whenever x is a *name*, whether or not the numbers look like a trend |
| Comparison across >12 categories, or long labels | horizontal bars | `Charts.bar` |
| A ranked list, or very long category names | bar list (no axis) | `Charts.barList` + `sort:'desc'` |
| Each row needs a comparison **and** a sentence **and** a headline number | bar insight table | `Charts.barInsightTable` |
| The **gap between two states** per category — before/after, plan/actual, ours/theirs | dumbbell | `Charts.dumbbell` — exactly two series; `sort:'delta'` ranks by the size of the change |
| The **distribution** of a raw measurement — where values pile up, how long the tail is | histogram | `Charts.histogram` (or `histogramPercent` / `histogramCumulative`) — hand it the raw numbers, it bins them |
| A **profile across 3+ named dimensions**, compared as a shape | radar | `Charts.radar` — only when every axis shares one scale from zero; ≤3 profiles |
| Many rows, each needing a mini-chart, a sentence **and** a number | report table | `Charts.reportTable` — the scorecard/QBR page in one exhibit |
| How a total moved from A to B through signed contributions | waterfall | `Charts.waterfall` + `{isSum:true}` for the closing total |
| Where an amount flows — splits, merges, drop-off across stages | sankey | `Charts.sankey` (`stages` for column headers); give it 2 grid tracks |
| A proportion the reader should *feel* ("29 in 100") | waffle | `Charts.waffle` — survey shares, adoption rates; a bar compares lengths, a waffle counts units |
| Composition over time | stacked columns | `Charts.column` + `plotOptions.column.stacking:'normal'` |
| Share-of-total over time | 100% stacked | `stacking:'percent'` |
| Share of a single total, ≤6 parts | donut | `Charts.donut` (add `centerText`) |
| Share where each part also has a size | variable-radius donut | `Charts.donut` + `variableRadius:true` |
| Relationship between two **numeric** measures | scatter | `Charts.scatter` (`regression:true` for a trend line) — a category on either axis means it isn't a scatter |
| Two measures plus a magnitude | bubble | `Charts.bubble` |
| Many items, only relative size matters | packed bubbles | `Charts.packedBubble` |
| A min–max span per category | column range | `Charts.column` + `type:'columnrange'`, `data:[[low,high],…]` |
| Two mirrored populations | population pyramid | `Charts.bar`, one series all-negative, `tooltip.absoluteX:true` |
| Values that cross zero | column with `negativeColor` | `Charts.column` |
| One value per region, reader compares exact values | geofacet bars | `Charts.geofacet` + `chart:{variant:'bar'}` |
| One value per region, the *spatial pattern* is the finding | geofacet heat | `Charts.geofacet` + `chart:{variant:'heat'}`, pin `min`/`max` |
| Per-region attainment against a shared target | geofacet gauges | `Charts.geofacet` + `chart:{variant:'gauge'}`, real `max` |
| One value for a handful of named places | ranked bars | `Charts.barList` / `Charts.bar` — a geofacet of 10 states is 40 empty tiles, and the map shape earns its space only when the geography is the finding |
| 2–4 charts that are one exhibit under one headline | panels | `Charts.panels` (`charts:[{type,…}]`, max 4 per row) |
| A rate spanning orders of magnitude | log axis | `Charts.line` + `yAxis:{type:'logarithmic'}` — only if every value is > 0 |

## Choosing between the three bar treatments

They look similar in a list and are not interchangeable. Pick by how much each
row has to say:

| The row carries… | Use | Because |
|:--|:--|:--|
| A length, nothing else | `Charts.bar` / `Charts.column` | An axis and gridlines let the reader compare precisely across many categories |
| A length and a long name | `Charts.barList` | The name sits above its own bar at full width instead of being squeezed into a left gutter |
| A length, a sentence, and a headline number | `Charts.barInsightTable` | All three sit in one row, so the reader gets the comparison, the meaning, and the takeaway without looking anywhere else |
| **Two** lengths whose *difference* is the point | `Charts.dumbbell` | A grouped pair makes the reader subtract two lengths off a shared baseline; the rod draws the difference directly, and on a fraction of the ink |

`barInsightTable` is the one to reach for on **income statements, KPI reviews,
before/after comparisons, and scorecards** — anywhere you would otherwise build a
chart, a table, and a paragraph of commentary and hope the reader connects them.
Two telling signs you want it: you are about to write a caption that explains
each bar individually, or the user gave you a metric *and* a note about each
metric.

It also solves a specific problem the action-title rule can't. A title states one
finding for the whole chart; when every row has its own finding, they belong in
the insight column, one per row, rather than crammed into a single headline or
scattered into cards below the chart.

Keep it to roughly 4–8 rows. Each row is bar-height plus up to two lines of text,
so a long table stops being a chart and becomes a wall — split it, or drop to a
plain ranked bar list and put the commentary in prose.

Skip it when the rows have nothing to say: with no `insight` or `stat`, the
columns collapse and you have a slower `barList`. Never use it for a time series —
rows are categories, not periods.

Two neighbours cover what it can't:

- **Two values per row, and the change is the point** → `Charts.dumbbell`. A
  grouped bar pair makes the reader subtract two lengths; the dumbbell draws
  the gap and writes the delta in its own column.
- **A row needs a trend, not a single length** — a sparkline per metric, a
  donut per segment — or more than one number → `Charts.reportTable`. Figures go
  in `kpi` columns, commentary in `insight`, and chart columns share a value
  scale so rows still compare. It sizes to its rows, so it goes in a `bento flow` row (layout.md § Tables size themselves).

## Choosing among the specialist charts

These answer one question each; reach for them only when that question is the
title.

- **Histogram vs. column.** Raw measurements (latencies, order values, ages) →
  histogram, and let it bin. Counts you already have per *name* → column. Never
  hand-bin data into columns to fake a histogram.
- **Radar vs. column / panels.** Radar earns its place when the *profile shape*
  is the finding ("strong on reliability, weak on docs") and every axis is on
  one scale. For exact per-axis comparison use grouped columns; past 3–4
  profiles, use `Charts.panels` of small radars.
- **Waterfall vs. stacked column.** Waterfall explains *one change* between two
  totals by its signed contributions (price, volume, cost). Composition that
  persists across periods is stacked columns.
- **Sankey vs. ranked bars.** Use sankey when flows *split or merge* between
  stages, or the drop-off per stage is the story — its "Unaccounted" node shows
  loss for free. A single linear conversion path with no branching reads faster
  as a ranked `barList`.

## Anti-patterns

- **A line over named categories** — browsers, regions, departments, SKUs.
  The engine refuses it and you ship an error panel; even if it drew, the
  slope between two names means nothing. Use columns.
- Line categories that aren't a rising sequence — a partial or shuffled run
  of month or quarter labels reads as time to a human but fails the guard.
  Keep the run complete and in order, or write full dates.
- A log y-axis over data containing zero or negative values.
- A scatter where one axis is a category — `xAxis.categories` is ignored,
  so the points land on an index axis that means nothing.
- Pie/donut for time, for >6 wedges, or for parts that don't sum to a whole.
- More than 4 lines on one chart — split it, or highlight one and gray the rest.
- Stacked columns when the reader needs to compare the *middle* bands; only the
  bottom band and the total are readable.
- Dual axes. Split into two panels instead (`Charts.panels` keeps them under
  one headline).
- `Charts.panels` as a second grid. It groups charts that are one exhibit; a
  panel that stands on its own belongs in the dashboard grid, not nested.
- A waffle for anything that isn't a share of a whole — negatives are clamped
  to zero, and comparing two waffles is worse than comparing two bars.
- Truncated y-axis on a column chart (bar length must encode the value).
- A radar whose axes are in different units, or that crams 5+ overlapping
  profiles — normalise to an index, or split into panels.
- A histogram fed pre-aggregated counts — it will bin the counts themselves.
- A waterfall of independent totals with no steps between them — that's columns.
- A sankey with a loop, negative weights, or two networks in separate series.
- A dumbbell with three states — a third dot reads as a range with a midpoint.
- Bubbles sized by radius rather than area — charts-lib already scales by area
  via `plotOptions.bubble:{minSize,maxSize}`; don't fight it.

## Emphasis

**If the title names specific bars, those bars must look different from the
rest.** This is the single highest-value thing you can do to a categorical
chart, and it is the thing most often skipped: a title reading "The top two
categories drive 90% of volume" above eight identically-colored bars makes the
reader count bars to find the two you meant. Color them, and the sentence and
the picture agree instantly.

The mechanism is a per-point `color` (see `chart-api.md` § Column & bar):

```js
const T = Charts.theme;
const data = rows.map((r, i) => ({
  name: r.name,
  y: r.value,
  color: i < 2 ? T.colors[1] : T.muted   // the finding · everything else
}));

Charts.bar('c1', {
  title: 'The top two categories drive 90% of volume',
  subtitle: 'Units shipped · FY2026',
  xAxis: { categories: data.map(d => d.name) },
  plotOptions: { series: { dataLabels: { enabled: true } } },
  legend: { enabled: false },
  series: [{ name: 'Units', data }]
});
```

Rules for the emphasis color:

- **Two colors, not a rainbow.** One accent for the subject of the finding, one
  neutral (`Charts.theme.muted`) for the context. `colorByPoint: true` is the
  opposite of emphasis — it says every bar is its own category, so nothing
  stands out.
- **The accent comes from the theme**, so a brand recolour carries it:
  `T.colors[1]` (or `T.positive`) for the highlighted set, `T.muted` for the
  rest. Never a hard-coded hex.
- **Drop the legend** when a chart is one series split by emphasis
  (`legend: { enabled: false }`) — there are no series to name, and a legend
  saying "Units" twice in two colors is worse than none. If the split needs
  naming, say it in the subtitle: "Top two highlighted".
- **Not every chart has a subject.** When the finding is the overall shape
  rather than specific categories, a single color across all bars is correct;
  highlighting an arbitrary pair invents a claim.
- **Alpha is the other way to mute, and often the better one.** Appending an
  alpha pair to the focal hex — `T.colors[1] + 'CC'` for 80%, `'66'` for 40% —
  de-emphasises without needing a second token at all, and it recolours
  correctly with any brand for free. Prefer it over `T.muted` when the context
  items are the *same kind of thing* as the focal item (other regions, other
  months); keep the neutral `T.muted` when they are genuinely background. The
  3:1 floor still applies: `'66'` (40%) on a light canvas is usually the
  lightest you can go, and anything under `'80'` needs checking.
- **Grey belongs to residual categories permanently.** "Other", "Unclassified",
  "Don't know", "No response", the rolled-up tail of a donut — these take
  `T.muted` on *every* chart, whether or not the chart is in emphasis mode.
  They are not a finding and never will be, so they should never hold a
  palette color that a real category could have used. This is the one place
  muting is unconditional.
- **Collapse the context into one class.** When several series are all context,
  give them the *same* muted treatment rather than a graded ramp — six
  historical periods in one identical grey read as a single band of "the past",
  which is the comparison you want; six greys read as six things. Reach for
  `mutedScale` only when the context has order the reader must recover. Label
  the group once ("2019–2024") instead of labelling every member.

### The three heuristics

These decide *whether* to switch a chart into emphasis mode, before you decide
how:

1. **Read your own title.** If the title names specific categories, series, or a
   moment in time — "Direct Sales outperformed Partner", "Enterprise is 70% of
   ARR", "the drop came after the March update" — the chart switches from
   **categorical** mode (multi-hue, every item its own color) to **emphasis**
   mode (accent + muted). The two modes are exclusive: a multi-hue palette *with*
   one item accented reads as eight findings, not one.
2. **Muted must stay legible.** `Charts.theme.muted` is derived to clear 3:1
   against the canvas (WCAG 1.4.11 for graphical objects) precisely because
   context bars are still data — a reader must be able to read their values and
   compare them. "Muted" means recessive, not erased. Don't hand-pick a lighter
   grey because it looks calmer; the extractor already found the lightest step
   that passes.
3. **At most 2–3 accented items.** Emphasis is a ratio. Highlight four of seven
   bars and neither group reads as figure or ground — at that point go back to
   the full categorical palette, or re-cut the data so the finding really is
   about two things. If your title needs to name four categories, it is probably
   two findings and therefore two panels.

### Scenario notation: measured, planned, projected

A recurring collision: actual vs. forecast, or actual vs. budget, is a
*distinction the reader must see* — but if you spend a palette color on it, you
have no color left for emphasis, and if you don't, a projection looks exactly
like a measurement. That is a data-integrity problem, not just a design one.

The business-reporting convention (IBCS) resolves it by encoding data *status*
in the fill style instead of the hue, which frees color entirely for emphasis:

| Fill | Means | `scenario` value |
|:--|:--|:--|
| Solid | Actual — measured, happened | `'actual'` (default) |
| Outlined | Plan, budget, target — agreed, not yet real | `'plan'` (or `'budget'`) |
| Hatched | Forecast, estimate, projection | `'forecast'` (or `'estimate'`) |

Set it per series, or per point when one series turns from actual to forecast
partway along — which is the common case for a year-to-date column chart:

```js
Charts.column('c1', {
  title: 'Q4 is tracking 8% above plan',
  subtitle: 'Revenue · USD m · solid = actual, outlined = plan, hatched = forecast',
  xAxis: { categories: ['Q1','Q2','Q3','Q4'] },
  series: [
    { name: 'Plan',    data: [40, 44, 48, 52], scenario: 'plan' },
    { name: 'Revenue', color: T.colors[1], data: [
        42, 47, 51,
        { y: 56, scenario: 'forecast' }        // Q4 not closed yet
    ]}
  ]
});
```

Rules:

- **Say what the notation means in the subtitle.** It is a convention, not an
  intuition; one clause covers it. The legend swatch renders in its series'
  notation automatically, which handles the series-level case, but a *point*
  that switches mid-series has no legend entry and needs the subtitle.
- **It composes with emphasis, it doesn't replace it.** Fill style carries
  status; color still carries focus. A hatched bar can be accent-colored — that
  is a projection you want the reader to look at.
- **Never hatch something that was measured** to make a chart look busier, and
  never leave a projection solid. This is the same honesty rule as § 1 of the
  workflow, expressed in pixels.
- Available on `Charts.column` and `Charts.bar`. Lines carry the same
  distinction with a dashed stroke on the projected series — but because stroke
  and colour are per-series, that means splitting actual from forecast into two
  series. See `annotation.md` § Intervention and forecast.

### Grouped columns and bars

Two different findings live in a grouped chart, and they take opposite
treatments. Decide which one the title is making.

**Series-level focus** — *"Direct Sales outperformed Partner channels"*. The
comparison runs across groups, so one series is the subject everywhere:

```js
const T = Charts.theme;
series: [
  { name: 'Direct',   data: [...], color: T.colors[1] },
  { name: 'Partner',  data: [...], color: T.muted, legendColor: T.secondaryColor },
  { name: 'Reseller', data: [...], color: T.mutedScale[1], legendColor: T.secondaryColor }
]
```

Keep the legend — the series still need naming — but subdue the non-focal
entries with `legendColor: T.secondaryColor`. Their swatch already carries the
muted fill, and dropping the label to secondary text stops the legend from
presenting three equal choices when the chart is making one point.

**Cluster focus** — *"West led in every channel"*. Now the subject is one group
on the x-axis, and the series distinction still matters *inside* it. So the
focal cluster keeps the real categorical palette and every other cluster
collapses to the muted ramp:

```js
series: channels.map((ch, si) => ({
  name: ch.name,
  legendColor: T.secondaryColor,
  data: regions.map(r => ({
    y: r[ch.key],
    // Inside West: true series colors. Everywhere else: ordered greys, so the
    // series stay distinguishable without competing for attention.
    color: r.name === 'West' ? T.colors[si] : T.mutedScale[si % T.mutedScale.length]
  }))
}));
```

Here the multi-hue legend actively misleads — it promises colors that only one
cluster uses — so turn it off (`legend: { enabled: false }`) and name the series
inline, in the subtitle ("Direct · Partner · Reseller, left to right"), with the
focal cluster called out by a `callout` or simply named in the title.

### Line charts

**One series among many** — *"Mobile retention diverged from Desktop"*:

```js
series: [
  { name: 'Mobile',  data: [...], color: T.colors[1], lineWidth: 3 },
  { name: 'Desktop', data: [...], color: T.muted, lineWidth: 1.5, dashStyle: 'ShortDash' },
  { name: 'Tablet',  data: [...], color: T.muted, lineWidth: 1.5, dashStyle: 'ShortDash' }
]
```

Weight carries as much of the emphasis as color does — the focal line at the
theme's full `lineWidth` (3) against context lines at 1.5 reads correctly even
in grayscale or for a color-blind reader, which color alone does not. Dashing
the context lines adds a third redundant channel; use it when the muted lines
still crowd the focal one.

Then **replace the legend with end-of-line labels**: `lineLabels: 'inline'`
draws each series name at the end of its own line, tinted to that line's color,
so the muted series get muted labels for free and the reader never traces a
swatch back to a stroke. This is the one sanctioned alternative to the top
legend (see SKILL.md § Legends go in one place) — use it on every line panel of
the page or none.

**A moment, not a series** — *"The drop came after the March update"*. The line
itself is not the subject, so leave it in the neutral default and let the mark
carry the moment: `plotBands` for a window, `plotLines` for an instant, a
`callout` for the sentence. Don't also recolor the line — two emphases on one
chart is none. Full recipe, including forecast notation, in
`annotation.md` § Intervention and forecast.

### Pie and donut

- **Dominant share** — *"Enterprise is 70% of ARR"*: the focal wedge takes solid
  accent, the rest take successive `mutedScale` steps. Better still, when the
  tail is genuinely not the point, merge it into one `Remaining` wedge in
  `T.muted` — two wedges make the 70/30 split instant, where six wedges make the
  reader add up five of them.
- **Link the center to the focus.** A donut's `centerText` should carry the
  focal wedge's color, not the default ink:
  ```js
  plotOptions: { pie: { centerText: { value: '70%', label: 'Enterprise', color: T.colors[1] } } }
  ```
  The tinted number and the solid wedge then read as one statement. Only do this
  when the center stat *is* the focal wedge's value — coloring a grand total in
  the accent implies a link that isn't there.
- Emphasis does not rescue a bad donut. More than six wedges, or parts that
  don't sum to a whole, is still the wrong chart.

## Data labels

**Data labels are on by default in every chart type**, because the value a mark
encodes is what the reader came for and making them trace a bar back to a
gridline is a needless indirection. You mostly reformat them rather than enable
them; turn them off where they'd collide.

```js
plotOptions: { series: { dataLabels: { format: '{y}%' } } }   // reformat
plotOptions: { column: { dataLabels: false } }                // opt out
```

- **Label, or keep the axis — rarely both.** Once every bar carries its value,
  the y-axis ticks are redundant scaffolding. Labels + a light grid is fine;
  labels + heavy ticks + gridlines is three renderings of one number.
- **Turn them off when they'd collide**: more than ~15 bars, or grouped columns
  with 3+ series where the labels overlap. The axis does the job there.
- **Stacked columns**: labels move inside each segment (above a segment is
  where the next one sits), and segments too small to hold their number go
  unlabelled on their own. The exception is a category with a single segment on
  one side of zero — the population-pyramid shape — where the label takes the
  bar's outer end.
- **Format them like the subtitle promises** — `format: '{y}%'`, or round in the
  data. A label reading `0.4729331` is worse than no label.
- **Line charts often want them off** — `dataLabels: false` on the series —
  unless there are few points; a labelled line becomes a wall of text. Placement
  is collision-aware (a label that would overlap one already drawn is dropped,
  not stacked on it), so a dense line silently loses most of its labels, which
  is worse than none. Use `callouts` for the points that matter.

## Reference marks, intervention, thresholds, annotation

Everything you draw *on top of* the data — `plotBands`, `plotLines`, `callouts`,
intervention and forecast notation, threshold colouring, and the
question of when an annotation earns its place — now lives in
`references/annotation.md`. Read it whenever a panel shows an intervention, a
projection, a target, or a labelled anomaly.
