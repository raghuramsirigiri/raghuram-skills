# Building the cast

Step 4 of a film: every character, prop and place in the bible becomes a
JavaScript function that builds it from film-lib's solids, and the contact
sheet shows them all before anything moves.

film-lib has **no ready-made things**: no person, no laptop, no building, no
tree. That is on purpose. A film about a WW2 river crossing and a film about
a coffee chain's sales must not share props, so you design each one for this
film, from what the document says it is.

## Contents
- The look
- Designing an item
- The API
- Figures
- The cast file and the sheet
- Checking the sheet

## The look

- A pale, endless floor (`ground`); objects in light neutrals (`n0a`, `n1`,
  `n2a`, `paper`), darker neutrals (`n2`, `n3`, `n4`, `n5`) for contrast
  parts: screens, tyres, hair, roofs, shadows inside openings.
- **One highlight colour carries the claim**: `hl` goes only on the parts the
  current number counts (the stack of applications, the one person, the
  trucks that were late). `hl2` for a second group in a comparison, `hlSoft`
  for the whole a share is drawn from. An item is neutral unless its state
  says highlighted.
- Flat shading, no outlines, no gradients: form comes from the sun and the
  shadows, so give things real thickness and real gaps.
- Sizes are **metres**, and true to life. A laptop is 0.33 m wide, a door
  2.1 m tall, a person 1.6-1.85 m, a tank 7 m long. The camera zooms; the
  world doesn't cheat its scale, so props sit together believably.

## Designing an item

Work in three passes, and stop at the pass that makes it recognisable from
the hero angle at the size it will appear in the film.

1. **Silhouette.** The 2-5 masses that make it read: a bank is a block, a
   pediment, a row of columns, steps. A tank is a hull, a turret, a gun and two
   track runs. Get proportions right here: most failed props are a correct
   part list at the wrong proportions.
2. **Structure.** The parts that say *which* one it is: the laptop's hinge gap
   and thin lid, the tank's sloped glacis and road wheels, the hominin's
   stoop and long arms. Real gaps and overhangs, so the shadows draw them.
3. **Surface.** Flat detail goes on a `decal`, not in geometry: a screen's UI,
   a form's lines, windows on a far building, a sign, a map, a dial. Keep
   decals to the item's own neutrals plus `hl` where the claim lives.

What fails, and why it fails:
- **A box with a label** is not a prop. If the label is what tells you what it
  is, the prop has failed: the shape must say it.
- **Generic stand-ins**: a cylinder for every tree, a cube for every
  building. Ask what makes *this* thing different from the next one in the
  same film, and build that difference.
- **Anachronism and wrong setting**: check the bible's era rules.
- **Too much detail at film size**: bolts on a building seen from 80 m away.
  Detail costs nothing to render, but it adds noise.

## The API

Load order in a page: `theme.js`, `geom.js`, `scene.js`, `render.js`,
`rig.js`, `sheet.js`, then your cast. Everything is on `window.Film`.

```js
const g = Film.group({ name, at, rot, scale });   // a cast item, or a part of one
```

Every solid takes `o = { at: [x,y,z], rot, scale, color, name, shadow, opacity }`
and returns its mesh. `opacity` below 1 makes glass, water or haze (it casts no
shadow); use it sparingly, a dark solid often reads better as a window. `rot` is degrees: a number turns about the vertical, `[x, y, z]`
turns about each axis (applied x, then y, then z). `z` is up, the item stands
on `z = 0`, and its front faces `-y` (towards the default camera).

