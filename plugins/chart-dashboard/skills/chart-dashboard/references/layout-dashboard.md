# Dashboard layout (`templates/dashboard.html`)

Read with `layout.md`, which holds the rules shared by all three formats.

A 12-column CSS grid with `grid-auto-rows: 340px`. Panels are `.cell` divs with
span classes: `.w4 .w6 .w8 .w12` (columns) and `.h2` (double height). Each cell
holds one `<div class="chart" id="cN">`.

## Compose the grid from the findings — there is no house shape

The single most common failure of this skill is that every page it produces
opens the same way: a wide hero line chart with a donut and a small panel beside
it, then two halves, then a full-width strip. That shape is not wrong — it is
just one answer, and it gets reused because it is the first thing that comes to
mind, not because the data asked for it.

So the grid is **derived**, not recalled. Before writing any HTML, take the
panel plan from step 1 and answer three questions in order:

1. **What is the dominant shape of the analysis?** One trend that everything
   else explains? A comparison between two named things? A ranked list? A
   process that loses volume at each step? A distribution? A set of parallel,
   equally-weighted measures? A geography?
2. **Which single panel is the reason the page exists** — and is there one?
   Often there isn't, and a page with a manufactured hero misleads by layout
   before a single number is read.
3. **What does the reader need second** — the breakdown of the hero, its driver,
   or a different measure entirely?

The answer to (1) picks an opening; (2) and (3) size it. Below are eleven
openings that fall out of common shapes. They are worked examples of the
derivation, **not a menu to pick from at random and not a set to cycle
through** — if your data's shape isn't here, build the row that fits it.

| Dominant shape of the analysis | Opening row that fits it |
|:--|:--|
| One trend dominates; the rest explains it | `w8 h2` hero line, `w4` + `w4` stacked beside it |
| Two things being compared head-to-head | `w6` + `w6` — the comparison is the top row, symmetric because neither side leads |
| A ranking is the finding | `w12` bar ranking (or `barInsightTable`) across the top; the cuts of it come after |
| A funnel / sequence with drop-off | `w12` funnel or waterfall first — the sequence needs the width to stay legible |
| Parallel measures, none dominant | `w4 · w4 · w4` (or `w6 · w6`) of equal weight — the honest layout when nothing leads |
| Distribution or spread is the point | `w6` histogram/box + `w6` scatter; the shape and the relationship together |
| Geography leads | `w8` geofacet + `w4 h2` ranked list of the same measure |
| A few big findings, long tail of detail | one `w12` statement panel, then `w4`s — decreasing weight down the page |
| A scorecard or review: many metrics, each with a trend, a target or a note | `reportTable` (or `barInsightTable` when each row is one number and a sentence) in a `bento flow` row **first**. The charts that explain the misses come after it |
| A matrix the reader will look up: regions × metrics, line items × periods | `table` in a flow row, with `highlight:'scale'` only on the columns whose pattern matters. Add a chart above it only for the one pattern worth stating as a title |
| A finding, plus measures the charts don't show | the chart(s) that state the finding first, then a `table` in a flow row closing the page. Only when its rows carry figures no panel draws, or the reader's job is to look up their own row. A table that reprints a chart's series is padding |

Two rules constrain whatever you build:

- **A hero must be earned.** Give a panel `w8 h2` only when one finding is
  genuinely the reason the page exists. Three co-equal measures get three equal
  cells; promoting one of them is an editorial claim the data doesn't make.
- **Don't repeat last page's opening by reflex.** If the row you just wrote is
  hero-line + donut + small panel, stop and check that it came from question (1)
  rather than from habit. If a donut is in the top row, it should be there
  because composition is the second thing the reader needs — not because the
  hero left a `w4` hole and a donut fits a `w4` hole.

- **Every row adds up to twelve.** A row whose spans fall short leaves a hole
  that reads as a missing panel, and the last row is where it happens: one `w8`
  panel alone at the end wants to be `w12`, and a lone `w4` wants a partner or a
  wider span. The same goes for a content-sized `.bento.flow` row — a table with
  nothing beside it takes the full width rather than sitting in a `w8` with an
  empty quarter. (Narrow screens are handled for you: below 1100px every cell is
  half the grid, and a trailing odd cell takes the whole row so it can't strand
  itself.)
- **A soft `.note` card is for text that belongs to no panel, and it earns its
  cell the same way a chart does.** A caveat that is really a footnote belongs in
  the page footer with the sources and definitions; a note dropped into the grid
  to fill a gap reads as a panel that failed to load.

