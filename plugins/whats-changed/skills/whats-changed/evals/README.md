# whats-changed — evals

**For whoever runs the evals, not for the skill.** Nothing here is needed to use `whats-changed`,
and a graded run must not read this file, any `.KEY.md`, or `evals.json` — they describe what
the fixtures contain, and a run that knows the answer isn't being tested. Point the run at the
fixture and at `SKILL.md`; nothing else under `evals/`.

(This used to be a *Testing* section in `SKILL.md`. Every clean-session run read it, because
runs read the skill; the counts it stated leaked into the graded output. Moved 2026-09-21.)

## Fixtures

`evals/` ships the fixtures and their answer keys. `sales-2026-08.xlsx` / `-09.xlsx` are the
clean-shape pair; `sales-pack-2026-08.pptx` / `-09.pptx` test decks, native charts, a
picture-of-a-chart slide and a top-5 truncation; `sales-pack-2026-08.pdf` tests £0.1m
rounding against a £k workbook; `-08-scanned.pdf` has no text layer at all.
`sales.KEY.md` and `sales-pack.KEY.md` grade them — never feed a key in with a fixture.

Added 2026-09-24 so every eval runs against a real file:

- `ops-costs-2026-08.xlsx` / `-09.xlsx` (eval 2) — ten cost lines, September = August with
  ±0.5% jitter. Total −3.4 on 1,284.4 (−0.26%); largest line Salaries −4.1.
  **Known spec gap:** the absolute gate is 5% of the *total* change, so on a near-zero total
  Salaries (121% of the move) clears it. Read literally, `materiality.md` yields a driver
  here; the eval expects the flat one-liner. Until the gate gets a floor for a flat total,
  expect this eval to fail — it is testing the spec, not only the skill.
- `regional-sales-aug-sep-2026.xlsx` (eval 6) — one sheet, `Aug` / `Sep` / typed `Variance`.
  Two stale variances: East says +4.8 (arithmetic +1.8), West says −9.7 (arithmetic −15.7).
  The Variance column is typed throughout, so no hardcoded-cell flag applies; its `SUM` total
  (+37.5 vs +28.5) disagrees only as a consequence of the two rows — one flag line or two is
  tolerated for trigger 10, as long as East and West are both named. Net move +28.5, so the
  absolute gate is 1.4.
- `cost-centres-2026-08.xlsx` (title `£000s`) / `-09.xlsx` (title `£`, values ×1000) (eval
  7) — identical cost-centre labels; the only difference that matters is the unit.
