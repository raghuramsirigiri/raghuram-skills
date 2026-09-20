# Where the words go

Read this when you are writing the titles — which is to say once the panels
exist and you know what each one shows. The question it answers is where a
finding belongs: welded to the chart that proves it, beside each row of a
scorecard, or in a card of its own. Getting it wrong is what makes a page read
as filler, because the same sentence ends up in two places.

## Put the finding in the title, not in a quote box

A chart titled "Weekly throughput by site" makes the reader do the work of
finding the point. A chart titled "Throughput fell 12% the week of the WMS
cutover" hands it to them and then proves it underneath. That is an **action
title**: the headline states what the data shows, and the chart is the evidence.
The insight lives in the chart's own hierarchy, so it travels with the figure
into a screenshot, a slide, or an email.

The title-subtitle pair splits cleanly:

```
title:    'Throughput fell 12% the week of the WMS cutover'   ← the finding
subtitle: 'Units picked per week by site · W01–W04 2026'      ← units, scope, window
```

The subtitle keeps doing its old job. What changes is that the title is allowed —
preferred — to say what happened, when the data supports a specific claim.

**This is not licence to editorialize.** The line is whether the chart proves the
sentence:

| Write this | Not this | Why |
|:--|:--|:--|
| "Throughput fell 12% the week of the cutover" | "Concerning dip in throughput" | The first is measurable off the chart; the second is a verdict the reader should reach themselves |
| "Billing drives 27% of all tickets" | "Billing is a serious problem" | Same fact, but the second adds an opinion the data doesn't contain |
| "Weekly throughput by site" | "Throughput improving steadily" | When no single finding dominates, a plain descriptive title is the honest choice — don't manufacture a headline |

So: adjectives and verdicts stay out, quantified findings come in. If you cannot
put a number or a specific comparison in the title, you probably don't have a
finding, and a descriptive title is right.

**Length has room, but not unlimited room.** charts-lib wraps titles across two
lines and subtitles across three, measuring against the panel width and shrinking
the plot area to fit, so a full sentence is safe — this is why an action title
doesn't have to be compressed into a label. Keep titles under about 70
characters and they work in any cell, including the narrow `w4` (~35 characters
per line, two lines). Past roughly 90 characters in a narrow cell the tail is
ellipsized, which loses exactly the part carrying the finding. If a title won't
fit that budget, the usual fix is that it's carrying two findings — split the
panel — or that the qualifying detail belongs in the subtitle. Exact per-cell
limits are in `chart-api.md`.

## Where a finding goes: action title, insight column, or soft surface card

Three containers, and the choice is almost mechanical. Ask: **how many findings
are there, and can one chart prove them?**

**One finding, one chart proves it → action title.** It belongs in that chart's
`title`, with the descriptive detail moving to `subtitle`. The finding and its
evidence stay welded together, which is what makes the figure survive being
screenshotted out of context.

**One finding per row → `Charts.barInsightTable`.** When every category carries
its own point — an income statement, a KPI review, a scorecard — a single title
can't hold them all, and writing one card per row buries the chart. This chart
type puts each row's sentence and its headline number beside that row's bars.
Selection guidance in `chart-selection.md`.

**No single figure carries it → soft surface card** (`.note` in both templates).
Use it for text that spans figures:

- a caveat that changes how several figures should be read ("labor hours don't
  reconcile with the stated total; site rows used")
- an honesty note (illustrative figures, carried-forward panels)
- a method or definition the reader needs up front
- the ask, in a report — what you want the reader to do

The card is a low-contrast fill, not a bordered pull-quote. A `border-left` bar
or a big italic quote is decoration borrowed from editorial layout: it shouts
without adding information, and on a dark theme the coloured bar becomes the
loudest thing on the page. The soft fill does the same separating job by sitting
a few percent off the canvas, so the text is set apart and nothing competes with
the data. `--surface-soft` is computed from the theme, so it inverts correctly on
dark brands.

**Never both for the same sentence.** A card restating a title that already says
it is the "AI slop" failure in a new costume — the reader reads the same finding
twice and trusts the page less. If you catch yourself writing a card that
paraphrases a chart, delete the card; the title is doing the work.

Pull quotes are out entirely. A quote needs a speaker, and in a data page there
isn't one — you are quoting yourself, which is why it reads as filler. If a
number deserves that much emphasis, it is a KPI tile or a chart of its own.

When a page needs argument and prose, that is the report format — where the
narrative is the point and every claim is tied to a figure. Don't smuggle
report-style commentary into a dashboard.
