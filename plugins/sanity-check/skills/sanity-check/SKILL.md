---
name: sanity-check
description: Check a single spreadsheet, deck, PDF or document for internal mistakes before it goes out — totals that don't reconcile or cross-foot, error cells, shares over 100%, duplicated rows, sign errors, stale as-of dates, placeholders left in, mixed units, and a summary that contradicts its own detail — ranked into what blocks sending and what merely invites a question. Use when someone asks whether a file is right, safe to send, consistent, or free of embarrassing errors, or wants it checked, proofed or sense-checked before a board, client or exec sees it. One artifact, not a period comparison.
---

# Sanity check

> "This goes to the CFO in an hour. Is there anything embarrassing in it?"

Not *are these the right numbers* — no file can answer that. **Is this artifact internally
consistent, and will it survive a reader looking for holes?** This is the five minutes a
careful colleague spends cross-footing the totals, checking the date, and noticing that slide
1 and slide 9 disagree.

**The product is the severity ranking.** A flat list of eleven nitpicks is worth the same as
no list, because the reader has an hour and will read three lines. Deciding what *blocks
sending* is the skill.

**This is a one-artifact skill.** Given two periods and asked what changed, that is
`whats-changed`'s job, not this one — see *Boundary* below.

## Workflow

### 1. Take the artifact

One file: `.xlsx`, `.xlsm`, `.csv`, `.tsv`, `.pptx`, `.pdf`, `.docx`, or pasted text. Read it
with `references/extraction.md`, which also tells you what each format hides — you cannot
find a hardcoded cell in a PDF, and you must say so rather than implying the file is clean.

**Ask nothing unless genuinely blocked.** At most two questions, and only these:
- Several candidate data tabs and no obvious primary → *"Which tab is the one going out?"*
- A convention can't be inferred and changes the verdict, e.g. whether a column is
  deliberately signed negative → ask.

Never ask what to check. The check list is this skill's, not the user's.

### 2. Walk the twelve checks

Read `references/checks.md` and walk its twelve families **in order**. Anything not in those
twelve is not a finding, however interesting.

### 3. Tier every finding

Three tiers, each with a mechanical test, first match wins:

- **Blocker** — a number on the page is wrong, or cannot be verified. Someone may act on a
  false figure.
- **Embarrassment** — the numbers are defensible, but a reader will ask a question you can't
  answer.
- **Hygiene** — safe to send as is, worth fixing before it rots.

The reference carries the per-check tier assignments, including the one case that is
genuinely computable rather than judged: a typed-over cell is a **Blocker** when it disagrees
with what its formula would produce and **Hygiene** when it agrees.

### 4. Write the verdict, then the findings

```markdown
**Two blockers — don't send yet.** Plus one date that will draw a question.

## Blockers (2)
- B1 `Summary!C12` totals £4,182k; the detail tab's rows sum to £4,201k. £19k apart, and the
  summary figure is the one on slide 1.
- B2 `Detail!F31` is `#DIV/0!` and feeds the margin column, so every margin below row 31 prints
  blank.

## Embarrassments (1)
- E1 The Headcount tab is dated "as at 30 Sep" in a November pack.

## Hygiene (1)
- H1 `Detail!D14` is typed in where the rest of column D is a formula. It agrees with the
  formula today, so nothing is wrong yet.

Checked: totals and cross-footing · share columns · impossible percentages · duplicates ·
error cells · formula overrides · signs · as-of dates · placeholders · units · cross-tab
agreement · displayed rounding.

