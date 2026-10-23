/*!
 * motion-lib/world.js — the continuous style: one 2.5D world the camera
 * travels across, with the words in a band at the top of the frame.
 *
 *   meta.style: "continuous"
 *   scene.picture: { things, arrange, of, parts, to, per, hold, at, from, camera }
 *                | { chart: "columns" | "bars" | "funnel" | "line" }
 *                | { set: "desk", due, from }
 *                | { act: "highlight", at }
 *
 * compile (core.js) asks band() for each scene's words, plan() for the
 * places, the camera and what each picture does on each beat, and finish()
 * once the timing is known. seek() calls paint() under the words.
 *
 * The rules, from the reviews of the prototypes:
 *   - The words own a band at the top; the world stays below it and above the
 *     footer rule. Nothing in the world enters the band.
 *   - The places sit on one screen row, in the order the story first reaches
 *     them, so every pan between them is level. The camera only pans (and
 *     tracks along a line too long for the frame); the world's scale is set
 *     once per video, so nothing zooms.
 *   - A picture is directed from its finding: the noun gives its things
 *     (things/), the number their arrangement (arrange.js), the verb what they
 *     do (act.js). Series, rankings and funnels are regular flat charts.
 *   - A picture shows its number: the things drawn are the claim exactly,
 *     with the key on screen. Two states of one measure play last year, then
 *     now, and no thing moves from one part to another between them.
 *   - A picture's words come from the scene's copy or its claims.
 *   - Everything is a pure function of t.
 */
