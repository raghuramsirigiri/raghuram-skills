# charts-lib: changes to apply upstream

The skill ships a copy of `charts-lib` in
`skills/chart-dashboard/assets/charts-lib/`, built from
`svg-charts/charts-lib`. That copy currently carries a change the upstream
library doesn't have yet. Apply each one in `svg-charts`, rebuild, and re-sync
the copy, so that syncing the library again doesn't silently remove behaviour
the skill depends on.

| # | Change | Engine file | State | Needed by |
|---|--------|-------------|-------|-----------|
| 1 | Packed bubbles honour a point's own `color` | `engines/scatter.js` | applied in the skill copy | Editor Style tab, "Bubble colours" |
| 2 | `centerText` accepts a bare string | `engines/pie.js` | proposed — not applied anywhere | Donut/pie center labels that are words, not a number |

**Nothing about the library gets fixed only in this repo.** A change is either
written up here as *proposed* and left unapplied, or — when the skill cannot
work without it — applied to the copy *and* written up here so the next sync
doesn't silently drop it. Each section carries a machine-readable `check`
comment, and `skills/chart-dashboard/tests/upstream-notes.test.js` verifies the
copy really is in the state the table claims. See *Recording a new change* at
the bottom.

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
5. Re-sync the skill's copy and confirm it matches:
   ```bash
   cp svg-charts/charts-lib/charts.js claude-chart-dashboard/skills/chart-dashboard/assets/charts-lib/charts.js
   ```
   After that, `diff -rq` between the two `charts-lib` folders should report
   only the files that exist upstream alone (README, engines, tests, and so
   on).
6. Remove this section from this note.

### Current state

- **Skill copy** (`skills/chart-dashboard/assets/charts-lib/charts.js`):
  includes the change, committed on `feat/editable-pages` as `7582126`.
- **`svg-charts`**: unchanged. Rebuilding there and copying `charts.js` into
  the skill before applying this change would remove per-bubble colours.

---

## 2. `centerText` accepts a bare string

<!-- check: proposed; file: charts.js; needle: Charts._centerText -->

### Problem

`plotOptions.pie.centerText` on `Charts.donut` / `Charts.pie` only honours an
object. The center-label block reads `ct.value`, `ct.label`, `ct.color` and
`ct.valueFontSize`, and falls back to the series total when `ct.value` is
undefined. So a bare string is truthy, `ct.value` is undefined, and the ring
prints its total instead of the string:

```js
// draws "100", not "Final mile"
Charts.donut('el', { series: [...], plotOptions: { pie: { centerText: 'Final mile' } } });
```

Nothing warns; it just looks like a bug to the caller.

### Why the skill needs it

The center of a donut is where the skill puts the finding
(`references/chart-selection.md` § Pie and donut), and that finding is often a
word or a phrase, not a number. `centerText: 'Final mile'` is the obvious way
to write it, and every other text-ish option in the library takes a string.

### Change

`charts-lib/engines/pie.js`, at the center label, plus a small normaliser next
to the engine:

```diff
       // Center label
       if (plotOpts.centerText) {
-        const ct = plotOpts.centerText;
+        const ct = Charts._centerText(plotOpts.centerText);
```

```js
/*
 * centerText accepts the full object, or a bare string/number as shorthand for
 * { value }. `true` (and any other non-object) keeps the old behaviour: no
 * value of its own, so the ring's total is drawn.
 */
Charts._centerText = function (ct) {
  if (ct && typeof ct === 'object') return ct;
  if (typeof ct === 'string' || typeof ct === 'number') return { value: ct };
  return {};
};
```

Placed immediately after the donut IIFE (`Charts.donut = Chart; })();`) so
`Charts.pie`, which delegates to `Charts.donut`, gets it too.

Behaviour is otherwise unchanged: the object form passes through untouched, and
`centerText: true` — or an object without `value` — still prints the ring's
total.

### Apply and verify

1. Make both edits above in `svg-charts/charts-lib/engines/pie.js`.
2. Rebuild and run the library tests:
   ```bash
   cd svg-charts/charts-lib
   node _build.js
   node --test test/*.test.js
   ```
3. Suggested new test: `Charts._centerText` maps `'Final mile'` and `42` to `{ value }`, passes an object through, and
   returns `{}` for `true` and `undefined` so the total fallback survives.
4. Worth adding to the README's donut section: *`centerText` takes
   `{ value, label, valueFontSize, color }`, or a bare string/number as
   shorthand for `value`; omit `value` to print the ring's total.*
5. Re-sync the skill's copy as in change 1.
6. Remove this section and its table row, and update the `centerText` bullet in
   `references/chart-api.md` — it currently warns callers off the bare string.

### Also worth doing upstream

The donut and pie `keyOptions` in `charts.manifest.json` list `centerText` by
name only, which is what let the object shape go unnoticed. Spell it out
there: `centerText: { value, label, valueFontSize, color }, or a bare
string/number for value; omit value for the ring total`. The manifest is
generated upstream, so it has to change there, not in the skill's copy.

### Current state

- **Skill copy** (`skills/chart-dashboard/assets/charts-lib/charts.js`):
  unchanged — the bare string still prints the ring total.
- **`svg-charts`**: unchanged.
- **Skill docs**: `references/chart-api.md` warns callers to always use the
  object form, and says what the bare string does instead. That warning is
  what to delete once this lands upstream.

---

## Recording a new change

When you change anything under `skills/chart-dashboard/assets/charts-lib/`:

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
3. Run `node --test skills/chart-dashboard/tests/upstream-notes.test.js`.

Reference docs under `references/` and the skill's own tests are the skill's,
not the library's — change them freely, and only note them in a section when
upstream's README or manifest needs the same wording.
