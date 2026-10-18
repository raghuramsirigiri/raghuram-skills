// node --test plugins/chart-dashboard/skills/chart-dashboard/tests/social-snapshot.test.js
//
// The social post's checks. It is the email snapshot's freeze painted whole:
// each card becomes one picture at a platform's size, and the words go
// alongside. What breaks a post is a picture that cannot stand alone once it
// is reposted without its words (no headline, no source, no date), and words
// that state a figure the picture does not show, or run past the platform's
// limit.
//
// The rules live in assets/email-snapshot.js as lint(markup, { target:
// 'social' }), which the page runs on the frozen cards and check-page.js runs
// on the source. These tests pin both, and the per-platform counting.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const { lint, postLength, SOCIAL_SIZES, SOCIAL_SCALE } = require(path.join(__dirname, '..', 'assets', 'email-snapshot.js'));
const CHECK = path.join(__dirname, '..', 'scripts', 'check-page.js');
const FINALIZE = path.join(__dirname, '..', 'scripts', 'finalize.js');
const TEMPLATE = path.join(__dirname, '..', 'templates', 'social.html');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-social-'));
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

const social = (markup, frozen) => lint(markup, { target: 'social', frozen: !!frozen });
const rules = r => r.fails.map(f => f.rule);
const warned = r => r.warns.map(w => w.rule);
const CHART = '<div class="chart" id="c1" data-alt="Line chart: tickets rose from 120 in week 1 to 410 in week 9."></div>';
const card = (inner, size) => '<div class="cards"><div class="card" data-size="' + (size || 'portrait') + '">' + inner + '</div></div>';
const GOOD = '<p class="kicker">Support · Weeks 1–9, 2026</p><h2>Tickets more than tripled, from 120 to 410</h2>' +
  '<p class="units">Tickets per week</p>' + CHART + '<p class="source"><span>Source: helpdesk export, 2026</span></p>';
const posts = (...p) => '<div class="posts">' + p.map(([k, t]) => '<pre class="post" data-platform="' + k + '">' + t + '</pre>').join('') + '</div>';

test('a clean source card passes, with the chart still a placeholder', () => {
  const r = social(card(GOOD) + posts(['linkedin', 'Tickets rose from 120 to 410 in nine weeks.'], ['x', 'Tickets: 120 → 410 in 9 weeks.']));
  assert.deepStrictEqual(r.fails, []);
  assert.deepStrictEqual(r.warns, []);
});

test('the same card fails once frozen, because the chart was never replaced', () => {
  assert.ok(rules(social(card(GOOD), true)).includes('charts frozen'));
});

test('the picture has to stand alone: headline, source and size are required', () => {
  assert.ok(rules(social(card(GOOD.replace(/<h2>.*?<\/h2>/, '')))).includes('headline'));
  assert.ok(rules(social(card(GOOD.replace(/<p class="source">.*?<\/p>/, '')))).includes('source'));
  assert.ok(rules(social(card(GOOD, 'banner'))).includes('card size'));
  assert.ok(rules(social('<p>no card</p>')).includes('cards'));
  const undated = card(GOOD.replace('Weeks 1–9, 2026', 'Weekly').replace('helpdesk export, 2026', 'helpdesk export'));
  assert.ok(warned(social(undated)).includes('source'));
});

test('one finding per card, and nothing to hover or click', () => {
  const two = GOOD.replace(CHART, CHART + CHART.replace('id="c1"', 'id="c2"'));
  assert.ok(rules(social(card(two))).includes('one finding per card'));
  for (const bad of ['<button>x</button>', '<svg></svg>', '<select></select>', '<p onclick="x()">x</p>']) {
    assert.ok(rules(social(card(GOOD + bad))).includes('nothing to click'), bad);
  }
  assert.ok(warned(social(card(GOOD + '<p title="hover me">x</p>'))).includes('nothing to click'));
  assert.ok(rules(social(card(GOOD + '<img src="https://example.com/logo.png" alt="logo">'))).includes('images'));
});

