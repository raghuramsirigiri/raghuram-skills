# The story: its point, each insight's action, its shape, the cuts

**The product is what the world does.** The engine draws nothing of its
own and decides nothing about what happens on the stage: you write the
world, and every insight in the video is something you make happen in it.
A video whose stage only does what is easy to animate (things gliding past,
things growing, the same motion every beat) has ignored its source, however
well each thing is drawn. So the order is: the point, then what each
insight does to the world, then the shape that holds those together, then
the edit.

## The point

Write it in one sentence, in the source's terms, with its main figure: what
the video is about. Then one more: what a viewer with the sound off must see
happen to get it. That second sentence is the stage's job for the whole
video, and every beat answers to it.

## Direct each insight

An insight is a fact about something in a world. Showing it means making
that something visibly be, or become, what the fact says. For each insight,
before choosing anything to draw, answer in order:

1. **What is it a fact about?** The noun, in the source's words: not "the
   value" but whose value, of what, where.
2. **If it happened in front of you, what would you see?** Not the number:
   its consequence. Something appears or goes, fills or empties, gathers or
   scatters, ages or wears, speeds up or waits, lights or goes dark, is
   carried from one place to another, changes hands, changes shape, takes
   longer. The source's own verb is usually the answer; when it has none,
   ask what the figure would *do* to the noun.
3. **How much, honestly?** Which claim sets it, and how it is drawn: real
   things counted one for one (or per a stated group, with the key on
   screen), an amount in proportion and from zero (`w.share`), the same
   thing before and after. Never a grid of boxes, never a 3D chart.
4. **Over what span?** The beat's own action (`w.progress`), the story's
   own clock (`stage.time`: a year, an hour of the morning, an age, a
   floor count, whatever the source measures time in), or something that
   builds up at a rate the source gives (`w.accumulate`).
5. **Would a muted viewer read it from the stage alone?** If the stage would
   look the same had this beat never happened, it isn't directed yet. The
   audit checks this (`action`).

**Think of three, then choose.** For each insight write three different
actions before picking one, and make at least one of them something other
than moving or resizing the noun. Strike any that you would have drawn for
a different story just as well, and any that is decoration. Keep the one
most specific to this source's nouns and verbs. The result goes in the
spec as the beat's `stage.shows`, one line ("the queue at the counter
thins to a handful as the shelves empty"), and the world painter makes it
happen. The examples in these references are invented and are not a menu:
never reuse one because it is there.

Some insights have no consequence in the world the source describes: a
ratio between two firms, a survey's margin of error. Say so in `shows`
("the stage holds; the ratio is in the card's chart"), give the figure its
flat chart in the card, and keep the world alive with what it was already
doing. That is the exception: if most beats need it, the source is a values
story, and explainer-video (slides with charts) is the better skill.

## The shape

The shape is how the story is held together on one stage. It guides how
you lay out the world and frame it; it does not decide what may happen in
it, which is always the insights' business.

| The source is about… | Shape | How the world is laid out | How the camera tends to move |
| --- | --- | --- | --- |
| one subject and how it changes | **transformation** | the subject at the centre of its own surroundings, which change with it | stays with the subject |
| several things compared | **lineup** | the whole cast on one stage, room to rearrange | pulls back to take in the cast, in to one member |
| one thing coming into being | **assembly** | the thing on its site, room for what it grows into | rises with it, in to a part |
| separate cases, places or events | **episodes** | one board, a place per item | travels from place to place |
| a route, a campaign, a migration | **journey** | a schematic map (land, water, route lines, plain labels; never the look of a real map product) | follows what travels |

How to tell them apart: one subject that changes, or many compared? Does
the thing exist yet? Does place matter (episodes), or the path between
places (journey)? When two fit, take the one that keeps a single world in
view longest.

`transformation` has been through its acceptance video; the others build
and run the same way, and `check-video.js` warns until theirs has, so look
at their contact sheets harder.

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

The stage shows what happened, never why. If a source gives a mill's
output and, separately, a drought, the stage may show the mill slowing and
the river low, but never the river's level driving the wheel unless the
source says so. Two facts in the
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
