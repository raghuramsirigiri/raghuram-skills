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
 * It also sizes what it can from the markup alone: a chart in a dashboard or
 * one-pager cell smaller than its engine's minimum, a title too long for two
 * lines at that width, donut options written where the engine never reads them
 * — the problems a screenshot would otherwise be taken to find. On a one-pager
 * it does the paper arithmetic too: whether the sheet plus its @page margin
 * still fits A4 and Letter, and whether the page carries a control or a
 * hidden number that only works on a screen.
 *
 * This does not replace opening the page. It cannot see labels colliding,
 * a deck slide outgrowing its frame, or a colour that vanishes on the canvas.
 * Where browser tooling exists, use it as well; where it doesn't, this is the floor.
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

// A line is not only a Charts.line call. Charts.panels takes line panels in
// its `charts:` (alias `panels:`) list, and a reportTable chart column with
// `chart: { type: 'line' }` draws one line per row over the column's
// categories — both render the same error panel, one level down. Configs are
// read with a small literal parser rather than a regex, so a nested object
// can be reached without guessing where it ends. Anything that isn't a plain
// literal (a variable, a function call) comes back as UNKNOWN and is not checked.
const UNKNOWN = Symbol('unknown');
function parseLiteral(src, start) {
  let i = start;
  const ws = () => {
    for (;;) {
      while (i < src.length && /\s/.test(src[i])) i++;
      if (src.startsWith('//', i)) { while (i < src.length && src[i] !== '\n') i++; continue; }
      return;
    }
  };
  const str = () => {                     // returns the string, or UNKNOWN for `${…}`
    const q = src[i++];
    let out = '', dynamic = false;
    while (i < src.length && src[i] !== q) {
      if (src[i] === '\\') { out += src[i + 1]; i += 2; continue; }
      if (q === '`' && src.startsWith('${', i)) { dynamic = true; i = skipBalanced(i + 1); continue; }
      out += src[i++];
    }
    i++;
    return dynamic ? UNKNOWN : out;
  };
  const skipBalanced = at => {            // src[at] is an opener; returns the index after its closer
    const save = i;
    let depth = 0, end = src.length;
    for (i = at; i < src.length;) {
      const ch = src[i];
      if (ch === "'" || ch === '"' || ch === '`') { str(); continue; }
      if (src.startsWith('//', i)) { ws(); continue; }
      i++;
      if ('{[('.includes(ch)) depth++;
      else if ('}])'.includes(ch) && --depth === 0) { end = i; break; }
    }
    i = save;
    return end;
  };
  const skipExpr = () => {                // an expression we don't evaluate: up to the next , } or ] at this depth
    while (i < src.length && !',}]'.includes(src[i])) {
      const ch = src[i];
      if (ch === "'" || ch === '"' || ch === '`') str();
      else if ('{[('.includes(ch)) i = skipBalanced(i);
      else if (src.startsWith('//', i)) ws();
      else i++;
    }
    return UNKNOWN;
  };
  const value = () => {
    ws();
    const ch = src[i];
    let v;
    if (ch === '{') {
      i++; v = {};
      for (ws(); i < src.length && src[i] !== '}'; ws()) {
        if (src[i] === ',') { i++; continue; }
        if (src.startsWith('...', i)) { i += 3; skipExpr(); continue; }
        let key;
        if (src[i] === "'" || src[i] === '"') key = str();
        else { const m = /^[\w$]+/.exec(src.slice(i, i + 200)); if (!m) { skipExpr(); continue; } key = m[0]; i += key.length; }
        ws();
        if (src[i] === ':') { i++; v[key] = value(); }
        else if (src[i] === '(') { i = skipBalanced(i); ws(); if (src[i] === '{') i = skipBalanced(i); v[key] = UNKNOWN; }
        else v[key] = UNKNOWN;           // shorthand { data }
      }
      i++;
    } else if (ch === '[') {
      i++; v = [];
      for (ws(); i < src.length && src[i] !== ']'; ws()) {
        if (src[i] === ',') { i++; continue; }
        v.push(value());
      }
      i++;
    } else if (ch === "'" || ch === '"' || ch === '`') {
      v = str();
    } else {
      const m = /^(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?|true|false|null)\b/i.exec(src.slice(i, i + 40));
      if (!m) return skipExpr();
      i += m[0].length;
      v = JSON.parse(m[0].toLowerCase());
    }
    ws();
    return ',}])'.includes(src[i]) || i >= src.length ? v : skipExpr();   // e.g. `[…].map(…)`
  };
  return value();
}
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const catsOf = cfg => {
  const c = isObj(cfg) && isObj(cfg.xAxis) ? cfg.xAxis.categories : null;
  return Array.isArray(c) && c.every(x => typeof x === 'string' || typeof x === 'number') ? c.map(String) : null;
};
// Every line a chart config will draw, as { label, cats } (cats null = nothing to check).
function linesIn(type, cfg, id) {
  if (type === 'line') return [{ label: id, cats: catsOf(cfg) }];
  if (!isObj(cfg)) return [];
  if (type === 'panels') {
    const list = Array.isArray(cfg.charts) ? cfg.charts : Array.isArray(cfg.panels) ? cfg.panels : [];
    return list.flatMap((p, k) => isObj(p) && p.type === 'line'
      ? [{ label: id + ' › panel ' + (k + 1) + (typeof p.title === 'string' ? ' "' + p.title + '"' : ''), cats: catsOf(p) }]
      : []);
  }
  if (type === 'reportTable') {
    const cols = Array.isArray(cfg.columns) ? cfg.columns : [];
    const rows = Array.isArray(cfg.rows) ? cfg.rows : [];
    return cols.filter(c => isObj(c) && c.kind === 'chart' && isObj(c.chart) && c.chart.type === 'line')
      .flatMap(c => {
        const label = id + ' › column ' + (typeof c.key === 'string' ? c.key : '?');
        const out = [{ label, cats: catsOf(c.chart) }];
        // A row given as a full config can bring its own categories.
        rows.forEach((r, k) => {
          const cats = isObj(r) ? catsOf(r[c.key]) : null;
          if (cats) out.push({ label: label + ' row ' + (typeof r.name === 'string' ? '"' + r.name + '"' : k + 1), cats, extra: true });
        });
        return out;
      });
  }
  return [];
}

