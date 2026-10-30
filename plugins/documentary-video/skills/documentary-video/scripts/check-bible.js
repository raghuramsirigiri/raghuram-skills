#!/usr/bin/env node
// node scripts/check-bible.js film/bible.md film/brief.md film/screenplay.md   (step 3, references/bible.md)
'use strict';
const D = require('./film-docs');
const [bible, brief, sp] = process.argv.slice(2);
if (!bible || !brief || !sp) { console.log('usage: node check-bible.js film/bible.md film/brief.md film/screenplay.md'); process.exit(2); }
const r = D.checkBible(D.read(bible), D.read(brief), D.read(sp));
D.report('bible', r, r.bible.items.length + ' items');
