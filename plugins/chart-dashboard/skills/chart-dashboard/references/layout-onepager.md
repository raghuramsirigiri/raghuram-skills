# One-pager layout (`templates/onepager.html`)

Read with `layout.md`, which holds the rules shared by every format.

A one-pager is **one printed page, set in columns**: a fixed 730x1060px sheet,
which is A4's printable area less 8mm margins.

**Pick the paper the page will be printed on.** A fixed box cannot fill both A4
and US Letter — their printable areas differ by 19mm of height — so the sheet and
`@page { size }` name one and move together:

| Paper | `--sheet-w` / `--sheet-h` | `--paper-w` / `--paper-h` | `@page size` |
|:--|:--|:--|:--|
| A4 (the default) | 730 / 1060 | 790 / 1120 | `A4` |
| US Letter | 750 / 990 | 812 / 1052 | `Letter` |

The sheet is the content; the paper is the physical page, about 1mm inside it so
that a fraction of rounding cannot paginate a blank second sheet. `--margin` is
the gutter between them.

Printing an A4 sheet on Letter still works; the dialog scales it about 5%.
`check-page.js` checks the sheet against the paper it declares, fails one that
overruns it, and notes one that leaves more than 8mm unused.

**Printing it:** leave the dialog's Margins at Default (which honours `@page`)
or None. Minimum or Custom makes the browser impose its own margin, shrink the
page to fit inside it, and put back the white frame.

**The gutter lives inside the paper, not in `@page`.** `@page { margin: 0 }`, and
the paper carries `padding: var(--margin)` and its own background. Nothing in the
`@page` margin box is ever painted, so putting the gutter there leaves it white:
the sheet comes out of the printer as a cream page inside a white frame, which
looks like a rendering fault and does not match what the screen showed. A printer
with an unprintable edge clips a few mm of the background and nothing else,
because the content stays inside the gutter.

Three things drive everything else.

**It is a report, not a dashboard on paper.** The body is columns of blocks, the
way a printed brief is set: a heading and a paragraph, a figure with a caption, a
short list, another figure. Prose carries the argument and charts are evidence
for it — the same relationship as `report.html`, compressed onto one sheet. Never
build a KPI tile row: tiles are dashboard furniture, and on paper they read as a
widget pasted onto a document. Nor a tile with the tile taken off — a number set
large over a small grey label is the same thing. The first version of this format
set them at 21px, which was *larger than the page's own headline*, so they became
the loudest thing on the sheet.

A headline figure goes in the summary sentence, or in a `.facts` line: the number
bold at the size of a section heading with its meaning running on after it, two
or three lines bounded by a hairline. That is how a brief states a figure.

**Pack it.** This format fails by under-spending the page. Two columns of
357x900px is 1800px of column run, which is something like five figures and nine
text blocks. A page carrying two charts and a lot of white space has used a third
of the paper it asked for. `check-page.js` reports how much of each column the
figures hold, so the emptiness is visible before you ship it.

**There is no second page and no pointer.** The reader cannot scroll to the rest,
cannot hover for a tooltip, and cannot click a filter.

## When it is the right format

Reach for it when the page has to leave the screen: a board handout, a one-page
brief for a meeting, a status sheet pinned to a wall, a PDF attached to a mail.
The tells are "print it", "one page", "handout", "pin it up", "paper", "PDF for
the pack".

Against the other three: a **dashboard** is a monitoring surface read at a desk,
with room to scroll and hover and no prose; a **report** is as long as the
argument needs, so if the argument will not fit one page, build that instead of
setting this in 8pt; a **deck** has a presenter and one claim per slide. If the
user wants "the deck, but as a handout", build the deck — its print path already
gives one slide per page.

## Compose it

Nothing about the page's shape is fixed except the sheet. Derive the rest:

1. **Write the claims** as sentences. Five or six: what changed, why, what it
   costs, what you ruled out, what follows, what you need.
