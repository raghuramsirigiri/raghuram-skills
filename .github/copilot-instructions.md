# Copilot instructions — chart-dashboard

This repository provides a reusable capability: turn supplied data into a single
self-contained HTML dashboard, report or slide deck with interactive SVG charts. No CDN, no
npm install, no build step, no runtime dependencies.

Shared cross-tool instructions live in [`AGENTS.md`](../AGENTS.md); the canonical
workflow is [`skills/chart-dashboard/SKILL.md`](../skills/chart-dashboard/SKILL.md).
Read both before building a dashboard, analytics page, KPI view, data report, or slide deck.

Before writing chart code, consult:

- `skills/chart-dashboard/references/chart-api.md` — every factory and option
- `skills/chart-dashboard/references/chart-selection.md` — data shape → chart type
- `skills/chart-dashboard/references/layout.md` — deriving the grid from the findings; spans and page structure
- `skills/chart-dashboard/references/annotation.md` — callouts, plot bands, forecast notation
- `skills/chart-dashboard/references/narrative.md` — action titles; where a finding goes
- `skills/chart-dashboard/references/controls.md` — before adding a filter or dropdown
- `skills/chart-dashboard/references/theming.md` — brand recolour and the generator scripts
- `skills/chart-dashboard/references/editable.md` — only when an editable page was asked for

Worked references: `examples/logistics-network-dashboard/` (dashboard),
`examples/coffee-pricing-deck/` (slide deck), `examples/ev-retrospective/` (report).

`skills/chart-dashboard/assets/charts-lib/` is a vendored copy of a library
maintained in another repo. Do not fix library bugs there — the next sync
removes your fix. Write the change up in `CHARTS-LIB-UPSTREAM.md` so it can be
applied upstream, and document the current behaviour in `references/`.

Non-negotiables:

- Load `theme.js` before `charts.js`.
- Donut and pie options (`centerText`, `valueSuffix`, `variableRadius`,
  `startAngle`/`endAngle`, `showPercentages`) belong under `plotOptions.pie`.
- Never invent numbers that read as real measurements.
- No CDN links, npm dependencies, or build steps — output must open offline.
  Finish with `node skills/chart-dashboard/scripts/finalize.js index.html` to ship one file.
- Derive the grid from the analysis; a hero cell goes to a finding that leads.
- A line chart needs an ordered x — `'Jan 2025'`, not bare `'Jan'`.
- Any control must be fully wired: filtered data, every dependent panel redrawn,
  action titles recomputed.
