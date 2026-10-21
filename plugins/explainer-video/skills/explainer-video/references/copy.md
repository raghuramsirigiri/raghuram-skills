# Copy: the claims ledger, hedges, quotes, words on screen

On-screen text **is** the script: there is no voiceover, and most feed
video plays muted. Every word must be true to the source and readable in
the time it holds.

## The claims ledger

Build it first, from the source, before writing a word of copy. One entry
per figure or quote that could appear on screen, in the spec's `claims`:

```json
{ "id": "F1", "value": 38, "unit": "%", "display": "38%",
  "text": "Ridership rose 38% year on year",
  "source": "A", "locator": "¶2",
  "verbatim": "Ridership rose 38% on the previous year, to 2.4 million trips.",
  "kind": "copied", "working": null, "hedge": null, "forecast": false }
```

- **`id`**: `F1, F2…` for figures, `Q1…` for quotes. Copy refers to them by
  id: a slot value `"F1"`, or `{F1}` inside a string. A number typed into
  copy is a lint failure, so every figure on screen is traceable by
  construction.
- **`display`**: exactly what is painted, formatted for the locale
  (`38%`, `2.4m`, `1,240`, `£3.90`). Counters roll to it and land on it.
- **`locator`**: where it is in the source, precise enough to find in ten
  seconds: `¶4` (paragraph), `p.12`, `row "Q3" · Revenue`, `table 2`,
  `slide 6`. Count paragraphs from the first paragraph of body text.
- **`verbatim`**: the source sentence or cell, copied character for
  character. The hedge and upgrade-word lints read it.
- **`kind`**:
  - `copied`: the figure appears in the source as written (a reformat
    like "2.4 million" → `2.4m` is still copied).
  - `derived`: you computed it. `working` holds the arithmetic with the
    one rounding named: `"2.4m / 1.38 = 1.739m, rounded to 1.74m"`.
    Prefer a copied figure where one says the same thing.
  - `illustrative`: no source; written to show a shape. Allowed only when
    the user gave a topic with no figures (SKILL.md rule 1). The engine
    labels every scene that shows one and the source card.
- **`hedge`**: the qualifier the source attaches (`could`, `estimated`,
  `up to`…). See § Hedges.
- **`forecast`**: `true` for any projected, planned or target value.

Tables and series go in `data` (`{ id, source, locator, unit, x, y }`),
used by `trend-line`. A figure from a table that is painted as a label
(the end value) is still a claim.

From a file: read `.md`, `.txt`, `.html` and `.csv` directly. Read
`.pdf`, `.docx` and `.xlsx` with whatever document tools your environment
has, keeping page, paragraph or cell locators. From a URL the user gave:
fetch that page's text only, and take the publication date from it. Never
go to the web for figures the user didn't supply.

## Hedges: keep the source's certainty

Shortening a sentence never upgrades it. When the source hedges a figure,
the hedge (or an equivalent) is in the copy of **every scene that shows
it**, in the caption and in the alt text:

| Source says | On screen, any of |
| --- | --- |
| could, may, might | could · may · might · up to |
| up to | up to · as many as |
| estimated, estimates | estimated · an estimated · about · around · roughly |
| projected, expected, forecast | projected · expected · forecast |
| preliminary, provisional | preliminary · provisional · early figures |
| about, around, nearly | about · around · roughly · nearly · almost |
| alleged | alleged · allegedly |
| according to X | according to X · X says |

`check-video.js` enforces this list. A **forecast** (`forecast: true`) also
needs forecast wording on screen (*forecast, projected, expected, could,
target, plan*), and in a chart it is hatched or dashed, never drawn like a
measurement.

Put the hedge where it reads naturally, usually in the kicker or the line:
*"The authority estimates"* (kicker) + `3m` + *"trips a year could follow by
2028"* (line).

**Upgrade words** go on screen only if the source uses them: *will,
record, first, biggest, ever, all-time, unprecedented, largest, best,
worst*, and cause words *because, due to, caused, thanks to, led to*. The
lint fails any of them that no claim's `verbatim` contains.

## Attribution

Keep the source's attribution verbs: *says, estimates, reports, expects,
credits*. "The agency says use fell" is not "Use fell" when the source
attributes it. A claim that belongs to someone (an estimate, a forecast, an
opinion) is attributed on screen, usually in the kicker.

## Quotes

A quote is a claim with `"quote": true`, its `verbatim` (the whole source
sentence) and its `display` (the excerpt on screen). `display` must be a
substring of `verbatim`, word for word. A cut inside it is marked `…`.
Never paraphrase inside quote marks. Attribute it with the name and role
as the source gives them, and set `speaker` so the lint checks the name.
Quote only people the source quotes.

## Numbers and dates

- Format by `meta.locale` (`en-GB` default): `1,240` · `2.4m` · `£3.90` ·
  `14 Oct 2026`. Keep the source's precision; don't add decimals, and round
  at most once (in `working`).
- Units belong on screen. A figure without its unit and period ("38%"
  of what, over when?) goes in the units line: *"Year to September 2026"*.
- Years and dates are labels, not claims, but they must match the source.

## Word limits

| Layer | Limit |
| --- | --- |
| hook headline | 7 words |
| big number's line | 8 words |
| context title | 8 words, sub 10 |
| evidence headline (states the finding with its number) | 10 words |
| kicker | 4 words |
| units line | 8 words |
| bar label | 3 words; ranked row 4 |
| bullet | 7 words; step and timeline event 6 |

No full stop on headlines. One idea per layer. At most two kinetic layers
(headline, line) are live at once. Kicker, units and source line are the
card's furniture.

## Read time

Each text layer is on screen, fully revealed and steady (the scene's slow
drift aside), for at least **max(1.2 s, 0.5 s + 0.25 s per word)**. A scene's
read is counted from when its headline lands, so it runs alongside a chart
that is still drawing. Every layer that lands later still gets its own time
once it has. A big number holds at least 1.5 s after its counter lands. The
source card holds at least 2 s, and the final frame at least 1 s. The
compiler builds these in when `dur` is `"auto"`. A number `dur`
below a scene's minimum fails to compile. The audit measures what was actually
painted.

## Caption and alt text

- **Caption**: the words to post with the video. Every figure in it is a
  claim that is on screen in some cut, with its hedge. Name the source and
  its date. No handle, link or hashtag the user didn't give (hashtags: three
  at most). No `V` handles: the caption is public.
- **Alt text**: an accessible description of the video's sequence of
  findings, in order, with their figures and hedges, ending with the
  source. One to four sentences.
