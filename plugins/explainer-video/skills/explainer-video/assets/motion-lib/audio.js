/*!
 * motion-lib/audio.js — an optional soundtrack, synthesised in the page.
 *
 * Off by default (meta.audio.score: "off"). When on ("pulse" or "ambient"),
 * the whole track is rendered once in an OfflineAudioContext at 48 kHz for
 * the cut's exact duration: a soft pulse at the bpm (or a quiet pad), a sub
 * note on each scene's downbeat, a short noise sweep on transitions and a
 * tick when a counter lands. Every sound is generated here, so the track is
 * original by construction; noise comes from the seeded hash, so the same
 * spec renders the same audio.
 *
 * Preview plays the same rendered buffer, so preview and export match.
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  const RATE = 48000;
  const cache = new Map();

  function events(C) {
    const ev = { downbeats: [], transitions: [], landings: [] };
    C.scenes.forEach(s => {
      ev.downbeats.push(s.cStart);
      if (s.index > 0 && s.trIn.dur > 0) ev.transitions.push({ t: s.t0, dur: s.trIn.dur });
      s.layers.forEach(l => { if (l.kind === 'counter') ev.landings.push(s.cStart + l.at + l.dur); });
    });
    return ev;
  }

  function noiseBuffer(ctx, seed, seconds) {
    const n = Math.round(RATE * seconds);
    const b = ctx.createBuffer(1, n, RATE);
    const d = b.getChannelData(0);
    const r = M.rng(seed, 'noise');
    for (let i = 0; i < n; i++) d[i] = r() * 2 - 1;
    return b;
  }

  function env(g, t, a, peak, dcy) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy);
  }

  function kick(ctx, out, t, peak) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    env(g, t, 0.005, peak, 0.28);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.35);
  }
  function hat(ctx, out, noise, t, peak) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; f.type = 'highpass'; f.frequency.value = 7000;
    env(g, t, 0.002, peak, 0.05);
    s.connect(f).connect(g).connect(out); s.start(t, (t * 0.37) % 0.5); s.stop(t + 0.08);
  }
  function sub(ctx, out, t, peak) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 41.2;
    env(g, t, 0.02, peak, 1.1);
    o.connect(g).connect(out); o.start(t); o.stop(t + 1.2);
  }
  function whoosh(ctx, out, noise, t, dur, peak) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    const d = Math.max(0.25, dur);
    s.buffer = noise; f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(2400, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + d * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f).connect(g).connect(out); s.start(t, 0.5); s.stop(t + d + 0.02);
  }
  function tick(ctx, out, t, peak) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 1760;
    env(g, t, 0.002, peak, 0.05);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.07);
  }
  function pad(ctx, out, t0, t1, freq, peak) {
    const f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'lowpass'; f.frequency.value = 1100;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(1.2, (t1 - t0) / 2));
    g.gain.setValueAtTime(peak, Math.max(t0 + 0.01, t1 - 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, t1);
    [1, 1.5, 2.0].forEach((m, i) => {
      const o = ctx.createOscillator();
      o.type = 'triangle'; o.frequency.value = freq * m; o.detune.value = i === 1 ? 4 : -3;
      o.connect(f); o.start(t0); o.stop(t1 + 0.05);
    });
    f.connect(g).connect(out);
  }

  async function render(C) {
    const a = C.spec.meta.audio || {};
    const kind = a.score || 'off';
    if (kind === 'off') return null;
    const key = JSON.stringify([kind, a.bpm, C.duration, C.scenes.map(s => [s.t0, s.cStart, s.trIn.dur])]);
    if (cache.has(key)) return cache.get(key);
    const len = Math.ceil(C.duration * RATE);
    const ctx = new OfflineAudioContext(2, len, RATE);
    const master = ctx.createGain();
    const score = ctx.createGain(), fx = ctx.createGain();
    fx.gain.value = 0.5;                       // effects sit 6 dB under the score
    score.connect(master); fx.connect(master); master.connect(ctx.destination);
    const noise = noiseBuffer(ctx, C.seed, 2);
    const ev = events(C);
    const bpm = a.bpm || 112, beat = 60 / bpm;

    if (kind === 'pulse') {
      for (let i = 0, t = 0; t < C.duration - 0.05; i++, t = i * beat) {
        kick(ctx, score, t, i % 4 === 0 ? 0.5 : 0.28);
        if (t + beat / 2 < C.duration) hat(ctx, score, noise, t + beat / 2, 0.05);
      }
    } else if (kind === 'ambient') {
      const roots = [110, 87.31, 130.81, 98];   // A2 F2 C3 G2
      C.scenes.forEach((s, i) => pad(ctx, score, Math.max(0, s.cStart - 0.2), Math.min(C.duration, s.t1 + 0.4), roots[i % roots.length], 0.06));
    } else {
      throw new Error('meta.audio.score must be "off", "pulse" or "ambient"');
    }
    ev.downbeats.forEach(t => sub(ctx, score, t, 0.35));
    ev.transitions.forEach(x => whoosh(ctx, fx, noise, x.t, x.dur, 0.25));
    ev.landings.forEach(t => tick(ctx, fx, t, 0.2));

    const buf = await ctx.startRendering();
    normalise(buf, 0.12, 0.89);
    // Fade the last 50 ms so the file never ends on a click.
    const fade = Math.round(0.05 * RATE);
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < fade; i++) d[d.length - 1 - i] *= i / fade;
    }
    cache.set(key, buf);
    return buf;
  }

  // Simple RMS normalisation to a conservative level, with a peak ceiling.
  function normalise(buf, targetRms, ceiling) {
    let sum = 0, peak = 0, n = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < d.length; i++) { sum += d[i] * d[i]; peak = Math.max(peak, Math.abs(d[i])); n++; }
    }
    const rms = Math.sqrt(sum / Math.max(1, n));
    if (!rms) return;
    const k = Math.min(targetRms / rms, ceiling / Math.max(peak, 1e-6));
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] *= k;
    }
  }

  let live = null;
  async function preview(C, from) {
    stopPreview();
    const buf = await render(C);
    if (!buf) return;
    const ac = new AudioContext();
    const s = ac.createBufferSource();
    s.buffer = buf; s.connect(ac.destination);
    s.start(0, Math.max(0, Math.min(from || 0, buf.duration)));
    live = { ac, s };
  }
  function stopPreview() {
    if (!live) return;
    try { live.s.stop(); } catch (e) { /* already stopped */ }
    live.ac.close();
    live = null;
  }

  M.audio = { render, preview, stopPreview, events, RATE };
})(typeof window !== 'undefined' ? window : globalThis);
