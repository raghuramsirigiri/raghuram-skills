# Verify and ship (SKILL.md steps 7–8)

Read this when the page is built and you are about to check it. Step 7 finds
what is wrong, cheapest check first; step 8 folds the library in and gates the
result. `<skill-dir>` is the directory holding SKILL.md.

## Step 7 — Verify before reporting done

The page still has its `charts-lib/…`
placeholders at this point, so to *run* it you need the library beside it
temporarily. Stage it — step 8 removes it again:
```bash
node <skill-dir>/scripts/finalize.js index.html --stage
```
Then check it, cheapest first. Work from text reports; a screenshot is the
proof you take once at the end, not the way you find problems — each one
costs far more than a JSON report and still leaves you guessing which
element is wrong.

1. **Static checks, no browser.** Run the bundled checker and fix what it
   reports:
   ```bash
   node <skill-dir>/scripts/check-page.js index.html
   ```
   It catches the failures that do not throw and so survive a
   confident-looking build: a panel whose chart was never wired (an empty
   box), a line over unordered categories (an error panel *inside* the
   chart), a page still pointing at `charts-lib/`, and anything else that
   reaches the network. Each one reads as a styling bug rather than the
   missing wiring it is. It also does the layout arithmetic a screenshot
   would otherwise be taken for: a chart in a dashboard cell smaller than
   its engine's minimum size (it names the `w`/`h` that fits), a title
   too long for two lines at its cell width (the cut-off tail is usually
   the finding), and donut options written at the top level, where the
   engine ignores them. Fix these before opening a browser — each costs
   one command, where finding the same thing there costs a screenshot and
   a guess. Run it here without `--final` — the page is not
   inlined yet, and mid-build that is simply where you are.
2. **The layout audit, in a browser.** Serve the page over a local HTTP
   server (not `file://`, so the scripts execute), open it at a desktop
   size — at least 900px wide; a hidden browser pane can report 0x0, so set
   the size explicitly (1440x900) — and run this in the page (in Claude
   Code: `javascript_tool`):
   ```js
   await new Promise((ok, no) => { const s = document.createElement('script');
     s.src = 'charts-lib/audit.js?' + Date.now(); s.onload = ok; s.onerror = no;
     document.head.appendChild(s); });
   JSON.stringify(await ChartsAudit.run())
   ```
   `--stage` put `audit.js` beside the page; the page never references it,
   and step 8 removes it. It returns `ok` and a short list naming the panel
   or slide behind each problem: an empty chart, an error panel (with its
   message), a chart overflowing its cell, content clipped by a card or
   cell, text spilling out of a KPI tile, slide content past the 1280x720
   frame or into the footer, sideways page scroll, and template placeholder
   text left on the page. Warnings flag labels drawn over each other,
   labels cut short with "…", and KPIs still showing "—". Fix the fails,
   reload, and run it again until `ok` is true. Read the console as well,
   filtering on `[charts-lib` — the audit cannot see errors thrown before
   it loaded.

   A panel reading *"Line charts need a continuous or temporal x-axis"* is
   the input-contract failure above — change the chart type or the x values,
   don't restyle it. A `stale-size` warning means only that the browser
   tab is hidden and could not redraw the chart; ignore it.
3. **One screenshot, at the end.** When the audit is clean, take a single
   screenshot at reduced scale (`scale: 0.5`) as proof and to catch what
   no measurement can judge — a colour that vanishes on the canvas, a
   layout that is technically sound but reads badly. Take another only when
   that one shows a problem the audit did not name.

Without browser tooling, step 1 is the floor; say that the layout was not
checked in a browser.

**If you built a deck,** the audit's `off-slide` and `into-footer`
checks are the paper check: a slide whose content outgrew its frame is
silently cropped in the PDF rather than scrolled, and those two find it.
Open the print preview only if you changed the template's print CSS.

