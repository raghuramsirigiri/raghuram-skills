// node --test plugins/chart-dashboard/skills/chart-dashboard/tests/email-snapshot.test.js
//
// The email snapshot's checks. Its promise is that the block survives being
// pasted into Outlook or Gmail, and every way of breaking that is invisible in
// the browser that built the page: a <div> laid out with flex, a class, an
// oklch() colour, a font stack that starts with a webfont, a chart left as SVG.
// All of them look right on screen and fall apart in an inbox.
//
// The rules live in assets/email-snapshot.js as one pure lint(), which the
// page runs on the frozen block and check-page.js runs on the source. These
// tests pin both: the lint on its own, and the checker on a whole page built
// from the shipped template.
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
const TEMPLATE = path.join(__dirname, '..', 'templates', 'email.html');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-email-'));
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

const F = 'font-family:Arial,Helvetica,sans-serif;';
const CHART = '<div class="chart" id="c1" style="width:552px;height:230px" ' +
  'data-alt="Line chart: tickets rose from 120 in week 1 to 410 in week 9."></div>';
const block = inner => '<table role="presentation" width="600" style="width:600px;">' + inner + '</table>';
const rules = r => r.fails.map(f => f.rule);

test('a clean source block passes, with the chart still a placeholder', () => {
  const r = lint(block('<tr><td style="' + F + 'color:var(--ink);">Headline</td></tr>' +
    '<tr><td style="padding:0 24px;">' + CHART + '</td></tr>'));
  assert.deepStrictEqual(r.fails, []);
});

test('the same block fails once frozen, because the chart was never replaced', () => {
  const r = lint(block('<tr><td style="padding:0;">' + CHART + '</td></tr>'), { frozen: true });
  assert.ok(rules(r).includes('charts frozen'));
});

test('what a mail client strips or ignores is a failure', () => {
  const cases = [
    ['<tr><td style="' + F + '"><svg></svg></td></tr>', 'email-safe tags'],
    ['<tr><td style="' + F + '"><style>p{}</style>x</td></tr>', 'email-safe tags'],
    ['<tr><td style="' + F + '"><div>x</div></td></tr>', 'table layout'],
    ['<tr><td class="k" style="' + F + '">x</td></tr>', 'inline styles only'],
    ['<tr><td style="' + F + 'display:flex;">x</td></tr>', 'table layout'],
    ['<tr><td style="' + F + 'color:oklch(0.5 0.1 250);">x</td></tr>', 'hex colours'],
    ['<tr><td style="' + F + 'background:url(x.png);">x</td></tr>', 'no background images'],
    ['<tr><td style="font-family:Inter,Arial,sans-serif;">x</td></tr>', 'system fonts'],
    ['<tr><td style="color:#222;">x</td></tr>', 'cell fonts'],
    ['<tr><td style="' + F + '"><a href="#top">x</a></td></tr>', 'links'],
    ['<tr><td style="' + F + '"><button>x</button></td></tr>', 'email-safe tags'],
    ['<tr><td width="720" style="' + F + '">x</td></tr>', 'width']
  ];
  for (const [inner, rule] of cases) {
    assert.ok(rules(lint(block(inner))).includes(rule), rule + ' not caught in: ' + inner);
  }
});

test('a chart needs alt text that carries a number, and a fixed px box', () => {
  const noNumber = '<div class="chart" id="c1" style="width:552px;height:230px" data-alt="A line chart of tickets over time"></div>';
  assert.ok(rules(lint(block('<tr><td>' + noNumber + '</td></tr>'))).includes('alt text'));
  const unsized = '<div class="chart" id="c1" style="width:100%" data-alt="Tickets rose from 120 to 410 over nine weeks."></div>';
  assert.ok(rules(lint(block('<tr><td>' + unsized + '</td></tr>'))).includes('chart size'));
});

test('a frozen image needs a numeric width, alt text, and a raster format', () => {
  const img = a => block('<tr><td style="padding:0;"><img ' + a + '></td></tr>');
  assert.ok(rules(lint(img('src="data:image/png;base64,AA" alt="x 1"'), { frozen: true })).includes('image size'));
  assert.ok(rules(lint(img('src="data:image/png;base64,AA" width="552"'), { frozen: true })).includes('alt text'));
  assert.ok(rules(lint(img('src="data:image/svg+xml;base64,AA" width="552" alt="x 1"'), { frozen: true })).includes('image format'));
  assert.deepStrictEqual(lint(img('src="data:image/png;base64,AA" width="552" alt="x 1"'), { frozen: true }).fails, []);
  assert.ok(rules(lint(block('<tr><td style="color:var(--ink);' + F + '">x</td></tr>'), { frozen: true })).includes('tokens resolved'));
});

const runCheck = file => spawnSync(process.execPath, [CHECK, file], { encoding: 'utf8' }).stdout;
const row = (out, name) => (out.split('\n').find(l => l.includes(name)) || '');

test('the shipped template passes its own checks', () => {
  const out = runCheck(TEMPLATE);
  assert.match(row(out, 'email-safe block'), /PASS/, out);
  assert.match(row(out, 'charts freeze to PNG'), /PASS\s+charts freeze to PNG\s+1 chart/, out);
  assert.match(row(out, 'panels wired'), /PASS/, out);
});

