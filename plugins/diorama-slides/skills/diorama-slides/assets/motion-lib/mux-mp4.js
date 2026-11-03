/*!
 * motion-lib/mux-mp4.js — a small MP4 (ISO BMFF) muxer, no library.
 *
 * Takes the chunks WebCodecs hands back (H.264 in avcC form, optional AAC)
 * and writes one fast-start file: ftyp, then moov, then mdat. Every sample
 * size is known by the time we mux, so moov can go first and the file plays
 * while it downloads.
 *
 *   const bytes = Motion.muxMP4({
 *     video: { width, height, fps, description, chunks: [{ data, timestamp, key }] },
 *     audio: { sampleRate, channels, description, chunks: [{ data, timestamp }] }   // optional
 *   });
 *
 * `timestamp` is in microseconds, as EncodedVideoChunk gives it. Video
 * samples are laid on a constant frame grid (timescale fps*100, delta 100);
 * a chunk whose timestamp is off that grid (B-frames) gets a ctts entry and
 * an edit list. Pure: same input, same bytes. Runs in the browser and in Node.
 */
(function (root) {
  'use strict';

  // ── byte writer ─────────────────────────────────────────────────────
  function Writer() { this.parts = []; this.size = 0; }
  Writer.prototype.bytes = function (b) { this.parts.push(b); this.size += b.length; return this; };
  Writer.prototype.u8 = function (v) { return this.bytes(Uint8Array.of(v & 255)); };
  Writer.prototype.u16 = function (v) { return this.bytes(Uint8Array.of((v >>> 8) & 255, v & 255)); };
  Writer.prototype.u24 = function (v) { return this.bytes(Uint8Array.of((v >>> 16) & 255, (v >>> 8) & 255, v & 255)); };
  Writer.prototype.u32 = function (v) {
    return this.bytes(Uint8Array.of((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255));
  };
  Writer.prototype.i32 = function (v) { return this.u32(v >>> 0); };
  Writer.prototype.u64 = function (v) { return this.u32(Math.floor(v / 4294967296)).u32(v >>> 0); };
  Writer.prototype.str = function (s) {
    const b = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 255;
    return this.bytes(b);
  };
  Writer.prototype.zeros = function (n) { return this.bytes(new Uint8Array(n)); };
  Writer.prototype.out = function () {
    const o = new Uint8Array(this.size);
    let p = 0;
    for (const b of this.parts) { o.set(b, p); p += b.length; }
    return o;
  };

  // A box is its size, its four-letter type, then its body.
  function box(type, ...body) {
    const w = new Writer();
    let n = 8;
    for (const b of body) n += b.length;
    w.u32(n).str(type);
    for (const b of body) w.bytes(b);
    return w.out();
  }
  function full(type, version, flags, ...body) {
    const h = new Writer().u8(version).u24(flags).out();
    return box(type, h, ...body);
  }
  const W = () => new Writer();
  const MATRIX = (() => {
    const w = W();
    [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000].forEach(v => w.u32(v));
    return w.out();
  })();

  // ── sample tables ───────────────────────────────────────────────────
  function runs(values) {           // [a,a,b] -> [[2,a],[1,b]]
    const r = [];
    for (const v of values) {
      if (r.length && r[r.length - 1][1] === v) r[r.length - 1][0]++;
      else r.push([1, v]);
    }
    return r;
  }

  function stts(deltas) {
    const r = runs(deltas), w = W().u32(r.length);
    r.forEach(([n, d]) => w.u32(n).u32(d));
    return full('stts', 0, 0, w.out());
  }
  function ctts(offsets) {
    const r = runs(offsets), w = W().u32(r.length);
    r.forEach(([n, o]) => w.u32(n).u32(o));
    return full('ctts', 0, 0, w.out());
  }
  function stss(keys) {
    const w = W().u32(keys.length);
    keys.forEach(k => w.u32(k));
    return full('stss', 0, 0, w.out());
  }
  function stsz(sizes) {
    const w = W().u32(0).u32(sizes.length);
    sizes.forEach(s => w.u32(s));
    return full('stsz', 0, 0, w.out());
  }
  function stsc(chunks) {           // chunks: [{n}] samples per chunk, in order
    const e = [];
    chunks.forEach((c, i) => {
      if (!e.length || e[e.length - 1][1] !== c.n) e.push([i + 1, c.n]);
    });
    const w = W().u32(e.length);
    e.forEach(([first, n]) => w.u32(first).u32(n).u32(1));
    return full('stsc', 0, 0, w.out());
  }
  function stco(chunks, wide) {
    const w = W().u32(chunks.length);
    chunks.forEach(c => (wide ? w.u64(c.offset) : w.u32(c.offset)));
    return full(wide ? 'co64' : 'stco', 0, 0, w.out());
  }

  // ── sample entries ──────────────────────────────────────────────────
  function avc1(t) {
    const w = W().zeros(6).u16(1)              // reserved, data_reference_index
      .u16(0).u16(0).zeros(12)                 // pre_defined, reserved, pre_defined
      .u16(t.width).u16(t.height)
      .u32(0x00480000).u32(0x00480000)         // 72 dpi
      .u32(0).u16(1)                           // reserved, frame_count
      .zeros(32)                               // compressorname
      .u16(0x0018).u16(0xffff);                // depth, pre_defined = -1
    return box('avc1', w.out(), box('avcC', t.description));
  }
  function descr(tag, body) {                  // MPEG-4 descriptor, 1-byte length
    if (body.length > 127) throw new Error('mux-mp4: descriptor too long');
    return W().u8(tag).u8(body.length).bytes(body).out();
  }
  function mp4a(t) {
    const asc = t.description;
    const dsi = descr(5, asc);
    const dcd = descr(4, W().u8(0x40).u8(0x15).u24(0).u32(t.bitrate || 128000).u32(t.bitrate || 128000).bytes(dsi).out());
    const sl = descr(6, Uint8Array.of(2));
    const es = descr(3, W().u16(1).u8(0).bytes(dcd).bytes(sl).out());
    const w = W().zeros(6).u16(1).zeros(8)
      .u16(t.channels).u16(16).u16(0).u16(0)
      .u32((t.sampleRate << 16) >>> 0);
    return box('mp4a', w.out(), full('esds', 0, 0, es));
  }

  // ── tracks ──────────────────────────────────────────────────────────
  // Normalise one track into samples on its own timescale.
  function prepVideo(v) {
    const fps = v.fps, ts = Math.round(fps * 100), delta = 100;
    const n = v.chunks.length;
    // Decode order is the order chunks arrive. dts = i·delta; pts from the timestamp.
    const pts = v.chunks.map(c => Math.round(c.timestamp * ts / 1e6));
    let shift = 0;
    for (let i = 0; i < n; i++) shift = Math.max(shift, i * delta - pts[i]);
    const offsets = pts.map((p, i) => p - i * delta + shift);
    const needCtts = offsets.some(o => o !== offsets[0]) || shift !== 0 || offsets[0] !== 0;
    return {
      kind: 'video', timescale: ts, width: v.width, height: v.height,
      description: toU8(v.description),
      samples: v.chunks.map((c, i) => ({ data: toU8(c.data), dts: i * delta, delta, key: !!c.key })),
      offsets: needCtts ? offsets : null,
      mediaStart: needCtts ? shift : 0,
      duration: n * delta
    };
  }
  function prepAudio(a) {
    const ts = a.sampleRate;
    const s = a.chunks.map(c => ({ data: toU8(c.data), dts: Math.round(c.timestamp * ts / 1e6), key: true }));
    // Each AAC frame is 1024 samples; Opus/others report their own duration.
    s.forEach((x, i) => {
      const next = s[i + 1];
      const own = a.chunks[i].duration ? Math.round(a.chunks[i].duration * ts / 1e6) : 1024;
      x.delta = next ? Math.max(1, next.dts - x.dts) : own;
    });
    return {
      kind: 'audio', timescale: ts, channels: a.channels, sampleRate: a.sampleRate,
      bitrate: a.bitrate, description: toU8(a.description), samples: s, offsets: null, mediaStart: 0,
      duration: s.reduce((t, x) => t + x.delta, 0)
    };
  }
  function toU8(d) {
    if (d instanceof Uint8Array) return d;
    if (d instanceof ArrayBuffer) return new Uint8Array(d);
    if (ArrayBuffer.isView(d)) return new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
    throw new Error('mux-mp4: expected bytes');
  }

  // Group samples into ~1 s chunks so audio and video interleave.
  function chunkTrack(t) {
    const out = [];
    let cur = null;
    t.samples.forEach((s, i) => {
      const sec = Math.floor(s.dts / t.timescale);
      if (!cur || cur.sec !== sec) { cur = { sec, start: s.dts / t.timescale, first: i, n: 0, bytes: 0 }; out.push(cur); }
      cur.n++; cur.bytes += s.data.length;
    });
    t.chunks = out;
  }

  const MOVIE_TS = 1000;

  function trak(t, id) {
    const durMovie = Math.round((t.duration - t.mediaStart) * MOVIE_TS / t.timescale);
    const isV = t.kind === 'video';
    const tkhd = full('tkhd', 0, 3, W()
      .u32(0).u32(0).u32(id).u32(0).u32(durMovie)
      .zeros(8).u16(0).u16(0).u16(isV ? 0 : 0x0100).u16(0)
      .bytes(MATRIX)
      .u32(isV ? t.width * 65536 : 0).u32(isV ? t.height * 65536 : 0).out());
    // An edit list only when composition offsets pushed the media start.
    const edts = t.mediaStart
      ? box('edts', full('elst', 0, 0, W().u32(1).u32(durMovie).i32(t.mediaStart).u16(1).u16(0).out()))
      : null;
    const mdhd = full('mdhd', 0, 0, W().u32(0).u32(0).u32(t.timescale).u32(t.duration).u16(0x55c4).u16(0).out());
    const hdlr = full('hdlr', 0, 0, W().u32(0).str(isV ? 'vide' : 'soun').zeros(12)
      .str(isV ? 'VideoHandler' : 'SoundHandler').u8(0).out());
    const mhd = isV ? full('vmhd', 0, 1, W().zeros(8).out()) : full('smhd', 0, 0, W().zeros(4).out());
    const dinf = box('dinf', full('dref', 0, 0, W().u32(1).out(), full('url ', 0, 1)));
    const tables = [
      full('stsd', 0, 0, W().u32(1).out(), isV ? avc1(t) : mp4a(t)),
      stts(t.samples.map(s => s.delta))
    ];
    if (isV) {
      const keys = [];
      t.samples.forEach((s, i) => { if (s.key) keys.push(i + 1); });
      if (keys.length < t.samples.length) tables.push(stss(keys));
      if (t.offsets) tables.push(ctts(t.offsets));
    }
    tables.push(stsc(t.chunks), stsz(t.samples.map(s => s.data.length)), stco(t.chunks, t.wide));
    const minf = box('minf', mhd, dinf, box('stbl', ...tables));
    const parts = [tkhd];
    if (edts) parts.push(edts);
    parts.push(box('mdia', mdhd, hdlr, minf));
    return box('trak', ...parts);
  }

  function muxMP4(opts) {
    if (!opts || !opts.video || !opts.video.chunks || !opts.video.chunks.length) {
      throw new Error('mux-mp4: no video chunks');
    }
    const tracks = [prepVideo(opts.video)];
    if (opts.audio && opts.audio.chunks && opts.audio.chunks.length) tracks.push(prepAudio(opts.audio));
    tracks.forEach(chunkTrack);

    // Interleave: all chunks ordered by start time, video first on ties.
    const order = [];
    tracks.forEach((t, ti) => t.chunks.forEach(c => order.push({ t, ti, c })));
    order.sort((a, b) => a.c.start - b.c.start || a.ti - b.ti);
    const mdatBody = order.reduce((n, o) => n + o.c.bytes, 0);

    const ftyp = box('ftyp', W().str('isom').u32(0x200).str('isom').str('iso2').str('avc1').str('mp41').out());
    const durMovie = Math.max(...tracks.map(t => Math.round((t.duration - t.mediaStart) * MOVIE_TS / t.timescale)));
    const mvhd = full('mvhd', 0, 0, W()
      .u32(0).u32(0).u32(MOVIE_TS).u32(durMovie)
      .u32(0x00010000).u16(0x0100).zeros(10).bytes(MATRIX).zeros(24)
      .u32(tracks.length + 1).out());

    // moov size is independent of the offset values, so lay out once with
    // zeros, measure, then fill the real offsets.
    const wide = ftyp.length + 1e6 + mdatBody > 0xffffffff;
    tracks.forEach(t => { t.wide = wide; t.chunks.forEach(c => { c.offset = 0; }); });
    const build = () => box('moov', mvhd, ...tracks.map((t, i) => trak(t, i + 1)));
    let moov = build();
    const mdatHeader = mdatBody + 8 > 0xffffffff ? 16 : 8;
    let p = ftyp.length + moov.length + mdatHeader;
    order.forEach(o => { o.c.offset = p; p += o.c.bytes; });
    moov = build();

    const w = W().bytes(ftyp).bytes(moov);
    if (mdatHeader === 16) w.u32(1).str('mdat').u64(mdatBody + 16);
    else w.u32(mdatBody + 8).str('mdat');
    order.forEach(o => {
      for (let i = o.c.first; i < o.c.first + o.c.n; i++) w.bytes(o.t.samples[i].data);
    });
    return w.out();
  }

  const M = root.Motion = root.Motion || {};
  M.muxMP4 = muxMP4;
  if (typeof module !== 'undefined' && module.exports) module.exports = { muxMP4 };
})(typeof window !== 'undefined' ? window : globalThis);
