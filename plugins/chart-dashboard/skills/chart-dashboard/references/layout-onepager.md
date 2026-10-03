# One-pager layout (`templates/onepager.html`)

Read with `layout.md`, which holds the rules shared by every format.

A one-pager is **one printed page, set in columns**: a fixed 730x990px sheet
(portrait) or 990x730 (landscape), sized to the printable area A4 and US Letter
share, so the same file prints as one page on either paper with no shrink-to-fit.

Two facts drive everything else.

**It is a report, not a dashboard on paper.** The body is columns of blocks, the
way a printed brief is set: a heading and a paragraph, a figure with a caption, a
short list, another figure. Prose carries the argument and charts are evidence
for it — the same relationship as `report.html`, compressed onto one sheet. A
page of charts with no sentences is a dashboard, and a dashboard has its own
template. If you find yourself building a KPI tile row, stop: tiles are dashboard
furniture and on paper they read as a widget pasted onto a document. A headline
figure goes in the summary sentence, or in a `.stat` beside the paragraph that
explains it.

**There is no second page and no pointer.** The reader cannot scroll to the rest,
cannot hover for a tooltip, and cannot click a filter. What does not fit gets
cut, and deciding what to cut is the work.

## When it is the right format

Reach for it when the page has to leave the screen: a board handout, a one-page
brief for a meeting, a status sheet pinned to a wall, a PDF attached to a mail.
The tells are "print it", "one page", "handout", "pin it up", "paper", "PDF for
the pack".

Against the other three:

- Not a **dashboard**. A dashboard is a monitoring surface read at a desk, with
  room to scroll and hover, and no prose telling the reader what to think.
- Not a **report**. A report is as long as the argument needs. If the argument
  does not fit one page, that is a report — do not set it in 8pt to make it fit.
- Not a **deck**. A deck has a presenter and one claim per slide. A one-pager
  carries the whole argument at once, unnarrated, in a single glance.

If the user wants "the deck, but as a handout", build the deck — its print path
already gives them one slide per page.

## Compose the argument first

The failure this format is most prone to is a page of two charts and a lot of
white space, which happens when the panels get written before the argument. So:

1. **Write the claims**, in sentences. Three to six of them: what changed, why,
   what it costs, what follows. The headline is the one a reader would repeat;
   the summary under it is the whole argument in two sentences.
2. **Decide which claims need proving.** A claim the reader will accept gets a
   sentence and no figure. A claim that turns on a shape or a ranking gets a
   figure — one, not a figure and a table of the same numbers.
3. **Pick the one exhibit that leads.** If a single chart is the reason the page
   exists, it goes in the full-width band above the columns. If nothing leads,
   drop the band and let the columns have the whole body.
4. **Lay the blocks into the columns** and add up the budget below. Then fill the
   space that is left — with the explanation a reader needs, not with another
   chart.

## The budget

The space is the whole constraint, and it is arithmetic. `scripts/check-page.js`
computes it from the markup and names what does not fit.

### What you have

| | Columns | Column | Body band | Total column run |
|:--|:--|:--|:--|:--|
| Portrait 730x990 | 2 | 360px wide | 804px tall | 1608px |
| Landscape 990x730 | 3 | 323px wide | 544px tall | 1632px |

Both orientations hold about the same amount — landscape is three shorter columns
rather than two taller ones. **A full-width figure band takes its own height plus
~40px off every column**: the template's lead line chart costs 300px, leaving
504px a column.

Going landscape is three changes, not one: swap `--sheet-w` and `--sheet-h`, set
`--cols:3`, *and* set `@page { size: landscape }`. `size: auto` takes the print
dialog's orientation, which is portrait, so a landscape sheet on a portrait page
is split in two — `check-page.js` fails that mismatch and names it.

### What each block costs

| Block | Cost | Notes |
|:--|:--|:--|
| `.blk` heading + 3 lines | ~95px | +17px a line beyond three |
| paragraph alone, per line | 17px | 11px/1.52 at column width |
| `ul.pts`, per item | ~21px | plus 12px under the list |
| `.stat` | ~58px | `.stat-row` puts two side by side for the same cost |
| `.note` | ~85px | 4 lines plus its padding; use one per page |
| `.fig` | class height + ~40px | the caption and the margin under it |

Figure heights are named so the cost is known before anything renders. Pick the
smallest class that clears the engine's `minHeight`:

| Class | Height | Holds |
|:--|:--|:--|
| `.sm` | 200px | table, calendarHeatmap |
| *(none)* | 265px | line, column, bar, scatter, histogram, waterfall, dumbbell |
| `.lg` | 310px | donut, pie, sankey, bubble, packedBubble, radar |
| `.xl` | 430px | geofacet, waffle at column width |

So a 504px column holds one figure and about 150px of text; an 804px column
holds two figures, or one figure and a full half-page of prose. **A page is
roughly three or four figures and six text blocks.** If you have used two charts
and a heading, you have filled a third of it.

### Which charts fit where

A column is 360px wide portrait, 323px landscape, and most engines need 480px.
This is the constraint that catches people:

