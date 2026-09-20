#!/usr/bin/env node
/**
 * check-page.js — the static checks worth running before you call a page done.
 *
 *   node <skill-dir>/scripts/check-page.js index.html [--final]
 *
 * These are the failures that survive a confident-looking build, because none
 * of them throws: a panel whose chart was never wired renders as an empty box,
 * a line over unordered categories renders an error panel *inside* the chart,
 * a deck that lost its agenda just starts, and a page that still links
 * `charts-lib/` looks perfect right up until it is emailed to someone. Each one reads as a styling problem rather than the
 * missing wiring it is, which is why they need a checker rather than a glance.
 *
 * Run it during the build to catch wiring mistakes, and again with `--final`
 * on the page you are about to hand over. The difference is how it treats a
 * page that still links `charts-lib/`: mid-build that is simply where you are
 * (the library is inlined last), so it is reported and not counted; with
 * `--final` it is a failure, because a page that ships that way is broken for
 * everyone who opens it somewhere else.
 *
 * Exit code is 0 when everything passes and 1 when anything fails, so this
 * works as a gate in a script. Every check names the panel it is unhappy
 * about — the point is to tell you where to look, not to score the page.
 *
 * This does not replace opening the page. It cannot see overlap, a chart that
 * overflows its cell, or a colour that vanishes on the canvas. Where browser
 * tooling exists, use it as well; where it doesn't, this is the floor.
 *
 * No dependencies. Works on any Node 14+.
 */
'use strict';
const fs = require('fs');

const argv = process.argv.slice(2);
const isFinal = argv.includes('--final');
const target = argv.find(a => !a.startsWith('--'));
if (!target) {
  console.error('usage: node check-page.js <page.html> [--final]');
  process.exit(2);
}
if (!fs.existsSync(target)) {
  console.error('no such file: ' + target);
  process.exit(2);
}
const html = fs.readFileSync(target, 'utf8');

const results = [];
const ok = (name, detail) => results.push({ name, passed: true, detail });
const bad = (name, detail) => results.push({ name, passed: false, detail });
const note = (name, detail) => results.push({ name, passed: true, note: true, detail });

