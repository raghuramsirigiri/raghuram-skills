/*!
 * pictures/building.js — a building that sets a place: a prop, no data.
 * It stands beside a data picture (its "props"), to the left and a little
 * back, and says where the finding happens: a home for deliveries, a bank
 * branch for accounts.
 *
 *   "picture": { "kind": "blocks", "of": "delivery users", "props": ["home"] }
 *   "picture": { "kind": "blocks", "skin": "card", "of": "new business accounts", "props": ["branch"] }
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  const HOME = { w: 140, d: 120, h: 100, roof: 46 };
  const BANK = { w: 170, d: 120, h: 84, roof: 26 };

  function home(V, cx, cy, m) {
    const h = HOME, x = cx - h.w / 2, y = cy - h.d / 2, rz = h.h, ry = y + h.d / 2, rt = rz + h.roof;
    V.shadow(x, y, h.w, h.d, h.h + h.roof, m.shadow);
    V.box(x, y, 0, h.w, h.d, h.h, m.N);
    // Windows on the front-left face; a door on the front-right.
    [[x + 20, 52], [x + h.w - 20 - 42, 52]].forEach(([wx, wz]) => V.quad([wx, y + h.d, wz], [wx + 42, y + h.d, wz], [wx + 42, y + h.d, wz + 30], [wx, y + h.d, wz + 30], m.window));
    V.quad([x + h.w, y + 40, 0], [x + h.w, y + 76, 0], [x + h.w, y + 76, 62], [x + h.w, y + 40, 62], m.door);
    // Gable roof, ridge along x; a chimney on the back slope.
    V.quad([x - 8, y - 8, rz], [x + h.w + 8, y - 8, rz], [x + h.w + 8, ry, rt], [x - 8, ry, rt], m.roof);
    V.box(x + 34, y + 16, rz + 8, 20, 20, h.roof + 2, m.N2);
    V.quad([x - 8, ry, rt], [x + h.w + 8, ry, rt], [x + h.w + 8, y + h.d + 8, rz], [x - 8, y + h.d + 8, rz], m.roofSide);
    V.poly([V.P(x + h.w, y, rz), V.P(x + h.w, y + h.d, rz), V.P(x + h.w, ry, rt)], m.N.right);
  }

  // A bank branch: steps, a row of columns across the front, a low pediment.
  function branch(V, cx, cy, m) {
    const b = BANK, x = cx - b.w / 2, y = cy - b.d / 2, base = 14, top = base + b.h;
    V.shadow(x - 10, y - 10, b.w + 20, b.d + 34, top + b.roof, m.shadow);
    V.box(x - 10, y - 10, 0, b.w + 20, b.d + 34, 7, m.N2);
    V.box(x - 5, y - 5, 7, b.w + 10, b.d + 24, 7, m.N);
    V.box(x, y, base, b.w, b.d, b.h, m.N);
    // The door, set back between the middle columns.
    V.quad([x + b.w / 2 - 18, y + b.d, base], [x + b.w / 2 + 18, y + b.d, base], [x + b.w / 2 + 18, y + b.d, base + 52], [x + b.w / 2 - 18, y + b.d, base + 52], m.door);
    // Columns across the front (+y) face, in front of the wall.
    for (let i = 0; i < 4; i++) {
      const px = x + 14 + i * (b.w - 40) / 3;
      V.box(px, y + b.d + 6, base, 12, 12, b.h - 6, { top: m.PAPER.top, left: m.PAPER.left, right: m.PAPER.right });
    }
    // The entablature over the columns, then the pediment (ridge along x).
    V.box(x - 4, y - 4, top - 6, b.w + 8, b.d + 26, 12, m.N2);
    const rz = top + 6, ry = y + (b.d + 22) / 2, rt = rz + b.roof;
    V.quad([x - 4, y - 4, rz], [x + b.w + 4, y - 4, rz], [x + b.w + 4, ry, rt], [x - 4, ry, rt], m.roof);
    V.quad([x - 4, ry, rt], [x + b.w + 4, ry, rt], [x + b.w + 4, y + b.d + 22, rz], [x - 4, y + b.d + 22, rz], m.roofSide);
    V.poly([V.P(x + b.w + 4, y - 4, rz), V.P(x + b.w + 4, y + b.d + 22, rz), V.P(x + b.w + 4, ry, rt)], m.N.right);
  }

  const SKIN = { home: { size: HOME, draw: home, h: HOME.h + HOME.roof + 10 }, branch: { size: BANK, draw: branch, h: 14 + BANK.h + 6 + BANK.roof + 6 } };

  M.pictures.register({
    kind: 'building', prop: true, skins: ['home', 'branch'],
    footprint(place) { const k = SKIN[place.pic.skin || 'home']; return { w: k.size.w + 20, d: k.size.d + 34, h: k.h, shadow: 60 }; },
    draw(V, place, t, W) { SKIN[place.pic.skin || 'home'].draw(V, place.x, place.y, W.mat); }
  });
})(typeof window !== 'undefined' ? window : globalThis);
