# sanity-check — evals

**For whoever runs the evals, not for the skill.** Nothing here is needed to use `sanity-check`,
and a graded run must not read this file, any `.KEY.md`, or `evals.json` — they describe what
the fixtures contain, and a run that knows the answer isn't being tested. Point the run at the
fixture and at `SKILL.md`; nothing else under `evals/`.

(This used to be a *Testing* section in `SKILL.md`. Every clean-session run read it, because
runs read the skill; the counts it stated leaked into the graded output. Moved 2026-09-21.)

## Fixtures

`evals/` ships the fixtures and their keys. `pack-2026-11-dirty.xlsx` carries eleven planted
defects across ten families, one deliberate non-defect (a stated rounding convention), and one
trap (that convention must not excuse a 182.0 reconciliation gap). `sales-2026-09.xlsx` and
`sales-pack-2026-09.pptx` are borrowed from `whats-changed` and have only two and two real
defects respectively — they are the false-positive tests, and the more important ones.
`pack-2026-11-clean.xlsx` should return a clean verdict and nothing else. Never feed a `.KEY.md`
in with a fixture.
