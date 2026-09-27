---
name: action-titles
description: Rewrite a deck's slide titles as the claim each slide proves — "Orders rose 17% in March to 5,480", not "Orders" — and flag every current title that claims more than its slide shows. Use when the user has a PowerPoint deck (.pptx) or pasted slide text and says the titles are just labels, wants headline or action titles, "so-what" titles, takeaway titles, or wants the deck to tell its story through the titles before a QBR, board or client meeting. Every number in a new title is on that slide; no cause, verdict or adjective the slide doesn't state. Keeps the original title beside each suggestion; writes a retitled copy only when asked.
---

# Action titles

A slide titled "Ticket Volume" makes the audience find the point. A slide titled "Tickets
rose 12% in May to 8,900" hands it to them, and the chart underneath proves it. That is an
**action title**, and a deck of them can be read from the titles alone.

**The product is the evidence bound.** Anyone can write a punchy headline. Writing one that
the slide beneath it actually proves — every figure on the slide, no cause it doesn't state,
no adjective it can't back — is the hard part, and the reason to use this instead of asking
for "better titles". **Its twin is the flag:** a current title that claims more than its slide
shows is the most dangerous line in the deck, because the author believes it.

## Workflow

### 1. Take the deck as given

A `.pptx` / `.potx` path, or slide text pasted into chat (a heading per slide, then its
content). Read every slide once: title, visible text, tables, native chart data, and speaker
notes. Number slides `S1…Sn` in deck order.

Read `references/what-a-title-may-say.md` §1 before extracting — it says what counts as
evidence (the slide as the audience sees it; **not** the notes, **not** other slides, **not**
numbers guessed off a picture of a chart) and how to record a locator for each figure.

**Ask nothing unless genuinely blocked.** One question, and only this one:
- No deck and no slide text → *"Send the deck (or paste the slides) and I'll retitle them."*

Never ask about audience, tone, length or style. Draft first.

### 2. Sort and choose — by the reference, not by feel

For each slide, in order, apply the reference:

- **§2** — structural (cover, agenda, dividers, appendix, closing)? Then it's only listed.
- **§3** — the slide's finding, chosen by the fixed order.
- **§4** — the verdict, from a closed set of five: `Retitled`, `Keep`, `Unsupported`,
  `Two findings`, `No single finding`.
- **§5** — the wording rules, checked word by word: every figure on the slide or one shown
  step from it, rates in points, certainty words kept, no cause or sequence the slide doesn't
  state, no verdict adjectives or intensity verbs, the deck's own terms, ≤ 15 words.

Those tables are the skill; do not improvise them.

### 3. Write it and stop

```markdown
**ops-review.pptx** · 8 slides · 2 retitled · 1 kept · 1 unsupported · 1 two findings · 3 left as is

**S3 · Retitled**
Now: Orders
New: Orders rose 17% in March to 5,480

**S4 · Keep**
Now: NPS reached 41 in Q2, above the target of 40

**S5 · Unsupported**
Now: Courier switch caused the jump in returns
New: Returns rose 3.3 pts to 6.4%
The slide shows the rise but nothing about the courier switch.

**S6 · Two findings**
Now: Delivery and Cost
New: On-time delivery fell 3 pts to 85% · Warehouse cost per order fell to £2.10 from £2.40
Split into two slides, or tell me which one leads.

**S7 · Retitled**
Now: Incidents
New: Open incidents more than doubled to 96; June target of 50 at risk

Left as is: S1 cover · S2 agenda · S8 closing

Ask "where does S3's title come from?" or "why didn't you retitle S4?" to see the evidence behind any title.
```

(Invented example.)

- **Header**: file name (or *Pasted slides*), slide count, then the count of each verdict that
  occurs, then *left as is*. Omit a verdict with a count of zero.
- **One entry per content slide**, in deck order: `S<n> · <verdict>`, *Now:* always (the
  original stays visible), *New:* for every verdict except `Keep` and `No single finding`.
- **A reason line only** for `Unsupported` (what the slide lacks), `Two findings` (split or
  pick) and `No single finding` (what would give it one). `Retitled` and `Keep` get none.
- **Left as is** — one line listing structural slides by handle and kind. Omitted if none.
- **The closing line** ends the output, nothing after it. It cites the **first** slide with a
  *New:* line and the **first** content slide without one (`Keep`, `No single finding`). If
  every content slide has a *New:* line, the second half reads *"why does S6 say that?"* with
  the first `Unsupported` or `Two findings` slide, or is dropped if there is none.

Output lands in chat. **Nothing before the header** — no preamble, no "Here are your titles".
No commentary on the deck's design, order or story; only titles.

### 4. Writing a retitled copy — only when asked

When the user asks to apply the titles ("update the deck", "save a version"):

- Write a **copy** named `<original name> (action titles).pptx` beside the original. Never
  overwrite the original.
- Change **only the title placeholder text** of `Retitled` and `Unsupported` slides, keeping
  the placeholder's formatting (replace the text of the first run, remove the others). Nothing
  else on any slide changes — not bodies, notes, order or layout.
- `Two findings` slides are left alone unless the user picks a lead; `Keep`, `No single
  finding` and structural slides are never touched.
- Say in one line what was written and which slides changed.

Pasted slides get no file — the titles are already copyable.

## Rules

- **The slide is the evidence.** Its visible text, tables and native chart data. Not the
  notes, not another slide, not a picture's bar heights, not what the author "knows".
- **Flag, don't fix silently.** A current title that claims more than the slide shows is
  `Unsupported`, with the reason — never quietly replaced as if it had been a label.
- **Never supply a cause.** A causal word needs the slide to state the cause; a sequence word
  needs the slide to show both events. The notes' theory is not the slide's.
- **Never firm anything up.** *Forecast*, *target*, *at risk*, *estimate* survive into the
  title. A forecast is never an outcome.
- **Never soften bad news.** A miss or a risk on the slide rides in its title, and leads
  when it's the finding. "Update" and "progress" are not titles for a slide that says *at
  risk*.
- **Don't manufacture a headline.** A slide with no finding keeps a descriptive title. That is
  the honest answer, not a failure.
- **User intent doesn't override evidence.** If the author says the point is X and the slide
  doesn't show X, say what's missing and what the title could say once it's added — don't
  write X.
- **"Punchier" means shorter and number-first** — never an adjective, an intensity verb or a
  rounder number.

## Tracing

A title is a one-line claim about a slide, so every doubt is about the evidence under it or
about a slide that wasn't changed. Read `references/tracing.md` before answering any
follow-up: it carries the handles (`S1…Sn`), the fixed closing line, the trace block
(*Evidence · Working · Why this finding · Word check · What would change it*), the not-retitled
block, and the questions to expect — *"where does 17% come from?"*, *"why didn't you change
S4?"*, *"that's not the point of this slide"*, *"it obviously was the courier switch"*,
*"make it punchier"*, and above all *"why did returns jump?"* — which gets only what the slide
states, the notes quoted and marked as not on the slide, or *"the slide doesn't say."*

A trace re-reads the slide and **corrects the title** when it fails: a figure that doesn't
reproduce is fixed, a dropped *forecast* is restored, a verdict that should have been
`Unsupported` is changed — each said first.
