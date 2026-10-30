// film-lib/film.js: the film. A timeline of beats over one world, a camera
// that moves through it, the light of the time of day, and a fixed layer of
// words on top that never moves or zooms.
//
// A beat is { id, act, dur, cam, sky, cut, caption, key, stat, labels, timer,
// card, setup(), update(t, s) }. setup() puts the world into the state the
// beat starts from; it runs every time the beat is entered, also when the
// viewer seeks, so a beat sets everything it shows. update(t, s) moves
// things: t runs 0..1 over the beat, s is seconds into it.
//
// The words are where the film's numbers meet its pictures:
//   stat    { value, decimals, prefix, suffix, label, window: [a, b], from, still, count(t) }
//           a big number that counts up (from `from`, default 0) while the
//           action builds it; `still` for a goal or a comparison, which
//           shouldn't count; count(t, beat) to read the count from the world
//           (e.g. how many have lit), so number and picture always agree
//   labels  [{ text, at: [x, y, z], window: [a, b] }]
//           names pinned to places in the world, following the camera
//   timer   { at: [x, y, z], value, unit, window: [a, b] }
//           a badge over a wait that fills and counts as the wait runs
//   card    { title, sub }
//           a title or end card over the dimmed world
(function (root) {
  'use strict';
  const Film = root.Film = root.Film || {};
  const { V, M } = Film;

  const ease = Film.ease = {
    linear: t => t,
    inOut: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    // smoother start and stop than inOut: for camera moves
    smooth: t => t * t * t * (t * (t * 6 - 15) + 10),
    out: t => 1 - Math.pow(1 - t, 3),
    in: t => t * t * t,
    clamp: t => Math.max(0, Math.min(1, t)),
    // t remapped to a window inside the beat: span(t, 0.2, 0.6) is 0 before 20%, 1 after 60%
    span: (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)))
  };

  // ── sky: the light of the time of day ────────────────────────────────
  // Monotone by design: time of day changes the sun's angle, the exposure
  // and the shadows, never the palette.
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

  // Where a world point lands on a W x H frame through a camera (null if behind it).
  Film.project = function (cam, p, W, H) {
    const view = M.lookAt(cam.eye, cam.target, [0, 0, 1]);
    const proj = cam.fov ? M.perspective(cam.fov / (cam.zoom || 1), W / H, 0.1, 1e5)
      : M.ortho(-cam.height / 2 * W / H, cam.height / 2 * W / H, -cam.height / 2, cam.height / 2, 0.1, 1e5);
    const m = M.mul(proj, view);
    const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
    const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
    if (w <= 0.01) return null;
    return [(x / w * 0.5 + 0.5) * W, (1 - (y / w * 0.5 + 0.5)) * H];
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
  // How many of k are lit at t under verbs.light, for a counter that keeps pace.
  verbs.litCount = (k, t) => { let n = 0; for (let i = 0; i < k; i++) if (t >= (k > 1 ? i / (k - 1) : 0) * 0.85) n++; return n; };

  // ── the words ─────────────────────────────────────────────────────────
  const fmt = (v, d) => v.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });

  // Words that rise into place one after another, from `since` seconds.
  function riseText(ctx, words, x, y, age, u, maxW, lh) {
    let cx = x, cy = y;
    const space = ctx.measureText(' ').width;
    words.forEach((w, i) => {
      const ww = ctx.measureText(w).width;
      if (cx + ww > x + maxW && cx > x) { cx = x; cy += lh; }
      const k = ease.out(ease.clamp((age - i * 0.035) / 0.35));
      ctx.globalAlpha = k;
      ctx.fillText(w, cx, cy + (1 - k) * 14 * u);
      cx += ww + space;
    });
    ctx.globalAlpha = 1;
    return cy;
  }
  // how many lines the words wrap to at maxW, and the widest line
  function measureLines(ctx, words, maxW) {
    let n = 1, cx = 0, widest = 0;
    const space = ctx.measureText(' ').width;
    for (const w of words) {
      const ww = ctx.measureText(w).width;
      if (cx + ww > maxW && cx > 0) { n++; widest = Math.max(widest, cx - space); cx = 0; }
      cx += ww + space;
    }
    return { n, width: Math.max(widest, cx - space) };
  }

  function overlay(ctx, W, H, st, o) {
    const u = H / 720, pad = 52 * u, font = Film.font;
    ctx.textBaseline = 'alphabetic';
    const b = st.beat, age = st.age;

    // a card: the title or the end, over the dimmed world
    if (b.card) {
      const k = ease.out(ease.clamp(age / 0.6));
      ctx.globalAlpha = 0.72 * k; ctx.fillStyle = Film.hex('ground'); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
      ctx.fillStyle = Film.hex('hl'); ctx.fillRect(pad * 1.6, H * 0.40 - 58 * u, 56 * u * k, 5 * u);
      ctx.fillStyle = Film.hex('n9'); ctx.font = '800 ' + 64 * u + 'px ' + font;
      const ty = riseText(ctx, b.card.title.split(' '), pad * 1.6, H * 0.40 + 12 * u, age, u, W * 0.7, 74 * u);
      if (b.card.sub) {
        ctx.fillStyle = Film.hex('n5'); ctx.font = '400 ' + 26 * u + 'px ' + font;
        riseText(ctx, b.card.sub.split(' '), pad * 1.6, ty + 54 * u, age - 0.25, u, W * 0.62, 36 * u);
      }
      sourceLine(ctx, W, H, pad, u, o);
      return;
    }

    // act: top left, a small label with the highlight rule under it
    if (b.act) {
      ctx.font = '700 ' + 14 * u + 'px ' + font;
      const s = b.act.toUpperCase();
      halo(ctx, s, pad, pad + 4 * u, u);
      ctx.fillStyle = Film.hex('n5'); ctx.fillText(s, pad, pad + 4 * u);
      ctx.fillStyle = Film.hex('hl'); ctx.fillRect(pad, pad + 13 * u, 28 * u, 3 * u);
    }

    // labels pinned to the world
    for (const l of b.labels || []) {
      const w = l.window || [0, 1], k = ease.out(ease.span(st.t, w[0], w[1] === 1 ? 1 : w[0] + 0.12));
      if (k <= 0 || st.t > (w[1] == null ? 1 : w[1]) + 0.001) continue;
      const p = Film.project(st.cam, l.at, W, H);
      if (!p) continue;
      const lift = 54 * u * k;
      ctx.globalAlpha = k;
      ctx.strokeStyle = Film.hex('n8'); ctx.lineWidth = 1.5 * u;
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0], p[1] - lift); ctx.stroke();
      ctx.fillStyle = Film.hex('n8'); ctx.beginPath(); ctx.arc(p[0], p[1], 4 * u, 0, Math.PI * 2); ctx.fill();
      ctx.font = '700 ' + 15 * u + 'px ' + font;
      const s = l.text.toUpperCase(), tw = ctx.measureText(s).width;
      ctx.fillStyle = Film.hex('n8'); roundRect(ctx, p[0] - 10 * u, p[1] - lift - 30 * u, tw + 20 * u, 28 * u, 4 * u); ctx.fill();
      ctx.fillStyle = Film.hex('paper'); ctx.fillText(s, p[0], p[1] - lift - 11 * u);
      ctx.globalAlpha = 1;
    }

    // a timer over a wait: a ring that fills and a count that runs
    if (b.timer) {
      const tm = b.timer, w = tm.window || [0, 1], f = ease.span(st.t, w[0], w[1]);
      const p = Film.project(st.cam, tm.at, W, H);
      if (p && st.t >= w[0] - 0.05) {
        const r = 30 * u, cx = p[0], cy = p[1] - 70 * u;
        ctx.globalAlpha = ease.out(ease.clamp((st.t - w[0] + 0.05) / 0.08));
        ctx.fillStyle = Film.hex('paper'); ctx.beginPath(); ctx.arc(cx, cy, r + 8 * u, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = Film.hex('n1'); ctx.lineWidth = 6 * u; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = Film.hex('hl'); ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke();
        ctx.fillStyle = Film.hex('n9'); ctx.font = '800 ' + 17 * u + 'px ' + font; ctx.textAlign = 'center';
        ctx.fillText(fmt(tm.value * f, tm.decimals == null ? 1 : tm.decimals), cx, cy + 3 * u);
        ctx.fillStyle = Film.hex('n5'); ctx.font = '600 ' + 11 * u + 'px ' + font;
        ctx.fillText(tm.unit || 'min', cx, cy + 17 * u);
        ctx.textAlign = 'left'; ctx.globalAlpha = 1;
      }
    }

    // key: top right, the highlight swatch and what one unit is
    if (b.key) {
      const k = ease.out(ease.clamp(age / 0.4));
      ctx.globalAlpha = k;
      ctx.font = '600 ' + 16 * u + 'px ' + font;
      const tw = ctx.measureText(b.key).width, bw = tw + 52 * u, bh = 38 * u, x = W - pad - bw, y = pad - 18 * u;
      ctx.fillStyle = Film.hex('paper'); roundRect(ctx, x, y, bw, bh, 19 * u); ctx.fill();
      ctx.fillStyle = Film.hex('hl'); ctx.beginPath(); ctx.arc(x + 21 * u, y + bh / 2, 7 * u, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = Film.hex('n8'); ctx.fillText(b.key, x + 38 * u, y + 25 * u);
      ctx.globalAlpha = 1;
    }

    // lower third: the stat (if any) above the caption, on one soft panel
    if (b.caption || b.stat) {
      const capFont = '600 ' + 27 * u + 'px ' + font, maxW = W * 0.5;
      ctx.font = capFont;
      const words = (b.caption || '').split(/\s+/).filter(Boolean);
      const m = words.length ? measureLines(ctx, words, maxW) : { n: 0, width: 0 };
      const lines = m.n, statH = b.stat ? 92 * u : 0, lh = 36 * u;
      // the panel hugs its words, so it covers as little of the world as it can
      let statW = 0;
      if (b.stat) {
        const s = b.stat;
        ctx.font = '800 ' + 76 * u + 'px ' + font;
        const nw = ctx.measureText((s.prefix || '') + fmt(s.count ? 100 : s.value, s.decimals) + (s.suffix || '')).width;
        ctx.font = '600 ' + 19 * u + 'px ' + font;
        statW = nw + 14 * u + Math.min(maxW - nw, ctx.measureText(s.label || '').width);
        ctx.font = capFont;
      }
      const bh = statH + lines * lh + 34 * u, bw = Math.min(maxW, Math.max(m.width, statW)) + 62 * u;
      const x = pad, y = H - pad - bh - 10 * u;
      const k = ease.out(ease.clamp(age / 0.35));
      ctx.globalAlpha = 0.93 * k; ctx.fillStyle = Film.hex('paper');
      roundRect(ctx, x, y + (1 - k) * 16 * u, bw, bh, 12 * u); ctx.fill();
      ctx.globalAlpha = k; ctx.fillStyle = Film.hex('hl'); ctx.fillRect(x, y + 18 * u + (1 - k) * 16 * u, 5 * u, bh - 36 * u);
      ctx.globalAlpha = 1;
      let ty = y + 28 * u;
      if (b.stat) {
        const s = b.stat, w = s.window || [0.1, 0.7], f = ease.out(ease.span(st.t, w[0], w[1]));
        const v = s.count ? s.count(st.t, b) : s.still ? s.value : (s.from || 0) + (s.value - (s.from || 0)) * f;
        ctx.font = '800 ' + 76 * u + 'px ' + font; ctx.fillStyle = Film.hex('hl');
        const num = (s.prefix || '') + fmt(v, s.decimals) + (s.suffix || '');
        ctx.globalAlpha = k; ctx.fillText(num, x + 30 * u, ty + 56 * u);
        if (s.label) {
          const nw = ctx.measureText(num).width;
          ctx.font = '600 ' + 19 * u + 'px ' + font; ctx.fillStyle = Film.hex('n5');
          riseText(ctx, s.label.split(' '), x + 44 * u + nw, ty + 34 * u, age - 0.15, u, maxW - nw - 30 * u, 24 * u);
        }
        ctx.globalAlpha = 1;
        ty += statH;
      }
      if (words.length) {
        ctx.font = capFont; ctx.fillStyle = Film.hex('n8');
        riseText(ctx, words, x + 30 * u, ty + 20 * u, age - (b.stat ? 0.2 : 0), u, maxW, lh);
      }
    }
    sourceLine(ctx, W, H, pad, u, o);
  }
  function sourceLine(ctx, W, H, pad, u, o) {
    if (!o.source) return;
    ctx.font = '400 ' + 12 * u + 'px ' + Film.font;
    const tw = ctx.measureText(o.source).width;
    halo(ctx, o.source, W - pad - tw, H - pad + 22 * u, u);
    ctx.fillStyle = Film.hex('n5'); ctx.fillText(o.source, W - pad - tw, H - pad + 22 * u);
  }
  // small words straight on the world keep a pale edge, so they read at night too
  function halo(ctx, s, x, y, u) {
    ctx.save(); ctx.strokeStyle = Film.hex('paper'); ctx.globalAlpha *= 0.85;
    ctx.lineWidth = 4 * u; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function rain(ctx, W, H, amount, time) {
    if (amount <= 0.01) return;
    const r = Film.rng(7), n = Math.round(420 * amount), u = H / 720;
    ctx.strokeStyle = Film.hex('paper'); ctx.lineWidth = 1.4 * u;
    ctx.globalAlpha = 0.5 * amount;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x0 = r() * W * 1.3, sp = 0.7 + r() * 0.6, y = ((r() * H + time * H * 2.2 * sp) % (H + 60)) - 30;
      const x = ((x0 - y * 0.2) % (W * 1.3) + W * 1.3) % (W * 1.3) - W * 0.15;
      ctx.moveTo(x, y); ctx.lineTo(x - 6 * u, y + 30 * u);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // a faint darkening towards the corners: holds the eye in the frame
  function vignette(ctx, W, H) {
    const g = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.45, W / 2, H * 0.48, H * 1.05);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.16)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  // ── the player ────────────────────────────────────────────────────────
  // spec: { world, beats, size: [w, h], source, ss (supersampling, default 1.5) }
  Film.film = function (canvas, spec) {
    const o = Object.assign({ size: [1280, 720], fade: 0.5, ss: 1.5 }, spec);
    const [W, H] = o.size;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    const glc = Film._makeCanvas(2, 2);
    const r = Film.renderer(glc, { shadowSize: 4096 });
    r.size(Math.round(W * o.ss), Math.round(H * o.ss));
    const beats = o.beats;
    let t0 = 0;
    for (const b of beats) {
      Film._check('film', b.dur > 0, 'beat ' + b.id + ' needs a duration');
      b.start = t0; t0 += b.dur;
    }
    const duration = t0;

    function camAt(b, t) {
      if (typeof b.cam === 'function') return b.cam(t);
      const e = (b.cam.ease || ease.smooth)(t);
      return Film.lerpCamera(Film.camera(b.cam.from), Film.camera(b.cam.to || b.cam.from), e);
    }
    function skyAt(b, t) {
      if (typeof b.sky === 'function') return Film.sky(b.sky(t));
      return Film.sky(b.sky || 'day');
    }

    // A camera inside a building shows a flat grey frame. Check each beat at
    // a few moments against every solid's box and say which beat and when.
    o.warnings = [];
    (function cameraClear() {
      const boxes = [];
      o.world.walk((m, Wm) => {
        if (m.tex || m.opacity < 1) return;
        const b = m.geom.bounds, lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
        for (let k = 0; k < 8; k++) {
          const p = M.point(Wm, [k & 1 ? b.hi[0] : b.lo[0], k & 2 ? b.hi[1] : b.lo[1], k & 4 ? b.hi[2] : b.lo[2]]);
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
    })();

    let current = -1;
    function frame(T) {
      T = Math.max(0, Math.min(duration - 1e-4, T));
      let i = beats.findIndex(b => T < b.start + b.dur);
      if (i < 0) i = beats.length - 1;
      const b = beats[i], s = T - b.start, t = s / b.dur;
      if (i !== current) { if (b.setup) b.setup(); current = i; }
      if (b.update) b.update(t, s);
      const sky = skyAt(b, t), cam = camAt(b, t);
      const reach = cam.dist * Math.tan((cam.fov || 30) / (cam.zoom || 1) * Math.PI / 180) * 1.1;
      r.render(o.world, cam, { light: sky.light, exposure: sky.exposure, soft: sky.soft, groundColor: o.ground,
        focus: { center: cam.target, radius: Math.max(6, reach) } });
      ctx.drawImage(glc, 0, 0, W, H);
      rain(ctx, W, H, sky.rain || 0, T);
      vignette(ctx, W, H);
      overlay(ctx, W, H, { beat: b, t, age: s, cam }, o);
      // cuts are hard cuts; the film only fades in at its start and out at its end
      let dip = 0;
      if (T < o.fade) dip = 1 - T / o.fade;
      if (duration - T < o.fade) dip = Math.max(dip, 1 - (duration - T) / o.fade);
      if (dip > 0) { ctx.globalAlpha = dip; ctx.fillStyle = Film.hex(o.ground || 'ground'); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
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
    return {
      duration, beats, canvas, warnings: o.warnings,
      frame: T => { nowT = T; return frame(T); },
      seek(T) { nowT = Math.max(0, Math.min(duration, T)); current = -1; const info = frame(nowT); if (onTick) onTick(nowT, info); },
      play() { if (playing) return; if (nowT >= duration - 0.01) nowT = 0; playing = true; startWall = performance.now(); startT = nowT; raf = requestAnimationFrame(tick); },
      pause() { playing = false; cancelAnimationFrame(raf); },
      // The key-frame strip: each beat at its start, middle and end, in one
      // picture, labelled. The way to review a film without watching it.
      strip(target, so) {
        so = Object.assign({ cols: 6, w: 320, at: [0.15, 0.55, 0.95] }, so);
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
