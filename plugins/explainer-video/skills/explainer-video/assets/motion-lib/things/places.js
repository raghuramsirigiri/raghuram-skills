/*!
 * things/places.js — buildings, as props with a job: units leave one (a
 * source), go to one (`to`, a destination), or one stands where a queue
 * leads. A home, a bank branch, an office, a shop. The door is the mouth
 * units pass through, and it takes the share's accent while they do.
 *
 *   "picture": { "things": "card", "arrange": "sort", "of": "new accounts",
 *                "parts": ["Online", "Branch or phone"], "to": ["laptop", "branch"] }
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  const mix = (a, b, k) => M.design.mix(a, b, k);
  const doorOf = (m, o) => mix(m.door, m.accent, 0.75 * (o.active || 0));

  function home(V, cx, cy, z, o) {
    const m = o.mat, w = 140, d = 120, h = 100, roof = 46, x = cx - w / 2, y = cy - d / 2, rz = z + h, ry = y + d / 2, rt = rz + roof;
    V.shadow(x, y, w, d, h + roof, m.shadow);
    V.box(x, y, z, w, d, h, m.N);
    [[x + 20, 52], [x + w - 62, 52]].forEach(([wx, wz]) => V.quad([wx, y + d, z + wz], [wx + 42, y + d, z + wz], [wx + 42, y + d, z + wz + 30], [wx, y + d, z + wz + 30], m.window));
    V.quad([x + w, y + 40, z], [x + w, y + 76, z], [x + w, y + 76, z + 62], [x + w, y + 40, z + 62], doorOf(m, o));
    V.quad([x - 8, y - 8, rz], [x + w + 8, y - 8, rz], [x + w + 8, ry, rt], [x - 8, ry, rt], m.roof);
    V.box(x + 34, y + 16, rz + 8, 20, 20, roof + 2, m.N2);
    V.quad([x - 8, ry, rt], [x + w + 8, ry, rt], [x + w + 8, y + d + 8, rz], [x - 8, y + d + 8, rz], m.roofSide);
    V.poly([V.P(x + w, y, rz), V.P(x + w, y + d, rz), V.P(x + w, ry, rt)], m.N.right);
  }

  // A bank branch: steps, a row of columns across the front, a low pediment.
  function branch(V, cx, cy, z0, o) {
    const m = o.mat, w = 170, d = 120, h = 84, roof = 26, x = cx - w / 2, y = cy - d / 2, base = z0 + 14, top = base + h;
    V.shadow(x - 10, y - 10, w + 20, d + 34, top - z0 + roof, m.shadow);
    V.box(x - 10, y - 10, z0, w + 20, d + 34, 7, m.N2);
    V.box(x - 5, y - 5, z0 + 7, w + 10, d + 24, 7, m.N);
    V.box(x, y, base, w, d, h, m.N);
    V.quad([x + w / 2 - 18, y + d, base], [x + w / 2 + 18, y + d, base], [x + w / 2 + 18, y + d, base + 52], [x + w / 2 - 18, y + d, base + 52], doorOf(m, o));
    for (let i = 0; i < 4; i++) {
      const px = x + 14 + i * (w - 40) / 3;
      V.box(px, y + d + 6, base, 12, 12, h - 6, m.PAPER);
    }
    V.box(x - 4, y - 4, top - 6, w + 8, d + 26, 12, m.N2);
    const rz = top + 6, ry = y + (d + 22) / 2, rt = rz + roof;
    V.quad([x - 4, y - 4, rz], [x + w + 4, y - 4, rz], [x + w + 4, ry, rt], [x - 4, ry, rt], m.roof);
    V.quad([x - 4, ry, rt], [x + w + 4, ry, rt], [x + w + 4, y + d + 22, rz], [x - 4, y + d + 22, rz], m.roofSide);
    V.poly([V.P(x + w + 4, y - 4, rz), V.P(x + w + 4, y + d + 22, rz), V.P(x + w + 4, ry, rt)], m.N.right);
  }

  // An office block: a tower of window bands, an entrance at its foot.
  function office(V, cx, cy, z, o) {
    const m = o.mat, w = 110, d = 100, h = 210, x = cx - w / 2, y = cy - d / 2;
    V.shadow(x, y, w, d, h, m.shadow);
    V.box(x, y, z, w, d, h, m.N);
    for (let f = 0; f < 6; f++) {
      const fz = z + 40 + f * 28;
      V.quad([x + 8, y + d, fz], [x + w - 8, y + d, fz], [x + w - 8, y + d, fz + 14], [x + 8, y + d, fz + 14], m.window);
      V.quad([x + w, y + 8, fz], [x + w, y + d - 8, fz], [x + w, y + d - 8, fz + 14], [x + w, y + 8, fz + 14], mix(m.window, m.ink, 0.1));
    }
    V.quad([x + w / 2 - 16, y + d, z], [x + w / 2 + 16, y + d, z], [x + w / 2 + 16, y + d, z + 30], [x + w / 2 - 16, y + d, z + 30], doorOf(m, o));
    V.box(x - 4, y - 4, z + h, w + 8, d + 8, 6, m.N2);
  }

  // A shop: a shopfront window and an awning over the door.
  function shop(V, cx, cy, z, o) {
    const m = o.mat, w = 150, d = 100, h = 92, x = cx - w / 2, y = cy - d / 2;
    V.shadow(x, y, w, d, h, m.shadow);
    V.box(x, y, z, w, d, h, m.N);
    V.quad([x + 14, y + d, z + 18], [x + 84, y + d, z + 18], [x + 84, y + d, z + 64], [x + 14, y + d, z + 64], m.window);
    V.quad([x + 100, y + d, z], [x + 132, y + d, z], [x + 132, y + d, z + 60], [x + 100, y + d, z + 60], doorOf(m, o));
    V.quad([x + 6, y + d, z + 72], [x + w - 6, y + d, z + 72], [x + w - 6, y + d + 22, z + 62], [x + 6, y + d + 22, z + 62], m.roofSide);
    V.box(x - 3, y - 3, z + h, w + 6, d + 6, 8, m.N2);
  }

  // A clinic: a low block with a cross panel by the door.
  function clinic(V, cx, cy, z, o) {
    const m = o.mat, w = 160, d = 110, h = 86, x = cx - w / 2, y = cy - d / 2;
    V.shadow(x, y, w, d, h, m.shadow);
    V.box(x, y, z, w, d, h, m.N);
    [[x + 14, 40], [x + 54, 40]].forEach(([wx, wz]) => V.quad([wx, y + d, z + wz], [wx + 30, y + d, z + wz], [wx + 30, y + d, z + wz + 26], [wx, y + d, z + wz + 26], m.window));
    V.quad([x + 104, y + d, z], [x + 138, y + d, z], [x + 138, y + d, z + 58], [x + 104, y + d, z + 58], doorOf(m, o));
    const px = x + 96, pz = z + 64;
    V.quad([px + 8, y + d + 0.1, pz], [px + 16, y + d + 0.1, pz], [px + 16, y + d + 0.1, pz + 22], [px + 8, y + d + 0.1, pz + 22], m.dark);
    V.quad([px + 1, y + d + 0.1, pz + 7], [px + 23, y + d + 0.1, pz + 7], [px + 23, y + d + 0.1, pz + 15], [px + 1, y + d + 0.1, pz + 15], m.dark);
    V.box(x - 3, y - 3, z + h, w + 6, d + 6, 6, m.N2);
  }

  const defs = [
    { name: 'home', aka: ['house', 'homes', 'household', 'households'], size: { w: 156, d: 136, h: 160 }, draw: home, mouth: () => ({ x: 70, y: -2, z: 4 }) },
    { name: 'branch', aka: ['bank', 'bank-branch', 'branches'], size: { w: 190, d: 154, h: 150 }, draw: branch, mouth: () => ({ x: 0, y: 66, z: 14 }) },
    { name: 'office', aka: ['offices', 'company', 'business', 'headquarters', 'workplace'], size: { w: 118, d: 108, h: 220 }, draw: office, mouth: () => ({ x: 0, y: 50, z: 2 }) },
    { name: 'shop', aka: ['store', 'stores', 'shops', 'retail', 'retailer'], size: { w: 156, d: 128, h: 100 }, draw: shop, mouth: () => ({ x: 41, y: 50, z: 2 }) },
    { name: 'clinic', aka: ['hospital', 'surgery', 'practice', 'gp'], size: { w: 166, d: 116, h: 92 }, draw: clinic, mouth: () => ({ x: 41, y: 55, z: 2 }) }
  ];
  defs.forEach(d => M.things.register(Object.assign({ role: 'prop' }, d)));
})(typeof window !== 'undefined' ? window : globalThis);
