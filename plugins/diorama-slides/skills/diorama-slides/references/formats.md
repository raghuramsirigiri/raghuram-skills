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

Each aspect class composes the card and the stage its own way
(`layout.js` `PROFILE`):

| Class | Formats | Type step | Composition |
| --- | --- | --- | --- |
| `tall` | 9:16, 4:5 | 1.2× | the card across the top, the stage under it down to the footer, the full frame width |
| `square` | 1:1 | 1× | as tall, with less stage: keep its beats' words short, and charts to beats of their own |
| `wide` | 16:9 | 1.15× | the card in a left column (40%), the stage in the room to its right at full height |

The type step applies to the kicker, headline and units and to chart text;
the source line stays card size. A beat with a figure or a chart in the
card gives the stage the room under it, and the camera reframes; a 1:1
frame has little room to give, so a chart there usually belongs to a beat
in the 9:16 or 16:9 cut only. `check-video.js` warns when the stage is left
under about a fifth of the frame's height.

**Fill.** The audit measures how much of the safe area each beat's
mid-hold frame covers and warns under 60%. The stage usually fills it; a
warning means the stage's room is mostly empty board (zoom in, or give the
subject a larger `size`), never a reason to add decoration.

## Frame rate

`fps` 30 by default. 60 is allowed for very fast motion (bigger files,
longer exports). 24 and 25 are allowed when the user asks for film or PAL.

## Length

Keep to **15–60 s**; a lineup or a journey may run to **90 s** when its
cast or route needs it, and you say so at handover. Defaults: about 30–45 s
at 9:16 when the user doesn't say. A 15 s cut holds a hook and one or two
states. `check-video.js` fails a cut over its shape's limit.

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

One spec can hold several cuts: each a format plus a list of beat ids.
They share the ledger, the copy and the sources, so a correction reaches
every cut at once.

```json
"cuts": {
  "main":  { "format": "9:16", "scenes": ["hook", "s1", "s2", "s3", "s4", "src"] },
  "short": { "format": "1:1",  "scenes": ["hook", "s2", "src"] }
}
```

Every cut ends on the source card. The
player's cut switcher picks which one plays and exports. Name the file
`<title>-<cut>.mp4`; the player does this.

## Platform notes worth saying at handover

- Feeds autoplay muted. The video is built to work silent; a soundtrack
  is optional and off by default (`audio.md`).
- Upload the MP4. If a platform re-encodes and softens the text, the 1:1
  or 4:5 cut at 30 fps usually survives best.
- Post the caption as the video's text and the alt text in the platform's
  accessibility field where it has one.
