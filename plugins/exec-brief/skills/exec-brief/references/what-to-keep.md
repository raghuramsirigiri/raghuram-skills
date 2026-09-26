# What to keep

How `exec-brief` decides what survives the cut. Everything here is a test you can apply to a
sentence of the source and get a yes or no — "keep what matters" drifts from run to run; these
don't.

All examples use invented names, dates and figures.

---

## The reader

Unless the user says otherwise, the reader is **one level up from the sender**:

- knows the business, the team and the project's name;
- has **not** read the source, and won't;
- reads the brief in about fifteen seconds, often on a phone;
- will repeat one figure from it to someone else — so that figure must be right.

Everything below serves that reader. If the user names a different reader ("this is for the
CFO", "for the steering group"), keep the same tests and let the reader's remit decide what
counts as *changes what they do*.

## Step 0 — the latest true state

Before any selection, reduce the source to where things stand after its last message:

| Source shows | State is |
| --- | --- |
| An estimate, later a confirmed figure | the confirmed figure only |
| A decision, later reversed | the final call only |
| A disagreement, later settled ("let's park it", "agreed, both own it") | settled — history |
| An option raised, later rejected | rejected — history |
| Two figures or dates for the same thing, **neither acknowledging the other** | **unresolved** — use the later one and fire `Check` trigger 1 |
| A question asked, never answered | open — a candidate point only if the reader would ask it too |

Supersession needs the later message to *refer to* the earlier thing ("confirmed", "revised",
"updated", or the same named quantity with a sourced calculation). Two numbers that merely
differ, with no link between them, are a contradiction, not a revision.

## The BLUF test

One sentence that answers: **what is the state of things, and what does it mean for the
reader?** Pick its subject by this order — the first that exists wins:

1. **A decision or approval the reader must give.** They are the bottleneck; that leads.
2. **A change to something the reader was told or owns** — a date, a cost, a scope, a risk
   rating, a commitment to a customer.
3. **A completed outcome** — shipped, signed, failed, cancelled.
4. **Steady state** — "on track, nothing needed from you" is a real BLUF.

When 1 and 2 both exist, one sentence carries both (*"X has slipped, and fixing it needs your
approval by Friday"*). Bad news is never demoted behind progress. ≤ 30 words.

## The keep tests — ranked

A candidate point must pass **test A**. Among those that pass, rank by the first test each
passes; keep the top three at most.

| Rank | Keep if… | Example |
| --- | --- | --- |
| A (gate) | Without it, the reader would **act, decide or answer differently.** | — |
| 1 | It is a **condition** on the BLUF or the ask — the thing that could still change it. | "Only if the load test passes on 3 Mar." |
| 2 | It is the **figure** the reader will be quoted back or asked to defend. | "£22k = 11 supplier days at £2,000." |
| 3 | It is the **consequence of not acting** on the ask. | "Miss 11 Feb and the next slot is May." |
| 4 | It answers the question the reader will **certainly ask next** — including "do we know why?" when the answer is "not yet". | "Root cause not yet known; supplier reporting Friday." |
| 5 | It is a risk **with an owner or a date** in the source. | "Data sign-off with Finance, due 27 Feb." |

A point that restates the BLUF or the ask fails the gate — it changes nothing.

**Qualifiers travel with every mention.** If a date or figure is conditional, each sentence
that states it carries the qualifier — the BLUF first of all. The condition itself can live in
a point; the word *likely*, *target* or *planned* cannot be left behind in the BLUF.

## Always cut

| Cut | Tell | Why |
| --- | --- | --- |
| Chronology | "On Monday… then Tuesday…" | The reader wants the state, not the route. |
| Who said what | Attributions of positions | Only a decision-maker's name survives, and only when it matters to the ask. |
| A settled argument or blame | "park it", "both teams own it" | Reopening it upward restarts it. |
| A rejected option | "we looked at X, not viable" | History — **unless** the reader would otherwise propose it; then one clause on an existing point, as rejected, with the source's reason. It ranks at most 4 and never displaces a rank 1–3 point. |
| Thanks, praise, morale | "great work everyone" | Doesn't change a decision. |
| Side topics | a different subject in the same thread | Not the brief's subject. |
| Process | meetings held, calls set up, who's cc'd | The reader doesn't care how. |
| Background the reader has | project purpose, team names | They know. |
| Superseded figures | the early estimate | Two numbers invite the wrong one to be repeated. |

## Refuse to say

| Tempting | Instead | Because |
| --- | --- | --- |
| "Going live on 16 Mar" when the source says *likely*, *target*, *if* | Keep the qualifier and the condition | A promise the sender never made, sent upward. |
| A cause someone guessed ("probably the old codes again") | Omit, or "cause not yet known" — or "X suspects…" if the reader would ask | A guess repeated by a director becomes the finding. |
| A cause the source never gives | "The thread doesn't say why." | Invention. |
| A recommendation the sender never made | Put the options to the reader as a choice | The sender's name is on it. |
| A deadline the source doesn't give | "no date given" | A fake deadline creates a fake emergency. |
| "Minor", "small", "on track" where the source doesn't say so | The figure and let the reader judge | Characterisation is spin. |
| Rounding £17,600 to "about £20k" | £17.6k | The reader repeats it; finance corrects it in front of them. |

## The ask

- **One action, for the reader.** Approve, decide between, attend, sign, nothing.
- Carries the source's date, or "no date given".
- If the source asks several things of the reader, the ask is the one with the earliest date
  or the one others depend on; the rest become points (rank 3 or 4) or are cut.
- An open invitation ("thoughts welcome", "shout if questions") is **not an ask**.
- Nothing asked → `**Ask:** No ask — for information.`

## `Check before sending` — closed list

Only these three fire the line, one clause each, in this order. Anything else — a risk, a
tone concern, something that seemed notable — is not a check.

1. **A figure or date carried into the brief is contradicted elsewhere in the source**, and no
   later message resolves it. Name both locators and who could settle it.
2. **The ask needs a date or an owner the source doesn't give** — say which.
3. **The source is truncated or missing something the brief relies on** (an attachment
   referenced but not included, a thread that starts mid-reply).

Omit the line entirely when none fires. It exists to stop the sender being embarrassed, not
to show diligence.
