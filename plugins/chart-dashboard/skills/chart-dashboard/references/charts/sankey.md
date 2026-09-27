# Sankey (`Charts.sankey`)

Part of the charts-lib API — the shared options, sizing and interactions are in
[`../chart-api.md`](../chart-api.md). Every option below is optional; the library picks sensible defaults.

Where an amount goes: nodes in left-to-right columns joined by bands whose thickness is the amount moved — splits, merges and losses are the reading.

```js
Charts.sankey('container', {
  title: 'Signup funnel, September',
  stages: ['Source', 'Signup', 'Plan'],
  series: [{
    data: [
      ['Organic', 'Signed up', 4200], ['Paid', 'Signed up', 2600],
      ['Signed up', 'Free', 5100], ['Signed up', 'Pro', 1300]
    ]
  }]
});
```

- **Data**: `series[0].data` as `[from, to, weight]` or `{ from, to, weight }`; optional `series[0].nodes: [{ id, name?, color?, column? }]`.
- **Exactly one series of links**; weights ≥ 0; flow forward only. Refuses multiple series, negative/non-numeric weights (signed net flow → `waterfall`), self-links and loops.
- **One pixels-per-unit scale** across all columns; a node is as tall as the larger of its in/outflow. Whatever a stage receives but doesn't pass on flows into a counter-coloured **"Unaccounted"** node with its amount and share (`dropLabel`, `dropoff`).
- **Options**: `stages` (a header per column); `plotOptions.sankey.linkColor: 'source'|'target'|'gradient'|'neutral'|<css>`, `colorBy: 'level'|'source'|'node'|'none'`, `nodeWidth`, `nodePadding`, `align: 'justify'|'left'`, `valuePrefix` / `valueSuffix`; `nodes[].column` pins a node.
- **Sizing**: free aspect, min 480×300; **span 2 grid tracks** (1 only for 2–3 short-named columns). **Returns** `getLinks()`, `getNodes()`.
