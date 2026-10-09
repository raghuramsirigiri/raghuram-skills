# Email snapshot layout (`templates/email.html`)

Read with `layout.md`, which holds the rules shared by every format.

An email snapshot is **a chart block that survives being pasted into Outlook or
Gmail**: a 600px table with every style inline, the findings as text, and each
chart frozen into a PNG. It is the narrowest format here, and the one people
actually forward.

## Why the charts are PNG, not SVG

Every other format draws live SVG. An inbox deletes it:

| Client | Inline `<svg>` | PNG `<img>` |
|:--|:--|:--|
| Gmail (web and apps) | stripped | shown |
| Outlook for Windows (Word engine) | not drawn | shown |
| Outlook on the web, new Outlook | inline SVG being retired from Sept 2025 | shown |
| Apple Mail, iOS Mail | drawn | shown |

So the page is built with charts-lib like any other, then **frozen**. Once it
has loaded, `assets/email-snapshot.js` rasterises each chart with the library's
own `toPNG()` at 2x and swaps it into the block as an `<img>` with a fixed
width, height and alt text. It also resolves every `var(--token)` in the
block's inline styles to the hex value the theme gave it. What is left is
static markup with nothing to run and nothing to fetch.

Nothing about this can be done in Node. The PNG has to come from a browser, so
the shipped file freezes itself every time it is opened, and the reader takes
the frozen block from there.

## The file has two parts

- **The block**: everything between `<!-- email:start -->` and
  `<!-- email:end -->`, inside `#email-block`. This is the email. Only this is
  copied.
- **The page around it**: a toolbar and a grey stage, styled by the page's
  `<style>` sheet. It never leaves the file. Its three buttons are wired by the
  runtime, so the page cannot ship a half-wired one:
  - **Copy for email** puts the block on the clipboard as HTML, with a
    plain-text twin in which each chart becomes its alt text.
  - **Save email HTML** downloads a script-free `.email.html` file holding only
    the block, for a mail tool that takes an HTML file.
  - **Save charts as PNG** downloads each frozen image, for the client that
    will not take a paste.

## When it is the right format

Reach for it when the numbers have to travel in the body of an email: "paste it
into the weekly update", "something I can drop into an email", "send it round to
the team", "for the Monday mail", "Outlook", "Gmail", "email-safe". The tell is
that the reader will never open a file. They read the message and forward it.

Against the others:

- A **dashboard** is a place people visit, so link to it.
- A **one-pager** is a PDF to attach. Attaching suits a board pack; pasting
  suits a status update.
- A **report** is an argument longer than an email.

When a request names both, the snapshot carries the headline and the attached
or linked page carries the rest.

A snapshot holds **one to three findings**. Past that, the email has turned into
a report, and the honest move is to send the page itself and paste a snapshot
of its lead finding.

## Compose it

1. **Write the headline**: the one finding the email exists to send, as a
   sentence. Then write one or two sentences of context. On a phone this is
   often all anyone reads, so it has to stand without the charts.
2. **Pick at most three findings that need a picture.** A finding the reader
   will accept as a sentence stays a sentence. A table of figures the reader
   will look up is an email `<table>`, never a chart (see below).
3. **Lay each finding out as four rows:** an action title, a subtitle with units
   and scope, the chart, and a caption. Title and subtitle are **text in the
   block, not in the chart config**. Text survives image blocking, adapts to
   dark mode, can be searched, and is read aloud; text baked into a PNG does
   none of that. `check-page.js` fails a chart config that carries a `title`.
4. **Footer:** the source, any honesty note (illustrative, carried forward), and
   the fact that it is a snapshot of a date and will not update.

### The budget

The block is 600px wide. With 24px gutters a chart gets **552px**.

| Chart | Height at 552px |
|:--|:--|
| line / area, up to ~16 points | 200–240px |
| column, up to ~10 categories | 210–240px |
| horizontal bar | rows × 26 + ~60px |
| scatter, histogram, waterfall | 240–280px |
| donut / pie | rarely: a two- or three-part split is a sentence, or a bar |

