# The checks

How `chart-honesty` reads a chart, runs its seven tests, and words each finding and fix.
Every test returns yes or no from settings and values in the file. "This chart feels
misleading" drifts from run to run; these don't.

All examples use invented names and figures.

---

## 1. Reading the deck

### What counts

| Element | Used for | Locator |
| --- | --- | --- |
| **Native chart**: plot type, series values, categories, series names | every test | `S4 · chart series "Parcels" · Mar 2026 = 57` |
| Chart XML settings: value-axis `min`/`max`, number formats, axis titles, second value axis, 3D elements, legend, data labels, chart title | the axis, 3D, dual-axis and units tests | `S4 · chart · value axis min = 50 (set)` |
| Slide title, text boxes and table text on the same slide | title and units tests | `S4 · slide title "…"`, `S4 · text "…"` |
| Speaker notes | **never counted as visible.** Quote them in a fix or a trace, marked as notes | `S4 · notes` |
| **A picture of a chart** (PNG, JPG, EMF, SVG, screenshot) | **nothing.** It has no values and no axis settings. Never estimate bar heights, line positions, slice sizes or axis labels from pixels. Verdict `Not checkable` | `S4 · picture` |
| Another slide | nothing: each chart is reviewed as it stands on its own slide | — |

A picture counts as a chart when it visibly is one. Other pictures (logos, photos) are
ignored. Tables are not charts.

### Getting the settings out

Read the chart XML itself. Axis settings, 3D types and secondary axes live there, and most
libraries don't surface all of them. With `python-pptx`:

```python
from pptx import Presentation
from lxml import etree
p = Presentation(path)
for n, s in enumerate(p.slides, 1):
    for sh in s.shapes:                       # recurse into sh.shapes when sh.shape_type is GROUP
        if sh.has_chart:
            xml = etree.fromstring(sh.chart_part.blob)   # the chart's own XML
        elif sh.shape_type == 13:             # PICTURE
            ...
```

Failing that, a `.pptx` is a zip. Charts are `ppt/charts/chartN.xml`, reached from
`ppt/slides/_rels/slideN.xml.rels`. Slide order comes from `ppt/presentation.xml`, not from the
file numbers. `python-pptx`'s `chart.plots` doesn't know every 3D type, so read the XML when it
fails.

What to read (namespace `c:` = drawingml/2006/chart):

| Setting | Where |
| --- | --- |
| Plot type | the element under `c:plotArea`: `c:barChart` (`c:barDir` `col` = column, `bar` = horizontal bar), `c:lineChart`, `c:areaChart`, `c:pieChart`, `c:doughnutChart`, `c:ofPieChart`, `c:scatterChart`, `c:radarChart`, `c:bubbleChart`; 3D: `c:bar3DChart`, `c:line3DChart`, `c:area3DChart`, `c:pie3DChart`, `c:surface3DChart`, or `c:bubble3D val="1"`. Two plot elements = a combo chart |
| Values, categories, names | `c:ser/c:val//c:v`, `c:ser/c:cat//c:v`, `c:ser/c:tx//c:v`; stored format `c:formatCode` |
| Axis minimum / maximum | `c:valAx/c:scaling/c:min`, `c:max`. **Absent = auto** |
| Value axes in use | each plot's `c:axId` values → the `c:valAx` with that `c:axId`. Count the distinct `c:valAx` referenced, **whether or not `c:delete` hides one** |
| Axis title, tick format | `c:valAx/c:title`, `c:valAx/c:numFmt/@formatCode` |
| Data labels | `c:dLbls` with `c:showVal val="1"`, and its `c:numFmt` |
| Legend | `c:legend` present |
| Chart title | `c:chart/c:title`. With no `c:title`, `c:autoTitleDeleted` not `1`, and one series, PowerPoint shows the series name as the title |

### Handles

`S<n>` is the slide number, in deck order. Two or more charts on one slide are `S<n>a`,
`S<n>b`… in reading order (top to bottom, then left to right). Chart-free slides get no entry.

### Described charts

When the user describes a chart in chat instead of sending the file, each test runs on what
the description states:

- Units, titles and axis ranges the user gives count as shown on the chart, unless the user
  says they aren't.
- **A second value axis and 3D count as absent unless stated.** People mention them when
  they're there.
- A test whose input isn't stated doesn't run. It goes on a `Not stated:` line under that
  chart, naming the missing input (*"axis range"*, *"title"*). The axis test needs an axis
  range only for column, bar and area charts.

## 2. The verdict for each chart: a closed set of three

