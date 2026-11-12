#!/usr/bin/env node
/**
 * generate-theme.js — derive a whole charts-lib palette from ONE reference colour.
 *
 * Usage:
 *   node generate-theme.js '#2323FF'            # print palette + theme override
 *   node generate-theme.js '#2323FF' --json     # machine-readable
 *
 * Where extract-theme.js *harvests* colours from a brand's CSS, this script
 * *generates* them from a single brand colour ($Ref) using colour maths. The
 * two share one set of rules, so a palette derived either way has the same
 * shape: tinted paper, neutral ink, one-hue series ramp, three utility accents.
 *
 * All maths runs in OKLCH, not raw RGB. OKLCH lightness is perceptually even,
 * so "step the lightness by 0.1" produces steps that *look* evenly spaced;
 * doing the same in RGB or HSL bunches the dark end and washes out the light.
 *
 * The recipe (each step is a function below, in this order):
 *
 *   1. Paper   n0 takes $Ref's hue at ~4% saturation and 96% lightness, so a
 *              cool brand gets a cool grey and a warm brand a warm one. n3 is
 *              solved to land on exactly 3.0:1 against n0 — the WCAG 1.4.11
 *              floor for graphical objects, which is what de-emphasised fills
 *              are. n1/n2a/n2 divide the lightness between them evenly.
 *   2. Ink     Pure greyscale, no hue. Text stays crisp when it carries no
 *              chroma, and a tinted ink fights the tinted paper. n8→n4 step
 *              L 10/20/30/40/50%; n9 is black, nInverse white.
 *   3. Series  s1 a near-black shade of $Ref, s2 $Ref itself (forced to clear
 *              4.5:1 on n0), s3→s6 a tint ramp holding the hue while chroma
 *              eases off and lightness steps to ~0.85, s7 the same ramp one
 *              more step out but with the hue nudged ~12° so the lightest
 *              pastel keeps some life instead of going grey-dead.
 *   4. Accents accent = $Ref darker and duller (a muted sibling, not a rival).
 *              annotation = the complement, solved to 4.5:1 on n0 — an ink
 *              layer that sits *over* the data without joining it.
 *              counter = a 75° rotation picked in whichever direction lands
 *              furthest from annotation, giving diverging data a second hue
 *              that doesn't read as "error".
 *
 * No dependencies. Works on any Node 14+.
 */

// ── sRGB ↔ OKLCH ─────────────────────────────────────────────────────
const NAMED = { white: '#ffffff', black: '#000000' };

