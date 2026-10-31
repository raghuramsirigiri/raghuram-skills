# The story: its shape, the spine, the hook, the cuts

**The product is the shape and the edit.** A video that picks a picture
per finding comes out as a row of separate little scenes, one per section,
however good each one is. So decide the story's shape first, from what the
source is about as a whole, and only then cut it into beats. Then make the
three edit choices: which finding opens it, one idea per beat with time to
read it, and what gets left out.

## The point, and what the stage must show

Before the shape, write two sentences:

1. **The point**: what the video is about, in the source's terms, with its
   main figure. "A family car went from about 60 to 170 km/h in a century."
2. **What the viewer must see**: the verb and the measure the stage acts
   out, so the point lands with the sound off. "The car gets visibly faster
   with each era."

The stage exists to show that. A story about speed is told by how fast the
subject moves; a story about size by how big things stand beside each other;
a story about building by the parts going on; a story about a route by the
route being travelled. A world that follows the engine's defaults instead
(the same slow drift for a race car and a glacier) ignores the video's
purpose, however well each thing is drawn.

Then, for **every beat**, write what the stage does in it that shows its
finding, in the spec as `stage.shows`: "the saloon pulls away faster than
the tourer did", "the hatchback pulls in at a fuel pump", "the electric car
stops at a charging post and its meter fills toward 80%". Take it from the
finding's own verb and number, not from what the shape does anyway. A beat
whose finding has nothing to act out (a price, a share) says so ("the car
keeps its pace; the value is in the card's chart"), and its figure goes in
the card. When a figure is acted out (a pace, a size), it is drawn in
proportion, from zero, and the card states it on the beat it first appears.

## The shape

Read the source and ask what changes over the video. The answer names the
shape. Each shape is a grammar for how beats drive the stage and the
camera; it has no content of its own. The things on the stage are always
drawn from the source's nouns (`stage.md`).

| The source is about… | Shape | The stage | A beat moves it by… | Examples |
| --- | --- | --- | --- | --- |
| one subject and its states over time | **transformation** | the subject on a path of stops, one per state; a branching path for a lineage | naming the next state: the subject travels on and changes form | a family car across a century; a species' lineage; a phone's generations |
| several things compared on more than one measure | **lineup** | the whole cast on one stage | naming the measure: the cast rearranges by it | dinosaurs by size, then diet, then hunting; planets by size, then by day length |
| one thing made, step by step | **assembly** | the thing on its site, growing | naming the step: the next part goes on; a cutaway is a staged insert | a tower's construction; how a bridge is built |
| a set of separate cases, places or events | **episodes** | a place per item on one board | naming the item: the camera travels to its place | tactics of a war's campaigns; five cities' answers to one problem |
| a route, a campaign or a migration | **journey** | a schematic, stylised map | naming the leg: the mover goes on along the route | a migration; a supply route; an expedition |

How to tell them apart:

- **One subject or many?** One that changes is a transformation; many that
  stay themselves and get compared is a lineup.
- **Does the thing exist yet?** A thing that comes into being part by part
  is an assembly, even when the source also gives its states.
- **Does place matter?** If where each item happens is part of the point
  (a front, a city, a site), it is episodes; if the path between places is
  the point, it is a journey. A journey's map is schematic (land, water,
  a route line, named places as plain labels), never the look of a real
  map product.
- **When two fit**, take the one that keeps a single world in view longest.
  A history of one aircraft is a transformation, not episodes of its
  models.

A source that is only values (a margin, a ratio, a quarterly series) with
no thing to show is not a story for this skill: say so and suggest
explainer-video, which makes slides with flat charts.

**This version builds `transformation`.** The other four are named in the
spec format so a story can be planned in them, and `check-video.js` refuses
them until their grammar ships. Say so if the story needs one.

## The spine

A fixed spine with a variable middle:

| Beat | In a 30–45 s cut | Job |
| --- | --- | --- |
| **Hook** | 0–5 s | The single most surprising *true* thing, with its number if it has one, over the stage's first state. On screen by 0.5 s. |
| **The middle** | 3–6 beats | One per state, measure, step, place or leg, in the shape's order, each with its figure in the card. |
| **A value beat** | optional | A finding with no thing of its own (a price, a share, a rate), its flat chart in the card while the stage keeps going. |
| **So what** | optional | Only an implication **the source states**, attributed. |
| **Source card** | last | Every source with its date; "illustrative" when any figure is. Always. |

The compiler sets each beat's real length from its words and from how far
the stage moves into it, so the times are a guide: compile, and read the
per-beat durations `check-video.js` prints.

## Length

About one beat per 3–6 s; a beat that changes the stage carries the
change (1–2 s) before its words. **15–60 s** for every shape. A lineup or a
journey may run to **90 s** when its cast or route needs it: say at
handover that it is long for a feed, and offer a shorter cut.

| Length | Beats |
| --- | --- |
| 15 s | hook, 1–2 more, source card |
| 30 s | hook, 3–4, source card |
| 45 s | hook, 5–6, source card |
| 60 s (90 s lineup or journey) | hook, up to 8 (12), source card |

## Picking the hook

Take, in order: the finding the user asked about; else the largest change
the source *states* (not one you compute and frame as bigger); else the most
concrete number in the lede. Write it in the source's own register. "One of
the best-selling" stays exactly that, never "the best-selling". When two
findings are equally strong and the user picked neither, ask which leads.

## One idea per beat

A beat carries one finding. If a sentence in the source holds two figures,
the stronger gets the headline and the other goes in the units line or a
beat of its own. A headline that needs "and" holds two ideas.

## The stage tells no cause

The stage shows what changed, never why. A fuel pump at the 1979 stop is
there because the source gives that car's fuel use; it may not appear next
to a fuel-price figure the source doesn't link to the car. Two facts in the
same source are two facts, on screen, in the order of beats, and on the
stage.

## What to leave out, and saying so

Leave out, in this order: background the viewer doesn't need; the weakest
evidence (the smallest change, the most caveated figure); findings whose
thing the source never describes (nothing to draw truthfully). List what
you left out in the handover. Never leave out a hedge, a caveat the source
attaches to a figure you kept, or the source card.

## A shorter cut of the same story

A 15 s cut is not the long cut sped up. Drop beats, never read time: keep
the hook, the states or steps that carry the most change, and the source
card. Cuts share one spec and one ledger, so a figure is correct in every
cut at once (`formats.md` § Cuts).