// ── 1. every panel has a chart, and every chart has a panel ──────────
// The template's cells carry id="c1"/"f1"; a factory call names the id it
// draws into. A mismatch in either direction is silent: an unclaimed cell is
// blank space, and a chart aimed at an id that isn't there throws inside a
// handler you may never read.
// Block comments are stripped first. Once the library is inlined the page
// contains charts.js's own header, whose usage example calls
// Charts.line('chart', …) — scanning raw text counts that as a chart aimed at
// a panel that doesn't exist. A commented-out call shouldn't count either.
const code = html.replace(/\/\*[\s\S]*?\*\//g, ' ');

// An editable page keeps its charts in a JSON block instead of in factory
// calls (references/editable.md). Read it once here so every chart check below
// sees spec charts and code charts alike. A block that does not parse is
// reported in check 6; until then it counts as no charts.
const specMatch = html.match(/<script\s+type="application\/json"\s+id="page-spec"\s*>([\s\S]*?)<\/script>/);
let spec = null, specError = null;
if (specMatch) {
  try { spec = JSON.parse(specMatch[1]); } catch (e) { specError = e.message; }
  if (spec && (typeof spec.charts !== 'object' || spec.charts === null || Array.isArray(spec.charts))) {
    specError = 'needs a "charts" object keyed by element id';
    spec = null;
  }
}
const specCharts = spec ? Object.entries(spec.charts).map(([id, e]) => ({ id, type: e && e.type, config: (e && e.config) || {} })) : [];

// Panels are found by the class the templates put on every chart container,
// not by an id shape: the dashboard and report number theirs c1/f1, while the
// deck names them for what they show (c-trend). The id="…" pattern stays as a
// fallback for a page that dropped the class.
const ids = [
  ...[...code.matchAll(/<div[^>]*class="[^"]*\bchart\b[^"]*"[^>]*>/g)]
      .map(m => (m[0].match(/id="([^"]+)"/) || [])[1]).filter(Boolean),
  ...[...code.matchAll(/id="(c\d+|f\d+)"/g)].map(m => m[1])
].filter((v, i, a) => a.indexOf(v) === i);
// Both call shapes: Charts.bar('c1', …) and the draw(Charts.bar, 'c1', …)
// helper that destroys the previous chart first (controls.md).
const CALL = /Charts\.(\w+)\s*[(,]\s*'([^']+)'/g;
const codeCalls = [...code.matchAll(CALL)].map(m => m[2]);
const calls = codeCalls.concat(specCharts.map(c => c.id));
const orphan = ids.filter(i => !calls.includes(i));
const ghost = calls.filter(c => !ids.includes(c));
if (!ids.length && !calls.length) {
  bad('panels wired to charts', 'no panels and no chart calls found — is this the right file?');
} else if (orphan.length || ghost.length) {
  bad('panels wired to charts',
    (orphan.length ? 'panels with no chart: ' + orphan.join(', ') : '') +
    (orphan.length && ghost.length ? ' | ' : '') +
    (ghost.length ? 'charts with no panel: ' + ghost.join(', ') : ''));
} else {
  ok('panels wired to charts', ids.length + ' panels, all wired');
}

// ── 1b. content-sized tables are not boxed into fixed grid rows ───────
// table, reportTable and barInsightTable grow to their rows only when the
// container has no height. In a .bento cell (340px rows, 696px with .h2) they
// get a height instead, stretch each row by a capped amount, and leave the
// rest as a blank band under the last row — a panel that looks padded, not
// broken. They belong in a `.bento.flow` row, whose cells take their content's
// height.
const GROWS = ['table', 'reportTable', 'barInsightTable'];
const boxed = [...code.matchAll(CALL)]
  .map(m => ({ 1: m[1], 2: m[2] }))
  .concat(specCharts.map(c => ({ 1: c.type, 2: c.id })))
  .filter(m => GROWS.includes(m[1]))
  .filter(m => {
    const at = code.indexOf('id="' + m[2] + '"');
    if (at < 0) return false;
    const grid = code.lastIndexOf('class="bento', at);
    return grid >= 0 && !/^class="bento[^"]*\bflow\b/.test(code.slice(grid, grid + 60));
  })
  .map(m => m[2] + ' (' + m[1] + ')');
if (boxed.length) {
  bad('tables sized to content', boxed.join(', ') +
    ' in a fixed-height grid row  → move the cell into <div class="bento flow">');
} else {
  ok('tables sized to content', 'no content-sized table in a fixed-height row');
}

// ── 2. line charts have an x-axis the engine will accept ─────────────
// Mirrors the guard in the line engine: a category axis is drawable when every
// label parses as a date, or when the labels form a strictly rising sequence
// (month names, weekday names, or one stem numbered upwards). Anything else
// draws "Line charts need a continuous or temporal x-axis" where the chart
// should be — a full-size panel that looks styled and says nothing.
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const parsesAsDate = c => /\d{4}|\d{1,2}[\/-]\d{1,2}/.test(c) && !isNaN(Date.parse(c));
const rising = vals => vals.every((v, k) => v !== null && (k === 0 || v > vals[k - 1]));
const seqIndex = c => {
  const t = String(c).trim().toLowerCase();
  if (!/^[a-z]+\.?$/.test(t)) return null;
  const m = MONTHS.indexOf(t.slice(0, 3));
  if (m >= 0) return m;
  const d = DAYS.indexOf(t.slice(0, 3));
  return d >= 0 ? d : null;
};
const numbered = c => {
  const m = /^(\D*?)(-?\d+(?:\.\d+)?)(\D*)$/.exec(String(c).trim());
  return m ? { pre: m[1].toLowerCase(), post: m[3].toLowerCase(), n: +m[2] } : null;
};
const orderedCats = cats => {
  if (cats.length < 2) return true;
  if (cats.every(parsesAsDate)) return true;
  if (rising(cats.map(seqIndex))) return true;
  const nums = cats.map(numbered);
  if (nums.every(Boolean) &&
      nums.every(x => x.pre === nums[0].pre && x.post === nums[0].post) &&
      rising(nums.map(x => x.n))) return true;
  return false;
};

