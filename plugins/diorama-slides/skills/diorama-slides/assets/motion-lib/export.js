/*!
 * motion-lib/export.js — encode a cut to MP4 (or WebM) in the browser that
 * opened the page. No other app: WebCodecs plus this library's own muxers.
 *
 *   const r = await Motion.exportVideo({ spec, cut, onProgress, signal });
 *   // r: { ok, blob, ext, path, message, duration, width, height, frames, roundTrip }
 *
 * The codec ladder, in order: H.264 High, Main, Baseline -> MP4; VP9 -> WebM;
 * neither -> a real-time MediaRecorder capture, labelled as such because it
 * may drop frames. `probe: true` with `seconds: 2` encodes the opening only
 * and reports which path ran (the audit uses it).
 *
 * Motion blur: each frame averages S subframes across the shutter, centred on
 * the frame time. Counters read the frame time, never the subframe time, and
 * no subframe crosses a hard cut.
 */
(function (root) {
  'use strict';
  const M = root.Motion;

  const H264 = [
    { codec: 'avc1.640028', name: 'H.264 High' },
    { codec: 'avc1.4D4028', name: 'H.264 Main' },
    { codec: 'avc1.42E028', name: 'H.264 Baseline' }
  ];
  const H264_60 = [
    { codec: 'avc1.64002A', name: 'H.264 High' },
    { codec: 'avc1.4D402A', name: 'H.264 Main' },
    { codec: 'avc1.42E02A', name: 'H.264 Baseline' }
  ];

  function bitrateFor(C, meta) {
    if (meta && meta.bitrate) return meta.bitrate;
    const base = C.fps > 30 ? 16e6 : 10e6;
    return Math.round(base * (C.W * C.H) / (1920 * 1080));
  }

  async function pickCodec(C, prefer, bitrate) {
    if (typeof VideoEncoder === 'undefined') return null;
    const common = { width: C.W, height: C.H, bitrate, framerate: C.fps, latencyMode: 'quality' };
    const tryCfg = async cfg => { try { const s = await VideoEncoder.isConfigSupported(cfg); return s.supported ? s.config || cfg : null; } catch (e) { return null; } };
    if (prefer !== 'webm') {
      for (const c of (C.fps > 30 ? H264_60 : H264)) {
        const cfg = await tryCfg(Object.assign({ codec: c.codec, avc: { format: 'avc' } }, common));
        if (cfg) return { cfg, container: 'mp4', path: 'mp4-h264', name: c.name };
      }
    }
    const vp9 = await tryCfg(Object.assign({ codec: 'vp09.00.40.08' }, common));
    if (vp9) return { cfg: vp9, container: 'webm', path: 'webm-vp9', name: 'VP9' };
    return null;
  }

  function makeCanvas(W, H) {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(W, H);
    const c = document.createElement('canvas'); c.width = W; c.height = H; return c;
  }

  // Paint frame n, with motion blur when asked.
  function painter(C, blur) {
    const S = Math.max(1, Math.min(16, (blur && blur.subframes) || 1));
    const shutter = blur && blur.shutter != null ? blur.shutter : 0.5;
    const out = makeCanvas(C.W, C.H);
    const octx = out.getContext('2d');
    const sub = S > 1 ? makeCanvas(C.W, C.H) : null;
    const sctx = sub && sub.getContext('2d');
    const cuts = C.scenes.filter(s => s.index > 0 && s.trIn.name === 'cut').map(s => s.t0);
    const crossesCut = (a, b) => cuts.some(c => Math.min(a, b) < c && c <= Math.max(a, b));
    return {
      canvas: out,
      paint(n) {
        const frameT = n / C.fps;
        if (S === 1) { M.seek(octx, C, frameT, { frameT }); return; }
        for (let k = 0; k < S; k++) {
          let t = (n + shutter * ((k + 0.5) / S - 0.5)) / C.fps;
          t = Math.max(0, Math.min(C.duration - 1e-6, t));
          if (crossesCut(t, frameT)) t = frameT;
          M.seek(sctx, C, t, { frameT });
          octx.globalAlpha = 1 / (k + 1);
          octx.drawImage(sub, 0, 0);
        }
        octx.globalAlpha = 1;
      }
    };
  }

  async function encodeAudio(C, container, signal) {
    if (!M.audio || !C.spec.meta.audio || !C.spec.meta.audio.score || C.spec.meta.audio.score === 'off') return { chunks: null, note: null };
    if (typeof AudioEncoder === 'undefined') return { chunks: null, note: 'this browser has no audio encoder, so the export is silent' };
    const buf = await M.audio.render(C);
    const codec = container === 'mp4' ? 'mp4a.40.2' : 'opus';
    const cfg = { codec, sampleRate: buf.sampleRate, numberOfChannels: buf.numberOfChannels, bitrate: 128000 };
    let ok = false;
    try { ok = (await AudioEncoder.isConfigSupported(cfg)).supported; } catch (e) { ok = false; }
    if (!ok) return { chunks: null, note: 'this browser cannot encode ' + (codec === 'opus' ? 'Opus' : 'AAC') + ' audio, so the export is silent' };
    const chunks = [];
    let desc = null;
    const enc = new AudioEncoder({
      output: (c, meta) => {
        const b = new Uint8Array(c.byteLength); c.copyTo(b);
        chunks.push({ data: b, timestamp: c.timestamp, duration: c.duration });
        if (meta && meta.decoderConfig && meta.decoderConfig.description) desc = new Uint8Array(meta.decoderConfig.description);
      },
      error: e => { throw e; }
    });
    enc.configure(cfg);
    const N = 1024, ch = buf.numberOfChannels, total = buf.length;
    for (let i = 0; i < total; i += N) {
      if (signal && signal.aborted) { enc.close(); throw new DOMException('Export cancelled', 'AbortError'); }
      const n = Math.min(N, total - i);
      const data = new Float32Array(n * ch);
      for (let c = 0; c < ch; c++) data.set(buf.getChannelData(c).subarray(i, i + n), c * n);
      const ad = new AudioData({ format: 'f32-planar', sampleRate: buf.sampleRate, numberOfFrames: n, numberOfChannels: ch, timestamp: Math.round(i / buf.sampleRate * 1e6), data });
      enc.encode(ad); ad.close();
    }
    await enc.flush(); enc.close();
    return { chunks, description: desc, sampleRate: buf.sampleRate, channels: ch, note: null };
  }

  async function roundTrip(blob, C, frames) {
    if (typeof document === 'undefined') return { ok: true, note: 'no document to play it back in' };
    const v = document.createElement('video');
    v.muted = true; v.preload = 'auto';
    const url = URL.createObjectURL(blob);
    try {
      v.src = url;
      await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = () => rej(new Error('the browser could not open the file it just made')); });
      const expect = frames / C.fps;
      let dur = v.duration;
      if (!isFinite(dur)) {   // MediaRecorder WebM carries no duration until seeked past the end
        v.currentTime = 1e6;
        await new Promise(r => { v.onseeked = r; setTimeout(r, 1500); });
        dur = v.duration;
      }
      v.currentTime = Math.min(expect / 2, Math.max(0, dur - 0.1));
      await new Promise(r => { v.onseeked = r; setTimeout(r, 1500); });
      const r = {
        duration: dur, expected: expect, width: v.videoWidth, height: v.videoHeight,
        durationOk: Math.abs(dur - expect) <= 1.01 / C.fps, sizeOk: v.videoWidth === C.W && v.videoHeight === C.H, seekOk: v.readyState >= 2
      };
      r.ok = r.durationOk && r.sizeOk && r.seekOk;
      return r;
    } finally { URL.revokeObjectURL(url); }
  }

  async function exportVideo(o) {
    o = o || {};
    const spec = o.spec || M.readSpec();
    await M.fonts.ready(spec);
    if (!M.images || !Object.keys(M.images).length) await M.loadImages(spec);
    const C = M.compile(spec, o.cut);
    const frames = o.seconds ? Math.min(C.frames, Math.round(o.seconds * C.fps)) : C.frames;
    const blur = o.probe ? null : (o.motionBlur !== undefined ? o.motionBlur : spec.meta.motionBlur);
    const bitrate = bitrateFor(C, spec.meta);
    const progress = o.onProgress || (() => {});
    const pick = await pickCodec(C, o.container, bitrate);
    const P = painter(C, blur);

    if (!pick) return realtime(C, P, frames, o, progress);

    const chunks = [];
    let desc = null, err = null;
    const enc = new VideoEncoder({
      output: (c, meta) => {
        const b = new Uint8Array(c.byteLength); c.copyTo(b);
        chunks.push({ data: b, timestamp: c.timestamp, key: c.type === 'key' });
        if (meta && meta.decoderConfig && meta.decoderConfig.description) desc = new Uint8Array(meta.decoderConfig.description);
      },
      error: e => { err = e; }
    });
    enc.configure(pick.cfg);
    const t0 = performance.now();
    const keyEvery = Math.round(2 * C.fps);
    for (let n = 0; n < frames; n++) {
      if (o.signal && o.signal.aborted) { enc.close(); throw new DOMException('Export cancelled', 'AbortError'); }
      if (err) throw err;
      P.paint(n);
      const f = new VideoFrame(P.canvas, { timestamp: Math.round(n * 1e6 / C.fps), duration: Math.round(1e6 / C.fps) });
      enc.encode(f, { keyFrame: n % keyEvery === 0 });
      f.close();
      while (enc.encodeQueueSize > 4) await new Promise(r => enc.addEventListener('dequeue', r, { once: true }));
      if (n % 5 === 0) {
        const el = (performance.now() - t0) / 1000;
        progress({ phase: 'encode', frame: n + 1, frames, eta: el / (n + 1) * (frames - n - 1) });
        await new Promise(r => setTimeout(r, 0));   // let the page breathe (progress bar, Cancel)
      }
    }
    await enc.flush(); enc.close();
    if (err) throw err;

    progress({ phase: 'audio', frame: frames, frames });
    const audio = o.probe ? { chunks: null } : await encodeAudio(C, pick.container, o.signal);
    progress({ phase: 'mux', frame: frames, frames });
    const fpsReal = C.fps;
    let bytes;
    const a = audio.chunks ? { sampleRate: audio.sampleRate, channels: audio.channels, description: audio.description, chunks: audio.chunks } : null;
    if (pick.container === 'mp4') bytes = M.muxMP4({ video: { width: C.W, height: C.H, fps: fpsReal, description: desc, chunks }, audio: a });
    else bytes = M.muxWebM({ video: { width: C.W, height: C.H, fps: fpsReal, chunks }, audio: a });
    const type = pick.container === 'mp4' ? 'video/mp4' : 'video/webm';
    const blob = new Blob([bytes], { type });
    progress({ phase: 'probe', frame: frames, frames });
    const rt = await roundTrip(blob, C, frames);
    const notes = [];
    if (audio.note) notes.push(audio.note);
    const message = (rt.ok ? 'Exported ' : 'Export finished but the playback check failed: ') +
      pick.name + ' in ' + pick.container.toUpperCase() + ', ' + C.W + '×' + C.H + ' at ' + C.fps + ' fps, ' +
      (frames / C.fps).toFixed(2) + ' s (' + frames + ' frames)' + (a ? ' with sound' : '') + '.' + (notes.length ? ' Note: ' + notes.join('; ') + '.' : '');
    return {
      ok: rt.ok, blob, ext: pick.container, path: pick.path, codec: pick.cfg.codec, message, duration: frames / C.fps,
      width: C.W, height: C.H, frames, chunks: chunks.length, roundTrip: rt, audio: !!a, cut: C.cut
    };
  }

  // Last resort: a real-time capture. It runs at playback speed and may drop frames.
  async function realtime(C, P, frames, o, progress) {
    if (typeof MediaRecorder === 'undefined' || !P.canvas.captureStream) {
      const c = document.createElement('canvas'); c.width = C.W; c.height = C.H;
      if (typeof MediaRecorder === 'undefined' || !c.captureStream) {
        return { ok: false, path: 'none', message: 'This browser can neither encode video (WebCodecs) nor record a canvas. Open the page in a current Chrome or Edge to export.' };
      }
    }
    const canvas = document.createElement('canvas'); canvas.width = C.W; canvas.height = C.H;
    const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(0);
    const track = stream.getVideoTracks()[0];
    const mime = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)) || '';
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: bitrateFor(C, C.spec.meta) } : undefined);
    const parts = [];
    rec.ondataavailable = e => { if (e.data.size) parts.push(e.data); };
    const done = new Promise(r => { rec.onstop = r; });
    rec.start();
    const start = performance.now();
    for (let n = 0; n < frames; n++) {
      if (o.signal && o.signal.aborted) { rec.stop(); throw new DOMException('Export cancelled', 'AbortError'); }
      const due = start + n * 1000 / C.fps;
      const wait = due - performance.now();
      if (wait > 0) await new Promise(r => setTimeout(r, wait));
      P.paint(n);
      ctx.drawImage(P.canvas, 0, 0);
      if (track.requestFrame) track.requestFrame();
      if (n % 10 === 0) progress({ phase: 'record', frame: n + 1, frames });
    }
    await new Promise(r => setTimeout(r, 1000 / C.fps));
    rec.stop();
    await done;
    const type = (mime.split(';')[0]) || 'video/webm';
    const blob = new Blob(parts, { type });
    const rt = await roundTrip(blob, C, frames);
    return {
      ok: rt.seekOk && rt.sizeOk, blob, ext: type === 'video/mp4' ? 'mp4' : 'webm', path: 'realtime', roundTrip: rt, frames,
      duration: frames / C.fps, width: C.W, height: C.H, cut: C.cut,
      message: 'Real-time fallback — may drop frames. This browser has no WebCodecs encoder, so the canvas was recorded as it played (' + type + ').'
    };
  }

  M.exportVideo = exportVideo;
  M.exportInternals = { pickCodec, painter, roundTrip, bitrateFor };
})(typeof window !== 'undefined' ? window : globalThis);
