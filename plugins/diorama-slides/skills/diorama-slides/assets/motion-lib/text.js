/*!
 * motion-lib/text.js — measure, wrap, balance and fit text against the real
 * font, plus tabular digits for counters.
 *
 * Canvas has no font-variant-numeric, so a counter lays its digits in fixed
 * cells the width of the widest digit; separators get their own width. Without
 * this a rolling number jitters sideways as its digits change.
 *
 * Layout caches are keyed only by pure inputs (font string + text), so they
 * never carry state from one frame to the next.
 */
(function (root) {
  'use strict';
  const cache = new Map();

  function font(weight, size, family) {
    return (weight || 400) + ' ' + Math.round(size * 100) / 100 + 'px ' + family;
  }

  function measure(ctx, text, f) {
    const key = f + '\u0000' + text;
    let w = cache.get(key);
    if (w == null) {
      // Leave the context as found: a cache hit and a miss must look the same to the caller.
      const prev = ctx.font;
      ctx.font = f;
      w = ctx.measureText(text).width;
      ctx.font = prev;
      if (cache.size > 20000) cache.clear();
      cache.set(key, w);
    }
    return w;
  }

  const splitWords = s => String(s).trim().split(/\s+/).filter(Boolean);
  const wordCount = s => (s ? splitWords(s).length : 0);

  function wrap(ctx, text, f, maxW) {
    const words = splitWords(text);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? cur + ' ' + w : w;
      if (!cur || measure(ctx, next, f) <= maxW) cur = next;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  // Balanced wrap: the narrowest width that keeps the same number of lines,
  // and no single orphan word on the last line when it can be avoided.
  function balance(ctx, text, f, maxW) {
    const base = wrap(ctx, text, f, maxW);
    if (base.length < 2) return base;
    let lo = maxW * 0.4, hi = maxW;
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      if (wrap(ctx, text, f, mid).length <= base.length) hi = mid; else lo = mid;
    }
    const out = wrap(ctx, text, f, hi);
    return out.length <= base.length ? out : base;
  }

  // Largest size in [min, max] at which the balanced text fits the box.
  function fit(ctx, text, o) {
    const lhR = o.lh || 1.2;
    const ok = size => {
      const f = font(o.weight, size, o.family);
      const lines = balance(ctx, text, f, o.maxW);
      const wide = Math.max(...lines.map(l => measure(ctx, l, f)));
      const fits = wide <= o.maxW + 0.5 && lines.length * size * lhR <= o.maxH + 0.5 &&
        (!o.maxLines || lines.length <= o.maxLines);
      return fits ? { size, lines, font: f, lh: size * lhR } : null;
    };
    let best = ok(o.min);
    if (!best) {
      const f = font(o.weight, o.min, o.family);
      return { size: o.min, lines: balance(ctx, text, f, o.maxW), font: f, lh: o.min * lhR, overflow: true };
    }
    let lo = o.min, hi = o.max;
    for (let i = 0; i < 16 && hi - lo > 0.5; i++) {
      const mid = (lo + hi) / 2, r = ok(mid);
      if (r) { best = r; lo = mid; } else hi = mid;
    }
    const top = ok(o.max);
    return top || best;
  }

  // Position lines: returns [{ text, x, y, w, h, words:[{ text, x, w }] }].
  // y is the line box top; draw with textBaseline 'middle' at y + h/2.
  function place(ctx, lines, f, x, y, lh, align, boxW) {
    const space = measure(ctx, ' ', f);
    return lines.map((t, i) => {
      const w = measure(ctx, t, f);
      const lx = align === 'center' ? x + (boxW - w) / 2 : align === 'right' ? x + boxW - w : x;
      let wx = lx;
      const words = splitWords(t).map(word => {
        const ww = measure(ctx, word, f);
        const r = { text: word, x: wx, w: ww };
        wx += ww + space;
        return r;
      });
      return { text: t, x: lx, y: y + i * lh, w, h: lh, words };
    });
  }

  // Tabular layout of a number string: digits in cells of the widest digit.
  function tabular(ctx, str, f) {
    let cell = 0;
    for (let d = 0; d <= 9; d++) cell = Math.max(cell, measure(ctx, String(d), f));
    const parts = [];
    let w = 0;
    for (const ch of String(str)) {
      const cw = /\d/.test(ch) ? cell : measure(ctx, ch, f);
      parts.push({ ch, x: w, w: cw });
      w += cw;
    }
    return { parts, w, cell };
  }

  // Split a display string into prefix, number and suffix: "$2.4m" -> $, 2.4, m.
  function parseDisplay(s) {
    const m = /^(.*?)(-?\d[\d,.]*\d|-?\d)(.*)$/.exec(String(s));
    if (!m) return null;
    const raw = m[2];
    // A comma or point followed by exactly three digits groups thousands;
    // anything else after the last point is the decimal part.
    const grouped = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(raw);
    const groupSep = grouped ? ',' : null;
    const plain = grouped ? raw.replace(/,/g, '') : raw.replace(/,(?=\d{1,2}$)/, '.');
    const decSep = /[.,]\d+$/.test(raw) && !(/,\d{3}$/.test(raw) && grouped) ? raw.match(/[.,](?=\d+$)/)[0] : null;
    const decimals = decSep ? raw.split(decSep).pop().length : 0;
    return { prefix: m[1], suffix: m[3], value: parseFloat(plain), decimals, groupSep, decSep };
  }

  // Format v the way the display string formats its number.
  function formatLike(p, v) {
    const neg = v < 0;
    const fixed = Math.abs(v).toFixed(p.decimals);
    let [int, dec] = fixed.split('.');
    if (p.groupSep) int = int.replace(/\B(?=(\d{3})+(?!\d))/g, p.groupSep);
    return p.prefix + (neg ? '-' : '') + int + (dec ? (p.decSep || '.') + dec : '') + p.suffix;
  }

  function formatNumber(v, locale, opts) {
    try { return new Intl.NumberFormat(locale || 'en-GB', opts).format(v); } catch (e) { return String(v); }
  }

  const api = { font, measure, wrap, balance, fit, place, tabular, parseDisplay, formatLike, formatNumber, wordCount, splitWords };
  const M = root.Motion = root.Motion || {};
  M.text = api;
  M.fonts = {
    // The player and the export wait for this: metrics must be the real font's.
    ready: async function (spec) {
      if (typeof document === 'undefined' || !document.fonts) return;
      const list = (spec && spec.meta && spec.meta.fonts) || [];
      for (const f of list) {
        try {
          const face = new FontFace(f.family, 'url(' + f.src + ')', { weight: f.weight || '400' });
          document.fonts.add(await face.load());
        } catch (e) { console.warn('[motion] font failed to load:', f.family); }
      }
      await document.fonts.ready;
      cache.clear();
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
