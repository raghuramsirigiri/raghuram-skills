/*!
 * motion-lib/audit.js — renders every frame of a cut with instrumentation on
 * and reports what a viewer would trip over. Staged for verification only;
 * finalize.js never inlines it.
 *
 *   const r = await VideoAudit.run({ cut: 'main' });     // { ok, fails, warns, stats }
 *   r.contactSheet()                                     // PNG data URL
 *   await VideoAudit.run({ cut: 'main', exportProbe: true })
 *   const r = await VideoAudit.run({ cut: 'main', scenes: ['e2'] });   // one scene, while drafting
 *   r.stills()                                           // [{ handle, id, png }] at each scene's hold
 *
 * Fails: a scene throws; text outside the safe zone; two text layers
 * overlapping; text below the minimum size; contrast below 4.5 (3 for large
 * text); a layer not held still long enough to read; nothing on screen by
 * 0.5 s; the stage's subject leaving its room while a beat holds, or a
 * stage label touching it (stage). Warns: single-frame pops, a frame held still longer than its read
 * needs (frozen), text near a box edge, a scene whose hold frame leaves too
 * much of the safe area empty (fill).
 *
 * With `scenes`, only those scenes' frames are painted and judged: the
 * layout, read-time, stage and fill checks run; the checks that need the
 * whole video (hook, pops, frozen, loop, export probe) wait for a full run.
 */
