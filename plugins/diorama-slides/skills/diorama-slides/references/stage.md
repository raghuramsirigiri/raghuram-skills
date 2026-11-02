# The stage: your world, its camera, its things

The stage is the living half of the frame: a toy-like 2.5D diorama under
the card, running without a break from the first frame to the last. It is
**your world**: one painter the page registers draws all of it, and every
insight in the video is something that painter makes happen
(`story.md` § Direct each insight). The engine gives the painter time, the
claims and a camera; it never decides what happens.

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
- **Each beat frames a point**: `stage.focus` names a mark your world
  returns from `marks(w)` (a mark may move, and the camera follows it) or
  gives [x, y, z]; a beat without one keeps the one before. `stage.zoom`
  (0.1–80: a cast drawn to scale may span a 30 m giant and a 50 cm glider, and each must be framed big enough to read) multiplies the scale that fits `stage.size` in the room;
  `stage.look` nudges the framing by [x, y, z].
- **Pan and zoom on the world only.** Between beats the camera eases (on
  `glide`) over the words' swap and half a second into the next words. The
  card, the kicker, the footer and every word above or below the stage
  never zoom or move.
- **Frame what the beat acts on.** Pick the focus and zoom so the thing that
  changes reads at phone size: a loaf, a face, a gauge. When the audit's
  `action` check says a beat changes little, look first at whether its
  change is just too small to see; zoom in before adding anything. A cast
  drawn to scale over a wide range (a giant and a glider) needs both: the
  beat whose insight *is* the comparison pulls back to take in the whole
  cast, and every other beat frames its own actor close enough to read,
  following it (a mark that moves) when it moves.
- **Stage labels** go through `api.label`: one size on screen whatever the
  zoom, fading before the stage's edges, giving way to anything you pass to
  `api.avoid`. A label is a name or a year, never a figure.

## The world

```json
"stage": { "shape": "assembly", "world": "mill", "size": [60, 40, 30], "time": 6 },
"scenes": [ { "id": "dawn", "type": "beat", "copy": { … },
              "stage": { "shows": "the wheel starts turning and the first sacks stack up", "time": 7, "focus": "wheel" } } ]
```

```js
Motion.things.mill = {
  marks(w) { return { wheel: [-20, 0, 12], store: [25, -5, 4] }; },
  draw(w, api) {
    const V = api.view('ground'), M = api.view('store'), m = api.mat;
    V.block(-50, -30, 0, 110, 60, 4, m.N2);                           // the board
    const turned = w.accumulate('wheel', b => (w.has('dawn') && b.index >= 1 ? 1.2 : 0));
    // … the wheel drawn at angle `turned`, the mill house, the river …
    const sacks = Math.floor(w.share('F2', 'F2') * w.progress('dawn') * 12);   // 12 sacks = F2, key in the card
    for (let i = 0; i < sacks; i++) M.block(18 + (i % 4) * 4, -10 + Math.floor(i / 4) * 4, 4, 3.5, 3.5, 3, m.N3);
  }
};
```

`stage.world` names the painter; `stage.size` is the extent a beat frames
at zoom 1; `stage.time` is where the story's clock starts. Everything the
painter needs comes in `w`:

| `w.` | What it is |
| --- | --- |
| `t` | seconds since the video started |
| `beat` | the beat the frame is in: `id`, `index`, `lt` (seconds into its words), `p` (its action's progress) |
| `progress(id)` | a beat's action, 0 before it starts, 1 once done. An action runs from the previous beat's words leaving to the middle of its own read; ease it yourself |
| `since(id)` | seconds since a beat's action finished (0 until then): a consequence that plays on through the hold, so the middle of a beat is never a frozen end state |
| `has(id)` | whether the beat is in this cut (cuts drop beats) |
| `time`, `timeAt(t)` | the story's clock: each beat's `stage.time` (a number or a claim), eased from one beat's to the next over the action |
| `accumulate(key, rate)` | the exact running total of a rate you give per beat (`rate(b)` with `b.id`, `b.index`, `b.time`), easing between beats: distance from a speed, water from a flow, people from an arrival rate, sacks from an output |
| `value(id)`, `display(id)`, `share(id, of)` | the claims; `share` is an amount in proportion and from zero, against another claim or a number |
| `beats` | every beat's `id`, `time`, `mid` and `act`, to place a thing where a beat happens |
| `blend(a, b, k)` | two forms blended (numbers, arrays, profiles of the same length) |

and in `api`: `view(owner, origin)` (an iso view; name it after the mark
it draws, and whatever the current beat focuses on is that beat's subject,
which the audit keeps inside the stage's room while the words hold), `mat`,
`iso`, `label`, `avoid`, `rect`, `rng(...keys)` (seeded), `ease`, `sstep`,
`lerp`, `clamp`, `range` (the world's visible x range), `ctx`.

**Drive each beat's action by its progress, its time or its rate**, never
by testing which beat is on screen (`w.beat.id === …`): the world must
stay where the story left it after the beat ends, and the audit's `action`
check asks "what if this beat had never happened?" by taking those away.
A beat's `wait` (seconds) holds the words' swap while a long action plays;
by default 1.4 s when the story's clock moves, else the plain swap.

## Never static, never generic

Something is always happening: the world's own life (water running, people
moving, a machine working) and each beat's action. The audit warns on a
stage that stops (`frozen`) and on a beat that changes nothing (`action`).
Motion comes from the source's nouns and verbs, never from decoration added
to fill a hold, and never from a habit carried over from another story.

## Drawing the story's things

There is no library of things, on purpose: a menu makes every video look
the same, and any noun it lacks falls back to boxes. You draw each thing
the world needs, for this video:

1. **Name the thing and what happens to it** from the source, in its
   words. Its look follows from the features the source names; its states
   are the numbers that change (a height, a fill, a count, a 0–1 for a
   part that comes and goes).
2. **Draw a few chunky shapes that read as that thing at the size it's
   drawn**, with the kit below. A side profile pushed across the thing's
   depth (`V.extrude`) makes most vehicles, animals, people and buildings;
   `V.block` or `V.prism` makes masses; `V.cone` makes trees, roofs and
   horns. Recognisable beats detailed: detail only where the story names it.
3. **Neutrals for things, the accent for data only.** A thing is drawn in
   the materials' neutrals (`N`, `N2`, `N3`, `DARK`, `PAPER`, `glass`);
   the accent marks what a figure is about (the part of a stock that is
   gone, a meter's fill), never a thing's paint.
4. **Figures come from the claims**, through `w.value` / `w.share`, never
   typed, and the card states each figure the stage acts out. A count of
   real things is one per thing or per a stated group, with the key in the
   card's words.
5. **A pure function of `w`.** No `Math.random`, `Date.now`, timers,
   `requestAnimationFrame`, state kept between calls, or `fillText`
   (`check-video.js` fails each).

### The kit

`V.box`, `V.block(x, y, z, w, d, h, tint, { r, b })` (corners cut by r, top
bevelled by b), `V.prism(footprint, z, h, tint, b)`, `V.extrude(profile,
axis, a0, a1, tint)` (axis `'y'`: a side view; `'x'`: a front view; `'z'`:
a plan), `V.cone(x, y, z, r, h, tint, n)`, `V.face(points3d, colour)`,
`V.line`, `V.path`, `V.shadow`, and `V.P(x, y, z)` for a screen point.
Slanted faces are shaded from the one light by their normal, so a bevel, a
windscreen or a cone's facets read without outlines. Depth order is yours:
draw far things first (smaller x + y), near things last.

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
