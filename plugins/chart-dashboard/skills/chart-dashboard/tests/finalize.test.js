// node --test plugins/chart-dashboard/skills/chart-dashboard/tests/finalize.test.js
//
// `--stage` puts the layout audit beside the page with the library, and the
// ship step still recognises that folder as its own and removes it — a
// staged audit.js left behind would make the cleanup leave charts-lib/ alone.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'finalize.js');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'finalize-'));
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>t</title>
<link rel="stylesheet" href="charts-lib/charts.css"></head><body>
<div class="chart" id="c1"></div>
<script src="charts-lib/theme.js"></script>
<script src="charts-lib/charts.js"></script>
<script>Charts.column('c1', { title: 'T', xAxis: { categories: ['A', 'B'] }, series: [{ name: 'v', data: [1, 2] }] });</script>
</body></html>`;

const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });

test('--stage copies audit.js, and shipping removes the staged folder', () => {
  const page = path.join(dir, 'index.html');
  fs.writeFileSync(page, PAGE);
  const staged = path.join(dir, 'charts-lib');

  const s = run(page, '--stage');
  assert.strictEqual(s.status, 0, s.stderr);
  assert.ok(fs.existsSync(path.join(staged, 'audit.js')), 'audit.js was not staged');
  assert.ok(fs.existsSync(path.join(staged, 'charts.js')), 'charts.js was not staged');

  const f = run(page);
  assert.strictEqual(f.status, 0, f.stdout + f.stderr);
  assert.ok(!fs.existsSync(staged), 'staged charts-lib/ was left behind:\n' + f.stdout);
  assert.ok(!/audit\.js|ChartsAudit/.test(fs.readFileSync(page, 'utf8')), 'the audit leaked into the shipped page');
});
