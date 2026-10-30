# Step 7: render and ship

Fold the film into one page, play it once through, export the MP4, and
report.

## Staging, from the start

Before step 4, stage a working folder so the sheet and the player open in a
browser while the film is made:

```
node <skill>/scripts/finalize.js <folder> --stage
```

It copies `film-lib/`, `film.html` and `sheet.html` into `<folder>`. The
steps write their files into `<folder>/film/`. Open `sheet.html` (step 4) and
`film.html` (steps 5-6) from a local web server or the browser pane; both
load `film/` fresh on every reload.

## Finishing

```
node <skill>/scripts/finalize.js <folder> --name <file-name>
```

It re-runs the screenplay and bible checks, then folds `film.html`, the
film-lib scripts and `film/cast.js`, `world.js` and `shots.js` into
`<folder>/<file-name>.html`. That file stands alone: it opens offline by
double-click, plays, and has an **Export MP4** button. It exits non-zero and
writes nothing if a check fails or a script would still load from a file.

Then:
1. Open the finished page and play it once through at full size. The
   warnings line under the player must be empty.
2. Export: the button renders every frame at 30 fps (not in real time, so
   nothing drops) and saves an H.264 MP4, or a WebM where H.264 isn't
   available. A 60-90 second 720p film takes from about 10 s (a city of simple blocks) to about a minute (a landscape of hundreds of trees and rocks), and 30-45 MB. For
   1080p, set `size: [1920, 1080]` in `window.FILM_META`.
3. Hand over the `.html` and the `.mp4`. The `film/` folder stays beside them:
   it is how a later request changes one scene.

## The report

Short, in this order:
- The film in one line: its logline and length.
- What it shows: the beats as a list of claims, each with its handle
  (`B5 · C9 · 38% of online drivers`), so the reader can trace any number.
- What the film left out: claims in the brief that no beat uses, and why.
- Anything still weak (a shot you'd redo with more time).
- The closing line from `references/tracing.md`.

Never say the film is done before it has played once through and exported.
