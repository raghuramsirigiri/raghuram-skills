// node --test plugins/chart-dashboard/skills/chart-dashboard/tests/finalize-fallback.test.js
//
// finalize.sh and finalize.ps1 stand in for finalize.js on a machine with no
// Node. Each one's no-Node path must ship the same bytes finalize.js ships —
// the library inlined verbatim, an editable page split the same way — and say
// that the static checks were skipped. FINALIZE_NO_NODE=1 forces that path
// here, since this test is itself running under Node. A shell that is not
// installed is skipped, not failed.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPTS = path.join(__dirname, '..', 'scripts');
const TEMPLATES = path.join(__dirname, '..', 'templates');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'finalize-fallback-'));
test.after(() => fs.rmSync(root, { recursive: true, force: true }));

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>t</title>
<link rel="stylesheet" href="charts-lib/charts.css"></head><body>
<div class="chart" id="c1"></div>
<script src="charts-lib/theme.js"></script>
<script src="charts-lib/charts.js"></script>
<script>Charts.column('c1', { title: 'T', xAxis: { categories: ['A', 'B'] }, series: [{ name: 'v', data: [1, 2] }] });</script>
</body></html>`;

const has = (cmd, args) => { try { return spawnSync(cmd, args, { encoding: 'utf8' }).status === 0; } catch (e) { return false; } };
const SHELLS = [
  { name: 'sh', ok: has('sh', ['-c', 'exit 0']),
    argv: (p, extra) => ['sh', [path.join(SCRIPTS, 'finalize.sh'), p.replace(/\\/g, '/'), ...extra]] },
  { name: 'powershell', ok: process.platform === 'win32' && has('powershell', ['-NoProfile', '-Command', 'exit 0']),
    argv: (p, extra) => ['powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(SCRIPTS, 'finalize.ps1'), p, ...extra]] }
];

const node = (...args) => spawnSync(process.execPath, [path.join(SCRIPTS, 'finalize.js'), ...args], { encoding: 'utf8' });
const fallback = (shell, page, extra = [], env = { FINALIZE_NO_NODE: '1' }) => {
  const [cmd, args] = shell.argv(page, extra);
  return spawnSync(cmd, args, { encoding: 'utf8', env: Object.assign({}, process.env, env) });
};
let n = 0;
// The same source page in two fresh folders: one for finalize.js, one for the fallback.
const pair = (file, html) => ['node', 'fb'].map(side => {
  const dir = path.join(root, String(n++), side);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, file), html);
  return path.join(dir, file);
});
const read = p => fs.readFileSync(p);

for (const shell of SHELLS) {
  const skip = !shell.ok && shell.name + ' is not available';

  test(`${shell.name}: stages and ships the same bytes as finalize.js`, { skip }, () => {
    const [a, b] = pair('index.html', PAGE);
    assert.strictEqual(node(a, '--stage').status, 0);
    assert.strictEqual(node(a).status, 0);
    const s = fallback(shell, b, ['--stage']);
    assert.strictEqual(s.status, 0, s.stderr);
    assert.ok(fs.existsSync(path.join(path.dirname(b), 'charts-lib', 'audit.js')), 'audit.js was not staged');
    const f = fallback(shell, b);
    assert.strictEqual(f.status, 0, f.stdout + f.stderr);
    assert.match(f.stderr, /UNCHECKED/, 'it must say the static checks were skipped');
    assert.ok(!fs.existsSync(path.join(path.dirname(b), 'charts-lib')), 'staged charts-lib/ was left behind');
    assert.ok(read(a).equals(read(b)), 'shipped page differs from finalize.js output');
    assert.match(fallback(shell, b).stdout, /already standalone/, 're-running must be a no-op');
    assert.ok(read(a).equals(read(b)), 're-running changed the page');
  });

  test(`${shell.name}: splits an editable page exactly as finalize.js does`, { skip }, () => {
    const tpl = fs.readFileSync(path.join(TEMPLATES, 'dashboard-editable.html'), 'utf8');
    const [a, b] = pair('dash.html', tpl);
    assert.strictEqual(node(a).status, 0);
    assert.strictEqual(fallback(shell, b).status, 0);
    for (const f of ['dash.html', 'dash (working copy).html']) {
      assert.ok(read(path.join(path.dirname(a), f)).equals(read(path.join(path.dirname(b), f))), f + ' differs from finalize.js output');
    }
  });

  test(`${shell.name}: re-running on the working copy keeps it`, { skip }, () => {
    const tpl = fs.readFileSync(path.join(TEMPLATES, 'dashboard-editable.html'), 'utf8');
    const [a, b] = pair('d (working copy).html', tpl);
    assert.strictEqual(node(a).status, 0);
    assert.strictEqual(fallback(shell, b).status, 0);
    for (const p of [a, b]) {
      assert.deepStrictEqual(fs.readdirSync(path.dirname(p)).sort(), ['d (working copy).html', 'd.html']);
    }
  });

  test(`${shell.name}: leaves a charts-lib/ that is not ours, and fails on a reference it cannot inline`, { skip }, () => {
    const [, b] = pair('index.html', PAGE.replace('</body>', '<script src="charts-lib/mine.js"></script></body>'));
    const own = path.join(path.dirname(b), 'charts-lib');
    fs.mkdirSync(own);
    fs.writeFileSync(path.join(own, 'mine.js'), '');
    const f = fallback(shell, b);
    assert.strictEqual(f.status, 1, 'a page still loading charts-lib/mine.js is not standalone');
    assert.match(f.stderr, /mine\.js/);
    assert.ok(fs.existsSync(path.join(own, 'mine.js')), 'someone else\'s charts-lib/ was removed');
  });

  test(`${shell.name}: hands over to finalize.js when node is on PATH`, { skip }, () => {
    const [, b] = pair('index.html', PAGE);
    const f = fallback(shell, b, [], { FINALIZE_NO_NODE: '' });
    assert.strictEqual(f.status, 0, f.stdout + f.stderr);
    assert.match(f.stdout, /All static checks pass/);
    assert.doesNotMatch(f.stderr, /UNCHECKED/);
  });
}
