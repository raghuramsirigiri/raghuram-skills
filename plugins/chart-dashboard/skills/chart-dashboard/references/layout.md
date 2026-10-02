# Page layouts

Three formats. Pick one; don't blend prose-heavy narrative into a bento grid,
and don't turn a deck into a report by filling its slides with paragraphs.

This file holds what all three share. The rules for the format you picked are
in its own file — read that one and skip the others:

| Format | Template | Read |
|:--|:--|:--|
| Dashboard | `templates/dashboard.html` | `layout-dashboard.md` — composing the grid, sizing cells, tables |
| Report | `templates/report.html` | `layout-report.md` — the paper column, figures and captions |
| Deck | `templates/slides.html` | `layout-deck.md` — the spine, a layout per claim, deck charts |

## All three

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
- **"Send it round", "paste into the weekly update", "for the board pack"** — it
  will be read alone, without you narrating. Lean on subtitles and callouts to
  carry the context you would otherwise say out loud.
- **"Print it", "PDF"** — one column, no reliance on hover; tooltips don't exist
  on paper, so anything only visible on hover must also be a label.

None of this changes the design system — same palette, same type scale
relationships, same components. It changes how much you put on the page and at
what size.
