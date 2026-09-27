# Tracing a title back to its slide

How `action-titles` answers *"where does that number come from?"* and *"why didn't you
change that one?"*. A title is one line standing in for a whole slide, and it will be read
aloud in a meeting with the author's name on the deck — so every figure, every direction word
and every missing claim has to be answerable in one turn, from the slide, with the slide's own
contents.

People who question a title are in one of three positions:

- **The deck's author.** They know what they meant the slide to say. They push back when a
  title is flatter than their intent, or when their own title is flagged `Unsupported`.
- **A reviewer — the manager, the finance partner, the person presenting it.** They check the
  figure before they say it out loud, and they ask *why* the number moved.
- **The owner of a flagged slide.** *"Everyone knows it was the migration."*

All examples use invented names and figures.

---

## Handles and the closing line

Handles are the slide numbers, `S1…Sn`, in deck order — the same numbers PowerPoint shows.
Pasted slides are numbered in the order pasted.

The output ends with this line, and nothing follows it:

```
Ask "where does S3's title come from?" or "why didn't you retitle S4?" to see the evidence behind any title.
```

with the **first slide that has a *New:* line** in the first slot and the **first content
slide without one** (`Keep`, `No single finding`) in the second. It names the two questions
this skill gets most — one about a title it wrote, one about a title it left alone. If every
content slide has a *New:* line, the second half becomes *"why does S6 say that?"* with the
first `Unsupported` or `Two findings` slide, and is dropped when there is none.

Follow-up replies do **not** repeat it — except a trace that corrects the titles and reprints
the full list, since that list is what the user copies. A trace that changes nothing never
reprints the list.

## The trace block — for a title that was written

```markdown
### S3 — Orders rose 17% in March to 5,480

**Evidence**
> S3 · chart series "Orders" · Feb 2026 = 4,700 · Mar 2026 = 5,480
> S3 · text "Orders received per month, all channels."

**Working**
- 5,480 ÷ 4,700 − 1 = 0.1660 → 16.6% → **17%** (whole-number inputs → whole percent,
  half away from zero).

**Why this finding**
- §3 step 3 — largest movement in the slide's only series. No stated conclusion (step 1) or
  target (step 2) on the slide.

**Word check**
- *Orders* — the series name on the slide. *rose* — a movement verb. *17%*, *5,480*,
  *March* — all above. No cause, no adjective.

**What would change it**
- A takeaway box or a target on the slide would take precedence (§3 steps 1–2). None exists.
```

- **Evidence** — every element the title rests on, **as it appears on the slide**, with its
  locator (`S3 · chart series …`, `S3 · table row …, col …`, `S3 · text "…"`). Quote text
  exactly; give chart and table values exactly as stored.
- **Working** — every arithmetic step, with the rounding rule named. Omitted only when the
  title's figures appear on the slide verbatim.
- **Why this finding** — the §3 step that picked it, and why earlier steps didn't apply. For
  `Unsupported`, also quote the old title and name the word the slide doesn't prove.
- **Word check** — each figure, direction word, certainty word and term in the title, and
  where it comes from. This is what a disputing reviewer reads, so show it even when obvious.
- **What would change it** — the evidence that, if added to the slide, would change the title
  or the verdict; and whether anything close is already there (including in the notes).

## The not-retitled block — for a slide without a *New:* line

```markdown
### S6 — not retitled: "Site Traffic" (No single finding)

**What the slide carries**
> S6 · picture (line chart, no data behind it)
> S6 · text "Source: web analytics export."

**Why no title was written**
- §4 `No single finding`: the chart is a picture, so it carries no numbers (§1), and no
  figure appears in text. Any direction read off the picture would be a guess.

**What would give it one**
- Paste the native chart, or add the figure as text (e.g. monthly sessions), and it can be
  retitled.
```

For `Keep`, *Why no title was written* runs the word check on the **current** title and
shows it passes. For a structural slide, it names the §2 kind.

---

## The questions to expect, and what each answer shows

| They ask | Answer with |
| --- | --- |
| **"Where does S3's title come from?"** / "Where's 17% from?" | The trace block. |
| **"Why didn't you retitle S4?"** | The not-retitled block. If the slide *does* have a finding that passes §3–§5, the verdict was wrong: **retitle it** and say so first. |
| **"That's not the point of this slide — it's about X."** | Check X against the slide. If the slide proves X, adopt it, show the word check, say so. If not, say exactly what's missing (*"the slide has no figure for handoffs"*), and give the title X would support **once that figure is on the slide**. Never write X now. |
| **"It obviously was the migration — put it back."** (pushback on `Unsupported`) | Quote the old title and the slide's full evidence. Show the causal word has no source on the slide. If the notes carry the claim, quote them and say they aren't on the slide (and what they say about certainty). Hold the verdict. Offer the route: state the cause on the slide, with its evidence, and the title can carry it — at the certainty the slide states. |
| **"Doubled? It's not quite double."** / "Why 17% not 16%?" | *Working*: the exact ratio or change, the §5 range or rounding rule it falls in. If it's outside the range, **correct the title**. |
| **"Make it punchier."** | Shorter and number-first, same evidence. Show what was cut. Refuse adjectives, intensity verbs and rounder numbers by naming the §5 rule — once, in a clause. |
| **"Why did returns jump?"** / "What caused it?" | **Only what the slide states, quoted** — or *"The slide doesn't say why."* If the notes or the user's message offer a reason, quote it **as theirs**, with its own certainty (*"the notes say 'we think … not confirmed'"*). Never a cause of your own, however plausible. |
| **"The figure's on slide 12, use it."** | Slides are evidence only for themselves (§1): a title that needs S12's figure fails when S3 is lifted into another deck. Offer to add the figure to S3 — then it can be titled. |
| **"Can you do the subtitles too?"** | Out of scope: one line saying titles only, and that the moved-out qualifier (units, date range, source) is what a subtitle usually carries. Not a trace. |
| **"Show all of it"** | One block per content slide in deck order — trace block for each *New:* line, not-retitled block for the rest — then the `Left as is` line with each slide's §2 kind. |

## Rules

- **Re-read the slide; don't recall your first pass.** The trace is a second reading and
  that's where it catches things — a second series, a footnote target, a takeaway box.
- **The trace corrects the title.** A figure that doesn't reproduce is fixed; a dropped
  *forecast* or *at risk* is restored; a ratio word outside its range becomes the number; a
  wrong verdict is changed. Say the correction in the first line, then reprint the full list
  with the closing line.
- **Quote, never paraphrase, in *Evidence*.** The author will compare it to their slide.
- **Notes are evidence of what someone thinks, never of what the slide shows.** Quote them
  only in *What would change it*, and in answers to *why*.
- **Pushback alone moves nothing.** A verdict changes when the slide changes, or when the
  re-read finds evidence the first pass missed — never because the author is sure.
