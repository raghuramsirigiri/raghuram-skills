# diorama-slides — evals

**For whoever runs the evals, not for the skill.** Nothing here is needed to
use `diorama-slides`, and a graded run must not read this file, any
`.KEY.md`, or `evals.json`. Point each run at its fixture and at `SKILL.md`,
`references/`, `templates/`, `scripts/` and `assets/`, and nothing else
under `evals/`.

## The acceptance topics, fixed before building

One per shape, plus one **unseen** topic per shape that is never used while
a shape is being built or tuned. A fix that only helps the topic being
worked on doesn't go into the skill; the unseen topic is how that is caught.

| Shape | Acceptance topic | Unseen topic (never tuned on) | Status |
| --- | --- | --- | --- |
| transformation | cars evolving (`family-car-eras.md`) | the camera, box camera to phone | built; acceptance video passes |
| lineup | dinosaurs compared (by size, then diet, then hunting) | the planets compared | not built |
| assembly | Burj Khalifa construction | how a suspension bridge is built | not built |
| episodes | WW2 tactics, a campaign per place (neutral, non-graphic) | five cities' flood defences | not built |
| journey | a migration route on a schematic map | a trade route across a continent | not built |

Fixtures for the real-world topics (dinosaurs, Burj Khalifa, WW2) are
written when their shape is built, from a source the user supplies or names
(an encyclopedia entry, a museum page), with locators. Never from memory:
a figure about a real thing that reads as a measurement must trace to a
source.

## Fixtures

- `family-car-eras.md`: an invented museum gallery guide to five
  generations of an invented maker's family car, 1912–2024. It plants a
  hedged top speed ("about"), a range with "up to", wage costs "about" and
  "an estimated", a forecast with "expects … could", a superlative that
  must keep "one of", a 1979 car with **no top speed given** (a bar chart
  of top speeds must not invent one), unevenly spaced years (bars, never a
  line), and fuel prices doubling the year before the Compact with **no
  causal link stated**. The maker and its cars are fictitious, so the
  stage draws generic cars and no real brand. Graded by
  `family-car-eras.KEY.md` (evals 1 and 2).

All names and figures in the fixtures are invented. None of them appear in
`SKILL.md` or `references/`, whose examples use their own invented story
(`skill-md.test.js` checks the fixture names).

## Running a round

- One shape at a time, end to end, inline: no parallel agents. Get the
  acceptance topic to a real, exported-checked video first; then run its
  unseen topic once, untuned.
- Grade the chat **and** the page: `node scripts/check-video.js <page>
  --final`, then open the page over a local HTTP server (not `file://`),
  load `motion-lib/audit.js` beside it, and run `VideoAudit.run({ cut,
  exportProbe: true })` on every cut. Look at the contact sheet: the stage
  must read as one world whose subject changes, not separate scenes.
