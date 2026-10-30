#!/usr/bin/env node
// node scripts/check-brief.js film/brief.md <document>   (step 1, references/brief.md)
'use strict';
const D = require('./film-docs');
const [brief, doc] = process.argv.slice(2);
if (!brief || !doc) { console.log('usage: node check-brief.js film/brief.md <document as text>'); process.exit(2); }
const r = D.checkBrief(D.read(brief), D.read(doc));
D.report('brief', r, r.brief.claims ? r.brief.claims.length + ' claims, ' + (r.brief.nouns || []).length + ' nouns' : '');
