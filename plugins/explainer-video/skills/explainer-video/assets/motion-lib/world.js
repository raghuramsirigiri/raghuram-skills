/*!
 * motion-lib/world.js — the continuous style: one 2.5D world the camera
 * travels across, with the words in a band at the top of the frame.
 *
 *   meta.style: "continuous"     scene.picture: { kind, at, from, of, … }
 *
 * compile (core.js) asks band() for each scene's words, plan() for the
 * places, the camera and what each picture does on each beat, and finish()
 * once the timing is known. seek() calls paint() under the words.
 *
 * The rules, from the reviews of the prototypes:
 *   - The words own a band at the top; the world stays below it and above the
 *     footer rule. Nothing in the world enters the band.
 *   - The places sit on one screen row, in the order the story first reaches
 *     them, so every pan between them is level. The camera only pans; the
 *     world's scale is set once per video, so nothing zooms.
 *   - A picture shows its number: one unit per stated thing, with its key on
 *     screen. Two states of one measure play last year, then now.
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
  const LABEL = 30;              // world labels (keys, marks), frame px

  // ── the picture registry ─────────────────────────────────────────────
  const PICS = {};
  function register(def) {
    if (!def || !def.kind || typeof def.draw !== 'function') throw new Error('pictures.register: need { kind, draw }');
    PICS[def.kind] = def;
  }
  function getPic(kind, where) {
    const d = PICS[kind];
    if (!d) throw new Error(where + ': unknown picture "' + kind + '" — use ' + Object.keys(PICS).sort().join(', '));
    return d;
  }
  M.pictures = { register, get: getPic, list: PICS };

  // ── the words: each scene's band ─────────────────────────────────────
  const BANDS = {};

  // The card gives the kicker and the source line to the shared frame; the
  // band's words stack from the top of the zone.
  function head(api, kicker) {
    const c = M.card(api, { kicker, chart: false, valign: 'top', sourceIds: api.used() });
    return { c, TY: c.TY, y: c.zone.top, layers: c.layers.slice() };
  }
  function words(api, B, id, role, str, size, lh, weight, color, at, dur, w, x) {
    if (!str) return 0;
    const T = api.T, f = T.font(weight, size, api.design.font), S = api.frame.safe;
    const lines = T.balance(api.ctx, str, f, w || S.w);
    const placed = T.place(api.ctx, lines, f, x == null ? S.x : x, B.y, lh, 'left', w || S.w);
    let wi = 0;
    const wordIndex = placed.map(l => { const s0 = wi; wi += l.words.length; return s0; });
    B.layers.push({ kind: 'text', id, role, font: f, size, color, lines: placed, wordIndex, wordTotal: wi, at, dur, large: M.design.isLarge(size, weight) });
    const h = placed.length * lh;
    B.y += h;
    return h;
  }
  // The band's figure: as large as the display size allows within the width.
  function valueFont(api, B, displays) {
    const d = api.design, S = api.frame.safe;
    const longest = displays.reduce((a, b) => (String(b).length > String(a).length ? b : a), '');
    // Room beside the figure for its year label.
    return api.T.fit(api.ctx, longest, { weight: d.weights.value, family: d.font, maxW: S.w * 0.62, maxH: B.TY.display.max * 0.84, min: B.TY.display.min, max: B.TY.display.max * 0.8, lh: 1.05, maxLines: 1 });
  }
  const claimOf = (api, v) => { const c = api.claim(String(v || '').replace(/[{}]/g, '')); return { claim: c, display: c.display != null ? c.display : String(c.value), value: +c.value }; };

  BANDS['big-number'] = (s, api) => {
    const T = api.T, d = api.design, K = M.layout.K, S = api.frame.safe;
    if (!(s.copy && s.copy.value)) throw new Error('copy.value must name a claim, e.g. "F1"');
    const v = claimOf(api, s.copy.value);
    const kicker = api.copy('kicker'), line = api.copy('line'), units = api.copy('units');
    const B = head(api, kicker);
    const vf = valueFont(api, B, [v.display]);
    const fig = { kind: 'counter', id: 'value', role: 'value', display: v.display, parsed: T.parseDisplay(v.display), font: vf.font, size: vf.size, color: d.ink, x: S.x, y: B.y, h: vf.size * 1.1, align: 'left', boxW: S.w, at: 0.1, dur: 1.1 };
    B.layers.push(fig);
    B.y += vf.size * 1.1 + 4 * K;
    words(api, B, 'line', 'headline', line, B.TY.headline.size, B.TY.headline.lh, d.weights.title, d.ink, 0.5, 0.7);
    if (units) { B.y += B.TY.headline.gap; words(api, B, 'units', 'units', units, B.TY.units.size, B.TY.units.lh, 400, d.muted, 0.8, 0.5); }
    const read = Math.max(M.READ.number, M.readTime(T.wordCount(line) + 1)) + 0.15 * (T.wordCount(kicker) + T.wordCount(units));
    return { layers: B.layers, rule: B.c.rule, read, fig, values: [v] };
  };

  // Two states of one measure, as a figure that moves from one to the other
  // with the picture, its year label beside it.
  function twoStates(s, api, rows, title, units, kicker) {
    const T = api.T, d = api.design, K = M.layout.K, S = api.frame.safe;
    const B = head(api, kicker);
    const vf = valueFont(api, B, rows.map(r => r.display));
    const labSize = B.TY.units.size * 1.15;
    const fig = {
      kind: 'figure', id: 'value', role: 'value', font: vf.font, size: vf.size, color: d.ink, x: S.x, y: B.y, h: vf.size * 1.1, boxW: S.w,
      labelFont: T.font(400, labSize, d.font), labelSize: labSize, labelColor: d.muted,
      start: null, keys: rows.map((r, i) => ({ at: 0.2 + i * 1.6, dur: 0.6, value: r.value, display: r.display, label: r.label })), at: 0.1, dur: 3.4
    };
    B.layers.push(fig);
    B.y += vf.size * 1.1 + 4 * K;
    words(api, B, 'title', 'headline', title, B.TY.headline.size, B.TY.headline.lh, d.weights.title, d.ink, 0.5, 0.7);
    if (units) { B.y += B.TY.headline.gap; words(api, B, 'units', 'units', units, B.TY.units.size, B.TY.units.lh, 400, d.muted, 0.8, 0.5); }
    const read = Math.max(M.READ.number, M.readTime(T.wordCount(title)) + 0.15 * (T.wordCount(kicker) + T.wordCount(units)) + 0.6);
    return { layers: B.layers, rule: B.c.rule, read, fig, values: rows };
  }
  BANDS['before-after'] = (s, api) => {
    if (!s.before || !s.after) throw new Error('needs "before" and "after"');
    const rows = M.chart.rows(api, [s.before, s.after], 'before/after');
    return twoStates(s, api, rows, api.copy('title'), api.copy('units'), api.copy('kicker'));
  };
  // Two shares of one measure move one figure; anything else is drawn by its
  // picture (columns, a funnel), each value labelled in the world.
  BANDS['compare-bars'] = (s, api) => {
    const rows = M.chart.rows(api, s.bars, 'bars');
    if (rows.length < 2 || rows.length > 6) throw new Error('bars: use 2 to 6 bars (got ' + rows.length + ')');
    const shares = rows.every(r => /%\s*$/.test(r.display));
    const kind = s.picture && s.picture.kind;
    if (rows.length === 2 && shares && (!kind || ['blocks', 'people', 'dots'].indexOf(kind) >= 0)) return twoStates(s, api, rows, api.copy('title'), api.copy('units'), api.copy('kicker'));
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
  function titled(s, api, rows, extra) {
    const T = api.T, d = api.design;
    const kicker = api.copy('kicker'), title = api.copy('title'), units = api.copy('units');
    const B = head(api, kicker);
    words(api, B, 'title', 'headline', title, B.TY.headline.size, B.TY.headline.lh, d.weights.title, d.ink, 0.15, 0.7);
    if (units) { B.y += B.TY.headline.gap; words(api, B, 'units', 'units', units, B.TY.units.size, B.TY.units.lh, 400, d.muted, 0.45, 0.5); }
    const read = M.readTime(T.wordCount(title)) + 0.15 * (T.wordCount(kicker) + T.wordCount(units)) + extra;
    return { layers: B.layers, rule: B.c.rule, read, values: rows, series: true };
  }

  BANDS['kicker-title'] = (s, api) => {
    const T = api.T, d = api.design;
    const kicker = api.copy('kicker'), title = api.copy('title'), sub = api.copy('sub');
    const B = head(api, kicker);
    // A statement on its own is set large; one with a line under it, at the card's size.
    const k = sub ? 1 : 1.3;
    words(api, B, 'title', 'headline', title, B.TY.headline.size * k, B.TY.headline.lh * k, d.weights.title, d.ink, 0.15, 0.7);
    if (sub) { B.y += B.TY.headline.gap; words(api, B, 'sub', 'units', sub, B.TY.units.size, B.TY.units.lh, 400, d.muted, 0.45, 0.5); }
    const read = M.readTime(T.wordCount(title)) + 0.15 * (T.wordCount(kicker) + T.wordCount(sub));
    return { layers: B.layers, rule: B.c.rule, read, values: [] };
  };

  BANDS['bullet-stack'] = (s, api) => {
    const T = api.T, d = api.design, K = M.layout.K, S = api.frame.safe;
    const pts = (s.points || []).map((t, i) => api.R.fill(t, 'points[' + i + ']'));
    if (pts.length < 1 || pts.length > 3) throw new Error('points: use 1 to 3');
    const icons = (s.picture && s.picture.icons) || null;
    if (icons && icons.length !== pts.length) throw new Error('picture.icons: one scene id per point (' + pts.length + ')');
    const kicker = api.copy('kicker'), title = api.copy('title');
    const B = head(api, kicker);
    words(api, B, 'title', 'headline', title, B.TY.headline.size, B.TY.headline.lh, d.weights.title, d.ink, 0.15, 0.7);
    B.y += B.TY.headline.gap * 2;
    const size = B.TY.headline.size * 0.72, lh = size * 1.2;
    const indent = icons ? size * 2.6 : size * 0.32 + 10 * K;
    pts.forEach((t, i) => {
      const at = 0.6 + i * 0.6;
      const y0 = B.y;
      if (icons) {
        const id = icons[i];
        B.layers.push({ kind: 'draw', id: 'icon-' + i, box: { x: S.x, y: y0, w: indent, h: lh * 2 }, at, dur: 0.5, fn(cx, p, info) { drawIcon(cx, info.C, id, S.x + indent * 0.42, y0 + lh * 0.75, p); } });
      } else {
        const mark = size * 0.32;
        B.layers.push({ kind: 'rect', id: 'mark-' + i, x: S.x, y: y0 + (lh - mark) / 2, w: mark, h: mark, color: d.subject, grow: 'x', at, dur: 0.3 });
      }
      words(api, B, 'point-' + i, 'body', t, size, lh, d.weights.title, d.ink, at + 0.05, 0.55, S.w - indent, S.x + indent);
      if (i < pts.length - 1) B.y += 10 * K;
    });
    const read = Math.max(M.readTime(T.wordCount(pts[pts.length - 1])), M.readTime(T.wordCount(title))) + 0.15 * T.wordCount(kicker);
    return { layers: B.layers, rule: B.c.rule, read, values: [], icons };
  };

  BANDS['source-card'] = (s, api) => {
    const T = api.T, d = api.design, K = M.layout.K, S = api.frame.safe;
    const locale = api.spec.meta.locale;
    const ill = (api.spec.claims || []).some(c => c.kind === 'illustrative');
    const srcs = api.spec.sources || [];
    const Z = M.design.frameZone(api.frame, api.footerRows != null ? api.footerRows : 0);
    api.footerUsed = Z.rows;
    api.chrome = { kicker: srcs.length > 1 ? 'Sources' : 'Source', source: null };
    const TY = M.layout.typeFor(api.frame);
    const B = { y: Z.top, layers: [], TY };
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
    return { layers: B.layers, rule: true, read: Math.max(M.READ.source, M.readTime(wordsN) * 0.75), values: [] };
  };

  function band(def, s, api) {
    const fn = (def && def.band) || BANDS[s.type];
    if (!fn) throw new Error('type "' + s.type + '" is not in the continuous style yet — set meta.style to "slides" for this video');
    const b = fn(s, api);
    b.bandBottom = bottomOf(b.layers, api.frame.safe.y);
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
  // A place is one picture (plus its props) at one spot in the world. A scene
  // makes a new place, revisits one (`picture.at`, or a claim the place
  // already shows), or stays where the camera is.
  // The scenes that rest on the last place rather than show one of their own.
  const RESTS = ['bullet-stack', 'source-card', 'outro'];

  function plan(o) {
    const { list, fr, zone, design } = o;
    const places = [], beats = [], byScene = {};
    let current = null;
    const where = it => 'scene "' + it.id + '" picture';

    list.forEach((it, i) => {
      const s = it.spec, b = it.built, pic = s.picture || {};
      const kind = pic.kind || defaultKind(it);
      const def = kind ? getPic(kind, where(it)) : null;
      let place = null;
      if (pic.at) {
        place = byScene[pic.at];
        if (!place) throw new Error(where(it) + '.at: "' + pic.at + '" is not a scene with a place before this one');
      }
      const beat = { scene: it.id, index: i, place: null, acts: [], band: b.bandBottom, layers: b.layers, restOnly: RESTS.indexOf(it.type) >= 0 };
      if (def && def.emphasis) {
        place = place || current;
        if (!place) throw new Error(where(it) + ': "' + kind + '" lifts a place, but there is none yet — give it "at"');
        if (!place.def.liftable) throw new Error(where(it) + ': "' + kind + '" cannot lift a "' + place.kind + '" place');
        beat.acts.push({ type: 'lift', at: 0.1, dur: 1.0 });
      } else if (!place && def) {
        place = newPlace(def, kind, pic, it, places.length, o.R);
        place.cameFrom = (pic.from && byScene[pic.from]) || current;
        places.push(place);
      } else if (!place && b.values && b.values.length) {
        // A figure a place already shows brings the camera back to it.
        place = places.find(p => b.values.some(v => p.claims.indexOf(v.claim.id) >= 0)) || null;
      }
      place = place || current;
      beat.place = place;
      if (place) {
        byScene[it.id] = place;
        b.values && b.values.forEach(v => { if (place.claims.indexOf(v.claim.id) < 0) place.claims.push(v.claim.id); });
        act(beat, place, it, pic);
        current = place;
      }
      beats.push(beat);
    });
    if (!places.length) throw new Error('meta.style "continuous": no scene has a picture — give the first finding a "picture" (references/pictures.md)');

    // Every scene's timing must cover what its picture does.
    beats.forEach(bt => {
      const end = bt.acts.reduce((m, a) => Math.max(m, a.at + a.dur), 0);
      if (end > 0) bt.layers.push({ kind: 'draw', id: 'picture', at: 0, dur: end, fn() {} });
    });

    // Geometry. Each place's box about its anchor: the shapes scale with the
    // world, its key stays at label size. The world takes the largest scale
    // (up to 1) at which every place fits between the words and the footer.
    places.forEach(p => { p.geo = placeGeo(p); p.keyW = p.def.key ? Math.max(...keyLines(p).map(l => M.text.measure(o.ctx, l.text, M.text.font(600, LABEL, design.font)))) : 0; });
    const S = fr.safe;
    const bottom = zone.ruleY - 14;
    const dataBand = Math.max(...beats.filter(bt => bt.place && !bt.restOnly).map(bt => bt.band), zone.top);
    const top = dataBand + STAGE_GAP;
    const maxWide = fr.W - 2 * Math.min(S.x, fr.W - S.x - S.w);
    const fits = k => {
      const bs = places.map(p => boxAt(p, k));
      return Math.max(...bs.map(b => b.y1)) - Math.min(...bs.map(b => b.y0)) <= bottom - top && Math.max(...bs.map(b => b.x1 - b.x0)) <= maxWide;
    };
    let s = 1;
    if (!fits(1)) { let lo = 0.2, hi = 1; for (let n = 0; n < 24; n++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; } s = lo; }
    places.forEach(p => { p.box = boxAt(p, s); });
    const minY = Math.min(...places.map(p => p.box.y0)), maxY = Math.max(...places.map(p => p.box.y1));
    const rowY = (top - minY + bottom - maxY) / 2;
    const ax = S.x + S.w / 2;

    // Places along one screen row, far enough apart that a neighbour stays
    // off the frame. A new place joins the end of the row nearer the place
    // the story comes from, so the camera never crosses a place to reach it.
    const row = [];
    places.forEach(p => {
      const from = p.cameFrom ? row.indexOf(p.cameFrom) : -1;
      if (row.length > 1 && from >= 0 && from < (row.length - 1) / 2 + 0.01) row.unshift(p); else row.push(p);
    });
    let u = 0;
    row.forEach((p, k) => {
      if (k > 0) {
        const prev = row[k - 1];
        const dist = fr.W * 0.62 + (prev.box.x1 - p.box.x0);
        u += dist / (2 * M.iso.COS * s);
      }
      p.x = u; p.y = -u;
      p.sx = 2 * u * M.iso.COS * s;          // the place's anchor, in screen px along the row
    });

    // The camera on each beat: the place's box centred on the safe area, and
    // lowered (a pan down) only when the beat's words reach further down.
    beats.forEach(bt => {
      const p = bt.place;
      if (!p) { bt.cam = { x: 0, y: 0, alpha: 0 }; return; }
      const cx = p.sx + (p.box.x0 + p.box.x1) / 2;
      const placeTop = rowY + p.box.y0, placeBottom = rowY + p.box.y1;
      // The closing beats' words sit a little closer to the world.
      const need = Math.max(0, bt.band + STAGE_GAP * (bt.restOnly ? 0.6 : 1) - placeTop);
      const room = bottom - placeBottom;
      bt.cam = { x: cx, y: -Math.min(need, room), alpha: need <= room + 0.5 ? 1 : 0 };
    });
    // The closing beats (summary, source) rest together: one camera for the
    // run, low enough for the deepest words, so it doesn't bob between them.
    for (let i = 0; i < beats.length; i++) {
      if (!beats[i].restOnly) continue;
      let j = i;
      while (j + 1 < beats.length && beats[j + 1].restOnly && beats[j + 1].place === beats[i].place) j++;
      const run = beats.slice(i, j + 1);
      const y = Math.min(...run.map(b => b.cam.y)), alpha = Math.min(...run.map(b => b.cam.alpha));
      run.forEach(b => { b.cam.y = y; b.cam.alpha = alpha; });
      i = j;
    }
    beats.forEach(bt => { if (bt.place) bt.stageTop = Math.min(bt.band + STAGE_GAP, rowY + bt.place.box.y0 - bt.cam.y); });

    return { places, beats, byScene, s, rowY, ax, bottom, safe: S, gap: STAGE_GAP, label: LABEL, font: design.font, mat: M.iso.materials(design) };
  }

  function defaultKind(it) {
    const b = it.built, v = b.values && b.values[0];
    if (it.type === 'big-number' && v && /%\s*$/.test(v.display)) return 'blocks';
    if (it.type === 'compare-bars' && b.series) return 'columns';
    if (it.type === 'ranked-list') return 'podium';
    if (it.type === 'share-split') return 'split';
    return null;
  }

  function newPlace(def, kind, pic, it, n, R) {
    if (def.prop && !def.standalone) throw new Error('scene "' + it.id + '" picture: "' + kind + '" is a prop — put it in another picture\'s "props"');
    const props = (pic.props || []).map(name => {
      const pd = PICS[name] || Object.values(PICS).find(d => d.prop && d.skins && d.skins.indexOf(name) >= 0);
      if (!pd || !pd.prop) throw new Error('scene "' + it.id + '" picture.props: "' + name + '" is not a prop');
      return { def: pd, pic: { kind: pd.kind, skin: pd.kind === name ? undefined : name }, fills: [], lifts: [], marks: [], flips: [] };
    });
    (def.needs || []).forEach(k => { if (!pic[k]) throw new Error('scene "' + it.id + '" picture: "' + kind + '" needs "' + k + '" (references/pictures.md)'); });
    if (def.skins && pic.skin && def.skins.indexOf(pic.skin) < 0) throw new Error('scene "' + it.id + '" picture.skin: "' + pic.skin + '" — use ' + def.skins.join(', '));
    const place = { id: 'place-' + n + '-' + it.id, kind, def, pic, scene: it.id, props, claims: [], fills: [], lifts: [], marks: [], enter: null, movers: null, flips: [], level: 0 };
    if (def.prepare) def.prepare(place, it, R);
    return place;
  }

  // What a beat does on its place, in content time (0 = the beat's words
  // start; negative = during the pan in). Counters and figures in the band
  // are retimed to move with the units.
  function act(bt, place, it, pic) {
    const b = it.built, type = it.type, def = place.def;
    const first = place.scene === it.id;
    const fig = b.fig;
    // Units start landing as the place slides in; the first beat has no pan.
    // A picture that draws a series (columns) builds once the camera is there.
    const pre = bt.index === 0 ? 0.2 : def.enterAt != null ? def.enterAt : -0.8;
    const enterDur = typeof def.enterDur === 'function' ? def.enterDur(place) : def.enterDur || 1.8;
    if (first && def.data) bt.acts.push({ type: 'enter', at: pre, dur: enterDur });
    if (b.series && !def.series && !def.parts) throw new Error('scene "' + it.id + '" picture: "' + place.kind + '" cannot show ' + type + ' — use ' + (type === 'share-split' ? '"split"' : '"columns", "funnel" or "podium"') + ' (references/pictures.md)');
    if (def.parts && first) {
      // Each part lights in turn, largest share of attention to the first.
      let t = pre + enterDur * 0.75, at = 0;
      b.values.forEach(r => {
        const n = Math.round(r.value), dur = def.fillDur(n);
        bt.acts.push({ type: 'fill', at: t, dur, from: at, to: at + n, unit: def.unitDur, ghost: false });
        at += n; t += dur + 0.3;
      });
      place.level = at;
    }
    if (first && pic.from) bt.acts.push({ type: 'movers', from: pic.from, at: 0, dur: 0.9 });
    if (first && def.flip && pic.due) bt.acts.push({ type: 'flip', at: 1.8, dur: 0.7 });

    if (type === 'big-number' && fig) {
      const v = b.values[0];
      if (def.shares && /%\s*$/.test(v.display)) {
        const to = place.unitsFor(v);
        const from = place.level;
        const at = first ? pre + enterDur * 0.75 : 0.3, dur = def.fillDur(Math.abs(to - from));
        bt.acts.push({ type: 'fill', at, dur, from, to, unit: def.unitDur, ghost: false });
        place.level = to;
        fig.at = at; fig.dur = dur; fig.countEase = 'linear';
      } else if (def.counts) {
        fig.at = Math.max(0.1, pre); fig.dur = enterDur + 0.2;   // the count rolls as the units arrive
      } else if (def.data) {
        throw new Error('scene "' + it.id + '" picture: "' + place.kind + '" shows a share in %, and "' + v.display + '" is not one (references/pictures.md)');
      }
    }
    if ((type === 'before-after' || type === 'compare-bars') && fig && def.shares) {
      const [r0, r1] = b.values;
      const u0 = place.unitsFor(r0), u1 = place.unitsFor(r1);
      const now = place.level;
      const keys = [];
      let t = first ? 0.5 : 0.3;
      if (now === u1 && u0 !== u1) {
        // The place already shows "now": go back to "then", and return.
        const d0 = 0.6;
        bt.acts.push({ type: 'fill', at: t, dur: d0, from: u1, to: u0, unit: Math.min(0.35, d0), ghost: false });
        keys.push({ at: t, dur: d0, value: r0.value, display: r0.display, label: r0.label });
        t += d0 + 1.0;
        bt.acts.push({ type: 'fill', at: t, dur: d0, from: u0, to: u1, unit: Math.min(0.35, d0), ghost: false });
        keys.push({ at: t, dur: d0, value: r1.value, display: r1.display, label: r1.label });
        fig.start = { value: r1.value, display: r1.display };
        t += d0;
      } else {
        // Fill to "then", mark it, then move to "now": a fall leaves a ghost of what was lost.
        const d0 = def.fillDur(Math.abs(u0 - now));
        bt.acts.push({ type: 'fill', at: t, dur: d0, from: now, to: u0, unit: def.unitDur, ghost: false });
        keys.push({ at: t, dur: d0, value: r0.value, display: r0.display, label: r0.label });
        t += d0 + 0.1;
        bt.acts.push({ type: 'mark', at: t, dur: 0.6, units: u0, label: r0.label + ': ' + r0.display });
        t += 0.9;
        const d1 = Math.max(0.6, Math.min(1.2, def.fillDur(Math.abs(u1 - u0)) * 2));
        bt.acts.push({ type: 'fill', at: t, dur: d1, from: u0, to: u1, unit: Math.min(0.35, d1), ghost: u1 < u0 });
        keys.push({ at: t, dur: d1, value: r1.value, display: r1.display, label: r1.label });
        t += d1;
      }
      place.level = u1;
      fig.keys = keys;
      fig.at = 0.1; fig.dur = t;
    }
  }

  // The place's shapes' box at scale 1 about its anchor (its centre on the ground).
  function placeGeo(p) {
    const pts = [];
    const add = (x, y, w, d, h) => {
      for (const [a, b] of [[x, y], [x + w, y], [x, y + d], [x + w, y + d]]) {
        pts.push([(a - b) * M.iso.COS, (a + b) * 0.5]);
        pts.push([(a - b) * M.iso.COS, (a + b) * 0.5 - h]);
      }
    };
    const f = p.def.footprint(p);
    p.half = { x: f.w / 2, y: f.d / 2 };
    // A picture laid out along the screen row (columns) gives its own box.
    if (p.def.geo) { const g = p.def.geo(p, 1); pts.push([g.x0, g.y0], [g.x1, g.y1]); }
    else add(-f.w / 2, -f.d / 2, f.w + (f.shadow || 0), f.d + (f.shadow || 0) * 0.4, f.h);
    // Props stand to its left on screen, side by side, a little back: they
    // widen the place, never make it taller. (Screen offset to world:
    // x - y = dx / cos30, x + y = 2 dy.)
    let edge = p.def.geo ? p.def.geo(p, 1).x0 : -(p.half.x + p.half.y) * M.iso.COS;
    p.props.forEach(pr => {
      const g = pr.def.footprint(pr), hw = (g.w + g.d) / 2 * M.iso.COS;
      const sx = edge - 36 - hw, sy = -24;
      pr.dx = (sx / M.iso.COS + 2 * sy) / 2;
      pr.dy = (2 * sy - sx / M.iso.COS) / 2;
      edge = sx - hw;
      add(pr.dx - g.w / 2, pr.dy - g.d / 2, g.w + (g.shadow || 0), g.d, g.h);
    });
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    pts.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
    return { x0, y0, x1, y1 };
  }
  // The place's box on screen at world scale s: its shapes, and its key at label size.
  // A picture with labels laid out among its shapes (columns) gives its box at s itself.
  function boxAt(p, s) {
    const g = p.geo, b = p.def.geo && !p.props.length ? p.def.geo(p, s) : { x0: g.x0 * s, y0: g.y0 * s, x1: g.x1 * s, y1: g.y1 * s };
    if (p.def.key) {
      const k = keySpot(p, p.keyW, s);
      b.x0 = Math.min(b.x0, k.x); b.x1 = Math.max(b.x1, k.x + k.w); b.y1 = Math.max(b.y1, k.y + LABEL * 1.3 * keyLines(p).length);
    }
    return b;
  }
  // A key's lines: { text, swatch } (swatch: a colour, or null for the unit itself).
  const keyLines = p => [].concat(p.def.key(p)).map(l => (typeof l === 'string' ? { text: l, swatch: null } : l));

  // Where a place's key goes, at scale s about its anchor: from the left
  // corner, under the front-left edge, in the empty ground below it.
  function keySpot(p, textW, s) {
    const hx = p.half.x, hy = p.half.y, C = M.iso.COS;
    const L = [-(hx + hy) * C * s, (hy - hx) * 0.5 * s], F = [(hx - hy) * C * s, (hx + hy) * 0.5 * s];
    const slope = (F[1] - L[1]) / (F[0] - L[0]);
    const w = textW + LABEL * 1.6;
    // Under the edge as far as the text reaches; never lower than just under the front corner.
    return { x: L[0], y: L[1] + slope * Math.min(w, F[0] - L[0]) + 12, w };
  }

  // Absolute times, once the timeline is known.
  function finish(W, scenes) {
    W.beats.forEach((bt, i) => {
      const sc = scenes[i];
      bt.t0 = sc.t0; bt.cStart = sc.cStart; bt.cEnd = sc.cEnd; bt.t1 = sc.t1; bt.ovIn = sc.ovIn; bt.exitStart = sc.exitStart;
      sc.place = bt.place ? bt.place.id : null;
      sc.stageTop = bt.stageTop;
      bt.acts.forEach(a => {
        const p = bt.place, T = sc.cStart + (a.at == null ? 0 : a.at);
        if (a.type === 'enter') p.enter = { t0: T, dur: a.dur };
        else if (a.type === 'fill') p.fills.push({ t0: T, dur: a.dur, from: a.from, to: a.to, unit: a.unit, ghost: a.ghost });
        else if (a.type === 'lift') p.lifts.push({ t0: T, dur: a.dur });
        else if (a.type === 'mark') p.marks.push({ t0: T, dur: a.dur, units: a.units, label: a.label });
        else if (a.type === 'flip') p.flips.push({ t0: T, dur: a.dur });
        else if (a.type === 'movers') {
          const from = W.byScene[a.from];
          if (!from) throw new Error('scene "' + bt.scene + '" picture.from: "' + a.from + '" has no place before it');
          // They lift just before the pan and ride it in.
          p.movers = { from, t0: sc.t0 - 0.25, dur: (sc.cStart - sc.t0) + 0.85 };
        }
      });
    });
    W.places.forEach(p => { p.fills.sort((a, b) => a.t0 - b.t0); });
  }

  // ── the camera ───────────────────────────────────────────────────────
  // Where the camera is at t, and how much each place is "the one in view"
  // (keys show on the place in view and fade as the camera leaves).
  function camera(W, t) {
    const B = W.beats;
    // The beat arriving: in the overlap between two beats, the later one,
    // whose pan is under way.
    let i = 0;
    for (let k = B.length - 1; k >= 0; k--) if (t >= B[k].t0) { i = k; break; }
    const b = B[i];
    // World labels (keys, marks) are read with their beat's words: when the
    // camera is about to move to another place they leave with the words,
    // and they come back once it has arrived.
    const moves = (x, y) => x && y && (x.place !== y.place || x.cam.x !== y.cam.x || x.cam.y !== y.cam.y);
    if (i > 0 && t < b.cStart && b.ovIn > 0) {
      const a = B[i - 1], g = M.ease.glide(clamp((t - b.t0) / b.ovIn));
      const view = {};
      if (a.place) view[a.place.id] = (view[a.place.id] || 0) + (1 - g);
      if (b.place) view[b.place.id] = (view[b.place.id] || 0) + g;
      return { x: lerp(a.cam.x, b.cam.x, g), y: lerp(a.cam.y, b.cam.y, g), alpha: lerp(a.cam.alpha, b.cam.alpha, g), view, labels: moves(a, b) ? 0 : 1, beat: b, g };
    }
    const view = {};
    if (b.place) view[b.place.id] = 1;
    const fadeIn = moves(B[i - 1], b) ? sstep(b.cStart, b.cStart + 0.4, t) : 1;
    const fadeOut = moves(b, B[i + 1]) ? 1 - sstep(b.exitStart, b.cEnd, t) : 1;
    return { x: b.cam.x, y: b.cam.y, alpha: b.cam.alpha, view, labels: fadeIn * fadeOut, beat: b, g: 1 };
  }

  // ── painting ─────────────────────────────────────────────────────────
  function paint(ctx, C, t, sceneId) {
    const W = C.world;
    const cam = camera(W, t);
    if (cam.alpha <= 0.001) return;
    const prevScene = M.debug.scene;
    M.debug.scene = sceneId;
    ctx.save();
    M.paint.clipRect(ctx, 0, 0, C.W, W.bottom + 6);
    ctx.globalAlpha *= cam.alpha;
    const camv = { ax: W.ax, ay: W.rowY, cx: cam.x, cy: cam.y, s: W.s, font: W.font };
    W.cam = cam;   // which place is in view: labels show on it and fade as the camera leaves
    W.places.forEach(p => {
      const sx = W.ax + p.sx - cam.x;
      if (sx + p.box.x1 < -40 || sx + p.box.x0 > C.W + 40) return;   // off the frame
      const V = M.iso.view(ctx, camv, p.id);
      p.props.forEach(pr => pr.def.draw(V, Object.assign({}, pr, { x: p.x + pr.dx, y: p.y + pr.dy }), t, W));
      p.def.draw(V, p, t, W);
      label(ctx, V, p, t, W, cam);
    });
    W.places.forEach(p => { if (p.movers) (p.def.drawMovers || movers)(M.iso.view(ctx, camv, p.id + ':movers'), p, t, W); });
    ctx.restore();
    M.debug.scene = prevScene;
  }

  // The key under a place, while it carries data and is the place in view.
  function label(ctx, V, p, t, W, cam) {
    if (!p.def.key || !p.enter) return;
    const shown = sstep(p.enter.t0 + p.enter.dur * 0.6, p.enter.t0 + p.enter.dur * 0.6 + 0.5, t) * (cam.view[p.id] || 0) * cam.labels;
    if (shown <= 0.001) return;
    const k = LABEL;
    const lines = keyLines(p);
    const f = M.text.font(600, k, W.font);
    const widths = lines.map(l => M.text.measure(V.ctx, l.text, f));
    const [ax, ay] = V.P(p.x, p.y, 0);
    const spot = keySpot(p, Math.max(...widths), V.s);
    const x = ax + spot.x;
    V.ctx.save(); V.ctx.globalAlpha *= shown;
    lines.forEach((l, n) => {
      const y = ay + spot.y + n * k * 1.3;
      if (l.swatch) M.paint.rect(V.ctx, x + k * 0.25, y + k * 0.25, k * 0.7, k * 0.7, l.swatch);
      else if (p.def.keyIcon) p.def.keyIcon(V, x + k * 0.55, y + k * 0.6, p, W);
      M.paint.text(V.ctx, l.text, x + k * 1.6, y, { font: f, color: W.mat.ink, h: k * 1.2, w: widths[n], alpha: 1, layer: 'world-label:' + p.id + ':' + n, role: 'label', size: k });
    });
    V.ctx.restore();
  }

  // Carry-over: a few units lift off the earlier place and travel on the
  // camera's own easing, so on screen they drift steadily to the new one,
  // where they settle and fade into it. They stand for the link the story
  // makes (answers to a desk, visits to applications), never for a count.
  const MOVERS = 12;
  function movers(V, p, t, W) {
    const mv = p.movers, from = mv.from;
    if (!from.def.unitPos) return;
    const n = from.dots || 100, F = Math.max(0.6, mv.dur - (MOVERS - 1) * 0.07), ctx = V.ctx, a0 = ctx.globalAlpha;
    const to = p.def.landing ? p.def.landing(p) : { x: p.x, y: p.y, z: 40 };
    for (let k = 0; k < MOVERS; k++) {
      const q = clamp((t - mv.t0 - k * 0.07) / F);
      if (q <= 0 || q >= 1) continue;
      const fr = from.def.unitPos(from, Math.floor((k + 0.5) / MOVERS * n * 0.9));
      const e = M.ease.glide(clamp((q - 0.12) / 0.8)), land = sstep(0.75, 1, q);
      const z = lerp(10, to.z, land) + sstep(0, 0.2, q) * (1 - land) * 120;
      ctx.globalAlpha = a0 * Math.min(1, q * 6) * (1 - sstep(0.85, 1, q));
      V.token(lerp(fr.x, to.x + (k % 4 - 1.5) * 16, e), lerp(fr.y, to.y + (Math.floor(k / 4) - 1) * 16, e), z, 7, 9, W.mat.N2.top, W.mat.N2.right);
    }
    ctx.globalAlpha = a0;
  }

  // A small picture of a scene's place, for the summary's points.
  function drawIcon(ctx, C, sceneId, x, y, alpha) {
    const W = C.world, p = W && W.byScene[sceneId];
    if (!p || !p.def.icon || alpha <= 0.001) return;
    ctx.save(); ctx.globalAlpha *= alpha;
    const V = M.iso.view(ctx, { ax: x, ay: y, cx: 0, cy: 0, s: 1, font: W.font }, 'icon:' + sceneId);
    p.def.icon(V, p, W);
    ctx.restore();
  }

  // ── state helpers the pictures read ──────────────────────────────────
  // How lit unit k is at t (0..1): each fill moves the units between its
  // from and to, one after another; a fall ends at a ghost when asked to.
  function litAt(p, k, t) {
    let lit = 0;
    for (const g of p.fills) {
      if (t < g.t0) break;
      const lo = Math.min(g.from, g.to), hi = Math.max(g.from, g.to);
      if (k < lo || k >= hi) continue;
      const n = hi - lo, up = g.to > g.from;
      const idx = up ? k - lo : hi - 1 - k;
      const st = g.t0 + (n > 1 ? idx / (n - 1) : 0) * Math.max(0, g.dur - g.unit);
      const q = sstep(st, st + g.unit, t);
      lit += ((up ? 1 : g.ghost ? GHOST : 0) - lit) * q;
    }
    return lit;
  }
  // How far unit k has arrived (0..1), the units landing in a diagonal sweep.
  function arrivedAt(p, i, j, n, t, each) {
    if (!p.enter) return 1;
    const t0 = p.enter.t0 + (i + j) / (2 * Math.max(1, n - 1)) * Math.max(0, p.enter.dur - each);
    return clamp((t - t0) / each);
  }
  const liftAt = (p, t, h) => p.lifts.reduce((m, l) => Math.max(m, h * M.ease.outQuint(clamp((t - l.t0) / l.dur))), 0);

  M.world = { plan, band, finish, paint, camera, drawIcon, litAt, arrivedAt, liftAt, sstep, clamp, lerp, GHOST, BANDS, LABEL };
  if (typeof module !== 'undefined' && module.exports) module.exports = M.world;
})(typeof window !== 'undefined' ? window : globalThis);
