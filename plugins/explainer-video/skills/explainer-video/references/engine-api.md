# The spec and the engine

You write data; the engine renders it. The spec is JSON in the page, in
`<script type="application/json" id="video-spec">`, and `check-video.js`
validates exactly this shape.

## The spec

```json
{
  "meta": {
    "title": "Port Halden ferry ridership",
    "locale": "en-GB",
    "preset": "default",
    "palette": null,
    "brand": null,
    "art": "halftone",
    "fonts": [],
    "fps": 30,
    "seed": 7,
    "audio": { "score": "off" },
    "motionBlur": { "subframes": 4, "shutter": 0.5 }
  },
  "cuts": {
    "main":  { "format": "9:16", "scenes": ["hook", "ctx", "e1", "e3", "src"] },
    "short": { "format": "1:1",  "scenes": ["hook", "e1", "src"] }
  },
  "sources": [
    { "id": "A", "name": "Port Halden Transit Authority annual report", "date": "2026-10-14", "asOf": null }
  ],
  "claims": [
    { "id": "F1", "value": 38, "unit": "%", "display": "38%", "source": "A", "locator": "¶2",
      "verbatim": "Ridership rose 38% on the previous year, to 2.4 million trips.", "kind": "copied" },
    { "id": "F2", "value": 2.4, "unit": "million trips", "display": "2.4m", "source": "A", "locator": "¶2",
      "verbatim": "Ridership rose 38% on the previous year, to 2.4 million trips.", "kind": "copied" },
    { "id": "F3", "value": 1.74, "unit": "million trips", "display": "1.74m", "source": "A", "locator": "¶2",
      "verbatim": "…to 2.4 million trips.", "kind": "derived", "working": "2.4m / 1.38 = 1.739m, rounded to 1.74m" },
    { "id": "F4", "value": 3, "unit": "million trips", "display": "3m", "source": "A", "locator": "¶5",
      "verbatim": "The authority estimates ridership could reach 3 million by 2028.",
      "kind": "copied", "hedge": "could", "forecast": true }
  ],
  "data": [],
  "scenes": [
    { "id": "hook", "type": "big-number",
      "copy": { "kicker": "Port Halden ferries", "value": "F1", "line": "more ferry trips than last year" } },
    { "id": "ctx", "type": "kicker-title",
      "copy": { "kicker": "Annual report", "title": "The busiest year on the water since 2011", "sub": "Year to September 2026" } },
    { "id": "e1", "type": "compare-bars",
      "copy": { "kicker": "Trips per year", "title": "Trips rose from {F3} to {F2}", "units": "Million trips, year to September" },
      "bars": [ { "label": "2025", "value": "F3" }, { "label": "2026", "value": "F2", "emph": true } ] },
    { "id": "e3", "type": "big-number",
      "copy": { "kicker": "The authority estimates", "value": "F4", "line": "trips a year could follow by 2028", "units": "A forecast, not a measurement" } },
    { "id": "src", "type": "source-card" }
  ],
  "caption": "…",
  "alt": "…"
}
```

### `meta`

| Key | Values |
| --- | --- |
| `title` | the page title and the export file name; not painted |
| `locale` | number and date formatting (`Intl`), default `en-GB` |
| `preset` | a charts-lib preset (`design.md`), default `default` |
| `palette` | brand palette overrides from `generate-theme.js` / `extract-theme.js`, or `null` |
| `brand` | `{ "name", "logo": "data:image/…" }`, only what the user supplied |
| `art` | `"halftone"` (default): a halftone texture from two corners of the frame, around the content (`design.md` § Artwork); `"off"` for a plain frame |
| `fonts` | `[{ "family", "src": "data:font/…", "weight" }]`, only fonts the user supplied |
| `fps` | 30 (default), 60, 24 or 25 |
| `seed` | seeds noise and any `api.rng`; changing it changes nothing semantic |
| `audio` | `{ "score": "off" \| "pulse" \| "ambient", "bpm" }` (`audio.md`) |
| `motionBlur` | `{ "subframes": 1–16, "shutter": 0–1 }`, export only; `null` turns it off |
| `grain` | optional film-grain alpha (0.02–0.05); off by default |

### Scenes

`{ "id", "type", "copy": { … }, "dur": "auto" | seconds }`,
plus the type's data keys (`bars`, `rows`, `parts`, `series`, `events`,
`steps`, `points`, `before`/`after`, `draw`). The slots and data per type
are in `scenes.md` and `assets/motion-lib/motion.manifest.json`.

- `dur` is **content time** (reveal + read + exit), excluding transitions.
  `"auto"` (default) takes the minimum the words need. A number below the
  minimum fails to compile, naming the scene and the minimum.
- Every scene after the first arrives by the one transition (`motion.md`
  § Transitions); there is no `transitionIn`. The first scene starts on
  frame 0.
- Total length = the sum of scene content plus transitions, rounded to whole
  frames. Frame `n` is drawn at `t = n / fps` for `n` in `[0, N)`.

### Copy

Plain strings. A figure is always a claim: a whole slot `"value": "F1"`, or
`{F1}` inside a string, which paints the claim's `display`. Typed digits in
copy fail the lint, except years and day-month dates.

## The JS API

The page loads, in this order (theme first, always): `charts-lib/theme.js`
→ `core → ease → text → paint → layout → design → transitions → art → scenes/* →
audio → mux-mp4 → mux-webm → export → player`. The template already has
the tags; `finalize.js` inlines them in that order.

| Call | Does |
| --- | --- |
| `Motion.compile(spec, cut)` | the timeline: `{ W, H, fps, frames, duration, scenes[…] }`; throws naming the scene |
| `Motion.seek(ctx, C, t, { frameT })` | paints the frame at `t`, as a pure function of `t` |
| `Motion.marks(C)` | scene hold midpoints and transition midpoints |
| `Motion.exportVideo({ cut, onProgress, signal })` | encodes; returns `{ ok, blob, path, message, roundTrip }` |
| `Motion.player.start(el)` | mounts the player (the template does this) |
| `Motion.player.contactSheet(C)` / `poster(C)` | PNG data URLs |
| `Motion.custom.<name> = { enter, read, draw(ctx, lt, api) }` | a custom painter (`motion.md` § Custom scenes) |
| `VideoAudit.run({ cut, exportProbe })` | the browser audit (`verify-and-ship.md`); staged only |

`window.videoPlayer` is the mounted player: `videoPlayer.seek(t)`,
`.play()`, `.compiled`.
