// SKILL.md stays small enough to load whole, and routes to every reference.
//
// Claude Code keeps an invoked skill's body in context for the rest of the
// conversation, and after compaction re-attaches only its first ~5,000 tokens.
// So the body is a router: the rules that must hold all build long, and which
// reference to read at which step. The detail lives in references/.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const SKILL_DIR = path.join(__dirname, '..');
const skill = fs.readFileSync(path.join(SKILL_DIR, 'SKILL.md'), 'utf8');
const refsDir = path.join(SKILL_DIR, 'references');

test('SKILL.md is under 500 lines', () => {
  const lines = skill.split(/\r?\n/).length;
  assert.ok(lines < 500, `SKILL.md is ${lines} lines`);
});

test('SKILL.md fits the ~5,000 tokens kept after compaction', () => {
  // ~4 characters per token for English prose and markdown.
  assert.ok(skill.length <= 20000, `SKILL.md is ${skill.length} characters (limit 20000)`);
});

test('every reference and template SKILL.md names exists', () => {
  const missing = [];
  for (const [, name] of skill.matchAll(/`(?:references\/)?((?:charts\/)?[a-z0-9-]+\.md)`/g)) {
    if (name === 'SKILL.md') continue;
    if (!fs.existsSync(path.join(refsDir, name))) missing.push(name);
  }
  for (const [, name] of skill.matchAll(/`(?:templates\/)?([a-z-]+\.html)`/g)) {
    if (name === 'index.html') continue;
    if (!fs.existsSync(path.join(SKILL_DIR, 'templates', name))) missing.push(name);
  }
  assert.deepStrictEqual(missing, []);
});

test('every top-level reference is routed to from SKILL.md', () => {
  const orphans = fs.readdirSync(refsDir)
    .filter((f) => f.endsWith('.md'))
    .filter((f) => !skill.includes(f));
  assert.deepStrictEqual(orphans, []);
});
