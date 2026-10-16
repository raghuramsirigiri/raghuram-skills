# Dashboard layout (`templates/dashboard.html`)

Read with `layout.md`, which holds the rules shared by all three formats.

A 12-column CSS grid with `grid-auto-rows: 340px`. Panels are `.cell` divs with
span classes: `.w4 .w6 .w8 .w12` (columns) and `.h2` (double height). Each cell
holds one `<div class="chart" id="cN">`.

The grid is built in two passes, in this order:

1. **Give every panel its natural cell**, from its chart type and its values,
   before any row exists (§ First, the cell each chart wants).
2. **Pack those cells into rows**, in the order the reader needs the findings
   (§ Then compose the rows from those cells).

The order matters. Decide the rows first and the charts get poured into
whatever holes the rows left: a donut stretched across a 2:1 card, a
twelve-point line flattened into a 3:1 strip, three dumbbell rows floating in a
900px band. Charts stretch to fill any cell they are given, so a wrong cell never
errors. It just looks wrong.

## First, the cell each chart wants

Every chart has a shape it reads best in, and a cell is a shape: its width
divided by its height. Charts fill their cell (`.chart {width:100%;height:100%}`)
and charts-lib re-reads the container size on render, so the cell *is* the
chart's shape. A panel that looks cramped or empty needs a different cell, not a
chart-level width.

Cell shapes at the audit's 1440px viewport, and at the template's full 1600px:

| Cell | Inner size at 1600px | Shape at 1440 / 1600 | Reads as |
|:--|:--|:--|:--|
| `w4` | ~490 × 330 | 1.3 / 1.5 : 1 | square-ish |
| `w6` | ~750 × 330 | 2.0 / 2.3 : 1 | landscape |
| `w8` | ~1,000 × 330 | 2.7 / 3.1 : 1 | strip |
| `w12` | ~1,520 × 330 | 4.1 / 4.7 : 1 | band |
| `w4 h2` | ~490 × 680 | 0.6 / 0.7 : 1 | tall column |
| `w6 h2` | ~750 × 680 | 1.0 / 1.1 : 1 | square |
| `w8 h2` | ~1,000 × 680 | 1.3 / 1.5 : 1 | square-ish, large |
| `w12 h2` | ~1,520 × 680 | 2.0 / 2.2 : 1 | landscape, large |
| `.bento.flow` | content | content | as tall as its rows |

So going wider in one row turns a cell into a strip. A panel that should get
more room keeps its shape by going `h2`: `w8 h2` is the same shape as `w4`,
just bigger.

### The four shape families

Find the chart's family, then its value count, and read off the cell.

| Family | Charts | Shape it wants | Cells that fit |
|:--|:--|:--|:--|
| **Round** | `donut`, `pie`, `radar`, `packedBubble`, `waffle` | ~1:1 to 1.5:1. Drawn at the cell's shorter side and centred, so any extra width is empty card | `w4`; `w6 h2` or `w8 h2` only when it is the lead |
| **Plotted** | `line`, `column`, `histogram`, `waterfall`, `scatter`, `bubble` | 1.3:1 to 2.3:1. Only a long x earns a strip | `w4`, `w6`, `w8 h2`, `w12 h2`. `w8` or `w12` in one row only when the x-axis is long (below) |
| **Listed** | `bar`, `barList`, `dumbbell` | height from the row count, width from the labels | 3–13 rows: one row. 7–33 rows: `h2`. More: `barList` in a flow row. `w4` for short labels, `w6` for long ones |
| **Wide** | `table`, `reportTable`, `barInsightTable`, `panels`, `heatmap`, `calendarHeatmap`, `sankey`, `geofacet` | follows the content | tables in a flow row (§ Tables size themselves). `panels` gets ~`w4` of width per panel. `heatmap` gets width by column count. `sankey`: `w6` for 2–3 stages, `w8`–`w12` for more. `geofacet`: `w8 h2`, or `w6 h2` for a compact region |

Never put a round chart in a one-row `w6`, `w8` or `w12` cell, or in `w4 h2`.
Never put a plotted chart in `w4 h2` (a tall, narrow column with nothing to
fill the height). And never put `scatter` or `bubble` in a strip: the
relationship they show needs height as much as width.

