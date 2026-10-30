// film-lib/sheet.js: the contact sheet, a still of every cast item.
//
// It is how a film's cast is reviewed before anything moves: each item in
// each of its states, from the hero angle with a small view from behind,
// its size in metres, and any error the item threw, in its own cell.
(function (root) {
  'use strict';
  const Film = root.Film = root.Film || {};

  // items: [{ name, note, make(state) -> Film.group, states: [{ label, ... }] }]
  // opts:  { cols, cellW, cellH, title, az, el, fov, only }
  // An item or a state may carry view: { az, el, fov, focus: [[x,y,z], [x,y,z]] }.
  Film.sheet = function (canvas, items, opts) {
    const o = Object.assign({ az: -55, el: 26, fov: 28, title: 'Cast' }, opts);
    const vw = root.innerWidth || 1680;
    if (o.only) items = items.filter(it => it.name.toLowerCase().includes(o.only.toLowerCase()));
    if (!o.cols) o.cols = Math.max(1, Math.floor(vw / (o.cellW || 420)));
    if (!o.cellW) o.cellW = Math.max(420, Math.floor(vw / o.cols));
    if (!o.cellH) o.cellH = Math.round(o.cellW * 0.81);
    const dpr = Math.min(2, root.devicePixelRatio || 1);
    const cells = [];
    for (const it of items) for (const st of (it.states && it.states.length ? it.states : [{}])) cells.push([it, st]);
    const cols = Math.min(o.cols, Math.max(1, cells.length)), rows = Math.ceil(cells.length / cols);
    const head = 56, W = cols * o.cellW, H = head + rows * o.cellH;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.fillStyle = Film.hex('ground'); ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = Film.hex('n8'); ctx.font = '700 20px ' + Film.font;
    ctx.fillText(o.title, 16, 34);
    ctx.fillStyle = Film.hex('n4'); ctx.font = '400 13px ' + Film.font;
    ctx.fillText(items.length + ' items · ' + cells.length + ' views', 16 + ctx.measureText(o.title).width * 1.6 + 20, 34);

    const glc = Film._makeCanvas(1, 1);
    const r = Film.renderer(glc);
    const errors = [];
    cells.forEach(([it, st], i) => {
      const x = (i % cols) * o.cellW, y = head + Math.floor(i / cols) * o.cellH;
      ctx.strokeStyle = Film.hex('n1'); ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, o.cellW - 1, o.cellH - 1);
      const imgH = o.cellH - 52;
      try {
        const g = it.make(st);
        Film._check('sheet', g instanceof Film.Group, '"' + it.name + '" make() must return a Film.group()');
        const b = g.bounds();
        // hero
        r.size(Math.round(o.cellW * dpr), Math.round(imgH * dpr));
        // an item may set its own view: { az, el, fov, focus: [lo, hi] } (focus frames part of it)
        const v = Object.assign({ az: o.az, el: o.el, fov: o.fov }, it.view, st.view);
        const target = v.focus ? { lo: v.focus[0], hi: v.focus[1] } : g;
        r.render(g, Film.frame(target, { az: v.az, el: v.el, fov: v.fov, aspect: o.cellW / imgH }));
        ctx.drawImage(r.canvas, x, y, o.cellW, imgH);
        // from behind, small, top right
        const iw = o.cellW * 0.3, ih = imgH * 0.3;
        r.size(Math.round(iw * dpr), Math.round(ih * dpr));
        r.render(g, Film.frame(target, { az: v.az + 180, el: v.el + 6, fov: v.fov, aspect: iw / ih, margin: 1.2 }));
        ctx.drawImage(r.canvas, x + o.cellW - iw - 6, y + 6, iw, ih);
        ctx.strokeStyle = Film.hex('n1'); ctx.strokeRect(x + o.cellW - iw - 6.5, y + 5.5, iw + 1, ih + 1);
        const s = [0, 1, 2].map(k => (b.hi[k] - b.lo[k]).toFixed(2));
        caption(ctx, x, y + imgH, o.cellW, it.name + (st.label ? ' · ' + st.label : ''),
          s[0] + ' × ' + s[1] + ' × ' + s[2] + ' m' + (it.note ? ' · ' + it.note : ''));
      } catch (e) {
        errors.push(it.name + ': ' + e.message);
        ctx.fillStyle = Film.hex('annotation'); ctx.font = '600 13px ' + Film.font;
        wrap(ctx, 'Error: ' + e.message, x + 14, y + 30, o.cellW - 28, 18);
        caption(ctx, x, y + imgH, o.cellW, it.name + (st.label ? ' · ' + st.label : ''), 'failed');
        if (root.console) console.error('[sheet] ' + it.name, e);
      }
    });
    canvas.dataset.errors = errors.length;
    root.__sheetErrors = errors;
    return { errors, cells: cells.length };
  };

  function caption(ctx, x, y, w, title, sub) {
    ctx.fillStyle = Film.hex('n8'); ctx.font = '600 14px ' + Film.font;
    ctx.fillText(fit(ctx, title, w - 28), x + 14, y + 22);
    ctx.fillStyle = Film.hex('n4'); ctx.font = '400 12px ' + Film.font;
    ctx.fillText(fit(ctx, sub, w - 28), x + 14, y + 40);
  }
  function fit(ctx, s, w) {
    if (ctx.measureText(s).width <= w) return s;
    while (s.length > 1 && ctx.measureText(s + '…').width > w) s = s.slice(0, -1);
    return s + '…';
  }
  function wrap(ctx, s, x, y, w, lh) {
    let line = '';
    for (const word of s.split(' ')) {
      if (ctx.measureText(line + word).width > w && line) { ctx.fillText(line, x, y); y += lh; line = ''; }
      line += word + ' ';
    }
    ctx.fillText(line, x, y);
  }
})(typeof window !== 'undefined' ? window : globalThis);
