# AGENTS.md — chart-dashboard

Instructions for any AI coding agent working in or with this repository.
Vendor-neutral: no Claude-specific tools, formats, or APIs are required.

## What this repo provides

A reusable capability: **turn supplied data into a single self-contained HTML
dashboard, report or slide deck with interactive SVG charts.** No CDN, no npm install, no
build step, no runtime dependencies.

The canonical instructions live in
[`skills/chart-dashboard/SKILL.md`](skills/chart-dashboard/SKILL.md). That file
is the source of truth — this one only routes you to it.

## When to use it

Any request to build a dashboard, analytics page, KPI view, chart deck, or
illustrated data report from data the user provides or describes — a table, CSV,
pasted numbers, metrics, notes, or a topic with figures in it.

## How to use it

1. Read [`skills/chart-dashboard/SKILL.md`](skills/chart-dashboard/SKILL.md) and
   follow its workflow.
2. Read these before writing chart code — do not guess option names:
   - [`references/chart-api.md`](skills/chart-dashboard/references/chart-api.md) — every factory and option
   - [`references/chart-selection.md`](skills/chart-dashboard/references/chart-selection.md) — data shape → chart type
   - [`references/layout.md`](skills/chart-dashboard/references/layout.md) — deriving the grid from the findings; spans and page structure
   - [`references/annotation.md`](skills/chart-dashboard/references/annotation.md) — callouts, plot bands, forecast vs. measured notation
   - [`references/narrative.md`](skills/chart-dashboard/references/narrative.md) — action titles; where a finding goes (title, insight column, or card)
   - [`references/controls.md`](skills/chart-dashboard/references/controls.md) — read before adding a filter or dropdown
   - [`references/theming.md`](skills/chart-dashboard/references/theming.md) — brand recolour, and the two scripts under `scripts/` that generate it
   - [`references/editable.md`](skills/chart-dashboard/references/editable.md) — only when the user asked for an editable page
   - [`assets/charts-lib/charts.manifest.json`](skills/chart-dashboard/assets/charts-lib/charts.manifest.json) — quick per-engine facts (data shape, refusals, sizing)
3. Start from a template in `skills/chart-dashboard/templates/`: `dashboard.html`,
   `report.html`, `slides.html` (a deck), or `dashboard-editable.html` (only when
   an editable page was asked for).
4. Stage the library beside your output while you build and verify it, then
   fold it in and ship one file:
   ```bash
   node skills/chart-dashboard/scripts/finalize.js index.html --stage   # verify against this
   node skills/chart-dashboard/scripts/finalize.js index.html           # inline, clean up, gate
   ```

## Non-negotiables

- `theme.js` must load **before** `charts.js`. Reversed, nothing renders.
- Donut and pie options (`centerText`, `valueSuffix`, `variableRadius`,
  `startAngle`/`endAngle`, `showPercentages`) live under `plotOptions.pie`, not
  at the top level. At the top level they are silently ignored.
- Never invent numbers that read as real measurements. If the user gave a topic
  with no data, say so and label the figures illustrative on the page itself.
- Do not add a CDN link, npm dependency, or build step. The output must open
  offline by double-click.
- Build static pages unless the user asked for an editable one. An editable page
  ships as two files: `<name>.html` (final) and `<name> (working copy).html`.
- In a deck, lay the fixed spine first — cover, agenda, section dividers,
  closing statement — then choose a layout per claim (`references/layout.md`).
- Derive the grid from the shape of the analysis; the dashboard template ships
  without a starter arrangement on purpose. A wide hero cell goes to a finding
  that genuinely leads, not to whatever panel was written first.
- A line chart needs an ordered x. Named categories — and bare month names like
  `'Jan'` — render an error panel; write `'Jan 2025'` or use a column chart.
- `assets/charts-lib/` is a **vendored copy** of a library that lives in another
  repo (`svg-charts`). Never fix a library bug here — a future sync would wipe
  it, and the two copies would disagree in the meantime. Write the fix up in
  [`CHARTS-LIB-UPSTREAM.md`](CHARTS-LIB-UPSTREAM.md) instead, as a diff against
  the upstream engine file, and leave the copy alone; see *Recording a new
  change* there. Patch the copy only when the skill cannot work without it, and
  then say so in the same note. `node --test
  skills/chart-dashboard/tests/upstream-notes.test.js` checks the copy against
  what the note claims. Docs under `references/` are the skill's own — when the
  library behaves surprisingly, saying so there is the fix to make here.
- If the page has a control, wire it completely: filter the data, redraw every
  dependent panel and KPI, and recompute any title that states a finding. A
  static page is fine; a half-wired dropdown is not.

## Using this skill in a different project

Copy the skill folder into the target project and point your agent at it:

```bash
cp -r skills/chart-dashboard /path/to/your-project/.agent-skills/chart-dashboard
```

Then add to that project's `AGENTS.md` (or `GEMINI.md`, `CLAUDE.md`,
`.github/copilot-instructions.md` — whichever your tool reads):

```markdown
## Dashboards
When asked to build a dashboard, analytics page, or data report, follow
`.agent-skills/chart-dashboard/SKILL.md`.
```

## Repo layout

```
skills/chart-dashboard/   the skill: SKILL.md, references/, templates/, assets/, scripts/
examples/                 two finished outputs, open index.html directly
docs/                     GitHub Pages landing page
.claude-plugin/           Claude Code plugin manifests (ignore for other tools)
```

## Contributing

New chart types need an entry in `references/chart-selection.md` — when to use
it and when not to — alongside the engine code. The selection guidance is what
makes the output good, not the renderer.
