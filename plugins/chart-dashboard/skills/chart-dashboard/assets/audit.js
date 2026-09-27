/*!
 * audit.js — layout checks that return JSON instead of needing a screenshot.
 *
 * Staged beside the page by `finalize.js --stage` and never shipped: the page
 * does not reference it. Load it into the open page from a browser tool and
 * read the result as text:
 *
 *   await new Promise((ok, no) => { const s = document.createElement('script');
 *     s.src = 'charts-lib/audit.js?' + Date.now(); s.onload = ok; s.onerror = no;
 *     document.head.appendChild(s); });
 *   await ChartsAudit.run()
 *
 * run() waits for the charts' entrance animations to finish, then reports
 * what a screenshot would have shown, naming the panel or slide each time:
 *
 *   fail  empty           a chart container that drew nothing
 *         zero-size       a chart container with no width or height
 *         error-panel     a chart that drew its refusal message instead of marks
 *         overflow-x/-y   a chart wider or taller than its container
 *         clipped-x/-y    content cut off by an overflow:hidden box (a .fig, a cell)
 *         spill-x/-y      content running out of a cell, card or KPI tile
 *         off-slide       slide content past the 1280x720 frame (cropped on paper)
 *         into-footer     slide content running into the generated footer
 *         page-scroll-x   the page scrolls sideways
 *         placeholder     template text still on the page
 *   warn  text-overlap    two labels inside one chart drawn on top of each other
 *         text-clipped    a label running past the edge of its chart
 *         truncated       a title or label the library cut short with "…"
 *         kpi-unset       a KPI tile still showing "—"
 *         stale-size      hidden tab only: a chart not yet redrawn for the
 *                         scrollbar; the library fixes it on a visible screen
 *
 * The viewport must be desktop-sized (≥900px) or run() refuses: a hidden
 * browser pane can report 0x0, which would make every measurement noise.
 * `ok` is true when there are no fails. Warnings are worth a look but can be
 * deliberate (a dense scatter's point labels, say).
 *
 * To test a control without screenshots, change it through the audit:
 *
 *   await ChartsAudit.tryControl('#region', 'West')
 *
 * It sets the value, fires input and change, waits for the redraw, and
 * returns which charts changed, which did not, and every title and KPI whose
 * text moved — so a panel the handler forgot shows up as `unchanged`.
 *
 * No dependencies. Reads the DOM only; changes nothing but the control you
 * name.
 */
