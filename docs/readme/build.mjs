#!/usr/bin/env node
// Builds the README images from the showcase pages in ./pages.
//
//   node docs/readme/build.mjs            capture every page, then frame and compose
//   node docs/readme/build.mjs dashboard  only the named shots (the hero is rebuilt from what exists)
//
// Each page is staged with the skill's own finalize.js --stage in a temp folder,
// opened in headless Chrome over the DevTools protocol at 2x, and captured at a
// fixed 16:10 viewport. The capture is then dropped into a browser-window frame
// (frame.html) and rendered to images/<name>.png; hero.html lays the framed
// captures out as one composition in images/hero.png.
//
// The same frames are also written for the docs site, at 1x, as WebP in
// docs/img/ (the README's 2x PNGs are too heavy for a web page), plus
// docs/img/og.png, the hero at 1x as a PNG for social previews.
//
// Needs Node 22+ (global WebSocket) and Chrome. Set CHROME to its path if it is
// not in the default location.
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const FINALIZE = join(ROOT, 'plugins/chart-dashboard/skills/chart-dashboard/scripts/finalize.js');
const OUT = join(HERE, 'images');
const RAW = join(HERE, 'images/raw');
const WEB = join(HERE, '../img');
const CHROME = process.env.CHROME || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome'
].find(existsSync);

// Every shot is 16:10 so the framed images line up in the README.
// `setup` runs in the page before the capture; `wait` is real time, so
// charts that freeze or animate have settled.
const SHOTS = [
  { name: 'dashboard', page: 'dashboard.html', w: 2512, h: 1570, title: 'Lakeshore Bike Share — Dashboard' },
  { name: 'report',    page: 'report.html',    w: 1536, h: 960,  title: 'What e-bikes changed — Report' },
  { name: 'deck',      page: 'deck.html',      w: 1280, h: 800,  title: 'Lakeshore Bike Share — Deck',
    setup: `(() => {
      const keep = document.querySelector('[data-title="Revenue"]').closest('.page');
      document.querySelectorAll('.page').forEach(p => { if (p !== keep) p.style.display = 'none'; });
      keep.scrollIntoView({ block: 'center' });
    })()` },
  // 750 is where both columns of the sheet have whitespace, so the window
  // edge cuts between blocks rather than through a line of text.
  { name: 'onepager',  page: 'onepager.html',  w: 1200, h: 750,  title: 'Season brief — One-pager' },
  // 650 ends the window in the gap under the first chart's caption.
  { name: 'email',     page: 'email.html',     w: 1040, h: 650,  title: 'Season wrap — Email snapshot', wait: 4000 },
  { name: 'editable',  page: 'editable.html',  w: 2592, h: 1620, title: 'Draft · Lakeshore Bike Share — Editable', wait: 2500,
    setup: `(async () => {
      PageEditor.start();
      await new Promise(r => setTimeout(r, 700));
      const el = document.getElementById('c-mix');
      const b = el.getBoundingClientRect();
      for (const t of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'])
        el.dispatchEvent(new MouseEvent(t, { bubbles: true, clientX: b.left + b.width / 2, clientY: b.top + b.height / 2 }));
      await new Promise(r => setTimeout(r, 900));
    })()` }
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function chrome() {
  const port = 9300 + Math.floor(Math.random() * 600);
  const proc = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--allow-file-access-from-files', `--remote-debugging-port=${port}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), 'readme-cdp-'))}`, 'about:blank'], { stdio: 'ignore' });
  let targets = [];
  for (let i = 0; i < 60 && !targets.length; i++) {
    try { targets = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).filter(t => t.type === 'page'); }
    catch { await sleep(200); }
  }
  const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });
  const send = (method, params = {}) => new Promise(r => {
    const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params }));
  });
  await send('Page.enable');
  return {
    send,
    async open(url, { w, h, scale = 2, wait = 2000 }) {
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: scale, mobile: false });
      await send('Page.navigate', { url });
      await sleep(wait);
    },
    async capture(file, setup, format = 'png') {
      if (setup) {
        const r = await send('Runtime.evaluate', { expression: setup, awaitPromise: true });
        if (r.result?.exceptionDetails) throw new Error(`${file}: ${r.result.exceptionDetails.exception?.description}`);
        await sleep(600);
      }
      const shot = await send('Page.captureScreenshot', format === 'webp' ? { format, quality: 86 } : { format });
      writeFileSync(file, Buffer.from(shot.result.data, 'base64'));
    },
    async evaluate(expression) {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      return r.result?.result?.value;
    },
    close() { ws.close(); proc.kill(); }
  };
}

const only = process.argv.slice(2);
const shots = only.length ? SHOTS.filter(s => only.includes(s.name)) : SHOTS;
mkdirSync(RAW, { recursive: true });
mkdirSync(WEB, { recursive: true });

const work = mkdtempSync(join(tmpdir(), 'readme-pages-'));
const browser = await chrome();
try {
  for (const s of shots) {
    const page = join(work, s.page);
    copyFileSync(join(HERE, 'pages', s.page), page);
    execFileSync(process.execPath, [FINALIZE, page, '--stage'], { stdio: 'ignore' });
    const raw = join(RAW, `${s.name}.png`);
    await browser.open(pathToFileURL(page).href, s);
    // The layout audit the skill runs on every page (SKILL.md step 7), on the
    // page as built, before any capture-only setup touches it.
    const a = JSON.parse(await browser.evaluate(`(async () => {
      await new Promise((ok, no) => { const x = document.createElement('script');
        x.src = 'charts-lib/audit.js'; x.onload = ok; x.onerror = no; document.head.appendChild(x); });
      return JSON.stringify(await ChartsAudit.run());
    })()`) || '{}');
    console.log(`audit    ${s.name}: ${a.ok ? 'ok' : 'FAIL ' + JSON.stringify(a.fail || a.error)}` +
      (a.warn ? `  warn ${JSON.stringify(a.warn)}` : ''));
    await browser.open(pathToFileURL(page).href, s);
    await browser.capture(raw, s.setup);

    const frame = pathToFileURL(join(HERE, 'frame.html')).href + '?' + new URLSearchParams({
      img: pathToFileURL(raw).href, title: s.title, ...(s.fade ? { fade: 1 } : {})
    });
    await browser.open(frame, { w: 1600, h: 1080, scale: 2, wait: 800 });
    await browser.capture(join(OUT, `${s.name}.png`));
    await browser.open(frame, { w: 1600, h: 1080, scale: 1, wait: 800 });
    await browser.capture(join(WEB, `${s.name}.webp`), null, 'webp');
    console.log(`framed   images/${s.name}.png, docs/img/${s.name}.webp`);
  }
  const hero = pathToFileURL(join(HERE, 'hero.html')).href;
  await browser.open(hero, { w: 1600, h: 1000, scale: 2, wait: 1200 });
  await browser.capture(join(OUT, 'hero.png'));
  await browser.open(hero, { w: 1600, h: 1000, scale: 1, wait: 1200 });
  await browser.capture(join(WEB, 'hero.webp'), null, 'webp');
  await browser.capture(join(WEB, 'og.png'));
  console.log('composed images/hero.png, docs/img/hero.webp, docs/img/og.png');
} finally {
  browser.close();
  rmSync(work, { recursive: true, force: true });
}
