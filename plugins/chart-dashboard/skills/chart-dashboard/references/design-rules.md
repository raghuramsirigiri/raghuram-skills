# Design rules (SKILL.md § Rules that keep output good)

The full form of the rules SKILL.md lists in one line each. Read it once per
page, before writing panel titles and chart configs — every page breaks one of
these by default if nobody looks.

## The short rules

- One idea per panel. A panel whose title needs "and" to join two separate
  claims is two panels. When the "and" joins two halves of one claim that only
  the pair can prove, it is one exhibit: `Charts.panels` under one title
  (`chart-selection.md` § When several charts are one exhibit).
- Lead with the finding that matters most: if one trend is the reason the page
  exists, give it the wide top-left cell (`w8 h2`). If nothing dominates — three
  equally important measures, say — don't manufacture a hero; equal panels are
  the honest layout. The rest of the grid follows the same logic: the shape of
  the analysis picks the rows, and a layout reused from the last page is a layout
  that describes the last page's data (`references/layout-dashboard.md`).
- Every panel gets a `title` and a `subtitle` that states units and scope
  ("USD thousands · Q4 2025"). Put units in `yAxis.suffix` and
  `tooltip.valueSuffix` too.
- A projection is never drawn in the same stroke as a measurement: dash the
  forecast (or `scenario:'forecast'` on bars) and name the notation in the
  subtitle. See `references/annotation.md`.
- Match the chart to what the data *is*, not to what looks good: a line only
  where x is time or a number, a donut/waffle only where the parts are
  non-negative and sum to one whole, a scatter only where both axes are
  measures. See `chart-selection.md` § Input contract.
- Order categorical bars by value, not alphabetically. Keep time on the x-axis
  left-to-right.
- Donuts stop being readable somewhere around six wedges — below a few percent
  the angles are indistinguishable and the reader is just reading the legend.
  Roll the tail into "Other", or use a ranked bar list if the tail is the point.
- Don't restate a series in two panels unless the second adds a new cut.
- Annotate what matters: `callouts: [{ x, text }]` on line charts for spikes,
  launches, and anomalies mentioned by the user.

## How many charts? One per finding — no quota, no padding

The page is not a container to fill up. Each panel should answer a question the
reader actually has, and the count falls out of the data rather than out of a
target. Ask of every panel: *what would the reader do differently after seeing
this?* If the answer is nothing, it isn't a panel.

That cuts both ways, and both failures are common:

- **Padding.** Given four numbers from an A/B test, the honest page is two or
  three panels and a plain statement of the lift. Filling a twelve-cell grid
  means inventing a donut of two nearly-identical sample sizes, a fabricated
  daily time series, a "by segment" split nobody measured. The moment you are
  reaching for something to chart, you have run past the end of the data — stop
  there. A small page that answers the question is a better deliverable than a
  full grid that pads it, even though the full grid looks more impressive at a
  glance.
- **Compression.** Given twenty measures that each carry a finding, don't force
  them into eight panels by stacking unrelated series onto shared axes. Let the
  page be long.

When there are only a few panels, widen them (`w6`/`w8`/`w12`) so the grid still
reads as a designed page rather than a half-empty one — a two-panel dashboard is
two big panels, not two small panels marooned top-left.

Reports work the same way: a figure exists because a claim in the prose needs
evidence. A section that states no claim needs no chart, and a claim the reader
will accept without proof doesn't need one either.

## Fit the page to how it will be read

The dashboard and report templates are tuned for someone reading at a desk.
When the user tells you otherwise — "I'm presenting this", "send it round",
"print it" — the same page fails badly in that other context. Two of those
cases have their own template: a deck (`templates/slides.html`) is the right
answer to "I'm presenting this", not a dashboard with the type scaled up, and a
one-pager (`templates/onepager.html`) is the right answer to "print it", not a
dashboard that happens to fit. For "send it round" the fix is how much you put
on the page and at what size, never a different design system. All the cases are
in `references/layout.md` § Fit the page to how it will be read.