| Call | Makes |
| --- | --- |
| `g.box([w, d, h], o)` | a block standing on its `at`, centred in x and y. `o.bevel` rounds the vertical edges (metres) |
| `g.extrude(outline, depth, o)` | any 2D outline `[[x, y], ...]` (concave is fine) pushed up by `depth`. `o.axis: 'x'` or `'y'` stands the outline upright, so `[[x, z], ...]` with `axis: 'y'` is a side profile: a roof, a car body, a ramp, a chair. Use this most: it's how a shape gets its character |
| `g.rounded([w, d, h], o)` | a soft block, every edge rounded by `o.round` (0.1 nearly a box, 1 an ellipsoid): sacks, cushions, loaves, foliage clumps, boulders, car bodies, a bulky coat |
| `g.tray([w, d, h], o)` | an open box with walls `o.wall` thick; `o.open: 'top'` (default), a side (`'-y'` …) or `'none'`: trays, crates, drawers, containers, rooms with an inside |
| `g.cylinder(r, h, o)` | a cylinder on its base; `o.top` for a different top radius (a frustum: a cup, a lampshade, a tower). `o.axis: 'x'` or `'y'` lays it on its side, centred on `at`: wheels, rollers, logs, barrels (also for `cone`, `capsule`, `lathe`) |
| `g.cone(r, h, o)` | a cone |
| `g.sphere(r, o)` | a sphere centred on `at` |
| `g.capsule(r, len, o)` | a rounded rod from `z = 0` up to `len` |
| `g.lathe([[r, z], ...], o)` | a profile turned about the vertical: bottles, vases, domes, helmets, hats. `o.open` leaves the ends uncapped: a pipe, a bucket wall, a funnel mouth |
| `g.torus(R, r, o)` | a ring lying flat (`o.axis` stands it up): tyres, hoops, rims, life rings, steering wheels |
| `g.tube(points, r, o)` | a round tube through 3D points, smoothed (`o.smooth: false` for straight runs, `o.closed` for a loop): ropes, cables, hoses, pipes, vines, tails, a slung strap |
| `g.loft([[w, outline], ...], o)` | a skin through cross-sections with the same number of points: `o.axis 'x'` (default) puts each `[[y, z], ...]` outline at `x = w`: hulls, fuselages, car bodies, whales, loaves; `'z'` stacks `[[x, y], ...]` plans by height: tapering towers, trunks. The way to get curves a box or extrusion can't: a boat's sheer, a car's roofline |
| `g.rod(a, b, r, o)` | a straight rounded rod between two points: poles, stool legs, oars, spokes (a rope or a bend is a `tube`) |
| `g.flat(outline, o)` | a flat shape on the surface it's placed on: roads, rugs, water, markings. Place at `z = 0.002` above whatever it lies on |
| `g.decal(w, h, draw, o)` | a `w x h` metre picture standing in the x/z plane facing `-y`; `draw(ctx, pw, ph)` paints it with the 2D canvas API in **pixels** (`pw x ph`, `o.px` per metre, default 400, capped so the longer side is 2048 px): draw in fractions of `pw` and `ph`, not metres. It is one-sided (invisible from behind; `o.twoSided` shows it mirrored there), so a sign seen from both sides needs two. `rot: 90` faces `+x`, `-90` faces `-x`, `180` faces `+y`, `[-90, 0, 0]` faces up. Place it 1-2 mm in front of the surface it's on |
| `g.label(text, o)` | text on a surface; `o.size` is the cap height in metres, `o.ink`, `o.bg`, `o.weight` |
| `g.group(o)` | a child group (returned): a part that will move later (a lid, a door, a wheel, a turret) |
| `g.add(other, o)` | place a built item inside this one |
| `g.find(name)`, `g.paint(color, name)` | reach a named part; recolour every mesh (or only those named `name`) |
| `g.bounds()` | `{ lo, hi }` in metres |
| `g.locate(part, p)` | where a named part (or a point on it) is in `g`'s space: the posed hand, the end of a crane jib |
| `Film.rng(seed)` | seeded random numbers 0..1, for scatter, crowds, leaves: the same on every frame |

Colours are theme tokens, never hex in a cast file (a brand recolour has to
reach them): `ground`, `paper`, `n0a`, `n1`, `n2a`, `n2`, `n3`, `n4` … `n9`,
`hl`, `hl2`, `hlSoft`, or `{ mix: ['n1', 'n3', 0.5] }` between two. Inside a
decal's `draw`, use `Film.hex(token)` for its colours.

Name the parts the claim may light (`name: 'stack'`), and parts that move.

## Figures

`Film.figure(spec)` is a jointed body with plain rounded parts, nothing more:
no clothes, no hair, no face, no species. You make it someone.

