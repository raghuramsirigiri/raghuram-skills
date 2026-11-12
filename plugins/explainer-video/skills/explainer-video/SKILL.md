---
name: explainer-video
description: Turn an article, news story, report findings, insights, notes or a table into a short explainer video — scene after scene with flat charts, each finding that counts a real thing drawn as that thing for this video (cars, shops, people), 15–60 s, 9:16 for Reels/Shorts/TikTok, 1:1, 4:5 or 16:9 — rendered entirely in JavaScript in the same design system as chart-dashboard and social-post, as one standalone HTML file that plays the video and exports it as MP4 in the browser, with every figure and hedge faithful to the source and a dated source card. Use for "make a video / reel / short / animated explainer / motion graphic from this". Not for still social cards (social-post) or slide decks. No other apps, no CDN, works offline; never posts.
---

# Explainer video

Turn content that is already true into a short motion-graphics video: one
self-contained HTML page that plays the video, exports it as MP4 (or WebM)
in the browser that opens it, saves stills, and copies the caption and alt
text. **JavaScript only**: Canvas 2D and the browser's own WebCodecs and Web
Audio. No ffmpeg, Remotion, Playwright render pipeline, text-to-speech, AI
image or video generator, GSAP or CDN library, stock footage or stock music.

`<skill-dir>` below is the directory holding this file
(`${CLAUDE_SKILL_DIR}` where the agent expands it). Resolve `templates/`,
`references/`, `scripts/` and `assets/` against it, never against the working
directory.

**The product is the edit, not the renderer.** You write a spec (scenes,
copy, a claims ledger, sources), and the engine renders it. The craft is
choosing which true finding opens the video, giving each scene one idea and
time to read it, and keeping every number and hedge exactly as the source
has it.

## Rules that hold on every video

1. **Never invent a figure that reads as a measurement.** Every number on
   screen is a ledger claim with a source and a locator, or is labelled
   *illustrative* on screen. A topic with no source gets illustrative figures
   and says so in the frame and in chat, or you ask for a source. Never fetch
   figures from the web unless the user asks and names or accepts the source.
2. **Keep the source's certainty.** Hedges survive the edit (*could, up to,
   estimated, projected, preliminary, according to, alleged, about*). A
   forecast is labelled a forecast. Attribution verbs stay. Shortening never
   upgrades: no *will*, *record* or *first* the source doesn't say.
3. **No cause the source doesn't state.** Not on screen, not in the caption,
   not in the scene order, and not in chat as a "likely" reason or a sample
   wording.
4. **Quotes are verbatim and attributed**; a cut is marked `…`. No drawn
   likeness of a real person, no fake UI of a real product, no real outlet's
   or brand's identity unless the user supplied it as their own.
5. **One idea per scene; the frame carries it.** At most one chart per
   scene. The story works **muted**: there is no voiceover, so the on-screen
   text is the script.
6. **Everything is readable before it moves on.** The engine holds each text
   layer for max(1.2 s, 0.5 s + 0.25 s/word), and a big number 1.5 s after it
   lands. Never set a `dur` below a scene's minimum.
7. **Every cut ends on a source card**: each source with its date, and
   "illustrative" when any figure is. Then, optionally, the user's outro.
8. **Deterministic and offline.** Every frame is a pure function of `t`.
   One standalone file; `finalize.js`'s exit code is the gate.
9. **Never post, publish or upload.** The user does.

## Workflow

1. **Read the source and build the claims ledger.** Read `references/copy.md`.
   Pull every figure and quote that could appear on screen into `claims`, with
   `verbatim`, `locator`, `kind` (copied, derived with `working`, or
   illustrative), and any `hedge` or `forecast`. List the findings, each as
   one sentence with its number. No source: rule 1.

2. **Settle format and length, asking at most two questions.** Read
   `references/formats.md`. Ask only what changes the build: where it will
   play (if unstated), and which finding leads (only when two are about
   equally strong and the user picked neither). Otherwise use the defaults:
   9:16, 30 s, preset `default`. Never ask about style, colour, fonts, music
   or transitions.

3. **Write the story on the spine and pick the hook.** Read
   `references/story.md`. Hook → context → evidence → (so what) → source
   card, about one scene per 3–5 s. List what you leave out.

