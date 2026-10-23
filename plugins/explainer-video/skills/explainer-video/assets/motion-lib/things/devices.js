/*!
 * things/devices.js — a laptop, a phone, a screen: props with a job. Units
 * come out of the screen (a source) or go into it (`to`); a queue of
 * visitors leads to it. The page on screen is a plain wireframe, never a
 * real product's screen, and its button takes the accent while units pass.
 *
 *   "picture": { "things": "person", "arrange": "queue", "of": "product page visits", "to": ["laptop"] }
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  const mix = (a, b, k) => M.design.mix(a, b, k);

  // A wireframe page on a face at y = fy, from (x0, ztop) across w and down h.
  function page(V, x0, fy, ztop, w, h, m, active) {
    const q = (a, b, za, zb, c) => V.quad([a, fy, za], [b, fy, za], [b, fy, zb], [a, fy, zb], c);
    q(x0, x0 + w, ztop, ztop - h, m.PAPER.top);
    q(x0, x0 + w, ztop, ztop - h * 0.14, m.dark);
    for (let l = 0; l < 3; l++) {
      const z = ztop - h * (0.3 + l * 0.13);
      q(x0 + w * 0.1, x0 + w * (l === 2 ? 0.55 : 0.85), z, z - h * 0.05, m.line);
    }
    q(x0 + w * 0.1, x0 + w * 0.45, ztop - h * 0.72, ztop - h * 0.86, mix(m.dark, m.accent, 0.85 * (active || 0)));
  }

  const LAP = { w: 170, d: 112, base: 7, screen: 112 };
  function laptop(V, cx, cy, z, o) {
    const m = o.mat, x = cx - LAP.w / 2, y = cy - LAP.d / 2;
    V.shadow(x, y, LAP.w, LAP.d, 40, m.shadow);
    V.box(x, y, z, LAP.w, LAP.d, LAP.base, m.N2);
    V.quad([x + 14, y + 24, z + LAP.base + 0.05], [x + LAP.w - 14, y + 24, z + LAP.base + 0.05], [x + LAP.w - 14, y + LAP.d - 30, z + LAP.base + 0.05], [x + 14, y + LAP.d - 30, z + LAP.base + 0.05], mix(m.N2.top, m.ink, 0.12));
    V.box(x + 2, y - 2, z + LAP.base, LAP.w - 4, 6, LAP.screen, m.N2);
    page(V, x + 10, y + 4.2, z + LAP.base + LAP.screen - 8, LAP.w - 20, LAP.screen - 16, m, o.active);
  }

  const PHONE = { w: 58, d: 10, h: 112 };
  function phone(V, cx, cy, z, o) {
    const m = o.mat, x = cx - PHONE.w / 2, y = cy - PHONE.d / 2;
    V.shadow(x, y, PHONE.w, PHONE.d + 10, PHONE.h * 0.5, m.shadow);
    V.box(x, y, z, PHONE.w, PHONE.d, PHONE.h, m.DARK);
    page(V, x + 5, y + PHONE.d + 0.2, z + PHONE.h - 9, PHONE.w - 10, PHONE.h - 18, m, o.active);
  }

  // A screen on a stand: a desktop monitor, a kiosk, a dashboard.
  function screen(V, cx, cy, z, o) {
    const m = o.mat, w = 190, x = cx - w / 2, y = cy - 20;
    V.shadow(x + 50, y, 90, 50, 30, m.shadow);
    V.box(cx - 40, y + 4, z, 80, 40, 5, m.N2);
    V.box(cx - 7, y + 14, z + 5, 14, 10, 34, m.N2);
    V.box(x, y + 6, z + 39, w, 10, 118, m.DARK);
    page(V, x + 8, y + 16.2, z + 39 + 110, w - 16, 102, m, o.active);
  }

  M.things.register({ name: 'laptop', aka: ['computer', 'website', 'web', 'online', 'desktop', 'pc'], role: 'prop', size: { w: 172, d: 114, h: 120 }, draw: laptop, mouth: () => ({ x: 0, y: -50, z: 66 }) });
  M.things.register({ name: 'phone', aka: ['mobile', 'smartphone', 'app', 'mobile-app'], role: 'prop', size: { w: 60, d: 22, h: 112 }, draw: phone, mouth: () => ({ x: 0, y: 6, z: 60 }) });
  M.things.register({ name: 'screen', aka: ['monitor', 'kiosk', 'display', 'terminal', 'atm'], role: 'prop', size: { w: 192, d: 46, h: 158 }, draw: screen, mouth: () => ({ x: 0, y: -4, z: 98 }) });
})(typeof window !== 'undefined' ? window : globalThis);
