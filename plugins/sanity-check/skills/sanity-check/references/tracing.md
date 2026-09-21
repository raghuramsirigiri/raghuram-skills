# Tracing a finding back to the cells

How `sanity-check` answers *"show me"*. The output is a worklist read by someone with an hour
before a file goes out. The findings are one line each, so the first thing that reader does
is open the file, look at the cell, and either see the problem or push back. The trace has to
win that exchange in one turn, or the whole ranking is doubted.

The people asking are usually **the author of the file**, who is sure it adds up, **the
sender**, deciding whether a Blocker really blocks, and **a reviewer** who wants to know the
clean verdict meant something. Every answer below is written for one of them.

All examples use invented numbers unrelated to the eval fixtures.

---

## Handles and the closing line

`B1, B2 …` Blockers · `E1 …` Embarrassments · `H1 …` Hygiene, numbered within their tier ·
`scope` for the *Checked:* line, traced per family.

The output ends with exactly this line, after the scope line, and nothing follows it:

```
Ask "why is B1 a blocker?" or "show me B1" to see the cells and the arithmetic behind any finding.
```

On a clean verdict, where there is no B1, the line reads instead:

```
Ask "what did you check for <family>?" to see what was examined.
```

Follow-up replies — the traces themselves — do **not** repeat it. It is said once, under the
output, where the reader first needs it.

## The trace block

```markdown
### B2 — Regional total typed over  ·  checks 6, 1, 11

**Cells**
| Cell | Shows | Formula |
|---|---|---|
| `Detail!E5:E11` | 41, 38, 52, 47, 60, 29, 33 | typed inputs |
| `Detail!E12` | 318 | **typed** — E12's neighbours F12:H12 are `=SUM(…5:…11)` |
| `Summary!C6` | 300 | `=Detail!E13` (a different, correct subtotal) |

**Arithmetic**
1. E5 + … + E11 = 41 + 38 + 52 + 47 + 60 + 29 + 33 = **300**
2. The formula pattern would give 300; E12 shows 318 → **disagrees by 18**
3. Summary!C6 = 300 → **the Summary figure is the right one**

**Tier**
- Check 6, typed override **disagreeing** with its formula → Blocker. (Checks 1 and 11 are
  the same defect's symptoms — one finding, not three.)

**What would change it**
- If E12 were 300 it would be Hygiene (typed, but agreeing). A stated rounding convention
  would not help: ±0.5 per figure is at most ±3.5 across seven rows, not 18.
```

- **Cells** — every cell, range, slide table row or page the finding touches, with what it
  displays and, in a spreadsheet, its formula or **typed**. For a PDF or deck, say that
  formulas aren't visible there.
- **Arithmetic** — the check's own computation, numbers substituted: the column summed, shares
  added, the formula pattern re-evaluated, the two dates set side by side, the two
  disclosures of one figure compared.
- **Tier** — the check family by number and name, the tier from the severity table in
  `checks.md`, and which exception applied if one did. If several checks fired, say why it
  is one finding.
- **What would change it** — the fact that would move it up or down a tier or clear it,
  including whether a stated convention in the file covers it.

---

## The questions to expect, and what each answer shows

| They ask | Answer with |
| --- | --- |
| **"Why is B1 a blocker? It's tiny."** | The tier comes from the check, not the size: its row in the severity table, and the test that means someone may act on a false figure. Don't soften it because they pushed. |
| **"It adds up when I check it."** | Recompute, cell by cell, and show it. Then name the usual reason two people get different sums: **hidden or filtered rows, displayed vs stored values, a text-formatted number, or a different range**. If they're right, **retract the finding** — first line, plainly. |
| **"Which number is right?"** | For a cross-tab disagreement: the evidence for each (which one its parts sum to, which one is a formula) and the verdict — or, if nothing settles it, *"The file doesn't say which is right"*. If findings already on the list sit inside the better-supported figure, name them **by handle** — not a new finding, and the reader needs it before quoting the number. |
| **"Where exactly?"** / "Show me B1" | The full block. The cell list first — that is what they'll navigate to. |
| **"What does this break?"** | What the defect feeds: the cells that reference it, and which printed figures are therefore wrong or blank. Name them; don't fix them. |
| **"Why is the date only an embarrassment?"** | Check 8's tier and why: the numbers may be current, the label isn't — a reader will ask, but no one acts on a false figure. What would make it a Blocker (evidence the figures themselves are stale). |
| **"It says rounded to £k — isn't that why?"** | What the convention covers, as numbers: **half its step per figure** ("nearest £1k" → ±£0.5k), so at most *n* × half a step across a sum of *n* figures — then the gap, and the ratio. Do this arithmetic explicitly; it is the one readers check. A convention disarms only what it covers. |
| **"Why is that one finding, not three?"** | One defect to fix: the cell, and the checks it trips as symptoms. Mirror case: two different typed cells would be two. |
| **"Why didn't you flag X?"** | Which of the twelve families X would fall under and what that check returned — or that X is outside the twelve by design (formatting, plausibility, advice). |
| **"You say it's clean — what did you actually check?"** | Per family on the scope line: what was examined (which totals, which share columns, which date cells) and what each returned. This is how a clean verdict is audited. |
| **"Can you fix it?"** | Not in a trace — the cell and the correct value if the file makes it knowable, then stop. Repair only if asked outright. |
| **"Show all of it"** | Every finding, B then E then H, then `scope`. |

## Rules

- **Re-open the file and recompute.** The trace is a second check; recalling the first pass
  defeats it.
- **The trace corrects the list.** A finding that doesn't reproduce is retracted; a tier that
  was applied wrongly is corrected — both in the first line, and the verdict restated if it
  changes (*"Correction: that was the only Blocker — safe to send, two things worth fixing"*).
- **Pushback doesn't move a tier; evidence does.** The tier comes from `checks.md`. Change it
  only when the recomputation changes which rule applies.
- **No new findings in a trace.** If one turns up while re-checking, say so in one line at the
  end as a correction to the list, with its handle.
- **Say what the format hides.** In a PDF or deck, a trace cannot show formulas or hidden
  rows. Say so in the Cells part rather than implying it looked.
