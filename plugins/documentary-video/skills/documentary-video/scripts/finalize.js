#!/usr/bin/env node
// finalize.js: the two ends of making a film, so neither gets half-done.
//
//   node <skill>/scripts/finalize.js <folder> --stage
//       copies film-lib/, film.html and sheet.html into <folder>, beside the
//       film/ files the steps write, so the sheet and the player open in a
//       browser while the film is made.
//
//   node <skill>/scripts/finalize.js <folder> [--name <file name>]
//       folds film.html, every film-lib script it loads and film/cast.js,
//       world.js and shots.js into one <name>.html that plays offline and
//       exports its own MP4. Runs the three pre-production checks first
//       when film/brief.md etc. are there, and stops if they fail.
//
// No dependencies. Node 16+.
'use strict';
const fs = require('fs');
const path = require('path');
const D = require('./film-docs');

const SKILL = path.join(__dirname, '..');
const LIB = path.join(SKILL, 'assets', 'film-lib');
const TEMPLATES = path.join(SKILL, 'templates');

const argv = process.argv.slice(2);
const dir = argv.find(a => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--name');
if (!dir) { console.log('usage: node finalize.js <folder> [--stage] [--name <file>]'); process.exit(2); }
const nameAt = argv.indexOf('--name');

if (argv.includes('--stage')) {
  fs.mkdirSync(path.join(dir, 'film-lib'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'film'), { recursive: true });
  for (const f of fs.readdirSync(LIB)) fs.copyFileSync(path.join(LIB, f), path.join(dir, 'film-lib', f));
  for (const f of ['film.html', 'sheet.html']) fs.copyFileSync(path.join(TEMPLATES, f), path.join(dir, f));
  console.log('staged film-lib/, film.html and sheet.html in ' + dir + '; write the steps\' files in ' + path.join(dir, 'film'));
  process.exit(0);
}

// 1. the checks, when their files are there
const F = p => path.join(dir, 'film', p);
let failed = false;
if (fs.existsSync(F('brief.md')) && fs.existsSync(F('screenplay.md'))) {
  const brief = D.read(F('brief.md')), sp = D.read(F('screenplay.md'));
  const rs = D.checkScreenplay(sp, brief);
  for (const e of rs.errors) { console.log('screenplay error: ' + e); failed = true; }
  if (fs.existsSync(F('bible.md'))) for (const e of D.checkBible(D.read(F('bible.md')), brief, sp).errors) { console.log('bible error: ' + e); failed = true; }
}
for (const f of ['cast.js', 'world.js', 'shots.js']) if (!fs.existsSync(F(f))) { console.log('missing film/' + f); failed = true; }
const page = path.join(dir, 'film.html');
if (!fs.existsSync(page)) { console.log('missing film.html (run with --stage first)'); failed = true; }
if (failed) { console.log('finalize: fix the above first'); process.exit(1); }

// 2. fold everything into one page
const safe = js => js.replace(/<\/script/gi, '<\\/script');
let html = D.read(page);
html = html.replace(/<script src="film-lib\/([\w.-]+)"><\/script>/g, (m, f) => {
  const p = path.join(dir, 'film-lib', f);
  if (!fs.existsSync(p)) { console.log('missing film-lib/' + f); process.exit(1); }
  return '<script>/* film-lib/' + f + ' */\n' + safe(D.read(p)) + '\n</script>';
});
const filmScripts = ['cast.js', 'world.js', 'shots.js'].map(f => '<script>/* film/' + f + ' */\n' + safe(D.read(F(f))) + '\n</script>').join('\n');
// the film's own scripts go just before the page's main script, which then finds them already loaded
const mainAt = html.lastIndexOf('<script>\n  const load');
if (mainAt < 0) { console.log('film.html does not look like the template (no loader script)'); process.exit(1); }
html = html.slice(0, mainAt) + filmScripts + '\n' + html.slice(mainAt);
html = html.replace(/<!--[\s\S]*?The film, while it is being made[\s\S]*?-->\n?/, '');

const meta = (D.read(F('shots.js')).match(/name:\s*'([^']+)'/) || [])[1];
const name = (nameAt >= 0 ? argv[nameAt + 1] : meta || 'film').replace(/\.html$/, '');
const out = path.join(dir, name + '.html');
fs.writeFileSync(out, html);
const left = (html.match(/<script src=/g) || []).length;
if (left) { console.log('finalize: ' + left + ' script(s) still load from a file; the page would not stand alone'); process.exit(1); }
console.log('finalize: wrote ' + out + ' (' + (fs.statSync(out).size / 1024).toFixed(0) + ' KB), one file, no external scripts');
