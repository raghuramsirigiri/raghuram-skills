---
name: chart-dashboard
description: Build a self-contained HTML dashboard, data-story report, or slide deck from supplied information (metrics, tables, notes, pasted data, a topic), rendered with the bundled zero-dependency charts-lib SVG chart library. Use whenever the user asks for a dashboard, analytics page, KPI/bento view, illustrated report, or a presentation, slides or a deck built from data they provide or describe.
---

# Chart dashboard

Turn whatever information the user gives — a table, pasted numbers, a set of
metrics, notes, or just a topic and some facts — into a single self-contained
HTML page of SVG charts rendered with `charts-lib`: a dashboard, a report, or a
slide deck.

## Workflow

1. **Extract the data.** Pull every number, category, and time series out of the
   user's input into a short plan: for each planned panel note *title, chart
   type, categories, series*. If the user gave a topic with no numbers, say
   plainly that figures are illustrative and label them as such on the page.
   Never silently invent numbers that read as real measurements.

   Three things count as invention, and the last two are easy to miss:
   - **Filling a gap.** A missing week is a gap (`null`), not a zero — a zero
     draws a collapse that never happened. And a gap only reads as one if the
     series is unsmoothed: `Charts.line` defaults to `spline`, which drops nulls
     and draws an unbroken curve through the hole. Set `type: 'line'` on any
     series with an interior gap.
   - **Estimating onto a real chart.** If you interpolate or model a value, it
     does not belong as another point on the primary trend, however carefully you
     dash the line or footnote it. Readers remember the shape, not the caveat.
     Put estimates in their own panel, or leave the hole visible.
   - **Rescaling stale numbers.** When you're updating an existing page and the
     user gave you new figures for only some panels, label the rest as carried
     forward. Nudging last quarter's numbers so they look current is fabrication
     even though every individual figure came from somewhere real.
2. **Pick the format by what the data has to say** (see `references/layout.md`).
   The question is whether the page states a conclusion or lets the reader draw
   their own:
   - **Dashboard** — a monitoring surface. Panels stand on their own, the reader
     scans for what changed, and no prose tells them what to think. Use
     `templates/dashboard.html`. This is the right default when the user hands
     you metrics without an argument attached.
   - **Report** — an argument with evidence. Reach for it when the user is trying
     to convince someone ("write up", "for the board", "retrospective",
     "analysis"), or when they told you the conclusion themselves and the page
     exists to support it. Use `templates/report.html`.
   - **Deck** — an argument delivered *by someone*, one claim per slide, read
     from across a room or clicked through in a tab. Reach for it when the user
     says presentation, slides, deck, "present this", "walk them through it", or
     names a meeting the page has to survive. Use `templates/slides.html`.

   When it's genuinely ambiguous, ask yourself who reads it and whether you will
   be in the room. Nobody presents a bento grid to a board, and nobody watches a
   five-section narrative to see if last night's numbers moved. The deck is the
   one format that assumes a presenter: if the page has to stand alone with no
   one narrating, it is a report, however much the user said "slides".

   **Editable or static.** Static is the default. Build an *editable* page
   only when the user asked for one: charts stored as JSON, text marked
   editable, and an **Edit page** button that opens a built-in editor, so they
   can switch chart types, change text or numbers, and save the file later
   without you. If they haven't asked, offer it once when you hand over the
   first page (see Output). The format and its rules are in
   `references/editable.md`. Read that file before building one; for a
   dashboard, start from `templates/dashboard-editable.html`.
3. **Copy the template.** It lives in this skill's own directory — resolve
   `templates/` relative to the directory containing this SKILL.md, never from a
   hard-coded home path:
   ```
   <skill-dir>/templates/dashboard.html  →  ./index.html
   <skill-dir>/templates/report.html     →  ./index.html
   <skill-dir>/templates/slides.html     →  ./index.html
   <skill-dir>/templates/dashboard-editable.html  →  ./index.html   (only when asked for editable)
   ```
   Do **not** copy `assets/charts-lib/` next to the output. The template's three
   `charts-lib/…` tags are placeholders; leave them exactly as written while you
   build the page, and fold the library in as the last step (step 9). Their
   order matters and the inliner preserves it — theme must load before charts.
