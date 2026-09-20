# sales-2026-08 / sales-2026-09 — answer key

**Never paste this into a test run.** Grade against it afterwards. The fixtures are fully
synthetic — invented segments, no real company.

Both files: `Revenue` tab (the one under test) and `Services` tab (deliberately boring).
Shape awkwardness planted on the `Revenue` tab: merged title in `A1:F1`, blank row 2,
header on row 3, empty spacer column `C`, footnote text sitting in `A15` inside the data
block, total on row 16.

## Ground truth

Total revenue **£1,842.2k → £1,783.2k**, a fall of **£59.0k (−3.20%)**.
That is the sum of the rows. The September file's own printed total is **£1,785.8k** — see
flag 1.

5% absolute gate = £2.95k. 20%/1% relative gate as per `references/materiality.md`.

| Row (Aug → Sep) | Prior | Current | Change | % of move | Own move | Share | Gate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Enterprise UK | 612.0 | 548.1 | −63.9 | +108% | −10.4% | 30.7% | **YES** |
| Enterprise DACH | 301.5 | 318.0 | +16.5 | −28% | +5.5% | 17.8% | **YES** |
| Enterprise France | 180.0 | 180.0 | 0.0 | 0% | 0.0% | 10.1% | no |
| Enterprise North → Northern England | 95.0 | 96.2 | +1.2 | −2% | +1.3% | 5.4% | no |
| Enterprise Ireland | 142.8 | 141.9 | −0.9 | +1.5% | −0.6% | 8.0% | no |
| SMB UK | 210.4 | 208.1 | −2.3 | +3.9% | −1.1% | 11.7% | no |
| SMB Benelux | 88.4 | 74.2 | −14.2 | +24% | −16.1% | 4.2% | **YES** |
| SMB DACH | 76.9 | 79.3 | +2.4 | −4.1% | +3.1% | 4.4% | no |
| SMB Iberia | 18.4 | — | −18.4 | +31% | n/a | — | **YES** (gone) |
| SMB Nordics | — | 22.0 | +22.0 | −37% | n/a | 1.2% | **YES** (new) |
| SMB Malta | 1.2 | 3.6 | +2.4 | −4.1% | **+200%** | 0.2% | **no** |
| Public Sector UK | 115.6 | 111.8 | −3.8 | +6.4% | −3.3% | 6.3% | **YES** |

Six rows clear a gate. `all other movements` = the six that don't, netting **+2.8**.
Driver changes (−63.9 +16.5 −14.2 −18.4 +22.0 −3.8 = −61.8) plus +2.8 = **−59.0** ✓.

## The eight planted things, and what a pass looks like

1. **Driver 1 — Enterprise UK, volume-driven.** 120 → 107 units (−10.8%) at a flat unit
   value (£5.100 → £5.122, +0.4%). **£63.9k of fall — more than the entire net fall.** A
   strong pass says so: UK alone over-explains the total, and DACH + Nordics offset it.
   Calling the split "units, not price" is the rate/volume decomposition working.
2. **Driver 2 — SMB Benelux, price-driven.** Units flat at 40; unit value £2.210 → £1.855
   (−16.1%). The mirror image of driver 1, and the sheet's own `Note` column gives the
   cause: *"Renegotiated rate card effective 1 Sep"*. This is the **only** place causal
   language is permitted, and it must be attributed to the sheet.
3. **New row — SMB Nordics**, £22.0k, no August comparative. Belongs in `Structural
   changes`. **No growth rate may be printed for it** — no `+∞`, no `n/a%`. A
   `% of total move` figure (−37%) is correct and expected: it is the share of the *total*
   change, which is well defined, and the drivers table won't reconcile without it.
   Its `Note` says "New territory".
4. **Gone row — SMB Iberia**, £18.4k in August, absent in September. Also structural, same
   rule: no growth rate, `% of total move` (+31%) fine. Fair to note it may have been
   absorbed elsewhere — but only as a possibility, never as a finding.
5. **Rename — Enterprise `North` → `Northern England`.** Same position (row 7), same units
   (18), value 95.0 → 96.2. Must be reported as **a rename**, not as one row gone plus one
   row new. Reporting it as −95.0 and +96.2 is a fail; it would also add £191k of phantom
   movement.
6. **Non-reconciling total.** `Revenue!E16` in the September file is a typed-over
   **1785.8**, not a `SUM`. The rows sum to **1,783.2**; £2.6k is unaccounted. A pass
   reports the row sum as the truth, flags the £2.6k, and names `E16` as hardcoded.
   (August's `E16` is a genuine `=SUM(E4:E14)` — the contrast is the tell.)
7. **Stale tab — `Services`.** `A2` reads "Data as of: 31-Jul-2026" in **both** files, with
   identical figures. A pass flags it as likely stale rather than reporting it as unchanged.
8. **The trap — SMB Malta, +200%.** £1.2k → £3.6k. Clears the relative gate's 20% but
   fails its 1%-of-total condition, and its £2.4k is under the 5% absolute gate. It must
   **not** appear in the drivers table and must **not** lead the report. Any version that
   headlines "Malta up 200%" has failed the one check that matters.

## Fails

- Any cause not traceable to the `Note` column. "Softness in EMEA", "seasonal", "pipeline
  slipped" — all invented, all fail, however plausible.
- A percentage on Nordics, Iberia, or the £0.0 France row.
- Repeating 1,785.8 as the total without flagging it.
- Malta anywhere in the drivers table.
- Reporting the rename as a gone + a new row.
- A methodology paragraph, or an offer to chart it.

## Tolerated variance

- Whether `Public Sector UK` (−3.8, 6.4% of the move) is called a driver or folded into
  `all other movements` with a note — it clears the gate by 1.4 percentage points, so
  either reading is defensible as long as the arithmetic still closes.
- Whether the new/gone rows appear in the drivers table *as well as* `Structural changes`.
  Both pass. They may carry `% of total move`; they may not carry a growth rate.
- Flag **count**, but not flag **content**: the £2.6k gap and `E16` are two separate triggers
  and must be two separate lines, so a run merging them into one is wrong even though it
  states the same facts. Expect 3 flags: gap, `E16`, stale `Services`.
- Rounding to one decimal or to whole £k.
- Whether `Services` staleness is a flag or a line in structural changes. It must appear
  somewhere.
