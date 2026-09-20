---
name: whats-changed
description: Compare two periods of the same report and say what moved, by how much, and which few lines explain the total — ranked, with rate split from volume. Use when the user has this month's and last month's numbers (workbook, CSV, PowerPoint pack, PDF or Word doc) and asks what changed, what's driving it, why revenue or cost moved, or wants month-on-month or quarter-on-quarter variance commentary they can repeat in a meeting. Not a cell-by-cell diff, and it never invents a cause the source doesn't state.
---

# What's changed

Every reporting pack answers *what the number is*. Nobody ships the paragraph that says
**what moved, by how much, and which two lines account for most of it.** That paragraph is
what gets asked for in the meeting.

**The product is the ranking, and the discipline is not explaining.** Of the forty things
that moved, name the few that explain the total, say plainly that the rest is noise, and
**never supply a cause the source does not state.** A report that says "down on seasonal
softness" is worse than useless — it puts a fabricated cause into someone's mouth in a
standup.

## Workflow

### 1. Take both periods as given

Two files — prior and current — or one file with two period columns. Accepts `.xlsx`,
`.xlsm`, `.csv`, `.tsv`, `.pptx`, `.pdf`, `.docx`, or text pasted into chat. **Mixed pairs
are normal and supported**: an August PDF against a September workbook is what the user has
to hand, because the workbook stayed with whoever built it.

Infer which is the earlier period from filenames, sheet or slide titles, or a date header.

**Ask nothing unless genuinely blocked.** At most two questions, and only these:
- Which period is earlier genuinely cannot be inferred → *"Which of these is the prior
  period?"*
- No shared key exists, so rows cannot be matched at all → say what each source is keyed
  on, ask how to align them.

Never ask about format, audience, thresholds, or how much detail they want. Draft first.

### 2. Extract before comparing

Read `references/extraction.md` and follow it. It covers per-format fidelity, the flat
intermediate every source reduces to, mandatory source locators, and the four rules that
stop a deck or a PDF producing confident nonsense:

- never read a number off a **chart image**;
- never **OCR** into the output without flagging it;
- compare at the **coarser precision** of the two sources;
- a line a truncated source didn't show is **not disclosed**, not gone.

The precision rule is the one that bites. A deck at `£1.8m` against a workbook at
`£1,783.2k` is not a £16.8k movement — it is rounding, and reporting it is a fabrication
that looks like arithmetic.

### 3. Align rows, then compute

Match on normalised label, then on position. Compute per line: prior, current, change, and
— where the source carries both a count and a value — the **rate/volume split**. Whether a
total moved because units moved or because the per-unit figure moved is the most useful
thing this skill can say, and it is pure arithmetic.

Reconcile before reporting: **the sum of the rows is the truth**, not a total the source
prints. If they disagree, the gap is a flag.

### 4. Rank, and drop what doesn't qualify

Read `references/materiality.md` and apply its two gates. They are numeric on purpose —
"report what matters" drifts from run to run, two thresholds don't. Everything failing both
gates aggregates into one `all other movements` row, never silently dropped, so the
arithmetic still closes.

The reference also carries the refuse-to-say table, the rulings for new and gone rows,
renames, sign flips and unit changes, and the closed nine-item list of what earns a flag.
Those cases are the skill; do not improvise them.

### 5. Write it and stop

A headline, then the tables. No preamble, no methodology section, no offer of further
analysis.

```markdown
**Cost of service rose £41.2k (+6.8%) to £647.9k.** One line explains four fifths of it.

Read from `oct-pack.pptx` (slide 4 table) against `sep-costs.xlsx` (Costs tab).
The deck rounds to £0.1k, so smaller movements aren't visible.

## Drivers (ranked)

| # | Line | Prior | Current | Change | % of total move | Note |
|---|------|-------|---------|--------|-----------------|------|
| 1 | Hosting — EU West | 118.4 | 151.6 | +33.2 | 81% | Instances +28%, unit price flat |
| 2 | Support — outsourced | 96.0 | 105.3 | +9.3 | 23% | Rate +10%, volume flat; "new MSA rate from 1 Oct" per slide 4's note |
| 3 | Licences | 84.2 | 79.1 | −5.1 | −12% | Seats −6% |
| 4 | Observability | — | 6.8 | +6.8 | 17% | new line |
|   | all other movements (7 rows) | 246.1 | 243.2 | −2.9 | −7% | none individually material |

## Structural changes (2)
- `Observability` is new this month — £6.8k, no prior comparative.
- `Legacy monitoring` has gone; it was £5.4k last month. It may have been absorbed into
  `Observability`, but nothing in either source says so.

## Flags (2)
- The Costs tab totals £650.5k; the rows sum to £647.9k. £2.6k unaccounted — `E22` is a
  typed-in number, not part of the column formula.
- Slide 6 carries the regional split as a picture, not a chart. Those numbers weren't
  readable; the underlying file is needed if that split matters.
```

`% of total move` is signed against the total's direction, so an offsetting line shows
negative. That is information, not a bug — which is why the column is not called `% share`.

## Rules

- **Never invent a cause.** Arithmetic is yours to state; causation is not. The only
  permitted causal language is **quoted from the source** — a note column, a footnote, a
  variance-reason field, a deck's commentary — and attributed to it. Everything else is
  movement described, not explained.
- **Rank or don't report.** An unranked list of everything that changed is the problem the
  workbook already has. If the drivers can't be ranked, say why.
- **Flat is a valid answer.** *"Revenue is flat within 1%; no line moved more than £3k"* is
  true and useful. Never manufacture drivers to fill the table.
- **Say less than you were asked for when the source can't support more.** A coarse PDF
  against a fine workbook yields a thin report; that is the honest output.
- **No percentage on a new row, a gone row, or a move across zero.** Write `new`, `gone`, or
  describe the flip in words. Never `∞`, never `340%` on a £40 base, never `n/a%`.
- **The rows are the truth.** Never repeat a printed total that its own rows contradict.
- **Cite a locator** for every figure whenever either source is not a spreadsheet.
  `Revenue!E7`, `slide 6, table row 3`, `p.12 Table 4`. Nobody can eyeball a diff of two
  PDFs.
- **Flags are a closed list.** Only the nine triggers in the reference earn a line. Risks,
  opinions and things that merely seemed notable are commentary. Omit the section when
  nothing qualifies.
- **Stop and flag on a unit or currency mismatch** between the two sources. Every number
  would otherwise be wrong by 1000×. This is the one case worth refusing to report on.
- **Output lands in chat** as copyable markdown. Write a file only if asked. Don't offer to
  chart it — the user has minutes before a meeting and wants sentences.

## Testing

`evals/` ships the fixtures and their answer keys. `sales-2026-08.xlsx` / `-09.xlsx` are the
clean-shape pair; `sales-pack-2026-08.pptx` / `-09.pptx` test decks, native charts, a
picture-of-a-chart slide and a top-5 truncation; `sales-pack-2026-08.pdf` tests £0.1m
rounding against a £k workbook; `-08-scanned.pdf` has no text layer at all.
`sales.KEY.md` and `sales-pack.KEY.md` grade them — never feed a key in with a fixture.
