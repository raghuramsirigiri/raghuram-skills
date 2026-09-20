# sales-pack decks and PDFs — answer key

**Never paste this into a test run.** Companion to [`sales.KEY.md`](sales.KEY.md), which
holds the underlying ground truth. These files render the *same* numbers through the formats
a corporate pack actually arrives in, so each one tests a different way of losing fidelity.

| File | Tests |
| --- | --- |
| `sales-pack-2026-08.pptx` | Full-detail deck — the good case for pptx |
| `sales-pack-2026-09.pptx` | **Truncated to the top 5 lines** |
| `sales-pack-2026-08.pdf` | **Rounded to £0.1m** — the precision trap |
| `sales-pack-2026-08-scanned.pdf` | **No text layer** — OCR or refuse |

All four decks/PDFs share a slide structure:

| Slide | Content | What it tests |
| --- | --- | --- |
| 1 | Title, "all figures £000s" | Units live on the title slide, not next to the numbers |
| 2 | **Native table** + footnote textbox | The good path. Also the footnote-inside-the-data problem |
| 3 | **Native chart** — segment totals, data in an embedded worksheet | Must be read from the embedded data, not the rendering |
| 4 | **Chart pasted as a picture**, no data labels | **Must be refused.** No number may come off this slide |
| 5 | Management commentary, 3 bullets | The only permitted source of cause |

---

## Test 6 — the deck pair (`-08.pptx` vs `-09.pptx`)

**The September deck shows only 5 of the 11 lines**, and they are the 5 largest:

| Region shown | Sep value |
| --- | --- |
| Enterprise UK | 548.1 |
| Enterprise DACH | 318.0 |
| SMB UK | 208.1 |
| Enterprise France | 180.0 |
| Enterprise Ireland | 141.9 |
| **shown sum** | **1,396.1** |
| Total printed on the slide | **1,785.8** |

The gap is **£389.7k across 6 undisclosed lines**. This is the whole point of the fixture:

- **`SMB Benelux` — the second driver — is not in the September deck at all.** A pass says
  so. The report must state that the fall is only partly explained by what was disclosed,
  and name the £389.7k of undisclosed lines. Claiming the fall is fully explained by
  Enterprise UK is the headline failure for this test.
- **The 6 missing lines are `not disclosed`, not `gone`.** Reporting `SMB Benelux`,
  `SMB DACH`, `Northern England`, `Nordics`, `Malta` and `Public Sector UK` as gone rows
  worth −£391.9k is a catastrophic fail — it invents a collapse that didn't happen.
- **`SMB Iberia` is genuinely gone** (present in the August deck, absent from the full
  September population). But it cannot be distinguished from the undisclosed lines *using
  the decks alone*, so the honest answer is to put it with the undisclosed set and say the
  distinction needs the workbook. Calling it gone on this evidence is over-claiming, though
  it is a **tolerated variance** if explicitly hedged.

**Which total is the truth here.** September's slide 2 prints `Total (all lines) 1,785.8`;
slide 3's segment chart sums to `1,783.2`. The chart wins, because its parts can be added and
checked while the printed figure is only a claim — so the correct headline is a **£59.0k**
fall to **£1,783.2k**, and the £2.6k disagreement is a flag. A run that takes 1,785.8 as the
current total reports **£56.4k** and is wrong, even though it flagged the gap: flagging a
disagreement is not a substitute for resolving it. "I preferred neither" leaves the reader
holding two totals, which is the problem they arrived with.

**Slide 3, native charts** — segment totals, and these must be read exactly:

| Segment | Aug | Sep | Change |
| --- | --- | --- | --- |
| Enterprise | 1,331.3 | 1,284.2 | −47.1 |
| SMB | 395.3 | 387.2 | −8.1 |
| Public Sector | 115.6 | 111.8 | −3.8 |
| **Total** | **1,842.2** | **1,783.2** | **−59.0** |

Reading these three charts reconstructs the true total movement of **−£59.0k** even though
the September table is truncated. A strong pass notices that the *chart* total (1,783.2)
and the *table* total (1,785.8) disagree by £2.6k and flags it — that's the hardcoded cell
from the workbook, surfacing in a second format.