test('alt text states the finding with a number, and fits the platforms', () => {
  const vague = GOOD.replace(/data-alt="[^"]*"/, 'data-alt="A line chart of tickets over time"');
  assert.ok(rules(social(card(vague))).includes('alt text'));
  const long = GOOD.replace(/data-alt="[^"]*"/, 'data-alt="Tickets rose from 120 to 410. ' + 'More detail here. '.repeat(20) + '"');
  assert.ok(warned(social(card(long))).includes('alt text'));
  const huge = GOOD.replace(/data-alt="[^"]*"/, 'data-alt="Tickets rose from 120 to 410. ' + 'More detail here. '.repeat(60) + '"');
  assert.ok(rules(social(card(huge))).includes('alt text'));
});

test('every figure in the words must be on a card', () => {
  const r = social(card(GOOD) + posts(['linkedin', 'Tickets rose from 120 to 410, and churn fell 14%.']));
  assert.ok(rules(r).includes('numbers on the card'));
  assert.match(r.fails[0].msg, /14/);
  // Thousands separators, trailing zeros, single digits and figures in the alt text all match.
  const ok = social(card(GOOD.replace('120 to 410', '1,240 to 4,100')) +
    posts(['x', 'From 1240 to 4100.0 in 9 weeks, starting at 120.']));
  assert.deepStrictEqual(ok.fails, []);
  // A link's digits are not figures.
  assert.deepStrictEqual(social(card(GOOD) + posts(['x', 'Tickets hit 410: https://example.com/r/2026/77'])).fails, []);
});

test('posts are held to each platform\'s limit, counted its way', () => {
  assert.strictEqual(postLength('a'.repeat(10), 'linkedin'), 10);
  // X: emoji and CJK weigh 2, a link of any length weighs 23.
  assert.strictEqual(postLength('hi 😀', 'x'), 5);
  assert.strictEqual(postLength('中文', 'x'), 4);
  assert.strictEqual(postLength('see https://example.com/a/very/long/path/that/goes/on', 'x'), 4 + 23);
  // Bluesky counts what a reader sees: a family emoji is one.
  assert.strictEqual(postLength('👨‍👩‍👧', 'bluesky'), 1);
  // Mastodon also weighs every link at 23.
  assert.strictEqual(postLength('https://example.com/' + 'x'.repeat(80), 'mastodon'), 23);

  const over = social(card(GOOD) + posts(['x', 'Tickets hit 410. ' + 'word '.repeat(60)]));
  assert.ok(rules(over).includes('length'));
  assert.ok(rules(social(card(GOOD) + posts(['tiktok', 'Tickets hit 410.']))).includes('platform'));
});

test('the words lead with the finding, and do not fish for engagement', () => {
  const buried = 'We have been looking closely at how the support desk handled its load this quarter, across every queue, every shift and every one of the channels customers use to reach it. ' +
    'Tickets went from 120 to 410.';
  assert.ok(warned(social(card(GOOD) + posts(['linkedin', buried]))).includes('hook'));
  const cases = ['Tickets hit 410. Agree?', 'Tickets hit 410. Comment below!', 'In today\'s fast-paced world, tickets hit 410.',
    'Let\'s delve into why tickets hit 410.', '📈 Tickets hit 410\n🚀 Up from 120'];
  for (const t of cases) assert.ok(warned(social(card(GOOD) + posts(['linkedin', t]))).includes('voice'), t);
  assert.ok(warned(social(card(GOOD) + posts(['x', 'Tickets hit 410 #a #b #c']))).includes('hashtags'));
});

test('the sizes land on the pixels the platforms ask for', () => {
  const px = s => [SOCIAL_SIZES[s].w * SOCIAL_SCALE, SOCIAL_SIZES[s].h * SOCIAL_SCALE];
  assert.deepStrictEqual(px('portrait'), [1080, 1350]);
  assert.deepStrictEqual(px('square'), [1080, 1080]);
  assert.deepStrictEqual(px('landscape'), [1200, 675]);
  // And the template's CSS says the same, since the freeze fails a card off its frame.
  const src = fs.readFileSync(TEMPLATE, 'utf8');
  for (const s of Object.keys(SOCIAL_SIZES)) {
    const m = new RegExp('\\.card\\[data-size="' + s + '"\\]\\s*\\{\\s*width:\\s*(\\d+)px;\\s*height:\\s*(\\d+)px').exec(src);
    assert.ok(m, 'template has no size rule for ' + s);
    assert.deepStrictEqual([+m[1], +m[2]], [SOCIAL_SIZES[s].w, SOCIAL_SIZES[s].h], s);
  }
});

