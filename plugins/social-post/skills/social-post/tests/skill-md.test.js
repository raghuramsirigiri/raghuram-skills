// node --test plugins/social-post/skills/social-post/tests/skill-md.test.js
//
// SKILL.md stays small enough to load whole, and routes to every reference.
// Every reference this plugin carries points only at files it carries: it is
// installed on its own, so a pointer into another plugin is a dead end.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SKILL_DIR = path.join(__dirname, '..');
const skill = fs.readFileSync(path.join(SKILL_DIR, 'SKILL.md'), 'utf8');
const refsDir = path.join(SKILL_DIR, 'references');

test('SKILL.md fits the ~5,000 tokens kept after compaction', () => {
  assert.ok(skill.length <= 20000, `SKILL.md is ${skill.length} characters (limit 20000)`);
});

test('the description fits the 1,024-character limit', () => {
  const d = (skill.match(/^description: (.*)$/m) || [])[1] || '';
  assert.ok(d.length > 0 && d.length <= 1024, `description is ${d.length} characters`);
});

test('every reference and template SKILL.md names exists', () => {
  const missing = [];
  for (const [, name] of skill.matchAll(/`(?:references\/)?((?:charts\/)?[a-z0-9<>-]+\.md)`/g)) {
    if (name === 'SKILL.md' || name.includes('<')) continue;
    if (!fs.existsSync(path.join(refsDir, name))) missing.push(name);
  }
  for (const [, name] of skill.matchAll(/`(?:templates\/)?([a-z-]+\.html)`/g)) {
    if (name === 'post.html') continue;
    if (!fs.existsSync(path.join(SKILL_DIR, 'templates', name))) missing.push(name);
  }
  assert.deepStrictEqual(missing, []);
});

test('every top-level reference is routed to from SKILL.md', () => {
  const orphans = fs.readdirSync(refsDir).filter(f => f.endsWith('.md')).filter(f => !skill.includes(f));
  assert.deepStrictEqual(orphans, []);
});

test('no reference points at a file this plugin does not carry', () => {
  const files = fs.readdirSync(refsDir).filter(f => f.endsWith('.md')).map(f => path.join(refsDir, f))
    .concat(fs.readdirSync(path.join(refsDir, 'charts')).map(f => path.join(refsDir, 'charts', f)));
  const dead = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const [, name] of text.matchAll(/\b([a-z0-9-]+\.md)\b/g)) {
      if (name === 'SKILL.md' || name === 'CHARTS-LIB-UPSTREAM.md') continue;
      if (!fs.existsSync(path.join(refsDir, name)) && !fs.existsSync(path.join(refsDir, 'charts', name))) {
        dead.push(path.relative(refsDir, file) + ' → ' + name);
      }
    }
    for (const [, name] of text.matchAll(/templates\/([a-z-]+\.html)/g)) {
      if (!fs.existsSync(path.join(SKILL_DIR, 'templates', name))) dead.push(path.relative(refsDir, file) + ' → ' + name);
    }
  }
  assert.deepStrictEqual([...new Set(dead)], []);
});

test('the handover example ends with the closing line tracing.md fixes', () => {
  const tracing = fs.readFileSync(path.join(refsDir, 'tracing.md'), 'utf8');
  const shape = /Ask "where does (C\d\.\d) come from\?" or "why is that (C\d)'s headline\?" to see the working behind any figure\./;
  assert.ok(tracing.includes('Ask "where does <figure> come from?" or "why is that <card>\'s headline?" to see the working behind any figure.'));
  const block = skill.match(/Worked handover:\s*```([\s\S]*?)```/);
  assert.ok(block, 'SKILL.md has a worked handover');
  const last = block[1].trim().split('\n').pop();
  assert.match(last, shape);
});

test('verify is step 7 and shipping is step 8, as the shared scripts say', () => {
  // finalize.js / .sh / .ps1 are shared with chart-dashboard and print
  // "see SKILL.md step 7" after staging, so the numbering here must match.
  assert.match(skill, /^7\. \*\*Verify before reporting done/m);
  assert.match(skill, /^8\. \*\*Fold the library in and ship one file/m);
});