## Make the chart show the finding, not just the data

Three defaults in charts-lib are deliberately plain, and taking them as-is is
how a page ends up technically correct and useless. Override them on purpose:

- **Emphasis.** Read the title you just wrote. If it names specific categories,
  a specific series, or a specific moment — "the top two account for 90%",
  "Direct outperformed Partner", "the drop came after the March update" — the
  chart leaves categorical mode and enters emphasis mode: the subject takes the
  accent, everything else takes `Charts.theme.muted`. A finding stated in words
  above eight identical bars is a finding the reader has to re-derive.

  The mechanism differs by what the subject is — per-point `color` for
  categories, series `color` + `lineWidth` for one line among many, `plotBands`
  and `callouts` for a moment, a tinted `centerText` for a donut's focal wedge.
  All of them, plus the grouped-chart series-vs-cluster split, are in
  `references/chart-selection.md` § Emphasis. Three constraints hold across all
  of them: **two colors, not a rainbow** (multi-hue *and* an accent reads as no
  emphasis at all), **at most 2–3 accented items** (past that, go back to the
  full categorical palette), and **muted still has to be readable** — context
  bars are data too, which is why `muted` is derived at 3:1 against the canvas
  rather than picked for how quiet it looks.

  **In a deck, emphasis mode is the exception and the plain ramp is the
  default.** Not a different rule — the same one, biting harder: a deck is where
  the urge to make the point is strongest, and a grey supporting bar stops
  saying anything by the third slide that has one. Write no `color` unless the
  chart's own title names the points it means.

  Three standing rules that apply whether or not the chart is in emphasis mode:
  residual categories ("Other", "Don't know", a rolled-up tail) always take
  `muted`, since they can never be the finding; several context series take one
  identical mute rather than a ramp, so they read as a single band; and one
  emphasis per chart — an accented bar *and* a callout on that same bar is two
  competing signals, not double the emphasis.
- **Status vs. emphasis.** When a chart mixes measured, planned, and projected
  numbers, don't spend a palette color on the distinction — encode it in the
  fill with `scenario: 'plan' | 'forecast'` (outlined / hatched) and keep color
  for the finding. A projection drawn identically to a measurement is the same
  failure as inventing the number.
- **Data labels.** The library draws them in every chart type by default. Opt
  out with `dataLabels: false` where they'd collide — dense lines, many bars,
  grouped columns with 3+ series. See `references/chart-selection.md` § Data labels.
- **Geofacet variant.** `'bar'` is what you get by typing nothing, which is not
  a reason to use it three times on one page. `'heat'` when the spatial pattern
  is the point, `'gauge'` when regions are measured against a shared target.
  See `references/chart-api.md` § Geofacet.

## If you add a control, wire it

A dropdown that doesn't change the charts is worse than no dropdown: it reads as
a broken page, and the reader stops trusting the numbers that *are* correct. So
either add no controls at all — a static page is a perfectly good deliverable —
or wire them completely, which means the data is filtered rather than the label,
every dependent panel re-renders, and any action title recomputes from the same
filtered rows. Redraw through a helper that calls the old chart's `destroy()`
first: without it, old charts' resize observers keep repainting the unfiltered
chart on every window resize, and they pile up with each filter change. **If the page has a control, read `references/controls.md`**: it
has the `render(state)` and `draw()` pattern in full, the guards to apply before shipping
one, and the cases where small multiples beat a filter.

## Legends go in one place

charts-lib puts the legend at the top, under the subtitle, and shows it
automatically once a chart has two or more series or wedges. Leave it there. A
reader scanning a grid of panels learns the legend's location once; a page where
it sits above one chart, beside another and below a third makes them re-hunt for
it every time, and that hunting is the entire cost of an inconsistent layout.

