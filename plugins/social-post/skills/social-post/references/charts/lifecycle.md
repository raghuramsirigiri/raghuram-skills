# Chart lifecycle

Part of the charts-lib API ([`../chart-api.md`](../chart-api.md)). Read this when a
page redraws charts — a filter, a dropdown, a resize handler — or needs a
transparent background.

## Chart lifecycle: handle, resizing, animation, transparency

**The handle.** Every factory returns the same core methods, whatever the chart:

```js
const chart = Charts.column('el', config);
chart.redraw();                // re-render in place
chart.update(patch);           // merge a config patch and redraw; returns the handle
chart.on('click', fn);         // subscribe; returns an unsubscribe function
chart.off('click', fn);        // or off('click') for all of a type, off() for everything
chart.getData();               // the points, series or bins the chart holds
chart.toSVG();                 // a standalone .svg document, as a string
await chart.toPNG({ scale });  // a PNG Blob, 2x by default
chart.destroy();               // unbind listeners, empty the container
```

- **`update(patch)`** merges into the config the chart was built from: objects
  key by key, arrays replaced, except `series`, which merges **by position** so
  new numbers keep each series' name, colour and legend visibility. Because it
  merges, a key left out of the patch is *not* removed. To replace a config
  wholesale, `destroy()` and call the factory again.
- **Events**: `render` `{ reason }`, `hover` / `hoverEnd` `{ name, series?,
  index?, … }`, `click` (the hovered mark's detail), `legendToggle` `{ series,
  visible, index }`, `destroy`. `config.events: { click: fn }` is the same as
  `on`. An unknown event name throws. Listeners live on the handle, so they
  survive resizes and `update()`. `Charts.meta.events` lists them.
- **`toSVG()` / `toPNG()`** export the chart as drawn, including `panels` and
  `reportTable` cells; tooltips are not exported. A page needs them only if it
  offers a "download chart" button, so don't add one unasked.

Engines add extras on top (`getSeries`, `addPoint`/`shift` on `line`, `getBins`/`getStats`
on histograms, `charts`/`panels` on `panels`). The manifest's `api` array for
each chart lists exactly what its handle has. A refused chart still returns a
handle, with an `error` string saying why.

**Call `destroy()` before redrawing or removing a chart.** It disconnects the
resize observer and unbinds `window` listeners. It is safe to call twice, and
`panels` destroys its children.

**Charts follow their container.** A debounced `ResizeObserver` redraws the
chart when its container changes size, so charts in fluid grids, resized
windows and printed pages re-lay themselves. Two consequences for pages:
- **Hidden tabs, accordions and modals work.** A chart drawn into a
  `display:none` container redraws at its real size once it is shown, so no
  "draw on tab open" workaround is needed.
- Legend-toggled series survive a resize; per-slice donut toggles and a `line`
  chart's zoom do not.
- Opt out per chart with `chart: { responsive: false }` (a fixed-size export,
  say).

The chart also redraws once when `document.fonts.ready` settles. The skill
inlines everything and ships no webfont, so this rarely matters.

**Charts animate in.** On first draw bars grow from their baseline, dots scale
from their centre, lines draw along their length, and slices, areas, links and
tiles fade in; `update()` moves each bar and dot from its old place to its new
one. Resizes and font redraws are not animated. It is off under
`prefers-reduced-motion`, and a chart with more than 400 marks fades in whole.
`chart: { animation: false }` turns it off (a deck captured to PDF or images,
say); `chart: { animation: { duration: 900 } }` sets the length. Nothing is
written to the DOM, so the finished markup is identical either way.

**Transparent background.** Charts paint `theme.bg` behind themselves by
default. `chart: { transparent: true }` (one chart) or
`Charts.theme.transparent = true` (all charts) lets the surface underneath show
through. Tooltips, value-label halos and colour scales keep `bg` as their
paper. Use it when a chart sits on a surface that is *not* `theme.bg`, like a
tinted callout, a highlighted card or a slide band, instead of re-theming the
chart to match. `panels` passes it to its panels, and `reportTable` chart cells
are always transparent so stripes, cell fills and row hover show through. On a
normal card keep the default: the template already syncs `--card` to
`theme.bg`.
