# Motion

The engine carries the motion language. Scenes pick a transition, and a
`custom` scene, rarely, draws its own. These are the numbers it uses and the
rules a custom scene follows.

## The numbers

- **Read time** (`copy.md` § Read time): max(1.2 s, 0.6 + 0.3 s/word);
  numbers 1.5 s after landing; source card 2 s; final frame 1 s.
- **Hook by 0.5 s**: something readable is on screen by frame 15 at 30 fps.
- **Stagger**: words 60–90 ms, lines up to 100 ms, rows 80–120 ms.
- **Springs**: ω 12–40. Data is critically damped (never passes its value).
  Non-data shapes may take a tiny overshoot (ζ ≥ 0.8).
- **Eases**: entrances on `outQuint` (cubic-bezier .16,1,.3,1), morphs and
  wipes on `glide` (.45,0,.15,1), exits on expo-in.
- **Camera**: one language per video; a slow push of 1.03–1.07 at most
  (photo-pan, the push transition). No shake, no random drift.
- **No dead time**: nothing sits static for more than 1.5 s outside a read
  hold. The audit warns on it.

## The through-line

The card's short accent bar, in the subject colour, sits fixed at the
top-left of the safe area: the same place and size on every scene, whatever
height that scene's text sits at, and through every transition. It draws in
from zero width on the first scene and shrinks away into a scene that has
none (the outro). `morph-bar` stretches it along the top for a moment and
lets it settle back, in place; no transition moves it.

## Transitions

Set on the incoming scene as `transitionIn`. Outgoing text always clears
before incoming text arrives: the transitions that keep the exit
(`mask-up`, `mask-left`, `morph-bar`) run after the outgoing scene's text has
left. The ones that own the exit move the outgoing frame themselves.

| Name | Length | What happens | Use for |
| --- | --- | --- | --- |
| `mask-up` (default) | 0.4 s | incoming lines rise through a mask | most scene changes |
| `mask-left` | 0.4 s | lines slide in from their left edge | a list or a sequence |
| `morph-bar` | 0.55 s | the accent bar stretches along the top, in place, as the lines rise | a turn in the story (context → evidence) |
| `scan` | 0.5 s | one horizontal line wipes down, new scene above it | a change of chart |
| `flood` | 0.6 s | an accent field sweeps across with a hard edge | into the source card, or a section break |
| `push` | 0.5 s | the camera pushes into the outgoing frame as it fades | after a photo, or a dramatic figure |
| `cut` | 0 | hard cut on the boundary | a fast edit, sparingly |
| `fade` | 0.4 s | the outgoing frame fades out | only when the user asks for a fade |

Vary them a little; three or four kinds in a 30 s video is plenty.

## Banned by default

Particle bursts, shockwave rings, lens flares, glows and bloom, camera
shake, RGB split, glitches, full-frame crossfades, bouncy or elastic easing,
stock "HUD" décor, fake UI of a real product, emoji decoration, spinning
logos, gradient panels. They aren't in the engine. Don't build them in a
custom scene. The one decoration the engine draws is the monochrome
artwork in a scene's empty space (`design.md` § Artwork in the space left):
one tone, never behind content, drifting slowly.

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
