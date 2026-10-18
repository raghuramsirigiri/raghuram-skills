/*!
 * charts-theme.js — single source of truth for all visual tokens
 *
 * Every chart engine (line, column/bar, donut/pie, scatter/bubble)
 * reads from Charts.theme at render time. Edit a color in the palette
 * below and every property that references it updates in one shot.
 *
 * Example (dark theme):
 *   Charts.theme.bg = '#1a1a2e';
 *   Charts.theme.titleColor = '#e0e0e0';
 *   Charts.theme.colors = ['#e94560','#0f3460','#533483','#16213e'];
 *   Charts.line('chart', { ... });
 */
(function () {
  window.Charts = window.Charts || {};

  // ── Palette ─────────────────────────────────────────────────────────
  // Neutral scale runs light (n0) → dark (n9). Series scale is the
  // ordered set used for multi-series charts (s1 = primary … s7).
  // Names are role/scale based, not color based — safe to reskin.
  const c = {
    n0: '#f4f4f0',   // page/canvas surface (lightest)
    n0a: '#eae8e4',   // tile/panel surface — one soft step off n0
    n1: '#dcdbd7',   // hairlines, gridlines
    n3: '#8f8d87',   // de-emphasised fills — 3.0:1 on n0, the WCAG 1.4.11
    // floor for graphical objects. Lighter than this and
    // the context bars stop being readable as data.
    n2: '#a8a6a0',   // second de-emphasis step, for a muted ramp
    n2a: '#c2c0ba',   // third step (use only where a ramp needs three)
    n4: '#666666',   // secondary text
    n5: '#555555',   // tertiary text, connectors
    n6: '#444444',   // subtitle text
    n7: '#333333',   // body/label text
    n8: '#111111',   // heading / title text
    n9: '#000000',   // spines, ticks, ink
    nInverse: '#FFFFFF',   // text on dark fills

    s1: '#000000',   // series 1 (primary)
    s2: '#2323FF',   // series 2
    s3: '#4949FF',   // series 3
    s4: '#7070FF',   // series 4
    s5: '#9696FF',   // series 5
    s6: '#BCBCFF',   // series 6
    s7: '#DDD0FF',   // se

    accent: '#243E63',   // selection / highlight
    // Two accents that are not part of the series ramp. Named for the job they
    // do on a chart, not for a mood: `annotation` is the ink of things drawn
    // ON the data (callout leaders, threshold rules), `counter` is the hue for
    // the opposite direction of travel from s2 — bars below the threshold, the
    // mirrored half of a pyramid. Neither means "something is wrong".
    annotation: '#B31B38',   // callout leaders, boxes, threshold rules
    counter: '#9a0060'    // the against-the-grain direction, paired with s2
  };

  Charts.palette = c;

  // ── Metrics ─────────────────────────────────────────────────────────
  // The non-color half of the design system: type sizes, weights, leading,
  // the heading band, callout boxes, strokes, the legend. Colors were already
  // a function of a palette object; these were baked straight into buildTheme,
  // which meant a numeric edit had nowhere to live and `applyPalette` wiped it
  // on the next swatch change. Same shape as the palette now, so both halves
  // round-trip the same way.
  const m = {
    // Type
    font: "'Inter','Segoe UI',Arial,Helvetica,sans-serif",
    titleSize: 17,
    subtitleSize: 12,
    labelSize: 11.5,
    tickSize: 11,
    inlineSize: 11,
    valueSize: 11,
    centerSize: 14,
    pointLabelSize: 10,
    legendSize: 12,
    calloutSize: 10,
    tooltipSize: 12,
    noticeSize: 13,

    // Weights
    titleWeight: 700,
    subtitleWeight: 400,
    categoryWeight: 600,
    tickWeight: 400,
    valueWeight: 700,
    legendWeight: 600,

    // Leading, as RATIOS of the matching size — see the note in buildTheme.
    titleLineHeight: 1.24,
    subtitleLineHeight: 1.34,
    calloutLineHeight: 1.3,

    // Heading band
    headingPadTop: 17,
    headingSubGap: 8,
    headingGap: 18,
    headingGutter: 20,
    plotGap: 16,
    topAxisBand: 20,

    // Callout box
    calloutPad: 8,
    calloutMaxWidth: 220,
    calloutLeaderWidth: 1.2,
    calloutAnchorRadius: 4.5,

    // Strokes
    connectorWidth: 1.4,
    axisWidth: 1.8,
    gridWidth: 0.8,
    lineWidth: 3,
    spineWidth: 1.1,
    tickLength: 6,
    tickWidth: 1.5,

    // Legend
    legendRowHeight: 20,
    legendGap: 18,
    legendIconSize: 12,
    legendIconGap: 6
  };

  Charts.metrics = m;

  // Every theme role is a function OF the palette, not a snapshot of it, so a
  // palette edit at runtime can be replayed through the same mapping instead of
  // being hand-patched role by role. See Charts.applyPalette below.
  function buildTheme(c, m) {
   return {
     // ── Surface ─────────────────────────────────────────────────────────
     bg: c.n0,
     grid: c.n1,
     axis: c.n9,

     // ── Text ────────────────────────────────────────────────────────────
     // Five roles, each separated from its neighbours by BOTH weight and
     // color so no two are mistakable at a glance:
     //
     //   title      17 / 700 / n8   the darkest, heaviest thing on the canvas
     //   subtitle   12 / 400 / n4   lightest — it explains, it is not data
     //   category   11.5 / 600 / n8 names of things: bar rows, donut callouts
     //   tick        11 / 400 / n7  the numeric scale, quiet by design
     //   value       11 / 700 / n8  the readout the reader came for
     //
     // Subtitle sits at n4 rather than n6 specifically so it cannot be
     // confused with a category label, which is now both darker and semibold.
     titleColor: c.n8,
     subtitleColor: c.n4,
     labelColor: c.n7,
     secondaryColor: c.n4,
     inverseText: c.nInverse,

     categoryColor: c.n8,   // category / series names
     categoryWeight: m.categoryWeight,
     tickColor: c.n7,   // numeric axis ticks
     tickWeight: m.tickWeight,
     valueColor: c.n8,   // data value readouts
     valueWeight: m.valueWeight,

     // ── Accent / semantic ───────────────────────────────────────────────
     // `muted` is the fill for everything that is NOT the point of the chart:
     // the bars outside the top two, the lines behind the focus line. It is a
     // neutral, never a second hue — two hues read as two categories, one hue
     // plus a neutral reads as "these matter, those are context".
     muted: c.n3,
     // Ordered de-emphasis ramp, darkest first. Use when the context itself has
     // internal order worth keeping (a muted cluster, the tail of a donut).
     // Two steps is usually plenty; a long grey ramp is just a palette again.
     mutedScale: [c.n3, c.n2, c.n2a],
     highlight: c.accent,
     callout: c.annotation,
     // A bar or line segment is colored by which side of the series threshold
     // (zero, unless the series sets one) it falls on — so the roles are named
     // for the threshold, not for "good" and "bad". A -3% headcount change and
     // a -3°C temperature are the same geometry and neither is a value
     // judgement. `positive`/`negative` remain as aliases for existing configs.
     aboveThreshold: c.s2,
     belowThreshold: c.counter,
     positive: c.s2,
     negative: c.counter,
     trend: c.s2,
     connectorLabel: c.n5,
     connectorLine: c.n7,   // donut callout rule — darker than the label text it carries
     connectorWidth: m.connectorWidth,

     // ── Chrome (interaction surfaces, not data) ─────────────────────────
     // These used to be hex literals inside the engines, which meant a reskin
     // of theme.js left tooltips and dimmed legend keys on the old palette.
     tooltipBorder: c.n1,   // tooltip box hairline
     // Surface of a small repeated panel that sits ON the canvas — a geofacet
     // tile, and anything else that must read as a distinct box rather than a
     // hole in the page. It has to be a real step away from `bg`: a near-white
     // tile on a cream canvas is invisible, and the whole point of a tile map is
     // that you can see the tiles.
     tileSurface: c.n0a,   // panel/tile fill, one soft step darker than bg
     tileTrack: c.n0,   // empty part of a bar/ring drawn on a tile
     dimmed: c.n2a,   // legend key for a series toggled off
     hoverInk: c.n9,   // ink of the low-opacity hover/crosshair wash

     // ── Series palette ──────────────────────────────────────────────────
     colors: [c.s1, c.s2, c.s3, c.s4, c.s5, c.s6, c.s7],
     defaultColor: c.s1,

     // ── Gradient endpoints (donut, bubble) ──────────────────────────────
     gradientStart: c.s1,
     gradientEnd: c.s2,

     // ── Typography ──────────────────────────────────────────────────────
     font: m.font,
     titleSize: m.titleSize,
     subtitleSize: m.subtitleSize,
     labelSize: m.labelSize,
     tickSize: m.tickSize,
     inlineSize: m.inlineSize,
     valueSize: m.valueSize,
     centerSize: m.centerSize,
     pointLabelSize: m.pointLabelSize,
     legendSize: m.legendSize,
     calloutSize: m.calloutSize,
     tooltipSize: m.tooltipSize,
     noticeSize: m.noticeSize,   // the guard / empty-state headline an engine draws in place of a chart

     // Weights for the two heading roles and the legend. These were literals
     // inside all nine engines, which meant `titleSize` was themeable but the
     // weight beside it was not — a lighter-weight reskin could change the size
     // of a title and nothing else.
     titleWeight: m.titleWeight,
     subtitleWeight: m.subtitleWeight,
     legendWeight: m.legendWeight,

     // ── Vertical rhythm ─────────────────────────────────────────────────
     // Line heights are RATIOS, not pixels. As fixed pixels (they were 21 and
     // 16) a two-line title collided with itself the moment `titleSize` went
     // past ~17, which made the size token unusable for anything but small
     // adjustments. At the default sizes these still round to 21 and 16.
     titleLineHeight: m.titleLineHeight,
     subtitleLineHeight: m.subtitleLineHeight,
     calloutLineHeight: m.calloutLineHeight,

     // ── Strokes / weights ───────────────────────────────────────────────
     axisWidth: m.axisWidth,
     gridWidth: m.gridWidth,
     lineWidth: m.lineWidth,
     spineWidth: m.spineWidth,
     tickLength: m.tickLength,
     tickWidth: m.tickWidth,

     // ── Heading block ───────────────────────────────────────────────────
     // The title/subtitle band above every plot. `padTop` is the distance from
     // the top edge to the first title baseline less the title size; `subGap`
     // the extra leading before the first subtitle line; `gap` the clearance
     // under the whole band before the plot starts; `gutter` the left inset the
     // heading shares with the legend.
     //
     // `gap` was 18 in six engines, 26 in waffle and 24-or-nothing in geofacet,
     // so headings sat at three different heights on one dashboard. One token
     // now, and 18 is the value the majority already used.
     headingPadTop: m.headingPadTop,
     headingSubGap: m.headingSubGap,
     headingGap: m.headingGap,
     headingGutter: m.headingGutter,
     // Clearance between the heading band — title, subtitle, and the legend
     // when there is one — and the top of the plot. This was a literal in every
     // engine and it had drifted to three values: 8 in line/column/scatter/
     // donut/geofacet/histogram, 34 in the horizontal bar, and 0 in the
     // row-based engines, plus another 18 that only existed when a legend was
     // present. So the gap under a subtitle was cramped on a chart with no
     // legend and no two chart types in a grid started their plots on the same
     // line. One token now, applied whether or not a legend is drawn.
     plotGap: m.plotGap,
     // Extra band above the plot for an axis whose labels sit on TOP of it —
     // the horizontal bar is the only engine that does this. Named rather than
     // folded into plotGap so it is clear why that one chart differs.
     topAxisBand: m.topAxisBand,

     // ── Callout / annotation box ────────────────────────────────────────
     calloutPad: m.calloutPad,
     calloutMaxWidth: m.calloutMaxWidth,
     calloutLeaderWidth: m.calloutLeaderWidth,
     calloutAnchorRadius: m.calloutAnchorRadius,

     // ── Legend ──────────────────────────────────────────────────────────
     legendRowHeight: m.legendRowHeight,
     legendGap: m.legendGap,
     legendIconSize: m.legendIconSize,
     legendIconGap: m.legendIconGap
   };
  }

  Charts.theme = buildTheme(c, m);

  // ── Presets ─────────────────────────────────────────────────────────
  // A preset is a whole visual identity, not a swatch: the full 23-key palette
  // and, where the style demands it, the handful of metrics that carry it (a
  // Bauhaus chart is not just red and blue, it is thick strokes and heavy
  // titles). Every preset declares every palette key, so switching between two
  // of them can never leave a stray hue behind from the one before.
  //
  // The rules each of them keeps:
  //   • n0 → n9 runs light → dark ON THE PAGE, so a dark preset inverts the
  //     ramp rather than inventing new roles: n8/n9 are still "the text that
  //     reads darkest against the canvas", which on Midnight means near-white.
  //   • n3 holds at least 3:1 against n0 — the WCAG 1.4.11 floor for a
  //     graphical object. Below that the muted context fills stop being data.
  //   • The series ramp varies in LIGHTNESS, not only hue, so it survives
  //     greyscale printing and every form of colour blindness.
  //   • `counter` is never the red-green partner of s2. It is picked from a
  //     different axis of the wheel for exactly that reason.
  const presets = {
    default: {
      label: 'Default',
      note: 'Warm paper, black-to-periwinkle ramp. The library’s own voice.',
      palette: Object.assign({}, c),
      metrics: {}
    },

    // Everything below is a SINGLE-HUE identity: the seven series slots are one
    // hue walked down a lightness ramp in OKLCH, not seven hues chosen to be
    // told apart. That is the trade. A monochrome ramp reads as one family and
    // orders itself — first slot to last is a sequence a reader can follow
    // without a legend — but it leans on lightness alone to separate the
    // series, so it suits ordered or few-series data, not eight unrelated
    // categories. Adjacent steps are kept at ΔE 8 or better so the leaning
    // holds up.
    //
    // `annotation` and `counter` are the deliberate exceptions in each one.
    // They are roles that must NOT read as data, so they are the only places a
    // second hue appears, pulled from the far side of the wheel from the ramp.

    rubric: {
      label: 'Rubric',
      note: 'Garnet on warm paper. Text serif, tight scale, margin notes set as blocks.',
      palette: {
        n0: '#fbfaf9', n0a: '#f1eeed', n1: '#e1dddb',
        n3: '#898381', n2: '#9e9897', n2a: '#bab4b3',
        n4: '#716c6a', n5: '#615c5b', n6: '#524d4c',
        n7: '#3f3b39', n8: '#1c1817', n9: '#0c0807',
        nInverse: '#ffffff',
        s1: '#561d1d', s2: '#803432', s3: '#9e534f', s4: '#b9746f',
        s5: '#cd948f', s6: '#e0b5b1', s7: '#eed4d1',
        // Navy for the callout ink and teal for the counter-direction: on a
        // red chart a red annotation is just another bar.
        accent: '#6b504e', annotation: '#334f6d', counter: '#207070'
      },
      // An annotated manuscript: small, dense type with the margin note
      // treated as a first-class object rather than a tooltip that got stuck.
      // The callout box is half again as wide as the default, padded like a
      // block quote, and hung off a leader heavy enough to read as drawn in
      // the same ink as the text.
      metrics: {
        font: "'Charter','Bitstream Charter','Source Serif Pro',Cambria,Georgia,serif",
        titleSize: 16, subtitleSize: 11.5, labelSize: 11, tickSize: 10,
        valueSize: 10.5, legendSize: 11, calloutSize: 11,
        titleWeight: 600, subtitleWeight: 400, valueWeight: 600,
        titleLineHeight: 1.2, subtitleLineHeight: 1.4, calloutLineHeight: 1.4,
        calloutPad: 11, calloutMaxWidth: 300, calloutLeaderWidth: 1.6,
        calloutAnchorRadius: 3.5,
        lineWidth: 2, gridWidth: 0.5, axisWidth: 1.2, spineWidth: 0.9,
        tickLength: 4, tickWidth: 1,
        headingPadTop: 16, headingGap: 16, plotGap: 14,
        legendRowHeight: 18, legendIconSize: 10, legendIconGap: 5
      }
    },

    editorial: {
      label: 'Ink & Ochre',
      note: 'Newsprint stock, earth ramp, big serif headline over a dense scale.',
      palette: {
        n0: '#faf6ee', n0a: '#eee6d6', n1: '#e0d8c8',
        n3: '#857c70', n2: '#9d9385', n2a: '#bcb3a3',
        n4: '#6b6355', n5: '#5b5449', n6: '#4a443b',
        n7: '#38332c', n8: '#1c1814', n9: '#100d0a',
        nInverse: '#faf6ee',
        s1: '#1c1814', s2: '#ad5518', s3: '#cf8033', s4: '#dfa25c',
        s5: '#ebc38c', s6: '#f2dcb6', s7: '#f7ead6',
        accent: '#7a3b12', annotation: '#8c1c13', counter: '#2f6b6f'
      },
      // A broadsheet column: a big serif headline over a tight, quiet body.
      // The whole scale below the title shrinks and the leading closes up,
      // because a newspaper chart earns its space by being dense — and the
      // legend is set small and close, the way a key under a printed figure is.
      metrics: {
        font: "'Iowan Old Style','Palatino Linotype',Georgia,'Times New Roman',serif",
        titleSize: 20, subtitleSize: 11.5, labelSize: 11, tickSize: 10,
        valueSize: 10.5, inlineSize: 10.5, legendSize: 11, calloutSize: 10,
        titleWeight: 600, subtitleWeight: 400, categoryWeight: 700, valueWeight: 700,
        titleLineHeight: 1.16, subtitleLineHeight: 1.3,
        headingPadTop: 18, headingSubGap: 6, headingGap: 16, plotGap: 13,
        lineWidth: 2.5, gridWidth: 0.5, axisWidth: 1.6, spineWidth: 1.4,
        tickLength: 5, tickWidth: 1.2,
        legendRowHeight: 17, legendGap: 14, legendIconSize: 9, legendIconGap: 5
      }
    },

    botanical: {
      label: 'Botanical',
      note: 'Low-chroma sage, humanist type, hairline rules. Quiet in colour and in spacing.',
      palette: {
        n0: '#f8fbf9', n0a: '#eaf0eb', n1: '#d8e1d9',
        n3: '#7d887e', n2: '#929d94', n2a: '#afb9b0',
        n4: '#667068', n5: '#576158', n6: '#485149',
        n7: '#353f37', n8: '#141c15', n9: '#050b06',
        nInverse: '#ffffff',
        s1: '#12452c', s2: '#266645', s3: '#498362', s4: '#6c9e80',
        s5: '#90b79f', s6: '#b3d0be', s7: '#d2e3d8',
        accent: '#325642', annotation: '#8d3a2f', counter: '#6b588d'
      },
      // A field guide: humanist type, thin rules and a lot of air. Everything
      // that can be lighter is lighter — the axis is a hairline, the ticks are
      // stubs, the title drops to semibold — and every gap opens up, because
      // the quiet in this preset is spacing as much as it is chroma.
      metrics: {
        font: "'Optima','Gill Sans MT','Gill Sans','Segoe UI',Candara,sans-serif",
        titleSize: 17, subtitleSize: 12.5, labelSize: 11.5, tickSize: 11,
        legendSize: 12, calloutSize: 10.5,
        titleWeight: 600, categoryWeight: 500, valueWeight: 600, legendWeight: 500,
        titleLineHeight: 1.3, subtitleLineHeight: 1.45, calloutLineHeight: 1.4,
        headingPadTop: 22, headingSubGap: 10, headingGap: 24,
        headingGutter: 24, plotGap: 20,
        lineWidth: 2.5, gridWidth: 0.6, axisWidth: 1.2, spineWidth: 0.9,
        tickLength: 4, tickWidth: 1,
        calloutPad: 10, calloutAnchorRadius: 4,
        legendRowHeight: 22, legendGap: 22, legendIconSize: 10, legendIconGap: 8
      }
    },

    cyanotype: {
      label: 'Cyanotype',
      note: 'Dark. Muted teal, monospaced throughout, tabular figures. A measured plate.',
      palette: {
        n0: '#111719', n0a: '#1d2426', n1: '#2b3538',
        n3: '#758387', n2: '#89969a', n2a: '#9faaad',
        n4: '#929ea1', n5: '#a1abae', n6: '#b4bcbe',
        n7: '#cfd6d7', n8: '#f0f4f5', n9: '#e4e9ea',
        nInverse: '#111719',
        // On a dark ground the ramp runs the other way: s1 is the brightest,
        // because the first series should be the one that carries furthest.
        // The s1→s2 step is wider than the rest on purpose (ΔE 13 against the
        // ramp's 8): a two-series chart only ever uses those two, and in a
        // legend chip at 12px an even step reads as one colour twice.
        s1: '#9fdfef', s2: '#63c0d6', s3: '#45abc1', s4: '#3695a9',
        s5: '#2c7f91', s6: '#276a78', s7: '#235560',
        accent: '#22454e', annotation: '#dbb87e', counter: '#d08b6c'
      },
      // A measured plate. Monospaced throughout, which is the whole point: on
      // a technical drawing the numbers are the subject, and tabular figures
      // stop a column of readouts from wobbling. Long ticks and a heavy spine
      // give the plot a drawn frame; the data line is thin because on this
      // ground a thick one glows.
      metrics: {
        font: "'IBM Plex Mono','Cascadia Mono',Consolas,'SF Mono',ui-monospace,monospace",
        titleSize: 15.5, subtitleSize: 11, labelSize: 10.5, tickSize: 10,
        valueSize: 10, inlineSize: 10, legendSize: 10.5, calloutSize: 9.5,
        pointLabelSize: 9.5, tooltipSize: 11,
        titleWeight: 600, subtitleWeight: 400, categoryWeight: 500,
        valueWeight: 600, legendWeight: 500,
        titleLineHeight: 1.28, calloutLineHeight: 1.35,
        headingPadTop: 16, headingGap: 16, plotGap: 14,
        lineWidth: 2, gridWidth: 0.5, axisWidth: 1.8, spineWidth: 1.2,
        tickLength: 9, tickWidth: 1.2,
        calloutPad: 7, calloutMaxWidth: 200, calloutLeaderWidth: 1,
        calloutAnchorRadius: 3,
        legendRowHeight: 18, legendGap: 16, legendIconSize: 9, legendIconGap: 6
      }
    },

    orchid: {
      label: 'Orchid',
      note: 'Dark. Mauve through plum, neutral grotesque set a size up. Built for a room.',
      palette: {
        n0: '#181519', n0a: '#252126', n1: '#363138',
        n3: '#847d87', n2: '#97919a', n2a: '#aba5ad',
        n4: '#9f99a0', n5: '#aca7ae', n6: '#bdb9be',
        n7: '#d6d3d7', n8: '#f5f2f5', n9: '#e9e7ea',
        nInverse: '#181519',
        s1: '#e6c5f0', s2: '#ca9ed8', s3: '#b588c3', s4: '#9e75ab',
        s5: '#876392', s6: '#705379', s7: '#5a4361',
        accent: '#4a3f52', annotation: '#d5c484', counter: '#7dbb9a'
      },
      // Built to be read from the back of a room, which is a reason to set
      // everything a size up — not a licence to shout. A neutral grotesque, a
      // 3px line, and ticks kept short rather than deleted: at projection
      // distance a tick still tells you the gridline is a reading and not a
      // rule. The legend gets real row pitch for the same reason.
      metrics: {
        font: "'Poppins','Century Gothic','Futura','Avenir Next','Segoe UI',sans-serif",
        titleSize: 20, subtitleSize: 13, labelSize: 12, tickSize: 11.5,
        valueSize: 12, inlineSize: 12, centerSize: 16, legendSize: 12.5,
        calloutSize: 11.5, tooltipSize: 13, noticeSize: 15,
        titleWeight: 700, subtitleWeight: 400, categoryWeight: 600,
        valueWeight: 700, legendWeight: 600,
        titleLineHeight: 1.2, subtitleLineHeight: 1.35,
        headingPadTop: 20, headingSubGap: 9, headingGap: 22,
        headingGutter: 22, plotGap: 20, topAxisBand: 24,
        lineWidth: 4, gridWidth: 0.5, axisWidth: 1.2, spineWidth: 0.9,
        tickLength: 0, tickWidth: 0.5,
        calloutPad: 10, calloutMaxWidth: 240, calloutLeaderWidth: 1.6,
        calloutAnchorRadius: 5,
        legendRowHeight: 24, legendGap: 22, legendIconSize: 14, legendIconGap: 8
      }
    }
  };

  Charts.presets = presets;

  // The pristine metric values, captured before any preset has run, plus the
  // union of every metric key any preset touches. Switching presets restores
  // that union first, so leaving Bauhaus takes its 4.5px strokes with it
  // instead of stranding them on a preset that never asked for them.
  const metricDefaults = Object.assign({}, m);
  const presetMetricKeys = Object.keys(presets).reduce(function (set, name) {
    Object.keys(presets[name].metrics).forEach(function (k) { set[k] = true; });
    return set;
  }, {});

  /**
   * Swap the whole visual identity. Applies the preset's palette in full and
   * its metric overrides on top of the shipped metric defaults.
   *
   * @param {string} name  a key of Charts.presets
   * @returns {Object} the updated Charts.theme
   */
  Charts.applyPreset = function (name) {
    const p = presets[name];
    if (!p) return Charts.theme;
    const metrics = {};
    for (const k in presetMetricKeys) metrics[k] = metricDefaults[k];
    Object.assign(metrics, p.metrics);
    Charts.applyPalette(p.palette);
    return Charts.applyMetrics(metrics);
  };

  /**
   * Re-derive every palette-backed theme role from a set of palette edits.
   * Used by the theme editor page (charts-lib/theme-editor.html) to make a
   * swatch change show up in a re-rendered chart.
   *
   * Writes into the EXISTING Charts.theme object rather than replacing it, so
   * per-page overrides of non-palette roles (sizes, weights, font) survive and
   * anything holding a reference to Charts.theme keeps seeing live values.
   *
   * @param {Object} overrides  palette keys → hex, e.g. { n0: '#ffffff' }
   * @returns {Object} the updated Charts.theme
   */
  Charts.applyPalette = function (overrides) {
    if (overrides) for (const k in overrides) {
      if (Object.prototype.hasOwnProperty.call(c, k)) c[k] = overrides[k];
    }
    return Object.assign(Charts.theme, buildTheme(c, m));
  };

  /**
   * The metrics half of the same contract: re-derive every metric-backed theme
   * role from a set of edits to sizes, weights, leading, spacing or strokes.
   *
   * Kept separate from applyPalette so each half can be edited without the
   * other having to be replayed, but both rebuild from the same two objects —
   * so a swatch change no longer discards a type-scale change, which is what
   * happened while these values were literals inside buildTheme.
   *
   * Unknown keys are ignored, exactly as applyPalette ignores unknown swatches.
   *
   * @param {Object} overrides  metric keys → value, e.g. { titleSize: 20 }
   * @returns {Object} the updated Charts.theme
   */
  Charts.applyMetrics = function (overrides) {
    if (overrides) for (const k in overrides) {
      if (Object.prototype.hasOwnProperty.call(m, k)) m[k] = overrides[k];
    }
    return Object.assign(Charts.theme, buildTheme(c, m));
  };
})();
