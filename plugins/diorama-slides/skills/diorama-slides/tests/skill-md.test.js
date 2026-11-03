// node --test plugins/diorama-slides/skills/diorama-slides/tests/skill-md.test.js
//
// SKILL.md stays small enough to load whole and routes to every reference;
// references point only at files this plugin carries (it installs alone);
// the closing line matches tracing.md; the step numbers match what the
// scripts print; and SKILL.md never describes its eval fixtures.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SKILL_DIR = path.join(__dirname, '..');
const skill = fs.readFileSync(path.join(SKILL_DIR, 'SKILL.md'), 'utf8');
const refsDir = path.join(SKILL_DIR, 'references');
const refs = fs.readdirSync(refsDir).filter(f => f.endsWith('.md'));
const read = f => fs.readFileSync(f, 'utf8');

test('SKILL.md fits the ~5,000 tokens kept after compaction', () => {
  assert.ok(skill.length <= 20000, `SKILL.md is ${skill.length} characters (limit 20000)`);
});

test('the description fits 1,024 characters and says "video" in its first sentence', () => {
  const d = (skill.match(/^description: (.*)$/m) || [])[1] || '';
  assert.ok(d.length > 0 && d.length <= 1024, `description is ${d.length} characters`);
  assert.match(d.split(/[.:—]/)[0], /video/i);
});

test('every reference, template and script SKILL.md names exists', () => {
  const missing = [];
  for (const [, name] of skill.matchAll(/`(?:references\/)?([a-z0-9-]+\.md)`/g)) {
    if (name === 'SKILL.md') continue;
    if (!fs.existsSync(path.join(refsDir, name))) missing.push(name);
  }
  for (const [, name] of skill.matchAll(/templates\/([a-z-]+\.html)/g)) {
    if (!fs.existsSync(path.join(SKILL_DIR, 'templates', name))) missing.push('templates/' + name);
  }
  for (const [, name] of skill.matchAll(/scripts\/([a-z-]+\.(?:js|sh|ps1))/g)) {
    if (!fs.existsSync(path.join(SKILL_DIR, 'scripts', name))) missing.push('scripts/' + name);
  }
  assert.deepStrictEqual(missing, []);
});

test('every reference is routed to from SKILL.md', () => {
  assert.deepStrictEqual(refs.filter(f => !skill.includes(f)), []);
});

test('no reference points at a file this plugin does not carry', () => {
  const dead = [];
  for (const f of refs) {
    const text = read(path.join(refsDir, f));
    for (const [, name] of text.matchAll(/\b([a-z0-9-]+\.md)\b/g)) {
      if (name === 'SKILL.md') continue;
      if (!fs.existsSync(path.join(refsDir, name))) dead.push(f + ' → ' + name);
    }
    for (const [, name] of text.matchAll(/scripts\/([a-z-]+\.(?:js|sh|ps1))/g)) {
      if (!fs.existsSync(path.join(SKILL_DIR, 'scripts', name))) dead.push(f + ' → scripts/' + name);
    }
    for (const [, name] of text.matchAll(/templates\/([a-z-]+\.html)/g)) {
      if (!fs.existsSync(path.join(SKILL_DIR, 'templates', name))) dead.push(f + ' → templates/' + name);
    }
  }
  assert.deepStrictEqual([...new Set(dead)], []);
});

test('the closing line in SKILL.md and tracing.md\'s worked handover has the shape tracing.md fixes', () => {
  const tracing = read(path.join(refsDir, 'tracing.md'));
  const template = 'Ask "where does <figure> come from?" or "why is <thing> drawn like that?" to see the working behind any figure or picture.';
  assert.ok(tracing.includes(template), 'tracing.md states the closing line template');
  const shape = /^Ask "where does (V\d+\.\d+) come from\?" or "why is (S\d+) drawn like that\?" to see the working behind any figure or picture\.$/;
  const skillLine = skill.split(/\r?\n/).find(l => l.startsWith('Ask "where does V'));
  assert.match(skillLine || '', shape);
  const block = tracing.match(/Handles live in the chat handover:\s*```([\s\S]*?)```/);
  assert.ok(block, 'tracing.md has a worked handover');
  assert.match(block[1].trim().split(/\r?\n/).pop(), shape);
});

test("tracing.md carries the trace and picture blocks' headings, in order, and the choice and wording blocks", () => {
  const t = read(path.join(refsDir, 'tracing.md'));
  const inOrder = (heads, from) => {
    const at = heads.map(h => t.indexOf(h, from));
    at.forEach((i, n) => assert.ok(i > 0, heads[n]));
    for (let i = 1; i < at.length; i++) assert.ok(at[i] > at[i - 1], heads[i]);
  };
  inOrder(['**From your source**', '**Working**', '**Where it appears**', '**What would change it**'], t.indexOf('## The trace block'));
  inOrder(['**What the source says**', '**What I drew from it**', '**What I chose without the source**', '**What would change it**'], t.indexOf('## The picture block'));
  assert.match(t, /## The choice block/);
  assert.match(t, /## The wording block/);
  assert.match(t, /Things on the stage are `S1, S2…`/);
});

test("tracing.md is this skill's own, not a copy of explainer-video's", () => {
  const sib = path.join(SKILL_DIR, '..', '..', '..', 'explainer-video', 'skills', 'explainer-video', 'references', 'tracing.md');
  if (!fs.existsSync(sib)) return;
  assert.notStrictEqual(read(path.join(refsDir, 'tracing.md')), read(sib));
  assert.match(read(path.join(refsDir, 'tracing.md')), /diorama-slides/);
});

test('SKILL.md names the five shapes and the one mode', () => {
  ['transformation', 'lineup', 'assembly', 'episodes', 'journey'].forEach(n => assert.ok(skill.includes('**' + n + '**'), n));
  assert.ok(!/meta\.style/.test(skill), 'no style switch');
  assert.match(skill, /explainer-video/);
  assert.match(skill, /documentary-video/);
});

test('verify is step 7 and shipping is step 8, as finalize.js and verify-and-ship.md say', () => {
  assert.match(skill, /^7\. \*\*Verify before reporting done/m);
  assert.match(skill, /^8\. \*\*Ship one file/m);
  assert.match(read(path.join(SKILL_DIR, 'scripts', 'finalize.js')), /SKILL\.md step 7/);
  const v = read(path.join(refsDir, 'verify-and-ship.md'));
  assert.match(v, /## Step 7/);
  assert.match(v, /## Step 8/);
});

test('SKILL.md never describes its eval fixtures', () => {
  const evals = path.join(SKILL_DIR, 'evals');
  const names = fs.existsSync(evals) ? fs.readdirSync(evals).filter(f => !/^(README\.md|evals\.json)$/.test(f)) : [];
  const stems = names.map(f => f.replace(/(\.KEY)?\.[a-z]+$/i, ''));
  const leaked = stems.filter(s => s && skill.toLowerCase().includes(s.toLowerCase()));
  assert.deepStrictEqual(leaked, []);
  assert.ok(!/^##+ .*(testing|evals?|fixtures?)\b/im.test(skill), 'no testing or fixtures section');
  for (const f of refs) {
    const text = read(path.join(refsDir, f)).toLowerCase();
    assert.deepStrictEqual(stems.filter(s => s && text.includes(s.toLowerCase())), [], f + ' names a fixture');
  }
});