| Where | Width | Charts that fit |
|:--|:--|:--|
| Portrait column | 360px | `barList`, `radar`, `donut`, `pie`, `packedBubble` |
| Landscape column | 323px | `donut`, `pie`, `packedBubble` |
| Two of three landscape columns | 656px | every chart type |
| `.wide` band | 730 / 990px | every chart type |

A line, column, bar, scatter, waterfall, sankey or heatmap is therefore a `.wide`
band — and a page has room for one, maybe two. **The ranked comparison that
wanted to be a bar chart becomes `Charts.barList`**, which is built for this
width: the category label sits above its own bar, so long names cost nothing.

### The engines that shrink their marks rather than refusing

`barList`, `dumbbell`, `barInsightTable` and `waffle` fill the box they are
given, and when the box is too short they **thin the marks instead of saying so**.
Nothing throws, and the browser audit cannot see it either, because nothing
overflows — the chart is there, the labels and values are right, and the one
thing it encodes has been squeezed out of it. Both of these are worth knowing
before you pick a figure class; `check-page.js` checks both.

**`barList`** draws 6px hairlines instead of 26px bars when it is short.
Measured off the engine, full-thickness bars need:

| Rows | Needs | Class |
|:--|:--|:--|
| 3 | 265px | *(none)* |
| 4 | 310px | `.lg` |
| 5 | 360px | `.xl` |
| 6 | 430px | `.xl` |

Past six rows a ranked list does not belong in a column figure — roll the tail
into "Other", or make it a `.wide` table.

**`waffle`** shrinks its dots. At column width a 100-dot grid draws 2.8px dots in
a 265px figure and 6px in a 310px one, where the whole point is counting units;
they reach a readable ~11px at 380px. So a waffle in a column is `.xl`, and it is
usually better off in the `.wide` band — which is also where it has room to split
into the several panels it is designed for. A binary proportion in a column is a
donut's job.

## What to cut, in order

The claims will not all fit. Work down this list, and stop as soon as the page
fits:

1. **A figure whose claim the reader would accept anyway.** It costs 300px and
   buys agreement you already had.
2. **A chart, down to its number.** A finding that is one value — "attrition held
   at 4.1%" — is a `.stat` or a clause in a sentence, not a figure. This recovers
   the most room for the least loss.
3. **The full-width band**, if its chart does not genuinely lead. It is worth
   300px of both columns — a figure in each column instead.
4. **Two figures into one exhibit**, with `Charts.panels` or a `reportTable`
   whose rows carry both.
5. **Portrait to landscape**, when what is left is many short blocks rather than
   a few tall ones.

What not to cut: the summary under the headline, the units in a subtitle, the
footer's sources, and the note that says a figure is illustrative. Those are what
make the page readable by someone who was not in the room — which is the whole
point of a page that travels on paper.

## Nothing hover-only, nothing interactive

A tooltip does not exist on paper and a `<select>` prints as a grey box showing
one value. So:

- **Data labels stay on.** The library draws them by default. If they collide,
  the fix is fewer categories or a wider figure, not `dataLabels: false` — hiding
  the numbers on a page with no tooltips leaves the reader with nothing.
- **Every value a reader needs is printed**: a data label, an axis tick, a table
  cell, or a sentence.
- **No controls at all.** `check-page.js` fails a one-pager with a `select` or a
  filter bar. A page that needs a filter is a dashboard.

## Chrome: two fixed bands

The masthead (136px) and footer (26px) are fixed heights, not content-sized,
because a masthead that grows steals height from the columns silently.

- **The masthead is a kicker, the headline, a two-sentence summary and the byline
  rule.** The h1 has room for two lines at 20px — enough for a finding, not for a
  finding with its qualifiers attached. The summary is the part most readers
  actually read; write it last, when you know what the page says.
- **The footer is one line**: sources, definitions, and the illustrative-figures
  note. Not a paragraph.
- If a band overflows, `audit.js` reports it — fix the copy, not the band height.

## Not an editable page

Don't offer the editable format for a one-pager (`editable.md` § When to build
one). Everything on the sheet was measured against a fixed box, and an editor
lets someone lengthen a heading on a page with no scrollbar to show what fell off
the bottom of a column.

## Verify it as paper

The usual three steps (SKILL.md step 7), with one addition and one subtraction:

- `check-page.js` does the arithmetic above — the paper, the figures against each
  column, each chart against its engine's minimum, the `barList` row heights, and
  the no-controls rule.
- The browser audit is what sizes the **text**, which no static check can: a
  column whose blocks overrun is reported as `clipped-y` on that column, and
  content past the sheet as `off-sheet`. Both mean content that would be sliced
  off the printed page. Treat them the way a deck treats `off-slide`.
- There is no control to test, because there are no controls.

Then open the print preview once. The screen layout *is* the print layout — the
sheet keeps its authored pixels in both, the only difference being that the 8mm
margin moves from the paper's padding to `@page` — so the preview is a
confirmation, not an inspection. What it confirms is the one thing no measurement
in the page can: that it came out as **one** page.
