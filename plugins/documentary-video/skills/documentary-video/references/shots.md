# Step 6: the shots

Write `film/shots.js`: one entry per screenplay beat, in the same order, with
the camera, the light, and what moves. Captions, keys and claim ids are
copied from `film/screenplay.md` word for word, since that's where they were
checked.

## The contract

```js
window.FILM_META = { source: 'Source: <document>, <date>' };

window.buildShots = function (W) {          // W is what buildWorld returned
  const E = Film.ease, VB = Film.verbs;
  return [
    { id: 'B4', act: 'The morning peak', dur: 9, claims: 'C9', cut: true,
      caption: 'At the same hour, 38% of online drivers sit on the airport rank.',
      key: '1 car = 1% of online drivers',
      sky: 'dawn',
      cam: { from: { target: [60, -50, 0], az: -112, el: 52, dist: 560 },
             to:   { target: [230, -12, 0], az: -142, el: 42, dist: 125 } },
      setup() { W.carsAt('peak'); W.crowd(100); },
      update(t) { const k = Math.round(38 * E.span(t, 0.35, 0.9)); /* light k cars */ } },
  ];
};
```

- **`setup()`** puts everything the beat shows into its starting state. It
  runs every time the beat is entered, including when the viewer seeks into
  the middle of the film, so it can't rely on the beat before having run.
- **`update(t, s)`** moves things: `t` runs 0 to 1 over the beat, `s` is
  seconds. Compute positions from `t` (never accumulate from the last frame),
  so any frame can be drawn on its own.
- **`cut: true`** where the camera jumps rather than travels: a hard cut,
  like an edit. The film fades in at its start and out at its end, and
  nowhere else; a fade or dip at every cut makes the film blink. Mix cuts
  with travel: a beat that starts where the last one's camera ended carries
  the viewer through the world.

## The camera

`cam` is `{ from, to, ease }`, or a function `t => Film.camera({...})` when it
follows something (a hand, a moving car). A framing is:

- `target`: the point looked at, in metres.
- `az`: the direction the camera looks from, in degrees: 0 from `+x` (east),
  -90 from `-y` (south, the front of things), -135 from the south-west.
- `el`: height angle: 10-15 is eye level near people, 30-45 a raised view,
  50+ looking down on a district.
- `dist`: metres from the target. A face is 1-2 m, a crowd 15-25 m, a
  street 50-150 m, a city 300-600 m.
- `fov` (default 30) and `zoom`: the world may zoom; the words never do.

Moves that read well: a slow orbit (change `az` 20-40 degrees over the beat),
a push in (shrink `dist`), a pull back to reveal the whole, travel from one
place to another (move `target` with `dist` rising in between). Keep each beat
to one move.

## Light

`sky` is `'dawn'`, `'day'`, `'dusk'`, `'night'`, `'rain'`, or a function of
`t`, such as `t => Film.mixSky('day', 'night', t)` for the day passing. The
palette never changes; the sun's angle, the exposure and the shadows do.
Night wants something glowing (windows, lamps) or it is only darker.

## Verbs

`Film.verbs`, all driven by `t`:
- `move(g, path, t)`: along a path of points, facing the way it goes.
- `walk(fig, path, t)`: the same with a walk cycle.
- `stride(fig, phase, amount)`: the walk cycle alone, on the spot.
- `stagger(t, i, n, spread)`: item i's own 0..1 when n things start one
  after another.
- `light(items, k, t, on, off, part)`: the first k light up in turn, a count
  you can watch.
- `Film.ease.span(t, a, b)`: a window of the beat: 0 before `a`, 1 after `b`.

## Words on screen

Each beat carries its words as fields; the player draws them on the fixed
layer, animated in, never zooming.

- `caption`, `key`: copied from the screenplay.
- `stat: { value, decimals, prefix, suffix, label, window }`: the screenplay's
  Callout as a big number that counts up over `window` (fractions of the
  beat). `from` counts from a value other than 0; `still: true` shows it
  without counting (a goal, an "under 5"). When the number is a count of
  things lighting or leaving, use `count: (t, beat) => beat.lit` and have
  `update` set `this.lit` from the world, so the number on screen is always
  the number lit.
- `labels: [{ text, at, window }]`: names of places, pinned to a point in the
  world with a leader line, following the camera. Name a place the first time
  the camera arrives there, so the viewer knows where they are.
- `timer: { at, value, unit, window }`: a ring over a wait that fills and
  counts as the wait runs (a rider at the kerb, a queue at a desk).
- `card: { title, sub }`: the opening title and the closing line, over the
  dimmed world.

The callout and caption sit in a panel bottom left, the key top right, the
act top left. Frame each shot so the action sits in the upper two thirds or
the right half, clear of the panel.

## The figure in the action

The count in a beat's `Count:` line is what lights or moves: 38 cars light,
27 riders walk away. Light them one after another (`stagger`, `light`) so the
viewer sees the number build, hold the end state for the last 15-20% of the
beat so it can be read, and keep the beat's `key` on screen (the player shows
it top right). The callout counts in step with the units, so the picture and
the number land together.

## Checking

Open `film.html?strip` for the key-frame strip, each beat at its start,
middle and end in one picture, and look at it: is the action in frame, can
the lit units be counted, does the caption sit clear of what matters? The
page lists warnings under the player (a camera inside a solid or under the
ground); fix every one. Then play the film once through at full size.