function toRgb(raw) {
  if (!raw) return null;
  let s = String(raw).trim().toLowerCase();
  if (NAMED[s]) s = NAMED[s];
  if (/^[0-9a-f]{3,8}$/.test(s)) s = '#' + s;
  let m = /^#([0-9a-f]{3,8})$/.exec(s);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map(ch => ch + ch).join('');
    if (h.length < 6) return null;
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(s);
  if (m) return { r: +m[1], g: +m[2], b: +m[3] };
  m = /^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/.exec(s);
  if (m) return hslToRgb(+m[1], +m[2] / 100, +m[3] / 100);
  m = /^oklch\(\s*([\d.]+)%?[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(s);
  if (m) return oklchToRgb({ L: +m[1] > 1 ? +m[1] / 100 : +m[1], C: +m[2], h: +m[3] });
  return null;
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return { r: Math.round(f(h + 1 / 3) * 255), g: Math.round(f(h) * 255), b: Math.round(f(h - 1 / 3) * 255) };
}

const clamp01 = v => Math.max(0, Math.min(1, v));
const srgbToLinear = v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const linearToSrgb = v => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);

function rgbToOklch(c) {
  const r = srgbToLinear(c.r / 255), g = srgbToLinear(c.g / 255), b = srgbToLinear(c.b / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  const C = Math.sqrt(A * A + B * B);
  const h = C < 1e-6 ? 0 : ((Math.atan2(B, A) * 180 / Math.PI) + 360) % 360;
  return { L, C, h };
}

function oklabToLinear({ L, a, b }) {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);
  return {
    r: +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  };
}

const inGamut = c => [c.r, c.g, c.b].every(v => v >= -1e-4 && v <= 1 + 1e-4);

/**
 * OKLCH → sRGB. Colours can sit outside the sRGB gamut (a vivid hue at high
 * lightness, say); rather than clipping channels — which shifts the hue — walk
 * the chroma down until the colour fits, which preserves hue and lightness.
 */
function oklchToRgb({ L, C, h }) {
  const rad = h * Math.PI / 180;
  let chroma = Math.max(0, C), lin = null;
  for (let i = 0; i < 40; i++) {
    lin = oklabToLinear({ L: clamp01(L), a: chroma * Math.cos(rad), b: chroma * Math.sin(rad) });
    if (inGamut(lin)) break;
    chroma *= 0.94;
  }
  return {
    r: Math.round(clamp01(linearToSrgb(clamp01(lin.r))) * 255),
    g: Math.round(clamp01(linearToSrgb(clamp01(lin.g))) * 255),
    b: Math.round(clamp01(linearToSrgb(clamp01(lin.b))) * 255)
  };
}

const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const hexOf = lch => hex(oklchToRgb(lch));

function luminance(c) {
  const f = v => srgbToLinear(v / 255);
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}
const contrast = (a, b) => {
  const l1 = luminance(a), l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

/**
 * Solve for the lightness that hits `target` contrast against `bg`, holding
 * hue and chroma. Contrast is monotonic in lightness on one side of the
 * background, so a bisection over [0, bg.L) (darker) or (bg.L, 1] (lighter)
 * converges in ~24 steps to well under a hex step.
 */
function solveLightness({ C, h }, bgRgb, target, dir = 'darker') {
  // Aim a hair past the target: the solved lightness is continuous but the hex
  // it rounds to is not, and landing exactly on 4.50 rounds down to 4.49.
  target *= 1.02;
  const bgL = rgbToOklch(bgRgb).L;
  let lo = dir === 'darker' ? 0 : bgL, hi = dir === 'darker' ? bgL : 1;
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2;
    const r = contrast(oklchToRgb({ L: mid, C, h }), bgRgb);
    if (dir === 'darker') { if (r > target) lo = mid; else hi = mid; }
    else { if (r > target) hi = mid; else lo = mid; }
  }
  return (lo + hi) / 2;
}

const hueDist = (a, b) => { const d = Math.abs(((a - b) % 360 + 360) % 360); return d > 180 ? 360 - d : d; };

// ── the palette recipe ───────────────────────────────────────────────
/**
 * Build the whole palette from one reference colour.
 *
 * opts lets a caller that has *observed* a real design (extract-theme.js
 * reading a brand's CSS) feed in what it saw, so the same maths runs over the
 * site's own colours instead of invented ones. Everything is optional; what is
 * missing gets derived from $Ref exactly as the pure-generation path does.
 *
 *   canvas      hex — the surface charts sit on. Its own hue and chroma drive
 *               the paper ramp, so an observed canvas keeps the brand's tint.
 *   dark        boolean — flips the recipe end to end: paper goes dark, the ink
 *               ladder climbs instead of descending, the series ramp fades
 *               *down* toward the paper, and every contrast solve looks for a
 *               lighter colour rather than a darker one.
 *   observed    { accent, annotation, counter } — hexes seen in the design. A
 *               role given here keeps the observed hue and chroma; only its
 *               lightness is re-solved to hit the role's contrast target, which
 *               is what makes a harvested colour safe to use as-is.
 *
 * Every role records where it came from in `.sources`, so the caller can tell
 * the user which colours are the brand's and which the maths invented.
 */
function generatePalette(refInput, opts = {}) {
  const refRgb = toRgb(refInput);
  if (!refRgb) throw new Error(`Not a colour: ${refInput}`);
  const ref = rgbToOklch(refRgb);
  const observed = opts.observed || {};
  const sources = {};

  // 1. Paper — $Ref's hue at a whisper of chroma, so the greys agree with the
  //    brand instead of sitting next to it. An observed canvas is used as-is:
  //    the brand already decided what its paper looks like.
  const canvasRgb = opts.canvas ? toRgb(opts.canvas) : null;
  const dark = opts.dark != null ? !!opts.dark
    : (canvasRgb ? luminance(canvasRgb) < 0.18 : false);
  //    Which way every contrast solve walks. On light paper a readable colour
  //    is darker than the canvas; on dark paper it is lighter. One flag drives
  //    the whole recipe rather than a second copy of it.
  const dir = dark ? 'lighter' : 'darker';
  const sign = dark ? 1 : -1;            // step direction, away from the paper
  const toPaper = (a, b) => (dark ? Math.max(a, b) : Math.min(a, b));

  sources.canvas = canvasRgb ? 'site' : 'derived';
  const paperC = Math.min(0.012, Math.max(0.004, ref.C * 0.06));
  const n0 = canvasRgb ? rgbToOklch(canvasRgb) : { L: dark ? 0.18 : 0.965, C: paperC, h: ref.h };
  const n0Rgb = canvasRgb || oklchToRgb(n0);
  //    The paper's own hue and chroma carry the ramp, capped so an observed
  //    canvas with real colour in it does not produce four tinted greys.
  const rampC = Math.min(n0.C, 0.02), rampH = n0.h;
  const n3 = { L: solveLightness({ C: rampC, h: rampH }, n0Rgb, 3.0, dir), C: rampC, h: rampH };
  //    n1 → n2a → n2 → n3, evenly spaced in perceptual lightness.
  const step = (n3.L - n0.L) / 4;
  const n1 = { L: n0.L + step, C: rampC, h: rampH };
  //    n0a is the panel/tile surface: half a step off the paper, so a geofacet
  //    tile reads as a box on the canvas rather than a hole in it. It sits
  //    BELOW the first hairline step on purpose — a tile edged by its own fill
  //    should be quieter than a gridline.
  const n0a = { L: n0.L + step * 0.5, C: rampC, h: rampH };
  const n2a = { L: n0.L + step * 2, C: rampC, h: rampH };
  const n2 = { L: n0.L + step * 3, C: rampC, h: rampH };

  // 2. Ink — greyscale by intent. HSL lightness (not OKLCH) so the steps land
  //    on the familiar #1a/#33/#4d/#66/#80 values designers expect to see. On a
  //    dark design the ladder runs the other way and nInverse flips with it —
  //    inverseText is the text drawn on *light* fills, which on a dark theme
  //    must be dark. Leaving it white is the classic vanishing-bar-label bug.
  const grey = pct => hex(hslToRgb(0, 0, pct / 100));
  const ink = dark
    ? { n9: '#FFFFFF', n8: grey(90), n7: grey(80), n6: grey(70), n5: grey(60), n4: grey(50), nInverse: '#000000' }
    : { n9: '#000000', n8: grey(10), n7: grey(20), n6: grey(30), n5: grey(40), n4: grey(50), nInverse: '#FFFFFF' };

  // 3. Series — one hue, seven ordered steps.
  //    s1: a near-black (near-white on dark) shade of $Ref rather than flat
  //    black, so the anchor belongs to the same family as the rest of the ramp.
  const s1 = { L: dark ? 0.93 : 0.16, C: Math.min(ref.C * 0.4, 0.06), h: ref.h };
  //    s2: $Ref itself — but data carries meaning, so it must clear 4.5:1 on
  //    the canvas. A brand colour too close to its own paper gets pushed away
  //    from it until it does.
  const s2 = contrast(refRgb, n0Rgb) >= 4.5
    ? { ...ref }
    : { L: solveLightness(ref, n0Rgb, 4.5, dir), C: ref.C, h: ref.h };
  //    s3–s6: hold the hue, ease the chroma off, step the lightness toward the
  //    paper — but never past the point where a tint stops being visible on it.
  //    SERIES_MIN is the floor a pastel must still clear against n0; the tail
  //    lightness is capped at whatever lightness lands exactly there.
  const SERIES_MIN = 1.5;
  const ceiling = (C, h) => solveLightness({ C, h }, n0Rgb, SERIES_MIN, dir);
  const tailTarget = dark ? n0.L + 0.12 : 0.85;
  const tail = toPaper(tailTarget, ceiling(s2.C * 0.55, ref.h));
  const steps = 4;
  const tints = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    tints.push({ L: s2.L + (tail - s2.L) * t, C: s2.C * (1 - 0.45 * t), h: ref.h });
  }
  //    s7: one step further out, hue nudged so the faintest tint reads as a
  //    colour and not as dirty paper.
  const s7h = (ref.h + 12) % 360, s7C = s2.C * 0.4;
  //    Never let the hue nudge push s7 back past s6 — the ramp has to keep
  //    moving one way, so s6 is the limit even when the ceiling is tighter.
  const s7 = {
    L: dark
      ? Math.min(tints[3].L, Math.max(n0.L + 0.06, ceiling(s7C, s7h)))
      : Math.max(tints[3].L, Math.min(0.90, ceiling(s7C, s7h))),
    C: s7C, h: s7h
  };

  // 4. Utility accents. Each takes an observed colour's hue and chroma when the
  //    caller found a plausible candidate in the design, and derives the hue by
  //    rotation when it did not. Either way the *lightness* is solved here, so
  //    a harvested colour arrives at the same contrast as a generated one — the
  //    site chooses the hue, the maths keeps it readable.
  const obs = k => (observed[k] ? rgbToOklch(toRgb(observed[k])) : null);
  //    An observed colour that already reads well is left where it is; only one
  //    that falls short gets moved. Solving unconditionally would *dim* a brand
  //    colour that happened to have contrast to spare, which is the opposite of
  //    matching the design.
  const keepOrSolve = (c, target) => {
    const away = dark ? c.L > n0.L : c.L < n0.L;
    return (away && contrast(oklchToRgb(c), n0Rgb) >= target)
      ? c.L : solveLightness(c, n0Rgb, target, dir);
  };

  //    accent (highlight): $Ref, darker and duller — a muted sibling of the
  //    brand colour, never a rival to it.
  const oAcc = obs('accent');
  sources.accent = oAcc ? 'site' : 'derived';
  const accBase = oAcc || { C: s2.C * 0.7, h: ref.h, L: Math.max(0.12, Math.min(0.94, s2.L + sign * 0.20)) };
  const accent = { C: accBase.C, h: accBase.h, L: keepOrSolve(accBase, 3.0) };

  //    annotation (callout): the ink layer that sits *over* the data. Derived
  //    as the complement; observed when the design already carries a colour far
  //    enough round the wheel to do the job.
  const oAnn = obs('annotation');
  sources.annotation = oAnn ? 'site' : 'derived';
  const annH = oAnn ? oAnn.h : (ref.h + 165) % 360;
  const annC = oAnn ? oAnn.C : ref.C;
  const annotation = { C: annC, h: annH,
    L: oAnn ? keepOrSolve({ C: annC, h: annH, L: oAnn.L }, 4.5)
            : solveLightness({ C: annC, h: annH }, n0Rgb, 4.5, dir) };

  //    counter: the other pole of diverging data. Derived at ±75° from $Ref,
  //    taking whichever side lands furthest from the annotation hue so the two
  //    never get confused in a legend.
  const oCnt = obs('counter');
  sources.counter = oCnt ? 'site' : 'derived';
  const cwH = (ref.h + 75) % 360, ccwH = (ref.h - 75 + 360) % 360;
  const counterH = oCnt ? oCnt.h : (hueDist(cwH, annH) >= hueDist(ccwH, annH) ? cwH : ccwH);
  const counterC = oCnt ? oCnt.C : ref.C;
  const counter = { C: counterC, h: counterH,
    L: oCnt ? keepOrSolve({ C: counterC, h: counterH, L: oCnt.L }, 4.5)
            : solveLightness({ C: counterC, h: counterH }, n0Rgb, 4.5, dir) };

  const lch = {
    n0, n0a, n1, n2a, n2, n3,
    s1, s2, s3: tints[0], s4: tints[1], s5: tints[2], s6: tints[3], s7,
    accent, annotation, counter
  };
  const out = { ref: hex(refRgb) };
  for (const [k, v] of Object.entries(lch)) out[k] = hexOf(v);
  if (canvasRgb) out.n0 = hex(canvasRgb);
  Object.assign(out, ink);
  return { hexes: out, lch, n0Rgb, ref, dark, sources };
}

