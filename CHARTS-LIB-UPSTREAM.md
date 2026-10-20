# charts-lib: changes to apply upstream

The skill ships a copy of `charts-lib` in
`plugins/chart-dashboard/skills/chart-dashboard/assets/charts-lib/`, built from
`svg-charts/charts-lib`. `plugins/social-post/skills/social-post/assets/charts-lib/`
holds a second, identical copy, so that plugin installs on its own; everything
below about "the copy" applies to both. When the skill needs a library change, it is written
up here until it lands in `svg-charts`; then the copy is re-synced and the
section is deleted, so that syncing the library again never silently removes
behaviour the skill depends on.

One change is outstanding, proposed and not applied: the copy is still
identical to upstream.

| # | Change | Engine file | State | Needed by |
|---|--------|-------------|-------|-----------|
| 6 | `Charts.validate` judges a line's categories with the renderer's own test | `_build.js` (the `Charts.validate` it emits) | proposed | `references/charts/line.md`; `assets/chart-convert.js` (editable report-table chart columns); any page that calls `Charts.validate('line', …)` over `'Jan'…` or `'Q1'…` |

**Nothing about the library gets fixed only in this repo.** A change is either
written up here as *proposed* and left unapplied, or — when the skill cannot
work without it — applied to the copy *and* written up here so the next sync
doesn't silently drop it. Each section carries a machine-readable `check`
comment, and `plugins/chart-dashboard/skills/chart-dashboard/tests/upstream-notes.test.js` verifies the
copy really is in the state the table claims. See *Recording a new change* at
the bottom.

**Last synced** from `svg-charts` commit `20e11ae` (2026-10-05, `charts-lib`
1.0.0): a bar or column with no category names gets blank labels rather than
its index, formerly change 4 here (all four fallbacks in `engines/bar.js`; the
note had listed three); and a chart that brings in its page's scrollbar is
redrawn at the narrower width, formerly change 5. Before it, `c196b94`: column
and bar labels and tooltips keep a negative value's sign (dropped only under
`tooltip.absoluteX`), formerly change 3. Before that,
`81a9833`: packed bubbles honour a point's own `color`, formerly change 1.
Earlier, `c8588bd`: `centerText` takes a bare string, formerly change 2.
And before that, `185de6f`: heatmap and calendarHeatmap, chart handles with
`update()`/events/`toSVG()`/`toPNG()`, keyboard access, entry animation.
See *Syncing the copy* at the bottom for how, and what to check afterwards.

---

## 6. `Charts.validate` judges a line's categories with the renderer's own test
<!-- check: proposed; file: charts.js; needle: !window.ChartsShared.isContinuousCats(cats) -->

### Problem

`Charts.validate('line', config)` and the line engine disagree about which
category runs a line may cross. The engine refuses unless
`isContinuousCats(categories)` holds: every label a date with a year, or an
ordered run such as `'Jan'…'Dec'`, `'Mon'…'Sun'`, `'Q1'…'Q4'` or `'Week 1'…`.
`validate` instead refuses any label that `Date.parse` and `Number` both
reject. The two answers differ in both directions:

```text
categories             validate()   renderer
'Jan' … 'Mar'          refused      draws
'Q1' … 'Q3'            refused      draws
'Jan 2026', 'Feb 2026' ok           draws
'Jan 5', 'Mar 3'       ok           refuses (no year, not one numbered stem)
'North', 'South'       refused      refuses
```

The library's own comments say the refusal panel and `validate()` should be
one function, so a caller gets the same answer either way. For the line
category check they are two.

### Why the skill needs it

`references/charts/line.md` tells authors that a complete rising run like
`'Jan'…'Jun'` or `'Q1'…'Q4'` is a valid line x-axis, which is what the
renderer does. A page or agent that calls `Charts.validate` first, as the
social-post eval runs did over `'Jan'…'Sep'`, is told the opposite and is
pushed off a line for a trend the renderer would have drawn. The editable
pages hit it too: `assets/chart-convert.js` asks `validate` before offering a
chart type for a report table's chart column, so cells over `'Jan'…'Sep'` are
never offered as a line. The
other direction is quieter:
`validate` passes yearless dates the renderer then draws as an error panel.

### Change

The `Charts.validate` that `_build.js` emits after `Charts.meta`. Ask the
renderer's `isContinuousCats` (already exported on `window.ChartsShared`) for
a line, and keep the `Date.parse` test for histograms, which bin numbers and
have no ordered-name case. Hunk positions are omitted: this was written
against the bundled `charts.js` (line 14240 at `20e11ae`), not an upstream
checkout.

```diff
   if ((type === "line" || type.indexOf("histogram") === 0) && cats && cats.length) {
-    var named = cats.filter(function (c) {
-      return !(c instanceof Date) && isNaN(Date.parse(c)) && isNaN(Number(c));
-    });
-    if (named.length) errors.push(type === "line"
+    // A line asks the renderer's own test, so validate() and the refusal panel agree.
+    var refused = type === "line"
+      ? !window.ChartsShared.isContinuousCats(cats)
+      : cats.some(function (c) {
+          return !(c instanceof Date) && isNaN(Date.parse(c)) && isNaN(Number(c));
+        });
+    if (refused) errors.push(type === "line"
       ? "A line chart needs a continuous or temporal x-axis, but xAxis.categories holds named categories. Use column, or give each category its own series over a date/numeric x."
       : "A histogram bins numbers and cannot use named categories. Counting how often each name occurs is a bar chart: use column.");
   }
```

### Apply and verify

Apply in `svg-charts`, rebuild, and run its tests. Then for each row of the
table above, `Charts.validate('line', { xAxis: { categories }, series: [{ data }] }).ok`
equals whether `Charts.line` draws a line rather than its error panel.
Histogram validation is unchanged.

### Current state

Proposed, not applied. The skill does not need it to work: `line.md` says
`validate` refuses `'Jan'…` and `'Q1'…` runs today and to pass dated labels
(`'Jan 2026'`…) when calling it, and `scripts/check-page.js` judges line axes
on its own.

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
cp $U/charts.js $U/theme.js $U/charts.css $U/charts.manifest.json \
  claude-chart-dashboard/plugins/social-post/skills/social-post/assets/charts-lib/
```

Then, in this repo:

1. Re-apply every section above marked *applied in the skill copy*, and run
   `node --test plugins/chart-dashboard/skills/chart-dashboard/tests/*.test.js`.
   `upstream-notes.test.js` fails if an applied change went missing, or if a
   proposed one has landed upstream (then delete its section). Then
   `node --test plugins/social-post/skills/social-post/tests/*.test.js`:
   `shared-files.test.js` fails if the two copies differ.
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