So: don't pass `legend` position options per chart, don't build legends in HTML
next to the chart, and don't hand-place colored dots in a panel's corner. If a
legend genuinely doesn't earn its space — single-series panels, or a donut whose
wedges are already labelled by callouts — turn it off with
`legend: { enabled: false }` **for every panel in that situation**, not just the
cramped one. The only sanctioned alternative is charts-lib's own
`lineLabels: 'inline'`, and if you use it on one line chart, use it on all of
them.

## Put the finding in the title

A chart titled "Weekly throughput by site" makes the reader do the work of
finding the point. A chart titled "Throughput fell 12% the week of the WMS
cutover" hands it to them and then proves it underneath — the insight lives in
the chart's own hierarchy, so it travels with the figure into a screenshot, a
slide, or an email. The finding goes in `title`, the units and scope stay in
`subtitle`.

The line that keeps this from becoming editorializing is whether the chart
proves the sentence: "Billing drives 27% of all tickets" is measurable off the
chart, "Billing is a serious problem" is a verdict the reader should reach
themselves. When no single finding dominates, a plain descriptive title is the
honest choice — don't manufacture a headline.

**Read `references/narrative.md` before writing the titles.** It has the
write-this/not-this table, the length budget per cell, and the three-way choice
between an action title, `Charts.barInsightTable`, and a soft surface card —
including the rule that stops the same sentence appearing in two of them.

## Nothing on the page that isn't data or its labels

- No invented narrative furniture that repeats what a chart already says: no
  "Key insight" banners, no "Executive summary" you wrote yourself, no
  highlighted takeaway strip across the top, no emoji, no "🚀".
- The header is title, one line of scope, and the reporting window. The footer is
  sources, definitions, and any honesty notes (illustrative figures, carried-
  forward panels, data-quality caveats). Nothing else belongs in either.
- Conclusions the user themselves stated ("the March spike is the thing I need to
  explain") belong on the relevant chart — as its title or a callout, in their
  framing — not restated as your own analysis in a banner.

## One design system, only the colors change

Every visible component follows charts-lib's design language: its type scale,
weights, spacing rhythm, stroke widths, hairlines, legend position and chart
geometry. Those proportions are what make ten different chart types read as one
family, and the page chrome inherits them so the cards don't look bolted on.

The colors are the exception, and the only exception. When a user supplies a
brand, recolor via `Charts.applyPalette` — once, before the first factory call,
never per chart — and let the page chrome pick those same values up from the sync
block in the template. Corner radius may follow the brand too, since square vs.
rounded is a brand signature the charts themselves don't express.

Do not introduce a second visual system on top: no custom card headers with
their own type scale, no gradient hero panels, no shadows or borders the template
doesn't already have.

Type is the one place where copying the brand usually backfires. Most brand faces
are licensed webfonts you cannot load into a local file, and naming one in
`font-family` just falls through to a system fallback you didn't choose — worse
than keeping charts-lib's stack, which was picked to work at 11px in a chart. In
a chart the cost is not only aesthetic: the engines measure label widths against
the face they think they have, so a substituted one makes axis labels the engine
had fitted collide. And a page that reaches for a webfont stops being standalone
(SKILL.md step 8). Match the brand's font only when the face is genuinely available — a
system font, or a file the user supplied. `extract-theme.js` reports the
design's face and says outright whether it is loadable; when it isn't, keep the
template stack and tell the user which face you couldn't use and why. Full
method in `references/theming.md`.

The page has exactly five kinds of component, all already in the template:
**header**, optional **KPI row**, **chart panels**, optional **soft surface
card** (`.note`), **footer**. The KPI row
exists because headline figures genuinely help — use the template's `.kpi`
markup, which is sized off the chart type scale so the tiles look like they
belong to the same page. Writing your own KPI strip with new CSS is the most
common way this page ends up looking like two designs stapled together, and it
is the thing to resist even though it feels helpful. A KPI tile is a label, a
number, and at most one line of plain context — no arrows, no red/green verdicts,
no "▲ 12% vs LY" badges.

If you find yourself writing new CSS classes, stop and ask whether a chart panel
would carry the information better. Usually it would.
