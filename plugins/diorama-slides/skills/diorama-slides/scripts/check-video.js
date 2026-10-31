#!/usr/bin/env node
/**
 * check-video.js — static checks on a diorama-slides page. No browser.
 *
 *   node <skill-dir>/scripts/check-video.js <video.html> [--final] [--json]
 *
 * Reads the spec out of the page, compiles every cut with the real engine
 * (text measured approximately, so timing is right and layout is close), and
 * checks what can be checked without painting: the spec's shape, timing, that
 * every figure is a ledger claim, that hedges and forecasts survive, quotes,
 * copy limits, the stage (its shape, its painters, words only through
 * api.label), determinism and offline-ness. --final also insists the page is
 * one standalone file. Exit 1 on any FAIL.
 *
 * What it cannot see (text fit with real fonts, contrast on the real pixels,
 * read time as painted) is the browser audit's job: motion-lib/audit.js.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SKILL = path.join(__dirname, '..');
const MLIB = path.join(SKILL, 'assets', 'motion-lib');
const manifest = JSON.parse(fs.readFileSync(path.join(MLIB, 'motion.manifest.json'), 'utf8'));
const PRESETS = ['default', 'rubric', 'editorial', 'botanical', 'cyanotype', 'orchid', 'bauhausNight'];

const argv = process.argv.slice(2);
const final = argv.includes('--final');
const asJson = argv.includes('--json');
const target = argv.find(a => !a.startsWith('--'));
if (!target) { console.error('usage: node check-video.js <video.html> [--final] [--json]'); process.exit(2); }
if (!fs.existsSync(target)) { console.error('no such file: ' + target); process.exit(2); }
const html = fs.readFileSync(target, 'utf8');

const rows = [];
const row = (level, name, detail) => rows.push({ level, name, detail });
const pass = (n, d) => row('PASS', n, d || '');
const warn = (n, d) => row('WARN', n, d);
const fail = (n, d) => row('FAIL', n, d);

// ── the hedge vocabulary (references/copy.md § Hedges) ───────────────
const HEDGES = {
  could: ['could', 'may', 'might', 'up to', 'possibly'],
  may: ['may', 'could', 'might'],
  might: ['might', 'may', 'could'],
  'up to': ['up to', 'as many as', 'as much as'],
  estimated: ['estimated', 'estimate', 'estimates', 'est.', 'about', 'around', 'roughly', 'approximately', 'an estimated'],
  estimates: ['estimates', 'estimated', 'estimate', 'about', 'around', 'roughly'],
  projected: ['projected', 'projection', 'forecast', 'expected'],
  expected: ['expected', 'expects', 'forecast', 'projected'],
  forecast: ['forecast', 'projected', 'expected'],
  preliminary: ['preliminary', 'provisional', 'early figures', 'initial'],
  provisional: ['provisional', 'preliminary'],
  about: ['about', 'around', 'roughly', 'approximately', 'nearly', 'almost', 'some'],
  around: ['around', 'about', 'roughly', 'approximately'],
  nearly: ['nearly', 'almost', 'just under'],
  alleged: ['alleged', 'allegedly', 'accused'],
  'according to': ['according to', 'says', 'said', 'reports', 'reported', 'estimates'],
  likely: ['likely', 'probably', 'expected']
};
const FORECAST_WORDS = ['forecast', 'projected', 'projection', 'expected', 'expects', 'could', 'may', 'target', 'goal', 'plan', 'planned', 'on track', 'estimate', 'by 20'];
const UPGRADE = ['will', 'record', 'first', 'biggest', 'ever', 'all-time', 'unprecedented', 'largest', 'best', 'worst', 'smallest', 'highest-ever', 'lowest-ever', 'guaranteed', 'proves', 'because', 'due to', 'caused', 'thanks to', 'led to'];

// ── read the spec ────────────────────────────────────────────────────
const m = /<script type="application\/json" id="video-spec">([\s\S]*?)<\/script>/.exec(html);
if (!m) { fail('spec', 'no <script type="application/json" id="video-spec"> in the page'); return done(); }
let spec;
try { spec = JSON.parse(m[1]); } catch (e) { fail('spec', 'the spec is not valid JSON: ' + e.message); return done(); }
pass('spec', 'parses');

// ── 1. shape ─────────────────────────────────────────────────────────
const meta = spec.meta || {};
const shape = [];
if (!spec.meta) shape.push('missing "meta"');
if (meta.fps && [24, 25, 30, 60].indexOf(meta.fps) < 0) shape.push('meta.fps must be 24, 25, 30 or 60');
if (meta.preset && PRESETS.indexOf(meta.preset) < 0) shape.push('meta.preset "' + meta.preset + '" is not one of ' + PRESETS.join(', '));
const score = meta.audio && meta.audio.score;
if (score && ['off', 'pulse', 'ambient'].indexOf(score) < 0) shape.push('meta.audio.score must be off, pulse or ambient');
(spec.scenes || []).forEach(sc => {
  if (sc.transitionIn != null) warn('timing', 'scene "' + sc.id + '": transitionIn "' + sc.transitionIn + '" is ignored — every scene arrives by the one transition (motion.md § Transitions); delete it');
});
if (meta.art != null && ['off', 'halftone'].indexOf(meta.art) < 0) shape.push('meta.art must be "off" or "halftone" (references/design.md § Artwork)');
if (meta.style != null) shape.push('meta.style: this skill has one mode, the card over the stage; delete it (references/stage.md)');
// The stage: a shape this version builds, and a painter in the page for every thing it names.
const stg = spec.stage || null;
const SHAPES = manifest.shapes;
if (!stg) shape.push('no "stage": every video is a card over a living stage (references/stage.md)');
else {
  if (!SHAPES[stg.shape]) shape.push('stage.shape must be one of ' + Object.keys(SHAPES).join(', '));
  else if (!SHAPES[stg.shape].built) shape.push('stage.shape "' + stg.shape + '" is not built yet in this version (built: ' + Object.keys(SHAPES).filter(k => SHAPES[k].built).join(', ') + ')');
  const registered = new Set([...html.matchAll(/Motion\.things\.([A-Za-z_$][\w$]*)\s*=/g)].map(x => x[1]));
  ['subject', 'ground', 'scenery'].forEach(k => {
    if (stg[k] && !registered.has(stg[k])) shape.push('stage.' + k + ' names "' + stg[k] + '", but the page registers no Motion.things.' + stg[k]);
  });
}
const scenes = spec.scenes || [];
const byId = {};
scenes.forEach(s => { if (byId[s.id]) shape.push('two scenes share the id "' + s.id + '"'); byId[s.id] = s; });
scenes.forEach(s => { if (!manifest.scenes[s.type]) shape.push('scene "' + s.id + '": unknown type "' + s.type + '"'); });
const cuts = spec.cuts || {};
if (!Object.keys(cuts).length) shape.push('no cuts');
for (const [name, c] of Object.entries(cuts)) {
  if (!manifest.formats[c.format]) shape.push('cut "' + name + '": format must be one of ' + Object.keys(manifest.formats).join(', '));
  if (!Array.isArray(c.scenes) || !c.scenes.length) { shape.push('cut "' + name + '" lists no scenes'); continue; }
  c.scenes.forEach(id => { if (!byId[id]) shape.push('cut "' + name + '": no scene "' + id + '"'); });
  const types = c.scenes.map(id => byId[id] && byId[id].type);
  const last = types[types.length - 1];
  if (last !== 'source-card') shape.push('cut "' + name + '" must end on a source-card');
}
const claims = {};
(spec.claims || []).forEach(c => {
  if (claims[c.id]) shape.push('two claims share the id "' + c.id + '"');
  claims[c.id] = c;
  if (['copied', 'derived', 'illustrative'].indexOf(c.kind) < 0) shape.push('claim ' + c.id + ': kind must be copied, derived or illustrative');
  if (c.kind !== 'illustrative') {
    if (!c.source || !(spec.sources || []).some(s => s.id === c.source)) shape.push('claim ' + c.id + ': needs a source that is in "sources" (or kind "illustrative")');
    if (!c.locator) shape.push('claim ' + c.id + ': needs a locator (¶, row, page) so it can be traced');
  }
  if (c.kind === 'derived' && !c.working) shape.push('claim ' + c.id + ': a derived figure needs its "working"');
  if (c.quote && !c.verbatim) shape.push('claim ' + c.id + ': a quote needs its verbatim source sentence');
});
(spec.sources || []).forEach(s => { if (!s.name) shape.push('source ' + s.id + ' has no name'); if (!s.date) shape.push('source ' + s.id + ' has no date (the source card shows it)'); });
(spec.data || []).forEach(d => {
  if (!Array.isArray(d.x) || !Array.isArray(d.y) || d.x.length !== d.y.length) shape.push('data ' + d.id + ': x and y must be arrays of the same length');
  if (!d.source || !(spec.sources || []).some(s => s.id === d.source)) shape.push('data ' + d.id + ': needs a source that is in "sources"');
  if (!d.locator) shape.push('data ' + d.id + ': needs a locator');
});
scenes.forEach(s => {
  const mf = manifest.scenes[s.type];
  if (!mf) return;
  for (const [slot, def] of Object.entries(mf.slots)) {
    const has = s.copy && s.copy[slot] != null && s.copy[slot] !== '';
    if (def.required && !has) shape.push('scene "' + s.id + '": copy.' + slot + ' is required');
  }
  for (const k of Object.keys(s.copy || {})) if (!mf.slots[k]) shape.push('scene "' + s.id + '": copy.' + k + ' is not a slot of ' + s.type);
  if (s.type === 'beat' && !(s.copy && (s.copy.title || s.copy.quote))) shape.push('scene "' + s.id + '": a beat needs copy.title (or copy.quote)');
});
shape.length ? shape.forEach(x => fail('shape', x)) : pass('shape', scenes.length + ' scenes, ' + Object.keys(cuts).length + ' cut(s), ' + Object.keys(claims).length + ' claims');

// ── 2. timing: compile every cut with the real engine ────────────────
const compiled = {};
try {
  const sb = loadEngine();
  for (const name of Object.keys(cuts)) {
    try {
      const C = sb.Motion.compile(spec, name, { measure: mockCtx() });
      compiled[name] = C;
      const n = C.scenes.length;
      // A beat that changes the stage runs longer: the stage moves between them.
      const lo = Math.max(2, Math.floor(C.duration / 6)), hi = Math.ceil(C.duration / 3) + 1;
      const first = C.scenes[0];
      const firstText = first.layers.filter(l => l.kind === 'text' || l.kind === 'counter').reduce((a, l) => Math.min(a, l.at || 0), Infinity);
      if (firstText > 0.5) fail('timing', 'cut "' + name + '": nothing readable by 0.5 s (first text at ' + firstText.toFixed(2) + ' s)');
      if (n < lo || n > hi) warn('timing', 'cut "' + name + '": ' + n + ' beats in ' + C.duration.toFixed(1) + ' s (budget about ' + lo + '–' + hi + ', one per 3–6 s)');
      const max = (SHAPES[C.shape] && SHAPES[C.shape].maxLength) || 60;
      if (C.duration > max + 0.5) fail('timing', 'cut "' + name + '" runs ' + C.duration.toFixed(1) + ' s — a ' + C.shape + ' video runs at most ' + max + ' s; cut beats, or make two videos');
      else if (C.duration > 60.5) warn('timing', 'cut "' + name + '" runs ' + C.duration.toFixed(1) + ' s — longer than 60 s, which a ' + C.shape + ' story may; say so at handover');
      if (C.duration < 14.5) warn('timing', 'cut "' + name + '" runs ' + C.duration.toFixed(1) + ' s — under 15 s');
      // The stage's room: too little and the stage can't carry the story.
      C.scenes.forEach((sc, i) => {
        const B = sc.stageBox;
        if (B && B.h < C.H * 0.22) warn('stage', 'cut "' + name + '" V' + (i + 1) + ' ' + sc.id + ': the stage has ' + Math.round(B.h) + ' px of height under the card — shorten the words, or give the chart a beat of its own');
      });
      pass('timing', 'cut "' + name + '" · ' + C.format + ' · ' + C.shape + ' · ' + C.duration.toFixed(2) + ' s = ' + C.frames + ' frames at ' + C.fps + ' fps · ' +
        C.scenes.map((s, i) => 'V' + (i + 1) + ' ' + s.id + ' ' + s.dur.toFixed(1) + 's').join(', '));
    } catch (e) { fail('timing', 'cut "' + name + '": ' + e.message); }
  }
} catch (e) { fail('timing', 'could not load the engine: ' + e.message); }

// ── 3. numbers ───────────────────────────────────────────────────────
const MULT = { k: 1e3, thousand: 1e3, m: 1e6, million: 1e6, mn: 1e6, bn: 1e9, billion: 1e9, b: 1e9, tn: 1e12, trillion: 1e12 };
const MONTHS = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;
function numberTokens(str) {
  const out = [];
  const re = /(^|[^\w.])(-?\d+(?:,\d{3})*(?:\.\d+)?)\s*(%|per ?cent|thousand|million|billion|trillion|bn|mn|tn|[kmb](?![a-z]))?/gi;
  let r;
  while ((r = re.exec(str))) {
    const raw = r[2], unit = (r[3] || '').toLowerCase();
    const before = str.slice(Math.max(0, r.index - 12), r.index + r[1].length);
    const after = str.slice(re.lastIndex, re.lastIndex + 10);
    const n = parseFloat(raw.replace(/,/g, ''));
    // Dates are labels, not measurements: a year, or a day next to a month.
    if (!unit && /^(19|20)\d\d$/.test(raw)) continue;
    if (!unit && n <= 31 && (MONTHS.test(after.trim()) || /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s*$/i.test(before))) continue;
    out.push({ raw: raw + (r[3] ? (r[3].length > 2 ? ' ' : '') + r[3] : ''), n, unit });
  }
  return out;
}
function tokenValues(t) {
  const v = [t.n];
  if (MULT[t.unit]) v.push(t.n * MULT[t.unit]);
  return v;
}
function claimValues(c) {
  const v = [];
  if (typeof c.value === 'number') v.push(c.value);
  const d = c.display != null ? String(c.display) : '';
  numberTokens(d).forEach(t => tokenValues(t).forEach(x => v.push(x)));
  if (typeof c.value === 'number') {
    const u = String(c.unit || '').toLowerCase().split(/\s+/)[0];
    if (MULT[u]) v.push(c.value * MULT[u]);
  }
  return v;
}
const close = (a, b) => Math.abs(a - b) <= Math.max(1e-9, Math.abs(b) * 0.005);
function matchClaim(t) {
  return Object.values(claims).find(c => claimValues(c).some(cv => tokenValues(t).some(tv => close(tv, cv))));
}
// The painted strings of a scene: every copy slot that is text, plus list items.
function paintedStrings(s) {
  const out = [];
  const mf = manifest.scenes[s.type] || { slots: {} };
  for (const [k, v] of Object.entries(s.copy || {})) {
    if (typeof v !== 'string') continue;
    const def = mf.slots[k] || {};
    if (def.claim || def.asset) continue;
    out.push({ where: 'copy.' + k, text: v, slot: k });
  }
  (s.bars || []).forEach((b, i) => out.push({ where: 'bars[' + i + '].label', text: b.label || '', list: 'bars' }));
  (s.rows || []).forEach((b, i) => out.push({ where: 'rows[' + i + '].label', text: b.label || '', list: 'rows' }));
  (s.parts || []).forEach((b, i) => out.push({ where: 'parts[' + i + '].label', text: b.label || '', list: 'parts' }));
  (s.events || []).forEach((e, i) => out.push({ where: 'events[' + i + '].text', text: e.text || '', list: 'events' }));
  (s.steps || []).forEach((t, i) => out.push({ where: 'steps[' + i + ']', text: t, list: 'steps' }));
  (s.points || []).forEach((t, i) => out.push({ where: 'points[' + i + ']', text: t, list: 'points' }));
  ((s.chart && s.chart.bars) || []).forEach((b, i) => out.push({ where: 'chart.bars[' + i + '].label', text: b.label || '', list: 'bars' }));
  return out;
}
const stripIds = str => String(str).replace(/\{[A-Za-z][\w.-]*\}/g, ' ');
const numberFails = [];
// The stage's own words (each state's label) are painted on every beat.
((stg && stg.states) || []).forEach((x, i) => {
  if (typeof x.label !== 'string') return;
  numberTokens(x.label).forEach(t => numberFails.push('stage.states[' + i + '].label: "' + t.raw + '" is typed onto the stage — a stage label is a name or a year, never a figure'));
  if (x.label.trim().split(/\s+/).length > 3) numberFails.push('stage.states[' + i + '].label: a stage label is at most three words');
});
scenes.forEach(s => paintedStrings(s).forEach(p => {
  numberTokens(stripIds(p.text)).forEach(t => numberFails.push('scene "' + s.id + '" ' + p.where + ': "' + t.raw + '" is typed into copy — put it in the ledger and write {Fn}'));
  (String(p.text).match(/\{([A-Za-z][\w.-]*)\}/g) || []).forEach(tok => { const id = tok.slice(1, -1); if (!claims[id]) numberFails.push('scene "' + s.id + '" ' + p.where + ': ' + tok + ' is not a claim'); });
}));
const usedOnScreen = new Set();
Object.values(compiled).forEach(C => C.scenes.forEach(s => s.used.forEach(id => usedOnScreen.add(id))));
['caption', 'alt'].forEach(field => {
  const text = spec[field] || '';
  numberTokens(text).forEach(t => {
    const c = matchClaim(t);
    if (!c) numberFails.push(field + ': "' + t.raw + '" matches no claim in the ledger');
    else if (!usedOnScreen.has(c.id)) numberFails.push(field + ': "' + t.raw + '" (' + c.id + ') is not on screen in any cut');
  });
});
if (!spec.caption) warn('numbers', 'caption is empty (Copy caption will have nothing to copy)');
if (!spec.alt) warn('numbers', 'alt text is empty');
numberFails.length ? numberFails.forEach(x => fail('numbers', x)) : pass('numbers', 'every figure on screen, in the caption and in the alt text is a ledger claim');
const ill = Object.values(claims).filter(c => c.kind === 'illustrative' && usedOnScreen.has(c.id));
if (ill.length) pass('illustrative', ill.map(c => c.id).join(', ') + ' are illustrative: the engine labels each scene that shows one and the source card');

// ── 4. hedges, forecasts and upgrade words ───────────────────────────
const hedgeFails = [];
const sceneText = s => paintedStrings(s).map(p => p.text).join(' \n ').toLowerCase();
const hasAny = (text, words) => words.some(w => new RegExp('(^|[^a-z])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z]|$)', 'i').test(text));
Object.values(compiled).forEach(C => C.scenes.forEach(sc => {
  const text = sceneText(sc.spec);
  sc.used.forEach(id => {
    const c = claims[id];
    if (!c) return;
    if (c.hedge) {
      const eq = HEDGES[String(c.hedge).toLowerCase()] || [String(c.hedge).toLowerCase()];
      if (!hasAny(text, eq)) hedgeFails.push('cut "' + C.cut + '" scene "' + sc.id + '" shows ' + id + ' without its hedge "' + c.hedge + '" (or ' + eq.slice(1).join(', ') + ')');
    }
    if (c.forecast && !hasAny(text, FORECAST_WORDS)) hedgeFails.push('cut "' + C.cut + '" scene "' + sc.id + '" shows forecast ' + id + ' without forecast wording (forecast, projected, expected, could, target…)');
  });
}));
['caption', 'alt'].forEach(field => {
  const text = (spec[field] || '').toLowerCase();
  numberTokens(spec[field] || '').forEach(t => {
    const c = matchClaim(t);
    if (c && c.hedge && !hasAny(text, HEDGES[String(c.hedge).toLowerCase()] || [c.hedge])) hedgeFails.push(field + ' gives ' + c.id + ' without its hedge "' + c.hedge + '"');
    if (c && c.forecast && !hasAny(text, FORECAST_WORDS)) hedgeFails.push(field + ' gives forecast ' + c.id + ' without forecast wording');
  });
});
const sourceWords = Object.values(claims).map(c => String(c.verbatim || '') + ' ' + String(c.text || '')).join(' ').toLowerCase();
const allCopy = scenes.map(s => ({ id: s.id, text: sceneText(s) })).concat([{ id: 'caption', text: (spec.caption || '').toLowerCase() }, { id: 'alt', text: (spec.alt || '').toLowerCase() }]);
allCopy.forEach(({ id, text }) => UPGRADE.forEach(w => {
  if (hasAny(text, [w]) && !hasAny(sourceWords, [w])) hedgeFails.push((id === 'caption' || id === 'alt' ? id : 'scene "' + id + '"') + ' says "' + w + '", which no claim\'s verbatim says — upgrade or cause the source doesn\'t state');
}));
hedgeFails.length ? hedgeFails.forEach(x => fail('hedges', x)) : pass('hedges', 'every hedge and forecast survives; no upgrade words the source doesn\'t use');

// ── 5. quotes ────────────────────────────────────────────────────────
const norm = s => String(s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
const quoteFails = [];
scenes.filter(s => s.copy && s.copy.quote).forEach(s => {
  const id = String((s.copy && s.copy.quote) || '').replace(/[{}]/g, '');
  const c = claims[id];
  if (!c) return quoteFails.push('scene "' + s.id + '": quote "' + id + '" is not a claim');
  if (!c.quote) quoteFails.push('scene "' + s.id + '": claim ' + id + ' is not marked "quote": true');
  const shown = norm(c.display != null ? c.display : c.verbatim || '').replace(/^"|"$/g, '');
  const src = norm(c.verbatim || '');
  const parts = shown.split(/\s*(?:…|\.\.\.)\s*/).filter(Boolean);
  let at = 0;
  for (const p of parts) {
    const i = src.indexOf(p, at);
    if (i < 0) { quoteFails.push('scene "' + s.id + '": "' + p.slice(0, 50) + '" is not in the verbatim source sentence — quotes are exact, cuts marked with …'); break; }
    at = i + p.length;
  }
  if (c.speaker && s.copy && s.copy.name && norm(c.speaker) !== norm(s.copy.name)) quoteFails.push('scene "' + s.id + '": attributed to "' + s.copy.name + '" but the claim\'s speaker is "' + c.speaker + '"');
});
quoteFails.length ? quoteFails.forEach(x => fail('quotes', x)) : pass('quotes', scenes.some(s => s.copy && s.copy.quote) ? 'quotes are verbatim' : 'no quotes');

