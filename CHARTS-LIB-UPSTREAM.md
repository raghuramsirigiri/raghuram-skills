# charts-lib: changes to apply upstream

The skill ships a copy of `charts-lib` in
`plugins/chart-dashboard/skills/chart-dashboard/assets/charts-lib/`, built from
`svg-charts/charts-lib`. When the skill needs a library change, it is written
up here until it lands in `svg-charts`; then the copy is re-synced and the
section is deleted, so that syncing the library again never silently removes
behaviour the skill depends on.

One change is outstanding, proposed and not applied: the copy is still
identical to upstream.

| # | Change | Engine file | State | Needed by |
|---|--------|-------------|-------|-----------|
| 4 | A bar or column with no category name gets a blank label, not its index | `engines/bar.js` | proposed | `templates/slides.html` report table; any `bar`/`column` cell in a `reportTable` |

**Nothing about the library gets fixed only in this repo.** A change is either
written up here as *proposed* and left unapplied, or — when the skill cannot
work without it — applied to the copy *and* written up here so the next sync
doesn't silently drop it. Each section carries a machine-readable `check`
comment, and `plugins/chart-dashboard/skills/chart-dashboard/tests/upstream-notes.test.js` verifies the
copy really is in the state the table claims. See *Recording a new change* at
the bottom.

**Last synced** from `svg-charts` commit `c196b94` (2026-09-27, `charts-lib`
1.0.0): column and bar labels and tooltips keep a negative value's sign
(dropped only under `tooltip.absoluteX`), formerly change 3 here. Before it,
`81a9833`: packed bubbles honour a point's own `color`, formerly change 1.
Before that, `c8588bd`: `centerText` takes a bare string, formerly change 2.
And before that, `185de6f`: heatmap and calendarHeatmap, chart handles with
`update()`/events/`toSVG()`/`toPNG()`, keyboard access, entry animation.
See *Syncing the copy* at the bottom for how, and what to check afterwards.

---

## 4. A bar or column with no category name gets a blank label, not its index
<!-- check: proposed; file: charts.js; needle: Array.from({ length: rowCount }, () => '') -->

### Problem

When `xAxis.categories` is missing, `Charts.bar` and `Charts.column` label each
category with its position: `0`, `1`, `2`. A row number is never a name, and in
the commonest case, a single category, it reads as a data value:

```js
Charts.bar('cell', {
  series: [
    { name: 'Before', data: [35] },
    { name: 'After',  data: [12] }
  ]
});
// draws both bars, and a "0" beside them where the category name would go
```

It is most visible in a `reportTable` chart cell. Every row repeats the `0`
beside its bars, on the left of a column readers scan for numbers.

### Why the skill needs it

The deck template's report table drew its before/after bars exactly like this,
two named series and no categories, and printed a stray `0` in every row. The
template now names the bars with categories, and `references/charts/report-table.md`
says to. But nothing on the page tells an author that the `0` is a row number
rather than a value, so the next page built the other way ships the same
mistake.

### Change

`charts-lib/engines/bar.js`. Fall back to a blank label rather than the index
at the three places the engine builds category labels. Hunk positions are
omitted: this was written against the bundled `charts.js` (lines 3996, 4249
and 4278 at `c196b94`), not an upstream checkout. A blank row label also
narrows the bar gutter, since `rowLabelWidth` measures the text it is given.

```diff
     const rowLabelCats = categories.length
-      ? categories : Array.from({ length: rowCount }, (_, i) => i);
+      ? categories : Array.from({ length: rowCount }, () => '');
@@
           catLayout = layoutCategoryAxis(
-            categories.length ? categories : Array.from({ length: n }, (_, i) => i),
+            categories.length ? categories : Array.from({ length: n }, () => ''),
             IW, T.labelSize, M.b, monthNames(resolveTheme(opts)));
@@
           rowLabels = layoutRowLabels(
-            categories.length ? categories : Array.from({ length: n }, (_, i) => i),
+            categories.length ? categories : Array.from({ length: n }, () => ''),
             M.l - titleX - 10, IH / Math.max(1, n), T.labelSize);
```

### Apply and verify

Apply in `svg-charts`, rebuild, and run its tests. Then draw the example above:
the bars have no label beside them and start closer to the left edge. A chart
with `xAxis.categories` is unchanged.

### Current state

Proposed, not applied. The skill does not need it to work: the template names
its bars with categories, and `report-table.md` tells authors to do the same.

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
   carry anything a page author needs into `references/chart-api.md` (shared
   options) or `references/charts/<type>.md` (one engine),
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