Ask "why is B1 a blocker?" or "show me B1" to see the cells and the arithmetic behind any finding.
```

**The verdict line comes first and says whether it is safe to send.** "Safe to send, two
things worth fixing" is the sentence the user came for. Omit a tier's section entirely when
it is empty; keep the count in every heading that appears. Every finding opens with its
handle — `B`, `E`, `H` plus its number within the tier.

**The scope line is mandatory and always identical** — the same twelve family names, in the
canonical order above, every run, whatever the artifact. A clean bill of health is worthless
if the reader can't tell "nothing found" from "nothing looked for", and a scope line that
varies with the file is a scope line that drifts.

**The caveat clause after the list has one admission rule, and it is narrow.** Add a clause
**only** when a family was *impossible* to check in this artifact — the format hides what it
needs:

- ✅ *"formula overrides and error cells aren't visible in a PDF"* — the format makes it
  impossible. Without this, the reader thinks those checks passed.
- ✅ *"the deck gives no as-of date anywhere"* — the input the check needs is absent.
- ❌ *"no share columns exist, so that check had nothing to fire on"* — it **was** checked and
  found nothing. That is the clean result the list already reports.
- ❌ *"single tab, so no cross-tab comparison"* — same: checked, nothing to find.
- ❌ *"every value is typed, so no formula column to stand out against"* — same.

**Checked and clean needs no clause. Could not check does.** If nothing was impossible, the
scope line ends at `displayed rounding.` The fixed trace line follows it, and nothing else
does.

## Rules

- **Never judge the numbers against the world.** "Revenue looks low for Q3" is a claim the
  file cannot support. Internal consistency is the whole remit.
- **Report, don't repair.** Don't rewrite the artifact, and don't offer to — an offer invites
  a second turn that rewrites someone's workbook. Fix it only if asked outright.
- **Precision over recall.** One invented finding costs more than one missed nitpick, because
  the reader then has to check your checking. When something is genuinely borderline, say so
  in one clause rather than promoting it a tier.
- **Nothing outside the twelve families.** Formatting taste, business advice, escalation
  suggestions, and limitations of your own analysis are not findings. "No unit counts, so
  margin can't be checked" belongs in the scope line's caveat, never in a tier.
- **A stated convention disarms its check.** If the sheet says "rounded to nearest £k",
  components not summing exactly is expected and is not a finding. **But a convention excuses
  only what it covers** — a rounding note does not excuse a gap three orders of magnitude
  larger than the rounding step, and using it that way is the one way to get the arithmetic
  wrong while sounding careful.
- **Cite a locator for every finding.** `Summary!C12`, `slide 4, table row 3`, `p.7 Table 2`.
  A finding without a cell reference can't be acted on in the hour available.
- **When the artifact is clean, say so plainly and stop.** Verdict line, the scope line, the
  trace line.
  No padding, no reassurance paragraph, no "you may wish to consider".
- **Two files given?** Still sanity findings, tiered, for both. The comparative sharpens the
  stale-figure checks and nothing else. **Do not produce a variance report** — if what they
  wanted was what moved, say so in one line and point at `whats-changed`.

## Tracing

The findings are one line each, so the reader's next move is to open the cell and push back.
Read `references/tracing.md` before answering any follow-up: it carries the handles (`B`,
`E`, `H`, `scope`), the fixed closing line (and its clean-verdict variant), the trace block
(*Cells · Arithmetic · Tier · What would change it*), and the questions to expect — *"why is
that a blocker? it's tiny"*, *"it adds up when I check it"*, *"which number is right?"*, *"the
sheet says rounded — isn't that why?"*, *"what did you actually check?"*.

A trace re-opens the file and **corrects the list** if a finding doesn't reproduce. Pushback
alone never moves a tier.

## Boundary with `whats-changed`

| | `whats-changed` | `sanity-check` |
| --- | --- | --- |
| Input | two periods | **one artifact** |
| Product | what moved, ranked | **what's wrong with it** |
| Defects | a footnote to the movement | **the entire output** |

Four checks overlap — reconciliation, stale dates, mixed units, hardcoded cells. That is
expected: the same defect matters to both, but one mentions it in passing and this one exists
to find it. "Check this month's numbers" is ambiguous between them: if the request is about
*movement*, it is the other skill.
