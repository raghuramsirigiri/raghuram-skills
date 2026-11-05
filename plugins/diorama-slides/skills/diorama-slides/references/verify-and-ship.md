# Verify and ship (SKILL.md steps 7–8)

Cheapest check first, text reports before pictures, one look at the
contact sheet at the end, then re-read every figure against the source.
Done means `finalize.js` exits 0.

## Build in stages (step 5)

A video built in one go shows every mistake at the end, and each fix costs
a whole re-render. Build it so each check is the cheapest one that can
catch the mistake:

1. **The spec, no browser.** Write the claims, the shape, the stage's
   states or cast and every beat; stage and run the static check (§ 7.1)
   until it has no FAIL. It compiles every cut in seconds, so wrong ids,
   typed figures, dropped hedges, copy limits, an unknown state, a missing
   painter and timing surface here.
2. **The world, a beat at a time.** Register the world with the hook's
   action, serve the folder (§ 7.2), and look at that beat; then add the
   next beat's action and look again:

   ```js
   const r = await VideoAudit.run({ cut: 'main', scenes: ['e2'] });
   JSON.stringify({ ok: r.ok, fails: r.fails, warns: r.warns });
   r.stills()[0].png      // the beat at the middle of its hold
   ```

   Look at a frame in the middle of each action too (`videoPlayer.seek(t)`
   between two beats): it must read at every point, not only at the ends.
   Rerun only the beat you changed to check a fix.
3. **The whole video, once.** When every beat has passed on its own, run
   § 7.2 in full: it adds the checks that need the whole cut (the hook by
   0.5 s, pops, frozen stretches, the export probe).

A thing that fails the same check twice gets simpler (fewer parts, a
smaller zoom, a look that keeps it in its room), never swapped for a chart
or a box.

## Step 7 — verify

### 7.1 Stage and run the static check

```
node <skill-dir>/scripts/finalize.js video.html --stage
node <skill-dir>/scripts/check-video.js video.html
```