4. **Choose each scene's type, draw each finding's own thing, and the
   look.** Read `references/scenes.md` and `references/video-charts.md`
   (data shape → scene, honest motion). Every video is slides, scene after
   scene with flat charts; the continuous 2.5D world
   (`references/continuous.md`) only when the user asks for it. Then read
   `references/pictures.md` and sort each finding by what it is. A count or
   share of a **real thing** (people, cars, shops, cups) you draw yourself
   for this video, as a custom painter (`pictures.md` § Drawing the
   finding's own thing, under its contract in `references/motion.md` §
   Custom scenes). A value, a rate or a share with no thing of its own (a
   margin, a ratio, a mix) is the figure or its **flat** chart. Never draw a
   chart in 3D, never draw a share with no thing as a grid of boxes or dots,
   and never swap a drawing for a chart because the drawing is harder. Never
   add a picture, prop or layout rule to the skill to fit one story. Read
   `references/design.md` for the preset, and for a brand recolour when the
   user gave brand colours, a site or a logo (run `scripts/generate-theme.js`
   or `extract-theme.js`; the palette goes in `meta.palette`).

5. **Copy the template and write the spec.** Copy
   `<skill-dir>/templates/video.html` to `./<slug>.html` (or where the user
   asked) and leave its `charts-lib/…` and `motion-lib/…` script tags exactly
   as written; step 8 folds them in. Read `references/engine-api.md` and write
   the whole spec: `meta.style` (`"slides"`, or `"continuous"` only when
   asked), and a `custom` scene with its painter for each finding that is a
   real thing; every figure in copy is a claim id
   (`"F1"` or `{F1}`), never typed digits. Fill the caption and the alt
   text, and the page's `<title>`, heading and lede around the player.

   Then build it in stages, cheapest check first, so a mistake costs one
   scene and not a re-render: stage (`finalize.js --stage`) and run
   `check-video.js` until no FAIL, with no browser yet. Then write the
   custom painters **one at a time**: audit that scene alone
   (`VideoAudit.run({ cut, scenes: ['<id>'] })`), look at its still, fix it,
   then write the next (`references/verify-and-ship.md` § 7.0).

6. **Sound only if asked.** Read `references/audio.md` before turning
   `meta.audio.score` on.

7. **Verify before reporting done.** Read `references/verify-and-ship.md` and
   follow it in full: run `node <skill-dir>/scripts/check-video.js
   <slug>.html` and fix every FAIL; once every scene has passed on its own,
   in a browser, `VideoAudit.run` on every cut with `exportProbe: true` until
   each is `ok`; look at one contact sheet;
   re-read every figure and hedge against the source. Without a browser, the
   static check and the re-read are the floor, and you say the frames weren't
   checked.

8. **Ship one file:** `node <skill-dir>/scripts/finalize.js <slug>.html`. A
   non-zero exit means you are not done. Where Node may be missing, use
   `sh <skill-dir>/scripts/finalize.sh` (or `finalize.ps1` on Windows) with
   the same arguments; it prints `UNCHECKED` when it couldn't run the checks,
   and you say so.

## Output

One HTML file, standalone. Surface it however your environment does (in
Claude Code: `SendUserFile` with `display: "render"`), otherwise print its
absolute path. Make an MP4 on disk only if you can drive a browser and the
user agrees to the download (`verify-and-ship.md` § An MP4 on disk).

Then the handover in chat, short:

- How to use it: open in Chrome or Edge; **Play**, scrub, ←/→ to step
  frames; **Export video** saves the MP4; **Export stills** saves a poster
  and a contact sheet; **Copy caption** and **Copy alt text**. Say which
  export path the probe found (H.264 MP4, VP9 WebM, or the real-time
  fallback).
- Each cut's scenes with `V` handles, timecodes, the figures each shows and
  their source locators; what was left out; which figures came from the
  source and which are illustrative; whether sound is on (with the rights
  line from `audio.md`).
- Nothing was posted.
- The closing line, last, nothing after it (`references/tracing.md` §
  Handles and the closing line):

```
Ask "where does V3.1 come from?" or "why does the video open on V1?" to see the working behind any figure or choice.
```

The worked handover is in `references/tracing.md`. Handles are for chat
only: never in the video, the caption or the alt text.

## Tracing

A video puts figures in public under the user's name. Read
`references/tracing.md` before answering any follow-up about a figure, a
word or a choice. It carries the handles (`V1…`, `V3.1`, `[A]`, `V5.h`), the
trace block (*From your source · Working · Where it appears · What would
change it*), the choice block, the wording block, and the questions to
expect: *"where does V3.1 come from?"*, *"why open on V1?"*, *"say 'will',
it's punchier"*, *"call it a record"*, *"add why it happened"*, *"it's 36%,
not 38%"*. A trace re-reads the source and **corrects the video** when it's
wrong (spec, every cut, caption, alt text, then steps 7–8 again). Pushback
alone moves nothing.

## Environment notes

Nothing here needs a specific agent or vendor: file reads from this
directory, writing an HTML file, and Node for the scripts and checks. A
browser (a built-in pane, or headless Chrome or Edge) runs the audit and the
export probe when one is available. The user's export runs in their own
Chrome or Edge, which encode H.264. Other browsers fall back to WebM or a
real-time recording, and the page says which path ran.
