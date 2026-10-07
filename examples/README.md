# Examples — dashboards, reports, slide decks, one-pagers and email snapshots built by the chart-dashboard skill

Finished output from the [chart-dashboard Claude Skill](../README.md). Every folder
is fully self-contained: download `index.html`, double-click it, and it renders —
no server, no network, no build step, no npm install.

Each example shows one of the five formats the skill produces, across most of the
chart families in the bundled `charts-lib` renderer. The full list of families —
including radar, scatter, bubble and the `panels` compositor — is in the
[main README](../README.md#which-chart-types-are-supported).

| Example | Format | Charts it uses | Preview |
|:--|:--|:--|:--|
| [`logistics-network-dashboard/`](logistics-network-dashboard/) | **Dashboard** (single file) | Geofacet tile map, bar list, waterfall bridge, Sankey flow, line with a real gap and a callout, histogram, waffle, dumbbell, 100% stacked column, donut, bar insight table | [screenshot](logistics-network-dashboard/screenshot.png) |
| [`coffee-pricing-deck/`](coffee-pricing-deck/) | **Slide deck** (single file, 16:9) | Line, waterfall, column comparison, report table with a line and bars per row, dumbbell — across cover, agenda, section dividers, split, full-bleed, KPI strip, compare, table, timeline, quote, stat and closing-ask layouts | [screenshot](coffee-pricing-deck/screenshot.png) |
| [`ev-retrospective/`](ev-retrospective/) | **Report** | Narrative analysis in a paper column — numbered sections, figures with interpretive captions, pull quotes, source notes | [screenshot](ev-retrospective/screenshot.png) |
| [`q4-ecommerce/`](q4-ecommerce/) | **Dashboard** | 20-panel bento grid: revenue trend with annotated spikes, channel and device mix, category comparisons, funnel and cohort views, full-width composition | [screenshot](q4-ecommerce/screenshot.png) |
| [`logistics-network-email/`](logistics-network-email/) | **Email snapshot** (single file, 600px block) | The logistics dashboard's Q2 data cut to an email: a headline, three figures, a weekly on-time line with its real gap and a callout, a signed column of cost drivers, and the busiest lanes as a plain email table. Charts freeze to PNG when the page opens; **Copy for email** puts the block on the clipboard | [screenshot](logistics-network-email/screenshot.png) |
| [`support-operations-brief/`](support-operations-brief/) | **One-pager** (single file, one printed page) | Two packed columns: a line against a dashed service-level target, a ranked bar list, a column chart, a second bar list, six prose sections, a findings list, two stat pairs and a method note | [screenshot](support-operations-brief/screenshot.png) |

## The five formats, and when the skill picks each

- **Dashboard** — a monitoring surface. One panel per finding, no prose, nothing
  telling the reader what to think. The default when you hand over metrics with no
  argument attached. See `logistics-network-dashboard/`.
- **Report** — an argument with evidence: numbered sections, figures with captions
  that say what the figure means. Triggered by phrasing like "write up",
  "retrospective" or "analysis". See `ev-retrospective/`.
- **Slide deck** — an argument delivered by someone, one claim per 16:9 slide, with
  a fixed spine (cover → agenda → section dividers → closing ask) and eighteen slide
  layouts to choose evidence from. Triggered by "presentation", "slides", "deck".
  Prints straight to PDF, one rounded slide per page. See
  `coffee-pricing-deck/`.
- **One-pager** — a report on one sheet of paper, set in columns of headings,
  paragraphs, lists and figures. Prose carries the argument and the charts are
  evidence, the same relationship as a report, compressed onto a fixed 730x990
  sheet sized to the printable area A4 and US Letter share — so it prints as
  exactly one page on either without touching the print dialog. The column
  tracks and every figure's height come from the content, and the charts are
  sized to the column rather than the column to the charts, so the page can be
  packed. No controls and nothing hover-only, because paper has no pointer.
  Triggered by "print it", "one page", "a handout", "for the board pack". See
  `support-operations-brief/`.

- **Email snapshot** — one to three findings that travel in the body of an email.
  Gmail strips SVG and Outlook for Windows cannot draw it, so the block is a 600px
  table with every style inline, the titles are text, and each chart is frozen into
  a PNG with alt text when the page opens. Open the file, click **Copy for email**,
  paste into a new message. Triggered by "paste it into the weekly update",
  "something I can drop into an email", "Outlook", "Gmail". See
  `logistics-network-email/`.

The dashboard, report, deck and email snapshot can also be built **editable** on
request, with an **Edit page** button that opens an in-page editor for text,
numbers, chart types and colours. A one-pager is the exception: an editor lets
someone lengthen a title on a page with no scrollbar, and the sheet would crop it
silently.

## The prompts behind these examples

> Build me a dashboard of our Q2 network operations — on-time delivery by state,
> cost-per-parcel bridge, where parcels flow through the hubs, hub dwell times
> before and after, and the five busiest lanes.

> Turn this pricing analysis into a deck for the board: green coffee costs, what
> happened to contribution per box, two options for a price increase, and the ask.

> Put our Q3 support numbers on one page I can print for Thursday's ops review —
> response times against the target and what people are actually contacting us about.

## A note on the figures

The numbers in `logistics-network-dashboard/`, `coffee-pricing-deck/` and
`support-operations-brief/` are illustrative sample data written to demonstrate the
skill, and each page says so on its own face. The skill never presents invented numbers as real measurements — if
you give it a topic with no data, it tells you and labels the figures as
illustrative.

`ev-retrospective/` and `q4-ecommerce/` predate the single-file output and carry
their own copy of `charts-lib/` beside the page. The skill now inlines the library
(`scripts/finalize.js`), so a fresh build is one standalone HTML file with no
sibling folder — as in the two newer examples.
