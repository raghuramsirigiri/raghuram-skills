# The continuous style: one world

`meta.style: "continuous"` turns the spec into one 2.5D world the camera
travels across, instead of scenes that replace each other. It is the style
for every video unless the user asks for slides. The words keep a band of
the frame to themselves; the findings are drawn as **places** in the world,
each a picture that carries its figure (`pictures.md`). The spec stays the
same: claims, copy and scene types, plus a `picture` on each finding.

## How a video becomes a world

- **Beat**: each scene is a beat. Its words sit in the band; its picture
  sits in the world below or beside them.
- **Place**: one picture (with any props) at one spot. A beat makes a new
  place (`picture.kind`), **revisits** one (`picture.at`, or automatically
  when it shows a claim that place already shows), or **rests** on the
  place in view.
- **The row**: places stand on one screen row, so every pan between them
  is level. A new place joins the end of the row nearer the place the story
  comes from, so the camera never crosses a place to reach another.
- **The camera** only pans. The world's scale is set once per video, the
  largest at which every place fits its stage, so nothing ever zooms.
- **The band** takes its shape from the frame: stacked at the top in 9:16; a
  row in 4:5 and 1:1 (the figure on the left, its words beside it); a left
  column in 16:9, with the world in the room to its right. The world never
  enters the band.

## A beat, in order

1. **Arrive.** The camera pans to the beat's place (1.25–1.8 s by distance;
   0.9 s for a pan down). Units start landing as the place slides in.
2. **Act.** The picture does its beat's work: units fill to the figure, a
   plinth lifts, a share is marked, a calendar page tears off.
3. **Land the words.** The figure in the band counts at the units' pace and
   lands on the claim's exact display.
4. **Read.** The words hold for their read time (`copy.md` § Read time);
   the beat lasts at least as long as its picture's work.
5. **Leave.** The words leave, and the world's labels (keys, marks, values)
   leave with them when the camera is about to move. Then the next pan.

Beats at the same place keep the camera still; only the words change.

## The grammar

- **Last year, then now.** Two states of one measure (`before-after`, or a
  `compare-bars` of two shares) play on one place: when the place already
  shows "now", it drains to "then" and comes back; otherwise it fills to
  "then", marks it, and moves to "now". The figure's year label follows.
- **A fall leaves a ghost.** When "now" is lower, the lost share stays as a
  faint ghost of the accent, so the drop is seen, not only read.
- **Emphasis** is a `plinth` under the place in view, for a verdict about
  that finding.
- **Carry-over.** `picture.from` names an earlier scene: a few units lift
  off its place and ride the pan to the new one (answers to a desk, visits
  to an application funnel). Carry-over shows the link the story makes; it
  never stands for a count.
- **Establishing shot.** Opening words with no picture of their own (a
  `hook-headline`) open on the first place the story reaches, its units yet
  to land.
- **Resting beats**: `bullet-stack`, `source-card`, `timeline`, `steps` and
  `quote` rest on the place in view. When their words reach further down,
  the camera lowers; when the place can't fit at all, the world steps aside
  for the closing run.
- **Taking the stage**: `photo-pan`, `custom` and `outro` take the stage for
  their beat; the world fades out under them and back for the next place.
- A **finding with no picture** rests on the place before it and leaves
  that place as it is. `check-video.js` warns (`pictures`): give it one.

## Writing the spec

1. Set `meta.style: "continuous"` (or `"slides"` when the user asks for
   slides). A spec that sets neither gets the world when its scenes have
   pictures, slides when none do.
2. Give each finding a `picture` from `pictures.md` § Choosing when one
   *is* the thing it counts: `of` names what one unit is a share of; `props`
   set the scene (`["branch"]`, `["laptop"]`). Any other thing is a
   `custom` scene that draws it (`pictures.md` § A finding the catalogue
   doesn't draw); it takes the stage for its beat.
3. Point a later scene back at an earlier place with `at` when it is about
   the same thing (a verdict, last year's figure). A claim the place already
   shows brings the camera back by itself.
4. Link places with `from` where the story moves something between them.
5. Give the summary's points their places' icons: `"picture": { "icons":
   ["hook", "e3", "why"] }`, one scene id per point.

**Done when** every scene that shows a figure has a picture (or a revisit),
`check-video.js` reports no `pictures` warning, and the audit is `ok` on
every cut, including its two world checks (`verify-and-ship.md` § 7.2):
`world-overlap` (no word touches a shape) and `stage` (the place in view
sits inside the frame, clear of its words, above the footer).

```json
{ "id": "e1", "type": "big-number",
  "copy": { "kicker": "On the water", "value": "F5", "line": "of bay crossings were by ferry" },
  "picture": { "kind": "blocks", "skin": "plain", "of": "bay crossings" } },
{ "id": "e2", "type": "compare-bars",
  "copy": { "kicker": "Riders", "title": "Ferry riders rose from {F3} to {F2}", "units": "Million trips a year" },
  "bars": [ { "label": "2025", "value": "F3" }, { "label": "2026", "value": "F2", "emph": true } ],
  "picture": { "kind": "columns" } },
{ "id": "e3", "type": "kicker-title",
  "copy": { "kicker": "The authority says", "title": "The ferry is now the city's busiest route" },
  "picture": { "kind": "plinth", "at": "e1" } }
```
