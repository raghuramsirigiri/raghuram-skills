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
