# What a title may say

How `action-titles` reads a slide, picks its finding, gives it a verdict and words the new
title. Every section is a test that returns yes or no — "make it sharper" drifts from run to
run; these don't.

All examples use invented names and figures.

---

## 1. Reading the deck

### What counts as evidence

A title is evidence-bound to **its own slide, as the audience sees it**:

| Element | Evidence? | Locator |
| --- | --- | --- |
| Text boxes, body placeholders, SmartArt text, grouped shapes' text | yes | `S4 · text "Open cases: 820…"` |
| Table cells | yes | `S4 · table row "Refunds", col "Q2"` |
| Native chart data (the embedded series values, categories, series names) | yes | `S4 · chart series "Orders" · Mar 2026 = 5,480` |
| Data labels and axis titles on a native chart | yes | same as the chart |
| **A picture of a chart** (PNG, JPG, EMF, pasted screenshot) | **no numbers** — never estimate bar heights, line positions or pie slices | `S4 · picture` |
| Speaker notes | **no** — the audience never sees them. Read them; quote them in a trace; never let them into a title | `S4 · notes` |
| Another slide | **no** — slides get lifted into other decks alone. A figure on S2 does not prove a title on S7 | — |
| The file name, the deck's cover or agenda | context only, for resolving "Q3" or "this year" | — |

Record a locator for every figure you read — the trace needs it.

### Getting the content out

Use whatever reads `.pptx` in this environment. If nothing else is to hand, `python-pptx`
does it in a few lines:

```python
from pptx import Presentation
p = Presentation(path)
for n, s in enumerate(p.slides, 1):
    title = s.shapes.title.text if s.shapes.title else None
    for sh in s.shapes:                      # recurse into sh.shapes when sh.shape_type is GROUP
        if sh.has_text_frame: ...            # sh.text_frame.text
        if sh.has_table: ...                 # sh.table.cell(r, c).text
        if sh.has_chart:                     # sh.chart.plots[0].categories, plot.series[i].values
            ...
    notes = s.notes_slide.notes_text_frame.text if s.has_notes_slide else ""
```

Failing that, a `.pptx` is a zip: slide text is in `ppt/slides/slideN.xml` (`<a:t>`), chart
values in `ppt/charts/chartN.xml` (`<c:v>`). Slide order comes from
`ppt/presentation.xml`, not from the file numbers.

**Pasted slides** follow the same rules: what the user pastes under a slide heading is that
slide's visible content, unless they label it notes.

**The title** is the title placeholder. A slide with no title placeholder but an obvious
top-of-slide text box used as its title: treat that box as the title and say so in the trace.
A slide with no title at all gets one proposed like any other — `Now:` reads *(no title)*.

## 2. Structural slides — left as is, one line

These carry no finding and keep their labels:

- cover / title slide
- agenda, contents
- section dividers (a title and at most a subtitle, nothing else)
- **everything after a divider titled Appendix, Backup or Annex** — reference slides are found
  by label, so they keep their labels
- closing slides: thank you, questions, contact details

They appear only in the `Left as is` line, never as entries.

## 3. Choosing the slide's finding

Take the first that exists:

1. **The slide's own stated conclusion** — a takeaway box, a bolded "so what", a callout —
   *if the slide's figures prove it*.
2. **A comparison against a target, budget or plan shown on the slide.**
3. **The largest movement in the slide's main figure** — the series or row the slide is
   about (the one named in its label, its only series, or its highlighted series). Largest by
   the slide's own measure: percentage points for rates, relative change for counts and money.
4. **A single stated state** — "Open cases: 820", "Launch date: 3 Mar" — when nothing moves.

A risk or a miss stated on the slide ("at risk", "behind plan", "below target") **always
rides along** in the title if it's there — it is never dropped for being bad news. Bad news
leads the title when it is the slide's finding; it is never softened into "update" or
"progress".

## 4. The verdict — a closed set of five

Apply in this order; the first that fits is the verdict.

| Verdict | Test |
| --- | --- |
| `Two findings` | The slide carries two or more findings of **different metrics** with no stated link between them, and none is labelled or highlighted as the lead. (Two series of the same metric are one finding.) |
| `No single finding` | Nothing on the slide passes §3 — an org chart, a process, a list of names, a picture of a chart with no numbers in text. |
| `Keep` | The current title already states the §3 finding, passes every rule in §5, and a rewrite would change only style. |
| `Unsupported` | The current title makes a claim — a cause, a verdict, a figure, a direction, a date — that the slide's evidence does not prove. |
| `Retitled` | Everything else: the current title is a label, a topic, a question, or a claim weaker than the finding. |

- `Unsupported` **always** carries a *New:* line — the strongest title the slide *does*
  prove — and a one-line reason naming what the slide lacks. It is never silently rewritten
  as `Retitled`, because the author thinks the old claim is true and needs to know it isn't
  shown.
- `Two findings` offers one title per finding and says the slide should be split, **or** which
  one to lead with if the author wants to keep one slide. It does not pick for them.