4. **Derive the structure from the findings, not from the template.** The
   dashboard template deliberately ships with a placeholder two-cell grid,
   because any arrangement shipped there would end up on every page this skill
   produces.

   *(Building a deck? A deck derives its **evidence** from the findings the same
   way, but its **spine** is fixed, and `references/layout.md` § Compose the
   sequence has the four passes — read it before writing slides. In short: write
   the claims, group them into sections (one section per question the data
   answers), then lay the spine before any evidence slide — `l-cover` first,
   `l-agenda` second, an `l-section` divider before each section when there are
   two or more, and an `l-statement` last carrying the recap and the ask. Only
   then choose a layout per claim. The reason the spine goes down first is that
   scaffolding added at the end is scaffolding that gets forgotten: the same
   findings would otherwise produce a deck with an agenda one run and none the
   next. The template's eighteen example slides are a catalogue of the available
   layouts, never a running order.)*
   Before writing markup, answer: what is the dominant shape of this analysis
   (one trend / a head-to-head comparison / a ranking / a funnel / a
   distribution / parallel equal measures / geography)? Is there genuinely one
   panel that is the reason the page exists? The answers pick the opening row —
   worked derivations for each shape are in `references/layout.md` § Compose the
   grid from the findings.

   Two checks before you move on. **A hero must be earned**: `w8 h2` goes to a
   panel only when one finding dominates; co-equal measures get equal cells, and
   promoting one is a claim the data doesn't make. And **if your top row came out
   as a wide line chart plus a donut plus a small panel, verify that it came from
   the data** — that is the shape this skill falls into by reflex, and it is
   right only when a single trend really does lead and composition really is the
   second thing the reader needs.

   One sizing rule the grid doesn't enforce for you: **tables size themselves.**
   `table`, `reportTable` and `barInsightTable` are as tall as their rows, so
   they go in a content-sized `<div class="bento flow">` row, never in a fixed
   cell or an `.h2`. A fixed cell leaves a blank band under the last row. Give a
   `reportTable` chart column a `width` that fits its data, and choose the
   smallest span that holds the table (`layout.md` § Tables size themselves).

5. **Choose a chart per panel** using `references/chart-selection.md`, then write
   the config against `references/chart-api.md` (the full charts-lib API: every
   factory, option, and theme token). Read that file before writing chart code —
   don't guess option names.

   For a single fact about one engine — what it refuses, whether it self-sizes,
   how many grid tracks it wants, its minimum readable size — read
   `assets/charts-lib/charts.manifest.json` instead of the whole API file. It is
   the same index the library carries as `Charts.meta`, kept in step with the
   code by the build, and it also holds the shared `plotBox` and `grid` rules.

   **Check the chart's input contract first** (`chart-selection.md` § Input
   contract). Each engine accepts a particular kind of x and y, and a mismatch
   is a broken panel rather than a style choice. The one that bites most often:
   a line chart needs an *ordered* x — dates, numbers, or labels that carry
   their own rising sequence (`'Jan'…'Dec'`, `'Q1'…'Q4'`, `'Week 1'…'Week 12'`).
   Named categories (regions, browsers, departments) render an error panel
   instead of a chart; use `Charts.column` when x is a name.

   Two more references come in at this step when they apply: write the panel
   titles against `references/narrative.md` (where a finding goes, and how to
   state it without editorializing), and if the page has a filter or dropdown,
   read `references/controls.md` before wiring it.

   **Check any claim that does arithmetic.** Titles reach for comparative
   shapes — "more than the next two combined", "half of all", "double the
   nearest" — because they are satisfying to write, and they are the easiest
   sentences in a deck to get wrong: the shape sounds right while the numbers
   say otherwise, and nobody re-adds the column before presenting. Add up the
   numbers you are claiming about before you write the sentence, and if the
   arithmetic does not hold, state the comparison that does. A chart that
   contradicts its own title is worse than a chart with a dull title.

   **When a panel marks something up** — an intervention, a projection, a
   target, a labelled anomaly — read `references/annotation.md` for the cue and
   its mechanics. Colour and stroke are per-series on a line, so actual-vs-
   forecast is two series, not one styled midway.
