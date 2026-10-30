/*!
 * pictures/desk.js — work that is waiting, as a set piece: a desk with an
 * in-tray, three empty trays with blank labels (the themes the work will be
 * sorted into), and a desk calendar whose top page is torn off to show when
 * the work is due. A place of its own, with no figure: for "not yet
 * analysed", "due in September", "being reviewed".
 *
 *   "picture": { "set": "desk", "due": "November", "from": "abandon" }
 *
 * `due` must be words from the scene's own copy (the calendar shows its
 * first three letters). `from` names an earlier scene of things: a few of
 * its share lift off and ride the camera's pan into the in-tray, greyed —
 * the link the story makes, never a count. Without `from` the in-tray holds
 * an unsorted pile of sheets.
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  const DK = { w: 380, d: 240, z: 84, slab: 12 }, TOPZ = DK.z + DK.slab;
  const TRAY = { dx: 35, dy: -5, w: 135, d: 115, h: 16 };
  const BIN = { dx: -170, dy: -105, w: 130, d: 54, h: 22, pitch: 64 };
  const CAL = { dx: -120, dy: -118, w: 86, d: 14, h: 86 };
  const COS = 0.8660254;

  const jit = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) - 0.5; };

  // Lines of writing on a sheet's top face.
  function writing(V, x, y, z, w, d, n, color) {
    for (let l = 0; l < n; l++) {
      const lx = x + w * 0.12, ly = y + d * 0.18 + l * d * 0.64 / Math.max(1, n - 1), lw = w * (l === n - 1 ? 0.45 : 0.76);
      V.quad([lx, ly, z], [lx + lw, ly, z], [lx + lw, ly + d * 0.05, z], [lx, ly + d * 0.05, z], color);
    }
  }
  // Sheets in loose bundles, each a little askew: an unsorted pile.
  function pile(V, x, y, z, w, d, ph, step, m) {
    const n = Math.max(1, Math.ceil(ph / step));
    for (let b = 0; b < n; b++) {
      const ox = jit(b) * 12, oy = jit(b + 50) * 12, bz = z + b * step, bh = Math.min(step, ph - b * step);
      if (bh <= 0) break;
      V.box(x + ox, y + oy, bz, w, d, bh, m.PAPER);
      if (b === n - 1) writing(V, x + ox, y + oy, bz + bh + 0.1, w, d, 4, m.line);
    }
  }

  M.things.register({
    name: 'desk', aka: ['workbench', 'office-desk'], role: 'set',
    size: { w: DK.w, d: DK.d, h: TOPZ + CAL.h },
    prepare(place, it) {
      const due = place.pic.due;
      if (due != null) {
        const copy = Object.values(it.spec.copy || {}).join(' ').toLowerCase();
        if (copy.indexOf(String(due).toLowerCase()) < 0) throw new Error('desk: "due" must be words from the scene\'s copy ("' + due + '" is not in it)');
        place.month = String(due).trim().slice(0, 3).toUpperCase();
      }
    },
    // The desk's box on screen at scale s, about its centre on the ground.
    box(place, s) {
      const pts = [];
      const add = (x, y, z) => pts.push([(x - y) * COS * s, ((x + y) / 2 - z) * s]);
      [[-DK.w / 2, -DK.d / 2], [DK.w / 2, -DK.d / 2], [-DK.w / 2, DK.d / 2], [DK.w / 2 + 40, DK.d / 2 + 16]].forEach(([x, y]) => { add(x, y, 0); add(x, y, TOPZ); });
      const cx = CAL.dx, cy = CAL.dy;
      [[cx, cy], [cx + CAL.w, cy], [cx, cy + CAL.d], [cx + CAL.w, cy + CAL.d]].forEach(([x, y]) => add(x, y, TOPZ + CAL.h + 4));
      // Carried things stacked in the in-tray.
      add(TRAY.dx, TRAY.dy, TOPZ + 60);
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
    },
    // Where carried thing k comes to rest: in the in-tray, one on another.
    landing(place, k) {
      const th = place.from && place.from.thing, step = th ? (th.stack || th.size.h + 1) : 3;
      return { x: TRAY.dx + TRAY.w / 2 + jit(k) * 8, y: TRAY.dy + TRAY.d / 2 + jit(k + 9) * 8, z: TOPZ + 2.5 + k * step };
    },
    draw(V, place, t, W) {
      const m = W.mat, x = -DK.w / 2, y = -DK.d / 2;
      V.shadow(x, y, DK.w, DK.d, 40, m.shadow);
      // Legs, then the top.
      [[x + 8, y + 8], [x + DK.w - 22, y + 8], [x + 8, y + DK.d - 22], [x + DK.w - 22, y + DK.d - 22]].forEach(([lx, ly]) => V.box(lx, ly, 0, 14, 14, DK.z, m.N2));
      V.box(x, y, DK.z, DK.w, DK.d, DK.slab, m.N);
      // The calendar at the back: the top page torn off to show the month it's due.
      if (place.month) {
        const cx = CAL.dx, cy = CAL.dy, fy = cy + CAL.d + 0.5;
        V.box(cx, cy, TOPZ, CAL.w, CAL.d, CAL.h, m.N2);
        V.quad([cx, fy, TOPZ + CAL.h], [cx + CAL.w, fy, TOPZ + CAL.h], [cx + CAL.w, fy, TOPZ + CAL.h - 18], [cx, fy, TOPZ + CAL.h - 18], m.dark);
        const pageZ = TOPZ + CAL.h - 21, pageH = CAL.h - 27;
        const page = (z, a, lines) => {
          if (a <= 0.001) return;
          V.ctx.save(); V.ctx.globalAlpha *= a;
          V.quad([cx + 5, fy, z], [cx + CAL.w - 5, fy, z], [cx + CAL.w - 5, fy, z - pageH], [cx + 5, fy, z - pageH], m.PAPER.top);
          if (lines) for (let l = 0; l < 3; l++) V.quad([cx + 16, fy, z - 22 - l * 14], [cx + CAL.w - 16, fy, z - 22 - l * 14], [cx + CAL.w - 16, fy, z - 26 - l * 14], [cx + 16, fy, z - 26 - l * 14], m.line);
          V.ctx.restore();
        };
        page(pageZ, 1, false);
        V.faceText(place.month, cx, fy, pageZ - 19, CAL.w, 34, 700, m.ink, 1, 'world-face:' + place.id);
        const flip = place.flips[0];
        const fl = flip ? M.world.clamp((t - flip.t0) / flip.dur) : 1;
        if (fl < 1) page(pageZ + 46 * M.ease.outQuint(fl), 1 - fl, true);
      }
      // Three empty trays, their labels blank.
      for (let n = 0; n < 3; n++) {
        const bx = BIN.dx, by = BIN.dy + n * BIN.pitch;
        V.tray(bx, by, TOPZ, BIN.w, BIN.d, BIN.h, m.N2, M.design.mix(m.N2.top, m.ink, 0.05));
        V.quad([bx + BIN.w + 0.3, by + 12, TOPZ + 5], [bx + BIN.w + 0.3, by + BIN.d - 12, TOPZ + 5], [bx + BIN.w + 0.3, by + BIN.d - 12, TOPZ + 16], [bx + BIN.w + 0.3, by + 12, TOPZ + 16], m.PAPER.top);
      }
      // The in-tray: the carried things that have landed in it, greyed, or
      // an unsorted pile of sheets.
      const tx = TRAY.dx, ty = TRAY.dy;
      V.tray(tx, ty, TOPZ, TRAY.w, TRAY.d, TRAY.h, m.N2, M.design.mix(m.N2.top, m.ink, 0.05));
      const th = place.from && place.from.thing;
      if (th) {
        const natural = th.natural ? m[th.natural] : m.N2;
        M.world.carried(place, t).forEach(c => th.draw(V, c.pos.x, c.pos.y, c.pos.z, { mat: m, body: natural, kind: 'part', seed: c.k, pose: 'stand' }));
      } else pile(V, tx + 12, ty + 12, TOPZ + 2, TRAY.w - 24, TRAY.d - 24, 52, 7, m);
    },
    icon(V, place, W) { pile(V, -26, -22, 0, 50, 44, 20, 5, W.mat); }
  });
})(typeof window !== 'undefined' ? window : globalThis);