// ── report ───────────────────────────────────────────────────────────
// The block hands the PALETTE to Charts.applyPalette, which re-derives every
// theme role from it — rather than listing the roles one by one. theme.js owns
// that mapping, and it covers roles a hand-written list keeps forgetting:
// tileSurface/tileTrack (geofacet panels), tooltipBorder, dimmed, hoverInk.
// Those stayed on the default cream whenever a reskin only assigned the
// obvious dozen, which is how a dark dashboard ended up with pale tiles.
function themeBlock(p) {
  const c = p.hexes;
  return `Charts.applyPalette({
  n0:  '${c.n0}',   // canvas
  n0a: '${c.n0a}',   // tile / panel surface
  n1:  '${c.n1}',   // hairlines, gridlines
  n2a: '${c.n2a}',   // de-emphasis ramp, lightest
  n2:  '${c.n2}',
  n3:  '${c.n3}',   // muted fill — the 3:1 floor
  n4:  '${c.n4}',   // subtitle / secondary text
  n5:  '${c.n5}',   // connector labels
  n6:  '${c.n6}',
  n7:  '${c.n7}',   // body / tick text
  n8:  '${c.n8}',   // titles, categories, values
  n9:  '${c.n9}',   // spines, ticks
  nInverse: '${c.nInverse}',   // text on dark fills — flips on a dark theme
  s1:  '${c.s1}',   // series ramp, primary first
  s2:  '${c.s2}',
  s3:  '${c.s3}',
  s4:  '${c.s4}',
  s5:  '${c.s5}',
  s6:  '${c.s6}',
  s7:  '${c.s7}',
  accent:     '${c.accent}',   // selection / highlight
  annotation: '${c.annotation}',   // callout leaders, threshold rules
  counter:    '${c.counter}'    // the against-the-grain direction
});`;
}

