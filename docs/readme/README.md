# README and docs-site images

The images in the main README and on the docs site are built from the pages in
this folder, so they can be rebuilt whenever the templates or the chart library
change. One build writes both.

| Path | What it is |
|:--|:--|
| `pages/` | One showcase page per format, built from the skill's templates on one fictional bike-share season. They keep the `charts-lib/…` placeholder tags, so they stay small; the build stages the library beside a temporary copy. |
| `frame.html` | The browser-window frame each capture is placed in. |
| `hero.html` | The composition at the top of the README, laid out from the raw captures. |
| `build.mjs` | Captures every page in headless Chrome, runs the skill's layout audit on it, then renders the framed images and the hero. |
| `images/` | The output the README links to. `images/raw/` holds the unframed captures and is not committed. |
| `../img/` | The same frames for the docs site (`docs/index.html`): 1x WebP, about 40–100 KB each, plus `og.png`, the hero as a 1x PNG for social previews. |

Rebuild everything, or only the named shots (the hero is always recomposed):

```bash
node docs/readme/build.mjs
```

```bash
node docs/readme/build.mjs dashboard deck
```

Needs Node 22 or later and Chrome. Set `CHROME` to Chrome's path if it isn't
installed in the default location.

Each capture is a 16:10 window. Where a page runs on below the window, as the
report, one-pager and email snapshot do, the window height in `build.mjs` is
chosen so its bottom edge falls in a gap between blocks rather than through a
line of text. If you change one of those pages, check that edge again.
