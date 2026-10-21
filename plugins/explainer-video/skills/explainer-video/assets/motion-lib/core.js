/*!
 * motion-lib/core.js — compile a spec into a timeline; paint any frame.
 *
 *   const C = Motion.compile(spec, 'main');      // pure; throws naming the scene
 *   Motion.seek(ctx, C, t, { frameT });           // paints the frame at time t
 *
 * Every frame is a pure function of t. No timers, no Math.random, no state
 * carried between frames: frames can be drawn in any order (export, motion
 * blur, the audit) and come out the same.
 *
 * A scene's local timeline:
 *
 *   t0 ── ovIn ──┬── enter ──┬── read (hold) ──┬── exit ──┬── ovOut ── t1
 *   (transition  │ layers    │ every layer     │ layers   │ (transition
 *    from prev)  │ reveal    │ revealed, still │ leave    │  to next)
 *
 * ovIn of a scene is the same stretch of time as ovOut of the one before, so
 * outgoing text has always left before incoming text arrives. A transition
 * that "owns the exit" (cut, flood, scan, push) skips the outgoing exit and
 * moves the outgoing hold frame itself.
 */
(function (root) {
  'use strict';
  const M = root.Motion = root.Motion || {};
  M.scenes = M.scenes || {};
  M.custom = M.custom || {};
  M.version = '1.0.0';

  // ── seeded hash rng: stable for (seed, keys) whatever the draw order ──
  function hashStr(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed, ...keys) {
    let a = hashStr(String(seed) + '|' + keys.join('|'));
    return function () {   // mulberry32
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function registerScene(def) {
    if (!def || !def.type || typeof def.build !== 'function') throw new Error('registerScene: need { type, build }');
    M.scenes[def.type] = def;
  }

  // ── read-time rule ───────────────────────────────────────────────────
  // Each reading layer holds, fully revealed and still, for
  // max(1.2 s, 0.6 s + 0.3 s per word). A big number holds 1.5 s after it lands.
  const READ = { min: 1.2, base: 0.6, perWord: 0.3, number: 1.5, source: 2.0, final: 1.0 };
  const readTime = words => Math.max(READ.min, READ.base + READ.perWord * words);
  const EXIT = 0.35;

  // ── claims → copy ────────────────────────────────────────────────────
  // Copy refers to figures by claim id: "{F1}" inside a string, or a slot
  // whose whole value is "F1". Typed numbers are a lint failure (check-video).
  function resolver(spec) {
    const claims = {};
    (spec.claims || []).forEach(c => { claims[c.id] = c; });
    const sources = {};
    (spec.sources || []).forEach(s => { sources[s.id] = s; });
    const data = {};
    (spec.data || []).forEach(d => { data[d.id] = d; });
    function claim(id, where) {
      const c = claims[id];
      if (!c) throw new Error(where + ': unknown claim "' + id + '"');
      return c;
    }
    function fill(str, where, used) {
      if (str == null) return '';
      return String(str).replace(/\{([A-Za-z][\w.-]*)\}/g, (_, id) => {
        const c = claim(id, where);
        if (used) used.add(id);
        return c.display != null ? c.display : String(c.value);
      });
    }
    return { claims, sources, data, claim, fill };
  }

  // ── compile ──────────────────────────────────────────────────────────
  function compile(spec, cutName, opts) {
    opts = opts || {};
    if (!spec || !spec.meta) throw new Error('spec: missing "meta"');
    const cuts = spec.cuts || {};
    const name = cutName || Object.keys(cuts)[0];
    const cut = cuts[name];
    if (!cut) throw new Error('spec: no cut named "' + name + '"');
    const fr = M.layout.frame(cut.format || '9:16');
    const fps = spec.meta.fps || 30;
    if ([24, 25, 30, 60].indexOf(fps) < 0) throw new Error('meta.fps must be 24, 25, 30 or 60');
    const design = M.design.resolve(spec.meta);
    const R = resolver(spec);
    const ctx = opts.measure || M.measureContext();
    const byId = {};
    (spec.scenes || []).forEach(s => { byId[s.id] = s; });

    const list = cut.scenes.map((id, i) => {
      const s = byId[id];
      if (!s) throw new Error('cut "' + name + '": no scene with id "' + id + '"');
      const def = M.scenes[s.type];
      if (!def) throw new Error('scene "' + id + '": unknown type "' + s.type + '"');
      const used = new Set();
      const api = {
        ctx, frame: fr, design, spec, R, index: i, sceneId: id,
        copy: (slot, fallback) => R.fill(s.copy && s.copy[slot] != null ? s.copy[slot] : fallback, 'scene "' + id + '" copy.' + slot, used),
        claim: cid => { used.add(cid); return R.claim(cid, 'scene "' + id + '"'); },
        used: () => [...used],
        trIn: i === 0 ? M.transitions.get('cut') : M.transitions.get(s.transitionIn || 'mask-up'),
        T: M.text, L: M.layout
      };
      let built;
      try { built = def.build(s, api); } catch (e) { throw new Error('scene "' + id + '" (' + s.type + '): ' + e.message); }
      const rv = api.trIn.reveal || 'mask-up';
      built.layers.forEach(l => { if (l.kind === 'text' && !l.reveal) l.reveal = rv; });
      return { spec: s, def, built, used: [...used], id, type: s.type };
    });

    // Timing.
    const scenes = [];
    let t = 0;
    list.forEach((it, i) => {
      const b = it.built;
      const nextSpec = list[i + 1] && list[i + 1].spec;
      const trIn = i === 0 ? M.transitions.get('cut') : M.transitions.get(it.spec.transitionIn || 'mask-up');
      const trOut = nextSpec ? M.transitions.get(nextSpec.transitionIn || 'mask-up') : null;
      const last = i === list.length - 1;
      const enter = b.layers.reduce((mx, l) => Math.max(mx, (l.at || 0) + (l.dur || 0)), 0);
      const read = b.read != null ? b.read : 1.2;
      const exit = last || (trOut && trOut.ownsExit) ? 0 : EXIT;
      const holdFloor = last ? Math.max(read, READ.final) : read;
      const minDur = enter + holdFloor + exit;
      let dur = minDur;
      if (it.spec.dur != null && it.spec.dur !== 'auto') {
        const d = +it.spec.dur;
        if (!(d > 0)) throw new Error('scene "' + it.id + '": dur must be "auto" or seconds');
        if (d + 1e-6 < minDur) {
          throw new Error('scene "' + it.id + '": dur ' + d + ' s is below its minimum ' + minDur.toFixed(2) +
            ' s (enter ' + enter.toFixed(2) + ' + read ' + holdFloor.toFixed(2) + ' + exit ' + exit.toFixed(2) + ')');
        }
        dur = d;
      }
      const ovIn = i === 0 ? 0 : trIn.dur;
      const ovOut = trOut ? trOut.dur : 0;
      const t0 = i === 0 ? 0 : t - ovIn;
      const cStart = t0 + ovIn;
      const exitStart = cStart + dur - exit;
      const cEnd = cStart + dur;
      const t1 = cEnd + ovOut;
      scenes.push({
        id: it.id, type: it.type, index: i, def: it.def, spec: it.spec, built: b,
        layers: b.layers, rule: b.rule || null, used: it.used,
        t0, t1, cStart, enterEnd: cStart + enter, exitStart, cEnd, ovIn, ovOut,
        enter, read: holdFloor, exit, minDur, dur, trIn, trOut, last
      });
      t = cEnd + ovOut;
    });
    // The last scene has no ovOut, so t is its content end. Whole frames.
    const frames = Math.round(t * fps);
    const duration = frames / fps;

    // Beat snapping (soundtrack on with a bpm): not moving scenes, just reporting the grid.
    const bpm = spec.meta.audio && spec.meta.audio.score && spec.meta.audio.score !== 'off' ? (spec.meta.audio.bpm || 112) : null;

    return {
      cut: name, format: fr.format, W: fr.W, H: fr.H, cls: fr.cls, safe: fr.safe, fps, frames, duration,
      scenes, design, seed: spec.meta.seed || 0, grain: spec.meta.grain || 0, bpm, spec, R,
      images: opts.images || M.images || {}
    };
  }

  // ── layer rendering ──────────────────────────────────────────────────
  // Reveal styles. p is eased 0..1 entering; e is eased 0..1 exiting.
  function drawLayer(ctx, C, sc, L, lt, frameLt) {
    const d = C.design;
    const at = L.at || 0, dur = L.dur || 0.0001;
    if (lt < at) return;
    const raw = Math.min(1, (lt - at) / dur);
    const p = M.ease.get(L.ease || 'outQuint')(raw);
    const exitLen = sc.exit;
    const ex = exitLen > 0 ? Math.max(0, Math.min(1, (lt - (sc.exitStart - sc.cStart)) / exitLen)) : 0;
    const e = M.ease.expoIn(ex);
    if (e >= 1) return;
    ctx.save();
    M.debug.scene = sc.id;
    if (M.debug.record && M.debug.phase !== 'transition') M.debug.phase = e > 0 ? 'exit' : raw < 1 ? 'enter' : 'hold';
    if (e > 0) { ctx.globalAlpha *= 1 - e; ctx.translate(0, -24 * e); }

    if (L.kind === 'text') drawText(ctx, L, p, raw, lt);
    else if (L.kind === 'counter') drawCounter(ctx, C, L, frameLt == null ? lt : frameLt);
    else if (L.kind === 'rect') {
      const g = L.grow || 'x';
      const w = g === 'x' ? L.w * p : L.w, h = g === 'y' ? L.h * p : L.h;
      const y = g === 'y' && L.fromBottom ? L.y + L.h - h : L.y;
      const x = g === 'x' && L.fromRight ? L.x + L.w - w : L.x;
      if (L.hatch) M.paint.hatch(ctx, x, y, w, h, L.color, 14, 3);
      else M.paint.rect(ctx, x, y, w, h, L.color);
    } else if (L.kind === 'hair') {
      const w = L.w * p;
      M.paint.line(ctx, L.x, L.y, L.x + w, L.y, L.color, L.width || M.layout.RULE.hair, L.dash);
    } else if (L.kind === 'draw') {
      L.fn(ctx, p, { lt, raw, C, sc, design: d, paint: M.paint, text: M.text, frameLt: frameLt == null ? lt : frameLt });
    } else if (L.kind === 'image') {
      const img = C.images[L.src];
      if (img) {
        ctx.globalAlpha *= p;
        const s = L.scale ? L.scale(lt) : 1;
        ctx.save();
        M.paint.clipRect(ctx, L.x, L.y, L.w, L.h);
        const iw = img.width, ih = img.height;
        const k = Math.max(L.w / iw, L.h / ih) * s;
        ctx.drawImage(img, L.x + (L.w - iw * k) / 2, L.y + (L.h - ih * k) / 2, iw * k, ih * k);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function drawText(ctx, L, p, raw, lt) {
    const style = L.reveal || 'mask-up';
    const lines = L.lines;
    const n = lines.length;
    lines.forEach((ln, i) => {
      if (style === 'fade') {
        M.paint.text(ctx, ln.text, ln.x, ln.y, { font: L.font, color: L.color, h: ln.h, w: ln.w, alpha: p, layer: L.id, role: L.role, size: L.size, large: L.large });
        return;
      }
      if (style === 'brighten') {
        // Words go from muted to ink in reading order; the text is all there from the start.
        const words = ln.words, total = L.wordTotal || 1;
        const shown = M.ease.outQuint(M.ease.clamp01((lt - (L.at || 0)) / 0.35));   // the muted text fades in first
        words.forEach((w, j) => {
          const idx = (L.wordIndex ? L.wordIndex[i] : 0) + j;
          const q = M.ease.clamp01(raw * total - idx);
          M.paint.text(ctx, w.text, w.x, ln.y, { font: L.font, color: L.from || L.color, h: ln.h, w: w.w, alpha: (1 - q) * shown, layer: L.id, role: L.role, size: L.size, large: L.large });
          M.paint.text(ctx, w.text, w.x, ln.y, { font: L.font, color: L.color, h: ln.h, w: w.w, alpha: q, layer: L.id, role: L.role, size: L.size, large: L.large });
        });
        return;
      }
      if (style === 'words') {
        // Words rise through the line's mask, staggered.
        const words = ln.words, total = L.wordTotal || words.length;
        const stag = L.stagger || 0.07;
        words.forEach((w, j) => {
          const idx = (L.wordIndex ? L.wordIndex[i] : 0) + j;
          const local = M.ease.clamp01((lt - (L.at || 0) - idx * stag) / Math.max(0.05, (L.dur || 0.5) - stag * (total - 1)));
          const q = M.ease.outQuint(local);
          if (q <= 0) return;
          ctx.save();
          M.paint.clipRect(ctx, w.x - 4, ln.y - 2, w.w + 8, ln.h + 4);
          M.paint.text(ctx, w.text, w.x, ln.y + (1 - q) * ln.h, { clip: [w.x - 4, ln.y - 2, w.w + 8, ln.h + 4], font: L.font, color: L.color, h: ln.h, w: w.w, alpha: Math.min(1, q * 1.5), layer: L.id, role: L.role, size: L.size, large: L.large });
          ctx.restore();
        });
        return;
      }
      // mask-up (default) / mask-left: each line rises (or slides) through its own mask, lines staggered.
      const stag = n > 1 ? Math.min(0.1, 0.3 / n) : 0;
      const own = Math.max(0.15, (L.dur || 0.6) - stag * (n - 1));
      const q = M.ease.outQuint(M.ease.clamp01((lt - (L.at || 0) - i * stag) / own));
      if (q <= 0) return;
      ctx.save();
      // mask-left reveals from the line's own left edge: nothing shows outside it.
      const cl = style === 'mask-left' ? [ln.x, ln.y - 4, ln.w + 6, ln.h + 8] : [ln.x - 6, ln.y - 4, ln.w + 12, ln.h + 8];
      M.paint.clipRect(ctx, cl[0], cl[1], cl[2], cl[3]);
      const dx = style === 'mask-left' ? -(1 - q) * Math.min(ln.w, 200) : 0;
      const dy = style === 'mask-left' ? 0 : (1 - q) * ln.h;
      M.paint.text(ctx, ln.text, ln.x + dx, ln.y + dy, { clip: cl, font: L.font, color: L.color, h: ln.h, w: ln.w, alpha: Math.min(1, q * 1.4), layer: L.id, role: L.role, size: L.size, large: L.large });
      ctx.restore();
    });
  }

  // Counters read the frame's own time, never the motion-blur subframe time,
  // or the digits smear. They roll on expo-out to the exact value and settle.
  function drawCounter(ctx, C, L, lt) {
    const raw = M.ease.clamp01((lt - (L.at || 0)) / (L.dur || 1));
    const p = M.ease.expoOut(raw);
    if (raw <= 0) return;
    const parsed = L.parsed;
    const str = raw >= 1 || !parsed ? L.display : M.text.formatLike(parsed, parsed.value * p);
    const tab = M.text.tabular(ctx, str, L.font);
    const full = M.text.tabular(ctx, L.display, L.font);
    let x = L.align === 'center' ? L.x + (L.boxW - full.w) / 2 : L.x;
    // Right-align the rolling digits inside the final width so the unit stays put.
    x += full.w - tab.w;
    const alpha = Math.min(1, raw * 4);
    const r0 = M.debug.record ? M.debug.record.length : 0;
    tab.parts.forEach(pt => {
      const cx = x + pt.x + (pt.w - M.text.measure(ctx, pt.ch, L.font)) / 2;
      M.paint.text(ctx, pt.ch, cx, L.y, { font: L.font, color: L.color, h: L.h, w: pt.w, alpha, layer: L.id + '#' + pt.x, role: 'value-glyph', size: L.size, large: true });
    });
    if (M.debug.record) {
      // One record for the whole number, for overlap/read checks.
      const r = M.debug.record;
      for (let i = r0; i < r.length; i++) r[i].skip = true;
      r.push({ scene: M.debug.scene, phase: M.debug.phase, layer: L.id, role: L.role || 'value', text: str, bbox: [x, L.y, tab.w, L.h], alpha: ctx.globalAlpha * alpha, size: L.size, color: L.color, large: true });
    }
  }

  // The through-line: an accent bar that persists across scenes and carries
  // the transitions. Each scene says where its bar sits (or null).
  function ruleAt(C, sc, lt) {
    const r = sc.rule;
    if (!r) return null;
    const prev = C.scenes[sc.index - 1];
    // A first appearance draws in from zero width.
    if (!prev || !prev.rule || sc.trIn.name === 'cut') {
      const p = M.ease.outQuint(M.ease.clamp01((lt - sc.ovIn) / 0.5));
      return { x: r.x, y: r.y, w: r.w * p, h: r.h };
    }
    return r;
  }

  function paintScene(ctx, C, sc, t, frameT) {
    let lt = t - sc.cStart;
    const flt = frameT == null ? null : frameT - sc.cStart;
    if (sc.camera) {
      const s = sc.camera(t - sc.t0);
      ctx.save();
      ctx.translate(C.W / 2, C.H / 2); ctx.scale(s, s); ctx.translate(-C.W / 2, -C.H / 2);
    }
    for (const L of sc.layers) drawLayer(ctx, C, sc, L, lt, flt);
    if (sc.camera) ctx.restore();
  }

  function background(ctx, C) {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.design.bg;
    ctx.fillRect(0, 0, C.W, C.H);
    ctx.restore();
  }

  function drawRule(ctx, C, r) {
    if (r && r.w > 0.5) M.paint.rect(ctx, r.x, r.y, r.w, r.h, C.design.subject);
  }

  // ── seek ─────────────────────────────────────────────────────────────
  function seek(ctx, C, t, o) {
    const frameT = o && o.frameT != null ? o.frameT : t;
    t = Math.max(0, Math.min(t, C.duration - 1e-9));
    background(ctx, C);
    const i = C.scenes.findIndex(s => t >= s.t0 && t < s.t1);
    const sc = C.scenes[i < 0 ? C.scenes.length - 1 : i];
    const next = C.scenes[sc.index + 1];
    if (next && t >= sc.cEnd) {
      // In the overlap between sc and next.
      const tr = next.trIn;
      const p = M.ease.clamp01((t - sc.cEnd) / (tr.dur || 1e-6));
      const ra = sc.rule, rb = next.rule;
      const g = M.ease.glide(p);
      let rule = null;
      if (ra && rb) rule = { x: ra.x + (rb.x - ra.x) * g, y: ra.y + (rb.y - ra.y) * g, w: ra.w + (rb.w - ra.w) * g, h: ra.h + (rb.h - ra.h) * g };
      else if (ra) rule = { x: ra.x, y: ra.y, w: ra.w * (1 - g), h: ra.h };
      else if (rb) rule = { x: rb.x, y: rb.y, w: rb.w * g, h: rb.h };
      const holdA = () => paintScene(ctx, C, sc, Math.min(t, sc.exitStart - 1e-6), Math.min(frameT, sc.exitStart - 1e-6));
      const drawB = () => paintScene(ctx, C, next, t, frameT);
      if (M.debug.record) M.debug.phase = 'transition';
      tr.draw(ctx, p, { C, A: sc, B: next, holdA, drawB, rule, drawRule: r => drawRule(ctx, C, r), background: () => background(ctx, C) });
      M.debug.phase = null;
    } else {
      paintScene(ctx, C, sc, t, frameT);
      drawRule(ctx, C, ruleAt(C, sc, t - sc.t0));
    }
    if (C.grain) M.paint.grain(ctx, C.W, C.H, Math.round(frameT * C.fps), C.seed, C.grain);
  }

  // Where each scene and transition sits, for the player's scrubber and the contact sheet.
  function marks(C) {
    const out = [];
    C.scenes.forEach(s => {
      out.push({ kind: 'scene', id: s.id, t: (s.enterEnd + s.exitStart) / 2, t0: s.t0, t1: s.t1 });
      if (s.ovOut > 0) out.push({ kind: 'transition', id: s.id + '→' + C.scenes[s.index + 1].id, t: s.cEnd + s.ovOut / 2 });
    });
    return out;
  }

  // A context for measuring text at compile time.
  let measureCtx = null;
  function measureContext() {
    if (measureCtx) return measureCtx;
    if (typeof OffscreenCanvas !== 'undefined') measureCtx = new OffscreenCanvas(8, 8).getContext('2d');
    else if (typeof document !== 'undefined') measureCtx = document.createElement('canvas').getContext('2d');
    else throw new Error('no canvas to measure text — pass { measure: ctx } to compile');
    return measureCtx;
  }

  function readSpec(id) {
    const el = document.getElementById(id || 'video-spec');
    if (!el) throw new Error('no <script type="application/json" id="video-spec"> in the page');
    return JSON.parse(el.textContent);
  }

  // Decode user images (data URIs) before the first frame.
  async function loadImages(spec) {
    const out = {};
    const srcs = new Set();
    if (spec.meta && spec.meta.brand && spec.meta.brand.logo) srcs.add(spec.meta.brand.logo);
    (spec.scenes || []).forEach(s => { if (s.copy && s.copy.image) srcs.add(s.copy.image); });
    for (const src of srcs) {
      try {
        const img = new Image();
        img.src = src;
        await img.decode();
        out[src] = img;
      } catch (e) { console.warn('[motion] image failed to decode'); }
    }
    M.images = out;
    return out;
  }

  Object.assign(M, { compile, seek, rng, registerScene, readTime, READ, EXIT, marks, measureContext, readSpec, loadImages, resolver, hashStr });
  if (typeof module !== 'undefined' && module.exports) module.exports = M;
})(typeof window !== 'undefined' ? window : globalThis);
