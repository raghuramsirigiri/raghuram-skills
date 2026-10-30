#!/usr/bin/env node
// node scripts/check-screenplay.js film/screenplay.md film/brief.md   (step 2, references/screenplay.md)
'use strict';
const D = require('./film-docs');
const [sp, brief] = process.argv.slice(2);
if (!sp || !brief) { console.log('usage: node check-screenplay.js film/screenplay.md film/brief.md'); process.exit(2); }
const r = D.checkScreenplay(D.read(sp), D.read(brief));
D.report('screenplay', r, r.screenplay.beats.length + ' beats, ' + r.total + ' s');
