# One-pager layout (`templates/onepager.html`)

Read with `layout.md`, which holds the rules shared by every format.

A one-pager is **one printed page**: a fixed 730x990px sheet (portrait) or
990x730 (landscape), sized to the printable area A4 and US Letter share, so the
same file prints on one page on either paper with no shrink-to-fit. Going
landscape is two changes, not one: swap `--sheet-w` and `--sheet-h`, *and* set
`@page { size: landscape }`. `size: auto` takes the print dialog's orientation,
which is portrait, so a landscape sheet on a portrait page is split in two —
`check-page.js` fails the mismatch and names it. The sheet is
a flex column of four bands — header, optional KPI band, the grid, footer — and
the grid takes whatever the other three leave.

Everything that makes this format different follows from one fact: **there is no
second page and no scrollbar.** The reader cannot scroll to the rest, cannot
hover for a tooltip, and cannot click a filter. What does not fit gets cut, and
cutting is the work.

## When it is the right format

Reach for it when the page has to leave the screen: a board handout, a one-page
brief for a meeting, a status sheet pinned to a wall, a PDF attached to a mail.
The tells are "print it", "one page", "handout", "pin it up", "paper", "PDF for
the pack".

Against the other three:

- Not a **dashboard**. A dashboard is a monitoring surface read at a desk, with
  room to scroll and hover. Shrinking one onto paper gives you eleven panels at
  180px each, which is a page of thumbnails.
- Not a **report**. A report is an argument in prose with figures as evidence,
  and it is as long as the argument needs. If the findings do not fit one page,
  that is a report — do not set it in 8pt to make it fit.
- Not a **deck**. A deck has a presenter and one claim per slide. A one-pager
  carries the whole argument at once, unnarrated, in a single glance.

If the user wants "the deck, but as a handout", build the deck — its print path
already gives them one slide per page.

## The budget

On a fixed sheet the grid is the only slack there is, so span and row count are
arithmetic rather than taste. Both numbers are checked by
`scripts/check-page.js`, which computes them from the markup and names what does
not fit.

### Spans

A cell's width comes from the 12 tracks and the 10px gaps. Against each chart
engine's `minWidth` (the manifest; below it the axis labels crowd and collide):

| Span | Portrait (730) | Landscape (990) |
|:--|:--|:--|
| `w12` | 730px — every chart type | 990px — every chart type |
| `w8` | 483px — line, column, bar, scatter, waterfall, sankey, heatmap, table… | 657px — every chart type |
| `w6` | 360px — **donut, pie, waffle, barList, radar, packedBubble only** | 490px — every chart type except the 640-wide tables |
| `w4` | 237px — **no chart fits**: text, a `.note`, nothing else | 323px — donut, pie, waffle, packedBubble |

The line that catches people: **two standard charts do not fit side by side on a
portrait one-pager.** 480px is the floor for most engines and half the sheet is
360px. Portrait puts standard charts at `w8` or `w12`, with a donut, a waffle or
a note beside the `w8`. If the page genuinely leads on two charts that must be
compared across, that is the reason to go landscape, where `w6` is 490px.

### Rows

Rows are `1fr`: they divide what the chrome leaves. So the row count *is* the
height of every chart on the page, and adding a row shortens every chart already
on it.

| | 1 row | 2 rows | 3 rows |
|:--|:--|:--|:--|
| Portrait, with the KPI band | 802px | 396px | 261px |
| Portrait, no KPI band | 866px | 428px | 282px |
| Landscape, with the KPI band | 542px | 266px | 174px — nothing fits |
| Landscape, no KPI band | 606px | 298px | 195px — nothing fits |

Most engines need 260px of height, a donut or a sankey 300px, a geofacet 420px.
Read the table against those numbers rather than against the row count: a donut
does not fit a two-row landscape page at all (266px, or 298 without the KPI
band), though it fits anywhere on portrait. The checker names the chart and the
row height whenever the two disagree.
So the ceilings are **three rows portrait, two landscape**. A fourth portrait
row is 193px and a third landscape row 174px, both under every engine's
minimum — at that point the page has more findings than a page holds, and it is
a report.

An `.h2` cell spans two of those rows, which on a two-row page is the entire
grid. That is the right call for a geofacet or a tall ranked list, and it means
the rest of the page is one row.

