# charts-lib: changes to apply upstream

The skill ships a copy of `charts-lib` in
`plugins/chart-dashboard/skills/chart-dashboard/assets/charts-lib/`, built from
`svg-charts/charts-lib`. When the skill needs a library change, it is written
up here until it lands in `svg-charts`; then the copy is re-synced and the
section is deleted, so that syncing the library again never silently removes
behaviour the skill depends on.

Two changes are outstanding, both proposed and not applied: the copy is still
identical to upstream.

| # | Change | Engine file | State | Needed by |
|---|--------|-------------|-------|-----------|
| 4 | A bar or column with no category name gets a blank label, not its index | `engines/bar.js` | proposed | `templates/slides.html` report table; any `bar`/`column` cell in a `reportTable` |
| 5 | A chart that brings in the page scrollbar is redrawn at the narrower width | `engines/_shared.js` | proposed | `templates/dashboard.html` and `dashboard-editable.html` table; any self-sizing chart that makes its page scroll |

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

## 5. A chart that brings in the page scrollbar is redrawn at the narrower width
<!-- check: proposed; file: charts.js; needle: el.style.minHeight = el.offsetHeight -->

### Problem

A self-sizing chart (`table`, `reportTable`, `barInsightTable`, `barList`) can
be the thing that makes its page tall enough to scroll. It measures
`container.clientWidth` before it has drawn, when there is no vertical
scrollbar yet. Once drawn, the scrollbar appears and the container narrows by
its width (15–17px), but the SVG keeps the wider width and overflows the cell.

The resize observer should catch that and redraw, but it doesn't.
`makeResponsive` records the width a chart was "drawn at" by reading
`el.clientWidth` *after* the draw, which is already the narrower width. So the
observer sees no change.

```text
dashboard.html as shipped, 1062x995 viewport:
  #c2 (table)  cell 970px  svg 986px   → audit: overflow-x by 16 on #c2
redraw the same table once the page already scrolls:
  #c2 (table)  cell 970px  svg 970px
```

### Why the skill needs it

`templates/dashboard.html` and `dashboard-editable.html` both put a table in a
full-width flow row, and the layout audit (SKILL.md step 7) fails both
templates as shipped: `overflow-x` on the table and `clipped-x` on its cell.
Every dashboard whose table pushes the page past one screen inherits it. The
clipped strip is the table's right edge, often its last column of numbers.

### Change

`charts-lib/engines/_shared.js`, `makeResponsive`. There are two parts, and
both are needed:

1. **Record the width the engine measured.** Read it before the draw, not
   after. The observer then sees the scrollbar's narrowing as a resize and
   redraws once.
2. **Hold the container's height during a redraw.** Without this, emptying a
   self-sizing chart can drop the page's scrollbar again. The engine would then
   measure the wide width, draw, bring the scrollbar back, and be resized again
   forever.

Hunk positions are omitted: this was written against the bundled `charts.js`
(`makeResponsive`, lines 609–624 at `c196b94`), not an upstream checkout.

```diff
+    // The width the engine is about to measure. Read after drawing instead, it
+    // misses the case where the drawing itself changed the width — a chart
+    // that makes the page tall enough to scroll narrows its own container by
+    // the scrollbar, and the observer below would never redraw it.
+    let drawnW = el ? Math.round(el.clientWidth) : 0;
     let inner = runFactory(factory, container, opts, emitter);
     if (el && animates(opts)) animateEnter(el, opts);
     let destroyed = false;
     let frame = 0, ro = null;
-    let drawnW = el ? Math.round(el.clientWidth) : 0;
     let drawnH = el ? Math.round(el.clientHeight) : 0;
@@
       const before = reason === 'update' && el && animates(opts) ? captureMarks(el) : null;
+      // Hold the container's height across the redraw. Emptied, a self-sizing
+      // chart collapses, the page can lose its scrollbar, and the engine would
+      // measure the width it had before the scrollbar — then draw, bring the
+      // scrollbar back, and be resized again, without end.
+      const hold = el ? el.style.minHeight : '';
+      if (el) el.style.minHeight = el.offsetHeight + 'px';
       inner.destroy();
+      if (el) drawnW = Math.round(el.clientWidth);
       inner = runFactory(factory, container, opts, emitter);
+      if (el) { el.style.minHeight = hold; drawnH = Math.round(el.clientHeight); }
       if (before) animateUpdate(el, before, opts);
-      if (el) { drawnW = Math.round(el.clientWidth); drawnH = Math.round(el.clientHeight); }
       emitter.emit('render', { reason: reason });
```

### Apply and verify

Apply in `svg-charts`, rebuild, and run its tests. Then open
`templates/dashboard.html` from this repo, staged, in a window short enough
that the table makes the page scroll, and run the layout audit. The table's
SVG should match its cell (970/970 at 1062x995, 1349/1349 at 1440x900), the
audit should report no `overflow-x` or `clipped-x`, and a `MutationObserver` on
the chart should see no further redraws once it settles. I tried the diff on a
throwaway staged copy, not on the vendored file, and got exactly that: one
corrective redraw, then none, and window resizes still redraw. The thing to
recheck upstream is `update()` with an animation: the height hold is released
before `animateUpdate` runs, so the animation should see the chart at its own
height.

### Current state

Proposed, not applied. Nothing in the skill breaks outright: the table is
clipped by its scrollbar's width, and the browser audit names it. Until it
lands, a page author who sees `overflow-x` on a table that otherwise fits can
ignore it if the overflow equals the scrollbar width (`innerWidth -
document.documentElement.clientWidth`).

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
   shape of the one above: **Problem**, **Why the skill needs it**,
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