**If you built a one-pager,** three things are the paper check. The static
checker's `fits one page` does the arithmetic — the sheet plus its `@page`
margin against both A4 and Letter, and the figures in each column against
the column — while `paper-ready` fails a control and flags a chart whose
numbers only exist in a tooltip. The audit is what sizes the **text**, which
no static check can: a column whose blocks overrun comes back as `clipped-y`
on that column, and content past the sheet as `off-sheet` — the deck's
`off-slide`, with the same meaning. Then open the print preview once, and
confirm the one thing nothing in the page can measure — that it came out as
**one** page.

**If you built an email snapshot,** the static checker's `email-safe block`
and `charts freeze to PNG` rows lint the source, and in the browser
`JSON.stringify(await EmailSnapshot.freeze())` lints the frozen block: the
images, the resolved colours, and each PNG's size. That report replaces the
paper check. The paste into a real mail client is the one step no tool here
can run, so say so at handover (`layout-email.md` § Verify it).

**If you built a Teams post,** the same holds with the Teams rules: the
checker's rows are `teams-safe block` and `charts freeze to PNG`, and
`JSON.stringify(await TeamsSnapshot.freeze())` lints the frozen block. No
tool here opens Teams, so say that at handover too (`layout-teams.md`
§ Verify it).

**If the page has any control, test it** — an untested filter is usually a
broken filter. With the audit loaded, change each control to a
non-default value:
```js
JSON.stringify(await ChartsAudit.tryControl('#region', 'West'))
```
It sets the value, fires `input` and `change`, waits for the redraw, and
returns the charts that `changed`, the ones left `unchanged`, and every
title and KPI whose text moved. A chart that should follow the filter but
is listed as `unchanged` is a half-wired control; an action title that
does not appear under `titles` or `text` did not recompute. No screenshot
needed.

## Step 8 — Fold the library into the page, and ship one file

A dashboard outlives
the folder it was written in — it gets emailed, dropped in Slack, committed
to a wiki, opened from Downloads. A page that loads `charts-lib/charts.js`
from a sibling folder renders as an empty grid the moment it travels alone,
and it fails *silently*: the markup, the headings and the KPI numbers are all
there, so it looks like a styling bug rather than a missing dependency. So
the last build step replaces the three placeholder tags with the library's
own contents. One command does the whole ending — checks the page as built,
inlines the library, removes the staged copy, then re-checks with `--final`,
which this time *insists* the page is standalone:
```bash
node <skill-dir>/scripts/finalize.js index.html
```
It stops before inlining if the build checks fail, since inlining a broken
page only makes it a bigger broken page, and its exit code is the gate: a
non-zero exit means you are not done. It removes a sibling `charts-lib/`
only when that folder holds exactly the three files it staged, so a folder
of your own that happens to share the name survives.
The result is one ~590 KB HTML file that opens over `file://` with no server,
no network, and no sibling folder. Some rules that follow from that:
- **Never reintroduce a `<script src>` or `<link href>` to anything.** No CDN
  for a chart library, a font, an icon set, or a CSS reset — an offline
  reader, a locked-down laptop, or an air-gapped review gets a broken page.
  Web fonts are the common slip: name the family in the CSS stack and let it
  fall back to the system face, which is what the template already does.
- **Images go in as `data:` URIs** or not at all.
- **The library is inlined verbatim.** Don't minify it, don't strip the parts
  you think a page doesn't use, and don't hand-edit the inlined copy — a
  bug fixed in the page instead of in `assets/charts-lib/` is lost on the
  next build. Rerunning `finalize.js` on an already-inlined file is a
  harmless no-op, so it is safe to re-run after edits.
- **If the user explicitly asks for the split form** — they're checking the
  page into a repo beside other pages that share the library, say — skip
  `finalize.js` and keep the staged `charts-lib/` next to the output, with
  the placeholder tags as the real references. Check that page with
  `scripts/check-page.js index.html` (no `--final`, which would fail it for
  the references it is supposed to have). That is the exception, not the
  default.