const found = [];
// Both call shapes again: Charts.line('c1', {…}) and draw(Charts.line, 'c1', {…}).
const LINE_CALL = /Charts\.(line|panels|reportTable)\s*[(,]\s*(?:'([^']*)'|"([^"]*)")\s*,\s*/g;
for (const m of code.matchAll(LINE_CALL)) {
  const at = m.index + m[0].length;
  const id = m[2] || m[3];
  const cfg = code[at] === '{' ? parseLiteral(code, at) : UNKNOWN;   // a variable config — count it, can't read it
  found.push(...linesIn(m[1], cfg, id));
}
for (const c of specCharts) found.push(...linesIn(c.type, c.config, c.id));

const badAxes = found.filter(l => l.cats && !orderedCats(l.cats)).map(l => l.label + ': ' + l.cats.slice(0, 4).join(', '));
const lineCount = found.filter(l => !l.extra).length;
if (!lineCount) ok('line x-axes ordered', 'no line charts on the page');
else if (badAxes.length) {
  bad('line x-axes ordered',
    badAxes.join(' | ') + '  → use a column chart, or give each category its own series over a date axis');
} else ok('line x-axes ordered', lineCount + ' line chart(s), all ordered');

// ── 2b. charts fit their cells, and their titles fit the charts ──────
// The failures a screenshot usually finds, caught from the markup instead:
// a chart in a cell narrower or shorter than its engine can read at (the
// manifest's minWidth/minHeight — below it labels crowd and collide), and a
// title too long for two lines at that width, whose tail — usually the part
// carrying the finding — is cut to "…". Both are arithmetic on the grid the
// page declares, so they cost nothing to check before a browser opens.
//
// Two grids are sized here, because both declare their geometry in CSS: the
// dashboard's `.bento` (12 tracks, a fixed row height) and the one-pager's
// `.sheet-grid` (12 tracks on a fixed sheet, rows dividing what the chrome
// bands leave). In either, a cell's pixel size follows from its w*/h* classes.
// Deck and report figures are laid out by their own layouts and left to the
// browser audit. Sizes are at the page's full width; the narrow-screen reflow
// is not what this is checking.
let manifest = null;
try { manifest = require('../assets/charts-lib/charts.manifest.json'); } catch (e) { /* skill moved; skip */ }
const cssNum = (sel, prop) => {
  const m = new RegExp('(?:^|[\\s}])' + sel.replace('.', '\\.') + '\\s*\\{[^}]*?\\b' + prop + '\\s*:\\s*(\\d+(?:\\.\\d+)?)px').exec(code);
  return m ? +m[1] : null;
};
const cssVar = name => {
  const m = new RegExp('--' + name + '\\s*:\\s*(\\d+(?:\\.\\d+)?)px').exec(code);
  return m ? +m[1] : null;
};
const grid = {
  width: cssNum('.page', 'max-width'), pad: cssNum('.page', 'padding'),
  row: cssNum('.bento', 'grid-auto-rows'), gap: cssNum('.bento', 'gap'), cellPad: cssNum('.cell', 'padding')
};
// A cell's inner size: w tracks and the gaps between them, less its padding.
const cellPx = w => Math.round(w * (grid.width - 2 * grid.pad - 11 * grid.gap) / 12 + (w - 1) * grid.gap - 2 * grid.cellPad);
const cellPy = h => Math.round(h * grid.row + (h - 1) * grid.gap - 2 * grid.cellPad);

