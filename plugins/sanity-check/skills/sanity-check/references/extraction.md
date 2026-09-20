# Getting numbers out of a corporate pack

> **This file is duplicated, by design.** Identical copies live in
> `plugins/whats-changed/skills/whats-changed/references/` and
> `plugins/sanity-check/skills/sanity-check/references/`. Plugins in this repo are
> independently installable, so a reference cannot be shared across them by path — an
> installer only ever receives one plugin's tree. **Edit one copy, edit the other.** If a
> third plugin needs this file, that is the signal to promote it to shared infrastructure
> rather than keep copying it.

The reading half of this skill. Read it before analysing anything.

A corporate pack usually reaches the person who needs it as **a deck or a PDF**, not as the
source workbook — the workbook stayed with whoever built it. So extraction is a real step, not a
detail, and some formats are genuinely lower-fidelity than others. Say which; never imply
parity, and never let a format's blindness read as a clean bill of health.

Every example here uses invented numbers unrelated to the eval fixtures.

---

## 1. Fidelity by format

| Format | Read with | Fidelity | What you lose |
| --- | --- | --- | --- |
| `.xlsx` `.xlsm` | the `xlsx` skill | **full** | Nothing. The only format where formulas are visible, so hardcoded cells and broken totals are detectable. |
| `.csv` `.tsv` | direct read | **full** values | No formulas, so no hardcoded-cell flag. |
| `.pptx` `.potx` | the `pptx` skill | table **full** · native chart **full** · picture **none** | A chart pasted as an image carries no numbers at all. |
| `.pdf` | the `pdf` skill | text **good** · table **fair** · scan **poor** | Rounding, column bleed, multi-line row labels split across rows. |
| `.docx` | the `docx` skill | tables **full** | Figures in body prose are quotable, not parseable. |
| pasted text | as given | as given | Whatever the user already lost. The fallback that always works. |

## 2. Reduce everything to one intermediate

Comparison never runs against a file. It runs against this:

```
line label | measure | period | value | units | source locator | precision
```

Build it for both periods first, then compare. A deck, a PDF and a workbook all collapse to
the same seven fields, which is what makes mixed pairs tractable.

**`source locator` is not optional.** The reader cannot eyeball a diff of two PDFs, so every
figure must be traceable to where it was read:

- spreadsheet → `Revenue!E7`
- deck → `slide 6, table row 3` · `slide 3, chart series "Value"`
- PDF → `p.12 Table 4, row "SMB Benelux"`
- doc → `p.2, table 1`

Cite it in the drivers table's `Note`, or as a source line under the table. Omit locators
only when **both** sources are spreadsheets, where they would be noise.

## 3. The four rules that prevent confident nonsense

### Never read a number off a chart image

If a figure exists only as a picture of a bar chart, the value **is not available**.
Estimating a bar's height against an axis is fabrication with a decimal point on it. Say the
slide carries a chart with no underlying data, flag it, move on.

A **native** pptx chart is different: its data lives in an embedded worksheet and should be
read from there, never from the rendering. Check whether a shape is a chart or a picture
before deciding.

If the *headline measure itself* exists only as an image, there is nothing to report — say
that rather than producing a report about the remainder as if it were complete.

### Never OCR silently

A PDF with no text layer needs OCR. Do it if you must, then flag the **entire report**:
`read from a scanned page — digits unverified`. Prefer to return the extracted table plus the
flag and **decline to rank drivers**, because a transposed 6 and 8 silently changes a
driver's rank, and the report otherwise reads exactly as confident as a clean one.

### Compare at the coarser precision

**Precision is a property of the source, and the coarser one wins.** This is the single most
dangerous failure the format widening introduces, because its output looks like arithmetic.

A deck saying `£1.8m` against a workbook saying `£1,783.2k`:

- the rounding step is **£100k**;
- so `£1.8m` means anything from £1,750k to £1,850k;
- so the apparent £16.8k movement is **entirely artefact**;
- so **no movement smaller than £100k is visible in this pair, at all.**

State the precision and its consequence in one line, and report no movement below the step.
A line printed as `0.0` is not zero — it is below the rounding step, and calling it zero or
`new` is wrong twice over.

### Not disclosed is not gone

A deck often shows only the top few lines. If the current source shows 5 rows where the prior
showed 12, the missing 7 are **not disclosed** — they are not gone. Reporting them as gone
rows invents a collapse that never happened.

Detect it by subtracting the sum of shown rows from the period's total. **Which total** matters
here: use the most checkable one available, per `materiality.md`'s ruling — a segment or
subtotal chart you can add up beats the figure printed under the table. Those two often
disagree, and taking the printed one silently changes the headline. Report the remainder
explicitly, and say the ranking only explains what was shown.

## 4. Units live away from the numbers

Read units from wherever they are stated — a slide title, a merged title cell, an axis label,
a column header, a subtitle — not from the figure. `£m`, `£000s`, `£`, `%`, `FTE`, `units`,
`days`.

A mismatch between the two sources is a **stop-and-flag**, not a conversion to perform
quietly. Converting is fine once you have said so; guessing is not.

## 5. Matching labels across formats

Normalise before matching: trim, collapse whitespace, fold case, strip `—`/`-`/`·`
separators and trailing footnote markers.

- `SMB — Benelux` and `SMB Benelux` → the same line.
- `SMB Benelux (excl. NL)` → **not** the same line. A qualifier changes the population.
- Same position, same magnitude, different wording → likely a rename; report it as one, and
  say if confidence is low.
- Can't match at all → say what each source is keyed on and ask. Don't align by row order
  and hope.

## 6. Shape hazards, by format

Never assume a clean shape. Expect, and handle:

**Spreadsheets** — a merged title row above the real header; the header on row 3, not row 1;
a blank spacer column mid-table; footnote text sitting in a data cell (`* excl.
intercompany`); a total row that is a typed number rather than a `SUM`; a second tab that
looks like data and is stale.

**Decks** — the number that matters in a footnote under the chart rather than in it; units
only on the title slide; a table split across two slides; a "Total" that covers lines the
table doesn't show; commentary that contradicts the table.

**PDFs** — a row label wrapping onto two lines; two columns bleeding into one on extraction;
repeated page headers landing mid-table; a figure appearing only in a sentence.

**Word** — the real numbers in a table, the memorable numbers in prose, and the two
disagreeing.

## 7. One file, two periods

A single file with a prior and a current column is common. Work from it directly — refusing
would be a bug. Identify the two period columns from their headers, and watch for a third
`Variance` or `Δ` column already present: **read it as a check on your own arithmetic, not as
a source.** If it disagrees with current-minus-prior, that is a reportable defect — trigger 10
in `whats-changed`'s `materiality.md`, checks 1 and 11 in `sanity-check`'s `checks.md`. Name the
cells that disagree, and both figures.

## 8. State the fidelity once

One clause under the headline, not a section, whenever **either** source is not a
spreadsheet:

> Read from `oct-pack.pptx` (slide 4 table) against `sep-costs.xlsx` (Costs tab). The deck
> rounds to £0.1k, so smaller movements aren't visible.

The user is about to repeat these numbers out loud. They need to know how solid they are.
