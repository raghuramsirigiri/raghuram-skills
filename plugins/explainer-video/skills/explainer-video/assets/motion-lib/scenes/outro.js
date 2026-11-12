/*!
 * scenes/outro.js — the user's own name, logo and call to action, after the
 * source card. Only text the user gave: never an invented handle, link or
 * slogan. The logo comes from meta.brand.logo (a data URI the user supplied).
 *
 *   { "type": "outro", "copy": { "name": "Port Halden Transit", "cta": "Timetables at the terminal" } }
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  M.registerScene({
    type: 'outro',
    slots: { name: { words: 6, required: true }, cta: { words: 8 } },
    build(s, api) {
      const d = api.design, T = api.T, ctx = api.ctx, K = M.layout.K, S = api.frame.safe;
      const brand = api.spec.meta.brand || {};
      const name = api.copy('name', brand.name);
      if (!name) throw new Error('copy.name (or meta.brand.name) is required');
      const cta = api.copy('cta');
      const logo = brand.logo && /^data:image\//.test(brand.logo) ? brand.logo : null;
      const W = api.frame.cls === 'wide' ? Math.round(S.w * 0.8) : S.w;
      const TY0 = M.layout.typeFor(api.frame);
      // The sign-off at scale f of the frame's type; it grows until it holds
      // about 60% of the frame's height, up to three times the type.
      function layout(f) {
        const hs = TY0.headline.size * f, hl = TY0.headline.lh * f, us = TY0.units.size * f, ul = TY0.units.lh * f, gap = TY0.headline.gap * f;
        const nameF = T.font(d.weights.title, hs, d.font);
        const ctaF = T.font(400, us, d.font);
        const logoH = logo ? 70 * K * f : 0;
        const nameLines = T.balance(ctx, name, nameF, W);
        const ctaLines = cta ? T.balance(ctx, cta, ctaF, W) : [];
        const h = logoH + (logo ? 14 * K * f : 0) + nameLines.length * hl + (cta ? gap + ctaLines.length * ul : 0);
        // A word can't wrap: the widest line says whether this size fits across.
        const wide = Math.max(...nameLines.map(l => T.measure(ctx, l, nameF)), ...ctaLines.map(l => T.measure(ctx, l, ctaF)));
        return { hs, hl, us, ul, gap, nameF, ctaF, logoH, nameLines, ctaLines, h, f, wide };
      }
      let Lo = layout(1);
      for (let f = 3; f > 1.001; f -= 0.1) { const t = layout(f); if (t.h <= S.h * 0.6 && t.wide <= W) { Lo = t; break; } }
      const { nameF, ctaF, logoH, nameLines, ctaLines, h } = Lo;
      let y = S.y + Math.max(0, (S.h - h) * 0.45);
      const x = S.x + (S.w - W) / 2;
      const layers = [];
      if (logo) {
        layers.push({ kind: 'draw', id: 'logo', at: 0, dur: 0.6, fn(cx, p, a) {
          const im = a.C.images[logo];
          if (!im) return;
          const k = logoH / im.height, w = im.width * k;
          cx.save(); cx.globalAlpha *= p;
          cx.drawImage(im, S.x + (S.w - w) / 2, y0 + (1 - M.ease.outQuint(p)) * 6 * K, w, logoH);
          cx.restore();
        } });
      }
      const y0 = y;
      y += logoH + (logo ? 14 * K * Lo.f : 0);
      layers.push({ kind: 'text', id: 'name', role: 'headline', font: nameF, size: Lo.hs, color: d.ink, reveal: 'mask-up',
        lines: T.place(ctx, nameLines, nameF, x, y, Lo.hl, 'center', W), at: 0.2, dur: 0.6, large: true });
      y += nameLines.length * Lo.hl;
      if (cta) {
        y += Lo.gap;
        layers.push({ kind: 'text', id: 'cta', role: 'units', font: ctaF, size: Lo.us, color: d.muted, reveal: 'fade',
          lines: T.place(ctx, ctaLines, ctaF, x, y, Lo.ul, 'center', W), at: 0.5, dur: 0.5 });
      }
      const read = M.readTime(T.wordCount(name) + T.wordCount(cta));
      // No corner art: the outro shows the logo itself.
      return { layers, rule: null, art: false, read };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
