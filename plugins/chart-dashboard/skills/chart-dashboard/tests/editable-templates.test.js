// node --test plugins/chart-dashboard/skills/chart-dashboard/tests/editable-templates.test.js
//
// The editable variants of the dashboard, report and deck templates. Each is
// its static template in the format of references/editable.md: charts in the
// #page-spec block, text marked data-edit, and the runtime and editor loaded
// after charts.js. What breaks here breaks for the reader long after the
// build, so these pin what the checker and the build can see:
//   · each variant passes check-page.js, the editable-page row included
//   · no chart is drawn by page code (that would lock it to the editor)
//   · the variant keeps its static template's charts and stylesheet, so the
//     two cannot drift apart unnoticed
//   · finalize.js ships it as a final copy and a working copy
// The email snapshot's variant has its own tests in email-snapshot.test.js.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const TEMPLATES = path.join(__dirname, '..', 'templates');
const CHECK = path.join(__dirname, '..', 'scripts', 'check-page.js');
const FINALIZE = path.join(__dirname, '..', 'scripts', 'finalize.js');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-editable-'));
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

const runCheck = file => spawnSync(process.execPath, [CHECK, file], { encoding: 'utf8' }).stdout;
const row = (out, name) => (out.split('\n').find(l => l.includes(name)) || '');
// LF throughout: a Windows checkout has CRLF, and a template written there may not.
const read = name => fs.readFileSync(path.join(TEMPLATES, name), 'utf8').replace(/\r\n/g, '\n');
const chartIds = html => [...html.matchAll(/<div class="chart[^"]*" id="([^"]+)"/g)].map(m => m[1]);
const spec = html => JSON.parse(html.match(/<script type="application\/json" id="page-spec">([\s\S]*?)<\/script>/)[1]);
const style = html => html.match(/<style>([\s\S]*?)<\/style>/)[1];
const keys = html => [...html.matchAll(/\sdata-key="([^"]+)"/g)].map(m => m[1]);

// static → editable. sameStyle is false for the dashboard only: its editable
// variant drops the filter bar, because a filtered chart is locked.
const PAIRS = [
  { name: 'dashboard', file: 'dashboard-editable.html', base: 'dashboard.html', sameStyle: false },
  { name: 'report', file: 'report-editable.html', base: 'report.html', sameStyle: true },
  { name: 'deck', file: 'slides-editable.html', base: 'slides.html', sameStyle: true }
];

for (const p of PAIRS) {
  const html = read(p.file);

  test(p.name + ': the editable template passes its own checks', () => {
    const out = runCheck(path.join(TEMPLATES, p.file));
    assert.match(row(out, 'editable page'), /PASS/, out);
    assert.doesNotMatch(row(out, 'editable page'), /locked/, out);
    assert.match(row(out, 'panels wired'), /PASS/, out);
    assert.doesNotMatch(out, /\bFAIL\b/, out);
  });

  test(p.name + ': every chart is a spec entry, and none is drawn by code', () => {
    const ids = chartIds(html);
    assert.deepStrictEqual(Object.keys(spec(html).charts).sort(), ids.slice().sort());
    assert.doesNotMatch(html, /Charts\.(?!theme\b|applyPalette\b)\w+\(\s*['"]/, 'a Charts.<type>() call would lock its chart');
  });

  test(p.name + ': text is marked, every key unique', () => {
    const k = keys(html);
    assert.ok(k.length > 0, 'no marked text');
    assert.deepStrictEqual(k.filter((x, i) => k.indexOf(x) !== i), []);
  });

  if (p.sameStyle) {
    test(p.name + ': it keeps its static template\'s charts and stylesheet', () => {
      const base = read(p.base);
      assert.deepStrictEqual(chartIds(html), chartIds(base));
      assert.strictEqual(style(html), style(base), 'the stylesheet drifted from ' + p.base);
    });
  }

  test(p.name + ': finalize ships a final copy and a working copy', () => {
    const page = path.join(dir, p.name, 'page.html');
    fs.mkdirSync(path.dirname(page));
    fs.copyFileSync(path.join(TEMPLATES, p.file), page);
    const f = spawnSync(process.execPath, [FINALIZE, page], { encoding: 'utf8' });
    assert.strictEqual(f.status, 0, f.stdout + f.stderr);
    const fin = fs.readFileSync(page, 'utf8');
    const work = fs.readFileSync(path.join(dir, p.name, 'page (working copy).html'), 'utf8');
    for (const out of [fin, work]) {
      assert.ok(!/src="charts-lib\//.test(out), 'a charts-lib reference survived');
      assert.ok(out.includes('window.Page = Page'), 'the page runtime was not inlined');
    }
    assert.ok(!fin.includes('window.PageEditor ='), 'the final copy still carries the editor');
    assert.ok(work.includes('window.PageEditor ='), 'the working copy lost the editor');
  });
}

// The deck's footers are built at load. They must be marked so a save leaves
// them out, and their name and context must come from marked text, not from
// a constant in code that a reader cannot reach.
test('deck: footers are generated, and read their words from the cover', () => {
  const html = read('slides-editable.html');
  assert.match(html, /setAttribute\('data-page-generated', ''\)/);
  assert.match(html, /data-key="deck-name"/);
  assert.match(html, /data-key="deck-context"/);
  assert.doesNotMatch(html, /const DECK\s*=/);
});
