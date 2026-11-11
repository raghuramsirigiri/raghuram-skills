# Evals for ux-visual-persona-crawl

Graded runs must not open this file, `fixtures/demo-site/KEY.md` or `fixtures/demo-site/server.py`.

Start the fixture before running a case (`fixtures/demo-site/server.py --port 8765`). It is a
local energy-plan switching flow, "Brightwater", with flaws planted on purpose. The answer key
is in `fixtures/demo-site/KEY.md`.

| Case | Checks |
|---|---|
| `staging-signup-crawl` | Full test_env run: panel with demographics, per-persona navigation JSON, exit interviews, report that finds the planted visual and flow problems, nothing taken from hidden metadata |
| `observe-only-with-trace` | Live-site mode stays read-only; follow-up answers trace a contrast finding to a measurement and refuse to turn persona counts into a drop-off rate |
