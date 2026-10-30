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

Think of a toy diorama, or an isometric illustration of a city, rather than a
model kit. Things are built from a few simple masses with softened edges, and
the world carries just enough detail to tell its story. It is close to low
poly without being strict about it: an organic thing can be a faceted lump, a
made thing a bevelled block, a person a few rounded parts.

- **Colour is quiet.** Most of the world is one family of light neutrals
  (`paper`, `n0a`, `n1`, `n2a`), with darker neutrals (`n2` … `n5`) only where
  a part needs to separate: a window band, a tyre, a doorway, hair. Tone does
  the work colour would do elsewhere, the way a monotone city illustration
  still tells a factory from a warehouse.
- **The highlight carries the claim.** `hl` goes on the things the current
  number counts (the stack of applications, the one person, the late trucks),
  `hl2` on a second group in a comparison, `hlSoft` on the whole a share is
  drawn from. Because everything else is quiet, one lit thing reads at once.
- **Form comes from light.** Flat shading, soft shadows, no outlines: a
  bevelled edge catches a line of light, a facet turns its own tone, a gap
  casts a shadow. That's most of the detail an item needs.
- **Sizes are real metres.** A person is 1.6-1.85 m, a door 2.1 m, a bus
  12 m. Simple shapes at true scale sit together believably, and the camera
  can go anywhere.

## Designing an item

The question for every item is **what does this film need the viewer to tell
apart?** Detail goes there and nowhere else.

- A film about a city's commute needs *a building*, so every building can be a
  bevelled block with a band of window grid, and every tree the same faceted
  ball on a stick. Nobody needs to know which tree it is.
- A film about deforestation needs oak versus pine versus palm, so the trees
  differ, but only in their silhouette: a wide flattened lump, a stack of
  narrowing tiers, a fan of leaves on a tall thin trunk. Still no bark, still
  no leaves drawn one by one.
- A film about a hospital needs the emergency entrance to read, so that
  building gets its canopy and a sign; the ward block behind it stays a block.

So build in this order and stop as soon as the item does its job at the size
it appears in the film:

1. **Masses.** The two to five shapes that make the silhouette: a block and a
   roof; a hull, a cabin and a funnel; a body, a head and legs. Most of the
   work is getting their proportions right.
2. **The telling detail**, only if the story needs it: the one or two features
   that make it *this* thing and not its neighbour (the factory's saw-tooth
   roof and chimney, the tanker's round tank, the bus's long window band). A
   window grid or a sign usually belongs on a `decal`, kept simple.

What tends to go wrong:
- **Too much.** Rails, rivets, handles, buttons, stitching, fingers. Each one
  makes the item busier and the claim harder to see. If removing a part
  doesn't change what the viewer understands, leave it out.
- **Too little to read.** A plain box where the story needed a hospital. The
  fix is a better silhouette, not a label.
- **Living things made too exact.** People, animals and plants read better
  as chunky, slightly imperfect forms: a polar bear as rounded blocks, a
  penguin as a capsule with a beak, a crowd as simple rounded figures that
  vary a little in height and tone. No faces unless the story is about one.
- **Anachronism and wrong setting**: check the bible's era rules. A simple
  shape can still be the wrong shape (a modern car in 1944).

Useful shapes for this look: `box` with a `bevel` for anything built,
`facet` for anything grown or natural (canopies, bushes, rocks, hills, ice,
lumpy animals), `rounded` for soft made things (sacks, cushions, car bodies),
`cylinder`/`cone` with a low `seg` (6-8) for faceted trunks, poles and
cone trees, `extrude` for silhouettes (roofs, saw-tooth sheds, vehicles in
profile).

## The API

Load order in a page: `theme.js`, `geom.js`, `scene.js`, `render.js`,
`rig.js`, `sheet.js`, then your cast. Everything is on `window.Film`.

```js
const g = Film.group({ name, at, rot, scale });   // a cast item, or a part of one
```