```js
Film.figure({
  height: 1.62,                       // metres
  head: 0.1, torso: 0.3, shoulders: 0.12, depth: 0.08, hips: 0.058,
  arm: 0.33, leg: 0.47, limb: 0.042, hand: 0.03, foot: 0.08,   // fractions of height
  stoop: 0,                           // a permanent forward lean, degrees
  colors: { skin, hair, top, bottom, shoes },
  skip: ['torso', 'head', 'armL', 'armR', 'legL', 'legR'],     // default parts to leave out
  dress(b, d) { ... },                // add parts to the bones
  pose: { ... }
})
```

`dress` gets the bones (`pelvis`, `torso`, `head`, `shoulderL/R`, `elbowL/R`,
`handL/R`, `hipL/R`, `kneeL/R`, `footL/R`; each a group whose origin is the
joint, and whose limb hangs down `-z`) and the sizes in metres (`d.head`,
`d.torso`, `d.shoulders`, `d.upperArm`, `d.thigh`, ...). Add hair, a helmet,
a coat over the torso, a pack, a tool in a hand: they move with the bone.
Skip a default part when your own replaces it (a long coat replaces `torso`).

`fig.reach('L', [x, y, z])` puts the left hand on a point in the space the
figure stands in, solving the arm and keeping the rest of the pose; reach
with both hands to hold a shovel, a stretcher or a steering wheel, then place
the tool between `fig.locate('handL')` and `fig.locate('handR')`.

`fig.pose({...})` (also `spec.pose`), degrees, every field optional:
`spine` (lean forward), `twist`, `head: [nod, turn]`, `armL/armR: [forward,
out]`, `elbowL/R`, `legL/legR: [forward, out]`, `kneeL/R`, `crouch` (metres,
bend the knees to match). The figure's left is `+x`.

Sitting: `legL/legR: [90, 0]`, `kneeL/R: 90`, `crouch` about the thigh
length, and place the figure so its pelvis is on the seat. Lying down: build
the figure standing, then turn the whole figure (`rot: [-90, 0, 0]` puts it on
its back with its head to `+y`) and lift it onto the bed.

Hair, hats and helmets: a `lathe` dome or a `rounded` cap clearly larger than
the head (about 1.08x) and offset, never a sphere the same size as the head:
two surfaces that close together flicker. The same goes for any two faces
that share a plane: separate them by a few millimetres or inset one.

A part painted on a bone moves with every bone below it, so a short sleeve is
its own part on `shoulderL`, with the default arm left in skin colour.

Proportions make the character as much as clothing does: a child is short
with a big head, an early hominin stoops (`stoop: 20`) with long arms
(`arm: 0.42`) and short legs, a soldier in winter kit is bulky (`depth: 0.1`),
a crowd (`depth: 0.1`), a crowd varies height and build a little per person
(`Film.rng(seed)`). Four-legged animals and vehicles are built from solids
directly, and face `-y` like everything else (a truck's nose towards `-y`).

## The cast file and the sheet

One file, `cast.js`, sets `window.CAST`. Each entry is one item; `states`
are the looks the film needs (empty and full, closed and open, neutral and
highlighted). Put shared helpers at the top of the file.

```js
window.CAST_TITLE = 'Cast: <film title>';
window.CAST = [
  { name: 'loan application tray', note: 'N4',
    states: [{ label: 'empty' }, { label: 'full', n: 40 }, { label: 'full, lit', n: 40, hl: true }],
    make: s => { const g = Film.group(); /* ... */ return g; } },
];
```

`note` holds the bible handle the item traces to. Copy
`templates/sheet.html` and the `assets/film-lib/` folder beside `cast.js`,
open `sheet.html` in a browser, and look at it. `sheet.html?only=truck&cols=1`
shows one item big. An item (or a state) can set `view: { az, el, fov, focus:
[[x, y, z], [x, y, z]] }` to be judged from a better angle, or framed on the part
that matters rather than its whole road or yard. The page title reports the
number of views and errors; a failed item shows its error in its cell. The
small inset top right is the item from behind: it catches parts that only
exist from the front.

## Checking the sheet

Look at each cell at its real size, without reading its caption, and ask:
1. Would someone name this item correctly? If not, fix the silhouette and
   proportions before adding anything.
2. Is it *this film's* version of the thing (era, place, type), not a generic one?
3. Does the highlighted state light only the counted part, and is that part
   big enough to count from the film's camera?
4. Is its size right next to a 1.7 m person?
5. Does it hold up from behind (the inset)?

At most two fix passes per item, then move on and note what is still weak.
