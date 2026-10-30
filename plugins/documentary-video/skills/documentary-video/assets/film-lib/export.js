// film-lib/export.js: the film as an MP4 (or WebM), made in the browser
// that opened the page. WebCodecs encodes; mux-mp4.js and mux-webm.js (the
// same files explainer-video ships) write the container. No other app.
//
//   const r = await Film.exportFilm(player, { fps: 30, onProgress, signal });
//   // r: { blob, ext, codec, frames, seconds }
//
// Every frame is drawn at its own time, not captured as the film plays, so
// nothing is dropped however slow the machine is.
(function (root) {
  'use strict';
  const Film = root.Film = root.Film || {};

  const LADDER = [
    { codec: 'avc1.640028', name: 'H.264 High', container: 'mp4' },
    { codec: 'avc1.4D4028', name: 'H.264 Main', container: 'mp4' },
    { codec: 'avc1.42E028', name: 'H.264 Baseline', container: 'mp4' },
    { codec: 'vp09.00.40.08', name: 'VP9', container: 'webm' }
  ];

  async function pick(W, H, fps, bitrate) {
    if (typeof VideoEncoder === 'undefined') return null;
    for (const c of LADDER) {
      const cfg = { codec: c.codec, width: W, height: H, bitrate, framerate: fps, latencyMode: 'quality' };
      if (c.container === 'mp4') cfg.avc = { format: 'avc' };
      try { const s = await VideoEncoder.isConfigSupported(cfg); if (s.supported) return Object.assign({ cfg: s.config || cfg }, c); } catch (e) { /* next */ }
    }
    return null;
  }

  Film.exportFilm = async function (player, o) {
    o = Object.assign({ fps: 30 }, o);
    const cv = player.canvas, W = cv.width, H = cv.height, fps = o.fps;
    const pickd = await pick(W, H, fps, o.bitrate || Math.round(10e6 * (W * H) / (1920 * 1080)));
    if (!pickd) throw new Error('This browser cannot encode video (WebCodecs). Use a current Chrome or Edge.');
    const chunks = [];
    let desc = null, failed = null;
    const enc = new VideoEncoder({
      output(chunk, meta) {
        const b = new Uint8Array(chunk.byteLength); chunk.copyTo(b);
        chunks.push({ data: b, timestamp: chunk.timestamp, key: chunk.type === 'key' });
        if (meta && meta.decoderConfig && meta.decoderConfig.description) desc = new Uint8Array(meta.decoderConfig.description);
      },
      error(e) { failed = e; }
    });
    enc.configure(pickd.cfg);
    const n = Math.round(player.duration * fps);
    const wasPlaying = player.playing; player.pause();
    player.seek(0);
    for (let i = 0; i < n; i++) {
      if (o.signal && o.signal.aborted) { enc.close(); throw new Error('export cancelled'); }
      if (failed) throw failed;
      player.frame(i / fps);
      const vf = new VideoFrame(cv, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
      enc.encode(vf, { keyFrame: i % (fps * 2) === 0 });
      vf.close();
      // keep the encoder's queue short, and let the page breathe
      while (enc.encodeQueueSize > 4) await new Promise(r => setTimeout(r, 2));
      if (i % 15 === 0) { if (o.onProgress) o.onProgress(i / n); await new Promise(r => setTimeout(r, 0)); }
    }
    await enc.flush();
    enc.close();
    if (failed) throw failed;
    const M = root.Motion;
    const bytes = pickd.container === 'mp4'
      ? M.muxMP4({ video: { width: W, height: H, fps, description: desc, chunks } })
      : M.muxWebM({ video: { width: W, height: H, fps, chunks } });
    if (o.onProgress) o.onProgress(1);
    player.seek(0);
    if (wasPlaying) player.play();
    const type = pickd.container === 'mp4' ? 'video/mp4' : 'video/webm';
    return { blob: new Blob([bytes], { type }), ext: pickd.container, codec: pickd.name, frames: n, seconds: player.duration };
  };

  // Hand the file to the viewer as a download.
  Film.saveFile = function (blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  };
})(typeof window !== 'undefined' ? window : globalThis);
