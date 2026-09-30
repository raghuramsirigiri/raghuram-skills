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
 * It also sizes what it can from the markup alone: a chart in a dashboard
 * cell smaller than its engine's minimum, a title too long for two lines at
 * that width, donut options written where the engine never reads them — the
 * problems a screenshot would otherwise be taken to find.
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
// Only charts in a dashboard `.bento` cell are sized here: that grid is
// declared in CSS (12 tracks, a fixed row height), so a cell's pixel size
// follows from its w*/h* classes. Deck and report figures are laid out by
// their own layouts and left to the browser audit. Sizes are at the page's
// full width; the narrow-screen reflow is not what this is checking.
let manifest = null;
try { manifest = require('../assets/charts-lib/charts.manifest.json'); } catch (e) { /* skill moved; skip */ }
const cssNum = (sel, prop) => {
  const m = new RegExp('(?:^|[\\s}])' + sel.replace('.', '\\.') + '\\s*\\{[^}]*?\\b' + prop + '\\s*:\\s*(\\d+(?:\\.\\d+)?)px').exec(code);
  return m ? +m[1] : null;
};
const grid = {
  width: cssNum('.page', 'max-width'), pad: cssNum('.page', 'padding'),
  row: cssNum('.bento', 'grid-auto-rows'), gap: cssNum('.bento', 'gap'), cellPad: cssNum('.cell', 'padding')
};
// A cell's inner size: w tracks and the gaps between them, less its padding.
const cellPx = w => Math.round(w * (grid.width - 2 * grid.pad - 11 * grid.gap) / 12 + (w - 1) * grid.gap - 2 * grid.cellPad);
const cellPy = h => Math.round(h * grid.row + (h - 1) * grid.gap - 2 * grid.cellPad);
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
  return { cls: cls.replace(/\bcell\b\s*/, '').trim(), w, flow, px: cellPx(w), py: flow ? null : cellPy(h) };
}

const sized = Object.values(grid).every(v => v != null) && manifest
  ? charts.map(c => Object.assign({}, c, { cell: cellOf(c.id) })).filter(c => c.cell) : [];
if (!sized.length) {
  ok('charts fit their cells', 'no charts in a dashboard grid to size');
  ok('titles fit their charts', 'no charts in a dashboard grid to size');
  ok('bars sized to their cell', 'no charts in a dashboard grid to size');
} else {
  const tooSmall = [];
  for (const c of sized) {
    const m = manifest.charts[c.type];
    const needW = m.minWidth, needH = m.minHeight;
    // A self-sizing chart grows to its content when it has no height, so only
    // a fixed-height row can squeeze it.
    const shortBy = c.cell.py != null && needH ? needH - c.cell.py : 0;
    if (needW && c.cell.px < needW - 8) {
      const fits = [4, 6, 8, 12].find(w => w > c.cell.w && cellPx(w) >= needW - 8);
      tooSmall.push(c.id + ' (' + c.type + ') in ' + c.cell.cls + ' is ~' + c.cell.px + 'px wide, needs ' + needW +
        (fits ? '  → w' + fits + ' or wider' : ''));
    } else if (shortBy > 8) {
      tooSmall.push(c.id + ' (' + c.type + ') in ' + c.cell.cls + ' is ~' + c.cell.py + 'px tall, needs ' + needH +
        '  → h2, or a .bento.flow row');
    }
  }
  if (tooSmall.length) bad('charts fit their cells', tooSmall.join(' | '));
  else ok('charts fit their cells', sized.length + ' chart(s) in grid cells, all at or above their minimum size');

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
  // so the span is picked from the data (references/layout.md § Size each
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
    if (c.type === 'column') {
      // Plot width: the cell less the value axis and its labels.
      const plot = w => cellPx(w) - 60;
      const ok = w => { const a = g.at(plot(w)); return a.bar <= BAR.fat && a.slot >= BAR.slot && a.bar >= BAR.thin; };
      if (ok(c.cell.w)) continue;
      const a = g.at(plot(c.cell.w));
      const fits = [4, 6, 8, 12].filter(ok);
      const fix = fits.length ? '→ w' + fits.join(' or w')
        : a.bar > BAR.fat ? '→ w4 with more groupPadding, or state the ' + g.n + ' values as KPIs'
        : '→ w12, a horizontal bar, or fewer categories';
      misfit.push(what + ': ' + (a.bar > BAR.fat ? Math.round(a.bar) + 'px-wide bars' : Math.round(a.slot) + 'px per category') + '  ' + fix);
    } else if (c.cell.py != null) {
      // Horizontal bars: the plot height is the row less title, legend and axis.
      const plot = h => cellPy(h) - 90;
      const h = /\bh2\b/.test(c.cell.cls) ? 2 : 1;
      const a = g.at(plot(h));
      if (a.slot < BAR.rowSlot) {
        misfit.push(what + ': ' + Math.round(a.slot) + 'px per row  → ' + (h === 1 && g.at(plot(2)).slot >= BAR.rowSlot ? 'h2' : 'a .bento.flow row with barList, or fewer rows'));
      } else if (a.bar > BAR.rowFat) {
        misfit.push(what + ': ' + Math.round(a.bar) + 'px-thick bars  → ' + (h === 2 ? 'drop the h2' : 'share the row with a narrower partner, or use a column chart'));
      }
    }
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