// ── the one-pager's sheet ────────────────────────────────────────────
// A one-pager is a fixed sheet set in columns, so its geometry follows from a
// handful of custom properties and the markup. Two things are worth computing
// before a browser opens: how wide each column is (the --cols track list, which
// the author picks from the content, so it can be anything CSS accepts), and
// how much of each column the figures have already claimed — a column that is
// over its height before a word of text is set cannot be rescued by editing
// prose, and it crops rather than scrolling.
function readSheet() {
  const start = code.indexOf('class="body"');
  if (start < 0 || !/class="cols"/.test(code)) return null;
  const w = cssVar('sheet-w'), h = cssVar('sheet-h'), gap = cssVar('gap');
  const head = cssVar('band-head'), foot = cssVar('band-foot');
  const colGap = cssVar('col-gap');
  const trackList = ((/--cols\s*:\s*([^;}]+)/.exec(code) || [])[1] || '').trim();
  if ([w, h, gap, head, foot, colGap].some(v => v == null) || !trackList) return null;
  // Resolve the track list to pixels: fixed lengths come off the top, the rest
  // is shared between the fr tracks by weight. Anything exotic counts as 1fr,
  // which keeps a page using a unit this does not know roughly right rather
  // than silently wrong.
  const parts = trackList.split(/\s+/).filter(Boolean);
  let avail = w - (parts.length - 1) * colGap;
  const frs = [];
  const widths = parts.map((t, i) => {
    const px = /^([\d.]+)px$/.exec(t);
    if (px) { avail -= +px[1]; return +px[1]; }
    const fr = /^([\d.]+)fr$/.exec(t);
    frs.push({ i, weight: fr ? +fr[1] : 1 });
    return null;
  });
  const frTotal = frs.reduce((a, f) => a + f.weight, 0) || 1;
  for (const f of frs) widths[f.i] = avail * f.weight / frTotal;
  const colWidths = widths.map(v => Math.round(Math.max(0, v || 0)));
  const bodyH = h - head - foot - 2 * gap;

  // A figure's height is a content decision set inline as --fig-h; `auto` means
  // the engine grows to its own rows and there is nothing to add up.
  const defaultFigH = (/\.fig\s+\.chart\s*\{[^}]*height\s*:\s*var\(--fig-h\s*,\s*(\d+)px/.exec(code) || [])[1];
  const figOf = tag => {
    if (/\bauto\b/.test((/class="([^"]*)"/.exec(tag) || [])[1] || '')) return null;
    const m = /--fig-h\s*:\s*(\d+(?:\.\d+)?)px/.exec(tag);
    return m ? +m[1] : (defaultFigH ? +defaultFigH : 180);
  };
  const after = code.slice(start);
  const end = after.search(/<footer[^>]*class="[^"]*\bsheet-foot\b/);
  const body = end < 0 ? after : after.slice(0, end);
  const colsAt = body.indexOf('class="cols"');
  // The caption and the margin under a figure, read from the page's own CSS.
  const capCost = (cssNum('.fig figcaption', 'font-size') || 8.5) * 1.35 +
    (cssNum('.fig figcaption', 'margin-top') || 4) + (cssNum('.fig figcaption', 'padding-top') || 4);
  const figMargin = cssNum('.fig', 'margin') || 12;
  const cost = tag => { const fh = figOf(tag); return fh == null ? 0 : fh + capCost + figMargin; };
  const colBlocks = colsAt < 0 ? [] : body.slice(colsAt).split(/class="col"/).slice(1);
  const column = colBlocks.map((b, i) => {
    const tags = b.match(/<figure[^>]*>/g) || [];
    return { n: i + 1, width: colWidths[i] != null ? colWidths[i] : colWidths[0],
      figs: tags.length, figPx: Math.round(tags.reduce((s, t) => s + cost(t), 0)) };
  });
  // Any full-width band takes its height off every column.
  const wideTags = (body.slice(0, colsAt < 0 ? body.length : colsAt).match(/<figure[^>]*>/g) || []);
  const wideCost = wideTags.reduce((s, t) => s + (figOf(t) == null ? 0 : figOf(t) + capCost + gap), 0);
  const colH = Math.round(bodyH - wideCost);
  return { w, h, gap, colGap, tracks: trackList, cols: parts.length, colWidths,
    bodyH, colH, column, wide: wideTags.length, start, len: body.length, figOf };
}
const sheet = readSheet();
// Every chart the page draws, with the config literal when it is one.
const ANY_CALL = /Charts\.(\w+)\s*[(,]\s*(?:'([^']*)'|"([^"]*)")\s*,\s*/g;
const charts = [...code.matchAll(ANY_CALL)]
  .filter(m => manifest && manifest.charts[m[1]])
  .map(m => {
    const at = m.index + m[0].length;
    return { type: m[1], id: m[2] || m[3], cfg: code[at] === '{' ? parseLiteral(code, at) : UNKNOWN };
  })
  .concat(specCharts.filter(c => manifest && manifest.charts[c.type]).map(c => ({ type: c.type, id: c.id, cfg: c.config })));

