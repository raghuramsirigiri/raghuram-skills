// scripts/film-docs.js: reads the pre-production files (brief, screenplay,
// bible) into plain objects, and checks them. Used by check-brief.js,
// check-screenplay.js and check-bible.js; the formats are the ones in
// references/brief.md, screenplay.md and bible.md.
'use strict';
const fs = require('fs');

const read = f => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');

// Text compared for quotes: case, spacing, quote marks and dashes don't matter.
function norm(s) {
  return s.toLowerCase()
    .replace(/[‘’‛′]/g, "'").replace(/[“”‟″]/g, '"')
    .replace(/[‐-―−]/g, '-').replace(/ /g, ' ')
    .replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
}

// Numbers as written: 1,204 → 1204; 4.2 stays; a year stays.
function numbers(s) {
  return (String(s).match(/\d[\d,]*(?:\.\d+)?/g) || []).map(n => parseFloat(n.replace(/,/g, '')));
}

// A markdown table under a heading → rows of { column: cell }.
function table(md, heading) {
  const at = md.search(new RegExp('^##\\s+' + heading + '\\s*$', 'mi'));
  if (at < 0) return null;
  const rest = md.slice(at).split('\n').slice(1);
  const lines = [];
  for (const l of rest) {
    if (/^##\s/.test(l)) break;
    if (/^\s*\|/.test(l)) lines.push(l);
  }
  if (lines.length < 2) return [];
  const cells = l => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
  const head = cells(lines[0]).map(h => h.toLowerCase());
  return lines.slice(2).map((l, i) => {
    const c = cells(l), row = { _line: l };
    head.forEach((h, k) => { row[h] = c[k] == null ? '' : c[k]; });
    return row;
  });
}

function field(md, name) {
  const m = md.match(new RegExp('^' + name + ':\\s*(.*)$', 'mi'));
  return m ? m[1].trim() : null;
}

function ids(s, letter) {
  return (String(s || '').match(new RegExp('\\b' + letter + '\\d+\\b', 'g')) || []);
}

// ── brief ───────────────────────────────────────────────────────────────
function parseBrief(md) {
  return {
    thesis: field(md, 'Thesis'), audience: field(md, 'Audience'),
    length: field(md, 'Length'), frame: field(md, 'Frame'),
    claims: table(md, 'Claims'), nouns: table(md, 'Nouns')
  };
}

function checkBrief(md, doc) {
  const b = parseBrief(md), errors = [], warnings = [];
  const D = norm(doc);
  for (const f of ['thesis', 'audience', 'length'])
    if (!b[f]) errors.push('missing "' + f[0].toUpperCase() + f.slice(1) + ':" line');
  if (b.length && !/\d/.test(b.length)) errors.push('Length needs seconds, e.g. "Length: 90 s"');
  if (!b.claims) errors.push('missing "## Claims" table');
  if (!b.nouns) errors.push('missing "## Nouns" table');
  if (!b.claims || !b.nouns) return { brief: b, errors, warnings };

  const seen = new Set();
  for (const c of b.claims) {
    const id = c.id;
    if (!/^C\d+$/.test(id)) { errors.push('claim row without a C<n> id: ' + c._line.slice(0, 80)); continue; }
    if (seen.has(id)) errors.push(id + ': id used twice');
    seen.add(id);
    const quotes = (c.source || '').match(/"([^"]+)"|“([^”]+)”/g) || [];
    if (!quotes.length) { errors.push(id + ': source needs a quote from the document in "quotation marks"'); continue; }
    const qtext = quotes.map(q => q.slice(1, -1));
    for (const q of qtext) {
      // an ellipsis joins pieces that must each be in the document
      for (const piece of q.split(/\s*(?:\.\.\.|…)\s*/)) {
        if (piece && !D.includes(norm(piece))) errors.push(id + ': quote not found in the document: "' + piece.slice(0, 70) + '"');
      }
    }
    const fig = (c.figure || '').trim();
    if (!fig) errors.push(id + ': figure is empty (use — for a claim with no number)');
    const qn = new Set(numbers(qtext.join(' ')));
    for (const n of numbers(fig)) if (!qn.has(n)) errors.push(id + ': figure ' + n + ' is not in its quote');
  }
  const nseen = new Set();
  const kinds = ['person', 'animal', 'object', 'place', 'event', 'abstract'];
  for (const n of b.nouns) {
    if (!/^N\d+$/.test(n.id)) { errors.push('noun row without an N<n> id: ' + n._line.slice(0, 80)); continue; }
    if (nseen.has(n.id)) errors.push(n.id + ': id used twice');
    nseen.add(n.id);
    const kind = (n.kind || '').toLowerCase();
    if (!kinds.includes(kind)) errors.push(n.id + ': kind "' + n.kind + '" is not one of ' + kinds.join(', '));
    for (const c of ids(n.claims, 'C')) if (!seen.has(c)) errors.push(n.id + ': claim ' + c + ' is not in the Claims table');
    if (kind === 'abstract' && !(n['stands for'] || '').replace(/—|-/g, '').trim())
      errors.push(n.id + ' (' + n.noun + '): an abstract noun needs "stands for": the concrete thing the camera shows');
  }
  for (const c of seen) if (!b.nouns.some(n => ids(n.claims, 'C').includes(c)))
    warnings.push(c + ': no noun appears in it; the film may have nothing to show it with');
  return { brief: b, errors, warnings };
}

