/*!
 * email-snapshot.js — freezes an email snapshot page into a block that
 * survives being pasted into Outlook or Gmail.
 *
 * An email client is the most hostile place a chart can go. Gmail strips
 * <svg> and every <style> rule it does not like; Outlook for Windows renders
 * with Word and draws no SVG at all; the newer Outlooks have dropped inline
 * SVG too; nothing runs a script. What does survive everywhere is a table,
 * inline style attributes, hex colours, a handful of system fonts, and a PNG.
 *
 * So the page is built with charts-lib like any other, and then frozen: each
 * chart is rasterised with the library's own toPNG() at 2x, swapped into the
 * block as an <img> with its width, height and alt text, and every
 * `var(--token)` in the block's inline styles is resolved to the hex value the
 * theme gave it. What is left is static markup with nothing to execute and
 * nothing to fetch, which is what the reader copies:
 *
 *   EmailSnapshot.draw(Charts.line, 'c1', { … })   draw a chart that will be frozen
 *   EmailSnapshot.freeze()                         rasterise, resolve, lint → Promise<report>
 *   EmailSnapshot.html / .text / .document         the block, its plain-text twin, a whole file
 *   EmailSnapshot.copy()                           put html + text on the clipboard
 *   EmailSnapshot.check()                          the lint report on the frozen block, as JSON
 *
 * The block is the element with id="email-block"; only its contents are
 * copied. Everything outside it — the toolbar, the grey stage — is the page's
 * own chrome and never reaches the email.
 *
 * `lint(markup, { frozen })` is pure and also exported to Node, so
 * scripts/check-page.js applies the same rules to the source that this file
 * applies to the frozen result. One list of rules, two moments.
 *
 * No dependencies beyond charts-lib, which must load first.
 */
