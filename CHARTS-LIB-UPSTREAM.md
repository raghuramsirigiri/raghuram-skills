# charts-lib: changes to apply upstream

The skill ships a copy of `charts-lib` in
`plugins/chart-dashboard/skills/chart-dashboard/assets/charts-lib/`, built from
`svg-charts/charts-lib`. When the skill needs a library change, it is written
up here until it lands in `svg-charts`; then the copy is re-synced and the
section is deleted, so that syncing the library again never silently removes
behaviour the skill depends on.

**One change is outstanding, proposed only.** The copy is still identical to
upstream; change 3 below is written up for `svg-charts` and not applied here.

| # | Change | Engine file | State | Needed by |
|---|--------|-------------|-------|-----------|
| 3 | Column and bar labels and tooltips keep a negative value's sign | `engines/bar.js` | proposed | Any change, delta or profit/loss chart with values below zero |

**Nothing about the library gets fixed only in this repo.** A change is either
written up here as *proposed* and left unapplied, or — when the skill cannot
work without it — applied to the copy *and* written up here so the next sync
doesn't silently drop it. Each section carries a machine-readable `check`
comment, and `plugins/chart-dashboard/skills/chart-dashboard/tests/upstream-notes.test.js` verifies the
copy really is in the state the table claims. See *Recording a new change* at
the bottom.

**Last synced** from `svg-charts` commit `81a9833` (2026-09-23, `charts-lib`
1.0.0): packed bubbles honour a point's own `color`, formerly change 1 here.
Before it, `c8588bd`: `centerText` takes a bare string, formerly change 2.
Before that, `185de6f`: heatmap and calendarHeatmap, chart handles with
`update()`/events/`toSVG()`/`toPNG()`, keyboard access, entry animation.
See *Syncing the copy* at the bottom for how, and what to check afterwards.

---

## 3. Column and bar labels and tooltips keep a negative value's sign
<!-- check: proposed; file: charts.js; needle: const shownValue = v => (opts.tooltip && opts.tooltip.absoluteX) -->

### Problem

`Charts.column` and `Charts.bar` pass every value through `Math.abs()` before
they write a data label or a tooltip line. So a negative bar is drawn below
zero, and the axis under it reads `-2`, but its label and tooltip read as if
it were positive:

```js
Charts.column('wow', {
  title: 'Week-over-week change',
  xAxis: { categories: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'] },
  tooltip: { valueSuffix: '%' },
  series: [{ name: 'Change', data: [3.1, -2.5, 1.2, -0.8],
             dataLabels: { enabled: true, format: '{y}%' } }]
});
// labels:   3.1%  2.5%  1.2%  0.8%       (should be -2.5%, -0.8%)
// tooltips: "Change: 2.5%" for Wk 2
```

`dataLabels.format` doesn't help, because `{y}` is filled with the absolute
value too. The same happens without a format, and in `Charts.bar`.

The `abs()` is there for the population pyramid. One side is plotted as
negative numbers only so it mirrors the other, and it should read as positive
counts. The README's recipe for that shape already sets
`tooltip.absoluteX: true`, and the bar engine already uses that flag to strip
the sign from its value-axis ticks. The labels and tooltip ignore the flag
and strip the sign for every chart.

The `columnpyramid` series type is not the population pyramid. It draws each
column as a triangle, so it is not a reason to drop signs either.

### Why the skill needs it

For values that cross zero, `references/chart-selection.md` recommends a
column chart with `negativeColor`, and `references/chart-api.md` notes that
column and bar labels are on by default. In the skill's evals, four
separate runs of the weekly sign-ups dashboard (`chart-dashboard-workspace/`,
iterations 8 and 9) drew a week-over-week change chart. Each run found that a
fall read as a rise, and each one got around it by turning the labels off or
dropping the chart. A wrong sign reverses the finding, and nothing in the
rendered page shows that the sign was dropped.

### Change

`charts-lib/engines/bar.js`. Add one helper next to `formatValue`, and use it
at the three places that now call `Math.abs()` on a value for display. Only a
chart that opts in with `tooltip.absoluteX` still drops the sign, as its axis
already does.

