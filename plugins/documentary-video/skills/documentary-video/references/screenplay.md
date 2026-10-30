# Step 2: the screenplay

Write `film/screenplay.md`: the film as a sequence of beats, each one a
moment in the world with the camera somewhere, something happening, and the
words on screen. This is where the film becomes a story rather than a list of
facts.

## Finding the shape

A documentary has a shape the viewer can follow: it opens on a world, raises
a question or a tension, moves through evidence, turns, and lands. Find the
shape in the document rather than imposing one. Some shapes documents tend
to have, as starting points:

- **A chronology** (a campaign, an evolution, a company's year): the camera
  travels forward through time and place; the turn is the moment things
  changed.
- **An argument** (a report with a finding): the question, the evidence in
  order of weight, the answer, what it means.
- **A comparison** (two products, two regions, before and after): two places
  in the world, the camera moving between them, the difference made visible.
- **A day in the life of a system** (a dashboard's numbers): follow one unit
  (a ride, a parcel, a patient) through the system, then pull back to the
  thousands of them.

Mix them when the document does. The film is short, so it keeps to the
thesis: a claim that doesn't serve it can be left out, and the brief keeps it
for anyone who asks.

## The format

The check reads this layout: keep the headings and the field names.

```markdown
# Screenplay: <title>

Logline: <one or two sentences: the film as someone would describe it>
Shape: <the shape you chose, in a few words>

## Act 1: <name>

### B1 · 6 s · establishing
Place: N2
Cast: N3
Camera: high wide shot over the town, slow orbit down towards the branch
Action: People queue outside the branch at opening time.
Caption: In 2023, most loan applications started at a branch counter.
Claims: C2

### B2 · 7 s
Place: N2
Cast: N3, N1
Camera: low, close on the counter, then pull back
Action: 100 forms stack on the counter; 41 of them are lit.
Count: 41 of 100 forms lit (1 form = 1% of applications)
Key: 1 form = 1% of applications
Caption: 41% of applications were made in a branch.
Claims: C2
```

Each beat:
- **Heading**: `### B<n> · <seconds> s` and, if the beat carries no claim,
  one of `establishing`, `transition` or `closing`.
- **Place**, **Cast**: noun ids from the brief (the place it happens, the
  people and things in it). The bible will build exactly these.
- **Camera**: where it is and how it moves: wide or close, high or low,
  orbit, push in, pull back, track alongside, cut. The camera is free; choose
  the angle that shows the beat best, and move it with a reason (to reveal,
  to follow, to compare). The world may zoom; the caption never does.
- **Action**: what happens, as a verb with a subject. The figure goes into
  the action: things arrive, stack, light up, walk away, fill, empty, grow.
- **Count** (when the beat shows a figure as things): how many units, out
  of how many, and what one unit is. Then **Key**: the line that tells the
  viewer what one unit is, which stays on screen while units carry data.
- **Callout** (when the beat has a figure): the number and two or three
  words, shown big in the highlight colour and counting up as the action
  builds it: `38% of online drivers`, `6.2 minutes`, `+31% requests`. It is
  the number the viewer should remember from the beat.
- **Caption**: the line that finishes the callout's sentence, or the whole
  sentence when there's no callout. Short enough to read in the beat (about
  three words a second, one line where possible). Numbers in a callout or
  caption come from the claims the beat cites, written as the document did or
  rounded with "about".
- **Claims**: the claim ids the beat shows, or `—` for an establishing,
  transition or closing beat.

## Making the figure visible

The viewer should see the number, not only read it.
- **A share** of something countable: a crowd, a stack, a row of N, with
  the share lit. 100 units for a percentage when that reads, 10 or 20 when the
  share is coarse ("about a third").
- **A change**: the same place at two times, the camera returning; or a
  pile that grows or shrinks while we watch.
- **A comparison**: two groups side by side, the camera between them.
- **A rate or a time**: things moving through a place at a pace, a queue that
  lengthens, a clock or calendar in the world.
- **A date or an era**: a change in the world (the season, the buildings,
  the people's kit), not a number on a slide.

Use as many units as the claim needs and the frame can hold; when it's
thousands, one unit stands for many, and the Key says how many.

## Pacing

A produced explainer is brisk. Beats of about 3-6 seconds, one idea each:
if a beat has two figures, it's usually two beats. Something is always
moving: traffic, people, the camera. A beat that only holds a view feels slow
however short it is. The total should be within about 10% of the brief's
Length; 45-75 s is the usual range for a document's worth of claims.

Open on a title beat (`establishing`, its caption is the film's title) and
close on a `closing` beat whose caption is the thesis in the viewer's words.
These two have no numbers.

## Check

```
node scripts/check-screenplay.js film/screenplay.md film/brief.md
```

It checks beat format, that every beat's claims and nouns exist in the brief,
that numbers in captions and keys come from the claims the beat cites, that
each Count has a Key, and the total length. It warns (without failing) about
claims no beat uses and captions too long to read in their beat.