`--stage` puts `charts-lib/` and `motion-lib/` (with `audit.js`) beside the
page. `check-video.js` compiles every cut with the real engine and checks
the shape and its painters, timing and length, numbers (in copy and on the
stage's labels), hedges and upgrade words, quotes, copy limits,
determinism (and that stage words go through `api.label`) and
offline-ness. Read every row; fix every FAIL in the spec,
then run it again. A WARN is a judgement call: read it, act on it or say
why not. The `timing` rows print each beat's handle and length: that is
the beat list for the handover.

### 7.2 Run the audit in a browser

Serve the folder over HTTP (`file://` blocks parts of the export check),
open the page at about 1440×900 in Chrome or Edge (the built-in browser,
or headless over CDP), and run in the page:

```js
await new Promise(r => { const s = document.createElement('script'); s.src = 'motion-lib/audit.js'; s.onload = r; document.head.append(s); });
JSON.stringify(await Promise.all(Object.keys(Motion.readSpec().cuts).map(cut =>
  VideoAudit.run({ cut, exportProbe: true }).then(r => ({ cut, ok: r.ok, fails: r.fails, warns: r.warns, path: r.stats.exportPath })))))
```

It paints every frame of every cut with instrumentation on, which takes
seconds, and **fails** on:

- a beat that throws;
- text outside the safe zone;
- two text layers overlapping;
- text below 24 px;
- contrast under 4.5:1 (3:1 for large text);
- a layer not held still long enough to read;
- nothing readable by 0.5 s;
- the export probe not round-tripping;
- `stage`: what the world draws under the beat's focus mark, while it holds,
  leaving the frame, or a stage label touching it.

Stage labels ride the world, so they are judged for size, contrast and the
subject, not for holding still. It **warns** on single-frame pops, a stage
that stops for longer than a beat's read (`frozen`), a beat whose world
looks the same as if its insight had never happened (`action`: it repaints
the beat with its time, progress and rates taken from the beat before, and
measures what share of the stage visibly differs in look or motion, so a
small thing that clearly appears counts and a camera that only drifts doesn't;
redirect the beat, or say in `shows` why its value lives in the card),
and a beat whose hold frame
covers less than 60% of the safe area (`formats.md` § Layout per format;
`stats.fill` lists every beat's figure). Fix the spec, never the
check: shorten copy, change the zoom or the look, lengthen `dur`. Rerun until
every cut has `ok: true`.

The export probe encodes the first 2 s through the real export path and
plays it back. Its `path` (`mp4-h264`, `webm-vp9` or `realtime`) is what
this browser would give the user. Report it.

### 7.3 The cold read, then look at it once

Your own eye knows what each thing is meant to be, so it can't tell
whether the drawing says it. Before the contact sheet, show each hero
alone to a reader who hasn't been told the topic:

```js
(await VideoAudit.things()).map(h => ({ id: h.id, png: h.png }))
```

Hand the pictures, and nothing else (no topic, no names, no spec), to a
fresh reader: a subagent, a new chat, or a person. Ask for each: what is
it, as specifically as you can; how sure, 0–100; what looks wrong or
makes it hard to tell. A thing passes when it is named as itself (or as
the generic thing the video says it is) at 60 or more, and no answer
says a part looks detached, stuck on, missing or generic. Otherwise fix
exactly what the answer names, reading `stage.md` § Drawing the story's
things (step 3) again, and show the new drawing to another fresh reader,
not the same one. Stop after three rounds and say in the handover which
thing still reads weakly and how.

When a reader can't name a thing at all after a round, the drawing may be
missing what the thing really looks like rather than how it's drawn: look
that one thing up (a reference photo and the names of its parts, in an
encyclopedia or a museum's page), redraw it, and say in its picture block
(`tracing.md`) what you looked up and where. Never look up figures this
way; the claims ledger still comes only from the source.

With no fresh reader available, judging your own drawing is not the cold
read, and the handover says it wasn't done. Do the joint check instead,
on each hero's picture alone, since it catches the faults readers name
most often: every limb, bill, wing, fin and engine starts inside the body
it hangs from (not beside it, not flat on it); a join shows no rim, step
or change of colour (if it does, the two parts become one loft, its
colour changing at a ring); a body swells and tapers
rather than running as one even tube; each leg bends and ends in a foot;
a wing or fin has a root where it meets the body and lies at the angle it
would in life, and is a sheet or a flattened loft, never one flat face; every identity feature (`stage.md` § Real things) is drawn
and faces the camera. Fix what fails, and list in the handover each hero
with what the joint check fixed, so the user knows which drawings no
fresh eye has seen.

Then the whole video:

```js
VideoAudit.run({ cut: 'main' }).then(r => r.contactSheet())
```

returns a PNG data URL: one frame per beat hold and per transition (the
middle of each change), labelled with `V` handles and timecodes outside
the frames. Look at it as an illustrator would, against `stage.setting`
and `stage.look`, before anything else. It is **not done** while any of
these is true, whatever the checks say:

- the world isn't where the story happens (a board, a blank floor, things
  lifted out of their place to stand in a row);
- things look like cut-outs or diagrams instead of what they are (an
  animal without a body, a planet without its sky);
- the world is mostly greys (the audit's `colour` warning);
- a beat's frame isn't the hero shot `stage.look` describes.

Then what else no check catches: a change whose middle reads as neither
state, a chart that doesn't say what its headline says, a hook that isn't
the strongest true thing. Your own notes that something "looks weak" are
a reason to keep going, not a caveat for the handover.

### 7.4 Re-read every figure against the source

Go back to the source, not your notes. For each claim: the `verbatim` is
really in the source at the `locator`; the `display` matches it; a derived
figure's `working` reproduces; every hedge from the source is on screen and
in the caption; no word on screen says more than the source does. Then the
stage: every claim feature on a thing (what changed, what was added, what
it had at a time: a fin, an open top, a charging post) is one the source
names; every identity feature of a real thing that the source doesn't
describe is listed as chosen without the source; and nothing real appears
that the source doesn't mention (`stage.md` § Real things, brands and
people). This is
where a wrong paragraph or a dropped "could" is caught.

**Without a browser**, 7.1 and 7.4 are the floor. Say plainly in the
handover that the frames weren't checked in a browser and the export path
wasn't probed.

## Step 8 — ship

```
node <skill-dir>/scripts/finalize.js video.html
```

It re-runs the static check, inlines every library file in load order
(never `audit.js`), removes the staged folders when they hold only what
this skill staged, and runs `check-video.js --final`, which insists on one
standalone file. **A non-zero exit means you are not done.**

If Node may be missing: `sh <skill-dir>/scripts/finalize.sh video.html`
(or `scripts/finalize.ps1` on Windows), with the same arguments. It prints
`UNCHECKED` when it could not run the checks, and you say so.

## An MP4 on disk

The HTML is the deliverable: the user opens it and clicks **Export video**.
Make an MP4 yourself only when your environment can drive a browser *and*
the user agrees to the download. Then click Export in the page, or call
`Motion.exportVideo()` and save the blob. Name it `<title>-<cut>.mp4`, and
keep it out of any plugin folder.
