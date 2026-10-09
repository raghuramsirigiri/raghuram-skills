---
name: chart-dashboard
description: Build a self-contained HTML dashboard, data-story report, slide deck, printable one-pager, email-safe chart snapshot, or Teams post from supplied information (metrics, tables, notes, pasted data, a topic), rendered with the bundled zero-dependency charts-lib SVG chart library. Use whenever the user asks for a dashboard, analytics page, KPI/bento view, illustrated report, a presentation, slides or a deck, a one-page handout or brief to print, charts to paste into an email (Outlook, Gmail, a weekly update), or an insights post to share in a Microsoft Teams chat or channel, built from data they provide or describe.
---

# Chart dashboard

Turn whatever information the user gives — a table, pasted numbers, a set of
metrics, notes, or just a topic and some facts — into a single self-contained
HTML page of SVG charts rendered with `charts-lib`: a dashboard, a report, a
slide deck, a one-pager that prints on a single sheet, an email snapshot
whose charts survive being pasted into Outlook or Gmail, or a Teams post that
pastes into a chat or channel as rich text with its charts.

`<skill-dir>` below is the directory holding this file
(`${CLAUDE_SKILL_DIR}` where the agent expands it). Resolve `templates/`,
`references/`, `scripts/` and `assets/` against it, never against the working
directory or a hard-coded home path.

This file is the route; the detail lives in `references/`, and each step says
which file to read and when. Read a reference when its step comes up — not all
of them up front, and not from memory of an earlier page.

## Rules that hold on every page

These apply for the whole build, including after a long conversation.

1. **Never invent numbers that read as real measurements.** A topic with no data
   gets figures labelled illustrative *on the page*. A missing value is a gap
   (`null`), not a zero, drawn with `type: 'line'` so the spline doesn't bridge
   it — a zero draws a collapse that never happened. An interpolated or modelled
   value never joins a measured trend as another point, however it is dashed or
   footnoted: readers remember the shape, not the caveat. Give estimates their
   own panel or leave the hole visible. Numbers carried forward from an older page
   are labelled as such; nudging them to look current is fabrication even though
   each figure came from somewhere real.
2. **One standalone file.** No CDN, no `<script src>`/`<link href>` to anything,
   no webfont, images only as `data:` URIs. `scripts/finalize.js` inlines the
   library and its exit code is the gate (step 8).
3. **`theme.js` loads before `charts.js`.** Leave the template's placeholder tags
   in their order; the inliner preserves it.
4. **The input contract decides the chart.** A line needs an ordered x — dates,
   numbers, or a complete rising run like `'Jan'…'Dec'`, `'Q1'…'Q4'`,
   `'Week 1'…'Week 12'`; named categories (regions, browsers, departments)
   render an error panel, so use `Charts.column`. Donut and pie options
   (`centerText`, `valueSuffix`, `variableRadius`, `startAngle`/`endAngle`,
   `showPercentages`) live under `plotOptions.pie`, not at the top level.
5. **One finding per panel, and the count follows the findings** — no padding a
   grid, no compressing unrelated series onto shared axes.
6. **The finding goes in the title, units and scope in the subtitle** — and the
   title's arithmetic is checked against the numbers before it is written. A
   chart that contradicts its own title is worse than one with a dull title.
7. **A wired control or no control.** A filter re-filters the data, redraws
   every dependent panel and KPI, and recomputes any title that states a finding.
8. **One design system; only the colours change.** No second card style, no
   home-made KPI strip, no banners, emoji or "key insight" strips, legends where
   charts-lib puts them.

Rules 5–8 in full, with emphasis, legends, data labels and the KPI-tile rules:
`references/design-rules.md`. Read it once per page before writing titles and
configs.

## Workflow

1. **Extract the data.** Pull every number, category, and time series out of the
   user's input into a short plan: for each planned panel note *title, data
   shape, chart type, and the data it takes* — the data shape *before* the chart
   type. The shape says what one item carries: one number, a number per period,
   several measures, a number plus a note, a trend plus a figure, a flow, or raw
   values. Skip that and every row with several things in it becomes a column
   chart. A pasted table with three or more numeric columns, a note against each
   row, or the words *scorecard*, *QBR*, *P&L*, *KPI review* or *vs target* point
   at `table`, `barInsightTable` and `reportTable` first. If the user gave a
   topic with no numbers, say plainly that figures are illustrative (rule 1).