function report(p) {
  const c = p.hexes, bg = p.n0Rgb;
  const pad = s => String(s).padEnd(14);
  const rows = [];
  const check = (label, hexVal, min, max) => {
    const r = contrast(toRgb(hexVal), bg);
    const ok = r >= min && (max === undefined || r <= max);
    rows.push(`  ${ok ? 'ok  ' : 'FAIL'} ${pad(label)} ${hexVal}  ${r.toFixed(2)}:1  (want ${max === undefined ? '>= ' + min : min + '–' + max})`);
    return ok;
  };
  let allOk = true;
  const and = v => { allOk = allOk && v; };
  and(check('title/value', c.n8, 4.5));
  and(check('tick text', c.n7, 4.5));
  and(check('subtitle', c.n4, 3));
  and(check('gridline n1', c.n1, 1.05, 1.7));
  // A tile has to be visible as a tile. Below ~1.03:1 it vanishes into the
  // canvas; past the gridline step it stops reading as a surface and starts
  // reading as a filled block.
  and(check('tile surface n0a', c.n0a, 1.03, 1.4));
  and(check('muted fill n3', c.n3, 2.9, 3.15));
  and(check('series s2', c.s2, 4.5));
  and(check('annotation', c.annotation, 4.4));
  and(check('counter', c.counter, 4.4));
  ['s3', 's4', 's5', 's6', 's7'].forEach(k => {
    const r = contrast(toRgb(c[k]), bg);
    if (r < 1.48) { rows.push(`  FAIL ${pad(k)} ${c[k]}  ${r.toFixed(2)}:1  (too close to canvas)`); allOk = false; }
  });
  const labelOnBar = contrast(toRgb(c.s1), toRgb(c.nInverse));
  rows.push(`  ${labelOnBar >= 4.5 ? 'ok  ' : 'warn'} ${pad('label-on-bar')} inverseText on s1  ${labelOnBar.toFixed(2)}:1`);
  return { rows, allOk };
}