2. **Decide which need proving.** A claim the reader will accept gets a sentence.
   A claim that turns on a shape, a ranking or a split gets a figure.
3. **Choose the column tracks** from that content, as `--cols`. Any CSS track
   list works and the checker reads it:

   | `--cols` | Portrait (730) | Use it when |
   |:--|:--|:--|
   | `1fr 1fr` | 357 / 357 | the default: blocks of similar weight |
   | `1.4fr 1fr` | 427 / 287 | one wide exhibit, commentary beside it |
   | `1fr 1fr 1fr` | 233 each | many short blocks; too narrow for charts |

   Landscape (990 wide) takes `1fr 1fr 1fr` at 319px each.
4. **Lay the blocks into the columns** and add up the budget below.
5. **Fill what is left** — with the explanation a reader needs, not with another
   chart.

## The budget

| Block | Cost in a column |
|:--|:--|
| `.blk` heading + 3 lines | ~70px (+15px a line beyond three) |
| `.fig` | the `--fig-h` you give it, + ~25px for the caption |
| `ul.pts` | ~20px an item |
| `.facts` | ~25px a line, hairline-bounded |
| `.note` | ~60px |

**A4 portrait gives 900px a column, landscape 544px.** A full-width `.wide` band
takes its height plus ~25px off every column, which is why it is for the rare
exhibit that genuinely needs the sheet — a geofacet, a sankey, a long ranking —
and not for ordinary charts.

None of the five blocks is compulsory. A page with no list and no note is a
normal page, not an incomplete one.

**The note has to earn its 60px.** It is the block most likely to be furniture,
because it exists in the vocabulary and so ends up on the page, and what it then
says is whatever was already said somewhere else. A one-pager this skill built
shipped a "How to read the figures" note explaining that the median is used and
the mean is 9.1h — word for word what the figure's caption said two inches above
it. Both halves were correct, which is why rendering the page did not reveal it.

So before keeping a note, read it against the captions, the chart subtitles and
the prose, and ask what the page loses without it. If the answer is nothing, that
is 60px for something the page does not yet say. `check-page.js` lifts a run of
six words from each note and looks for it in the captions and chart headings —
the `nothing said twice` check.

## Size each figure to its chart

This is where the space is won or lost. **Charts go in columns.** A 357px column
holds a line, column, bar, scatter, waterfall or histogram perfectly well at this
format's type scale — a twelve-week line chart reads at `--fig-h:170px`.

The manifest's `minWidth` / `minHeight` are the sizes a chart *wants on a
screen*, not sizes it refuses below: a 12-point line at 280px still draws, it
just thins its axis labels. So on a one-pager `check-page.js` reports falling
under them as a **note**, not a failure, and only fails below 60% of the wanted
size — where a line's ticks drop to a third of its points and a donut's ring
stops being a ring. Use the note as a prompt to look at the labels in the
browser, not as an instruction to grow the figure.

Measured starting points at column width:

| Chart | `--fig-h` |
|:--|:--|
| line / column / bar, up to ~12 points | 160–180px |
| scatter, histogram, waterfall | 180–200px |
| `barList`, 4 rows at tightened metrics | 210–225px |
| donut / pie | 200px+, and see below |
| geofacet, sankey | `.wide`, 300px+ |

Two engines need watching, because both **shrink their marks rather than refusing
a box that is too small** — nothing throws, nothing overflows, and the browser
audit cannot see either:

- **`barList`** thins its bars. Its natural height is `rows × (barHeight +
  rowGap + 14) + 65`, and `barHeight` / `rowGap` are options — dropping them from
  the default 26/22 to 15/11 takes a four-row list from 310px to 225px, which is
  the single biggest space saving available in a column. `class="fig auto"` drops
  the height instead and lets it grow to its own rows. `check-page.js` checks
  this against the metrics you actually set.
