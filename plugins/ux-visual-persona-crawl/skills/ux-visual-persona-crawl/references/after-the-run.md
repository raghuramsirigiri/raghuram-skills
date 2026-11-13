# After the run

Optional steps once `report.html` exists. Read this only when one of them is wanted.

## Tickets and a spreadsheet

If the user tracks work in an issue tracker or a spreadsheet:

```bash
<venv-python> <skill>/scripts/report.py export --study-dir <study-dir>
```

It writes one Markdown ticket per verified finding to `issues/`, `findings.csv`, and `issues/research-questions.md`. Each ticket carries its evidence crops, the fix, how many walks hit the problem, and the simulated-study caveat.

## Walking a persona again

A critical finding that rests on one walk is the easiest to doubt. `report.py verify` lists these under `rewalk`: each persona to walk again and the critical or high findings that rest on their one walk. When there's budget, walk that persona again: `eyes.py start` with the same `--persona` makes a new `<id>-2` session. Then re-run analyze, review and verify. Each finding's `exposure` then counts both walks, so the report says "hit in 2 of 2 walks" or "1 of 2".

## A brief or slides for stakeholders

Hand `verified_findings.json`, `flows.json` and `insights.json` to a summary or slides skill if one is available (in this repo: `chart-dashboard` or `exec-brief`). Keep the report's caveat that persona counts are not rates.

## Re-running after a fix

To check whether a change helped, run the study again with the same `personas.json` under a new study id, then:

```bash
<venv-python> <skill>/scripts/report.py compare --study-dir <new-study-dir> --baseline <old-study-dir>
```

It writes `compare.html` and `compare.json`, covering:

- each persona's outcome before and after
- the funnel
- the page scores
- the findings, as new, still there, or not seen again

"Not seen again" means no persona hit that problem in the new run, not that it is fixed. Look at the screen itself before calling it fixed.
