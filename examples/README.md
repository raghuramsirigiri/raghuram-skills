# Examples — dashboards, reports and slide decks built by the chart-dashboard skill

Finished output from the [chart-dashboard Claude Skill](../README.md). Every folder
is fully self-contained: download `index.html`, double-click it, and it renders —
no server, no network, no build step, no npm install.

Each example shows one of the three formats the skill produces, and between them
they cover every chart family in the bundled `charts-lib` renderer.

| Example | Format | Charts it uses | Preview |
|:--|:--|:--|:--|
| [`logistics-network-dashboard/`](logistics-network-dashboard/) | **Dashboard** (single file) | Geofacet tile map, bar list, waterfall bridge, Sankey flow, line with a real gap and a callout, histogram, waffle, dumbbell, radar, 100% stacked column, donut, bar insight table | [screenshot](logistics-network-dashboard/screenshot.png) |
| [`coffee-pricing-deck/`](coffee-pricing-deck/) | **Slide deck** (single file, 16:9) | Line, waterfall, column comparison, dumbbell — across cover, agenda, section dividers, split, full-bleed, KPI strip, compare, timeline, quote, stat and closing-ask layouts | [screenshot](coffee-pricing-deck/screenshot.png) |
| [`ev-retrospective/`](ev-retrospective/) | **Report** | Narrative analysis in a paper column — numbered sections, figures with interpretive captions, pull quotes, source notes | [screenshot](ev-retrospective/screenshot.png) |
| [`q4-ecommerce/`](q4-ecommerce/) | **Dashboard** | 20-panel bento grid: revenue trend with annotated spikes, channel and device mix, category comparisons, funnel and cohort views, full-width composition | [screenshot](q4-ecommerce/screenshot.png) |

## The three formats, and when the skill picks each

- **Dashboard** — a monitoring surface. One panel per finding, no prose, nothing
  telling the reader what to think. The default when you hand over metrics with no
  argument attached. See `logistics-network-dashboard/`.
- **Report** — an argument with evidence: numbered sections, figures with captions
  that say what the figure means. Triggered by phrasing like "write up",
  "retrospective" or "analysis". See `ev-retrospective/`.
- **Slide deck** — an argument delivered by someone, one claim per 16:9 slide, with
  a fixed spine (cover → agenda → section dividers → closing ask) and eighteen slide
  layouts to choose evidence from. Triggered by "presentation", "slides", "deck".
  Prints straight to PDF as A4 landscape, one slide per sheet. See
  `coffee-pricing-deck/`.

Any of the three can also be built **editable** on request, with an **Edit page**
button that opens an in-page editor for text, numbers, chart types and colours.

## The prompts behind these examples

> Build me a dashboard of our Q2 network operations — on-time delivery by state,
> cost-per-parcel bridge, where parcels flow through the hubs, hub dwell times
> before and after, and the five busiest lanes.

> Turn this pricing analysis into a deck for the board: green coffee costs, what
> happened to contribution per box, two options for a price increase, and the ask.

## A note on the figures

The numbers in `logistics-network-dashboard/` and `coffee-pricing-deck/` are
illustrative sample data written to demonstrate the skill, and each page says so on
its own face. The skill never presents invented numbers as real measurements — if
you give it a topic with no data, it tells you and labels the figures as
illustrative.

`ev-retrospective/` and `q4-ecommerce/` predate the single-file output and carry
their own copy of `charts-lib/` beside the page. The skill now inlines the library
(`scripts/finalize.js`), so a fresh build is one standalone HTML file with no
sibling folder — as in the two newer examples.
