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
| 6 | `Charts.validate` refuses the line categories the renderer refuses | `_build.js` (the `Charts.validate` it emits) | proposed (half landed in `bce8986`) | `references/charts/line.md`; any page that calls `Charts.validate('line', …)` over yearless dates |

**Nothing about the library gets fixed only in this repo.** A change is either
written up here as *proposed* and left unapplied, or — when the skill cannot
work without it — applied to the copy *and* written up here so the next sync
doesn't silently drop it. Each section carries a machine-readable `check`
comment, and `plugins/chart-dashboard/skills/chart-dashboard/tests/upstream-notes.test.js` verifies the
copy really is in the state the table claims. See *Recording a new change* at
the bottom.

**Last synced** from `svg-charts` commit `27adc7b` (2026-10-16, `origin/main`,
`charts-lib` 1.0.0). Twenty-four commits since `20e11ae`; the ones a page
author sees: a missing line value (`null`, `NaN`, in any data form) is a gap
on every line type, the spline included (`fafac06`); `Charts.validate('line')`
accepts the ordered runs the renderer draws (`'Jan'…`, `'Q1'…`), half of
change 6 (`bce8986`); donut slices and single-series packed bubbles take the
palette in order instead of a black-to-blue ramp (`e472726`); value prefix,
suffix and decimals reach labels and axis ticks through one formatter
(`2c19182`); dumbbells take `better` and default `%` deltas to points, and
reference lines break around value labels (`c75fec0`, `00d247f`); waterfalls take
`isOpening`; column `negativeColor` honours `threshold`; scatter-family
tooltips name their numbers by axis title (`27adc7b`); the svg's name is an
`aria-label`, not a `<title>`; live `addPoint` draws once per frame. It also
adds automatic charts (`Charts.suggest` / `autoFill` / `auto`), which the
skill's references tell authors not to use. `feat/preset-style-identity`
(`df8d7c8`, style tokens per preset) was not merged to main and is not in the
copy. Before this, `20e11ae` (2026-10-05): blank bar labels for missing
category names, formerly change 4, and a redraw at the narrower width when a
chart brings in its page's scrollbar, formerly change 5. Before it, `c196b94`:
column and bar labels keep a negative value's sign, formerly change 3.
Before that, `81a9833`: packed bubbles honour a point's own `color`,
formerly change 1. Earlier, `c8588bd`: `centerText` takes a bare string,
formerly change 2. And before that, `185de6f`: heatmap and calendarHeatmap,
chart handles with `update()`/events/`toSVG()`/`toPNG()`, keyboard access,
entry animation.
See *Syncing the copy* at the bottom for how, and what to check afterwards.

---

## 6. `Charts.validate` refuses the line categories the renderer refuses
<!-- check: proposed; file: charts.js; needle: !window.ChartsShared.isContinuousCats(cats) -->

### Problem

`Charts.validate('line', config)` and the line engine disagree about which
category runs a line may cross. The engine refuses unless
`isContinuousCats(categories)` holds: every label a date with a year, or an
ordered run such as `'Jan'…'Dec'`, `'Mon'…'Sun'`, `'Q1'…'Q4'` or `'Week 1'…`.

`bce8986` fixed one direction: `validate` now asks `isContinuousCats` first,
so the ordered runs pass. But when that test says no, `validate` still falls
back to its old one, which only refuses labels that `Date.parse` and `Number`
both reject, so anything `Date.parse` accepts slips through:

```text
categories             validate()   renderer
'Jan' … 'Mar'          ok           draws       (fixed in bce8986)
'Q1' … 'Q3'            ok           draws       (fixed in bce8986)
'Jan 2026', 'Feb 2026' ok           draws
'Jan 5', 'Mar 3'       ok           refuses     (no year, not one numbered stem)
'North', 'South'       refused      refuses
```

The library's own comments say the refusal panel and `validate()` should be
one function, so a caller gets the same answer either way.

### Why the skill needs it

`references/charts/line.md` tells authors to give dates a year because
`validate` passes yearless ones the chart then draws as an error panel. A page
or agent that trusts `validate` over `'Jan 5'…` ships that panel. The
skill works without the change: `scripts/check-page.js` judges line axes on
its own.

### Change

`_build.js`, the `Charts.validate` it emits after `Charts.meta`. For a line,
let `isContinuousCats` decide outright; keep the `Date.parse` test for
histograms, which bin numbers and have no ordered-name case, and for a line
only when `ChartsShared` is absent.

```diff
   '    var seq = type === "line" && window.ChartsShared && window.ChartsShared.isContinuousCats(cats);',
-  '    var named = seq ? [] : cats.filter(function (c) {',
-  '      return !(c instanceof Date) && isNaN(Date.parse(c)) && isNaN(Number(c));',
-  '    });',
-  '    if (named.length) errors.push(type === "line"',
+  '    var refused = type === "line" && window.ChartsShared',
+  '      ? !window.ChartsShared.isContinuousCats(cats)',
+  '      : !seq && cats.some(function (c) {',
+  '          return !(c instanceof Date) && isNaN(Date.parse(c)) && isNaN(Number(c));',
+  '        });',
+  '    if (refused) errors.push(type === "line"',
```

### Apply and verify

Apply in `svg-charts`, rebuild, and run its tests. Then for each row of the
table above, `Charts.validate('line', { xAxis: { categories }, series: [{ data }] }).ok`
equals whether `Charts.line` draws a line rather than its error panel.
Histogram validation is unchanged.

### Current state

Proposed, not applied; the first two rows of the table landed upstream in
`bce8986` and are in the copy.

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
