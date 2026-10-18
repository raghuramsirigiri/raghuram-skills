# Verify and ship (SKILL.md steps 7–8)

Read this when the post is built and you are about to check it. Step 7 finds
what is wrong, cheapest check first; step 8 folds the library in and gates the
result. `<skill-dir>` is the directory holding SKILL.md.

## Step 7 — Verify before reporting done

The page still has its `charts-lib/…` placeholders at this point, so to *run*
it you need the library beside it temporarily. Stage it; step 8 removes it
again:

```bash
node <skill-dir>/scripts/finalize.js post.html --stage
```

Then check it, cheapest first. Work from text reports; one screenshot at the
end is the proof, not the way you find problems.

1. **Static checks, no browser.**
   ```bash
   node <skill-dir>/scripts/check-page.js post.html
   ```
   The rows for a post are `social card` (one chart per card, a headline and a
   dated source on every card, alt text with a figure, each post within its
   platform's limit, every figure in a post present on a card) and `charts
   freeze to PNG` (every chart drawn through `SocialSnapshot.draw`, no title or
   subtitle in a config). It also catches a chart that was never wired, a line
   over unordered categories, and anything reaching the network. Run it here
   without `--final`: the page is not inlined yet. Fix every fail; read every
   warning (engagement bait, a stock opener, a hashtag pile, an undated source)
   and fix it unless it has an honest reason to stay.

2. **The freeze, in a browser.** Serve the folder over a local HTTP server (not
   `file://`), open the page at 1440x900 (a hidden browser pane can report
   0x0, so set the size), and run in the page:
   ```js
   JSON.stringify(await SocialSnapshot.freeze())
   ```
   It returns `ok`, `target: "social"`, each card's picture size
   (`1080x1350`…), each post's length against its limit, and the lint
   failures. It fails a card off its frame, content running past the frame
   (`card overflow`), and a chart squeezed under 110px (`chart room`). A `card`
   warning means this browser would not paint HTML onto a canvas: Edge and
   Chrome do, Safari refuses. Fix the fails, reload, run it again until `ok` is
   true. Read the console too, filtering on `[charts-lib`.

   The layout audit is staged as well (`charts-lib/audit.js`), for a page that
   misbehaves before the freeze runs:
   ```js
   await new Promise((ok, no) => { const s = document.createElement('script');
     s.src = 'charts-lib/audit.js?' + Date.now(); s.onload = ok; s.onerror = no;
     document.head.appendChild(s); });
   JSON.stringify(await ChartsAudit.run())
   ```
   Once the freeze has run it reports `charts: 0`, because the charts have
   become pictures. That is expected.

   A card reading *"Line charts need a continuous or temporal x-axis"* is the
   input-contract failure (`card-charts.md`): change the chart type or the x
   values, don't restyle it.

3. **One screenshot, at the end.** When the freeze is clean, take one
   screenshot of the cards. What's on screen is the picture, pixel for pixel,
   at 1/2.5 scale. Look for what no check can judge: a colour that vanishes on
   the card, a headline that reads badly.

4. **Re-read every figure against the data.** For each card and each post,
   find each number in the user's data or recompute it (`headlines.md`
   § Check the arithmetic). The checker proves the post's figures are on a
   card; only this step proves the card's figures are right.

Without a browser, steps 1 and 4 are the floor. Say the pictures weren't
painted and checked in one.

**The post itself can't be checked from here.** No tool in this skill opens a
social platform. Say so at handover.

## Step 8 — Fold the library in, and ship one file

A post page gets saved to Downloads, sent to a colleague for sign-off, opened
again next quarter. A page that loads `charts-lib/charts.js` from a sibling
folder paints blank cards the moment it travels alone. So the last step
replaces the placeholder tags with the library's own contents:

```bash
node <skill-dir>/scripts/finalize.js post.html
```

It checks the page as built, inlines the library and the freeze runtime,
removes the staged copy, then re-checks with `--final`, which insists the page
is standalone. A non-zero exit means you are not done. It removes a sibling
`charts-lib/` only when that folder holds exactly the files it staged.

**No Node?** `scripts/finalize.sh` (sh and awk) and `scripts/finalize.ps1`
(Windows PowerShell) take the same arguments. With Node on PATH they run
`finalize.js`. Without it they stage, inline, clean up and split an editable
page the same way, but cannot run `check-page.js`: they print `UNCHECKED` and
still exit 0. Tell the user the static checks were skipped, and lean on the
browser freeze if you have one.

```bash
sh <skill-dir>/scripts/finalize.sh post.html
```

Rules that follow from shipping one file:

- **Never add a `<script src>` or `<link href>` to anything.** No CDN, no
  webfont, no icon set. Name a font in the CSS stack only if it is a system
  face or a file the user supplied.
- **Images go in as `data:` URIs** or not at all. A logo goes on a card only
  if the user supplied it.
- **The library is inlined verbatim.** Don't minify it, strip it or hand-edit
  the inlined copy. Re-running `finalize.js` on an inlined file is a no-op.
