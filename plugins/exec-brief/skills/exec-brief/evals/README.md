# exec-brief — evals

**For whoever runs the evals, not for the skill.** Nothing here is needed to use `exec-brief`,
and a graded run must not read this file, any `.KEY.md`, or `evals.json` — they describe what
the fixtures contain, and a run that knows the answer isn't being tested. Point the run at the
fixture and at `SKILL.md` plus `references/`; nothing else under `evals/`.

## Fixtures

- `thread-wms-cutover.md` — a 13-message email thread, pasted newest-first. Plants a
  conditional date, a superseded estimate, a guessed cause, a settled blame exchange, a
  rejected option, a side topic, an upbeat last message, and one unreconciled date.
  Graded by `thread-wms-cutover.KEY.md` (evals 1, 5 and 6).
- `status-payroll-upgrade.md` — a green weekly status report that asks the reader nothing,
  ending with an open invitation that is not an ask (eval 2).
- `message-short.md` — a three-line Teams message; the brief must not be longer (eval 3).
- `team-update-mixed.md` — four unrelated subjects of similar weight; the run should ask
  which one (eval 4).

All names, companies and figures are invented. None of the fixtures' figures appear in
`SKILL.md` or `references/` — the references' examples use their own invented numbers so they
teach the rules, not the answers.
