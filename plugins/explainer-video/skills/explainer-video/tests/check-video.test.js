// node --test plugins/explainer-video/skills/explainer-video/tests/check-video.test.js
//
// A good page passes; one bad page per rule fails with the right row.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SKILL = path.join(__dirname, '..');
const CHECK = path.join(SKILL, 'scripts', 'check-video.js');
// The template with its heading filled in, as a real build writes it.
const TEMPLATE = fs.readFileSync(path.join(SKILL, 'templates', 'video.html'), 'utf8')
  .replace('<title>TITLE', '<title>Valley water').replace('<h1>TITLE</h1>', '<h1>Valley water</h1>')
  .replace('ONE LINE: what the video shows and where its figures come from.', 'What the valley used, from the water board.');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'check-video-'));

function good() {
  return {
    meta: { title: 'Northvale water', locale: 'en-GB', preset: 'default', fps: 30, seed: 1, audio: { score: 'off' } },
    cuts: { main: { format: '9:16', scenes: ['hook', 'e1', 'e2', 'src'] } },
    sources: [{ id: 'A', name: 'Northvale Water Board bulletin', date: '2026-03-02' }],
    claims: [
      { id: 'F1', value: 12, unit: '%', display: '12%', source: 'A', locator: '¶1', verbatim: 'Household use fell 12% this winter.', kind: 'copied' },
      { id: 'F2', value: 140, unit: 'litres', display: '140 litres', source: 'A', locator: '¶2', verbatim: 'about 140 litres a day', kind: 'copied', hedge: 'about' },
      { id: 'F3', value: 125, unit: 'litres', display: '125 litres', source: 'A', locator: '¶4', verbatim: 'The board expects use could settle near 125 litres by 2028.', kind: 'copied', hedge: 'could', forecast: true },
      { id: 'Q1', kind: 'copied', quote: true, speaker: 'Ines Varga', source: 'A', locator: '¶5', verbatim: 'People have simply got used to shorter showers.', display: 'People have simply got used to shorter showers' }
    ],
    data: [],
    scenes: [
      { id: 'hook', type: 'big-number', copy: { kicker: 'Northvale', value: 'F1', line: 'less water used this winter' } },
      { id: 'e1', type: 'kicker-title', copy: { kicker: 'Per person', title: 'Use is now about {F2} a day' } },
      { id: 'e2', type: 'big-number', copy: { kicker: 'The board expects', value: 'F3', line: 'a day could follow by 2028' } },
      { id: 'src', type: 'source-card' }
    ],
    caption: 'Northvale household water use fell 12% this winter, to about 140 litres a day. The board expects it could settle near 125 litres by 2028.',
    alt: 'Animated video: use fell 12%; about 140 litres a day now; could be 125 litres by 2028. Source: Northvale Water Board bulletin.'
  };
}

function page(spec, extra) {
  let html = TEMPLATE.replace(/<script type="application\/json" id="video-spec">[\s\S]*?<\/script>/,
    '<script type="application/json" id="video-spec">\n' + JSON.stringify(spec) + '\n</script>');
  if (extra) html = extra(html);
  const f = path.join(tmp, 'p' + Math.random().toString(36).slice(2) + '.html');
  fs.writeFileSync(f, html);
  return f;
}
function check(f, args) {
  const r = spawnSync(process.execPath, [CHECK, f, '--json'].concat(args || []), { encoding: 'utf8' });
  const out = JSON.parse(r.stdout);
  return { code: r.status, rows: out.rows, fails: out.rows.filter(x => x.level === 'FAIL') };
}
function failsWith(mut, name, re, extra) {
  const s = good(); mut(s);
  const r = check(page(s, extra));
  assert.strictEqual(r.code, 1, 'expected exit 1');
  assert.ok(r.fails.some(x => x.name === name && re.test(x.detail)), 'expected a ' + name + ' FAIL matching ' + re + '; got ' + JSON.stringify(r.fails));
}

test('a good page passes', () => {
  const r = check(page(good()));
  assert.strictEqual(r.code, 0, JSON.stringify(r.fails));
});

