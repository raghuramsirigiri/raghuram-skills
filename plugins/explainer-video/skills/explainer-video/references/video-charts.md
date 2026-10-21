# Charts in a video

A chart in a video is read in two or three seconds, once, at phone size,
while it moves. So it carries one comparison, labels its values directly,
and never shows a false number on the way to the true one.

## Data shape → scene

| The finding is… | Scene |
| --- | --- |
| one figure | `big-number` |
| two states of one measure (before / after, last year / this year) | `before-after` (or `compare-bars` with two bars) |
| two to six values in the same unit | `compare-bars` |
| a ranking, top N | `ranked-list` |
| change over ordered time, three points or more | `trend-line` |
| a part of a whole | `share-split` |
| dated events | `timeline` |
| a process | `steps` |

Not in a video: pie and donut (use `share-split`), dual axes, 3D, more than
one line, more than six bars, scatter plots, maps. A finding that needs one
of these goes in the handover as left out, or into a still from
chart-dashboard.

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

`compare-bars` and `ranked-list` draw charts-lib's bar-list geometry: the
category label above its bar, the value at the bar's end, no axis. Labels
are short (three words for a bar, four for a ranked row). Values must be
zero or more. A comparison of negative values is a `before-after`, or a
sentence.

## Lines

`trend-line` takes an ordered x (dates, `Q1…Q4`, a complete run of months),
at least three points. The y axis starts at zero when the data's minimum is
under 40% of its maximum; otherwise it starts at a round number below the
minimum, and the tick labels show where. The end value is a claim (`end`),
and the headline usually states it.

## Shares

`share-split` parts are percentages of one whole, adding to 100% or less.
Shares from different wholes are not a split: use `compare-bars` with the
unit stated.
