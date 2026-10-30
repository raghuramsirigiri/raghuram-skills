// film-lib/film.js: the film. A timeline of beats over one world, a camera
// that moves through it, the light of the time of day, and a fixed layer of
// words on top (act, caption, key, source) that never moves or zooms.
//
// A beat is { id, act, dur, cam, sky, cut, caption, key, setup(), update(t, s) }.
// setup() puts the world into the state the beat starts from; it runs every
// time the beat is entered, also when the viewer seeks, so a beat sets
// everything it shows rather than relying on the beat before. update(t, s)
// moves things: t runs 0..1 over the beat, s is seconds into it.
(function (root) {
  'use strict';
  const Film = root.Film = root.Film || {};
  const { V } = Film;

  const ease = Film.ease = {
    linear: t => t,
    inOut: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    out: t => 1 - Math.pow(1 - t, 3),
    in: t => t * t * t,
    clamp: t => Math.max(0, Math.min(1, t)),
    // t remapped to a window inside the beat: span(t, 0.2, 0.6) is 0 before 20%, 1 after 60%
    span: (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)))
  };

  // ── sky: the light of the time of day ────────────────────────────────
  // Monotone by design: time of day changes the sun's angle, the exposure
  // and the ground, never the palette.
  const SKY = {
    dawn: { light: [-0.85, -0.25, 0.32], exposure: 0.96, soft: 2.2 },
    day: { light: [-0.35, -0.6, 0.75], exposure: 1, soft: 1.6 },
    dusk: { light: [0.8, -0.35, 0.3], exposure: 0.85, soft: 2.2 },
    night: { light: [0.2, -0.5, 0.85], exposure: 0.5, soft: 2.5 },
    rain: { light: [-0.2, -0.4, 0.9], exposure: 0.8, soft: 4, rain: 1 }
  };
  Film.sky = function (s) {
    const k = typeof s === 'string' ? SKY[s] : s;
    Film._check('sky', k, 'unknown sky "' + s + '" (dawn, day, dusk, night, rain, or an object)');
    return Object.assign({ rain: 0 }, SKY.day, k, { light: V.norm(k.light || SKY.day.light) });
  };
  Film.mixSky = function (a, b, t) {
    a = Film.sky(a); b = Film.sky(b);
    const L = (x, y) => x + (y - x) * t;
    return { light: V.norm(V.lerp(a.light, b.light, t)), exposure: L(a.exposure, b.exposure),
      soft: L(a.soft, b.soft), rain: L(a.rain || 0, b.rain || 0) };
  };

  // ── verbs: how things move ────────────────────────────────────────────
  const verbs = Film.verbs = {};
  // A point and a heading a fraction t along a path of points.
  verbs.along = function (path, t) {
    const seg = [];
    let total = 0;
    for (let i = 0; i < path.length - 1; i++) { const l = V.len(V.sub(path[i + 1], path[i])); seg.push(l); total += l; }
    let d = ease.clamp(t) * total, i = 0;
    while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
    const a = path[i], b = path[i + 1] || a, f = seg[i] ? d / seg[i] : 0;
    const p = V.lerp(a, b, f), dir = V.sub(b, a);
    return { at: [p[0], p[1], p[2] || 0], heading: Math.atan2(dir[0], -dir[1]) * 180 / Math.PI, length: total };
  };
  // Put a thing on a path, facing the way it moves (its front is -y).
  verbs.move = function (g, path, t) {
    const a = verbs.along(path, t);
    g.set({ at: a.at, rot: a.heading });
    return a;
  };
  // A walk cycle: phase in steps (1 = one stride), amount 0..1.
  verbs.stride = function (fig, phase, amount, base) {
    const s = Math.sin(phase * Math.PI * 2) * (amount == null ? 1 : amount);
    fig.pose(Object.assign({}, base, {
      legL: [26 * s, 0], legR: [-26 * s, 0], kneeL: Math.max(0, -s) * 28, kneeR: Math.max(0, s) * 28,
      armL: [-18 * s, 6], armR: [18 * s, 6]
    }));
  };
  // Walk a figure along a path: about 1.3 strides a metre.
  verbs.walk = function (fig, path, t, base) {
    const a = verbs.move(fig, path, t);
    verbs.stride(fig, a.length * ease.clamp(t) * 0.65, t > 0 && t < 1 ? 1 : 0, base);
    return a;
  };
  // Progress of item i of n when they start one after another over the beat:
  // spread is the share of the time over which the starts are spread.
  verbs.stagger = (t, i, n, spread) => {
    spread = spread == null ? 0.6 : spread;
    const start = n > 1 ? i / (n - 1) * spread : 0;
    return ease.clamp((t - start) / (1 - spread || 1));
  };
  // Light the first k of items one after another (a count you can watch):
  // items are groups or meshes; part names the meshes to paint (all if omitted).
  verbs.light = function (items, k, t, on, off, part) {
    items.forEach((g, i) => {
      const lit = i < k && t >= (k > 1 ? i / (k - 1) : 0) * 0.85;
      g.paint(lit ? on : off, part);
    });
  };

  // ── the overlay: words on a fixed layer ──────────────────────────────
  function overlay(ctx, W, H, st, o) {
    const u = H / 720, pad = 48 * u, font = Film.font;
    ctx.textBaseline = 'alphabetic';
    // act, top left
    if (st.act) {
      ctx.globalAlpha = st.actAlpha;
      ctx.font = '700 ' + 15 * u + 'px ' + font;
      halo(ctx, st.act.toUpperCase(), pad, pad + 6 * u, u);
      ctx.fillStyle = Film.hex('n5');
      ctx.fillText(st.act.toUpperCase(), pad, pad + 6 * u);
      ctx.fillStyle = Film.hex('hl');
      ctx.fillRect(pad, pad + 16 * u, 36 * u, 3 * u);
      ctx.globalAlpha = 1;
    }
    // key, top right: a swatch of the highlight and what one unit is
    if (st.key) {
      ctx.globalAlpha = st.keyAlpha;
      ctx.font = '600 ' + 17 * u + 'px ' + font;
      const tw = ctx.measureText(st.key).width, bw = tw + 58 * u, bh = 40 * u, x = W - pad - bw, y = pad - 14 * u;
      ctx.fillStyle = Film.hex('paper'); roundRect(ctx, x, y, bw, bh, 8 * u); ctx.fill();
      ctx.fillStyle = Film.hex('hl'); roundRect(ctx, x + 14 * u, y + 12 * u, 16 * u, 16 * u, 3 * u); ctx.fill();
      ctx.fillStyle = Film.hex('n8'); ctx.fillText(st.key, x + 42 * u, y + 26 * u);
      ctx.globalAlpha = 1;
    }
    // caption, bottom left, on a pale panel so it reads over any part of the world
    if (st.caption) {
      ctx.globalAlpha = st.capAlpha;
      ctx.font = '600 ' + 31 * u + 'px ' + font;
      const lines = wrap(ctx, st.caption, W * 0.62);
      const lh = 40 * u, bh = lines.length * lh + 30 * u, bw = Math.max(...lines.map(l => ctx.measureText(l).width)) + 48 * u;
      const x = pad, y = H - pad - bh - 22 * u;
      ctx.fillStyle = Film.hex('paper'); ctx.globalAlpha = st.capAlpha * 0.92;
      roundRect(ctx, x, y, bw, bh, 10 * u); ctx.fill();
      ctx.globalAlpha = st.capAlpha;
      ctx.fillStyle = Film.hex('n8');
      lines.forEach((l, i) => ctx.fillText(l, x + 24 * u, y + 15 * u + lh * (i + 0.78)));
      ctx.globalAlpha = 1;
    }
    // source, bottom right, always
    if (o.source) {
      ctx.font = '400 ' + 13 * u + 'px ' + font;
      ctx.fillStyle = Film.hex('n5');
      const tw = ctx.measureText(o.source).width;
      halo(ctx, o.source, W - pad - tw, H - pad + 18 * u, u);
      ctx.fillStyle = Film.hex('n5');
      ctx.fillText(o.source, W - pad - tw, H - pad + 18 * u);
    }
  }
  // small words straight on the world keep a pale edge, so they read at night too
  function halo(ctx, s, x, y, u) {
    ctx.save(); ctx.strokeStyle = Film.hex('paper'); ctx.globalAlpha *= 0.85;
    ctx.lineWidth = 4 * u; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); ctx.restore();
  }
  function wrap(ctx, s, w) {
    const out = []; let line = '';
    for (const word of s.split(/\s+/)) {
      const tryL = line ? line + ' ' + word : word;
      if (ctx.measureText(tryL).width > w && line) { out.push(line); line = word; } else line = tryL;
    }
    if (line) out.push(line);
    return out;
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function rain(ctx, W, H, amount, time) {
    if (amount <= 0.01) return;
    const r = Film.rng(7), n = Math.round(260 * amount);
    ctx.strokeStyle = Film.hex('n0a'); ctx.lineWidth = Math.max(1, H / 600);
    ctx.globalAlpha = 0.35 * amount;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x0 = r() * W * 1.2, sp = 0.6 + r() * 0.6, y = ((r() * H + time * H * 1.6 * sp) % (H + 40)) - 20;
      const x = (x0 - y * 0.18) % (W * 1.2);
      ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 24 * (H / 720));
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // ── the player ────────────────────────────────────────────────────────
  // spec: { world, beats, size: [w, h], source, fade (seconds of the one
  //         transition, default 0.35), fixed: [...] (static groups, never touched) }
  Film.film = function (canvas, spec) {
    const o = Object.assign({ size: [1280, 720], fade: 0.35 }, spec);
    const [W, H] = o.size;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const glc = Film._makeCanvas(W, H);
    const r = Film.renderer(glc, { shadowSize: 4096 });
    r.size(W, H);
    const beats = o.beats;
    let t0 = 0;
    for (const b of beats) {
      Film._check('film', b.dur > 0, 'beat ' + b.id + ' needs a duration');
      b.start = t0; t0 += b.dur;
    }
    const duration = t0;
    // A camera inside a building shows a flat grey frame. Check each beat at
    // a few moments against every solid's box and say which beat and when.
    o.warnings = [];
    function cameraClear() {
      const boxes = [];
      o.world.walk((m, Wm) => {
        if (m.tex || m.opacity < 1) return;
        const b = m.geom.bounds, lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
        for (let k = 0; k < 8; k++) {
          const p = Film.M.point(Wm, [k & 1 ? b.hi[0] : b.lo[0], k & 2 ? b.hi[1] : b.lo[1], k & 4 ? b.hi[2] : b.lo[2]]);
          for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], p[a]); hi[a] = Math.max(hi[a], p[a]); }
        }
        if (hi[2] - lo[2] > 0.5) boxes.push([lo, hi]);
      });
      for (const b of beats) for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        if (b.setup) b.setup();
        if (b.update) b.update(t, t * b.dur);
        const e = camAt(b, t).eye;
        if (e[2] < 0.3) o.warnings.push(b.id + ' at ' + Math.round(t * 100) + '%: the camera is below the ground');
        else if (boxes.some(([lo, hi]) => e[0] > lo[0] && e[0] < hi[0] && e[1] > lo[1] && e[1] < hi[1] && e[2] > lo[2] && e[2] < hi[2]))
          o.warnings.push(b.id + ' at ' + Math.round(t * 100) + '%: the camera is inside a solid');
      }
      for (const w of o.warnings) console.warn('[film] ' + w);
    }
    let current = -1, lastCaption = null, capSince = 0, lastKey = null, keySince = 0, lastAct = null, actSince = 0;

    function camAt(b, t) {
      if (typeof b.cam === 'function') return b.cam(t);
      const e = (b.cam.ease || ease.inOut)(t);
      const from = Film.camera(b.cam.from), to = Film.camera(b.cam.to || b.cam.from);
      return Film.lerpCamera(from, to, e);
    }
    function skyAt(b, t) {
      if (typeof b.sky === 'function') return Film.sky(b.sky(t));
      return Film.sky(b.sky || 'day');
    }

    function frame(T) {
      T = Math.max(0, Math.min(duration - 1e-4, T));
      let i = beats.findIndex(b => T < b.start + b.dur);
      if (i < 0) i = beats.length - 1;
      const b = beats[i], s = T - b.start, t = s / b.dur;
      if (i !== current) { if (b.setup) b.setup(); current = i; }
      if (b.update) b.update(t, s);
      const sky = skyAt(b, t);
      const cam = camAt(b, t);
      const reach = cam.dist * Math.tan((cam.fov || 30) / (cam.zoom || 1) * Math.PI / 180) * 1.1;
      r.render(o.world, cam, { light: sky.light, exposure: sky.exposure, soft: sky.soft, groundColor: o.ground,
        focus: { center: cam.target, radius: Math.max(6, reach) } });
      ctx.drawImage(glc, 0, 0, W, H);
      rain(ctx, W, H, sky.rain || 0, T);
      // the one transition: a dip to the background at a cut
      const next = beats[i + 1];
      let dip = 0;
      if (b.cut && s < o.fade) dip = 1 - s / o.fade;
      if (next && next.cut && b.dur - s < o.fade) dip = Math.max(dip, 1 - (b.dur - s) / o.fade);
      if (i === 0 && s < o.fade * 1.5) dip = Math.max(dip, 1 - s / (o.fade * 1.5));
      if (!next && b.dur - s < o.fade * 2) dip = Math.max(dip, 1 - (b.dur - s) / (o.fade * 2));
      if (dip > 0) { ctx.globalAlpha = dip; ctx.fillStyle = Film.hex(o.ground || 'ground'); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
      // words: each fades in when it changes, and holds still otherwise
      const cap = b.caption || null, key = b.key || null, act = b.act || null;
      if (cap !== lastCaption) { lastCaption = cap; capSince = T; }
      if (key !== lastKey) { lastKey = key; keySince = T; }
      if (act !== lastAct) { lastAct = act; actSince = T; }
      const fadeIn = since => ease.out(ease.clamp((T - since) / 0.4));
      overlay(ctx, W, H, { caption: cap, capAlpha: fadeIn(capSince) * (1 - dip),
        key, keyAlpha: fadeIn(keySince) * (1 - dip), act, actAlpha: fadeIn(actSince) * (1 - dip) }, o);
      return { beat: b.id, index: i, t };
    }

    let playing = false, startWall = 0, startT = 0, nowT = 0, raf = 0, onTick = null;
    function tick() {
      if (!playing) return;
      nowT = startT + (performance.now() - startWall) / 1000;
      if (nowT >= duration) { nowT = duration - 1e-4; playing = false; }
      const info = frame(nowT);
      if (onTick) onTick(nowT, info);
      if (playing) raf = requestAnimationFrame(tick);
    }
    cameraClear();
    return {
      duration, beats, canvas, warnings: o.warnings,
      frame: T => { nowT = T; return frame(T); },
      seek(T) {
        nowT = Math.max(0, Math.min(duration, T)); current = -1;
        // a jump shows the words already in place, not fading in
        lastCaption = lastKey = lastAct = undefined; capSince = keySince = actSince = -1e9;
        const b = beats.find(x => nowT < x.start + x.dur) || beats[beats.length - 1];
        lastCaption = b.caption || null; lastKey = b.key || null; lastAct = b.act || null;
        const info = frame(nowT); if (onTick) onTick(nowT, info);
      },
      play() { if (playing) return; if (nowT >= duration - 0.01) nowT = 0; playing = true; startWall = performance.now(); startT = nowT; raf = requestAnimationFrame(tick); },
      pause() { playing = false; cancelAnimationFrame(raf); },
      // The key-frame strip: each beat at its start, middle and end, in one
      // picture, labelled. The way to review a film without watching it.
      strip(target, so) {
        so = Object.assign({ cols: 6, w: 320, at: [0.12, 0.5, 0.92] }, so);
        const h = Math.round(so.w * H / W), lab = 22, n = beats.length * so.at.length;
        const rows = Math.ceil(n / so.cols);
        target.width = so.cols * so.w; target.height = rows * (h + lab);
        const sc = target.getContext('2d');
        sc.fillStyle = Film.hex('n1'); sc.fillRect(0, 0, target.width, target.height);
        let k = 0;
        beats.forEach(b => so.at.forEach(f => {
          this.seek(b.start + b.dur * f);
          const x = (k % so.cols) * so.w, y = Math.floor(k / so.cols) * (h + lab);
          sc.drawImage(canvas, x, y + lab, so.w - 2, h - 2);
          sc.fillStyle = Film.hex('n8'); sc.font = '600 12px ' + Film.font;
          sc.fillText(b.id + ' · ' + Math.round(f * 100) + '%' + (f === so.at[0] && b.cut ? ' · cut' : ''), x + 6, y + 15);
          k++;
        }));
        return target;
      },
      get playing() { return playing; },
      get time() { return nowT; },
      onTick(fn) { onTick = fn; }
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