```diff
@@ -407,6 +407,11 @@
       return (s.valuePrefix || '') + addCommas(raw) + (s.valueSuffix || '');
     }
 
+    // A value as shown in a label or tooltip. Signed, except in a population
+    // pyramid (tooltip.absoluteX), where one side is plotted negative only to
+    // mirror it and should read as a positive count, like its axis does.
+    const shownValue = v => (opts.tooltip && opts.tooltip.absoluteX) ? Math.abs(v) : v;
+
     // Filled by render(), read by drawBar(): how many stacked segments sit
     // either side of zero for each category.
     const segsPerSide = [];
@@ -722,8 +727,8 @@
       if (s.dataLabels && s.dataLabels.enabled) {
         const val = (p.y != null) ? p.y : (p.high != null ? `${p.low}–${p.high}` : '');
         const label = s.dataLabels.format
-          ? String(s.dataLabels.format).replace('{y}', Math.abs(val))
-          : (typeof val === 'number' ? fmtY(Math.abs(val)) : val);
+          ? String(s.dataLabels.format).replace('{y}', shownValue(val))
+          : (typeof val === 'number' ? fmtY(shownValue(val)) : val);
 
         // Estimated label width — the engines size text without measuring it.
         const labelW = String(label).length * T.valueSize * 0.60;
@@ -839,7 +844,7 @@
         const p = s.points[idx]; if (!p) return;
         let val;
         if (p.low != null && p.high != null) val = `${formatValue(p.low, s)} – ${formatValue(p.high, s)}`;
-        else if (p.y != null) val = formatValue(Math.abs(p.y), s);
+        else if (p.y != null) val = formatValue(shownValue(p.y), s);
         else return;
         html += `<div style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:9px;height:9px;background:${cssColor(s.color)};border-radius:2px"></span><span style="color:${cssColor(T.labelColor)}">${esc(s.name)}: </span><b style="color:${cssColor(T.titleColor)}">${esc(val)}</b></div>`;
       });
```

This also fixes a smaller bug. A `columnrange` series with a
`dataLabels.format` used to label its bars `NaN`, because `Math.abs()` was
applied to the `"low–high"` string. The string now passes through unchanged.

A pyramid built without `tooltip.absoluteX` will now show its negative side
signed, both in its labels and on its axis. That matches what its config
says. The README and `references/chart-api.md` already name the flag as part
of the recipe.

Not part of this change: in a vertical `Charts.column` pyramid, the flag
still doesn't strip the sign from the value-axis ticks. Only the horizontal
branch at the `absoluteX` tick label handles it.

### Apply and verify

1. Make the edit above in `svg-charts/charts-lib/engines/bar.js`.
2. Rebuild and run the library tests:
   ```bash
   cd svg-charts/charts-lib
   npm run dist
   node --test test/*.test.js
   ```
   On a copy of `svg-charts` at `81a9833` with this change applied: 463
   tests, 461 passed, 0 failed. The build alone, without `npm run dist`,
   fails only the stale-`charts.min.js` check.
3. Suggested new tests:
   - A column series `[3.1, -2.5]` with `dataLabels: { enabled: true,
     format: '{y}%' }` renders the label text `-2.5%`. Its tooltip line
     contains `-2.5`.
   - A stacked `Charts.bar` with one series all negative and
     `tooltip.absoluteX: true` renders labels and tooltips with no `-`.
4. Worth adding to the README's column/bar section: *labels and tooltips
   show the value's sign; `tooltip.absoluteX` drops it (population pyramids)*.
5. Re-sync the skill's copy (*Syncing the copy* below). Then
   `upstream-notes.test.js` will fail on this section's `proposed` check.
   That is the signal to delete this section and its table row, to remove
   the interim workaround from `references/chart-api.md` (Column & bar,
   *Negative values*), and to remove the pointer to it in
   `references/chart-selection.md`.

### Current state

- **Skill copy** (`plugins/chart-dashboard/skills/chart-dashboard/assets/charts-lib/charts.js`):
  unchanged. It still drops the sign. `references/chart-api.md` documents
  the gap and a workaround, and `references/chart-selection.md` links to it
  from the "Values that cross zero" row.
- **`svg-charts`**: unchanged at `81a9833`.
- **Reproduced** with a page staged by `scripts/finalize.js --stage`. The
  unpatched copy labels the week-over-week series `3.1% 2.5% 1.2% 0.8%`, and
  its tooltip reads `Change: 2.5%`. The value axis keeps its `-2` / `-4`
  ticks. With the change applied to the staged copy, the labels and tooltips
  read `-2.5%` and `-0.8%`. Stacked pyramids with `tooltip.absoluteX`, in
  both `Charts.bar` and `Charts.column`, still read `120`, `140`, and so on.

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
