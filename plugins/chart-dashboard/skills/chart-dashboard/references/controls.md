# Controls, if the page has any

Read this only when you are actually adding a dropdown or a filter — most pages
don't need one, and the last section here is about when a control is the wrong
answer to begin with. But a half-wired control is worse than none, so if you are
adding one, read the whole thing.

A dropdown that doesn't change the charts is worse than no dropdown: it reads as
a broken page, and the reader stops trusting the numbers that *are* correct. So
either add no controls at all — a static page is a perfectly good deliverable —
or wire them completely. There is no acceptable middle.

Wiring completely means three things, and the third is the one that gets missed:

1. **The data is filtered, not just the label.** Keep the full dataset in one
   `const DATA`, derive the filtered rows inside a `render(state)` function, and
   have every affected chart drawn *inside* that function, through a `draw()`
   helper that **destroys the previous chart in that container first**.
   Re-calling a factory clears the container, but the old chart's
   `ResizeObserver` (and a zoomable line's `window` listeners) survive it. On
   every resize after that, each stale config repaints (the pre-filter chart
   flashes up) before the current one, and the pile grows with each filter
   change:

   ```js
   const handles = {};
   function draw(factory, id, config) {
     if (handles[id]) handles[id].destroy();
     return (handles[id] = factory(id, config));
   }
   ```
2. **Every dependent panel re-renders**, including KPI tiles and any note that
   quotes a number. A grid where two panels respond to the filter and four don't
   is the same broken-trust failure in a subtler form.
3. **Action titles re-compute.** This is the trap in the combination of the two
   features. The moment a title states a finding — "The top two categories drive
   90% of volume" — that sentence is a *function of the filtered data*, and a
   filter that leaves it frozen makes the page assert something false about what
   is on screen. So the title must be built from the same filtered rows:

   ```js
   const DATA = [ /* every row, unfiltered */ ];

   function render(state) {
     const rows = DATA.filter(r => state.region === 'all' || r.region === state.region)
                      .sort((a, b) => b.value - a.value);
     const total = rows.reduce((s, r) => s + r.value, 0);
     const topTwo = rows.slice(0, 2).reduce((s, r) => s + r.value, 0);
     const share = Math.round(100 * topTwo / total);
     const scope = state.region === 'all' ? 'all regions' : state.region;

     draw(Charts.bar, 'c1', {
       title: `Top two categories drive ${share}% of volume`,   // recomputed
       subtitle: `Units shipped · ${scope} · FY2026`,           // scope follows too
       xAxis: { categories: rows.map(r => r.name) },
       plotOptions: { series: { dataLabels: { enabled: true } } },
       legend: { enabled: false },
       series: [{ name: 'Units', data: rows.map((r, i) => ({
         y: r.value, color: i < 2 ? Charts.theme.colors[1] : Charts.theme.muted
       })) }]
     });
     // …every other dependent panel, drawn here too
   }

   document.querySelectorAll('.filter-bar select').forEach(sel =>
     sel.addEventListener('change', () => render(readState())));
   render(readState());   // first paint goes through the same path
   ```

   If a filtered slice can't support the claim — one category left, no top two —
   fall back to a descriptive title for that state rather than printing a
   sentence the chart no longer proves.

Two guards worth applying before you ship a control: the **first paint must go
through `render()`** (never draw once statically and wire the dropdown to a
second code path — they drift), and **every filter value must be reachable and
non-empty**. A dropdown option that yields zero rows should draw an empty-state,
not a blank card.

The last question to ask is whether the control earns its place. A filter is
worth it when the reader genuinely has several slices to inspect; when there are
three regions and the comparison *is* the finding, three small-multiple panels
beat a dropdown, because the reader sees all three at once instead of holding
two in memory.
