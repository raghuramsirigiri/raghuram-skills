/*!
 * page-runtime.js — the contract an editable page is built on.
 *
 * An editable page keeps its content as data rather than as code, so that a
 * person with no tooling can change it and save it without anyone rerunning
 * the build:
 *
 *   Charts  live in one JSON block, keyed by the id of the element they draw
 *           into:
 *             <script type="application/json" id="page-spec">
 *             { "version": 1, "charts": { "c1": { "type": "bar", "config": { … } } } }
 *             (end of script block)
 *   Text    stays in the HTML, on elements marked with a stable key and a kind:
 *             <h1 data-edit="text" data-key="title">Q4 review</h1>
 *             <p data-edit="rich" data-key="note-1">Revenue <b>rose</b> …</p>
 *           `text` is plain text. `rich` also keeps <b>, <strong>, <i>, <em>
 *           and <br>; everything else is unwrapped on the way in.
 *
 * This file draws every chart in the spec and exposes `window.Page`, the only
 * surface an editor needs: read and replace a chart, read and replace a text
 * element, and serialize the page back to a clean, standalone HTML file with
 * the edits in it. It edits what the page already has; it never adds or
 * removes a component.
 *
 * Removing a component hides it (data-page-removed) rather than deleting it,
 * so undo and drafts can bring it back; serialize() leaves removed nodes out
 * of the saved file, along with the spec entries of any charts inside them.
 * Nodes are addressed by their position in the page as it opened ("3.0.2"),
 * which is the same on every open of the same file, so a draft can name them.
 *
 * Anything the page's own scripts create at load (a deck's slide footers,
 * say) must carry data-page-generated, so serialize() leaves it out and the
 * next open doesn't add a second copy.
 *
 * Charts drawn by page code (a filter's render(), say) are not in the spec.
 * They still work, and list() reports them as locked.
 *
 * Switching a chart's type goes through chart-convert.js (window.ChartConvert),
 * which must load before this file; without it alternatives() is empty.
 *
 * Load after charts.js and after any Charts.applyPalette call. No dependencies.
 */
