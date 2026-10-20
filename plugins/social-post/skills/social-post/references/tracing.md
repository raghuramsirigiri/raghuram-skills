# Tracing a figure back to the data

How `social-post` answers *"where does that number come from?"* and *"why is
that the headline?"*. A post puts a figure in public, under someone's name, as
a picture that gets reposted without its words. Once it's out, it can't be
corrected quietly. So before they post it, every figure on a card and in a post
has to be answerable in one turn, from the data the user gave, with the
arithmetic shown.

People who question a post are in one of four positions:

- **The author**, about to publish it under their own name. *"Is 2.1× right?
  I don't want to be corrected in the comments."*
- **A reviewer who signs it off**: a manager, comms, legal. *"Where's this
  from? Can we say 'doubled'?"*
- **Someone who knows the numbers**, often the person who owns the data.
  *"That's not what our dashboard says."* *"It's 25%, not 23%."*
- **The author again, wanting more.** *"Add a line on why it went up."* *"Can
  you put the 40% growth figure in the X post too?"*

All examples use invented names and figures.

---

## Handles and the closing line

Cards are `C1…C3`, in the order they appear on the page. Each figure on a card
is `C1.1`, `C1.2`…, in reading order (headline, units line, chart labels the
headline relies on, source). Posts are named by platform: `LinkedIn`, `X`,
`Bluesky`, `Threads`, `Mastodon`, `Instagram`.

**Handles never go on the picture or in the post text.** Both are public, and
both are pasted as they are. Handles live in the handover in chat:

```
C1 · portrait · "Sign-ups doubled in six weeks, from 310 to 640"
     C1.1 310 (week 1) · C1.2 640 (week 6) · C1.3 doubled (640 ÷ 310 = 2.06×)
LinkedIn · 412 / 3,000 · figures 310, 640 (both C1)
X · 214 / 280 · figures 310, 640 (both C1)
From your data: every figure. Illustrative: none.

Ask "where does C1.3 come from?" or "why is that C1's headline?" to see the working behind any figure.
```

The handover ends with this closing line, and nothing follows it:

```
Ask "where does <figure> come from?" or "why is that <card>'s headline?" to see the working behind any figure.
```

The first slot takes the **first derived figure** on the page (a ratio, a
share, a difference, a total), because a derived figure is the one people
doubt. If every figure is copied straight from the data, it takes the first
figure. The second slot takes the **first card**. These are the two questions
this skill gets most: one about a number, one about the choice of finding.

Follow-up replies do **not** repeat the closing line, except a trace that
corrects the post and reprints the handover, because that list is what the
user posts from.

## The trace block: for a figure

```markdown
### C1.3 — "doubled" (headline)

**From your data**
> row "Week 1" · Sign-ups = 310
> row "Week 6" · Sign-ups = 640

**Working**
- 640 ÷ 310 = 2.0645 → **2.06×**, rounded once.
- "Doubled" holds for 2.0× to about 2.2× (`headlines.md` § Check the arithmetic).

**Where it appears**
- C1 headline · LinkedIn line 1 · X line 1. The same figure everywhere.

**What would change it**
- A different start or end week. Week 2 → week 6 is 640 ÷ 355 = 1.80×, which
  is "nearly doubled", not "doubled".
```

Use these four headings **exactly as written**, in this order.

- **From your data**: every value the figure used, quoted as the user gave it,
  with its locator: the row and column of a table, the line of pasted text,
  the cell of a file. A figure the user stated in words is quoted in their
  words (*"you wrote: 'about 600 a week now'"*).
- **Working**: the arithmetic, with the rounding named. A copied figure says
  *copied as given*.
- **Where it appears**: every card and post that carries the figure, so a
  correction reaches all of them.
- **What would change it**: the input that, changed, changes the figure. Not
  a cause, and not an offer: a different start or end listed here is not a
  way to keep a word (`headlines.md` § Check the arithmetic).

An **illustrative** figure has no *From your data*. Its first heading is
**Illustrative** and says it was written to show the shape, that it appears
labelled on the card and in the post, and which real figure would replace it.

## The headline block: for "why is that the headline?"

