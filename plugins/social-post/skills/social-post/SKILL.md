---
name: social-post
description: Turn data the user supplies (a table, CSV, pasted numbers, metrics, notes) into a social media post with a chart — one to three chart cards painted as pictures at each platform's size (1080x1350, 1080x1080, 1200x675) with the headline, units, source and date in the picture, plus the words to post, one version per platform within its character limit. Use whenever the user wants to post a chart or a finding on LinkedIn, X/Twitter, Bluesky, Threads, Mastodon or Instagram, "a tweet with the chart", "something for our socials", or a data post for a feed. Posts only: not dashboards, reports, decks, email or chat messages. Writes one standalone HTML file with Copy picture, Save PNG, Copy alt text and Copy text buttons; never posts, schedules or invents a handle or link.
---

# Social post

Turn the numbers the user gives into a post for a public feed: one to three
**cards**, each one finding with one chart, painted into a picture at the size
the platform asks for, and the **words** to post with them, one version per
platform the user named. The output is one self-contained HTML page. The user
opens it, copies each picture and each post, and publishes them themselves.

`<skill-dir>` below is the directory holding this file
(`${CLAUDE_SKILL_DIR}` where the agent expands it). Resolve `templates/`,
`references/`, `scripts/` and `assets/` against it, never against the working
directory.

This file is the route; the detail lives in `references/`, and each step says
which file to read and when.

## Rules that hold on every post

1. **Never invent numbers that read as real measurements.** A topic with no
   data gets figures labelled *illustrative* on the card **and** in the post.
   A missing value is a gap (`null`), never a zero. A modelled value never
   joins a measured line as another point.
2. **The picture carries everything.** It gets reposted without its words, so
   the finding, units, source and date are painted into the card.
3. **One finding per card, at most one chart, one to three cards.** More
   findings than that are a page, not a post: pick the ones that lead and say
   which you left out.
4. **Every figure in a post is on a card.** No number in the words that the
   pictures don't show, and no cause the user didn't state: not in the post,
   not on the card, and not in the chat as a caveat or a sample reason.
5. **The headline states the finding with its number, and its arithmetic is
   checked first.** "Doubled", "half", "the biggest" are claims: compute them
   before writing them.
6. **Nothing invented around the data.** No handle, logo, link or hashtag the
   user didn't give; no engagement bait; no emoji decoration.
7. **One standalone file.** No CDN, no `<script src>` or `<link href>`, no
   webfont. `scripts/finalize.js` inlines the library and its exit code is the
   gate (step 8).
8. **Never post.** No tool here opens a platform. Don't offer to post,
   schedule or reach a platform's API; the user publishes it.

## Workflow

1. **Extract the data and find the findings.** Pull every number, category and
   period out of the user's input. List the findings it holds, each as one
   sentence with its number, and note for each: the data shape, the values it
   needs, and how many values run across it. If the user gave a topic with no
   numbers, say plainly that the figures will be illustrative (rule 1). If they
   named no platform, build LinkedIn and X, and say so at handover.

2. **Pick the one to three findings to post.** The one the user asked about
   leads; then the largest change. Read `references/headlines.md`, and write
   each headline: the finding, with its number, arithmetic checked (rule 5).
   Under ~95 characters (~80 on a landscape card). No finding with a number in
   it means nothing to post yet: say so and ask what the post should show.

3. **Copy the template.** `<skill-dir>/templates/social.html` to `./post.html`
   (or where the user asked). Leave its four `charts-lib/…` tags exactly as
   written: they are placeholders that step 8 folds in. Don't copy
   `assets/charts-lib/` beside it.

   **Static unless asked.** Build an *editable* post (charts as JSON, an
   **Edit page** button) only when the user asked; read
   `references/editable.md` first and start from `social-editable.html`.

4. **Compose the cards and the words.** Read `references/cards-and-posts.md`:
   card sizes, the five parts of a card (kicker, headline, units line, chart,
   source with a date), chart room per size, the platforms' limits and folds,
   and the rules for the words. `portrait` is the default size; `landscape`
   for an X- or Bluesky-only post with a simple chart.

