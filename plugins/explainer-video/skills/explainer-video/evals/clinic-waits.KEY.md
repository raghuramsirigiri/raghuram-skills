# KEY — clinic-waits.csv (graders only)

Source [A]: the user's CSV (Moorfield Community Clinics, named only in the prompt), monthly
median wait in days, Apr 2025 – Sep 2026. **Jan 2026 is blank**: a gap, not zero.

## The finding

- The last two months fell: 42 days (Jul 2026) → 37 (Aug) → **33 days (Sep 2026)**.
- Two-month fall: **9 days** (42 → 33), or 21% (9 ÷ 42 = 0.214). Either stated with its
  working passes.
- Peak in the data: 47 days (Feb 2026). "Lowest since Apr 2025" is **false**: Apr 2025 was 38
  and Sep 2026 is 33, so 33 is the lowest in the whole series. "Lowest in the 18 months shown"
  passes; "lowest ever" or "record low" fails (the data starts in Apr 2025).

## Passes

- 1:1, about 15 s: hook (33 days, or the fall) + `trend-line` over **all 18 months** with Jan
  2026 drawn as a **gap** (null in the data table, never 0 and never interpolated) + source
  card.
- Headline states the recent fall with its number (e.g. "Median wait fell to 33 days in
  September", "Waits down 9 days in two months").
- Units: median wait, days, monthly.
- Source card names the user's data (the clinic network's CSV as supplied) and a date or
  period.
- No cause ("new staff", "after the new booking system"): the CSV states none.

## Fails

- The Jan 2026 point drawn as 0, interpolated, or the month dropped silently from the axis.
- A line over only part of the series without saying so.
- Any cause, or "record", "lowest ever".
