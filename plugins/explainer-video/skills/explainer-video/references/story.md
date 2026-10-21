# The story: spine, hook, budget, cuts

**The product is the edit.** Any tool can animate text. What makes this
video worth posting is three choices: which finding opens it, one idea per
scene with time to read it, and what gets left out. Make them in that order,
before writing any spec.

## The spine

A fixed spine with a variable middle, like a deck's:

| Beat | In a 30 s cut | Job | Scene types |
| --- | --- | --- | --- |
| **Hook** | 0–5 s | The single most surprising *true* thing, with its number if it has one. On screen by 0.5 s. | `big-number`, `hook-headline` |
| **Context** | one scene | What happened, who, when, in one line. Skip it if the hook already says it. | `kicker-title`, `timeline` |
| **Evidence** | 2–4 scenes | One finding each, each with its figure and at most one chart. | `big-number`, `compare-bars`, `trend-line`, `share-split`, `ranked-list`, `before-after`, `quote`, `steps` |
| **So what** | optional | Only an implication **the source states**, attributed. Skip it if the source states none. | `kicker-title`, `quote` |
| **Source card** | last 3 s | Every source with its date; "illustrative" when any figure is. Always present. | `source-card` |
| **Outro** | optional | The user's own name, logo or call to action, if they gave one. | `outro` |

The compiler sets each scene's real length from its words (`copy.md` §
Read time), so the spine's times are a guide. Write the copy, compile, and
read the per-scene durations `check-video.js` prints.

## Scene budget

About one scene per 3–5 s:

| Length | Scenes |
| --- | --- |
| 15 s | hook, 1–2 evidence, source card |
| 30 s | hook, context, 2–3 evidence, source card |
| 45 s | hook, context, 3–5 evidence, so-what, source card |
| 60 s | hook, context, up to 7 evidence, source card |

Beyond 60 s, say it is a long video for a feed and suggest two shorter
ones from the same spec (`formats.md` § Cuts).

## Picking the hook

This is the main judgement call. Take, in order:

1. the finding the user asked about;
2. else the largest change the source *states* (not one you compute and
   frame as bigger);
3. else the most concrete number in the lede.

Write the hook in the source's own register. A superlative goes in only if
the source says it in those words. "Highest since 2011" stays exactly that.
Never round it up to "record", "biggest ever" or "first". When two findings
are about equally strong and the user picked neither, ask which leads (one
question, the two candidates with their numbers). The choice block in
`tracing.md` is how you explain the pick later.

## One idea per scene

A scene carries one finding. If a sentence in the source holds two
figures, the stronger one gets the scene and the other goes in the
units line or a scene of its own. A scene that needs "and" in its headline
holds two ideas.

## What to leave out, and saying so

Every source holds more than the video can carry. Leave out, in this order:

1. background the viewer doesn't need to follow the findings;
2. the weakest evidence: the smallest change, the figure with the most
   caveats, the one needing the most context;
3. findings that need a chart the frame can't hold (more than six bars,
   more than one line).

List what you left out in the handover. Never leave out a hedge, a caveat
the source attaches to a figure you kept, or the source card.

## A shorter cut of the same story

A 15 s cut is not the 30 s cut sped up. Drop scenes, never read time:

1. drop the context scene;
2. drop the weakest evidence scenes until the budget fits;
3. keep the hook and the source card, always.

Cuts share one spec and one ledger, so a figure is correct in every cut at
once (`formats.md` § Cuts).

## No cause the source doesn't state

Two facts in the same article are two facts. If the source says ridership
rose and, three paragraphs later, that a route opened, the video does not
say the route caused the rise. That holds for the words, for the order of
scenes that implies it ("New route" right before "Ridership up 38%"), and
for the caption. A cause goes in only when the source states it, attributed
in its words ("the authority credits the new route").
