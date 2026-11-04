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
| transformation | cars evolving (`family-car-eras.md`) | the camera, box camera to phone | signed off (`verified: true` in the manifest). Graded by evals 1 and 2 |
| lineup | dinosaurs and their cousins (`dinosaur-diversity.md`, the user's notes plus cited Wikipedia lengths) | the planets compared (NASA Planetary Fact Sheet; run once, untuned: it needed only a ball in the kit, and the audit's action check caught one weak beat, fixed in the video) | acceptance video built and audited (size beat reworked as a reveal); awaiting sign-off. Graded by eval 3 |
| assembly | Burj Khalifa construction (`burj-construction.md`, verbatim from Wikipedia, "Burj Khalifa"; `examples/diorama-burj-khalifa/`) | how a suspension bridge is built: the Golden Gate Bridge (Wikipedia, "Golden Gate Bridge"; `examples/diorama-golden-gate/`; run once on the shipped engine with no engine change, audit clean after reframing its own world) | acceptance video built and audited clean (a tall subject, framed by the centred focus; the old `stage.room` option is now ignored); awaiting sign-off. Graded by eval 6 |
| episodes | WW2 tactics, a place per tactic (`ww2-tactics.md`, excerpts from four Wikipedia articles; `examples/diorama-ww2-tactics/`) | four cities' storm surge barriers (Wikipedia, "Thames Barrier", "Maeslantkering", "Saint Petersburg Dam", "MOSE"; `examples/diorama-flood-barriers/`; run once on the shipped engine: it exposed that check-video.js never parsed the page's own script, now a FAIL, and that traffic drawn in a beat's subject view sails out of its room, now in `stage.md`) | acceptance video built and audited clean; awaiting sign-off. Graded by eval 4 |
| journey | the bar-tailed godwit E7's loop round the Pacific (`godwit-loop.md`, from Wikipedia, "Bar-tailed godwit"; `examples/diorama-godwit/`) | a route across a continent: the Trans-Siberian Railway (Wikipedia, "Trans-Siberian Railway"; `examples/diorama-trans-siberian/`; run once: it exposed that labels only gave way to what the page measured by hand, so a train's trailing cars ran through a place name; labels now give way on their own to the beat's subject view. Still weak: a wide continent in a tall frame leaves the whole-route view a thin strip) | acceptance video built and audited clean; awaiting sign-off. Graded by eval 5 |

**A generality probe** (`bakery-morning.md`, invented): after the engine
stopped owning the world's behaviour, one video was built on a topic none
of the above resembles (a clock, a count made, people arriving, a share
sold, leftovers given away), with the documented contract only and no
engine change for it. It found two engine gaps that every story would hit
(the audit's subject was a fixed name rather than whatever the beat
frames; a consequence couldn't play on through the hold), which were fixed
in the engine, not in the page.

**Signing a shape off.** A shape's `verified` flag in
`assets/motion-lib/motion.manifest.json` is flipped only after a person has
reviewed its acceptance video. Until then `check-video.js` prints a PASS
note that the review is pending, not a WARN, so warnings stay rare enough
to be read.

**Beyond the shapes**, two evals check judgement rather than a build: a
source that is mostly values, which should be steered to explainer-video
(eval 7), and a topic with no source, whose figures must be asked for or
labelled illustrative (eval 8).

Fixtures for the real-world topics (dinosaurs, Burj Khalifa, WW2, the
godwit) are written when their shape is built, from a source the user supplies or names
(an encyclopedia entry, a museum page), with locators. Never from memory:
a figure about a real thing that reads as a measurement must trace to a
source.

## Fixtures

- `dinosaur-diversity.md`: the user's own notes, pasted, plus cited
  Wikipedia lead-sentence lengths. It plants hedges ("could likely",
  "up to", "about", "estimated"), cousins that are **not dinosaurs**
  (pterosaurs, marine reptiles), a wingspan that must not be called a
  length (Quetzalcoatlus), and two sizes for Argentinosaurus in different
  units ("over 100 feet" in the notes, 30–35 m from Wikipedia). The prompt
  asks for diet, which the notes don't give (eval 3).
- `burj-construction.md`: verbatim sentences from Wikipedia's "Burj
  Khalifa" by section. It plants "more than" and "over" hedges, a record
  that was a *then* record, an opinion that must stay attributed ("widely
  considered vanity height"), and two different spire heights (242.6 m and
  244 m) that must not be silently merged (eval 6).
- `ferry-annual-summary.md`: an invented ferry operator's year in figures:
  fares, shares, a survey within its margin of error, a cost the operator
  explicitly doesn't blame, and a forecast. Almost nothing in it happens to
  a thing, so the right answer is to say so and point to explainer-video
  (eval 7).

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

The car, bakery and ferry fixtures are invented; the others quote real
sources with locators. No fixture's name appears in `SKILL.md` or
`references/`, whose examples use their own invented story
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