// The cell a chart sits in: nearest class="cell …" before its id, inside a
// .bento grid and not inside a deck slide.
function cellOf(id) {
  const at = code.indexOf('id="' + id + '"');
  if (at < 0) return null;
  const cellAt = code.lastIndexOf('class="cell', at);
  const gridAt = code.lastIndexOf('class="bento', at);
  if (cellAt < 0 || gridAt < 0 || cellAt < gridAt || code.lastIndexOf('<section', at) > cellAt) return null;
  const cls = (/^class="([^"]*)"/.exec(code.slice(cellAt)) || [])[1] || '';
  const w = +((/\bw(\d+)\b/.exec(cls) || [])[1] || 0);
  if (!w) return null;
  const h = +((/\bh(\d+)\b/.exec(cls) || [])[1] || 1);
  const flow = /^class="bento[^"]*\bflow\b/.test(code.slice(gridAt, gridAt + 60));
  return { grid: 'bento', cls: cls.replace(/\bcell\b\s*/, '').trim(), w, flow,
    px: cellPx(w), py: flow ? null : cellPy(h), pxOf: cellPx, pyOf: cellPy };
}

// The same, for a cell in the one-pager's sheet grid. No flow rows here: on a
// fixed sheet nothing is content-sized, which is why a table has to be given a
// row that is tall enough for it rather than taking the height it wants.
function sheetFigOf(id) {
  if (!sheet) return null;
  const at = code.indexOf('id="' + id + '"');
  if (at < 0 || at < sheet.start || at > sheet.start + sheet.len) return null;
  const figAt = code.lastIndexOf('<figure', at);
  if (figAt < 0) return null;
  const tag = code.slice(figAt, code.indexOf('>', figAt) + 1);
  const cls = (/class="([^"]*)"/.exec(tag) || [])[1] || '';
  const wide = /\bwide\b/.test(cls);
  // Which column it is in: count the column openers before it inside .cols.
  const colsAt = code.indexOf('class="cols"', sheet.start);
  const before = colsAt >= 0 && figAt > colsAt ? code.slice(colsAt, figAt) : '';
  const idx = Math.max(0, (before.match(/class="col"/g) || []).length - 1);
  const px = wide ? sheet.w : (sheet.colWidths[idx] != null ? sheet.colWidths[idx] : sheet.colWidths[0]);
  const py = sheet.figOf(tag);     // null when class="fig auto": the engine grows
  return { grid: 'sheet', wide, flow: py == null,
    cls: wide ? '.fig.wide' : 'column ' + (idx + 1),
    px, py,
    pxOf: () => sheet.w,
    pyOf: () => py };
}

const bentoReady = Object.values(grid).every(v => v != null);
const cellFor = id => (bentoReady ? cellOf(id) : null) || sheetFigOf(id);
const sized = manifest
  ? charts.map(c => Object.assign({}, c, { cell: cellFor(c.id) })).filter(c => c.cell) : [];
