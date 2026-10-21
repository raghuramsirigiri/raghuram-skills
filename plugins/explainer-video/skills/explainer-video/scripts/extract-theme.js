#!/usr/bin/env node
/**
 * extract-theme.js — derive a Charts.theme override from a reference design.
 *
 * Usage:
 *   node extract-theme.js <url-or-file-or-dir> [more…] [--write <page.html>]
 *
 * Give it a brand's CSS and/or HTML — a live URL, a saved page, an exported
 * stylesheet, a directory containing them — and it prints:
 *   1. what it found, so you can sanity-check the mapping
 *   2. a Charts.theme override block ready to paste
 *   3. a contrast report flagging anything unreadable
 *
 * The colours it finds are fed through the same OKLCH recipe generate-theme.js
 * runs from a single hex — see that file for the maths. Roles the design can
 * fill (accent, annotation, counter) are taken from the design; roles it cannot
 * are derived from the harvested series hue.
 *
 * A URL is fetched first (page + its stylesheets, via fetch-design.js) into a
 * temp folder, which is then read exactly like local files. That fetch runs no
 * JavaScript: check the "read N file(s)" line before trusting a palette built
 * from a site that paints itself from JS.
 *
 * `--write <page.html>` applies the result instead of printing it for you to
 * paste: the generated `Charts.applyPalette` block replaces the template's
 * brand-recolour placeholder in that page. Re-running it replaces the block
 * again, so a page can be re-skinned without hand-editing. The library's own
 * theme.js is never modified — it holds the *default* palette and the
 * palette → role derivation, and a page that edits it stops being portable.
 *
 * It proposes; you decide. Reading the report matters more than pasting the
 * block — an extractor cannot know that a brand's "--accent-2" is reserved for
 * error states, and a palette that passes every ratio can still be wrong.
 *
 * No dependencies. Works on any Node 14+.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const G = require('./generate-theme.js');

// ── colour parsing ───────────────────────────────────────────────────
const NAMED = { white: '#ffffff', black: '#000000' };

function toRgb(raw) {
  if (!raw) return null;
  let s = String(raw).trim().toLowerCase();
  if (NAMED[s]) s = NAMED[s];
  let m = /^#([0-9a-f]{3,8})$/.exec(s);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
    if (h.length < 6) return null;
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(s);
  if (m) return { r: +m[1], g: +m[2], b: +m[3] };
  m = /^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/.exec(s);
  if (m) return hslToRgb(+m[1], +m[2] / 100, +m[3] / 100);
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

const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

function luminance(c) {
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}

const contrast = (a, b) => {
  const l1 = luminance(a), l2 = luminance(b);
  return ((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05));
};

const mix = (a, b, t) => ({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t });
const saturation = c => {
  const mx = Math.max(c.r, c.g, c.b), mn = Math.min(c.r, c.g, c.b);
  return mx === 0 ? 0 : (mx - mn) / mx;
};

// ── gather source text ───────────────────────────────────────────────
function collectFiles(target) {
  const st = fs.statSync(target);
  if (st.isFile()) return [target];
  return fs.readdirSync(target)
    .map(f => path.join(target, f))
    .filter(f => fs.statSync(f).isFile() && /\.(css|html?)$/i.test(f));
}

const argv = process.argv.slice(2);
const wi = argv.indexOf('--write');
const writeTarget = wi >= 0 ? argv[wi + 1] : null;
const inputs = wi >= 0 ? argv.filter((a, i) => i !== wi && i !== wi + 1) : argv.slice();
if (!inputs.length) {
  console.error('usage: node extract-theme.js <url-or-file-or-dir> [more…] [--write <page.html>]');
  process.exit(2);
}
if (wi >= 0 && !writeTarget) { console.error('--write needs a file path'); process.exit(2); }

// A URL is fetched into a temp folder and then read like any other source, so
// everything downstream — harvest, ranking, recipe — is one code path whether
// the design arrived over the wire or off disk.
const fetched = [];
const resolved = inputs.map(src => {
  if (!/^https?:\/\//i.test(src)) return src;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'brand-'));
  try {
    const out = execFileSync(process.execPath, [path.join(__dirname, 'fetch-design.js'), src, '-o', dir],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    console.log(out.split('\nNow run:')[0]);
  } catch (e) {
    console.error('Could not fetch ' + src + ': ' + String((e.stderr || e.message)).trim());
    console.error('Ask the user for their stylesheet, or a few hex codes, and use those instead.');
    process.exit(1);
  }
  fetched.push({ url: src, dir });
  return dir;
});
const files = resolved.flatMap(collectFiles);
if (!files.length) { console.error('No .css/.html files found.'); process.exit(2); }
const css = files.map(f => fs.readFileSync(f, 'utf8')).join('\n');

// ── typeface ─────────────────────────────────────────────────────────
// A face is reported, never assigned. `Charts.theme.font` takes a CSS stack
// that has to resolve on the *reader's* machine, and a chart is the worst
// place to find out it didn't: a substituted face at 11px silently re-measures
// every axis label, so labels the engine had fitted now collide. The rule is
// the one in theming.md — a family only goes into the theme if the page can
// actually load it (a Google Fonts link the site already carries, or a face
// common enough to be a system font), and the template's fallbacks always stay
// behind it. Everything else is reported, so you can tell the user what their
// brand uses and why the charts are not using it.
const SYSTEM_SAFE = /^(inter|arial|helvetica( neue)?|georgia|times( new roman)?|verdana|tahoma|trebuchet ms|courier( new)?|segoe ui|roboto|system-ui|-apple-system|ui-sans-serif|ui-serif|sans-serif|serif|monospace)$/i;
const googleFamilies = new Set();
for (const m of css.matchAll(/fonts\.googleapis\.com\/css2?\?([^"'\s>)]+)/g)) {
  for (const f of m[1].matchAll(/family=([^&:]+)/g)) {
    googleFamilies.add(decodeURIComponent(f[1].replace(/\+/g, ' ')).trim());
  }
}
const fontUse = new Map();
for (const m of css.matchAll(/font-family\s*:\s*([^;}{]+)[;}]/gi)) {
  const stack = m[1].trim().replace(/\s+/g, ' ');
  const first = (stack.split(',')[0] || '').trim().replace(/^["']|["']$/g, '');
  if (!first || /^(inherit|initial|unset|var\()/i.test(first)) continue;
  const e = fontUse.get(first) || { n: 0, stack };
  e.n++; fontUse.set(first, e);
}
const fontRanked = [...fontUse.entries()].sort((a, b) => b[1].n - a[1].n);
const bodyFace = fontRanked[0] || null;
const fontLoadable = !!bodyFace && (googleFamilies.has(bodyFace[0]) || SYSTEM_SAFE.test(bodyFace[0]));

// ── harvest ──────────────────────────────────────────────────────────
// 1. Custom properties: the brand has already named the roles for us.
const vars = new Map();
for (const m of css.matchAll(/(--[\w-]+)\s*:\s*([^;}{]+)[;}]/g)) {
  const rgb = toRgb(m[2]);
  if (rgb) vars.set(m[1].toLowerCase(), { hex: hex(rgb), rgb });
}

// 2. Declared colours by property context and frequency.
const ctx = { bg: new Map(), text: new Map(), border: new Map() };
const bump = (map, k) => map.set(k, (map.get(k) || 0) + 1);
for (const m of css.matchAll(/([\w-]*background[\w-]*|color|border[\w-]*|fill)\s*:\s*([^;}{]+)[;}]/gi)) {
  const prop = m[1].toLowerCase(), val = m[2];
  for (const tok of val.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)/g) || []) {
    const rgb = toRgb(tok);
    if (!rgb) continue;
    const h = hex(rgb);
    if (/background/.test(prop)) bump(ctx.bg, h);
    else if (prop === 'color' || prop === 'fill') bump(ctx.text, h);
    else bump(ctx.border, h);
  }
}

const byCount = m => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([h, n]) => ({ hex: h, n, rgb: toRgb(h) }));
const bgs = byCount(ctx.bg), texts = byCount(ctx.text), borders = byCount(ctx.border);

// Names are only a hint. "--ink" means body text in most design systems and the
// page background in others, so every name-based pick is validated against the
// role's actual requirement (contrast, saturation) and discarded if it fails.
const pickVar = (...names) => {
  for (const n of names) for (const [k, v] of vars) if (k.includes(n)) return v;
  return null;
};
const validate = (cand, test) => (cand && test(cand) ? cand : null);

const all = [...vars.values(), ...bgs, ...texts, ...borders].filter(c => c && c.rgb);
const uniq = new Map(all.map(c => [c.hex, c]));
const pool = [...uniq.values()];

// How hard the design leans on each colour. The per-context counts are about to
// be deduped into `pool`, which keeps one entry per hex and therefore one
// context's count, so the totals are tallied here first. Two numbers matter:
// how often a colour is declared, and how many *kinds* of declaration it turns
// up in — a colour used as a button fill, as text and as a rule is carrying the
// brand, while one that only ever paints a single panel is decoration.
const usage = new Map();
const noteUse = (list, kind) => list.forEach(c => {
  const u = usage.get(c.hex) || { total: 0, kinds: new Set() };
  u.total += c.n; u.kinds.add(kind); usage.set(c.hex, u);
});
noteUse(bgs, 'bg'); noteUse(texts, 'text'); noteUse(borders, 'border');
const useOf = h => usage.get(h) || { total: 0, kinds: new Set() };

// Canvas: what the charts sit on. "Most-declared background" is the obvious
// pick and it is wrong on any real stylesheet: GOV.UK declares its focus-state
// yellow #ffdd00 on more elements than anything else, so the naive rule hands
// back a canary dashboard. Three tests, in order of how much they actually
// know:
//   1. what the page paints on `body` / `html` / `:root` — the real canvas,
//      stated by the design itself;
//   2. a named surface/background variable;
//   3. the most-declared background that could plausibly be a page ground —
//      near-neutral, since a saturated one is a highlight, a badge or a
//      callout, not a canvas.
const BODY_BG = /(^|[,}])\s*(?:html|body|:root)[^{}]*\{([^}]*)\}/gi;
const bodyBgs = [];
for (const m of css.matchAll(BODY_BG)) {
  const decl = /(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/i.exec(m[2]);
  if (!decl) continue;
  const tok = (decl[1].match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)/) || [])[0];
  const rgb = tok && toRgb(tok);
  if (rgb) bodyBgs.push({ hex: hex(rgb), rgb, n: 1 });
}
const plausibleGround = c => G.rgbToOklch(c.rgb).C < 0.08;
const surface = bodyBgs[0]
  || validate(pickVar('surface', 'canvas', 'page-bg', 'background'), plausibleGround)
  || bgs.filter(plausibleGround)[0]
  || bgs[0]
  || { hex: '#f4f3f0', rgb: toRgb('#f4f3f0') };
const dark = luminance(surface.rgb) < 0.35;

// Ink: readable against the canvas, and the *least* saturated such colour —
// brand accents are usually readable too, but they are not body text.
const inkCandidates = pool.filter(c => contrast(c.rgb, surface.rgb) >= 4.5)
  .sort((a, b) => saturation(a.rgb) - saturation(b.rgb) || (b.n || 0) - (a.n || 0));
const textPrimary = validate(pickVar('text', 'foreground'), c => contrast(c.rgb, surface.rgb) >= 4.5 && saturation(c.rgb) < 0.5)
  || inkCandidates[0] || { hex: dark ? '#ffffff' : '#111111', rgb: toRgb(dark ? '#ffffff' : '#111111') };

const mutedFallback = mix(textPrimary.rgb, surface.rgb, 0.42);
const textMuted = validate(pickVar('muted', 'secondary', 'dim', 'subtle'),
    c => { const r = contrast(c.rgb, surface.rgb); return r >= 2.2 && r < contrast(textPrimary.rgb, surface.rgb); })
  || pool.filter(c => { const r = contrast(c.rgb, surface.rgb); return r >= 2.5 && r < 4.5; })
         .sort((a, b) => saturation(a.rgb) - saturation(b.rgb))[0]
  || { hex: hex(mutedFallback), rgb: mutedFallback };

const lineFallback = mix(textPrimary.rgb, surface.rgb, 0.82);
const line = validate(pickVar('line', 'border', 'divider', 'hairline'),
    c => contrast(c.rgb, surface.rgb) <= 2.4)
  || pool.filter(c => { const r = contrast(c.rgb, surface.rgb); return r >= 1.05 && r <= 2.0; })
         .sort((a, b) => saturation(a.rgb) - saturation(b.rgb))[0]
  || { hex: hex(lineFallback), rgb: lineFallback };

// Accent: the colour the design actually leans on, which becomes the series hue
// and the reference the whole palette is built from. Getting this one wrong
// mis-colours everything downstream, so it is decided by evidence rather than
// by a single metric.
//
// Chroma, not HSV saturation, decides whether a colour is chromatic at all.
// Saturation is (max-min)/max, which runs to 1.0 for *any* dark pure hue: a
// near-black navy like #01222d scores 0.98 while carrying an OKLCH chroma of
// 0.04, which is very nearly grey. Ranking on it hands the brand slot to
// whichever colour happens to be darkest — Wells Fargo's teal #017994 (sat
// 0.99, chroma 0.10) beat its red #d71e28 (sat 0.86, chroma 0.22) that way,
// even though the red is declared 25 times to the teal's 4.
const chromaOf = c => G.rgbToOklch(c).C;
const taken = new Set([surface.hex, textPrimary.hex, textMuted.hex, line.hex]);
// Colours the design named as an error or warning state can still win, but only
// if nothing else qualifies — a danger red is a real brand colour on some sites
// and strictly a semantic one on others, and the name is the only evidence.
const namedSemantic = new Set();
const brandPool = pool.filter(c => !taken.has(c.hex) && chromaOf(c.rgb) >= 0.06 &&
  contrast(c.rgb, surface.rgb) > 1.6);
const rankBrand = (a, b) => {
  const ua = useOf(a.hex), ub = useOf(b.hex);
  return (namedSemantic.has(a.hex) ? 1 : 0) - (namedSemantic.has(b.hex) ? 1 : 0) ||
    ub.kinds.size - ua.kinds.size ||
    ub.total - ua.total ||
    chromaOf(b.rgb) - chromaOf(a.rgb);
};
const accent = validate(pickVar('accent', 'signal', 'primary', 'brand'), c => chromaOf(c.rgb) >= 0.05)
  || brandPool.sort(rankBrand)[0]
  || { hex: '#2323FF', rgb: toRgb('#2323FF') };

// Page ground: a background near the canvas, not the ink that happens to be
// dark and not a saturated highlight that happens to be pale. Same chroma
// guard as the canvas — a ground is a near-neutral by definition.
const groundFallback = mix(surface.rgb, toRgb(dark ? '#000000' : '#000000'), dark ? 0.35 : 0.06);
const pageBg = bgs.find(c => c.hex !== surface.hex && plausibleGround(c) &&
    contrast(c.rgb, surface.rgb) < 2)
  || { hex: hex(groundFallback), rgb: groundFallback };

const danger = validate(pickVar('bad', 'danger', 'error', 'negative'), c => chromaOf(c.rgb) >= 0.05);
const warn = validate(pickVar('warn', 'warning', 'alert', 'attention'), c => chromaOf(c.rgb) >= 0.05);
[danger, warn].forEach(c => c && namedSemantic.add(c.hex));

// ── hand the harvest to the generator ────────────────────────────────
// From here the maths is identical to the single-colour path in
// generate-theme.js: paper ramp solved to 3.0:1, greyscale ink ladder,
// one-hue series ramp, three utility accents. The only difference is that the
// roles that path *invents* are filled from what the design actually uses,
// wherever the design has a colour that can do the job. Anything the site
// cannot supply falls back to the derivation.

const refH = G.rgbToOklch(accent.rgb).h;
const hueOf = c => G.rgbToOklch(c.rgb).h;
const hueDist = (a, b) => { const d = Math.abs(((a - b) % 360 + 360) % 360); return d > 180 ? 360 - d : d; };
// Same evidence, same order: a colour the design uses in several places beats
// one it uses once, and chroma breaks the tie. See the note on rankBrand.
const byPresence = (a, b) => {
  const ua = useOf(a.hex), ub = useOf(b.hex);
  return ub.kinds.size - ua.kinds.size || ub.total - ua.total || chromaOf(b.rgb) - chromaOf(a.rgb);
};

// Only colours with real chroma are candidates for a role — a grey picked as
// an "accent" is just the structure colour under another name. The canvas, the
// body text and the series hue itself are already spoken for.
const spoken = new Set([surface.hex, textPrimary.hex, textMuted.hex, line.hex, accent.hex]);
const candidates = pool.filter(c => c && c.rgb && !spoken.has(c.hex) && chromaOf(c.rgb) >= 0.06);

// annotation is the ink layer drawn *over* the data, so it only works if it is
// a long way round the wheel from the series hue — a near-neighbour would read
// as one more series. A named danger/warn variable is the strongest signal a
// design gives about which colour it reserves for "look here".
const annotationPick =
  [danger, warn].find(c => c && hueDist(hueOf(c), refH) >= 90) ||
  candidates.filter(c => hueDist(hueOf(c), refH) >= 100).sort(byPresence)[0] || null;

// counter is the opposite pole of diverging data: distinct from the series hue
// but not the complement, and far enough from annotation that a legend cannot
// confuse the two.
const annH = annotationPick ? hueOf(annotationPick) : null;
const counterPick = candidates.filter(c => {
  const h = hueOf(c);
  return c !== annotationPick && hueDist(h, refH) >= 40 && hueDist(h, refH) <= 130 &&
    (annH === null || hueDist(h, annH) >= 45);
}).sort(byPresence)[0] || null;

// accent (highlight) is a muted sibling of the series hue, so a second brand
// colour only qualifies if it is in the same family — otherwise the emphasis
// colour reads as a different category.
//    A colour the design named as danger or warning is excluded even when its
//    hue fits: emphasis borrowed from the error palette makes every highlighted
//    bar look like a problem.
const semantic = new Set([danger, warn].filter(Boolean).map(c => c.hex));
const accentPick = candidates.filter(c => c !== annotationPick && c !== counterPick &&
  !semantic.has(c.hex) && hueDist(hueOf(c), refH) <= 40)
  .sort((a, b) => saturation(a.rgb) - saturation(b.rgb))[0] || null;

const p = G.generatePalette(accent.hex, {
  canvas: surface.hex,
  dark,
  observed: {
    accent: accentPick && accentPick.hex,
    annotation: annotationPick && annotationPick.hex,
    counter: counterPick && counterPick.hex
  }
});
const c = p.hexes;

// ── report ───────────────────────────────────────────────────────────
const pad = s => String(s).padEnd(15);
console.log(`\nRead ${files.length} file(s): ${files.map(f => path.basename(f)).join(', ')}`);
console.log(`Custom properties with colours: ${vars.size} | distinct declared colours: ${bgs.length + texts.length + borders.length}`);
console.log(`Design reads as: ${dark ? 'DARK' : 'LIGHT'} (canvas luminance ${luminance(surface.rgb).toFixed(3)})\n`);

console.log('What the design supplied');
console.log('  ' + pad('canvas') + surface.hex);
console.log('  ' + pad('page ground') + pageBg.hex + '   (set --page-bg by hand; it has no chart equivalent)');
console.log('  ' + pad('series hue') + accent.hex + '   → s2, the reference the whole ramp is built from');
console.log('  ' + pad('accent') + (accentPick ? accentPick.hex : '—  derived from the series hue'));
console.log('  ' + pad('annotation') + (annotationPick ? annotationPick.hex : '—  derived: complement of the series hue'));
console.log('  ' + pad('counter') + (counterPick ? counterPick.hex : '—  derived: 75° off the series hue'));
console.log('  ' + pad('observed ink') + textPrimary.hex + ' / ' + textMuted.hex +
  '   (not used — the recipe inks text in pure greyscale so it stays crisp on the tinted paper)');

console.log('\nGenerated palette');
for (const k of ['n0', 'n0a', 'n1', 'n2a', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9', 'nInverse',
                 's1', 's2', 's3', 's4', 's5', 's6', 's7', 'accent', 'annotation', 'counter']) {
  const src = p.sources[k] === 'site' ? '   (from the design)' : '';
  console.log('  ' + pad(k) + c[k] + src);
}

console.log('\nTypeface');
if (!bodyFace) {
  console.log('  none declared in the harvested CSS — keep the template stack');
} else {
  console.log('  ' + pad('most-used') + bodyFace[0] + '  (' + bodyFace[1].n + ' declarations)');
  fontRanked.slice(1, 3).forEach(f => console.log('  ' + pad('also') + f[0] + '  (' + f[1].n + ')'));
  console.log('  ' + pad('verdict') + (fontLoadable
    ? 'loadable — may go in Charts.theme.font, with the template fallbacks kept behind it'
    : 'NOT loadable here (no shippable @font-face, not a system face) — keep the template stack and tell the user why'));
}

console.log('\nPaste this after theme.js loads and before the first chart call:\n');
console.log(G.themeBlock(p));

const r = G.report(p);
console.log('\nContrast report (against the canvas)');
console.log(r.rows.join('\n'));
console.log(r.allOk
  ? '\nAll required ratios pass. Still look at the rendered page before shipping.'
  : '\nFix the FAIL rows above before using this palette - adjust the offending token by hand.');

// ── apply ────────────────────────────────────────────────────────────
// `--write` puts the palette into a page instead of leaving you to paste it.
// It targets the template's brand-recolour placeholder — the commented block
// between `theme.js` loading and the page-chrome sync — and on a page already
// recoloured it replaces the previous `Charts.applyPalette({…})` call, so
// re-running against a new brand re-skins rather than stacking two palettes.
if (writeTarget) {
  if (!fs.existsSync(writeTarget)) {
    console.error('\n--write: no such file: ' + writeTarget);
    process.exit(1);
  }
  let page = fs.readFileSync(writeTarget, 'utf8');
  const block = G.themeBlock(p).trim();
  const placeholder = /\/\*\s*Brand recolour goes HERE[\s\S]*?\*\//;
  const existing = /Charts\.applyPalette\(\{[\s\S]*?\}\);/;
  let how;
  if (placeholder.test(page)) {
    page = page.replace(placeholder, block);
    how = 'replaced the placeholder block';
  } else if (existing.test(page)) {
    page = page.replace(existing, block);
    how = 'replaced the existing applyPalette call';
  } else {
    // No anchor. Rather than guess at an insertion point in someone's markup,
    // say so — a palette applied after the first chart call is a no-op that
    // looks like the extractor failed.
    console.error('\n--write: found neither the template placeholder nor an existing');
    console.error('Charts.applyPalette call in ' + path.basename(writeTarget) + '.');
    console.error('Paste the block by hand, after theme.js loads and before the first chart.');
    process.exit(1);
  }
  if (!/applyPalette/.test(page)) { console.error('\n--write: refusing to write a page with no palette call'); process.exit(1); }
  fs.writeFileSync(writeTarget, page);
  console.log('\nWrote the palette into ' + writeTarget + ' — ' + how + '.');
  console.log('Reload the page and look at it: the contrast report above is a floor, not a verdict.');
}
