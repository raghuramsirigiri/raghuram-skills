# Scene catalog

One section per scene type. Every scene shows **one idea**, with at most one
chart. Every figure in a scene is a claim id from the ledger, either as a slot
value (`"value": "F2"`) or inline in copy (`"title": "Trips rose to {F3}"`).
Never type a number into copy. `scripts/check-video.js` fails a bare number.

Facts per scene (slot word limits, data shape) are also in
`assets/motion-lib/motion.manifest.json`. The tests keep the two in step with
the code.

Every scene takes `"dur": "auto"` (the default) or a number of seconds of
content time, *excluding* transitions. A number below the scene's minimum is a
compile error that names the scene, never a silent stretch. Every scene
arrives by the same transition (`motion.md` § Transitions).

Evidence scenes are laid out as a social card: the accent bar and the kicker
line at the top, headline, units and chart, then a source line under a
hairline. The bar, the kicker line and the footer are the shared frame, the
same place on every scene and still through transitions (`motion.md` § The
shared frame); a scene's `kicker` copy fills the kicker line. The source line
is built automatically from the sources of the claims the scene shows. You
never write it.

Evidence headlines may run to 10 words because they state the finding with its
number. Kinetic layers (the hook headline, a big number's line, bullets, steps)
stay at 7–8 words (`copy.md` § Word limits).

---

## hook-headline

**Job:** open on the one claim, in the first half second.
**Not for:** a hook that is a single figure alone. Use `big-number`.
**Slots:** `kicker` ≤ 4 words · `headline` ≤ 7 words (required) · `units` ≤ 8.
**Motion:** the headline is set 2–3× the card size and its words rise through
a mask, one after another.

```json
{ "id": "hook", "type": "hook-headline",
  "copy": { "kicker": "Port Halden ferries", "headline": "Ferry trips up {F1} in a year" } }
```

## big-number

**Job:** one figure, huge, with a line saying what it counts.
**Not for:** comparing two figures (`before-after`, `compare-bars`).
**Slots:** `kicker` ≤ 4 · `value` = one claim id (required) · `line` ≤ 8 words
(required) · `units` ≤ 8.
**Motion:** the counter rolls on expo-out to the exact value in tabular digits,
then holds at least 1.5 s.

```json
{ "id": "e1", "type": "big-number",
  "copy": { "kicker": "Trips in the year", "value": "F3", "line": "trips across the bay", "units": "Year to September 2026" } }
```

## kicker-title

**Job:** context or a section title: what happened, who, when.
**Not for:** a finding with a number. Give that an evidence scene.
**Slots:** `kicker` ≤ 4 · `title` ≤ 8 (required) · `sub` ≤ 10.

```json
{ "id": "ctx", "type": "kicker-title",
  "copy": { "kicker": "Annual report", "title": "Riders came back to the water", "sub": "Published October 2026" } }
```

## compare-bars

**Job:** two to six values in the same unit.
**Not for:** change over time (`trend-line`), parts of a whole (`share-split`),
or negative values.
**Slots:** `kicker` · `title` ≤ 10 (required) · `units` ≤ 8.
**Data:** `bars`: 2–6 of `{ label ≤ 3 words, value: claim id, emph?, forecast? }`.
**Motion:** bars grow from a zero baseline on expo-out (never past their
value). The value label lands at each bar's end. `emph: true` gives a bar the
accent and mutes the others. A forecast claim (or `forecast: true`) is hatched.

```json
{ "id": "e2", "type": "compare-bars",
  "copy": { "kicker": "Trips per year", "title": "Trips rose from {F2} to {F3}", "units": "Million trips, year to September" },
  "bars": [ { "label": "2025", "value": "F2" }, { "label": "2026", "value": "F3", "emph": true } ] }
```

## trend-line

**Job:** change over ordered time.
**Not for:** unordered categories, fewer than 3 points, or a second line.
**Slots:** `kicker` · `title` ≤ 10 (required) · `units` ≤ 8.
**Data:** `series` names a table in the spec's `data` list:
`{ id, source, locator, unit, x: [...], y: [...], forecastFrom? }`. A `null` in
`y` is a gap, drawn as a gap, never as a zero. `end` is an optional claim id
drawn beside the last point. `highlight: [from, to]` accents a stretch of the
line and mutes the rest.
**Motion:** the line draws left to right. The end dot and end value land as it
finishes. Points from `forecastFrom` on are dashed.

```json
{ "id": "e3", "type": "trend-line",
  "copy": { "kicker": "Waiting time", "title": "Median wait fell to {F10} by December", "units": "Days, monthly median" },
  "series": "D1", "end": "F10", "highlight": [15, 17] }
```

## share-split

**Job:** part of a whole. Never a pie.
**Not for:** shares that don't come from one whole, or that add up past 100%.
**Slots:** `kicker` · `title` ≤ 10 (required) · `units` ≤ 8.
**Data:** `parts`: 1–5 of `{ label, value: claim id in %, emph? }`;
`style`: `waffle` (default for 1–2 parts) or `bar` (default for 3–5).
A remainder below 100% is drawn as an unlabelled muted area.

```json
{ "id": "e4", "type": "share-split",
  "copy": { "kicker": "How people crossed", "title": "{F5} of crossings were by ferry", "units": "Share of bay crossings, 2026" },
  "parts": [ { "label": "By ferry", "value": "F5", "emph": true } ] }
```

## ranked-list

**Job:** top-N, largest first, up to five rows.
**Not for:** unranked categories (`compare-bars`).
**Data:** `rows`: 2–5 of `{ label ≤ 4 words, value: claim id, emph? }`, in rank
order. Out of order is a compile error.

```json
{ "id": "e5", "type": "ranked-list",
  "copy": { "kicker": "Busiest routes", "title": "The harbour line carried most trips", "units": "Million trips, 2026" },
  "rows": [ { "label": "Harbour line", "value": "F7", "emph": true }, { "label": "North shore", "value": "F8" } ] }
```

## before-after

**Job:** two states of one measure.
**Not for:** values in different units, or more than two states.
**Data:** `before`, `after`: `{ label ≤ 3 words, value: claim id }`.
**Motion:** "before" lands in muted ink, a rule wipes, then "after" lands in
full ink. Side by side in square frames and in a wide frame's chart column,
stacked in tall ones.

## timeline

**Job:** up to five dated events.
**Not for:** a measured series over time (`trend-line`).
**Data:** `events`: 2–5 of `{ date, text ≤ 6 words }`. Dates are labels, not
claims, but the event text follows the same copy rules as everything else.
**Motion:** the rail draws down, each date ticks on with its dot and its text
follows. Vertical in every format (in a wide frame's chart column), spread
down the height it has.

## steps

**Job:** a 1-2-3 process.
**Data:** `steps`: 2–4 strings, ≤ 6 words each.
**Motion:** one accent marker travels from step to step, and each step's text
arrives as the marker reaches it.

## quote

**Job:** an attributed quote, verbatim.
**Not for:** paraphrase, ever, or a person the source doesn't quote.
**Slots:** `quote` = claim id (required) · `name` ≤ 5 (required) · `role` ≤ 8.
**Data:** the claim carries `"quote": true`, `verbatim` (the source sentence)
and `display` (what goes on screen). `display` must be a substring of
`verbatim` after normalising spaces and quote marks. A cut is marked with `…`.
**Motion:** the whole quote fades in muted, then its words brighten to ink in
reading order, so it is never "typed". The attribution follows.

```json
{ "id": "Q1", "kind": "copied", "quote": true, "source": "A", "locator": "¶6",
  "verbatim": "People chose the water because it was simply the quickest way across the bay this year.",
  "display": "People chose the water because it was simply the quickest way across the bay" }
```

## bullet-stack

**Job:** up to three short points.
**Not for:** points that each carry a figure. Give the strongest one its own scene.
**Data:** `points`: 1–3 strings, ≤ 7 words each.

## photo-pan

**Job:** a picture the user supplied.
**Not for:** any fetched, stock or generated image. Never use one.
**Slots:** `kicker` · `caption` ≤ 12 (required) · `image` = a `data:image/…`
URI from the user (required).
**Motion:** a slow push from 1.03 to 1.07, clipped to the chart area.

## source-card

**Job:** sources and dates. It is in **every** cut, last, or just before the
outro.
**Slots:** `note` ≤ 12 (optional).
**Built from:** `sources` (name, date, `asOf` when given) and `claims`. If any
claim is `illustrative`, the card says *Illustrative figures, not
measurements*. It holds at least 2 s.

## outro

**Job:** the user's own name, logo and call to action, after the source card.
**Not for:** an invented handle, link or slogan. Never add one.
**Slots:** `name` ≤ 6 (required, or `meta.brand.name`) · `cta` ≤ 8. The logo
is `meta.brand.logo`, a data URI the user supplied.

## custom

**Job:** the escape hatch, for the rare scene the catalog can't draw.
**Not for:** anything the catalog already draws.
**Data:** `draw` names a painter the page registers on `Motion.custom`. The
contract is in `motion.md` § Custom scenes. The card's kicker, headline,
units and source line come for free.
