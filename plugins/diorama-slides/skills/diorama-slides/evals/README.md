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
| transformation | cars evolving (`family-car-eras.md`) | the camera, box camera to phone | acceptance video passes |
| lineup | dinosaurs and their cousins (`dinosaur-diversity.md`, the user's notes plus cited Wikipedia lengths) | the planets compared (NASA Planetary Fact Sheet; run once, untuned: it needed only a ball in the kit, and the audit's action check caught one weak beat, fixed in the video) | acceptance video built and audited (size beat reworked as a reveal); awaiting review |
| assembly | Burj Khalifa construction (Wikipedia, "Burj Khalifa"; `examples/diorama-burj-khalifa/`) | how a suspension bridge is built: the Golden Gate Bridge (Wikipedia, "Golden Gate Bridge"; `examples/diorama-golden-gate/`; run once on the shipped engine with no engine change, audit clean after reframing its own world) | acceptance video built and audited clean (a tall subject: it set `stage.room: "behind"`); awaiting review |
| episodes | WW2 tactics, a place per tactic (`ww2-tactics.md`, excerpts from four Wikipedia articles; `examples/diorama-ww2-tactics/`) | four cities' storm surge barriers (Wikipedia, "Thames Barrier", "Maeslantkering", "Saint Petersburg Dam", "MOSE"; `examples/diorama-flood-barriers/`; run once on the shipped engine: it exposed that check-video.js never parsed the page's own script, now a FAIL, and that traffic drawn in a beat's subject view sails out of its room, now in `stage.md`) | acceptance video built and audited clean; awaiting review |
| journey | the bar-tailed godwit E7's loop round the Pacific (`godwit-loop.md`, from Wikipedia, "Bar-tailed godwit"; `examples/diorama-godwit/`) | a route across a continent: the Trans-Siberian Railway (Wikipedia, "Trans-Siberian Railway"; `examples/diorama-trans-siberian/`; run once: it exposed that labels only gave way to what the page measured by hand, so a train's trailing cars ran through a place name; labels now give way on their own to the beat's subject view. Still weak: a wide continent in a tall frame leaves the whole-route view a thin strip) | acceptance video built and audited clean; awaiting review |

**A generality probe** (`bakery-morning.md`, invented): after the engine
stopped owning the world's behaviour, one video was built on a topic none
of the above resembles (a clock, a count made, people arriving, a share
sold, leftovers given away), with the documented contract only and no
engine change for it. It found two engine gaps that every story would hit
(the audit's subject was a fixed name rather than whatever the beat
frames; a consequence couldn't play on through the hold), which were fixed
in the engine, not in the page.

Fixtures for the real-world topics (dinosaurs, Burj Khalifa, WW2) are
written when their shape is built, from a source the user supplies or names
(an encyclopedia entry, a museum page), with locators. Never from memory:
a figure about a real thing that reads as a measurement must trace to a
source.

## Fixtures

- `ww2-tactics.md`: verbatim excerpts from four Wikipedia articles (Battle
  of the Atlantic, Battle of France, Operation Cartwheel, Mulberry
  harbours) with section locators. It plants a range (30 to 70 ships),
  "more than" and "over" hedges, and a bypassed base the excerpts never
  say withered. A war topic: graded for neutral, non-graphic staging (eval 4).
- `godwit-loop.md`: verbatim sentences from Wikipedia's "Bar-tailed
  godwit" with section locators. It plants figures about one named bird
  (E7) beside figures about "one tracked bird" and about the subspecies,
  which must not be attributed to E7, hedges "about" and "approximately",
  and a "record" the source does use (eval 5).
- `bakery-morning.md`: an invented neighbourhood note about one bakery's
  Saturday; hedges "about", "estimates", "usually"; clock times as claims.
  The generality probe above; no key.
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
