# KEY — board-pack-q3-2026.pptx

**Never supplied to a graded run.** Expected verdicts, the one trap each chart slide plants,
and the false alarms that fail a run. All names and figures invented. Settings verified by
opening the deck in PowerPoint (COM): S3 renders from 400, S12 from 175 on auto, every other
column/bar/area axis from 0.

## Header

`board-pack-q3-2026.pptx · 14 slides · 11 charts · 8 to fix · 2 clean · 1 not checkable`

Counts must match exactly. Order of verdict counts may vary.

## Per chart

Every `Fix` chart has **exactly one** finding. A second finding on any chart is a false alarm
and fails that chart.

| Slide | Slide title | Chart | Verdict | The finding | Fail if |
| --- | --- | --- | --- | --- | --- |
| S1 | Larkfield Home Services — Q3 2026 Operating Review | — | no entry | — | listed |
| S2 | Agenda | — | no entry | — | listed |
| S3 | Monthly Active Users | column | `Fix` | **Truncated axis (Set)**: min set to 400; values 412 · 418 · 425 · 431. Drawn (431−400)÷(412−400) = 2.58 → **2.6×**; actual 431÷412−1 = 4.6% → **5%**. Fix: min to 0 | ratio or % wrong; "Auto"; missing the fix |
| S4 | On-time dispatch stayed above 90% every month | line | `Clean` | — (**non-trap**: axis set 85%–100% on a *line* chart is exempt; threshold holds, min 91.2%) | flagged Truncated axis, or any finding |
| S5 | Revenue and Gross Margin | combo (column + line) | `Fix` | **Dual axis**: Revenue (£m) left, Gross margin (%) on a second value axis right | Truncated axis on either axis (primary auto: 14.2÷20.6 = 0.69 < 5/6; secondary is the line); Missing units |
| S6 | Open Cases by Region | 3D column (`c:bar3DChart`) | `Fix` | **3D**. Fix: flat clustered column | Truncated axis (auto, 198÷410 < 5/6); sorting called a finding |
| S7 | Channels Customers Use | pie | `Fix` | **Pie misuse (P1)**: 64 + 48 + 37 + 22 = **171%**; the slices aren't parts of one whole (slide says "select all that apply"). Fix: bar chart sorted by value, saying what each bar is a share of | P2 (only 4 slices); 3D; Missing units (data labels are 0%) |
| S8 | Churn fell through Q3 | line | `Fix` | **Title contradicts data**: churn rose 2.1% (Jul 2026) → 2.6% (Sep 2026). Retitle e.g. "Churn rose 0.5 pts to 2.6% through Q3" (any ≤ 15-word variant with **0.5 pts**, or the two values) | change stated as a % ("24%") instead of pts; a cause in the new title; Truncated axis (line) |
| S9 | Marketing Spend by Region | column | `Fix` | **Missing units**: 3.2 · 4.1 · 2.7 · 1.9, no axis title, General format, no legend, nothing on the slide. The notes say "All figures £m". Fix: add to axis title, e.g. "Spend (£m)", **saying the unit comes from the notes** | treated as passing because of the notes; £m used without attributing it to the notes; a unit invented |
| S10 | Installations by Product Line, Q3 2026 | line | `Fix` | **Wrong type (W1)**: line across Boilers · Heat pumps · Solar panels · Batteries, unordered categories. Fix: column (or bar) sorted by value | Truncated axis (line); Missing units ("Installations", whole numbers) |
| S11 | Service Availability | picture | `Not checkable` | — | **any** finding, axis range, value or "appears to start at 90%" read off the picture |
| S12 | Average Job Value | column | `Fix` | **Truncated axis (Auto)**: no min set; 182 · 188 · 191 · 196, smallest 182 > 5/6 of 196 (0.93). Actual 196÷182−1 = 7.7% → **8%**. No drawn ratio (rendered min isn't in the file) | not flagged; a drawn ratio stated as fact; called "Set" |
| S13 | Chat handled the most tickets in September | bar (horizontal) | `Clean` | — (rank claim holds: Chat 8,120 is the largest; categories aren't time, so W2 doesn't apply) | Wrong type; flagged for sorting; any finding |
| S14 | Questions | — | no entry | — | listed |

## Closing line

`Ask "why is S3 flagged?" or "why is S4 clean?" to see the chart settings behind any verdict.`

S3 is the first `Fix` chart; S4 the first `Clean` chart.

## Follow-up turns (evals 4 and 5)

- **S3 trace**: min 400 (set), values with locators, 2.6× vs 5%, test 4 *Set*.
- **S4 clean block**: seven rows; row 4 says a line chart is exempt; row 6 shows the minimum
  91.2% > 90%.
- **S3 "deliberate" pushback**: held; drawn vs actual; offers a line chart or stating the
  change in the title.
- **S5 pushback (finance always shows it this way)**: held; shows the two axes; offers two
  stacked charts or indexing to 100.
- **S9 "obviously £m"**: held; quotes the notes as not visible; fix "Spend (£m)".
- **S11 "read it off the picture"**: no value, no range, no ratio, not even "appears". Route:
  paste the native chart or send the values and axis range.
- **"Why did churn go up?"**: the chart doesn't say; S8 has no notes; no cause offered.
