#!/usr/bin/env node
/**
 * finalize.js — the two ends of the build, so neither gets half-done.
 *
 *   node <skill-dir>/scripts/finalize.js <video.html> --stage
 *   node <skill-dir>/scripts/finalize.js <video.html>
 *
 * `--stage` copies charts-lib/theme.js and motion-lib/ (with audit.js) beside
 * the page, so it opens in a browser and the audit can run in it. Nothing
 * else: verifying is yours to do (SKILL.md step 7).
 *
 * With no flag: check-video.js on the page as built, fold every staged
 * script into the page in load order, leave audit.js out, remove the staged
 * copies when they hold only what this skill stages, then check-video.js
 * --final on the file you are about to hand over. Exit 0 only when that
 * final check passes, so this is the gate before you report done.
 *
 * No dependencies. Node 14+.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPTS = __dirname;
const ASSETS = path.join(SCRIPTS, '..', 'assets');
const THEME = path.join(ASSETS, 'charts-lib', 'theme.js');
const MLIB = path.join(ASSETS, 'motion-lib');

// What --stage copies, listed so the cleanup can recognise its own folder.
const SUBDIRS = ['scenes', 'shapes'];
function motionFiles() {
  const top = fs.readdirSync(MLIB).filter(f => f.endsWith('.js')).sort();
  return SUBDIRS.reduce((out, d) => out.concat(fs.readdirSync(path.join(MLIB, d)).filter(f => f.endsWith('.js')).sort().map(f => d + '/' + f)), top);
}

const argv = process.argv.slice(2);
const stageOnly = argv.includes('--stage');
const target = argv.find(a => !a.startsWith('--'));
if (!target) { console.error('usage: node finalize.js <video.html> [--stage]'); process.exit(2); }
if (!fs.existsSync(target)) { console.error('no such file: ' + target); process.exit(2); }

const dir = path.dirname(path.resolve(target));
const stagedCharts = path.join(dir, 'charts-lib');
const stagedMotion = path.join(dir, 'motion-lib');
const run = (script, args) => spawnSync(process.execPath, [path.join(SCRIPTS, script), ...args], { stdio: 'inherit' });

// ── stage ────────────────────────────────────────────────────────────
if (stageOnly) {
  fs.mkdirSync(stagedCharts, { recursive: true });
  fs.copyFileSync(THEME, path.join(stagedCharts, 'theme.js'));
  SUBDIRS.forEach(d => fs.mkdirSync(path.join(stagedMotion, d), { recursive: true }));
  for (const f of motionFiles()) fs.copyFileSync(path.join(MLIB, f), path.join(stagedMotion, f));
  console.log('staged charts-lib/ and motion-lib/ beside ' + path.basename(target) +
    ' — serve the folder over http, open the page, run `await VideoAudit.run()` after loading motion-lib/audit.js' +
    ' (SKILL.md step 7), then run this without --stage to ship it.');
  process.exit(0);
}

// ── 1. check the page as built ───────────────────────────────────────
if (run('check-video.js', [target]).status !== 0) {
  console.error('Static checks failed on the page as built. Fix those before inlining.');
  process.exit(1);
}

// ── 2. inline, in the page's own order ───────────────────────────────
let html = fs.readFileSync(target, 'utf8');
let count = 0, failed = false;
html = html.replace(/<script src="(charts-lib|motion-lib)\/([\w\-/]+\.js)"><\/script>\s*\n?/g, (tag, lib, file) => {
  if (file === 'audit.js') return '';                 // verification only, never shipped
  const src = lib === 'charts-lib' ? path.join(ASSETS, 'charts-lib', file) : path.join(MLIB, file);
  if (!fs.existsSync(src)) { console.error('cannot inline ' + lib + '/' + file + ': no such file in the skill'); failed = true; return tag; }
  const code = fs.readFileSync(src, 'utf8');
  if (/<\/script/i.test(code)) { console.error('refusing to inline ' + file + ': it contains a literal </script'); failed = true; return tag; }
  count++;
  return '<script>\n' + code.replace(/\s+$/, '') + '\n</script>\n';
});
if (failed) process.exit(1);
if (count) {
  fs.writeFileSync(target, html);
  console.log(path.basename(target) + ': inlined ' + count + ' files, ' + Math.round(Buffer.byteLength(html) / 1024) + ' KB, standalone');
} else {
  console.log(path.basename(target) + ': already standalone, nothing to inline');
}

// ── 3. remove the staged copies, if they are ours ────────────────────
function listAll(d, base) {
  let out = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const rel = (base ? base + '/' : '') + e.name;
    if (e.isDirectory()) out = out.concat(listAll(path.join(d, e.name), rel));
    else out.push(rel);
  }
  return out.sort();
}
if (fs.existsSync(stagedCharts)) {
  const found = listAll(stagedCharts);
  if (found.length === 1 && found[0] === 'theme.js') { fs.rmSync(stagedCharts, { recursive: true, force: true }); console.log('removed the staged charts-lib/'); }
  else console.log('left charts-lib/ alone: it holds ' + found.join(', ') + ', which is not what this skill stages.');
}
if (fs.existsSync(stagedMotion)) {
  const found = listAll(stagedMotion);
  const ours = motionFiles();
  if (found.every(f => ours.includes(f))) { fs.rmSync(stagedMotion, { recursive: true, force: true }); console.log('removed the staged motion-lib/'); }
  else console.log('left motion-lib/ alone: it holds files this skill does not stage (' + found.filter(f => !ours.includes(f)).join(', ') + ').');
}

// ── 4. check again, as the file you are about to hand over ───────────
process.exit(run('check-video.js', [target, '--final']).status === 0 ? 0 : 1);