const badAxes = [];
let lineCount = 0;
for (const chunk of code.split('Charts.').slice(1)) {
  if (!/^line\s*[(,]/.test(chunk)) continue;
  lineCount++;
  const id = (chunk.match(/^line\s*[(,]\s*'([^']+)'/) || [])[1] || '?';
  const upToSeries = chunk.slice(0, chunk.indexOf('series:') + 1 || undefined);
  const m = upToSeries.match(/categories:\s*\[([^\]]*)\]/);
  if (!m) continue;                       // numeric or datetime x — nothing to check
  const cats = m[1].split(',').map(c => c.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  if (!orderedCats(cats)) badAxes.push(id + ': ' + cats.slice(0, 4).join(', '));
}
for (const c of specCharts) {
  if (c.type !== 'line') continue;
  lineCount++;
  const cats = c.config.xAxis && Array.isArray(c.config.xAxis.categories) ? c.config.xAxis.categories.map(String) : null;
  if (cats && !orderedCats(cats)) badAxes.push(c.id + ': ' + cats.slice(0, 4).join(', '));
}
if (!lineCount) ok('line x-axes ordered', 'no line charts on the page');
else if (badAxes.length) {
  bad('line x-axes ordered',
    badAxes.join(' | ') + '  → use a column chart, or give each category its own series over a date axis');
} else ok('line x-axes ordered', lineCount + ' line chart(s), all ordered');

// ── 3. the page is standalone ────────────────────────────────────────
// A page that still points at charts-lib/ works perfectly in the folder it was
// built in and nowhere else. It is the failure that travels.
const refs = [...html.matchAll(/(?:src|href)="([^"]*charts-lib[^"]*)"/g)].map(m => m[1]);
if (refs.length && !isFinal) {
  note('standalone', 'not inlined yet — expected mid-build; run scripts/inline-lib.js before shipping');
} else if (refs.length) {
  bad('standalone', 'still loads: ' + [...new Set(refs)].join(', ') + '  → run scripts/inline-lib.js');
} else if (!/Charts\s*=|Charts\.line|applyPalette|function/.test(html)) {
  bad('standalone', 'no library found in the page at all');
} else {
  ok('standalone', Math.round(Buffer.byteLength(html) / 1024) + ' KB, no external references');
}

// ── 4. nothing else reaches the network ──────────────────────────────
// Same rule, wider net: a CDN font or icon set breaks the page for an offline
// reader just as thoroughly as a missing chart library, and is easier to add
// by reflex.
// Attributes are the obvious half. The half that actually shipped was a CSS
// `@import url(https://fonts.googleapis.com/...)` inside the inlined library:
// no src, no href, invisible to an attribute scan, and fetched on every open.
// Any absolute url() in CSS counts — fonts, background images, @import alike.
// Comments are stripped first: charts.css documents how to load Inter from
// Google Fonts inside a block comment, and a URL nobody fetches is not a dependency.
const live = code.replace(/<!--[\s\S]*?-->/g, ' ');
const external = [...live.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)]
  .map(m => m[1])
  .concat([...live.matchAll(/@import\s+(?:url\()?['"]?(https?:\/\/[^'")\s;]+)/g)].map(m => m[1]))
  .concat([...live.matchAll(/url\(\s*['"]?(https?:\/\/[^'")\s]+)/g)].map(m => m[1]))
  .filter(u => !/^https?:\/\/(www\.)?w3\.org/.test(u));   // schema URLs are not fetched
if (external.length) {
  bad('no network dependencies', [...new Set(external)].slice(0, 4).join(', ') +
    '  → inline it as a data: URI, or drop it and use a system fallback');
} else {
  ok('no network dependencies', 'nothing is fetched at open time');
}

// ── 5. a deck has its spine ──────────────────────────────────────────
// Only runs on a page that is a deck. The middle of a deck is the author's to
// compose, but the four structural slides are not: they are what makes two
// decks built from the same findings come out as the same deck, and each one
// fails silently in its own way. A deck with no agenda simply starts, and the
// audience spends the first third working out how long this is. A deck whose
// index promises three parts and delivers two loses the reader at the second
// divider, because they are tracking the list they were shown. A deck that
// stops on its last chart leaves the ask unstated — the one job a chart cannot
// do for the presenter. None of these throw, none look broken, and all of them
// are invisible to whoever built the deck and already knows the argument.
const slides = [...html.matchAll(/<section[^>]*class="slide([^"]*)"/g)]
  .map(m => m[1].trim().split(/\s+/).filter(Boolean));
const layouts = new Set(slides.flat().filter(c => c.startsWith('l-')));
if (!slides.length) {
  ok('deck spine', 'not a deck — no slides on this page');
} else if (layouts.size >= 15) {
  // The unedited template: one worked example of every layout. It is a
  // catalogue, so the spine rules do not apply to it — but shipping it as a
  // deck is its own mistake, and worth saying out loud.
  note('deck spine', 'this is the template catalogue (' + layouts.size +
    ' different layouts, one slide each), not a deck — build the deck from it first');
} else {
  const has = (i, cls) => slides[i] && slides[i].includes(cls);
  const problems = [];
  if (!has(0, 'l-cover')) problems.push('slide 1 is not an l-cover');
  if (!has(1, 'l-agenda')) problems.push('slide 2 is not an l-agenda');
  const last = slides.length - 1;
  if (!has(last, 'l-statement')) {
    problems.push('the last slide is not an l-statement carrying the recap and the ask');
  }
  // The agenda is a contract: its parts and the dividers are the same list.
  const dividers = slides.filter(c => c.includes('l-section')).length;
  const agenda = (html.match(/<section[^>]*class="slide[^"]*l-agenda[^"]*"[\s\S]*?<\/section>/) || [''])[0];
  const parts = (agenda.match(/class="part"/g) || []).length;
  if (dividers === 1) {
    problems.push('exactly one l-section divider — a divider announcing a single ' +
      'section is furniture; drop it, or split the argument properly');
  }
  if (dividers > 5) {
    problems.push(dividers + ' l-section dividers — past five the deck is answering ' +
      'more questions than an audience can hold; merge the closest pair');
  }
  // Compared in both directions on purpose. An agenda that lists parts the
  // deck never divides is the same broken contract as dividers the agenda
  // never announced — and the first is the easier one to ship, since the
  // agenda gets written from the plan and the dividers get forgotten.
  if (parts >= 2 && dividers !== parts) {
    problems.push('the agenda lists ' + parts + ' part(s) but the deck has ' +
      dividers + ' l-section divider(s) — they must be the same list in the ' +
      'same order' + (dividers === 0 ? ': the dividers were never added' : ''));
  }
  if (parts < 2 && dividers > 0) {
    problems.push('the deck has ' + dividers + ' l-section divider(s) but the agenda ' +
      'lists no parts — the agenda and the dividers are the same list');
  }
  if (problems.length) {
    bad('deck spine', problems.join(' | '));
  } else {
    ok('deck spine', slides.length + ' slides: cover, agenda, ' +
      (dividers ? dividers + ' section(s), ' : 'one section, ') + 'closing');
  }
}

// ── 6. an editable page keeps its contract ───────────────────────────
// Only runs when the page opted in (a page-spec block, or text marked
// data-edit). What breaks here breaks for the non-technical editor, long after
// the build: a chart type the runtime cannot draw shows an error in its cell,
// a duplicate key makes one edit land on the wrong element, and a spec with
// no runtime is a page of empty cards.
const editTags = [...code.matchAll(/<[a-zA-Z][^>]*\sdata-edit="([^"]*)"[^>]*>/g)]
  .map(m => ({ kind: m[1], key: (m[0].match(/\sdata-key="([^"]*)"/) || [])[1] }));
if (!specMatch && !editTags.length) {
  ok('editable page', 'not an editable page');
} else {
  const problems = [];
  const notes = [];
  if (!specMatch) problems.push('text is marked data-edit but there is no <script type="application/json" id="page-spec">');
  if (specError) problems.push('#page-spec does not parse: ' + specError);
  let types = null;
  try { types = require('../assets/charts-lib/charts.manifest.json').charts; } catch (e) { /* skill moved; skip type check */ }
  if (types) {
    const unknown = specCharts.filter(c => !Object.prototype.hasOwnProperty.call(types, c.type));
    if (unknown.length) problems.push('unknown chart type: ' + unknown.map(c => c.id + ' (' + c.type + ')').join(', '));
  }
  const both = specCharts.filter(c => codeCalls.includes(c.id)).map(c => c.id);
  if (both.length) problems.push('drawn by both the spec and page code: ' + both.join(', ') + '  → keep one');
  const runtime = /<script src="charts-lib\/page-runtime\.js"><\/script>/.test(html) || /window\.Page\s*=\s*Page/.test(html);
  if (specMatch && !runtime) problems.push('no page-runtime.js — nothing draws the spec  → add <script src="charts-lib/page-runtime.js"></script> after charts.js');
  const convert = /<script src="charts-lib\/chart-convert\.js"><\/script>/.test(html) || /root\.ChartConvert\s*=\s*factory\(\)/.test(html);
  const editor = /<script src="charts-lib\/page-editor\.js"><\/script>/.test(html) || /window\.PageEditor\s*=/.test(html);
  // A final copy (finalize.js, or Export final copy) is the file to share:
  // it keeps the runtime so charts draw, and must not carry the editor.
  // Comments are stripped first: the editor's own header names this tag.
  const isFinalCopy = /<meta name="page-edition" content="final">/.test(code);
  if (isFinalCopy && editor) problems.push('marked final but still has page-editor.js  → remove the editor, or drop the page-edition meta');
  if (!isFinalCopy && specMatch && !editor) problems.push('no page-editor.js — the page can\'t be edited without code  → add <script src="charts-lib/page-editor.js"></script> after page-runtime.js');
  if (specMatch && !convert) problems.push('no chart-convert.js — charts cannot switch type  → add <script src="charts-lib/chart-convert.js"></script> before page-runtime.js');
  const badKind = editTags.filter(t => t.kind !== 'text' && t.kind !== 'rich');
  if (badKind.length) problems.push('data-edit must be "text" or "rich": ' + badKind.map(t => '"' + t.kind + '"').join(', '));
  const noKey = editTags.filter(t => !t.key).length;
  if (noKey) problems.push(noKey + ' data-edit element(s) without a data-key');
  const keys = editTags.map(t => t.key).filter(Boolean);
  const dupes = [...new Set(keys.filter((k, i) => keys.indexOf(k) !== i))];
  if (dupes.length) problems.push('duplicate data-key: ' + dupes.join(', '));
  const locked = [...new Set(codeCalls)].filter(id => ids.includes(id));
  if (locked.length) notes.push(locked.length + ' chart(s) drawn by code, locked to the editor: ' + locked.join(', '));
  if (problems.length) bad('editable page', problems.join(' | '));
  else ok('editable page', (isFinalCopy ? 'final copy, no editor · ' : '') + specCharts.length + ' chart(s) in the spec, ' + keys.length + ' text element(s)' +
    (notes.length ? ' · ' + notes.join(' · ') : ''));
}

// ── report ───────────────────────────────────────────────────────────
const width = Math.max(...results.map(r => r.name.length));
console.log('');
for (const r of results) {
  console.log((r.note ? '  ----  ' : r.passed ? '  PASS  ' : '  FAIL  ') + r.name.padEnd(width + 2) + r.detail);
}
const failed = results.filter(r => !r.passed).length;
console.log(failed
  ? '\n' + failed + ' check(s) failed. Fix these before opening the page — they are the ones that look like styling bugs.\n'
  : '\nAll static checks pass. Now look at the rendered page: this cannot see overlap, overflow, or a colour that vanishes.\n');
process.exit(failed ? 1 : 0);
