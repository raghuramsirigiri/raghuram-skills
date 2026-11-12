# Charts in a video

A chart in a video is read in two or three seconds, once, at phone size,
while it moves. So it carries one comparison, labels its values directly,
and never shows a false number on the way to the true one.

## Where a chart goes

A value with no thing of its own (a price, a share, a rate, a series) is a
flat chart in the card, under the units, while the stage keeps going above
the footer. A beat holds one figure or one chart, never both.

| The finding is… | In the card |
| --- | --- |
| one figure | `copy.value`: the figure, counted up under its words |
| two to six values in one unit (then and now, eras, sites) | `chart: { kind: "bars" }` |
| change over ordered time, three points or more, evenly spaced | `chart: { kind: "line" }` |

Not in a video: pie and donut, dual axes, 3D charts, a grid of units for a
share, more than one line, more than six bars, scatter plots. A series
whose dates are unevenly spaced (1912, 1934, 1958…) is bars, one per date,
never a line that spaces them evenly. A finding that needs any of these
goes in the handover as left out.

## Rules for motion

- **Bars start at zero** and grow from the baseline. Never start the axis
  higher to make a change look bigger.
- **Data never overshoots.** Bars, lines and counters ease on expo-out or a
  critically damped spring, landing exactly on their value. A bounce past
  the value briefly shows a false number.
- **Counters land on the claim's `display`** and hold at least 1.5 s.
- **A gap is a gap.** A missing month is `null` in `y` and draws as a break
  in the line, never as a zero or a joined-up line.
- **Forecasts look different**: hatched bars, dashed line from
  `forecastFrom`, plus forecast wording in the copy.
- **Direct labels** at the bar's end or the line's end. No legend for one
  series.
- **Show the unit and the period** on screen, in the units line.
- **Emphasis**: the subject in the accent (`emph: true`, or `highlight` on a
  line), the rest muted. One emphasis per chart. A residual "Other" stays
  muted.

## Bars

`kind: "bars"` draws charts-lib's bar-list geometry, compacted to share the
frame with the stage: the label above its bar, the value at the bar's end,
no axis. Labels
are short (three words for a bar, four for a ranked row). Values must be
zero or more. A comparison of negative values is a sentence.

## Lines

`kind: "line"` takes a `data` table with an ordered, evenly spaced x (years
in a run, `Q1…Q4`, a complete run of months), at least three points. The y axis starts at zero when the data's minimum is
under 40% of its maximum; otherwise it starts at a round number below the
minimum, and the tick labels show where. The end value is a claim (`end`),
and the headline usually states it.

## Shares

A share is a figure (`copy.value`) or two bars of the same whole. Never a
grid of boxes or dots, on the stage or in the card: there is nothing to
count.