6. **If the user pointed at a brand** — their site, a stylesheet, a screenshot, a
   set of hex codes — recolor to match, and change nothing else. Read
   `references/theming.md` and run the bundled extractor:
   ```bash
   node <skill-dir>/scripts/extract-theme.js <their-css-or-html>
   ```
   It harvests the design's canvas, series hue, and any color reserved for a
   utility role, then runs the same OKLCH recipe described in `theming.md`:
   paper, greyscale ink, a seven-step series ramp, and `accent`/`annotation`/
   `counter` — taken from the design where it has a color that fits the role,
   derived by hue rotation where it doesn't. Apply its `Charts.applyPalette`
   block once, before the first chart call — hand it the palette and let
   `theme.js` re-derive the roles; assigning roles one by one leaves tiles,
   tooltips and dimmed legend keys on the old colours. Fix anything it marks FAIL rather than
   shipping it. **Check the series hue it picked** against what you know the
   brand's colour to be: the script ranks by how the CSS uses a colour, which
   usually finds the brand colour and occasionally promotes a heavily-used
   secondary instead. The report also names the design's typeface — reported,
   not applied, unless the page can genuinely load the face (see § One design
   system, only the colors change).

   **If all you have is one brand color** — a single hex, no CSS to harvest —
   run the same recipe with nothing observed:
   ```bash
   node <skill-dir>/scripts/generate-theme.js '#2323FF'
   ```
7. **Verify before reporting done.** The page still has its `charts-lib/…`
   placeholders at this point, so to *run* it you need the library beside it
   temporarily. Stage it — step 8 removes it again:
   ```bash
   node <skill-dir>/scripts/finalize.js index.html --stage
   ```
   Then use the strongest check your environment supports:
   - *Browser tooling available* — open the file, read the console for errors,
     and screenshot it to confirm layout. (In Claude Code: `preview_start`, then
     `read_console_messages` and a screenshot. Serve over a local HTTP server
     rather than `file://` so the scripts execute.)
   - *No browser tooling* — run the bundled checker and fix what it reports:
     ```bash
     node <skill-dir>/scripts/check-page.js index.html
     ```
     It catches the four failures that do not throw and so survive a
     confident-looking build: a panel whose chart was never wired (an empty
     box), a line over unordered categories (an error panel *inside* the
     chart), a page still pointing at `charts-lib/`, and anything else that
     reaches the network. Each one reads as a styling bug rather than the
     missing wiring it is. Exit code is non-zero when something fails, so it
     also works as a gate. Run it here without `--final` — the page is not
     inlined yet, and mid-build that is simply where you are. (Step 8 runs it
     for you either way; running it now just shortens the loop.)
   Either way, fix any panel that renders empty or overflows its cell first. A
   panel reading *"Line charts need a continuous or temporal x-axis"* is the
   input-contract failure above — change the chart type or the x values, don't
   restyle it.

   **If you built a deck, check it on paper too.** It is made to be handed
   round as a PDF, and that path has failures the screen never shows: print to
   PDF (or open the print preview) and confirm one slide per sheet, nothing
   crossing a page edge, and the dark slides still dark. A slide whose content
   outgrew its frame is silently cropped there rather than scrolled.

   **If the page has any control, test it.** Change each dropdown to a
   non-default value and confirm — with a screenshot or by reading the rendered
   text back — that the affected charts redraw *and* that any action title
   recomputed with them. An untested filter is usually a broken filter.
8. **Fold the library into the page, and ship one file.** A dashboard outlives
   the folder it was written in — it gets emailed, dropped in Slack, committed
   to a wiki, opened from Downloads. A page that loads `charts-lib/charts.js`
   from a sibling folder renders as an empty grid the moment it travels alone,
   and it fails *silently*: the markup, the headings and the KPI numbers are all
   there, so it looks like a styling bug rather than a missing dependency. So
   the last build step replaces the three placeholder tags with the library's
   own contents. One command does the whole ending — checks the page as built,
   inlines the library, removes the staged copy, then re-checks with `--final`,
   which this time *insists* the page is standalone:
   ```bash
   node <skill-dir>/scripts/finalize.js index.html
   ```
   It stops before inlining if the build checks fail, since inlining a broken
   page only makes it a bigger broken page, and its exit code is the gate: a
   non-zero exit means you are not done. It removes a sibling `charts-lib/`
   only when that folder holds exactly the three files it staged, so a folder
   of your own that happens to share the name survives.
   The result is one ~590 KB HTML file that opens over `file://` with no server,
   no network, and no sibling folder. Some rules that follow from that:
   - **Never reintroduce a `<script src>` or `<link href>` to anything.** No CDN
     for a chart library, a font, an icon set, or a CSS reset — an offline
     reader, a locked-down laptop, or an air-gapped review gets a broken page.
     Web fonts are the common slip: name the family in the CSS stack and let it
     fall back to the system face, which is what the template already does.
   - **Images go in as `data:` URIs** or not at all.
   - **The library is inlined verbatim.** Don't minify it, don't strip the parts
     you think a page doesn't use, and don't hand-edit the inlined copy — a
     bug fixed in the page instead of in `assets/charts-lib/` is lost on the
     next build. Rerunning `finalize.js` on an already-inlined file is a
     harmless no-op, so it is safe to re-run after edits.
   - **If the user explicitly asks for the split form** — they're checking the
     page into a repo beside other pages that share the library, say — skip
     `finalize.js` and keep the staged `charts-lib/` next to the output, with
     the placeholder tags as the real references. Check that page with
     `scripts/check-page.js index.html` (no `--final`, which would fail it for
     the references it is supposed to have). That is the exception, not the
     default.