5. **Choose each card's chart, then write its config against the API.** Read
   `references/card-charts.md` (which chart fits a card, emphasis, labels;
   it points into `references/chart-selection.md` for the input contract and
   the emphasis code), then `references/chart-api.md` and only the `references/charts/<type>.md`
   files for the types you use, in one read. Never guess an option name.
   Draw every chart through `SocialSnapshot.draw(Charts.<type>, 'id', config)`,
   the id in single quotes (`check-page.js` reads only those), with no title
   or subtitle in the config, and give it a `data-alt` that states the
   finding with its numbers. When a card marks a forecast, a target
   or an event, read `references/annotation.md`.

6. **If the user pointed at a brand** (site, stylesheet, hex codes), recolour
   and change nothing else. Read `references/theming.md`, then run
   `node <skill-dir>/scripts/generate-theme.js '#2323FF'` (or
   `extract-theme.js` on their stylesheet), and apply its one
   `Charts.applyPalette` call before the first chart. A logo goes on a card
   only if they supplied the file.

7. **Verify before reporting done.** Read `references/verify-and-ship.md` and
   follow it. In short: `node <skill-dir>/scripts/finalize.js post.html
   --stage`; `node <skill-dir>/scripts/check-page.js post.html` and fix what it
   reports; in a browser at 1440x900, `JSON.stringify(await
   SocialSnapshot.freeze())` until `ok` is true; one screenshot of the cards;
   then re-read every figure against the data. Without a browser, say the
   pictures weren't checked in one.

8. **Fold the library in and ship one file:**
   `node <skill-dir>/scripts/finalize.js post.html`. A non-zero exit means you
   are not done. If Node may be missing, run `sh <skill-dir>/scripts/finalize.sh`
   (or `scripts/finalize.ps1` on Windows) with the same arguments; it prints
   `UNCHECKED` when it could not run the checks, and you say so.

## Output

One HTML file, standalone. Surface it however your environment does (in
Claude Code: `SendUserFile` with `display: "render"`), otherwise print its
absolute path. Then, in chat:

- How to use it: open it in Edge or Chrome; per card **Copy picture**,
  **Save PNG**, **Copy alt text**; per platform **Copy text**. Paste the text,
  then the picture, then the alt text into the picture's description field.
- Nothing was posted, and the post itself wasn't tried on the platform.
- The handover with handles: each card's size, headline and figures, each
  post's length against its limit and the figures it carries, which figures
  came from their data and which were illustrative, and the closing line
  (`references/tracing.md` § Handles and the closing line). Handles are for
  the chat only: never on a card or in a post.

Worked handover:

```
post.html — 1 card, 2 posts. Open in Edge or Chrome; nothing was posted.

C1 · portrait · "Sign-ups doubled in six weeks, from 310 to 640"
     C1.1 310 (week 1) · C1.2 640 (week 6) · C1.3 doubled (640 ÷ 310 = 2.06×)
LinkedIn · 412 / 3,000 · figures 310, 640 (both C1)
X · 214 / 280 · figures 310, 640 (both C1)
From your data: every figure. Illustrative: none.

Ask "where does C1.3 come from?" or "why is that C1's headline?" to see the working behind any figure.
```

On the **first** post in a conversation, if the user didn't ask for an editable
one, offer it once in one line before the handover: *"Want an editable version,
so you can change the wording or the numbers yourself without rerunning this?"*
An editable post ships as two files, `<name>.html` (final, to share) and
`<name> (working copy).html` (editable); say which is which.

## Tracing

A post puts a figure in public under the user's name, so every figure must be
answerable from their data in one turn. Read `references/tracing.md` before
answering any follow-up. It carries the handles (`C1…C3`, `C1.1`, platform
names), the fixed closing line, the trace block (*From your data · Working ·
Where it appears · What would change it*), the headline block, and the
questions to expect: *"where does C1.3 come from?"*, *"why is that the
headline?"*, *"can we say doubled?"*, *"it's 25%, not 23%"*, *"round it up"*,
*"put the 40% in the X post"*, and *"add a line on why it went up"*. That last
one gets only a cause the user stated, in their words.

A trace re-reads the data and **corrects the post** when it's wrong: the card
and every post carrying the figure, then steps 7–8 again. Pushback alone moves
nothing.

## Environment notes

Nothing here needs a specific agent or vendor: file reads from this directory,
writing an HTML file, and Node for `finalize.js` and the checks. A browser is
used for the freeze check and the screenshot when one is available. The
pictures are painted by the browser that opens the file: Edge and Chrome paint
them, Safari refuses, and the page says so.