(function (root) {
  'use strict';

  // ── the rules, pure ──────────────────────────────────────────────────
  // Families an email client can be trusted to have. Outlook for Windows does
  // not fall through a font stack: when the FIRST family is missing it sets
  // the text in Times New Roman, so the first family is the one that counts.
  var SAFE_FONTS = ['arial', 'helvetica', 'verdana', 'tahoma', 'trebuchet ms',
    'georgia', 'times new roman', 'courier new', 'segoe ui', 'calibri', 'sans-serif', 'serif'];
  var BANNED_TAGS = ['script', 'style', 'link', 'svg', 'canvas', 'iframe', 'form',
    'input', 'select', 'button', 'textarea', 'video', 'audio', 'object', 'embed'];
  var MAX_WIDTH = 600;
  var CHART_DIV = /<div\b[^>]*\bclass="chart"[^>]*>\s*<\/div>/g;

  function attr(tag, name) {
    var m = new RegExp('\\s' + name + '\\s*=\\s*"([^"]*)"', 'i').exec(tag);
    return m ? m[1] : null;
  }
  function styleProp(style, prop) {
    var m = new RegExp('(?:^|;)\\s*' + prop + '\\s*:\\s*([^;]+)', 'i').exec(style || '');
    return m ? m[1].trim() : null;
  }

  function lint(markup, opts) {
    var frozen = !!(opts && opts.frozen);
    var fails = [], warns = [];
    var fail = function (rule, msg) { fails.push({ rule: rule, msg: msg }); };
    var warn = function (rule, msg) { warns.push({ rule: rule, msg: msg }); };
    var h = String(markup || '').replace(/<!--[\s\S]*?-->/g, '');
    if (!h.trim()) { fail('block', 'the email block is empty'); return { ok: false, fails: fails, warns: warns }; }

    // Chart placeholders: allowed in the source, gone once frozen.
    var charts = h.match(CHART_DIV) || [];
    var rest = h.replace(CHART_DIV, '');
    if (frozen && charts.length) {
      fail('charts frozen', charts.length + ' chart(s) still live — freeze() did not replace them with images');
    }
    charts.forEach(function (tag) {
      var id = attr(tag, 'id') || '?';
      var alt = attr(tag, 'data-alt') || '';
      if (alt.trim().split(/\s+/).length < 6 || !/\d/.test(alt)) {
        fail('alt text', id + ': data-alt must state the finding with its numbers (6+ words, at least one figure) — ' +
          'it is all a reader with images off, or a screen reader, ever gets');
      }
      var st = attr(tag, 'style') || '';
      var w = parseFloat(styleProp(st, 'width')), ht = parseFloat(styleProp(st, 'height'));
      if (!(w > 0) || !(ht > 0) || !/px/.test(styleProp(st, 'width') || '') || !/px/.test(styleProp(st, 'height') || '')) {
        fail('chart size', id + ': give the chart a fixed width and height in px (style="width:552px;height:260px") — the image is cut at that size');
      } else if (w > MAX_WIDTH) {
        fail('width', id + ' is ' + w + 'px wide; an email body is ' + MAX_WIDTH + 'px');
      }
    });

    // Tags no email client keeps, and tags that only exist to be clicked.
    BANNED_TAGS.forEach(function (t) {
      var n = (rest.match(new RegExp('<' + t + '\\b', 'gi')) || []).length;
      if (n) fail('email-safe tags', n + ' <' + t + '> — stripped or dead in a mail client' +
        (t === 'svg' ? '; charts go in as PNG (draw them with EmailSnapshot.draw)' : ''));
    });
    if (/<div\b/i.test(rest)) {
      fail('table layout', '<div> in the block — Outlook ignores a div\'s width and padding; lay it out in table cells');
    }
    if (/\sclass\s*=/i.test(rest)) {
      fail('inline styles only', 'class= in the block — classes need a <style> sheet, which Gmail and Outlook strip; put the style on the element');
    }
    if (/\son[a-z]+\s*=/i.test(rest)) fail('no interactivity', 'an inline event handler (onclick=…) — nothing runs in a mail client');

    // Inline style values.
    var styles = [];
    rest.replace(/\sstyle\s*=\s*"([^"]*)"/gi, function (_, s) { styles.push(s); return _; });
    var bad = function (re) { return styles.filter(function (s) { return re.test(s); }).length; };
    if (bad(/display\s*:\s*(flex|grid|inline-flex|inline-grid)/i) || bad(/(^|;)\s*(position|float)\s*:/i)) {
      fail('table layout', 'flex, grid, position or float in an inline style — Outlook lays out none of them');
    }
    if (bad(/\b(rgba?|hsla?|oklch|oklab|lab|lch|color-mix)\s*\(/i)) {
      fail('hex colours', 'a colour written as rgb()/hsl()/oklch() — Outlook drops it; write #rrggbb (freeze() resolves var(--token) to hex)');
    }
    if (bad(/url\s*\(/i)) fail('no background images', 'url() in a style — Outlook draws no CSS background image');
    if (frozen && (bad(/var\s*\(/i) || /\s(bgcolor|color)="var\(/i.test(rest))) {
      fail('tokens resolved', 'var(--…) left in the frozen block — no mail client has the page\'s variables');
    }
    styles.forEach(function (s) {
      var ff = styleProp(s, 'font-family');
      if (!ff || /^var\s*\(/i.test(ff)) return;
      var first = ff.split(',')[0].replace(/['"]/g, '').trim().toLowerCase();
      if (SAFE_FONTS.indexOf(first) < 0) {
        fail('system fonts', 'font-family starts with "' + first + '" — Outlook sets text in Times New Roman when the first family is missing; lead with Arial, Helvetica, Georgia, Segoe UI…');
      }
    });

    // Widths.
    var wide = [];
    rest.replace(/<(table|td|img)\b[^>]*>/gi, function (tag) {
      var a = parseFloat(attr(tag, 'width')), s = parseFloat(styleProp(attr(tag, 'style'), 'width'));
      var px = /%/.test(attr(tag, 'width') || '') ? NaN : a;
      if (px > MAX_WIDTH || (/px/.test(styleProp(attr(tag, 'style'), 'width') || '') && s > MAX_WIDTH)) wide.push(Math.max(px || 0, s || 0));
      return tag;
    });
    if (wide.length) fail('width', 'something ' + Math.max.apply(null, wide) + 'px wide — an email body is ' + MAX_WIDTH + 'px, and anything wider scrolls sideways on a phone');

    // Every text cell names its font: Outlook does not inherit a font from a
    // table into its cells, so a cell without one is set in Times New Roman.
    var bare = 0;
    rest.replace(/<td\b([^>]*)>\s*([\s\S]{0,12})/gi, function (all, attrs, next) {
      if (/^(<table|<img|<\/td|$)/i.test(next)) return all;
      if (!/font-family\s*:/i.test(attr('<td' + attrs + '>', 'style') || '')) bare++;
      return all;
    });
    if (bare) fail('cell fonts', bare + ' text cell(s) with no font-family — Outlook does not inherit fonts into a <td>; set it on every cell that holds text');

    // Images.
    var imgs = rest.match(/<img\b[^>]*>/gi) || [];
    imgs.forEach(function (tag, i) {
      var name = 'image ' + (i + 1);
      if (!/^\d+$/.test(attr(tag, 'width') || '')) fail('image size', name + ' has no numeric width= attribute — Outlook for Windows draws the PNG at its full 2x size without one');
      if (!(attr(tag, 'alt') || '').trim()) fail('alt text', name + ' has no alt text');
      var src = attr(tag, 'src') || '';
      if (/^https?:/i.test(src)) warn('remote image', name + ' loads from ' + src.slice(0, 60) + ' — most clients block remote images until the reader allows them');
      else if (frozen && !/^data:image\/(png|jpe?g|gif);/i.test(src)) fail('image format', name + ' is not a PNG/JPEG/GIF — mail clients show no SVG');
    });

    // Links go somewhere real, or nowhere.
    rest.replace(/<a\b[^>]*>/gi, function (tag) {
      var href = attr(tag, 'href') || '';
      if (!/^(https?:|mailto:)/i.test(href)) fail('links', 'a link to "' + href.slice(0, 40) + '" — only http(s) and mailto links work once the block leaves this page');
      return tag;
    });

    return { ok: !fails.length, fails: fails, warns: warns };
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = { lint: lint, SAFE_FONTS: SAFE_FONTS, MAX_WIDTH: MAX_WIDTH };
  }
  if (typeof document === 'undefined') return;

  // ── the page, in a browser ───────────────────────────────────────────
  var drawn = [];
  var state = { frozen: false, html: '', text: '', document: '', images: [], report: null };

  /**
   * Draw a chart that freeze() will rasterise. Same shape as the draw()
   * helper in references/controls.md, so the static checker sees the chart.
   * Animation is off: the PNG is taken once, and it must be the finished chart.
   */
  function draw(factory, id, config) {
    var cfg = Object.assign({}, config);
    cfg.chart = Object.assign({}, config && config.chart, { animation: false });
    var handle = factory(id, cfg);
    drawn.push({ id: id, handle: handle });
    return handle;
  }

  var probe = null;
  function toHex(value) {
    var v = String(value || '').trim();
    if (!v) return v;
    if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
    probe = probe || document.createElement('canvas').getContext('2d');
    probe.fillStyle = '#000000';
    probe.fillStyle = v;
    var out = probe.fillStyle;              // '#rrggbb' when opaque, 'rgba(…)' when not
    var m = /^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(out);
    if (!m) return out;
    // A translucent colour has no hex an email client honours: flatten it
    // onto the card it sits on, which is what the reader would have seen.
    var a = m[4] == null ? 1 : +m[4];
    var bg = [255, 255, 255];
    var card = getComputedStyle(document.documentElement).getPropertyValue('--card').trim();
    var cm = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(card);
    if (cm) bg = [parseInt(cm[1], 16), parseInt(cm[2], 16), parseInt(cm[3], 16)];
    return '#' + [1, 2, 3].map(function (i) {
      var c = Math.round(+m[i] * a + bg[i - 1] * (1 - a));
      return (c < 16 ? '0' : '') + c.toString(16);
    }).join('');
  }

  function resolveVars(rootEl) {
    var cs = getComputedStyle(document.documentElement);
    var sub = function (s) {
      return s.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/g, function (_, name, fallback) {
        var v = cs.getPropertyValue(name).trim() || (fallback || '').trim();
        // Font stacks are not colours; everything else the block tokenises is.
        return /font/.test(name) ? v : toHex(v);
      });
    };
    Array.prototype.forEach.call(rootEl.querySelectorAll('*'), function (n) {
      ['style', 'bgcolor', 'color'].forEach(function (a) {
        var v = n.getAttribute(a);
        if (v && v.indexOf('var(') >= 0) n.setAttribute(a, sub(v));
      });
    });
  }

  function blobToDataURL(blob) {
    return new Promise(function (ok, no) {
      var r = new FileReader();
      r.onload = function () { ok(r.result); };
      r.onerror = function () { no(r.error); };
      r.readAsDataURL(blob);
    });
  }
  function frames(n) {
    return new Promise(function (ok) {
      (function step(k) { if (!k) return ok(); requestAnimationFrame(function () { step(k - 1); }); })(n);
    });
  }

  // The copy that leaves the page: no ids, no data-*, no classes, and no
  // comments — the template's rules for the author are not the reader's.
  function exportClone(block) {
    var clone = block.cloneNode(true);
    var walker = document.createTreeWalker(clone, NodeFilter.SHOW_COMMENT);
    var comments = [];
    while (walker.nextNode()) comments.push(walker.currentNode);
    comments.forEach(function (c) { c.parentNode.removeChild(c); });
    Array.prototype.forEach.call(clone.querySelectorAll('*'), function (n) {
      Array.prototype.slice.call(n.attributes).forEach(function (a) {
        if (a.name === 'id' || a.name === 'class' || a.name.indexOf('data-') === 0) n.removeAttribute(a.name);
      });
    });
    return clone;
  }

  // A plain-text twin, for clients set to plain text and for the clipboard's
  // text slot. Each image becomes its alt text, which is why alt text has to
  // carry the numbers.
  function plainText(block) {
    var clone = block.cloneNode(true);
    Array.prototype.forEach.call(clone.querySelectorAll('img'), function (img) {
      img.replaceWith(document.createTextNode('\n[Chart] ' + (img.getAttribute('alt') || '') + '\n'));
    });
    var host = document.createElement('div');
    host.style.cssText = 'position:absolute;left:-99999px;top:0;white-space:normal;width:600px';
    host.appendChild(clone);
    document.body.appendChild(host);
    var text = host.innerText;
    host.remove();
    return text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  function freeze() {
    if (state.frozen) return Promise.resolve(state.report);
    var block = document.getElementById('email-block');
    if (!block) return Promise.reject(new Error('email-snapshot: no element with id="email-block"'));
    var problems = [];
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    // Charts lay out on a debounced resize observer, so let it settle.
    return fontsReady.then(function () { return frames(2); })
      .then(function () { return new Promise(function (ok) { setTimeout(ok, 250); }); })
      .then(function () {
        var claimed = drawn.map(function (d) { return d.id; });
        Array.prototype.forEach.call(block.querySelectorAll('.chart'), function (n) {
          if (claimed.indexOf(n.id) < 0) problems.push({ rule: 'charts frozen', msg: (n.id || 'a chart') + ' was not drawn with EmailSnapshot.draw, so it cannot be frozen' });
        });
        return drawn.reduce(function (p, d) {
          return p.then(function () {
            var host = document.getElementById(d.id);
            if (!host || !block.contains(host)) return;
            if (d.handle && d.handle.error) {
              problems.push({ rule: 'chart drew', msg: d.id + ': ' + d.handle.error });
              return;
            }
            var w = Math.round(host.offsetWidth), h = Math.round(host.offsetHeight);
            return d.handle.toPNG({ scale: 2 }).then(function (blob) {
              return blobToDataURL(blob).then(function (url) {
                var img = document.createElement('img');
                img.setAttribute('src', url);
                img.setAttribute('width', String(w));
                img.setAttribute('height', String(h));
                img.setAttribute('alt', host.getAttribute('data-alt') || '');
                img.setAttribute('style', 'display:block;width:' + w + 'px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;');
                state.images.push({ id: d.id, blob: blob, kb: Math.round(blob.size / 1024) });
                if (d.handle.destroy) d.handle.destroy();
                host.replaceWith(img);
              });
            }).catch(function (e) {
              problems.push({ rule: 'chart drew', msg: d.id + ': ' + (e && e.message || e) });
            });
          });
        }, Promise.resolve());
      })
      .then(function () {
        resolveVars(block);
        var clone = exportClone(block);
        state.html = clone.innerHTML.trim();
        state.text = plainText(block);
        var title = (document.title || 'Snapshot').replace(/[<&]/g, '');
        var ground = toHex(getComputedStyle(document.documentElement).getPropertyValue('--ground').trim() || '#ffffff');
        state.document = '<!doctype html>\n<html lang="' + (document.documentElement.lang || 'en') + '">\n<head>\n' +
          '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
          '<title>' + title + '</title>\n</head>\n<body style="margin:0;padding:24px 0;background-color:' + ground + ';">\n' +
          state.html + '\n</body>\n</html>\n';
        state.frozen = true;
        state.report = check(problems);
        document.documentElement.setAttribute('data-email', state.report.ok ? 'frozen' : 'problems');
        return state.report;
      });
  }

  function check(extra) {
    if (!state.frozen && !extra) return { ok: false, fails: [{ rule: 'frozen', msg: 'freeze() has not finished' }], warns: [] };
    var r = lint(state.html, { frozen: true });
    if (extra && extra.length) { r.fails = extra.concat(r.fails); r.ok = false; }
    var bytes = new Blob([state.html]).size;
    r.kb = Math.round(bytes / 1024);
    r.images = state.images.map(function (i) { return { id: i.id, kb: i.kb }; });
    // Gmail clips a message whose HTML passes ~102 KB behind "[Message
    // clipped]". A pasted image becomes an attachment and does not count, so
    // this bites only when the saved file is sent as raw HTML.
    if (bytes > 102 * 1024) r.warns.push({ rule: 'size', msg: 'the block is ' + r.kb + ' KB as raw HTML; Gmail clips a message past ~102 KB. Pasting is fine (images become attachments); sending the saved file through a mail tool is not' });
    state.images.forEach(function (i) {
      if (i.kb > 400) r.warns.push({ rule: 'size', msg: i.id + ' is ' + i.kb + ' KB as PNG — a smaller box or fewer marks keeps the email light' });
    });
    if (state.images.length > 3) r.warns.push({ rule: 'scope', msg: state.images.length + ' charts — a snapshot carries one to three; past that, send the page itself' });
    return r;
  }

  function copy() {
    if (!state.frozen) return Promise.reject(new Error('freeze() has not finished'));
    // The copy event first: it is synchronous, works from file://, and hands
    // the clipboard our markup untouched. The async API is the fallback.
    var done = false;
    var on = function (e) {
      e.clipboardData.setData('text/html', state.html);
      e.clipboardData.setData('text/plain', state.text);
      e.preventDefault();
      done = true;
    };
    document.addEventListener('copy', on);
    try { document.execCommand('copy'); } catch (e) { /* fall through */ }
    document.removeEventListener('copy', on);
    if (done) return Promise.resolve(true);
    if (navigator.clipboard && root.ClipboardItem) {
      return navigator.clipboard.write([new root.ClipboardItem({
        'text/html': new Blob([state.html], { type: 'text/html' }),
        'text/plain': new Blob([state.text], { type: 'text/plain' })
      })]).then(function () { return true; });
    }
    return Promise.reject(new Error('this browser would not write to the clipboard'));
  }

  function save(name, blob) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function slug() {
    return (document.title || 'snapshot').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'snapshot';
  }
  function saveDocument() { save(slug() + '.email.html', new Blob([state.document], { type: 'text/html' })); }
  function saveImages() {
    state.images.forEach(function (i, k) {
      setTimeout(function () { save(slug() + '-' + i.id + '.png', i.blob); }, k * 300);
    });
  }

  // The toolbar, if the page has one. Wired here so a page cannot ship a
  // half-wired Copy button.
  function wire() {
    var bar = document.getElementById('snap-bar');
    if (!bar) return;
    var status = bar.querySelector('[data-snap="status"]');
    var say = function (t) { if (status) status.textContent = t; };
    var on = function (what, fn) {
      var b = bar.querySelector('[data-snap="' + what + '"]');
      if (b) b.addEventListener('click', fn);
      return b;
    };
    var buttons = [
      on('copy', function () {
        copy().then(function () { say('Copied. Paste into the body of a new message.'); },
          function (e) { say('Could not copy: ' + e.message + '. Select the block and press Ctrl+C instead.'); });
      }),
      on('save-html', saveDocument),
      on('save-png', saveImages)
    ];
    buttons.forEach(function (b) { if (b) b.disabled = true; });
    say('Freezing the charts…');
    freeze().then(function (r) {
      buttons.forEach(function (b) { if (b) b.disabled = false; });
      say(r.ok ? 'Ready — ' + r.images.length + ' chart(s) frozen as PNG.'
               : 'Frozen with problems: ' + r.fails.map(function (f) { return f.msg; }).join(' · '));
    }, function (e) { say('Could not freeze: ' + e.message); });
  }

  root.EmailSnapshot = {
    draw: draw,
    freeze: freeze,
    check: function () { return check(); },
    copy: copy,
    saveDocument: saveDocument,
    saveImages: saveImages,
    lint: lint,
    get html() { return state.html; },
    get text() { return state.text; },
    get document() { return state.document; },
    get frozen() { return state.frozen; }
  };
  if (document.readyState === 'complete') setTimeout(wire, 0);
  else root.addEventListener('load', wire);
})(typeof window !== 'undefined' ? window : this);