## Rules that keep output good

- One idea per panel. A panel whose title needs "and" is two panels.
- Lead with the finding that matters most: if one trend is the reason the page
  exists, give it the wide top-left cell (`w8 h2`). If nothing dominates — three
  equally important measures, say — don't manufacture a hero; equal panels are
  the honest layout. The rest of the grid follows the same logic: the shape of
  the analysis picks the rows, and a layout reused from the last page is a layout
  that describes the last page's data (`references/layout.md`).
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

### How many charts? One per finding — no quota, no padding

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

### Fit the page to how it will be read

The dashboard and report templates are tuned for someone reading at a desk.
When the user tells you otherwise — "I'm presenting this", "send it round",
"print it" — the same page fails badly in that other context. Presenting is the
case with its own template: a deck (`templates/slides.html`) is the right answer
to "I'm presenting this", not a dashboard with the type scaled up. For the other
two the fix is how much you put on the page and at what size, never a different
design system. All three cases are in `references/layout.md` § Fit the page to
how it will be read.

### Make the chart show the finding, not just the data

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

### If you add a control, wire it

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

### Legends go in one place

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

### Put the finding in the title

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

### Nothing on the page that isn't data or its labels

- No invented narrative furniture that repeats what a chart already says: no
  "Key insight" banners, no "Executive summary" you wrote yourself, no
  highlighted takeaway strip across the top, no emoji, no "🚀".
- The header is title, one line of scope, and the reporting window. The footer is
  sources, definitions, and any honesty notes (illustrative figures, carried-
  forward panels, data-quality caveats). Nothing else belongs in either.
- Conclusions the user themselves stated ("the March spike is the thing I need to
  explain") belong on the relevant chart — as its title or a callout, in their
  framing — not restated as your own analysis in a banner.

### One design system, only the colors change

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
(step 8). Match the brand's font only when the face is genuinely available — a
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

## Output

One HTML file, standalone — no sibling `charts-lib/` folder, no CDN tags, no
network at open time (see step 8). A deck ships the same way, and a reader turns
it into a PDF with their browser's own Print → Save as PDF: the template sets
A4 landscape, one slide per sheet. Write it to the working directory (or where
the user asked). Then surface
it however your environment does that — attach or render the file if you can (in
Claude Code: `SendUserFile` with `display: "render"`); otherwise print the
absolute path and tell the user to open it in a browser. Either way, state which
figures came from the user's data and which, if any, were illustrative.

On the **first** page you build in a conversation, if the user didn't ask for
an editable page, end with a one-line offer of one, such as: *"Want an
editable version, so you can switch chart types and change the text or
numbers yourself without rerunning this?"* Only offer it once. Build it only
on a yes, following `references/editable.md`.

An editable page ships as **two files**: `finalize.js` writes `<name>.html` as
the final copy (no editor, safe to share) and `<name> (working copy).html` as
the editable one. Hand over both and say in one line which is which. The
working copy shows a "Working copy" banner, a DRAFT print watermark and a
"Draft ·" tab title, so it isn't mistaken for the final version.

## Environment notes

Nothing in this skill requires a specific agent or vendor. It needs only the
ability to read files from this directory, write an HTML file, copy a folder,
and run Node (for `finalize.js` and the static checks). Without Node, inline
the three library files by hand — paste `charts.css` into a `<style>` and
`theme.js` then `charts.js` into `<script>` blocks, in that order, replacing the
placeholder tags. An editable page also gets `assets/page-runtime.js` in a
`<script>` block after them. Browser preview, screenshots, and file attachment are used
when available and degrade gracefully when not.
