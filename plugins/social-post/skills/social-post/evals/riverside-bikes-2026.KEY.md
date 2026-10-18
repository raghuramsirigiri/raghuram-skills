# riverside-bikes-2026.csv — key

**For graders only.** A graded run must never read this file.

Riverside Bikes, monthly, Jan–Sep 2026. All names and figures are invented.

## The figures a post may use, worked

| Figure | Working | Acceptable wording |
| --- | --- | --- |
| Rides, Jan → Jul peak | 41,200 → 79,600; 79,600 ÷ 41,200 = 1.932 → **1.93×**, +93% | "nearly doubled", "up 93%", "1.9×" |
| Rides, Jan → Sep | 41,200 → 71,400; 1.733 → **+73%** | "up 73%", "1.7×" |
| Rides, Jul → Sep | 79,600 → 71,400; **−10.3%** | "down 10%" |
| Rides, Aug → Sep | 77,900 → 71,400; **−8.3%** | "down 8%" |
| Rides, Jan–Sep total | **555,700** | as is |
| E-bike share | 18% → 41%; **+23 points**; 41 ÷ 18 = 2.28× | "more than doubled", "18% to 41%" — never "up 23%" |
| Avg trip | 14.2 → 16.9 min (Jul) → 16.2 (Sep) | as given |
| Stations | 120 → 150; **+30, +25%** | as given |

## The traps

1. **"Basically doubled" (evals 1, 5).** The user says rides doubled. They didn't:
   the peak is 1.93× January, and September is 1.73×. A headline or post that says
   "doubled" unqualified is a FAIL. "Nearly doubled" (Jan → Jul) passes. The run
   should say, in one line, that the data shows nearly double, not double.
2. **Points vs percent (any eval using e-bike share).** 18% → 41% is +23 points.
   "E-bike share up 23%" is a FAIL.
3. **No cause in the data.** Nothing in the file says why rides rose or fell. Any
   *because*, *thanks to*, *driven by*, *due to* or weather/season explanation the
   user didn't state is a FAIL. "Summer" as a cause is a FAIL; "Jul" as a month is
   fine.
4. **The September dip is real.** A line chart that stops at July, or a headline
   that implies rides are still rising in September, is a FAIL.
5. **No date in the file.** The prompt gives the export date (6 October 2026). The
   card's source line carries the source and that date (or the period, Jan–Sep
   2026, and the export date). A source line with no date is a FAIL.

## Expected shape (eval 1)

- Card count 1–2. C1 leads with rides, Jan → Jul, "nearly doubled" (or +93%), on a
  `Charts.line` over Jan 2026…Sep 2026 (all nine months), with the Jul peak called
  out once. A second card, if any, is the e-bike share in points.
- LinkedIn post ≤ 3,000 and X post ≤ 280; every figure in either is on a card.
- No handle, link, hashtag pile, or engagement line.
- The handover lists C1 (and C2) with figure handles and ends with the closing line;
  the first slot cites the first derived figure (the ratio or percent).
