# Pictures: the continuous style's catalogue

A picture is what a finding looks like in the world (`continuous.md`). A
**data picture** carries the figure, one unit per stated thing; a **prop**
sets the scene beside it; the **desk** is a place for work still to do; the
**plinth** lifts a place for a verdict. `assets/motion-lib/motion.manifest.json`
§ `pictures` lists the same facts for the engine and the tests.

## The rules every picture keeps

- **The key is on screen** while a picture carries data: what one unit is
  (`= 1% of delivery users`, `1 dot = 1 person`). `of` is copy, held to the
  numbers check: words, never a typed figure.
- **The units are the figure**: 72% lights 72 of 100 blocks; 58% of 1,204
  members lights 698 dots. Columns stand from zero.
- **A picture's words come from the scene's copy or its claims**: a value
  label is the claim's display, a calendar's month is a word in the copy.
- **A picture never says why.** A building or a device sets the scene; it
  never implies a cause the source doesn't state.
- **Choose by the data, then by the meaning.** A share of people is
  `people`; a share of visits is `dots` or `blocks`, never `people`.
- **A change is not a share.** "Up 38%" is drawn as its two values
  (`columns`), never as 38 of 100 blocks. A hook that states a change can
  open without a picture: it opens on the next place.

A picture that can't show its scene refuses with an error naming the scene,
and `compile` (so `check-video.js`) fails.

## Choosing

| The finding | Picture | Scene type |
| --- | --- | --- |
| a count of people | `people` | `big-number` |
| a share of those people, or two years of it | `people` with `at` (or `whole`) | `big-number`, `before-after`, `compare-bars` |
| a share of anything, 2% or more | `blocks` (`skin`: `parcel`, `card`, `plain`) | `big-number`, `before-after`, `compare-bars` |
| a small share (under about 2%) | `dots` | the same |
| parts of one whole | `split` | `share-split` |
| 2–6 values in one unit (quarters, sites) | `columns` | `compare-bars` |
| stages that only narrow (started, submitted, opened) | `funnel` | `compare-bars` |
| a ranking, largest first | `podium` | `ranked-list` |
| a series over time | `ribbon` | `trend-line` |
| work not done yet, with a due date | `desk` | `kicker-title` |
| a verdict about a finding already shown | `plinth` with `at` | `kicker-title` |

Left out, `picture.kind` defaults by scene type: a % big number gets
`blocks`, a series `columns`, a ranking `podium`, parts `split`, a trend
line `ribbon`. A default `blocks` still needs its `of`.

## Data pictures

### people
**Job:** a count of people, one dot each, and shares of them.
**Not for:** anything that isn't people (visits, accounts, money).
**Spec:** `{ "kind": "people" }` on the count's own `big-number`; a later
share revisits with `{ "at": "<that scene>" }`, or names the count with
`"whole": "F3"`. Over 2,000 people, `"per": 10` (people per dot), which the
key states.
**Shows:** dots arriving in a sweep while the count rolls; a share lights
from the back row; two states mark the first with a stepped line and its
label (`2025: 64%`), then move to the second.

### dots
**Job:** a small share of anything: 1,000 dots, one per 0.1%, lit along the
front row so 1.5% reads as the handful it is.
**Not for:** a count; a share above about 20% (`blocks` reads better).
**Spec:** `{ "kind": "dots", "of": "product page visits", "props": ["laptop"] }`.

### blocks
**Job:** a share as a 10 × 10 stack, one unit per 1%.
**Not for:** a count; a share below about 2% (`dots`).
**Spec:** `{ "kind": "blocks", "skin": "parcel", "of": "delivery users", "props": ["home"] }`.
Skins: `parcel` (deliveries, orders), `card` (accounts, cards), `plain`.
**Shows:** units set down in a sweep, then the share lighting one unit at a
time with the figure; a `plinth` can lift it.

### split
**Job:** parts of one whole, each lit in turn, the `emph` part (or the
first) in the accent, the rest stepping darker; the key lists each part.
**Not for:** shares of different wholes, or parts adding past 100%.
**Spec:** `share-split` with `{ "kind": "split", "of": "product page visits", "props": ["phone", "laptop"] }`.

### columns
**Job:** 2–6 values in one unit, standing in a row from zero, each value on
its column and its label under it; the `emph` bar in the accent.
**Not for:** a long series (`ribbon`), parts of a whole (`split`).
**Spec:** `compare-bars` with `{ "kind": "columns" }`.

### funnel
**Job:** stages that only narrow; each stage's loss stands above it as a
ghost of the stage before, its value and label under the plate.
**Not for:** stages that grow (it refuses), or different units.
**Spec:** `compare-bars`, bars in stage order, `{ "kind": "funnel" }`.

### podium
**Job:** a ranking: columns largest first, the first (or `emph`) in the
accent, long names wrapped under each.
**Not for:** unranked categories (`columns`). Rows out of rank order fail.
**Spec:** `ranked-list` with `{ "kind": "podium" }`.

### ribbon
**Job:** a series over ordered time, drawn left to right at each value's
height on light posts. A gap (`null`) stays a gap; points from the table's
`forecastFrom` are ghosted; `highlight` takes the accent; the `end` claim
labels the last point. A baseline that isn't zero is stated on a scale post.
**Not for:** unordered categories, or fewer than three points.
**Spec:** `trend-line` (`series`, `end`, `highlight` as on slides),
`{ "kind": "ribbon" }` or no picture.

## Props

`"props": [...]` on a data picture stand to its left at the same height,
side by side: they widen a place, never make it taller. Two at most.

- **`home`**, **`branch`** (`building`): where the finding happens: homes
  for deliveries, a bank branch for accounts.
- **`laptop`**, **`phone`** (`device`): a website or app, showing a plain
  wireframe page, never a real product's screen. A `device` can also stand
  alone as a place: `{ "kind": "device", "skin": "laptop" }`.

## The desk

**Job:** work that is waiting: written answers in an unsorted pile, three
empty trays (the themes they'll be sorted into), and a calendar whose top
page tears off to show when it's due. For "not yet analysed", "due in
September", "under review".
**Not for:** a finding with a figure.
**Spec:** `{ "kind": "desk", "due": "September", "from": "ctx" }`: `due` is
a word in the scene's copy (the calendar shows its first three letters);
`from` lifts sheets off an earlier place and carries them to the pile.

## The plinth

**Job:** a verdict about a finding already shown: it lifts that place
(`at`, or the place in view) onto a plinth. It adds no figure.
**Spec:** `{ "kind": "plinth", "at": "hook" }`, on the verdict's
`kicker-title`. It lifts `blocks`.

## A custom picture

A `custom` scene takes the stage for its beat (`motion.md` § Custom
scenes). In either style its painter gets the 2.5D kit: `api.iso(scale)`
returns a view centred in `api.box` (world 0,0,0 a little below its middle)
with `box`, `shadow`, `tray`, `token`, `quad` and `P(x, y, z)`; `api.mat`
holds the tints (`N`, `N2`, `A`, `PAPER`). Draw data with `A`, everything
else with the neutrals.

```js
Motion.custom.crates = { enter: 1, read: 1.5, draw(ctx, lt, api) {
  const V = api.iso(0.9);
  V.box(-40, -40, 0, 80, 80, 60 * api.at(0, 0.8), api.mat.N2);
} };
```