(function () {
  'use strict';

  var SPEC_ID = 'page-spec';
  var KINDS = { text: 1, rich: 1 };
  var RICH_TAGS = { B: 1, STRONG: 1, I: 1, EM: 1, BR: 1 };
  // Marks what was in <body> before any chart ran, so serialize() can drop
  // what charts added outside their own containers (tooltips, measuring nodes).
  var STATIC_ATTR = 'data-page-static';
  var TABLES = { table: 1, reportTable: 1, barInsightTable: 1 };
  // Dashboard grid: a .bento holds cells sized by one width class and an
  // optional h2. Layout edits only resize a cell among these widths and move
  // it within its own grid.
  var WIDTHS = ['w4', 'w6', 'w8', 'w12'];
  var cellIds = [];   // index = id; the cells present when the page opened
  var gridIds = [];   // index = id; the grids present when the page opened

  var spec = null;
  var handles = {};
  var containerStyle = {};
  var listeners = [];
  var dirty = false;
  // Per chart, the config each type had before the reader switched away from
  // it, so bar → donut → bar gives back the bar exactly (sort order, stacking,
  // axis lines) instead of a rebuilt approximation. Not saved; cleared when
  // the chart's data is set directly.
  var byType = {};

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function readSpec() {
    var el = document.getElementById(SPEC_ID);
    if (!el) throw new Error('page-runtime: no <script id="' + SPEC_ID + '"> on this page');
    var parsed = JSON.parse(el.textContent);
    if (!parsed || typeof parsed.charts !== 'object') {
      throw new Error('page-runtime: #' + SPEC_ID + ' needs a "charts" object');
    }
    return parsed;
  }

  function emit(change) {
    dirty = true;
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](change); } catch (e) { console.error(e); }
    }
  }

  function textNode(key) {
    var el = document.querySelector('[data-key="' + String(key).replace(/"/g, '\\"') + '"]');
    if (!el || !KINDS[el.getAttribute('data-edit')]) return null;
    return el;
  }

  // Keep text and the few inline tags a paragraph needs; unwrap everything
  // else, and drop every attribute, so pasted markup cannot carry script,
  // styles or links into the saved file.
  function sanitize(html) {
    var box = document.createElement('div');
    box.innerHTML = html;
    (function walk(node) {
      var kids = Array.prototype.slice.call(node.childNodes);
      for (var i = 0; i < kids.length; i++) {
        var k = kids[i];
        if (k.nodeType === 3) continue;
        if (k.nodeType !== 1) { node.removeChild(k); continue; }
        walk(k);
        if (RICH_TAGS[k.tagName]) {
          while (k.attributes.length) k.removeAttribute(k.attributes[0].name);
        } else if (k.tagName === 'SCRIPT' || k.tagName === 'STYLE') {
          node.removeChild(k);
        } else {
          while (k.firstChild) node.insertBefore(k.firstChild, k);
          node.removeChild(k);
        }
      }
    })(box);
    return box.innerHTML;
  }

  // A chart type is a factory the manifest lists — not any function on
  // Charts (applyPalette would otherwise pass as a "type").
  function isChartType(type) {
    if (!window.Charts || typeof Charts[type] !== 'function') return false;
    var meta = Charts.meta && Charts.meta.charts;
    return meta ? Object.prototype.hasOwnProperty.call(meta, type) : true;
  }

  // Draw a candidate where nobody can see it, at the size it would get, and
  // return the library's refusal if it refuses. Non-responsive, so it leaves
  // no observer behind.
  function trial(type, config, w, h) {
    var box = document.createElement('div');
    box.setAttribute('data-page-ui', '');
    box.style.cssText = 'position:absolute;left:-10000px;top:0;visibility:hidden;' +
      'width:' + (w || 600) + 'px;height:' + (h || 340) + 'px';
    document.body.appendChild(box);
    var cfg = clone(config);
    cfg.chart = cfg.chart || {};
    cfg.chart.responsive = false;
    var err = null;
    try {
      var hnd = Charts[type](box, cfg);
      err = hnd && hnd.error ? hnd.error : null;
      if (hnd && hnd.destroy) hnd.destroy();
    } catch (e) {
      err = e.message;
    }
    document.body.removeChild(box);
    return err;
  }

  // ── panels: a chart inside a composition ────────────────────────────
  // "c1::panel:2" addresses charts[2] of the panels chart drawn into #c1, so
  // the editor can treat one panel like any other chart. Reading gives
  // { type, config } for that panel; writing puts it back into the parent's
  // config and redraws the parent.
  var SUB = '::panel:';
  function parts(id) {
    var at = String(id).indexOf(SUB);
    if (at < 0) return null;
    return { parent: id.slice(0, at), index: +id.slice(at + SUB.length) };
  }
  function panelList(config) { return (config && (config.charts || config.panels)) || null; }
  function getEntry(id) {
    var sp = parts(id);
    if (!sp) return spec.charts[id] || null;
    var parent = spec.charts[sp.parent];
    var list = parent && parent.type === 'panels' ? panelList(parent.config) : null;
    var c = list && list[sp.index];
    if (!c) return null;
    var config = clone(c);
    delete config.type;
    return { type: c.type, config: config };
  }
  function putEntry(id, entry) {
    var sp = parts(id);
    if (!sp) { spec.charts[id] = entry; return id; }
    var parent = clone(spec.charts[sp.parent]);
    var key = parent.config.charts ? 'charts' : 'panels';
    parent.config[key][sp.index] = Object.assign({ type: entry.type }, clone(entry.config));
    spec.charts[sp.parent] = parent;
    return sp.parent;
  }
  // A panel's refusal lives on its own handle inside the composition's.
  function errorOf(id, handle) {
    if (!handle) return 'draw failed';
    var sp = parts(id);
    if (sp && handle.charts && handle.charts[sp.index]) return handle.charts[sp.index].error || null;
    return handle.error || null;
  }

  function draw(id) {
    var entry = spec.charts[id];
    var el = document.getElementById(id);
    if (handles[id]) { handles[id].destroy(); delete handles[id]; }
    if (!el) { console.warn('page-runtime: chart "' + id + '" has no element'); return null; }
    if (!isChartType(entry.type)) {
      el.textContent = 'Unknown chart type: ' + entry.type;
      return null;
    }
    if (entry.type === 'reportTable' && window.ChartConvert && ChartConvert.report &&
        ChartConvert.report.percentPixels(entry.config, 100)) {
      handles[id] = drawPercentTable(id, el, entry.config);
      return handles[id];
    }
    // A copy, so an engine that fills defaults into its config never writes
    // them back into the spec that gets saved.
    handles[id] = Charts[entry.type](id, clone(entry.config || {}));
    return handles[id];
  }

  // A report table whose columns carry widthPct. The library only takes
  // pixel widths, and it shares the table's width between the row labels and
  // the columns; fixed columns that leave room over make the table narrower,
  // and too much makes it scroll. So: guess the columns' room, draw, read the
  // width the table actually took (its header rule runs from the left gutter
  // to the table's right edge), and correct the guess. Two or three draws
  // settle it. It redraws the same way when its container changes width.
  function drawPercentTable(id, el, config) {
    var R = ChartConvert.report;
    var gutter = (Charts.theme && Charts.theme.headingGutter) || 20;
    var inner = null, ro = null, lastW = 0;
    function contentWidth() {
      var lines = el.querySelectorAll('svg line');
      var best = 0;
      for (var i = 0; i < lines.length; i++) {
        if (Math.abs(+lines[i].getAttribute('x1') - gutter) < 0.5) best = Math.max(best, +lines[i].getAttribute('x2') - gutter);
      }
      return best;
    }
    function render() {
      var W = el.clientWidth || 800;
      lastW = W;
      var target = W - gutter * 2;
      var room = Math.max(60, target - 200);   // first guess: the labels take ~200px
      for (var pass = 0; pass < 3; pass++) {
        var cfg = clone(config);
        var px = R.percentPixels(cfg, room);
        cfg.columns.forEach(function (c, k) { c.width = px[k]; delete c.widthPct; });
        cfg.chart = Object.assign({}, cfg.chart, { responsive: false });
        if (inner) inner.destroy();
        inner = Charts.reportTable(el, cfg);
        if (inner.error) return;
        var diff = target - contentWidth();
        if (Math.abs(diff) <= 1) return;
        room = Math.max(60, room + diff);
      }
    }
    render();
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(function () {
        if (Math.abs((el.clientWidth || 0) - lastW) >= 2 && el.clientWidth > 0) render();
      });
      ro.observe(el);
    }
    var handle = {
      redraw: function () { render(); },
      getData: function () { return inner ? inner.getData() : null; },
      destroy: function () { if (ro) ro.disconnect(); if (inner) inner.destroy(); inner = null; }
    };
    Object.defineProperty(handle, 'error', { get: function () { return inner ? inner.error || null : null; } });
    return handle;
  }

  function grids() { return Array.prototype.slice.call(document.querySelectorAll('.bento')); }
  function idOfCell(node) { return cellIds.indexOf(node); }
  function widthOf(node) {
    for (var i = 0; i < WIDTHS.length; i++) if (node.classList.contains(WIDTHS[i])) return WIDTHS[i];
    return null;
  }
  // The grid cell holding a chart: the ancestor whose parent is a .bento.
  function cellOf(id) {
    var n = document.getElementById(id);
    while (n && n.parentElement) {
      if (n.parentElement.classList.contains('bento')) return n;
      n = n.parentElement;
    }
    return null;
  }

  // ── removing components ─────────────────────────────────────────────
  var REMOVED = 'data-page-removed';
  var byPath = {};
  var pathOf = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  function indexPaths() {
    (function walk(node, path) {
      for (var i = 0; i < node.children.length; i++) {
        var c = node.children[i];
        if (c.tagName === 'SCRIPT' || c.tagName === 'STYLE') continue;
        var p = path ? path + '.' + i : String(i);
        byPath[p] = c;
        if (pathOf) pathOf.set(c, p);
        if (!c.classList.contains('chart')) walk(c, p);   // a chart's insides are drawn, not content
      }
    })(document.body, '');
    var st = document.createElement('style');
    st.setAttribute('data-page-ui', '');
    st.textContent = '[' + REMOVED + ']{display:none!important}';
    document.head.appendChild(st);
  }
  function removedPaths() {
    var out = [];
    Array.prototype.forEach.call(document.querySelectorAll('[' + REMOVED + ']'), function (n) {
      var p = pathOf && pathOf.get(n);
      if (p) out.push(p);
    });
    return out;
  }
  function setRemoved(paths) {
    var want = {};
    (paths || []).forEach(function (p) { want[p] = 1; });
    Object.keys(byPath).forEach(function (p) {
      var n = byPath[p];
      if (want[p]) n.setAttribute(REMOVED, '');
      else if (n.hasAttribute(REMOVED)) n.removeAttribute(REMOVED);
    });
  }
  function isRemoved(node) { return !!(node && node.closest && node.closest('[' + REMOVED + ']')); }

  function renderAll() {
    spec = readSpec();
    indexPaths();
    grids().forEach(function (g) {
      gridIds.push(g);
      Array.prototype.forEach.call(g.children, function (c) { cellIds.push(c); });
    });
    var body = document.body;
    for (var i = 0; i < body.children.length; i++) body.children[i].setAttribute(STATIC_ATTR, '');
    Object.keys(spec.charts).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) containerStyle[id] = el.getAttribute('style');
      draw(id);
    });
  }

  // Layout as plain data, so it can sit in a snapshot and a draft: per grid,
  // the cells in order as [id, className].
  // Layout as plain data: the grids in page order, and each grid's cells in
  // order as [cellId, className]. Cells can move between grids and grids
  // can move past each other, so both are recorded by the ids they had when
  // the page opened.
  function layoutState() {
    return {
      v: 2,
      order: grids().map(function (g) { return gridIds.indexOf(g); }),
      grids: gridIds.map(function (g, gi) {
        return [gi, Array.prototype.map.call(g.children, function (c) { return [idOfCell(c), c.className]; })];
      })
    };
  }
  function restoreLayout(state) {
    if (Array.isArray(state)) {   // snapshots and drafts from before rows could move
      var gs0 = grids();
      if (gs0.length !== state.length) return;
      state.forEach(function (cells, i) {
        cells.forEach(function (pair) {
          var node = cellIds[pair[0]];
          if (!node || node.parentElement !== gs0[i]) return;
          if (node.className !== pair[1]) node.className = pair[1];
          gs0[i].appendChild(node);
        });
      });
      return;
    }
    state.grids.forEach(function (entry) {
      var g = gridIds[entry[0]];
      if (!g) return;
      entry[1].forEach(function (pair) {
        var node = cellIds[pair[0]];
        if (!node) return;
        if (node.className !== pair[1]) node.className = pair[1];
        g.appendChild(node);   // appending in saved order also brings a cell back to its grid
      });
    });
    // Put the grids back into the slots the grids occupy now, in saved order.
    var now = grids();
    var want = state.order.map(function (i) { return gridIds[i]; }).filter(Boolean);
    if (want.length !== now.length) return;
    var marks = now.map(function (g) {
      var m = document.createComment('slot');
      g.parentNode.insertBefore(m, g);
      return m;
    });
    want.forEach(function (g, i) { marks[i].parentNode.insertBefore(g, marks[i]); });
    marks.forEach(function (m) { m.parentNode.removeChild(m); });
  }

  // Where a card can move by -1 (earlier) or +1 (later):
  //   swap    with its neighbour in the same row;
  //   row     the card is alone, so its whole row moves past the next row;
  //   into    the card is at the end of a row with others, so it joins the
  //           next row, but only one of the same kind: a content-sized table
  //           must never land in a fixed-height row.
  function moveTarget(cell, by) {
    var grid = cell.parentElement;
    var sib = by < 0 ? cell.previousElementSibling : cell.nextElementSibling;
    while (sib && isRemoved(sib)) sib = by < 0 ? sib.previousElementSibling : sib.nextElementSibling;
    if (sib) return { kind: 'swap', other: sib };
    var gs = grids().filter(function (g) { return !isRemoved(g); });
    var og = gs[gs.indexOf(grid) + by];
    if (!og) return null;
    var alone = Array.prototype.filter.call(grid.children, function (c) { return !isRemoved(c); }).length === 1;
    if (alone) return { kind: 'row', other: og };
    if (og.classList.contains('flow') === grid.classList.contains('flow')) return { kind: 'into', other: og };
    return null;
  }

  var Page = {
    /** Every editable component: spec charts, locked code charts, text. */
    list: function () {
      var out = [];
      Object.keys(spec.charts).forEach(function (id) {
        if (isRemoved(document.getElementById(id))) return;
        out.push({ kind: 'chart', id: id, type: spec.charts[id].type, locked: false });
      });
      var boxes = document.querySelectorAll('.chart[id]');
      for (var i = 0; i < boxes.length; i++) {
        if (!spec.charts[boxes[i].id]) out.push({ kind: 'chart', id: boxes[i].id, locked: true });
      }
      var texts = document.querySelectorAll('[data-edit][data-key]');
      for (var j = 0; j < texts.length; j++) {
        var kind = texts[j].getAttribute('data-edit');
        if (KINDS[kind]) out.push({ kind: kind, id: texts[j].getAttribute('data-key') });
      }
      return out;
    },

    /** A copy of a chart's { type, config }; null for a locked or unknown id. */
    getChart: function (id) {
      var e = getEntry(id);
      return e ? clone(e) : null;
    },

    /** The panels inside a panels chart: [{ id, type, title }], else []. */
    panels: function (id) {
      var entry = spec.charts[id];
      var list = entry && entry.type === 'panels' ? panelList(entry.config) : null;
      return (list || []).map(function (c, i) {
        return { id: id + SUB + i, type: c.type, title: c.title || null };
      });
    },

    /**
     * Replace an existing chart's type and/or config, and redraw it. Returns
     * { ok, error }. A chart the library refuses keeps the new entry (so the
     * editor can show the refusal) — call setChart again with the old one to
     * revert.
     */
    setChart: function (id, next) {
      var cur = getEntry(id);
      if (!cur) return { ok: false, error: 'no editable chart "' + id + '"' };
      var entry = {
        type: next && next.type ? next.type : cur.type,
        config: clone(next && next.config ? next.config : cur.config)
      };
      var drawn = putEntry(id, entry);
      delete byType[id];
      var h = draw(drawn);
      emit({ kind: 'chart', id: id });
      if (!h) return { ok: false, error: 'unknown chart type "' + entry.type + '"' };
      var err = errorOf(id, h);
      return { ok: !err, error: err };
    },

    /**
     * The types this chart can switch to: [{ type, current, ok, reason,
     * warnings, lost }]. `reason` comes from the data's shape first, then from
     * the library itself: each candidate is drawn off screen at this chart's
     * size, and a refusal is reported in the library's own words. `lost`
     * names the settings the switch would drop.
     */
    alternatives: function (id) {
      var entry = getEntry(id);
      if (!entry || !window.ChartConvert) return [];
      var sp = parts(id);
      var el = document.getElementById(sp ? sp.parent : id);
      var w = el ? el.clientWidth : 0, h = el ? el.clientHeight : 0;
      if (sp) {
        // One panel's share of the composition.
        var pc = spec.charts[sp.parent].config;
        var po = (pc.plotOptions && pc.plotOptions.panels) || {};
        var cols = Math.min(4, po.columns || panelList(pc).length || 1);
        w = Math.floor(w / cols);
        h = po.panelHeight || 320;
      }
      var meta = (window.Charts && Charts.meta && Charts.meta.charts) || {};
      return ChartConvert.targets(entry.type, entry.config).filter(function (t) {
        return isChartType(t.type);
      }).map(function (t) {
        var out = { type: t.type, current: t.current, ok: t.ok, reason: t.reason,
          warnings: t.warnings.slice(), lost: [] };
        if (t.current || !t.ok) return out;
        var conv = ChartConvert.convert(entry.type, entry.config, t.type);
        if (conv.error) { out.ok = false; out.reason = conv.error; return out; }
        out.lost = conv.lost;
        var refusal = trial(t.type, conv.config, w, h);
        if (refusal) { out.ok = false; out.reason = refusal; out.warnings = []; }
        // Only warn when the switch makes things worse: the page was laid out
        // for the current type, so a card slightly under every type's
        // minimum is not news.
        var m = meta[t.type], cur = meta[entry.type];
        // Only a real squeeze: within 15% of the minimum still reads fine.
        if (out.ok && m && w && m.minWidth && w < m.minWidth * 0.85 && (!cur || m.minWidth > (cur.minWidth || 0))) {
          out.warnings.push('This space is ' + w + 'px wide; a ' + t.type + ' needs about ' + m.minWidth + 'px.');
        }
        // Tables are as tall as their rows. In a fixed-height card the rows
        // stretch and leave a blank band (layout.md, Tables size themselves).
        var grid = !sp && el && el.closest ? el.closest('.bento') : null;
        if (out.ok && TABLES[t.type] && !TABLES[entry.type] && grid && !grid.classList.contains('flow')) {
          out.warnings.push('Tables size to their rows; in this fixed-height card they leave empty space below.');
        }
        return out;
      });
    },

    /**
     * Switch an existing chart to another type, converting its data. Returns
     * { ok, error, lost }. If the library refuses the result, the chart is
     * left as it was. Switching back to a type the chart had before restores
     * that config as it was.
     */
    switchType: function (id, type) {
      var entry = getEntry(id);
      if (!entry) return { ok: false, error: 'no editable chart "' + id + '"', lost: [] };
      if (type === entry.type) return { ok: true, error: null, lost: [] };
      if (!window.ChartConvert) return { ok: false, error: 'chart-convert.js is not on this page', lost: [] };
      if (!isChartType(type)) return { ok: false, error: 'unknown chart type "' + type + '"', lost: [] };
      var memo = byType[id] || (byType[id] = {});
      var config, lost = [];
      if (memo[type]) {
        config = memo[type];
      } else {
        var conv = ChartConvert.convert(entry.type, entry.config, type);
        if (conv.error) return { ok: false, error: conv.error, lost: [] };
        config = conv.config;
        lost = conv.lost;
      }
      var before = spec.charts[parts(id) ? parts(id).parent : id];
      var drawn = putEntry(id, { type: type, config: clone(config) });
      var hnd = draw(drawn);
      var err = errorOf(id, hnd);
      if (err) {
        // Unlike setChart, a switch the library refuses is undone: the reader
        // asked for a different view of the same data, not for an error card.
        spec.charts[drawn] = before;
        draw(drawn);
        return { ok: false, error: err, lost: [] };
      }
      memo[entry.type] = clone(entry.config);
      emit({ kind: 'chart', id: id });
      return { ok: true, error: null, lost: lost };
    },

    getText: function (key) {
      var el = textNode(key);
      if (!el) return null;
      return el.getAttribute('data-edit') === 'rich' ? el.innerHTML : el.textContent;
    },

    setText: function (key, value) {
      var el = textNode(key);
      if (!el) return { ok: false, error: 'no editable text "' + key + '"' };
      if (el.getAttribute('data-edit') === 'rich') el.innerHTML = sanitize(String(value));
      else el.textContent = String(value);
      emit({ kind: 'text', id: key });
      return { ok: true, error: null };
    },

    /** The chart types this page's library can draw. */
    chartTypes: function () {
      var meta = window.Charts && Charts.meta && Charts.meta.charts;
      return meta ? Object.keys(meta).filter(isChartType) : [];
    },

    /**
     * Everything an edit can change, for undo: every spec chart and every
     * marked text. Cheap enough to take before each edit.
     */
    snapshot: function () {
      var text = {};
      var nodes = document.querySelectorAll('[data-edit][data-key]');
      for (var i = 0; i < nodes.length; i++) {
        var key = nodes[i].getAttribute('data-key');
        if (KINDS[nodes[i].getAttribute('data-edit')]) text[key] = Page.getText(key);
      }
      return { charts: clone(spec.charts), text: text, layout: layoutState(), removed: removedPaths() };
    },

    /**
     * Remove components from the page: each node is hidden and left out of
     * the saved file. Returns { ok, error }. Undo is a snapshot restore.
     */
    remove: function (nodes) {
      var paths = removedPaths();
      var added = 0;
      (nodes || []).forEach(function (n) {
        var p = n && pathOf && pathOf.get(n);
        if (p && paths.indexOf(p) < 0) { paths.push(p); added++; }
      });
      if (!added) return { ok: false, error: 'nothing that can be removed' };
      setRemoved(paths);
      emit({ kind: 'remove' });
      return { ok: true, error: null };
    },

    /** Whether a node is on the page's map of removable components. */
    canRemove: function (node) { return !!(pathOf && pathOf.get(node)); },
    isRemoved: isRemoved,

    /** Put the page back to a snapshot, redrawing only what differs. */
    restore: function (snap) {
      Object.keys(snap.charts).forEach(function (id) {
        if (!spec.charts[id]) return;
        if (JSON.stringify(spec.charts[id]) === JSON.stringify(snap.charts[id])) return;
        spec.charts[id] = clone(snap.charts[id]);
        draw(id);
      });
      Object.keys(snap.text).forEach(function (key) {
        var el = textNode(key);
        if (!el || Page.getText(key) === snap.text[key]) return;
        if (el.getAttribute('data-edit') === 'rich') el.innerHTML = sanitize(snap.text[key]);
        else el.textContent = snap.text[key];
      });
      if (snap.layout) restoreLayout(snap.layout);
      setRemoved(snap.removed || []);
      byType = {};
      emit({ kind: 'restore' });
    },

    /**
     * Where a chart sits in a dashboard grid: { width, widths, tall,
     * canTall, first, last }, or null when it isn't in one (a report, a
     * deck, a chart outside the grid).
     */
    layout: function (id) {
      var cell = cellOf(id);
      if (!cell || idOfCell(cell) < 0 || !widthOf(cell)) return null;
      var grid = cell.parentElement;
      return {
        width: widthOf(cell),
        widths: WIDTHS.slice(),
        tall: cell.classList.contains('h2'),
        // Content-sized rows (.flow) hold tables that set their own height.
        canTall: !grid.classList.contains('flow'),
        first: !moveTarget(cell, -1),
        last: !moveTarget(cell, 1),
        // What a move does, for the editor to say so.
        earlier: (moveTarget(cell, -1) || {}).kind || null,
        later: (moveTarget(cell, 1) || {}).kind || null
      };
    },

    /** Change a chart's cell: { width: 'w4'|'w6'|'w8'|'w12', tall: bool }. */
    setLayout: function (id, next) {
      var cur = Page.layout(id);
      if (!cur) return { ok: false, error: 'this chart is not in a grid' };
      var cell = cellOf(id);
      if (next.width && WIDTHS.indexOf(next.width) < 0) return { ok: false, error: 'unknown width ' + next.width };
      if (next.width && next.width !== cur.width) { cell.classList.remove(cur.width); cell.classList.add(next.width); }
      if (next.tall != null && cur.canTall) cell.classList.toggle('h2', !!next.tall);
      emit({ kind: 'layout', id: id });
      return { ok: true, error: null };
    },

    /**
     * Move a chart's card by -1 (earlier) or +1 (later): past its neighbour,
     * or, at the end of its row, into the next row of the same kind; a card
     * alone in its row moves the whole row.
     */
    move: function (id, by) {
      var cell = cellOf(id);
      if (!cell || idOfCell(cell) < 0) return { ok: false, error: 'this chart is not in a grid' };
      var t = moveTarget(cell, by);
      if (!t) return { ok: false, error: by < 0 ? 'already first' : 'already last' };
      var grid = cell.parentElement, o = t.other;
      if (t.kind === 'swap') {
        if (by < 0) grid.insertBefore(cell, o); else grid.insertBefore(o, cell);
      } else if (t.kind === 'row') {
        if (by < 0) o.parentNode.insertBefore(grid, o); else o.parentNode.insertBefore(grid, o.nextSibling);
      } else {
        if (by < 0) o.appendChild(cell); else o.insertBefore(cell, o.firstElementChild);
      }
      emit({ kind: 'layout', id: id });
      return { ok: true, error: null, kind: t.kind };
    },

    redraw: function (id) { return id ? draw(id) : Object.keys(spec.charts).forEach(draw); },

    on: function (fn) { listeners.push(fn); },

    isDirty: function () { return dirty; },

    /**
     * The page as a standalone HTML string with the current edits: chart
     * containers emptied (the runtime redraws them on open), the spec block
     * rewritten, and anything charts added outside their containers dropped.
     * Elements marked data-page-ui (a future editor's chrome) are removed.
     */
    serialize: function () {
      var root = document.documentElement.cloneNode(true);
      var body = root.querySelector('body');
      Array.prototype.slice.call(body.children).forEach(function (c) {
        if (!c.hasAttribute(STATIC_ATTR)) body.removeChild(c);
        else c.removeAttribute(STATIC_ATTR);
      });
      // data-page-ui: editor chrome. data-page-generated: nodes the page's own
      // scripts build at load (a deck's slide footers). Saving either would
      // write them into the file, and the next open would add them again.
      Array.prototype.slice.call(root.querySelectorAll('[data-page-ui],[data-page-generated],[' + REMOVED + ']')).forEach(function (n) {
        n.parentNode.removeChild(n);
      });
      // The editor makes charts and text reachable with Tab while it is open;
      // those tab stops are its own and don't belong in the file.
      Array.prototype.forEach.call(root.querySelectorAll('[data-page-ti]'), function (n) {
        n.removeAttribute('tabindex');
        n.removeAttribute('data-page-ti');
      });
      // Charts that went with a removed component leave the spec too.
      var saved = { version: spec.version, charts: {} };
      Object.keys(spec).forEach(function (k) { if (k !== 'charts') saved[k] = spec[k]; });
      Object.keys(spec.charts).forEach(function (id) {
        if (root.querySelector('#' + (window.CSS && CSS.escape ? CSS.escape(id) : id))) saved.charts[id] = spec.charts[id];
      });
      Object.keys(saved.charts).forEach(function (id) {
        var box = root.querySelector('#' + (window.CSS && CSS.escape ? CSS.escape(id) : id));
        if (!box) return;
        box.innerHTML = '';
        if (containerStyle[id] == null) box.removeAttribute('style');
        else box.setAttribute('style', containerStyle[id]);
      });
      // < keeps a closing script tag inside a title or label from closing the block.
      root.querySelector('#' + SPEC_ID).textContent =
        '\n' + JSON.stringify(saved, null, 2).replace(/</g, '\\u003c') + '\n';
      // The editor marks a working copy's tab "Draft · …" while it is open;
      // the file keeps its real title, or every save would add another.
      root.style.removeProperty('--pe-draft-h');
      if (!root.getAttribute('style')) root.removeAttribute('style');
      var t = root.querySelector('title');
      if (t) t.textContent = t.textContent.replace(/^(Draft \u00B7 )+/, '');
      return '<!DOCTYPE html>\n' + root.outerHTML;
    }
  };

  window.Page = Page;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderAll);
  else renderAll();
})();
