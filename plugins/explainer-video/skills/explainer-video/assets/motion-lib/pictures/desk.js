/*!
 * pictures/desk.js — work that is waiting: written answers in an unsorted
 * pile, three empty trays with blank labels (the themes they will be sorted
 * into), and a desk calendar whose top page is torn off to show when the
 * work is due. A place of its own, with no data: for "not yet analysed",
 * "due in September", "being reviewed".
 *
 *   "picture": { "kind": "desk", "due": "September", "from": "ctx" }
 *
 * `due` must be words from the scene's own copy (the calendar shows its
 * first three letters). `from` names an earlier scene: sheets lift off its
 * place and ride the camera's pan to the pile.
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  const DK = { w: 380, d: 240, z: 84, slab: 12 }, TOPZ = DK.z + DK.slab;
  const TRAY = { dx: 35, dy: -5, w: 135, d: 115, h: 16 };
  const BIN = { dx: -170, dy: -105, w: 130, d: 54, h: 22, pitch: 64 };
  const CAL = { dx: -120, dy: -118, w: 86, d: 14, h: 86 };
  const SHEETS = 14, STAG = 0.07, LIFT = 140;

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
  const flight = p => Math.max(0.6, p.movers.dur - (SHEETS - 1) * STAG);
  const landed = (p, t) => {
    if (!p.movers) return SHEETS;
    let n = 0;
    for (let s = 0; s < SHEETS; s++) if (t >= p.movers.t0 + s * STAG + flight(p)) n++;
    return n;
  };

  M.pictures.register({
    kind: 'desk', prop: true, standalone: true, flip: true,
    prepare(place, it) {
      const due = place.pic.due;
      if (due) {
        const copy = Object.values(it.spec.copy || {}).join(' ').toLowerCase();
        if (copy.indexOf(String(due).toLowerCase()) < 0) throw new Error('desk: "due" must be words from the scene\'s copy ("' + due + '" is not in it)');
        place.month = String(due).trim().slice(0, 3).toUpperCase();
      }
    },
    footprint() { return { w: DK.w + 24, d: DK.d + 24, h: TOPZ + CAL.h + 6, shadow: 40 }; },
    draw(V, place, t, W) {
      const m = W.mat, x = place.x - DK.w / 2, y = place.y - DK.d / 2;
      V.shadow(x, y, DK.w, DK.d, 40, m.shadow);
      // Legs, then the top.
      [[x + 8, y + 8], [x + DK.w - 22, y + 8], [x + 8, y + DK.d - 22], [x + DK.w - 22, y + DK.d - 22]].forEach(([lx, ly]) => V.box(lx, ly, 0, 14, 14, DK.z, m.N2));
      V.box(x, y, DK.z, DK.w, DK.d, DK.slab, m.N);
      // The calendar at the back: the top page torn off to show the month it's due.
      if (place.month) {
        const cx = place.x + CAL.dx, cy = place.y + CAL.dy, fy = cy + CAL.d + 0.5;
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
        const bx = place.x + BIN.dx, by = place.y + BIN.dy + n * BIN.pitch;
        V.tray(bx, by, TOPZ, BIN.w, BIN.d, BIN.h, m.N2, M.design.mix(m.N2.top, m.ink, 0.05));
        V.quad([bx + BIN.w + 0.3, by + 12, TOPZ + 5], [bx + BIN.w + 0.3, by + BIN.d - 12, TOPZ + 5], [bx + BIN.w + 0.3, by + BIN.d - 12, TOPZ + 16], [bx + BIN.w + 0.3, by + 12, TOPZ + 16], m.PAPER.top);
      }
      // The in-tray, and the pile of answers growing in it as sheets land.
      const tx = place.x + TRAY.dx, ty = place.y + TRAY.dy;
      V.tray(tx, ty, TOPZ, TRAY.w, TRAY.d, TRAY.h, m.N2, M.design.mix(m.N2.top, m.ink, 0.05));
      pile(V, tx + 12, ty + 12, TOPZ + 2, TRAY.w - 24, TRAY.d - 24, 10 + landed(place, t) * 4.2, 7, m);
    },
    // Answers in flight: they lift off the earlier place and travel on the
    // camera's own easing, so on screen they drift steadily to the in-tray.
    drawMovers(V, place, t, W) {
      const mv = place.movers, from = mv && mv.from;
      if (!from || !from.def.unitPos) return;
      const n = from.dots || 100, F = flight(place), ctx = V.ctx, a0 = ctx.globalAlpha;
      const to = { x: place.x + TRAY.dx + 34, y: place.y + TRAY.dy + 30 };
      for (let s = 0; s < SHEETS; s++) {
        const q = M.world.clamp((t - mv.t0 - s * STAG) / F);
        if (q <= 0 || q >= 1) continue;
        const fr = from.def.unitPos(from, Math.floor((s + 0.5) / SHEETS * n * 0.9));
        const e = M.ease.glide(M.world.clamp((q - 0.12) / 0.8));
        const land = M.world.sstep(0.75, 1, q);
        const z = M.world.lerp(10, TOPZ + 12 + s * 4.2, land) + M.world.sstep(0, 0.2, q) * (1 - land) * LIFT;
        const x = M.world.lerp(fr.x, to.x, e), y = M.world.lerp(fr.y, to.y, e);
        ctx.globalAlpha = a0 * Math.min(1, q * 6);
        V.box(x, y, z, 66, 54, 1.5, W.mat.PAPER);
        writing(V, x, y, z + 1.6, 66, 54, 3, W.mat.line);
      }
      ctx.globalAlpha = a0;
    },
    icon(V, place, W) { pile(V, -26, -22, 0, 50, 44, 20, 5, W.mat); }
  });
})(typeof window !== 'undefined' ? window : globalThis);
