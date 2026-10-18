# Social post layout (`templates/social.html`)

Read with `layout.md`, which holds the rules shared by every format, and skim
`layout-email.md` § Why the charts are PNG: a social post uses the email
snapshot's freeze, but sends it somewhere else.

A social post is **one to three chart cards, each painted into a picture at
the exact size a platform asks for, plus the words to post with them**, one
version per platform. The page holds both. The reader clicks **Copy picture**
and **Copy text**, and pastes them into LinkedIn, X, Bluesky, Threads,
Mastodon or Instagram.

## Why the picture carries everything

In an email or a Teams post the chart's title is text beside the image. On
a feed it's the reverse. The picture is the part that travels: it gets
reposted, screenshotted into a deck, and quoted without the words under it.
So everything a reader needs to trust it is **painted into the card**:

- the finding, as the headline
- the units and scope
- the source, and the date or period

A chart that leaves the post without its source is a rumour. The words under
the picture carry the argument, and every figure in them must also appear on
a card (§ The words).

## Sizes

A card is laid out at about the size a phone shows it, then painted at 2.5x.
A 1080px picture appears about 400px wide in a feed. Laid out at 1080px, its
11px chart labels would reach the phone at about 4px. That is why the card's
type looks large on a desktop. Leave it that size.

| `data-size` | Card (CSS px) | Picture | Shape | Use it for |
|:--|:--|:--|:--|:--|
| `portrait` | 432 × 540 | 1080 × 1350 | 4:5 | LinkedIn and Instagram feeds, where a taller picture takes more of the screen. **The default.** |
| `square` | 432 × 432 | 1080 × 1080 | 1:1 | One picture for every platform at once. |
| `landscape` | 480 × 270 | 1200 × 675 | 16:9 | X, Bluesky and Threads timelines, which show it uncropped. It has the least room for a chart. |

Never change a card's width or height. The freeze fails a card that is not
its size's exact frame on screen, because the picture would come out the
wrong shape.

## Platforms

One `<pre class="post" data-platform="…">` per platform the user named. The
runtime counts each the way that platform does, and marks the fold where
"…more" cuts the post.

| `data-platform` | Limit | Counted as | Fold |
|:--|:--|:--|:--|
| `linkedin` | 3,000 | characters | ~140 on a phone (~210 on a desktop) |
| `x` | 280 | weighted: CJK and emoji count 2, every link 23 | none |
| `bluesky` | 300 | graphemes (what a reader sees as one character) | none |
| `threads` | 500 | characters | none |
| `mastodon` | 500 on most servers | characters, every link 23 | none |
| `instagram` | 2,200 | characters | ~125 |

Checked in 2026-10. Few of these numbers are published by the platforms, so
they come from third-party references. Fold positions are approximate and
change with each app's layout. X's 280 applies to accounts without a paid
tier. A Mastodon server can set its own limit. If the user says their limit
differs, trust them. The values live in `PLATFORMS` in
`assets/email-snapshot.js`.

Alt text: X takes 1,000 characters per picture, Bluesky 2,000 and Mastodon
1,500. LinkedIn publishes no limit, and guides put it near 300, so the
checker warns above 300 and fails above 1,000.

## When it is the right format

Use it when the numbers go on a public or professional feed: "post this on
LinkedIn", "a tweet with the chart", "for our Bluesky", "something to share
on socials", "an Instagram post of this".

- A **Teams post** goes to a chat or channel inside an organisation. If they
  say Teams, build that.
- An **email snapshot** goes in a message body.
- A **deck** or **report** holds an argument with several claims. Post its
  lead finding as a card and link to the rest, if the user gave a URL.

Each card holds **one finding with at most one chart**. A post has one to
three cards: X and Bluesky take up to four pictures and LinkedIn takes
several, but each extra picture gets fewer views. More findings than that
make a carousel or a page, not a post.

## Compose a card

Each card has five parts, in this order:

1. **Kicker** (`<p class="kicker">`): who, what scope, which period.
2. **Headline** (`<h2>`): the finding, stated with its number. This is the
   action-title rule (`narrative.md`) at its strictest, because a scrolling
   reader gives the card about a second and a half. Keep it to ~95
   characters, or ~80 on a landscape card. Past that it runs to a third line
   and takes the chart's room.
3. **Units line** (`<p class="units">`): units, what is counted, and any gap
   or caveat the chart shows.
4. **The chart:** `<div class="chart" id="…" data-alt="…">` with no size of its
   own. It fills whatever height the text leaves.
5. **Source line** (`<p class="source">`): the source and the date, with
   *illustrative* when the figures are. An optional `<span class="by">`
   carries the name or handle **the user gave**. Never invent one, and never
   add a logo they did not supply.

No KPI tiles, banners, emoji, arrows or "key insight" strips: the header
rules in `layout.md` apply. The headline is the one big thing on the card.

### Chart room

What the chart gets once the text is set, with a two-line headline:

| Size | Chart box | Holds |
|:--|:--|:--|
| portrait | ~384 × 360 | a line up to ~16 points, a column up to ~8 categories, a bar list up to ~8 rows |
| square | ~384 × 260 | a line up to ~12 points, a column up to ~6 categories |
| landscape | ~444 × 140 | a line, or a column of ~5. Nothing with a long axis or many labels |