### Plotted charts: count across

The x-axis count decides the width, and only a long x-axis earns a strip.

A column is about half its category slot wide (the rest is padding), and an
unstacked group splits that half between its series. Keep each bar at or under
~72px and each category slot at least 36px. For a single-series or stacked
column chart that gives:

| Categories on the x-axis | Spans that fit | Pick |
|:--|:--|:--|
| 2 | none: every span gives slabs | KPI tiles, or a `w4` with `groupPadding: 0.3` |
| 3–4 | `w4` | `w4` |
| 5–6 | `w4`, `w6` | `w4` beside its partner, `w6` in a pair |
| 7–11 | `w4`, `w6`, `w8 h2` | `w6`, or `w8 h2` as the lead |
| 12–19 | `w6`, `w8` | `w8` (a strip, which this many categories earns) or `w8 h2` |
| 20–26 | `w8`, `w12` | `w12`, or `w8` |
| 27–40 | `w12` | `w12` |
| 40+ | none | a horizontal `bar` / `barList`, or bin it |

Grouped columns can go one span wider than this (each bar is a share of its
slot), but the category labels still need their 36px, and a strip is earned by
bars across, not categories: five categories of two series is ten bars, still
short of a `w8` strip.

- **Line**: up to 23 points reads well at `w4` or `w6`, or at `w8 h2` as the
  lead. It earns a one-row `w8` strip at 24+ points, and a `w12` band at 40+. A
  12-point line across `w8` is a flat strip: keep it `w6`, or make it the
  `w8 h2` lead.
- **Waterfall and histogram**: count steps or bins like columns. Under 12 they
  sit in `w4`–`w6`, at 12+ they earn `w8`, and at 20+ they earn `w12`.
- **Scatter and bubble**: `w4` or `w6`, or `w6 h2` / `w8 h2` when it leads.
  Never a one-row `w8` or `w12`.

### Listed charts: count down

For horizontal `bar`, `barList` and `dumbbell`, each row needs at least ~18px
of height, and a bar thicker than ~44px reads as a block. A one-row cell holds
**3–13 bars**, an `h2` holds **7–33**, and past that the list goes in a
`.bento.flow` row (`barList` grows to its rows there). Four bars in an `h2` are
70px-thick slabs, so drop the `h2`.

Width only adds bar length. `w4` holds short labels and `w6` long ones. Six or
fewer rows across a one-row `w8` or `w12` is a band of empty card around a few
lines.

### The row sets the height for everyone in it

All cells in a `.bento` row share its 340px. So a chart that needs more height
(a 15-bar list, a tile map, the lead panel) takes `h2` *with a partner beside it
that has two rows' worth of content*: two stacked `w4`s, or an `h2` ranked
list. Never put an `h2` beside empty space.

### Write the cell down before any row

Extend the step-1 panel plan with two columns: the chart's family and value
count, and the cell they give. For example:

| Panel | Chart | Family, count | Natural cell |
|:--|:--|:--|:--|
| Revenue by month | `line` | plotted, 18 points | `w6`, or `w8 h2` if it leads |
| Channel mix | `donut` | round, 4 slices | `w4` |
| Top 10 SKUs | `bar` | listed, 10 rows | `w4` (one row) or `w4 h2` |
| Regions × metrics | `table` | wide, 8 rows | flow row, `w8` |

Composition then works with these cells as given. If the cells won't pack into
rows of twelve, change the panel set or the chart, not the cell. A donut with no
round or `w4` partner can become a short `barList` that pairs at `w6`. A
twelve-point line that would be stranded alone can lead as `w8 h2` beside two
stacked `w4`s.

`check-page.js` runs these sums. "Bars sized to their cell" checks column and
bar counts and names the span that fits. "Cells match their chart's shape"
fails a round chart in a landscape cell, a plotted chart in a strip its
x-axis hasn't earned, a short list in a wide band, and a two- or three-stage
sankey stretched past 3:1. A chart given its own pixel height in a flow row
is checked as the fixed box it is.

## Then compose the rows from those cells