// ── CLI ──────────────────────────────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2);
  const refArg = args.find(a => !a.startsWith('--'));
  const flag = name => {
    const i = args.indexOf('--' + name);
    return i >= 0 ? args[i + 1] : null;
  };
  if (!refArg) {
    console.error("usage: node generate-theme.js '#2323FF' [--canvas '#fff'] [--dark] [--json]");
    process.exit(2);
  }
  const p = generatePalette(refArg, {
    canvas: flag('canvas'),
    dark: args.includes('--dark') ? true : undefined,
    observed: {
      accent: flag('accent'),
      annotation: flag('annotation'),
      counter: flag('counter')
    }
  });
  if (args.includes('--json')) {
    console.log(JSON.stringify(p.hexes, null, 2));
    process.exit(0);
  }
  const r = report(p);
  const ref = p.ref;
  console.log(`\nReference ${p.hexes.ref}  →  OKLCH(L ${ref.L.toFixed(3)}, C ${ref.C.toFixed(3)}, h ${ref.h.toFixed(1)}°)`);
  console.log(p.sources.canvas === 'site'
    ? `Canvas taken from the design; the paper ramp follows its own hue.`
    : `Paper is ${ref.h >= 120 && ref.h <= 320 ? 'cool' : 'warm'}-tinted, following the reference hue.`);
  console.log(`Design reads as: ${p.dark ? 'DARK' : 'LIGHT'}`);
  const bySite = Object.entries(p.sources).filter(([, v]) => v === 'site').map(([k]) => k);
  console.log(bySite.length ? `Taken from the design: ${bySite.join(', ')}\n` : '');
  console.log('Palette');
  for (const k of ['n0', 'n0a', 'n1', 'n2a', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9', 'nInverse',
                   's1', 's2', 's3', 's4', 's5', 's6', 's7', 'accent', 'annotation', 'counter']) {
    console.log('  ' + String(k).padEnd(12) + p.hexes[k]);
  }
  console.log('\nPaste this after theme.js loads and before the first chart call:\n');
  console.log(themeBlock(p));
  console.log('\nContrast report (against the canvas n0)');
  console.log(r.rows.join('\n'));
  console.log(r.allOk
    ? '\nAll required ratios pass. Still look at the rendered page before shipping.'
    : '\nFix the FAIL rows above by hand before using this palette.');
}

module.exports = {
  toRgb, hex, rgbToOklch, oklchToRgb, hexOf, contrast, luminance,
  solveLightness, generatePalette, themeBlock, report
};
