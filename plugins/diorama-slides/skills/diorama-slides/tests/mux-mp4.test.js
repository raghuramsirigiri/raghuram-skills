// node --test plugins/explainer-video/skills/explainer-video/tests/mux-mp4.test.js
//
// Fake encoded chunks in, then a small box parser checks the file's shape:
// ftyp first, moov before mdat, sample counts and sizes, chunk offsets that
// land inside mdat on the right bytes, keyframes in stss, durations, ctts
// only when needed, and a well-formed audio track.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { muxMP4 } = require(path.join(__dirname, '..', 'assets', 'motion-lib', 'mux-mp4.js'));

const u32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const type = (b, o) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'dinf', 'edts']);

function parse(b, start, end) {
  const out = [];
  let o = start || 0;
  const e = end == null ? b.length : end;
  while (o + 8 <= e) {
    let size = u32(b, o);
    const t = type(b, o + 4);
    let hdr = 8;
    if (size === 1) { size = u32(b, o + 8) * 4294967296 + u32(b, o + 12); hdr = 16; }
    const box = { type: t, start: o, size, body: o + hdr };
    if (CONTAINERS.has(t)) box.kids = parse(b, o + hdr, o + size);
    out.push(box);
    o += size;
  }
  return out;
}
const find = (boxes, t) => boxes.find(x => x.type === t);
const path_ = (boxes, ...ts) => ts.reduce((bx, t) => bx && find(bx.kids || bx, t), { kids: boxes });
const full = (b, box) => box.body + 4;   // skip version + flags

// Video: 90 frames at 30 fps, keyframe every 60, chunk bytes = its index (so offsets are checkable).
function videoChunks(n, opts) {
  opts = opts || {};
  return Array.from({ length: n }, (_, i) => {
    const size = 10 + (i % 7);
    const data = new Uint8Array(size).fill(i & 255);
    const ts = opts.reorder ? reorderTs(i, n) : i * 1e6 / 30;
    return { data, timestamp: Math.round(ts), key: i % 60 === 0 };
  });
}
// B-frame style order: I P B B P B B ... (decode order), presentation timestamps shuffled.
function reorderTs(i, n) {
  if (i === 0) return 0;
  const g = Math.floor((i - 1) / 3), r = (i - 1) % 3;
  const base = 1 + g * 3;
  const pts = r === 0 ? base + 2 : base + r - 1;
  return Math.min(pts, n - 1) * 1e6 / 30;
}
const avcC = Uint8Array.of(1, 0x64, 0, 0x28, 0xff, 0xe1, 0, 4, 0x67, 0x64, 0, 0x28, 1, 0, 4, 0x68, 0xee, 0x3c, 0x80);

test('ftyp first, moov before mdat (fast start)', () => {
  const b = muxMP4({ video: { width: 1080, height: 1920, fps: 30, description: avcC, chunks: videoChunks(90) } });
  const top = parse(b);
  assert.deepStrictEqual(top.map(x => x.type), ['ftyp', 'moov', 'mdat']);
  assert.strictEqual(top[2].start + top[2].size, b.length);
});

test('sample count, sizes, durations and keyframes are right', () => {
  const ch = videoChunks(90);
  const b = muxMP4({ video: { width: 1080, height: 1920, fps: 30, description: avcC, chunks: ch } });
  const top = parse(b);
  const stbl = path_(top, 'moov', 'trak', 'mdia', 'minf', 'stbl');
  const stsz = find(stbl.kids, 'stsz');
  assert.strictEqual(u32(b, full(b, stsz) + 4), 90);
  for (let i = 0; i < 90; i++) assert.strictEqual(u32(b, full(b, stsz) + 8 + i * 4), ch[i].data.length);
  const stts = find(stbl.kids, 'stts');
  assert.strictEqual(u32(b, full(b, stts)), 1);                 // one run
  assert.strictEqual(u32(b, full(b, stts) + 4), 90);
  assert.strictEqual(u32(b, full(b, stts) + 8), 100);           // delta at timescale fps*100
  const mdhd = path_(top, 'moov', 'trak', 'mdia', 'mdhd');
  assert.strictEqual(u32(b, full(b, mdhd) + 8), 3000);          // timescale
  assert.strictEqual(u32(b, full(b, mdhd) + 12), 9000);         // 90 frames x 100 = 3.0 s
  const mvhd = path_(top, 'moov', 'mvhd');
  assert.strictEqual(u32(b, full(b, mvhd) + 12), 3000);         // 3000 ms
  const stss = find(stbl.kids, 'stss');
  assert.strictEqual(u32(b, full(b, stss)), 2);
  assert.strictEqual(u32(b, full(b, stss) + 4), 1);
  assert.strictEqual(u32(b, full(b, stss) + 8), 61);
  assert.ok(!find(stbl.kids, 'ctts'), 'no ctts when presentation order = decode order');
  const tkhd = path_(top, 'moov', 'trak', 'tkhd');
  assert.strictEqual(u32(b, full(b, tkhd) + 72) / 65536, 1080);
  assert.strictEqual(u32(b, full(b, tkhd) + 76) / 65536, 1920);
});