Each extra headline line costs ~27px (~21px on a landscape card). The freeze
fails a chart left under 110px and warns well under its engine's minimum.

**Short plots need round axis bounds.** The engine picks about five y-ticks
however short the plot is. Left alone, a ±$0.40 column chart in a 140px
plot labels every $0.10: nine labels stacked 15px apart. Set
`yAxis: { min, max }` to round numbers that give ~4 ticks (`-0.4`/`0.4` gives
steps of 0.2).

### Fewer marks than anywhere else

- One series emphasised in `Charts.theme.highlight` and the rest muted
  (`design-rules.md` § Make the chart show the finding). On a phone, two
  saturated series read as noise.
- Leave data labels on. A picture has no tooltip, so the values the reader
  needs must be printed.
- Use one callout at most, on the moment the headline names.
- A donut is rarely right. Write a two-part split as a sentence. Three to
  five parts can be a bar list.
- No tables. `table`, `reportTable` and `barInsightTable` draw HTML that the
  freeze cannot carry, and a table in a feed isn't read anyway.

## The words

Write one post per platform the user named, from the same finding. Each
one:

- **Leads with the finding and its number.** On LinkedIn and Instagram the
  fold is the whole post for most readers. The checker warns when the text
  before the fold carries no figure.
- **States only figures the cards show.** The checker extracts every number
  in the post (normalising `1,240` to `1240` and `93.0` to `93`) and fails any
  number missing from the cards' headline, units, source or alt text.
  Single digits are exempt. When the post needs a figure the card doesn't
  show, put it on the card or leave it out. This is SKILL.md rule 1 applied
  to the words.
- **Sounds like a person reporting**, not a post written to be engaged
  with. The checker warns on endings that only fish for comments ("Agree?",
  "Thoughts?"), on "comment below" and "follow for more", on stock openers
  ("In today's fast-paced world", "Unpopular opinion"), on words that read
  as machine-written ("delve", "game-changer"), on lines that start with an
  emoji, and on more than two or three hashtags. Each is a warning, because
  each has a rare honest use.
- **Says what's illustrative.** If the card says illustrative, so does the
  post.
- **Links only where the user gave a URL.** Never invent a link, and never
  link to a local file.

The text goes in a `<pre>` exactly as it should be posted, with its line
breaks. Escape `&` and `<`. Named entities such as `&rsquo;` are fine.

## Charts

- **Draw through `SocialSnapshot.draw(Charts.line, 'c1', { … })`.** That
  registers the chart to be frozen and turns animation off. A bare
  `Charts.line('c1', …)` is never frozen, and `check-page.js` fails it.
  (`SocialSnapshot` is the email runtime under another name.)
- **No title or subtitle in the config.** They are the card's `<h2>` and units
  line, at the card's larger type, and the checker fails them in the config.
- **`data-alt` states the finding with its numbers**: six or more words, at
  least one figure. The card's alt text is the headline followed by it, and
  **Copy alt text** puts that on the clipboard for the picture's description
  field.
- The chart is frozen at 2.5x, the card's own scale, so its bitmap is as
  sharp as the headline above it.
- **Type:** the charts are set in the card's `--font`
  (`Charts.applyMetrics({ font })`), the one sanctioned metric change, as in
  the email and Teams formats. The face is the system UI stack, because the
  picture is painted by the browser that opens the file.

## Verify it

1. **Static:** `node <skill-dir>/scripts/check-page.js index.html`. The rows
   for this format are `social card` (the card, alt text and post rules) and
   `charts freeze to PNG`.
2. **In the browser:** stage, serve, open, and read the freeze report:
   ```js
   JSON.stringify(await SocialSnapshot.freeze())
   ```
   It returns `ok`, `target: "social"`, each card's picture size
   (`1080x1350`…), each post's length against its limit, and the lint
   failures. It fails a card off its frame, content running past the frame
   (`card overflow`), and a chart squeezed under 110px (`chart room`). A
   `card` warning means this browser would not paint HTML onto a canvas:
   Edge and Chrome do, Safari refuses. The layout audit reports `charts: 0`
   by then, because the charts have become pictures. Take one screenshot of
   the cards. What's on screen is the picture, pixel for pixel, at 1/2.5
   scale.
3. **The post itself can't be checked from here.** No tool in this skill
   opens a social platform. Say so when you hand the file over.

## Hand it over

One file, standalone like every other format (SKILL.md step 8). Tell the user:

1. Open it in Edge or Chrome. Each card has **Copy picture**, **Save PNG** and
   **Copy alt text**. Each post has **Copy text** and shows its length against
   the platform's limit, with the part below "…more" set muted.
2. On the platform, paste the text, then paste the picture (or attach the
   saved PNG), then paste the alt text into the picture's description field.
3. Which figures came from their data and which, if any, were illustrative.

Don't offer to post it, schedule it, or reach the platform's API. The user
publishes it.

## What it never has

- Nothing to hover or click on a card: no tooltip, no control, no link.
- No figure in the words that the cards don't show.
- No invented handle, logo, link, or engagement line.
- No "Key insight" banner or emoji decoration. The header rules in
  `layout.md` apply.
- No editable variant. If the user asks for one, say so and offer a static
  post rebuilt on request.