test('the Teams and email rules are unchanged', () => {
  assert.ok(rules(lint('<table role="presentation" width="600"><tr><td><div>x</div></td></tr></table>')).includes('table layout'));
  assert.ok(rules(lint('<p class="k">x</p>', { target: 'teams' })).includes('no styling'));
});

const runCheck = file => spawnSync(process.execPath, [CHECK, file], { encoding: 'utf8' }).stdout;
const row = (out, name) => (out.split('\n').find(l => l.includes(name)) || '');

test('the shipped template passes its own checks', () => {
  const out = runCheck(TEMPLATE);
  assert.match(row(out, 'social card'), /PASS/, out);
  assert.match(row(out, 'charts freeze to PNG'), /PASS\s+charts freeze to PNG\s+1 chart.*SocialSnapshot\.draw/, out);
  assert.match(row(out, 'panels wired'), /PASS/, out);
});

test('a chart that cannot freeze is named, in social terms', () => {
  const src = fs.readFileSync(TEMPLATE, 'utf8');
  const cases = [
    [src.replace("SocialSnapshot.draw(Charts.line, 'c1', {", "Charts.line('c1', {"), /cannot be painted into the card/],
    [src.replace("SocialSnapshot.draw(Charts.line, 'c1', {", "SocialSnapshot.draw(Charts.line, 'c1', { title: 'T',"), /<h2>/]
  ];
  cases.forEach(([html, re], i) => {
    const file = path.join(dir, 'bad' + i + '.html');
    fs.writeFileSync(file, html);
    const r = row(runCheck(file), 'charts freeze to PNG');
    assert.match(r, /FAIL/, 'case ' + i);
    assert.match(r, re, 'case ' + i);
  });
});

test('an unsourced figure in the template\'s post fails the checker', () => {
  const src = fs.readFileSync(TEMPLATE, 'utf8').replace('nearly double its start', 'up 340% on last year');
  const file = path.join(dir, 'unsourced.html');
  fs.writeFileSync(file, src);
  assert.match(row(runCheck(file), 'social card'), /FAIL.*numbers on the card.*340/);
});

