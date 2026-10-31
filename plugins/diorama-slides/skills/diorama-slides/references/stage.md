# The stage: its shape, its camera, its things

The stage is the living half of the frame: a toy-like 2.5D diorama under
the card, running without a break from the first frame to the last. The
story's shape (`story.md`) decides how it moves; the things on it are drawn
by you, for this video, from the source's nouns.

## The room the stage gets

The card owns the top of a tall or square frame (the left column of a
wide one) and the footer; the stage owns the rest, the full frame width,
and dissolves into the paper at its inner edges, so no word ever sits on
it. Beats with only words share one stage top, so the stage holds still
from beat to beat; a beat with a figure or a chart in the card gives the
stage the room under it, and the camera reframes to fit.
`check-video.js` warns when a beat leaves the stage less than about a
fifth of the frame's height.

## The camera

- **One angle for the whole video**: an isometric view from the front
  right, never rotated, never tilted. Every beat sees the world from the
  same place, which is what makes it one world.
- **Pan and zoom on the world only.** Between beats the camera eases (on
  `glide`) to the next beat's framing over the words' swap and half a
  second into the next words. During a beat it follows the subject. The
  card, the kicker, the footer and every word painted above or below the
  stage never zoom or move.
- **Stage labels** (a stop's year, a place's name) are set at one size on
  screen whatever the zoom, through `api.label`; they ride with the world,
  fade before the stage's edges, and give way when the subject passes over
  them.
- A beat's `stage.zoom` (0.5–3, default 1) multiplies the scale fitted to
  its room; `stage.look` ([x, y, z] in the subject's units) moves the point
  the camera centres on, to look at a part (the fins, a doorway). The audit
  fails a beat whose subject leaves its room while the words hold, so a
  close zoom needs a look that keeps the subject in.

## The stage acts out the story

Every beat's `stage.shows` (`story.md` § The point) says what the stage does
to show that beat's finding, and the directions make it happen. The shape
gives the grammar; the story gives the motion:

- **Pace.** How fast the subject moves is the story's when the story has a
  rate: a state's `pace` (or a beat's) is a claim id, drawn in proportion
  and from zero, the largest pace claim at `topPace` subject lengths per
  second (2 by default). A top speed of 60 then 170 km/h is a car that
  visibly triples its speed. A plain number is lengths per second for
  motion that carries no figure. `0` halts the subject.
- **Halts and stops.** The subject halts where the story stops: for fuel,
  to charge, to unload. A beat with `pace: 0` eases to a stop over the
  words' swap; the next pace pulls it away.
- **Things where beats happen.** `api.beats` gives where the subject is at
  each beat's middle, so a pump stands where the story stops for fuel and
  a charging post where it charges. A thing can act during its beat
  (`s.beat.id`, `s.beat.lt`): a meter fills to a claim's value, a crane
  lifts, a door opens.
- **Never static, never generic.** With no pace anywhere the subject drifts
  slowly so the stage never freezes; that drift is a fallback, never the
  story's motion. Motion comes from the finding's verb (a car speeds up, a
  tower rises, a column marches), never from decoration added to fill a
  hold. The audit's `frozen` warning catches a stage that stops.

## Transformation

One subject, its states, on one path.

```json
"stage": {
  "shape": "transformation", "subject": "car", "size": [46, 20, 18],
  "states": [
    { "id": "open",   "label": "1912", "form": { "len": 38, "roof": 11, "wheel": 5.2, "open": 1 } },
    { "id": "closed", "label": "1934", "form": { "len": 40, "roof": 17, "wheel": 4.4, "open": 0 } }
  ],
  "ground": "road", "scenery": "stops", "trail": "none"
}
```

and on each beat, `"stage": { "state": "closed", "zoom": 1.2, "look": [-6, 0, 0], "shows": "the closed car pulls away faster" }`.
A state or a beat may also set `"pace"` (§ The stage acts out the story).

- **`subject`** names the painter (`Motion.things.car`); **`size`** is its
  largest extent [length, depth, height] in its own units, which sets the
  scale and the spacing of the stops.
- **`states`**, in story order, each with an `id`, a short `label` (a year
  or a name, never a figure) and a **`form`**: the numbers that describe
  the subject in that state. The painter reads them; the engine blends
  them as the subject changes (numbers and number arrays smoothly, a
  profile `[[u, v]…]` point by point when two states have the same number
  of points, anything else halfway).
- A state with a **`parent`** other than the state before it starts a
  branch: a lineage. The branch runs on its own lane behind the main line,
  joined square to it, and the subject crosses to it. **`trail: "keep"`**
  leaves each state standing at its stop once the subject moves on, so a
  lineage stays in view.
- **The grammar**: during a beat the subject travels at its pace, passing
  its point at the middle of the beat, and the camera follows, so the base
  slides by as fast as the subject goes. A beat that names a new state holds
  the words' swap for 1–2 s while the subject travels on and changes form,
  and the new state's stop is set where it arrives. A pace change with no
  new state (pulling in, pulling away) eases over the same stretch. A beat
  with no `state` keeps the one before.
- **`ground`** (optional) is a painter that dresses the base for this story
  (a road, a riverbank, rock strata); **`scenery`** (optional) draws things
  beside the path, called twice per frame with `layer: 'back'` and
  `'front'`. Both get the stops (`api.nodes`) and the visible range
  (`api.range`). Put scenery only where the source names something there.

### The other shapes (named, not built in this version)

- **Lineup**: a cast of painters on one stage; each beat names a measure,
  and the cast rearranges by it (sorted by size, grouped by diet), every
  member moving at once. A size comparison is drawn at true relative size
  from the claims; a measure with no physical form is a flat chart in the
  card while the cast stands by.
