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