(function (root) {
  'use strict';
  const M = root.Motion;

  function rgbOf(str) {
    const m = /^#([0-9a-f]{6})/i.exec(str);
    if (m) { const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    const r = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(str);
    return r ? [+r[1], +r[2], +r[3]] : [0, 0, 0];
  }
  const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const tc = (t, fps) => {
    const m = Math.floor(t / 60), s = Math.floor(t % 60), f = Math.round((t - Math.floor(t)) * fps);
    return m + ':' + String(s).padStart(2, '0') + '.' + String(Math.min(f, fps - 1)).padStart(2, '0');
  };
  const intersects = (a, b) => a[0] + 1 < b[0] + b[2] - 1 && b[0] + 1 < a[0] + a[2] - 1 && a[1] + 2 < b[1] + b[3] - 2 && b[1] + 2 < a[1] + a[3] - 2;

  // Fill: how much of the safe area a scene's composition covers, on its
  // mid-hold frame. The safe area is cut into square cells a tenth of its
  // short side; a cell is inked when any pixel in it is clearly off the
  // background. A blank cell counts as empty space only when its neighbours
  // are blank too, so the gaps between lines and around a chart belong to the
  // composition and only real empty bands count against it. The accent
  // bar's strip is left out: it is the same on every scene. The closing
  // cards (source-card, outro) are measured but not warned on: their copy is
  // a name and a date, and they already grow to the frame.
  const FILL = { target: 0.6, cells: 10, tol: 28, exempt: ['source-card', 'outro'] };
  // Mean luminance change (0-255) between frames a second apart, on the
  // 64 px thumbnail, below which the picture counts as still; and how much
  // longer than its read a still stretch may run (a reveal's last, slowest
  // frames read as still too) before it counts as frozen.
  const FROZEN = 0.05, FROZEN_SLACK = 0.75;
  function fillOf(C, ctx, t) {
    const S = C.safe, R = M.layout.RULE;
    // Measured without the art: decoration doesn't stand in for layout.
    const art = C.art;
    C.art = null;
    try { M.seek(ctx, C, t, { frameT: t }); } finally { C.art = art; }
    const top = Math.round(S.y + R.accentH * 2 + 4);
    const x0 = Math.round(S.x), w = Math.round(S.w), h = Math.round(S.y + S.h) - top;
    const px = ctx.getImageData(x0, top, w, h).data;
    const bg = rgbOf(C.design.bg);
    const cell = Math.min(S.w, S.h) / FILL.cells;
    const nx = Math.max(1, Math.round(w / cell)), ny = Math.max(1, Math.round(h / cell));
    const ink = new Uint8Array(nx * ny);
    for (let y = 0; y < h; y += 2) {
      const cy = Math.min(ny - 1, Math.floor(y / h * ny));
      for (let x = 0; x < w; x += 2) {
        const i = (y * w + x) * 4;
        if (Math.abs(px[i] - bg[0]) > FILL.tol || Math.abs(px[i + 1] - bg[1]) > FILL.tol || Math.abs(px[i + 2] - bg[2]) > FILL.tol) {
          ink[cy * nx + Math.min(nx - 1, Math.floor(x / w * nx))] = 1;
        }
      }
    }
    let empty = 0;
    for (let cy = 0; cy < ny; cy++) {
      for (let cx = 0; cx < nx; cx++) {
        let any = 0;
        for (let dy = -1; dy <= 1 && !any; dy++) {
          for (let dx = -1; dx <= 1 && !any; dx++) {
            const a = cx + dx, b = cy + dy;
            if (a >= 0 && b >= 0 && a < nx && b < ny && ink[b * nx + a]) any = 1;
          }
        }
        if (!any) empty++;
      }
    }
    return 1 - empty / (nx * ny);
  }
  // Every scene's fill, measured on its mid-hold frame.
  function fills(C, ctx) {
    return C.scenes.map(s => ({ id: s.id, type: s.type, fill: +fillOf(C, ctx, (s.enterEnd + s.exitStart) / 2).toFixed(2) }));
  }

  async function run(opts) {
    opts = opts || {};
    const spec = opts.spec || M.readSpec();
    await M.fonts.ready(spec);
    if (!M.images || !Object.keys(M.images).length) await M.loadImages(spec);
    const cutName = opts.cut || Object.keys(spec.cuts)[0];
    const fails = [], warns = [];
    let C;
    try { C = M.compile(spec, cutName); } catch (e) { return { ok: false, fails: [{ check: 'compile', msg: e.message }], warns, stats: {} }; }
    const canvas = document.createElement('canvas');
    canvas.width = C.W; canvas.height = C.H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const tw = 64, th = Math.round(64 * C.H / C.W);
    const thumb = document.createElement('canvas');
    thumb.width = tw; thumb.height = th;
    const tctx = thumb.getContext('2d', { willReadFrequently: true });
    // Average the frame down properly: a plain resample drops thin text in
    // and out of the 64 px grid and reads as a pop that isn't there.
    tctx.imageSmoothingEnabled = true;
    tctx.imageSmoothingQuality = 'high';
    const S = C.safe, d = C.design;
    const handle = {};
    C.scenes.forEach((s, i) => { handle[s.id] = 'V' + (i + 1); });
    const hd = id => (handle[id] || id);
    // Scene mode: a draft checks the scenes it just wrote, not the whole video.
    const only = opts.scenes && opts.scenes.length ? C.scenes.filter(s => opts.scenes.indexOf(s.id) >= 0) : null;
    if (only && only.length !== opts.scenes.length) {
      const miss = opts.scenes.filter(id => !C.scenes.some(s => s.id === id));
      return { ok: false, fails: [{ check: 'scenes', msg: 'cut "' + cutName + '" has no scene ' + miss.map(id => '"' + id + '"').join(', ') }], warns, stats: {} };
    }
    const inScope = t => !only || only.some(s => t >= s.t0 && t < s.t1);

    const diffs = [];
    let prev = null;
    // Each frame against the one a second earlier, for the frozen check.
    const lag = [], ring = [];
    // Frames where a text layer's own words changed (a counter's step, a
    // kicker's swap): a jump there is the words, not a pop.
    const lastText = new Map(), textSteps = new Set();
    const still = new Map();     // layer key -> { start, last, bbox, text, best, role, words }
    const reported = new Set();
    const once = (key, arr, row) => { if (!reported.has(key)) { reported.add(key); arr.push(row); } };
    const t0 = performance.now();

    for (let n = 0; n < C.frames; n++) {
      const t = n / C.fps;
      if (!inScope(t)) continue;
      M.debug.record = [];
      try { M.seek(ctx, C, t, { frameT: t }); } catch (e) {
        const sc = C.scenes.find(s => t >= s.t0 && t < s.t1);
        once('throw:' + (sc && sc.id), fails, { check: 'throws', scene: sc && hd(sc.id), t: tc(t, C.fps), msg: e.message });
        M.debug.record = null;
        continue;
      }
      const all = M.debug.record.filter(r => !r.skip);
      M.debug.record = null;
      // The stage reports its shapes too; the text checks read the words.
      const shapes = all.filter(r => r.role === 'shape');
      const recs = all.filter(r => r.role !== 'shape');

      // Thumbnail diff for pops and dead time.
      tctx.drawImage(canvas, 0, 0, tw, th);
      const px = tctx.getImageData(0, 0, tw, th).data;
      const lum = new Float32Array(tw * th);
      for (let i = 0; i < lum.length; i++) lum[i] = 0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2];
      if (prev) { let s = 0; for (let i = 0; i < lum.length; i++) s += Math.abs(lum[i] - prev[i]); diffs.push(s / lum.length); } else diffs.push(0);
      prev = lum;
      const back = ring[n % C.fps];
      if (back) { let s = 0; for (let i = 0; i < lum.length; i++) s += Math.abs(lum[i] - back[i]); lag.push(s / lum.length); } else lag.push(Infinity);
      ring[n % C.fps] = lum;

      if (!only && n === Math.round(0.5 * C.fps) && !recs.some(r => r.alpha > 0.5)) {
        fails.push({ check: 'hook', t: tc(t, C.fps), msg: 'nothing readable on screen by 0.5 s' });
      }

      const seen = new Set();
      recs.forEach(r => {
        const lk = r.scene + '/' + r.layer;
        if (lastText.has(lk) && lastText.get(lk) !== r.text) textSteps.add(n);
        lastText.set(lk, r.text);
        const [x, y, w, h] = r.bbox;
        const key = r.scene + '/' + r.layer + '/' + r.text;
        seen.add(key);
        // Stage labels ride the world: the camera carries them, so they are
        // judged for size, contrast and touching the subject, not for
        // holding still or the safe zone.
        const onStage = r.role === 'stage';
        const moving = r.phase === 'transition' || r.phase === 'exit' || onStage;
        if (r.alpha > 0.5) {
          if (!moving && (x < S.x - 2 || y < S.y - 2 || x + w > S.x + S.w + 2 || y + h > S.y + S.h + 2)) {
            once('safe:' + key, fails, { check: 'safe-zone', scene: hd(r.scene), t: tc(t, C.fps), msg: '"' + r.text.slice(0, 40) + '" leaves the safe zone (' + [x, y, w, h].map(Math.round).join(',') + ')' });
          }
          if (r.size && r.size < M.layout.MIN_TEXT) once('size:' + key, fails, { check: 'size', scene: hd(r.scene), msg: '"' + r.text.slice(0, 40) + '" is ' + r.size.toFixed(1) + 'px, below ' + M.layout.MIN_TEXT });
          const need = r.large ? 3 : 4.5;
          const ratio = M.design.contrast(hex(rgbOf(r.color)), d.bg);
          if (ratio < need) once('contrast:' + r.scene + r.layer + r.color, fails, { check: 'contrast', scene: hd(r.scene), msg: '"' + r.text.slice(0, 40) + '" ' + r.color + ' on ' + d.bg + ' is ' + ratio.toFixed(2) + ':1, needs ' + need });
        }
        // Read time: how long has this exact text sat fully revealed and still?
        // Words carried through a transition (a world label in a pan) aren't being read.
        const st = still.get(key);
        const solid = r.alpha >= 0.99 && r.phase !== 'transition' && !onStage;
        const same = st && st.bbox.every((v, i) => Math.abs(v - r.bbox[i]) < 0.5);
        if (solid && st && same && st.last === n - 1) { st.last = n; }
        else if (solid) { const best = st ? st.best : 0; still.set(key, { start: n, last: n, bbox: r.bbox.slice(), best, role: r.role, text: r.text, scene: r.scene }); }
        const s2 = still.get(key);
        if (s2) s2.best = Math.max(s2.best, (s2.last - s2.start + 1) / C.fps);
      });

      // Overlap between different layers, both visible.
      const vis = recs.filter(r => r.alpha > 0.3 && r.phase !== 'transition');
      for (let i = 0; i < vis.length; i++) {
        for (let j = i + 1; j < vis.length; j++) {
          const a = vis[i], b = vis[j];
          if (a.scene === b.scene && a.layer === b.layer) continue;
          if (intersects(a.bbox, b.bbox)) {
            once('overlap:' + [a.layer, b.layer].sort().join('|'), fails, { check: 'overlap', scene: hd(a.scene), t: tc(t, C.fps), msg: '"' + a.text.slice(0, 30) + '" overlaps "' + b.text.slice(0, 30) + '"' });
          }
        }
      }

      if (shapes.length) stageChecks(t, recs, shapes);
    }

    // The stage. While a beat holds, its subject (and anything the shape
    // calls the subject) sits wholly inside the beat's stage room, clear of
    // the card's words and above the footer. A stage label never touches
    // the subject.
    function stageChecks(t, recs, shapes) {
      const sc = C.scenes.find(s => t >= s.enterEnd && t < s.exitStart);
      const vis = shapes.filter(r => r.alpha > 0.06 && r.kind !== 'shadow');
      const subj = vis.filter(r => r.owner === 'subject');
      recs.filter(r => r.role === 'stage' && r.alpha > 0.3).forEach(w => {
        const hit = subj.find(sh => intersects(w.bbox, sh.bbox));
        if (hit) once('stage-label:' + w.text, fails, { check: 'stage', scene: hd(w.scene), t: tc(t, C.fps), msg: 'the stage label "' + w.text.slice(0, 30) + '" touches the subject' });
      });
      if (!sc || !sc.stageBox || !subj.length) return;
      const B = sc.stageBox;
      const x0 = Math.min(...subj.map(r => r.bbox[0])), y0 = Math.min(...subj.map(r => r.bbox[1]));
      const x1 = Math.max(...subj.map(r => r.bbox[0] + r.bbox[2])), y1 = Math.max(...subj.map(r => r.bbox[1] + r.bbox[3]));
      const F = M.stage.FADE * 0.5;
      const inner = B.inner || {};
      const out = (inner.top && y0 < B.y + F) || (inner.left && x0 < B.x + F) || (inner.bottom && y1 > B.y + B.h - F) || x0 < -1 || x1 > C.W + 1 || y0 < -1;
      if (out) once('stage:' + sc.id, fails, { check: 'stage', scene: hd(sc.id), t: tc(t, C.fps), msg: 'the subject spans ' + [x0, y0, x1, y1].map(Math.round).join(',') + ': it must sit inside its stage room (' + [B.x, B.y, B.x + B.w, B.y + B.h].map(Math.round).join(',') + '), clear of the soft edges, while the beat holds — lower its zoom or its look' });
    }
    const ms = performance.now() - t0;

    // Read-time verdicts.
    const finalHold = C.scenes[C.scenes.length - 1];
    // Judge each layer by its longest-held text: a counter's rolling values and
    // a line's per-word records are steps on the way to that text.
    const byLayer = new Map();
    still.forEach((st, key) => {
      const lk = key.slice(0, key.lastIndexOf('/'));
      const cur = byLayer.get(lk);
      if (!cur || st.best > cur[1].best) byLayer.set(lk, [key, st]);
    });
    byLayer.forEach(([key, st]) => {
      if (st.role === 'value-glyph' || st.role === 'tick') return;
      const sc = C.scenes.find(s => s.id === st.scene);
      const layerId = key.split('/')[1];
      const L = sc && sc.layers.find(l => l.id === layerId);
      const words = L && L.lines ? L.lines.reduce((n, ln) => n + M.text.wordCount(ln.text), 0) : M.text.wordCount(st.text);
      let need = st.role === 'value' ? M.READ.number : st.role === 'label' || st.role === 'source' ? M.READ.min : M.readTime(words);
      if (sc === finalHold) need = Math.min(need, Math.max(M.READ.final, sc.read));
      if (st.best + 1 / C.fps < need) {
        fails.push({ check: 'read-time', scene: hd(st.scene), msg: '"' + st.text.slice(0, 40) + '" holds still ' + st.best.toFixed(2) + ' s, needs ' + need.toFixed(2) + ' s' });
      }
    });

    // Pops: a frame-diff spike far above its neighbours, not at a hard cut.
    const cutFrames = new Set();
    C.scenes.forEach(s => {
      if (s.index > 0 && s.trIn.name === 'cut') cutFrames.add(Math.round(s.t0 * C.fps));
    });
    const pops = [];
    for (let n = 2; n < diffs.length - 2; n++) {
      const win = diffs.slice(Math.max(1, n - 8), n).concat(diffs.slice(n + 1, n + 9)).sort((a, b) => a - b);
      const med = win[Math.floor(win.length / 2)] || 0;
      // A pop is one frame that jumps while its neighbours barely move.
      const around = Math.max(diffs[n - 1], diffs[n + 1], 0.1);
      if (diffs[n] > 1.5 && diffs[n] > 5 * around && diffs[n] > 6 * Math.max(med, 0.15) && !cutFrames.has(n) && !textSteps.has(n)) pops.push(n);
    }
    if (pops.length && !only) warns.push({ check: 'pops', msg: 'single-frame jumps at frames ' + pops.slice(0, 12).join(', ') + (pops.length > 12 ? '…' : '') + ' — look at them in the player (← →)' });

    // Frozen: a still frame held longer than the reading it is there for.
    // A hold as long as its read needs is fine (the engine sets auto holds to
    // exactly that); one stretched past it by a long `dur`, or a custom
    // painter that stops, reads as the video freezing.
    let run0 = -1;
    for (let n = 0; !only && n <= lag.length; n++) {
      const quiet = n < lag.length && lag[n] < FROZEN;
      if (quiet && run0 < 0) run0 = n;
      if (!quiet && run0 >= 0) {
        const s0 = (run0 - C.fps) / C.fps, s1 = n / C.fps, mid = (s0 + s1) / 2;
        const sc = C.scenes.find(s => mid >= s.t0 && mid < s.t1) || finalHold;
        const allow = sc.read + FROZEN_SLACK;
        if (s1 - s0 > allow) {
          warns.push({ check: 'frozen', scene: hd(sc.id), t: tc(s0, C.fps), msg: (s1 - s0).toFixed(1) + ' s with nothing moving, ' + (s1 - s0 - sc.read).toFixed(1) + ' s more than its read needs (' + sc.read.toFixed(1) + ' s) — the frame looks frozen; drop its `dur` or add a finding' });
        }
        run0 = -1;
      }
    }

    if (opts.loop && !only) {
      M.seek(ctx, C, 0); const a = ctx.getImageData(0, 0, C.W, C.H).data;
      M.seek(ctx, C, C.duration - 1 / C.fps); const b = ctx.getImageData(0, 0, C.W, C.H).data;
      let s = 0; for (let i = 0; i < a.length; i += 16) s += Math.abs(a[i] - b[i]);
      if (s / (a.length / 16) > 2) fails.push({ check: 'loop', msg: 'first and last frames differ; the loop will jump' });
    }

    const fill = fills(C, ctx).filter(f => !only || only.some(s => s.id === f.id));
    fill.forEach(f => {
      if (f.fill < FILL.target && FILL.exempt.indexOf(f.type) < 0) warns.push({ check: 'fill', scene: hd(f.id), msg: f.type + ' covers ' + Math.round(f.fill * 100) + '% of the safe area on its hold frame, under ' + Math.round(FILL.target * 100) + '% — lay it out for the ' + C.cls + ' frame (references/formats.md § Layout per format)' });
    });

    let probe = null;
    if (opts.exportProbe && !only) {
      if (!M.exportVideo) warns.push({ check: 'export-probe', msg: 'export.js is not loaded' });
      else {
        try { probe = await M.exportVideo({ spec, cut: cutName, seconds: Math.min(2, C.duration), probe: true }); if (!probe.ok) fails.push({ check: 'export-probe', msg: probe.message }); }
        catch (e) { fails.push({ check: 'export-probe', msg: e.message }); }
      }
    }

    const stats = {
      cut: cutName, format: C.format, frames: C.frames, duration: +C.duration.toFixed(3), fps: C.fps,
      msPerFrame: +(ms / C.frames).toFixed(2), fill: fill.map(f => ({ handle: hd(f.id), type: f.type, fill: f.fill })), scenes: C.scenes.map(s => ({ handle: hd(s.id), id: s.id, type: s.type, from: tc(s.t0, C.fps), to: tc(s.t1, C.fps) })),
      exportPath: probe && probe.path, scope: only ? only.map(s => hd(s.id)) : 'all'
    };
    if (!only) stats.lag = { min: +Math.min(...lag).toFixed(3), median: +lag.filter(isFinite).sort((a, b) => a - b)[Math.floor(lag.filter(isFinite).length / 2)].toFixed(3) };
    return { ok: fails.length === 0, fails, warns, stats, probe, contactSheet: () => contactSheet(spec, C), stills: () => stills(C, only || C.scenes, hd) };
  }

  // One frame per scene at the middle of its hold, to look at a draft
  // scene by scene before the whole video is built.
  function stills(C, scenes, hd) {
    const cv = document.createElement('canvas');
    cv.width = C.W; cv.height = C.H;
    const cx = cv.getContext('2d');
    return scenes.map(s => {
      const t = (s.enterEnd + s.exitStart) / 2;
      M.seek(cx, C, t, { frameT: t });
      return { handle: hd(s.id), id: s.id, t: tc(t, C.fps), png: cv.toDataURL('image/png') };
    });
  }

  // The contact sheet is the player's (player.js), so the page and the audit
  // produce the same sheet.
  function contactSheet(spec, C) {
    if (!M.player) throw new Error('player.js is not loaded');
    return M.player.contactSheet(C);
  }

  root.VideoAudit = { run, contactSheet, fills, FILL };
})(typeof window !== 'undefined' ? window : globalThis);