- **Assembly**: one thing on its site; each beat names a step, and the
  next part goes on (lifted, slid, stacked). A cutaway is a staged insert:
  the camera zooms to the part while the rest stays in place.
- **Episodes**: one board with a place per item; each beat names an item,
  and the camera travels to its place, where its own thing plays.
- **Journey**: a schematic map stage (land, water, a route line, plain
  labels for named places); each beat names a leg, and the mover goes on
  along the route while the camera follows. Never the look of a real map
  product.

## Drawing the story's things

There is no library of things, on purpose: a menu makes every video look
the same, and any noun it lacks falls back to boxes. You draw each thing
the stage needs, for this video:

1. **Name the thing, its forms and its verb** from the source: "an open
   car with a folding cloth hood and spoked wheels", then "a closed
   all-steel body with glass windows all round". The forms are the states'
   numbers: lengths, a roof line, a wheel size, a 0–1 for a part that
   comes and goes (an open top, fins, a light bar). The verb is how it
   moves: wheels turn with `s.dist`.
2. **Draw a few chunky shapes that read as that thing at the size it's
   drawn**, with the kit below. A side profile pushed across the thing's
   depth (`V.extrude`) makes most vehicles, animals and buildings; a
   `V.block` or `V.prism` makes masses; `V.cone` makes trees, roofs and
   horns. Recognisable beats detailed: detail only where the story names
   it (the fins the source mentions; no hubcaps it doesn't).
3. **Neutrals for things, the accent for data only.** A thing is drawn in
   the materials' neutrals (`N`, `N2`, `N3`, `DARK`, `PAPER`, `glass`);
   the accent marks a figure (a bar in the card, a mark the finding is
   about), never a thing's paint.
4. **Words only through `api.label`**, at one size on screen, and only a
   name or a year: a figure lives in the card, as a claim.

```js
Motion.things.car = { draw(V, s, api) {
  const f = s.form, m = api.mat, r = f.wheel, rot = s.dist / r;   // wheels roll with the distance
  const side = api.iso.soften([[-f.len / 2, r * 0.55], [f.len / 2, r * 0.55], [f.len / 2, f.nose],
    [f.len / 2 - f.hood, f.belt], [-f.len / 2, f.belt]], 1.2);
  V.extrude(side, 'y', -9, 9, m.N3);                               // the body, from its side profile
  if (f.roof > f.belt + 0.3) V.extrude([[8, f.belt], [4, f.roof], [-9, f.roof], [-13, f.belt]], 'y', -7, 7, m.N3);
  [-12, 12].forEach(x => V.extrude(api.iso.ngon(x, r, r, 12, rot), 'y', 7, 10, m.DARK));
} };
```

### The painter's contract

- `draw(V, s, api)`. **V** is a view whose origin is the thing's place on
  the base: x along the path (the direction of travel), y across it (+y
  toward the viewer), z up. Draw far parts first, near parts last.
- **s**: `form` (blended), `from`, `to`, `k` (0..1 through the change),
  `state`, `dist` (distance travelled), `speed` (subject lengths per
  second), `heading`, `beat` (`{ id, index, lt, dir }`, the beat the frame
  is in and seconds into its words), `t`, `still` (a trail copy at its stop).
- **api**: `mat` (the tints), `iso` (`soften`, `inset`, `ngon`, `blend`,
  `shade`), `rng(...keys)` (seeded), `ease`, `sstep`, `lerp`, `clamp`,
  `label`, `value(id)` and `display(id)` for claims, `beats` (where the
  subject is at each beat's middle), `nodes`, `range`, `width`, `len`, and
  for scenery `layer`. A figure drawn on the stage (a meter's fill) is read
  with `api.value`, never typed, and the card states it.
- **A pure function of its inputs.** No `Math.random`, `Date.now`, timers,
  `requestAnimationFrame`, or state kept between calls; no `fillText`
  (`check-video.js` fails each).

### The kit

`V.box`, `V.block(x, y, z, w, d, h, tint, { r, b })` (corners cut by r, top
bevelled by b), `V.prism(footprint, z, h, tint, b)`, `V.extrude(profile,
axis, a0, a1, tint)` (axis `'y'`: a side view; `'x'`: a front view; `'z'`:
a plan), `V.cone(x, y, z, r, h, tint, n)`, `V.face(points3d, colour)`,
`V.line`, `V.path`, `V.shadow`. Slanted faces are shaded from the one light
by their normal, so a bevel, a windscreen or a cone's facets read without
outlines.

## Real things, brands and people

- **What the source names may be shown as itself.** A car model, a
  building, a ship or a brand the source mentions may be drawn as that
  thing, in the kit's toy style (its proportions and the features the
  source describes). When the source names two brands, both may appear.
- **What it doesn't name is generic.** No real model, building or brand
  the source doesn't mention; use a generic thing or a fictitious name.
- **Logos only from files.** A logo is used only when the user or the
  source supplies the file (`meta.brand.logo`, or a data URI the user gave);
  never drawn from memory. Without a file, the brand's name is set as text
  in the card.
- **No likenesses.** A real person is a generic figure, named in the card
  if the source names them; never a drawn face or a recognisable likeness.

## Sensitive topics

War, disaster, crime, illness: neutral and non-graphic. Show what moved
and how (formations, routes, supply lines, the shape of a manoeuvre) as
plain blocks and arrows on the board; never casualties, wounds, weapons
firing, flags waved in triumph or any framing that glorifies a side. Words
stay in the source's register, attributed. When a source dwells on harm,
the stage shows places and movement, and the figures stay in the card,
attributed.