test('chunk offsets land inside mdat on each chunk\'s first sample', () => {
  const ch = videoChunks(90);
  const b = muxMP4({ video: { width: 640, height: 360, fps: 30, description: avcC, chunks: ch } });
  const top = parse(b);
  const mdat = find(top, 'mdat');
  const stbl = path_(top, 'moov', 'trak', 'mdia', 'minf', 'stbl');
  const stco = find(stbl.kids, 'stco');
  const stsc = find(stbl.kids, 'stsc');
  const nChunks = u32(b, full(b, stco));
  // Expand stsc into the first sample index of each chunk.
  const entries = u32(b, full(b, stsc));
  const runs = [];
  for (let i = 0; i < entries; i++) runs.push([u32(b, full(b, stsc) + 4 + i * 12), u32(b, full(b, stsc) + 8 + i * 12)]);
  let sample = 0;
  for (let c = 1; c <= nChunks; c++) {
    const per = runs.filter(r => r[0] <= c).pop()[1];
    const off = u32(b, full(b, stco) + 4 + (c - 1) * 4);
    assert.ok(off >= mdat.body && off < mdat.start + mdat.size, 'offset in mdat');
    assert.strictEqual(b[off], sample & 255, 'chunk ' + c + ' starts on sample ' + sample);
    sample += per;
  }
  assert.strictEqual(sample, 90);
});

test('B-frame order gets a ctts and an edit list', () => {
  const ch = videoChunks(31, { reorder: true });
  const b = muxMP4({ video: { width: 640, height: 360, fps: 30, description: avcC, chunks: ch } });
  const top = parse(b);
  const trak = path_(top, 'moov', 'trak');
  assert.ok(find(trak.kids, 'edts'), 'edit list present');
  assert.ok(find(path_(top, 'moov', 'trak', 'mdia', 'minf', 'stbl').kids, 'ctts'), 'ctts present');
});

test('an audio track is well formed and interleaved', () => {
  const v = videoChunks(90);
  const a = Array.from({ length: Math.ceil(3 * 48000 / 1024) }, (_, i) => ({ data: new Uint8Array(20).fill(200), timestamp: Math.round(i * 1024 / 48000 * 1e6) }));
  const asc = Uint8Array.of(0x11, 0x90);
  const b = muxMP4({ video: { width: 640, height: 360, fps: 30, description: avcC, chunks: v }, audio: { sampleRate: 48000, channels: 2, description: asc, chunks: a } });
  const top = parse(b);
  const moov = find(top, 'moov');
  const traks = moov.kids.filter(k => k.type === 'trak');
  assert.strictEqual(traks.length, 2);
  const at = traks[1];
  const hdlr = find(find(at.kids, 'mdia').kids, 'hdlr');
  assert.strictEqual(type(b, full(b, hdlr) + 4), 'soun');
  const stbl = find(find(find(at.kids, 'mdia').kids, 'minf').kids, 'stbl');
  const stsd = find(stbl.kids, 'stsd');
  assert.strictEqual(type(b, full(b, stsd) + 8), 'mp4a');
  assert.ok(Buffer.from(b.subarray(stsd.start, stsd.start + stsd.size)).includes(Buffer.from('esds')));
  assert.strictEqual(u32(b, full(b, find(stbl.kids, 'stsz')) + 4), a.length);
  const mdhd = find(find(at.kids, 'mdia').kids, 'mdhd');
  assert.strictEqual(u32(b, full(b, mdhd) + 8), 48000);
  // Interleaving: audio and video chunk offsets alternate rather than all video first.
  const vOff = u32(b, full(b, find(path_(top, 'moov', 'trak', 'mdia', 'minf', 'stbl').kids, 'stco')) + 8);
  const aOff = u32(b, full(b, find(stbl.kids, 'stco')) + 4);
  assert.ok(aOff < vOff, 'the first audio chunk sits before the second video chunk');
});

test('no chunks is a readable error', () => {
  assert.throws(() => muxMP4({ video: { chunks: [] } }), /no video chunks/);
});
