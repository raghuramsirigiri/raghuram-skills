# Evals for ux-visual-persona-crawl

Graded runs must not open this file or anything under `fixtures/` (the answer keys and the sites' source).

Before spending an agent run, check the scripts with `tests/test_pipeline.py`. It starts the fixture on a free port, makes scripted walks with no agents, and runs every `eyes.py` and `report.py` command in about 20 seconds:

```bash
.ux-visual-crawl/venv/Scripts/python.exe -m unittest discover -s <skill>/tests -v
```

Start the fixture before running a case (`fixtures/demo-site/server.py --port 8765`). It is a
local energy-plan switching flow, "Brightwater", with flaws planted on purpose. The answer key
is in `fixtures/demo-site/KEY.md`.

Ledgerly (`fixtures/trial-site/`) is a SaaS free-trial sign-up with its own planted problems, unrelated to Brightwater's. Judge a change to the skill on it too, so a fix is shown to work on a flow it wasn't tuned on.

| Case | Checks |
|---|---|
| `staging-signup-crawl` | Full test_env run: panel with demographics, per-persona navigation JSON, exit interviews, report that finds the planted visual and flow problems, nothing taken from hidden metadata |
| `moving-screen-dead-button` | Two personas on `/offers`, whose banner rotates by itself: the dead "Get this offer" button is still caught, the working "See offer details" isn't called dead |
| `bot-wall-stops-run` | A bot check at `/account`: personas stop with `blocked_by_site` without ticking it, and the reply treats it as a limit of the test, not a finding |
| `trial-signup-gives-up` | On the second site, Ledgerly (`fixtures/trial-site/server.py --port 8766`, key in its `KEY.md`): three personas, the driver ends at least one walk by `gives_up_when` or patience, the impatient one stops first, those exits are reported as evidence, and the card-promise contradiction, colour-only error and phone/skip-link problems are found |
| `observe-only-with-trace` | Live-site mode stays read-only; follow-up answers trace a contrast finding to a measurement and refuse to turn persona counts into a drop-off rate |