| Verdict | When |
| --- | --- |
| `Not checkable` | The chart is a picture, or it has no values (an empty or broken chart). No finding is raised on it, however it looks. |
| `Fix` | One or more of the seven tests below trips. |
| `Clean` | No test trips. |

## 3. The seven tests, in this order

Run every test on every native chart. A chart can trip several; list them in this order.

### 1 · Wrong type

Trips when either holds:

- **W1:** a **line or area** chart whose categories have **no order**. Ordered categories are
  dates and periods (`Mar 2026`, `Q2`, `FY25`), numbers, and numeric ranges (`0–9`, `10–19`).
  Anything else (names of regions, products, teams, channels) is unordered, and a line
  across it implies a trend between things that have no sequence.
- **W2:** a **horizontal bar** chart whose categories are dates or periods. Time reads left
  to right.

*Fix:* W1: *"Use a column chart (a bar chart if the labels are long), sorted by value."*
W2: *"Use a column or line chart with time running left to right."*

### 2 · Pie misuse

Applies to pie, doughnut and pie-of-pie charts. Trips when any holds:

- **P1: the slices aren't parts of one whole.** Percentages that sum to less than 99% or
  more than 101%; or values that don't sum to a total shown on the slide (outside rounding
  in its last digit).
- **P2: more than six slices.**
- **P3: the categories are dates or periods.** That is a trend, not a split.
- **P4: a negative value.**

*Fix:* P1: *"Use a bar chart sorted by value, and say what each bar is a share of."* P2:
*"Use a bar chart sorted by value."* P3: *"Use a column or line chart with time running left
to right."* P4: *"Use a bar chart with a zero line."*

### 3 · 3D

Trips on any 3D plot element (`c:bar3DChart`, `c:line3DChart`, `c:area3DChart`,
`c:pie3DChart`, `c:surface3DChart`) or `c:bubble3D val="1"`. Perspective puts the tops of
bars off the gridlines and makes near slices look bigger than far ones. There are no
exceptions.

*Fix:* *"Change to the flat version of the same chart (Change Chart Type → <2D type>)."*

### 4 · Truncated axis

Applies only to **length-encoded** charts: column, bar and area, including their 3D and
stacked forms. **Line and scatter charts are exempt**, because they encode by position, not
length, and a non-zero axis there is normal. Trips when any holds:

- **Set:** the value-axis `min` is set above 0 and every value is ≥ 0.
- **Auto:** no `min` is set, every value is > 0, and the **smallest value is more than 5/6 of
  the largest**. On auto, PowerPoint then starts the axis above zero.
- **Clipped:** the value-axis `max` is set **below** the largest value, so the top of at
  least one bar is cut off.

For stacked charts, "values" means the bottom segments (for the smallest) and the stack
totals (for the largest).

**The effect, stated in the finding:**
- *Set:* **drawn ratio** = (largest − min) ÷ (smallest − min), to one decimal, against the
  **actual difference** = largest ÷ smallest − 1 as a whole percent (half away from zero), or
  largest − smallest in **pts** when the values are percentages. If the smallest value is at
  or below the min, say *"the shortest bar is cut to nothing"*.
- *Auto:* the rendered minimum isn't stored in the file, so give no drawn ratio. Give the
  smallest and largest, and the actual difference.
- *Clipped:* the max and the largest value.

*Fix:* Set / Auto: *"Set the axis minimum to 0 (Format Axis → Bounds → Minimum). If the
small differences are the point, use a line chart (over time) or a dot plot (across
categories) instead."* Clipped: *"Raise the maximum above <largest value>, or set it back to
auto."*

### 5 · Dual axis

Trips when the plots use **two value axes**: a combo chart with a secondary axis, or two
series on different scales even if one axis is hidden (`c:delete val="1"` hides the labels
but not the rescaling). With two independent scales, where the lines cross and how steep
each one looks are choices, not data. There are no exceptions.

*Fix:* *"Split into two charts, one above the other, sharing the category axis. Or index
both series to 100 at the first period and plot them on one axis."*

### 6 · Title contradicts data

Checks the **slide title** and the **chart title** (if one shows) against the chart's own
values. Only these claim types are checked. A claim that isn't one of them (a cause, a
forecast, anything the chart doesn't plot) is **not** a contradiction and isn't this test's
business.