The heights sit below the manifest's `minHeight` because there is no heading
band: the checker takes ~60px off the minimum for a chart with no title.

`.wide` exhibits do not exist here. A sankey or geofacet that needs more than
552px is not an email chart, so link to the page that has it.

### A row of headline figures

At most three, in one nested table row. Each is a number with **one line saying
what it is**. No arrows, no red or green, no "▲ 12%". The template's
dashboard-tile rules apply (`design-rules.md` § One design system), and so does the
one-pager's warning: a number set larger than the headline becomes the loudest
thing in the email. The template sizes them at 18px under a 20px headline. Skip
the row when the headline already states the figure.

### Tables are tables

`table`, `reportTable` and `barInsightTable` draw HTML, which `toPNG()` cannot
carry, and a picture of a table is worse than a table anyway: you can't select
it, search it or read it with images off. Write a plain email `<table>`:

```html
<table role="presentation" width="552" cellpadding="0" cellspacing="0" border="0" style="width:552px;border-collapse:collapse;">
  <tr>
    <td style="padding:6px 0;border-bottom:1px solid var(--hair);font-family:var(--font);font-size:12px;line-height:16px;color:var(--muted);">Queue</td>
    <td align="right" style="padding:6px 0;border-bottom:1px solid var(--hair);font-family:var(--font);font-size:12px;line-height:16px;color:var(--muted);">Median, h</td>
  </tr>
  <tr>
    <td style="padding:6px 0;border-bottom:1px solid var(--hair);font-family:var(--font);font-size:13px;line-height:18px;color:var(--ink);">Billing</td>
    <td align="right" style="padding:6px 0;border-bottom:1px solid var(--hair);font-family:var(--font);font-size:13px;line-height:18px;color:var(--ink);">4.9</td>
  </tr>
</table>
```

## Markup rules

Each rule is checked twice: by `check-page.js` on the source, and by
`freeze()` on the frozen block. Both run the same `lint()` from
`assets/email-snapshot.js`. Each failure is invisible in the browser that built
the page, which is why they need a checker.

| Rule | Why |
|:--|:--|
| Tables for layout: no `div`, flex, grid, float or position | Outlook for Windows lays out with Word, which ignores all of them |
| Every style inline; no `class`, no `<style>` | Gmail and Outlook strip or rewrite style sheets |
| Every `<td>` that holds text sets `font-family` | Outlook does not inherit a font from a table into its cells |
| The font stack starts with a system face | When the first family is missing, Outlook uses Times New Roman instead of falling through the stack |
| Colours as `var(--token)` (resolved at freeze) or `#rrggbb` | Outlook drops `rgb()`, `hsl()`, `oklch()` |
| No `url()` backgrounds | Outlook draws no CSS background image |
| Nothing wider than 600px | Anything wider scrolls sideways on a phone |
| Each `<img>` has a numeric `width=` | Without it Outlook draws the 2x PNG at double size |
| Links are `http(s):` or `mailto:` only | A `#anchor` or `javascript:` link goes nowhere once the block has left the page |
| No `button`, `select`, `input`, `form`, `script`, `onclick` | Nothing runs in an inbox |

## Charts

- **Draw through `EmailSnapshot.draw(Charts.line, 'c1', { … })`.** That call is
  what registers a chart for freezing, and it turns animation off so the PNG is
  the finished chart. A bare `Charts.line('c1', …)` stays an SVG, which mail
  clients delete. `check-page.js` fails it.
- **The container is a placeholder** with class `chart`, an id, a px `width`
  and `height` in its style, and a `data-alt`. The box is the image: the PNG is
  cut at exactly that size.
- **Alt text is the chart.** With images blocked, in a plain-text client, and
  for a screen reader, `data-alt` is all the reader gets, so it states the
  finding *with its numbers*: "Median first response rose from 3.8h in week 28
  to 7.4h in week 31, then held between 5.4h and 5.8h." The checker fails alt
  text with no figure in it.
