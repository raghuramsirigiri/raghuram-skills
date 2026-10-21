/*!
 * motion-lib/layout.js — frame sizes, safe zones and the type scale.
 *
 * Safe zones are house defaults, deliberately conservative: they keep text
 * clear of the feed's caption, buttons and profile row. They are not a
 * platform's published guarantee.
 *
 * The type scale is the social card's at its 2.5x export scale: a 1080-wide
 * frame is a 432px card. Every format is at least 1080 on its short side, so
 * the base scale is the same in all four.
 *
 * Each aspect class then gets its own composition (PROFILE), not one square
 * stack placed in a bigger frame: a tall frame sets the words a step larger
 * and spreads them down its height; a wide frame puts the words in a left
 * column and the chart beside them. That is the one type system scaled, never
 * a second one.
 */
(function (root) {
  'use strict';
  const K = 2.5;

  const FORMATS = {
    '9:16': { W: 1080, H: 1920, cls: 'tall', safe: { top: 250, right: 150, bottom: 380, left: 60 } },
    '4:5': { W: 1080, H: 1350, cls: 'tall', safe: { top: 60, right: 60, bottom: 120, left: 60 } },
    '1:1': { W: 1080, H: 1080, cls: 'square', safe: { top: 60, right: 60, bottom: 60, left: 60 } },
    '16:9': { W: 1920, H: 1080, cls: 'wide', safe: { top: 54, right: 96, bottom: 54, left: 96 } }
  };

  function frame(format) {
    const f = FORMATS[format];
    if (!f) throw new Error('unknown format "' + format + '" — use 9:16, 4:5, 1:1 or 16:9');
    const s = f.safe;
    return {
      format, W: f.W, H: f.H, cls: f.cls, profile: PROFILE[f.cls],
      safe: { x: s.left, y: s.top, w: f.W - s.left - s.right, h: f.H - s.top - s.bottom },
      margins: Object.assign({}, s)
    };
  }

  // Card type scale in px at the frame's size (card px x 2.5).
  const TYPE = {
    kicker: { size: 11 * K, lh: 14 * K, gap: 6 * K },
    headline: { size: 22 * K, lh: 27 * K, gap: 6 * K },
    units: { size: 12 * K, lh: 16 * K, gap: 10 * K },
    source: { size: 10 * K, lh: 13 * K, gap: 8 * K, pad: 7 * K },
    // The hook and big-number may set the headline or value 2-3x larger, in the
    // same face and weight: scale, never a second type system.
    display: { min: 22 * K * 2, max: 22 * K * 3 }
  };
  // Per aspect class. type: the factor on the kicker, headline and units
  // sizes (the source line stays card size: it is a footnote). split: words
  // and chart side by side, the words in the left `col` share of the safe
  // width. displayMax: the largest display size (hook, big number, title),
  // as a multiple of the card headline.
  const PROFILE = {
    square: { type: 1, split: false, col: 1, displayMax: 3 },
    tall: { type: 1.2, split: false, col: 1, displayMax: 4.4 },
    wide: { type: 1.15, split: true, col: 0.4, displayMax: 5 }
  };
  // TYPE at a frame's profile.
  function typeFor(fr) {
    const k = (fr && fr.profile ? fr.profile.type : 1);
    const sc = t => ({ size: t.size * k, lh: t.lh * k, gap: t.gap * k });
    return {
      kicker: sc(TYPE.kicker), headline: sc(TYPE.headline), units: sc(TYPE.units), source: TYPE.source,
      display: { min: TYPE.display.min * k, max: TYPE.headline.size * (fr && fr.profile ? fr.profile.displayMax : 3) }
    };
  }

  // The minimum painted text size the audit accepts, per format.
  const MIN_TEXT = 24;

  // Hairline and rule weights at frame scale.
  const RULE = { hair: 1 * K, accentW: 36 * K, accentH: 4 * K };

  const api = { K, FORMATS, frame, TYPE, MIN_TEXT, RULE, PROFILE, typeFor };
  const M = root.Motion = root.Motion || {};
  M.layout = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