```markdown
### C1 — why "Sign-ups doubled in six weeks"

**The findings the data holds**
1. Sign-ups 310 → 640, weeks 1–6 (2.06×) ← chosen
2. Cost per sign-up £4.10 → £3.90 (−5%)
3. Week 4 dip to 290

**Why this one**
- It is the largest change in the data, and the one you asked about ("how
  are sign-ups doing").
- It needs one chart, and it fits a card.

**What the post leaves out**
- 2 and 3. Either could be its own card; say if you want one.
```

List what the data holds as findings with their numbers, mark the chosen one,
give the reason in one or two lines from the user's own request and the size
of each change, and say what was left out. Never a reason the data can't show
(*"it's the most inspiring"*).

---

## The questions to expect, and what each answer shows

| They ask | Answer with |
| --- | --- |
| **"Where does C1.3 come from?"** / *"how did you get 2.1×?"* | The trace block. |
| **"Why is that C1's headline?"** / *"why not the cost figure?"* | The headline block. |
| **"Can we say 'doubled'?"** | The trace block's *Working*, and the word's range from `headlines.md`. If it doesn't hold, give the phrase that does, and offer to fix the card and every post. Never offer a different start or end that makes the word hold, such as counting from the lowest month; change the word, not the comparison. |
| **"That's not what our dashboard says, it's 25%."** (pushback) | Re-read the data first. If the data says 23%, show the rows and the working and **hold it**: *"From the table you gave me it's 23%. If 25% is right, the table is out of date, and I'd need the newer figures."* Never move a figure because someone is sure. If the user gives new data, rebuild from that, and say what changed. |
| **"Round it up to 25%, it sounds better."** (pushback) | Don't. A rounded-up figure in public is the one that gets corrected in the comments. Give the honest round (23%, or "nearly a quarter") and say why in one line. |
| **"Add a line on why it went up."** / *"say it's because of the new onboarding"* | Only a cause the user stated. If they just stated it, write it in their words, attributed as theirs (*"after we changed onboarding"*, not *"because"* unless they said because). If no one stated one: *"Your data shows that it rose, not why. If you know the reason, tell me in your words and I'll add it as yours."* Never a cause of your own, however plausible, and **no sample reasons**, not even as examples of wording (*"e.g. after the holidays"*, *"a supplier delay"*): the user picks one up and it goes out as fact. |
| **"Put the 40% growth figure in the X post too."** | Only if 40% is on a card. If it isn't, it goes on a card first or stays out: every figure in a post is one the picture shows (`cards-and-posts.md` § The words). Say which, and offer both. |
| **"Is this within X's limit?"** | The post's count and the platform's counting rule (`cards-and-posts.md` § Platforms): X counts every link as 23 and CJK or emoji as 2. Give the count. |
| **"Which of these numbers are real?"** | The handover's *From your data / Illustrative* line, then the illustrative figures' blocks. |
| **"Is the date right?"** | The source line's date, and where it came from in the user's input. If the user gave no date, say the card's date is the period the data covers and ask them to confirm the snapshot date. |
| **"Can you make the drop look smaller?"** / *"start the axis higher"* | No change to what the chart shows to soften or sharpen it. Offer the honest alternatives: a different finding, or the change stated in words. Not a different start or end picked to soften or sharpen it (`headlines.md` § Check the arithmetic). |
| **"Show all of it."** | One trace block per derived figure, in handle order, then a one-line list of the copied ones with their rows. |

## Rules

- **Re-read the data; don't recall the build.** The trace is a second reading,
  and that's where it catches a wrong row, a week off by one, or a share of
  the wrong total.
- **The trace corrects the post.** A figure that doesn't reproduce is fixed on
  the card **and** in every post that carries it, and the page is rebuilt and
  re-checked (SKILL.md steps 7–8). Say the correction first, then reprint the
  handover with the closing line.
- **Quote, never paraphrase, in *From your data*.** The person checking will
  open the same table and compare.
- **One figure per block.** Don't argue a figure from another card's figure
  unless the working actually uses it.
- **Pushback alone moves nothing.** A figure changes when the data changes or
  the re-read shows it was wrong, never because someone is sure.