// ── 6. copy limits ───────────────────────────────────────────────────
const LIST_LIMITS = { bars: 3 };
const words = s => stripIds(s).trim().split(/\s+/).filter(Boolean).length + (String(s).match(/\{[A-Za-z][\w.-]*\}/g) || []).length;
const copyFails = [], copyWarns = [];
scenes.forEach(s => {
  const mf = manifest.scenes[s.type] || { slots: {} };
  paintedStrings(s).forEach(p => {
    const lim = p.slot ? (mf.slots[p.slot] || {}).words : LIST_LIMITS[p.list];
    if (lim && words(p.text) > lim) copyFails.push('scene "' + s.id + '" ' + p.where + ': ' + words(p.text) + ' words, limit ' + lim);
    if (/\p{Extended_Pictographic}/u.test(p.text)) copyFails.push('scene "' + s.id + '" ' + p.where + ': emoji in painted copy');
    if ((p.slot === 'headline' || p.slot === 'title') && /\.\s*$/.test(p.text)) copyWarns.push('scene "' + s.id + '" ' + p.where + ': headlines take no full stop');
  });
  if (s.chart && Array.isArray(s.chart.bars) && (s.chart.bars.length < 2 || s.chart.bars.length > 6)) copyFails.push('scene "' + s.id + '": ' + s.chart.bars.length + ' bars, two to six');
});
const publicText = scenes.map(s => paintedStrings(s).map(p => p.text).join(' ')).join(' ') + ' ' + (spec.caption || '') + ' ' + (spec.alt || '');
if (/\bV\d+(\.\d+|\.h)?\b/.test(publicText)) copyFails.push('a V handle appears in copy, caption or alt — handles live in chat only');
if (/\[[A-Z]\]/.test(publicText)) copyFails.push('a source handle like [A] appears in copy, caption or alt — handles live in chat only');
const tags = (spec.caption || '').match(/#\w+/g) || [];
if (tags.length > 3) copyFails.push('caption has ' + tags.length + ' hashtags; keep to 3 or fewer');
copyWarns.forEach(x => warn('copy', x));
copyFails.length ? copyFails.forEach(x => fail('copy', x)) : pass('copy', 'word limits, no handles, no emoji');

// ── 7. determinism (the page's own scripts, not the inlined library) ─
const own = [];
html.replace(/<script(?![^>]*\bsrc=)(?![^>]*application\/json)[^>]*>([\s\S]*?)<\/script>/g, (_, code) => {
  if (/^\s*\/\*!/.test(code)) return;            // an inlined library file
  own.push(code);
});
const detFails = [];
own.forEach(code => {
  const body = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  [['Math.random', /Math\.random\s*\(/], ['Date.now', /Date\.now\s*\(/], ['performance.now', /performance\.now\s*\(/],
    ['new Date()', /new Date\s*\(\s*\)/], ['setTimeout', /setTimeout\s*\(/], ['setInterval', /setInterval\s*\(/], ['requestAnimationFrame', /requestAnimationFrame\s*\(/]]
    .forEach(([n, re]) => { if (re.test(body)) detFails.push(n + ' in the page\'s own script — frames must be a pure function of t (use api.rng / s.t)'); });
  // Words on the stage go through api.label, so they hold one size on screen and the audit sees them.
  if (/\.(fillText|strokeText)\s*\(/.test(body)) detFails.push('the page\'s own script paints text directly — stage words go through api.label (references/stage.md)');
});
const styles = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/g) || []).join('\n');
if (/canvas[^{]*\{[^}]*\b(transition|animation)\s*:/.test(styles)) detFails.push('a CSS transition or animation touches the canvas');
detFails.length ? detFails.forEach(x => fail('determinism', x)) : pass('determinism', 'no timers, clocks or randomness in the page\'s own code');

// ── 8. offline ───────────────────────────────────────────────────────
const offFails = [];
const noData = html.replace(/data:[a-z]+\/[\w.+-]+(;[\w=-]+)*,[^"')\s]*/gi, 'data:');
if (/\b(src|href)\s*=\s*["']?\s*(https?:)?\/\//i.test(noData)) offFails.push('a src or href points at the network');
if (/url\(\s*["']?\s*(https?:)?\/\//i.test(noData)) offFails.push('a CSS url() points at the network');
if (/@import/i.test(styles)) offFails.push('@import in a style sheet');
if (/<link[^>]+rel=["']?stylesheet/i.test(html)) offFails.push('an external <link rel="stylesheet">');
if (/\bfetch\s*\(|XMLHttpRequest|import\s*\(/.test(own.join('\n'))) offFails.push('the page\'s own script reaches the network (fetch / XHR / import())');
offFails.length ? offFails.forEach(x => fail('offline', x)) : pass('offline', 'no network references');

// The page around the player: the template's heading and lede are filled in.
const leftover = [[/<title>\s*TITLE\b/, '<title>'], [/<h1>\s*TITLE\s*<\/h1>/, 'the page heading'], [/ONE LINE: what the video shows/, 'the lede under the heading'], [/"title"\s*:\s*"TITLE"/, 'meta.title']]
  .filter(([re]) => re.test(html)).map(([, where]) => where);
leftover.length ? fail('page', 'the template placeholder is still in ' + leftover.join(', ') + ': write the video\'s title and one line on what it shows and where its figures come from') : pass('page', 'title, heading and lede are filled in');

// ── 9. --final: one standalone file ──────────────────────────────────
if (final) {
  const fin = [];
  if (/<script src="(charts-lib|motion-lib)\//.test(html)) fin.push('the page still loads charts-lib/ or motion-lib/ — run finalize.js');
  if (/root\.VideoAudit\s*=/.test(html)) fin.push('audit.js is inlined; it is for verification only');
  if (!/window\.Charts = window\.Charts \|\| \{\}/.test(html)) fin.push('theme.js is not inlined');
  if (!/M\.player = \{/.test(html)) fin.push('player.js is not inlined');
  const engineKB = Math.round(Buffer.byteLength(html.replace(/data:[^"')\s]*/g, '')) / 1024);
  const totalMB = Buffer.byteLength(html) / 1048576;
  if (engineKB > 400) warn('final', 'page without its data URIs is ' + engineKB + ' KB (engine budget about 300 KB)');
  if (totalMB > 15) warn('final', 'page is ' + totalMB.toFixed(1) + ' MB including assets; above 15 MB some browsers struggle');
  fin.length ? fin.forEach(x => fail('final', x)) : pass('final', 'one standalone file, ' + Math.round(Buffer.byteLength(html) / 1024) + ' KB');
}

done();

// ── helpers ──────────────────────────────────────────────────────────
function loadEngine() {
  const sb = { console, Intl, Math, JSON, Map, Set, Uint8Array, ArrayBuffer, DataView, Error, Promise, Date };
  sb.window = sb; sb.globalThis = sb;
  vm.createContext(sb);
  const runF = f => vm.runInContext(fs.readFileSync(f, 'utf8'), sb, { filename: f });
  runF(path.join(SKILL, 'assets', 'charts-lib', 'theme.js'));
  ['core', 'ease', 'text', 'paint', 'layout', 'design', 'transitions', 'art', 'iso', 'stage'].forEach(n => runF(path.join(MLIB, n + '.js')));
  ['shapes', 'scenes'].forEach(d => fs.readdirSync(path.join(MLIB, d)).filter(f => f.endsWith('.js')).forEach(f => runF(path.join(MLIB, d, f))));
  // The stage's painters live in the page and draw only when a frame is
  // painted; compiling needs none of them.
  // Images are decoded in the browser; here any data URI counts as present.
  return sb;
}
function mockCtx() {
  let font = '10px sans-serif';
  return {
    get font() { return font; }, set font(v) { font = v; },
    measureText(s) {
      const size = +((/(\d+(?:\.\d+)?)px/.exec(font) || [0, 10])[1]);
      const bold = /^(6|7|8|9)00/.test(font) ? 1.06 : 1;
      let w = 0;
      for (const ch of String(s)) w += (/[0-9]/.test(ch) ? 0.56 : /[A-Z]/.test(ch) ? 0.66 : /[ .,'·:;]/.test(ch) ? 0.28 : 0.52) * size * bold;
      return { width: w };
    }
  };
}
function done() {
  const failed = rows.some(r => r.level === 'FAIL');
  if (asJson) { process.stdout.write(JSON.stringify({ ok: !failed, rows }, null, 1) + '\n'); process.exit(failed ? 1 : 0); }
  const w = Math.max(...rows.map(r => r.name.length), 6);
  console.log(path.basename(target) + (final ? ' (--final)' : ''));
  rows.forEach(r => console.log('  ' + r.level + '  ' + r.name.padEnd(w + 2) + r.detail));
  console.log(failed ? 'FAILED: fix every FAIL row, then run again.' : 'OK' + (rows.some(r => r.level === 'WARN') ? ' (with warnings: read them)' : ''));
  process.exit(failed ? 1 : 0);
}