The single most common failure of this skill is that every page it produces
opens the same way: a wide hero line chart with a donut and a small panel beside
it, then two halves, then a full-width strip. That shape is not wrong. It is
just one answer, and it gets reused because it is the first thing that comes to
mind, not because the data asked for it.

So the grid is **derived**, not recalled. With the natural cells written down,
answer three questions in order:

1. **What is the dominant shape of the analysis?** One trend that everything
   else explains? A comparison between two named things? A ranked list? A
   process that loses volume at each step? A distribution? A set of parallel,
   equally weighted measures? A geography?
2. **Which single panel is the reason the page exists**, and is there one?
   Often there isn't, and a page with a manufactured hero misleads by layout
   before a single number is read.
3. **What does the reader need second**: the breakdown of the hero, its driver,
   or a different measure entirely?

The answer to (1) picks an opening, and (2) and (3) order the rows. Emphasis
comes from order and from `h2`, never from stretching a panel across a row it
doesn't fill.

### Rows that keep every cell in shape

Every cell in a row shares the row's height, so a row is a set of cells whose
shapes agree:

| Row | Cell shapes | Holds |
|:--|:--|:--|
| `w4 · w4 · w4` | three square-ish | any mix of round and plotted panels and short lists. The most common row, and the honest one when nothing leads |
| `w6 · w6` | two landscape | two plotted panels or two lists. Not a round chart: it would sit in half its card |
| `w4 · w8` | square-ish + strip | a round or short panel beside a plotted panel whose x-axis earned the strip, or a sankey |
| `w12` | band | a 40+ point line, a 20+ column chart, a wide heatmap, a many-stage sankey, `panels` |
| `w8 h2` + `w4` over `w4` | three square-ish | the lead panel with two smaller ones stacked beside it |
| `w8 h2` + `w4 h2` | square-ish + tall | the lead panel with a 7–33-row ranked list |
| `w6 h2` + `w6 h2` | two square | two leads that need height: scatter, map, a large donut |
| `.bento.flow` | content | tables, and lists past 33 rows |

### Openings that fall out of common shapes

These are worked examples of the derivation, **not a menu to pick from at
random and not a set to cycle through**. If your data's shape isn't here,
build the row that fits it.

| Dominant shape of the analysis | Opening row that fits it |
|:--|:--|
| One trend dominates; the rest explains it | `w8 h2` lead line, with `w4` over `w4` beside it |
| Two things compared head-to-head | `w6 · w6` when both are plotted or listed. Neither side leads, so the row is symmetric. Two donuts go `w4 · w4` with the `w4` that explains the gap |
| A ranking is the finding | `barInsightTable` in a flow row, or a `bar` in `w4 h2` beside the `w8 h2` that cuts it. Not a short bar list stretched across `w12` |
| A funnel / sequence with drop-off | a waterfall sized by its steps (under 12: `w6`; 12+: `w8`; 20+: `w12`) or a sankey sized by its stages, in the first row |
| Parallel measures, none dominant | `w4 · w4 · w4` of equal weight. This is the honest layout when nothing leads |
| Distribution or spread is the point | `w6` histogram + `w6` scatter: the shape and the relationship together |
| Geography leads | `w8 h2` geofacet + `w4 h2` ranked list of the same measure |
| A few big findings, long tail of detail | the big ones as `w8 h2` leads or `w6 h2` pairs, then rows of `w4`, so weight decreases down the page |
| A scorecard or review: many metrics, each with a trend, a target or a note | `reportTable` (or `barInsightTable` when each row is one number and a sentence) in a `bento flow` row **first**. The charts that explain the misses come after it |
| A matrix the reader will look up: regions × metrics, line items × periods | `table` in a flow row, with `highlight:'scale'` only on the columns whose pattern matters. Add a chart above it only for the one pattern worth stating as a title |
| A finding, plus measures the charts don't show | the chart(s) that state the finding first, then a `table` in a flow row closing the page. Only when its rows carry figures no panel draws, or the reader's job is to look up their own row. A table that reprints a chart's series is padding |

### Rules that constrain whatever you build

- **A hero must be earned.** Give a panel `w8 h2` only when one finding is
  genuinely the reason the page exists. Three co-equal measures get three equal
  cells. Promoting one of them is an editorial claim the data doesn't make.
