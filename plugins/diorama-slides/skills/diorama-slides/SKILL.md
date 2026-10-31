---
name: diorama-slides
description: Turn an article, report, history, notes or a table into a short video where a still card of words sits over a living 2.5D diorama stage — one subject changing form era by era, a cast rearranged per measure, a thing built step by step, a place per episode, or a route on a schematic map — 15–60 s (lineups and journeys to 90 s), 9:16, 4:5, 1:1 or 16:9, in the same design system as chart-dashboard, with every figure and hedge faithful to the source and a dated source card. One standalone HTML file that plays and exports MP4 in the browser. Use for "make a video where the thing itself changes / evolves / is built / travels". Not for slide-style explainers with charts (explainer-video) or a cinematic 3D film (documentary-video). No other apps, no CDN, works offline; never posts.
---

# Diorama slides

A short video in one mode: a **card layer** that holds still for the whole
video (the accent bar, the kicker, the headline with its figure, the units,
the source footer, words swapping from beat to beat), drawn over a living
**stage**, a toy-like 2.5D diorama where the story's things change and move.
It sits between slides and a film: the card reads like a slide, the stage
never stops. One standalone HTML page plays it, exports it as MP4 (or WebM)
in the browser that opens it, saves stills, and copies the caption and alt
text. **JavaScript only**: Canvas 2D, WebCodecs, Web Audio. No ffmpeg,
Remotion, WebGL, render pipeline, text-to-speech, AI image or video
generator, GSAP or CDN library, stock footage or music.

`<skill-dir>` below is the directory holding this file
(`${CLAUDE_SKILL_DIR}` where the agent expands it). Resolve `templates/`,
`references/`, `scripts/` and `assets/` against it, never against the working
directory.

**The product is the story's shape and the edit, not the renderer.** You
decide what shape the story has (one thing changing, a cast compared, a
thing built, places visited, a route travelled), then write a spec: the
stage, the beats, the copy, a claims ledger. The engine plays it. Every
thing on the stage you draw yourself, for this video, from the source's
own nouns.

## Rules that hold on every video

1. **Never invent a figure that reads as a measurement.** Every number on
   screen is a ledger claim with a source and a locator, or is labelled
   *illustrative* on screen. A topic with no source gets illustrative
   figures and says so in the frame and in chat, or you ask for a source.
   Never fetch figures from the web unless the user asks and names or
   accepts the source.
2. **Keep the source's certainty.** Hedges survive the edit (*could, up to,
   estimated, projected, about, according to, alleged*). A forecast is
   labelled a forecast. Shortening never upgrades: no *will*, *record*,
   *first* or *best* the source doesn't say.
3. **No cause the source doesn't state.** Not on screen, not in the
   caption, not in the order of beats, not in what the stage shows happening
   next to what, and not in chat as a "likely" reason.
4. **Quotes are verbatim and attributed**; a cut is marked `…`.
5. **Real things only when the source names them.** A car model, a building
   or a brand the source mentions may be shown as that thing; anything it
   doesn't mention is generic, or a fictitious name. A logo comes only from
   a file the user or the source supplies, never drawn from memory; without
   one, the brand's name is set as text. Real people are never drawn as
   likenesses, only as generic figures (`references/stage.md` § Real things).
6. **Sensitive topics stay neutral and non-graphic.** War, disaster,
   illness: no gore, no glorifying framing; tactics are movement and
   formations, never casualties (`references/stage.md` § Sensitive topics).
7. **One idea per beat; the card carries it, the stage shows it.** At most
   one figure or one flat chart in the card. Values are flat charts, never
   3D charts, and a share is never a grid of boxes. The video works
   **muted**: the words on screen are the script.
8. **Everything is readable before it moves on.** The engine holds each
   text layer for max(1.2 s, 0.5 s + 0.25 s/word), a figure 1.5 s after it
   lands. Never set a `dur` below a beat's minimum.
9. **The camera has one angle.** It pans and zooms on the world only; the
   card and every word above or below the stage never zoom or move. One
   transition for the words, every time.
10. **Every cut ends on a source card**: each source with its date, and
    "illustrative" when any figure is.
11. **Deterministic and offline; never post.** Every frame is a pure
    function of `t`; one standalone file; `finalize.js`'s exit code is the
    gate. The user posts, never you.

## Workflow

1. **Read the source and build the claims ledger.** Read
   `references/copy.md`. Pull every figure and quote that could appear on
   screen into `claims`, with `verbatim`, `locator`, `kind` (copied, derived
   with `working`, or illustrative), and any `hedge` or `forecast`. List the
   findings, one sentence each with its number. Note every noun the source
   names that could be drawn (the things, their parts, their places).

2. **Settle format and length, asking at most two questions.** Read
   `references/formats.md`. Ask only what changes the build: where it will
   play (if unstated), and which finding leads (only when two are equally
   strong and the user picked neither). Defaults: 9:16, about 30–45 s,
   preset `default`. Never ask about style, colour, fonts or transitions.

