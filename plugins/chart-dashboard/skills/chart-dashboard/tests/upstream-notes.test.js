// node --test plugins/chart-dashboard/skills/chart-dashboard/tests/upstream-notes.test.js
//
// The skill ships a copy of charts-lib built from another repo (svg-charts),
// so a library bug must never be fixed only here — the next sync would drop
// the fix. Every such change is written up in CHARTS-LIB-UPSTREAM.md, either
// as `proposed` (left unapplied) or `applied` (in the copy, and in the note so
// it survives the sync). Each section declares which, in a check comment:
//
//   <!-- check: applied; file: charts.js; needle: b.p.color || -->
//
// This test holds the copy to what the note claims.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// repo root: tests/ -> skills/chart-dashboard -> skills -> plugins/chart-dashboard -> plugins -> repo
const ROOT = path.join(__dirname, '..', '..', '..', '..', '..');
const LIB = path.join(__dirname, '..', 'assets', 'charts-lib');
const NOTE_PATH = path.join(ROOT, 'CHARTS-LIB-UPSTREAM.md');
const NOTE = fs.readFileSync(NOTE_PATH, 'utf8');
// Fenced blocks hold examples (including the template check comment), not claims.
const PROSE = NOTE.replace(/^[ 	]*```[\s\S]*?^[ 	]*```/gm, '');

const sections = [...PROSE.matchAll(/^## (\d+)\. (.+)$/gm)].map(m => ({ n: Number(m[1]), title: m[2] }));
const checks = [...PROSE.matchAll(/<!--\s*check:\s*(applied|proposed);\s*file:\s*(\S+);\s*needle:\s*(.+?)\s*-->/g)]
  .map(m => ({ state: m[1], file: m[2], needle: m[3] }));

test('every change written up for upstream has a check, and a table row', () => {
  assert.strictEqual(checks.length, sections.length,
    'each "## n." section needs exactly one check comment (see "Recording a new change")');
  for (const { n, title } of sections) {
    assert.match(NOTE, new RegExp(`^\| ${n} \|`, 'm'),
      `change ${n} ("${title}") has a section but no row in the summary table`);
  }
});

test('the vendored charts-lib is in the state the note claims', () => {
  for (const { state, file, needle } of checks) {
    const full = path.join(LIB, file);
    assert.ok(fs.existsSync(full), `check names ${file}, which is not in assets/charts-lib`);
    const src = fs.readFileSync(full, 'utf8');
    if (state === 'applied') {
      assert.ok(src.includes(needle),
        `the note says "${needle}" is applied in ${file}, but it is not there — a library sync probably dropped it, so re-apply it`);
    } else {
      assert.ok(!src.includes(needle),
        `"${needle}" is in ${file}, but the note still calls it proposed — either mark that change applied, or revert it and send it upstream instead`);
    }
  }
});