2. **Pick the format by what the data has to say.** Does the page state a
   conclusion, or let the reader draw their own? Read `references/layout.md`,
   then the one `layout-<format>.md` for the format you pick.

   | Format | When | Template | Read |
   |:--|:--|:--|:--|
   | Dashboard | Monitoring; panels stand alone, no prose. The default for metrics with no argument attached. | `dashboard.html` | `layout-dashboard.md` |
   | Report | An argument with evidence: "write up", "for the board", "retrospective", "analysis", or the user stated the conclusion. | `report.html` | `layout-report.md` |
   | Deck | An argument delivered *by someone*, one claim per slide: presentation, slides, deck, "present this", "walk them through it", a named meeting. | `slides.html` | `layout-deck.md` |
   | One-pager | A report on one printed sheet: "print it", "one page", "a handout", "for the board pack", "pin it up", "a PDF to attach". Columns of prose and figures — a page of charts with no sentences is a dashboard — never a KPI tile row; pack it. | `onepager.html` | `layout-onepager.md` |
   | Email snapshot | 1–3 findings pasted into an email body: "the weekly update", "drop it into an email", Outlook/Gmail, "email-safe". Mail clients delete SVG, strip styles and run no script, so: a 600px inline-styled table; charts freeze to PNG with alt text; **Copy for email** button. | `email.html` | `layout-email.md` |
   | Teams post | 1–3 findings in a Teams chat or channel: "post it in the channel", "share in Teams". Plain semantic HTML, charts frozen to PNG; **Copy as picture** and **Copy as text**. | `teams.html` | `layout-teams.md` |

   When it's ambiguous, ask who reads it, whether you'll be in the room, and
   whether it ends up on paper — nobody presents a bento grid to a board, and
   nobody watches a five-section narrative to see if last night's numbers moved.
   The deck is the one format that assumes a presenter: a page that must stand alone with nobody
   narrating is a report, however much the user said "slides". A one-pager,
   email and Teams post are budgets: past one sheet build a report, past three
   findings build the page they belong in and snapshot its lead finding. A
   request naming both email and Teams gets both blocks — each is wrong for the
   other client.

   **Static unless asked.** Build an *editable* page (charts as JSON, an **Edit
   page** button) only when the user asked; read `references/editable.md` first
   and start from `dashboard-editable.html`, `report-editable.html`,
   `slides-editable.html` or `email-editable.html`. A one-pager and a Teams post
   have no editable form. If they didn't ask, offer it once at handover (Output).

3. **Copy the template** from `<skill-dir>/templates/<name>.html` to
   `./index.html` (or where the user asked). Do **not** copy
   `assets/charts-lib/` beside it: the template's `charts-lib/…` tags are
   placeholders (the email and Teams templates have a fourth, for their freeze
   runtime). Leave them exactly as written; step 8 folds the library in.

4. **Derive the structure from the findings, not from the template.** The
   dashboard template ships a placeholder two-cell grid on purpose. Before
   writing markup, name the dominant shape of the analysis (one trend, a
   head-to-head, a ranking, a funnel, a distribution, parallel equal measures,
   geography) and whether one panel is genuinely the reason the page exists.
   Worked derivations: `layout-dashboard.md` § Compose the grid from the
   findings. Then check:
   - **A hero must be earned.** `w8 h2` only when one finding dominates.
   - **A wide line + a donut + a small panel** on top is this skill's reflex;
     keep it only if the data put it there.
   - **All lines, columns, bars and donuts?** Go back to the data-shape notes:
     `barInsightTable`, `table`, `reportTable` and `panels` exist for a reason.
   - **A table that reprints a chart is padding.** Add one only for measures no
     panel shows, or rows the reader looks up.
   - **Tables size themselves** — a `<div class="bento flow">` row, never a fixed
     cell or `.h2` (`layout-dashboard.md` § Tables size themselves).
   - **Size each cell from its data**, not its rank: count the categories once
     step 5 has picked the chart (`layout-dashboard.md` § Size each cell).

   *One-pager:* write the claims as sentences first, then pick `--cols` and each
   figure's `--fig-h` from the content and do the budget in
   `layout-onepager.md` § The budget. Charts go in the columns; under-filling
   the sheet is how this format fails (1660px of column run is about five
   figures and eight text blocks). *Deck:* lay the spine first — `l-cover`,
   `l-agenda`, an `l-section` per section when there are two or more, an
   `l-statement` last with the recap and the ask — then a layout per claim
   (`layout-deck.md` § Compose the sequence). Spine first because scaffolding
   added at the end gets forgotten — an agenda one run and none the next. The
   template's example slides are
   a catalogue, never a running order.