// ── screenplay ──────────────────────────────────────────────────────────
function parseScreenplay(md) {
  const beats = [];
  const parts = md.split(/^###\s+/m).slice(1);
  for (const p of parts) {
    const lines = p.split('\n');
    const head = lines[0].trim();
    const m = head.match(/^(B\d+)\s*[·|\-]\s*([\d.]+)\s*s\b\s*(?:[·|\-]\s*(\w+))?/i);
    const body = lines.slice(1).join('\n');
    const get = k => { const r = body.match(new RegExp('^' + k + ':\\s*(.*)$', 'mi')); return r ? r[1].trim() : null; };
    beats.push({
      head, id: m && m[1], secs: m ? parseFloat(m[2]) : NaN, tag: m && m[3] ? m[3].toLowerCase() : null,
      place: get('Place'), cast: get('Cast'), camera: get('Camera'), action: get('Action'),
      count: get('Count'), key: get('Key'), callout: get('Callout'), caption: get('Caption'), claims: get('Claims')
    });
  }
  return { logline: field(md, 'Logline'), shape: field(md, 'Shape'), beats };
}

const HEDGE = /\b(about|around|nearly|almost|roughly|some|over|more than|less than|under|up to|approximately|close to)\s*$/i;

function checkScreenplay(md, briefMd) {
  const s = parseScreenplay(md), b = parseBrief(briefMd), errors = [], warnings = [];
  if (!s.logline) errors.push('missing "Logline:" line');
  if (!s.beats.length) errors.push('no beats: each beat starts "### B<n> · <seconds> s"');
  const claims = new Map((b.claims || []).map(c => [c.id, c]));
  const nouns = new Map((b.nouns || []).map(n => [n.id, n]));
  const used = new Set(), seen = new Set();
  let total = 0;
  for (const bt of s.beats) {
    const tag = bt.id || bt.head.slice(0, 30);
    if (!bt.id || isNaN(bt.secs)) { errors.push('beat heading "' + bt.head + '" should read "B<n> · <seconds> s"'); continue; }
    if (seen.has(bt.id)) errors.push(bt.id + ': id used twice');
    seen.add(bt.id);
    total += bt.secs;
    for (const f of ['place', 'camera', 'action', 'caption', 'claims'])
      if (bt[f] == null) errors.push(tag + ': missing "' + f[0].toUpperCase() + f.slice(1) + ':" line');
    for (const n of [...ids(bt.place, 'N'), ...ids(bt.cast, 'N')])
      if (!nouns.has(n)) errors.push(tag + ': noun ' + n + ' is not in the brief');
    const cids = ids(bt.claims, 'C');
    for (const c of cids) { if (!claims.has(c)) errors.push(tag + ': claim ' + c + ' is not in the brief'); else used.add(c); }
    if (!cids.length && !['establishing', 'transition', 'closing'].includes(bt.tag))
      errors.push(tag + ': a beat with no claims is marked establishing, transition or closing in its heading');
    // numbers on screen come from the claims the beat cites
    const allowed = [];
    for (const c of cids) if (claims.has(c)) { const r = claims.get(c); allowed.push(...numbers(r.figure + ' ' + r.claim + ' ' + r.source)); }
    for (const [label, text] of [['caption', bt.caption], ['callout', bt.callout], ['key', bt.key]]) {
      if (!text) continue;
      const re = /\d[\d,]*(?:\.\d+)?/g; let m;
      while ((m = re.exec(text))) {
        const v = parseFloat(m[0].replace(/,/g, ''));
        if (label === 'key' && v === 1) continue;            // "1 form = ..."
        if (allowed.includes(v)) continue;
        const hedged = HEDGE.test(text.slice(0, m.index));
        if (hedged && allowed.some(a => a && Math.abs(v - a) / a <= 0.1)) continue;
        if (label === 'key' && allowed.some(a => a && (a / v) % 1 === 0)) continue;   // 1 dot = 1,000 of 18,000
        errors.push(tag + ': ' + label + ' number ' + m[0] + ' is not in the claims it cites (' + (cids.join(' ') || 'none') + ')');
      }
    }
    if (bt.count && !bt.key) errors.push(tag + ': a Count needs a Key line saying what one unit is');
    if (bt.count) {
      const [a, of] = numbers(bt.count);
      // a key that sets a unit ("1 pebble = 50 cubic centimetres") scales the count
      const km = (bt.key || '').match(/^\s*1\s+[^=]+=\s*([\d,]+(?:\.\d+)?)/);
      const per = km ? parseFloat(km[1].replace(/,/g, '')) : 1;
      const fits = allowed.some(v => v === a || Math.abs(a * per - v) <= v * 0.01 || (of && Math.abs(a / of * 100 - v) <= 0.6));
      if (!fits) warnings.push(tag + ': Count "' + bt.count + '" doesn\'t obviously match a figure in ' + (cids.join(' ') || 'its claims') + '; check the unit');
    }
    if (bt.caption) {
      const words = (bt.caption + ' ' + (bt.callout || '')).split(/\s+/).length;
      if (words / bt.secs > 3.2) warnings.push(tag + ': caption has ' + words + ' words for ' + bt.secs + ' s; hard to read in time');
    }
  }
  const want = parseFloat((b.length || '').replace(/[^\d.]/g, ''));
  if (want && Math.abs(total - want) > want * 0.1)
    errors.push('beats add up to ' + total + ' s; the brief asks for ' + want + ' s (within 10%)');
  for (const [id, c] of claims) if (!used.has(id) && (c.figure || '').trim() !== '—')
    warnings.push(id + ' (' + c.figure + ') is not in any beat; fine if it doesn\'t serve the thesis');
  return { screenplay: s, total, errors, warnings };
}

// ── bible ───────────────────────────────────────────────────────────────
function parseBible(md) {
  const items = [];
  let section = null;
  for (const block of md.split(/^(?=##\s)/m)) {
    const h2 = block.match(/^##\s+(.+)$/m);
    if (h2 && !/^###/.test(block)) section = h2[1].trim().toLowerCase();
    for (const p of block.split(/^###\s+/m).slice(1)) {
      const lines = p.split('\n'), head = lines[0].trim(), body = lines.slice(1).join('\n');
      const get = k => { const r = body.match(new RegExp('^' + k + ':\\s*(.*)$', 'mi')); return r ? r[1].trim() : null; };
      const m = head.match(/^(K\d+)\s*[·|\-]\s*(.+?)\s*[·|\-]\s*(.+)$/);
      items.push({ head, section, id: m && m[1], name: m && m[2], nouns: m ? ids(m[3], 'N') : [],
        job: get('Story job'), tier: get('Tier'), apart: get('Tell apart from'), look: get('Look'), states: get('States'), scale: get('Scale') });
    }
  }
  return { era: field(md, 'Era'), items };
}

function checkBible(md, briefMd, screenMd) {
  const bb = parseBible(md), b = parseBrief(briefMd), s = parseScreenplay(screenMd), errors = [], warnings = [];
  if (!bb.era) errors.push('missing "Era:" line under ## Setting');
  const nouns = new Map((b.nouns || []).map(n => [n.id, n]));
  const covered = new Set(), seen = new Set();
  for (const it of bb.items) {
    if (!it.id) { errors.push('item heading "' + it.head + '" should read "K<n> · <name> · <noun ids>"'); continue; }
    if (seen.has(it.id)) errors.push(it.id + ': id used twice');
    seen.add(it.id);
    if (!['characters', 'props', 'places'].includes(it.section)) errors.push(it.id + ': sits under "## ' + it.section + '"; use Characters, Props or Places');
    if (!it.nouns.length) errors.push(it.id + ' (' + it.name + '): traces to no noun; every item comes from a brief noun');
    for (const n of it.nouns) { if (!nouns.has(n)) errors.push(it.id + ': noun ' + n + ' is not in the brief'); else covered.add(n); }
    for (const [k, label] of [['job', 'Story job'], ['tier', 'Tier'], ['apart', 'Tell apart from'], ['look', 'Look'], ['states', 'States'], ['scale', 'Scale']])
      if (!it[k]) errors.push(it.id + ': missing "' + label + ':" line');
    if (it.tier && !/^(hero|supporting|background)\b/i.test(it.tier))
      errors.push(it.id + ': Tier starts with hero, supporting or background, got "' + it.tier.slice(0, 30) + '"');
  }
  const shown = new Set();
  for (const bt of s.beats) for (const n of [...ids(bt.place, 'N'), ...ids(bt.cast, 'N')]) shown.add(n);
  for (const n of shown) if (!covered.has(n)) {
    const k = nouns.get(n);
    if (k && k.kind === 'abstract') continue;   // shown through what it stands for
    errors.push(n + (k ? ' (' + k.noun + ')' : '') + ' is in the screenplay but no bible item builds it');
  }
  for (const it of bb.items) if (it.id && it.nouns.length && !it.nouns.some(n => shown.has(n)))
    warnings.push(it.id + ' (' + it.name + '): no beat shows it; it may not need building');
  const heroes = bb.items.filter(it => /\bhero\b/i.test(it.tier || ''));
  if (heroes.length > 6) warnings.push(heroes.length + ' items have a hero tier; a hero takes real care to build, so check each is seen close');
  return { bible: bb, errors, warnings };
}

function report(name, res, extra) {
  for (const w of res.warnings) console.log('warning: ' + w);
  for (const e of res.errors) console.log('error: ' + e);
  if (res.errors.length) { console.log(name + ': ' + res.errors.length + ' to fix'); process.exitCode = 1; }
  else console.log(name + ': OK' + (extra ? ' (' + extra + ')' : ''));
}

module.exports = { read, norm, numbers, table, parseBrief, checkBrief, parseScreenplay, checkScreenplay, parseBible, checkBible, report };
