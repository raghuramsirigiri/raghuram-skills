# Teams post layout (`templates/teams.html`)

Read with `layout.md`, which holds the rules shared by every format, and skim
`layout-email.md` § Why the charts are PNG: a Teams post is the email
snapshot's freeze with a different destination.

A Teams post is **a card of findings that the reader pastes into a Teams chat
or channel**: a headline, a sentence or two, one to three charts frozen into
PNGs, and the source. You write it once, as plain semantic HTML, and the page
sends it two ways:

- **As a picture.** The whole card, styled in the skill's design (the email
  block's type scale and hairlines), is painted into one PNG and pasted under
  its headline as a line of real text. It looks exactly like the export in
  every Teams theme. The text inside the picture can't be searched or
  selected.
- **As text.** The markup itself, with the charts inline. It can be searched
  and selected, and it follows the reader's theme, but Teams restyles all of
  it (see below), so it never matches the design.

The reader chooses per post. Neither copy is a fallback for the other.

## What Teams does to pasted text

These were seen in a real paste, not taken from documentation:

- An `h3` is set **smaller** than body text, so a chart title shrinks below
  the sentence under it. The text copy turns each `h3` into a bold paragraph.
- Paragraphs get no margin, so each section runs into the next. The text copy
  puts a blank paragraph before each section and before the source line.
- A table is stretched to full width with a shaded, centred header row.
- The message sits on the sender's bubble colour, for example purple in
  someone's own dark theme, and on a neutral bubble for everyone else.
- Pictures arrive intact, at their `width=`, with rounded corners.

The text preview on the page (**Text in Teams**) shows the text copy set that
way, as an approximation. The picture preview (**Picture**) is exact.

## Why it is not the email block

The email block is a 600px table with every style inline, which is what
Outlook needs. Pasted into Teams, that table arrives without any of its styles,
as a grid of cells with borders. The Teams compose box keeps:

| Kept | Dropped or flattened |
|:--|:--|
| `p`, `br`, `h2`, `h3`, `strong`, `em`, `u` | every `style=`, `class=`, `color=`, `<font>` |
| `ul`, `ol`, `li`, `blockquote`, `code` | `div`, `span`, layout tables, nested tables |
| `a` with an http(s) or mailto link | `svg`, `canvas`, `script`, form controls |
| one simple `table` of figures | `h1`, which Teams sets as large as a page title |
| `img` with `width=` and `height=` | the page's fonts and colours |

Teams then sets the message in its own font and its own theme: light, dark or
high contrast, depending on the reader. That is why the block carries no
colour. Emphasis is `<strong>` or `<em>`, never red or green, and anything the
reader must notice is in the words.

## The file has two parts

- **The block**: everything between `<!-- teams:start -->` and
  `<!-- teams:end -->`, inside `#teams-block`. This is the post. The page's
  `#teams-block` style rules are the card's design, so they are exactly what
  the picture copy paints. The text copy carries none of them.
- **The page around it**: a toolbar, a stage, and `#teams-text-preview`,
  which the runtime fills in. Its buttons are wired by the runtime, so the
  page cannot ship a half-wired one:
  - **Copy as picture** puts the headline as text plus the card as one PNG on
    the clipboard.
  - **Copy as text** puts the post on the clipboard as HTML, rewritten for
    Teams as above, with the charts inline as PNG. Its plain-text twin turns
    each chart into its alt text.
  - **Copy chart 1, 2, 3** puts one chart on the clipboard as a picture, for
    when a text paste arrives without its pictures.
  - **Save PNG files** downloads the card and each chart as files to attach
    to the message. These are the "files" of the post.
  - **Picture / Text in Teams** switches the preview between the two copies.

The card picture is drawn by the browser itself: the block's computed styles
go into an SVG `foreignObject`, which is painted onto a canvas. Edge and
Chrome allow this, and Safari refuses. The status line and the freeze report
say so (`card` warning), and Copy as text still works there.

## When it is the right format

Use it when the numbers have to be read in Teams: "post it in the channel",
"drop it in the Teams chat", "share in Teams", "for the stand-up thread". The
sign is that readers will scroll past it in a conversation and won't open a
file.

Compared with the other formats:

- An **email snapshot** goes in a message body, read in an inbox and forwarded.
  If the user says Outlook or Gmail, build that one. If they say Teams, build
  this one. They are not interchangeable, because each block is wrong for the
  other client.
- A **dashboard** is a place people visit. Post a link to it in the channel and
  paste the post's lead finding with the link.
- A **one-pager** is a PDF to attach. Attach it in the channel when the reader
  needs the whole sheet.

A post holds **one to three findings**, like the email snapshot. A channel post
that scrolls for several screens doesn't get read. Past three, share the page
itself.

## Compose it

1. **Kicker, then headline.** An `<em>` line with the scope and date, then an
   `<h2>` stating the one finding the post exists to share. In a busy channel
   the headline and the sentence under it are all most readers see before they
   scroll on.
2. **One or two sentences of context** in a `<p>`.
3. **Each finding is four parts:** an `<h3>` action title, an `<em>` line with
   units and scope, the chart, and an `<em>` caption with the source or the one
   number the chart can't show. Title and units are **text in the block, not in
   the chart config**. In the text copy they follow Teams' theme, can be found
   when searching the chat, and are read aloud by screen readers. In the
   picture copy they are set in the card's own type scale above the chart.
