# social-post — evals

**For whoever runs the evals, not for the skill.** Nothing here is needed to use
`social-post`, and a graded run must not read this file, any `.KEY.md`, or `evals.json`.
They describe what the fixtures contain, and a run that knows the answer isn't being tested.
Point the run at the fixture and at `SKILL.md`, `references/`, `templates/`, `scripts/` and
`assets/`, and nothing else under `evals/`.

## Fixtures

- `riverside-bikes-2026.csv` is nine months of a bike-share scheme's figures: rides, e-bike
  share, average trip length and stations. It plants a ratio that is *nearly* but not quite
  double (the user's prompt says "basically doubled"), a share that moves in points, a real
  dip in the last month, and no cause for any of it. The export date is only in the prompt.
  Graded by `riverside-bikes-2026.KEY.md` (evals 1, 4, 5, 6).
- Evals 2, 3 and 7 carry their data in the prompt. Their expected figures are in
  `evals.json`.

## What a run produces

Every eval except a no-data refusal builds a page. Grade the page as well as the chat:
run `node scripts/check-page.js <page> --final` on it, and open it in Edge or Chrome and run
`JSON.stringify(await SocialSnapshot.freeze())` for the picture sizes and post lengths. A
run that reports done without `finalize.js` exiting 0 fails every eval it was in.

All names, companies and figures are invented. None of the fixtures' figures appear in
`SKILL.md` or `references/`. The references' examples use their own invented numbers, so
they teach the rules, not the answers.
