/*!
 * motion-lib/design.js — charts-lib's design system, mapped onto the canvas.
 *
 * The engine defines no colour or size of its own. It reads Charts.palette,
 * Charts.metrics and Charts.theme from the theme.js loaded before it, applies
 * the spec's preset and any brand palette once, and hands scenes a flat token
 * object in frame pixels (card px x 2.5).
 *
 * Emphasis is two colours: the subject takes Charts.theme.colors[1] (the
 * palette accent, not `highlight`) and context takes `muted`.
 */
(function (root) {
  'use strict';
  const M = root.Motion = root.Motion || {};

  // ── WCAG contrast ────────────────────────────────────────────────────
  function rgb(hex) {
    let h = String(hex).trim().replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function luminance(hex) {
    const [r, g, b] = rgb(hex).map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function contrast(a, b) {
    const la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  function mix(a, b, t) {
    const x = rgb(a), y = rgb(b);
    return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }

  // ── resolve ──────────────────────────────────────────────────────────
  function resolve(meta) {
    const C = root.Charts;
    if (!C || !C.theme) throw new Error('charts-lib/theme.js must load before motion-lib');
    const preset = (meta && meta.preset) || 'default';
    if (!C.presets[preset]) throw new Error('unknown preset "' + preset + '" — use one of ' + Object.keys(C.presets).join(', '));
    C.applyPreset(preset);
    if (meta && meta.palette) C.applyPalette(meta.palette);
    const t = C.theme, m = C.metrics, K = M.layout.K;
    const ink = t.titleColor, bg = t.bg;

    // A brand accent that fails as text against the card is kept for marks only.
    const accent = t.colors[1];
    const accentText = contrast(accent, bg) >= 4.5 ? accent : ink;
    // Small muted text (kicker, units, source) must clear 4.5:1. A brand
    // palette can leave n4 short of it, so step down the ink ramp until it does.
    const p = C.palette;
    const muted = [t.secondaryColor, p.n5, p.n6, p.n7, ink].find(c => c && contrast(c, bg) >= 4.5) || ink;

    return {
      preset,
      dark: luminance(bg) < 0.2,
      bg, ink, hair: t.grid, muted, context: t.muted,
      contextScale: t.mutedScale.slice(),
      subject: accent, accentText, callout: t.callout,
      axis: t.axis, grid: t.grid, tick: t.tickColor, label: t.categoryColor, value: t.valueColor,
      series: t.colors.slice(), inverse: t.inverseText,
      font: m.font,
      weights: { title: m.titleWeight, value: m.valueWeight, category: m.categoryWeight, tick: m.tickWeight, legend: m.legendWeight },
      // Chart geometry at frame scale, ported from the engines.
      stroke: {
        line: m.lineWidth * K, axis: m.axisWidth * K, grid: m.gridWidth * K,
        tickLen: m.tickLength * K, tick: m.tickWidth * K, connector: m.connectorWidth * K
      },
      size: {
        label: m.labelSize * K, tick: m.tickSize * K, value: m.valueSize * K * 1.0,
        legend: m.legendSize * K, callout: m.calloutSize * K
      },
      contrast
    };
  }

  // ── card anatomy ─────────────────────────────────────────────────────
  // An evidence scene is a social card that moves. Top to bottom: room for
  // the progress bar (the through-line), kicker (muted), headline stating the
  // finding with its number (700, ink, balanced), units line (muted), the
  // chart in the remaining height, and a source line under a hairline with
  // the source name in semibold ink. Scenes drop the parts they don't need;
  // they never add new kinds of component.
  //
  // The frame's profile (layout.js) composes it for its shape: in a wide
  // frame the words sit in a left column, centred on its height, with the
  // chart beside them at full height; in a tall frame the type is a step
  // larger. A headline grows into the room it has: `display` (the hook) up to
  // the display size, `grow` (a title on its own) to about twice the card
  // size, and a headline beside a chart to one and a half times.
  //
  //   card(api, { kicker, headline, units, chart: true, display, grow, valign, split })
  //   -> { layers, chart: {x,y,w,h} | null, rule, words, primaryWords, textBottom, colW, bottom, TY }
  function card(api, o) {
    const d = api.design, F = api.frame, T = api.T, TY = M.layout.typeFor(F), K = M.layout.K;
    const ctx = api.ctx;
    const S = F.safe;
    const P = F.profile;
    const wide = F.cls === 'wide';
    const split = P.split && o.chart && o.split !== false;
    // Text column: the left share beside a chart, else the full safe width
    // (a wide frame keeps a line short enough to read).
    const colW = split ? Math.round(S.w * P.col) : wide ? Math.round(S.w * 0.8) : S.w;
    const layers = [];
    const R = M.layout.RULE;
    // The progress bar sits along the top of the safe area (core.js); every
    // card leaves room for it, whatever its own vertical alignment.
    let y = S.y;
    const rule = true;
    y += R.accentH + 8 * K;
    const top = y;

    const at = o.at || 0;
    const sourceLine = o.source !== false ? sourceText(api, o.sourceIds, o.sources) : null;
    const srcRows = sourceLine ? flowRuns(api, sourceLine, S.w) : [];
    const srcH = srcRows.length ? srcRows.length * TY.source.lh + TY.source.pad + TY.source.gap : 0;
    const bottom = S.y + S.h - srcH;
    let words = 0, primaryWords = 0;

    function textLayer(id, role, str, size, lh, weight, color, top, extra) {
      const f = T.font(weight, size, d.font);
      const lines = T.balance(ctx, str, f, colW);
      const placed = T.place(ctx, lines, f, S.x, top, lh, o.align || 'left', colW);
      let wi = 0;
      const wordIndex = placed.map(l => { const s = wi; wi += l.words.length; return s; });
      layers.push(Object.assign({ kind: 'text', id, role, font: f, size, color, lines: placed, wordIndex, wordTotal: wi, large: isLarge(size, weight) }, extra));
      return placed.length * lh;
    }

    const blocks = [];
    if (o.kicker) blocks.push({ id: 'kicker', role: 'kicker', str: o.kicker, size: TY.kicker.size, lh: TY.kicker.lh, gap: TY.kicker.gap, w: 400, color: d.muted, at: at, dur: 0.5 });
    if (o.headline) {
      let size = TY.headline.size, lh = TY.headline.lh;
      const grow = o.display ? { min: TY.display.min, max: TY.display.max, share: o.chart && !split ? 0.5 : 1, lines: 4, lh: 1.12 }
        : o.grow && !o.chart ? { min: size, max: Math.max(TY.display.min * 1.1, TY.display.max * 0.6), share: 0.75, lines: 4, lh: 1.15 }
        : split ? { min: size, max: size * 1.5, share: 0.5, lines: 5, lh: 1.2 }
        : null;
      if (grow) {
        // The headline's room is what the kicker and units leave.
        const others = (o.kicker ? TY.kicker.lh + TY.kicker.gap : 0) +
          (o.units ? TY.headline.gap + T.balance(ctx, o.units, T.font(400, TY.units.size, d.font), colW).length * TY.units.lh : 0);
        const fit = T.fit(ctx, o.headline, { weight: d.weights.title, family: d.font, maxW: colW, maxH: (bottom - y - others) * grow.share, min: grow.min, max: grow.max, lh: grow.lh, maxLines: grow.lines });
        size = fit.size; lh = fit.lh;
      }
      blocks.push({ id: 'headline', role: 'headline', str: o.headline, size, lh, gap: TY.headline.gap, w: d.weights.title, color: d.ink, at: at + 0.15, dur: 0.7, reveal: o.headlineReveal, primary: true });
    }
    if (o.units) blocks.push({ id: 'units', role: 'units', str: o.units, size: TY.units.size, lh: TY.units.lh, gap: TY.units.gap, w: 400, color: d.muted, at: at + 0.45, dur: 0.5 });

    // Measure the stack to centre it when there's no chart, or in its column beside one.
    const heights = blocks.map(b => T.balance(ctx, b.str, T.font(b.w, b.size, d.font), colW).length * b.lh);
    const stackH = heights.reduce((s, h, i) => s + h + (i < blocks.length - 1 ? blocks[i].gap : 0), 0);
    if ((!o.chart || split) && o.valign !== 'top') {
      const free = bottom - y - stackH - (o.reserve || 0);
      if (free > 0) {
        const shift = free * (o.valign === 'lower' ? 0.62 : 0.42);
        y += shift;
      }
    }
    blocks.forEach((b, i) => {
      const h = textLayer(b.id, b.role, b.str, b.size, b.lh, b.w, b.color, y, { at: b.at, dur: b.dur, reveal: b.reveal });
      const n = T.wordCount(b.str);
      words += n;
      if (b.primary) primaryWords += n;
      y += h + (i < blocks.length - 1 ? b.gap : TY.units.gap);
    });

    let chart = null;
    if (o.chart) {
      if (split) {
        chart = { x: S.x + colW + 30 * K, y: top, w: S.w - colW - 30 * K, h: bottom - top - 6 * K };
      } else {
        chart = { x: S.x, y, w: S.w, h: Math.max(0, bottom - y - 6 * K) };
      }
    }
    const textBottom = y;
    if (srcRows.length) {
      const sy0 = S.y + S.h - srcRows.length * TY.source.lh;
      layers.push({ kind: 'hair', id: 'source-rule', x: S.x, y: sy0 - TY.source.pad, w: S.w, color: d.hair, at: at + 0.7, dur: 0.6, ease: 'glide' });
      let k = 0;
      srcRows.forEach((row, ri) => {
        row.forEach(run => {
          layers.push({
            kind: 'text', id: 'source-' + (k++), role: 'source', font: run.f, size: TY.source.size,
            color: run.strong ? d.ink : d.muted, reveal: 'fade', at: at + 0.8, dur: 0.5,
            lines: [{ text: run.text, x: S.x + run.x, y: sy0 + ri * TY.source.lh, w: run.w, h: TY.source.lh, words: [{ text: run.text, x: S.x + run.x, w: run.w }] }]
          });
        });
      });
    }
    return { layers, chart, rule, words, primaryWords, textBottom, colW, bottom, TY, split };
  }

  // Lay source runs into rows no wider than maxW, splitting a run at spaces
  // when it doesn't fit. Returns [[{ text, strong, f, x, w }]].
  function flowRuns(api, runs, maxW) {
    const T = api.T, d = api.design, TY = M.layout.TYPE;
    const rows = [[]];
    let x = 0;
    const put = (text, strong) => {
      const f = T.font(strong ? 600 : 400, TY.source.size, d.font);
      const w = T.measure(api.ctx, text, f);
      if (x + w > maxW && x > 0) {
        // Try to break this run at its last space that fits.
        const words = text.split(' ');
        let head = '';
        for (let i = 0; i < words.length; i++) {
          const next = head ? head + ' ' + words[i] : words[i];
          if (x + T.measure(api.ctx, next, f) > maxW) break;
          head = next;
        }
        if (head && head.trim()) { put(head, strong); text = text.slice(head.length).replace(/^ /, ''); }
        rows.push([]); x = 0;
        if (!text) return;
        return put(text.replace(/^[ ·;]+/, ''), strong);
      }
      rows[rows.length - 1].push({ text, strong, f, x, w });
      x += w;
    };
    runs.forEach(r => put(r.text, r.strong));
    return rows.filter(r => r.length);
  }

  // WCAG "large text", judged at the size a phone shows the frame (frame px / 2.5):
  // 24px, or 18.66px bold.
  function isLarge(size, weight) {
    const css = size / M.layout.K;
    return css >= 24 || (css >= 18.66 && (weight || 400) >= 700);
  }

  // "Source: NAME · 14 Oct 2026" as runs, from the claims the scene shows.
  function sourceText(api, ids, extra) {
    const used = ids || [];
    const R = api.R;
    const srcs = [];
    let illustrative = false;
    (extra || []).forEach(sid => { if (R.sources[sid] && srcs.indexOf(R.sources[sid]) < 0) srcs.push(R.sources[sid]); });
    used.forEach(cid => {
      const c = R.claims[cid];
      if (!c) return;
      if (c.kind === 'illustrative') illustrative = true;
      if (c.source && R.sources[c.source] && srcs.indexOf(R.sources[c.source]) < 0) srcs.push(R.sources[c.source]);
    });
    if (!srcs.length && !illustrative) return null;
    const runs = [{ text: srcs.length ? 'Source: ' : '' }];
    srcs.forEach((s, i) => {
      runs.push({ text: s.name, strong: true });
      const date = formatDate(s.date, api.spec.meta.locale);
      runs.push({ text: (date ? ' · ' + date : '') + (i < srcs.length - 1 ? '; ' : '') });
    });
    if (illustrative) runs.push({ text: (srcs.length ? ' · ' : '') + 'Illustrative figures' });
    return runs.filter(r => r.text);
  }

  function formatDate(iso, locale) {
    if (!iso) return '';
    const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(String(iso));
    if (!m) return String(iso);
    try {
      const dt = new Date(Date.UTC(+m[1], m[2] ? +m[2] - 1 : 0, m[3] ? +m[3] : 1));
      const opt = m[3] ? { day: 'numeric', month: 'short', year: 'numeric' } : m[2] ? { month: 'short', year: 'numeric' } : { year: 'numeric' };
      opt.timeZone = 'UTC';
      return new Intl.DateTimeFormat(locale || 'en-GB', opt).format(dt);
    } catch (e) { return String(iso); }
  }

  // ── chart kit: shared by the chart scenes ────────────────────────────
  function niceStep(span, n) {
    const raw = span / Math.max(1, n);
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  }
  function niceTicks(min, max, n) {
    if (min === max) { max = min + 1; }
    const step = niceStep(max - min, n || 4);
    const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
    const out = [];
    for (let v = lo; v <= hi + step * 1e-6; v += step) out.push(Math.round(v / step) * step);
    return out;
  }
  function tickLabel(v, locale, unit) {
    const big = Math.abs(v) >= 10000;
    const s = M.text.formatNumber(v, locale, big ? { notation: 'compact', maximumFractionDigits: 1 } : { maximumFractionDigits: 2 });
    return unit === '%' ? s + '%' : s;
  }

  // Horizontal bars from a zero baseline (charts-lib's barList): a category
  // label above each bar and its value at the bar's end. rows: [{ label, display, value, emph, forecast }]
  function hbars(api, box, rows, o) {
    o = o || {};
    const d = api.design, T = api.T, ctx = api.ctx, K = M.layout.K;
    if (rows.some(r => !(r.value >= 0))) throw new Error('bars need values of zero or more');
    const n = rows.length;
    // Chart text takes the frame's type step, like the card's words.
    const tf = api.frame.profile ? api.frame.profile.type : 1;
    const labSize = d.size.label * tf, valSize = d.size.value * tf;
    const labF = T.font(d.weights.category, labSize, d.font);
    const valF = T.font(d.weights.value, valSize, d.font);
    const rankF = T.font(d.weights.value, labSize, d.font);
    // charts-lib's barList geometry at 2.5x: label above its bar, barHeight 26,
    // rowGap 22, the label->bar gap tighter than the row->row gap. With room
    // to spare (a tall frame, or the chart column of a wide one) bars and gaps
    // grow up to 1.8x, so the list holds its box instead of sitting at the top.
    const labLh = labSize * 1.3;
    const want = labLh + 2 * K + 26 * K + 22 * K;
    const k = Math.min(1.8, box.h / (n * want));
    const barH = Math.max(10 * K, 26 * K * k);
    const rowH = labLh + 2 * K + barH + 22 * K * k;
    const valW = Math.max(...rows.map(r => T.measure(ctx, r.display, valF))) + 6 * K;
    const rankW = o.rank ? T.measure(ctx, String(n), rankF) + 8 * K : 0;
    const maxW = box.w - valW - rankW;
    const max = Math.max(...rows.map(r => r.value)) || 1;
    const anyEmph = rows.some(r => r.emph);
    const used = n * rowH;
    const y0 = box.y + Math.max(0, (box.h - used) * (o.valign === 'top' ? 0 : 0.3));
    // The plot is data area across its full width: art keeps clear of it.
    if (api.reserved) api.reserved.push({ x: box.x, y: y0, w: box.w, h: used });
    const layers = [];
    const at0 = o.at || 0.6;
    const stag = o.stagger || 0.1;
    rows.forEach((r, i) => {
      const top = y0 + i * rowH;
      const x = box.x + rankW;
      const at = at0 + i * stag;
      const color = r.emph ? d.subject : anyEmph ? d.context : d.series[0];
      if (o.rank) {
        layers.push({ kind: 'text', id: 'rank-' + i, role: 'label', font: rankF, size: labSize, color: d.muted, reveal: 'fade',
          lines: T.place(ctx, [String(i + 1)], rankF, box.x, top + labLh, barH, 'left', rankW), at, dur: 0.4 });
      }
      layers.push({ kind: 'text', id: 'label-' + i, role: 'label', font: labF, size: labSize, color: d.label, reveal: 'fade',
        lines: T.place(ctx, [r.label], labF, x, top, labLh, 'left', maxW), at, dur: 0.4 });
      const w = Math.max(1.5 * K, r.value / max * maxW);
      layers.push({ kind: 'rect', id: 'bar-' + i, x, y: top + labLh + 2 * K, w, h: barH, color, grow: 'x', at: at + 0.05, dur: 0.9, ease: 'expoOut', hatch: !!r.forecast });
      layers.push({ kind: 'text', id: 'value-' + i, role: 'value', font: valF, size: valSize, color: d.value, reveal: 'fade',
        lines: T.place(ctx, [r.display], valF, x + w + 3 * K, top + labLh + 2 * K, barH, 'left', valW), at: at + 0.55, dur: 0.4 });
    });
    return layers;
  }

  // Rows from spec entries [{ label, value: "F2", emph, forecast }]: each value is a claim.
  function rows(api, list, where) {
    if (!Array.isArray(list) || !list.length) throw new Error(where + ' needs a non-empty list');
    return list.map((r, i) => {
      const id = String(r.value || '').replace(/[{}]/g, '');
      const c = api.claim(id);
      return {
        label: api.R.fill(r.label, where + '[' + i + '].label'),
        display: c.display != null ? c.display : String(c.value),
        value: +c.value, emph: !!r.emph, forecast: !!(r.forecast || c.forecast), claim: c
      };
    });
  }

  M.chart = { niceTicks, tickLabel, hbars, rows };
  M.design = { resolve, contrast, luminance, mix };
  M.card = card;
  M.design.isLarge = isLarge;
  M.formatDate = formatDate;
  M.sourceText = sourceText;
  if (typeof module !== 'undefined' && module.exports) module.exports = M.design;
})(typeof window !== 'undefined' ? window : globalThis);