if (!sized.length) {
  ok('charts fit their cells', 'no charts in a sized grid');
  ok('titles fit their charts', 'no charts in a sized grid');
  ok('bars sized to their cell', 'no charts in a sized grid');
} else {
  const tooSmall = [], cramped = [];
  // The manifest's minWidth/minHeight are the sizes a chart WANTS. No engine
  // refuses below them — a 12-point line chart at 280px still draws, it just
  // thins its axis labels — so on a one-pager, where the whole job is fitting
  // more onto a fixed sheet, falling under them is advice rather than a
  // failure. The hard floor is 60% of the wanted size, which is where a line's
  // ticks drop to a third of its points and a donut's ring stops being a ring.
  // A dashboard cell is a different matter: there the grid is supposed to be
  // sized to the chart, so under the minimum stays a failure.
  const FLOOR = 0.6;
  for (const c of sized) {
    const m = manifest.charts[c.type];
    const needW = m.minWidth, needH = m.minHeight;
    const onSheet = c.cell.grid === 'sheet';
    // A self-sizing chart grows to its content when it has no height, so only
    // a fixed height can squeeze it.
    const shortBy = c.cell.py != null && needH ? needH - c.cell.py : 0;
    const narrow = needW && c.cell.px < needW - 8;
    const short = shortBy > 8;
    if (!narrow && !short) continue;
    const where = c.id + ' (' + c.type + ') in ' + c.cell.cls;
    if (onSheet) {
      const hardW = narrow && c.cell.px < needW * FLOOR;
      const hardH = short && c.cell.py < needH * FLOOR;
      const what = (narrow ? '~' + c.cell.px + 'px wide (wants ' + needW + ')' : '') +
        (narrow && short ? ' and ' : '') +
        (short ? '~' + c.cell.py + 'px tall (wants ' + needH + ')' : '');
      if (hardW || hardH) {
        tooSmall.push(where + ' is ' + what + '  → past the point of reading: ' +
          (hardW ? 'give it a wider column track, or the .wide band' : 'give the figure more --fig-h'));
      } else {
        cramped.push(where + ': ' + what);
      }
    } else if (narrow) {
      const fits = [4, 6, 8, 12].find(w => w > c.cell.w && c.cell.pxOf(w) >= needW - 8);
      tooSmall.push(where + ' is ~' + c.cell.px + 'px wide, needs ' + needW +
        (fits ? '  → w' + fits + ' or wider' : ''));
    } else {
      tooSmall.push(where + ' is ~' + c.cell.py + 'px tall, needs ' + needH +
        '  → h2, or a .bento.flow row');
    }
  }
  if (tooSmall.length) bad('charts fit their cells', tooSmall.join(' | '));
  else if (cramped.length) {
    note('charts fit their cells', cramped.join(' | ') +
      '  — under the size the engine would like, which on one page is often the right trade; check the labels in the browser');
  } else ok('charts fit their cells', sized.length + ' chart(s) sized, all at or above their minimum');

  // Characters per title line scale with width: ~10.5px per character at the
  // title size (references/chart-api.md § Titles and subtitles wrap), two
  // lines before the ellipsis.
  const cut = sized.filter(c => isObj(c.cfg) && typeof c.cfg.title === 'string')
    .map(c => ({ c, max: Math.floor(c.cell.px / 10.5) * 2 }))
    .filter(x => x.c.cfg.title.length > x.max)
    .map(x => x.c.id + ' in ' + x.c.cell.cls + ': ' + x.c.cfg.title.length + ' chars, ~' + x.max + ' fit');
  if (cut.length) {
    bad('titles fit their charts', cut.join(' | ') +
      '  → shorten it, move the qualifier to the subtitle, or widen the cell — the cut-off tail is usually the finding');
  } else ok('titles fit their charts', 'every chart title fits in two lines at its cell width');

  // Advice, not a failure: the manifest's own thresholds for when a chart
  // wants more width than a half-page cell gives it.
  const crowded = sized.filter(c => c.cell.w < 8 && isObj(c.cfg)).map(c => {
    const cats = catsOf(c.cfg);
    if (c.type === 'line' && cats && cats.length >= 12) return c.id + ': line over ' + cats.length + ' points';
    if (c.type === 'waterfall' && Array.isArray(c.cfg.data) && c.cfg.data.length >= 8) return c.id + ': waterfall with ' + c.cfg.data.length + ' steps';
    if (c.type === 'heatmap' && cats && cats.length >= 25) return c.id + ': heatmap with ' + cats.length + ' columns';
    return null;
  }).filter(Boolean);
  if (crowded.length) note('crowded axes', crowded.join(' | ') + ' in a cell narrower than w8 — consider w8 or w12 (manifest gridSpanWhen)');

  // The other direction: a cell too big for its data. The engine divides the
  // plot evenly between categories and a bar takes 48% of its slot (group and
  // point padding 0.2/0.1), shared between the series of an unstacked group.
  // Five columns across a w12 are 140px slabs; forty in a w4 are hairlines
  // under slanted labels. Both follow from the category count and the span,
  // so the span is picked from the data (references/layout-dashboard.md § Size each
  // cell from its data). Horizontal bars run the same sum down the height.
  const BAR = { fat: 72, thin: 6, slot: 36, rowFat: 44, rowSlot: 18 };
  const barGeom = c => {
    const cfg = c.cfg;
    const series = Array.isArray(cfg.series) ? cfg.series.filter(isObj) : [];
    const n = (catsOf(cfg) || []).length || Math.max(0, ...series.map(s => Array.isArray(s.data) ? s.data.length : 0));
    if (!n) return null;
    const po = isObj(cfg.plotOptions) ? cfg.plotOptions : {};
    const stacked = [po.column, po.bar, po.series].some(p => isObj(p) && p.stacking);
    const pad = [po.column, po.bar, po.series].find(p => isObj(p) && typeof p.groupPadding === 'number');
    const k = stacked ? 1 : Math.max(1, series.length);
    // A bar's thickness in a plot `len` px long, and the slot per category.
    const f = (1 - 2 * (pad ? pad.groupPadding : 0.2)) * 0.8 / k;
    return { n, k, at: len => ({ slot: len / n, bar: f * len / n }) };
  };
  const misfit = [];
  for (const c of sized) {
    if (!/^(column|bar)$/.test(c.type) || !isObj(c.cfg)) continue;
    const g = barGeom(c);
    if (!g) continue;
    const what = c.id + ' (' + c.type + ', ' + g.n + ' categor' + (g.n === 1 ? 'y' : 'ies') + (g.k > 1 ? ' × ' + g.k + ' series' : '') + ') in ' + c.cell.cls;
    const onSheet = c.cell.grid === 'sheet';
    if (c.type === 'column') {
      // Plot width: the box less the value axis and its labels. On a one-pager
      // the box is the figure's own and there are no spans to suggest.
      const plot = w => c.cell.pxOf(w) - 60;
      const ok = w => { const a = g.at(plot(w)); return a.bar <= BAR.fat && a.slot >= BAR.slot && a.bar >= BAR.thin; };
      const at = onSheet ? c.cell.px - 60 : plot(c.cell.w);
      if (onSheet ? (() => { const a = g.at(at); return a.bar <= BAR.fat && a.slot >= BAR.slot && a.bar >= BAR.thin; })() : ok(c.cell.w)) continue;
      const a = g.at(at);
      const fits = onSheet ? [] : [4, 6, 8, 12].filter(ok);
      const fix = fits.length ? '→ w' + fits.join(' or w')
        : onSheet ? (a.bar > BAR.fat ? '→ state the ' + g.n + ' values in a sentence, or use a .stat'
                                     : '→ Charts.barList in a column, or fewer categories')
        : a.bar > BAR.fat ? '→ w4 with more groupPadding, or state the ' + g.n + ' values as KPIs'
        : '→ w12, a horizontal bar, or fewer categories';
      misfit.push(what + ': ' + (a.bar > BAR.fat ? Math.round(a.bar) + 'px-wide bars' : Math.round(a.slot) + 'px per category') + '  ' + fix);
    } else if (c.cell.py != null) {
      // Horizontal bars: the plot height is the box less title, legend and axis.
      const plot = h => c.cell.pyOf(h) - 90;
      const h = /\bh2\b/.test(c.cell.cls) ? 2 : 1;
      const a = g.at(onSheet ? c.cell.py - 90 : plot(h));
      if (a.slot < BAR.rowSlot) {
        misfit.push(what + ': ' + Math.round(a.slot) + 'px per row  → ' + (onSheet ? 'a taller figure class, or fewer bars'
          : h === 1 && g.at(plot(2)).slot >= BAR.rowSlot ? 'h2' : 'a .bento.flow row with barList, or fewer rows'));
      } else if (a.bar > BAR.rowFat) {
        misfit.push(what + ': ' + Math.round(a.bar) + 'px-thick bars  → ' + (onSheet ? 'a shorter figure class, or Charts.barList'
          : h === 2 ? 'drop the h2' : 'share the row with a narrower partner, or use a column chart'));
      }
    }
  }
  // barList does not refuse a box that is too short for its rows — it thins the
  // bars instead, and keeps thinning. A four-row list in 200px draws 6px
  // hairlines where it should draw 26px bars: the chart is there, the labels
  // and values are right, and the one thing it encodes has been squeezed out of
  // it. Nothing throws and the browser audit cannot see it either, because
  // nothing overflows. The constants below are measured off the engine, not
  // guessed: drawing the same list at a range of heights, full 26px bars first
  // appear at 265px for 3 rows, 310px for 4, 360px for 5 and 430px for 6, which
  // is ~55px a row over ~95px of title, subtitle and padding.
  // barList's natural height is its rows: a label line, the bar, and the gap
  // under it, over a heading band. Those are options, so a page that tightens
  // them gets measured against what it asked for rather than the defaults —
  // which is how a four-row list comes down from 310px to 226px. Short of that
  // height the engine thins the bars instead of saying anything: at 200px a
  // four-row list draws 6px hairlines where it should draw 26px bars, and
  // nothing throws, nothing overflows, and the browser audit cannot see it.
  const BARLIST = { label: 14, chrome: 65, barHeight: 26, rowGap: 22 };
  for (const c of sized) {
    if (c.type !== 'barList' || !isObj(c.cfg) || c.cell.py == null) continue;
    const s0 = Array.isArray(c.cfg.series) ? c.cfg.series.find(isObj) : null;
    const n = s0 && Array.isArray(s0.data) ? s0.data.length : (catsOf(c.cfg) || []).length;
    if (!n) continue;
    const po = isObj(c.cfg.plotOptions) && isObj(c.cfg.plotOptions.barList) ? c.cfg.plotOptions.barList : {};
    const bh = typeof po.barHeight === 'number' ? po.barHeight : BARLIST.barHeight;
    const rg = typeof po.rowGap === 'number' ? po.rowGap : BARLIST.rowGap;
    const need = Math.round(n * (bh + rg + BARLIST.label) + BARLIST.chrome);
    if (c.cell.py < need - 8) {
      misfit.push(c.id + ' (barList, ' + n + ' rows at barHeight ' + bh + '/rowGap ' + rg + ') in ' +
        c.cell.cls + ' has ~' + c.cell.py + 'px for ' + need + 'px of rows  → --fig-h:' + need +
        'px, class="fig auto", tighter barHeight/rowGap, or fewer rows; it thins the bars rather than saying so');
    }
  }
  // The waffle degrades the same silent way, in the other direction: its dot
  // grid shrinks to fit whatever is left after the stat, the name and the
  // description. In a 360px column a 100-dot grid draws 2.8px dots at 265px of
  // height and 6px at 310px — a grey smudge where the whole point is counting
  // units. Measured at column width, dots reach a readable ~11px at 380px.
  for (const c of sized) {
    if (c.type !== 'waffle' || c.cell.py == null) continue;
    if (c.cell.px >= 480 || c.cell.py >= 380 - 8) continue;
    misfit.push(c.id + ' (waffle) in ' + c.cell.cls + ' is ' + c.cell.px + 'x' + c.cell.py +
      'px — its dots shrink to a few px at this width  → .xl, the .wide band, or a donut' +
      (c.cell.grid === 'sheet' ? '' : ' in a wider cell'));
  }
  if (misfit.length) bad('bars sized to their cell', misfit.join(' | '));
  else ok('bars sized to their cell', 'every column and bar chart has room per category without slab-wide bars');
}