- **Don't repeat last page's opening by reflex.** If the row you just wrote is
  hero line + donut + small panel, stop and check that it came from question (1)
  rather than from habit. If a donut is in the top row, it should be there
  because composition is the second thing the reader needs, not because the
  hero left a `w4` hole and a donut fits a `w4` hole.
- **The data wins over the composition.** A finding that leads but has five
  bars still gets a cell sized for five bars. When the sums point to a narrower
  span than the composition wanted, **fill the row with a partner, not by
  stretching**. Pair the five-bar composition with the panel it complements, or
  put it `w4` next to the `w8 h2` it explains.
- **Every row adds up to twelve.** A row whose spans fall short leaves a hole
  that reads as a missing panel, and the last row is where it happens. A lone
  panel at the end wants a partner, or a re-pack of the rows above. Widen it to
  `w12` only when its shape allows: a long x-axis, a wide heatmap, a table in a
  flow row. A twelve-point line or a donut across `w12` is a strip with a chart
  lost in it. The same goes for a content-sized `.bento.flow` row: a table with
  nothing beside it takes the full width rather than sitting in a `w8` with an
  empty quarter. (Narrow screens are handled for you. Below 1100px every cell
  is half the grid, about 1.5:1, and a trailing odd cell takes the whole row so
  it can't strand itself.)
- **A soft `.note` card is for text that belongs to no panel, and it earns its
  cell the same way a chart does.** A caveat that is really a footnote belongs in
  the page footer with the sources and definitions. A note dropped into the grid
  to fill a gap reads as a panel that failed to load.

Reading order is top-to-bottom, so sequence panels by how the reader thinks:
whatever leads → what it's made of → what drove it → who it happened to →
operational detail → summary. The *content* of that sequence changes completely
with the analysis. Only the direction of travel is fixed.

With fewer findings, use fewer, larger cells rather than leaving the grid
sparse, and make them larger by going taller as well as wider, so each keeps
its shape. Three panels read well as a `w8 h2` lead with two `w4`s stacked
beside it, or as `w4 · w4 · w4`. Two read well as a `w6 h2` pair. The row height
(`grid-auto-rows: 340px`) is a desk-reading default. Raise it, and the type
scale with it, for anything projected.

The KPI row and the filter bar are optional in the same way. A KPI row earns
its place when there are headline figures a reader quotes ("we did 1.2M, up
from 980k"), and is padding when the page's numbers are all relational. Delete
the block rather than filling it with the first three numbers you have.

Breakpoints already in the template: at 1100px everything collapses to 6
columns, at 700px to a single column. Don't add fixed pixel widths to cells.

## Tables size themselves — don't box them into grid rows

`table`, `reportTable` and `barInsightTable` are as tall as their rows. They
grow to fit only when their container has **no** height. The bento's fixed
row height (340px, or 696px with `.h2`) gives them one, so the engine stretches
each row by a capped amount and leaves the rest as a blank band under the last
row. Picking `h2` because "a table needs room" is the reflex that causes it.

- Put them in a **separate content-sized row**, before, after or between the
  fixed grids. A flow row can open the page when the table *is* the finding,
  as with a scorecard:
  ```html
  <div class="bento flow">
    <div class="cell w8"><div class="chart" id="c6"></div></div>
  </div>
  ```
  Never `.h2` on these, and never a cell in a normal `.bento`. `check-page.js`
  fails the page if you do.
- **Pick the span from the table's natural width, not from "full width".** In
  `reportTable` the text and KPI columns stop growing at their preferred width
  (insight ≈ 240px) and a chart column absorbs *all* the remaining width. A
  `w12` table with a 3-point mini-chart gets a 1,200px plot of three bars. Size
  the chart column to its data with the column's `width` (≈ 80–100px per bar or
  category, 240–320px for a sparkline), then choose the smallest span that holds
  the table — usually `w8` or `w6`. Reach for `w12` only when there are many
  columns or a chart column really has many points.
- `dumbbell`, `barList` and `waffle` are also marked self-sizing, but they fill
  a fixed cell sensibly; keep them in the normal grid and choose the cell height
  for the number of rows.
