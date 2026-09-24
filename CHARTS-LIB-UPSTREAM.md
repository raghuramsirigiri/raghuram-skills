# charts-lib: changes to apply upstream

The skill ships a copy of `charts-lib` in
`plugins/chart-dashboard/skills/chart-dashboard/assets/charts-lib/`, built from
`svg-charts/charts-lib`. That copy currently carries a change the upstream
library doesn't have yet. Apply each one in `svg-charts`, rebuild, and re-sync
the copy, so that syncing the library again doesn't silently remove behaviour
the skill depends on.

| # | Change | Engine file | State | Needed by |
|---|--------|-------------|-------|-----------|
| 1 | Packed bubbles honour a point's own `color` | `engines/scatter.js` | applied in the skill copy | Editor Style tab, "Bubble colours" |

**Nothing about the library gets fixed only in this repo.** A change is either
written up here as *proposed* and left unapplied, or — when the skill cannot
work without it — applied to the copy *and* written up here so the next sync
doesn't silently drop it. Each section carries a machine-readable `check`
comment, and `plugins/chart-dashboard/skills/chart-dashboard/tests/upstream-notes.test.js` verifies the
copy really is in the state the table claims. See *Recording a new change* at
the bottom.

**Last synced** from `svg-charts` commit `c8588bd` (2026-09-23,
`charts-lib` 1.0.0: `centerText` takes a bare string, formerly change 2 here;
before it `185de6f`: heatmap and calendarHeatmap, chart handles with
`update()`/events/`toSVG()`/`toPNG()`, keyboard access, entry animation).
See *Syncing the copy* at the bottom for how, and what to check afterwards.

---

## 1. Packed bubbles honour a point's own `color`

<!-- check: applied; file: charts.js; needle: b.p.color || -->

### Problem

`Charts.packedBubble` ignores `color` on a data point. With one series,
every bubble is shaded from the size gradient (`gradientStart` →
`gradientEnd`). With several series, every bubble takes its series colour.
So this config draws "a" in the gradient colour, not red:

```js
Charts.packedBubble('el', {
  series: [{ name: 'Mentions', data: [{ name: 'a', y: 5, color: '#B31B38' }, ['b', 9]] }]
});
```

Every other per-mark chart already honours a point's `color`: donut and pie
slices, waffle panels, bar list rows, and column and bar points.

### Why the skill needs it

The editable-page editor (`assets/page-editor.js`) offers per-bubble colours
on the Style tab. `ChartConvert.style.markColour('packedBubble', …)` writes
`{ name, y, color }` onto the point. Without this change the config is saved
but the drawn bubble doesn't change colour.

### Change

`charts-lib/engines/scatter.js`, in the packed-bubble layout, where each
bubble's fill is chosen:

```diff
       flat.forEach(b => {
         const t = (maxV === minV) ? 1 : Math.sqrt((b.p.y - minV) / (maxV - minV));
         b.r = minR + t * (maxR - minR);
-        b._fillColor = (n === 1) ? grad[Math.min(99, Math.floor(t * 99))] : b.s.color;
+        // A bubble's own color wins; otherwise one series is shaded by size
+        // and several series take their series color.
+        b._fillColor = b.p.color || ((n === 1) ? grad[Math.min(99, Math.floor(t * 99))] : b.s.color);
       });
```

`b.p` is the point as normalised earlier in the same file. An object point
is copied with `Object.assign({}, d)`, so `color` is already on it. Array
points (`[name, value]`) have no colour and keep today's behaviour.

### Apply and verify

1. Make the edit above in `svg-charts/charts-lib/engines/scatter.js`.
2. Rebuild and run the library tests:
   ```bash
   cd svg-charts/charts-lib
   node _build.js
   node --test test/*.test.js
   ```
   All 270 tests passed with this change applied.
3. Suggested new test: a single-series packed bubble with one point carrying
   `color` draws that bubble's `<circle>` with that fill. The other bubbles
   keep their gradient fills.
4. Worth adding to the README's packed-bubble section: *a point's `color`
   overrides the size gradient (one series) or the series colour (several)*.
5. Re-sync the skill's copy (*Syncing the copy* below) and confirm it
   matches: after that, `diff -rq` between the two `charts-lib` folders
   should report only the files that exist upstream alone (README, engines,
   tests, `esm/`, `types/`, `charts.bundle.js`, `charts.min.js`,
   `charts.d.ts`, and so on).
6. Remove this section from this note.

### Current state

- **Skill copy** (`plugins/chart-dashboard/skills/chart-dashboard/assets/charts-lib/charts.js`):
  includes the change. First committed on `feat/editable-pages` as
  `7582126`, and re-applied by hand after the sync to `svg-charts` `185de6f`
  (the engine line is unchanged upstream, so the diff above still applies).
- **`svg-charts`**: unchanged as of `185de6f`. Copying a fresh `charts.js`
  into the skill without re-applying this change removes per-bubble colours.

---

## Syncing the copy

The skill vendors four files, not upstream's one-file `charts.min.js`: the
templates, `scripts/inline-lib.js`, `scripts/finalize.js` and the theming
scripts all expect `theme.js` and `charts.js` separately, so a brand theme can
be applied between them.

```bash
U=svg-charts/charts-lib
S=claude-chart-dashboard/plugins/chart-dashboard/skills/chart-dashboard/assets/charts-lib
(cd $U && node _build.js && node --test test/*.test.js)
cp $U/charts.js $U/theme.js $U/charts.css $U/charts.manifest.json $S/
```

Then, in this repo:

1. Re-apply every section above marked *applied in the skill copy*, and run
   `node --test plugins/chart-dashboard/skills/chart-dashboard/tests/*.test.js`.
   `upstream-notes.test.js` fails if an applied change went missing, or if a
   proposed one has landed upstream (then delete its section).
2. Read upstream's `git log` and the diff of its agent docs
   (`.agents/skills/charts-lib/`) and `README.md` since the last sync, and
   carry anything a page author needs into `references/chart-api.md`,
   `references/chart-selection.md` and the manifest-driven parts of the
   editor (`assets/chart-convert.js`, `assets/page-editor.js`). A new chart
   type needs a selection entry, not just an API entry.
3. Refresh the copies under `examples/`: the staged `charts-lib/` folders
   get the same files, and the inlined pages get the new `charts.js` in
   place of the old `<script>` block. Open each and check it draws with no
   console errors.
4. Update **Last synced** at the top of this note.

## Recording a new change

When you change anything under `plugins/chart-dashboard/skills/chart-dashboard/assets/charts-lib/`:

Default to *proposed*: write it up, leave the copy alone. Apply it to the copy
only when the skill is broken without it, and say so in the section.

1. Add a row to the table at the top and a section below it, following the
   shape of the two above: **Problem**, **Why the skill needs it**,
   **Change** (as a diff against the upstream engine file, not the bundle),
   **Apply and verify**, **Current state**.
2. Give the section a check comment on its own line, right under the heading:
   ```
   <!-- check: proposed; file: charts.js; needle: <a distinctive string from the change> -->
   ```
   `applied` asserts the needle is present in that file under
   `assets/charts-lib/`; `proposed` asserts it is absent. Pick a needle that
   appears only in this change.
3. Run `node --test plugins/chart-dashboard/skills/chart-dashboard/tests/upstream-notes.test.js`.

Reference docs under `references/` and the skill's own tests are the skill's,
not the library's — change them freely, and only note them in a section when
upstream's README or manifest needs the same wording.
