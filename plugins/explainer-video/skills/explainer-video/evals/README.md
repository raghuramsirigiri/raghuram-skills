# explainer-video — evals

**For whoever runs the evals, not for the skill.** Nothing here is needed to use
`explainer-video`, and a graded run must not read this file, any `.KEY.md`, or
`evals.json`. Point each run at its fixture and at `SKILL.md`, `references/`,
`templates/`, `scripts/` and `assets/`, and nothing else under `evals/`.

## Fixtures

- `harbor-ferry-article.md`: a dated local news story about a fictional city's
  ferries. It plants a hedged forecast ("the board estimates … could reach"), a
  superlative temptation (the paper's own headline flirts with "record"; the body says
  "highest since 2009", and 2009 was higher), a verbatim quote, and two facts (a new
  route, a fare freeze) in separate paragraphs with **no causal link stated**. Graded by
  `harbor-ferry-article.KEY.md` (evals 1, 5, 6, 7, 8).
- `survey-insights.md`: internal notes with three survey findings, one of them on a
  small base (n = 46) that the notes themselves caveat, and an explicit "we have not
  analysed why". Graded by `survey-insights.KEY.md` (eval 2).
- `clinic-waits.csv`: 18 months of median waits with one blank month (a gap, not a zero)
  and a fall in the last two months. Graded by `clinic-waits.KEY.md` (eval 3).
- `brand-logo.svg`: a fictional company's logo for eval 8. Its secondary colour fails
  contrast as text on light paper.

All names, places and figures are invented. None of them appear in `SKILL.md` or
`references/`, whose examples use their own invented story (`skill-md.test.js` checks the
fixture names).

## Running a round

- A fresh subagent per run, in its own scratch folder, reading only the skill files and
  its fixture. Three runs per eval.
- Grade the chat **and** the page: `node scripts/check-video.js <page> --final`, then open
  the page in headless Chrome or Edge at 1440×900 over a local HTTP server (not
  `file://`), load `motion-lib/audit.js` beside it, and run
  `VideoAudit.run({ cut, exportProbe: true })` for every cut.
- A run that reports done without `finalize.js` exiting 0 fails every eval it was in.

## What Node tests can't cover

Real encoding (WebCodecs), real font metrics, real contrast on painted pixels and the
round-trip playback are browser-only. The Node suites cover the compiler, determinism,
scene painting on a mock context, both muxers' file structure, `check-video.js` and
`finalize.js`. The audit and these evals cover the rest.