test('numbers: a year followed by a comma is a date, not a figure', () => {
  const s = good(); s.scenes[2].copy.line = 'a day could follow by 2028, the board says';
  s.caption = 'Northvale household water use fell 12% this winter, to about 140 litres a day. By 2028, the board expects it could settle near 125 litres.';
  const r = check(page(s));
  assert.ok(!r.fails.some(x => x.name === 'numbers'), JSON.stringify(r.fails));
});
test('numbers: a typed number in copy fails', () => failsWith(s => { s.scenes[1].copy.title = 'Use is now 140 litres a day'; }, 'numbers', /typed into copy/));
test('numbers: a caption figure not in the ledger fails', () => failsWith(s => { s.caption += ' Bills rose 9%.'; }, 'numbers', /matches no claim/));
test('numbers: a caption figure not on screen fails', () => failsWith(s => { s.cuts.main.scenes = ['hook', 'src']; s.caption = 'Use could reach 125 litres by 2028.'; s.alt = ''; }, 'numbers', /not on screen/));
test('shape: a copied claim without a locator fails', () => failsWith(s => { delete s.claims[0].locator; }, 'shape', /locator/));
test('shape: a cut that does not end on the source card fails', () => failsWith(s => { s.cuts.main.scenes = ['hook', 'e1']; }, 'shape', /source-card/));
test('hedges: dropping the hedge fails', () => failsWith(s => { s.scenes[1].copy.title = 'Use is now {F2} a day'; }, 'hedges', /without its hedge "about"/));
test('hedges: a forecast without forecast wording fails', () => failsWith(s => { s.scenes[2].copy = { kicker: 'Next', value: 'F3', line: 'a day by 2028' }; }, 'hedges', /hedge "could"|forecast wording/));
test('hedges: an upgrade word the source never used fails', () => failsWith(s => { s.scenes[1].copy.kicker = 'A record low'; }, 'hedges', /"record"/));
test('hedges: a cause the source never stated fails', () => failsWith(s => { s.caption += ' Use fell because of the new tariff.'; }, 'hedges', /"because"/));
test('quotes: a paraphrase in quote marks fails', () => failsWith(s => {
  s.scenes.splice(3, 0, { id: 'q', type: 'quote', copy: { quote: 'Q1', name: 'Ines Varga' } });
  s.cuts.main.scenes.splice(3, 0, 'q');
  s.claims[3].display = 'People got used to short showers';
}, 'quotes', /not in the verbatim/));
test('timing: a dur below the minimum fails', () => failsWith(s => { s.scenes[0].dur = 1; }, 'timing', /below its minimum/));
test('shape: an art setting other than off or halftone fails', () => failsWith(s => { s.meta.art = 'contour'; }, 'shape', /meta\.art must be "off" or "halftone"/));
test('shape: halftone art passes', () => {
  const s = good(); s.meta.art = 'halftone';
  const r = check(page(s));
  assert.strictEqual(r.code, 0, JSON.stringify(r.fails));
});
test('timing: a transitionIn in the spec warns that it is ignored', () => {
  const s = good(); s.scenes[3].transitionIn = 'flood';
  const r = check(page(s));
  assert.strictEqual(r.code, 0, JSON.stringify(r.fails));
  assert.ok(r.rows.some(x => x.level === 'WARN' && /transitionIn/.test(x.detail)), JSON.stringify(r.rows.filter(x => x.level === 'WARN')));
});
// The continuous style: the good page as one world.
function continuous(s) {
  s.meta.style = 'continuous';
  s.scenes[0].picture = { kind: 'blocks', skin: 'plain', of: 'households' };
  return s;
}
test('shape: a style other than continuous or slides fails', () => failsWith(s => { s.meta.style = 'cinematic'; }, 'shape', /meta\.style must be "continuous" or "slides"/));
// The world's data pictures are 3D charts and unit grids, retired: a 10 x 10
// block grid for a share of anything was the feedback the skill kept repeating.
test('pictures: a retired 3D data picture fails, naming the scene', () => failsWith(s => { continuous(s); }, 'pictures', /scene "hook": the "blocks" picture is retired/));
test('pictures: slides is the default, so a picture left in a spec without a style draws nothing in 3D', () => {
  const s = good();
  s.scenes[0].picture = { kind: 'blocks', skin: 'plain', of: 'households' };
  const r = check(page(s));
  assert.strictEqual(r.code, 0, JSON.stringify(r.fails));
});
test('pictures: a picture that cannot show its scene fails, naming the scene', () => failsWith(s => { continuous(s); s.scenes[2].picture = { kind: 'blocks', of: 'households' }; }, 'timing', /scene "e2" picture: "blocks" shows a share in %/));
test('numbers: a typed figure in the words of a picture fails', () => failsWith(s => { continuous(s); s.scenes[0].picture.of = '300 households'; }, 'numbers', /picture\.of/));

test('copy: over the word limit fails', () => failsWith(s => { s.scenes[0].copy.line = 'much less water was used across the whole valley this winter'; }, 'copy', /limit 8/));
test('copy: a V handle in the caption fails', () => failsWith(s => { s.caption += ' (see V2.1)'; }, 'copy', /handle/));
test('determinism: Math.random in the page fails', () => failsWith(() => {}, 'determinism', /Math\.random/,
  h => h.replace('</body>', '<script>Motion.custom.x = { draw() { return Math.random(); } };</script></body>')));
test('offline: a CDN script fails', () => failsWith(() => {}, 'offline', /network/,
  h => h.replace('</body>', '<script src="https://cdn.example.com/gsap.js"></script></body>')));
test('--final: an unstaged page fails the final check', () => {
  const r = check(page(good()), ['--final']);
  assert.strictEqual(r.code, 1);
  assert.ok(r.fails.some(x => x.name === 'final' && /motion-lib/.test(x.detail)));
});
test('page: the template heading left as a placeholder fails', () => failsWith(() => {}, 'page', /placeholder/,
  h => h.replace('</body>', '<h1>TITLE</h1></body>')));
