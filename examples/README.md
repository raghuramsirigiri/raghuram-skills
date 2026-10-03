# Examples — dashboards, reports, slide decks and one-pagers built by the chart-dashboard skill

Finished output from the [chart-dashboard Claude Skill](../README.md). Every folder
is fully self-contained: download `index.html`, double-click it, and it renders —
no server, no network, no build step, no npm install.

Each example shows one of the four formats the skill produces, across most of the
chart families in the bundled `charts-lib` renderer. The full list of families —
including radar, scatter, bubble and the `panels` compositor — is in the
[main README](../README.md#which-chart-types-are-supported).

| Example | Format | Charts it uses | Preview |
|:--|:--|:--|:--|
| [`logistics-network-dashboard/`](logistics-network-dashboard/) | **Dashboard** (single file) | Geofacet tile map, bar list, waterfall bridge, Sankey flow, line with a real gap and a callout, histogram, waffle, dumbbell, 100% stacked column, donut, bar insight table | [screenshot](logistics-network-dashboard/screenshot.png) |
| [`coffee-pricing-deck/`](coffee-pricing-deck/) | **Slide deck** (single file, 16:9) | Line, waterfall, column comparison, report table with a line and bars per row, dumbbell — across cover, agenda, section dividers, split, full-bleed, KPI strip, compare, table, timeline, quote, stat and closing-ask layouts | [screenshot](coffee-pricing-deck/screenshot.png) |
| [`ev-retrospective/`](ev-retrospective/) | **Report** | Narrative analysis in a paper column — numbered sections, figures with interpretive captions, pull quotes, source notes | [screenshot](ev-retrospective/screenshot.png) |
| [`q4-ecommerce/`](q4-ecommerce/) | **Dashboard** | 20-panel bento grid: revenue trend with annotated spikes, channel and device mix, category comparisons, funnel and cohort views, full-width composition | [screenshot](q4-ecommerce/screenshot.png) |
| [`support-operations-brief/`](support-operations-brief/) | **One-pager** (single file, one printed page) | Masthead and summary, a full-width line with a dashed service-level target and a callout on the week it changed, then two columns of prose, a stat pair, a ranked bar list with two emphasised, a binary donut and a method note | [screenshot](support-operations-brief/screenshot.png) |

## The four formats, and when the skill picks each

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
- **One-pager** — a report on one sheet of paper, set in columns: a masthead, a
  lead figure, then two columns (three in landscape) of headings, paragraphs,
  lists and figures. Prose carries the argument and the charts are evidence, the
  same relationship as a report, compressed onto a fixed 730x990 sheet sized to
  the printable area A4 and US Letter share — so it prints as exactly one page on
  either without touching the print dialog. No controls and nothing hover-only,
  because paper has no pointer. Triggered by "print it", "one page", "a handout",
  "for the board pack". See `support-operations-brief/`.

The first three can also be built **editable** on request, with an **Edit page**
button that opens an in-page editor for text, numbers, chart types and colours.
A one-pager is the exception: an editor lets someone lengthen a title on a page
with no scrollbar, and the sheet would crop it silently.

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
