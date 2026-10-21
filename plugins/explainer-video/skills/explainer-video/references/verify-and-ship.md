# Verify and ship (SKILL.md steps 7–8)

Cheapest check first, text reports before pictures, one look at the
contact sheet at the end, then re-read every figure against the source.
Done means `finalize.js` exits 0.

## Step 7 — verify

### 7.1 Stage and run the static check

```
node <skill-dir>/scripts/finalize.js video.html --stage
node <skill-dir>/scripts/check-video.js video.html
```

`--stage` puts `charts-lib/` and `motion-lib/` (with `audit.js`) beside the
page. `check-video.js` compiles every cut with the real engine and checks
shape, timing, numbers, hedges and upgrade words, quotes, copy limits,
determinism and offline-ness. Read every row; fix every FAIL in the spec,
then run it again. A WARN is a judgement call: read it, act on it or say
why not. The `timing` rows print each scene's handle and length: that is
the scene list for the handover.

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

- a scene that throws;
- text outside the safe zone;
- two text layers overlapping;
- text below 24 px;
- contrast under 4.5:1 (3:1 for large text);
- a layer not held still long enough to read;
- nothing readable by 0.5 s;
- the export probe not round-tripping.

It **warns** on single-frame pops and dead time. Fix the spec, never the
check: shorten copy, pick a different scene, lengthen `dur`. Rerun until
every cut has `ok: true`.

The export probe encodes the first 2 s through the real export path and
plays it back. Its `path` (`mp4-h264`, `webm-vp9` or `realtime`) is what
this browser would give the user. Report it.

### 7.3 Look at it once

```js
VideoAudit.run({ cut: 'main' }).then(r => r.contactSheet())
```

returns a PNG data URL: one frame per scene hold and per transition,
labelled with `V` handles and timecodes outside the frames. Look at it (or
take one screenshot of the player at a scene's hold). You are looking for
what no check catches: a chart that doesn't say what its headline says, a
scene that holds two ideas, a hook that isn't the strongest true thing.

### 7.4 Re-read every figure against the source

Go back to the source, not your notes. For each claim: the `verbatim` is
really in the source at the `locator`; the `display` matches it; a derived
figure's `working` reproduces; every hedge from the source is on screen and
in the caption; no word on screen says more than the source does. This is
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