// ── 2c. donut and pie options are where the engine reads them ────────
// Donut options live under plotOptions.pie. At the top level they are
// silently ignored: the chart draws, without its centre total, suffix or
// semicircle, and nothing says why. (startColor/endColor are the exception —
// they are read from the top level.)
const PIE_ONLY = ['centerText', 'valueSuffix', 'variableRadius', 'startAngle', 'endAngle',
  'showPercentages', 'innerSize', 'minPointSize', 'droppedNote'];
const pies = [];
for (const c of charts) {
  const cfgs = c.type === 'donut' || c.type === 'pie' ? [{ label: c.id, cfg: c.cfg }]
    : c.type === 'panels' && isObj(c.cfg)
      ? (Array.isArray(c.cfg.charts) ? c.cfg.charts : Array.isArray(c.cfg.panels) ? c.cfg.panels : [])
          .map((p, k) => ({ label: c.id + ' › panel ' + (k + 1), cfg: p })).filter(p => isObj(p.cfg) && /^(donut|pie)$/.test(p.cfg.type))
      : [];
  for (const { label, cfg } of cfgs) {
    if (!isObj(cfg)) continue;
    const misplaced = PIE_ONLY.filter(k => Object.prototype.hasOwnProperty.call(cfg, k));
    if (misplaced.length) pies.push(label + ': ' + misplaced.join(', '));
  }
}
if (pies.length) {
  bad('donut options nested', pies.join(' | ') + ' at the top level, where they are ignored  → move under plotOptions: { pie: { … } }');
} else ok('donut options nested', 'no donut option at the top level');

