#!/usr/bin/env node
/**
 * fetch-design.js — pull a public page and its stylesheets down to a folder.
 *
 * Usage:
 *   node fetch-design.js <url> [-o <dir>] [--same-origin]
 *
 * The colours of a site are almost never in its HTML; they are in the
 * stylesheets the HTML links. So this fetches the page, finds every
 * `<link rel=stylesheet>`, and pulls those too, along with any inline
 * `<style>`, `style="…"` attributes, and `<meta name="theme-color">`.
 * Everything lands in one directory that `extract-theme.js` can read:
 *
 *   node fetch-design.js https://example.com -o ./brand
 *   node extract-theme.js ./brand
 *
 * `extract-theme.js` calls this for you when you hand it a URL directly, so
 * the two-step form is only needed when you want to look at what came back.
 *
 * What this is NOT: a browser. It does not run JavaScript, so a site that
 * paints itself from JS, or ships its palette as a runtime CSS-in-JS object,
 * returns thin results — the report says how much CSS it actually got, and
 * under a few KB you should ask the user for their stylesheet or hex codes
 * instead of trusting a palette built from three declarations. Where real
 * browser tooling is available, driving it and reading the *rendered* styles
 * beats this; see references/theming.md § Get the source.
 *
 * Scope: every stylesheet the page itself links, capped at a dozen, whatever
 * host serves it. Restricting to same-origin sounds safer and mostly just
 * returns nothing: any site on Next.js, Vercel or a CDN — stripe.com, for one —
 * keeps all of its CSS on a separate asset domain, so the same-origin rule
 * skips the entire design and reports a confident palette built from the two
 * colours that happened to be inline. A stylesheet a page links is part of
 * that page's design regardless of who serves it. `--same-origin` restores the
 * strict behaviour. Nothing is followed beyond those links — this reads one
 * page, it does not crawl.
 *
 * Only ever point this at a page the user asked you to look at, and never at
 * anything behind a login: the fetch is unauthenticated by design, so a
 * private URL returns a login page whose palette is the login provider's,
 * not the brand's.
 *
 * No dependencies. Works on any Node 14+.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const MAX_SHEETS = 12;          // a big site links dozens; the first few carry the brand
const MAX_BYTES = 3 * 1024 * 1024;
const TIMEOUT = 15000;
const UA = 'Mozilla/5.0 (compatible; charts-lib theme extractor)';

function get(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('too many redirects'));
    let u;
    try { u = new URL(url); } catch (e) { return reject(new Error('bad URL: ' + url)); }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return reject(new Error('not http(s): ' + url));
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.get(u, { headers: { 'user-agent': UA, accept: 'text/html,text/css,*/*' } }, res => {
      const code = res.statusCode || 0;
      if (code >= 300 && code < 400 && res.headers.location) {
        res.resume();
        return resolve(get(new URL(res.headers.location, u).href, redirects + 1));
      }
      if (code !== 200) { res.resume(); return reject(new Error('HTTP ' + code + ' for ' + url)); }
      let size = 0;
      const chunks = [];
      res.on('data', d => {
        size += d.length;
        if (size > MAX_BYTES) { req.destroy(); return reject(new Error('response over ' + (MAX_BYTES / 1048576) + 'MB: ' + url)); }
        chunks.push(d);
      });
      res.on('end', () => resolve({ url: u.href, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.setTimeout(TIMEOUT, () => { req.destroy(); reject(new Error('timed out after ' + TIMEOUT + 'ms: ' + url)); });
    req.on('error', reject);
  });
}

const slug = s => s.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').slice(-60) || 'sheet';

async function fetchDesign(pageUrl, outDir, sameOriginOnly) {
  fs.mkdirSync(outDir, { recursive: true });
  const page = await get(pageUrl);
  const base = new URL(page.url);
  fs.writeFileSync(path.join(outDir, '000-page.html'), page.body);

  // Stylesheet links. rel is matched loosely because "stylesheet" turns up as
  // `rel="preload" as="style"` and `rel="stylesheet preload"` in the wild.
  const hrefs = [];
  for (const m of page.body.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    if (!/rel\s*=\s*["']?[^"'>]*(stylesheet|preload)/i.test(tag)) continue;
    if (/rel\s*=\s*["']?[^"'>]*preload/i.test(tag) && !/as\s*=\s*["']?style/i.test(tag)) continue;
    const h = /href\s*=\s*["']([^"']+)["']/i.exec(tag);
    if (!h) continue;
    let abs;
    try { abs = new URL(h[1], base); } catch (e) { continue; }
    if (sameOriginOnly && abs.origin !== base.origin &&
        !/(^|\.)fonts\.googleapis\.com$/.test(abs.hostname)) continue;
    if (!hrefs.includes(abs.href)) hrefs.push(abs.href);
  }

  const got = [], failed = [];
  for (const href of hrefs.slice(0, MAX_SHEETS)) {
    try {
      const r = await get(href);
      const name = String(got.length + 1).padStart(3, '0') + '-' + slug(new URL(r.url).pathname.split('/').pop() || 'sheet');
      const file = path.join(outDir, /\.css$/i.test(name) ? name : name + '.css');
      fs.writeFileSync(file, r.body);
      got.push({ href, bytes: r.body.length, file });
    } catch (e) {
      failed.push({ href, why: e.message });
    }
  }
  return { page, hrefs, got, failed, skipped: Math.max(0, hrefs.length - MAX_SHEETS) };
}

function cssBytesIn(dir) {
  return fs.readdirSync(dir).filter(f => /\.css$/i.test(f))
    .reduce((n, f) => n + fs.statSync(path.join(dir, f)).size, 0);
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const sameOriginOnly = args.includes('--same-origin');
  const oi = args.indexOf('-o');
  const outDir = oi >= 0 ? args[oi + 1] : path.join(process.cwd(), 'brand-source');
  const url = args.find(a => /^https?:\/\//i.test(a));
  if (!url) {
    console.error('usage: node fetch-design.js <url> [-o <dir>] [--same-origin]');
    process.exit(2);
  }
  fetchDesign(url, outDir, sameOriginOnly).then(r => {
    console.log('\nFetched ' + r.page.url);
    console.log('  stylesheets linked: ' + r.hrefs.length +
      (r.skipped ? ' (fetched the first ' + MAX_SHEETS + ')' : '') +
      ' | fetched: ' + r.got.length + (r.failed.length ? ' | failed: ' + r.failed.length : ''));
    r.got.forEach(g => console.log('    ' + Math.round(g.bytes / 1024) + ' KB  ' + g.href));
    r.failed.forEach(f => console.log('    FAILED  ' + f.href + '  (' + f.why + ')'));
    const kb = Math.round(cssBytesIn(outDir) / 1024);
    console.log('  → ' + outDir + '  (' + kb + ' KB of CSS)');
    if (kb < 4) {
      console.log('\n  Thin result. This fetch runs no JavaScript, so a site that paints');
      console.log('  itself from JS gives up almost nothing. Ask for the stylesheet or a');
      console.log('  few hex codes rather than trusting a palette built from this.');
    }
    console.log('\nNow run:  node ' + path.join(__dirname, 'extract-theme.js') + ' ' + outDir + '\n');
  }).catch(e => { console.error('fetch failed: ' + e.message); process.exit(1); });
}

module.exports = { fetchDesign, get };