4. **Source line:** the last `<p>` in the block, in `<em>`: where the numbers
   came from, any honesty note (illustrative, carried forward), and the date
   of the snapshot, since it will not update. The card gives it a hairline
   rule and its smallest type, and the text copy puts a blank line above it.

A paragraph that is all `<em>` is a quiet line in the card: the kicker, a
units line, a caption, the source. They are 12px and muted, like the email
block's. Use `<em>` only for those lines, or the card will mute a sentence
you meant to be read.

### The budget

A chart is at most **540px** wide, about the width Teams gives a message
before it shrinks a picture to fit. A narrower picture is shown at its own size.

| Chart | Height at 540px |
|:--|:--|
| line / area, up to ~16 points | 200–240px |
| column, up to ~10 categories | 210–240px |
| horizontal bar | rows × 26 + ~60px |
| scatter, histogram, waterfall | 240–280px |
| donut / pie | rarely: a two- or three-part split is a sentence, or a bar |

As in the email, these heights fall below the manifest's `minHeight` because
the chart has no heading band.

### Headline figures

Teams has no tile row. Put at most three figures in a list, each with one plain
line saying what it is:

```html
<ul>
  <li><strong>690</strong> signups in week 10</li>
  <li><strong>+68%</strong> since week 1</li>
</ul>
```

Skip the list when the headline already states the figure. The dashboard-tile
rules apply here too: no arrows and no coloured verdicts.

### Tables are tables

`table`, `reportTable` and `barInsightTable` draw HTML, which `toPNG()` can't
carry. Write a plain `<table>` with a `<th>` header row and no attributes. The
card sets it with hairlines and right-aligned figures. In the text copy, Teams
stretches it full width with its own borders, but the reader can select and
copy the figures. Keep it to a handful of rows, and use one table per post.

## Charts

- **Draw through `TeamsSnapshot.draw(Charts.line, 'c1', { … })`.** That call
  registers a chart to be frozen and turns animation off. A bare
  `Charts.line('c1', …)` stays an SVG, which Teams doesn't show.
  `check-page.js` fails it. (`TeamsSnapshot` is the email runtime under its own
  name, and `EmailSnapshot.draw` works too.)
- **The container is a placeholder:** a `div` with class `chart`, an id, a px
  `width` (at most 540) and `height` in its style, and a `data-alt`. This is
  the one element in the block allowed a class and a style. `freeze()` replaces
  it with an `<img>` that carries neither.
- **Alt text is the chart** for a screen reader, in the plain-text copy, and
  when searching the chat. `data-alt` states the finding with its numbers, and
  the checker fails alt text that has no figure in it.
- **Nothing is hover-only.** There is no tooltip in a chat. Leave data labels on.
- **Never `transparent: true`.** Teams in dark mode darkens the message but
  not the picture. An opaque chart shows as a light card in a dark thread,
  which is legible.
- **Emphasis follows the usual rule** (`design-rules.md` § Make the chart show the
  finding).

## Type

`--font` is Segoe UI first, the face Teams sets messages in on Windows, then
the system stack. The card and the charts are both set in it
(`Charts.applyMetrics({ font })`), so the picture copy is one face throughout
and the text copy's charts match the text Teams sets around them. This is
the format's one sanctioned metric change, as in the email snapshot. The
block's markup names no font, because Teams would discard it.

## Verify it

1. **Static:** `node <skill-dir>/scripts/check-page.js index.html`. Two rows
   belong to this format: `teams-safe block` (the tag and styling rules) and
   `charts freeze to PNG`.
2. **In the browser:** stage, serve, open, and read the freeze report:
   ```js
   JSON.stringify(await TeamsSnapshot.freeze())
   ```
   It returns `ok`, `target: "teams"`, the lint failures on the **frozen**
   text copy, each image's size in KB, and `card` (the picture's size). A
   `card` warning instead means the browser would not paint the picture. The
   layout audit reports `charts: 0` by then, because the charts have become
   images. Take one screenshot: the card on screen is exactly the picture
   copy.
3. **The paste itself can't be checked from here.** No tool in this skill opens
   Teams. Say so when you hand the file over.

## Hand it over

One file, standalone like every other format (SKILL.md step 8). Tell the user,
in this order:

1. Open the file in Edge or Chrome and pick a copy. **Copy as picture** keeps
   the design exactly. **Copy as text** gives searchable text that Teams
   restyles. The **Text in Teams** preview shows roughly how that will look.
2. Paste into the Teams message box with Ctrl+V (Cmd+V on a Mac). Suggest a
   test in a chat with themselves first.
3. If a text paste arrives without its pictures, click **Copy chart 1** (and
   2, 3) and paste each one under its title. Or use **Save PNG files** and
   attach the card or the charts.

Say which figures came from the user's data and which, if any, were
illustrative, as with every format.

## What it never has

- No class, inline style, colour, `div` or `span` in the block, other than the
  chart placeholders that `freeze()` replaces.
- No controls, no hover, no animation, no script.
- No links back into the page. A link to the full dashboard is welcome when the
  user gave its URL. Never invent one.
- No "Key insight" banner or emoji. The header rules in `layout.md` apply.
- No editable variant yet. If the user asks for one, say so and offer the
  editable email snapshot, or a static post rebuilt on request.