3. **Name the point, decide the shape, then the beats.** Read
   `references/story.md`. First write the video's point with its main
   figure, and what the viewer must *see* happen on the stage to get it
   with the sound off (a speed story: the subject visibly gets faster). The
   shape comes next, from what the source is about, not from its findings
   one by one: **transformation** (one subject, its states),
   **lineup** (a cast on one stage, rearranged per measure), **assembly**
   (a thing built step by step), **episodes** (a place per item) or
   **journey** (a route on a schematic map). Then the beats on the spine
   (hook → states or measures or steps or places → so what → source card),
   about one beat per 3–6 s, and what you leave out. For every beat, write
   `stage.shows`: what the stage does in it that acts out its finding.

4. **Plan the stage and draw its things.** Read `references/stage.md` for
   the shape's grammar, how the story drives the stage (pace from claims,
   halts, things where beats happen), the camera and the kit, and `references/design.md`
   for the look, and `references/motion.md` for how the card and the
   stage each move. Name each thing the stage needs from the source's nouns,
   and its forms (a state's numbers: a length, a wheel, a roof line). A
   plain value finding gets its flat chart in the card
   (`references/video-charts.md`) while the stage stays alive. Never pick
   a thing because a library has one: there is no library.

5. **Copy the template and write the spec.** Copy
   `<skill-dir>/templates/video.html` to `./<slug>.html` (or where the user
   asked) and leave its `charts-lib/…` and `motion-lib/…` script tags
   exactly as written; step 8 folds them in. Read `references/engine-api.md`
   and write the whole spec: `stage` (shape, subject, size, states or cast),
   each beat's copy and `stage` directions; every figure in copy is a claim
   id (`"F1"` or `{F1}`), never typed digits. Fill the caption, the alt text,
   the page's `<title>`, heading and lede.

   Then build it in stages, cheapest check first: stage
   (`finalize.js --stage`) and run `check-video.js` until no FAIL, with no
   browser. Then write the stage's painters **one at a time**, the subject
   first: look at one beat's still, fix it, then the next
   (`references/verify-and-ship.md` § Build in stages).

6. **Sound only if asked.** Read `references/audio.md` before turning
   `meta.audio.score` on.

7. **Verify before reporting done.** Read `references/verify-and-ship.md`
   and follow it in full: `node <skill-dir>/scripts/check-video.js
   <slug>.html` with no FAIL; in a browser, `VideoAudit.run` on every cut
   with `exportProbe: true` until each is `ok`; look at one contact sheet;
   re-read every figure and hedge against the source. Without a browser,
   the static check and the re-read are the floor, and you say the frames
   weren't checked.

8. **Ship one file:** `node <skill-dir>/scripts/finalize.js <slug>.html`.
   A non-zero exit means you are not done. Where Node may be missing, use
   `sh <skill-dir>/scripts/finalize.sh` (or `finalize.ps1` on Windows); it
   prints `UNCHECKED` when it couldn't run the checks, and you say so.

## Output

One HTML file, standalone. Surface it however your environment does (in
Claude Code: `SendUserFile` with `display: "render"`), otherwise print its
absolute path. Make an MP4 on disk only if you can drive a browser and the
user agrees to the download (`verify-and-ship.md` § An MP4 on disk).

Then the handover in chat, short:

- How to use it: open in Chrome or Edge; **Play**, scrub, ←/→ to step
  frames; **Export video** saves the MP4; **Export stills** saves a poster
  and a contact sheet; **Copy caption** and **Copy alt text**. Say which
  export path the probe found.
- The story's shape, and each cut's beats with `V` handles, timecodes, the
  figures each shows and their locators; which things on the stage are
  drawn as named in the source and which are generic; what was left out;
  which figures are from the source and which are illustrative; whether
  sound is on.
- Nothing was posted.
- The closing line, last, nothing after it (`references/tracing.md` §
  Handles and the closing line):

```
Ask "where does V3.1 come from?" or "why is S1 drawn like that?" to see the working behind any figure or picture.
```

Handles are for chat only: never in the video, the caption or the alt
text.

## Tracing

The video puts figures and pictures in public under the user's name. Read
`references/tracing.md` before answering any follow-up about a figure, a
word, a picture on the stage or a choice. It carries the handles (`V1…`,
`V3.1`, `[A]`, `V5.h`, `S2` for a thing on the stage), the trace block
(*From your source · Working · Where it appears · What would change it*),
the picture block, the choice block and the wording block. A trace
re-reads the source and **corrects the video** when it's wrong (spec, every
cut, caption, alt text, then steps 7–8 again). Pushback alone moves nothing.

## Environment notes

Nothing here needs a specific agent or vendor: file reads from this
directory, writing an HTML file, and Node for the scripts and checks. A
browser (a built-in pane, or headless Chrome or Edge) runs the audit and
the export probe when one is available. The user's export runs in their
own Chrome or Edge, which encode H.264; other browsers fall back to WebM
or a real-time recording, and the page says which path ran.