// ── 2d. a one-pager is one page, and prints without a dialog ─────────
// Only runs on a page built from templates/onepager.html. The format's whole
// promise is that the file comes out as ONE sheet of paper on whatever is in
// the tray, and that promise is arithmetic: the sheet is sized to the printable
// area A4 and Letter share, so editing --sheet-h, or widening the @page margin,
// silently buys a second page. Nobody discovers that until it is printed, and
// by then it has been handed round.
//
// It also adds up the figures declared in each column. A column that is over
// its height before a word of text is set cannot be rescued by editing the
// prose, and the overflow is silent, because the column crops rather than
// scrolling.
const PAPER = { a4: [210, 297], letter: [216, 279.4] };   // mm
const paperName = n => ({ a4: 'A4', letter: 'Letter' })[n] || n;
if (!sheet) {
  ok('fits one page', 'not a one-pager');
} else {
  const mm = px => px * 25.4 / 96;                        // CSS px are 1/96in by spec
  const m = /@page[^}]*\bmargin\s*:\s*([\d.]+)mm/.exec(code);
  const margin = m ? +m[1] : null;
  // `size` names the paper the sheet was measured against, and the two have to
  // agree. A sheet cut to A4's printable area leaves 19mm of a Letter page
  // empty and vice versa, so the check is against the paper the page actually
  // declares — not against both, which would force every sheet down to the
  // intersection of the two and waste 7% of an A4. `auto` is the exception: it
  // takes whatever paper the dialog is set to, so it only holds up if the sheet
  // fits both. `size` also carries the orientation, and `auto` means the
  // dialog's, which is portrait everywhere.
  const sizeDecl = (/@page[^}]*\bsize\s*:\s*([^;}]+)/.exec(code) || [])[1] || '';
  const landscape = /\blandscape\b/.test(sizeDecl);
  // Split on non-alphanumerics rather than building a \b regex: `size` is a
  // short keyword list ("A4", "Letter portrait"), and a word list says so
  // without an escape to get wrong.
  const sizeWords = sizeDecl.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const named = Object.keys(PAPER).find(n => sizeWords.indexOf(n) >= 0);
  const against = named ? { [named]: PAPER[named] } : PAPER;
  const problems = [];
  if (margin == null) {
    problems.push('no "@page { margin: Nmm }" — the printed margin is then the dialog\'s, and the sheet is sized against a known one');
  } else {
    const w = mm(sheet.w) + 2 * margin, h = mm(sheet.h) + 2 * margin;
    // A landscape page is the same paper turned, so its limits turn with it.
    const limit = p => landscape ? [p[1], p[0]] : p;
    const over = Object.entries(against).filter(([, p]) => w > limit(p)[0] + 0.5 || h > limit(p)[1] + 0.5);
    if (over.length) {
      const turned = !landscape && sheet.w > sheet.h;
      problems.push(sheet.w + 'x' + sheet.h + 'px + 2x' + margin + 'mm = ' + w.toFixed(1) + 'x' + h.toFixed(1) +
        'mm, past ' + over.map(([n, p]) => paperName(n) + ' (' + limit(p)[0] + 'x' + limit(p)[1] + ')').join(' and ') +
        (turned
          ? '  → the sheet is landscape but @page is not: add "size: landscape"'
          : named
            ? '  → it prints on two pages; shrink the sheet or the margin'
            : '  → @page has no paper, so the sheet must fit both; name one with "size: A4" or "size: Letter"'));
    }
    // The other way round: paper left empty because the sheet was cut smaller
    // than the one it declares. Advice, not a failure — the intersection box is
    // a legitimate choice when the paper is genuinely unknown.
    if (!over.length && named && !landscape) {
      const p = PAPER[named];
      const spare = p[1] - h;
      if (spare > 8) {
        note('fits one page', sheet.w + 'x' + sheet.h + ' leaves ' + spare.toFixed(0) +
          'mm of ' + paperName(named) + ' empty at the foot (' + Math.round(100 * spare / p[1]) +
          '% of the page) — --sheet-h:' + Math.floor((p[1] - 2 * margin) * 96 / 25.4) +
          'px fills it');
      }
    }
  }
  if (sheet.bodyH <= 0) {
    problems.push('the masthead and footer are taller than the sheet — nothing is left for the body');
  }
  // The figures alone can be added up before any text is measured. If they
  // already exceed the column, no amount of editing the prose will save it —
  // and the overflow would be silent, because the column crops.
  const overfull = sheet.column.filter(c => c.figs && c.figPx > sheet.colH)
    .map(c => 'column ' + c.n + ': ' + c.figs + ' figure(s) total ~' + c.figPx +
      'px in a ' + sheet.colH + 'px column, before a word of text');
  if (overfull.length) problems.push(overfull.join(' | ') + '  → less --fig-h, or one figure fewer');
  if (problems.length) bad('fits one page', problems.join(' | '));
  else {
    // How much of each column the figures already hold. The rest is the room
    // left for prose — and a column that is mostly empty is the failure this
    // format is most prone to, so the number is reported either way.
    const run = sheet.column.map(c => c.figPx + '/' + sheet.colH);
    ok('fits one page', sheet.w + 'x' + sheet.h + ' sheet, columns [' + sheet.tracks + '] = ' +
      sheet.colWidths.join('/') + 'px wide, ' + sheet.colH + 'px tall' +
      (sheet.wide ? ' under ' + sheet.wide + ' full-width band(s)' : '') +
      (run.length ? ' · figures hold ' + run.join(' and ') + 'px' : '') +
      ' — fits ' + (named ? paperName(named) : 'A4 and Letter') +
      (landscape ? ' landscape' : '') + ' at ' + margin + 'mm');
  }
}

