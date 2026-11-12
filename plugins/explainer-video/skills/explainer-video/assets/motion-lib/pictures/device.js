/*!
 * pictures/device.js — a laptop or a phone showing a web page: a prop, no
 * data. Beside a data picture it says the finding is about a website or an
 * app; on its own it sets a website scene. The page is a plain wireframe
 * (a header, lines of text, a button), never a real product's screen.
 *
 *   "picture": { "kind": "dots", "of": "product page visits", "props": ["laptop"] }
 *   "picture": { "kind": "device", "skin": "laptop" }
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  const LAP = { w: 170, d: 112, base: 7, screen: 112 };
  const PHONE = { w: 58, d: 10, h: 112 };

  // A wireframe page on a face at y = fy, from (x0, z0) across w and down h.
  function page(V, x0, fy, ztop, w, h, m) {
    const q = (a, b, za, zb, c) => V.quad([a, fy, za], [b, fy, za], [b, fy, zb], [a, fy, zb], c);
    q(x0, x0 + w, ztop, ztop - h, m.PAPER.top);
    q(x0, x0 + w, ztop, ztop - h * 0.14, m.dark);                       // header
    for (let l = 0; l < 3; l++) {                                         // lines of text
      const z = ztop - h * (0.3 + l * 0.13);
      q(x0 + w * 0.1, x0 + w * (l === 2 ? 0.55 : 0.85), z, z - h * 0.05, m.line);
    }
    q(x0 + w * 0.1, x0 + w * 0.45, ztop - h * 0.72, ztop - h * 0.86, m.dark); // a button
  }

  function laptop(V, cx, cy, m) {
    const x = cx - LAP.w / 2, y = cy - LAP.d / 2;
    V.shadow(x, y, LAP.w, LAP.d, 40, m.shadow);
    V.box(x, y, 0, LAP.w, LAP.d, LAP.base, m.N2);
    V.quad([x + 14, y + 24, LAP.base + 0.05], [x + LAP.w - 14, y + 24, LAP.base + 0.05], [x + LAP.w - 14, y + LAP.d - 30, LAP.base + 0.05], [x + 14, y + LAP.d - 30, LAP.base + 0.05], M.design.mix(m.N2.top, m.ink, 0.12));
    // The screen stands at the back edge, facing left-front.
    V.box(x + 2, y - 2, LAP.base, LAP.w - 4, 6, LAP.screen, m.N2);
    page(V, x + 10, y + 4.2, LAP.base + LAP.screen - 8, LAP.w - 20, LAP.screen - 16, m);
  }

  function phone(V, cx, cy, m) {
    const x = cx - PHONE.w / 2, y = cy - PHONE.d / 2;
    V.shadow(x, y, PHONE.w, PHONE.d + 10, PHONE.h * 0.5, m.shadow);
    V.box(x, y, 0, PHONE.w, PHONE.d, PHONE.h, m.N2);
    page(V, x + 5, y + PHONE.d + 0.2, PHONE.h - 9, PHONE.w - 10, PHONE.h - 18, m);
  }

  const SKIN = { laptop: { draw: laptop, w: LAP.w, d: LAP.d, h: LAP.base + LAP.screen }, phone: { draw: phone, w: PHONE.w, d: PHONE.d + 10, h: PHONE.h } };

  M.pictures.register({
    kind: 'device', prop: true, standalone: true, skins: ['laptop', 'phone'],
    footprint(place) { const k = SKIN[place.pic.skin || 'laptop']; return { w: k.w + 10, d: k.d + 10, h: k.h + 4, shadow: 30 }; },
    draw(V, place, t, W) { SKIN[place.pic.skin || 'laptop'].draw(V, place.x, place.y, W.mat); },
    icon(V, place, W) { const g = M.iso.view(V.ctx, { ax: V.P(0, 0, 0)[0], ay: V.P(0, 0, 0)[1] + 20, cx: 0, cy: 0, s: 0.45, font: W.font }, V.owner); SKIN[place.pic.skin || 'laptop'].draw(g, 0, 0, W.mat); }
  });
})(typeof window !== 'undefined' ? window : globalThis);