- **`donut`** wastes more of its box than anything else here: its ring is only
  about 40% of the figure's height once the connector labels have taken their
  margins, so a 310px donut draws a 120px ring. In a column, a two- or
  three-part split reads better as a `barList` with `valueSuffix: '%'`. Keep the
  donut for the `.wide` band or for a page with room to spare.

One consequence of small figures: the library drops data labels that would
collide, so a 12-point line at 160px ends up labelling about half its points.
That is fine on paper **because the axis ticks are still there** — the rule is
that no value is hover-only, not that every point carries a label. If the exact
values matter more than the shape, the figure wants more height or fewer points.

## Chart type is scaled down, once

The template calls `Charts.applyMetrics` before the first chart, shrinking the
title to 13px and the heading band from 80px to 56px. This skill otherwise leaves
chart metrics alone — the scale and spacing are what make the engines read as one
family — and the one-pager is the sanctioned exception, for the same reason a
wall display may scale them up (`layout.md` § Fit the page to how it will be
read). A 357x170 figure needs type sized for it; the default 17px title over an
80px heading band would eat half the figure.

Keep the call as the template ships it. If a page needs different values, change
them there, once, before the first chart — never per chart.

## Nothing hover-only, nothing interactive

A tooltip does not exist on paper and a `<select>` prints as a grey box showing
one value. So:

- **Data labels stay on.** The library draws them by default; leave them on.
- **Every value a reader needs is printed**: a data label, an axis tick, a table
  cell, or a sentence.
- **No controls at all.** `check-page.js` fails a one-pager with a `select` or a
  filter bar. A page that needs a filter is a dashboard.

## Chrome: two fixed bands

The masthead (118px) and footer (22px) are fixed heights, not content-sized,
because a masthead that grows steals height from the columns silently.

- **The masthead is a kicker, the headline, a two-sentence summary and the byline
  rule.** The summary is the part most readers actually read; write it last.
- **The footer is one line.** Two lines clip. Definitions that will not fit
  belong in a `.note`, which is what a note is for.

## An editable one-pager

Never offered, and when asked for, say why first (`editable.md` § When to
build one): everything here was measured against a fixed box, and an editor is
a way to lengthen a heading on a page with no scrollbar. If they still want
it, the overflow guard below is what makes one defensible — the editor's
reader gets the same red warning the author would, naming the column and the
overflow, instead of finding out from a printed copy. There is no editable
one-pager template: build it from `onepager.html` with `editable.md`'s rules,
and still say to reprint from a browser preview after editing.

## Verify it as paper

The usual three steps (SKILL.md step 7; `verify-and-ship.md`), with one addition and one subtraction:

- `check-page.js` does the arithmetic — the sheet plus its `@page` margin against
  both papers, the figures in each column against the column, each chart against
  its engine's wanted size, and the `barList` row heights. It also reads each note
  against the captions and flags one that only repeats them.
- The browser audit sizes the **text**, which no static check can. A column whose
  blocks overrun comes back as `clipped-y` on that column; content past the sheet
  as `off-sheet`. Measure how full each column is while you are there — a column
  at 60% is a column with a block missing.
- **The page watches itself.** The template carries an overflow guard: a script
  that measures every band and, when one has outgrown its box, outlines it and
  puts a red line across the top of the window naming the band and the overflow
  in pixels. Screen only, never printed, and marked `data-page-generated` so an
  editable page does not save it. It is the one protection that survives
  handover — a reader who lengthens a heading sees the same warning you would.

  It depends on `.col > * { flex-shrink: 0 }`. Without it the column compresses
  its own blocks instead of overflowing: a paragraph is squeezed under its text,
  which then spills across whatever follows, and the column's `scrollHeight`
  never grows — so the page looks broken and nothing can measure why.
- There is no control to test, because there are no controls.

Then open the print preview once. The screen layout *is* the print layout, so the
preview is a confirmation, not an inspection. What it confirms is the one thing
no measurement in the page can: that it came out as **one** page.
