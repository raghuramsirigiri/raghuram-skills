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
//   stat    { value, decimals, prefix, suffix, label, window: [a, b], from, still, count(t), max }
//           a big number that counts up (from `from`, default 0) while the
//           action builds it; `still` for a goal or a comparison, which
//           shouldn't count; count(t, beat) to read the count from the world
//           (e.g. how many have lit), so number and picture always agree;
//           count returns null to show no number yet; max is the largest
//           value it reaches, so the panel is sized for it
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
  // Exposure, softness and rain ease from a to b; the sun keeps a's angle.
  // A sun that turns during a shot drags every shadow edge across the
  // frame, which reads as flicker; it changes at a cut instead.
  Film.mixSky = function (a, b, t) {
    a = Film.sky(a); b = Film.sky(b);
    const L = (x, y) => x + (y - x) * t;
    return { light: a.light, exposure: L(a.exposure, b.exposure),
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
  // The type follows the design system the other skills share (theme.js
  // metrics): the theme's font, numbers and titles in ink at 700, the rest
  // lighter and quieter; the highlight colour is an accent (a rule, a dot,
  // the units a beat counts), not the colour of the words.
  const fmt = (v, d) => v.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  const FONT = () => (root.Charts && root.Charts.metrics && root.Charts.metrics.font) || Film.font;
  const TYPE = {
    stat: { w: 700, px: 64 }, unit: { w: 500, px: 22 }, caption: { w: 500, px: 25, lh: 1.32 },
    act: { w: 600, px: 13 }, label: { w: 600, px: 14 }, key: { w: 500, px: 15 },
    card: { w: 700, px: 58, lh: 1.08 }, cardSub: { w: 400, px: 23, lh: 1.35 }, source: { w: 400, px: 12 }
  };
  const f = (t, u, scale) => t.w + ' ' + (t.px * u * (scale || 1)).toFixed(2) + 'px ' + FONT();

  // Balanced wrap: the narrowest width that keeps the same number of lines,
  // so a caption never ends on one stranded word.
  function wrapLines(ctx, text, maxW) {
    const words = String(text).split(/\s+/).filter(Boolean);
    const lay = w => { const out = []; let cur = ''; for (const x of words) { const n = cur ? cur + ' ' + x : x; if (!cur || ctx.measureText(n).width <= w) cur = n; else { out.push(cur); cur = x; } } if (cur) out.push(cur); return out; };
    const base = lay(maxW);
    if (base.length < 2) return base;
    let lo = maxW * 0.4, hi = maxW;
    for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (lay(mid).length <= base.length) hi = mid; else lo = mid; }
    return lay(hi);
  }
  // Lines that rise into place word by word, from `age` seconds.
  function riseLines(ctx, lines, x, y, lh, age, u, delay) {
    let i = 0;
    const space = ctx.measureText(' ').width;
    lines.forEach((line, li) => {
      let cx = x;
      for (const w of line.split(' ')) {
        const k = ease.out(ease.clamp((age - (delay || 0) - i * 0.03) / 0.4));
        ctx.globalAlpha = k;
        ctx.fillText(w, cx, y + li * lh + (1 - k) * 10 * u);
        cx += ctx.measureText(w).width + space; i++;
      }
    });
    ctx.globalAlpha = 1;
  }
  // Digits in fixed cells, so a counting number doesn't shuffle sideways.
  function tabular(ctx, s, x, y) {
    const cell = Math.max(...'0123456789'.split('').map(d => ctx.measureText(d).width));
    let cx = x;
    for (const ch of s) {
      if (ch >= '0' && ch <= '9') { const w = ctx.measureText(ch).width; ctx.fillText(ch, cx + (cell - w) / 2, y); cx += cell; }
      else { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width; }
    }
    return cx - x;
  }
  const tabularWidth = (ctx, s) => {
    const cell = Math.max(...'0123456789'.split('').map(d => ctx.measureText(d).width));
    let w = 0; for (const ch of s) w += ch >= '0' && ch <= '9' ? cell : ctx.measureText(ch).width; return w;
  };
  // Split a callout into the number (with any symbol: %, +, –, →) and its words.
  function statParts(s, v) {
    const pre = s.prefix || '', suf = s.suffix || '';
    const sym = x => /^[+\-–→~≈<>£$€%\d.,\s]*$/.test(x);
    const lead = sym(pre) ? '' : pre.trim();
    const sufWord = !sym(suf) ? suf.trim() : '';
    const num = (sym(pre) ? pre : '') + (v == null ? '' : fmt(v, s.decimals)) + (sym(suf) ? suf : '');
    const words = [sufWord, s.label].filter(Boolean).join(' ');
    return { lead, num, words };
  }

  function overlay(ctx, W, H, st, o) {
    const u = H / 720, pad = 56 * u;
    ctx.textBaseline = 'alphabetic';
    const b = st.beat, age = st.age;
    const fade = since => ease.out(ease.clamp(since / 0.45));
    // at night the lower third turns over: a dark fade and pale words
    const dark = (st.exposure || 1) < 0.7;
    const INK = dark ? 'paper' : 'n9', BODY = dark ? 'n0a' : 'n7', QUIET = dark ? 'n2a' : 'n5';

    // a card: the title or the end, over the softened world
    if (b.card) {
      const k = fade(age);
      ctx.globalAlpha = 0.8 * k; ctx.fillStyle = Film.hex('ground'); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
      ctx.font = f(TYPE.card, u);
      const lines = wrapLines(ctx, b.card.title, W * 0.6), lh = TYPE.card.px * TYPE.card.lh * u;
      ctx.font = f(TYPE.cardSub, u);
      const sub = b.card.sub ? wrapLines(ctx, b.card.sub, W * 0.5) : [], slh = TYPE.cardSub.px * TYPE.cardSub.lh * u;
      const total = lines.length * lh + (sub.length ? 22 * u + sub.length * slh : 0);
      let y = H / 2 - total / 2 + TYPE.card.px * u * 0.8;
      const x = pad * 1.7;
      ctx.globalAlpha = k; ctx.fillStyle = Film.hex('hl'); ctx.fillRect(x, y - TYPE.card.px * u - 18 * u, 44 * u * k, 4 * u); ctx.globalAlpha = 1;
      ctx.font = f(TYPE.card, u); ctx.fillStyle = Film.hex('n9');
      riseLines(ctx, lines, x, y, lh, age, u);
      if (sub.length) { ctx.font = f(TYPE.cardSub, u); ctx.fillStyle = Film.hex('n5'); riseLines(ctx, sub, x, y + lines.length * lh + 22 * u, slh, age, u, 0.3); }
      sourceLine(ctx, W, H, pad, u, o, 1);
      return;
    }

    // a soft fade up from the bottom: the lower third reads over any world
    if (b.caption || b.stat) {
      const g = ctx.createLinearGradient(0, H * 0.52, 0, H);
      const bg = Film.hex(dark ? 'n9' : 'ground');
      g.addColorStop(0, bg + '00'); g.addColorStop(0.55, bg + 'b8'); g.addColorStop(1, bg + 'f0');
      ctx.globalAlpha = fade(age); ctx.fillStyle = g; ctx.fillRect(0, H * 0.52, W, H * 0.48); ctx.globalAlpha = 1;
    }

    // act: small spaced capitals, top left
    if (b.act) {
      ctx.font = f(TYPE.act, u); ctx.letterSpacing = (1.6 * u).toFixed(2) + 'px';
      const s = b.act.toUpperCase();
      halo(ctx, s, pad, pad, u);
      ctx.fillStyle = Film.hex('n6'); ctx.fillText(s, pad, pad);
      ctx.letterSpacing = '0px';
    }

    // labels pinned to the world: a dot, a hairline, a quiet pill
    for (const l of b.labels || []) {
      const w = l.window || [0, 1], k = ease.out(ease.span(st.t, w[0], w[0] + 0.1));
      if (k <= 0 || st.t > (w[1] == null ? 1 : w[1]) + 0.001) continue;
      const p = Film.project(st.cam, l.at, W, H);
      if (!p) continue;
      const lift = 46 * u * k, chip = labelChip(l.text, u);
      ctx.globalAlpha = k;
      ctx.strokeStyle = Film.hex('n6'); ctx.lineWidth = 1.2 * u;
      ctx.beginPath(); ctx.moveTo(p[0], p[1] - 4 * u); ctx.lineTo(p[0], p[1] - lift); ctx.stroke();
      ctx.fillStyle = Film.hex('paper'); ctx.beginPath(); ctx.arc(p[0], p[1], 5.5 * u, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = Film.hex('hl'); ctx.beginPath(); ctx.arc(p[0], p[1], 3.5 * u, 0, Math.PI * 2); ctx.fill();
      ctx.drawImage(chip, p[0] - chip.width / 4, p[1] - lift - chip.height / 2, chip.width / 2, chip.height / 2);
      ctx.globalAlpha = 1;
    }

    // a timer over a wait: a ring that fills and a count that runs
    if (b.timer) {
      const tm = b.timer, w = tm.window || [0, 1], fr = ease.span(st.t, w[0], w[1]);
      const p = Film.project(st.cam, tm.at, W, H);
      if (p && st.t >= w[0] - 0.05) {
        const r = 28 * u, cx = p[0], cy = p[1] - 64 * u;
        ctx.globalAlpha = ease.out(ease.clamp((st.t - w[0] + 0.05) / 0.08));
        ctx.fillStyle = Film.hex('paper'); ctx.beginPath(); ctx.arc(cx, cy, r + 9 * u, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = Film.hex('n1'); ctx.lineWidth = 5 * u; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = Film.hex('hl'); ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fr); ctx.stroke(); ctx.lineCap = 'butt';
        ctx.fillStyle = Film.hex('n9'); ctx.font = '700 ' + 17 * u + 'px ' + FONT(); ctx.textAlign = 'center';
        ctx.fillText(fmt(tm.value * fr, tm.decimals == null ? 1 : tm.decimals), cx, cy + 3 * u);
        ctx.fillStyle = Film.hex('n5'); ctx.font = '500 ' + 10.5 * u + 'px ' + FONT();
        ctx.fillText(tm.unit || 'min', cx, cy + 17 * u);
        ctx.textAlign = 'left'; ctx.globalAlpha = 1;
      }
    }

    // key: top right, the highlight swatch and what one unit is
    if (b.key) {
      ctx.globalAlpha = fade(age);
      ctx.font = f(TYPE.key, u);
      const tw = ctx.measureText(b.key).width, bw = tw + 48 * u, bh = 34 * u, x = W - pad - bw, y = pad - 23 * u;
      ctx.fillStyle = Film.hex('paper'); roundRect(ctx, x, y, bw, bh, bh / 2); ctx.fill();
      ctx.fillStyle = Film.hex('hl'); ctx.beginPath(); ctx.arc(x + 19 * u, y + bh / 2, 6 * u, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = Film.hex('n7'); ctx.fillText(b.key, x + 34 * u, y + bh / 2 + TYPE.key.px * u * 0.36);
      ctx.globalAlpha = 1;
    }

    // the lower third: an accent rule, the number with its words on one
    // baseline, the caption under it
    const x = pad;
    let y = H - pad - 4 * u;
    const capW = W * 0.56;
    let capLines = [];
    if (b.caption) { ctx.font = f(TYPE.caption, u); capLines = wrapLines(ctx, b.caption, capW); }
    const capLh = TYPE.caption.px * TYPE.caption.lh * u;
    const capTop = y - (capLines.length - 1) * capLh;
    if (capLines.length) {
      ctx.font = f(TYPE.caption, u); ctx.fillStyle = Film.hex(BODY);
      riseLines(ctx, capLines, x, capTop, capLh, age, u, b.stat ? 0.15 : 0);
    }
    if (b.stat) {
      const s = b.stat, w = s.window || [0.1, 0.7], fr = ease.out(ease.span(st.t, w[0], w[1]));
      const v = s.count ? s.count(st.t, b) : s.still ? s.value : (s.from || 0) + (s.value - (s.from || 0)) * fr;
      const parts = statParts(s, v), full = statParts(s, s.count ? (s.max != null ? s.max : 100) : s.value);
      // size: as large as the design allows, smaller when a long number would crowd the frame
      ctx.font = f(TYPE.stat, u);
      const room = W * 0.6;
      ctx.font = f(TYPE.unit, u);
      const leadW = full.lead ? ctx.measureText(full.lead).width + 12 * u : 0, wordsW = full.words ? ctx.measureText(full.words).width + 14 * u : 0;
      ctx.font = f(TYPE.stat, u);
      const numW = tabularWidth(ctx, full.num);
      const scale = Math.min(1, (room - leadW - wordsW) / Math.max(1, numW));
      const base = (capLines.length ? capTop - capLh * 0.95 : y) - 2 * u;
      const k = fade(age);
      ctx.globalAlpha = k; ctx.fillStyle = Film.hex('hl');
      ctx.fillRect(x, base - TYPE.stat.px * u * scale * 0.78 - 20 * u, 36 * u * k, 4 * u);
      let cx = x;
      if (parts.lead) { ctx.font = f(TYPE.unit, u); ctx.fillStyle = Film.hex(QUIET); ctx.fillText(parts.lead, cx, base); cx += ctx.measureText(parts.lead).width + 12 * u; }
      ctx.font = f(TYPE.stat, u, scale); ctx.fillStyle = Film.hex(INK); ctx.letterSpacing = (-1.2 * u * scale).toFixed(2) + 'px';
      if (parts.num) cx += tabular(ctx, parts.num, cx, base) + 14 * u;
      ctx.letterSpacing = '0px';
      if (parts.words) { ctx.font = f(TYPE.unit, u); ctx.fillStyle = Film.hex(QUIET); ctx.fillText(parts.words, cx, base); }
      ctx.globalAlpha = 1;
    }
    sourceLine(ctx, W, H, pad, u, o);
  }
  const chips = new Map();
  function labelChip(text, u) {
    const key = text + '|' + u;
    if (chips.has(key)) return chips.get(key);
    const ff = (TYPE.label.w) + ' ' + (TYPE.label.px * 2 * u) + 'px ' + FONT();   // drawn at 2x
    const m = Film._makeCanvas(2, 2).getContext('2d'); m.font = ff;
    const w = Math.ceil(m.measureText(text).width + 36 * u), h = Math.ceil(52 * u);
    const cv = Film._makeCanvas(w, h), c = cv.getContext('2d');
    c.fillStyle = 'rgba(0,0,0,0.10)'; roundRect(c, 1, 3, w - 2, h - 4, (h - 4) / 2); c.fill();
    c.fillStyle = Film.hex('paper'); roundRect(c, 0, 0, w, h - 3, (h - 3) / 2); c.fill();
    c.font = ff; c.fillStyle = Film.hex('n8'); c.textBaseline = 'middle'; c.fillText(text, 18 * u, (h - 3) / 2 + u);
    chips.set(key, cv);
    return cv;
  }
  function sourceLine(ctx, W, H, pad, u, o, onCard) {
    if (!o.source) return;
    ctx.font = f(TYPE.source, u);
    const tw = ctx.measureText(o.source).width, y = H - pad * 0.45;
    if (!onCard) halo(ctx, o.source, W - pad - tw, y, u);
    ctx.fillStyle = Film.hex('n5'); ctx.fillText(o.source, W - pad - tw, y);
  }
  // small words straight on the world keep a pale edge, so they read at night too
  function halo(ctx, s, x, y, u) {
    ctx.save(); ctx.strokeStyle = Film.hex('paper'); ctx.globalAlpha *= 0.8;
    ctx.lineWidth = 3.5 * u; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); ctx.restore();
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
  // spec: { world, beats, size: [w, h], source, ss (supersampling, default 2),
  //         color (true: the world in colour; default monotone) }
  Film.film = function (canvas, spec) {
    const o = Object.assign({ size: [1280, 720], fade: 0.5, ss: 2 }, spec);
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

    // Shadows hold still for a whole beat. A close beat gets one shadow box
    // covering everything its camera sees from start to end; a wide beat
    // uses one box over the whole world. A box that followed the camera
    // would slide across the world and flip whole walls in and out of
    // shadow as it went.
    // the whole world's box, measured once: moving things mustn't nudge it
    const wb = o.world.bounds();
    const WORLD_BOX = { center: V.mul(V.add(wb.lo, wb.hi), 0.5), radius: V.len(V.sub(wb.hi, wb.lo)) / 2 * 1.1 };
    function shadowFocus(b) {
      const cams = [0, 0.25, 0.5, 0.75, 1].map(t => camAt(b, t));
      const reach = c => c.dist * Math.tan((c.fov || 30) / (c.zoom || 1) * Math.PI / 180) * 1.2 + 4;
      if (cams.some(c => c.dist > 80)) return WORLD_BOX;
      const center = V.mul(cams.reduce((a, c) => V.add(a, c.target), [0, 0, 0]), 1 / cams.length);
      const radius = Math.max(...cams.map(c => V.len(V.sub(c.target, center)) + reach(c)));
      return { center, radius };
    }

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
        // a figure posed sitting with nothing under it reads as floating
        let floaters = 0;
        (function visit(n) { if (n.visible === false) return; if (n.floating) floaters++; for (const c of n.children || []) if (c.children) visit(c); })(o.world);
        if (floaters && !o.warnings.some(w => w.startsWith(b.id + ' '))) o.warnings.push(b.id + ' at ' + Math.round(t * 100) + '%: ' + floaters + ' figure' + (floaters > 1 ? 's sit' : ' sits') + " on nothing (pose them with sit: 'ground', or a seat height)");
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
      Film.worldColor(!!o.color);   // per player, so two can share a page
      const sky = skyAt(b, t), cam = camAt(b, t);
      if (b._focus === undefined) b._focus = shadowFocus(b);
      r.render(o.world, cam, { light: sky.light, exposure: sky.exposure, soft: sky.soft, groundColor: o.ground,
        focus: b._focus, near: Math.max(0.05, cam.dist * 0.03) });
      ctx.drawImage(glc, 0, 0, W, H);
      rain(ctx, W, H, sky.rain || 0, T);
      vignette(ctx, W, H);
      overlay(ctx, W, H, { beat: b, t, age: s, cam, exposure: sky.exposure }, o);
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