- **Nothing is hover-only.** There is no tooltip in an inbox. Leave data labels
  on, and put any value the reader needs that the chart cannot print in the
  caption. The checker notes `dataLabels: false`.
- **Never `transparent: true`.** Dark-mode mail apps darken the message but not
  the image, so a transparent chart's dark ink lands on a dark background. The
  default opaque `theme.bg` shows as a light card in a dark message, which is
  legible.
- **Emphasis follows the usual rule** (`design-rules.md` § Make the chart show the
  finding): accent the subject when the title names it, and mute the rest.

## Colour and type

- **Colours follow the theme.** The template's sync block copies
  `Charts.theme` into `--card`, `--ground`, `--ink`, `--muted`, `--hair` and
  `--accent`. Write those tokens in the block's inline styles and `freeze()`
  writes the hex in. A brand recolour is still one `Charts.applyPalette` call
  (`theming.md`).
- **One font, a system one.** `--font` is `Arial, Helvetica, sans-serif`, and
  the template sets the charts in it too (`Charts.applyMetrics({ font })`), so
  the text in each PNG matches the text around it. That is this format's one
  sanctioned metric change, for the same reason the one-pager scales its type.
  A brand webfont never goes in the block: no mail client will load it, and
  Outlook would set the text in Times New Roman.

## Size

Each PNG is 30–80 KB at 2x for a typical chart. When the block is **pasted**,
the client turns each image into an attachment, so message size doesn't
matter. When the saved `.email.html` is sent through a mail tool as raw HTML,
the images travel inside it, and **Gmail clips a message past ~102 KB** behind
"[Message clipped]". `freeze()` warns past that size. For a mail tool, send
fewer charts, or host the PNGs and swap the `src`.

## Verify it

1. **Static:** `node <skill-dir>/scripts/check-page.js index.html`. Two rows
   are this format's own: `email-safe block` (the markup rules) and `charts
   freeze to PNG`.
2. **In the browser:** stage, serve, open, and read the freeze report rather
   than taking a screenshot:
   ```js
   JSON.stringify(await EmailSnapshot.freeze())
   ```
   It returns `ok`, the lint failures on the **frozen** block (a chart that drew
   an error panel, a token left unresolved), each image's size in KB, and
   warnings for size and scope. A chart that refused its data shows up here
   as `chart drew`. The usual layout audit runs too, but by then the charts
   are images, so it reports `charts: 0`. That is expected, and this report is
   the one that checks them. Then take one screenshot: the block on screen is
   exactly what will be pasted.
3. **The paste itself cannot be checked from here.** No tool in this skill opens
   Outlook or Gmail. Say so when you hand the file over, and say which client
   the user should paste into first.

## Hand it over

One file, standalone like every other format (SKILL.md step 8). Tell the user,
in this order:

1. Open the file in a browser and click **Copy for email**.
2. Paste into the body of a new message. Desktop clients such as Outlook and
   Apple Mail normally embed pasted images as attachments, and Gmail on the web
   normally does too. Nothing in this skill can confirm that for their client
   and account, so ask them to send a test to themselves first.
3. If a client drops the images, use **Save charts as PNG** and insert each
   one inline. The text rows are already there.

Say which figures came from their data and which, if any, were illustrative,
the same as for every format.

## An editable snapshot

When the user asks for an editable snapshot (so they can fix a number or a
title and copy it again next week without you), build it from
`templates/email-editable.html` and follow `editable.md` § An editable email
snapshot. The block's rules above don't change. The charts move into the page
spec, and each chart's alt text moves into an editable row that the email
never carries. Don't offer one unprompted beyond the usual one-line offer on
the first page.

## What it never has

- No controls, no hover, no animation, no script in the block.
- No links back into the page. A link to the full dashboard is welcome when the
  user gave its URL. Never invent one.
- No "Key insight" banner or emoji. The header rules in `layout.md` apply: the
  kicker, the headline, the context sentences, then the charts.
