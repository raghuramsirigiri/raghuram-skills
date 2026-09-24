/*!
 * page-editor.js — change an editable page without code.
 *
 * An "Edit page" button opens edit mode. Hovering outlines what can be
 * changed. Clicking a heading or paragraph edits it in place. Clicking a
 * chart opens a panel with up to five tabs:
 *   Type    the chart types that suit its data, and why the others don't
 *   Text    title and subtitle
 *   Data    a grid of its existing names and values
 *   Style   series colours from the page's palette, highlighted bars,
 *           sort order, value labels (only what the chart type supports)
 *   Layout  card width, double height and position in a dashboard grid
 * Undo and redo cover every change. The editor changes and removes what the
 * page already has; it never adds a component, a row or a series. A Remove
 * button beside the selection offers the text, its card, its section (report)
 * or its slide (deck); removed parts are hidden until the file is saved,
 * so undo brings them back.
 *
 * Saving writes the whole page back out as one HTML file:
 *   Save              overwrites the file where the browser allows it
 *                     (File System Access API: Chrome, Edge), otherwise
 *                     downloads it. The new file is opened in a hidden frame
 *                     first, and nothing is written unless every chart draws.
 *   Export final copy the same page without this editor, marked final
 *                     (<meta name="page-edition" content="final">): the
 *                     version to share.
 *
 * A file with this editor is a working copy, and says so wherever it goes:
 * a banner across the top on every open (with Export final copy), a DRAFT
 * watermark when printed or saved as PDF, and "Draft ·" in the tab title.
 * None of the three reaches a saved file; the editor adds them on open.
 * Edits are also kept as a draft in this browser's localStorage, so a closed
 * tab offers to restore them, and leaving with unsaved changes asks first.
 *
 * Everything it draws lives in one shadow root on a host marked
 * data-page-ui, so the page's CSS can't reach it and Page.serialize() leaves
 * it out of a saved file. All changes go through window.Page
 * (page-runtime.js) and window.ChartConvert (chart-convert.js).
 *
 * Load after page-runtime.js. No dependencies.
 */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  var NAMES = {
    column: 'Columns', bar: 'Bars', line: 'Line', radar: 'Radar', dumbbell: 'Dumbbell',
    table: 'Table', barList: 'Bar list', donut: 'Donut', pie: 'Pie', waffle: 'Waffle',
    packedBubble: 'Packed bubbles', histogram: 'Histogram', histogramPercent: 'Histogram (%)',
    histogramCumulative: 'Cumulative histogram', scatter: 'Scatter', bubble: 'Bubble',
    waterfall: 'Waterfall', sankey: 'Sankey', reportTable: 'Report table',
    barInsightTable: 'Bar insight table', panels: 'Panels', geofacet: 'Map grid',
    heatmap: 'Heatmap', calendarHeatmap: 'Calendar heatmap'
  };
  var name = function (t) { return NAMES[t] || t; };

  var CSS = [
    ':host{all:initial}',
    // Keyboard focus is always visible; a mouse click doesn't draw the ring.
    ':focus-visible{outline:2px solid var(--pe-accent);outline-offset:2px}',
    'button:focus:not(:focus-visible){outline:none}',
    '@media print{:host{display:none!important}}',
    // The host carries the chart theme's font (set in init), so the editor
    // matches the page instead of the browser's default serif.
    '*{box-sizing:border-box;font-family:inherit}',
    'input,textarea{font:inherit}',
    'button{font:inherit;cursor:pointer}',
    '.toggle,.bar,.panel,.note,.draft{pointer-events:auto}',
    // The working-copy banner: always on screen, never printed (the host
    // is hidden in print; the watermark takes over there).
    '.draft{position:fixed;top:0;left:0;right:0;min-height:40px;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;',
    '  padding:6px 16px;background:#fff4d6;color:#4a3300;border-bottom:1px solid #e9cf8a;font-size:13px;line-height:1.35;text-align:center}',
    '.draft b{font-weight:700}',
    '.draft button{border:1px solid #b7791f;background:#fff;color:#4a3300;border-radius:6px;padding:5px 12px;font-weight:600;min-height:32px}',
    '.draft button:hover{background:#fffaf0}',
    '.draft .short{display:none}',
    '@media (max-width:700px){.draft{justify-content:space-between;text-align:left;flex-wrap:nowrap}.draft .long{display:none}.draft .short{display:inline}}',
    '.toggle{position:fixed;right:20px;bottom:20px;padding:10px 16px;border-radius:999px;border:1px solid #d0d0d0;',
    '  background:#fff;color:#111;font-size:14px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,.14)}',
    '.toggle:hover{background:#f3f3f3}',
    // Bottom of the screen, clear of page headers; on a phone the panel is a
    // bottom sheet, so the bar goes to the top instead.
    '.bar{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:8px;',
    '  padding:6px 6px 6px 14px;border-radius:999px;background:#111;color:#fff;font-size:13px;',
    '  box-shadow:0 6px 24px rgba(0,0,0,.25);max-width:calc(100vw - 24px)}',
    // With the side panel open, centre the bar over what is left of the page.
    '@media (max-width:700px){.bar{bottom:auto;top:calc(var(--pe-top,0px) + 12px)}}',
    '@media (min-width:701px){.bar.shift{left:calc((100% - 380px) / 2);max-width:calc(100% - 404px)}}',
    '.bar .msg{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}',
    '.bar .status{color:#aaa;white-space:nowrap}',
    '.bar button{border:0;border-radius:999px;padding:6px 12px;background:#333;color:#fff;font-size:13px}',
    '.bar button:hover:not(:disabled){background:#444}',
    '.bar button:disabled{opacity:.4;cursor:default}',
    '.bar button.done{background:#fff;color:#111;font-weight:600}',
    '.bar button.save{background:var(--pe-accent);font-weight:600}',
    '.bar button.save:hover:not(:disabled){background:#1f58e8}',
    '.bar .status.unsaved{color:#ffcf66}',
    '.bar button.fmt{font-family:Georgia,serif;padding:6px 10px}',
    '.bar button.fmt.b{font-weight:700}',
    '.bar button.fmt.i{font-style:italic}',
    '.bar button.fmt[aria-pressed=true]{background:var(--pe-accent)}',
    '.menu{position:relative}',
    '.menu .more{padding:6px 10px}',
    '.menu .list{position:absolute;bottom:calc(100% + 8px);right:0;background:#fff;color:#111;border-radius:8px;',
    '  box-shadow:0 8px 30px rgba(0,0,0,.25);padding:4px;min-width:220px}',
    '@media (max-width:700px){.menu .list{bottom:auto;top:calc(100% + 8px)}}',
    '.menu .list button{display:block;width:100%;text-align:left;background:none;color:#111;border-radius:6px;padding:8px 10px}',
    '.menu .list button:hover{background:#f0f0f0}',
    '.menu .list small{display:block;color:#595959;font-size:12px;margin-top:2px}',
    '.card{position:fixed;right:20px;bottom:72px;width:300px;max-width:calc(100vw - 40px);background:#fff;color:#111;',
    '  border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.2);padding:14px 16px;font-size:13px;line-height:1.45;pointer-events:auto}',
    '.card .acts{display:flex;gap:8px;margin-top:10px;justify-content:flex-end}',
    '.card button{border:1px solid #ccc;background:#fff;border-radius:6px;padding:6px 12px;color:#111}',
    '.card button.primary{background:var(--pe-accent);border-color:var(--pe-accent);color:#fff;font-weight:600}',
    '.toast{position:fixed;left:50%;bottom:72px;transform:translateX(-50%);background:#111;color:#fff;border-radius:8px;',
    '  padding:8px 14px;font-size:13px;max-width:calc(100vw - 40px);box-shadow:0 6px 24px rgba(0,0,0,.25);pointer-events:auto}',
    '.toast.err{background:#8a1c1c}',
    '@media (max-width:700px){.toast{bottom:auto;top:calc(var(--pe-top,0px) + 64px)}}',
    '.hl,.sel{position:fixed;pointer-events:none;border-radius:6px}',
    '.hl{outline:2px dashed var(--pe-accent);outline-offset:2px}',
    '.sel{outline:2px solid var(--pe-accent);outline-offset:2px}',
    '.rm{position:fixed;pointer-events:auto;border:0;border-radius:6px;background:#b42318;color:#fff;font-size:12px;font-weight:600;padding:5px 10px;box-shadow:0 2px 8px rgba(0,0,0,.25)}',
    '.rm:hover{background:#912018}',
    '.rmenu{position:fixed;pointer-events:auto;background:#fff;color:#111;border-radius:8px;box-shadow:0 8px 30px rgba(0,0,0,.25);padding:4px;min-width:220px;max-width:320px}',
    '.rmenu button{display:block;width:100%;text-align:left;border:0;background:none;border-radius:6px;padding:8px 10px;font-size:13px;color:#111}',
    '.rmenu button:hover{background:#fdecec;color:#8a1c1c}',
    '.rmenu small{display:block;color:#595959;font-size:12px;margin-top:2px}',
    '.rmenu .t{font-size:12px;color:#595959;padding:6px 10px 4px}',
    '.hl .tag{position:absolute;left:0;top:-24px;background:var(--pe-accent);color:#fff;font-size:12px;',
    '  padding:2px 8px;border-radius:4px;white-space:nowrap}',
    '.hl.locked{outline-color:#999}.hl.locked .tag{background:#777}',
    '.panel{position:fixed;top:var(--pe-top,0px);right:0;bottom:0;width:380px;max-width:100vw;background:#fff;color:#111;',
    '  border-left:1px solid #ddd;box-shadow:-8px 0 30px rgba(0,0,0,.12);display:flex;flex-direction:column;font-size:13px}',
    '@media (max-width:700px){.panel{top:auto;width:100%;height:60vh;border-left:0;border-top:1px solid #ddd}}',
    '.head{display:flex;align-items:center;gap:8px;padding:14px 16px 10px;border-bottom:1px solid #eee}',
    '.head .t{flex:1;min-width:0}',
    '.head .k{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#595959}',
    '.head .n{font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.x{border:0;background:none;font-size:22px;line-height:1;color:#666;padding:4px 8px;border-radius:6px}',
    '.x:hover{background:#f0f0f0}',
    '.tabs{display:flex;gap:4px;padding:8px 12px 0;border-bottom:1px solid #eee}',
    '.tabs button{border:0;background:none;padding:8px 12px;border-bottom:2px solid transparent;color:#555;font-size:13px}',
    '.tabs button[aria-selected=true]{color:#111;border-bottom-color:var(--pe-accent);font-weight:600}',
    '.body{flex:1;overflow:auto;padding:14px 16px 24px}',
    '.hint{color:#666;margin:0 0 12px;line-height:1.45}',
    '.flash{margin:0 0 12px;padding:8px 10px;border-radius:6px;line-height:1.4}',
    '.flash.err{background:#fdecec;color:#8a1c1c}',
    '.flash.info{background:#eef3ff;color:#1d3a8a}',
    '.flash.warn{background:#fff6e0;color:#6b4a00}',
    '.flash button{margin-left:6px;border:0;background:none;text-decoration:underline;color:inherit;padding:0}',
    '.types{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.type{text-align:left;border:1px solid #ddd;background:#fff;border-radius:8px;padding:10px;color:#111}',
    '.type:hover:not(:disabled){border-color:var(--pe-accent)}',
    '.type.cur{border-color:var(--pe-accent);background:#eef3ff}',
    '.type:disabled{cursor:default;background:#fafafa;color:#595959}',
    '.type b{display:block;font-size:13px}',
    '.type small{display:block;margin-top:4px;font-size:12px;line-height:1.35;color:#595959}',
    '.type small.w{color:#8a6100}',
    'label.f{display:block;margin:0 0 12px;font-size:12px;color:#555}',
    'label.f input{display:block;width:100%;margin-top:4px;padding:8px 10px;border:1px solid #ccc;border-radius:6px;font-size:14px;color:#111}',
    'table{border-collapse:collapse;width:100%}',
    'th,td{border:1px solid #e3e3e3;padding:0}',
    'th{background:#f6f6f6;font-weight:600;font-size:12px;text-align:left}',
    'td input,th input{width:100%;min-width:64px;border:0;padding:7px 8px;font-size:13px;background:transparent;color:#111}',
    'td input:focus,th input:focus{outline:2px solid var(--pe-accent);outline-offset:-2px;background:#fff}',
    'td input.num{text-align:right;font-variant-numeric:tabular-nums}',
    'td input:disabled,th input:disabled{color:#595959;background:#f6f6f6}',
    'input.bad{background:#fdecec!important;outline:2px solid #d33!important;outline-offset:-2px}',
    '.grp td{background:#f6f6f6}',
    '.scroll{overflow:auto;max-width:100%}',
    '.tabs button{padding:8px 9px}',
    'h4{margin:18px 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#555}',
    'h4:first-child{margin-top:0}',
    '.row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:0 0 8px}',
    '.row .lbl{flex:1 1 100%;font-size:12px;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.sw{width:26px;height:26px;border-radius:6px;border:2px solid transparent;padding:0;box-shadow:inset 0 0 0 1px rgba(0,0,0,.15)}',
    '.sw[aria-pressed=true]{border-color:#111;box-shadow:inset 0 0 0 2px #fff}',
    '.sw.auto{background:#fff;font-size:12px;width:auto;padding:0 6px;color:#555}',
    '.seg{display:inline-flex;border:1px solid #ccc;border-radius:8px;overflow:hidden}',
    '.seg button{border:0;background:#fff;padding:7px 12px;font-size:13px;color:#111;border-right:1px solid #ddd}',
    '.seg button:last-child{border-right:0}',
    '.seg button[aria-pressed=true]{background:var(--pe-accent);color:#fff;font-weight:600}',
    '.seg button:disabled{color:#aaa;cursor:default}',
    '.btn{border:1px solid #ccc;background:#fff;border-radius:8px;padding:7px 12px;font-size:13px;color:#111}',
    '.btn:hover:not(:disabled){border-color:var(--pe-accent)}',
    '.btn:disabled{color:#aaa;cursor:default}',
    '.crow{display:flex;align-items:center;gap:8px;margin:0 0 6px}',
    '.crow .lbl{flex:1;min-width:0;font-size:13px;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.chip{display:inline-flex;align-items:center;gap:6px;border:1px solid #ccc;background:#fff;border-radius:8px;padding:4px 8px 4px 4px;font-size:12px;color:#111}',
    '.chip:hover,.chip[aria-expanded=true]{border-color:var(--pe-accent)}',
    '.chip i{width:20px;height:20px;border-radius:5px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.15);display:inline-block}',
    '.chip i.auto{background:repeating-linear-gradient(45deg,#eee 0 4px,#fff 4px 8px)}',
    '.picker{border:1px solid #e3e3e3;border-radius:10px;padding:10px;margin:0 0 12px;background:#fafafa}',
    '.picker .g{font-size:12px;color:#595959;margin:0 0 4px}',
    '.picker .sws{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}',
    '.picker .sw.named{width:auto;padding:0 8px 0 26px;font-size:12px;color:#111;background-repeat:no-repeat;background-size:14px 14px;background-position:6px center;background-color:#fff}',
    '.picker .custom{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
    '.picker input[type=color]{width:34px;height:28px;border:1px solid #ccc;border-radius:6px;padding:2px;background:#fff;cursor:pointer}',
    '.picker .hex{width:84px;padding:5px 7px;border:1px solid #ccc;border-radius:6px;font-size:12px;font-family:ui-monospace,Consolas,monospace}',
    '.panes{display:flex;flex-wrap:wrap;gap:6px;padding:10px 16px 0}',
    '.panes button{border:1px solid #ccc;background:#fff;border-radius:999px;padding:5px 10px;font-size:12px;color:#111;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.panes button[aria-pressed=true]{background:#111;border-color:#111;color:#fff}',
    '.rec{border:1px solid #e3e3e3;border-radius:10px;padding:10px 12px;margin:0 0 12px;background:#fff}',
    '.rec h5{margin:0 0 8px;font-size:13px}',
    '.rec .grp{font-size:12px;color:#595959;margin:-4px 0 8px}',
    'label.f select{display:block;width:100%;margin-top:4px;padding:8px 10px;border:1px solid #ccc;border-radius:6px;font-size:14px;color:#111;background:#fff;min-height:36px}',
    'label.f textarea{display:block;width:100%;margin-top:4px;padding:8px 10px;border:1px solid #ccc;border-radius:6px;font-size:13px;color:#111;resize:vertical;min-height:54px}',
    'label.f .pair{display:flex;gap:6px;margin-top:4px}',
    'label.f .pair input{margin-top:0}',
    'label.f .pair input.num{flex:0 0 96px;text-align:right}',
    'label.f small{display:block;color:#595959;font-size:12px;margin-top:3px}',
    '.wrow{margin:0 0 12px}',
    '.wlbl{display:flex;justify-content:space-between;gap:8px;font-size:13px;margin:0 0 4px}',
    '.wlbl span{color:#595959;font-size:12px}',
    '.wctl{display:flex;align-items:center;gap:6px}',
    '.wctl input[type=range]{flex:1;min-width:0;accent-color:var(--pe-accent)}',
    '.wctl .hex{width:64px;text-align:right}',
    '.wctl .px{font-size:12px;color:#595959}',
    '.wtotal{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:4px 0 8px;padding-top:8px;border-top:1px solid #eee;font-size:13px;font-weight:600}',
    'label.chk{display:flex;align-items:center;gap:8px;padding:4px 0;font-size:13px;cursor:pointer}',
    'label.chk input{width:16px;height:16px;margin:0}',
    // ── target sizes: 36px controls, 44px on phones ──
    '.bar button,.btn,.chip,.seg button,.panes button{min-height:36px}',
    '.rm{min-height:32px}',
    '.tabs button{min-height:40px}',
    '.x{min-width:36px;min-height:36px}',
    '.sw{width:28px;height:28px}',
    'label.chk{min-height:32px}',
    'label.chk input{width:18px;height:18px}',
    '@media (max-width:700px){.bar button,.btn,.chip,.seg button,.panes button,.rm,.tabs button,.type,.x{min-height:44px}',
    '  label.chk{min-height:44px} .sw{width:36px;height:36px} .bar .msg{display:none} .bar{padding-left:6px}}',
    // ── motion: short, and none for readers who ask for less ──
    '@keyframes pe-in-side{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}',
    '@keyframes pe-in-up{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}',
    '@keyframes pe-fade{from{opacity:0}to{opacity:1}}',
    '@keyframes pe-pulse{0%{opacity:0}15%{opacity:1}70%{opacity:1}100%{opacity:0}}',
    '.panel:not([hidden]){animation:pe-in-side .16s ease-out}',
    '@media (max-width:700px){.panel:not([hidden]){animation:pe-in-up .18s ease-out}}',
    '.toast:not([hidden]),.rmenu:not([hidden]),.menu .list:not([hidden]){animation:pe-fade .12s ease-out}',
    '.pulse{position:fixed;pointer-events:none;border-radius:6px;outline:2px dashed var(--pe-accent);outline-offset:2px;opacity:0;animation:pe-pulse 1.6s ease-out forwards}',
    '@media (prefers-reduced-motion:reduce){*,.pulse{animation:none!important;transition:none!important}.pulse{opacity:1}}',
    // ── removal confirmation, toast action, stale title ──
    '.rmenu .confirm{padding:8px 10px 4px;font-size:13px;line-height:1.45;color:#111}',
    '.rmenu .confirm b{display:block;margin-bottom:2px}',
    '.rmenu .acts{display:flex;gap:8px;justify-content:flex-end;padding:6px}',
    '.rmenu .acts button{width:auto;display:inline-block;border:1px solid #ccc;min-height:36px;padding:6px 14px}',
    '.rmenu .acts button.danger{background:#b42318;border-color:#b42318;color:#fff;font-weight:600}',
    '.rmenu .acts button.danger:hover{background:#912018;color:#fff}',
    '.toast button{margin-left:12px;border:0;border-radius:6px;background:#fff;color:#111;font-weight:600;padding:4px 12px;min-height:30px}',
    'label.f.stale input{border-color:#b7791f;background:#fffaf0}',
    'label.f.stale small{color:#7a4f00}',
    '.type small.w{font-weight:600}'
  ].join('\n');

  var host, root, ui = {};
  var editing = false, selected = null, textEdit = null;
  var undoStack = [], redoStack = [];
  var dataTouched = {};
  var tab = 'type';
  var flash = null;   // { kind, text } shown once at the top of the panel

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] === true) n.setAttribute(k, '');
      else if (attrs[k] !== false && attrs[k] != null) n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }

  // ── undo ───────────────────────────────────────────────────────────
  // Every change is: take a snapshot, change the page, and keep the
  // snapshot only if the change went through.
  function change(fn) {
    var before = Page.snapshot();
    var ok = fn();
    if (ok === false) { Page.restore(before); return false; }
    undoStack.push(before);
    if (undoStack.length > 200) undoStack.shift();
    redoStack = [];
    refreshBar();
    return true;
  }
  function undo() {
    if (textEdit) finishText(true);
    if (!undoStack.length) return;
    redoStack.push(Page.snapshot());
    Page.restore(undoStack.pop());
    afterHistory();
  }
  function redo() {
    if (textEdit) finishText(true);
    if (!redoStack.length) return;
    undoStack.push(Page.snapshot());
    Page.restore(redoStack.pop());
    afterHistory();
  }
  function afterHistory() {
    flash = null;
    refreshBar();
    if (selected && selected.kind === 'chart') renderPanel();
    place();
  }

  // ── what can be edited under the pointer ───────────────────────────
  function hit(node) {
    for (var n = node; n && n.nodeType === 1 && n !== document.body; n = n.parentNode) {
      var kind = n.getAttribute('data-edit');
      if ((kind === 'text' || kind === 'rich') && n.getAttribute('data-key')) {
        return { kind: 'text', el: n, id: n.getAttribute('data-key'), rich: kind === 'rich' };
      }
      if (n.classList && n.classList.contains('chart') && n.id) {
        return { kind: 'chart', el: n, id: n.id, locked: !Page.getChart(n.id) };
      }
    }
    return null;
  }
  function fromUI(e) {
    var path = e.composedPath ? e.composedPath() : [];
    return path.indexOf(host) >= 0;
  }
  function inTextEdit(node) {
    return textEdit && (node === textEdit.el || textEdit.el.contains(node));
  }

  function box(target, node) {
    if (!target) { node.hidden = true; return; }
    var r = target.getBoundingClientRect();
    node.hidden = false;
    node.style.left = r.left + 'px';
    node.style.top = r.top + 'px';
    node.style.width = r.width + 'px';
    node.style.height = r.height + 'px';
  }
  var hovered = null;
  function place() {
    box(hovered && (!selected || hovered.el !== selected.el) ? hovered.el : null, ui.hl);
    box(selected ? selected.el : null, ui.sel);
    placeRemove();
  }

  // ── removing ───────────────────────────────────────────────────────
  // What the selection sits in, from the smallest thing outward. Each entry
  // is one or more page nodes that go together (a report section is its
  // heading and everything up to the next heading).
  var CONTAINERS = [
    ['.kpi, .k', 'This KPI card'],
    ['.note', 'This note'],
    ['li', 'This list item'],
    ['tr', 'This table row'],
    ['.toc .row, .toc .part', 'This agenda line'],
    ['.cell', 'This card'],
    ['figure', 'This figure'],
    ['.col, .side, .q, .s, .t', 'This block'],
    ['.kpis', 'All the KPI cards'],
    ['header', 'The page header'],
    ['footer', 'The footer'],
    // A deck's slide. A dashboard's outer wrapper is also .page; that is the
    // whole page, never something to remove.
    ['.deck > .page', 'This slide']
  ];
  // A node's text with its parts spaced: a heading's number span and its
  // words would otherwise run together ("04Radar").
  function textOfNode(n) {
    var parts = [];
    (function walk(x) {
      for (var c = x.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) parts.push(c.textContent);
        else if (c.nodeType === 1) { parts.push(' '); walk(c); parts.push(' '); }
      }
    })(n);
    return parts.join('').replace(/\s+/g, ' ').trim();
  }
  function removeTargets(h) {
    var out = [], seen = [];
    function add(nodes, label, detail) {
      nodes = nodes.filter(function (n) { return n && Page.canRemove(n) && !Page.isRemoved(n); });
      if (!nodes.length || seen.indexOf(nodes[0]) >= 0) return;
      seen.push(nodes[0]);
      out.push({ nodes: nodes, label: label, detail: detail || null });
    }
    if (h.kind === 'text') add([h.el], 'This text', textOfNode(h.el).slice(0, 60));
    var sectionAdded = false;
    for (var n = h.el; n && n !== document.body; n = n.parentElement) {
      if (h.kind === 'chart' && n === h.el && !n.parentElement.closest('.cell, figure')) add([n], 'This chart');
      for (var i = 0; i < CONTAINERS.length; i++) {
        if (n.matches && n.matches(CONTAINERS[i][0]) && n !== h.el) {
          var label = CONTAINERS[i][1];
          var t = n.querySelector('h1, h2, h3, .n');
          add([n], label, label === 'This slide' ? (n.querySelector('[data-title]') || n).getAttribute('data-title') || (t ? textOfNode(t).slice(0, 50) : '') : null);
          break;
        }
      }
      // A report section: the heading at or before this block, up to the next.
      if (!sectionAdded && n.parentElement && n.parentElement.classList.contains('paper')) {
        sectionAdded = true;
        var kids = Array.prototype.slice.call(n.parentElement.children);
        var at = kids.indexOf(n), start = -1;
        for (var k = at; k >= 0; k--) { if (kids[k].tagName === 'H2') { start = k; break; } }
        if (start >= 0) {
          var nodes = [];
          for (var m = start; m < kids.length; m++) {
            if (m > start && (kids[m].tagName === 'H2' || kids[m].tagName === 'FOOTER')) break;
            nodes.push(kids[m]);
          }
          add(nodes, 'This section', textOfNode(kids[start]).slice(0, 50));
        }
      }
    }
    return out;
  }
  var rmOpen = false;
  function placeRemove() {
    if (!ui.rm) return;
    var show = editing && !!selected && removeTargets(selected).length > 0;
    ui.rm.hidden = !show;
    if (!show) { ui.rmenu.hidden = true; rmOpen = false; return; }
    var r = selected.el.getBoundingClientRect();
    var w = ui.rm.offsetWidth, h = ui.rm.offsetHeight;
    // Try beside the selection's corners in turn and take the first spot that
    // is on screen and clear of the toolbar and the panel.
    var avoid = [ui.bar, ui.panel, ui.draft].filter(function (n) { return !n.hidden; }).map(function (n) { return n.getBoundingClientRect(); });
    var vw = window.innerWidth, vh = window.innerHeight;
    var spots = [[r.right - w, r.top - h - 8], [r.right - w, r.bottom + 8], [r.left, r.top - h - 8],
      [r.left, r.bottom + 8], [r.right - w - 8, r.top + 8], [r.left + 8, r.top + 8]];
    var clear = function (x, y) {
      if (x < 8 || y < 8 || x + w > vw - 8 || y + h > vh - 8) return false;
      return avoid.every(function (a) { return x + w < a.left || x > a.right || y + h < a.top || y > a.bottom; });
    };
    var spot = spots.filter(function (p) { return clear(p[0], p[1]); })[0] ||
      [Math.max(8, Math.min(r.right - w, vw - w - 8)), Math.max(8, Math.min(r.top + 8, vh - h - 8))];
    ui.rm.style.left = spot[0] + 'px';
    ui.rm.style.top = spot[1] + 'px';
    if (rmOpen) {
      var mw = ui.rmenu.offsetWidth || 240, mh = ui.rmenu.offsetHeight || 160;
      var mx = Math.max(8, Math.min(spot[0] + w - mw, vw - mw - 8));
      var my = spot[1] + h + 6 + mh > vh - 8 ? spot[1] - mh - 6 : spot[1] + h + 6;
      ui.rmenu.style.left = mx + 'px';
      ui.rmenu.style.top = Math.max(8, my) + 'px';
    }
  }
  // What a removal takes with it, for the confirmation.
  function contents(nodes) {
    var charts = 0, texts = 0;
    nodes.forEach(function (n) {
      charts += (n.matches('.chart[id]') ? 1 : 0) + n.querySelectorAll('.chart[id]').length;
      texts += (n.matches('[data-edit]') ? 1 : 0) + n.querySelectorAll('[data-edit]').length;
    });
    return { charts: charts, texts: texts };
  }
  function plural(n, one) { return n + ' ' + one + (n === 1 ? '' : 's'); }
  // Small things go at once (Undo is one click away); a section, a slide or
  // anything holding a chart asks first.
  function needsConfirm(t) {
    return t.nodes.length > 1 || /section|slide|KPI cards|header|footer/i.test(t.label) || contents(t.nodes).charts > 0;
  }
  function doRemove(t) {
    if (textEdit) finishText(true);
    change(function () { return Page.remove(t.nodes).ok; });
    closeRemoveMenu(false);
    select(null);
    toast('Removed ' + t.label.replace(/^This /, 'this ').replace(/^The /, 'the ').replace(/^All the /, 'all the ') + '.', false,
      { label: 'Undo', run: function () { undo(); toast('Brought back.'); } });
  }
  function menuKeys(e) {
    var items = Array.prototype.slice.call(ui.rmenu.querySelectorAll('button'));
    var i = items.indexOf(root.activeElement);
    // Enter and Space press the item here, so activation never depends on
    // the browser turning the key into a click.
    if ((e.key === 'Enter' || e.key === ' ') && i >= 0) { e.preventDefault(); items[i].click(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      i = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
      items[i].focus();
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      items[e.key === 'Home' ? 0 : items.length - 1].focus();
    } else if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      closeRemoveMenu(true);
    } else if (e.key === 'Tab') {
      closeRemoveMenu(false);
    }
  }
  function later(fn) { setTimeout(fn, 0); }
  function closeRemoveMenu(focusButton) {
    rmOpen = false;
    ui.rmenu.hidden = true;
    ui.rm.setAttribute('aria-expanded', 'false');
    if (focusButton && !ui.rm.hidden) ui.rm.focus();
  }
  function openRemoveMenu() {
    if (!selected) return;
    var targets = removeTargets(selected);
    ui.rmenu.textContent = '';
    ui.rmenu.appendChild(el('div', { class: 't', text: 'Remove from the page', 'aria-hidden': 'true' }));
    targets.forEach(function (t) {
      ui.rmenu.appendChild(el('button', {
        role: 'menuitem',
        onmousedown: function (e) { e.preventDefault(); },
        onclick: function () { if (needsConfirm(t)) confirmRemove(t); else doRemove(t); }
      }, [t.label, t.detail ? el('small', { text: t.detail }) : null]));
    });
    rmOpen = true;
    ui.rmenu.hidden = false;
    ui.rm.setAttribute('aria-expanded', 'true');
    placeRemove();
    // Focus moves after this event is done: a keyboard Enter that opened the
    // menu would otherwise go on to press the item it lands on.
    later(function () { var first = ui.rmenu.querySelector('button'); if (first) first.focus(); });
  }
  function confirmRemove(t) {
    var c = contents(t.nodes);
    var parts = [];
    if (c.charts) parts.push(plural(c.charts, 'chart'));
    if (c.texts) parts.push(plural(c.texts, 'text block'));
    var what = t.label.replace(/^This /, '').replace(/^The /, '').replace(/^All the /, 'all the ');
    ui.rmenu.textContent = '';
    ui.rmenu.appendChild(el('div', { class: 'confirm', role: 'alert' }, [
      el('b', { text: 'Remove ' + what + (t.detail ? ' \u201C' + t.detail + '\u201D' : '') + '?' }),
      parts.length ? 'It holds ' + parts.join(' and ') + '. ' : '',
      'You can undo this until you save.'
    ]));
    var cancel = el('button', { role: 'menuitem', onmousedown: function (e) { e.preventDefault(); },
      onclick: function () { openRemoveMenu(); } }, ['Cancel']);
    var go = el('button', { role: 'menuitem', class: 'danger', onmousedown: function (e) { e.preventDefault(); },
      onclick: function () { doRemove(t); } }, ['Remove']);
    ui.rmenu.appendChild(el('div', { class: 'acts' }, [cancel, go]));
    placeRemove();
    later(function () { cancel.focus(); });
  }

  // ── keyboard ───────────────────────────────────────────────────────
  // In edit mode every chart and piece of marked text is a tab stop, so the
  // page can be edited without a mouse: Tab to it, Enter to edit it, Esc to
  // leave. The tab stops are the editor's own (data-page-ti) and are taken
  // off when editing stops and before the page is saved.
  function editables() {
    var out = [];
    Array.prototype.forEach.call(document.querySelectorAll('.chart[id], [data-edit][data-key]'), function (n) {
      if (host.contains(n) || Page.isRemoved(n)) return;
      if (n.classList.contains('chart') && n.parentElement && n.parentElement.closest('.chart')) return;
      if (hit(n)) out.push(n);
    });
    return out;
  }
  function addTabStops() {
    editables().forEach(function (n) {
      if (n.hasAttribute('tabindex')) return;
      n.setAttribute('tabindex', '0');
      n.setAttribute('data-page-ti', '');
    });
  }
  function removeTabStops() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-page-ti]'), function (n) {
      n.removeAttribute('tabindex');
      n.removeAttribute('data-page-ti');
    });
  }
  function describe(h) {
    return h.kind === 'text' ? (h.rich ? 'Edit paragraph' : 'Edit text') : h.locked ? 'Locked chart' : 'Edit chart';
  }
  function onFocusIn(e) {
    if (!editing || fromUI(e) || inTextEdit(e.target)) return;
    var h = hit(e.target);
    if (!h || h.el !== e.target) return;
    hovered = h;
    ui.hl.classList.toggle('locked', !!h.locked);
    ui.tag.textContent = describe(h) + ' \u00B7 Enter';
    place();
  }
  function clearPulses() {
    Array.prototype.forEach.call(root.querySelectorAll(".pulse"), function (d) { d.parentNode.removeChild(d); });
  }
  // Outline every editable thing on screen for a moment when editing starts,
  // so touch and keyboard users see what they can change.
  function pulseEditables() {
    var vh = window.innerHeight, n = 0;
    editables().forEach(function (e) {
      var r = e.getBoundingClientRect();
      if (n >= 80 || r.bottom < 0 || r.top > vh || !r.width) return;
      n++;
      var d = el('div', { class: 'pulse', 'aria-hidden': 'true' });
      d.style.left = r.left + 'px'; d.style.top = r.top + 'px';
      d.style.width = r.width + 'px'; d.style.height = r.height + 'px';
      // Beneath the panel and toolbar, and gone as soon as anything moves:
      // the outlines mark where things are now, not where they were.
      root.insertBefore(d, ui.hl);
      setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 1700);
    });
  }

  // ── #2 keep the selection in view beside the panel ─────────────────
  // While the panel is open the page gets room beside it (or above it on a
  // phone) and the selection scrolls into that room. The style is marked
  // data-page-ui, so it never reaches a saved file.
  var roomStyle = null;
  function makeRoom(open) {
    if (!roomStyle) {
      roomStyle = document.createElement('style');
      roomStyle.setAttribute('data-page-ui', '');
      document.head.appendChild(roomStyle);
    }
    var phone = window.innerWidth <= 700;
    var css = !open ? '' : phone ? 'html{padding-bottom:60vh!important}' : 'html{padding-right:380px!important}';
    if (roomStyle.textContent === css) return;
    roomStyle.textContent = css;
    // Charts follow their containers on their own; a deck scales its slides
    // on resize, so tell it the room changed.
    try { window.dispatchEvent(new Event('resize')); } catch (err) { /* old browsers */ }
  }
  function revealSelection() {
    if (!selected) return;
    var r = selected.el.getBoundingClientRect();
    if (window.innerWidth <= 700) {
      var top = 64, bottom = window.innerHeight * 0.4 - 8;
      if (r.top < top || r.top > bottom) window.scrollBy(0, r.top - top);
    } else if (r.top < 8 || r.bottom > window.innerHeight - 80) {
      window.scrollBy(0, r.top - Math.max(16, (window.innerHeight - 80 - r.height) / 2));
    }
    place();
  }

  // ── events while editing ───────────────────────────────────────────
  function onMove(e) {
    if (fromUI(e)) { hovered = null; place(); return; }
    var h = inTextEdit(e.target) ? null : hit(e.target);
    hovered = h;
    if (h) {
      ui.hl.classList.toggle('locked', !!h.locked);
      ui.tag.textContent = describe(h);
    }
    place();
  }
  function onDown(e) {
    if (fromUI(e) || inTextEdit(e.target)) return;
    if (hit(e.target)) { e.preventDefault(); e.stopPropagation(); }
  }
  function onClick(e) {
    if (fromUI(e) || inTextEdit(e.target)) return;
    closeMenu();
    var h = hit(e.target);
    e.preventDefault();
    e.stopPropagation();
    if (textEdit) finishText(true);
    if (!h) { select(null); return; }
    h.x = e.clientX;
    h.y = e.clientY;
    select(h);
  }
  var returnFocus = null;
  function onKey(e) {
    if (!editing) return;
    var typing = inTextEdit(e.target) || (root.activeElement && /INPUT|TEXTAREA/.test(root.activeElement.tagName));
    if (!typing && !fromUI(e) && (e.key === 'Enter' || e.key === ' ') && !e.ctrlKey && !e.metaKey) {
      var h = hit(document.activeElement);
      if (h && h.el === document.activeElement) {
        e.preventDefault();
        returnFocus = h.el;
        select(h);
        return;
      }
    }
    var mod = e.ctrlKey || e.metaKey;
    if (mod && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      if (root.activeElement && root.activeElement.blur) root.activeElement.blur();   // commit a grid cell
      save(e.shiftKey);
    } else if (mod && !typing && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    } else if (mod && !typing && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault();
      redo();
    } else if (e.key === 'Escape' && !typing) {
      if (ui.list && !ui.list.hidden) closeMenu();
      else if (rmOpen) closeRemoveMenu(true);
      else {
        var back = selected ? selected.el : null;
        select(null);
        if (back && back.hasAttribute('tabindex')) back.focus();
      }
    }
  }
  function onScroll() { clearPulses(); place(); }

  // ── text in place ──────────────────────────────────────────────────
  function startText(h) {
    var node = h.el;
    textEdit = { el: node, key: h.id, rich: h.rich, before: Page.snapshot(), original: Page.getText(h.id) };
    if (!h.rich) {
      node.setAttribute('contenteditable', 'plaintext-only');
      if (node.contentEditable !== 'plaintext-only') node.setAttribute('contenteditable', 'true');
    } else {
      node.setAttribute('contenteditable', 'true');
    }
    node.addEventListener('keydown', textKey);
    node.addEventListener('blur', textBlur);
    if (h.rich) node.addEventListener('mouseup', updateFormatButtons);
    if (h.rich) node.addEventListener('keyup', updateFormatButtons);
    node.focus();
    // A label or heading is usually retyped whole, so select it all; in a
    // paragraph the reader clicked where they want to change something.
    var range = null;
    if (h.rich && h.x != null) {
      if (document.caretRangeFromPoint) range = document.caretRangeFromPoint(h.x, h.y);
      else if (document.caretPositionFromPoint) {
        var pos = document.caretPositionFromPoint(h.x, h.y);
        if (pos) { range = document.createRange(); range.setStart(pos.offsetNode, pos.offset); }
      }
      if (range && !node.contains(range.startContainer)) range = null;
    }
    if (!range) {
      range = document.createRange();
      range.selectNodeContents(node);
      if (h.rich) range.collapse(false);
    }
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    setMessage(h.rich
      ? 'Editing paragraph · Ctrl+B bold · Ctrl+I italic · click outside to finish'
      : 'Editing text · Enter to finish · Esc to cancel');
    updateFormatButtons();
  }
  function applyFormat(cmd) {
    if (!textEdit || !textEdit.rich) return;
    textEdit.el.focus();
    document.execCommand(cmd, false, null);
    updateFormatButtons();
  }
  function updateFormatButtons() {
    var active = !!textEdit && textEdit.rich;
    ui.bold.hidden = !active;
    ui.italic.hidden = !active;
    if (!active) return;
    try {
      ui.bold.setAttribute('aria-pressed', document.queryCommandState('bold'));
      ui.italic.setAttribute('aria-pressed', document.queryCommandState('italic'));
    } catch (e) { /* queryCommandState unsupported: leave buttons usable, untoggled */ }
  }
  function textKey(e) {
    var node = textEdit.el;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finishText(false); select(null); node.focus(); }
    else if (e.key === 'Enter' && !textEdit.rich) { e.preventDefault(); finishText(true); select(null); node.focus(); }
    else if (textEdit.rich && (e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) { e.preventDefault(); applyFormat('bold'); }
    else if (textEdit.rich && (e.ctrlKey || e.metaKey) && (e.key === 'i' || e.key === 'I')) { e.preventDefault(); applyFormat('italic'); }
  }
  function textBlur() {
    // Clicking the bar's Undo blurs the text first; commit so undo sees it.
    if (textEdit) { finishText(true); if (selected && selected.kind === 'text') select(null); }
  }
  function finishText(keep) {
    var t = textEdit;
    if (!t) return;
    textEdit = null;
    t.el.removeEventListener('keydown', textKey);
    t.el.removeEventListener('blur', textBlur);
    t.el.removeEventListener('mouseup', updateFormatButtons);
    t.el.removeEventListener('keyup', updateFormatButtons);
    ui.bold.hidden = true;
    ui.italic.hidden = true;
    t.el.removeAttribute('contenteditable');
    var value = t.rich ? t.el.innerHTML : t.el.textContent;
    if (!keep) { Page.restore(t.before); setMessage(null); return; }
    if (value === t.original) { setMessage(null); return; }
    Page.setText(t.key, value);
    undoStack.push(t.before);
    redoStack = [];
    setMessage(null);
    refreshBar();
  }

  // ── selection ──────────────────────────────────────────────────────
  function select(h) {
    clearPulses();
    if (textEdit) finishText(true);
    rmOpen = false;
    if (ui.rmenu) ui.rmenu.hidden = true;
    selected = h;
    flash = null;
    var open = !!h && h.kind === 'chart';
    ui.panel.hidden = !open;
    ui.bar.classList.toggle('shift', open);
    makeRoom(open);
    if (!h) { place(); return; }
    if (h.kind === 'text') { place(); startText(h); return; }
    tab = 'type';
    openPicker = null;
    renderPanel();
    // Let the page reflow into its new room, then bring the chart into view
    // and move keyboard focus to the panel.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        revealSelection();
        var t = ui.panel.querySelector('[role=tab][aria-selected=true]') || ui.panel.querySelector('button');
        if (t) t.focus({ preventScroll: true });
      });
    });
    setTimeout(place, 250);
    place();
  }

  // ── panel ──────────────────────────────────────────────────────────
  function focusTab() {
    var t = ui.panel.querySelector('[role=tab][aria-selected=true]');
    if (t) t.focus();
  }
  function renderPanel() {
    var baseId = selected.id;
    // A panels chart is several charts under one title: pick the whole
    // composition (its title, its place on the page) or one panel, which then
    // gets the same tabs as any chart.
    var base = Page.getChart(baseId);
    var subs = base && base.type === 'panels' && Page.panels ? Page.panels(baseId) : [];
    if (selected.sub != null && !subs[selected.sub]) selected.sub = null;
    var inPanel = subs.length > 0 && selected.sub != null;
    var id = inPanel ? subs[selected.sub].id : baseId;
    var entry = inPanel ? Page.getChart(id) : base;
    var body = el('div', { class: 'body' });
    var head = el('div', { class: 'head' }, [
      el('div', { class: 't' }, [
        el('div', { class: 'k', text: entry ? name(entry.type) : 'Chart' }),
        el('div', { class: 'n', text: entry && entry.config.title ? entry.config.title : id })
      ]),
      el('button', { class: 'x', 'aria-label': 'Close', title: 'Close (Esc)', onclick: function () { select(null); } }, ['×'])
    ]);
    ui.panel.textContent = '';
    ui.panel.setAttribute('aria-label', 'Edit chart: ' + (entry && entry.config.title ? entry.config.title : id));
    ui.panel.appendChild(head);
    if (subs.length) {
      var panes = el('div', { class: 'panes', role: 'group', 'aria-label': 'Panels' });
      panes.appendChild(el('button', { 'aria-pressed': String(!inPanel),
        onclick: function () { selected.sub = null; tab = 'text'; flash = null; openPicker = null; renderPanel(); } }, ['Whole chart']));
      subs.forEach(function (sp, i) {
        panes.appendChild(el('button', { 'aria-pressed': String(inPanel && selected.sub === i), title: name(sp.type),
          onclick: function () { selected.sub = i; tab = 'type'; flash = null; openPicker = null; renderPanel(); } },
          [(i + 1) + ' \u00B7 ' + (sp.title || name(sp.type))]));
      });
      ui.panel.appendChild(panes);
    }

    if (!entry) {
      body.appendChild(el('p', { class: 'hint', text: 'This chart is drawn by the page’s own code, so it can’t be changed here.' }));
      ui.panel.appendChild(body);
      return;
    }

    var tabs = el('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Chart settings' });
    var tabList = subs.length && !inPanel
      ? [['text', 'Text']]
      : [['type', 'Type'], ['text', 'Text'], ['data', 'Data'], ['style', 'Style']];
    if (entry && window.ChartConvert && ChartConvert.callouts && ChartConvert.callouts.anchors(entry.type, entry.config) &&
        !(subs.length && !inPanel)) {
      tabList.splice(4, 0, ['notes', 'Callouts']);
    }
    if (!inPanel && Page.layout && Page.layout(baseId)) tabList.push(['layout', 'Layout']);
    if (!tabList.some(function (t) { return t[0] === tab; })) tab = tabList[0][0];
    tabList.forEach(function (t) {
      tabs.appendChild(el('button', { role: 'tab', id: 'pe-tab-' + t[0], 'aria-controls': 'pe-body',
        'aria-selected': String(tab === t[0]), tabindex: tab === t[0] ? '0' : '-1',
        onclick: function () { tab = t[0]; flash = null; openPicker = null; renderPanel(); focusTab(); } }, [t[1]]));
    });
    // Arrow keys move between tabs, as in any tab list.
    tabs.addEventListener('keydown', function (e) {
      var keys = { ArrowRight: 1, ArrowLeft: -1, Home: -99, End: 99 };
      if (!(e.key in keys)) return;
      e.preventDefault();
      var i = tabList.map(function (t) { return t[0]; }).indexOf(tab);
      var d = keys[e.key];
      i = d === -99 ? 0 : d === 99 ? tabList.length - 1 : (i + d + tabList.length) % tabList.length;
      tab = tabList[i][0]; flash = null; openPicker = null;
      renderPanel();
      focusTab();
    });
    ui.panel.appendChild(tabs);
    body.id = 'pe-body';
    body.setAttribute('role', 'tabpanel');
    body.setAttribute('aria-labelledby', 'pe-tab-' + tab);

    if (flash) {
      body.appendChild(el('div', { class: 'flash ' + flash.kind }, [flash.text]));
      flash = null;
    }
    if (dataTouched[id] && tab !== 'data') {
      body.appendChild(el('div', { class: 'flash warn' }, [
        'You changed this chart’s data. Check that the title still says what the chart shows.',
        el('button', { onclick: function () { delete dataTouched[id]; renderPanel(); } }, ['OK'])
      ]));
    }
    if (tab === 'type') typeTab(body, id, entry);
    else if (tab === 'text') textTab(body, id, entry);
    else if (tab === 'data') dataTab(body, id, entry);
    else if (tab === 'style') styleTab(body, id, entry);
    else if (tab === 'notes') calloutsTab(body, id, entry);
    else layoutTab(body, baseId);
    if (subs.length && !inPanel && tab === 'text') {
      body.appendChild(el('p', { class: 'hint', text: 'To change one of the charts inside, pick it above.' }));
    }
    ui.panel.appendChild(body);
  }

  function lostText(lost) {
    return lost.map(function (l) {
      if (l.indexOf('plotOptions.') === 0) return name(l.slice(12)) + ' settings';
      if (l === 'yAxis') return 'value axis settings';
      if (l === 'xAxis.type') return 'the date axis';
      if (l.indexOf('xAxis.') === 0) return 'axis ' + l.slice(6);
      if (l.indexOf('chart.') === 0) return l.slice(6);
      return l;
    }).join(', ');
  }

  function shortWarning(w) {
    if (/px wide/.test(w)) return 'Tight fit';
    if (/slices/.test(w)) return 'Many slices';
    if (/Tables size/.test(w)) return 'Leaves space below';
    if (/gaps/.test(w)) return 'Breaks at gaps';
    if (/side by side/.test(w)) return 'Many panels';
    return 'Check the fit';
  }
  function typeTab(body, id, entry) {
    if (entry.type === 'reportTable') return reportTypeTab(body, id, entry);
    if (entry.type === 'geofacet') return tileTypeTab(body, id, entry);
    var alts = Page.alternatives(id);
    if (!alts.length) {
      body.appendChild(el('p', { class: 'hint', text: 'A ' + name(entry.type).toLowerCase() +
        ' can’t be shown as another kind of chart. You can still change its title on the Text tab.' }));
      return;
    }
    body.appendChild(el('p', { class: 'hint', text: 'Show the same data as:' }));
    var grid = el('div', { class: 'types' });
    alts.forEach(function (a) {
      var note = a.current ? el('small', { text: 'Current' })
        : !a.ok ? el('small', { text: a.reason })
        : a.warnings.length ? el('small', { class: 'w', text: shortWarning(a.warnings[0]), title: a.warnings.join(' ') })
        : null;
      grid.appendChild(el('button', {
        class: 'type' + (a.current ? ' cur' : ''),
        disabled: !a.ok || a.current,
        'aria-label': name(a.type) + (a.current ? ', current' : !a.ok ? ', not available: ' + a.reason : a.warnings.length ? '. ' + a.warnings.join(' ') : ''),
        'aria-pressed': String(!!a.current),
        onclick: function () {
          var res;
          change(function () { res = Page.switchType(id, a.type); return res.ok; });
          flash = res.ok
            ? (res.lost.length ? { kind: 'info', text: 'Some settings don’t apply to a ' +
                name(a.type).toLowerCase() + ' and were left out: ' + lostText(res.lost) + '. Undo brings them back.' } : null)
            : { kind: 'err', text: res.error };
          renderPanel();
          place();
        }
      }, [el('b', { text: name(a.type) }), note]));
    });
    body.appendChild(grid);
  }

  function textTab(body, id, entry) {
    [['title', 'Title'], ['subtitle', 'Subtitle']].forEach(function (f) {
      var input = el('input', { type: 'text', value: entry.config[f[0]] || '' });
      input.addEventListener('change', function () {
        var cur = Page.getChart(id);
        var v = input.value.trim();
        if ((cur.config[f[0]] || '') === v) return;
        if (v) cur.config[f[0]] = v; else delete cur.config[f[0]];
        change(function () { return Page.setChart(id, { config: cur.config }).ok; });
        if (f[0] === 'title') delete dataTouched[id];
        place();
      });
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') input.blur(); });
      var stale = f[0] === 'title' && dataTouched[id];
      body.appendChild(el('label', { class: 'f' + (stale ? ' stale' : '') }, [f[1], input,
        stale ? el('small', { text: 'The data changed. Does this title still describe the chart?' }) : null]));
    });
  }

  // ── style ──────────────────────────────────────────────────────────
  // Colours come only from the page's theme, so a reader can't wander off
  // the palette the page was built with.
  function applyStyle(id, fn) {
    var cur = Page.getChart(id);
    var out = fn(cur);
    if (!out || out.error) { flash = { kind: 'err', text: out ? out.error : 'That didn\u2019t work.' }; renderPanel(); return; }
    if (JSON.stringify(out.config) === JSON.stringify(cur.config)) return;
    var res;
    change(function () { res = Page.setChart(id, { config: out.config }); return res.ok; });
    if (!res.ok) flash = { kind: 'err', text: 'The chart can\u2019t show that: ' + res.error };
    renderPanel();
    place();
  }

  // One colour setting: a chip showing the current colour, which opens a
  // picker of the theme's colours (series ramp, accents, greys), a custom
  // colour and, where the browser has one, an eyedropper. The open picker
  // is remembered by key so it stays open across the panel's re-render.
  var openPicker = null;
  function themeGroups() {
    var T = Charts.theme;
    var uniq = function (list) {
      var seen = {};
      return list.filter(function (c) { var k = c.hex && c.hex.toLowerCase(); if (!k || seen[k]) return false; seen[k] = 1; return true; });
    };
    return [
      { name: 'Series', colours: uniq((T.colors || []).map(function (c, i) { return { hex: c, label: 'Series ' + (i + 1) }; })) },
      { name: 'Accents', named: true, colours: uniq([
        { hex: T.highlight, label: 'Highlight' },
        { hex: T.callout, label: 'Annotation' },
        { hex: T.belowThreshold || T.negative, label: 'Counter' }]) },
      { name: 'Greys', colours: uniq((T.mutedScale || [T.muted]).map(function (c, i) { return { hex: c, label: 'Grey ' + (i + 1) }; })) }
    ];
  }
  function toHex(c) {
    if (!c) return '#000000';
    if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(c)) return ('#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]).toLowerCase();
    var probe = document.createElement('canvas').getContext('2d');
    probe.fillStyle = c;
    return /^#/.test(probe.fillStyle) ? probe.fillStyle : '#000000';
  }
  function colourRow(body, label, current, key, apply) {
    var open = openPicker === key;
    var chipDot = el('i', { class: current ? '' : 'auto' });
    if (current) chipDot.style.background = current;
    var chip = el('button', { class: 'chip', 'aria-expanded': String(open), title: 'Change colour',
      onclick: function () { openPicker = open ? null : key; renderPanel(); } },
      [chipDot, current ? toHex(current).toUpperCase() : 'Auto']);
    body.appendChild(el('div', { class: 'crow' }, [el('span', { class: 'lbl', text: label }), chip]));
    if (!open) return;

    var pick = function (hex) { apply(hex); };
    var picker = el('div', { class: 'picker' });
    themeGroups().forEach(function (g) {
      if (!g.colours.length) return;
      picker.appendChild(el('div', { class: 'g', text: g.name }));
      var row = el('div', { class: 'sws' });
      g.colours.forEach(function (c) {
        var on = !!current && toHex(current) === toHex(c.hex);
        var b = el('button', { class: 'sw' + (g.named ? ' named' : ''), title: c.label + ' ' + c.hex,
          'aria-label': c.label, 'aria-pressed': String(on), onclick: function () { pick(c.hex); } },
          g.named ? [c.label] : []);
        if (g.named) b.style.backgroundImage = 'linear-gradient(' + c.hex + ',' + c.hex + ')';
        else b.style.background = c.hex;
        row.appendChild(b);
      });
      picker.appendChild(row);
    });
    picker.appendChild(el('div', { class: 'g', text: 'Custom' }));
    var input = el('input', { type: 'color', value: toHex(current), 'aria-label': 'Custom colour' });
    var hex = el('input', { type: 'text', class: 'hex', value: current ? toHex(current).toUpperCase() : '', placeholder: '#RRGGBB', 'aria-label': 'Hex colour' });
    input.addEventListener('change', function () { pick(input.value); });
    hex.addEventListener('change', function () {
      var v = hex.value.trim();
      if (/^#?[0-9a-f]{6}$/i.test(v) || /^#?[0-9a-f]{3}$/i.test(v)) pick(toHex(v[0] === '#' ? v : '#' + v));
      else hex.classList.add('bad');
    });
    hex.addEventListener('keydown', function (e) { if (e.key === 'Enter') hex.blur(); });
    var custom = el('div', { class: 'custom' }, [input, hex]);
    if (window.EyeDropper) {
      custom.appendChild(el('button', { class: 'btn', title: 'Pick a colour from anywhere on screen',
        onclick: function () {
          new window.EyeDropper().open().then(function (r) { pick(r.sRGBHex); }, function () { /* cancelled */ });
        } }, ['Pick from screen']));
    }
    custom.appendChild(el('button', { class: 'btn', onclick: function () { pick(null); } }, ['Auto']));
    picker.appendChild(custom);
    body.appendChild(picker);
  }

  // Report table: column widths as shares of the table, totalling 100%.
  // The table keeps its overall width; the last column is whatever the
  // others leave. A change applies when the slider is let go or a number is
  // entered, as one undo step.
  // Each column's drawn width, read from the table's own SVG. A header is
  // drawn 8px inside its column on the side it is aligned to (left, right or
  // centre), and the header rule runs to the table's right edge, so the
  // column edges can be recovered; an edge no header gives is interpolated.
  function drawnColumnPx(cellEl, cols) {
    var out = {};
    var svg = cellEl && cellEl.querySelector('svg');
    if (!svg || !cols.length) return out;
    var PAD = 8, gutter = (Charts.theme && Charts.theme.headingGutter) || 20;
    var right = 0;
    Array.prototype.forEach.call(svg.querySelectorAll('line'), function (l) {
      if (Math.abs(+l.getAttribute('x1') - gutter) < 0.5) right = Math.max(right, +l.getAttribute('x2'));
    });
    var texts = Array.prototype.slice.call(svg.querySelectorAll('text'));
    var n = cols.length, edges = new Array(n + 1).fill(null), mids = new Array(n).fill(null);
    edges[n] = right || null;
    cols.forEach(function (c, i) {
      var t = texts.filter(function (x) { return x.textContent === c.name; })[0];
      if (!t) return;
      var x = +t.getAttribute('x'), a = t.getAttribute('text-anchor') || 'start';
      if (a === 'end') edges[i + 1] = edges[i + 1] != null ? edges[i + 1] : x + PAD;
      else if (a === 'middle') mids[i] = x;
      else edges[i] = edges[i] != null ? edges[i] : x - PAD;
    });
    // A centred header fixes an edge once its other edge is known.
    for (var pass = 0; pass < n; pass++) {
      mids.forEach(function (m, i) {
        if (m == null) return;
        if (edges[i] != null && edges[i + 1] == null) edges[i + 1] = 2 * m - edges[i];
        else if (edges[i + 1] != null && edges[i] == null) edges[i] = 2 * m - edges[i + 1];
      });
    }
    // Interpolate any edge still unknown between its known neighbours.
    for (var i = 0; i <= n; i++) {
      if (edges[i] != null) continue;
      var lo = i - 1; while (lo >= 0 && edges[lo] == null) lo--;
      var hi = i + 1; while (hi <= n && edges[hi] == null) hi++;
      if (lo < 0 || hi > n) continue;
      edges[i] = edges[lo] + (edges[hi] - edges[lo]) * (i - lo) / (hi - lo);
    }
    cols.forEach(function (c, i) {
      if (edges[i] != null && edges[i + 1] != null && edges[i + 1] > edges[i]) out[c.key] = Math.round(edges[i + 1] - edges[i]);
    });
    return out;
  }

  function widthTab(body, id, entry) {
    var R = window.ChartConvert.report;
    var cellEl = document.getElementById(id);
    var cols = R.widths(entry.config);
    var drawn = drawnColumnPx(cellEl, cols);
    var room = Object.keys(drawn).reduce(function (a, k) { return a + drawn[k]; }, 0) || (cellEl ? cellEl.clientWidth * 0.8 : 1000);
    var auto = cols.length && cols[0].pct == null;
    // While automatic, show the shares the table has now.
    var shown = auto ? R.widths(R.initPercents(entry.config, drawn).config) : cols;

    body.appendChild(el('h4', { text: 'Column widths' }));
    body.appendChild(el('p', { class: 'hint', text: 'Each column takes a share of the table, and the shares total 100%. The table stays the same width: when you change a column, the last column grows or shrinks to make up the difference.' }));
    function apply(out, key, asked) {
      var err = applyConfig(id, out);
      flash = err ? { kind: 'err', text: err } : null;
      if (!err && key != null && out && out.config) {
        var got = R.widths(out.config).filter(function (c) { return c.key === key; })[0];
        if (got && Math.abs(got.pct - asked) >= 0.1) {
          flash = { kind: 'info', text: 'Set to ' + got.pct + '% instead of ' + asked + '%: ' +
            (got.pct < asked ? 'the last column can\u2019t get narrower than its minimum.' : 'this column has a minimum width.') };
        }
      }
      renderPanel();
      place();
    }
    var total = 0;
    shown.forEach(function (c, i) {
      var isLast = i === shown.length - 1;
      total += c.pct;
      var slider = el('input', { type: 'range', min: 0, max: 100, step: 1, disabled: isLast, 'aria-label': c.name + ' width' });
      slider.value = c.pct;
      var num = el('input', { type: 'text', class: 'hex', inputmode: 'decimal', disabled: isLast, 'aria-label': c.name + ' width in percent' });
      num.value = String(c.pct);
      slider.addEventListener('input', function () { num.value = slider.value; });
      slider.addEventListener('change', function () { apply(R.setPercent(Page.getChart(id).config, c.key, +slider.value, room, drawn), c.key, +slider.value); });
      num.addEventListener('change', function () {
        var v = parseFloat(num.value);
        if (!isFinite(v)) { num.classList.add('bad'); return; }
        apply(R.setPercent(Page.getChart(id).config, c.key, v, room, drawn), c.key, v);
      });
      num.addEventListener('keydown', function (e) { if (e.key === 'Enter') num.blur(); });
      // Fixed shares give exact pixels; automatic widths are measured.
      var px = auto ? drawn[c.key] : Math.round(c.pct / 100 * room);
      var note = c.kind + (isLast ? ' \u00B7 takes the rest' : '') + (auto ? ' \u00B7 auto' : '') +
        (px ? ' \u00B7 about ' + px + 'px' : '');
      body.appendChild(el('div', { class: 'wrow' }, [
        el('div', { class: 'wlbl' }, [el('b', { text: c.name }), el('span', { text: note })]),
        el('div', { class: 'wctl' }, [slider, num, el('span', { class: 'px', text: '%' })])
      ]));
    });
    body.appendChild(el('div', { class: 'wtotal' }, [
      el('span', { text: 'Total ' + (Math.round(total * 10) / 10) + '%' }),
      el('button', { class: 'btn', disabled: auto, onclick: function () { apply(R.clearWidths(Page.getChart(id).config)); } }, ['Automatic widths'])
    ]));
    if (auto) body.appendChild(el('p', { class: 'hint', text: 'Widths are automatic now. Change any column to fix them as shares.' }));
  }

  function styleTab(body, id, entry) {
    if (entry.type === 'reportTable') return widthTab(body, id, entry);
    var ST = window.ChartConvert && window.ChartConvert.style;
    var T = window.Charts && Charts.theme;
    var opts = ST ? ST.options(entry.type, entry.config) : {};
    if (!ST || !T || !(opts.colours || opts.highlight || opts.sort || opts.labels || opts.marks || opts.fill)) {
      body.appendChild(el('p', { class: 'hint', text: 'A ' + name(entry.type).toLowerCase() + ' has no style settings you can change here.' }));
      return;
    }
    var palette = (T.colors || []).filter(Boolean);
    var accent = palette[1] || palette[0];
    var muted = T.muted;
    var cfg = entry.config;
    var lit = opts.highlight ? ST.highlighted(cfg, accent) : [];

    if (opts.colours && !lit.length) {
      body.appendChild(el('h4', { text: cfg.series.length > 1 ? 'Series colours' : 'Colour' }));
      cfg.series.forEach(function (sr, i) {
        colourRow(body, sr.name || ('Series ' + (i + 1)), sr.color, 'series-' + i, function (col) {
          applyStyle(id, function (c) { return ST.seriesColour(c.type, c.config, i, col); });
        });
      });
    }

    if (opts.fill) {
      var FILLS = [['actual', 'Solid', 'Actual'], ['plan', 'Outline', 'Plan / budget'], ['forecast', 'Hatched', 'Forecast']];
      body.appendChild(el('h4', { text: 'Fill' }));
      body.appendChild(el('p', { class: 'hint', text: 'Shows whether a bar is a measured, planned or forecast number, using the IBCS convention.' }));
      cfg.series.forEach(function (sr, i) {
        var cur = ST.fillOf(entry.type, cfg, i);
        var seg = el('div', { class: 'seg', role: 'group', 'aria-label': (sr.name || ('Series ' + (i + 1))) + ' fill' });
        FILLS.forEach(function (f) {
          seg.appendChild(el('button', { 'aria-pressed': String(f[0] === cur), title: f[2],
            onclick: function () {
              if (f[0] !== cur) applyStyle(id, function (c) { return ST.fill(c.type, c.config, i, f[0]); });
            } }, [f[1]]));
        });
        body.appendChild(el('div', { class: 'row' }, [
          el('span', { text: cfg.series.length > 1 ? (sr.name || ('Series ' + (i + 1))) : 'Fill style' }), seg
        ]));
      });
    }

    if (opts.marks) {
      var MARKS = { pie: 'Slice colours', donut: 'Slice colours', waffle: 'Panel colours', barList: 'Bar colours',
        column: 'Bar colours', bar: 'Bar colours', packedBubble: 'Bubble colours', waterfall: 'Colours', sankey: 'Node colours' };
      body.appendChild(el('h4', { text: MARKS[entry.type] || 'Colours' }));
      ST.marks(entry.type, cfg).forEach(function (m) {
        colourRow(body, m.name, m.color, 'mark-' + m.key, function (col) {
          applyStyle(id, function (c) { return ST.markColour(c.type, c.config, m.key, col); });
        });
      });
    }

    if (entry.type === 'barInsightTable') {
      var IN = window.ChartConvert.insight;
      var recs = window.ChartConvert.records(entry.type, cfg).rows;
      body.appendChild(el('h4', { text: 'Stat colours' }));
      var bySignBox = el('input', { type: 'checkbox' });
      var po = (cfg.plotOptions && cfg.plotOptions.barInsightTable) || {};
      bySignBox.checked = !!po.statColorBySign;
      bySignBox.addEventListener('change', function () {
        applyStyle(id, function (c) { return IN.statsBySign(c.config, bySignBox.checked); });
      });
      body.appendChild(el('label', { class: 'chk' }, [bySignBox, 'Colour stats by sign (rises and falls)']));
      recs.forEach(function (r, j) {
        colourRow(body, r.name || ('Row ' + (j + 1)), IN.statColourOf(cfg, j), 'stat-' + j, function (col) {
          applyStyle(id, function (c) { return IN.statColour(c.config, j, col); });
        });
      });
    }

    if (opts.highlight) {
      var ds = window.ChartConvert.extract(entry.type, cfg);
      body.appendChild(el('h4', { text: 'Highlight' }));
      body.appendChild(el('p', { class: 'hint', text: 'Pick the bars the title is about. The rest turn grey.' }));
      ds.categories.forEach(function (c, j) {
        var box = el('input', { type: 'checkbox' });
        box.checked = lit.indexOf(j) >= 0;
        box.addEventListener('change', function () {
          var next = lit.filter(function (k) { return k !== j; });
          if (box.checked) next.push(j);
          applyStyle(id, function (cc) { return ST.highlight(cc.type, cc.config, next, accent, muted); });
        });
        body.appendChild(el('label', { class: 'chk' }, [box, c]));
      });
      if (lit.length) {
        body.appendChild(el('button', { class: 'btn', onclick: function () {
          applyStyle(id, function (cc) { return ST.highlight(cc.type, cc.config, [], accent, muted); });
        } }, ['Clear highlight']));
      }
    }

    if (opts.sort) {
      body.appendChild(el('h4', { text: 'Order' }));
      body.appendChild(el('div', { class: 'row' }, [
        el('button', { class: 'btn', onclick: function () { applyStyle(id, function (c) { return ST.sort(c.type, c.config, 'desc'); }); } }, ['Largest first']),
        el('button', { class: 'btn', onclick: function () { applyStyle(id, function (c) { return ST.sort(c.type, c.config, 'asc'); }); } }, ['Smallest first'])
      ]));
    }

    if (opts.labels) {
      var po = (cfg.plotOptions && cfg.plotOptions.series) || {};
      var dl = po.dataLabels;
      // Unset means the engine's default: on for bars and columns, off for lines.
      var shown = dl == null ? entry.type !== 'line' : (typeof dl === 'object' ? dl.enabled !== false : !!dl);
      var lab = el('input', { type: 'checkbox' });
      lab.checked = shown;
      lab.addEventListener('change', function () {
        applyStyle(id, function (c) { return ST.labels(c.type, c.config, lab.checked); });
      });
      body.appendChild(el('h4', { text: 'Labels' }));
      body.appendChild(el('label', { class: 'chk' }, [lab, 'Show values on the chart']));
    }
  }

  // ── callouts ───────────────────────────────────────────────────────
  // Notes pinned to one mark each. Every change applies as one undo step;
  // text applies when the field loses focus.
  function calloutsTab(body, id, entry) {
    var CO = window.ChartConvert.callouts;
    var info = CO.anchors(entry.type, entry.config);
    var list = CO.list(entry.type, entry.config);
    var key = function (v) { return JSON.stringify(v); };
    function apply(next) {
      var err = applyConfig(id, CO.set(entry.type, Page.getChart(id).config, next));
      flash = err ? { kind: 'err', text: err } : null;
      renderPanel();
      place();
    }
    body.appendChild(el('p', { class: 'hint', text: 'A callout is a short note pointing at one ' +
      (info.by === 'xy' ? 'point' : info.by === 'value' ? 'bar' : 'mark') + ' of the chart. The chart places the box where it covers nothing.' }));
    if (!info.anchors.length) {
      body.appendChild(el('p', { class: 'hint', text: 'This chart has nothing to pin a note to yet.' }));
      return;
    }
    list.forEach(function (c, i) {
      var card = el('div', { class: 'rec' }, [el('h5', { text: 'Callout ' + (i + 1) })]);
      var pickAnchor = el('select', { 'aria-label': 'Points at' });
      info.anchors.forEach(function (a) {
        var o = el('option', { value: key(a.value), text: a.label });
        if (key(a.value) === key(c.anchor)) o.selected = true;
        pickAnchor.appendChild(o);
      });
      if (!info.anchors.some(function (a) { return key(a.value) === key(c.anchor); })) {
        pickAnchor.insertBefore(el('option', { value: key(c.anchor), text: String(c.anchor) + ' (not in the data)', selected: true }), pickAnchor.firstChild);
      }
      pickAnchor.addEventListener('change', function () {
        var next = list.slice(); next[i] = Object.assign({}, c, { anchor: JSON.parse(pickAnchor.value) }); apply(next);
      });
      card.appendChild(el('label', { class: 'f' }, ['Points at', pickAnchor]));
      if (info.series) {
        var pickSeries = el('select', { 'aria-label': 'Series' });
        [''].concat(info.series).forEach(function (sn) {
          var o = el('option', { value: sn, text: sn || 'Whichever is highest' });
          if ((c.series || '') === sn) o.selected = true;
          pickSeries.appendChild(o);
        });
        pickSeries.addEventListener('change', function () {
          var next = list.slice(); next[i] = Object.assign({}, c, { series: pickSeries.value || null }); apply(next);
        });
        card.appendChild(el('label', { class: 'f' }, ['Series', pickSeries]));
      }
      var text = el('textarea', { rows: 2, 'aria-label': 'Note' });
      text.value = c.text;
      text.addEventListener('change', function () {
        var next = list.slice(); next[i] = Object.assign({}, c, { text: text.value }); apply(next);
      });
      card.appendChild(el('label', { class: 'f' }, ['Note', text, el('small', { text: 'Keep it short; the box wraps at about 30 characters a line.' })]));
      colourRow(card, 'Colour', c.color, 'co-' + i, function (col) {
        var next = list.slice(); next[i] = Object.assign({}, c, { color: col }); apply(next);
      });
      card.appendChild(el('button', { class: 'btn', onclick: function () {
        var next = list.slice(); next.splice(i, 1); apply(next);
      } }, ['Remove this callout']));
      body.appendChild(card);
    });
    body.appendChild(el('button', { class: 'btn', onclick: function () {
      // Start at the largest mark, where a note most often belongs.
      var first = info.anchors[0].value;
      var ds = window.ChartConvert.extract(entry.type, entry.config);
      if (ds && ds.kind === 'categorical' && info.by !== 'x') {
        var vals = ds.series[0].values, best = 0;
        vals.forEach(function (v, j) { if (v != null && (vals[best] == null || v > vals[best])) best = j; });
        var hit = info.anchors.filter(function (a) { return a.label === ds.categories[best]; })[0];
        if (hit) first = hit.value;
      }
      apply(list.concat([{ anchor: first, series: null, text: 'New note', color: null }]));
    } }, [list.length ? '+ Add another callout' : '+ Add a callout']));
  }

  // ── layout ─────────────────────────────────────────────────────────
  function layoutTab(body, id) {
    var L = Page.layout(id);
    if (!L) return;
    var LABELS = { w4: '\u2153', w6: '\u00BD', w8: '\u2154', w12: 'Full' };
    function act(fn) {
      change(function () { return fn().ok; });
      renderPanel();
      // The chart redraws at its new size on the next frame.
      requestAnimationFrame(function () { requestAnimationFrame(place); });
    }
    body.appendChild(el('h4', { text: 'Width' }));
    var seg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Width' });
    L.widths.forEach(function (w) {
      seg.appendChild(el('button', { 'aria-pressed': String(w === L.width), title: w === 'w12' ? 'Full width' : LABELS[w] + ' of the page',
        onclick: function () { if (w !== L.width) act(function () { return Page.setLayout(id, { width: w }); }); } }, [LABELS[w]]));
    });
    body.appendChild(seg);
    if (L.canTall) {
      var tall = el('input', { type: 'checkbox' });
      tall.checked = L.tall;
      tall.addEventListener('change', function () { act(function () { return Page.setLayout(id, { tall: tall.checked }); }); });
      body.appendChild(el('h4', { text: 'Height' }));
      body.appendChild(el('label', { class: 'chk' }, [tall, 'Double height']));
    }
    body.appendChild(el('h4', { text: 'Position' }));
    body.appendChild(el('div', { class: 'row' }, [
      el('button', { class: 'btn', disabled: L.first, onclick: function () { act(function () { return Page.move(id, -1); }); } },
        [L.earlier === 'row' ? '\u2191 Move row up' : '\u2190 Move earlier']),
      el('button', { class: 'btn', disabled: L.last, onclick: function () { act(function () { return Page.move(id, 1); }); } },
        [L.later === 'row' ? 'Move row down \u2193' : 'Move later \u2192'])
    ]));
    // Say what a move will do when it isn't a plain swap.
    var how = { row: 'This card has a row to itself, so the whole row moves past the next one.',
      into: 'At the end of its row, the card moves into the neighbouring row.' };
    var notes = [L.earlier, L.later].filter(function (k, i, a) { return how[k] && a.indexOf(k) === i; }).map(function (k) { return how[k]; });
    if (notes.length) body.appendChild(el('p', { class: 'hint', text: notes.join(' ') }));
    body.appendChild(el('p', { class: 'hint', text: 'On narrow screens the page stacks cards regardless of width.' }));
  }

  // ── data grid ──────────────────────────────────────────────────────
  // Apply a config-to-config change to a chart, as one undo step. Returns the
  // library's refusal (the change is undone) or the transform's own error.
  function applyConfig(id, out) {
    if (!out || out.error) return out ? out.error : 'That didn\u2019t work.';
    var cur = Page.getChart(id);
    if (JSON.stringify(out.config) === JSON.stringify(cur.config)) return null;
    var res;
    change(function () { res = Page.setChart(id, { config: out.config }); return res.ok; });
    return res.ok ? null : 'The chart can\u2019t show that: ' + res.error + ' Your change was undone.';
  }

  function reportTypeTab(body, id, entry) {
    var CC = window.ChartConvert;
    var cols = (entry.config.columns || []).filter(function (c) { return c.kind === 'chart'; });
    body.appendChild(el('p', { class: 'hint', text: 'A report table stays a report table, but each chart column can show its rows as another kind of chart.' }));
    if (!cols.length) {
      body.appendChild(el('p', { class: 'hint', text: 'This table has no chart columns.' }));
      return;
    }
    cols.forEach(function (c) {
      body.appendChild(el('h4', { text: c.name || c.key }));
      var grid = el('div', { class: 'types' });
      CC.report.targets(entry.config, c.key).forEach(function (a) {
        grid.appendChild(el('button', {
          class: 'type' + (a.current ? ' cur' : ''), disabled: !a.ok || a.current, 'aria-pressed': String(!!a.current),
          onclick: function () {
            var err = applyConfig(id, CC.report.switchChart(Page.getChart(id).config, c.key, a.type));
            flash = err ? { kind: 'err', text: err } : null;
            renderPanel();
            place();
          }
        }, [el('b', { text: name(a.type) }), a.current ? el('small', { text: 'Current' }) : !a.ok ? el('small', { text: a.reason }) : null]));
      });
      body.appendChild(grid);
    });
  }

  function tileTypeTab(body, id, entry) {
    var CC = window.ChartConvert;
    var TILE = {
      bar: ['Bars', 'Code and value, with a small bar under it'],
      heat: ['Heat map', 'Each tile filled by its value'],
      gauge: ['Rings', 'A ring that fills to the value']
    };
    body.appendChild(el('p', { class: 'hint', text: 'A map grid stays a map grid; choose how each region\u2019s tile shows its value:' }));
    var cur = CC.tiles.variant(entry.config);
    var grid = el('div', { class: 'types' });
    CC.tiles.list.forEach(function (v) {
      grid.appendChild(el('button', {
        class: 'type' + (v === cur ? ' cur' : ''), disabled: v === cur, 'aria-pressed': String(v === cur),
        onclick: function () {
          var err = applyConfig(id, CC.tiles.set(Page.getChart(id).config, v));
          flash = err ? { kind: 'err', text: err } : null;
          renderPanel();
          place();
        }
      }, [el('b', { text: TILE[v][0] }), el('small', { text: v === cur ? 'Current' : TILE[v][1] })]));
    });
    body.appendChild(grid);
  }

  // ── records: bar insight table, map grid, report table ─────────────
  function recordsTab(body, id, entry) {
    var CC = window.ChartConvert;
    var rec = CC.records(entry.type, entry.config);
    var inline = el('div');
    var readers = [];   // functions that copy one field into a record
    var bad = false;
    function numberField(input, required) {
      var v = parseNum(input.value);
      var isBad = Number.isNaN(v) || (required && v === null);
      input.classList.toggle('bad', isBad);
      if (isBad) bad = true;
      return v;
    }
    function commit() {
      var next = JSON.parse(JSON.stringify(rec));
      bad = false;
      readers.forEach(function (r) { r(next); });
      if (bad) {
        inline.textContent = '';
        inline.appendChild(el('div', { class: 'flash err' }, ['Some fields need a number. Fix the highlighted ones.']));
        return;
      }
      var err = applyConfig(id, CC.withRecords(entry.type, Page.getChart(id).config, next));
      inline.textContent = '';
      if (err) { inline.appendChild(el('div', { class: 'flash err' }, [err])); return; }
      rec = CC.records(entry.type, Page.getChart(id).config);
      dataTouched[id] = true;
      place();
    }
    function input(value, opts) {
      opts = opts || {};
      var n = el(opts.area ? 'textarea' : 'input', opts.area ? { rows: 2 } : { type: 'text', class: opts.num ? 'num' : '', inputmode: opts.num ? 'decimal' : null });
      n.value = value == null ? '' : String(value);
      if (opts.placeholder) n.placeholder = opts.placeholder;
      if (opts.disabled) n.disabled = true;
      return n;
    }
    function field(label, control, hint) {
      return el('label', { class: 'f' }, [label, control, hint ? el('small', { text: hint }) : null]);
    }
    function onEnter(e) { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); e.target.blur(); } }

    if (entry.type === 'geofacet') {
      body.appendChild(el('p', { class: 'hint', text: 'Change each region\u2019s value, or give it a display name. Leave a value empty to show the region as having no data.' }));
      var table = el('table', {}, [el('tr', {}, [el('th', { text: 'Code' }), el('th', { text: 'Name' }), el('th', { text: 'Value' })])]);
      rec.rows.forEach(function (r, j) {
        var nm = input(r.name, { placeholder: r.code }), val = input(r.value, { num: true });
        table.appendChild(el('tr', {}, [el('td', {}, [input(r.code, { disabled: true })]), el('td', {}, [nm]), el('td', {}, [val])]));
        readers.push(function (next) { next.rows[j].name = nm.value.trim(); next.rows[j].value = numberField(val, false); });
      });
      table.addEventListener('change', commit);
      table.addEventListener('keydown', onEnter);
      body.appendChild(inline);
      body.appendChild(el('div', { class: 'scroll' }, [table]));
      return;
    }

    if (entry.type === 'barInsightTable') {
      body.appendChild(el('p', { class: 'hint', text: 'Each row: its name, its bar values, and the text beside the bars. Empty text hides that field; an empty stat lets the table work it out.' }));
      var box = el('div');
      rec.series.forEach(function (nm, i) {
        var s = input(nm);
        box.appendChild(field('Series ' + (i + 1) + ' name', s));
        readers.push(function (next) { next.series[i] = s.value.trim() || next.series[i]; });
      });
      rec.rows.forEach(function (r, j) {
        var card = el('div', { class: 'rec' }, [el('h5', { text: r.name || ('Row ' + (j + 1)) })]);
        var nm = input(r.name);
        card.appendChild(field('Name', nm));
        var vals = r.values.map(function (v, i) {
          var inp = input(v, { num: true });
          card.appendChild(field((rec.series[i] || 'Value') + ' value', inp));
          return inp;
        });
        var ins = input(r.insight), desc = input(r.description, { area: true }), stat = input(r.stat), note = input(r.statNote);
        card.appendChild(field('Insight', ins));
        card.appendChild(field('Description', desc));
        card.appendChild(field('Stat', stat, 'Shown large on the right, such as +30%'));
        card.appendChild(field('Stat note', note));
        readers.push(function (next) {
          var row = next.rows[j];
          row.name = nm.value.trim();
          row.values = vals.map(function (inp) { return numberField(inp, false); });
          row.insight = ins.value.trim(); row.description = desc.value.trim();
          row.stat = stat.value.trim(); row.statNote = note.value.trim();
        });
        box.appendChild(card);
      });
      box.addEventListener('change', commit);
      box.addEventListener('keydown', onEnter);
      body.appendChild(inline);
      body.appendChild(box);
      return;
    }

    // report table
    body.appendChild(el('p', { class: 'hint', text: 'Edit each row\u2019s cells. Chart cells take a list of numbers; to show a column as another kind of chart, use the Type tab.' }));
    var wrap = el('div');
    var head = el('div', { class: 'rec' }, [el('h5', { text: 'Column names' })]);
    rec.columns.forEach(function (c, i) {
      var inp = input(c.name);
      head.appendChild(field(c.key + ' (' + c.kind + ')', inp));
      readers.push(function (next) { next.columns[i].name = inp.value.trim() || next.columns[i].name; });
    });
    wrap.appendChild(head);
    rec.rows.forEach(function (r, j) {
      var card = el('div', { class: 'rec' }, [el('h5', { text: r.name || ('Row ' + (j + 1)) })]);
      if (r.group) card.appendChild(el('div', { class: 'grp', text: 'Group: ' + r.group }));
      var nm = input(r.name);
      card.appendChild(field('Row name', nm));
      var nb = r.nameBody != null ? input(r.nameBody, { area: true }) : null;
      if (nb) card.appendChild(field('Row description', nb));
      var fieldReaders = [];
      rec.columns.forEach(function (c) {
        var cell = r.cells[c.key];
        if (!cell) return;
        if (c.kind === 'text') {
          var t = input(cell.text, { area: true });
          card.appendChild(field(c.name || c.key, t));
          fieldReaders.push(function (cells) { cells[c.key].text = t.value.trim(); });
        } else if (c.kind === 'insight') {
          var h = input(cell.head), b = input(cell.body, { area: true });
          card.appendChild(field((c.name || c.key) + ' \u2014 headline', h));
          card.appendChild(field((c.name || c.key) + ' \u2014 text', b));
          fieldReaders.push(function (cells) { cells[c.key].head = h.value.trim(); cells[c.key].body = b.value.trim(); });
        } else if (c.kind === 'kpi') {
          var v = input(cell.value, { num: true }), n = input(cell.note, { placeholder: 'Note' });
          card.appendChild(el('label', { class: 'f' }, [c.name || c.key, el('div', { class: 'pair' }, [v, n])]));
          fieldReaders.push(function (cells) { cells[c.key].value = numberField(v, false); cells[c.key].note = n.value.trim(); });
        } else if (c.kind === 'chart') {
          if (!cell.values) {
            card.appendChild(field(c.name || c.key, input('Chart settings', { disabled: true }), 'This cell holds a full chart; change its type on the Type tab.'));
            return;
          }
          var list = input(cell.values.map(function (x) { return x == null ? '' : x; }).join(', '));
          card.appendChild(field((c.name || c.key) + ' (' + name(c.chartType) + ')', list, cell.values.length + ' values, separated by commas'));
          fieldReaders.push(function (cells) {
            var parts = list.value.split(',');
            var nums = parts.map(function (x) { return parseNum(x); });
            var isBad = parts.length !== cell.values.length || nums.some(function (x) { return Number.isNaN(x); });
            list.classList.toggle('bad', isBad);
            if (isBad) { bad = true; return; }
            cells[c.key].values = nums;
          });
        }
      });
      readers.push(function (next) {
        next.rows[j].name = nm.value.trim();
        if (nb) next.rows[j].nameBody = nb.value.trim();
        fieldReaders.forEach(function (f) { f(next.rows[j].cells); });
      });
      wrap.appendChild(card);
    });
    wrap.addEventListener('change', commit);
    wrap.addEventListener('keydown', onEnter);
    body.appendChild(inline);
    body.appendChild(wrap);
  }

  function fmt(v) { return v === null || v === undefined ? '' : String(v); }
  function parseNum(s) {
    var t = String(s).trim().replace(/[\s,]/g, '');
    if (t === '') return null;
    var n = Number(t);
    return isFinite(n) ? n : NaN;
  }

  function dataTab(body, id, entry) {
    var CC = window.ChartConvert;
    if (CC && CC.records && CC.records(entry.type, entry.config)) return recordsTab(body, id, entry);
    var ds = CC && CC.extract(entry.type, entry.config);
    if (!ds) {
      body.appendChild(el('p', { class: 'hint', text: 'This chart’s data can’t be edited here yet. You can change its title on the Text tab.' }));
      return;
    }
    body.appendChild(el('p', { class: 'hint', text: ds.kind === 'categorical'
      ? 'Change names and numbers. Leave a cell empty for a missing value. You can paste cells copied from a spreadsheet.'
      : 'Change the numbers; every cell needs one. You can paste cells copied from a spreadsheet.' }));
    var table = el('table');
    var cells = [];   // rows of inputs, for Enter and paste navigation

    function cell(value, opts) {
      var input = el('input', { type: 'text', value: fmt(value), class: opts.num ? 'num' : '',
        inputmode: opts.num ? 'decimal' : null, disabled: !!opts.disabled,
        title: opts.title || null, 'aria-label': opts.label || null });
      input._read = opts.read;
      return input;
    }

    if (ds.kind === 'categorical') {
      var hr = el('tr', {}, [el('th', {}, [el('input', { type: 'text', value: 'Name', disabled: true })])]);
      var heads = ds.series.map(function (s, i) {
        var inp = cell(s.name || ('Series ' + (i + 1)), { label: 'Series name' });
        hr.appendChild(el('th', {}, [inp]));
        return inp;
      });
      table.appendChild(hr);
      ds.categories.forEach(function (c, j) {
        var tr = el('tr');
        var row = [cell(c, { disabled: !ds.categoryEditable, label: 'Name',
          title: ds.categoryEditable ? null : 'These are positions on the axis, not names' })];
        ds.series.forEach(function (s) {
          var locked = s.locked && s.locked[j];
          row.push(cell(locked ? '' : s.values[j], { num: true, disabled: locked,
            title: locked ? 'A total is worked out from the steps above it' : null }));
          if (locked) row[row.length - 1].placeholder = 'total';
        });
        row.forEach(function (i) { tr.appendChild(el('td', {}, [i])); });
        table.appendChild(tr);
        cells.push(row);
      });
      ds._read = function () {
        var next = JSON.parse(JSON.stringify(ds));
        next.series.forEach(function (s, i) { s.name = heads[i].value.trim() || s.name; });
        cells.forEach(function (row, j) {
          next.categories[j] = row[0].value;
          next.series.forEach(function (s, i) {
            if (s.locked && s.locked[j]) return;
            s.values[j] = parseNum(row[i + 1].value);
          });
        });
        return next;
      };
    } else if (ds.kind === 'values') {
      table.appendChild(el('tr', {}, [el('th', { text: '#' }), el('th', { text: ds.name || 'Value' })]));
      ds.values.forEach(function (v, j) {
        var inp = cell(v, { num: true });
        table.appendChild(el('tr', {}, [el('td', {}, [el('input', { type: 'text', value: String(j + 1), disabled: true })]), el('td', {}, [inp])]));
        cells.push([inp]);
      });
      ds._read = function () {
        var next = JSON.parse(JSON.stringify(ds));
        next.values = cells.map(function (row) { return parseNum(row[0].value); });
        return next;
      };
    } else {
      var z = entry.type === 'bubble';
      var nameInputs = [];
      ds.series.forEach(function (s, i) {
        var nm = cell(s.name || ('Series ' + (i + 1)), { label: 'Series name' });
        nameInputs.push(nm);
        var grp = el('tr', { class: 'grp' }, [el('td', { colspan: z ? 3 : 2 }, [nm])]);
        table.appendChild(grp);
        table.appendChild(el('tr', {}, [el('th', { text: 'x' }), el('th', { text: 'y' }), z ? el('th', { text: 'size' }) : null]));
        s.points.forEach(function (p) {
          var row = [cell(p.x, { num: true }), cell(p.y, { num: true })];
          if (z) row.push(cell(p.z, { num: true }));
          row._series = i;
          table.appendChild(el('tr', {}, row.map(function (c) { return el('td', {}, [c]); })));
          cells.push(row);
        });
      });
      ds._read = function () {
        var next = JSON.parse(JSON.stringify(ds));
        var k = {};
        next.series.forEach(function (s, i) { s.name = nameInputs[i].value.trim() || s.name; });
        cells.forEach(function (row) {
          var s = next.series[row._series];
          var j = k[row._series] = (k[row._series] || 0);
          k[row._series]++;
          s.points[j].x = parseNum(row[0].value);
          s.points[j].y = parseNum(row[1].value);
          if (row[2]) s.points[j].z = parseNum(row[2].value);
        });
        return next;
      };
    }

    function inputs() { return Array.prototype.slice.call(table.querySelectorAll('input:not(:disabled)')); }

    function commit() {
      var next = ds._read();
      var bad = false;
      inputs().forEach(function (i) {
        var isBad = i.classList.contains('num') && (Number.isNaN(parseNum(i.value)) ||
          (ds.kind !== 'categorical' && parseNum(i.value) === null));
        i.classList.toggle('bad', isBad);
        if (isBad) bad = true;
      });
      if (bad) {
        showInline('err', ds.kind === 'categorical'
          ? 'Some cells aren’t numbers. Fix the highlighted cells.'
          : 'Every cell here needs a number. Fix the highlighted cells.');
        return;
      }
      var cur = Page.getChart(id);
      var out = window.ChartConvert.withData(cur.type, cur.config, next);
      if (out.error) { showInline('err', out.error); return; }
      if (JSON.stringify(out.config) === JSON.stringify(cur.config)) return;
      var res;
      change(function () { res = Page.setChart(id, { config: out.config }); return res.ok; });
      if (!res.ok) { showInline('err', 'The chart can’t show that: ' + res.error + ' Your change was undone.'); return; }
      dataTouched[id] = true;
      clearInline();
      place();
    }

    var inline = el('div');
    function showInline(kind, text) { inline.textContent = ''; inline.appendChild(el('div', { class: 'flash ' + kind }, [text])); }
    function clearInline() { inline.textContent = ''; }

    table.addEventListener('change', commit);
    table.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      var all = inputs(), i = all.indexOf(e.target);
      // Down a column, like a spreadsheet.
      var r = -1, c = -1;
      cells.forEach(function (row, ri) { var ci = row.indexOf(e.target); if (ci >= 0) { r = ri; c = ci; } });
      var target = r >= 0 && cells[r + 1] && cells[r + 1][c] && !cells[r + 1][c].disabled ? cells[r + 1][c] : all[i + 1];
      e.target.blur();
      if (target) target.focus();
    });
    table.addEventListener('paste', function (e) {
      var text = (e.clipboardData || window.clipboardData).getData('text');
      if (!/[\t\n]/.test(text)) return;
      var r = -1, c = -1;
      cells.forEach(function (row, ri) { var ci = row.indexOf(e.target); if (ci >= 0) { r = ri; c = ci; } });
      if (r < 0) return;
      e.preventDefault();
      text.replace(/\r/g, '').replace(/\n$/, '').split('\n').forEach(function (line, dr) {
        line.split('\t').forEach(function (v, dc) {
          var row = cells[r + dr];
          var inp = row && row[c + dc];
          if (inp && !inp.disabled) inp.value = v;
        });
      });
      commit();
    });

    body.appendChild(inline);
    body.appendChild(el('div', { class: 'scroll' }, [table]));
  }

  // ── bar ────────────────────────────────────────────────────────────
  function setMessage(text) {
    ui.msg.textContent = text || 'Click, or Tab to, a chart or any text and press Enter';
  }
  function refreshBar() {
    ui.undo.disabled = !undoStack.length;
    ui.redo.disabled = !redoStack.length;
    var dirty = unsaved();
    ui.status.textContent = dirty ? 'Unsaved changes' : (savedOnce ? 'Saved' : '');
    ui.status.classList.toggle('unsaved', dirty);
    ui.save.disabled = saving;
  }

  // ── saving ─────────────────────────────────────────────────────────
  // "Unsaved" means the page differs from the last state that was written
  // out (or from how it opened), not that the undo stack is non-empty: undo
  // back to the saved state and there is nothing to save.
  var savedState = null, savedOnce = false, saving = false, fileHandle = null;
  function stateKey() { return JSON.stringify(Page.snapshot()); }
  function unsaved() { return savedState !== null && stateKey() !== savedState; }

  function fileName(suffix) {
    var base = decodeURIComponent((location.pathname || '').split('/').pop() || '') || 'page.html';
    if (!/\.html?$/i.test(base)) base += '.html';
    if (!suffix) return base;
    // "report (working copy).html" → "report.html": the final copy takes the
    // plain name. Any other name gets "(final)" added.
    if (/ \(working copy\)\.html?$/i.test(base)) return base.replace(/ \(working copy\)(\.html?)$/i, '$1');
    return base.replace(/(\.html?)$/i, ' ' + suffix + '$1');
  }

  // The editor script in the saved HTML: inlined (its header comment) or
  // still a staged <script src>.
  function isEditorScript(node) {
    return /page-editor\.js$/.test(node.getAttribute('src') || '') ||
      /^\s*\/\*!\s*\n?\s*\*\s*page-editor\.js/.test(node.textContent || '');
  }
  function withoutEditor(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    Array.prototype.slice.call(doc.querySelectorAll('script')).forEach(function (sc) {
      if (isEditorScript(sc)) sc.parentNode.removeChild(sc);
    });
    // Marks the file final, for check-page.js and anyone reading the source.
    if (!doc.querySelector('meta[name="page-edition"]')) {
      var m = doc.createElement('meta');
      m.setAttribute('name', 'page-edition');
      m.setAttribute('content', 'final');
      doc.head.insertBefore(m, doc.head.firstChild);
    }
    return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
  }

  // Open the HTML about to be written in a hidden frame and check it draws
  // the same charts. A save that silently produced a broken page would lose
  // the reader's work at the moment they believe it is safe.
  function verify(html) {
    return new Promise(function (resolve) {
      var frame = document.createElement('iframe');
      frame.setAttribute('data-page-ui', '');
      frame.setAttribute('aria-hidden', 'true');
      frame.style.cssText = 'position:fixed;left:-20000px;top:0;width:' +
        Math.max(1024, window.innerWidth) + 'px;height:800px;border:0;visibility:hidden';
      var done = function (problem) {
        clearTimeout(timer);
        if (frame.parentNode) frame.parentNode.removeChild(frame);
        resolve(problem);
      };
      var timer = setTimeout(function () { done('the saved page took too long to open'); }, 15000);
      frame.onload = function () {
        setTimeout(function () {
          try {
            var w = frame.contentWindow, d = frame.contentDocument;
            if (!w.Page) return done('the saved page has no chart runtime');
            // Charts inside removed parts are meant to be gone from the file.
            var want = {}, all = Page.snapshot().charts, got = w.Page.snapshot();
            Object.keys(all).forEach(function (cid) { if (!Page.isRemoved(document.getElementById(cid))) want[cid] = all[cid]; });
            if (JSON.stringify(want) !== JSON.stringify(got.charts)) return done('the saved charts differ from the page');
            var blank = Object.keys(got.charts).filter(function (id) {
              var box = d.getElementById(id);
              return !box || !box.querySelector('svg');
            });
            if (blank.length) return done('these charts did not draw: ' + blank.join(', '));
            done(null);
          } catch (e) { done(e.message); }
        }, 60);
      };
      frame.srcdoc = html;
      document.body.appendChild(frame);
    });
  }

  function download(html, name) {
    var url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    var a = el('a', { href: url, download: name });
    root.appendChild(a);
    a.click();
    root.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
  }

  function save(clean) {
    if (saving) return;
    if (textEdit) finishText(true);
    saving = true;
    refreshBar();
    closeMenu();
    var state = stateKey();
    var html = Page.serialize();
    if (clean) html = withoutEditor(html);
    verify(html).then(function (problem) {
      if (problem) throw new Error('Nothing was saved: ' + problem + '.');
      var name = fileName(clean ? '(final)' : '');
      var picker = window.showSaveFilePicker;
      // A clean copy is always a new file; a save reuses the file chosen
      // the first time, so later saves are one click.
      if (!clean && fileHandle) return writeTo(fileHandle, html).then(function () { return 'file'; });
      if (typeof picker === 'function') {
        return picker({ suggestedName: name, types: [{ description: 'Web page', accept: { 'text/html': ['.html', '.htm'] } }] })
          .then(function (handle) {
            return writeTo(handle, html).then(function () { if (!clean) fileHandle = handle; return 'file'; });
          }, function (err) {
            if (err && err.name === 'AbortError') return 'cancelled';
            // Not allowed here (a sandboxed frame, a policy): fall back.
            download(html, name);
            return 'download';
          });
      }
      download(html, name);
      return 'download';
    }).then(function (how) {
      saving = false;
      if (how === 'cancelled') { refreshBar(); return; }
      if (!clean) {
        savedState = state;
        savedOnce = true;
        clearDraft();
      }
      refreshBar();
      toast(how === 'file'
        ? (clean ? 'Final copy saved. Share that file, not this working copy.' : 'Saved.')
        : (clean ? 'Final copy downloaded as ' : 'Downloaded as ') + fileName(clean ? '(final)' : '') +
          '. If nothing downloaded, this viewer blocks saving: open the file directly in a browser.');
    }).catch(function (e) {
      saving = false;
      refreshBar();
      toast(e.message, true);
    });
  }
  function writeTo(handle, html) {
    return handle.createWritable().then(function (w) {
      return w.write(html).then(function () { return w.close(); });
    });
  }

  var toastTimer = 0;
  function toast(text, isError, action) {
    ui.toast.textContent = text;
    if (action) {
      ui.toast.appendChild(el('button', { onmousedown: function (e) { e.preventDefault(); },
        onclick: function () { ui.toast.hidden = true; action.run(); } }, [action.label]));
    }
    ui.toast.className = 'toast' + (isError ? ' err' : '');
    ui.toast.hidden = false;
    clearTimeout(toastTimer);
    // Long enough to reach the Undo in a toast that offers one.
    toastTimer = setTimeout(function () { ui.toast.hidden = true; }, isError ? 9000 : action ? 8000 : 5000);
  }

  function closeMenu() { if (ui.list) ui.list.hidden = true; }

  // ── draft ──────────────────────────────────────────────────────────
  // Kept per file path and tied to how the page looked when it opened, so a
  // draft from an older version of the file is never laid over a newer one.
  var draftKey = 'page-editor-draft:' + location.pathname;
  var openedAs = null, draftTimer = 0;
  function hash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return String(h >>> 0);
  }
  function readDraft() {
    try { return JSON.parse(localStorage.getItem(draftKey) || 'null'); } catch (e) { return null; }
  }
  function clearDraft() {
    try { localStorage.removeItem(draftKey); } catch (e) { /* storage blocked */ }
  }
  function keepDraft() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(function () {
      try {
        if (!unsaved()) { clearDraft(); return; }
        localStorage.setItem(draftKey, JSON.stringify({ base: openedAs, at: Date.now(), snapshot: Page.snapshot() }));
      } catch (e) { /* storage full or blocked: the draft is a convenience */ }
    }, 600);
  }
  function offerDraft() {
    var d = readDraft();
    if (!d || !d.snapshot) return;
    if (d.base !== openedAs || JSON.stringify(d.snapshot) === savedState) { clearDraft(); return; }
    var when = new Date(d.at);
    var card = el('div', { class: 'card', role: 'dialog', 'aria-label': 'Unsaved edits' }, [
      el('b', { text: 'You have unsaved edits' }),
      el('div', { text: 'Made in this browser on ' + when.toLocaleDateString() + ' at ' +
        when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + '. Restore them?' }),
      el('div', { class: 'acts' }, [
        el('button', { onclick: function () { clearDraft(); card.parentNode.removeChild(card); } }, ['Discard']),
        el('button', { class: 'primary', onclick: function () {
          card.parentNode.removeChild(card);
          start();
          change(function () { Page.restore(d.snapshot); return true; });
          toast('Edits restored. Save to keep them in the file.');
        } }, ['Restore'])
      ])
    ]);
    root.appendChild(card);
  }

  function start() {
    if (editing) return;
    editing = true;
    ui.toggle.hidden = true;
    ui.bar.hidden = false;
    setMessage(null);
    refreshBar();
    addTabStops();
    pulseEditables();
    document.addEventListener('focusin', onFocusIn, true);
    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('mousedown', onDown, true);
    window.addEventListener('click', onClick, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
  }
  function stop() {
    if (!editing) return;
    select(null);
    editing = false;
    hovered = null;
    place();
    ui.bar.hidden = true;
    ui.toggle.hidden = false;
    removeTabStops();
    makeRoom(false);
    document.removeEventListener('focusin', onFocusIn, true);
    window.removeEventListener('mousemove', onMove, true);
    window.removeEventListener('mousedown', onDown, true);
    window.removeEventListener('click', onClick, true);
    window.removeEventListener('scroll', onScroll, true);
    window.removeEventListener('resize', onScroll);
  }

  // The editor's accent: the theme's second series colour (the one a page
  // uses for emphasis) when white text on it passes 4.5:1, else a stock blue.
  function themeAccent() {
    var fallback = '#2f6bff';
    var c = window.Charts && Charts.theme && Charts.theme.colors && Charts.theme.colors[1];
    var m = /^#([0-9a-f]{6})$/i.exec(c || '');
    if (!m) return fallback;
    var lin = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    var n = parseInt(m[1], 16);
    var L = 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
    return 1.05 / (L + 0.05) >= 4.5 ? c : fallback;
  }

  // ── working copy marks ─────────────────────────────────────────────
  var DRAFT_PREFIX = 'Draft \u00B7 ';
  function markWorkingCopy() {
    if (document.title.indexOf(DRAFT_PREFIX) !== 0) document.title = DRAFT_PREFIX + document.title;
    // The banner takes its own room at the top instead of covering the page.
    var st = document.createElement('style');
    st.setAttribute('data-page-ui', '');
    st.textContent = 'html{padding-top:var(--pe-draft-h,40px)!important}' +
      // Printed or saved as PDF: a watermark on every page. Screen never shows it.
      '@media screen{.pe-draft-mark{display:none!important}}' +
      '@media print{html{padding-top:0!important}.pe-draft-mark{position:fixed;inset:0;display:flex!important;align-items:center;' +
      'justify-content:center;pointer-events:none;z-index:2147483000}.pe-draft-mark span{transform:rotate(-30deg);' +
      'font:800 110px/1 system-ui,Arial,sans-serif;letter-spacing:.08em;color:rgba(180,35,24,.14);white-space:nowrap}}';
    document.head.appendChild(st);
    var mark = document.createElement('div');
    mark.className = 'pe-draft-mark';
    mark.setAttribute('data-page-ui', '');
    mark.setAttribute('aria-hidden', 'true');
    mark.innerHTML = '<span>DRAFT</span>';
    document.body.appendChild(mark);

    ui.draft = el('div', { class: 'draft', role: 'region', 'aria-label': 'Working copy' }, [
      el('span', {}, [el('b', { text: 'Working copy.' }),
        el('span', { class: 'long', text: ' Anyone you send this file to can edit it. Share the final copy instead.' }),
        el('span', { class: 'short', text: ' Don’t share this file.' })]),
      el('button', { onclick: function () { save(true); } }, ['Export final copy'])
    ]);
    root.appendChild(ui.draft);
    // Keep the page's top room equal to the banner's height, which grows
    // when its text wraps on a narrow screen.
    var fit = function () {
      var h = Math.ceil(ui.draft.getBoundingClientRect().height) || 40;
      document.documentElement.style.setProperty('--pe-draft-h', h + 'px');
      host.style.setProperty('--pe-top', h + 'px');
    };
    fit();
    window.addEventListener('resize', fit);
  }

  function init() {
    if (!window.Page) return;
    host = document.createElement('div');
    host.setAttribute('data-page-ui', '');
    host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483000';
    host.style.fontFamily = (window.Charts && Charts.theme && Charts.theme.font) ||
      'system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif';
    host.style.setProperty('--pe-accent', themeAccent());
    root = host.attachShadow({ mode: 'open' });
    root.appendChild(el('style', { text: CSS }));

    ui.toggle = el('button', { class: 'toggle', onclick: start }, ['✎ Edit page']);
    ui.msg = el('span', { class: 'msg' });
    ui.status = el('span', { class: 'status' });
    ui.undo = el('button', { title: 'Undo (Ctrl+Z)', onmousedown: function (e) { e.preventDefault(); }, onclick: undo }, ['Undo']);
    ui.redo = el('button', { title: 'Redo (Ctrl+Shift+Z)', onmousedown: function (e) { e.preventDefault(); }, onclick: redo }, ['Redo']);
    ui.bold = el('button', { class: 'fmt b', hidden: true, title: 'Bold (Ctrl+B)', 'aria-pressed': 'false',
      onmousedown: function (e) { e.preventDefault(); }, onclick: function () { applyFormat('bold'); } }, ['B']);
    ui.italic = el('button', { class: 'fmt i', hidden: true, title: 'Italic (Ctrl+I)', 'aria-pressed': 'false',
      onmousedown: function (e) { e.preventDefault(); }, onclick: function () { applyFormat('italic'); } }, ['I']);
    ui.save = el('button', { class: 'save', title: 'Save (Ctrl+S)', onmousedown: function (e) { e.preventDefault(); },
      onclick: function () { save(false); } }, ['Save']);
    ui.list = el('div', { class: 'list', hidden: true }, [
      el('button', { onclick: function () { save(true); } }, ['Export final copy',
        el('small', { text: 'No editor, no draft marks: the file to share' })])
    ]);
    ui.bar = el('div', { class: 'bar', hidden: true, role: 'toolbar', 'aria-label': 'Page editor' }, [
      ui.msg, ui.status, ui.bold, ui.italic, ui.undo, ui.redo, ui.save,
      el('div', { class: 'menu' }, [
        el('button', { class: 'more', title: 'More', 'aria-label': 'More save options', onmousedown: function (e) { e.preventDefault(); },
          onclick: function () { ui.list.hidden = !ui.list.hidden; } }, ['\u22EF']),
        ui.list
      ]),
      el('button', { class: 'done', onclick: stop }, ['Done'])
    ]);
    ui.toast = el('div', { class: 'toast', hidden: true, role: 'status' });
    ui.tag = el('span', { class: 'tag' });
    ui.hl = el('div', { class: 'hl', hidden: true }, [ui.tag]);
    ui.sel = el('div', { class: 'sel', hidden: true });
    ui.rm = el('button', { class: 'rm', hidden: true, title: 'Remove from the page', 'aria-haspopup': 'menu', 'aria-expanded': 'false',
      onmousedown: function (e) { e.preventDefault(); },
      onclick: function () { if (rmOpen) closeRemoveMenu(true); else openRemoveMenu(); } }, ['Remove\u2026']);
    ui.rmenu = el('div', { class: 'rmenu', hidden: true, role: 'menu', 'aria-label': 'Remove from the page' });
    ui.rmenu.addEventListener('keydown', menuKeys);
    ui.rm.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); openRemoveMenu(); }
    });
    ui.panel = el('aside', { class: 'panel', hidden: true, 'aria-label': 'Chart settings' });
    [ui.hl, ui.sel, ui.panel, ui.bar, ui.toggle, ui.toast, ui.rm, ui.rmenu].forEach(function (n) { root.appendChild(n); });
    root.appendChild(el('style', { text: '[hidden]{display:none!important}' }));
    document.body.appendChild(host);
    markWorkingCopy();
    document.addEventListener('keydown', onKey, true);

    savedState = stateKey();
    openedAs = hash(savedState);
    Page.on(function () { if (!textEdit) { refreshBar(); keepDraft(); } });
    window.addEventListener('beforeunload', function (e) {
      if (textEdit) finishText(true);
      if (!unsaved()) return;
      e.preventDefault();
      e.returnValue = '';
    });
    offerDraft();

    window.PageEditor = { start: start, stop: stop, undo: undo, redo: redo, save: save,
      isEditing: function () { return editing; }, isUnsaved: unsaved };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
