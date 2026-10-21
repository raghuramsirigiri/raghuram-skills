/*!
 * motion-lib/paint.js — drawing helpers over the 2D context, and the
 * instrumentation the audit reads.
 *
 * Every helper saves and restores what it changes (a helper that leaves
 * globalAlpha changed makes the next fading card pop). When
 * Motion.debug.record is an array, every text draw pushes
 * { scene, layer, role, text, bbox, alpha, size } into it; when it is null the
 * paint pays nothing.
 */
(function (root) {
  'use strict';
  const M = root.Motion = root.Motion || {};
  M.debug = M.debug || { record: null, scene: null };

  function rect(ctx, x, y, w, h, color, r) {
    if (w <= 0 || h <= 0) return;
    ctx.save();
    ctx.fillStyle = color;
    if (r && ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); ctx.fill(); }
    else ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  function line(ctx, x1, y1, x2, y2, color, width, dash) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'butt';
    if (dash && ctx.setLineDash) ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.restore();
  }

  // A polyline drawn to fraction p of its length; null points break it (a gap is a gap).
  function polyline(ctx, pts, p, color, width, dash) {
    const segs = [];
    let cur = [];
    pts.forEach(pt => { if (pt) cur.push(pt); else { if (cur.length) segs.push(cur); cur = []; } });
    if (cur.length) segs.push(cur);
    // Total length across segments, gaps counted by their x span so the pen keeps time.
    const flat = pts.filter(Boolean);
    if (flat.length < 2) return null;
    const x0 = flat[0][0], x1 = flat[flat.length - 1][0];
    const xEnd = x0 + (x1 - x0) * Math.max(0, Math.min(1, p));
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (dash && ctx.setLineDash) ctx.setLineDash(dash);
    let tip = null;
    for (const s of segs) {
      if (s[0][0] > xEnd) break;
      ctx.beginPath();
      ctx.moveTo(s[0][0], s[0][1]);
      tip = s[0];
      for (let i = 1; i < s.length; i++) {
        const a = s[i - 1], b = s[i];
        if (b[0] <= xEnd) { ctx.lineTo(b[0], b[1]); tip = b; }
        else {
          const f = (xEnd - a[0]) / (b[0] - a[0] || 1);
          tip = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
          ctx.lineTo(tip[0], tip[1]);
          break;
        }
      }
      ctx.stroke();
    }
    ctx.restore();
    return tip;
  }

  function dot(ctx, x, y, r, color) {
    ctx.save(); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  // Diagonal hatching inside a rect: the mark of a forecast or a plan value.
  function hatch(ctx, x, y, w, h, color, gap, width) {
    if (w <= 0 || h <= 0) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.strokeStyle = color; ctx.lineWidth = width || 3;
    ctx.beginPath();
    const g = gap || 14;
    for (let d = -h; d < w; d += g) { ctx.moveTo(x + d, y + h); ctx.lineTo(x + d + h, y); }
    ctx.stroke();
    ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    ctx.restore();
  }

  // Text. Draws at line-box top `y` with height `h` (textBaseline middle).
  function text(ctx, str, x, y, o) {
    const a = o.alpha == null ? 1 : o.alpha;
    if (a <= 0.001 || !str) return;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.font = o.font;
    ctx.fillStyle = o.color;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(str, x, y + o.h / 2);
    const rec = M.debug.record;
    if (rec) {
      const w = o.w != null ? o.w : ctx.measureText(str).width;
      const m = ctx.getTransform ? ctx.getTransform() : null;
      // Report the box in frame pixels, through any camera transform, cut to
      // the reveal mask when there is one (masked text outside it isn't seen).
      let bx = x, by = y, bw = w, bh = o.h;
      if (o.clip) {
        const [cx, cy, cw, ch] = o.clip;
        const x2 = Math.min(bx + bw, cx + cw), y2 = Math.min(by + bh, cy + ch);
        bx = Math.max(bx, cx); by = Math.max(by, cy); bw = Math.max(0, x2 - bx); bh = Math.max(0, y2 - by);
      }
      if (m && (m.a !== 1 || m.d !== 1 || m.e || m.f)) {
        bx = m.a * bx + m.e; by = m.d * by + m.f; bw = bw * m.a; bh = bh * m.d;
      }
      if (bw > 0 && bh > 0) {
        rec.push({
          scene: M.debug.scene, phase: M.debug.phase, layer: o.layer || null, role: o.role || null, text: str,
          bbox: [bx, by, bw, bh], alpha: ctx.globalAlpha, size: o.size || 0, color: o.color, large: !!o.large
        });
      }
    }
    ctx.restore();
  }

  // Seeded film grain (off unless meta.grain): a fixed noise tile, offset per frame by the hash.
  function grain(ctx, W, H, frame, seed, amount) {
    if (!amount) return;
    const rng = M.rng(seed, 'grain', frame);
    ctx.save();
    ctx.globalAlpha = amount;
    for (let i = 0; i < 1400; i++) {
      const v = rng() < 0.5 ? 0 : 255;
      ctx.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
      ctx.fillRect(rng() * W, rng() * H, 2, 2);
    }
    ctx.restore();
  }

  function clipRect(ctx, x, y, w, h) { ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); }

  M.paint = { rect, line, polyline, dot, hatch, text, grain, clipRect };
  if (typeof module !== 'undefined' && module.exports) module.exports = M.paint;
})(typeof window !== 'undefined' ? window : globalThis);
