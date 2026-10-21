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
      const d = api.design, T = api.T, ctx = api.ctx, K = M.layout.K, S = api.frame.safe, TY = M.layout.TYPE;
      const brand = api.spec.meta.brand || {};
      const name = api.copy('name', brand.name);
      if (!name) throw new Error('copy.name (or meta.brand.name) is required');
      const cta = api.copy('cta');
      const logo = brand.logo && /^data:image\//.test(brand.logo) ? brand.logo : null;
      const W = Math.min(S.w, 1240);
      const nameF = T.font(d.weights.title, TY.headline.size, d.font);
      const ctaF = T.font(400, TY.units.size, d.font);
      const logoH = logo ? 70 * K : 0;
      const nameLines = T.balance(ctx, name, nameF, W);
      const ctaLines = cta ? T.balance(ctx, cta, ctaF, W) : [];
      const h = logoH + (logo ? 14 * K : 0) + nameLines.length * TY.headline.lh + (cta ? TY.headline.gap + ctaLines.length * TY.units.lh : 0);
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
      y += logoH + (logo ? 14 * K : 0);
      layers.push({ kind: 'text', id: 'name', role: 'headline', font: nameF, size: TY.headline.size, color: d.ink, reveal: 'mask-up',
        lines: T.place(ctx, nameLines, nameF, x, y, TY.headline.lh, 'center', W), at: 0.2, dur: 0.6, large: true });
      y += nameLines.length * TY.headline.lh;
      if (cta) {
        y += TY.headline.gap;
        layers.push({ kind: 'text', id: 'cta', role: 'units', font: ctaF, size: TY.units.size, color: d.muted, reveal: 'fade',
          lines: T.place(ctx, ctaLines, ctaF, x, y, TY.units.lh, 'center', W), at: 0.5, dur: 0.5 });
      }
      const read = M.readTime(T.wordCount(name) + T.wordCount(cta));
      return { layers, rule: null, read };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