(function () {
  'use strict';

  const CHART_SEL = '.chart, [data-charts-chart]';
  const BOX_SEL = '.cell, .fig, .kpi, .card, .col, .side';
  const PLACEHOLDERS = ['Metric name', 'START — END', 'Deck name', 'Headline claim, not a topic label',
    'Claim in prose. The figure below', 'Affiliation · Published', 'Author · Team · DATE'];
  const MAX = 25;          // entries per list, so a badly broken page stays a short report
  const TOL = 2;           // px of slack before a box counts as overflowing

  const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > (n || 80) ? s.slice(0, (n || 80) - 1) + '…' : s; };
  const px = n => Math.round(n);

  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  // Entrance and update animations run on the Web Animations API, so the DOM
  // is only worth measuring once they end. Waiting for them is unreliable — a
  // hidden tab (a browser pane the user isn't looking at) does not advance
  // their timeline, nor fire requestAnimationFrame — so skip them to their end
  // state instead, which is exactly the markup the engine drew. A
  // ResizeObserver redraw is debounced, hence the short grace period first.
  async function settle() {
    await Promise.race([document.fonts ? document.fonts.ready : null, wait(1000)]);
    await wait(250);
    if (document.getAnimations) document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { /* infinite */ } });
    await wait(0);
  }

  // ── where: a short name for an element a reader can find in the source ──
  function slideOf(el) { return el.closest && el.closest('.slide'); }
  function slideName(s) {
    const all = Array.from(document.querySelectorAll('.slide'));
    const t = s.getAttribute('data-title') || (s.querySelector('h1, h2') || {}).textContent;
    return 'slide ' + (all.indexOf(s) + 1) + (t ? ' "' + clip(t, 40) + '"' : '');
  }
  function where(el) {
    const s = slideOf(el);
    if (s === el) return slideName(s);
    const pre = s ? slideName(s) + ' › ' : '';
    if (el.id) return pre + '#' + el.id;
    const up = el.parentElement && el.parentElement.closest('[id]');
    return pre + (up && (!s || s.contains(up)) ? '#' + up.id + ' › ' : '') + tagOf(el);
  }
  function tagOf(el) {
    const c = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : '';
    return el.tagName.toLowerCase() + c;
  }

  // ── charts ────────────────────────────────────────────────────────────
  // Nested charts (panels, reportTable cells) are reported through the chart
  // that holds them, so each problem is named once.
  function topCharts() {
    const all = Array.from(document.querySelectorAll(CHART_SEL));
    return all.filter(el => {
      const up = el.parentElement && el.parentElement.closest(CHART_SEL);
      return !up;
    });
  }

  function textsOf(svg) {
    return Array.from(svg.querySelectorAll('text')).filter(t => {
      if (!t.textContent.trim()) return false;
      const r = t.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return false;
      const cs = getComputedStyle(t);
      return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity !== 0;
    });
  }

  function marksOf(svg) {
    return svg.querySelectorAll('rect, path, circle, ellipse, polygon, polyline, line').length;
  }

  function scaleOf(el) {
    // Deck slides are drawn at 1280x720 and scaled by a transform; divide it
    // back out so thresholds mean authored pixels.
    const s = slideOf(el);
    if (!s || !s.offsetWidth) return 1;
    return s.getBoundingClientRect().width / s.offsetWidth || 1;
  }

  function auditChart(el, out) {
    const name = where(el);
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) {
      out.fail.push({ where: name, issue: 'zero-size', w: px(r.width), h: px(r.height) });
      return;
    }
    const svgs = Array.from(el.querySelectorAll('svg'));
    const hasTable = !!el.querySelector('table:not([data-charts-a11y] table)');
    if (!svgs.length && !hasTable) {
      out.fail.push({ where: name, issue: 'empty' });
      return;
    }
    const k = scaleOf(el);
    for (const svg of svgs) {
      if (svg.closest('[data-charts-a11y]')) continue;
      const texts = textsOf(svg);
      // A refusal panel is an svg of text with no marks: the title, then the
      // headline and detail the engine wrote in place of the chart.
      if (marksOf(svg) === 0 && texts.length) {
        out.fail.push({ where: name, issue: 'error-panel', text: clip(texts.slice(1).map(t => t.textContent).join(' '), 140) });
        continue;
      }
      const sr = svg.getBoundingClientRect();
      // A hidden tab runs no ResizeObserver callbacks, so a chart drawn before
      // the page grew a scrollbar keeps its pre-scrollbar width. On a visible
      // screen the library redraws it; don't report that as the page's fault.
      const sb = innerWidth - document.documentElement.clientWidth;
      const over = sr.width - r.width;
      if (document.hidden && sb > 0 && over > TOL * k && Math.abs(over - sb * k) <= TOL * k) {
        out.stale.add(el);
        out.warn.push({ where: name, issue: 'stale-size', note: 'tab is hidden, so the chart was not redrawn after the scrollbar appeared; fine on a visible screen' });
        continue;
      }
      if (over > TOL * k) out.fail.push({ where: name, issue: 'overflow-x', by: px(over / k) });
      if (el.clientHeight > 0 && sr.bottom - r.bottom > TOL * k) out.fail.push({ where: name, issue: 'overflow-y', by: px((sr.bottom - r.bottom) / k) });

      const boxes = texts.map(t => ({ t, r: t.getBoundingClientRect() }));
      let overlaps = 0;
      for (let i = 0; i < boxes.length && overlaps < 3; i++) {
        const a = boxes[i];
        if (/…$/.test(a.t.textContent.trim())) out.warn.push({ where: name, issue: 'truncated', text: clip(a.t.textContent) });
        const off = Math.max(sr.left - a.r.left, a.r.right - sr.right, sr.top - a.r.top, a.r.bottom - sr.bottom);
        if (off > TOL * k) out.warn.push({ where: name, issue: 'text-clipped', text: clip(a.t.textContent, 40), by: px(off / k) });
        for (let j = i + 1; j < boxes.length && overlaps < 3; j++) {
          const b = boxes[j];
          const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
          const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
          if (w <= 0 || h <= 0) continue;
          const small = Math.min(a.r.width * a.r.height, b.r.width * b.r.height);
          if (w * h > 0.3 * small && w * h / (k * k) > 20) {
            overlaps++;
            out.warn.push({ where: name, issue: 'text-overlap', text: [clip(a.t.textContent, 30), clip(b.t.textContent, 30)] });
          }
        }
      }
    }
  }

  // ── boxes: clipped and spilling content ──────────────────────────────
  function insideChart(el) {
    const c = el.closest(CHART_SEL);
    return c && c !== el;
  }

  function auditBoxes(out) {
    const seen = new Set();
    const all = Array.from(document.querySelectorAll('body *'));
    for (const el of all) {
      if (el instanceof SVGElement || insideChart(el) || el.closest('[data-charts-a11y]')) continue;
      if (el.matches('.foot, .foot *')) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.position === 'fixed') continue;
      if (el.clientWidth < 4 || el.clientHeight < 4) continue;
      const hidden = /hidden|clip/.test(cs.overflowX + cs.overflowY);
      const box = el.matches(BOX_SEL);
      if (!hidden && !box) continue;
      if (hidden && cs.textOverflow === 'ellipsis') continue;
      const dx = el.scrollWidth - el.clientWidth, dy = el.scrollHeight - el.clientHeight;
      const kind = hidden ? 'clipped' : 'spill';
      const name = where(el);
      // Overflow caused by a stale chart (see auditChart) is not real.
      if ([...out.stale].some(c => el.contains(c))) continue;
      if (dx > TOL && !seen.has(name + 'x')) { seen.add(name + 'x'); out.fail.push({ where: name, issue: kind + '-x', by: px(dx) }); }
      if (dy > TOL && !seen.has(name + 'y')) { seen.add(name + 'y'); out.fail.push({ where: name, issue: kind + '-y', by: px(dy) }); }
    }
    const de = document.documentElement;
    if (de.scrollWidth - de.clientWidth > TOL) out.fail.push({ where: 'page', issue: 'page-scroll-x', by: px(de.scrollWidth - de.clientWidth) });
  }

  // ── slides: the frame is the page, and paper crops rather than scrolls ─
  function auditSlides(out) {
    for (const s of document.querySelectorAll('.slide')) {
      const k = scaleOf(s);
      const sr = s.getBoundingClientRect();
      const foot = s.querySelector(':scope > .foot');
      const fr = foot && foot.getBoundingClientRect();
      let worstOff = 0, offEl = null, worstFoot = 0, footEl = null;
      for (const el of s.querySelectorAll('*')) {
        if (el === foot || (foot && foot.contains(el))) continue;
        if (el.closest('[data-charts-a11y]') || (el instanceof SVGElement && el.tagName.toLowerCase() !== 'svg')) continue;
        if (insideChart(el) && el.tagName.toLowerCase() !== 'svg') continue;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.position === 'absolute' && el.closest('.chart')) continue;
        const off = Math.max(r.bottom - sr.bottom, r.right - sr.right) / k;
        if (off > worstOff) { worstOff = off; offEl = el; }
        // Only elements in the normal flow count against the footer: an
        // absolutely placed block (a cover's meta line) is positioned on purpose.
        if (fr && cs.position !== 'absolute' && r.left < fr.right && r.right > fr.left) {
          const into = (r.bottom - fr.top) / k;
          if (into > worstFoot) { worstFoot = into; footEl = el; }
        }
      }
      if (worstOff > TOL) out.fail.push({ where: slideName(s), issue: 'off-slide', by: px(worstOff), el: tagOf(offEl) });
      if (worstFoot > TOL) out.fail.push({ where: slideName(s), issue: 'into-footer', by: px(worstFoot), el: tagOf(footEl) });
    }
  }

  function auditText(out) {
    // Rendered text, lower-cased: a KPI label styled `text-transform: uppercase`
    // reads back as "METRIC NAME".
    const text = document.body.innerText.toLowerCase();
    for (const p of PLACEHOLDERS) if (text.includes(p.toLowerCase())) out.fail.push({ where: 'page', issue: 'placeholder', text: p });
    for (const b of document.querySelectorAll('.kpi b, .kpi strong')) {
      if (b.textContent.trim() === '—') out.warn.push({ where: where(b.closest('.kpi')), issue: 'kpi-unset' });
    }
  }

  // A hidden browser pane can report a 0x0 viewport, and a narrow one reflows
  // the grid into a phone layout; either way every measurement would describe
  // a page nobody reads. Refuse rather than report noise.
  const MIN_W = 900;
  function viewportProblem() {
    if (innerWidth >= MIN_W && innerHeight > 0) return null;
    return { ok: false, error: 'viewport is ' + innerWidth + 'x' + innerHeight +
      ' — too small to audit a desktop layout. Size the window to at least ' + MIN_W +
      'px wide (e.g. 1440x900), reload, and run again. Pass {narrow:true} to audit a phone width on purpose.' };
  }

  async function run(opts) {
    const bad = !(opts && opts.narrow) && viewportProblem();
    if (bad) return bad;
    await settle();
    const out = { ok: true, viewport: innerWidth + 'x' + innerHeight, charts: 0,
      slides: document.querySelectorAll('.slide').length, fail: [], warn: [] };
    const charts = topCharts();
    out.charts = charts.length;
    Object.defineProperty(out, 'stale', { value: new Set(), enumerable: false });
    charts.forEach(c => auditChart(c, out));
    auditBoxes(out);
    auditSlides(out);
    auditText(out);
    out.ok = out.fail.length === 0;
    if (out.fail.length > MAX) { out.more = out.fail.length - MAX; out.fail.length = MAX; }
    if (out.warn.length > MAX) { out.moreWarn = out.warn.length - MAX; out.warn.length = MAX; }
    if (!out.fail.length) delete out.fail;
    if (!out.warn.length) delete out.warn;
    out.console = "errors are not captured here — read the console, filtering on '[charts-lib'";
    return out;
  }

  // ── controls ─────────────────────────────────────────────────────────
  function snapshot() {
    const snap = { charts: {}, text: {} };
    topCharts().forEach((c, i) => {
      const id = c.id || 'chart ' + (i + 1);
      const svg = c.querySelector('svg');
      const t = svg ? textsOf(svg) : [];
      snap.charts[id] = { sig: marksOf(svg || c) + '|' + (svg ? svg.textContent : c.textContent), title: t[0] ? clip(t[0].textContent) : '' };
    });
    document.querySelectorAll('h1, h2, h3, .kpi b, .kpi strong, .kpi i, [data-finding]').forEach((el, i) => {
      snap.text[where(el) + (el.id ? '' : ' ' + i)] = clip(el.textContent, 100);
    });
    return snap;
  }

  async function tryControl(selector, value) {
    const el = document.querySelector(selector);
    if (!el) return { error: 'no element matches ' + selector };
    await settle();
    const before = snapshot();
    if (el.type === 'checkbox' || el.type === 'radio') el.checked = value === undefined ? !el.checked : !!value;
    else el.value = value;
    if (el.value !== undefined && value !== undefined && el.type !== 'checkbox' && el.type !== 'radio' && String(el.value) !== String(value)) {
      return { error: selector + ' has no option ' + JSON.stringify(value), options: Array.from(el.options || []).map(o => o.value).slice(0, MAX) };
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    await settle();
    const after = snapshot();
    const res = { control: selector, value: value, changed: [], unchanged: [], titles: {}, text: {} };
    for (const id of Object.keys(after.charts)) {
      const a = before.charts[id], b = after.charts[id];
      (a && a.sig === b.sig ? res.unchanged : res.changed).push(id);
      if (a && a.title !== b.title) res.titles[id] = [a.title, b.title];
    }
    for (const key of Object.keys(after.text)) {
      if (before.text[key] !== after.text[key]) res.text[key] = [before.text[key], after.text[key]];
    }
    if (!Object.keys(res.titles).length) delete res.titles;
    if (!Object.keys(res.text).length) delete res.text;
    return res;
  }

  window.ChartsAudit = { run, tryControl, snapshot };
})();
