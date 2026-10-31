# Pictures: each finding's own thing

Each finding is drawn in one of two ways, chosen in step 4 by what it is,
never after a drawing fails:

| The finding | How it is drawn | Scene type |
| --- | --- | --- |
| a count or share of a **real thing** (people, cars, shops, cups, parcels, accounts, meals) | your own painter: § Drawing the finding's own thing | `custom` |
| a value, a rate or a share with no thing of its own (a margin, a ratio, a mix) | the figure, or its flat chart | `big-number`, `before-after`, `share-split` |
| 2–6 values in one unit (quarters, sites) | flat columns | `compare-bars` |
| stages that only narrow (started, submitted, opened) | flat bars in stage order | `compare-bars` |
| a ranking, largest first | flat ranked bars | `ranked-list` |
| a series over ordered time | a flat line | `trend-line` |

The flat charts are the slide scenes' own, in charts-lib's design system
(`video-charts.md`). They are drawn in the slides style, the default
(`meta.style: "slides"`, or no style at all).

## The rules every picture keeps

- **Never a grid of units for a share with no thing.** Floating rate loans
  at 36% of a bank's earning assets are not 36 cubes, and a 12% margin is
  not 12 dots: there is nothing to count. That is a number, or a flat bar.
- **Flat charts, never 3D ones.** Depth is for things (a shop, a car), never
  for a column, a bar, a line or a pie.
- **The key is on screen** while a drawing carries data: what one unit is
  (`1 shop = 100,000 small businesses`), in words.
- **The units are the figure**, read from the claims (`api.value`), never
  typed: 60% of 20 cars lights 12.
- **The words come from the scene's copy or its claims.**
- **A picture never says why.** It never implies a cause the source
  doesn't state.
- **A change is not a share.** "Up 38%" is the figure, or its two values as
  flat columns, never 38 of 100 things lit.

## Retired: the world's data pictures

The continuous world (`continuous.md`) shipped with a catalogue of data
pictures: `people`, `dots`, `blocks`, `split`, `columns`, `funnel`,
`podium` and `ribbon`. Each is a 3D chart or a grid of units, the two
things this skill was told to stop drawing, and `check-video.js` fails every
one of them. Never add a picture to replace them: the catalogue is closed
(frozen at 1.1.0). The world is used only when the user asks for it; then
its findings are custom painters, and its own places are the two below.

### The desk

**Job:** work that is waiting: written answers in an unsorted pile, three
empty trays (the themes they'll be sorted into), and a calendar whose top
page tears off to show when it's due. For "not yet analysed", "due in
September", "under review".
**Not for:** a finding with a figure.
**Spec:** `{ "kind": "desk", "due": "September" }`: `due` is a word in the
scene's copy (the calendar shows its first three letters).

### A device

`{ "kind": "device", "skin": "laptop" }` (or `"phone"`): a website or app,
showing a plain wireframe page, never a real product's screen. It carries
no figure.

## Drawing the finding's own thing

Most stories count things no library would have: cars sold, cups poured,
panels fitted, meals thrown away. Each round that added a picture for one
of them helped that one story, and the next topic fell back to the nearest
picture or to plain boxes. So you draw the thing, for this video, as a
`custom` scene:

1. **Name the thing and the verb.** "62% of new cars sold were electric":
   the thing is a car, the figure is 62 of 100, the verb is *sold*. That
   gives the units (cars), the arrangement (a forecourt row, a car park, a
   queue at a charger) and the action (cars roll in, the electric ones
   light up).
2. **Draw a few shapes that read as that thing at the size it's drawn**,
   with the 2.5D kit (§ A custom picture): a car is a long low body with a
   cabin on it. Recognisable beats detailed. Fill the box: things too small
   to recognise are only dots. The data in `A`,
   everything else in the neutrals.
3. **Carry the figure.** List the scene's figures in `"claims": ["F4"]` and
   read them with `api.value('F4')` (the number) and `api.display('F4')`
   (its exact wording); never type the number into the painter. One unit
   per stated thing, or per a stated group (`1 car = 5% of new car sales`),
   with that key on screen through `api.text`, in words.
4. **Stay in `api.box`.** That is the whole layout contract: the headline,
   units, kicker and source line are laid out around it, and the world
   steps aside for the beat. There is nothing else to fit.

The painters draw the same in either style. In the continuous style the
world also needs one place of its own (a desk or a device) to stand on.

When the drawing doesn't fit its box or fails the audit, make it simpler,
in this order: group the units (one per 2% or 5%, stated in the key), move
labels into the `units` copy, draw fewer kinds of thing. Never swap it for
a chart or a grid of units to get past the audit. A chart
is right only when the finding is a series or a comparison of values, and
that is chosen in step 4, never after a drawing fails.

```json
{ "id": "e2", "type": "custom", "draw": "forecourt", "claims": ["F4"],
  "copy": { "kicker": "New cars", "title": "{F4} of new cars sold were electric", "units": "Share of new car sales" } }
```

```js
Motion.custom.forecourt = { enter: 1.6, read: 2, draw(ctx, lt, api) {
  const V = api.iso(1.25), m = api.mat, lit = Math.round(api.value('F4') / 5);   // 1 car = 5%
  for (let i = 0; i < 20; i++) {                                     // a car park, 4 rows of 5
    const x = (i % 5) * 80 - 200, y = Math.floor(i / 5) * 130 - 260;
    const z = 160 * (1 - api.at(i * 0.04, 0.5));                     // cars set down in turn
    const tint = i < lit && api.at(0.9 + i * 0.03, 0.2) > 0.5 ? m.A : m.N2;
    V.box(x, y, z, 56, 100, 22, tint);                                // body
    V.box(x + 6, y + 30, z + 22, 44, 46, 16, m.PAPER);                // cabin
  }
  api.text('1 car = 5% of new car sales', api.box.x, api.box.y + api.box.h - 30, { color: api.design.muted });
} };
```

## A custom picture

A `custom` scene takes the stage for its beat (`motion.md` § Custom
scenes). In either style its painter gets the 2.5D kit: `api.iso(scale)`
returns a view centred in `api.box` (world 0,0,0 a little below its middle)
with `box`, `shadow`, `tray`, `token`, `quad` and `P(x, y, z)`; `api.mat`
holds the tints (`N`, `N2`, `A`, `PAPER`). Draw data with `A`, everything
else with the neutrals. Details on a neutral face (a door, a window) need
the darker single tones, `door` and `dark`, as `{ top, left, right }` of
one colour; `PAPER` on a neutral face doesn't show. `roof` and `roofSide`
make a roof.

```js
Motion.custom.crates = { enter: 1, read: 1.5, draw(ctx, lt, api) {
  const V = api.iso(0.9);
  V.box(-40, -40, 0, 80, 80, 60 * api.at(0, 0.8), api.mat.N2);
} };
```
