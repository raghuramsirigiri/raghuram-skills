# Tracing a figure, a word or a choice back to the source

How `explainer-video` answers *"where does that number come from?"*, *"why
does it open on that?"* and *"can we say 'will'?"*. A video goes out under
someone's name, gets reposted without its caption, and can't be corrected
quietly. Every figure on screen, every hedge and every editorial choice must
be answerable in one turn, from the source the user gave.

People who question the video are in one of five positions:

- **The author**, about to post it. *"Is 38% right? Where's it from?"*
- **A reviewer who signs it off**: comms, legal, a manager. *"The release
  says 'expected to'. Can we say 'will'?"* *"Is that quote exact?"*
- **The source's owner, or someone in the story.** *"That's not what our
  report says."*
- **The author wanting more punch.** *"Call it a record." "Add why it
  happened." "Make the drop look bigger."*
- **A viewer in the comments**, relayed by the author. *"Source?" "That's
  old data."*

All examples use invented names and figures.

---

## Handles and the closing line

- Scenes are `V1…Vn` in play order, each with its timecode range:
  `V3 · 0:10.4–0:16.3`. In a second cut, prefix the cut:
  `short/V2`.
- Figures on screen are `V3.1, V3.2…` in reading order within the scene.
- Sources are `[A]`, `[B]`… as on the source card.
- A carried-over hedge is `V5.h`: the hedge word and its source sentence.

**Handles never go into the video, the caption or the alt text.** All three
are public. Handles live in the chat handover:

```
ferry.html — 2 cuts. Open in Chrome or Edge; Export video makes the MP4 (this browser: H.264 MP4).

main · 9:16 · 32.9 s
V1 · 0:00.0–0:05.2 · big-number · V1.1 38% (F1, [A] ¶2)
V2 · 0:04.8–0:10.4 · kicker-title · "The busiest year on the water since 2011" ([A] ¶3)
V3 · 0:10.0–0:16.3 · compare-bars · V3.1 1.74m (derived: 2.4m ÷ 1.38) · V3.2 2.4m ([A] ¶2)
V4 · 0:15.9–0:22.1 · quote · Mara Ekström, verbatim ([A] ¶6, cut marked …)
V5 · 0:21.6–0:27.6 · big-number · V5.1 3m · V5.h "could", "estimates" ([A] ¶5) · forecast
V6 · 0:27.0–0:32.9 · source-card · [A] Port Halden Transit Authority annual report, 14 Oct 2026
short · 1:1 · 14.8 s · V1, V3, V6 of main
Left out: the new harbour route and the fare freeze ([A] ¶7, ¶9): the report links neither to the rise.
From your source: every figure. Illustrative: none. Sound: off.

Ask "where does V3.1 come from?" or "why does the video open on V1?" to see the working behind any figure or choice.
```

The handover ends with this closing line, and nothing follows it:

```
Ask "where does <figure> come from?" or "why does the video open on <hook scene>?" to see the working behind any figure or choice.
```

The first slot takes the **first derived figure** on screen (a ratio, a
difference, a share you computed), because that is the one people doubt;
if every figure is copied, the first figure. The second slot is the hook
scene, `V1`. Follow-up replies don't repeat the line, except a trace that
corrects the video and reprints the handover.

## The trace block: for a figure

```markdown
### V3.1 — 1.74m (2025 bar)

**From your source**
> [A] ¶2: "Ridership rose 38% on the previous year, to 2.4 million trips."

**Working**
- 2.4m ÷ 1.38 = 1.739m → **1.74m**, rounded once. The report gives no 2025 total of its own.

**Where it appears**
- main V3 (0:10.0–0:16.3) headline and bar · short V2 · the alt text.

**What would change it**
- A 2025 total stated in the report or another source; it would replace the derived figure.
```

These four headings, **exactly as written**, in this order:

- **From your source**: the sentence, cell or line, verbatim, with its
  locator (`[A] ¶4`, `row "Q3" · Revenue`, `p.12`).
- **Working**: *copied as given*, or the arithmetic with the one rounding
  named.
- **Where it appears**: every scene and timecode, in every cut, plus the
  caption and the alt text. A correction must reach all of them.
- **What would change it**: the input that would change the figure. Not a
  cause, and never an offer of a different period chosen to make a word
  hold.

An **illustrative** figure has no *From your source*. Its first heading is
**Illustrative**: it says the figure was written to show a shape, that it
is labelled on screen and on the source card, and what real figure would
replace it.

## The choice block: for "why does it open on V1?" / "why that scene?"