test('a chart that cannot freeze is named', () => {
  const src = fs.readFileSync(TEMPLATE, 'utf8');
  const cases = [
    [src.replace("EmailSnapshot.draw(Charts.line, 'c1', {", "Charts.line('c1', {"), /stays an SVG/],
    [src.replace("EmailSnapshot.draw(Charts.line, 'c1', {", "EmailSnapshot.draw(Charts.line, 'c1', { title: 'T',"), /title\/subtitle/],
    [src.replace("EmailSnapshot.draw(Charts.line, 'c1', {", "EmailSnapshot.draw(Charts.line, 'c1', { chart: { transparent: true },"), /transparent/]
  ];
  cases.forEach(([html, re], i) => {
    const file = path.join(dir, 'bad' + i + '.html');
    fs.writeFileSync(file, html);
    const r = row(runCheck(file), 'charts freeze to PNG');
    assert.match(r, /FAIL/, 'case ' + i);
    assert.match(r, re, 'case ' + i);
  });
});

test('a chart without a title is sized against the box it actually draws in', () => {
  // The manifest's minHeight allows for a heading band. An email chart has
  // none — its title is text in the block — so 230px is enough for a line.
  assert.match(row(runCheck(TEMPLATE), 'charts fit their cells'), /PASS/);
});

test('finalize stages and inlines the freeze runtime, then cleans up', () => {
  const page = path.join(dir, 'ship', 'index.html');
  fs.mkdirSync(path.dirname(page));
  fs.copyFileSync(TEMPLATE, page);
  const s = spawnSync(process.execPath, [FINALIZE, page, '--stage'], { encoding: 'utf8' });
  assert.strictEqual(s.status, 0, s.stderr);
  assert.ok(fs.existsSync(path.join(dir, 'ship', 'charts-lib', 'email-snapshot.js')), 'email-snapshot.js was not staged');
  const f = spawnSync(process.execPath, [FINALIZE, page], { encoding: 'utf8' });
  assert.strictEqual(f.status, 0, f.stdout + f.stderr);
  const shipped = fs.readFileSync(page, 'utf8');
  assert.ok(!/src="charts-lib\//.test(shipped), 'a charts-lib reference survived');
  assert.ok(shipped.includes('root.EmailSnapshot = {'), 'the freeze runtime was not inlined');
  assert.ok(!fs.existsSync(path.join(dir, 'ship', 'charts-lib')), 'staged folder left behind');
});

// ── the editable variant (templates/email-editable.html) ─────────────
// Its charts live in page-runtime's spec so a reader can change them, and its
// alt text sits in an editable row that data-alt-key points at. The freeze
// works from the spec in the browser; these pin what the checker and the
// build can see.
const EDITABLE = path.join(__dirname, '..', 'templates', 'email-editable.html');

test('alt text can come from the marked element data-alt-key names', () => {
  const chart = key => '<div class="chart" id="c1" style="width:552px;height:230px" data-alt-key="' + key + '"></div>';
  const altRow = text => '<tr data-snap-omit><td style="' + F + '"><span data-edit="text" data-key="c1-alt">' + text + '</span></td></tr>';
  const good = lint(block('<tr><td style="padding:0;">' + chart('c1-alt') + '</td></tr>' + altRow('Tickets rose from 120 in week 1 to 410 in week 9.')));
  assert.deepStrictEqual(good.fails, []);
  const vague = lint(block('<tr><td style="padding:0;">' + chart('c1-alt') + '</td></tr>' + altRow('A chart of tickets over time')));
  assert.ok(rules(vague).includes('alt text'));
  const missing = lint(block('<tr><td style="padding:0;">' + chart('nowhere') + '</td></tr>'));
  assert.ok(rules(missing).includes('alt text'));
});

test('the editable template passes its own checks, its charts frozen from the spec', () => {
  const out = runCheck(EDITABLE);
  assert.match(row(out, 'email-safe block'), /PASS/, out);
  assert.match(row(out, 'charts freeze to PNG'), /PASS.*1 chart\(s\), each drawn through the page spec/, out);
  assert.match(row(out, 'editable page'), /PASS/, out);
});

test('a spec chart with no freeze runtime on the page stays SVG, and says so', () => {
  const src = fs.readFileSync(EDITABLE, 'utf8').replace('<script src="charts-lib/email-snapshot.js"></script>\n', '');
  const file = path.join(dir, 'no-freeze.html');
  fs.writeFileSync(file, src);
  assert.match(row(runCheck(file), 'charts freeze to PNG'), /FAIL.*email-snapshot\.js/);
});

test('finalize ships an editable snapshot as a final copy and a working copy', () => {
  const page = path.join(dir, 'ship-editable', 'snapshot.html');
  fs.mkdirSync(path.dirname(page));
  fs.copyFileSync(EDITABLE, page);
  const f = spawnSync(process.execPath, [FINALIZE, page], { encoding: 'utf8' });
  assert.strictEqual(f.status, 0, f.stdout + f.stderr);
  const fin = fs.readFileSync(page, 'utf8');
  const work = fs.readFileSync(path.join(dir, 'ship-editable', 'snapshot (working copy).html'), 'utf8');
  for (const html of [fin, work]) {
    assert.ok(!/src="charts-lib\//.test(html), 'a charts-lib reference survived');
    assert.ok(html.includes('root.EmailSnapshot = {'), 'the freeze runtime was not inlined');
    assert.ok(html.includes('window.Page = Page'), 'the page runtime was not inlined');
  }
  assert.ok(!fin.includes('window.PageEditor ='), 'the final copy still carries the editor');
  assert.ok(work.includes('window.PageEditor ='), 'the working copy lost the editor');
});
