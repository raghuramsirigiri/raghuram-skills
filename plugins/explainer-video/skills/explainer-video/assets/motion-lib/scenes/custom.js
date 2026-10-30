/*!
 * scenes/custom.js — the escape hatch, for the rare scene the catalog can't
 * draw. The page registers a painter, and the spec names it:
 *
 *   Motion.custom.tideClock = {
 *     enter: 1.2,              // seconds until everything is revealed
 *     read: 2.5,               // seconds it must then hold still
 *     draw(ctx, lt, api) {     // lt: seconds since the scene's content start
 *       const p = api.at(0.2, 1.0, 'outQuint');      // 0..1 over [0.2, 1.2)
 *       api.paint.rect(ctx, api.box.x, api.box.y, api.box.w * p, 40, api.design.subject);
 *     }
 *   };
 *   { "type": "custom", "draw": "tideClock", "claims": ["F2"], "copy": { "kicker", "title", "units" } }
 *
 * `claims` names the figures the painter draws: api.value('F2') is the
 * claim's number and api.display('F2') its exact wording, so the units drawn
 * come from the ledger and the source line lists them.
 *
 * The contract: a pure function of lt. No Math.random (use api.rng), no
 * Date.now, no timers, no state kept between calls. Draw text through
 * api.text so the audit can see it. The headline and units come for free
 * around api.box, and the kicker and source line in the shared frame.
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  M.registerScene({
    type: 'custom',
    slots: { kicker: { words: 4 }, title: { words: 10 }, units: { words: 8 } },
    data: 'draw: the name of a painter registered on Motion.custom; claims: the claim ids it draws',
    build(s, api) {
      const painter = M.custom[s.draw];
      if (!painter || typeof painter.draw !== 'function') throw new Error('no painter Motion.custom.' + s.draw + ' with a draw(ctx, lt, api) function');
      (s.claims || []).forEach(id => api.claim(id));
      const c = M.card(api, { kicker: api.copy('kicker'), headline: api.copy('title'), units: api.copy('units'), chart: true, sourceIds: api.used() });
      const box = c.chart;
      const own = {};
      (s.claims || []).forEach(id => { own[id] = api.claim(id); });
      const pick = id => { if (!own[id]) throw new Error('scene "' + s.id + '": the painter reads claim "' + id + '", which is not in its "claims"'); return own[id]; };
      api.reserved.push(box);   // the painter may draw anywhere in it
      const enter = +painter.enter || 1;
      const seed = api.spec.meta.seed || 0;
      const layers = c.layers.slice();
      layers.push({ kind: 'draw', id: 'custom', at: 0.5, dur: enter, ease: 'linear', fn(cx, p, a) {
        const lt = a.lt - 0.5;
        const helpers = {
          box, design: a.design, paint: M.paint, ease: M.ease,
          at: (start, dur, ease) => M.ease.get(ease || 'outQuint')(M.ease.clamp01((lt - start) / (dur || 1e-6))),
          rng: (...keys) => M.rng(seed, s.id, ...keys),
          value: id => +pick(id).value,
          display: id => { const k = pick(id); return k.display != null ? String(k.display) : String(k.value); },
          // The 2.5D kit, as the continuous style's painters get it: a view
          // centred in the box (world 0,0,0 a little below its middle) and the tints.
          mat: M.iso ? M.iso.materials(a.design) : null,
          iso: k => M.iso.view(cx, { ax: box.x + box.w / 2, ay: box.y + box.h * 0.62, cx: 0, cy: 0, s: k || 1, font: a.design.font }, 'custom:' + s.id),
          text: (str, x, y, o) => {
            const f = M.text.font(o && o.weight || 400, o && o.size || a.design.size.label, a.design.font);
            M.paint.text(cx, str, x, y, { font: f, color: (o && o.color) || a.design.ink, h: (o && o.size || a.design.size.label) * 1.3, alpha: o && o.alpha, layer: 'custom-' + str.slice(0, 12), role: 'body', size: o && o.size || a.design.size.label });
          }
        };
        painter.draw(cx, Math.max(0, lt), helpers);
      } });
      const read = Math.max(+painter.read || 1.2, M.readTime(c.primaryWords) + 0.15 * (c.words - c.primaryWords));
      return { layers, rule: c.rule, read };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
