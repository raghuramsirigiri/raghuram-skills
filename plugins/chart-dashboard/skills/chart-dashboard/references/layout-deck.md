# Deck layout (`templates/slides.html`)

Read with `layout.md`, which holds the rules shared by all three formats.

A scrolling column of 16:9 slides — the deck reads like a PDF open in a browser
tab: no ground colour, no progress bar, no next/back controls, nothing to click.
Each slide is authored at 1280x720 and scaled to the column with a transform, so
every slide is exactly 16:9 at any window size and nothing reflows. Print →
Save as PDF gives one slide per page, on a page cut to the slide's 16:9 with an
even gutter. The slide's corner (`--r-slide`, 24px) is set in proportion to the
cards' (`--r-card`, 10px) so the two read as one family; change one, scale both.

Markup is one `<div class="page">` per slide wrapping one
`<section class="slide l-…" data-title="…">`. The footer strip (deck name,
context, slide title, number) is generated from `data-title` and the slide's
position — don't write it by hand. Every chart sits in a `.fig` card: the
lighter `--card` fill over the slide's `--ground`, with no border or shadow, so
the fill alone lifts the figure off the slide. Don't add a frame of your own.
The only other filled surfaces are `.note`, the emphasised table rows and the
matrix quadrants.

Eighteen layout classes, grouped by the job the slide does:

| | |
|---|---|
| **Structure** | `l-cover` `l-agenda` `l-section` `l-statement` `l-quote` |
| **Evidence** | `l-split` `l-full` `l-metrics` `l-compare` |
| **Analysis** | `l-three` `l-grid` `l-table` `l-matrix` |
| **Argument** | `l-list` `l-points` `l-steps` `l-timeline` `l-stat` |

One layout per slide; don't blend two. A slide that seems to need a nineteenth
layout is usually two slides. `l-grid` uses the dashboard's own span classes
(`.w4 .w6 .w8 .w12 .h2`), so an overview slide and a dashboard panel stay one
system.

## Compose the sequence from the argument

The template ships one example of each layout so the markup is visible in one
place. That order is a catalogue, not a running order — a deck built by keeping
all twenty-one example slides is a deck that argues nothing.

Build it in four passes, in this order. The order is the point: a deck assembled
claim-by-claim ends up with whatever scaffolding its author happened to remember
at the end, which is how the same data produces a deck with an agenda one time
and none the next. The spine is not decoration applied afterwards — it is what
the claims hang on, so it goes down first.

**1 · Write the claims.** One sentence each, in the order you would say them out
loud. Nothing about slides yet. This list is the deck's content and everything
below is derived from it, which is what makes two runs over the same findings
land on the same deck.

**2 · Group the claims into sections.** A section is *one question the data
answers* — claims that answer the same question belong together, and a claim
that answers a different one starts a new section. Group by that test alone, not
by how many slides each group ends up with. Two ways this can come out, both
fine and both determined by the data rather than by preference:

- **One section** — every claim answers the same question. Common in a short
  deck. No dividers (a divider announcing a single section is furniture), and
  the agenda lists the claims themselves.
- **Two to five sections** — a divider before each. If the grouping yields more
  than five, the deck is answering more questions than an audience can hold;
  merge the closest pair until five or fewer, rather than shipping seven
  dividers.

**3 · Lay the spine.** Before writing a single evidence slide, place these:

| Position | Layout | Carries | When |
|:--|:--|:--|:--|
| first | `l-cover` | the claim the whole deck exists to make | always |
| second | `l-agenda` | one `.toc .part` per section (or the claims, if there is one section) | always |
| before each section | `l-section` | the section number and its name | only when there are 2+ sections |
| last | `l-statement` | the recap — the claim restated — and the ask | always |

Two of these are load-bearing in ways that are easy to miss. The **agenda** is a
contract: an audience that has seen it is tracking where they are in it, so the
`.toc .part` entries and the `l-section` dividers must be the same list in the
same order — a deck whose index promises three parts and delivers two has lost
the reader by the second.

It is also a real table of contents, which means:

- **One `.toc .row` per slide in that section**, carrying that slide's own claim
  and its slide number. A single row summarising four slides ("Growth and
  revenue mix") tells the audience nothing they could not guess from the part
  heading, and it makes the deck look shorter than it is — the reader is
  counting what is coming, so under-listing it is a promise you then break.
- **A single-section deck has no `.part` entries at all** — just the rows. A part
  heading labelled "One part" is the layout admitting it had nothing to divide;
  if the deck has one section, the agenda is simply the list of claims.
- **Keep the row titles short enough to sit on one line** beside their number.
  The claim on the slide can be a full sentence; its agenda row is the shortest
  phrase that still names it. The **closing** is what a deck is *for*: a deck that
stops on its last chart leaves the audience to infer the ask, which is the one
job the presenter cannot delegate to a chart. Restate the claim in the same
words as the cover — the repetition is the point, not a redundancy to edit out.

**4 · Choose a layout per claim.** Now fill the sections. Each claim becomes a
slide's `h2`, and the layout follows from what that claim needs to be believed.
Read down the table and take the first row that fits. Every layout has one job,
and the last column names the neighbour it is most often confused with. That
boundary is what makes two decks built from the same findings pick the same
layout.

| The claim needs | Layout | Not when — use instead |
|:--|:--|:--|
| a chart and the reading of it | `l-split`, with `.wide` when the chart needs the room (many rows, a long axis, long names) | the chart makes the point without words → `l-full` |
| a chart whose shape is the whole argument | `l-full` | the reading needs more than one line → `l-split` |
| one figure, or one measure before and after | `l-stat` | the figures are different measures → `l-metrics` |
| two to four different measures, each needing a sentence, no chart | `l-metrics` | one measure → `l-stat`; a figure whose trend matters → `l-split` |
| two options, cuts or periods judged on identical terms | `l-compare` | three peers → `l-three` |
| three peers (options, goals, workstreams), at least two with a chart | `l-three` | all three in words only → `l-list` |
| three or four small figures that together support one claim | `l-grid` | one chart carries the claim → `l-split` or `l-full`; three equal peers → `l-three` |
| exact values read across rows, three to six of them | `l-table` | the shape matters more than the values → a chart layout; more than six rows → a handout, not a slide |
| items placed on two named axes (impact × effort, likelihood × severity) | `l-matrix` | the four boxes have no axes → `l-points` |
| two or three points, each a heading and two lines, no chart | `l-list` | four or six points → `l-points` |
| four or six parallel points, each a heading and a paragraph, no chart | `l-points` (`.c3` for six) | two or three → `l-list`; on two axes → `l-matrix`; in order → `l-steps` |
| a sequence where the order is the message, no dates | `l-steps` | the stages have dates → `l-timeline` |
| dated milestones: a roadmap or a history | `l-timeline` | no dates → `l-steps` |
| a verbatim from research, a customer, a review | `l-quote` | your own sentence → `l-statement` |
| no evidence: the thesis, the turn, the ask | `l-statement` | — |

Point counts are hard boundaries, not suggestions: three points are always an
`l-list` and four always an `l-points`, never whichever looks better. Five
points is one too many or one too few, and seven or more is two slides. Keep
`l-statement` slides to three or four in a deck, counting the closing, or the
emphasis stops meaning anything.

What varies between two decks built from the same findings should be the
evidence slides in pass 4 and nothing else. `scripts/check-page.js` checks the
spine on any page it recognises as a deck — cover first, agenda second, closing
last, and the agenda's parts matching the dividers — so a missing one fails the
build instead of shipping.

## Deck charts are not dashboard charts

Same library, different reading distance — someone is looking at this from
across a room, for about thirty seconds:

- Two or three series, never a legend of eight. A cut that needs more series is
  a cut that needs its own slide.
- Data labels on, so a value can be read without squinting at an axis.
- The chart's own `title` carries the claim and complements the slide's `h2`
  rather than repeating it word for word.
- A chart appears once in a deck. If the same series answers a second question,
  that is a second chart of the same data, cut differently.
- Two charts read as a comparison must share a y scale — set the same `max` on
  both. Left to themselves each fits its own data and the smaller option looks
  taller than it is.
- **Say the magnitude once.** A number already expressed in thousands does not
  also take a `k` suffix — 4820 with `suffix: 'k'` renders "4,820k", which asks
  the reader to do the conversion the label was supposed to do for them. Scale
  the numbers to the unit you are labelling and say it once: 4.82 with an `m`
  suffix, or the raw 4,820,000 with the subtitle carrying "USD". The subtitle is
  the right place for the unit; the axis suffix is for the symbol.
- **In a grouped chart, series order is the reading order of the dimension.** For
  periods that means chronological — prior quarter first, this quarter second,
  so every group runs left-to-right in time the way the reader already expects.
  Getting this backwards makes the eye read improvement as decline, which no
  amount of legend fixes.
- **Colour is the theme's job, not the slide's.** Write no `color` and the ramp
  assigns one per series, in order, consistently across the deck — which is what
  lets a reader carry "the blue one is last quarter" from slide four to slide
  eleven. Deck charts are especially easy to over-colour, because a deck is
  where the urge to *make the point* is strongest: hand-greying the supporting
  points is emphasis mode, and it is earned only where the chart's own title
  names which points it means (§ Emphasis in `chart-selection.md`). A deck with
  emphasis on every chart has emphasis on none of them — the first grey bar
  stops meaning anything by the third slide. When a chart does earn emphasis,
  the subject takes a **hue** (`T.colors[1]`), not the default: the ramp's first
  step is black, and black bars beside `T.muted` grey bars are two neutrals
  separated only by lightness, which at projector distance reads as "some bars
  are darker" rather than as "these are the ones I mean".

## The text beside a chart

The reading column in `l-split` is not a caption slot. A single
sentence beside a chart leaves a third of the slide empty and forces the
presenter to say out loud what the slide should have said. Write as much as the
claim needs to be believed, in this order, stopping when it is said:

- the `h2` — the claim;
- one or two `.body` paragraphs — what the chart shows and why it follows;
- a `<ul class="pts">` of parallel points — the figures, causes or caveats a
  reader would otherwise have to dig out of the chart. `<b>` inside an item
  sets its lead-in in ink.

Stop at what fits above the footer at the slide's authored size. If the
reading needs more than two paragraphs and five bullets, the slide is making
two claims — split it rather than shrinking the type.

**No decorative emphasis.** Headings take weight and size from the type scale
and nothing else — no underline, no highlight bar. An underline under a heading
reads as a link, and once it is on every slide it marks nothing. `l-steps`
marks the leading step with `.on`, which inks its number; leave `.on` off when
no step leads.

## Tables on a slide

A table slide earns its place when the audience reads several figures per row.
When each row also has a *shape* — a trend over time, a before and after, a
breakdown — use `Charts.reportTable`, not `Charts.table`: a `chart` column puts
a small line or bar chart in every row, on a scale shared down the column, and
`kpi` columns beside it state the figures the claim is about. The reader gets
the shape and the number in one exhibit. Keep `Charts.table` for figures alone.

For a report table on a 16:9 slide: four to six rows, `rowHeight` about 84 so
the card clears the footer, and cell charts without axes. Name a bar cell's
bars with categories, set once on the column (`xAxis: { categories: ['Before',
'After'] }`), and colour each bar on its point (`{ y, color }`), as
`slides.html` does. Each row then labels its own bars, and two labels fit an
84px row. Without categories every row prints a stray `0` beside its bars, and
splitting the bars into two named series does not avoid it
(`charts/report-table.md`). Set a sparkline's colour explicitly (`T.colors[0]`
for ink); left unnamed, a lone series takes the next palette step, which can
pass for one of the bar colours.

## An editable deck

When the user asks for one, build it from `templates/slides-editable.html` and
follow `editable.md`. Everything above still holds — the spine, one claim per
slide, the layouts. Two things behave differently from a static deck:

- **The footer's words live on the cover.** Its name and context are the cover
  kicker's two marked spans (`deck-name`, `deck-context`), not a `DECK`
  object, so a reader can change them and every footer follows.
- **Agenda numbers are text.** Slide numbers in the footers follow the order
  on the page, but the agenda's `.num` spans are written by hand. After a
  reader removes or moves a slide, those are the lines to check, and the hand
  over should say so.
