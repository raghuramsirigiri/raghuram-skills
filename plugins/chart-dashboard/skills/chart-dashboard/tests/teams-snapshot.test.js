// node --test plugins/chart-dashboard/skills/chart-dashboard/tests/teams-snapshot.test.js
//
// The Teams post's checks. It is the email snapshot's freeze with a different
// destination: the Teams compose box keeps headings, paragraphs, lists, a
// simple table and pictures, and drops every class, style and colour. So
// what breaks a post is the opposite of what breaks an email: a styled
// table layout that is perfect for Outlook pastes into Teams as a jumble.
//
// The rules live in assets/email-snapshot.js as lint(markup, { target:
// 'teams' }), which the page runs on the frozen block and check-page.js runs
// on the source. These tests pin both.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const { lint } = require(path.join(__dirname, '..', 'assets', 'email-snapshot.js'));
const CHECK = path.join(__dirname, '..', 'scripts', 'check-page.js');
const FINALIZE = path.join(__dirname, '..', 'scripts', 'finalize.js');
const TEMPLATE = path.join(__dirname, '..', 'templates', 'teams.html');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-teams-'));
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

const teams = (markup, frozen) => lint(markup, { target: 'teams', frozen: !!frozen });
const CHART = '<div class="chart" id="c1" style="width:540px;height:230px" ' +
  'data-alt="Line chart: tickets rose from 120 in week 1 to 410 in week 9."></div>';
const rules = r => r.fails.map(f => f.rule);

test('a clean source post passes, with the chart still a placeholder', () => {
  const r = teams('<h2>Tickets tripled</h2><p>Since week 1.</p><h3>Weekly tickets</h3>' + CHART +
    '<table><tr><th>Queue</th><th>Median</th></tr><tr><td>Billing</td><td>4.9</td></tr></table>' +
    '<ul><li><strong>Billing</strong> leads.</li></ul>');
  assert.deepStrictEqual(r.fails, []);
});

test('the same post fails once frozen, because the chart was never replaced', () => {
  assert.ok(rules(teams('<p>x</p>' + CHART, true)).includes('charts frozen'));
});

test('an email block is not a Teams post: styling and table layout fail', () => {
  const cases = [
    ['<p style="color:#222">x</p>', 'no styling'],
    ['<p class="k">x</p>', 'no styling'],
    ['<p><font color="red">x</font></p>', 'teams tags'],
    ['<div>x</div>', 'teams tags'],
    ['<p><span>x</span></p>', 'teams tags'],
    ['<h1>x</h1>', 'teams tags'],
    ['<svg></svg>', 'teams tags'],
    ['<button>x</button>', 'teams tags'],
    ['<table><tr><td><table><tr><td>x</td></tr></table></td></tr></table>', 'simple tables'],
    ['<p><a href="#top">x</a></p>', 'links'],
    ['<p onclick="x()">x</p>', 'no interactivity']
  ];
  for (const [markup, rule] of cases) {
    assert.ok(rules(teams(markup)).includes(rule), rule + ' not caught in: ' + markup);
  }
});

test('the email template\'s own block fails the Teams rules', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'templates', 'email.html'), 'utf8');
  const a = html.indexOf('<!-- email:start'), b = html.indexOf('<!-- email:end -->');
  const r = teams(html.slice(html.indexOf('-->', a) + 3, b));
  assert.ok(rules(r).includes('no styling'));
});

test('a chart needs alt text with a number, and a px box no wider than a message', () => {
  const vague = '<div class="chart" id="c1" style="width:540px;height:230px" data-alt="A line chart of tickets over time"></div>';
  assert.ok(rules(teams(vague)).includes('alt text'));
  const wide = '<div class="chart" id="c1" style="width:600px;height:230px" data-alt="Tickets rose from 120 to 410 over nine weeks."></div>';
  assert.ok(rules(teams(wide)).includes('width'));
  const unsized = '<div class="chart" id="c1" style="width:100%" data-alt="Tickets rose from 120 to 410 over nine weeks."></div>';
  assert.ok(rules(teams(unsized)).includes('chart size'));
});

test('a frozen picture needs a numeric width, alt text, and a raster format — and no style', () => {
  const img = a => '<p>x</p><img ' + a + '>';
  assert.ok(rules(teams(img('src="data:image/png;base64,AA" alt="x 1"'), true)).includes('image size'));
  assert.ok(rules(teams(img('src="data:image/png;base64,AA" width="540"'), true)).includes('alt text'));
  assert.ok(rules(teams(img('src="data:image/svg+xml;base64,AA" width="540" alt="x 1"'), true)).includes('image format'));
  assert.ok(rules(teams(img('src="data:image/png;base64,AA" width="540" alt="x 1" style="display:block"'), true)).includes('no styling'));
  assert.deepStrictEqual(teams(img('src="data:image/png;base64,AA" width="540" height="230" alt="x 1"'), true).fails, []);
});

