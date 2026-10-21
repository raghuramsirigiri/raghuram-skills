/*!
 * motion-lib/mux-webm.js — a small WebM (Matroska) muxer, no library.
 *
 * VP9 video, optional Opus audio. One Segment of known size: SeekHead, Info,
 * Tracks, then a Cluster at every video keyframe (at most 5 s apart), then
 * Cues pointing at each cluster so the file seeks.
 *
 *   const bytes = Motion.muxWebM({
 *     video: { width, height, fps, chunks: [{ data, timestamp, key }] },
 *     audio: { sampleRate, channels, description, chunks: [{ data, timestamp }] }   // optional
 *   });
 *
 * Timestamps are in microseconds, as WebCodecs gives them. Pure; runs in the
 * browser and in Node.
 */
(function (root) {
  'use strict';

  function concat(parts) {
    let n = 0;
    for (const p of parts) n += p.length;
    const o = new Uint8Array(n);
    let i = 0;
    for (const p of parts) { o.set(p, i); i += p.length; }
    return o;
  }
  function idBytes(id) {
    const b = [];
    let v = id;
    while (v > 0) { b.unshift(v & 255); v = Math.floor(v / 256); }
    return Uint8Array.from(b);
  }
  // EBML variable-length size. len forces a width (8 for containers sized late).
  function vsize(n, len) {
    let l = len || 1;
    if (!len) while (n >= Math.pow(2, 7 * l) - 1) l++;
    const o = new Uint8Array(l);
    let v = n;
    for (let i = l - 1; i >= 0; i--) { o[i] = v & 255; v = Math.floor(v / 256); }
    o[0] |= 1 << (8 - l);
    return o;
  }
  function el(id, payload, sizeLen) {
    return concat([idBytes(id), vsize(payload.length, sizeLen), payload]);
  }
  function uint(n, width) {
    let l = width || 1;
    if (!width) while (n >= Math.pow(2, 8 * l)) l++;
    const o = new Uint8Array(l);
    let v = n;
    for (let i = l - 1; i >= 0; i--) { o[i] = v & 255; v = Math.floor(v / 256); }
    return o;
  }
  function f64(x) { const b = new Uint8Array(8); new DataView(b.buffer).setFloat64(0, x); return b; }
  function str(s) { const o = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i) & 255; return o; }
  function toU8(d) {
    if (d instanceof Uint8Array) return d;
    if (d instanceof ArrayBuffer) return new Uint8Array(d);
    if (ArrayBuffer.isView(d)) return new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
    throw new Error('mux-webm: expected bytes');
  }

  const ID = {
    EBML: 0x1A45DFA3, Segment: 0x18538067, SeekHead: 0x114D9B74, Seek: 0x4DBB, SeekID: 0x53AB, SeekPosition: 0x53AC,
    Info: 0x1549A966, TimecodeScale: 0x2AD7B1, Duration: 0x4489, MuxingApp: 0x4D80, WritingApp: 0x5741,
    Tracks: 0x1654AE6B, TrackEntry: 0xAE, TrackNumber: 0xD7, TrackUID: 0x73C5, TrackType: 0x83, CodecID: 0x86,
    CodecPrivate: 0x63A2, CodecDelay: 0x56AA, SeekPreRoll: 0x56BB, DefaultDuration: 0x23E383,
    Video: 0xE0, PixelWidth: 0xB0, PixelHeight: 0xBA, Audio: 0xE1, SamplingFrequency: 0xB5, Channels: 0x9F,
    Cluster: 0x1F43B675, Timecode: 0xE7, SimpleBlock: 0xA3,
    Cues: 0x1C53BB6B, CuePoint: 0xBB, CueTime: 0xB3, CueTrackPositions: 0xB7, CueTrack: 0xF7, CueClusterPosition: 0xF1
  };

  function opusHead(channels, sampleRate, preSkip) {
    const b = new Uint8Array(19);
    b.set(str('OpusHead'), 0);
    b[8] = 1; b[9] = channels;
    const v = new DataView(b.buffer);
    v.setUint16(10, preSkip, true);
    v.setUint32(12, sampleRate, true);
    v.setInt16(16, 0, true);
    b[18] = 0;
    return b;
  }

  function muxWebM(opts) {
    const V = opts && opts.video;
    if (!V || !V.chunks || !V.chunks.length) throw new Error('mux-webm: no video chunks');
    const A = opts.audio && opts.audio.chunks && opts.audio.chunks.length ? opts.audio : null;
    const fps = V.fps || 30;
    const frameMs = 1000 / fps;
    const durMs = V.chunks.length * frameMs;

    const ebml = el(ID.EBML, concat([
      el(0x4286, uint(1)), el(0x42F7, uint(1)), el(0x42F2, uint(4)), el(0x42F3, uint(8)),
      el(0x4282, str('webm')), el(0x4287, uint(4)), el(0x4285, uint(2))
    ]));

    const info = el(ID.Info, concat([
      el(ID.TimecodeScale, uint(1000000)), el(ID.Duration, f64(durMs)),
      el(ID.MuxingApp, str('motion-lib')), el(ID.WritingApp, str('explainer-video'))
    ]));

    const vTrack = el(ID.TrackEntry, concat([
      el(ID.TrackNumber, uint(1)), el(ID.TrackUID, uint(1)), el(ID.TrackType, uint(1)),
      el(ID.CodecID, str('V_VP9')), el(ID.DefaultDuration, uint(Math.round(1e9 / fps))),
      el(ID.Video, concat([el(ID.PixelWidth, uint(V.width)), el(ID.PixelHeight, uint(V.height))]))
    ]));
    const tracks = [vTrack];
    if (A) {
      const head = A.description ? toU8(A.description) : opusHead(A.channels, A.sampleRate, 312);
      tracks.push(el(ID.TrackEntry, concat([
        el(ID.TrackNumber, uint(2)), el(ID.TrackUID, uint(2)), el(ID.TrackType, uint(2)),
        el(ID.CodecID, str('A_OPUS')), el(ID.CodecPrivate, head),
        el(ID.CodecDelay, uint(Math.round(312 / 48000 * 1e9))), el(ID.SeekPreRoll, uint(80000000)),
        el(ID.Audio, concat([el(ID.SamplingFrequency, f64(A.sampleRate)), el(ID.Channels, uint(A.channels))]))
      ])));
    }
    const tracksEl = el(ID.Tracks, concat(tracks));

    // Blocks, in time order: video frames on the frame grid, audio by timestamp.
    const blocks = V.chunks.map((c, i) => ({ track: 1, ms: Math.round(i * frameMs), key: !!c.key, data: toU8(c.data) }));
    if (A) A.chunks.forEach(c => blocks.push({ track: 2, ms: Math.round(c.timestamp / 1000), key: true, data: toU8(c.data), audio: true }));
    blocks.sort((a, b) => a.ms - b.ms || a.track - b.track);

    // A new cluster at each video keyframe, or when the current one passes 5 s.
    const clusters = [];
    let cur = null;
    for (const b of blocks) {
      const startNew = !cur || (b.track === 1 && b.key && b.ms !== cur.ms) || b.ms - cur.ms > 5000;
      if (startNew) { cur = { ms: b.ms, blocks: [], key: b.track === 1 && b.key }; clusters.push(cur); }
      cur.blocks.push(b);
    }
    const clusterEls = clusters.map(c => el(ID.Cluster, concat([el(ID.Timecode, uint(c.ms))].concat(c.blocks.map(b => {
      const rel = b.ms - c.ms;
      const hdr = new Uint8Array(4);
      hdr[0] = 0x80 | b.track;                 // track number as a 1-byte vint
      hdr[1] = (rel >> 8) & 255; hdr[2] = rel & 255;
      hdr[3] = b.key ? 0x80 : 0;
      return el(ID.SimpleBlock, concat([hdr, b.data]));
    })))));

    // SeekHead with fixed-width positions, so its size doesn't depend on them.
    const seek = (id, pos) => el(ID.Seek, concat([el(ID.SeekID, idBytes(id)), el(ID.SeekPosition, uint(pos, 8))]));
    const seekHeadSize = el(ID.SeekHead, concat([seek(ID.Info, 0), seek(ID.Tracks, 0), seek(ID.Cues, 0)])).length;
    const posInfo = seekHeadSize, posTracks = posInfo + info.length;
    let p = posTracks + tracksEl.length;
    const clusterPos = clusterEls.map(c => { const at = p; p += c.length; return at; });
    const posCues = p;
    const cues = el(ID.Cues, concat(clusters.map((c, i) => el(ID.CuePoint, concat([
      el(ID.CueTime, uint(c.ms)),
      el(ID.CueTrackPositions, concat([el(ID.CueTrack, uint(1)), el(ID.CueClusterPosition, uint(clusterPos[i]))]))
    ])))));
    const seekHead = el(ID.SeekHead, concat([seek(ID.Info, posInfo), seek(ID.Tracks, posTracks), seek(ID.Cues, posCues)]));
    const body = concat([seekHead, info, tracksEl].concat(clusterEls, [cues]));
    return concat([ebml, el(ID.Segment, body, 8)]);
  }

  const M = root.Motion = root.Motion || {};
  M.muxWebM = muxWebM;
  if (typeof module !== 'undefined' && module.exports) module.exports = { muxWebM, opusHead };
})(typeof window !== 'undefined' ? window : globalThis);