**Where things sit.** `z` is up and an item's front faces `-y`. Most solids
stand on their `at` (`box`, `extrude`, `cylinder`, `cone`, `capsule`, `lathe`,
`rounded`, `tray`, `facet` start at its height and rise). These are centred on
it instead: `sphere`, `torus` (centred on its own `z = 0`), `decal` and `label`
(the picture's centre), anything laid on its side with `axis`, and the
push direction of an `extrude` with `axis: 'x'` or `'y'`. A `loft` with
`axis: 'x'` runs from `x = w` of its first section to its last; `axis: 'y'`
runs along `y`, which is the way for an animal or a vehicle to face `-y`
(give the head or nose the most negative `w`).

**Which way things turn.** `rot: 90` turns `+x` towards `+y` (anticlockwise
seen from above), so a part pointing along `+x` points along `+y` after it.
`rot: [a, 0, 0]` with `a` positive tips the front (`-y`) down, the way a head
nods; `[0, a, 0]` with `a` positive tips the top towards `+x`.

Every solid takes `o = { at: [x,y,z], rot, scale, color, name, shadow, opacity }`
and returns its mesh. `opacity` below 1 makes glass, water or haze (it casts no
shadow); use it sparingly, a dark solid often reads better as a window. `rot` is degrees: a number turns about the vertical, `[x, y, z]`
turns about each axis (applied x, then y, then z). `z` is up, the item stands
on `z = 0`, and its front faces `-y` (towards the default camera).

| Call | Makes |
| --- | --- |
| `g.box([w, d, h], o)` | a block standing on its `at`, centred in x and y. `o.bevel` cuts every edge (metres; about 3-8% of the smallest side gives the soft toy edge) |
| `g.facet([w, d, h], o)` | a faceted lump sitting on its `at`: `o.detail` 0 (20 faces: rocks, a boulder, a crude animal body) or 1 (80: canopies, bushes, hills), `o.seed` and `o.jitter` (how lumpy, default 0.12) |
| `g.extrude(outline, depth, o)` | any 2D outline `[[x, y], ...]` (concave is fine) pushed up by `depth`. `o.axis: 'x'` or `'y'` stands the outline upright, so `[[x, z], ...]` with `axis: 'y'` is a side profile: a roof, a car body, a ramp, a chair. Use this most: it's how a shape gets its character |
| `g.rounded([w, d, h], o)` | a soft block, every edge rounded by `o.round` (0.1 nearly a box, 1 an ellipsoid): sacks, cushions, loaves, foliage clumps, boulders, car bodies, a bulky coat |
| `g.tray([w, d, h], o)` | an open box with walls `o.wall` thick; `o.open: 'top'` (default), a side (`'-y'` …) or `'none'`: trays, crates, drawers, containers, rooms with an inside |
| `g.cylinder(r, h, o)` | a cylinder on its base; `o.top` for a different top radius (a frustum: a cup, a lampshade, a tower). `o.axis: 'x'` or `'y'` lays it on its side, centred on `at`: wheels, rollers, logs, barrels (also for `cone`, `capsule`, `lathe`) |
| `g.cone(r, h, o)` | a cone |
| `g.sphere(r, o)` | a sphere centred on `at` |
| `g.capsule(r, len, o)` | a rounded rod from `z = 0` up to `len` |
| `g.lathe([[r, z], ...], o)` | a profile turned about the vertical: bottles, vases, domes, helmets, hats. `o.seg` sets the facets for the whole profile (4 makes it square all the way down), so a dented crown and a round brim are two parts. `o.open` leaves the ends uncapped: a pipe, a bucket wall, a funnel mouth |
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
no hands, no feet, no clothes, no hair, no face, no species. That plainness is
the look: a crowd of simple rounded figures reads as people, and one of them
lit reads as *the* person. You make it someone with proportion, tone and the
one or two things that say who they are (a helmet, a white coat, a pack), and
add hands or feet only when the story uses them.

```js
Film.figure({
  height: 1.62,                       // metres
  head: 0.1, torso: 0.3, shoulders: 0.12, depth: 0.08, hips: 0.058,
  arm: 0.33, leg: 0.47, limb: 0.042, hand: 0, foot: 0,   // fractions of height (hand 0.03, foot 0.08 to add them)
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
the head (about 1.08x) and offset, rather than a sphere the same size as the
head, because two surfaces that close together flicker. The same goes for any two faces
that share a plane: separate them by a few millimetres or inset one.

A part painted on a bone moves with every bone below it, so a short sleeve is
its own part on `shoulderL`, with the default arm left in skin colour.

Proportions make the character as much as clothing does: a child is short
with a big head, an early hominin stoops (`stoop: 20`) with long arms
(`arm: 0.42`) and short legs, a soldier in winter kit is bulky (`depth: 0.1`),
and a crowd varies height, build and tone a little per person
(`Film.rng(seed)`). Four-legged animals and vehicles are built from solids
directly, and face `-y` like everything else (a truck's nose towards `-y`).

## The cast file and the sheet

One file, `cast.js`, sets `window.Cast` (the builder functions, which the
world in step 5 uses) and `window.CAST` (the list the sheet shows). Each entry is one item; `states`
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

`note` holds the bible handle the item traces to.

The sheet looks at each item from azimuth -55 (front-left; 0 is from `+x`,
-90 straight from the front), 26 degrees up, with a 28 degree lens, plus a
small view from behind. An item or state can set its own `view: { az, el, fov,
focus }` when another angle shows what matters. Copy
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
2. Does it carry the detail the story needs to tell it apart, and nothing much more?
   A generic version is right when the story doesn't care which one it is.
3. Does the highlighted state light only the counted part, and is that part
   big enough to count from the film's camera?
4. Is its size right next to a 1.7 m person?
5. Does it hold up from behind (the inset)?

At most two fix passes per item, then move on and note what is still weak.
