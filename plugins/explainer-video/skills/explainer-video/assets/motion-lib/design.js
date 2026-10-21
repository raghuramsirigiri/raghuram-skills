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

    return {
      preset,
      dark: luminance(bg) < 0.2,
      bg, ink, hair: t.grid, muted: t.secondaryColor, context: t.muted,
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
  // An evidence scene is a social card that moves. Top to bottom: accent bar
  // (the through-line), kicker (muted), headline stating the finding with its
  // number (700, ink, balanced), units line (muted), the chart in the
  // remaining height, and a source line under a hairline with the source
  // name in semibold ink. Scenes drop the parts they don't need; they never
  // add new kinds of component.
  //
  //   card(api, { kicker, headline, units, chart: true, display: false, valign })
  //   -> { layers, chart: {x,y,w,h} | null, rule, words, primaryWords }
  function card(api, o) {
    const d = api.design, F = api.frame, T = api.T, TY = M.layout.TYPE, K = M.layout.K;
    const ctx = api.ctx;
    const S = F.safe;
    const wide = F.cls === 'wide';
    const split = wide && o.chart && o.split !== false;
    // Text column: the full safe width, or the left 40% beside a chart in 16:9.
    const colW = split ? Math.round(S.w * 0.4) : wide ? Math.min(S.w, 1240) : S.w;
    const layers = [];
    const R = M.layout.RULE;
    let y = S.y;
    const rule = { x: S.x, y, w: R.accentW, h: R.accentH };
    y += R.accentH + 8 * K;

    const at = o.at || 0;
    const sourceLine = o.source !== false ? sourceText(api, o.sourceIds) : null;
    const srcH = sourceLine ? TY.source.lh + TY.source.pad + TY.source.gap : 0;
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
      if (o.display) {
        const room = (o.chart ? (bottom - y) * 0.5 : bottom - y);
        const fit = T.fit(ctx, o.headline, { weight: d.weights.title, family: d.font, maxW: colW, maxH: room, min: TY.display.min, max: TY.display.max, lh: 1.12, maxLines: 4 });
        size = fit.size; lh = fit.lh;
      }
      blocks.push({ id: 'headline', role: 'headline', str: o.headline, size, lh, gap: TY.headline.gap, w: d.weights.title, color: d.ink, at: at + 0.15, dur: 0.7, reveal: o.headlineReveal, primary: true });
    }
    if (o.units) blocks.push({ id: 'units', role: 'units', str: o.units, size: TY.units.size, lh: TY.units.lh, gap: TY.units.gap, w: 400, color: d.muted, at: at + 0.45, dur: 0.5 });

    // Measure the stack to centre it when there's no chart.
    const heights = blocks.map(b => T.balance(ctx, b.str, T.font(b.w, b.size, d.font), colW).length * b.lh);
    const stackH = heights.reduce((s, h, i) => s + h + (i < blocks.length - 1 ? blocks[i].gap : 0), 0);
    if (!o.chart && o.valign !== 'top') {
      const free = bottom - y - stackH - (o.reserve || 0);
      if (free > 0) {
        const shift = free * (o.valign === 'lower' ? 0.62 : 0.42);
        y += shift; rule.y += shift;
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
        chart = { x: S.x + colW + 30 * K, y: S.y, w: S.w - colW - 30 * K, h: bottom - S.y - 6 * K };
      } else {
        chart = { x: S.x, y, w: S.w, h: Math.max(0, bottom - y - 6 * K) };
      }
    }
    const textBottom = y;
    if (sourceLine) {
      const sy = S.y + S.h - TY.source.lh;
      layers.push({ kind: 'hair', id: 'source-rule', x: S.x, y: sy - TY.source.pad, w: S.w, color: d.hair, at: at + 0.7, dur: 0.6, ease: 'glide' });
      let x = S.x;
      sourceLine.forEach((run, i) => {
        const f = T.font(run.strong ? 600 : 400, TY.source.size, d.font);
        const w = T.measure(ctx, run.text, f);
        layers.push({
          kind: 'text', id: 'source-' + i, role: 'source', font: f, size: TY.source.size,
          color: run.strong ? d.ink : d.muted, reveal: 'fade', at: at + 0.8, dur: 0.5,
          lines: [{ text: run.text, x, y: sy, w, h: TY.source.lh, words: [{ text: run.text, x, w }] }]
        });
        x += w;
      });
    }
    return { layers, chart, rule, words, primaryWords, textBottom, colW, bottom };
  }

  // WCAG "large text", judged at the size a phone shows the frame (frame px / 2.5):
  // 24px, or 18.66px bold.
  function isLarge(size, weight) {
    const css = size / M.layout.K;
    return css >= 24 || (css >= 18.66 && (weight || 400) >= 700);
  }

  // "Source: NAME · 14 Oct 2026" as runs, from the claims the scene shows.
  function sourceText(api, ids) {
    const used = ids || api.sourceIds || [];
    const R = api.R;
    const srcs = [];
    let illustrative = false;
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

  M.design = { resolve, contrast, luminance, mix };
  M.card = card;
  M.design.isLarge = isLarge;
  M.formatDate = formatDate;
  M.sourceText = sourceText;
  if (typeof module !== 'undefined' && module.exports) module.exports = M.design;
})(typeof window !== 'undefined' ? window : globalThis);