Reading order is top-to-bottom, so sequence panels by how the reader thinks:
whatever leads → what it's made of → what drove it → who it happened to →
operational detail → summary. The *content* of that sequence changes completely
with the analysis; only the direction of travel is fixed.

With fewer findings, use fewer, wider cells rather than leaving the grid sparse:
three panels read well as `w12` over `w6 + w6`, and two as a pair of `w6`. The
row height (`grid-auto-rows: 340px`) is a desk-reading default — raise it, and
the type scale with it, for anything projected.

The KPI row and the filter bar are optional in the same way: a KPI row earns its
place when there are headline figures a reader quotes ("we did 1.2M, up from
980k"), and is padding when the page's numbers are all relational. Delete the
block rather than filling it with the first three numbers you have.

Breakpoints already in the template: at 1100px everything collapses to 6
columns, at 700px to a single column. Don't add fixed pixel widths to cells.

Charts fill their cell (`.chart {width:100%;height:100%}`) and charts-lib
re-reads the container size on render, so a panel that looks cramped needs a
bigger span, not a chart-level width.

## Size each cell from its data — width and height

The composition table above says *where* a panel goes; this says *how big*.
The two can disagree, and when they do, the data wins: a finding that leads
but has five bars still gets a cell sized for five bars. Pick the span from
**how many values run across** the chart and the height from **how many run
down** it. Charts stretch to fill whatever cell they get, so a wrong span shows
up as slab-wide bars in a flat strip (too wide) or hairlines under slanted
labels (too narrow) — never as an error.

Cell sizes at the template's full width (1600px page, 340px rows), to do the
sums with:

| Span | Inner width | | Height | Inner height |
|:--|:--|:--|:--|:--|
| `w4` | ~490px | | one row | ~330px |
| `w6` | ~750px | | `h2` | ~680px |
| `w8` | ~1,000px | | `.bento.flow` | the content's own |
| `w12` | ~1,520px | | | |

**Across — columns, lines, heatmaps, waterfalls.** A column is about half
its category slot wide (the rest is padding), and an unstacked group splits
that half between its series. Keep each bar at or under ~72px and each category
slot at least 36px. For a single-series or stacked column chart that gives:

| Categories on the x-axis | Spans that fit | Pick |
|:--|:--|:--|
| 2 | none — every span gives slabs | KPI tiles, or a `w4` with `groupPadding: 0.3` |
| 3–4 | `w4` | `w4` |
| 5–6 | `w4`, `w6` | `w4` beside its partner, `w6` in a pair |
| 7–11 | `w4` – `w8` | `w6` |
| 12–19 | `w6`, `w8` | `w8` |
| 20–26 | `w8`, `w12` | `w12` |
| 27–40 | `w12` | `w12` |
| 40+ | none | a horizontal `bar` / `barList`, or bin it |

Grouped columns can go one span wider than this (each bar is a share of its
slot), but the category labels still need their 36px.

A line chart has no bar to go fat, but it has the same labels: 12+ points
wants `w8`, and a 4-point line alone across `w12` is a flat strip — pair it. A
heatmap with 25+ columns and a waterfall with 8+ steps want `w8`+.

**Down — horizontal bars, `barList`, `dumbbell`, `table`.** Each row needs at
least ~18px of height and a bar thicker than ~44px reads as a block. A one-row
cell holds **3–13 bars**, an `h2` **7–33**; past that the list goes in a
`.bento.flow` row (`barList` grows to its rows there). Four bars in an `h2` are
70px-thick slabs — drop the `h2`.
Width matters less here: `w4` holds short labels, `w6` long ones.

**Shape-keeping charts — donut, pie, radar, waffle, packed bubble.** They draw
at the cell's shorter side and centre, so extra width is empty card. `w4` in a
one-row cell; `w6` only when the legend or axis names are long. Never `w8` or
`w12` for one of these — give the spare width to a neighbour.

**The row sets the height for everyone in it.** All cells in a `.bento` row
share its 340px. So a chart that needs more height (a 15-bar list, a tile map)
takes `h2` *with a partner beside it that has two rows' worth of content* —
two stacked `w4`s, or an `h2` ranked list — never an `h2` beside empty space.

When the sums point to a narrower span than the composition wanted, **fill the
row with a partner, not by stretching**: pair the five-bar composition with the
donut it complements (`w6 + w6`), or put it `w4` next to the `w8` it explains.

`check-page.js` runs these sums on column and horizontal-bar charts ("bars
sized to their cell") and names the span that fits.

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
