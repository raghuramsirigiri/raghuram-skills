# pack-2026-11-dirty.xlsx — answer key

**Never paste this into a test run.** Fully synthetic: invented cost centres, no real
company. Two tabs, `Summary` (first) and `Detail`.

Ground truth the fixture is built on:

| Figure | Value |
| --- | --- |
| Detail cost rows (D5:D13, `TBC` excluded) | **3,206.0** |
| Detail printed cost total (`D14`) | **3,388.0** — typed, 182.0 adrift |
| Detail headcount rows (C5:C13) | 111 (includes the duplicate) |
| Summary cost rows (B5:B7) | 3,206.0 — a real `=SUM`, and it agrees with Detail's *rows* |
| Summary headcount rows (D5:D7) | 111 |
| Summary printed headcount total (`D8`) | **113** — typed, 2 adrift |
| Summary shares (C5:C7) | 0.57 + 0.31 + 0.15 = **1.03** |

Note the subtlety: **`Summary` is right and `Detail`'s printed total is wrong.** A run that
"fixes" the summary to match Detail's 3,388.0 has it backwards.

## The eleven planted defects

| # | Check | Where | What | Expected tier |
| --- | --- | --- | --- | --- |
| 1 | Cross-foot | `Summary!D8` | Typed 113 where D5:D7 sum to 111 | **Blocker** |
| 2 | Shares don't sum | `Summary!C5:C7` | 103% | **Blocker** |
| 3 | Impossible percentage | `Summary!B10` | Capacity utilisation 114% | **Blocker** |
| 4 | Duplicate key | `Detail!A7` and `Detail!A11` | `CC-103` France appears twice, identical 12 / 418.0 / 12000 — double counted in every total | **Blocker** |
| 5 | Error value | `Detail!F9` | `=D9/D17` points at a blank cell → `#DIV/0!` in the share column | **Blocker** |
| 6a | Hardcoded, disagreeing | `Detail!D14` | Typed 3,388.0 where the column sums to 3,206.0 | **Blocker** |
| 7 | Sign error | `Detail!D12` | `CC-107` cost of −96.0 in a positive cost column | **Blocker** |
| 10 | Mixed units | `Detail!D4` vs `Detail!E4` | `Cost (£000s)` beside `Recharge (£)` — 42000 in E5 is £42k, not £42m | **Blocker** |
| 11 | Same figure differs | `Summary!B8` (3,206.0) vs `Detail!D14` (3,388.0) | The pack contradicts itself on its headline cost | **Blocker** |
| 8 | Stale date | `Detail!A2` | "Data as at: 30-Sep-2026" in a November pack | **Embarrassment** |
| 9 | Placeholder | `Detail!D13` | `TBC` in a live cost column — also silently excluded from the `SUM` | **Embarrassment** |
| 6b | Hardcoded, agreeing | `Summary!B11` | Cost per head typed 28.9; 3,206.0 / 111 = 28.88, so it agrees today | **Hygiene** |

Twelve rows, eleven defects — 6a and 6b are the same check at two severities.

## The deliberate non-defect

`Detail!A16` states *"Figures rounded to the nearest £1k; components may not sum exactly."*

**This must not be flagged.** It is a stated convention, and check 12 (displayed rounding
doesn't sum) is explicitly disarmed by it. A run that flags it has failed the refusal table.

Note it does **not** excuse defect 6a: a 182.0 gap on a £3.2m base is three orders of
magnitude past a rounding difference. **A run that waves away the non-reconciling total by
citing the rounding note has failed the most important check in this fixture** — it is the
one way to get the arithmetic wrong while sounding careful.

## What a pass looks like

1. **All ten Blockers found**, each at Blocker tier. Missing 6a or 11 is a hard fail; those
   are the ones that put a wrong number in front of a board.
2. **Verdict line first**, saying plainly it is not safe to send.
3. **6a is a Blocker and 6b is Hygiene.** This is the one computable severity distinction in
   the skill, and getting both right is the test of whether the tier rule was applied rather
   than guessed.
4. **Nothing outside the twelve families.** No "costs look high", no formatting notes, no
   "escalate to Finance", no observation about what couldn't be checked.
5. **The rounding note is not flagged**, and is not used to excuse 6a.
6. **Scope line present**, listing check families.
7. Locators given as cell references throughout.

## Tolerated variance

- Whether the duplicate `CC-103` (4) is described as a duplicate row or as double counting.
- Whether mixed units (10) is one finding or two (the £/£000s pair, and the recharge column's
  magnitude being implausible against cost).
- Whether the `TBC` (9) is Embarrassment or Blocker — it silently drops a row from the total,
  so a run arguing Blocker has a real case. **Either passes if the reasoning is stated.**
- Ordering within a tier.
- Whether defect 11 is reported once or as a line under both tabs.

## Fails

- Flagging the rounding convention.
- Using the rounding convention to excuse the 182.0 gap.
- "Correcting" Summary to agree with Detail's printed total rather than the other way round.
- Any finding outside the twelve families.
- A flat undifferentiated list with no tiers.
- Reporting 6b as a Blocker, or 6a as Hygiene.
