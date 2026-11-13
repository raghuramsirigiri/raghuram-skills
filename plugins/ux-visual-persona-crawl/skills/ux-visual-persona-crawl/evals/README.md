# Evals for ux-visual-persona-crawl

Graded runs must not open this file, `fixtures/demo-site/KEY.md` or `fixtures/demo-site/server.py`.

Before spending an agent run, check the scripts with `tests/test_pipeline.py`. It starts the fixture on a free port, makes scripted walks with no agents, and runs every `eyes.py` and `report.py` command in about 20 seconds:

```bash
.ux-visual-crawl/venv/Scripts/python.exe -m unittest discover -s <skill>/tests -v
```

Start the fixture before running a case (`fixtures/demo-site/server.py --port 8765`). It is a
local energy-plan switching flow, "Brightwater", with flaws planted on purpose. The answer key
is in `fixtures/demo-site/KEY.md`.

| Case | Checks |
|---|---|
| `staging-signup-crawl` | Full test_env run: panel with demographics, per-persona navigation JSON, exit interviews, report that finds the planted visual and flow problems, nothing taken from hidden metadata |
| `moving-screen-dead-button` | Two personas on `/offers`, whose banner rotates by itself: the dead "Get this offer" button is still caught, the working "See offer details" isn't called dead |
| `bot-wall-stops-run` | A bot check at `/account`: personas stop with `blocked_by_site` without ticking it, and the reply treats it as a limit of the test, not a finding |
| `observe-only-with-trace` | Live-site mode stays read-only; follow-up answers trace a contrast finding to a measurement and refuse to turn persona counts into a drop-off rate |