```markdown
### Why the video opens on V1 (38%)

**The findings the source holds**
1. Trips up 38% year on year, to 2.4m ([A] ¶2) ← chosen
2. Busiest year since 2011 ([A] ¶3)
3. Could reach 3m by 2028, an estimate ([A] ¶5)
4. A new harbour route opened in March ([A] ¶7)

**Why this one**
- The largest change the report states, in its first paragraph; you asked for "the ridership story".

**What the video leaves out**
- 4, and the fare freeze ([A] ¶9): the report doesn't link either to the rise.
```

Give the findings with their figures, mark the chosen one, and give the
reason from the user's request and what the source states. Never a reason
the source can't show (*"it's the most exciting"*).

## The wording block: for "why does V5 say 'could'?" / "say 'will'"

```markdown
### V5 — "could"

**The source says**
> [A] ¶5: "The authority estimates ridership could reach 3 million by 2028."

**The hedge**
- "estimates" + "could": a forecast by the authority, not a measurement.

**On screen**
- V5 kicker "The authority estimates" · line "trips a year could follow by 2028" · units "A forecast, not a measurement".
```

Then hold, unless the user gives a newer source that says otherwise.

---

### For "why is V3 drawn as shops?"

The same block, for a drawing: the thing the finding counts, how it is
drawn (`pictures.md`), and what one unit stands for, in the key's own words.
A finding that is a value gets the same block saying why it is a flat chart
or the figure alone.

```markdown
### Why V3 is a street of shops

**The finding**
- Over 2 million small businesses are customers ([A] slide 7): a count of a real thing.

**Why this picture**
- It counts businesses, so it is drawn as shopfronts, one per 100,000: 20 shops. The key on screen says "1 shop = 100,000 small businesses", and the painter reads 2 million from the ledger, not from a typed number.

**What it doesn't say**
- Nothing past "over": the 20 shops show the floor the source gives, not an exact count.
```

## The questions to expect, and what each answer shows

| They ask | Answer with |
| --- | --- |
| **"Where does V3.1 come from?"** | The trace block. |
| **"Why does it open on V1?"** / *"why not the 2011 line?"* | The choice block, using the user's own request and the size of each finding. |
| **"The release says 'expected to'. Why does V5 say 'will'?"** | The wording block. If the video says more than the source, it is wrong: fix the spec, re-verify every cut (steps 7–8) and reprint the handover. |
| **"Just say 'will', it's punchier."** (pushback) | Hold. Show the wording block and offer honest punch that keeps the hedge: *"on course for 3m, the authority estimates"*, or the figure leading with the hedge in the kicker. Use "set to" or "on track to" only if the source says so. |
| **"Call it a record."** | Only if the source says record. Otherwise hold and quote what it does say: *"[A] ¶3 says 'the highest since 2011', so the video says that."* |
| **"Add a line on why it went up."** | Only a cause the source or the user states, attributed, in their words. If none: *"The report says ridership rose; it doesn't say why. If you know the reason, tell me in your words and I'll add it as yours, or quote someone the report quotes."* **No sample reasons**, not even as wording examples: they go out as fact. |
| **"That's not what the report says, it's 36%."** (pushback) | Re-read the source and quote it. If it says 38%, hold: *"[A] ¶2 says 38%. If 36% is right, I'd need the newer document."* Rebuild only from a newer source, and say what changed. |
| **"Is that quote exact?"** | The verbatim source sentence beside the on-screen text, with each cut marked `…`. |
| **"Is this still current?"** | The source's date and any as-of on the card; and that the video can't know anything after the source. |
| **"Make the drop look bigger."** / *"start the axis higher"* | No. Bars start at zero and nothing exaggerates a change. Offer the change stated in words, or a different finding. |
| **"Can I use this music on Instagram?"** | The soundtrack is generated by code in the file: original, no third-party track (`audio.md`). A track they add is under its own licence. |
| **"Which numbers are real?"** | The handover's *From your source / Illustrative* line, then the illustrative figures' blocks. |
| **"Why is it shops?"** / *"what does one shop mean?"* | The picture's choice block: the thing the finding counts, how it is drawn, and the key's own words. |
| **"Make the pile of people bigger."** | The units are the figure: one dot per person (or per the stated `per`). Offer a bigger frame or a scale the key states, never more units. |
| **"Show all of it."** | One trace block per derived figure, in handle order, then one line per copied figure with its locator. |

## Rules

- **Re-read the source; don't recall the build.** The trace is a second
  reading. That is where it catches a wrong paragraph, a dropped hedge, or a
  derived figure that doesn't reproduce.
- **A trace corrects the video.** A figure or wording that doesn't
  reproduce is fixed in the spec, so every cut, the caption and the alt text
  change together. Then run steps 7–8 again, say the correction first, and
  reprint the handover with the closing line.
- **Pushback alone moves nothing.** Only a source moves a figure or a
  hedge.
