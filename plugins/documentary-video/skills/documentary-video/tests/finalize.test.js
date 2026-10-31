// node --test plugins/documentary-video/skills/documentary-video/tests/finalize.test.js
//
// finalize.js: --stage lays out a working folder; without it, the ride
// fixture's film folds into one page with no script loaded from a file; a
// screenplay that fails its check stops it.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SKILL = path.join(__dirname, '..');
const FIN = path.join(SKILL, 'scripts', 'finalize.js');
const FILM = path.join(SKILL, 'evals', 'fixtures', 'ride-dashboard', 'film');
const run = (...a) => spawnSync(process.execPath, [FIN, ...a], { encoding: 'utf8' });

function staged() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'film-'));
  assert.strictEqual(run(dir, '--stage').status, 0);
  for (const f of fs.readdirSync(FILM)) fs.copyFileSync(path.join(FILM, f), path.join(dir, 'film', f));
  return dir;
}

test('--stage copies the engine and both pages', () => {
  const dir = staged();
  for (const f of ['film.html', 'sheet.html', 'film-lib/film.js', 'film-lib/render.js', 'film-lib/export.js', 'film-lib/theme.js'])
    assert.ok(fs.existsSync(path.join(dir, f)), f);
});

test('finalize folds the film into one page that loads no script from a file', () => {
  const dir = staged();
  const r = run(dir, '--name', 'kerb');
  assert.strictEqual(r.status, 0, r.stdout);
  const html = fs.readFileSync(path.join(dir, 'kerb.html'), 'utf8');
  assert.strictEqual((html.match(/<script src=/g) || []).length, 0);
  for (const marker of ['film-lib/theme.js', 'film-lib/film.js', 'film-lib/export.js', 'film/cast.js', 'film/world.js', 'film/shots.js'])
    assert.ok(html.includes('/* ' + marker + ' */'), marker + ' inlined');
  // theme before the engine, the film's scripts before the page's own
  assert.ok(html.indexOf('/* film-lib/theme.js */') < html.indexOf('/* film-lib/scene.js */'));
  assert.ok(html.indexOf('/* film/shots.js */') < html.indexOf('const load'));
});

test('finalize stops when the screenplay fails its check', () => {
  const dir = staged();
  const sp = path.join(dir, 'film', 'screenplay.md');
  fs.writeFileSync(sp, fs.readFileSync(sp, 'utf8').replace('Callout: 6.2 minutes', 'Callout: 7 minutes'));
  const r = run(dir, '--name', 'kerb');
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stdout, /B3: callout number 7/);
  assert.ok(!fs.existsSync(path.join(dir, 'kerb.html')));
});
