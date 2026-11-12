// node --test plugins/explainer-video/skills/explainer-video/tests/mux-webm.test.js
//
// EBML parse of the muxer's output: the header says webm; cluster timecodes
// rise; every cluster starts on a keyframe; Cues point at clusters; the
// duration is right; an Opus track carries its OpusHead.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { muxWebM } = require(path.join(__dirname, '..', 'assets', 'motion-lib', 'mux-webm.js'));

const MASTER = new Set([0x1A45DFA3, 0x18538067, 0x114D9B74, 0x4DBB, 0x1549A966, 0x1654AE6B, 0xAE, 0xE0, 0xE1, 0x1F43B675, 0x1C53BB6B, 0xBB, 0xB7]);
function readId(b, o) {
  const first = b[o];
  let len = 1;
  while (len <= 4 && !(first & (0x80 >> (len - 1)))) len++;
  let id = 0;
  for (let i = 0; i < len; i++) id = id * 256 + b[o + i];
  return { id, len };
}
function readSize(b, o) {
  const first = b[o];
  let len = 1;
  while (len <= 8 && !(first & (0x80 >> (len - 1)))) len++;
  let v = first & (0xff >> len);
  for (let i = 1; i < len; i++) v = v * 256 + b[o + i];
  return { size: v, len };
}
function parse(b, start, end) {
  const out = [];
  let o = start;
  while (o < end) {
    const { id, len } = readId(b, o);
    const s = readSize(b, o + len);
    const body = o + len + s.len;
    const el = { id, start: o, body, end: body + s.size };
    if (MASTER.has(id)) el.kids = parse(b, body, el.end);
    out.push(el);
    o = el.end;
  }
  return out;
}
const uint = (b, el) => { let v = 0; for (let i = el.body; i < el.end; i++) v = v * 256 + b[i]; return v; };
const f64 = (b, el) => new DataView(b.buffer, b.byteOffset + el.body, 8).getFloat64(0);
const str = (b, el) => Buffer.from(b.subarray(el.body, el.end)).toString('latin1');
const kid = (el, id) => el.kids.find(k => k.id === id);

function chunks(n) {
  return Array.from({ length: n }, (_, i) => ({ data: new Uint8Array(12).fill(i & 255), timestamp: Math.round(i * 1e6 / 30), key: i % 60 === 0 }));
}

test('header says webm and the segment holds info, tracks, clusters and cues', () => {
  const b = muxWebM({ video: { width: 1080, height: 1080, fps: 30, chunks: chunks(150) } });
  const top = parse(b, 0, b.length);
  assert.strictEqual(top[0].id, 0x1A45DFA3);
  assert.strictEqual(str(b, kid(top[0], 0x4282)), 'webm');
  const seg = top[1];
  assert.strictEqual(seg.id, 0x18538067);
  assert.strictEqual(seg.end, b.length);
  const ids = seg.kids.map(k => k.id);
  assert.ok(ids.includes(0x1549A966) && ids.includes(0x1654AE6B) && ids.includes(0x1C53BB6B));
  const info = kid(seg, 0x1549A966);
  assert.strictEqual(uint(b, kid(info, 0x2AD7B1)), 1000000);
  assert.ok(Math.abs(f64(b, kid(info, 0x4489)) - 5000) < 1e-6, '150 frames at 30 fps = 5000 ms');
  const track = kid(kid(seg, 0x1654AE6B), 0xAE);
  assert.strictEqual(str(b, kid(track, 0x86)), 'V_VP9');
  assert.strictEqual(uint(b, kid(kid(track, 0xE0), 0xB0)), 1080);
});

test('clusters start on keyframes with rising timecodes, and cues point at them', () => {
  const b = muxWebM({ video: { width: 640, height: 360, fps: 30, chunks: chunks(150) } });
  const seg = parse(b, 0, b.length)[1];
  const clusters = seg.kids.filter(k => k.id === 0x1F43B675);
  assert.strictEqual(clusters.length, 3);
  let prev = -1, blocks = 0;
  for (const c of clusters) {
    const tc = uint(b, kid(c, 0xE7));
    assert.ok(tc > prev); prev = tc;
    const first = c.kids.find(k => k.id === 0xA3);
    assert.strictEqual(b[first.body + 3] & 0x80, 0x80, 'first block is a keyframe');
    blocks += c.kids.filter(k => k.id === 0xA3).length;
  }
  assert.strictEqual(blocks, 150);
  const cues = kid(seg, 0x1C53BB6B).kids;
  assert.strictEqual(cues.length, clusters.length);
  cues.forEach((cp, i) => {
    const pos = uint(b, kid(kid(cp, 0xB7), 0xF1));
    assert.strictEqual(seg.body + pos, clusters[i].start, 'cue ' + i + ' points at its cluster');
    assert.strictEqual(uint(b, kid(cp, 0xB3)), uint(b, kid(clusters[i], 0xE7)));
  });
});

test('seek head points at info, tracks and cues', () => {
  const b = muxWebM({ video: { width: 640, height: 360, fps: 30, chunks: chunks(90) } });
  const seg = parse(b, 0, b.length)[1];
  const sh = kid(seg, 0x114D9B74);
  sh.kids.forEach(s => {
    const idEl = kid(s, 0x53AB), pos = uint(b, kid(s, 0x53AC));
    const target = readId(b, seg.body + pos).id;
    let want = 0;
    for (let i = idEl.body; i < idEl.end; i++) want = want * 256 + b[i];
    assert.strictEqual(target, want);
  });
});

test('an Opus track carries an OpusHead and its blocks interleave', () => {
  const a = Array.from({ length: 150 }, (_, i) => ({ data: new Uint8Array(8).fill(7), timestamp: i * 20000 }));
  const b = muxWebM({ video: { width: 640, height: 360, fps: 30, chunks: chunks(90) }, audio: { sampleRate: 48000, channels: 2, chunks: a } });
  const seg = parse(b, 0, b.length)[1];
  const tracks = kid(seg, 0x1654AE6B).kids;
  assert.strictEqual(tracks.length, 2);
  assert.strictEqual(str(b, kid(tracks[1], 0x86)), 'A_OPUS');
  assert.ok(str(b, kid(tracks[1], 0x63A2)).startsWith('OpusHead'));
  const first = seg.kids.find(k => k.id === 0x1F43B675);
  const trackNums = new Set(first.kids.filter(k => k.id === 0xA3).map(k => b[k.body] & 0x7f));
  assert.deepStrictEqual([...trackNums].sort(), [1, 2]);
});
