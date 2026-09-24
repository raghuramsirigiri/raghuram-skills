/*!
 * chart-convert.js — switch a chart's type without retyping its data.
 *
 * Every chart type wants its data in its own shape: a column chart takes
 * categories and series, a donut takes one series of named slices, a table
 * takes columns and rows. To offer "show this as a donut" the data has to go
 * through a shape they all agree on. This file reads a config into one of
 * four neutral datasets and builds a config for another type from it:
 *
 *   categorical  categories × series of numbers  column, bar, line, radar,
 *                                                  dumbbell, table, barList,
 *                                                  donut, pie, waffle,
 *                                                  packedBubble
 *   steps        a bridge (read-only source)      waterfall → categorical
 *   values       raw measurements                 histogram, histogramPercent,
 *                                                  histogramCumulative
 *   xy           points                           scatter, bubble
 *
 * sankey, reportTable, barInsightTable, panels, geofacet, heatmap and
 * calendarHeatmap have no neighbours: their data means nothing in another shape. They can still be
 * edited in place, just not switched.
 *
 * targets() only applies structural rules (series count, category count,
 * negatives). The page runtime also renders each candidate off screen, so
 * the library's own refusals count as well. This file has no DOM and no
 * dependency on charts.js, so it runs under Node for tests.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChartConvert = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CATEGORICAL = ['column', 'bar', 'line', 'radar', 'dumbbell', 'table',
    'barList', 'donut', 'pie', 'waffle', 'packedBubble'];
  var SINGLE = { barList: 1, donut: 1, pie: 1, waffle: 1, packedBubble: 1 };
  var AXIS = { column: 1, bar: 1, line: 1 };
  var NO_GAPS = { radar: 1, dumbbell: 1, barList: 1, donut: 1, pie: 1, waffle: 1, packedBubble: 1 };
  var VALUES = ['histogram', 'histogramPercent', 'histogramCumulative'];
  var XY = ['scatter', 'bubble'];
  var FIXED = ['sankey', 'reportTable', 'barInsightTable', 'panels', 'geofacet',
    'heatmap', 'calendarHeatmap'];

  // Keys every chart understands. Anything else at the top level belongs to
  // the source type and is reported as lost when switching away.
  var COMMON = ['title', 'subtitle', 'legend', 'tooltip', 'credits'];
  // chart.* keys that are about the card, not the chart type.
  var CHART_COMMON = ['transparent', 'responsive', 'compact', 'backgroundColor'];

  function clone(v) { return v === undefined ? v : JSON.parse(JSON.stringify(v)); }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function family(type) {
    if (CATEGORICAL.indexOf(type) >= 0) return 'categorical';
    if (type === 'waterfall') return 'steps';
    if (VALUES.indexOf(type) >= 0) return 'values';
    if (XY.indexOf(type) >= 0) return 'xy';
    return null;
  }

  // ── reading a point ────────────────────────────────────────────────
  // Engines accept a bare number, [name, y] / [x, y] pairs, or an object.
  function readPoint(p) {
    if (p === null || p === undefined) return { y: null };
    if (isNum(p)) return { y: p };
    if (Array.isArray(p)) {
      if (p.length >= 2 && typeof p[0] === 'string') return { name: p[0], y: isNum(p[1]) ? p[1] : null };
      return { x: p[0], y: isNum(p[p.length - 1]) ? p[p.length - 1] : null };
    }
    if (typeof p === 'object') {
      var y = isNum(p.y) ? p.y : (isNum(p.value) ? p.value : null);
      var out = { y: y };
      if (p.name != null) out.name = String(p.name);
      if (p.x != null) out.x = p.x;
      if (p.color) out.color = p.color;
      if (p.description) out.description = p.description;
      return out;
    }
    return { y: null };
  }

  function dateLabel(x) {
    var d = new Date(x);
    return isNaN(d.getTime()) ? String(x) : d.toISOString().slice(0, 10);
  }

  // ── config → dataset ───────────────────────────────────────────────
  function extract(type, config) {
    config = config || {};
    var fam = family(type);
    if (!fam) return null;
    var series = Array.isArray(config.series) ? config.series : [];

    if (fam === 'values') {
      var raw = config.data || (series[0] && series[0].data) || [];
      var values = raw.map(function (v) { return readPoint(v).y; }).filter(isNum);
      return values.length ? { kind: 'values', name: (series[0] && series[0].name) || null, values: values } : null;
    }

    if (fam === 'xy') {
      var anyZ = false;
      var xs = series.map(function (s) {
        var pts = (s.data || []).map(function (p) {
          if (Array.isArray(p)) return { x: p[0], y: p[1], z: p[2] };
          return { x: p.x, y: p.y, z: p.z, name: p.name, color: p.color };
        }).filter(function (p) { return isNum(p.x) && isNum(p.y); });
        return { name: s.name || null, color: s.color || null, points: pts };
      });
      xs.forEach(function (s) { s.points.forEach(function (p) { if (isNum(p.z)) anyZ = true; }); });
      return xs.length ? { kind: 'xy', series: xs, hasZ: anyZ && xs.every(function (s) {
        return s.points.every(function (p) { return isNum(p.z); });
      }) } : null;
    }

    if (fam === 'steps') {
      var steps = (series[0] && series[0].data) || config.data || [];
      var run = 0;
      var cats = [], vals = [], colors = [], locked = [];
      steps.forEach(function (p, i) {
        var pt = readPoint(p);
        var total = p && typeof p === 'object' && (p.isSum || p.isIntermediateSum);
        if (total) vals.push(pt.y != null ? pt.y : run);
        else { vals.push(pt.y); if (isNum(pt.y)) run += pt.y; }
        cats.push(pt.name || (total ? 'Total' : 'Step ' + (i + 1)));
        colors.push(pt.color || null);
        locked.push(!!total);
      });
      return vals.length ? {
        kind: 'categorical', categories: cats, oneWay: true, categoryEditable: true,
        series: [{ name: (series[0] && series[0].name) || null, color: null, values: vals, colors: colors, descriptions: [],
          // A total is computed from the steps before it, so its value is not
          // the reader's to type.
          locked: locked }]
      } : null;
    }

    // categorical
    if (type === 'table') {
      var cols = Array.isArray(config.columns) ? config.columns : [];
      var rows = Array.isArray(config.rows) ? config.rows : [];
      var numeric = cols.filter(function (c) {
        var seen = false;
        var allNum = rows.every(function (r) {
          var v = r[c.key];
          if (v === null || v === undefined || v === '') return true;
          if (isNum(v)) { seen = true; return true; }
          return false;
        });
        return allNum && seen;
      });
      if (!numeric.length || !rows.length) return null;
      return {
        kind: 'categorical', categoryEditable: true,
        categories: rows.map(function (r) { return String(r.name != null ? r.name : ''); }),
        series: numeric.map(function (c) {
          return { key: c.key, name: c.name || c.key, color: null, colors: [], descriptions: [],
            values: rows.map(function (r) { return isNum(r[c.key]) ? r[c.key] : null; }) };
        }),
        dropped: cols.length - numeric.length
      };
    }

    if (!series.length) return null;
    var axisCats = config.xAxis && Array.isArray(config.xAxis.categories) ? config.xAxis.categories.map(String) : null;
    var read = series.map(function (s) {
      return { name: s.name || null, color: s.color || null, points: (s.data || []).map(readPoint) };
    });

    var categories, categoryEditable = true;
    if (axisCats) {
      categories = axisCats;
    } else if (read[0].points.some(function (p) { return p.name != null; })) {
      categories = read[0].points.map(function (p, i) { return p.name != null ? p.name : 'Item ' + (i + 1); });
    } else if (read[0].points.some(function (p) { return p.x != null; })) {
      // A line over [x, y] pairs becomes categories only when every series is
      // sampled at the same x values; otherwise columns would misalign.
      var key = function (s) { return s.points.map(function (p) { return String(p.x); }).join('|'); };
      if (!read.every(function (s) { return key(s) === key(read[0]); })) return null;
      var dt = config.xAxis && config.xAxis.type === 'datetime';
      categoryEditable = false;   // they are x positions, not names
      categories = read[0].points.map(function (p) { return dt ? dateLabel(p.x) : String(p.x); });
    } else {
      categories = read[0].points.map(function (p, i) { return String(i + 1); });
      categoryEditable = false;
    }

    return {
      kind: 'categorical',
      categories: categories,
      categoryEditable: categoryEditable,
      series: read.map(function (s) {
        return {
          name: s.name, color: s.color,
          values: categories.map(function (c, i) { return s.points[i] ? s.points[i].y : null; }),
          colors: categories.map(function (c, i) { return (s.points[i] && s.points[i].color) || null; }),
          descriptions: categories.map(function (c, i) { return (s.points[i] && s.points[i].description) || null; })
        };
      })
    };
  }

  // ── dataset → config ───────────────────────────────────────────────
  function carry(base, target, lost) {
    var out = {};
    Object.keys(base || {}).forEach(function (k) {
      if (COMMON.indexOf(k) >= 0) { out[k] = clone(base[k]); return; }
      if (k === 'chart') {
        var c = {};
        Object.keys(base.chart || {}).forEach(function (ck) {
          if (CHART_COMMON.indexOf(ck) >= 0) c[ck] = clone(base.chart[ck]);
          else lost.push('chart.' + ck);
        });
        if (Object.keys(c).length) out.chart = c;
        return;
      }
      if (k === 'plotOptions') {
        if (base.plotOptions.series) out.plotOptions = { series: clone(base.plotOptions.series) };
        Object.keys(base.plotOptions).forEach(function (pk) { if (pk !== 'series') lost.push('plotOptions.' + pk); });
        return;
      }
      if (k === 'yAxis' && AXIS[target]) {
        var y = {};
        ['title', 'min', 'max', 'labels'].forEach(function (yk) { if (base.yAxis[yk] !== undefined) y[yk] = clone(base.yAxis[yk]); });
        if (Object.keys(y).length) out.yAxis = y;
        return;
      }
      if (k === 'series' || k === 'data' || k === 'columns' || k === 'rows') return;
      if (k === 'xAxis') {
        if (base.xAxis.title && AXIS[target]) out.xAxis = { title: clone(base.xAxis.title) };
        ['plotLines', 'plotBands', 'type'].forEach(function (xk) { if (base.xAxis[xk] !== undefined) lost.push('xAxis.' + xk); });
        return;
      }
      lost.push(k);
    });
    return out;
  }

  function point(y, color, name, description) {
    if (!color && name == null && !description) return y;
    var p = { y: y };
    if (name != null) p.name = name;
    if (color) p.color = color;
    if (description) p.description = description;
    return p;
  }

  function build(type, ds, base) {
    var lost = [];
    var cfg = carry(base, type, lost);

    if (ds.kind === 'values') {
      cfg.data = ds.values.slice();
      return { config: cfg, lost: lost };
    }

    if (ds.kind === 'xy') {
      cfg.series = ds.series.map(function (s) {
        var out = { data: s.points.map(function (p) {
          return type === 'bubble' ? [p.x, p.y, p.z] : [p.x, p.y];
        }) };
        if (s.name) out.name = s.name;
        if (s.color) out.color = s.color;
        return out;
      });
      if (type === 'scatter' && ds.hasZ) lost.push('bubble size (z)');
      return { config: cfg, lost: lost };
    }

    // categorical
    if (type === 'table') {
      cfg.columns = ds.series.map(function (s, i) { return { key: 's' + i, name: s.name || 'Value' }; });
      cfg.rows = ds.categories.map(function (c, j) {
        var r = { name: c };
        ds.series.forEach(function (s, i) { r['s' + i] = s.values[j]; });
        return r;
      });
      if (ds.series.some(function (s) { return s.colors.some(Boolean); })) lost.push('point colours');
      return { config: cfg, lost: lost };
    }

    if (SINGLE[type]) {
      var s0 = ds.series[0];
      cfg.series = [{
        data: ds.categories.map(function (c, j) {
          return point(s0.values[j], s0.colors[j], c, type === 'waffle' ? s0.descriptions[j] : null);
        })
      }];
      if (s0.name) cfg.series[0].name = s0.name;
      return { config: cfg, lost: lost };
    }

    cfg.xAxis = cfg.xAxis || {};
    cfg.xAxis.categories = ds.categories.slice();
    cfg.series = ds.series.map(function (s) {
      var out = { data: s.values.map(function (v, j) { return point(v, s.colors[j]); }) };
      if (s.name) out.name = s.name;
      if (s.color) out.color = s.color;
      return out;
    });
    if (type === 'radar' || type === 'dumbbell') {
      if (ds.series.some(function (s) { return s.colors.some(Boolean); })) lost.push('point colours');
    }
    return { config: cfg, lost: lost };
  }

  // ── which types this chart can become ──────────────────────────────
  function rules(type, ds) {
    if (ds.kind !== 'categorical') return null;
    var n = ds.series.length, k = ds.categories.length;
    var all = [];
    ds.series.forEach(function (s) { s.values.forEach(function (v) { if (isNum(v)) all.push(v); }); });
    var neg = all.some(function (v) { return v < 0; });
    // A blank is not a zero. Column, bar, line and table leave a gap; these
    // draw a missing value as 0 (a dot on the axis, a spoke to the centre),
    // which reads as a measurement nobody took.
    var blanks = ds.series.some(function (s) { return s.values.some(function (v) { return !isNum(v); }); });
    if (blanks && NO_GAPS[type]) return 'Some values are blank, and a ' + type + ' would draw them as zero.';
    if (type === 'radar' && k < 3) return 'A radar needs at least 3 categories; this has ' + k + '.';
    if (type === 'dumbbell' && n !== 2) return 'A dumbbell compares exactly 2 series; this has ' + n + '.';
    if (SINGLE[type] && n !== 1) return 'This chart shows one series; this data has ' + n + '.';
    if ((type === 'donut' || type === 'pie' || type === 'packedBubble' || type === 'waffle') && neg) {
      return 'Negative values cannot be parts of a whole.';
    }
    if (type === 'waffle' && all.some(function (v) { return v > 100; })) {
      return 'A waffle shows shares out of 100; these values go above 100.';
    }
    return null;
  }

  function warnings(type, ds) {
    var w = [];
    if (ds.kind !== 'categorical') return w;
    var k = ds.categories.length;
    if ((type === 'donut' || type === 'pie') && k > 6) w.push(k + ' slices; past 6 they get hard to compare. A bar chart reads better.');
    if (type === 'waffle' && k > 4) w.push(k + ' panels side by side; a waffle reads best with 4 or fewer.');
    if (type === 'line' && ds.series.some(function (s) { return s.values.some(function (v) { return v === null; }); })) {
      w.push('The data has gaps; a line will break at them.');
    }
    return w;
  }

  /**
   * Every type a chart could switch to, with a reason on the ones it can't.
   * The chart's own type is included as current. Returns [] for a type with
   * no neighbours or data that can't be read.
   */
  function targets(type, config) {
    var ds = extract(type, config);
    if (!ds) return [];
    var pool = ds.kind === 'categorical' ? CATEGORICAL
      : ds.kind === 'values' ? VALUES
      : ds.kind === 'xy' ? XY : [];
    var out = pool.map(function (t) {
      var reason = t === type ? null : rules(t, ds);
      if (!reason && t === 'bubble' && !ds.hasZ) reason = 'A bubble needs a size (z) for every point.';
      return { type: t, current: t === type, ok: !reason, reason: reason, warnings: reason ? [] : warnings(t, ds) };
    });
    if (type === 'waterfall') out.unshift({ type: 'waterfall', current: true, ok: true, reason: null, warnings: [] });
    return out;
  }

  /** { config, lost } for `to`, or { error } when it can't be built. */
  function convert(from, config, to) {
    var ds = extract(from, config);
    if (!ds) return { error: 'A ' + from + ' chart can\'t be switched to another type.' };
    if (from === to) return { config: clone(config), lost: [] };
    var t = targets(from, config).filter(function (x) { return x.type === to; })[0];
    if (!t) return { error: 'A ' + from + ' chart can\'t become a ' + to + '.' };
    if (!t.ok) return { error: t.reason };
    var built = build(to, ds, config);
    if (ds.dropped) built.lost.push(ds.dropped + ' non-numeric column(s)');
    return built;
  }

  // ── dataset → the same chart, with its own settings kept ───────────
  // convert() rebuilds a config and drops what the new type doesn't use. When
  // only the numbers or names change, everything else about the chart (sort
  // order, stacking, point colours, descriptions, reference lines) must stay,
  // so this writes the dataset back into a copy of the original config, point
  // by point, in whatever shape each point was written.
  function setPoint(p, y, name) {
    if (p === null || p === undefined || isNum(p)) return y;
    if (Array.isArray(p)) {
      var a = p.slice();
      if (typeof a[0] === 'string') { if (name != null) a[0] = name; a[1] = y; }
      else a[a.length - 1] = y;
      return a;
    }
    var o = clone(p);
    if ('value' in o && !('y' in o)) o.value = y; else o.y = y;
    if (name != null && 'name' in o) o.name = name;
    return o;
  }

  /**
   * A copy of `config` with the dataset's names and values written into it.
   * The dataset must come from extract(type, config) and keep its sizes:
   * this edits values, it never adds or removes rows or series. Returns
   * { config } or { error }.
   */
  function withData(type, config, ds) {
    var before = extract(type, config);
    if (!before) return { error: 'This chart\'s data can\'t be edited here.' };
    if (before.kind !== ds.kind) return { error: 'The data changed shape.' };
    var cfg = clone(config);

    if (ds.kind === 'values') {
      if (ds.values.length !== before.values.length) return { error: 'The number of values changed.' };
      var src = Array.isArray(cfg.data) ? cfg.data : cfg.series[0].data;
      if (src.length !== before.values.length) {
        return { error: 'Some values in this chart are not numbers, so it can\'t be edited here.' };
      }
      if (Array.isArray(cfg.data)) cfg.data = ds.values.slice();
      else cfg.series[0].data = ds.values.slice();
      return { config: cfg };
    }

    if (ds.kind === 'xy') {
      var badXY = ds.series.length !== before.series.length || ds.series.some(function (s, i) {
        return s.points.length !== before.series[i].points.length;
      });
      if (badXY) return { error: 'The number of points changed.' };
      // extract() skips points without numbers; only write back when none
      // were skipped, so indexes line up.
      if (cfg.series.some(function (s, i) { return (s.data || []).length !== before.series[i].points.length; })) {
        return { error: 'Some points in this chart have no numbers, so it can\'t be edited here.' };
      }
      ds.series.forEach(function (s, i) {
        if (s.name != null) cfg.series[i].name = s.name;
        cfg.series[i].data = cfg.series[i].data.map(function (p, j) {
          var q = s.points[j];
          if (Array.isArray(p)) return p.length > 2 ? [q.x, q.y, q.z] : [q.x, q.y];
          var o = clone(p); o.x = q.x; o.y = q.y; if ('z' in o) o.z = q.z; return o;
        });
      });
      return { config: cfg };
    }

    // categorical
    var k = before.categories.length;
    if (ds.categories.length !== k || ds.series.length !== before.series.length ||
        ds.series.some(function (s) { return s.values.length !== k; })) {
      return { error: 'Rows or series were added or removed; only values can change.' };
    }
    var cats = before.categoryEditable ? ds.categories : before.categories;

    if (type === 'table') {
      cfg.rows.forEach(function (r, j) {
        r.name = cats[j];
        ds.series.forEach(function (s) { r[s.key] = s.values[j]; });
      });
      cfg.columns.forEach(function (c) {
        ds.series.forEach(function (s) { if (s.key === c.key && s.name) c.name = s.name; });
      });
      return { config: cfg };
    }

    if (type === 'waterfall') {
      var pts = cfg.series && cfg.series[0] && cfg.series[0].data ? cfg.series[0].data : cfg.data;
      pts.forEach(function (p, j) {
        var total = p && typeof p === 'object' && (p.isSum || p.isIntermediateSum);
        var named = p && typeof p === 'object' && !Array.isArray(p) && p.name != null;
        if (total) { if (named || cats[j] !== 'Total') p.name = cats[j]; return; }
        pts[j] = setPoint(p, ds.series[0].values[j], cats[j]);
      });
      if (cfg.series && cfg.series[0] && ds.series[0].name) cfg.series[0].name = ds.series[0].name;
      return { config: cfg };
    }

    if (cfg.xAxis && Array.isArray(cfg.xAxis.categories)) cfg.xAxis.categories = cats.slice();
    cfg.series.forEach(function (s, i) {
      var d = ds.series[i];
      if (d.name) s.name = d.name;
      s.data = (s.data || []).map(function (p, j) { return setPoint(p, d.values[j], cats[j]); });
    });
    return { config: cfg };
  }

  // ── records: charts whose content is more than a series ────────────
  // barInsightTable, reportTable and geofacet carry text and per-row values
  // that the categorical dataset has no room for. Each gets a record shape
  // the editor can show as fields, and a writer that puts edits back into a
  // copy of the config in whatever shape each value was written. Like
  // withData, these change values only; they never add or remove rows.

  function textOf(v) { return v == null ? '' : String(v); }

  var INSIGHT_KEYS = ['insight', 'description', 'stat', 'statNote'];

  function records(type, config) {
    config = config || {};
    var series = Array.isArray(config.series) ? config.series : [];

    if (type === 'barInsightTable') {
      var cats = config.xAxis && Array.isArray(config.xAxis.categories) ? config.xAxis.categories : null;
      var first = (series[0] && series[0].data) || [];
      var n = cats ? cats.length : first.length;
      var rowsArr = Array.isArray(config.rows) ? config.rows : null;
      return {
        kind: 'insightRows',
        series: series.map(function (s, i) { return s.name || ('Series ' + (i + 1)); }),
        rows: Array.apply(null, { length: n }).map(function (_, j) {
          var p0 = first[j];
          var extra = rowsArr ? (rowsArr[j] || {}) : (p0 && typeof p0 === 'object' && !Array.isArray(p0) ? p0 : {});
          var row = {
            name: cats ? textOf(cats[j]) : textOf(readPoint(p0).name),
            values: series.map(function (s) { return readPoint((s.data || [])[j]).y; })
          };
          INSIGHT_KEYS.forEach(function (k) { row[k] = textOf(extra[k]); });
          return row;
        })
      };
    }

    if (type === 'geofacet') {
      var raw = (series[0] && series[0].data) || config.data || {};
      var list;
      if (Array.isArray(raw)) {
        list = raw.map(function (d) {
          if (Array.isArray(d)) return { code: textOf(d[0]), name: '', value: isNum(d[1]) ? d[1] : null };
          return { code: textOf(d && d.code), name: textOf(d && d.name), value: d && isNum(d.value) ? d.value : null };
        });
      } else {
        list = Object.keys(raw).map(function (k) { return { code: k, name: '', value: isNum(raw[k]) ? raw[k] : null }; });
      }
      return { kind: 'regions', rows: list };
    }

    if (type === 'reportTable') {
      var cols = Array.isArray(config.columns) ? config.columns : [];
      return {
        kind: 'reportRows',
        columns: cols.map(function (c) {
          return { key: c.key, name: textOf(c.name), kind: c.kind, chartType: c.kind === 'chart' && c.chart ? c.chart.type : null };
        }),
        rows: (Array.isArray(config.rows) ? config.rows : []).map(function (r) {
          var nm = r.name;
          var cells = {};
          cols.forEach(function (c) {
            var v = r[c.key];
            if (c.kind === 'text') cells[c.key] = { text: textOf(v && typeof v === 'object' ? v.text : v) };
            else if (c.kind === 'insight') cells[c.key] = { head: textOf(v && v.head), body: textOf(v && v.body) };
            else if (c.kind === 'kpi') {
              var val = v && typeof v === 'object' ? v.value : v;
              cells[c.key] = { value: isNum(val) ? val : null, note: textOf(v && typeof v === 'object' ? v.note : '') };
            } else if (c.kind === 'chart') {
              // A cell's values are editable when it is a bare list, or a chart
              // config with one series (numbers, [name, y] or { y } points).
              // Anything richer is changed through its column's type.
              var bare = Array.isArray(v) && v.every(function (x) { return x === null || isNum(x); });
              var one = !bare && v && typeof v === 'object' && Array.isArray(v.series) && v.series.length === 1 &&
                Array.isArray(v.series[0].data) && v.series[0].data.every(function (x) {
                  return x === null || isNum(x) || (Array.isArray(x) && x.length === 2) || (x && typeof x === 'object' && !Array.isArray(x));
                }) ? v.series[0].data : null;
              cells[c.key] = { values: bare ? v.slice() : one ? one.map(function (x) { return readPoint(x).y; }) : null };
            }
          });
          return {
            group: r.group || null,
            name: nm && typeof nm === 'object' ? textOf(nm.head) : textOf(nm),
            nameBody: nm && typeof nm === 'object' ? textOf(nm.body) : null,
            cells: cells
          };
        })
      };
    }
    return null;
  }

  function setText(obj, key, value) {
    // Empty text removes an optional field rather than saving "".
    if (value === '' || value == null) delete obj[key]; else obj[key] = value;
  }

  function withRecords(type, config, rec) {
    var before = records(type, config);
    if (!before || before.kind !== rec.kind || before.rows.length !== rec.rows.length) {
      return { error: 'Rows were added or removed; only values can change.' };
    }
    var cfg = clone(config);

    if (type === 'barInsightTable') {
      if (rec.series.length !== before.series.length) return { error: 'Series were added or removed.' };
      var hasCats = cfg.xAxis && Array.isArray(cfg.xAxis.categories);
      var rowsArr = Array.isArray(cfg.rows) ? cfg.rows : null;
      rec.series.forEach(function (nm, i) { if (nm) cfg.series[i].name = nm; });
      rec.rows.forEach(function (row, j) {
        if (hasCats) cfg.xAxis.categories[j] = row.name;
        cfg.series.forEach(function (s, i) {
          s.data[j] = setPoint(s.data[j], row.values[i], hasCats ? null : row.name);
        });
        var target;
        if (rowsArr) target = rowsArr[j] = rowsArr[j] || {};
        else {
          var p = cfg.series[0].data[j];
          if (!p || typeof p !== 'object' || Array.isArray(p)) {
            p = Array.isArray(p) ? { name: p[0], y: p[1] } : { y: p };
            cfg.series[0].data[j] = p;
          }
          target = p;
        }
        INSIGHT_KEYS.forEach(function (k) { setText(target, k, row[k]); });
      });
      return { config: cfg };
    }

    if (type === 'geofacet') {
      var holder = cfg.series && cfg.series[0] && cfg.series[0].data !== undefined ? cfg.series[0] : cfg;
      var raw = holder.data;
      if (Array.isArray(raw)) {
        holder.data = raw.map(function (d, j) {
          var r = rec.rows[j];
          if (Array.isArray(d)) return [d[0], r.value];
          var o = clone(d);
          o.value = r.value;
          setText(o, 'name', r.name);
          return o;
        });
      } else {
        var out = {};
        Object.keys(raw).forEach(function (k, j) { out[k] = rec.rows[j].value; });
        holder.data = out;
      }
      return { config: cfg };
    }

    if (type === 'reportTable') {
      cfg.columns.forEach(function (c, i) { if (rec.columns[i] && rec.columns[i].name) c.name = rec.columns[i].name; });
      cfg.rows.forEach(function (r, j) {
        var row = rec.rows[j];
        if (r.name && typeof r.name === 'object') { r.name.head = row.name; setText(r.name, 'body', row.nameBody); }
        else r.name = row.name;
        cfg.columns.forEach(function (c) {
          var cell = row.cells[c.key], v = r[c.key];
          if (!cell) return;
          if (c.kind === 'text') {
            if (v && typeof v === 'object') setText(v, 'text', cell.text); else if (cell.text === '') delete r[c.key]; else r[c.key] = cell.text;
          } else if (c.kind === 'insight') {
            var o = v && typeof v === 'object' ? v : {};
            o.head = cell.head;
            setText(o, 'body', cell.body);
            r[c.key] = o;
          } else if (c.kind === 'kpi') {
            if (v && typeof v === 'object') { v.value = cell.value; setText(v, 'note', cell.note); }
            else if (cell.note) r[c.key] = { value: cell.value, note: cell.note };
            else r[c.key] = cell.value;
          } else if (c.kind === 'chart' && cell.values) {
            if (Array.isArray(v)) {
              if (v.length === cell.values.length) r[c.key] = cell.values.slice();
            } else if (v && v.series && v.series[0] && v.series[0].data.length === cell.values.length) {
              v.series[0].data = v.series[0].data.map(function (p, i) { return setPoint(p, cell.values[i], null); });
            }
          }
        });
      });
      return { config: cfg };
    }
    return { error: 'This chart\'s content can\'t be edited here.' };
  }

  // ── report table chart columns ─────────────────────────────────────
  // A chart column draws one chart per row from column.chart (defaults) laid
  // under each row's value. Switching the column's type converts every row's
  // cell, and a type is only offered when every row converts.
  var CELL_REFUSED = { panels: 1, table: 1, barInsightTable: 1, reportTable: 1 };

  function cellConfig(column, value) {
    var base = clone(column.chart || {});
    delete base.type;
    if (Array.isArray(value)) return Object.assign(base, { series: [{ data: value.slice() }] });
    var cfg = Object.assign(base, clone(value || {}));
    return cfg;
  }

  function reportChartTargets(config, key) {
    var col = (config.columns || []).filter(function (c) { return c.key === key && c.kind === 'chart'; })[0];
    if (!col || !col.chart) return [];
    var from = col.chart.type;
    var rows = config.rows || [];
    var lists = rows.map(function (r) { return targets(from, cellConfig(col, r[key])); });
    if (!lists.length || lists.some(function (l) { return !l.length; })) return [];
    return lists[0].filter(function (t) { return !CELL_REFUSED[t.type]; }).map(function (t) {
      var reason = t.reason;
      if (!reason) {
        lists.some(function (l, j) {
          var m = l.filter(function (x) { return x.type === t.type; })[0];
          if (m && !m.ok) { reason = 'Row "' + textOf(rows[j].name && rows[j].name.head || rows[j].name) + '": ' + m.reason; return true; }
          return false;
        });
      }
      if (!reason && !t.current) {
        var trial = convertColumn(config, key, t.type);
        if (trial.error) reason = trial.error;
      }
      return { type: t.type, current: t.current, ok: !reason, reason: reason };
    });
  }

  function switchReportChart(config, key, to) {
    var t = reportChartTargets(config, key).filter(function (x) { return x.type === to; })[0];
    if (!t) return { error: 'This column can\'t show a ' + to + '.' };
    if (!t.ok) return { error: t.reason };
    return convertColumn(config, key, to);
  }

  // The library's own validator, when charts.js is loaded, so a type is only
  // offered for a column when every converted cell would actually draw.
  function libraryProblem(type, cfg) {
    var C = typeof Charts !== 'undefined' ? Charts : (typeof window !== 'undefined' ? window.Charts : null);
    if (!C || typeof C.validate !== 'function') return null;
    var v = C.validate(type, cfg);
    return v.ok ? null : v.errors[0];
  }

  function convertColumn(config, key, to) {
    var cfg = clone(config);
    var col = cfg.columns.filter(function (c) { return c.key === key; })[0];
    var from = col.chart.type;
    if (from === to) return { config: cfg };
    var errors = [];
    cfg.rows.forEach(function (r) {
      var conv = convert(from, cellConfig(col, r[key]), to);
      if (conv.error) { errors.push(conv.error); return; }
      // Keep the cell as small as it was: a bare list stays a list when the
      // new type still takes one; otherwise the cell holds its series (and
      // categories), and the column keeps the shared settings. Categories that
      // are only positions ("1", "2", …) came from the bare list and go.
      var c = conv.config;
      // A radar needs its axes named, even when the names are only positions.
      if (to !== 'radar' && c.xAxis && c.xAxis.categories && c.xAxis.categories.every(function (x, i) { return x === String(i + 1); })) delete c.xAxis;
      var single = c.series && c.series.length === 1 && !c.xAxis && c.series[0].data.every(function (x) { return x === null || isNum(x); });
      if (Array.isArray(r[key]) && single) r[key] = c.series[0].data.slice();
      else {
        var cell = { series: c.series };
        if (c.xAxis && c.xAxis.categories) cell.xAxis = { categories: c.xAxis.categories };
        if (c.data) cell = { data: c.data };
        r[key] = cell;
      }
    });
    if (errors.length) return { error: errors[0] };
    var keep = {};
    Object.keys(col.chart).forEach(function (k) {
      if (k === 'type') return;
      if (k === 'plotOptions') {
        if (col.chart.plotOptions.series) keep.plotOptions = { series: col.chart.plotOptions.series };
        return;
      }
      if (COMMON.indexOf(k) >= 0 || k === 'chart') keep[k] = col.chart[k];
    });
    col.chart = Object.assign({ type: to }, keep);
    for (var i = 0; i < cfg.rows.length; i++) {
      var problem = libraryProblem(to, cellConfig(col, cfg.rows[i][key]));
      if (problem) {
        var nm = cfg.rows[i].name;
        return { error: 'Row "' + textOf(nm && typeof nm === 'object' ? nm.head : nm) + '": ' + problem };
      }
    }
    return { config: cfg };
  }

  // ── report table column widths ─────────────────────────────────────
  // Widths are shares of the columns' room, stored as column.widthPct and
  // always totalling 100, so the table keeps its overall width: changing one
  // column moves the difference into the last column, which is the rest.
  // The library ignores widthPct; page-runtime.js turns the shares into
  // pixels when it draws. No widthPct anywhere means automatic widths.
  // Floors in pixels the library would enforce anyway: 60px for any column,
  // and 220px for a pie or donut column so its slice labels fit.
  var MIN_WIDTH = 60, RING_MIN = 220;
  function minWidthOf(col) {
    return col && col.kind === 'chart' && col.chart && (col.chart.type === 'pie' || col.chart.type === 'donut') ? RING_MIN : MIN_WIDTH;
  }
  function round1(n) { return Math.round(n * 10) / 10; }

  /** [{ key, name, kind, minPx, pct }]; pct is null while widths are automatic. */
  function columnWidths(config) {
    var cols = config.columns || [];
    var set = cols.length > 0 && cols.every(function (c) { return isNum(c.widthPct); });
    return cols.map(function (c) {
      return { key: c.key, name: textOf(c.name || c.key), kind: c.kind, minPx: minWidthOf(c), pct: set ? c.widthPct : null };
    });
  }

  /**
   * Start percentage widths from the drawn pixel widths ({ key: px }), so the
   * table looks the same the moment widths become fixed.
   */
  function initPercents(config, drawnPx) {
    var cfg = clone(config);
    var cols = cfg.columns || [];
    if (!cols.length) return { error: 'This table has no columns.' };
    var px = cols.map(function (c) { var v = drawnPx && +drawnPx[c.key]; return v > 0 ? v : 100; });
    var total = px.reduce(function (a, b) { return a + b; }, 0);
    var run = 0;
    cols.forEach(function (c, i) {
      if (i === cols.length - 1) { c.widthPct = round1(100 - run); return; }
      c.widthPct = round1(px[i] / total * 100);
      run = round1(run + c.widthPct);
    });
    return { config: cfg };
  }

  /**
   * Set one column's share. The last column takes up the difference; shares
   * are kept at or above each column's floor, given the room in pixels the
   * columns share (roomPx), so the change is clamped rather than refused.
   * On a table that is still automatic, every column first takes its share
   * of drawnPx ({ key: px }), so only the changed column moves.
   */
  function setPercent(config, key, pct, roomPx, drawnPx) {
    var cur = columnWidths(config);
    if (!cur.length) return { error: 'This table has no columns.' };
    var i = cur.map(function (c) { return c.key; }).indexOf(key);
    if (i < 0) return { error: 'No column "' + key + '".' };
    var last = cur.length - 1;
    if (i === last) return { error: 'The last column takes whatever the others leave.' };
    var base = cur[0].pct == null ? initPercents(config, drawnPx).config : clone(config);
    var cols = base.columns;
    var room = roomPx > 0 ? roomPx : 1000;
    var floor = function (c) { return round1(minWidthOf(c) / room * 100); };
    var others = 0;
    cols.forEach(function (c, k) { if (k !== i && k !== last) others += c.widthPct; });
    var max = round1(100 - others - floor(cols[last]));
    var v = round1(Math.max(floor(cols[i]), Math.min(max, +pct)));
    if (!isFinite(v)) return { error: 'A width is a percentage.' };
    cols[i].widthPct = v;
    cols[last].widthPct = round1(100 - others - v);
    return { config: base };
  }

  /** Back to automatic widths. */
  function clearWidths(config) {
    var cfg = clone(config);
    (cfg.columns || []).forEach(function (c) { delete c.widthPct; delete c.width; });
    return { config: cfg };
  }

  /**
   * Pixel widths for a room of roomPx, summing exactly to it (largest
   * remainder), or null while widths are automatic.
   */
  function percentPixels(config, roomPx) {
    var cur = columnWidths(config);
    if (!cur.length || cur[0].pct == null) return null;
    var exact = cur.map(function (c) { return c.pct / 100 * roomPx; });
    var out = exact.map(Math.floor);
    var left = Math.round(roomPx) - out.reduce(function (a, b) { return a + b; }, 0);
    exact.map(function (x, k) { return { k: k, r: x - Math.floor(x) }; })
      .sort(function (a, b) { return b.r - a.r; })
      .slice(0, Math.max(0, left)).forEach(function (o) { out[o.k] += 1; });
    return out;
  }

  // ── bar insight table stats, geofacet tiles ────────────────────────
  function statColour(config, j, color) {
    var cfg = clone(config);
    var target;
    if (Array.isArray(cfg.rows)) target = cfg.rows[j] = cfg.rows[j] || {};
    else {
      var data = cfg.series[0].data, p = data[j];
      if (!p || typeof p !== 'object' || Array.isArray(p)) { p = Array.isArray(p) ? { name: p[0], y: p[1] } : { y: p }; data[j] = p; }
      target = p;
    }
    if (color) target.statColor = color; else delete target.statColor;
    return { config: cfg };
  }
  function statColourOf(config, j) {
    if (Array.isArray(config.rows)) return (config.rows[j] && config.rows[j].statColor) || null;
    var p = config.series && config.series[0] && config.series[0].data[j];
    return (p && typeof p === 'object' && p.statColor) || null;
  }
  function statsBySign(config, on) {
    var cfg = clone(config);
    cfg.plotOptions = cfg.plotOptions || {};
    cfg.plotOptions.barInsightTable = cfg.plotOptions.barInsightTable || {};
    cfg.plotOptions.barInsightTable.statColorBySign = !!on;
    return { config: cfg };
  }

  var TILES = ['bar', 'heat', 'gauge'];
  function tileVariant(config) { return String((config.chart && config.chart.variant) || 'bar').toLowerCase(); }
  function setTileVariant(config, variant) {
    if (TILES.indexOf(variant) < 0) return { error: 'Unknown tile type ' + variant + '.' };
    var cfg = clone(config);
    cfg.chart = cfg.chart || {};
    cfg.chart.variant = variant;
    return { config: cfg };
  }

  // ── callouts ───────────────────────────────────────────────────────
  // A callout is a short note pinned to one mark: callouts: [{ <anchor>,
  // series?, text, color? }]. The library names the anchor differently by
  // chart: a line takes x (the category's index, or the x value), a scatter
  // x and y, a histogram a value inside the bin, everything else a name
  // (category, slice, row, state code). anchors() lists the marks a note can
  // be pinned to, as the editor's choices.
  var CALLOUT_BY = { line: 'x', column: 'name', bar: 'name', radar: 'name', dumbbell: 'name',
    barInsightTable: 'name', donut: 'name', pie: 'name', barList: 'name', waffle: 'name',
    packedBubble: 'name', waterfall: 'name', geofacet: 'name', scatter: 'xy', bubble: 'xy', histogram: 'value' };
  var NAME_KEYS = ['name', 'category', 'point', 'code', 'label', 'row', 'panel'];

  function calloutAnchors(type, config) {
    var by = CALLOUT_BY[type];
    if (!by) return null;
    var series = (config.series || []).map(function (s, i) { return s.name || ('Series ' + (i + 1)); });
    var multi = series.length > 1 && /^(line|column|bar|radar|barInsightTable)$/.test(type);
    var anchors = [];
    if (type === 'geofacet') {
      anchors = records(type, config).rows.map(function (r) { return { label: r.name || r.code, value: r.code }; });
    } else if (type === 'barInsightTable') {
      anchors = records(type, config).rows.map(function (r) { return { label: r.name, value: r.name }; });
    } else if (by === 'xy') {
      var ds = extract(type, config);
      (ds ? ds.series : []).forEach(function (s) {
        s.points.forEach(function (p) {
          anchors.push({ label: (p.name ? p.name + ' ' : '') + '(' + p.x + ', ' + p.y + ')', value: { x: p.x, y: p.y } });
        });
      });
    } else if (by === 'value') {
      var vals = (extract(type, config) || { values: [] }).values.slice().sort(function (a, b) { return a - b; });
      vals.filter(function (v, i) { return vals.indexOf(v) === i; }).slice(0, 60).forEach(function (v) {
        anchors.push({ label: 'The bin holding ' + v, value: v });
      });
    } else {
      var d = extract(type, config);
      if (!d || d.kind !== 'categorical') return null;
      anchors = d.categories.map(function (c, i) {
        // A line pins by position: the category's index, or its x value.
        if (by === 'x') return { label: c, value: d.categoryEditable ? i : (readPoint(config.series[0].data[i]).x) };
        return { label: c, value: c };
      });
    }
    return { by: by, anchors: anchors, series: multi ? series : null };
  }

  function anchorOf(co, by) {
    if (by === 'xy') return co.x != null ? { x: co.x, y: co.y } : null;
    if (by === 'x' || by === 'value') return co.x != null ? co.x : (co.bin != null ? co.bin : null);
    for (var i = 0; i < NAME_KEYS.length; i++) if (co[NAME_KEYS[i]] != null) return String(co[NAME_KEYS[i]]);
    return null;
  }

  /** The chart's callouts as [{ anchor, series, text, color }]. */
  function calloutList(type, config) {
    var by = CALLOUT_BY[type];
    return (config.callouts || []).map(function (co) {
      return { anchor: anchorOf(co, by), series: co.series != null ? String(co.series) : null,
        text: textOf(co.text), color: co.color || null };
    });
  }

  /** A copy of the config with these callouts; an empty list removes them. */
  function withCallouts(type, config, list) {
    var by = CALLOUT_BY[type];
    if (!by) return { error: 'This chart can\'t take callouts.' };
    var cfg = clone(config);
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.anchor == null || c.anchor === '') return { error: 'Callout ' + (i + 1) + ' needs something to point at.' };
      var co = {};
      if (by === 'xy') { co.x = c.anchor.x; co.y = c.anchor.y; }
      else if (by === 'x' || by === 'value') co.x = c.anchor;
      else co.name = c.anchor;
      if (c.series) co.series = c.series;
      co.text = String(c.text || '').trim() || 'Note';
      if (c.color) co.color = c.color;
      out.push(co);
    }
    if (out.length) cfg.callouts = out; else delete cfg.callouts;
    return { config: cfg };
  }

  // ── style changes a reader can make ───────────────────────────────
  // Each returns a new config and leaves the input alone. They only use
  // options every listed type draws the same way, and colours are passed in
  // (from the page's theme) rather than invented here.
  var SORTABLE = { column: 1, bar: 1, barList: 1, donut: 1, pie: 1 };
  var HIGHLIGHTABLE = { column: 1, bar: 1, barList: 1 };
  var LABELLED = { column: 1, bar: 1, line: 1 };
  var COLOURED = { column: 1, bar: 1, line: 1, radar: 1, dumbbell: 1, barList: 1, scatter: 1, bubble: 1, barInsightTable: 1 };
  // Scenario notation (IBCS): solid = actual, outlined = plan/budget, hatched
  // = forecast/estimate. Only bars draw it, so only column and bar offer it.
  var FILLABLE = { column: 1, bar: 1 };

  function styleOptions(type, config) {
    var ds = extract(type, config);
    var cat = ds && ds.kind === 'categorical' && !ds.oneWay;
    var series = (config && config.series) || [];
    return {
      // Sorting a line or a dated axis would scramble time.
      sort: !!(cat && SORTABLE[type] && ds.categoryEditable && series.length === 1),
      highlight: !!(cat && HIGHLIGHTABLE[type] && series.length === 1),
      labels: !!(cat && LABELLED[type]),
      colours: !!(COLOURED[type] && series.length >= 1),
      // Per-mark colours replace series colours where each mark has its own.
      marks: !!marks(type, config),
      fill: !!(FILLABLE[type] && series.length >= 1)
    };
  }

  var SCENARIOS = ['actual', 'plan', 'forecast'];

  /** Series i's current scenario: 'actual', 'plan' or 'forecast'. */
  function fillOf(type, config, i) {
    var s = config && config.series && config.series[i];
    if (!s) return 'actual';
    var v = s.scenario;
    if (v === 'budget') return 'plan';
    if (v === 'estimate') return 'forecast';
    return SCENARIOS.indexOf(v) >= 0 ? v : 'actual';
  }

  /** Series i takes this scenario's fill; 'actual' clears it back to solid. */
  function withFill(type, config, i, scenario) {
    if (!styleOptions(type, config).fill || !config.series[i]) return { error: 'This chart can\'t use fill styles.' };
    if (SCENARIOS.indexOf(scenario) < 0) return { error: 'Not a known fill.' };
    var cfg = clone(config);
    if (scenario === 'actual') delete cfg.series[i].scenario;
    else cfg.series[i].scenario = scenario;
    return { config: cfg };
  }

  // ── per-mark colours ───────────────────────────────────────────────
  // Charts that colour each mark on its own rather than by series: slices,
  // waffle panels, bar-list rows, bubbles, single-series bars, waterfall
  // roles, sankey nodes. Colours are passed in; null returns a mark to the
  // chart's automatic colour.
  var POINTED = { pie: 1, donut: 1, waffle: 1, barList: 1, packedBubble: 1, column: 1, bar: 1, barInsightTable: 1 };

  function pointsOf(config) {
    return (config.series && config.series[0] && config.series[0].data) || [];
  }

  /** [{ name, color }] for each mark of a per-mark chart, else null. */
  function marks(type, config) {
    var series = (config && config.series) || [];
    if (type === 'waterfall') {
      var w = (config.plotOptions && config.plotOptions.waterfall) || {};
      return [{ key: 'upColor', name: 'Increase', color: w.upColor || null },
        { key: 'downColor', name: 'Decrease', color: w.downColor || null },
        { key: 'sumColor', name: 'Total', color: w.sumColor || null }];
    }
    if (type === 'sankey') {
      var s = series[0] || {};
      var ids = [], seen = {};
      var add = function (id) { if (id == null) return; id = String(id); if (!seen[id]) { seen[id] = 1; ids.push(id); } };
      (s.nodes || []).forEach(function (n) { if (n) add(n.id); });
      (s.data || []).forEach(function (l) {
        if (Array.isArray(l)) { add(l[0]); add(l[1]); } else if (l) { add(l.from); add(l.to); }
      });
      return ids.map(function (id) {
        var n = (s.nodes || []).filter(function (d) { return d && String(d.id) === id; })[0];
        return { key: id, name: n && n.name != null ? String(n.name) : id, color: (n && n.color) || null };
      });
    }
    if (!POINTED[type] || series.length !== 1) return null;
    var ds = type === 'barInsightTable'
      ? { kind: 'categorical', categories: records(type, config).rows.map(function (r) { return r.name; }) }
      : extract(type, config);
    if (!ds || ds.kind !== 'categorical') return null;
    return pointsOf(config).map(function (p, j) {
      var c = p && typeof p === 'object' && !Array.isArray(p) ? p.color || null : null;
      return { key: j, name: ds.categories[j], color: c };
    });
  }

  /** Colour one mark: a point index, a waterfall role key or a sankey node id. */
  function markColour(type, config, key, color) {
    var list = marks(type, config);
    if (!list || !list.some(function (m) { return m.key === key; })) return { error: 'This mark can\'t be recoloured.' };
    var cfg = clone(config);
    if (type === 'waterfall') {
      cfg.plotOptions = cfg.plotOptions || {};
      cfg.plotOptions.waterfall = cfg.plotOptions.waterfall || {};
      if (color) cfg.plotOptions.waterfall[key] = color; else delete cfg.plotOptions.waterfall[key];
      return { config: cfg };
    }
    if (type === 'sankey') {
      var s = cfg.series[0];
      s.nodes = s.nodes || [];
      var node = s.nodes.filter(function (d) { return d && String(d.id) === key; })[0];
      if (!node) { if (!color) return { config: cfg }; node = { id: key }; s.nodes.push(node); }
      if (color) node.color = color; else delete node.color;
      // A declared node that no longer says anything goes, so the config stays as written.
      s.nodes = s.nodes.filter(function (d) { return Object.keys(d).length > 1; });
      if (!s.nodes.length) delete s.nodes;
      return { config: cfg };
    }
    var data = cfg.series[0].data;
    var p = data[key];
    if (Array.isArray(p)) p = typeof p[0] === 'string' ? { name: p[0], y: p[1] } : { x: p[0], y: p[1] };
    else if (p === null || isNum(p)) p = { y: p };
    else p = clone(p);
    if (color) p.color = color; else delete p.color;
    var keys = Object.keys(p);
    data[key] = keys.length === 1 && keys[0] === 'y' ? p.y : p;
    return { config: cfg };
  }

  function valueOf(p) { var v = readPoint(p).y; return isNum(v) ? v : null; }

  /** Order categories by the (single) series' values: 'desc' or 'asc'. */
  function sortBy(type, config, dir) {
    if (!styleOptions(type, config).sort) return { error: 'This chart can\'t be sorted.' };
    var cfg = clone(config);
    var data = cfg.series[0].data || [];
    var order = data.map(function (p, j) { return j; });
    order.sort(function (a, b) {
      var va = valueOf(data[a]), vb = valueOf(data[b]);
      if (va === null && vb === null) return a - b;
      if (va === null) return 1;            // blanks last either way
      if (vb === null) return -1;
      return dir === 'asc' ? va - vb || a - b : vb - va || a - b;
    });
    cfg.series[0].data = order.map(function (j) { return data[j]; });
    if (cfg.xAxis && Array.isArray(cfg.xAxis.categories)) {
      var cats = cfg.xAxis.categories;
      cfg.xAxis.categories = order.map(function (j) { return cats[j]; });
    }
    return { config: cfg };
  }

  /**
   * Emphasis: the points at `indexes` take `accent`, every other point takes
   * `muted`. An empty list removes point colours, back to the series colour.
   */
  function highlight(type, config, indexes, accent, muted) {
    if (!styleOptions(type, config).highlight) return { error: 'This chart can\'t highlight single bars.' };
    var cfg = clone(config);
    var on = {};
    (indexes || []).forEach(function (i) { on[i] = true; });
    var any = (indexes || []).length > 0;
    cfg.series[0].data = (cfg.series[0].data || []).map(function (p, j) {
      var color = any ? (on[j] ? accent : muted) : null;
      if (Array.isArray(p)) p = { name: p[0], y: p[1] };
      if (p === null || isNum(p)) return color ? { y: p, color: color } : p;
      var o = clone(p);
      if (color) o.color = color; else delete o.color;
      var keys = Object.keys(o);
      return keys.length === 1 && keys[0] === 'y' ? o.y : o;
    });
    return { config: cfg };
  }

  /** Which points currently carry `accent`. */
  function highlighted(config, accent) {
    var data = (config.series && config.series[0] && config.series[0].data) || [];
    var out = [];
    data.forEach(function (p, j) {
      if (p && typeof p === 'object' && !Array.isArray(p) && p.color &&
          String(p.color).toLowerCase() === String(accent).toLowerCase()) out.push(j);
    });
    return out;
  }

  function withLabels(type, config, on) {
    if (!styleOptions(type, config).labels) return { error: 'This chart\'s value labels can\'t be changed here.' };
    var cfg = clone(config);
    cfg.plotOptions = cfg.plotOptions || {};
    cfg.plotOptions.series = cfg.plotOptions.series || {};
    var dl = cfg.plotOptions.series.dataLabels;
    cfg.plotOptions.series.dataLabels = Object.assign(dl && typeof dl === 'object' ? dl : {}, { enabled: !!on });
    return { config: cfg };
  }

  /** Series i takes `color`; null goes back to the palette's choice. */
  function seriesColour(type, config, i, color) {
    if (!styleOptions(type, config).colours || !config.series[i]) return { error: 'This series can\'t be recoloured.' };
    var cfg = clone(config);
    if (color) cfg.series[i].color = color; else delete cfg.series[i].color;
    return { config: cfg };
  }

  return { extract: extract, targets: targets, convert: convert, withData: withData, family: family, FIXED: FIXED,
    records: records, withRecords: withRecords,
    report: { targets: reportChartTargets, switchChart: switchReportChart,
      widths: columnWidths, initPercents: initPercents, setPercent: setPercent, clearWidths: clearWidths,
      percentPixels: percentPixels, MIN_WIDTH: MIN_WIDTH },
    insight: { statColour: statColour, statColourOf: statColourOf, statsBySign: statsBySign },
    tiles: { list: TILES, variant: tileVariant, set: setTileVariant },
    callouts: { anchors: calloutAnchors, list: calloutList, set: withCallouts },
    style: { options: styleOptions, sort: sortBy, highlight: highlight, highlighted: highlighted,
      labels: withLabels, seriesColour: seriesColour, marks: marks, markColour: markColour,
      fillOf: fillOf, fill: withFill } };

});
