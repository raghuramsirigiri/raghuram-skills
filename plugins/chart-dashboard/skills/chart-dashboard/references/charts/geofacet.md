# Geofacet (`Charts.geofacet`)

Part of the charts-lib API — the shared options, sizing and interactions are in
[`../chart-api.md`](../chart-api.md). Every option below is optional; the library picks sensible defaults.

One tile per region, positioned by `(row, col)` on a grid that approximates the
real map. Pick the tile style with `chart.variant`:

- **`'bar'`** (default) — code + value on one line, mini progress bar below
- **`'heat'`** — solid choropleth tile, color scaled across the value range
- **`'gauge'`** — radial progress ring with the value in the middle

**The default is a default, not a recommendation.** `'bar'` gets used for every
geofacet on the page because it is what you get by typing nothing, and that is
the wrong reason to pick it. The variant encodes the value differently, so it
should follow what the reader is meant to do with the number:

| The reader needs to… | Variant | Why |
|:--|:--|:--|
| Read the exact value per region and compare a few | `'bar'` | The number is printed at full weight and the bar gives a rough rank next to it |
| See the *spatial pattern* — where the high band is, whether it clusters | `'heat'` | Color fills the whole tile, so the map reads as a shape at a glance; individual values recede |
| Judge each region against a shared target or capacity | `'gauge'` | The ring encodes fraction-of-max, so "80% of quota" reads as a ring position without arithmetic |

Two consequences worth stating plainly:

- **`'heat'` needs `min`/`max` pinned** when the page has more than one heat
  facet, or each one auto-scales to its own range and the colors stop being
  comparable between them.
- **`'gauge'` needs a meaningful `max`.** A ring against the data's own maximum
  says only "biggest region", which the bar variant says better. Pass the real
  ceiling — quota, capacity, 100% — or use a different variant.

A page with three geofacets that are all `'bar'` is usually three panels that
should have been one; a page with a `'heat'` for the pattern and a `'gauge'`
for attainment is two panels answering two questions.

```js
Charts.geofacet('chart', {
  title: 'Electric Vehicle Adoption',
  subtitle: 'Percentage of total vehicle sales in %',
  chart: { variant: 'heat' },              // 'bar' | 'heat' | 'gauge'
  plotOptions: { geofacet: {
    max: 100,                              // scale ceiling (default: data max)
    min: 0,                                // bar/gauge start at 0; heat starts at data min
    valueSuffix: '%',
    format: v => v.toFixed(0),             // value formatter
    showEmpty: true,                       // faint labels for regions with no data
    borderRadius: 6                        // tile corner radius
  } },
  series: [{ data: { CA: 98, TX: 78, NY: 96 } }]
});
```

- **Data shapes**: `{CODE: value}`, `[['CA', 98], …]`, or `[{code:'CA', value:98, name:'California'}]`
- **Grid**: `chart.grid` accepts `'us'` (default, 50 states + DC) or an array of `{code, row, col, name?}` for any other geography. Registered grids live in `Charts.geofacet.grids`.
- **Partial data**: regions in the grid but missing from the data render as faint placeholder labels, so the map keeps its shape
- **Spacing is not configurable**: cells are always square with a derived gap, so the tiles stay one block at any container aspect ratio
- Hover a tile for a tooltip with the region name and value
