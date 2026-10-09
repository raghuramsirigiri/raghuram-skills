# Copilot instructions — chart-dashboard

This repository provides a reusable capability: turn supplied data into a single
self-contained HTML dashboard, report, slide deck or printable one-pager with
interactive SVG charts. No CDN, no npm install, no build step, no runtime
dependencies.

Shared cross-tool instructions live in [`AGENTS.md`](../AGENTS.md); the canonical
workflow is [`plugins/chart-dashboard/skills/chart-dashboard/SKILL.md`](../plugins/chart-dashboard/skills/chart-dashboard/SKILL.md).
Read both before building a dashboard, analytics page, KPI view, data report, slide deck, or
one-page printable brief.

Before writing chart code, consult:

- `plugins/chart-dashboard/skills/chart-dashboard/references/chart-api.md` — the core API (factories, shared options, sizing); then `references/charts/<type>.md` for only the chart types you use
- `plugins/chart-dashboard/skills/chart-dashboard/references/chart-selection.md` — data shape → chart type
- `plugins/chart-dashboard/skills/chart-dashboard/references/layout.md` — rules shared by every format; then `layout-dashboard.md`, `layout-report.md`, `layout-deck.md`, `layout-onepager.md`, `layout-email.md` or `layout-teams.md` for the format you picked
- `plugins/chart-dashboard/skills/chart-dashboard/references/annotation.md` — callouts, plot bands, forecast notation
- `plugins/chart-dashboard/skills/chart-dashboard/references/narrative.md` — action titles; where a finding goes
- `plugins/chart-dashboard/skills/chart-dashboard/references/design-rules.md` — emphasis, legends, chart count, the one design system
- `plugins/chart-dashboard/skills/chart-dashboard/references/verify-and-ship.md` — static check, browser audit, `finalize.js` (SKILL.md steps 7–8)
- `plugins/chart-dashboard/skills/chart-dashboard/references/controls.md` — before adding a filter or dropdown
- `plugins/chart-dashboard/skills/chart-dashboard/references/theming.md` — brand recolour and the generator scripts
- `plugins/chart-dashboard/skills/chart-dashboard/references/editable.md` — only when an editable page was asked for; start from the format's `templates/*-editable.html` (dashboard, report, slides, email — none for a one-pager)

Worked references: `examples/logistics-network-dashboard/` (dashboard),
`examples/coffee-pricing-deck/` (slide deck), `examples/ev-retrospective/` (report).

`plugins/chart-dashboard/skills/chart-dashboard/assets/charts-lib/` is a vendored copy of a library
maintained in another repo. Do not fix library bugs there — the next sync
removes your fix. Write the change up in `CHARTS-LIB-UPSTREAM.md` so it can be
applied upstream, and document the current behaviour in `references/`.

Non-negotiables:

- Load `theme.js` before `charts.js`.
- Donut and pie options (`centerText`, `valueSuffix`, `variableRadius`,
  `startAngle`/`endAngle`, `showPercentages`) belong under `plotOptions.pie`.
- Never invent numbers that read as real measurements.
- No CDN links, npm dependencies, or build steps — output must open offline.
  Finish with `node plugins/chart-dashboard/skills/chart-dashboard/scripts/finalize.js index.html` to ship one file.
- Derive the grid from the analysis; a hero cell goes to a finding that leads.
- A line chart needs an ordered x — `'Jan 2025'`, or a complete rising run like
  `'Jan'…'Jun'`; a shuffled run or named categories render an error panel.
- Any control must be fully wired: filtered data, every dependent panel redrawn,
  action titles recomputed — and a one-pager has none at all, because paper has
  no pointer.
- A one-pager is a report set in columns, not a dashboard on paper: prose leads,
  charts are sized to their column, the template ships no arrangement, and the
  page is meant to be packed. See `references/layout-onepager.md`.
