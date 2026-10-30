# Tracing: how any number or picture in the film was reached

A film persuades more than a table does: 38 cars lighting up feels like a
fact. So everything on screen must be traceable back to the document, and
the skill must be able to show the trail when asked, not before. A trace is
given **only on request**: the film and the report carry handles, never the
working.

## Who asks, and why

- **The author**, who hands the film to a boss, a client or an audience and
  wants to be sure no figure will embarrass them.
- **The subject's owner** (the sales lead, the operations analyst, the
  historian, the scientist), who checks the film against what they know and
  pushes back when it says more than the source does.
- **A viewer** of the finished film, through the author: "where does that
  number come from?"

## Handles

| Handle | Is | Lives in |
| --- | --- | --- |
| `C<n>` | a claim: a fact or figure, with its quote | `film/brief.md` § Claims |
| `N<n>` | a noun: a thing the document mentions or implies | `film/brief.md` § Nouns |
| `B<n>` | a beat: one moment of the film | `film/screenplay.md`, `film/shots.js` |
| `K<n>` | a cast item: a character, prop or place | `film/bible.md`, `film/cast.js` |

The chain for a number: **B → C → the document's sentence**. The chain for a
picture: **K → N → the document's words** (or "convention", see below).

## The closing line

Every report ends with:

> Ask where any number came from, or why something looks the way it does.

## The trace block

For a number (asked about a beat, a callout or a count):

```
B5 · 38% of online drivers (callout, counts with the cars)
  claim   C9: "At the morning peak, 38% of online drivers are already on the airport rank"
  where   the document, § Where the drivers are, first paragraph
  drawn   100 cars stand for the drivers online (key: 1 car = 1% of online drivers); 38 light up on the rank
  hedges  none in the source; the film adds none
```

For a picture (asked why something looks as it does):

```
K3 · ride-hailing car
  noun    N3 "ride-hailing car", implied by C1, C2, C9 (drivers, trips)
  looks   a generic hatchback, no roof sign: the bible's "tell apart from"
          says nothing else on the streets moves, and the document is about
          private drivers, not taxis
  source  convention: the document doesn't describe the cars
```

Keep each block to what was asked; offer the next link ("want the beat's
full camera and timing?") rather than printing it.

## Anticipated questions

| They ask | The answer shows |
| --- | --- |
| "Where does 38% come from?" | The B → C → quote chain, with where in the document. |
| "Why 38 cars? There are thousands of drivers." | The key: one unit stands for 1% (or for N things); the count drawn equals the claim. |
| "Why does the rider walk away? Did someone cancel?" | The noun's `stands for`: an abstract figure (cancellations) shown as a concrete act, and the claim it carries. |
| "Why is the tank / the soldier / the hominin drawn like that?" | K → N → the document's words, or "convention, not in the source" with the bible's era rule. |
| **Pushback:** "We never said the airport causes long waits." | The claims the beats cite, word for word. If a beat, caption or cut implies a cause the document doesn't state, say so, fix the film (caption, order or beat), and re-run the checks. |
| **Pushback:** "That number's wrong, it was 41%." | The quote. If the document says 38%, the film is right to the document; if the user has a newer figure, it goes into the document and the brief, not straight into a caption. |
| "Why isn't the driver numbers drop in the film?" | The brief's unused claims and why each was left out (it didn't serve the thesis); offer a beat for it. |
| **Tempts invention:** "Show Q4 waits falling." / "Why did it go down?" | Refuse to show what the document doesn't say: Q4 is a goal (C15), not a result, and the document gives no reason. Offer what it does say. |
| "Is this real?" (for illustrative or fictional sources) | The source line on screen and the brief's Document line, as the document states it. |

## When a trace corrects the film

A trace that finds a figure off its quote, a count that doesn't match its
claim, or a picture that implies something the document doesn't say is a
bug, not a footnote: fix the brief, screenplay, bible or shots, re-run the
checks, re-finalize, and say what changed.
