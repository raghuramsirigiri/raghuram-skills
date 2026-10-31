# Formats, lengths and cuts

## Sizes

| Format | Pixels | Where it plays | Safe zone (top, right, bottom, left) |
| --- | --- | --- | --- |
| `9:16` (default) | 1080 × 1920 | Reels, Shorts, TikTok, Stories, LinkedIn mobile | 250, 150, 380, 60 |
| `4:5` | 1080 × 1350 | Instagram and LinkedIn feed, Facebook | 60, 60, 120, 60 |
| `1:1` | 1080 × 1080 | any feed; the safest single choice | 60 all round |
| `16:9` | 1920 × 1080 | YouTube, a deck, a screen in a room, a website | 54, 96, 54, 96 (5% title-safe) |

The safe zones are **house defaults**, deliberately conservative. They keep
text clear of feed captions, buttons and profile rows. They are not any
platform's published guarantee; say so if asked. The player's **Safe zone**
button shows them; it is never exported.

The type scale is the social card's at 2.5× in every format (a 1080-wide
frame is a 432 px card), so a frame reads the same at phone size as a
social-post card.

## Layout per format

Each aspect class gets its own composition, not one square card placed in a
bigger frame (`layout.js` `PROFILE`, applied by `design.js` `card()`):

| Class | Formats | Type step | Composition |
| --- | --- | --- | --- |
| `square` | 1:1 | 1× | the card: words on top, chart below |
| `tall` | 9:16, 4:5 | 1.2× | the card, words a step larger; lists, steps and timelines spread down the height; bars thicken; a big number runs as wide as fits |
| `wide` | 16:9 | 1.15× | words in a left column (40%), centred on its height; the chart, list, steps, timeline or photo beside them at full height; a big number in the left half with its words beside it |

The type step applies to the kicker, headline and units and to chart and
list text; the source line stays card size. A title on its own
(`kicker-title`) grows to about twice the card headline, a hook to its
display size, a headline beside a chart to 1.5×. The source card and the
outro grow until they hold about two thirds of the frame.

**The continuous style's band** (`continuous.md`) follows the frame too:
stacked at the top of a 9:16 frame with the world below; a row in 4:5 and
1:1 (a figure on the left with its words beside it, or a summary's title
beside its points), so the world keeps its height; a left column (40%) in
16:9, the world in the room to its right. The world's scale is the largest
at which every place fits that stage, at most 1.3.

**Fill.** The audit measures how much of the safe area each scene's
mid-hold frame covers, and warns under 60%. The safe area is cut into
cells a tenth of its short side; a blank cell counts as empty only when its
neighbours are blank too, so the gaps between lines belong to the
composition and only real empty bands count. The source card and outro are
measured but not warned on. A warning on an evidence scene usually means
copy too short for the frame (one short line in a 9:16 kicker-title): give
it a `units`/`sub` line, merge it into the next scene, or use a format that
suits it. The engine lays out the frame; don't pad it with decoration.
`tests/layout-gallery.html` shows every scene type in all four formats with
its fill.

## Frame rate

`fps` 30 by default. 60 is allowed for very fast motion (bigger files,
longer exports). 24 and 25 are allowed when the user asks for film or PAL.

## Length

Keep to **15–60 s**. Defaults: 30 s at 9:16 when the user doesn't say. A
15 s cut holds a hook and one or two findings. Over 60 s, say it is long for
a feed and offer two shorter videos.

## Which format, when the user didn't say

Ask at most one question, and only if the answer changes the build: *"Where
will it play?"* Otherwise build 9:16 and say at handover that a 1:1 or
16:9 cut is one edit away.

| They said | Build |
| --- | --- |
| Reels, Shorts, TikTok, Stories, "vertical" | 9:16 |
| LinkedIn | 9:16 for mobile, plus a 1:1 cut if they want a feed version |
| Instagram feed | 4:5 |
| X, Bluesky, Threads | 1:1 or 16:9 |
| YouTube, a website, a presentation, a TV | 16:9 |

## Cuts

One spec can hold several cuts: each a format plus a list of scene ids.
They share the ledger, the copy and the sources, so a correction reaches
every cut at once.

```json
"cuts": {
  "main":  { "format": "9:16", "scenes": ["hook", "ctx", "e1", "e2", "e3", "src"] },
  "short": { "format": "1:1",  "scenes": ["hook", "e1", "src"] }
}
```

Every cut ends on the source card (then, optionally, the outro). The
player's cut switcher picks which one plays and exports. Name the file
`<title>-<cut>.mp4`; the player does this.

## Platform notes worth saying at handover

- Feeds autoplay muted. The video is built to work silent; a soundtrack
  is optional and off by default (`audio.md`).
- Upload the MP4. If a platform re-encodes and softens the text, the 1:1
  or 4:5 cut at 30 fps usually survives best.
- Post the caption as the video's text and the alt text in the platform's
  accessibility field where it has one.
