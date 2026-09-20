#!/usr/bin/env node
/**
 * inline-lib.js — fold charts-lib into the page so the output is one file.
 *
 * A dashboard usually outlives the folder it was written in: it gets emailed,
 * dropped in Slack, committed to a wiki, opened from Downloads. A page that
 * loads `charts-lib/charts.js` from a sibling folder renders as an empty grid
 * the moment it travels alone, and it fails silently — the markup is all
 * there, the charts just never appear. So the library is inlined instead.
 *
 *   node <skill-dir>/scripts/inline-lib.js <file.html> [more.html …]
 *
 * Rewrites each file in place, replacing the template's three library
 * references with the file contents:
 *
 *   <link rel="stylesheet" href="charts-lib/charts.css">  →  <style>…</style>
 *   <script src="charts-lib/theme.js"></script>           →  <script>…</script>
 *   <script src="charts-lib/charts.js"></script>          →  <script>…</script>
 *   <script src="charts-lib/chart-convert.js"></script>   →  <script>…</script>  (editable pages)
 *   <script src="charts-lib/page-runtime.js"></script>    →  <script>…</script>  (editable pages)
 *   <script src="charts-lib/page-editor.js"></script>     →  <script>…</script>  (editable pages)
 *
 * Order is preserved, so theme.js still runs before charts.js. Running it on
 * an already-inlined file is a no-op, which makes it safe to re-run after
 * editing the page. Neither library file contains a `</script>` sequence, so
 * no escaping is needed; the script checks anyway and refuses rather than
 * writing a page that would break at the first `<`.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'assets');
const LIB = path.join(ASSETS, 'charts-lib');

const TARGETS = [
  { tag: '<link rel="stylesheet" href="charts-lib/charts.css">', file: 'charts.css', open: '<style>', close: '</style>', bad: '</style' },
  { tag: '<script src="charts-lib/theme.js"></script>',          file: 'theme.js',   open: '<script>', close: '</script>', bad: '</script' },
  { tag: '<script src="charts-lib/charts.js"></script>',         file: 'charts.js',  open: '<script>', close: '</script>', bad: '</script' },
  // Not part of charts-lib (that folder mirrors svg-charts), but staged beside it
  // so an editable page loads it from the same place while it is being built.
  { tag: '<script src="charts-lib/chart-convert.js"></script>', file: 'chart-convert.js', dir: ASSETS, open: '<script>', close: '</script>', bad: '</script' },
  { tag: '<script src="charts-lib/page-runtime.js"></script>', file: 'page-runtime.js', dir: ASSETS, open: '<script>', close: '</script>', bad: '</script' },
  { tag: '<script src="charts-lib/page-editor.js"></script>', file: 'page-editor.js', dir: ASSETS, open: '<script>', close: '</script>', bad: '</script' }
];

const files = process.argv.slice(2);
if (!files.length) {
  console.error('usage: node inline-lib.js <file.html> [more.html …]');
  process.exit(1);
}

for (const target of files) {
  let html = fs.readFileSync(target, 'utf8');
  let done = 0;
  for (const t of TARGETS) {
    if (!html.includes(t.tag)) continue;
    const src = fs.readFileSync(path.join(t.dir || LIB, t.file), 'utf8');
    if (src.includes(t.bad)) {
      console.error('refusing to inline ' + t.file + ': it contains a literal ' + t.bad);
      process.exit(1);
    }
    html = html.replace(t.tag, t.open + '\n' + src + '\n' + t.close);
    done++;
  }
  if (!done) {
    console.log(path.basename(target) + ': already standalone, nothing to inline');
    continue;
  }
  fs.writeFileSync(target, html);
  const kb = Math.round(Buffer.byteLength(html) / 1024);
  console.log(path.basename(target) + ': inlined ' + done + ' file(s) → ' + kb + ' KB, standalone');
}