test('finalize stages and inlines the freeze runtime, then cleans up', () => {
  const page = path.join(dir, 'ship', 'index.html');
  fs.mkdirSync(path.dirname(page));
  fs.copyFileSync(TEMPLATE, page);
  const f = spawnSync(process.execPath, [FINALIZE, page], { encoding: 'utf8' });
  assert.strictEqual(f.status, 0, f.stdout + f.stderr);
  const shipped = fs.readFileSync(page, 'utf8');
  assert.ok(!/src="charts-lib\//.test(shipped), 'a charts-lib reference survived');
  assert.ok(shipped.includes('root.SocialSnapshot = root.EmailSnapshot'), 'the freeze runtime was not inlined');
  assert.ok(!fs.existsSync(path.join(dir, 'ship', 'charts-lib')), 'staged folder left behind');
});

// ── the editable variant ─────────────────────────────────────────────
// social-editable.html is social.html in the format of references/editable.md:
// charts in #page-spec, text marked data-edit, alt text in an edit-only field
// after its card. It shares social.html's stylesheet, so the two cannot
// drift, and ships as a final copy and a working copy.
const EDITABLE = path.join(__dirname, '..', 'templates', 'social-editable.html');
const lf = f => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');

test('editable: the template passes its own checks, editable row included', () => {
  const out = runCheck(EDITABLE);
  assert.match(row(out, 'social card'), /PASS/, out);
  assert.match(row(out, 'charts freeze to PNG'), /PASS.*page spec/, out);
  assert.match(row(out, 'editable page'), /PASS/, out);
  assert.doesNotMatch(row(out, 'editable page'), /locked/, out);
  assert.doesNotMatch(out, /\bFAIL\b/, out);
});

test('editable: every chart is a spec entry, none drawn by code, every key unique', () => {
  const html = lf(EDITABLE);
  const ids = [...html.matchAll(/<div class="chart[^"]*" id="([^"]+)"/g)].map(m => m[1]);
  const spec = JSON.parse(html.match(/<script type="application\/json" id="page-spec">([\s\S]*?)<\/script>/)[1]);
  assert.deepStrictEqual(Object.keys(spec.charts).sort(), ids.slice().sort());
  assert.doesNotMatch(html, /(?:Social|Email)Snapshot\.draw\(|Charts\.(?!theme\b|applyPalette\b|applyMetrics\b)\w+\(\s*['"]/, 'chart code would lock its chart');
  const keys = [...html.matchAll(/\sdata-key="([^"]+)"/g)].map(m => m[1]);
  assert.deepStrictEqual(keys.filter((k, i) => keys.indexOf(k) !== i), []);
  for (const k of ['c1-headline', 'c1-source', 'c1-alt', 'post-linkedin', 'post-x']) assert.ok(keys.includes(k), 'no key ' + k);
  // Each post is rich text, so Enter can insert a line break the sanitiser keeps.
  assert.match(html, /<pre class="post" data-platform="x" data-edit="rich"/);
});

test('editable: it keeps the static template\'s charts and stylesheet', () => {
  const style = h => h.match(/<style>([\s\S]*?)<\/style>/)[1];
  const ids = h => [...h.matchAll(/<div class="chart[^"]*" id="([^"]+)"/g)].map(m => m[1]);
  const a = lf(EDITABLE), b = lf(TEMPLATE);
  assert.strictEqual(style(a), style(b), 'the stylesheet drifted from social.html');
  assert.deepStrictEqual(ids(a), ids(b));
});

test('editable: alt text is read through its key, and checked like data-alt', () => {
  const keyed = alt => '<div class="cards"><div class="card" data-size="portrait"><h2>Tickets hit 410</h2>' +
    '<div class="chart" id="c1" data-alt-key="c1-alt"></div><p class="source">Source: helpdesk, 2026</p></div>' +
    '<p class="alt-edit" data-snap-omit><span data-edit="text" data-key="c1-alt">' + alt + '</span></p></div>';
  assert.deepStrictEqual(social(keyed('Line chart: tickets rose from 120 to 410 in nine weeks.')).fails, []);
  assert.ok(rules(social(keyed('a chart of tickets'))).includes('alt text'));
  // A figure only in the alt-text field still counts as on the card.
  assert.deepStrictEqual(social(keyed('Line chart: tickets rose from 120 to 410 in nine weeks.') +
    posts(['x', 'Up from 120 to 410.'])).fails, []);
});

test('editable: finalize ships a final copy and a working copy', () => {
  const page = path.join(dir, 'editable', 'post.html');
  fs.mkdirSync(path.dirname(page));
  fs.copyFileSync(EDITABLE, page);
  const f = spawnSync(process.execPath, [FINALIZE, page], { encoding: 'utf8' });
  assert.strictEqual(f.status, 0, f.stdout + f.stderr);
  const fin = fs.readFileSync(page, 'utf8');
  const work = fs.readFileSync(path.join(dir, 'editable', 'post (working copy).html'), 'utf8');
  for (const out of [fin, work]) {
    assert.ok(!/src="charts-lib\//.test(out), 'a charts-lib reference survived');
    assert.ok(out.includes('root.SocialSnapshot = root.EmailSnapshot'), 'the freeze runtime was not inlined');
  }
  assert.ok(!fin.includes('window.PageEditor ='), 'the final copy still carries the editor');
  assert.ok(work.includes('window.PageEditor ='), 'the working copy lost the editor');
});
