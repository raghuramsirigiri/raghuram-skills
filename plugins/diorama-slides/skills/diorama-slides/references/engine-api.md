# The spec and the engine

You write data and the stage's painters; the engine plays them. The spec is
JSON in the page, in `<script type="application/json" id="video-spec">`,
and `check-video.js` validates exactly this shape. All names below are
invented.

## The spec

```json
{
  "meta": { "title": "The Kestrel lamp, 1920 to now", "locale": "en-GB", "preset": "default",
            "art": "halftone", "fps": 30, "seed": 7, "audio": { "score": "off" },
            "motionBlur": { "subframes": 4, "shutter": 0.5 } },
  "stage": { "shape": "transformation", "world": "desk", "size": [40, 30, 30], "time": 1920 },
  "cuts": {
    "main":  { "format": "9:16", "scenes": ["hook", "angle", "src"] },
    "short": { "format": "1:1",  "scenes": ["hook", "src"] }
  },
  "sources": [ { "id": "A", "name": "Kestrel Lighting company history", "date": "2026-05-02" } ],
  "claims": [
    { "id": "F1", "value": 40, "unit": "watts", "display": "40 W", "source": "A", "locator": "¶3",
      "verbatim": "The first Kestrel took a 40 W bulb.", "kind": "copied" }
  ],
  "data": [],
  "scenes": [
    { "id": "hook", "type": "beat",
      "copy": { "kicker": "1920 · Brass", "title": "The first Kestrel took a {F1} bulb", "units": "A brass stem and a cloth shade" },
      "stage": { "shows": "the brass lamp switches on and lights the desk", "focus": "lamp" } },
    { "id": "angle", "type": "beat",
      "copy": { "kicker": "1956 · Angle", "title": "A sprung arm let the shade move" },
      "stage": { "time": 1956, "zoom": 1.3, "shows": "the stem becomes a sprung arm that swings the shade down to the page" } },
    { "id": "src", "type": "source-card", "stage": { "zoom": 0.85 } }
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
| `art` | `"halftone"` (default) or `"off"` (`design.md` § Artwork) |
| `fonts` | `[{ "family", "src": "data:font/…", "weight" }]`, only fonts the user supplied |
| `fps` | 30 (default), 60, 24 or 25 |
| `seed` | seeds `api.rng`; changing it changes nothing semantic |
| `audio` | `{ "score": "off" \| "pulse" \| "ambient", "bpm" }` (`audio.md`) |
| `motionBlur` | `{ "subframes": 1–16, "shutter": 0–1 }`, export only; `null` turns it off |

There is no `meta.style`: this skill has one mode.

### `stage`

The story's shape and the world (`stage.md` § The world): `shape` (it
guides layout and framing), `world` (the page's painter,
`Motion.things.<name>`), `size` (the extent a beat frames at zoom 1) and
optionally `time` (where the story's clock starts).

### Scenes (beats)

Two types:

- **`beat`**: `copy` slots `kicker` (≤ 4 words), `title` (≤ 10, the
  headline stating the finding with its figure), `units` (≤ 8), and one of
  `value` (a claim id, shown as a figure under the words) or `quote` (a
  quote claim, with `name` ≤ 6 words as its attribution); optionally
  `chart`: `{ "kind": "bars", "bars": [{ "label", "value": "F2", "emph" }] }`
  (two to six) or `{ "kind": "line", "series": "D1", "end": "F5" }`
  (`video-charts.md`); and `stage`: `shows` (required: one line on what
  happens in the world to show this beat's insight, `story.md` § Direct
  each insight), and optionally `time` (the story's clock at this beat, a
  number or a claim), `focus` (a mark or [x, y, z]), `zoom`, `look`, `wait`
  (seconds the words' swap holds for the action).
- **`source-card`**: every source and its date, optional `note` (≤ 12
  words); it takes `stage` directions too, so the stage can pull back.

Every beat takes `"dur": "auto"` (default) or a number of seconds of
content time. A number below the beat's minimum fails to compile, naming
the beat and the minimum. Every beat after the first arrives by the one
transition, held longer when the stage changes; the first starts on frame 0.

### Copy

Plain strings. A figure is always a claim: a whole slot `"value": "F1"`, or
`{F1}` inside a string, which paints the claim's `display`. Typed digits in
copy fail the lint, except years and day-month dates. A stage label is a
year or a name, never a figure.

## The JS API

The page loads, in this order (theme first, always): `charts-lib/theme.js`
→ `core → ease → text → paint → layout → design → transitions → art → iso →
stage → scenes/* → audio → mux-mp4 → mux-webm → export → player`. The template has the tags; `finalize.js` inlines them in order.

| Call | Does |
| --- | --- |
| `Motion.things.<name> = { marks(w), draw(w, api) }` | the page's world (`stage.md` § The world) |
| `Motion.compile(spec, cut)` | the timeline: `{ W, H, fps, frames, duration, shape, stage, scenes[…] }`; throws naming the beat |
| `Motion.seek(ctx, C, t, { frameT })` | paints the frame at `t`, as a pure function of `t` |
| `Motion.stage.worldAt(C.stage, t)` | what the world painter gets at `t` (to debug a beat) |
| `Motion.exportVideo({ cut, onProgress, signal })` | encodes; returns `{ ok, blob, path, message, roundTrip }` |
| `Motion.player.contactSheet(C)` / `poster(C)` | PNG data URLs |
| `VideoAudit.run({ cut, exportProbe, scenes })` | the browser audit (`verify-and-ship.md`); staged only |

`window.videoPlayer` is the mounted player: `videoPlayer.seek(t)`,
`.play()`, `.compiled`.
