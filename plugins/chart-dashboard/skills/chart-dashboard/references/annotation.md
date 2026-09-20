# Marking up a chart

`chart-selection.md` decides *which* chart and which colour carries the finding.
This file covers what you draw **on top of** the data once that is settled:
reference marks, intervention and forecast notation, threshold colouring, and
when an annotation earns its place at all.

The through-line: an annotation is a guide for the reader's eye, supplying the
context the geometry cannot. A chart that shows a spike but not *why* has handed
the reader the work you were supposed to do.

## Reference marks

- Use `plotBands` for context regions (recession, promo window) and `plotLines`
  for targets, thresholds, and single instants.
- Use `callouts:[{x, series, text}]` to say *why* a spike happened; a chart
  without a labeled anomaly makes the reader do the work.

Three mechanical facts that decide how these are written:

- **`callouts[].series` matches by series *name*.** With no `series`, or a name
  that matches nothing, the callout silently anchors to the *first* series. On
  any multi-series chart, name the series you mean.
- **`x` snaps to the nearest point** on that series, so on a category axis it is
  the category *index*, not the label.
- **A `plotLine`/`plotBand` label draws centred above the plot area** on a line
  chart, so keep it to a few words. Long context goes in `paragraph`, which
  draws a boxed note inside the plot (`paragraphY`, 0–1, sets its height).

## Intervention and forecast

The most common analytical picture: a metric runs along, something happens to
it, and a projection continues past the last measurement. Three cues mark that
boundary, and they are meant to be used **together**.

| Cue | Says | Mechanism |
|:--|:--|:--|
| Vertical separator | *here is the moment* | `xAxis.plotLines: [{ value, label }]` |
| Colour shift | *this is a different environment* | a second series in a different colour |
| Stroke shift (solid → dashed) | *these values were never measured* | `dashStyle: 'ShortDash'` on that series |

### Colour and stroke are per-series — so a switch means two series

charts-lib has no per-segment styling on a line: `color`, `lineWidth`, and
`dashStyle` are read once per series, and there is no `zones` option. A line
that changes appearance partway along is therefore **two series sharing one
x-axis**, each padded with `null` where the other one runs.

The join is the part people get wrong. **Repeat the boundary point in both
series** — it belongs to the measured history *and* is where the projection
starts, so both need it or the segments render with a visible notch:

```js
const T = Charts.theme;
const cats = ['Jan 2025','Feb 2025','Mar 2025','Apr 2025','May 2025','Jun 2025','Jul 2025','Aug 2025'];
//                                        ↓ idx 4 appears in BOTH series
const actual   = [42, 47, 51, 49, 58, null, null, null];
const forecast = [null, null, null, null, 58, 63, 69, 74];

Charts.line('c1', {
  title: 'Retention recovers to 74% by August on the post-rollout run rate',
  subtitle: 'Weekly retention · % · solid = actual, dashed = forecast',
  xAxis: {
    categories: cats,
    plotLines: [{ value: 3, dashStyle: 'ShortDash', width: 1.5, color: T.callout,
                  label: { text: 'v4.2 rollout' } }]
  },
  series: [
    { name: 'Actual',   data: actual,   color: T.colors[1], lineWidth: 3 },
    { name: 'Forecast', data: forecast, color: T.muted,     lineWidth: 3,
      dashStyle: 'ShortDash' }
  ],
  callouts: [{ x: 6, series: 'Forecast', text: 'Projected on the post-rollout run rate' }]
});
```

Notes on the construction:

- The two series give you a legend naming both states for free, which is how the
  reader learns the notation without a key.
- The `plotLines.value` is the **category index** of the event, not its label.
- **The separator marks the event, which is usually *not* where the forecast
  begins.** Above, the rollout is at index 3 and the projection starts at index
  4 — the dip is the consequence, the boundary is later. Don't draw a second
  rule at the forecast boundary: the stroke change already marks it, and two
  vertical rules on one chart read as two events.
- If the intervention spans a window rather than an instant, use a `plotBand`
  with `from`/`to` instead.
- Leading and trailing nulls are safe here — the two segments meet at exactly
  the same coordinate, verified — so this works with the default smoothing.

### Interior gaps need `type:'line'`

**`Charts.line` draws splines by default.** A series with no `type` is smoothed,
and the smoothing routine *drops null points* rather than breaking the path — so
a genuine hole in the data is silently drawn as an unbroken trend through it.

This collides directly with the honesty rule in SKILL.md § 1: a missing week is
a gap, not a zero — and a gap the reader cannot see is no better than a zero.

```js
// Two missing months. Default (spline): one continuous curve, gap invisible.
// With type:'line': the path breaks and the hole is visible, which is the truth.
series: [{ name: 'Signups', type: 'line', data: [10, 14, null, null, 22, 26] }]
```

So: **any series containing an interior `null` must set `type: 'line'`** (or the
whole chart `chart: { smooth: false }`). Smoothing is a presentation choice and
is fine on complete data; on incomplete data it invents the missing shape.

### Saying what the notation means

Name the convention in the subtitle — "solid = actual, dashed = forecast". It is
a convention, not an intuition, and one clause covers it. This is the same
obligation the scenario notation carries on bars
(`chart-selection.md` § Scenario notation), and the bar equivalents — solid /
outlined / hatched via `scenario` — are the right tool when the projection is on
columns rather than a line.

Never leave a projection in the same stroke as a measurement. A modelled value
does not belong on the primary trend at all if you can avoid it; when it must
appear, the stroke has to say so.

### This is one cue, not three emphases

The standing rule is **one emphasis per chart** — an accented bar *and* a callout
on that same bar is not twice the signal, it is two competing signals.

