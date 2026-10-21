# Design: one family with the dashboard and the social card

A frame of this video, a social-post card and a chart-dashboard panel built
from the same data must read as one family. So the video has no look system
of its own: it uses charts-lib's design system (`assets/charts-lib/theme.js`,
a verbatim copy of chart-dashboard's) and the social card's anatomy, set in
motion. The engine defines no colour or size of its own.

## Tokens

Read at compile time from the loaded `theme.js`:

- `Charts.palette`: `n0…n9` (paper to ink), `s1…s7` (series ramp),
  `accent`, `annotation`, `counter`.
- `Charts.metrics`: type sizes, weights, leading, stroke widths.
- `Charts.theme`: the roles. The engine maps them so: background `bg`, ink
  `titleColor`, muted text `secondaryColor`, hairline `grid`, **subject
  `colors[1]`**, context `muted`, callout `callout`.

## Presets

`meta.preset`, applied with `Charts.applyPreset`:

| Preset | Register | Use when |
| --- | --- | --- |
| `default` | warm paper, black → periwinkle ramp | most videos; the house voice |
| `editorial` | newsprint, earth ramp, serif | long-form news or insight |
| `rubric` | garnet on paper, text serif | a report, a policy, an academic source |
| `botanical` | sage, humanist type | environment, health, quiet topics |
| `cyanotype` | dark, teal, monospace | technical or data-engineering content |
| `orchid` | dark, mauve, grotesque | a launch or announcement on a screen |
| `bauhausNight` | dark, primary colours, geometric | a bold announcement |

Pick `default` unless the content's register clearly calls for another, or
the user asks ("make it darker" → a dark preset). Never ask about style up
front.

## Brand recolour

When the user supplies brand colours or a site: run
`node <skill-dir>/scripts/generate-theme.js '#hex'` (one colour) or
`node <skill-dir>/scripts/extract-theme.js <site-or-css>` (harvests a
stylesheet; `fetch-design.js` fetches one). Take the printed palette keys
(`n0`, `n0a`, `n1`, …, `s1…s7`, `accent`, `annotation`, `counter`) as an
object into `meta.palette`. The engine applies it once, with
`Charts.applyPalette`, after the preset and before the first frame.

Only colours change. Type stays the preset's stack unless the user supplies
a font file (`meta.fonts`: `[{ "family", "src": "data:font/woff2;base64,…",
"weight" }]`). A logo goes in `meta.brand.logo` as a data URI, only if the
user supplied the file. It appears in the outro.

**Contrast**: the engine checks it after every preset or palette change.
Muted text steps down the ink ramp until it clears 4.5:1. A subject colour
that fails 4.5:1 as text is used for marks only (bars, the bar, dots), and
text stays in ink. The audit reports any text that still fails. Two brand
colours where one fails contrast: put the passing one in `generate-theme.js`.
The other may appear only as a mark, through a custom painter, if at all.

Never imitate a real outlet's or brand's identity (its logo, wordmark,
colours as a recognisable livery, lower-third style) unless the brand is
the user's own. Offer a neutral preset instead.

## Card anatomy, in motion

An evidence scene **is a social card that moves**. Top to bottom:

1. **the through-line**, the short accent bar, at the top-left of the safe
   area;
2. **kicker**, muted, 27.5 px, on its own line under the bar;
3. **headline**, stating the finding with its number: weight 700, ink,
   55 px, balanced lines;
4. **units line**, muted, 30 px;
5. **the chart**, in the remaining height (in 16:9, in a column beside the
   words: `formats.md` § Layout per format);
6. **source line** under a hairline, 25 px: *Source:* in muted, the source
   name in semibold ink, the date muted. Built automatically from the
   claims the scene shows.

The bar, the kicker line and the footer (1, 2 and 6) are the **shared
frame**: one place for the whole video, still through every transition, only
their words changing (`motion.md` § The shared frame). The scene lays out
3–5 between them.

These are the card's sizes × 2.5, as a square frame sets them; a tall frame
sets the kicker, headline and units 1.2× and a wide one 1.15×
(`formats.md` § Layout per format). Hook and big-number may set the headline
or value 2–3× larger in a square frame (110–165 px), more in a tall or wide
one, in the same face and weight: scale, never a second type system. Context, quote and source-card scenes drop the parts
they don't need. No scene adds a new kind of component.

## Artwork

One texture, `meta.art: "halftone"`, on by default. Set `"off"` when the
user wants a plain frame. It is ground, not content:

- **A halftone field from two corners**: a dot grid fixed to the frame, its
  dot sizes following soft flowing bands, coming in from the top-right and
  bottom-left corners of the frame and running off its edges. The frame edge
  is its only hard edge; it may fill the margins outside the content area
  (the space below the footer in 9:16, for one).
- **Around the content, never on it**: it thins out toward the middle of the
  frame, and its dots shrink away gradually near anything a scene shows (text,
  a chart's whole plot even where no mark is drawn, the bar, the kicker, the
  footer), stopping 44 px short. It flows around each scene's layout; the
  outro has none.
- **Still, or changing all at once**: the texture never moves. Between two
  scenes that leave every dot the same size it doesn't change at all; when
  any dot changes, every dot in both corners eases to its new size together,
  in the swap's quiet stretch when neither scene's content is on screen. On
  the first scene the dots grow in.
- **One tone**: the background mixed a third of the way toward the ink. The
  audit's fill check measures each scene without it: the art fills what a
  good layout leaves, it doesn't stand in for one.

## Emphasis

Two colours, not a rainbow. The subject (the bar, the stretch of line, the
part the finding is about) takes the palette accent `colors[1]`. Context
takes `muted`. Use at most 2–3 accented items, and one emphasis per chart. A
residual "Other" is always muted. Forecasts are hatched or dashed, never
drawn like measurements.

## Chart geometry

Ported from charts-lib's engines at 2.5×: line 7.5 px, axis 4.5, grid 2,
ticks 15 × 3.75, labels 29 px semibold, values 27.5 px bold. Bars use the
bar-list layout: label above, bar 65 px, row gap 55. Bars start at zero.

## Not in the design

"Key insight" banners, emoji, gradient panels, drop shadows or borders the
card doesn't have, icons as decoration, and a second type scale. Nothing on
screen that isn't data, its labels, or the card's furniture.
