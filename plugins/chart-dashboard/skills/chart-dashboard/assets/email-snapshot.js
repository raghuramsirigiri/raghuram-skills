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
 * An editable snapshot (templates/email-editable.html) keeps its charts in
 * page-runtime.js's spec instead, so the reader can change them. There the
 * live charts stay SVG for the editor; each freeze draws a copy off screen,
 * and every edit rebuilds the frozen email a moment later (EmailSnapshot.stale
 * is true until it has).
 *
 * The block is the element with id="email-block"; only its contents are
 * copied. Everything outside it — the toolbar, the grey stage — is the page's
 * own chrome and never reaches the email.
 *
 * A Teams post (templates/teams.html) is the same freeze with a different
 * destination: its block is id="teams-block", written as plain semantic HTML
 * because the Teams compose box drops every style, and lint(markup,
 * { target: 'teams' }) holds its rules. The page calls the runtime
 * TeamsSnapshot, which is this same object. A post leaves two ways: as text,
 * rewritten for how Teams draws a message (teamsText), or as one picture of
 * the whole card as designed (cardPNG, copyCard). Its toolbar also has a
 * copy-as-picture button per chart.
 *
 * A social post (templates/social.html) is the same freeze again, for a
 * feed: its block is id="social-block", and what leaves is not markup at all
 * but one picture per card, painted at the exact pixels a platform wants
 * (1080x1350, 1080x1080, 1200x675), plus the words that go with it, counted
 * the way each platform counts them. lint(markup, { target: 'social' })
 * holds its rules, and the page calls the runtime SocialSnapshot.
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
    if (opts && opts.target === 'teams') return lintTeams(markup, opts);
    if (opts && opts.target === 'social') return lintSocial(markup, opts);
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
      // An editable snapshot keeps the alt text in a marked element the reader
      // can edit (data-alt-key names its data-key), not in an attribute.
      var altKey = attr(tag, 'data-alt-key');
      if (altKey) {
        var km = new RegExp('\\sdata-key="' + altKey.replace(/[.*+?^${}()|[\]\\]/g, function (c) { return '\\' + c; }) + '"[^>]*>([^<]*)<').exec(h);
        alt = km ? km[1] : '';
      }
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

  // ── the Teams rules ──────────────────────────────────────────────────
  // A Teams message is not an email. Its compose box keeps the meaning of the
  // markup (headings, paragraphs, bold, lists, links, a simple table,
  // pictures) and throws away how it was styled: no class, no inline style
  // and no colour survives the paste, and Teams sets every message in its own
  // font and theme (light, dark or high contrast). So the block is plain
  // semantic HTML, and the charts carry the design, as PNGs.
  var TEAMS_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h2', 'h3', 'ul', 'ol', 'li',
    'a', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'code'];
  var TEAMS_WIDTH = 540;

  function lintTeams(markup, opts) {
    var frozen = !!(opts && opts.frozen);
    var fails = [], warns = [];
    var fail = function (rule, msg) { fails.push({ rule: rule, msg: msg }); };
    var warn = function (rule, msg) { warns.push({ rule: rule, msg: msg }); };
    var h = String(markup || '').replace(/<!--[\s\S]*?-->/g, '');
    if (!h.trim()) { fail('block', 'the Teams block is empty'); return { ok: false, fails: fails, warns: warns }; }

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
          'it is what a screen reader, the plain-text copy and a search of the chat get');
      }
      var st = attr(tag, 'style') || '';
      var w = parseFloat(styleProp(st, 'width')), ht = parseFloat(styleProp(st, 'height'));
      if (!(w > 0) || !(ht > 0) || !/px/.test(styleProp(st, 'width') || '') || !/px/.test(styleProp(st, 'height') || '')) {
        fail('chart size', id + ': give the chart a fixed width and height in px (style="width:540px;height:240px") — the image is cut at that size');
      } else if (w > TEAMS_WIDTH) {
        fail('width', id + ' is ' + w + 'px wide; Teams shrinks a picture wider than ~' + TEAMS_WIDTH + 'px to fit the message, and its labels with it');
      }
    });

    // Only the tags the compose box keeps. Anything else is dropped, or
    // flattened into a paragraph, by the time the message is sent.
    var seen = {};
    rest.replace(/<([a-z][a-z0-9]*)\b/gi, function (all, t) {
      t = t.toLowerCase();
      if (TEAMS_TAGS.indexOf(t) < 0) seen[t] = (seen[t] || 0) + 1;
      return all;
    });
    Object.keys(seen).forEach(function (t) {
      fail('teams tags', seen[t] + ' <' + t + '> — ' +
        (t === 'h1' ? 'Teams sets an h1 as large as a page title; use h2 for the headline and h3 per chart'
          : t === 'svg' ? 'Teams shows no SVG; charts go in as PNG (draw them with TeamsSnapshot.draw)'
          : t === 'div' || t === 'span' ? 'the compose box flattens it; write <p>, <h3> or a list'
          : 'not kept by the Teams compose box'));
    });
    if (/\sclass\s*=/i.test(rest)) fail('no styling', 'class= in the block — Teams keeps no class or style sheet; the meaning has to be in the tags');
    if (/\sstyle\s*=/i.test(rest)) fail('no styling', 'style= in the block — Teams drops inline styles on paste, so colour, size and spacing never arrive; say it with <h3>, <strong> and <em>');
    if (/\s(bgcolor|color|face|align)\s*=/i.test(rest)) fail('no styling', 'a presentational attribute (color=, bgcolor=, align=) — Teams ignores it');
    if (/\son[a-z]+\s*=/i.test(rest)) fail('no interactivity', 'an inline event handler (onclick=…) — nothing runs in a chat message');
    var depth = 0, nested = false;
    rest.replace(/<(\/?)table\b/gi, function (all, close) {
      depth += close ? -1 : 1;
      if (depth > 1) nested = true;
      return all;
    });
    if (nested) fail('simple tables', 'a table inside a table — Teams tables do not nest; lay the post out as paragraphs');
    var tables = (rest.match(/<table\b/gi) || []).length;
    if (tables > 1) warn('simple tables', tables + ' tables — a chat post reads best with at most one');

    var imgs = rest.match(/<img\b[^>]*>/gi) || [];
    imgs.forEach(function (tag, i) {
      var name = 'image ' + (i + 1);
      var w = attr(tag, 'width') || '';
      if (!/^\d+$/.test(w)) fail('image size', name + ' has no numeric width= attribute — without one the 2x PNG pastes at double size');
      else if (+w > TEAMS_WIDTH) fail('width', name + ' is ' + w + 'px wide; Teams fits a message at about ' + TEAMS_WIDTH + 'px');
      if (!(attr(tag, 'alt') || '').trim()) fail('alt text', name + ' has no alt text');
      var src = attr(tag, 'src') || '';
      if (/^https?:/i.test(src)) warn('remote image', name + ' loads from ' + src.slice(0, 60) + ' — Teams shows it only if every reader can reach that address');
      else if (frozen && !/^data:image\/(png|jpe?g|gif);/i.test(src)) fail('image format', name + ' is not a PNG/JPEG/GIF — Teams shows no SVG');
    });
    if (charts.length + imgs.length > 3) warn('scope', (charts.length + imgs.length) + ' charts — a chat post carries one to three; past that, share the page itself');

    rest.replace(/<a\b[^>]*>/gi, function (tag) {
      var href = attr(tag, 'href') || '';
      if (!/^(https?:|mailto:)/i.test(href)) fail('links', 'a link to "' + href.slice(0, 40) + '" — only http(s) and mailto links work once the post leaves this page');
      return tag;
    });

    // A message, not a document: Teams refuses a message whose text passes
    // about 28 KB. Pasted pictures upload separately and do not count.
    var textKB = Math.round(rest.replace(/<img\b[^>]*>/gi, '').length / 1024);
    if (textKB > 24) warn('size', 'the text is ~' + textKB + ' KB; Teams refuses a message past about 28 KB — cut it, or share the page');

    return { ok: !fails.length, fails: fails, warns: warns };
  }

  // ── the social rules ─────────────────────────────────────────────────
  // A feed is the one place the picture IS the post. It is reposted,
  // screenshotted and quoted without the words under it, so everything the
  // reader needs (the finding, the units, the source, the date) is painted
  // into the card. Nothing survives as markup, so the block may use classes
  // and the page's style sheet freely; what it may not do is depend on a
  // pointer, a tooltip or a caption that has not travelled with it.
  //
  // Each card is laid out at about the size a phone shows it (432 or 480 CSS
  // px wide) and painted at 2.5x, which lands on the pixels the platforms
  // ask for. Designed at 1080px instead, its 11px chart labels would arrive
  // on a phone at 4px.
  var SOCIAL_SCALE = 2.5;
  var SOCIAL_SIZES = {
    portrait:  { w: 432, h: 540, ratio: '4:5',  for: 'LinkedIn and Instagram feeds, where a taller picture takes more of the screen' },
    square:    { w: 432, h: 432, ratio: '1:1',  for: 'any feed; the safe shape when one picture goes everywhere' },
    landscape: { w: 480, h: 270, ratio: '16:9', for: 'X, Bluesky and Threads, which show it uncropped in the timeline' }
  };
  // How long a post may be, and how each platform counts. Checked 2026-10
  // against third-party references, since the platforms publish few of these;
  // references/layout-social.md keeps the same table, with what is unsure.
  //   x         weighted: CJK and emoji count 2, every link 23 (twitter-text)
  //   grapheme  Bluesky counts what a reader sees as one character
  //   url23     Mastodon counts every link as 23, whatever its length
  //   fold      the characters shown before "…see more" / "…more"
  var PLATFORMS = {
    linkedin:  { name: 'LinkedIn',  limit: 3000, count: 'char', fold: 140, tags: 3 },
    x:         { name: 'X',         limit: 280,  count: 'x', tags: 2 },
    bluesky:   { name: 'Bluesky',   limit: 300,  count: 'grapheme', tags: 3 },
    threads:   { name: 'Threads',   limit: 500,  count: 'char', tags: 1 },
    mastodon:  { name: 'Mastodon',  limit: 500,  count: 'url23', tags: 5 },
    instagram: { name: 'Instagram', limit: 2200, count: 'char', fold: 125, tags: 5 }
  };
  var ALT_MAX = 1000;          // X's limit per picture, the lowest of the published ones
  var ALT_WARN = 300;          // LinkedIn's is unpublished; ~300 is the figure guides give
  var URL_RE = /\bhttps?:\/\/[^\s<>"]+/gi;
  var CARD_OPEN = /<div\b[^>]*\bclass="card"[^>]*>/gi;

  function graphemes(s) {
    if (typeof Intl === 'object' && Intl.Segmenter) {
      return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s), function (x) { return x.segment; });
    }
    return Array.from(s);
  }
  // twitter-text's v3 weights: these ranges (Latin, Greek, Cyrillic, most
  // punctuation) count 1; everything else, CJK and emoji included, counts 2.
  function lightCP(cp) { return cp <= 4351 || (cp >= 8192 && cp <= 8205) || (cp >= 8208 && cp <= 8223) || (cp >= 8242 && cp <= 8247); }

  /** The length a platform reports for a post, counted its way. */
  function postLength(text, platform) {
    var how = (PLATFORMS[platform] || {}).count || 'char';
    var urls = 0;
    var t = String(text || '').normalize ? String(text || '').normalize('NFC') : String(text || '');
    if (how === 'x' || how === 'url23') t = t.replace(URL_RE, function () { urls++; return ''; });
    if (how === 'grapheme') return graphemes(t).length;
    if (how === 'x') {
      return urls * 23 + graphemes(t).reduce(function (n, g) {
        var cps = Array.from(g);
        return n + (cps.length === 1 && lightCP(cps[0].codePointAt(0)) ? 1 : 2);
      }, 0);
    }
    return urls * 23 + Array.from(t).length;
  }

  var NAMED = { rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–',
    hellip: '…', middot: '·', rarr: '→', minus: '−', times: '×' };
  function decodeText(s) {
    return String(s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, function (_, n) { return String.fromCodePoint(+n); })
      .replace(/&#x([0-9a-f]+);/gi, function (_, n) { return String.fromCodePoint(parseInt(n, 16)); })
      .replace(/&(rsquo|lsquo|rdquo|ldquo|mdash|ndash|hellip|middot|rarr|minus|times);/g, function (_, n) { return NAMED[n]; })
      .replace(/&amp;/g, '&');
  }
  // Every figure in a piece of text, normalised so "1,240" and "1240" match,
  // and "93.0" and "93". Links are not figures.
  function figuresIn(s) {
    var out = [];
    String(s || '').replace(URL_RE, ' ').replace(/\d[\d,]*(?:\.\d+)?/g, function (m) {
      var v = parseFloat(m.replace(/,(?=\d{3}\b)/g, '').replace(/,/g, ''));
      if (isFinite(v)) out.push(String(v));
      return m;
    });
    return out;
  }

  // What a post's words do that a reader scrolls past. Warnings, not
  // failures: each is a habit of machine-written posts, and each has the
  // rare honest use.
  var VOICE = [
    [/\b(agree|thoughts|right)\?\s*$/im, 'ends on a question asked only to draw comments'],
    [/\b(comment|drop a comment) below\b|\blike if\b|\btag (someone|a friend)\b|\brepost if\b|\bfollow (me )?for more\b/i, 'asks for engagement instead of earning it'],
    [/^\s*(in today'?s (fast-paced )?world|let'?s dive in|here'?s the thing|unpopular opinion|i'?m (thrilled|excited|humbled) to)/im, 'opens on a stock phrase; open on the finding'],
    [/\b(delve|game[- ]chang\w*|revolutioni[sz]\w*|unlock(s|ing)? the power)\b/i, 'uses a word that reads as machine-written']
  ];

  function lintSocial(markup, opts) {
    var frozen = !!(opts && opts.frozen);
    var fails = [], warns = [];
    var fail = function (rule, msg) { fails.push({ rule: rule, msg: msg }); };
    var warn = function (rule, msg) { warns.push({ rule: rule, msg: msg }); };
    var h = String(markup || '').replace(/<!--[\s\S]*?-->/g, '');
    if (!h.trim()) { fail('block', 'the social block is empty'); return { ok: false, fails: fails, warns: warns }; }

    var postsAt = h.search(/<div\b[^>]*\bclass="posts"/i);
    var cardsPart = postsAt >= 0 ? h.slice(0, postsAt) : h;
    var postsPart = postsAt >= 0 ? h.slice(postsAt) : '';
    var opens = [], m;
    CARD_OPEN.lastIndex = 0;
    while ((m = CARD_OPEN.exec(cardsPart))) opens.push(m.index);
    if (!opens.length) fail('cards', 'no <div class="card" data-size="…"> in the block — the card is the picture that gets posted');
    if (opens.length > 3) warn('scope', opens.length + ' cards — a post carries one to three cards, one finding each; past that it is a carousel or a page');

    var onCards = {};
    opens.forEach(function (at, i) {
      var c = cardsPart.slice(at, i + 1 < opens.length ? opens[i + 1] : cardsPart.length);
      var name = 'card ' + (i + 1);
      var open = c.slice(0, c.indexOf('>') + 1);
      var size = attr(open, 'data-size');
      if (!SOCIAL_SIZES[size]) fail('card size', name + ' has data-size="' + (size || '') + '" — use portrait (1080x1350), square (1080x1080) or landscape (1200x675)');

      var charts = c.match(CHART_DIV) || [];
      var rest = c.replace(CHART_DIV, '');
      var imgs = rest.match(/<img\b[^>]*>/gi) || [];
      if (frozen && charts.length) fail('charts frozen', name + ': ' + charts.length + ' chart(s) still live — freeze() did not replace them with images');
      if (charts.length + (frozen ? imgs.length : 0) > 1) {
        fail('one finding per card', name + ' holds ' + (charts.length + (frozen ? imgs.length : 0)) + ' charts — a feed picture is read in a second and a half; give each finding its own card');
      }
      var alts = [];
      charts.forEach(function (tag) {
        var id = attr(tag, 'id') || '?';
        alts.push(attr(tag, 'data-alt') || '');
        checkAlt(id, attr(tag, 'data-alt') || '');
        if (/\sstyle\s*=\s*"[^"]*\bwidth\s*:/i.test(tag)) warn('chart size', id + ' sets its own width — the card sizes the chart; leave the placeholder to fill it');
      });
      imgs.forEach(function (tag, k) {
        var src = attr(tag, 'src') || '';
        if (/^https?:/i.test(src)) fail('images', name + ': image ' + (k + 1) + ' loads from ' + src.slice(0, 60) + ' — a remote picture stops the card painting; embed it as a data: URI');
        else if (frozen && !/^data:image\//i.test(src)) fail('images', name + ': image ' + (k + 1) + ' is not an embedded picture');
        if (frozen) alts.push(attr(tag, 'alt') || '');
      });
      function checkAlt(id, alt) {
        if (alt.trim().split(/\s+/).length < 6 || !/\d/.test(alt)) {
          fail('alt text', id + ': data-alt must state the finding with its numbers (6+ words, at least one figure) — it is what a screen reader, and a feed with images off, gets');
        } else if (alt.length > ALT_MAX) {
          fail('alt text', id + ': data-alt is ' + alt.length + ' characters; X takes ' + ALT_MAX + ' per picture');
        } else if (alt.length > ALT_WARN) {
          warn('alt text', id + ': data-alt is ' + alt.length + ' characters; LinkedIn may cut it near ' + ALT_WARN);
        }
      }

      var head = /<h2\b[^>]*>([\s\S]*?)<\/h2>/i.exec(c);
      var headline = head ? decodeText(head[1]).replace(/\s+/g, ' ').trim() : '';
      if (!headline) fail('headline', name + ' has no <h2> — the headline states the finding, in the picture, because the picture travels without the post');
      else {
        var max = size === 'landscape' ? 80 : 95;
        if (headline.length > max) warn('headline', name + ': the headline is ' + headline.length + ' characters; past ~' + max + ' it runs to a third line and takes the chart\'s room');
      }
      var src = /<p\b[^>]*\bclass="source"[^>]*>([\s\S]*?)<\/p>/i.exec(c);
      var source = src ? decodeText(src[1]).replace(/\s+/g, ' ').trim() : '';
      if (!source) fail('source', name + ' has no <p class="source"> — a reposted chart with no source is a rumour; name where the numbers came from');
      else if (!/\b(19|20)\d{2}\b|\bQ[1-4]\b|\bFY\s?\d{2}\b/i.test(source + ' ' + decodeText(c))) {
        warn('source', name + ' carries no date or period — a screenshot is reposted for months; say when the figures are from');
      }

      BANNED_TAGS.forEach(function (t) {
        var n = (rest.match(new RegExp('<' + t + '\\b', 'gi')) || []).length;
        if (n) fail('nothing to click', name + ': ' + n + ' <' + t + '> — ' +
          (t === 'svg' ? 'a chart goes in as a placeholder drawn with SocialSnapshot.draw, and is frozen to a picture' : 'a picture has no pointer and runs no script'));
      });
      if (/\son[a-z]+\s*=/i.test(rest)) fail('nothing to click', name + ': an inline event handler — nothing runs in a picture');
      if (/\stitle\s*=/i.test(rest)) warn('nothing to click', name + ': a title= tooltip — hover text never reaches the picture; put it on the card or drop it');

      figuresIn(decodeText(c) + ' ' + alts.join(' ')).forEach(function (f) { onCards[f] = 1; });
    });

    // The words that go with the picture, one <pre class="post"> per platform.
    var posts = [], pm, PRE = /<pre\b([^>]*)>([\s\S]*?)<\/pre>/gi;
    while ((pm = PRE.exec(postsPart))) posts.push({ platform: attr('<pre' + pm[1] + '>', 'data-platform'), text: decodeText(pm[2]).replace(/^\s*\n|\s+$/g, '') });
    if (!posts.length) warn('post text', 'no <pre class="post" data-platform="…"> — write the words that go with the picture, one per platform');
    var seenP = {};
    posts.forEach(function (p) {
      var spec = PLATFORMS[p.platform];
      if (!spec) { fail('platform', 'a post for "' + (p.platform || '') + '" — use one of ' + Object.keys(PLATFORMS).join(', ')); return; }
      if (seenP[p.platform]) warn('platform', 'two posts for ' + spec.name + ' — keep the one you mean');
      seenP[p.platform] = 1;
      var n = postLength(p.text, p.platform);
      if (!p.text.trim()) fail('post text', 'the ' + spec.name + ' post is empty');
      else if (n > spec.limit) fail('length', 'the ' + spec.name + ' post is ' + n + ' characters as ' + spec.name + ' counts them; it takes ' + spec.limit);
      if (spec.fold && p.text.trim()) {
        var lead = Array.from(p.text).slice(0, spec.fold).join('');
        if (!/\d/.test(lead)) warn('hook', 'the first ' + spec.fold + ' characters of the ' + spec.name + ' post carry no figure — they are all a reader sees before "…more"; lead with the finding');
      }
      var missing = figuresIn(p.text).filter(function (f) { return !onCards[f] && !(+f < 10 && /^\d$/.test(f)); });
      if (missing.length) {
        fail('numbers on the card', 'the ' + spec.name + ' post states ' + missing.slice(0, 5).join(', ') +
          ', which no card shows — every figure in the words must be on the picture (headline, units, caption or alt text), or it is unsourced');
      }
      var tags = (p.text.match(/(^|\s)#[\p{L}\p{N}_]+/gu) || []).length;
      if (tags > spec.tags) warn('hashtags', 'the ' + spec.name + ' post has ' + tags + ' hashtags; past ' + spec.tags + ' it reads as reach-seeking rather than reporting');
      var emojiLines = (p.text.match(/^\s*\p{Extended_Pictographic}/gmu) || []).length;
      if (emojiLines > 1) warn('voice', 'the ' + spec.name + ' post starts ' + emojiLines + ' lines with an emoji — emoji bullets read as templated; write the sentence');
      VOICE.forEach(function (v) { if (v[0].test(p.text)) warn('voice', 'the ' + spec.name + ' post ' + v[1]); });
      if (/(^|\s)(https?:\/\/)?(localhost|127\.0\.0\.1)\b/i.test(p.text)) fail('links', 'the ' + spec.name + ' post links to a local address no reader can open');
    });

    return { ok: !fails.length, fails: fails, warns: warns };
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = { lint: lint, SAFE_FONTS: SAFE_FONTS, MAX_WIDTH: MAX_WIDTH, TEAMS_WIDTH: TEAMS_WIDTH,
      SOCIAL_SIZES: SOCIAL_SIZES, SOCIAL_SCALE: SOCIAL_SCALE, PLATFORMS: PLATFORMS, postLength: postLength };
  }
  if (typeof document === 'undefined') return;

  // ── the page, in a browser ───────────────────────────────────────────
  var drawn = [];
  var state = { frozen: false, html: '', text: '', document: '', images: [], report: null };

  // An editable snapshot (templates/email-editable.html) keeps its charts in
  // page-runtime's spec, and the reader changes them after the page opens. So
  // the live charts stay SVG for the editor, and each freeze draws a copy
  // off screen, rasterises that, and builds the email from a clone of the
  // block. An edit makes the frozen copy stale; it is rebuilt shortly after.
  function editable() { return !!(root.Page && document.getElementById('page-spec')); }
  // The block, and where it is going: #email-block for a mail client,
  // #teams-block for a Teams chat. The freeze is the same for both; the rules,
  // the export and the toolbar differ.
  // #social-block for a feed, where what leaves is one picture per card.
  function blockEl() { return document.getElementById('email-block') || document.getElementById('teams-block') || document.getElementById('social-block'); }
  function target() { var b = blockEl(); return b && b.id === 'teams-block' ? 'teams' : b && b.id === 'social-block' ? 'social' : 'email'; }
  var busy = null, again = false, stale = false, changed = {};
  var listeners = [];
  function notify() { listeners.forEach(function (fn) { try { fn(); } catch (e) { /* a listener's bug is its own */ } }); }

  /**
   * Draw a chart that freeze() will rasterise. Same shape as the draw()
   * helper in references/controls.md, so the static checker sees the chart.
   * Animation is off: the PNG is taken once, and it must be the finished chart.
   */
  function draw(factory, id, config) {
    var cfg = Object.assign({}, config);
    cfg.chart = Object.assign({}, config && config.chart, { animation: false });
    var handle = factory(id, cfg);
    drawn.push({ id: id, handle: handle, factory: factory });
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
  // A few frames, or a moment when there are none: a hidden tab runs no
  // animation frames, and an edit made there must still reach the email.
  function frames(n) {
    return new Promise(function (ok) {
      setTimeout(ok, 50 * n);
      (function step(k) { if (!k) return ok(); requestAnimationFrame(function () { step(k - 1); }); })(n);
    });
  }

  // The copy that leaves the page: no ids, no data-*, no classes, and no
  // comments — the template's rules for the author are not the reader's. On
  // an editable page it also drops what the editor hid (data-page-removed),
  // its own chrome (data-page-ui), the rows that exist only for whoever edits
  // the page (data-snap-omit, the alt-text rows), and the editor's tab stops.
  function exportClone(clone) {
    var walker = document.createTreeWalker(clone, NodeFilter.SHOW_COMMENT);
    var comments = [];
    while (walker.nextNode()) comments.push(walker.currentNode);
    comments.forEach(function (c) { c.parentNode.removeChild(c); });
    Array.prototype.slice.call(clone.querySelectorAll('[data-page-removed],[data-page-ui],[data-snap-omit]')).forEach(function (n) {
      if (n.parentNode) n.parentNode.removeChild(n);
    });
    Array.prototype.forEach.call(clone.querySelectorAll('*'), function (n) {
      Array.prototype.slice.call(n.attributes).forEach(function (a) {
        if (a.name === 'id' || a.name === 'class' || a.name === 'contenteditable' || a.name === 'tabindex' ||
            a.name === 'spellcheck' || a.name.indexOf('data-') === 0) n.removeAttribute(a.name);
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

  function cssId(id) { return root.CSS && CSS.escape ? CSS.escape(id) : id; }
  // The chart's alt text: from the marked element its data-alt-key names (an
  // editable snapshot, where the reader can correct it), else data-alt.
  function altOf(host) {
    var key = host.getAttribute('data-alt-key');
    if (key) {
      var src = document.querySelector('[data-key="' + cssId(key) + '"]');
      if (src) return src.textContent.replace(/\s+/g, ' ').trim();
    }
    return host.getAttribute('data-alt') || '';
  }

  // Draw a spec chart again where nobody sees it, at its box's size and with
  // no animation, and rasterise that. The live chart is the editor's, so it
  // is never touched.
  function offscreenPNG(id, w, h) {
    var entry = root.Page.getChart(id);
    if (!entry || typeof Charts[entry.type] !== 'function') return Promise.reject(new Error('not in the page spec'));
    var box = document.createElement('div');
    box.setAttribute('data-page-ui', '');
    box.style.cssText = 'position:absolute;left:-10000px;top:0;width:' + w + 'px;height:' + h + 'px';
    document.body.appendChild(box);
    var cfg = JSON.parse(JSON.stringify(entry.config || {}));
    cfg.chart = Object.assign({}, cfg.chart, { animation: false, responsive: false });
    var handle;
    var done = function () { if (handle && handle.destroy) handle.destroy(); box.remove(); };
    try { handle = Charts[entry.type](box, cfg); } catch (e) { done(); return Promise.reject(e); }
    if (handle && handle.error) { var err = handle.error; done(); return Promise.reject(new Error(err)); }
    return frames(2).then(function () { return handle.toPNG({ scale: 2 }); })
      .then(function (blob) { done(); return blob; }, function (e) { done(); throw e; });
  }

  function drawnFor(id) { return drawn.filter(function (x) { return x.id === id; }).pop(); }

  // The text copy, written for how Teams actually draws a message rather
  // than for how the markup reads. Teams sets an h3 smaller than body text
  // and gives paragraphs no margin, so a post pasted as authored arrives with
  // its chart titles shrunk and every section run into the next. So each h3
  // becomes a bold paragraph, and a blank paragraph opens each section and
  // the closing source line.
  function teamsText(clone) {
    var spacer = function (before) {
      var p = document.createElement('p');
      p.innerHTML = '&nbsp;';
      before.parentNode.insertBefore(p, before);
    };
    Array.prototype.slice.call(clone.querySelectorAll('h3')).forEach(function (h) {
      var p = document.createElement('p');
      var b = document.createElement('strong');
      while (h.firstChild) b.appendChild(h.firstChild);
      p.appendChild(b);
      h.parentNode.replaceChild(p, h);
      if (p.previousElementSibling) spacer(p);
    });
    var last = clone.lastElementChild;
    if (last && last.previousElementSibling && last.tagName === 'P') spacer(last);
  }

  // The whole card as one PNG, drawn from the block as it looks on screen:
  // each element's computed style is written onto a copy, the copy goes into
  // an SVG foreignObject, and the browser paints that onto a canvas. Every
  // picture in the block is already a data: URL by now, so nothing taints the
  // canvas in Chromium (Edge, Chrome). Safari refuses, and says so.
  // The SVG is given the full pixel size and a viewBox at the card's own, so
  // the browser lays the card out at its CSS size and rasterises it at the
  // export size, rather than painting it small and stretching the bitmap.
  function cardPNG(block, scale) {
    var k = scale || 2;
    var w = Math.ceil(block.offsetWidth), h = Math.ceil(block.offsetHeight);
    if (!w || !h) return Promise.reject(new Error('the card is not on screen'));
    var clone = block.cloneNode(true);
    var from = [block].concat(Array.prototype.slice.call(block.querySelectorAll('*')));
    var to = [clone].concat(Array.prototype.slice.call(clone.querySelectorAll('*')));
    from.forEach(function (n, i) {
      var cs = getComputedStyle(n), css = '';
      for (var k = 0; k < cs.length; k++) css += cs[k] + ':' + cs.getPropertyValue(cs[k]) + ';';
      to[i].setAttribute('style', css);
      to[i].removeAttribute('id');
      to[i].removeAttribute('class');
    });
    // The card sits in the picture's corner, with no page margin or shadow.
    clone.style.margin = '0';
    clone.style.boxShadow = 'none';
    clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    var pw = Math.round(w * k), ph = Math.round(h * k);
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + pw + '" height="' + ph + '" viewBox="0 0 ' + w + ' ' + h + '">' +
      '<foreignObject x="0" y="0" width="100%" height="100%">' + new XMLSerializer().serializeToString(clone) +
      '</foreignObject></svg>';
    return new Promise(function (ok, no) {
      var img = new Image();
      img.onload = function () { ok(img); };
      img.onerror = function () { no(new Error('the card would not render as an image')); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }).then(function (img) {
      var c = document.createElement('canvas');
      c.width = pw; c.height = ph;
      c.getContext('2d').drawImage(img, 0, 0, pw, ph);
      return new Promise(function (ok, no) {
        try { c.toBlob(function (b) { return b ? ok(b) : no(new Error('the canvas gave no PNG')); }, 'image/png'); }
        catch (e) { no(e); }
      });
    }).then(function (blob) {
      return blobToDataURL(blob).then(function (url) {
        return { blob: blob, url: url, w: w, h: h, pw: pw, ph: ph, kb: Math.round(blob.size / 1024) };
      });
    });
  }

  /**
   * Rasterise every chart in the block, resolve the tokens, and lint the
   * result. On a static snapshot the frozen images replace the live charts on
   * screen, once. On an editable one the live charts stay, and each call
   * rebuilds the email from the page as it now is; an edit marks it stale.
   */
  function freeze() {
    if (target() === 'social') return freezeSocial();
    var live = editable();
    if (state.frozen && !(live && stale)) return Promise.resolve(state.report);
    if (busy) { again = true; return busy; }
    var block = blockEl();
    if (!block) return Promise.reject(new Error('email-snapshot: no element with id="email-block" or id="teams-block"'));
    var teams = target() === 'teams';
    stale = false;
    var problems = [], warns = [], images = [], shots = {};
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    // Charts lay out on a debounced resize observer, so let it settle.
    busy = fontsReady.then(function () { return frames(2); })
      .then(function () { return new Promise(function (ok) { setTimeout(ok, 250); }); })
      .then(function () {
        var hosts = Array.prototype.filter.call(block.querySelectorAll('.chart'), function (n) {
          return !(n.closest('[data-page-removed]') || (n.parentElement && n.parentElement.closest('.chart')));
        });
        return hosts.reduce(function (p, host) {
          return p.then(function () {
            var id = host.id;
            var d = drawnFor(id);
            var inSpec = live && root.Page.getChart(id);
            if (!d && !inSpec) {
              problems.push({ rule: 'charts frozen', msg: (id || 'a chart') + ' was not drawn with EmailSnapshot.draw' +
                (live ? ' or the page spec' : '') + ', so it cannot be frozen' });
              return;
            }
            if (inSpec && inSpec.config && (inSpec.config.title || inSpec.config.subtitle)) {
              warns.push({ rule: 'chart text', msg: id + ' has a title or subtitle inside the image — the text rows above it already carry them, and text in an image is lost when images are blocked' });
            }
            if (d && d.handle && d.handle.error) {
              problems.push({ rule: 'chart drew', msg: id + ': ' + d.handle.error });
              return;
            }
            var w = Math.round(host.offsetWidth), h = Math.round(host.offsetHeight);
            var png = d ? d.handle.toPNG({ scale: 2 }) : offscreenPNG(id, w, h);
            return png.then(function (blob) {
              return blobToDataURL(blob).then(function (url) {
                var img = document.createElement('img');
                img.setAttribute('src', url);
                img.setAttribute('width', String(w));
                img.setAttribute('height', String(h));
                img.setAttribute('alt', altOf(host));
                // Teams drops inline styles on paste; width= and height= are
                // what it keeps, and they are what size the picture.
                if (!teams) img.setAttribute('style', 'display:block;width:' + w + 'px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;');
                images.push({ id: id, blob: blob, url: url, w: w, h: h, alt: altOf(host), kb: Math.round(blob.size / 1024) });
                shots[id] = img;
              });
            }).catch(function (e) {
              problems.push({ rule: 'chart drew', msg: id + ': ' + (e && e.message || e) });
            });
          });
        }, Promise.resolve());
      })
      .then(function () {
        // A static snapshot shows on screen exactly what is pasted, so its
        // live charts give way to their images. An editable one keeps them.
        if (!live) {
          Object.keys(shots).forEach(function (id) {
            var host = document.getElementById(id);
            var d = drawnFor(id);
            if (d && d.handle && d.handle.destroy) d.handle.destroy();
            if (host) host.replaceWith(shots[id].cloneNode(true));
          });
        }
        var clone = block.cloneNode(true);
        Object.keys(shots).forEach(function (id) {
          var host = clone.querySelector('#' + cssId(id));
          if (host) host.replaceWith(shots[id]);
        });
        exportClone(clone);
        resolveVars(clone);
        if (teams) teamsText(clone);
        state.images = images;
        state.html = clone.innerHTML.trim();
        state.text = plainText(clone);
        var preview = teams && document.getElementById('teams-text-preview');
        if (preview) preview.innerHTML = state.html;
        // An editable working copy's tab reads "Draft · …"; the email's doesn't.
        var title = (document.title || 'Snapshot').replace(/^(Draft · )+/, '').replace(/[<&]/g, '');
        var ground = toHex(getComputedStyle(document.documentElement).getPropertyValue('--ground').trim() || '#ffffff');
        state.document = '<!doctype html>\n<html lang="' + (document.documentElement.lang || 'en') + '">\n<head>\n' +
          '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
          '<title>' + title + '</title>\n</head>\n<body style="margin:0;padding:24px 0;background-color:' + ground + ';">\n' +
          state.html + '\n</body>\n</html>\n';
        state.frozen = true;
        // A Teams post also leaves as one picture of the whole card, for the
        // reader who wants it to look exactly as designed.
        if (!teams || live) return;
        return cardPNG(block).then(function (card) { state.card = card; }, function (e) {
          state.card = null;
          warns.push({ rule: 'card', msg: 'the card could not be made into a picture (' + (e && e.message || e) +
            ') — this browser will not draw HTML onto a canvas; open the file in Edge or Chrome, or use Copy as text' });
        });
      })
      .then(function () {
        state.report = check(problems);
        state.report.warns = warns.concat(state.report.warns);
        if (state.card) state.report.card = { kb: state.card.kb, width: state.card.w, height: state.card.h };
        // Alt text is written by hand, so it does not follow an edit to the
        // chart's numbers. Say which charts changed since the page opened.
        var edited = Object.keys(changed).filter(function (id) { return shots[id] && block.querySelector('#' + cssId(id) + '[data-alt-key]'); });
        if (edited.length) state.report.warns.push({ rule: 'alt text', msg: 'The data in ' + edited.join(' and ') + ' changed. Check that ' +
          (edited.length > 1 ? 'their alt text still states' : 'its alt text still states') + ' the right numbers (shown under each chart in edit mode).' });
        document.documentElement.setAttribute('data-email', state.report.ok ? 'frozen' : 'problems');
        busy = null;
        if (again) { again = false; stale = true; return freeze(); }
        notify();
        return state.report;
      }, function (e) { busy = null; again = false; throw e; });
    return busy;
  }

  function check(extra) {
    if (target() === 'social') return checkSocial(extra);
    if (!state.frozen && !extra) return { ok: false, fails: [{ rule: 'frozen', msg: 'freeze() has not finished' }], warns: [] };
    var teams = target() === 'teams';
    var r = lint(state.html, { frozen: true, target: target() });
    if (extra && extra.length) { r.fails = extra.concat(r.fails); r.ok = false; }
    var bytes = new Blob([state.html]).size;
    r.target = target();
    r.kb = Math.round(bytes / 1024);
    r.images = state.images.map(function (i) { return { id: i.id, kb: i.kb }; });
    // Teams uploads each pasted picture on its own, and lintTeams has already
    // weighed the text and counted the charts.
    if (teams) return r;
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

  // The copy event first: it is synchronous, works from file://, and hands
  // the clipboard our markup untouched. The async API is the fallback.
  function copyMarkup(html, text) {
    var done = false;
    var on = function (e) {
      e.clipboardData.setData('text/html', html);
      e.clipboardData.setData('text/plain', text);
      e.preventDefault();
      done = true;
    };
    document.addEventListener('copy', on);
    try { document.execCommand('copy'); } catch (e) { /* fall through */ }
    document.removeEventListener('copy', on);
    if (done) return Promise.resolve(true);
    if (navigator.clipboard && root.ClipboardItem) {
      return navigator.clipboard.write([new root.ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' })
      })]).then(function () { return true; });
    }
    return Promise.reject(new Error('this browser would not write to the clipboard'));
  }

  function copy() {
    if (!state.frozen) return Promise.reject(new Error('freeze() has not finished'));
    if (busy || stale) return Promise.reject(new Error('the snapshot is still catching up with your last edit — try again in a moment'));
    return copyMarkup(state.html, state.text);
  }

  // One chart as a picture on the clipboard: the fallback when the rich paste
  // arrives without its pictures. A bare image/png is what a pasted
  // screenshot is, and every Teams client takes one; a browser that will not
  // write one (some refuse from file://) gets the picture as one-image HTML.
  function copyImage(id) {
    var shot = state.images.filter(function (i) { return i.id === id; })[0];
    if (!shot) return Promise.reject(new Error('no frozen chart called ' + id));
    var asHTML = function () {
      var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); };
      return copyMarkup('<img src="' + shot.url + '" width="' + shot.w + '" height="' + shot.h + '" alt="' + esc(shot.alt) + '">', shot.alt + '\n');
    };
    if (!(navigator.clipboard && root.ClipboardItem)) return asHTML();
    return navigator.clipboard.write([new root.ClipboardItem({ 'image/png': shot.blob })])
      .then(function () { return true; }, asHTML);
  }

  // The card as a picture, under its headline as real text: the headline is
  // what shows in the chat list and what a search of the chat finds. Pasted
  // as HTML, the route already shown to bring pictures into Teams.
  function copyCard() {
    if (!state.card) return Promise.reject(new Error(state.frozen ? 'there is no card picture (see the status line)' : 'freeze() has not finished'));
    var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); };
    var block = blockEl();
    var head = block && block.querySelector('h2');
    var headline = head ? head.textContent.replace(/\s+/g, ' ').trim() : '';
    var alt = state.text.replace(/\s+/g, ' ').trim();
    var c = state.card;
    return copyMarkup((headline ? '<p><strong>' + esc(headline) + '</strong></p>' : '') +
      '<img src="' + c.url + '" width="' + c.w + '" height="' + c.h + '" alt="' + esc(alt) + '">', state.text);
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
    var files = state.images.map(function (i) { return { name: slug() + '-' + i.id + '.png', blob: i.blob }; });
    if (state.card) files.unshift({ name: slug() + '-card.png', blob: state.card.blob });
    files.forEach(function (f, k) {
      setTimeout(function () { save(f.name, f.blob); }, k * 300);
    });
  }

  // The toolbar, if the page has one. Wired here so a page cannot ship a
  // half-wired Copy button. On an editable page it also follows the edits:
  // each one disables the buttons until the email has been rebuilt from it.
  function wire() {
    if (target() === 'social') return wireSocial();
    var bar = document.getElementById('snap-bar');
    if (!bar) return;
    var status = bar.querySelector('[data-snap="status"]');
    var say = function (t) { if (status) status.textContent = t; };
    var on = function (what, fn) {
      var b = bar.querySelector('[data-snap="' + what + '"]');
      if (b) b.addEventListener('click', fn);
      return b;
    };
    var live = editable();
    var teams = target() === 'teams';
    var buttons = [
      on('copy', function () {
        copy().then(function () { say(teams ? 'Copied. Paste into the Teams message box (Ctrl+V), check the pictures arrived, then send.' : 'Copied. Paste into the body of a new message.'); },
          function (e) { say('Could not copy: ' + e.message + (live ? '.' : '. Select the block and press Ctrl+C instead.')); });
      }),
      on('copy-card', function () {
        copyCard().then(function () { say('Copied the card as a picture. Paste into the Teams message box (Ctrl+V) and send.'); },
          function (e) { say('Could not copy the card: ' + String(e.message).replace(/\.$/, '') + '. Use Save PNG files and attach the card.'); });
      }),
      on('save-html', saveDocument),
      on('save-png', saveImages)
    ];
    // A Teams page previews either copy: the card as designed, or the text
    // copy roughly as Teams will set it.
    var views = Array.prototype.slice.call(bar.querySelectorAll('[data-snap="view"]'));
    var show = function (view) {
      var card = document.getElementById('teams-block'), text = document.getElementById('teams-text-preview');
      if (!card || !text) return;
      card.hidden = view === 'text';
      text.hidden = view !== 'text';
      views.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === view)); });
    };
    views.forEach(function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-view')); }); });
    // A Teams page gets one button per chart, made once the charts exist.
    var perChart = bar.querySelector('[data-snap="charts"]');
    var chartButtons = function (r) {
      if (!perChart) return;
      perChart.textContent = '';
      r.images.forEach(function (img, k) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = 'Copy chart ' + (k + 1);
        b.addEventListener('click', function () {
          copyImage(img.id).then(function () { say('Chart ' + (k + 1) + ' copied as a picture. Paste it where it belongs in the message.'); },
            function (e) { say('Could not copy the picture: ' + String(e.message).replace(/\.$/, '') + '. Use Save PNG files and attach them.'); });
        });
        perChart.appendChild(b);
        buttons.push(b);
      });
    };
    var enable = function (yes) { buttons.forEach(function (b) { if (b) b.disabled = !yes; }); };
    var report = function (r) {
      chartButtons(r);
      enable(true);
      var n = r.images.length + ' chart(s) frozen as PNG' + (r.card ? ', and the card as one picture' : '');
      if (teams && !r.card) r.warns.filter(function (w) { return w.rule === 'card'; }).forEach(function (w) { n += '. Note: ' + w.msg; });
      var notes = r.warns.filter(function (w) { return w.rule === 'alt text' || w.rule === 'chart text'; });
      say(!r.ok ? 'Frozen with problems: ' + r.fails.map(function (f) { return f.msg; }).join(' · ')
        : notes.length ? 'Ready — ' + n + '. ' + notes.map(function (w) { return w.msg; }).join(' · ')
        : 'Ready — ' + n + (live && root.PageEditor ? '. Edits update the email as you make them.' : '.'));
    };
    var failed = function (e) { enable(true); say('Could not freeze: ' + e.message); };
    enable(false);
    say('Freezing the charts…');
    freeze().then(report, failed);
    if (!live) return;
    var timer = null;
    root.Page.on(function (change) {
      if (change && change.kind === 'chart' && change.id) changed[String(change.id).split('::')[0]] = 1;
      // Editing a chart's alt text answers the warning for that chart.
      if (change && change.kind === 'text') {
        Array.prototype.forEach.call(document.querySelectorAll('[data-alt-key="' + cssId(change.id) + '"]'), function (n) { delete changed[n.id]; });
      }
      stale = true;
      enable(false);
      say('Updating the email…');
      clearTimeout(timer);
      timer = setTimeout(function () { freeze().then(report, failed); }, 500);
    });
  }

  // ── a social post, in a browser ──────────────────────────────────────
  // Each chart is frozen at the card's own scale, so the painted card
  // carries a chart bitmap exactly as sharp as its type. Then each card is
  // measured (its frame, and anything running out of it) and painted at
  // 2.5x into the picture that gets posted. The posts' words are counted the
  // way each platform counts them.
  function cardsOf(block) { return Array.prototype.slice.call(block.querySelectorAll('.card')); }
  function typeOf(factory) {
    return Object.keys(root.Charts || {}).filter(function (k) { return Charts[k] === factory; })[0] || '';
  }
  function cardAlt(card) {
    var head = card.querySelector('h2');
    var parts = [head ? head.textContent : ''].concat(Array.prototype.map.call(card.querySelectorAll('img[alt]'), function (i) { return i.getAttribute('alt'); }));
    return parts.map(function (s) { return String(s || '').replace(/\s+/g, ' ').trim().replace(/([^.!?])$/, '$1.'); })
      .filter(function (s) { return s && s !== '.'; }).join(' ');
  }
  function postsOf(block) {
    return Array.prototype.map.call(block.querySelectorAll('pre.post'), function (pre) {
      var platform = pre.getAttribute('data-platform');
      var spec = PLATFORMS[platform] || { name: platform, limit: 0 };
      var text = pre.textContent.replace(/^\s*\n|\s+$/g, '');
      return { el: pre, platform: platform, name: spec.name, text: text, length: postLength(text, platform), limit: spec.limit, fold: spec.fold || 0 };
    });
  }
  // Anything drawn past the card's frame is sliced off the picture.
  function spillOf(card) {
    var r = card.getBoundingClientRect(), worst = 0;
    Array.prototype.forEach.call(card.querySelectorAll('*'), function (n) {
      var b = n.getBoundingClientRect();
      if (!b.width || !b.height) return;
      worst = Math.max(worst, b.bottom - r.bottom, b.right - r.right);
    });
    return Math.round(worst);
  }

  function freezeSocial() {
    if (state.frozen) return Promise.resolve(state.report);
    if (busy) return busy;
    var block = blockEl();
    var problems = [], warns = [], images = [], cards = [];
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    busy = fontsReady.then(function () { return frames(2); })
      .then(function () { return new Promise(function (ok) { setTimeout(ok, 250); }); })
      .then(function () {
        var hosts = Array.prototype.filter.call(block.querySelectorAll('.chart'), function (n) {
          return !(n.parentElement && n.parentElement.closest('.chart'));
        });
        return hosts.reduce(function (p, host) {
          return p.then(function () {
            var id = host.id, d = drawnFor(id);
            if (!d) { problems.push({ rule: 'charts frozen', msg: (id || 'a chart') + ' was not drawn with SocialSnapshot.draw, so it cannot be frozen' }); return; }
            if (d.handle && d.handle.error) { problems.push({ rule: 'chart drew', msg: id + ': ' + d.handle.error }); return; }
            var w = Math.round(host.offsetWidth), h = Math.round(host.offsetHeight);
            var meta = root.Charts && Charts.meta && Charts.meta.charts && Charts.meta.charts[typeOf(d.factory)];
            if (h < 110) {
              problems.push({ rule: 'chart room', msg: id + ' has only ' + h + 'px of the card left — shorten the headline or the units line, or use a taller size' });
            } else if (meta && (w < meta.minWidth * 0.6 || h < (meta.minHeight - 60) * 0.6)) {
              warns.push({ rule: 'chart room', msg: id + ' is ' + w + 'x' + h + ', well under the ' + meta.minWidth + 'x' + (meta.minHeight - 60) + ' a ' + typeOf(d.factory) + ' wants — fewer categories, or a taller card' });
            }
            return d.handle.toPNG({ scale: SOCIAL_SCALE }).then(function (blob) {
              return blobToDataURL(blob).then(function (url) {
                var img = document.createElement('img');
                img.setAttribute('src', url);
                img.setAttribute('width', String(w));
                img.setAttribute('height', String(h));
                img.setAttribute('alt', altOf(host));
                images.push({ id: id, blob: blob, url: url, w: w, h: h, alt: altOf(host), kb: Math.round(blob.size / 1024) });
                if (d.handle.destroy) d.handle.destroy();
                host.replaceWith(img);
              });
            }).catch(function (e) { problems.push({ rule: 'chart drew', msg: id + ': ' + (e && e.message || e) }); });
          });
        }, Promise.resolve());
      })
      .then(function () {
        var clone = block.cloneNode(true);
        Array.prototype.slice.call(clone.querySelectorAll('[data-page-ui]')).forEach(function (n) { n.remove(); });
        state.html = clone.innerHTML.trim();
        state.images = images;
        state.posts = postsOf(block);
        return cardsOf(block).reduce(function (p, card, i) {
          return p.then(function () {
            var size = card.getAttribute('data-size'), spec = SOCIAL_SIZES[size], name = 'card ' + (i + 1);
            if (!spec) return;   // lint names it
            var ow = card.offsetWidth, oh = card.offsetHeight;
            if (Math.abs(ow - spec.w) > 1 || Math.abs(oh - spec.h) > 1) {
              problems.push({ rule: 'card size', msg: name + ' is ' + ow + 'x' + oh + ' on screen, not ' + spec.w + 'x' + spec.h + ' — keep the template\'s .card size rules, or the picture will not be ' + Math.round(spec.w * SOCIAL_SCALE) + 'x' + Math.round(spec.h * SOCIAL_SCALE) });
            }
            var spill = spillOf(card);
            if (spill > 1) problems.push({ rule: 'card overflow', msg: name + ': content runs ' + spill + 'px past the frame and would be cut off the picture — shorten the text, or use a taller size' });
            return cardPNG(card, SOCIAL_SCALE).then(function (png) {
              cards.push({ index: i, size: size, blob: png.blob, url: png.url, w: png.pw, h: png.ph, kb: png.kb, alt: cardAlt(card) });
            }, function (e) {
              warns.push({ rule: 'card', msg: name + ' could not be painted into a picture (' + (e && e.message || e) + ') — this browser will not draw HTML onto a canvas; open the file in Edge or Chrome' });
            });
          });
        }, Promise.resolve());
      })
      .then(function () {
        state.cards = cards;
        state.frozen = true;
        state.report = checkSocial(problems);
        state.report.warns = warns.concat(state.report.warns);
        document.documentElement.setAttribute('data-email', state.report.ok ? 'frozen' : 'problems');
        busy = null;
        notify();
        return state.report;
      }, function (e) { busy = null; throw e; });
    return busy;
  }

  function checkSocial(extra) {
    if (!state.frozen && !extra) return { ok: false, fails: [{ rule: 'frozen', msg: 'freeze() has not finished' }], warns: [] };
    var r = lint(state.html, { frozen: true, target: 'social' });
    if (extra && extra.length) { r.fails = extra.concat(r.fails); r.ok = false; }
    r.target = 'social';
    r.cards = (state.cards || []).map(function (c) { return { size: c.size, width: c.w, height: c.h, kb: c.kb }; });
    r.posts = (state.posts || []).map(function (p) { return { platform: p.platform, length: p.length, limit: p.limit }; });
    r.images = state.images.map(function (i) { return { id: i.id, kb: i.kb }; });
    (state.cards || []).forEach(function (c) {
      if (c.kb > 5000) r.warns.push({ rule: 'size', msg: 'card ' + (c.index + 1) + ' is ' + c.kb + ' KB; X refuses a picture past 5 MB' });
      if (c.alt.length > ALT_MAX) r.warns.push({ rule: 'alt text', msg: 'card ' + (c.index + 1) + '\'s alt text (headline plus chart) is ' + c.alt.length + ' characters; X takes ' + ALT_MAX });
    });
    return r;
  }

  function copyPlain(text) {
    var done = false;
    var on = function (e) { e.clipboardData.setData('text/plain', text); e.preventDefault(); done = true; };
    document.addEventListener('copy', on);
    try { document.execCommand('copy'); } catch (e) { /* fall through */ }
    document.removeEventListener('copy', on);
    if (done) return Promise.resolve(true);
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; });
    return Promise.reject(new Error('this browser would not write to the clipboard'));
  }
  function cardAt(i) {
    var c = (state.cards || []).filter(function (x) { return x.index === i; })[0];
    return c ? Promise.resolve(c) : Promise.reject(new Error(state.frozen ? 'card ' + (i + 1) + ' has no picture (see the status line)' : 'freeze() has not finished'));
  }
  // A bare image/png is what a pasted screenshot is, and every compose box
  // takes one.
  function copyCardImage(i) {
    return cardAt(i).then(function (c) {
      if (!(navigator.clipboard && root.ClipboardItem)) throw new Error('this browser will not put a picture on the clipboard');
      return navigator.clipboard.write([new root.ClipboardItem({ 'image/png': c.blob })]).then(function () { return true; });
    });
  }
  function cardFile(c) { return slug() + '-' + c.size + '-' + c.w + 'x' + c.h + '.png'; }
  function saveCard(i) { return cardAt(i).then(function (c) { save(cardFile(c), c.blob); }); }
  function saveCards() {
    (state.cards || []).forEach(function (c, k) { setTimeout(function () { save(cardFile(c), c.blob); }, k * 300); });
  }

  // What a reader sees before "…more", marked on the page: the rest of the
  // post is set muted after a fold line.
  function showFold(p) {
    if (!p.fold || Array.from(p.text).length <= p.fold) return;
    var chars = Array.from(p.text);
    var above = document.createElement('span'), below = document.createElement('span');
    above.textContent = chars.slice(0, p.fold).join('');
    below.textContent = chars.slice(p.fold).join('');
    below.className = 'below-fold';
    below.title = 'Below "…more" on ' + p.name;
    p.el.textContent = '';
    p.el.appendChild(above);
    p.el.appendChild(below);
  }

  function wireSocial() {
    var block = blockEl();
    var bar = document.getElementById('snap-bar');
    var status = bar && bar.querySelector('[data-snap="status"]');
    var say = function (t) { if (status) status.textContent = t; };
    var button = function (label, fn) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('click', fn);
      return b;
    };
    var all = bar && bar.querySelector('[data-snap="save-png"]');
    if (all) { all.disabled = true; all.addEventListener('click', saveCards); }
    say('Freezing the charts and painting the cards…');
    freezeSocial().then(function (r) {
      cardsOf(block).forEach(function (card, i) {
        var c = state.cards.filter(function (x) { return x.index === i; })[0];
        var spec = SOCIAL_SIZES[card.getAttribute('data-size')];
        var row = document.createElement('div');
        row.className = 'card-actions';
        row.setAttribute('data-page-ui', '');
        var label = document.createElement('span');
        label.textContent = spec ? (c ? c.w + '×' + c.h : '') + ' · ' + spec.ratio + ' · ' + spec.for : 'unknown size';
        row.appendChild(label);
        if (c) {
          row.appendChild(button('Copy picture', function () {
            copyCardImage(i).then(function () { say('Card ' + (i + 1) + ' copied as a picture. Paste it into the post (Ctrl+V), then add the alt text.'); },
              function (e) { say('Could not copy the picture: ' + String(e.message).replace(/\.$/, '') + '. Use Save PNG and attach the file.'); });
          }));
          row.appendChild(button('Save PNG', function () { saveCard(i); }));
          row.appendChild(button('Copy alt text', function () {
            copyPlain(c.alt).then(function () { say('Alt text for card ' + (i + 1) + ' copied (' + c.alt.length + ' characters). Paste it into the picture\'s description field.'); },
              function (e) { say('Could not copy: ' + e.message); });
          }));
        }
        card.parentNode.insertBefore(row, card.nextSibling);
      });
      state.posts.forEach(function (p) {
        var row = document.createElement('div');
        row.className = 'post-meta';
        row.setAttribute('data-page-ui', '');
        var label = document.createElement('span');
        var over = p.limit && p.length > p.limit;
        label.textContent = p.name + ' · ' + p.length.toLocaleString() + ' / ' + (p.limit || 0).toLocaleString() +
          (p.fold ? ' · first ' + p.fold + ' show before "…more"' : '');
        if (over) label.className = 'over';
        row.appendChild(label);
        row.appendChild(button('Copy text', function () {
          copyPlain(p.text).then(function () { say(p.name + ' text copied. Paste it into the post, then add the picture.'); },
            function (e) { say('Could not copy: ' + e.message + '. Select the text and press Ctrl+C instead.'); });
        }));
        p.el.parentNode.insertBefore(row, p.el);
        showFold(p);
      });
      if (all) all.disabled = !state.cards.length;
      var n = state.cards.length + ' card(s) painted (' + state.cards.map(function (c) { return c.w + '×' + c.h; }).join(', ') + ')';
      var card = r.warns.filter(function (w) { return w.rule === 'card'; });
      say(!r.ok ? 'Frozen with problems: ' + r.fails.map(function (f) { return f.msg; }).join(' · ')
        : card.length ? n + '. Note: ' + card.map(function (w) { return w.msg; }).join(' · ')
        : 'Ready — ' + n + '. Copy a picture and its text into the post.');
    }, function (e) { if (all) all.disabled = false; say('Could not freeze: ' + e.message); });
  }

  root.EmailSnapshot = {
    draw: draw,
    freeze: freeze,
    check: function () { return check(); },
    copy: copy,
    copyImage: copyImage,
    copyCard: copyCard,
    /** a Teams post's whole card as one picture: { blob, url, w, h, kb }, or null */
    get card() { return state.card || null; },
    /** a social post's pictures, one per card: [{ index, size, w, h, kb, alt, blob, url }] */
    get cards() { return state.cards || []; },
    /** a social post's words: [{ platform, name, text, length, limit, fold }] */
    get posts() { return (state.posts || []).map(function (p) { var o = Object.assign({}, p); delete o.el; return o; }); },
    copyCardImage: copyCardImage,
    saveCard: saveCard,
    saveCards: saveCards,
    postLength: postLength,
    saveDocument: saveDocument,
    saveImages: saveImages,
    lint: lint,
    get html() { return state.html; },
    get text() { return state.text; },
    get document() { return state.document; },
    get frozen() { return state.frozen; },
    /** true while an edit has not yet reached the frozen email */
    get stale() { return stale || !!busy; },
    /** fn() after every freeze, including the rebuilds that follow an edit */
    on: function (fn) { listeners.push(fn); }
  };
  // A Teams page reads better calling it by its own name; it is one runtime.
  root.TeamsSnapshot = root.EmailSnapshot;
  root.SocialSnapshot = root.EmailSnapshot;
  if (document.readyState === 'complete') setTimeout(wire, 0);
  else root.addEventListener('load', wire);
})(typeof window !== 'undefined' ? window : this);