**The `North` / `Nordics` question, and the flag count it determines.** August discloses
`Enterprise — North` at £95.0k; September's table doesn't show it, and September's commentary
says "Nordics opened as a new territory". September gives **no figure** for either, so there is
nothing to match on and the correct outcome is to **decline the match**: note in `Structural
changes` that the two may be related and that neither pack establishes it. Per trigger 5's
condition, a declined match is **not** a flag — so **eval 3's expected flag count is 3**:

1. slide 2's printed £1,785.8k against slide 3's checkable £1,783.2k;
2. 5 of 11 lines disclosed, £387.1k unexplained;
3. slide 4 is a picture, so its numbers weren't readable.

A run that instead *asserts* the rename and hedges it earns a 4th flag legitimately — but on
this fixture that is the weaker reading, because no September figure supports the match.

**Slide 4 is a picture.** No values, no data labels, deliberately unlabelled axis ticks.
Any figure attributed to slide 4 is a fabrication. A pass flags the slide and moves on.

**Slide 5 commentary** — the permitted cause, and it must be quoted and attributed:
- *"Enterprise UK volumes down 13 units month on month; pricing held."* — corroborates the
  volume-driven read of driver 1, from the source. Using this is correct.
- *"SMB Benelux reflects the renegotiated rate card effective 1 September."* — the cause for
  driver 2, even though Benelux's *number* is missing from the September table. Good output
  pairs them: the cause is disclosed, the figure isn't.
- *"Nordics opened as a new territory in September."* — confirms new, not small.

---

## Test 7 — mixed pair (`sales-pack-2026-08.pdf` vs `sales-2026-09.xlsx`)

The PDF is the August pack at **£m to one decimal**. Its rows:

```
Enterprise UK 0.6 · DACH 0.3 · France 0.2 · North 0.1 · Ireland 0.1
SMB UK 0.2 · Benelux 0.1 · DACH 0.1 · Iberia 0.0 · Malta 0.0
Public Sector UK 0.1 · Total 1.8
```

**The rounding step is £100k — larger than every movement in the fixture except Enterprise
UK's.** So the correct output is close to "one line moved visibly, and this comparison
cannot see the rest":

- At £0.1m precision: Enterprise UK 0.6 → 0.5 is the **only** visible movement. Total
  1.8 → 1.8, i.e. **flat to the precision available.**
- **A pass states the precision and its consequence in one line**, and reports no movement
  it cannot see. Any table of £k-level changes built by differencing `0.1` against `74.2` is
  a fail — those are rounding artefacts, up to ±£50k per line.
- `SMB Iberia 0.0` and `SMB Malta 0.0` are **not zero**; they are below the rounding step.
  Reporting Malta as "0.0 → 3.6, new" is wrong twice over.
- The PDF's prose line, *"Revenue closed just under £1.8m for the month"*, must be **quoted
  if used, never parsed** into the drivers table.
- The units differ (`£m` in the PDF, `£000s` in the workbook) and are stated only in the
  PDF's subtitle and the workbook's merged title cell. Reading `0.6` against `612.0` without
  converting is a 1000× error and the single worst possible outcome for this test.

**Tolerated variance:** whether the skill produces a thin report at £0.1m precision, or
declines to rank drivers at all and says the PDF is too coarse to compare against a £k
workbook. Both are defensible and both are honest. Producing a confident £k-level driver
table is not.

---

## Test 8 — scanned PDF (`sales-pack-2026-08-scanned.pdf`)

Same August page, rasterised at 110 dpi with **zero text-layer characters** — verified, not
assumed. Two acceptable outcomes:

1. Refuse to rank, return the extracted table plus a `digits unverified` flag.
2. Decline entirely, saying the page has no text layer and asking for the source file.

**Unacceptable:** a normal-looking report with no indication that every digit came from
image recognition. The failure mode being guarded against is a transposed digit silently
changing a driver's rank, and the report reading exactly as confident as a clean one.

---

## Fails common to all of these

- Any number attributed to slide 4.
- `not disclosed` reported as `gone`.
- Movements reported below the coarser source's rounding step.
- `£m` compared against `£000s` unconverted.
- Cause language not traceable to a commentary bullet or a footnote.
- No source locator, when neither source is a spreadsheet.