5. **Choose a chart per panel, then write each config against the API** — never
   guess an option name.
   - `references/chart-selection.md` — start at § First: what is one item of
     this data?, and check § Input contract (rule 4).
   - `references/chart-api.md` — always: factories, shared options, sizing.
   - `references/charts/<type>.md` — only the types in your plan.
   - `references/charts/lifecycle.md` only when the page redraws charts;
     `references/charts/theme-tokens.md` only when you recolour or name a token.
   - `references/narrative.md` before writing titles; `references/controls.md`
     before adding any filter or dropdown; `references/annotation.md` when a
     panel marks an intervention, projection, target or anomaly (actual vs.
     forecast is two series).

   **Read them in one call**, not one file per call — every call re-sends the
   conversation, so ten small reads cost several times one combined read. The
   same goes for steps 2–4: `layout.md`, your `layout-<format>.md`,
   `chart-selection.md` and the template in one command, not four:
   ```bash
   cd <skill-dir>/references && cat chart-api.md charts/line.md charts/table.md narrative.md design-rules.md
   ```
   For one fact about one engine (refusals, self-sizing, grid tracks, minimum
   size) read its entry in `assets/charts-lib/charts.manifest.json` — the same
   index the library carries as `Charts.meta`, with the shared `plotBox` and
   `grid` rules. Don't read
   `assets/charts-lib/charts.js` (14,000 lines) or the inlined `examples/` pages
   to learn an option; search them for one name only when the references are
   silent.

   **Check any claim that does arithmetic** — "more than the next two combined",
   "half of all", "double the nearest" — the shape sounds right while the numbers
   say otherwise, and nobody re-adds the column before presenting. Add up the numbers first; if the shape
   doesn't hold, state the comparison that does.

6. **If the user pointed at a brand** (site, stylesheet, screenshot, hex codes),
   recolour and change nothing else. Read `references/theming.md`, then run
   `node <skill-dir>/scripts/extract-theme.js <their-css-or-html>`, or with only
   one colour `node <skill-dir>/scripts/generate-theme.js '#2323FF'`. Apply its
   `Charts.applyPalette` block once, before the first chart call; fix anything
   it marks FAIL; check the series hue it picked is really the brand's. Keep the
   template's font stack unless the brand face is genuinely loadable.

7. **Verify before reporting done.** Read `references/verify-and-ship.md` and
   follow it. In short: `node <skill-dir>/scripts/finalize.js index.html --stage`
   to put the library beside the page; `node <skill-dir>/scripts/check-page.js
   index.html` and fix what it reports; then in a browser at 1440x900, load
   `charts-lib/audit.js` and run `ChartsAudit.run()` until `ok` is true, and
   `ChartsAudit.tryControl()` on every control; one screenshot at the end. Each
   format adds its own check (deck and one-pager paper checks, the email and
   Teams freeze lint) — they're in that file. Without a browser, the static
   check is the floor; say the layout wasn't checked in one.

8. **Fold the library in and ship one file:**
   `node <skill-dir>/scripts/finalize.js index.html`. It checks, inlines,
   removes the staged copy and re-checks with `--final`; a non-zero exit means
   you are not done. The library is inlined verbatim — never minify or hand-edit
   it. Re-running is a safe no-op. Keep the split form only when the user asked
   for it (`verify-and-ship.md` § Step 8).

## Output

One HTML file, standalone (step 8), written to the working directory or where
the user asked. Surface it however your environment does — attach or render it
(in Claude Code: `SendUserFile` with `display: "render"`), otherwise print the
absolute path. State which figures came from the user's data and which, if
any, were illustrative. Per format, also say:

- **Deck** — Print → Save as PDF gives one slide per page.
- **One-pager** — it prints on exactly one sheet, A4 or US Letter, untouched.
- **Email snapshot** — open it and click **Copy for email**; the paste hasn't
  been tried in their client, so send a test first (`layout-email.md` § Hand it
  over).
- **Teams post** — what **Copy as picture** and **Copy as text** each give, with
  the per-chart copy and PNG files as fallbacks (`layout-teams.md` § Hand it
  over).

On the **first** page in a conversation, if the user didn't ask for an editable
page, end with a one-line offer, such as: *"Want an editable version, so you can
switch chart types and change the text or numbers yourself without rerunning
this?"* Once only, and never for a one-pager. Build it only on a yes.

An editable page ships as **two files**: `<name>.html` (final, no editor, safe
to share) and `<name> (working copy).html` (editable, with a "Working copy"
banner, DRAFT print watermark and "Draft ·" tab title). Hand over both and say
which is which.

## Environment notes

Nothing here requires a specific agent or vendor: it needs file reads from this
directory, writing an HTML file, and Node for `finalize.js` and the checks.
Without Node, inline the library by hand — `charts.css` into a `<style>`, then
`theme.js` and `charts.js` into `<script>` blocks in that order, replacing the
placeholder tags; an editable page adds `assets/page-runtime.js` after them, and
an email or Teams snapshot adds `assets/email-snapshot.js` (an editable snapshot
gets both, in the template's order). Browser preview, the audit, screenshots and
file attachment are used when available and degrade gracefully when not.