test('more than three charts is a warning, not a failure', () => {
  const c = i => CHART.replace('id="c1"', 'id="c' + i + '"');
  const r = teams('<p>x</p>' + c(1) + c(2) + c(3) + c(4));
  assert.deepStrictEqual(r.fails, []);
  assert.ok(r.warns.some(w => w.rule === 'scope'));
});

test('the email rules are unchanged when no target is given', () => {
  assert.ok(rules(lint('<table role="presentation" width="600"><tr><td><div>x</div></td></tr></table>')).includes('table layout'));
});

const runCheck = file => spawnSync(process.execPath, [CHECK, file], { encoding: 'utf8' }).stdout;
const row = (out, name) => (out.split('\n').find(l => l.includes(name)) || '');

test('the shipped template passes its own checks', () => {
  const out = runCheck(TEMPLATE);
  assert.match(row(out, 'teams-safe block'), /PASS/, out);
  assert.match(row(out, 'charts freeze to PNG'), /PASS\s+charts freeze to PNG\s+1 chart.*TeamsSnapshot\.draw/, out);
  assert.match(row(out, 'charts fit their cells'), /PASS/, out);
  assert.match(row(out, 'panels wired'), /PASS/, out);
});

test('the template offers both copies and a preview of each', () => {
  // The picture is the card exactly as designed; the text is restyled by
  // Teams. A page with only one of them forces a trade-off on the reader.
  const src = fs.readFileSync(TEMPLATE, 'utf8');
  for (const hook of ['data-snap="copy-card"', 'data-snap="copy"', 'data-snap="charts"', 'data-snap="save-png"',
    'data-view="card"', 'data-view="text"', 'id="teams-text-preview"']) {
    assert.ok(src.includes(hook), 'template is missing ' + hook);
  }
  const runtime = fs.readFileSync(path.join(__dirname, '..', 'assets', 'email-snapshot.js'), 'utf8');
  for (const hook of ["on('copy-card'", '[data-snap="view"]', "getElementById('teams-text-preview')"]) {
    assert.ok(runtime.includes(hook), 'runtime does not wire ' + hook);
  }
});

test('a chart that cannot freeze is named, in Teams terms', () => {
  const src = fs.readFileSync(TEMPLATE, 'utf8');
  const cases = [
    [src.replace("TeamsSnapshot.draw(Charts.line, 'c1', {", "Charts.line('c1', {"), /stays an SVG, which Teams does not show/],
    [src.replace("TeamsSnapshot.draw(Charts.line, 'c1', {", "TeamsSnapshot.draw(Charts.line, 'c1', { title: 'T',"), /<h3>/],
    [src.replace("TeamsSnapshot.draw(Charts.line, 'c1', {", "TeamsSnapshot.draw(Charts.line, 'c1', { chart: { transparent: true },"), /transparent/]
  ];
  cases.forEach(([html, re], i) => {
    const file = path.join(dir, 'bad' + i + '.html');
    fs.writeFileSync(file, html);
    const r = row(runCheck(file), 'charts freeze to PNG');
    assert.match(r, /FAIL/, 'case ' + i);
    assert.match(r, re, 'case ' + i);
  });
});

test('a styled block in the Teams template fails the checker', () => {
  const src = fs.readFileSync(TEMPLATE, 'utf8').replace('<h2>Headline', '<h2 style="color:#c00">Headline');
  const file = path.join(dir, 'styled.html');
  fs.writeFileSync(file, src);
  assert.match(row(runCheck(file), 'teams-safe block'), /FAIL.*no styling/);
});

test('finalize stages and inlines the freeze runtime, then cleans up', () => {
  const page = path.join(dir, 'ship', 'index.html');
  fs.mkdirSync(path.dirname(page));
  fs.copyFileSync(TEMPLATE, page);
  const f = spawnSync(process.execPath, [FINALIZE, page], { encoding: 'utf8' });
  assert.strictEqual(f.status, 0, f.stdout + f.stderr);
  const shipped = fs.readFileSync(page, 'utf8');
  assert.ok(!/src="charts-lib\//.test(shipped), 'a charts-lib reference survived');
  assert.ok(shipped.includes('root.TeamsSnapshot = root.EmailSnapshot'), 'the freeze runtime was not inlined');
  assert.ok(!fs.existsSync(path.join(dir, 'ship', 'charts-lib')), 'staged folder left behind');
});