- `No single finding` keeps the current title (or proposes a plain descriptive one if the
  slide has none) and says what would give it a finding — *"the chart is a picture; paste the
  native chart or add the figure as text"*.
- `Keep` has no *New:* line.

## 5. Wording rules

Every word in a new title is checked against the slide. A title that fails any rule is
reworded until it passes — or the verdict changes.

### Figures

- **Every number, date, name and unit in the title appears on the slide**, or is one
  arithmetic step from figures on it (a difference, a ratio, a percentage change, a share). The
  step is shown in the trace.
- **Precision no finer than the source.** Whole-number inputs → whole-percent changes,
  rounded to nearest, half away from zero (5,480 from 4,700 is +16.6% → *17%*). Rates keep
  the decimals the slide gives them (3.1% → 6.4% is *3.3 pts*). Keep the source's own format:
  `£3.2m` stays `£3.2m`, `12,040` stays `12,040`.
- **Rates move in points.** 38% → 41% is *up 3 pts*, never *up 3%* and never *up 8%*.
- **Ratio words have fixed ranges** — otherwise use the numbers:

  | Word | Only when the ratio is |
  | --- | --- |
  | *doubled* | 1.95 – 2.05 |
  | *more than doubled* | > 2.05 and < 2.95 |
  | *tripled* | 2.95 – 3.05 |
  | *halved* | 0.475 – 0.525 |

  No *nearly*, *almost*, *roughly*, *over* in front of a computed figure — say the figure.

### Certainty

- The slide's certainty words survive: *forecast*, *target*, *plan*, *estimate*, *expected*,
  *at risk*, *provisional*. A forecast is never stated as an outcome (*"volume will reach"* for
  a forecast column is wrong; *"forecast at"* is right).
- *At risk* never becomes *will miss*; *behind plan* never becomes *failed*.

### Cause and sequence

- **Causal words** — *drove, because, due to, led to, thanks to, caused, behind, fuelled by* —
  only when **the slide itself states that cause**, and with the slide's certainty
  (*"likely due to"* stays *likely*).
- **Sequence words** — *after, since, following* — only when the slide shows both the event
  and its timing. Sequence is not cause; don't upgrade it.
- A cause in the speaker notes is not on the slide. It never enters the title.

### Verdicts and intensity

- **No verdict adjectives**: *strong, weak, great, disappointing, concerning, healthy, solid,
  impressive, record* (unless the slide states it's a record).
- **No intensity verbs**: *surged, soared, plunged, skyrocketed, collapsed, spiked*. Movement
  verbs are *rose, fell, grew, declined, reached, held, missed, beat* and the ratio words
  above.
- Comparison to a target on the slide is not a verdict: *"reached 91%, above the 88% target"*
  is a fact.

### Form

- One claim, stated as a sentence. Subject first, then the movement, then the figure.
- **≤ 15 words and ≤ 90 characters.** If it won't fit, it is carrying two findings (split) or
  a qualifier that belongs in the subtitle (drop it from the title).
- **The deck's own terms.** Its metric names, abbreviations and capitalisation — *NRR* stays
  *NRR*. Don't rename a metric to something the slide doesn't call it.
- Sentence case unless every title in the deck uses title case.
- No trailing full stop, no question titles, no colon-led labels (*"Churn: up"*).

## 6. Examples

| Slide shows | Now | Verdict | New |
| --- | --- | --- | --- |
| Orders by month, native chart: Feb 2026 4,700 · Mar 2026 5,480 | Orders | `Retitled` | Orders rose 17% in March to 5,480 |
| Table: NPS 34 (Q1), 41 (Q2); target 40 | NPS reached 41 in Q2, above the target of 40 | `Keep` | — |
| Chart: returns 3.1% → 6.4%; nothing about the courier | Courier switch caused the jump in returns | `Unsupported` | Returns rose 3.3 pts to 6.4% |
| Table: on-time delivery 88% → 85%; warehouse cost £2.40 → £2.10 per order | Delivery and Cost | `Two findings` | On-time delivery fell 3 pts to 85% · Warehouse cost per order fell to £2.10 from £2.40 |
| Screenshot of a line chart; no figures in text | Site Traffic | `No single finding` | — (the chart is a picture; paste the native chart or add the figure) |
| Text: "Q3 revenue forecast £6.1m vs £5.5m plan" | Q3 Revenue | `Retitled` | Q3 revenue forecast at £6.1m, above the £5.5m plan |
| Text: "Open incidents 96 (end Mar) vs 44 (end Dec); target 50 by June — at risk" | Incidents | `Retitled` | Open incidents more than doubled to 96; June target of 50 at risk |

Check against the rules: 5,480 / 4,700 − 1 = 16.6% → 17%. 6.4 − 3.1 = 3.3 pts. 96 / 44 = 2.18
→ *more than doubled*. The courier is on none of those slides, so it's in none of the titles.