// ── 2e. a one-pager has nothing that only works on a screen ──────────
// Paper has no pointer. A dropdown prints as a grey box showing one value, and
// a number that only appears in a tooltip does not appear at all — neither
// looks broken on screen, which is exactly why they ship.
if (!sheet) {
  ok('paper-ready', 'not a one-pager');
} else {
  const problems = [];
  const live = code.replace(/<!--[\s\S]*?-->/g, ' ');
  const controls = [...live.matchAll(/<(select|input|button)\b[^>]*>/g)].map(m => m[1]);
  if (controls.length) {
    problems.push(controls.length + ' control(s) on the page (' + [...new Set(controls)].join(', ') +
      ') — they print as grey boxes  → a page that needs a filter is a dashboard');
  }
  // dataLabels: false is a screen decision (the tooltip carries the value).
  const OFF = /"dataLabels":(false|\{"enabled":false)/;
  const unlabelled = charts.filter(c => isObj(c.cfg) && OFF.test(JSON.stringify(c.cfg))).map(c => c.id);
  if (problems.length) bad('paper-ready', problems.join(' | '));
  else if (unlabelled.length) {
    note('paper-ready', 'dataLabels off on ' + unlabelled.join(', ') +
      ' — on paper there is no tooltip behind them; shorten the data rather than hiding the numbers');
  } else ok('paper-ready', 'no controls, nothing hover-only');
}

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
  : '\nAll static checks pass. Now look at the rendered page: this cannot see colliding labels, slide overflow, or a colour that vanishes.\n');
process.exit(failed ? 1 : 0);
