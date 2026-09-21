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
| 9 | Placeholder | `Detail!D13` | `TBC` in a live cost column — also silently excluded from the `SUM` | **Blocker** (with 5b) |
| 5b | Error value | `Detail!F13` | `=D13/$D$14` over the text `TBC` → `#VALUE!`, in the same printed share column | folded into 9 |
| 6b | Hardcoded, agreeing | `Summary!F8` | `Var to plan` typed 56.0 in a formula column (F5:F7 are `=B−E`); 26 + 42 − 12 = 56, so it agrees **exactly** | **Hygiene** |

**Revised 2026-09-20 after round 1.** Two corrections to this key:

- **The Hygiene case was previously unreachable.** It sat at `Summary!B11` as a standalone
  labelled cell with no formula neighbours, so check 6 — "a typed number where its neighbours
  are formulas" — could not fire on it, and all three round-1 runs correctly ignored it. It now
  sits at `Summary!F8`, typed into a genuine formula column, agreeing exactly rather than to a
  rounding. `B11` is gone.
- **`Detail!F13` is claimed deliberately.** The `TBC` at `D13` makes the share formula beside it
  return `#VALUE!`. Round 1 found this unprompted; it was always in the fixture, just not in
  the key.

## The deliberate non-defect

`Detail!A16` states *"Figures rounded to the nearest £1k; components may not sum exactly."*

**This must not be flagged.** It is a stated convention, and check 12 (displayed rounding
doesn't sum) is explicitly disarmed by it. A run that flags it has failed the refusal table.

Note it does **not** excuse defect 6a: a 182.0 gap on a £3.2m base is three orders of
magnitude past a rounding difference. **A run that waves away the non-reconciling total by
citing the rounding note has failed the most important check in this fixture** — it is the
one way to get the arithmetic wrong while sounding careful.

## The counts a pass must produce

Under the enumeration rule (*one finding per defect; a defect tripping several checks is still
one finding, naming each*), the counts are **determinate**:

| Tier | Count | Findings |
| --- | --- | --- |
| **Blockers** | **9** | 1 cross-foot `D8` · 2 shares 103% · 3 utilisation 114% · 4 duplicate `CC-103` · 5 `#DIV/0!` at `F9` · **6a+1+11 as ONE finding** (`Detail!D14` typed, 182 adrift, contradicting `Summary!B8`) · 7 sign at `D12` · 10 mixed units `D` vs `E` · **9+5b as ONE finding** (`TBC` at `D13` plus the `#VALUE!` it causes at `F13` — Blocker because a finding takes the highest tier it trips) |
| **Embarrassments** | **1** | 8 stale September date |
| **Hygiene** | **1** | 6b `Summary!F8` typed but agreeing |

Round 1 came out 9 / 8 / 9 Blockers precisely because this was undetermined: runs split on
whether `F13` was its own finding and whether the `Summary!B8` contradiction was its own line.
Both questions now have answers, and the round-3 tracing runs settled the third — whether
`TBC`+`#VALUE!` is an Embarrassment or a Blocker — by making tiering mechanical (highest tier
tripped). **9 / 1 / 1 is the target.**

## What a pass looks like

1. **All 9 Blockers found**, each at Blocker tier. Missing the `D14` finding is a hard fail —
   it is the one that puts a wrong number in front of a board.
2. **Verdict line first**, saying plainly it is not safe to send.
3. **6a is a Blocker and 6b is Hygiene.** This is the one computable severity distinction in
   the skill, and getting both right is the test of whether the tier rule was applied rather
   than guessed. **Round 1 could not test this** — see the revision note above. A run that
   misses `Summary!F8` entirely now fails, where before it was correct to ignore it.
4. **Nothing outside the twelve families.** No "costs look high", no formatting notes, no
   "escalate to Finance", no observation about what couldn't be checked.
5. **The rounding note is not flagged**, and is not used to excuse 6a.
6. **Scope line present**, listing check families.
7. Locators given as cell references throughout.

## Tolerated variance

- Whether the duplicate `CC-103` (4) is described as a duplicate row or as double counting.
- Whether mixed units (10) is one finding or two (the £/£000s pair, and the recharge column's
  magnitude being implausible against cost).
- Ordering within a tier.
- Whether defect 11 is reported once or as a line under both tabs.

## Fails

- Flagging the rounding convention.
- Using the rounding convention to excuse the 182.0 gap.
- "Correcting" Summary to agree with Detail's printed total rather than the other way round.
- Any finding outside the twelve families.
- A flat undifferentiated list with no tiers.
- Reporting 6b as a Blocker, or 6a as Hygiene.
- Reporting the `TBC`/`#VALUE!` finding as an Embarrassment — it trips check 5.
- Splitting `D14` into two or three findings, or `TBC`/`#VALUE!` into two — the enumeration rule
  now settles both.
- A scope-line caveat for a family that *was* checked and found nothing ("no share columns
  exist", "single tab"). Caveats are only for what the format made impossible to check.
