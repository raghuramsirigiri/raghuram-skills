# Tracing a figure, a picture, a word or a choice back to the source

How `diorama-slides` answers *"where does that number come from?"*, *"why
is the lamp drawn with a sprung arm?"*, *"can it be the real brand's
lamp?"* and *"why open on 1920?"*. This skill puts two kinds of claim in
public: the figures in the card, and the **pictures on the stage**, which
say "this is what the thing looked like". Both must be answerable in one
turn, from the source the user gave.

Who asks, and what they ask:

- **The author**, before posting. *"Is 40 W right?" "Did the 1956 lamp
  really have a sprung arm, or did you make that up?"*
- **A reviewer who signs it off.** *"Is that our logo or a drawing of it?"
  "Where did the factory on the stage come from?"*
- **The source's owner.** *"Our history never says the shade was cloth."*
- **The author wanting more.** *"Make it the real lamp." "Add their logo."
  "Say it was the first." "Add why it changed." "Show the fire in the
  factory, it's dramatic."*
- **A viewer in the comments**, relayed. *"Source?" "That's not what the
  1920 one looked like."*

All examples use an invented story: a lamp maker's history.

---

## Handles and the closing line

- Beats are `V1…Vn` in play order, each with its timecode range:
  `V3 · 0:11.2–0:16.8`. In a second cut, prefix the cut: `square/V2`.
- Figures in the card are `V3.1, V3.2…` in reading order within the beat.
- Sources are `[A]`, `[B]`… as on the source card.
- A carried-over hedge is `V5.h`: the hedge word and its source sentence.
- **Things on the stage are `S1, S2…`**: the subject is `S1`, then each
  other thing in the order it first appears. A thing's form in one state
  is `S1@1956`.

**Handles never go into the video, the caption or the alt text.** Handles live in the chat handover:

```
kestrel.html — 1 cut, transformation. Open in Chrome or Edge; Export video makes the MP4 (this browser: H.264 MP4).

main · 9:16 · 34.2 s
V1 · 0:00.0–0:06.1 · hook · V1.1 40 W ([A] ¶3) · S1@1920
V2 · 0:05.8–0:12.0 · S1@1956 · "A sprung arm let the shade move" ([A] ¶5)
V3 · 0:11.7–0:18.4 · S1@1988 · V3.1 11 W · V3.h "about" ([A] ¶7)
V4 · 0:18.1–0:25.0 · bars · V4.1 2.1m (derived: 0.7m × 3) · V4.2 3.4m ([A] ¶8)
V5 · 0:24.7–0:34.2 · source card · [A] Kestrel Lighting company history, 2 May 2026
Stage: S1 the lamp, in three forms from [A] ¶3, ¶5, ¶7 · S2 a workbench ([A] ¶2). Generic: the base. Real brands: none.
Left out: the 1971 factory move ([A] ¶6): the history gives no figure and no form for it.
From your source: every figure. Illustrative: none. Sound: off.

Ask "where does V4.1 come from?" or "why is S1 drawn like that?" to see the working behind any figure or picture.
```

The handover ends with this closing line, and nothing follows it:

```
Ask "where does <figure> come from?" or "why is <thing> drawn like that?" to see the working behind any figure or picture.
```

The first slot takes the **first derived figure** in the card (the one
most likely to be questioned), else the hook's figure. The second takes
**S1**, the subject. Those are the two most-asked questions about this
kind of video: a number, and whether the picture is true.

---

## The trace block (a figure)

For *"where does V4.1 come from?"*, four headings, in this order:

**From your source**
> "Sales tripled in the decade after the arm was added, from 0.7 million a year." ([A] ¶8)

**Working**
0.7m × 3 = 2.1m a year. Derived, not printed in the source; rounded once.

**Where it appears**
V4 (bar label and the headline), the caption. Not on the stage.

**What would change it**
A source sentence giving the later figure directly; or "tripled" meaning
something else in context. Either and I'll rebuild with the stated figure.

Re-read the source for every trace; never answer from the ledger alone. If
the trace finds the video wrong, say so first, then fix the spec, every
cut, the caption and the alt text, run steps 7–8 again, and reprint the
handover with its closing line.

## The picture block (a thing on the stage)

For *"why is S1 drawn like that?"* or *"did it really have a sprung
arm?"*, four headings, in this order:

**What the source says**
> "In 1956 the Kestrel Angle added a sprung arm, so the shade could be moved and held." ([A] ¶5)

**What I drew from it**
S1@1956: the 1920 brass stem shortened, a two-part arm with a spring, the
shade on its end. The arm's 0–1 in the form brings it in as the lamp
changes.

**What I chose without the source**
The arm's proportions and the base's shape: the source gives no
dimensions, so they are drawn to read as a lamp at phone size, in the toy
style. No colour, maker's mark or real lamp's likeness. Its motion: it
swings because ¶5 says the shade "could be moved"; how far is chosen.

**What would change it**
A photo or a description from you or the source (the arm's length, a
second spring). I'll redraw S1 and keep everything else.

A picture block never claims more than the source names. When a feature
on the stage turns out not to be in the source, say so plainly and remove
it, as a figure would be corrected.

## The choice block (an editorial choice)

For *"why open on V1?"*, *"why a transformation and not a lineup?"*, *"why
is the 1971 move left out?"*: what was chosen, the rule behind it (`story.md`),
the alternatives with their numbers or nouns, and what would change it.
One short paragraph each; no new figures.

## The wording block (a word or a hedge)

For *"say it will reach 5 million"*, *"call it the first"*, *"add why
sales rose"*:

- Quote the source sentence with its hedge or its missing claim.
- Say what the video keeps and why (`copy.md` § Hedges, SKILL.md rules 2
  and 3).
- Offer wording that is punchy **and** true: "Kestrel expects up to 5
  million" for a forecast, "one of the first" only if the source says so.
- For a cause: no cause the source doesn't state, and **no sample
  reasons**. Offer to add one the user states as theirs (attributed to
  them) or a sentence the source states.

## Questions that tempt invention, and the answer

- **"Make it the real lamp / the real car / their building."** If the
  source names that model, it may be drawn as that thing, from what the
  source describes. If not, it stays generic (`stage.md` § Real things).
- **"Add their logo."** Only from a file the user or the source supplies;
  never drawn from memory. Without one, the name goes in the card as text.
- **"Draw the founder."** A generic figure, named in the card if the source
  names them; never a likeness.
- **"Show the fire / the battle / the crash, it's dramatic."** No: the
  stage stays neutral and non-graphic (`stage.md` § Sensitive topics). Offer
  what the source supports: the place, the movement, the figure in the card.
- **"Make the drop look bigger" / "zoom in on the number."** Bars start at
  zero, and the camera never zooms the card. Offer a beat that states the
  change in words.
- **"Why does it move so slowly / so fast?"** Answer from the beat's
  `stage.shows` and its pace: a pace bound to a claim is that claim in
  proportion (quote it); a halt is where the source stops. If the stage's
  motion doesn't act out the finding, that's a fault in the video: fix the
  pace or the action, not the words.
- **"It's 44 W, not 40."** Re-read the source. If it says 40 W, quote it
  and hold. If it says 44 W, correct every cut and say so. Pushback alone
  moves nothing.