The three intervention cues do not violate it, because they are redundant
encodings of a *single* fact: this boundary is where the world changed. The same
logic licenses IBCS scenario notation, where fill style and colour carry
different dimensions without fighting. Separator, colour, and stroke all point at
one x position, so the reader resolves them as one statement — and the
redundancy is what makes it survive greyscale printing and colour-blind readers.

What the rule still forbids: accent-colouring an *unrelated* category on the same
chart. One boundary, marked three ways, is fine. One boundary plus a highlighted
region plus a target band is a chart with no point.

## Threshold shift

When the finding is *attainment* — who cleared the bar and who didn't — draw the
target as a labelled `plotLine` and colour each bar by which side of it the value
falls:

```js
const T = Charts.theme;
Charts.column('c3', {
  title: 'Three of five regions cleared quota',
  subtitle: 'Attainment · % of quota · bars at or above the 100 target in blue',
  xAxis: { categories: rows.map(r => r.name) },
  yAxis: { plotLines: [{ value: 100, dashStyle: 'ShortDash', width: 1.5,
                         color: T.callout, label: { text: 'Target 100' } }] },
  plotOptions: { series: { dataLabels: { enabled: true } } },
  legend: { enabled: false },
  series: [{ name: 'Attainment', data: rows.map(r => ({
    y: r.value,
    color: r.value >= 100 ? T.aboveThreshold : T.belowThreshold
  })) }]
});
```

**A reference line never takes `T.axis`.** `axis` is the ink the marks
themselves are drawn in — on a chart of black bars, a black target line crosses
them and disappears, which is the one thing a target line cannot afford to do.
`T.callout` is the annotation ink and exists for exactly this: things drawn *on*
the data rather than things that *are* the data. The same goes for the line's
label. Where the threshold also recolours the bars, `T.callout` still reads,
because it is a third colour against the above/below pair.

`plotLines` work the same way on `column`, `bar`, and `line`; on bars the label
rides the end of the rule inside the plot area. They also carry prior-year,
budget, and break-even. A target that only appears in the subtitle is a target
the reader can't check.

### Use the threshold tokens, and read their names literally

`T.aboveThreshold` and `T.belowThreshold` exist for exactly this job. Use them
rather than borrowing `T.colors[1]` / `T.muted`, so a brand recolour carries the
split.

They are named for the **threshold**, not for good and bad, and that is
deliberate: a −3% headcount change and a −3 °C reading are the same geometry, and
neither is a verdict. Read as "warning" only where the metric genuinely has a
good direction — quota attainment, SLA compliance, error budget. For a
directionless measure, the colours still mean "above" and "below" and the
subtitle should say so in those words.

### The two guardrails

- **This is the one exception to the 2–3 accent cap.** That cap protects
  emphasis, where an accent means "this is what the sentence is about" and a
  fourth accent dilutes the first three. Threshold colouring is *evaluative*: the
  colour is a second reading of the value, so seven bars above target may all be
  coloured without ambiguity. The reader learns one rule and applies it across
  the whole chart.
- **Name the rule in the subtitle** ("bars at or above the 100 target in blue").
  A colour split the reader has to reverse-engineer is worse than no split.
- **Don't stack it with emphasis.** A chart that is threshold-coloured *and* has
  two highlighted categories has two colour systems fighting; pick the one the
  title is making.

## When to annotate

Annotations earn their place by answering a question the geometry raises but
cannot settle. Four triggers, and what each one is built from:

| Intent | Execution | charts-lib |
|:--|:--|:--|
| **Explain the anomaly** | Answer the immediate "why" behind an unexpected spike or drop — "Auth API outage" | `callouts: [{ x, series, text }]` |
| **Mark the intervention** | Anchor a vertical reference to the event, establishing before-and-after context | `xAxis.plotLines` for an instant, `plotBands` for a window |
| **Quantify the gap** | On a comparison, state the magnitude of the delta that matters instead of leaving it to be eyeballed | see below |
| **Deliver the punchline** | In a narrative page, one bold callout carrying the chart's thesis | a single `callout` in `T.callout`, or `plotBand.paragraph` |

**On quantifying the gap:** charts-lib has **no dumbbell chart**. Don't reach for
one. The expressible forms are `type:'columnrange'` with `data:[[low,high],…]`
for a span per category, grouped bars with a callout carrying the computed
difference, or `barInsightTable`, whose stat column exists precisely so each row
can state its own delta. Compute the number and put it in the text — "+18 pts vs.
plan" — rather than trusting the reader to subtract two bar lengths.

### Annotation instead of recolouring

Recolouring is not the only way to point, and often it is the weaker way. An
annotation says *what* is interesting and *why*; colour only says *that*
something is. Prefer annotation alone when:

- the finding is about **one point or one window**, not a category or a series —
  the intervention pattern above
- the chart is a **scatter or a dense cloud**, where recolouring a few markers
  reads as a new category rather than as a highlight
- **the reason matters more than the magnitude** — "the WMS cutover" tells the
  reader something an accent colour never could

When you take this route, leave the marks in the neutral default. An accented bar
*and* a callout on that same bar is not twice the emphasis; it is two competing
signals plus a reader wondering what they missed.

### When not to

- **An annotation that restates the axis is noise.** If the callout says "peaked
  in March" above a chart whose highest point is visibly March, it has spent
  attention to tell the reader what they already saw. Say *why* March, or say
  nothing.
- **One emphasis per chart** still holds (the intervention trio being one cue,
  per above). If the annotation is doing the pointing, leave the marks in the
  neutral default.
- **Not every chart has a subject.** When the finding is the overall shape rather
  than a specific moment, no annotation is the correct amount of annotation.
- **A callout is a sentence, not a label.** For per-point values use
  `dataLabels`; callouts are for the ones that need a reason attached.
