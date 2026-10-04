# Page layouts

Five formats. Pick one; don't blend prose-heavy narrative into a bento grid,
don't turn a deck into a report by filling its slides with paragraphs, don't
shrink a dashboard onto a sheet of paper and call it a one-pager, and don't
paste a dashboard into an email and hope.

This file holds what they share. The rules for the format you picked are in its
own file — read that one and skip the others:

| Format | Template | Read |
|:--|:--|:--|
| Dashboard | `templates/dashboard.html` | `layout-dashboard.md` — composing the grid, sizing cells, tables |
| Report | `templates/report.html` | `layout-report.md` — the paper column, figures and captions |
| Deck | `templates/slides.html` | `layout-deck.md` — the spine, a layout per claim, deck charts |
| One-pager | `templates/onepager.html` | `layout-onepager.md` — the fixed sheet, the column budget, what to cut |
| Email snapshot | `templates/email.html` | `layout-email.md` — the 600px table block, charts frozen to PNG, what a mail client strips |

## All five

- Colors come from `Charts.theme`, which is derived from `Charts.palette`. All
  three templates carry the same sync block, copying the theme's canvas, ink,
  muted, hairline and panel-surface values into the page's CSS variables at
  load, so charts sit flush with their surface and one `Charts.applyPalette`
  call reskins everything. Don't hand-edit the color literals in `:root` —
  change the palette. Method in `theming.md`.
- The page-level choices the theme does not set are `--radius`, and the ground
  behind the cards or the paper — `--bg` in the dashboard and report, `--ground`
  in the deck. Keep it a small step from `Charts.theme.bg`: the charts paint
  themselves in `theme.bg`, so that step is what makes a figure read as a card
  sitting on the page rather than as ink bleeding into it.
- A chart placed on a surface that is **not** the card colour — a tinted
  note, an emphasised card, a coloured slide band — takes
  `chart: { transparent: true }` rather than a one-off theme override, so it
  sits on that surface with no visible box.
- Charts redraw themselves when their container resizes or is first shown, so
  tabs, collapsible sections and a print layout need no redraw code. The one
  lifecycle rule is in `controls.md`: destroy a chart before redrawing it.
- **Legend position is fixed**: charts-lib draws it at the top under the
  subtitle, on every chart type. Never reposition it per panel or rebuild it in
  HTML — a legend that moves between panels makes the reader search for it each
  time. Suppressing it is a per-*situation* decision applied consistently, not a
  per-panel fix for one cramped cell.
- Header carries title, one-line scope, and the reporting window — nothing else.
  No self-authored summary banner, insight strip, or editorial adjectives; see
  the copy rules in SKILL.md. (In a deck the cover does this job, and the
  generated per-slide footer carries the running context.)
- Footer carries sources, definitions, and a note if any figure is illustrative.
  A deck has no room for that strip on every slide: put it on a closing slide.
- Everything ships as **one** HTML file with the library inlined — no sibling
  folder, no CDN, no build step. See SKILL.md step 8.
- The email snapshot is the one exception to "charts are live SVG". A mail
  client deletes SVG, so its charts are frozen into PNGs when the page opens,
  and everything above about the page's CSS stops at the edge of its email
  block. The block carries its styles inline (`layout-email.md`).
- Two of the five are **fixed-size**: a deck slide is 1280x720, a one-pager's
  sheet is 730x990 (or 990x730 landscape). Both keep those authored pixels and
  are scaled to the window by a transform, so what is on screen is what comes
  out of the printer, and both crop rather than scrolling when something
  outgrows the frame. The browser audit reports that as `off-slide` and
  `off-sheet`; treat either as content that would be sliced off the paper.

## Fit the page to how it will be read

The templates are tuned for someone reading at a desk. When the user tells you
otherwise — and they usually do, in passing — adapt, because the same page fails
badly in a different context:

- **"Behind me on screen", "for the all-hands", "I'm presenting this"** — this
  is the deck's case, not a dashboard with bigger type: use
  `templates/slides.html` and give each claim its own slide. Where a deck is
  genuinely wrong — a live monitoring screen on a wall, say — keep the panels
  few, give each a lot of room, and scale the type up
  (`Charts.theme.titleSize`, `tickSize`, `valueSize`, and a larger `--kpi-value`
  step). A dense grid that works on a laptop is unreadable in a room.
- **"Paste it into the weekly update", "something I can drop into an email",
  "send it round in Outlook"** — this is the email snapshot's case: a 600px
  block that survives the paste (`templates/email.html`). Gmail and Outlook
  delete SVG, strip style sheets and run no script, so the charts go in as
  frozen PNGs with alt text, the titles go in as text, and there is nothing to
  hover or click. One to three findings. Past that, send the page and paste the
  lead finding.
- **"Send it round", "for the board pack"** as a file or link: it will be read
  alone, without you narrating. Lean on subtitles and callouts to carry the
  context you would otherwise say out loud.
- **"Print it", "PDF", "one page", "a handout", "pin it up"** — this is the
  one-pager's case: a fixed sheet that comes out of the printer as exactly one
  page (`templates/onepager.html`). Tooltips do not exist on paper and a
  dropdown prints as a grey box, so every value a reader needs is a label, a
  KPI or an axis tick, and there are no controls at all. When the findings do
  not fit one sheet, the answer is to cut, or to build a report — not to shrink
  the type. If what they want printed is an argument that runs longer than a
  page, that was a report all along, and a report prints in one column.

None of this changes the design system — same palette, same type scale
relationships, same components. It changes how much you put on the page and at
what size.
