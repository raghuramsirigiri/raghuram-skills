# Tracing — show the working behind any line

> **Shared reference, duplicated by design.** Byte-identical copies live in every plugin in
> this repo that reports numbers or findings (plugins are independent, so references cannot
> be shared by path). Edit one, copy to all, check with `sha256sum`. The skill-specific part —
> *what* a trace for this skill contains — lives in that skill's `SKILL.md`, not here.

The output is short on purpose. Tracing is how a reader who doubts one line gets from that
line back to the source without re-doing the whole job, and without the output carrying the
working for every line nobody questioned.

**Two layers: the handle is always there, the working appears only when asked.**

## 1. Handles — always on

Every line a reader could doubt carries a short, stable handle, unique within the output:
a letter for the section and a number within it (`D2`, `C1`, `B3`, `F2`). The skill's
`SKILL.md` names its letters. Headline figures are traced as `headline`.

The output ends with exactly this line, and it is the only thing permitted after the last
section:

```
Ask "trace <handle>" to see how any line was reached.
```

It is a fixed contract, not a closing remark — identical every run, never reworded, never
extended into an offer. When the output is a one-line "nothing found" answer, the trace
line still follows it: the reader may want to see what was looked at.

## 2. Traces — on request

The reader asks in any words: *"trace B2"*, *"how did you get £41.2k?"*, *"where's decision 3
from?"*, *"show your working"*, *"why is that a blocker?"*. Answer with one block per handle,
in this order, and nothing else:

```markdown
### Trace B2 — Summary!D8 prints 113 where its parts sum to 111

**Source**
- `Summary!D5` = 37 · `Summary!D6` = 41 · `Summary!D7` = 33 · `Summary!D8` = 113 (printed)

**Working**
1. D5 + D6 + D7 = 37 + 41 + 33 = **111**
2. Printed − computed = 113 − 111 = **+2**

**Rule applied**
- Check 1, *Totals and cross-footing* → Blocker: a printed figure is wrong.

**Would change the call**
- A stated rounding convention of ≥2 on this table. None found.
```

(Invented numbers — illustrative only.)

The four parts:

1. **Source** — every input the line depends on, with its locator (cell, slide + table row,
   page + table, transcript timestamp or speaker turn) and its value **exactly as the source
   shows it**. Quote text verbatim. Nothing enters the working that isn't listed here.
2. **Working** — each step as arithmetic with the numbers substituted, one operation per
   step, so a reader can reproduce it in a spreadsheet or a calculator. For a judgement rather
   than a sum, the steps are the tests applied and what each returned.
3. **Rule applied** — the named rule, gate, check or trigger from this skill's references
   that put the line in the output, in the section it is in, at the rank or tier it has.
   This is the part that explains *why this is an insight* rather than just *what it is*.
4. **Would change the call** — the one or two facts that, if different, would move the line
   to another tier, rank, or out of the output. Say whether the source contains them. Omit
   the part only when nothing plausible would.

## Rules

- **Re-derive, don't recall.** Build the trace from the source again, not from memory of the
  first pass. The trace is a second check, and that is most of its value.
- **The trace wins.** If re-deriving disagrees with the output, say so on the first line of
  the trace — *"This corrects B2: the gap is £2k, not £3k"* — and give the corrected line.
  If the line does not survive at all, retract it plainly. Never bend the working to fit.
- **No new claims.** A trace explains a line already in the output. It does not add findings,
  causes, advice, or anything the output's own rules would have excluded. Causal language
  stays quoted and attributed, exactly as in the output.
- **Can't trace means can't claim.** If a line's source cannot be pointed at — a figure read
  from a chart image, a value inferred rather than read — the trace says so in those words.
  A line that could never be traced should not have been in the output; treat it as a
  retraction.
- **"Trace everything"** / "show all working" → one block per handle, in output order.
  Asked up front ("with working"), append the blocks after the fixed trace line instead of
  waiting for a second turn.
- **Aggregates trace to their members.** A roll-up line (`all other movements`, a count, a
  total) lists every row it contains, with values, so the arithmetic closes in the trace too.