(function (root) {
  'use strict';
  const M = root.Motion = root.Motion || {};
  const clamp = v => (v < 0 ? 0 : v > 1 ? 1 : v);
  const sstep = (a, b, x) => { const q = clamp((x - a) / (b - a)); return q * q * (3 - 2 * q); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const GHOST = 0.32;            // what's left of a unit's accent after a fall: the share that was lost
  const STAGE_GAP = 36;          // between the words' band and the world, frame px

  // ── the words: each scene's band ─────────────────────────────────────
  //
  // The band's shape follows the frame: stacked at the top of a tall frame;
  // a row in a squarer one (the figure on the left, its words beside it), so
  // the world keeps its height; a left column in a wide one, with the world
  // in the room to its right.
  const BANDS = {};
  const bandMode = fr => (fr.cls === 'wide' ? 'column' : fr.H / fr.W >= 1.5 ? 'stack' : 'row');
  const COLUMN = 0.4;              // a wide frame's word column, as a share of the safe width

  // The card gives the kicker and the source line to the shared frame; the
  // band's words stack from the top of the zone.
  function head(api, kicker, sources) {
    const c = M.card(api, { kicker, chart: false, valign: 'top', sourceIds: api.used(), sources });
    const S = api.frame.safe, mode = bandMode(api.frame);
    return { c, TY: c.TY, y: c.zone.top, x: S.x, w: mode === 'column' ? Math.round(S.w * COLUMN) : S.w, mode, zone: c.zone, layers: c.layers.slice() };
  }
  function words(api, B, id, role, str, size, lh, weight, color, at, dur, w, x) {
    if (!str) return 0;
    const T = api.T, f = T.font(weight, size, api.design.font);
    const lines = T.balance(api.ctx, str, f, w || B.w);
    const placed = T.place(api.ctx, lines, f, x == null ? B.x : x, B.y, lh, 'left', w || B.w);
    let wi = 0;
    const wordIndex = placed.map(l => { const s0 = wi; wi += l.words.length; return s0; });
    B.layers.push({ kind: 'text', id, role, font: f, size, color, lines: placed, wordIndex, wordTotal: wi, at, dur, large: M.design.isLarge(size, weight) });
    const h = placed.length * lh;
    B.y += h;
    return h;
  }
  // Move layers down by dy (a column's words settling, a row's words centring on their figure).
  function shift(layers, dy) {
    layers.forEach(l => {
      if (l.lines) l.lines.forEach(ln => { ln.y += dy; });
      if (l.kind === 'counter' || l.kind === 'figure' || l.kind === 'rect' || l.kind === 'image') l.y += dy;
      if (l.box) l.box.y += dy;
      if (l.pos) l.pos.y += dy;
    });
  }
  // In a wide frame the words sit a little above the middle of their column.
  function settle(B) {
    if (B.mode === 'column') {
      const free = B.zone.bottom - B.zone.top - (B.y - B.zone.top);
      if (free > 0) { shift(B.layers, free * 0.42); B.y += free * 0.42; }
    }
    return B.layers;
  }
  // The figure's box: on top in a stack or a column, on the left in a row.
  function figureBox(api, B) {
    const S = api.frame.safe;
    if (B.mode === 'row') { const w = Math.round(S.w * 0.42); return { x: S.x, w, maxW: w - 12 }; }
    return { x: B.x, w: B.w, maxW: B.mode === 'stack' ? S.w * 0.62 : B.w };
  }
  // The words that go with a figure of height figH: under it, or beside it in a row.
  function withFigure(api, B, F, figH, fn) {
    const K = M.layout.K, S = api.frame.safe;
    if (B.mode !== 'row') { B.y += figH + 4 * K; fn(); return; }
    const x = B.x, w = B.w, y0 = B.y, n0 = B.layers.length, gap = 24 * K;
    B.x = F.x + F.w + gap; B.w = S.x + S.w - B.x;
    fn();
    const h = B.y - y0;
    if (h < figH) shift(B.layers.slice(n0), (figH - h) / 2);
    B.y = y0 + Math.max(h, figH);
    B.x = x; B.w = w;
  }
  // The band's figure: as large as the display size allows within its box.
  function valueFont(api, B, displays, maxW) {
    const d = api.design;
    const longest = displays.reduce((a, b) => (String(b).length > String(a).length ? b : a), '');
    return api.T.fit(api.ctx, longest, { weight: d.weights.value, family: d.font, maxW, maxH: B.TY.display.max * 0.84, min: Math.min(B.TY.display.min, B.TY.display.max * 0.5), max: B.TY.display.max * 0.8, lh: 1.05, maxLines: 1 });
  }
  const claimOf = (api, v) => { const c = api.claim(String(v || '').replace(/[{}]/g, '')); return { claim: c, display: c.display != null ? c.display : String(c.value), value: +c.value }; };
  // The stage a scene without a picture paints in (a photo, a custom
  // painter): below a stacked or row band, beside a column.
  function stageBox(api, B) {
    const S = api.frame.safe, K = M.layout.K;
    if (B.mode === 'column') { const x = S.x + B.w + 30 * K; return { x, y: B.zone.top, w: S.x + S.w - x, h: B.zone.bottom - B.zone.top }; }
    const y = B.y + 14 * K;
    return { x: S.x, y, w: S.w, h: Math.max(40, B.zone.bottom - y) };
  }

  BANDS['big-number'] = (s, api) => {
    const T = api.T, d = api.design;
    if (!(s.copy && s.copy.value)) throw new Error('copy.value must name a claim, e.g. "F1"');
    const v = claimOf(api, s.copy.value);
    const kicker = api.copy('kicker'), line = api.copy('line'), units = api.copy('units');
    const B = head(api, kicker), F = figureBox(api, B);
    const vf = valueFont(api, B, [v.display], F.maxW);
    const fig = { kind: 'counter', id: 'value', role: 'value', display: v.display, parsed: T.parseDisplay(v.display), font: vf.font, size: vf.size, color: d.ink, x: F.x, y: B.y, h: vf.size * 1.1, align: 'left', boxW: F.w, at: 0.1, dur: 1.1 };
    B.layers.push(fig);
    withFigure(api, B, F, fig.h, () => {
      words(api, B, 'line', 'headline', line, B.TY.headline.size, B.TY.headline.lh, d.weights.title, d.ink, 0.5, 0.7);
      if (units) { B.y += B.TY.headline.gap; words(api, B, 'units', 'units', units, B.TY.units.size, B.TY.units.lh, 400, d.muted, 0.8, 0.5); }
    });
    const read = Math.max(M.READ.number, M.readTime(T.wordCount(line) + 1)) + 0.15 * (T.wordCount(kicker) + T.wordCount(units));
    return { layers: settle(B), rule: B.c.rule, read, fig, values: [v], mode: B.mode };
  };

  // Two states of one measure, as a figure that moves from one to the other
  // with the picture, its year label beside it (under it, where the words
  // sit beside the figure).
  function twoStates(s, api, rows, title, units, kicker) {
    const T = api.T, d = api.design;
    const B = head(api, kicker), F = figureBox(api, B);
    const vf = valueFont(api, B, rows.map(r => r.display), F.maxW);
    const labSize = B.TY.units.size * 1.15, below = B.mode !== 'stack';
    const fig = {
      kind: 'figure', id: 'value', role: 'value', font: vf.font, size: vf.size, color: d.ink, x: F.x, y: B.y, h: vf.size * 1.1, boxW: F.w,
      labelFont: T.font(400, labSize, d.font), labelSize: labSize, labelColor: d.muted, labelBelow: below,
      start: null, keys: rows.map((r, i) => ({ at: 0.2 + i * 1.6, dur: 0.6, value: r.value, display: r.display, label: r.label })), at: 0.1, dur: 3.4
    };
    B.layers.push(fig);
    withFigure(api, B, F, fig.h + (below ? labSize * 1.45 : 0), () => {
      words(api, B, 'title', 'headline', title, B.TY.headline.size, B.TY.headline.lh, d.weights.title, d.ink, 0.5, 0.7);
      if (units) { B.y += B.TY.headline.gap; words(api, B, 'units', 'units', units, B.TY.units.size, B.TY.units.lh, 400, d.muted, 0.8, 0.5); }
    });
    const read = Math.max(M.READ.number, M.readTime(T.wordCount(title)) + 0.15 * (T.wordCount(kicker) + T.wordCount(units)) + 0.6);
    return { layers: settle(B), rule: B.c.rule, read, fig, values: rows, mode: B.mode };
  }
  BANDS['before-after'] = (s, api) => {
    if (!s.before || !s.after) throw new Error('needs "before" and "after"');
    const rows = M.chart.rows(api, [s.before, s.after], 'before/after');
    return twoStates(s, api, rows, api.copy('title'), api.copy('units'), api.copy('kicker'));
  };
  // Two shares of one measure move one figure, unless they are drawn as a
  // chart; anything else is drawn by its chart (columns, a funnel), each
  // value labelled in the world.
  BANDS['compare-bars'] = (s, api) => {
    const rows = M.chart.rows(api, s.bars, 'bars');
    if (rows.length < 2 || rows.length > 6) throw new Error('bars: use 2 to 6 bars (got ' + rows.length + ')');
    const shares = rows.every(r => /%\s*$/.test(r.display));
    if (rows.length === 2 && shares && !(s.picture && s.picture.chart)) return twoStates(s, api, rows, api.copy('title'), api.copy('units'), api.copy('kicker'));
    return titled(s, api, rows, 0.3 * (rows.length - 1));
  };
  BANDS['ranked-list'] = (s, api) => {
    const rows = M.chart.rows(api, s.rows, 'rows');
    if (rows.length < 2 || rows.length > 5) throw new Error('rows: use 2 to 5 (got ' + rows.length + ')');
    for (let i = 1; i < rows.length; i++) if (rows[i].value > rows[i - 1].value) throw new Error('rows must be in rank order, largest first ("' + rows[i].label + '" is larger than "' + rows[i - 1].label + '")');
    return titled(s, api, rows, 0.3 * (rows.length - 1));
  };
  BANDS['share-split'] = (s, api) => {
    const rows = M.chart.rows(api, s.parts, 'parts');
    if (rows.length > 5) throw new Error('parts: at most 5');
    const total = rows.reduce((n, p) => n + p.value, 0);
    if (total > 100.5) throw new Error('parts add up to ' + total + '%, more than 100%');
    if (rows.some(r => !/%\s*$/.test(r.display))) throw new Error('parts are shares of one whole, in %');
    return titled(s, api, rows, 0.4 * rows.length);
  };
  // A title and units in the band; the picture carries the values.
  function titled(s, api, rows, extra, sources) {
    const T = api.T, d = api.design;
    const kicker = api.copy('kicker'), title = api.copy('title'), units = api.copy('units');
    const B = head(api, kicker, sources);
    words(api, B, 'title', 'headline', title, B.TY.headline.size, B.TY.headline.lh, d.weights.title, d.ink, 0.15, 0.7);
    if (units) { B.y += B.TY.headline.gap; words(api, B, 'units', 'units', units, B.TY.units.size, B.TY.units.lh, 400, d.muted, 0.45, 0.5); }
    const read = M.readTime(T.wordCount(title)) + 0.15 * (T.wordCount(kicker) + T.wordCount(units)) + extra;
    return { layers: settle(B), rule: B.c.rule, read, values: rows, series: true, mode: B.mode, B };
  }
  // A series over ordered time: the band says it, the picture (a ribbon) draws it.
  BANDS['trend-line'] = (s, api) => {
    const D = api.R.data[s.series];
    if (!D) throw new Error('series: no data table "' + s.series + '"');
    if (!Array.isArray(D.x) || !Array.isArray(D.y) || D.x.length !== D.y.length || D.x.length < 3) throw new Error('data "' + D.id + '": x and y must be arrays of the same length, at least 3');
    const end = s.end ? claimOf(api, s.end) : null;
    const b = titled(s, api, end ? [end] : [], 0.6, D.source ? [D.source] : []);
    b.line = { id: D.id, x: D.x.slice(), y: D.y.slice(), unit: D.unit, forecastFrom: D.forecastFrom != null ? D.forecastFrom : null, highlight: Array.isArray(s.highlight) ? s.highlight : null, end };
    return b;
  };

  BANDS['hook-headline'] = (s, api) => {
    const T = api.T, d = api.design;
    const kicker = api.copy('kicker'), headline = api.copy('headline'), units = api.copy('units');
    const B = head(api, kicker);
    const fit = T.fit(api.ctx, headline, { weight: d.weights.title, family: d.font, maxW: B.w, maxH: B.TY.display.max * 1.6, min: B.TY.headline.size, max: B.TY.display.max * 0.5, lh: 1.12, maxLines: 3 });
    words(api, B, 'headline', 'headline', headline, fit.size, fit.lh, d.weights.title, d.ink, 0.05, 0.9);
    Object.assign(B.layers[B.layers.length - 1], { reveal: 'words', stagger: 0.075 });
    if (units) { B.y += B.TY.headline.gap; words(api, B, 'units', 'units', units, B.TY.units.size, B.TY.units.lh, 400, d.muted, 0.6, 0.5); }
    const read = M.readTime(T.wordCount(headline)) + 0.15 * (T.wordCount(kicker) + T.wordCount(units));
    return { layers: settle(B), rule: B.c.rule, read, values: [], mode: B.mode };
  };

  BANDS['kicker-title'] = (s, api) => {
    const T = api.T, d = api.design;
    const kicker = api.copy('kicker'), title = api.copy('title'), sub = api.copy('sub');
    const B = head(api, kicker);
    // A statement on its own is set large; one with a line under it, at the card's size.
    const k = sub ? 1 : 1.3;
    words(api, B, 'title', 'headline', title, B.TY.headline.size * k, B.TY.headline.lh * k, d.weights.title, d.ink, 0.15, 0.7);
    if (sub) { B.y += B.TY.headline.gap; words(api, B, 'sub', 'units', sub, B.TY.units.size, B.TY.units.lh, 400, d.muted, 0.45, 0.5); }
    const read = M.readTime(T.wordCount(title)) + 0.15 * (T.wordCount(kicker) + T.wordCount(sub));
    return { layers: settle(B), rule: B.c.rule, read, values: [], mode: B.mode };
  };

  // A title and a list under it; in a row band, the title on the left and
  // the list beside it, so a squarer frame keeps room for the world.
  function titleAndList(api, B, title, list) {
    const d = api.design, K = M.layout.K, S = api.frame.safe;
    if (B.mode !== 'row') {
      words(api, B, 'title', 'headline', title, B.TY.headline.size, B.TY.headline.lh, d.weights.title, d.ink, 0.15, 0.7);
      B.y += B.TY.headline.gap * 2;
      list();
      return;
    }
    const y0 = B.y, x = B.x, w = B.w, tw = Math.round(S.w * 0.38);
    words(api, B, 'title', 'headline', title, B.TY.headline.size, B.TY.headline.lh, d.weights.title, d.ink, 0.15, 0.7, tw);
    const titleBottom = B.y;
    B.y = y0; B.x = S.x + tw + 24 * K; B.w = S.x + S.w - B.x;
    list();
    B.y = Math.max(B.y, titleBottom);
    B.x = x; B.w = w;
  }

  BANDS['bullet-stack'] = (s, api) => {
    const T = api.T, d = api.design, K = M.layout.K;
    const pts = (s.points || []).map((t, i) => api.R.fill(t, 'points[' + i + ']'));
    if (pts.length < 1 || pts.length > 3) throw new Error('points: use 1 to 3');
    const icons = (s.picture && s.picture.icons) || null;
    if (icons && icons.length !== pts.length) throw new Error('picture.icons: one scene id per point (' + pts.length + ')');
    const kicker = api.copy('kicker'), title = api.copy('title');
    const B = head(api, kicker);
    const size = B.TY.headline.size * 0.72, lh = size * 1.2;
    const indent = icons ? size * 2.6 : size * 0.32 + 10 * K;
    titleAndList(api, B, title, () => pts.forEach((t, i) => {
      const at = 0.6 + i * 0.6;
      if (icons) {
        const id = icons[i], pos = { x: B.x + indent * 0.42, y: B.y + lh * 0.75 };
        B.layers.push({ kind: 'draw', id: 'icon-' + i, pos, box: { x: B.x, y: B.y, w: indent, h: lh * 2 }, at, dur: 0.5, fn(cx, p, info) { drawIcon(cx, info.C, id, pos.x, pos.y, p); } });
      } else {
        const mark = size * 0.32;
        B.layers.push({ kind: 'rect', id: 'mark-' + i, x: B.x, y: B.y + (lh - mark) / 2, w: mark, h: mark, color: d.subject, grow: 'x', at, dur: 0.3 });
      }
      words(api, B, 'point-' + i, 'body', t, size, lh, d.weights.title, d.ink, at + 0.05, 0.55, B.w - indent, B.x + indent);
      if (i < pts.length - 1) B.y += 10 * K;
    }));
    const read = Math.max(M.readTime(T.wordCount(pts[pts.length - 1])), M.readTime(T.wordCount(title))) + 0.15 * T.wordCount(kicker);
    return { layers: settle(B), rule: B.c.rule, read, values: [], icons, mode: B.mode };
  };

  // Dated events and numbered steps: words-led scenes; the world holds where it is.
  function listing(s, api, items, mark) {
    const T = api.T, d = api.design, K = M.layout.K;
    const kicker = api.copy('kicker'), title = api.copy('title');
    const B = head(api, kicker);
    const size = B.TY.headline.size * 0.72, lh = size * 1.2, lab = B.TY.units.size * 1.1;
    titleAndList(api, B, title, () => items.forEach((it, i) => {
      const at = 0.6 + i * 0.5;
      words(api, B, 'mark-' + i, 'label', mark(it, i), lab, lab * 1.3, 700, d.accentText, at, 0.4);
      words(api, B, 'item-' + i, 'body', it.text, size, lh, 600, d.ink, at + 0.1, 0.5);
      if (i < items.length - 1) B.y += 10 * K;
    }));
    const read = M.readTime(T.wordCount(items[items.length - 1].text)) + 0.15 * (T.wordCount(kicker) + T.wordCount(title));
    return { layers: settle(B), rule: B.c.rule, read, values: [], mode: B.mode };
  }
  BANDS['timeline'] = (s, api) => {
    const ev = (s.events || []).map((e, i) => ({ date: api.R.fill(e.date, 'events[' + i + '].date'), text: api.R.fill(e.text, 'events[' + i + '].text') }));
    if (ev.length < 2 || ev.length > 5) throw new Error('events: use 2 to 5');
    return listing(s, api, ev, e => e.date);
  };
  BANDS['steps'] = (s, api) => {
    const st = (s.steps || []).map((t, i) => ({ text: api.R.fill(t, 'steps[' + i + ']') }));
    if (st.length < 2 || st.length > 4) throw new Error('steps: use 2 to 4');
    return listing(s, api, st, (e, i) => 'Step ' + (i + 1));
  };

  // A quote, verbatim: all its words on screen in muted, brightening in reading order.
  BANDS['quote'] = (s, api) => {
    const T = api.T, d = api.design, K = M.layout.K;
    const qid = String((s.copy && s.copy.quote) || '').replace(/[{}]/g, '');
    const q = api.claim(qid);
    const body = q.display != null ? String(q.display) : String(q.verbatim || '');
    if (!body) throw new Error('quote claim "' + qid + '" has no display or verbatim text');
    const name = api.copy('name'), role = api.copy('role');
    const B = head(api, null);
    const text = '“' + body + '”';
    const fit = T.fit(api.ctx, text, { weight: 400, family: d.font, maxW: B.w, maxH: B.TY.headline.size * 1.25 * 6, min: B.TY.headline.size, max: B.TY.headline.size * 1.4, lh: 1.25, maxLines: 6 });
    words(api, B, 'quote', 'headline', text, fit.size, fit.lh, 400, d.ink, 0.2, 1);
    const L = B.layers[B.layers.length - 1];
    Object.assign(L, { from: d.muted, reveal: 'brighten', dur: Math.max(0.8, L.wordTotal * 0.18), ease: 'linear' });
    B.y += 12 * K;
    const attAt = 0.2 + L.dur + 0.1;
    words(api, B, 'name', 'body', '— ' + name, B.TY.units.size, B.TY.units.lh, 600, d.ink, attAt, 0.4);
    if (role) words(api, B, 'role', 'units', role, B.TY.units.size, B.TY.units.lh, 400, d.muted, attAt + 0.1, 0.4);
    B.layers.forEach(l => { if (l.id !== 'quote') l.reveal = 'fade'; });
    const read = M.readTime(L.wordTotal) * 0.8 + 0.15 * (T.wordCount(name) + T.wordCount(role));
    return { layers: settle(B), rule: B.c.rule, read, values: [], mode: B.mode };
  };

  // A user's photo takes the stage for its beat; the world steps aside.
  BANDS['photo-pan'] = (s, api) => {
    const img = s.copy && s.copy.image;
    if (!img || !/^data:image\//.test(img)) throw new Error('copy.image must be a data:image/... URI the user supplied');
    const b = titled(Object.assign({}, s, { copy: Object.assign({}, s.copy, { title: s.copy.caption }) }), api, [], 0.8);
    const box = stageBox(api, b.B);
    b.layers.push({ kind: 'image', id: 'photo', src: img, x: box.x, y: box.y, w: box.w, h: box.h, at: 0.3, dur: 0.6 });
    return Object.assign(b, { series: false, hideWorld: true });
  };

  // A custom painter takes the stage for its beat, with the 2.5D kit to draw with.
  BANDS['custom'] = (s, api) => {
    const painter = M.custom[s.draw];
    if (!painter || typeof painter.draw !== 'function') throw new Error('no painter Motion.custom.' + s.draw + ' with a draw(ctx, lt, api) function');
    const b = titled(s, api, [], 0);
    const box = stageBox(api, b.B);
    api.reserved.push(box);
    const enter = +painter.enter || 1, seed = api.spec.meta.seed || 0;
    b.layers.push({ kind: 'draw', id: 'custom', box, at: 0.5, dur: enter, ease: 'linear', fn(cx, p, a) {
      const lt = a.lt - 0.5;
      painter.draw(cx, Math.max(0, lt), {
        box, design: a.design, paint: M.paint, ease: M.ease, mat: M.iso.materials(a.design),
        at: (start, dur, ease) => M.ease.get(ease || 'outQuint')(M.ease.clamp01((lt - start) / (dur || 1e-6))),
        rng: (...keys) => M.rng(seed, s.id, ...keys),
        // A 2.5D view centred in the box: world (0, 0, 0) sits a little below its middle.
        iso: k => M.iso.view(cx, { ax: box.x + box.w / 2, ay: box.y + box.h * 0.62, cx: 0, cy: 0, s: k || 1, font: a.design.font }, 'custom:' + s.id),
        text: (str, x, y, o) => {
          const size = (o && o.size) || a.design.size.label, f = M.text.font((o && o.weight) || 400, size, a.design.font);
          M.paint.text(cx, str, x, y, { font: f, color: (o && o.color) || a.design.ink, h: size * 1.3, alpha: o && o.alpha, layer: 'custom-' + str.slice(0, 12), role: 'body', size });
        }
      });
    } });
    b.read = Math.max(+painter.read || 1.2, b.read);
    return Object.assign(b, { series: false, hideWorld: true });
  };

  BANDS['source-card'] = (s, api) => {
    const T = api.T, d = api.design, K = M.layout.K, S = api.frame.safe;
    const locale = api.spec.meta.locale;
    const ill = (api.spec.claims || []).some(c => c.kind === 'illustrative');
    const srcs = api.spec.sources || [];
    const Z = M.design.frameZone(api.frame, api.footerRows != null ? api.footerRows : 0);
    api.footerUsed = Z.rows;
    api.chrome = { kicker: srcs.length > 1 ? 'Sources' : 'Source', source: null };
    const TY = M.layout.typeFor(api.frame), mode = bandMode(api.frame);
    const B = { y: Z.top, x: S.x, w: mode === 'column' ? Math.round(S.w * COLUMN) : S.w, mode, zone: Z, layers: [], TY };
    let n = 0;
    srcs.forEach(src => {
      words(api, B, 'row-' + n++, n === 1 ? 'headline' : 'body', src.name, TY.headline.size * 0.9, TY.headline.lh * 0.9, 600, d.ink, 0.1, 0.6);
      const rest = [M.formatDate(src.date, locale), src.asOf ? 'as of ' + M.formatDate(src.asOf, locale) : ''].filter(Boolean).join(' · ');
      B.y += 2 * K;
      if (rest) { words(api, B, 'row-' + n++, 'body', rest, TY.units.size, TY.units.lh, 400, d.muted, 0.2, 0.6); B.y += 10 * K; }
    });
    if (ill) { words(api, B, 'row-' + n++, 'body', 'Illustrative figures, not measurements', TY.units.size, TY.units.lh, 600, d.ink, 0.3, 0.6); B.y += 6 * K; }
    const note = api.copy('note');
    if (note) words(api, B, 'row-' + n++, 'body', note, TY.units.size, TY.units.lh, 400, d.muted, 0.35, 0.6);
    B.layers.forEach(l => { l.reveal = 'fade'; });
    const wordsN = srcs.reduce((k, x) => k + T.wordCount(x.name), 1) + T.wordCount(note);
    return { layers: settle(B), rule: true, read: Math.max(M.READ.source, M.readTime(wordsN) * 0.75), values: [], mode };
  };

  // The outro keeps its own layout (the user's name and logo); the world fades out under it.
  function band(def, s, api) {
    if (s.type === 'outro') {
      const b = def.build(s, api);
      return Object.assign(b, { bandBottom: api.frame.safe.y, values: [], hideWorld: true, mode: bandMode(api.frame) });
    }
    const fn = (def && def.band) || BANDS[s.type];
    if (!fn) throw new Error('type "' + s.type + '" is not in the continuous style yet — set meta.style to "slides" for this video');
    const b = fn(s, api);
    delete b.B;
    b.bandBottom = bottomOf(b.layers.filter(l => l.kind !== 'image' && l.id !== 'custom'), api.frame.safe.y);
    return b;
  }
  function bottomOf(layers, floor) {
    let y = floor;
    layers.forEach(l => {
      if (l.lines) l.lines.forEach(ln => { y = Math.max(y, ln.y + ln.h); });
      else if (l.kind === 'counter' || l.kind === 'figure') y = Math.max(y, l.y + l.h);
      else if (l.box) y = Math.max(y, l.box.y + l.box.h);
      else if (l.kind === 'rect') y = Math.max(y, l.y + l.h);
    });
    return y;
  }

  // ── the plan: places, what each beat does on its place, the camera ───
  //
  // A place is one picture at one spot on the world's row:
  //   things  a noun's things in an arrangement (arrange.js), moved by act.js
  //   chart   a regular flat chart (pictures/charts.js), filling the stage
  //   set     a set piece with no figure (pictures/desk.js)
  // A scene makes a new place, goes back to one (`picture.at`, or a claim
  // the place already shows), acts on one (`picture.act`), or rests on the
  // place in view.
  // Words-led scenes rest on the place in view rather than show one of their own.
  const RESTS = ['bullet-stack', 'source-card', 'outro', 'timeline', 'steps', 'quote', 'photo-pan', 'custom'];
  // The scenes each chart draws.
  const CHART_OF = { columns: ['compare-bars'], funnel: ['compare-bars'], bars: ['ranked-list'], line: ['trend-line'] };
  const CAMERAS = ['pan', 'track', 'hold'];
  const COUNT_MAX = 200;          // a count draws one thing each up to this; above it, `per`
  const TRACK_SPEED = 1000;       // a tracking camera's pace, frame px a second
  const MAX_SCALE = 2;
  const COS = 0.8660254, XU = 1.2247449;    // screen x per row unit u, at scale 1
  const MOVERS = 12, STAG = 0.07;          // things carried from one place to the next
  const isShare = v => /%\s*$/.test(String(v.display));
  const noDigits = (str, where) => {
    if (/\d/.test(String(str))) throw new Error(where + ': "' + str + '" — a picture\'s words are the spec\'s own, without digits (the figure comes from its claim)');
  };

  function plan(o) {
    const { list, fr, zone, design, spec, ctx } = o;
    const S = fr.safe, K = M.layout.K, mode = bandMode(fr);
    const W = {
      design, mat: M.iso.materials(design), font: design.font, locale: spec.meta.locale, tf: fr.profile.type,
      label: design.size.label * fr.profile.type, gap: STAGE_GAP, safe: S, mode, ctx
    };
    const custom = composeAll(spec.meta.things);
    const places = [], beats = [], byScene = {};
    let current = null;

    list.forEach((it, i) => {
      const s = it.spec, b = it.built, pic = s.picture || null;
      const where = 'scene "' + it.id + '" picture';
      const beat = { scene: it.id, index: i, it, place: null, acts: [], band: b.bandBottom, layers: b.layers, restOnly: RESTS.indexOf(it.type) >= 0 && !pic, hide: !!b.hideWorld };
      let place = null;
      if (pic) {
        const makes = ['things', 'chart', 'set'].filter(k => pic[k] != null);
        if (makes.length > 1) throw new Error(where + ': give one of "things", "chart" or "set", not ' + makes.join(' and '));
        if (pic.kind != null) throw new Error(where + '.kind: pictures are directed now — give "things" and "arrange", a "chart" or a "set" (references/pictures.md)');
        if (pic.at != null) {
          if (makes.length) throw new Error(where + ': "at" goes back to an earlier place and "' + makes[0] + '" makes a new one — give one or the other');
          place = byScene[pic.at];
          if (!place) throw new Error(where + '.at: "' + pic.at + '" is not a scene with a place before this one');
        }
        if (pic.act != null) {
          if (pic.act !== 'highlight') throw new Error(where + '.act: "' + pic.act + '" — use "highlight"');
          place = place || current;
          if (!place) throw new Error(where + ': there is no place yet to highlight — give it "at"');
          if (place.kind !== 'things') throw new Error(where + ': "highlight" lifts a share of things, and scene "' + place.scene + '" shows a ' + (place.chart || place.set));
          beat.highlight = true;
        } else if (makes.length) {
          place = newPlace(pic, it, places.length, custom, where);
          place.cameFrom = current;
          if (pic.from != null) {
            const src = byScene[pic.from];
            if (!src) throw new Error(where + '.from: "' + pic.from + '" is not a scene with a place before this one');
            if (place.kind === 'chart') throw new Error(where + '.from: a chart takes no things from another place — drop "from"');
            if (src.kind !== 'things') throw new Error(where + '.from: scene "' + pic.from + '" shows a ' + (src.chart || src.set) + ', which has no things to carry');
            place.cameFrom = place.from = src;
          }
          places.push(place);
        } else if (!place) throw new Error(where + ': give it "things", "chart", "set", "at" or "act" (references/pictures.md)');
      } else {
        // A series, a ranking or a trend is a regular chart unless it says otherwise.
        const dc = defaultChart(it);
        if (dc) { place = newPlace({ chart: dc }, it, places.length, custom, where); place.cameFrom = current; places.push(place); }
        else if (b.values && b.values.length) {
          // A figure a place already shows brings the camera back to it.
          place = places.find(p => b.values.some(v => v.claim && p.claims.indexOf(v.claim.id) >= 0)) || null;
          // A finding with no picture of its own rests on the place in view; the lint says so.
          if (!place && !beat.restOnly) beat.fallback = b.values.map(v => v.display);
        }
      }
      place = place || current;
      beat.place = place;
      if (place) {
        byScene[it.id] = place;
        // A beat resting on a borrowed place leaves it as it is.
        if (!beat.fallback) {
          (b.values || []).forEach(v => { if (v.claim && place.claims.indexOf(v.claim.id) < 0) place.claims.push(v.claim.id); });
          place.beats.push(beat);
        }
        current = place;
      }
      beats.push(beat);
    });
    if (!places.length) throw new Error('meta.style "continuous": no scene has a picture — give the first finding a "picture" (references/pictures.md)');
    // Opening words with no picture of their own (a hook headline) open on
    // the first place the story reaches: an establishing shot, its things
    // yet to arrive.
    for (const bt of beats) { if (bt.place) break; bt.place = places[0]; }

    // What each place shows, now that every beat on it is known.
    places.forEach(p => { if (p.kind === 'things') shapeThings(p); else if (p.kind === 'chart') shapeChart(p); });

    // The stage: under the deepest band of words that shows a figure (a stack
    // or a row), or the room right of a wide frame's word column.
    const bottom = zone.ruleY - 14;
    const colRight = S.x + Math.round(S.w * COLUMN) + 30 * K;
    const acting = beats.filter(bt => bt.place && bt.place.beats.indexOf(bt) >= 0 && !bt.restOnly && !bt.hide);
    const top = mode === 'column' ? zone.top + 10 : Math.max(zone.top, ...acting.map(bt => bt.band)) + STAGE_GAP;
    const stage = mode === 'column' ? { x: colRight, y: top, w: S.x + S.w - colRight, h: bottom - top } : { x: S.x, y: top, w: S.w, h: bottom - top };
    if (stage.h < 160) throw new Error('the words leave the world ' + Math.round(stage.h) + ' px of stage in ' + fr.format + ' — shorten the longest title or units line');
    W.stage = stage;

    // One scale for the video: the largest at which every place of things
    // (and every set) fits the stage. Charts are laid out in the stage itself.
    const boxAt = (p, s) => (p.kind === 'things' ? thingsBox(p, s, W) : setBox(p, s));
    const fitsAt = s => places.every(p => {
      if (p.kind === 'chart') return true;
      const bx = boxAt(p, s);
      return bx.y1 - bx.y0 <= stage.h && (p.tracked || bx.x1 - bx.x0 <= stage.w);
    });
    let s = Math.min(MAX_SCALE, stage.h / 470);
    for (let n = 0; n < 90 && s > 0.25 && !fitsAt(s); n++) s *= 0.97;
    W.s = s;
    places.forEach(p => {
      if (p.kind === 'chart') {
        p.def.layout(p, stage, W, ctx);
        const g = p.geo.box;
        Object.assign(p, { ax: 0, ay: 0, fx0: stage.x, fx1: stage.x + stage.w, fy0: g.y, fy1: g.y + g.h });
        return;
      }
      const bx = p.box = boxAt(p, s);
      p.ay = stage.y + (stage.h - (bx.y1 - bx.y0)) / 2 - bx.y0;
      // A line longer than the stage starts at its head; the camera tracks to its tail.
      if (p.tracked) { p.ax = stage.x + 12 - bx.x0; p.trackLen = Math.max(0, bx.x1 - bx.x0 + 24 - stage.w); }
      else p.ax = stage.x + stage.w / 2 - (bx.x0 + bx.x1) / 2;
      Object.assign(p, { fx0: p.ax + bx.x0, fx1: p.ax + bx.x1, fy0: p.ay + bx.y0, fy1: p.ay + bx.y1 });
      // Things in flight keep below the stage's top edge.
      p.ceil = (stage.y + 6 - p.ay) / s;
    });

    // Places along one screen row, just over a frame apart: a neighbour stays
    // off the frame while a beat holds, and in a pan the place in view slides
    // out as the next slides in. A new place joins the end of the row nearer
    // the place the story comes from, so the camera never crosses a place to
    // reach it.
    const row = [];
    places.forEach(p => {
      const from = p.cameFrom ? row.indexOf(p.cameFrom) : -1;
      if (row.length > 1 && from >= 0 && from < (row.length - 1) / 2 + 0.01) row.unshift(p); else row.push(p);
    });
    row.forEach((p, k) => {
      const q = row[k - 1];
      p.sx = k ? q.sx + Math.max((q.trackLen || 0) + fr.W - p.fx0 + 30, q.fx1 + 30) : 0;
    });

    // What each beat does on its place, in content time (0 = the beat's
    // words start; negative = during the pan in).
    beats.forEach(bt => { const p = bt.place; if (p && p.beats.indexOf(bt) >= 0) actsFor(bt, p, W); });
    // Every scene's timing must cover what its picture does, and give its
    // world labels (the parts' names, the key, a mark) their time to be read.
    beats.forEach(bt => {
      const end = bt.acts.reduce((m, a) => Math.max(m, (a.at || 0) + (a.dur || 0)), bt.trackDef ? bt.trackDef.at + bt.trackDef.dur : 0);
      if (end > 0) bt.layers.push({ kind: 'draw', id: 'picture', at: 0, dur: end, fn() {} });
      bt.acts.forEach(a => { if (a.type === 'parts' || a.type === 'key' || a.type === 'mark') bt.layers.push({ kind: 'draw', id: 'world-' + a.type, role: 'label', at: Math.max(0, a.at), dur: 0.45, fn() {} }); });
    });

    // The camera on each beat: on its place, lowered (a pan down) only when
    // the beat's words reach further down; a tracked beat ends at the line's tail.
    beats.forEach(bt => {
      const p = bt.place;
      if (!p) { bt.cam = bt.camIn = { x: 0, y: 0, alpha: 0 }; return; }
      // Words beside the world (a column) never push it; above it, the
      // resting beats' words sit a little closer to it.
      const need = mode === 'column' ? 0 : Math.max(0, bt.band + STAGE_GAP * (bt.restOnly ? 0.3 : 1) - p.fy0);
      // A resting beat may also use the last few pixels above the world's clip.
      const room = bottom + (bt.restOnly ? 5 : 0) - p.fy1;
      const y = -Math.min(need, room), alpha = !bt.hide && need <= room + 0.5 ? 1 : 0;
      const x = p.sx + (p.tracked && p.trackedBy != null && p.trackedBy < bt.index ? p.trackLen : 0);
      bt.camIn = { x, y, alpha };
      bt.cam = bt.trackDef ? { x: p.sx + p.trackLen, y, alpha } : bt.camIn;
    });
    // The closing beats (summary, source) rest together: one camera for the
    // run, low enough for the deepest words, so it doesn't bob between them.
    for (let i = 0; i < beats.length; i++) {
      if (!beats[i].restOnly || beats[i].hide) continue;
      let j = i;
      while (j + 1 < beats.length && beats[j + 1].restOnly && !beats[j + 1].hide && beats[j + 1].place === beats[i].place) j++;
      const run = beats.slice(i, j + 1);
      const y = Math.min(...run.map(b => b.cam.y)), alpha = Math.min(...run.map(b => b.cam.alpha));
      run.forEach(b => { b.cam = b.camIn = { x: b.cam.x, y, alpha }; });
      i = j;
    }
    beats.forEach(bt => {
      if (bt.place) bt.stageTop = Math.min(bt.band + STAGE_GAP, bt.place.fy0 - bt.cam.y);
      // Where the beat's words are, for the audit: the world keeps out of it.
      bt.bandRect = mode === 'column' ? { x0: S.x, y0: zone.top, x1: colRight - 30 * K, y1: zone.bottom } : { x0: 0, y0: zone.top, x1: fr.W, y1: bt.band };
    });

    return Object.assign(W, { places, beats, byScene, s, bottom, colRight });
  }

  function defaultChart(it) {
    const b = it.built;
    if (it.type === 'compare-bars' && b.series) return 'columns';
    if (it.type === 'ranked-list') return 'bars';
    if (it.type === 'trend-line') return 'line';
    return null;
  }

  // Custom things from meta.things, composed from the kit.
  function composeAll(def) {
    const out = {};
    if (def == null) return out;
    if (typeof def !== 'object' || Array.isArray(def)) throw new Error('meta.things: { name: [parts] } (references/pictures.md § Custom things)');
    Object.keys(def).forEach(name => { out[name] = M.things.compose(name, def[name]); });
    return out;
  }

  function newPlace(pic, it, n, custom, where) {
    const base = { id: 'place-' + n + '-' + it.id, scene: it.id, pic, beats: [], claims: [], steps: [], marks: [], lifts: [], flips: [], enter: null, movers: null };
    const refuse = (keys, why) => keys.forEach(k => { if (pic[k] != null) throw new Error(where + ': ' + why + ' — drop "' + k + '"'); });
    if (pic.chart != null) {
      const def = M.charts && M.charts[pic.chart];
      if (!def) throw new Error(where + '.chart: "' + pic.chart + '" — use ' + Object.keys(M.charts || {}).join(', '));
      if (pic.to != null) throw new Error(where + '.to: a prop must give, take or hold things, and a chart has none — drop "to"');
      refuse(['things', 'arrange', 'per', 'hold', 'parts', 'of', 'camera'], 'a chart draws its values itself');
      if (CHART_OF[pic.chart].indexOf(it.type) < 0) throw new Error(where + '.chart: "' + pic.chart + '" draws a ' + CHART_OF[pic.chart].join(' or ') + ', not a ' + it.type);
      return Object.assign(base, { kind: 'chart', chart: pic.chart, def });
    }
    if (pic.set != null) {
      const def = M.things.get(pic.set, where + '.set', custom);
      if (def.role !== 'set') throw new Error(where + '.set: "' + pic.set + '" is not a set piece — use ' + setNames().join(', '));
      refuse(['to', 'things', 'arrange', 'per', 'hold', 'parts', 'of', 'camera'], 'a set piece shows no figure');
      const p = Object.assign(base, { kind: 'set', set: def.name, def });
      if (def.prepare) def.prepare(p, it);
      return p;
    }
    const th = M.things.get(pic.things, where + '.things', custom);
    if (th.role !== 'unit') throw new Error(where + '.things: "' + pic.things + '" is a ' + th.role + ' — things are what the finding counts; a place or device they go to goes in "to"');
    const arrange = pic.arrange;
    if (!M.arrange.ARRANGE[arrange]) throw new Error(where + '.arrange: ' + (arrange == null ? 'say how the things stand' : '"' + arrange + '"') + ' — use ' + M.arrange.names.join(', ') + ' (references/pictures.md)');
    if (!M.arrange.fits(th, arrange)) throw new Error(where + ': ' + (th.people ? 'people' : th.name + 's') + ' don\'t stand in "' + arrange + '"');
    if (pic.of == null || String(pic.of).trim() === '') throw new Error(where + ': give "of", what one ' + th.name + ' stands for (the key says it)');
    noDigits(pic.of, where + '.of');
    if (pic.parts != null) {
      if (!Array.isArray(pic.parts) || pic.parts.some(x => typeof x !== 'string' || !x.trim())) throw new Error(where + '.parts: a list of labels, the share\'s first');
      pic.parts.forEach((x, k) => noDigits(x, where + '.parts[' + k + ']'));
    }
    const camera = pic.camera || 'pan';
    if (CAMERAS.indexOf(camera) < 0) throw new Error(where + '.camera: "' + camera + '" — use ' + CAMERAS.join(', '));
    if (camera === 'track' && arrange !== 'queue') throw new Error(where + '.camera: "track" follows a queue along its length');
    if (pic.hold != null) {
      if (!th.people) throw new Error(where + '.hold: a pose for people, and "' + th.name + '" are not people');
      if ((th.poses || []).indexOf(pic.hold) < 0 || pic.hold === 'walk' || pic.hold === 'stand') throw new Error(where + '.hold: "' + pic.hold + '" — use ' + th.poses.filter(x => x !== 'walk' && x !== 'stand').join(', '));
    }
    if (pic.per != null && !(Number.isInteger(pic.per) && pic.per > 1)) throw new Error(where + '.per: a whole number above 1 — how many of "' + pic.of + '" one ' + th.name + ' stands for');
    const to = pic.to == null ? [] : Array.isArray(pic.to) ? pic.to : [pic.to];
    const props = to.map((nm, k) => {
      const d = M.things.get(nm, where + '.to[' + k + ']', custom);
      if (d.role !== 'prop') throw new Error(where + '.to: "' + nm + '" is not a place or device things go to — use ' + propNames().join(', '));
      return { def: d, name: nm };
    });
    // A prop has a job: things go to it (sort), or a line leads to it (queue).
    if ((arrange === 'piles' || arrange === 'group') && props.length) throw new Error(where + '.to: a prop must give, take or hold things, and in "' + arrange + '" nothing goes to one — drop "to", or sort the things to it');
    if (arrange === 'queue' && props.length > 1) throw new Error(where + '.to: a line leads to one place — give one');
    return Object.assign(base, { kind: 'things', thing: th, arrange, props, camera, hold: pic.hold || null, per: pic.per || null });
  }
  const setNames = () => M.things.names().filter(k => M.things.list[k].role === 'set');
  const propNames = () => M.things.names().filter(k => M.things.list[k].role === 'prop');

  function shapeChart(p) {
    const b = p.beats[0].it.built, where = 'scene "' + p.scene + '" picture.chart';
    if (p.chart === 'line') { p.line = b.line; p.rows = []; return; }
    if (!b.series) throw new Error(where + ': two shares of one measure are things, not a "' + p.chart + '" — give it "things"');
    p.rows = b.values;
    if (p.rows.length < 2) throw new Error(where + ': a chart needs two or more values');
    if (p.rows.some(r => !(r.value >= 0))) throw new Error(where + ': values must be zero or more');
  }

  // What a beat shows on a place of things: a share, two states of one
  // share, parts of a whole, or a count.
  function showing(bt) {
    const it = bt.it, b = it.built, type = it.type, scene = it.id;
    const vals = b.values || [];
    if (bt.highlight || !vals.length) return null;
    if (type === 'big-number') return isShare(vals[0]) ? { kind: 'share', rows: [vals[0]], scene } : { kind: 'count', v: vals[0], scene };
    if (type === 'before-after' || (type === 'compare-bars' && !b.series)) {
      if (!vals.every(isShare)) throw new Error('scene "' + scene + '" picture: ' + vals.map(v => v.display).join(' and ') + ' are counts — things show two states of one share; draw counts as { "chart": "columns" }');
      return { kind: 'two', rows: vals, scene };
    }
    if (type === 'share-split') return { kind: 'split', rows: vals, scene };
    throw new Error('scene "' + scene + '" picture: things can\'t show a ' + type + ' — give it a chart (' + Object.keys(CHART_OF).filter(k => CHART_OF[k].indexOf(type) >= 0).join(', ') + ')');
  }
  const valuesOf = sh => (sh.kind === 'count' ? [] : sh.rows.map(r => r.value));
  // The count each part holds when a beat shows its rows.
  function countsFor(p, rows) {
    const c = p.parts.map(() => 0);
    let used = 0;
    rows.forEach((r, i) => {
      const n = Math.round(r.value * p.T / 100);
      const k = p.split ? i : 0;
      c[k] += n; used += n;
    });
    c[c.length - 1] += p.T - used;
    return c;
  }

  function shapeThings(p) {
    const where = 'scene "' + p.scene + '" picture', pic = p.pic, th = p.thing;
    p.beats.forEach(bt => { bt.showing = showing(bt); });
    const shows = p.beats.map(bt => bt.showing).filter(Boolean);
    const first = shows[0];
    if (!first) throw new Error(where + ': things show a figure, and this scene has none — give it a "set" or a "chart"');
    // The parts: the share first, the rest last.
    let parts;
    if (first.kind === 'split') {
      if (p.arrange === 'queue' || p.arrange === 'group') throw new Error(where + ': a queue or a group shows one share — show parts of a whole as "piles" or "sort"');
      const rows = first.rows, sum = rows.reduce((n, r) => n + r.value, 0);
      const lead = Math.max(0, rows.findIndex(r => r.emph));
      parts = rows.map((r, i) => ({ label: r.label + '  ' + r.display, kind: i === lead ? 'share' : 'part' }));
      if (sum > 100.5) throw new Error(where + ': the parts add up to ' + sum + '%, more than the whole');
      if (sum < 99.5) {
        const lab = pic.parts && pic.parts[rows.length];
        if (!lab) throw new Error(where + '.parts: the parts add up to ' + sum + '% — give a label for the rest, after one per part');
        parts.push({ label: lab, kind: 'rest' });
      } else parts[parts.length - 1].rest = true;
      p.split = true;
      shows.forEach(sh => { if (sh.kind !== 'split') throw new Error('scene "' + sh.scene + '" picture: the place of scene "' + p.scene + '" shows parts of a whole — give this finding a place of its own'); });
    } else {
      const need = p.arrange === 'piles' || p.arrange === 'sort' ? 2 : 1;
      const share = shows.some(sh => sh.kind !== 'count');
      if (share && (!pic.parts || pic.parts.length < need)) throw new Error(where + '.parts: name the share' + (need > 1 ? ' and the rest' : '') + ', e.g. ["Online", "Branch or phone"] — words, no digits');
      parts = [{ label: pic.parts ? pic.parts[0] : null, kind: 'share' }, { label: pic.parts ? pic.parts[1] || null : null, kind: 'rest' }];
      p.hasShare = share;
      shows.forEach(sh => { if (sh.kind === 'split') throw new Error('scene "' + sh.scene + '" picture: parts of a whole need a place of their own'); });
    }
    // The whole: a count's own things, or the exact whole for every share it shows.
    if (first.kind === 'count') {
      const v = first.v;
      if (p.per) p.T = Math.max(1, Math.round(v.value / p.per));
      else {
        if (!Number.isInteger(v.value) || v.value > COUNT_MAX) throw new Error(where + ': ' + v.display + ' is drawn one ' + th.name + ' each only up to ' + COUNT_MAX + ' — give "per" (one ' + th.name + ' for so many ' + pic.of + ')');
        p.T = v.value;
      }
      if (p.T < 2) throw new Error(where + ': ' + v.display + ' at "per" ' + p.per + ' is fewer than two things — a smaller "per"');
      p.count = true;
      shows.forEach(sh => valuesOf(sh).forEach(x => {
        if (Math.abs(x * p.T / 100 - Math.round(x * p.T / 100)) > 1e-6) throw new Error('scene "' + sh.scene + '" picture: ' + x + '% of the ' + p.T + ' things of scene "' + p.scene + '" is not a whole number of them — give it a place of its own');
      }));
      shows.forEach(sh => { if (sh.kind === 'count' && sh !== first) throw new Error('scene "' + sh.scene + '" picture: a second count needs a place of its own'); });
    } else {
      const firstVals = valuesOf(first);
      p.T = M.arrange.exactWhole([].concat(...shows.map(valuesOf)), p.arrange, th.people);
      if (!p.T) {
        const T1 = M.arrange.exactWhole(firstVals, p.arrange, th.people);
        const bad = T1 && shows.find(sh => !M.arrange.exactWhole(firstVals.concat(valuesOf(sh)), p.arrange, th.people));
        if (bad) throw new Error('scene "' + bad.scene + '" picture: ' + valuesOf(bad).join('% and ') + '% is not a whole number of the things of scene "' + p.scene + '" — give it a place of its own');
        throw new Error(where + ': no whole of 10, 20, 25, 50, 100 or 200 things shows ' + firstVals.join('% and ') + '% exactly — draw it as a chart');
      }
      shows.forEach(sh => { if (sh.kind === 'count') throw new Error('scene "' + sh.scene + '" picture: a count needs a place of its own'); });
    }
    // Each part's most things, over every beat.
    const caps = parts.map(() => 0);
    p.parts = parts;
    shows.forEach(sh => {
      const sets = sh.kind === 'count' ? [parts.map((x, i) => (i === parts.length - 1 ? p.T : 0))] : sh.kind === 'two' ? sh.rows.map(r => countsFor(p, [r])) : [countsFor(p, sh.rows)];
      sets.forEach(c => c.forEach((n, i) => { caps[i] = Math.max(caps[i], n); }));
    });
    parts.forEach((pp, i) => { pp.cap = caps[i]; pp.tint = tintFor(pp, i, parts); });
    // A sort needs a destination per part.
    if (p.arrange === 'sort' && p.props.length !== parts.length) throw new Error(where + '.to: a sort sends each part somewhere — give one destination per part (' + parts.length + ': ' + parts.map(x => x.label || 'the rest').join(', ') + ')');
    // Then, marked: the share's level on the earlier state, labelled.
    const two = shows.find(sh => sh.kind === 'two');
    p.markText = two ? { 0: two.rows[0].label + ': ' + two.rows[0].display } : {};
  }
  function tintFor(pp, i, parts) {
    if (pp.kind === 'share') return m => m.A;
    if (pp.kind === 'rest' || pp.rest) return m => m.N;
    const k = parts.slice(0, i).filter(q => q.kind === 'part').length;
    return m => m.gray(0.42 + 0.16 * k);
  }

  // A place of things at scale s: its arrangement, the labels over its parts,
  // its key; the box about its anchor, in frame px.
  function thingsBox(p, s, W) {
    const LB = W.label, lh = LB * 1.3, ctx = W.ctx;
    const listed = p.arrange === 'piles' || p.arrange === 'sort';   // a label over each part; else the share is in the key
    p.parts.forEach((pp, i) => {
      const lines = [];
      if (listed && pp.label) lines.push({ text: pp.label, color: W.design.ink, weight: 600, id: 'part' + i, mark: false });
      if (p.markText[i]) lines.push({ text: p.markText[i], color: W.design.muted, weight: 400, id: 'mark' + i, mark: true });
      pp.lines = lines;
      pp.labelW = lines.length ? Math.max(...lines.map(l => M.text.measure(ctx, l.text, M.text.font(l.weight, LB, W.font)))) : 0;
    });
    // The arrangement keeps the parts' labels apart.
    p.labelHalfU = p.parts.map(pp => (pp.labelW ? pp.labelW / 2 + LB * 0.5 : 0) / (XU * s));
    const L = p.layout = M.arrange.ARRANGE[p.arrange](p);
    const ub = M.arrange.unitBox(p.thing, s);
    const B = M.arrange.bounds(p, L, s);
    let x0 = B.X0, x1 = B.X1, y0 = B.Y0, y1 = B.Y1;
    p.labelSpots = [];
    p.parts.forEach((pp, i) => {
      if (!pp.lines.length) return;
      const r = partRegion(p, L, i, s, ub);
      const y = r.y0 - 14 - pp.lines.length * lh;
      p.labelSpots.push({ part: i, x: r.cx, y, lines: pp.lines });
      x0 = Math.min(x0, r.cx - pp.labelW / 2); x1 = Math.max(x1, r.cx + pp.labelW / 2); y0 = Math.min(y0, y);
    });
    // The parts' names stand on one line, the highest of them.
    const top = Math.min(...p.labelSpots.map(sp => sp.y));
    p.labelSpots.forEach(sp => { sp.y = top; });
    // The key under the picture: what one thing stands for, and for a line
    // or a crowd, which of them are the share.
    const kf = M.text.font(600, LB, W.font);
    const lines = [{ text: M.arrange.keyText(p), icon: 'unit' }];
    if (!listed && p.hasShare && p.parts[0].label) lines.push({ text: p.parts[0].label, icon: 'share' });
    const kw = Math.max(...lines.map(l => M.text.measure(ctx, l.text, kf))) + LB * 1.7;
    const ky = y1 + 22;
    p.tracked = p.arrange === 'queue' && p.camera !== 'hold' && (p.camera === 'track' || x1 - x0 > W.stage.w);
    const kx = p.tracked ? x0 : (x0 + x1) / 2 - kw / 2;
    p.key = { x: kx, y: ky, w: kw, lines };
    y1 = ky + lines.length * lh;
    if (!p.tracked) { x0 = Math.min(x0, kx); x1 = Math.max(x1, kx + kw); }
    return { x0, y0, x1, y1 };
  }
  // A part's screen region at scale s: its things at their most, and its destination.
  function partRegion(p, L, i, s, ub) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity;
    const add = (X, Y, l, r, t) => { x0 = Math.min(x0, X - l); x1 = Math.max(x1, X + r); y0 = Math.min(y0, Y - t); };
    L.parts[i].slots.forEach(q => add((q.x - q.y) * COS * s, ((q.x + q.y) / 2 - q.z) * s, ub.l, ub.r, ub.t));
    const pr = L.props.find(r => r.part === i);
    let cx = null;
    if (pr) {
      const g = pr.def.size, X = (pr.pos.x - pr.pos.y) * COS * s, half = (g.w + g.d) / 2 * COS * s;
      add(X, ((pr.pos.x + pr.pos.y) / 2) * s, half, half, (g.h + (g.w + g.d) / 4) * s);
      cx = X;
    }
    return { x0, x1, y0, cx: cx != null ? cx : (x0 + x1) / 2 };
  }
  // A set piece's box at scale s about its anchor.
  function setBox(p, s) { return p.def.box(p, s); }

  // ── what each beat does ──────────────────────────────────────────────
  const arrivalDur = p => (p.thing.people ? 2.0 : Math.min(2.0, 0.9 + p.T * 0.008));
  const arrivalUnit = p => (p.thing.people ? (p.arrange === 'queue' ? 1.3 : 1.2) : p.arrange === 'sort' ? 0.55 : 0.42);

  function actsFor(bt, p, W) {
    const b = bt.it.built, fig = b.fig, A = bt.acts;
    const first = p.beats[0] === bt;
    const pre = bt.index === 0 ? 0.2 : -0.8;
    // A chart builds once the camera is there.
    if (p.kind === 'chart') { if (first) A.push({ type: 'enter', at: bt.index === 0 ? 0.2 : 0.15, dur: p.def.enterDur(p) }); return; }
    if (p.kind === 'set') {
      if (first && p.from) A.push({ type: 'movers', from: p.from });
      if (first && p.month) A.push({ type: 'flip', at: 1.8, dur: 0.7 });
      return;
    }
    // Things: they arrive as the place slides in (the first beat has no pan).
    let t = pre;
    if (first) {
      if (p.from) A.push({ type: 'movers', from: p.from });
      // A sort's whole streams in as it is dealt: it arrives, unseen, beyond the frame.
      const stream = p.layout.stream;
      const dur = p.tracked ? 3.5 : stream ? 0.02 : arrivalDur(p);
      // A tracked line files in from its head; the camera waits at each of
      // the share until it has arrived.
      if (p.tracked) {
        const unit = arrivalUnit(p), ready = k => t + k / Math.max(1, p.T - 1) * (dur - unit) + unit;
        p.trackedBy = bt.index; bt.trackDef = trackPlan(p, W, 0.6, ready);
      }
      A.push({ type: 'step', at: t, dur, unit: stream ? 0.01 : arrivalUnit(p), counts: { W: p.T } });
      A.push({ type: 'key', at: t + (stream ? 0.8 : dur * (p.tracked ? 0.15 : 0.6)) });
      // A sort's destinations are named from the start: things go to them.
      if (p.arrange === 'sort') A.push({ type: 'parts', at: Math.max(t, 0.1) });
      t = p.tracked ? 0.6 : stream ? t + 0.1 : t + dur + 0.25;
    }
    if (bt.highlight) { A.push({ type: 'lift', at: 0.1, dur: 1.0 }); return; }
    const sh = bt.showing;
    if (!sh) return;
    if (sh.kind === 'count') { if (fig) { fig.at = Math.max(0.1, pre); fig.dur = arrivalDur(p) + 0.2; } return; }
    if (!first) t = 0.3;
    if (sh.kind === 'share' || sh.kind === 'split') {
      const d = goTo(bt, p, countsFor(p, sh.rows), t, null, W);
      // The figure counts as the share's things land, and keeps rolling until
      // the last has: it never rests on a figure the source doesn't state.
      if (fig) { fig.at = d.at; fig.dur = d.dur; fig.countEase = 'linear'; }
      return;
    }
    // Two states of one share: then, marked, then now. A place already
    // showing "now" goes back to "then" first.
    const [r0, r1] = sh.rows, c0 = countsFor(p, [r0]), c1 = countsFor(p, [r1]);
    const same = (x, y) => !!x && x.every((n, i) => n === y[i]);
    const back = same(p.state, c1) && !same(c0, c1);
    const keys = [];
    const d0 = goTo(bt, p, c0, t, null, W);
    keys.push({ at: d0.at, dur: d0.dur, value: r0.value, display: r0.display, label: r0.label });
    t = d0.at + d0.dur + 0.1;
    A.push({ type: 'mark', at: t, dur: 0.5, part: 0, units: c0[0], label: p.markText[0] });
    t += 1.0;
    // A fall leaves a ghost of the share that was lost.
    const d1 = goTo(bt, p, c1, t, c1[0] < c0[0] ? [0] : null, W);
    keys.push({ at: d1.at, dur: d1.dur, value: r1.value, display: r1.display, label: r1.label });
    if (fig) {
      if (back) fig.start = { value: r1.value, display: r1.display };
      fig.keys = keys; fig.at = Math.min(0.1, keys[0].at); fig.dur = d1.at + d1.dur;
    }
  }
  // Move the place's parts to `target`: the first time, things leave the
  // whole for their parts; after that, things fade or fresh ones come in.
  function goTo(bt, p, target, t, ghost, W) {
    const counts = {};
    target.forEach((n, i) => { counts[i] = n; });
    let dur, unit, times = null;
    if (!p.state) {
      const moved = target.reduce((n, c, i) => n + (p.layout.parts[i].stays ? 0 : c), 0);
      unit = p.thing.people ? 0.9 : 0.6;
      if (p.tracked && bt.trackDef) {
        // Along a tracked line, each of the share steps out as the camera reaches it.
        times = trackTimes(bt);
        t = times.length ? times[0] : t;
        dur = times.length ? times[times.length - 1] - times[0] + unit : unit;
      } else dur = Math.min(3.0, 0.9 + moved * 0.022);
      if (p.layout.stream) unit = 0.95;
      bt.acts.push({ type: 'step', at: t, dur, unit, counts, parting: true, times });
      if (p.arrange === 'piles') bt.acts.push({ type: 'parts', at: t + dur + 0.05 });
    } else {
      const changed = target.reduce((n, c, i) => n + Math.abs(c - p.state[i]), 0) / 2;
      dur = Math.max(0.6, Math.min(1.4, 0.4 + changed * 0.12));
      unit = Math.min(0.5, dur);
      bt.acts.push({ type: 'step', at: t, dur, unit, counts, ghost });
    }
    p.state = target.slice();
    return { at: t, dur, times };
  }
  // The tracking camera's path along a line: from its head, it eases to a
  // stop at each of the share (who steps out as it arrives), holds a beat,
  // and travels on to the tail. Keys are { t, x } in content time and
  // camera offset from the place's home.
  const DWELL = 0.9;
  function trackPlan(p, W, at, ready) {
    const L = p.layout, from = (L.parts[0] && L.parts[0].from) || [], Xc = W.stage.x + W.stage.w * 0.55;
    const travel = d => Math.max(0.5, Math.abs(d) / TRACK_SPEED);
    const keys = [{ t: at, x: 0 }], steps = [];
    from.forEach(k => {
      const last = keys[keys.length - 1];
      let x = clamp((p.ax + XU * M.arrange.uOf(L.whole[k]) * W.s - Xc) / (p.trackLen || 1)) * p.trackLen;
      if (x - last.x < 40) x = last.x;
      const t = Math.max(x === last.x ? last.t : last.t + travel(x - last.x), ready(k) + 0.15);
      if (t > last.t) keys.push({ t, x });
      steps.push(t - 0.15);
      keys.push({ t: t + DWELL, x });
    });
    const last = keys[keys.length - 1];
    if (p.trackLen - last.x > 1) keys.push({ t: last.t + travel(p.trackLen - last.x), x: p.trackLen });
    return { at, dur: keys[keys.length - 1].t - at, keys, steps };
  }
  // When each of the share steps out of a tracked line.
  function trackTimes(bt) {
    const ts = bt.trackDef.steps.slice();
    for (let i = 1; i < ts.length; i++) ts[i] = Math.max(ts[i], ts[i - 1] + 0.35);
    return ts;
  }

  // Absolute times, once the timeline is known.
  function finish(W, scenes) {
    W.beats.forEach((bt, i) => {
      const sc = scenes[i];
      bt.t0 = sc.t0; bt.cStart = sc.cStart; bt.cEnd = sc.cEnd; bt.t1 = sc.t1; bt.ovIn = sc.ovIn; bt.exitStart = sc.exitStart;
      sc.place = bt.place ? bt.place.id : null;
      sc.stageTop = bt.stageTop; sc.bandRect = bt.bandRect;
      if (bt.trackDef) { bt.track = { t0: sc.cStart + bt.trackDef.at, dur: bt.trackDef.dur, keys: bt.trackDef.keys.map(k => ({ t: sc.cStart + k.t, x: k.x })) }; sc.tracked = true; }
      bt.acts.forEach(a => {
        const p = bt.place, T = sc.cStart + (a.at == null ? 0 : a.at);
        if (a.type === 'step') p.steps.push({ t0: T, dur: a.dur, unit: a.unit, counts: a.counts, parting: !!a.parting, ghost: a.ghost || null, times: a.times ? a.times.map(x => sc.cStart + x) : null });
        else if (a.type === 'enter') p.enter = { t0: T, dur: a.dur };
        else if (a.type === 'key') p.showKey = T;
        else if (a.type === 'parts') p.showParts = T;
        else if (a.type === 'mark') p.marks.push({ t0: T, dur: a.dur, part: a.part, units: a.units, label: a.label });
        else if (a.type === 'lift') p.lifts.push({ t0: T, dur: a.dur });
        else if (a.type === 'flip') p.flips.push({ t0: T, dur: a.dur });
        // Carried things lift as the pan starts, once the earlier place's labels have gone, and ride it in.
        else if (a.type === 'movers') p.movers = { from: a.from, t0: sc.t0, dur: (sc.cStart - sc.t0) + 0.75 };
      });
    });
    W.places.forEach(p => { if (p.kind === 'things') M.act.plan(p); });
  }

  // ── the camera ───────────────────────────────────────────────────────
  // Where the camera is at t, and how much each place is "the one in view"
  // (labels show on the place in view and fade as the camera leaves).
  function camAt(b, t) {
    if (!b.track || t <= b.track.t0) return b.camIn;
    const K = b.track.keys;
    let x = K[K.length - 1].x;
    for (let i = 0; i < K.length - 1; i++) {
      if (t < K[i + 1].t) { x = lerp(K[i].x, K[i + 1].x, M.ease.sineInOut(clamp((t - K[i].t) / (K[i + 1].t - K[i].t || 1)))); break; }
    }
    return { x: b.camIn.x + x, y: b.cam.y, alpha: b.cam.alpha };
  }
  function camera(W, t) {
    const B = W.beats;
    // The beat arriving: in the overlap between two beats, the later one,
    // whose pan is under way.
    let i = 0;
    for (let k = B.length - 1; k >= 0; k--) if (t >= B[k].t0) { i = k; break; }
    const b = B[i];
    // World labels are read with their beat's words: when the camera is
    // about to move to another place they leave with the words, and they
    // come back once it has arrived.
    const moves = (x, y) => x && y && (x.place !== y.place || Math.abs(x.cam.x - y.camIn.x) > 0.5 || Math.abs(x.cam.y - y.camIn.y) > 0.5);
    if (i > 0 && t < b.cStart && b.ovIn > 0) {
      const a = B[i - 1], g = M.ease.glide(clamp((t - b.t0) / b.ovIn));
      const view = {};
      if (a.place) view[a.place.id] = (view[a.place.id] || 0) + (1 - g);
      if (b.place) view[b.place.id] = (view[b.place.id] || 0) + g;
      return { x: lerp(a.cam.x, b.camIn.x, g), y: lerp(a.cam.y, b.camIn.y, g), alpha: lerp(a.cam.alpha, b.camIn.alpha, g), view, labels: moves(a, b) ? 0 : 1, beat: b, g };
    }
    const view = {};
    if (b.place) view[b.place.id] = 1;
    const fadeIn = moves(B[i - 1], b) ? sstep(b.cStart, b.cStart + 0.4, t) : 1;
    const fadeOut = moves(b, B[i + 1]) ? 1 - sstep(b.exitStart, b.cEnd, t) : 1;
    const c = camAt(b, t);
    return { x: c.x, y: c.y, alpha: c.alpha, view, labels: fadeIn * fadeOut, beat: b, g: 1 };
  }

  // ── painting ─────────────────────────────────────────────────────────
  function paint(ctx, C, t, sceneId) {
    const W = C.world;
    const cam = camera(W, t);
    if (cam.alpha <= 0.001) return;
    const prevScene = M.debug.scene;
    M.debug.scene = sceneId;
    ctx.save();
    // The world's room: under the words (beside a wide frame's column) and
    // above the footer. Shapes record only what shows of them.
    const clip = W.mode === 'column' ? { x0: W.stage.x - 24, y0: 0, x1: C.W, y1: W.bottom + 6 } : { x0: 0, y0: W.stage.y - W.gap * 0.5 - cam.y, x1: C.W, y1: W.bottom + 6 };
    M.paint.clipRect(ctx, clip.x0, clip.y0, clip.x1 - clip.x0, clip.y1 - clip.y0);
    // Records are cut to the clip's height only, so a place that spills off
    // the frame's sides still shows in the audit.
    M.iso.clipBox = { x0: -1e9, y0: clip.y0, x1: 1e9, y1: clip.y1 };
    ctx.globalAlpha *= cam.alpha;
    W.cam = cam;
    W.places.forEach(p => {
      const dx = p.sx - cam.x, dy = -cam.y;
      if (p.fx1 + dx <= 0 || p.fx0 + dx >= C.W) return;   // off the frame
      if (p.kind === 'chart') {
        ctx.save(); ctx.translate(dx, dy);
        p.def.draw(M.iso.flat(ctx, p.id, W.font), p, t, W);
        ctx.restore();
        return;
      }
      const V = M.iso.view(ctx, { ax: p.ax + dx, ay: p.ay + dy, cx: 0, cy: 0, s: W.s, font: W.font }, p.id);
      if (p.kind === 'set') { p.def.draw(V, p, t, W); return; }
      M.act.draw(V, p, t, W);
      drawMarks(V, p, t, W);
      thingLabels(ctx, p, t, W, cam, dx, dy);
    });
    W.places.forEach(p => { if (p.movers) drawMovers(ctx, p, t, W, cam); });
    M.iso.clipBox = null;
    ctx.restore();
    M.debug.scene = prevScene;
  }

  // The level a part stood at "then": a tick across its pile.
  function drawMarks(V, p, t, W) {
    p.marks.forEach(mk => {
      const a = sstep(mk.t0, mk.t0 + mk.dur, t) * (W.cam.view[p.id] || 0) * W.cam.labels;
      const slots = p.layout.parts[mk.part].slots;
      if (a <= 0.001 || !mk.units || !slots[mk.units - 1]) return;
      const q = slots[mk.units - 1], z = q.z + p.thing.size.h + 0.6;
      const half = (0.7071 * (p.thing.size.w + p.thing.size.d)) / 2 + 16, u = M.arrange.uOf(q), v = M.arrange.vOf(q);
      const A = M.arrange.pt(u - half, v + 4, z), B = M.arrange.pt(u + half, v + 4, z);
      V.ctx.save(); V.ctx.globalAlpha *= a;
      V.line([A.x, A.y, z], [B.x, B.y, z], W.design.ink, Math.max(2, 2.2 * W.s));
      V.ctx.restore();
    });
  }

  // The labels over a place's parts and the key under it, while it is the
  // place in view. A tracked line's key stays put while the camera tracks.
  function thingLabels(ctx, p, t, W, cam, dx, dy) {
    const seen = (cam.view[p.id] || 0) * cam.labels;
    if (seen <= 0.001) return;
    const LB = W.label, lh = LB * 1.3, F = M.iso.flat(ctx, p.id, W.font);
    const ax = p.ax + dx, ay = p.ay + dy;
    p.labelSpots.forEach(sp => sp.lines.forEach((ln, n) => {
      const mk = ln.mark ? p.marks.find(x => x.part === sp.part) : null;
      const at = ln.mark ? mk && mk.t0 : p.showParts;
      if (at == null) return;
      F.text(ln.text, ax + sp.x, ay + sp.y + n * lh, { size: LB, weight: ln.weight, color: ln.color, align: 'center', alpha: seen * sstep(at, at + 0.45, t), id: ln.id });
    }));
    if (p.showKey == null || !p.key) return;
    const a = seen * sstep(p.showKey, p.showKey + 0.5, t);
    if (a <= 0.001) return;
    const kd = p.tracked ? (dx > 0 ? dx : dx < -p.trackLen ? dx + p.trackLen : 0) : dx;
    const kx = p.ax + kd + p.key.x, ky = ay + p.key.y;
    ctx.save(); ctx.globalAlpha *= a;
    p.key.lines.forEach((ln, n) => {
      const y = ky + n * lh;
      keyIcon(ctx, p, kx + LB * 0.62, y + lh * 0.5, ln.icon, W);
      F.text(ln.text, kx + LB * 1.7, y + (lh - LB * 1.25) / 2, { size: LB, weight: 600, color: W.design.ink, id: 'key' + n });
    });
    ctx.restore();
  }
  // One of the place's things, small, centred on (x, y): the key's unit, or the share.
  function keyIcon(ctx, p, x, y, kind, W) {
    const th = p.thing, m = W.mat, g = th.size;
    const k = th.people ? W.label * 1.2 / (g.h * 1.06) : W.label * 1.05 / ((g.w + g.d) * COS);
    const lift = th.people ? g.h * 0.5 : g.h * 0.5 - (g.w + g.d) * 0.06;
    const V = M.iso.view(ctx, { ax: x, ay: y + lift * k, cx: 0, cy: 0, s: k, font: W.font }, p.id + ':key');
    const share = kind === 'share';
    th.draw(V, 0, 0, 0, { mat: m, body: share ? m.A : th.natural ? m[th.natural] : m.N2, kind: share ? 'share' : th.people ? 'rest' : 'part', seed: 5, pose: share && p.hold ? p.hold : 'stand', phase: 0 });
  }

  // Carry-over: a few of the earlier place's share lift off it and travel
  // on the camera's own easing, so on screen they drift steadily to the new
  // place, where they settle into it, greyed: the link the story makes
  // (unsent forms to a desk), never a count. The earlier place keeps all of
  // its things.
  function carryFrom(src, p, k, W) {
    const L = src.layout, share = L.parts[0].slots, n = share.length;
    const q = share[Math.max(0, n - 1 - (k % Math.max(1, n)))] || L.whole[k % L.whole.length];
    const u = M.arrange.uOf(q) + (src.ax + src.sx - p.ax - p.sx) / (XU * W.s), v = M.arrange.vOf(q) + (src.ay - p.ay) / (0.7071 * W.s);
    return M.arrange.pt(u, v, q.z);
  }
  function landing(p, k) {
    if (p.def && p.def.landing) return p.def.landing(p, k);
    const w = p.layout.whole;
    return w[k % w.length];
  }
  const carryFlight = p => Math.max(0.6, p.movers.dur - (MOVERS - 1) * STAG);
  // How many carried things have landed by t, and where each lies.
  function carried(p, t) {
    if (!p.movers) return [];
    const out = [], F = carryFlight(p);
    for (let k = 0; k < MOVERS; k++) if (t >= p.movers.t0 + k * STAG + F) out.push({ k, pos: landing(p, k) });
    return out;
  }
  function drawMovers(ctx, p, t, W, cam) {
    const mv = p.movers, src = mv.from, th = src.thing, m = W.mat, F = carryFlight(p);
    const V = M.iso.view(ctx, { ax: p.ax + p.sx - cam.x, ay: p.ay - cam.y, cx: 0, cy: 0, s: W.s, font: W.font }, p.id + ':movers');
    const a0 = ctx.globalAlpha;
    for (let k = MOVERS - 1; k >= 0; k--) {
      const q = clamp((t - mv.t0 - k * STAG) / F);
      if (q <= 0 || q >= 1) continue;
      const a = carryFrom(src, p, k, W), b = landing(p, k);
      const e = M.ease.glide(clamp((q - 0.12) / 0.8)), land = sstep(0.75, 1, q);
      const z = lerp(a.z, b.z, land) + sstep(0, 0.2, q) * (1 - land) * 120;
      ctx.globalAlpha = a0 * Math.min(1, q * 6);
      th.draw(V, lerp(a.x, b.x, e), lerp(a.y, b.y, e), z, { mat: m, body: m.between(m.A, th.natural ? m[th.natural] : m.N2, land), kind: 'part', seed: k, pose: 'stand' });
    }
    ctx.globalAlpha = a0;
  }

  // A small picture of a scene's place, for the summary's points.
  function drawIcon(ctx, C, sceneId, x, y, alpha) {
    const W = C.world, p = W && W.byScene[sceneId];
    if (!p || alpha <= 0.001) return;
    ctx.save(); ctx.globalAlpha *= alpha;
    if (p.kind === 'chart') p.def.icon(M.iso.flat(ctx, 'icon:' + sceneId, W.font), x, y, W);
    else if (p.kind === 'set') { if (p.def.icon) p.def.icon(M.iso.view(ctx, { ax: x, ay: y, cx: 0, cy: 0, s: 1, font: W.font }, 'icon:' + sceneId), p, W); }
    else {
      const th = p.thing, g = th.size, k = th.people ? 42 / g.h : 40 / ((g.w + g.d) * COS);
      const V = M.iso.view(ctx, { ax: x, ay: y + (th.people ? 20 : 6), cx: 0, cy: 0, s: k, font: W.font }, 'icon:' + sceneId);
      const sp = th.people ? th.spacing || 22 : 0;
      [-1, 0, 1].forEach((d, i) => {
        const o = { mat: W.mat, body: i === 2 ? W.mat.A : th.natural ? W.mat[th.natural] : W.mat.N2, kind: i === 2 ? 'share' : th.people ? 'rest' : 'part', seed: i, pose: 'stand' };
        if (th.people) th.draw(V, d * sp / 1.41, -d * sp / 1.41, 0, o);
        else th.draw(V, 0, 0, i * (th.stack || g.h + 1), o);
      });
    }
    ctx.restore();
  }

  M.world = { plan, band, finish, paint, camera, drawIcon, carried, sstep, clamp, lerp, GHOST, BANDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = M.world;
})(typeof window !== 'undefined' ? window : globalThis);
