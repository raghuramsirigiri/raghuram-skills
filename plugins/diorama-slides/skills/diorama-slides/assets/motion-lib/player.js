/*!
 * motion-lib/player.js — the page around the video: preview, scrubber with
 * scene ticks, timecode, frame step, safe-zone overlay, cut switcher, Export
 * video, Export stills, Copy caption, Copy alt text.
 *
 * The preview canvas keeps its native size (only its CSS size changes), so
 * what plays here is what exports. requestAnimationFrame only picks which t
 * to paint; the paint is still Motion.seek(t). None of this chrome is ever in
 * the exported video.
 *
 *   Motion.player.mount(document.getElementById('player'));
 */
(function (root) {
  'use strict';
  const M = root.Motion;

  const tc = (t, fps) => {
    const m = Math.floor(t / 60), s = Math.floor(t % 60), f = Math.floor((t - Math.floor(t)) * fps + 1e-6);
    return m + ':' + String(s).padStart(2, '0') + '.' + String(Math.min(f, fps - 1)).padStart(2, '0');
  };
  const slug = s => String(s || 'video').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'video';

  function h(tag, attrs, kids) {
    const e = document.createElement(tag);
    for (const k in attrs || {}) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(c => c && e.appendChild(c));
    return e;
  }

  function download(blob, name) {
    const a = h('a', { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  function dataUrlToBlob(u) {
    const [head, b64] = u.split(',');
    const bin = atob(b64), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: head.slice(5).split(';')[0] });
  }

  // One frame per scene hold midpoint and per transition midpoint, labelled
  // outside the frames with scene handles and timecodes.
  function contactSheet(C, o) {
    o = o || {};
    const marks = M.marks(C);
    const hd = {};
    C.scenes.forEach((s, i) => { hd[s.id] = 'V' + (i + 1); });
    const cols = Math.min(o.cols || 6, marks.length);
    const fw = C.W >= C.H ? 360 : 200, fh = Math.round(fw * C.H / C.W);
    const lab = 26, pad = 12, rows = Math.ceil(marks.length / cols);
    const sheet = document.createElement('canvas');
    sheet.width = cols * (fw + pad) + pad; sheet.height = rows * (fh + lab + pad) + pad;
    const sx = sheet.getContext('2d');
    sx.fillStyle = '#d9d9d6'; sx.fillRect(0, 0, sheet.width, sheet.height);
    const full = document.createElement('canvas');
    full.width = C.W; full.height = C.H;
    const fx = full.getContext('2d');
    marks.forEach((m, i) => {
      M.seek(fx, C, m.t, { frameT: m.t });
      const x = pad + (i % cols) * (fw + pad), y = pad + Math.floor(i / cols) * (fh + lab + pad);
      sx.drawImage(full, x, y, fw, fh);
      sx.fillStyle = '#222'; sx.font = '600 13px system-ui, sans-serif'; sx.textBaseline = 'top';
      const name = m.kind === 'scene' ? hd[m.id] + ' · ' + m.id : '↳ ' + m.id.split('→').map(id => hd[id]).join(' → ');
      sx.fillText(name + '  ' + tc(m.t, C.fps), x, y + fh + 5);
    });
    return sheet.toDataURL('image/png');
  }

  // The poster: the hook scene's hold midpoint, full size.
  function poster(C) {
    const s = C.scenes[0];
    const t = (s.enterEnd + s.exitStart) / 2;
    const c = document.createElement('canvas'); c.width = C.W; c.height = C.H;
    M.seek(c.getContext('2d'), C, t, { frameT: t });
    return c.toDataURL('image/png');
  }

  function mount(el, opts) {
    opts = opts || {};
    const spec = opts.spec || M.readSpec();
    const cutNames = Object.keys(spec.cuts || {});
    let C = null, cut = opts.cut || cutNames[0];
    let t = 0, playing = false, startWall = 0, startT = 0, raf = 0, showSafe = false, aborter = null;

    const canvas = h('canvas', { class: 'mv-canvas', 'aria-label': 'Video preview' });
    const overlay = h('canvas', { class: 'mv-overlay', 'aria-hidden': 'true' });
    const stage = h('div', { class: 'mv-stage' }, [canvas, overlay]);
    const playBtn = h('button', { type: 'button', class: 'mv-play', text: 'Play', onclick: () => toggle() });
    const scrub = h('input', { type: 'range', class: 'mv-scrub', min: '0', max: '0', step: '1', value: '0', 'aria-label': 'Frame' });
    const ticks = h('div', { class: 'mv-ticks', 'aria-hidden': 'true' });
    const time = h('span', { class: 'mv-time', text: '0:00.00' });
    const safeBtn = h('button', { type: 'button', text: 'Safe zone', 'aria-pressed': 'false', onclick: () => { showSafe = !showSafe; safeBtn.setAttribute('aria-pressed', String(showSafe)); drawOverlay(); } });
    const cutSel = cutNames.length > 1 ? h('select', { 'aria-label': 'Cut', onchange: e => { cut = e.target.value; build(); } }, cutNames.map(n => h('option', { value: n, text: n + ' · ' + spec.cuts[n].format }))) : null;
    const exportBtn = h('button', { type: 'button', class: 'mv-primary', text: 'Export video', onclick: () => doExport() });
    const cancelBtn = h('button', { type: 'button', text: 'Cancel', hidden: '', onclick: () => aborter && aborter.abort() });
    const stillsBtn = h('button', { type: 'button', text: 'Export stills', onclick: () => doStills() });
    const capBtn = h('button', { type: 'button', text: 'Copy caption', onclick: () => copy(spec.caption || '', 'Caption') });
    const altBtn = h('button', { type: 'button', text: 'Copy alt text', onclick: () => copy(spec.alt || '', 'Alt text') });
    const bar = h('progress', { class: 'mv-progress', max: '1', value: '0', hidden: '' });
    const status = h('p', { class: 'mv-status', role: 'status', 'aria-live': 'polite' });
    const controls = h('div', { class: 'mv-controls' }, [playBtn, h('div', { class: 'mv-track' }, [scrub, ticks]), time]);
    const actions = h('div', { class: 'mv-actions' }, [cutSel, safeBtn, exportBtn, cancelBtn, stillsBtn, capBtn, altBtn]);
    el.appendChild(stage); el.appendChild(controls); el.appendChild(actions); el.appendChild(bar); el.appendChild(status);
    const ctx = canvas.getContext('2d');

    function say(msg) { status.textContent = msg; }
    async function copy(text, what) {
      if (!text) { say(what + ' is empty in the spec.'); return; }
      try { await navigator.clipboard.writeText(text); say(what + ' copied.'); }
      catch (e) { say('Copy was blocked by the browser. ' + what + ': ' + text); }
    }

    function fit() {
      const maxH = opts.maxHeight || Math.max(240, window.innerHeight * 0.68);
      const maxW = el.clientWidth || C.W;
      const k = Math.min(maxW / C.W, maxH / C.H, 1);
      for (const c of [canvas, overlay]) { c.style.width = Math.round(C.W * k) + 'px'; c.style.height = Math.round(C.H * k) + 'px'; }
      stage.style.width = Math.round(C.W * k) + 'px';
    }

    function drawOverlay() {
      const o = overlay.getContext('2d');
      o.clearRect(0, 0, overlay.width, overlay.height);
      if (!showSafe) return;
      o.fillStyle = 'rgba(200,30,60,0.18)';
      const S = C.safe;
      o.fillRect(0, 0, C.W, S.y); o.fillRect(0, S.y + S.h, C.W, C.H - S.y - S.h);
      o.fillRect(0, S.y, S.x, S.h); o.fillRect(S.x + S.w, S.y, C.W - S.x - S.w, S.h);
      o.strokeStyle = 'rgba(200,30,60,0.9)'; o.lineWidth = 3; o.strokeRect(S.x, S.y, S.w, S.h);
    }

    function paint() {
      M.seek(ctx, C, t, { frameT: Math.floor(t * C.fps + 1e-6) / C.fps });
      const n = Math.min(C.frames - 1, Math.floor(t * C.fps + 1e-6));
      scrub.value = String(n);
      time.textContent = tc(t, C.fps) + ' / ' + tc(C.duration, C.fps);
    }

    function frameLoop(now) {
      t = startT + (now - startWall) / 1000;
      if (t >= C.duration) { t = C.duration - 1 / C.fps; stop(); paint(); return; }
      paint();
      raf = requestAnimationFrame(frameLoop);
    }
    function play() {
      if (t >= C.duration - 1 / C.fps) t = 0;
      playing = true; playBtn.textContent = 'Pause';
      startWall = performance.now(); startT = t;
      if (M.audio && M.audio.preview) M.audio.preview(C, t);
      raf = requestAnimationFrame(frameLoop);
    }
    function stop() {
      playing = false; playBtn.textContent = 'Play'; cancelAnimationFrame(raf);
      if (M.audio && M.audio.stopPreview) M.audio.stopPreview();
    }
    function toggle() { playing ? stop() : play(); }
    function seekFrame(n) { stop(); t = Math.max(0, Math.min(C.frames - 1, n)) / C.fps; paint(); }

    scrub.addEventListener('input', () => seekFrame(+scrub.value));
    el.addEventListener('keydown', e => {
      if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) && e.target !== scrub) return;
      if (e.code === 'Space') { e.preventDefault(); toggle(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); seekFrame(Math.round(t * C.fps) + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); seekFrame(Math.round(t * C.fps) - 1); }
    });
    el.tabIndex = 0;

    function build() {
      stop();
      C = M.compile(spec, cut);
      canvas.width = overlay.width = C.W; canvas.height = overlay.height = C.H;
      scrub.max = String(C.frames - 1);
      ticks.innerHTML = '';
      C.scenes.forEach((s, i) => {
        const tk = h('span', { class: 'mv-tick', title: 'V' + (i + 1) + ' · ' + s.id, text: 'V' + (i + 1) });
        tk.style.left = (s.t0 / C.duration * 100) + '%';
        ticks.appendChild(tk);
      });
      t = 0; fit(); drawOverlay(); paint();
      say(C.scenes.length + ' scenes · ' + C.format + ' · ' + C.duration.toFixed(1) + ' s at ' + C.fps + ' fps');
    }

    async function doExport() {
      stop();
      aborter = new AbortController();
      exportBtn.disabled = true; cancelBtn.hidden = false; bar.hidden = false; bar.value = 0;
      say('Exporting…');
      try {
        const r = await M.exportVideo({
          spec, cut, signal: aborter.signal,
          onProgress: p => {
            bar.value = p.frame / p.frames;
            if (p.phase === 'encode') say('Encoding frame ' + p.frame + ' of ' + p.frames + (p.eta != null ? ' · about ' + Math.ceil(p.eta) + ' s left' : ''));
            else if (p.phase === 'record') say('Recording in real time, frame ' + p.frame + ' of ' + p.frames + ' (fallback: may drop frames)');
            else say({ audio: 'Rendering the soundtrack…', mux: 'Writing the file…', probe: 'Checking the file plays back…' }[p.phase] || '…');
          }
        });
        if (r.blob) download(r.blob, slug(spec.meta.title) + '-' + cut + '.' + r.ext);
        say(r.message);
        el.dataset.lastExport = JSON.stringify({ ok: r.ok, path: r.path, frames: r.frames, duration: r.duration, roundTrip: r.roundTrip });
      } catch (e) {
        say(e.name === 'AbortError' ? 'Export cancelled.' : 'Export failed: ' + e.message);
      } finally {
        exportBtn.disabled = false; cancelBtn.hidden = true; bar.hidden = true; aborter = null;
      }
    }

    function doStills() {
      stop();
      const base = slug(spec.meta.title) + '-' + cut;
      download(dataUrlToBlob(poster(C)), base + '-poster.png');
      download(dataUrlToBlob(contactSheet(C)), base + '-contact-sheet.png');
      say('Saved the poster frame and a contact sheet (one frame per scene and per transition).');
      paint();
    }

    window.addEventListener('resize', () => C && fit());
    build();
    return { get compiled() { return C; }, seek: s => { stop(); t = s; paint(); }, play, stop, exportVideo: doExport, build };
  }

  async function start(el, opts) {
    const spec = (opts && opts.spec) || M.readSpec();
    await M.fonts.ready(spec);
    await M.loadImages(spec);
    return mount(el, Object.assign({}, opts, { spec }));
  }

  M.player = { mount, start, contactSheet, poster, tc };
})(typeof window !== 'undefined' ? window : globalThis);
