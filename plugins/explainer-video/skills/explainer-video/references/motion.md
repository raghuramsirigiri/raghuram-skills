# Motion

The engine carries the motion language: one transition, content that
holds still at its laid-out size, and a frame that stays put. A `custom`
scene, rarely, draws its own content. These are the numbers it uses and the
rules a custom scene follows.

## The numbers

- **Read time** (`copy.md` § Read time): max(1.2 s, 0.5 + 0.25 s/word),
  counted from when the headline lands; numbers 1.5 s after landing; source
  card 2 s; final frame 1 s.
- **Hook by 0.5 s**: something readable is on screen by frame 15 at 30 fps.
- **Stagger**: words 60–90 ms, lines up to 100 ms, rows 80–120 ms.
- **Springs**: ω 12–40. Data is critically damped (never passes its value).
  Non-data shapes may take a tiny overshoot (ζ ≥ 0.8).
- **Eases**: entrances on `outQuint` (cubic-bezier .16,1,.3,1), morphs on
  `glide` (.45,0,.15,1), exits on expo-in.
- **No zoom**: content is drawn at its laid-out size from entrance to exit.
  Nothing pushes, zooms, drifts or shakes, pictures included.
- **No dead time**: a still frame lasts only as long as its read needs. The
  engine sets holds to that; a `dur` that stretches one further, or a
  custom painter that stops, gets an audit warning (`frozen`).

## The shared frame

Three things are the same on every slide, so they are never rebuilt between
slides: **the accent bar** (the through-line), **the kicker line** under it,
and **the footer**, a hairline over the source line. The engine draws them
outside the scenes, in one place for the whole video (per format), and they
stay still through every transition. Only the scene's own content (headline,
figure, chart) enters and leaves.

- **The bar**, short, in the subject colour, at the top-left of the safe
  area. It never changes size between scenes.
- **The kicker** sits on its own line under the bar. When the next scene's
  kicker is the same, it doesn't move at all; when it differs, the new one
  rolls up through the line's own mask as the old one rolls out, in place.
  A scene without a kicker leaves the line empty.
- **The footer**: the hairline sits where the video's longest source line
  needs it and never moves. When the next scene's source line is the same,
  nothing changes; when it differs, the old one fades out and the new one
  fades in on the same rows. A scene that shows no figures keeps the
  hairline with no source line under it.

On the first scene the bar and the hairline draw in and the words rise in.
Into a scene without them (the outro) they all fade out, the bar at its full
size. The transition never moves them.

## Transitions

**One transition, the same between every pair of scenes.** Real explainers
use one grammar; a different move at each change reads as random. The
outgoing content rises a little and fades out (0.35 s, expo-in); for the
next 0.25 s the shared frame stays still and only swaps its words; then the
incoming content rises in through its line masks. Nothing sweeps, floods or
wipes the frame, and nothing resizes the bar. The first scene starts on
frame 0 with nothing before it.

There is no per-scene choice. A `transitionIn` left in a spec is ignored,
and `check-video.js` warns so you delete it. Don't build another transition
in a custom scene.

## Banned by default

Particle bursts, shockwave rings, lens flares, glows and bloom, zooms,
pushes and camera moves, camera shake, RGB split, glitches, full-frame crossfades, bouncy or elastic easing,
stock "HUD" décor, fake UI of a real product, emoji decoration, spinning
logos, gradient panels. They aren't in the engine. Don't build them in a
custom scene. The one decoration the engine draws is the halftone
artwork (`design.md` § Artwork; `meta.art: "off"` turns it off): one tone,
from two corners of the frame, around the content and never on it.

## Custom scenes

Only when no catalog scene can show the finding. The page registers a
painter, and the spec names it (`"type": "custom", "draw": "name"`):

```js
Motion.custom.tideClock = {
  enter: 1.2,             // seconds until everything is revealed
  read: 2.5,              // seconds it must then hold still
  draw(ctx, lt, api) {    // lt: seconds since the painter's start
    const p = api.at(0.1, 1.0, 'outQuint');            // 0..1 over [0.1, 1.1)
    api.paint.rect(ctx, api.box.x, api.box.y, api.box.w * p, 40, api.design.subject);
    api.text('High tide', api.box.x, api.box.y + 60, { weight: 600 });
  }
};
```

The contract:

- **A pure function of `lt`.** Same `lt`, same pixels, whatever frame came
  before. That is what makes export, motion blur and the audit work.
- **No `Math.random`** (use `api.rng(...keys)`, seeded), no `Date.now`, no
  timers, no state kept between calls, no `requestAnimationFrame`.
- **Text through `api.text`**, so the audit sees it (safe zone, overlap,
  contrast, read time).
- **Colours from `api.design`** (`subject`, `context`, `ink`, `muted`,
  `hair`). Never hard-code a colour.
- **Inside `api.box`**, the area under the card's headline; the card's
  kicker, headline, units and source line come for free.

`check-video.js` fails `Math.random`, `Date.now`, `performance.now`,
`setTimeout`, `setInterval` and `requestAnimationFrame` in the page's own
script.