## What to cut, in order

The findings will not fit. They never do — a one-pager is the format where the
cut is the design. Work down this list, and stop as soon as the page fits:

1. **Panels that answer no question the reader has.** The same test as every
   other format (SKILL.md § How many charts), applied harder because here a
   weak panel costs a strong one its height.
2. **The KPI band**, if its figures are also read off a chart. It is 64px with
   its gap — the difference between two comfortable rows and three tight ones.
   Keep it only when the headline numbers appear nowhere else.
3. **A chart, down to its number.** A finding that is one value — "attrition
   held at 4.1%" — is a KPI tile or a clause in a title, not a panel. This is
   the cut that recovers the most room for the least loss.
4. **Two panels into one exhibit.** Two cuts of one question become
   `Charts.panels` under one title, or a `reportTable` whose rows carry both.
5. **Portrait to landscape**, when what is left is chart-heavy and wants width
   rather than more rows.

What not to cut: the subtitle that carries the units, the footer's sources, and
the note that says a figure is illustrative. Those are what make the page
readable by someone who was not in the room — which is the whole point of a
page that travels on paper.

## Nothing hover-only, nothing interactive

A tooltip does not exist on paper and a `<select>` prints as a grey box showing
one value. So:

- **Data labels stay on.** The library draws them by default; on a one-pager
  leave them on. If they collide, the fix is fewer categories or a wider span,
  not `dataLabels: false` — hiding the numbers on a page that has no tooltips
  leaves the reader with nothing.
- **Every value a reader needs is printed**: a data label, a KPI, an axis tick
  or a table cell. If the only way to learn a number is to point at it, it is
  not on the page.
- **No controls at all.** `check-page.js` fails a one-pager that has a `select`
  or a filter bar. A page that needs a filter is a dashboard; build that
  instead, or build the one-pager for the cut that matters.

## Chrome: three fixed bands

The header (78px), KPI band (54px) and footer (26px) are fixed heights, not
content-sized, because a header that grows steals height from the charts
silently. The constraint is useful on its own:

- **The header is one h1 and one line of scope**, plus the reporting window on
  the right. The h1 has room for two lines at 20px — enough for a headline
  finding, not for a finding with its qualifiers attached. A third line means
  the qualifier belongs in the scope line underneath.
- **The footer is one line**: sources, definitions, and the illustrative-figures
  note. Not a paragraph.
- Four KPI tiles is the most that stays legible at portrait width; five clip
  their labels. Landscape holds five.

If a band overflows, `audit.js` reports it as `off-sheet` or a clip — fix the
copy, not the band height. The bands are the page's proportions, and a page
that needs them changed is a page with too much on it.

## Not an editable page

Don't offer the editable format for a one-pager (`editable.md` § When to build
one). Everything on the sheet was measured against a fixed box, and an editor
lets someone lengthen a title on a page that has no scrollbar to show what fell
off the bottom.

## Hairlines, not cards

Panels have no card behind them. On screen a card lifts a panel off the ground
with a luminance step; printed, that step is a block of ink around every figure
and the page comes out grey. A one-pager separates with hairline rules instead,
which is the print idiom, survives a photocopier, and costs nothing in toner.
The charts paint themselves in `Charts.theme.bg`, which is also the sheet, so
they sit flush with no visible box.

The one filled surface is the `.note` card, and it is filled because it is text
with no figure to anchor it. Use at most one.

## Verify it as paper

The usual three steps (SKILL.md step 7), with one addition and one subtraction:

- `check-page.js` does the budget arithmetic above — the row count, the row
  height, each chart against its engine's minimum, and the no-controls rule.
- The browser audit adds `off-sheet`: content past the sheet's frame. Paper
  crops rather than scrolling, so anything the audit reports there is content
  that would be sliced off the printed page. Treat it exactly as the deck
  treats `off-slide`.
- There is no control to test, because there are no controls.

Then open the print preview once. The screen layout *is* the print layout — the
sheet keeps its authored pixels in both, the only difference being that the
8mm margin moves from the paper's padding to `@page` — so the preview is a
confirmation, not an inspection. What it confirms is the one thing no
measurement in the page can: that it came out as **one** page.
