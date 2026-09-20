#!/usr/bin/env node
/**
 * finalize.js — the two ends of the build, so neither gets half-done.
 *
 *   node <skill-dir>/scripts/finalize.js <page.html> --stage
 *   node <skill-dir>/scripts/finalize.js <page.html>
 *
 * Between writing the page and handing it over there are four steps that
 * always run in the same order: stage the library beside the page so it can
 * actually be opened, check it, fold the library in, delete the staged copy,
 * check again as the thing you are about to ship. Done by hand they are four
 * commands, and the one that gets forgotten is the delete — which leaves a
 * `charts-lib/` folder next to a page that no longer needs it, so the next
 * person to look assumes the page depends on it.
 *
 * `--stage` does the first half: copies `assets/charts-lib` next to the page
 * so browser verification has something to load. Nothing else — verifying is
 * yours to do, and it is the part no script can replace.
 *
 * With no flag it does the second half: static checks, inline, remove the
 * staged copy, then re-check with `--final`, which insists the page is
 * standalone. Exit code is 0 only when the final checks pass, so this works
 * as the gate before you report done.
 *
 * The delete is deliberately timid: it removes a sibling `charts-lib/` only
 * when it holds exactly the three files this skill stages. Anything else is
 * someone's own folder that happens to share a name, and it is left alone
 * with a note. The individual scripts (`inline-lib.js`, `check-page.js`)
 * still work on their own for the split-form exception, where the page keeps
 * its `charts-lib/` references on purpose.
 *
 * No dependencies. Works on any Node 14+.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPTS = __dirname;
const LIB = path.join(SCRIPTS, '..', 'assets', 'charts-lib');
// The three RUNTIME files, listed rather than globbed on purpose:
// assets/charts-lib/ also holds charts.manifest.json, which is an authoring
// reference and has no business next to a finished page. It is also what the
// cleanup below matches against, so staging and removal stay symmetrical.
const LIB_FILES = ['charts.css', 'charts.js', 'theme.js'];
// Staged too, for editable pages. It lives in assets/ rather than
// assets/charts-lib/, which mirrors the upstream library.
const EDITABLE_FILES = ['chart-convert.js', 'page-runtime.js', 'page-editor.js'];
const STAGED_FILES = LIB_FILES.concat(EDITABLE_FILES);

const argv = process.argv.slice(2);
const stageOnly = argv.includes('--stage');
const target = argv.find(a => !a.startsWith('--'));
if (!target) {
  console.error('usage: node finalize.js <page.html> [--stage]');
  process.exit(2);
}
if (!fs.existsSync(target)) {
  console.error('no such file: ' + target);
  process.exit(2);
}

const staged = path.join(path.dirname(path.resolve(target)), 'charts-lib');

const run = (script, args) => spawnSync(process.execPath, [path.join(SCRIPTS, script), ...args],
  { stdio: 'inherit' });

// ── stage: put the library beside the page so it can be opened ───────
if (stageOnly) {
  fs.mkdirSync(staged, { recursive: true });
  for (const f of LIB_FILES) fs.copyFileSync(path.join(LIB, f), path.join(staged, f));
  for (const f of EDITABLE_FILES) fs.copyFileSync(path.join(LIB, '..', f), path.join(staged, f));
  console.log('staged charts-lib/ beside ' + path.basename(target) +
    ' — open the page and verify it, then run this without --stage to ship it.');
  process.exit(0);
}

// ── 1. check the page as built ───────────────────────────────────────
const built = run('check-page.js', [target]);
if (built.status !== 0) {
  console.error('Static checks failed on the page as built. Fix those before inlining — ' +
    'inlining a broken page just makes it a bigger broken page.');
  process.exit(1);
}

// ── 2. fold the library into the page ────────────────────────────────
if (run('inline-lib.js', [target]).status !== 0) process.exit(1);

// ── 3. remove the staged copy, if it is ours to remove ───────────────
if (fs.existsSync(staged)) {
  const found = fs.readdirSync(staged).sort();
  // Any of these sets is ours: folders staged by earlier versions of this
  // script hold three or four files.
  const same = set => found.length === set.length && found.every((f, i) => f === [...set].sort()[i]);
  if (same(LIB_FILES) || same(LIB_FILES.concat('page-runtime.js')) ||
      same(LIB_FILES.concat('chart-convert.js', 'page-runtime.js')) || same(STAGED_FILES)) {
    fs.rmSync(staged, { recursive: true, force: true });
    console.log('removed the staged charts-lib/ — nothing references it now.');
  } else {
    console.log('left charts-lib/ alone: it holds ' + found.join(', ') +
      ', which is not what this skill stages. Delete it yourself if it is a leftover.');
  }
}

// ── 4. check again, as the file you are about to hand over ───────────
if (run('check-page.js', [target, '--final']).status !== 0) process.exit(1);

// ── 5. an editable page ships as two files ───────────────────────────
// The editable file travels as "<name> (working copy).html", and <name>.html
// becomes the final copy with the editor taken out. The file someone would
// naturally send is then the safe one. See references/editable.md.
const EDITOR_INLINE = /<script>\s*\/\*!\s*\n\s*\*\s*page-editor\.js[\s\S]*?<\/script>\s*/;
const EDITOR_TAG = /<script src="charts-lib\/page-editor\.js"><\/script>\s*/;
const shipped = fs.readFileSync(target, 'utf8');
if (EDITOR_INLINE.test(shipped) || EDITOR_TAG.test(shipped)) {
  const ext = path.extname(target);
  const base = target.slice(0, -ext.length).replace(/ \(working copy\)$/i, '');
  const workingCopy = base + ' (working copy)' + ext;
  const finalCopy = base + ext;
  fs.writeFileSync(workingCopy, shipped);
  let fin = shipped.replace(EDITOR_INLINE, '').replace(EDITOR_TAG, '');
  if (!/<meta name="page-edition"/.test(fin)) fin = fin.replace(/<head>/i, '<head>\n<meta name="page-edition" content="final">');
  fs.writeFileSync(finalCopy, fin);
  if (path.resolve(target) !== path.resolve(finalCopy)) fs.unlinkSync(target);
  console.log('editable page: wrote ' + path.basename(finalCopy) + ' (final, to share) and ' +
    path.basename(workingCopy) + ' (editable working copy)');
  const a = run('check-page.js', [finalCopy, '--final']).status;
  const b = run('check-page.js', [workingCopy, '--final']).status;
  process.exit(a === 0 && b === 0 ? 0 : 1);
}
process.exit(0);