| Claim in the title | Checked against | Contradicted when |
| --- | --- | --- |
| **Direction**: *rose, grew, up, increased, climbed, gained* / *fell, down, declined, dropped, shrank, cut* | the named series (or the only one), from the first to the last category of the period the title names, or of the whole chart if it names none | the values move the other way, or don't move |
| **Flat**: *held, flat, steady, stable, unchanged* | same span | the change is ≥ 5% (≥ 1 pt for percentages) |
| **Figure** attached to the chart's metric: a value, a change, a ratio | the values, or one arithmetic step from them (difference, % change, ratio) | no value or step rounds to it at the title's precision |
| **Ratio word**: *doubled* (1.95–2.05×), *tripled* (2.95–3.05×), *halved* (0.475–0.525×) | same | the ratio falls outside the range |
| **Threshold**: *above / below / over / under X*, with *every*, *all*, *always* or a period | every value in the span | any value breaks it |
| **Rank**: *most, least, highest, lowest, largest, smallest, top, first, last* | all categories | another category holds that rank |

*Fix:* *"Retitle: '<title the data supports>'."* The new title makes the same kind of claim,
corrected. Every figure comes from the chart or one shown step from it; percentages move in
**pts**; whole-number inputs give whole-percent changes; the slide's own metric name; no
cause, no adjective; ≤ 15 words.

### 7 · Missing units

Trips when nothing **visible** says what the values measure. Visible means the value-axis
title, the tick-label or data-label number format, the chart title, the legend (only when
shown), the slide title, or text on the slide. A series name shown nowhere doesn't count,
and neither do notes.

It passes when any of these is visible:

- a unit of measure: a currency symbol or code, `%`, *pts*, time or distance units, with
  the scale (*k*, *m*, *bn*, *thousands*) if the values are scaled;
- **for whole-number values only**, a noun naming what is counted (*parcels, users, cases*);
- a named score or index (*CSAT score*, *index, Jan 2026 = 100*).

Decimal values with only a metric name (*Cost*, *Fees*, *Budget*) fail.

*Fix:* *"Add the unit to the axis title: '<metric> (<unit>)'."* Take the unit **only** from
the file: if the notes or another element that isn't visible give it, say so (*"the notes say
€k"*) and use it. If nothing gives it, write *"the deck doesn't say which unit; add it to the
axis title"*. **Never supply a unit yourself.**

## 4. Wording a finding

One line per finding, under its chart:

```
- <Test> — <what the file shows, with its values>. Fix: <the fix>.
```

- **What the file shows** uses the file's numbers and settings, not adjectives. *"The axis is
  set to start at 50; the tallest bar is drawn 1.9× the shortest for an 11% difference"*,
  never *"the axis is badly truncated"*.
- **The fix** is the test's fixed form above, filled in for this chart. One fix per finding.
- No finding outside the seven: not colours, fonts, sorting, gridlines or chart junk. Those
  may be real, but they aren't this review.

## 5. Examples

| Chart | Verdict | Finding |
| --- | --- | --- |
| Column, "Parcels (thousands)", Jan–Mar 2026 = 57 · 61 · 63, axis min set to 50 | `Fix` | Truncated axis: set to start at 50; the tallest bar is drawn 1.9× the shortest for an 11% difference |
| Line, "Fuel cost per mile (p)", axis 40–70p, title "Fuel cost per mile stayed under 60p all year", every value 51–58p | `Clean` | a line chart's non-zero axis is exempt; the threshold claim holds |
| Column, "Vans on road", Apr–Jun = 212 · 219 · 224, axis auto | `Fix` | Truncated axis: on auto, with 212 more than 5/6 of 224, PowerPoint starts the axis above zero; the values differ by 6% |
| Line across Leeds, Hull, York, Derby depots | `Fix` | Wrong type (W1): categories with no order |
| Pie of 8 depots | `Fix` | Pie misuse (P2): more than six slices |
| 3D pie of 8 depots | `Fix` | Pie misuse (P2), then 3D, in that order |
| Title "Late deliveries halved in Q2", data 4.8% → 3.1% | `Fix` | Title contradicts data: 3.1 ÷ 4.8 = 0.65, outside 0.475–0.525. Retitle: "Late deliveries fell 1.7 pts to 3.1% in Q2" |
| Column, "Leasing cost", 0.8 · 1.3 · 1.1, no unit anywhere, nothing in the notes | `Fix` | Missing units: the deck doesn't say which unit; add it to the axis title |
| Screenshot of a column chart, axis labels visible in the image | `Not checkable` | none: a picture carries no data |

Check against the rules: (63 − 50) ÷ (57 − 50) = 1.86 → 1.9×; 63 ÷ 57 − 1 = 10.5% → 11%.
212 ÷ 224 = 0.946 > 0.833; 224 ÷ 212 − 1 = 5.7% → 6%. 4.8 − 3.1 = 1.7 pts.
