# Step 3: the bible

Write `film/bible.md`: a design sheet for everything the screenplay shows.
It decides what each character, prop and place looks like before any code is
written, so that step 4 builds from a decision rather than discovering one.

## What goes in

An entry for every noun the screenplay puts in a `Place:` or `Cast:` line,
and for nothing else. Each entry traces to a brief noun, which traces to the
document. That chain is what guarantees the world is this document's world.

## The format

```markdown
# Bible: <title>

## Setting
Era: 2023-2025, a UK market town and its high street
World tone: neutral greys, `hl` for the applications the claims count
Not in this world: <things that would be wrong here: anachronisms, the wrong
country's vehicles, logos, real people's likeness>

## Characters

### K1 · applicant · N3
Story job: the people who apply; a crowd of them shows a share
Tier: background (a crowd, never closer than 15 m); the one applicant B2 follows is hero
Tell apart from: branch staff (K2), who wear a lanyard and stand behind the counter
Look: plain rounded figures, varied heights and greys; no faces
States: standing, queueing, walking away; one lit
Scale: 1.6-1.85 m

## Props

### K3 · loan application form · N1
Story job: each form is 1% of applications; stacks of them carry C1 and C2
Tier: supporting (stacks seen from a few metres)
Tell apart from: nothing else in the film is paper, so a thin sheet with two grey lines reads
Look: a thin pale slab with a darker header band (decal); stacks of them
States: single, stack of 100, part of a stack lit
Scale: A4, 0.21 x 0.3 m; a stack of 100 is about 1 cm per 10 forms, drawn thicker

## Places

### K4 · bank branch · N2
Story job: where applications used to start; the film returns here in 2025
Tier: supporting (the street at mid distance); the rest of the street is background
Tell apart from: the shops on the same street: a pediment and columns
Look: a bevelled block with a shallow pediment and four columns, steps; the street around it as plain blocks
States: busy (2023), quiet (2025)
Scale: about 12 x 10 x 7 m
```

Each entry:
- **Heading**: `### K<n> · <name> · <noun ids>` under Characters, Props or
  Places. An item can serve several nouns (`N3 N5`).
- **Story job**: what the item does in the film. It decides everything
  else.
- **Tier**: `hero`, `supporting` or `background`: how closely the film
  sees it, read off the screenplay's Camera lines. This decides how much care
  the item gets in step 4 (`references/cast.md` § How much detail).
  - **hero**: some beat frames it close, so it fills a good part of the
    frame: the one person the story follows, a hand, a phone, a tool, a face
    in a crowd the camera picks out. Few items are heroes; most films have
    two to five.
  - **supporting**: seen at mid distance, as one of a few: a figure at a
    desk, a vehicle in a street, a building the camera arrives at.
  - **background**: only ever part of something larger: a crowd, a street, a
    forest, a skyline, a marker on a map.
  An item the film sees both ways gets both, and is built at each: a crowd of
  background riders and the one hero rider the camera follows.
- **Tell apart from**: what the viewer must be able to tell it from, and
  the one or two features that do it. When nothing needs telling apart, say
  so: the item can be as plain as the style allows. This line is where the
  level of detail is decided (`references/cast.md` § Designing an item).
- **Look**: its masses and its telling detail, in a sentence or two, in the
  terms of the style: bevelled blocks, faceted lumps, rounded figures.
- **States**: every state the screenplay needs (open, full, lit, burned,
  walking).
- **Scale**: real size in metres. A film's items have to sit together.

## Setting

`World tone` says monotone (the default) or colour, and colour only when the
user asked for it. Either way, the Look lines name material roles (wall,
roof, leaf, water, clothA…) where things have a natural colour, so the same
cast renders in both (`references/cast.md` § Colour).

The setting fixes what the whole world shares. The era and place decide what
things look like (a 1944 truck, an early hominin's posture, a UK ambulance),
and "Not in this world" lists what would break it. Real people in the
document are shown as generic figures in role (a general, a CEO), never as a
likeness, and real organisations without logos.

## People and sensitive subjects

War, illness, disaster and loss are shown with restraint: counts as quiet
rows of figures or markers, not violence or suffering acted out. A figure
for casualties is a number the viewer should feel, so give it its own beat
and a still camera, not a flourish.

## Check

```
node scripts/check-bible.js film/bible.md film/brief.md film/screenplay.md
```

It checks that every item traces to a brief noun, that every noun the
screenplay shows has an item, and that each entry has its fields.
