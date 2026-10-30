// film-lib/scene.js: groups, colours and the camera.
//
// A cast item is a function that returns a Film.group(). A group holds solids
// and other groups, each with its own at / rot / scale, so a part can move
// later (a lid opens, an arm swings). Colours are theme tokens, so a brand
// recolour (theme.js) recolours the whole world.
(function (root) {
  'use strict';
  const Film = root.Film = root.Film || {};
  const { M, V, geom: G, _check: check } = Film;

  // ── colour ────────────────────────────────────────────────────────────
  // Tokens: every key of Charts.palette (n0 … n9, n0a, n2a, s1 … s7, accent,
  // annotation, counter), plus these film roles:
  //   ground  the floor and the background (n0)
  //   paper   the lightest made thing: paper, white walls, screens (#fbfbf9)
  //   hl      the highlight: the things the current claim counts (s2)
  //   hl2     a second highlight, for a comparison (s4)
  //   hlSoft  a pale highlight, for a group the claim is drawn from (s6)
  const ROLES = { ground: 'n0', hl: 's2', hl2: 's4', hlSoft: 's6' };
  const FIXED = { paper: '#fbfbf9' };

  // Material roles: what a thing is made of, for the things that have a
  // natural colour. The film is monotone unless it asks for colour
  // (Film.worldColor(true), or FILM_META.color): in monotone each role is a
  // theme neutral, so a cast written with roles looks exactly like one written
  // with greys; in colour the same roles are muted, light hues that sit
  // together like an illustrated diorama. The highlights (hl, hl2, hlSoft)
  // are the theme's in both, so what a claim counts still stands out.
  // A brand can set any role's colour as Charts.palette['w-<role>'].
  const MATERIALS = {
    //            monotone   colour
    leaf:       ['n2a', '#9db98b'], leafDark: ['n2', '#7f9f72'], leafLight: ['n1', '#bcd2a7'],
    trunk:      ['n3', '#8b7259'], grass: ['n0a', '#cfdcb5'], earth: ['n0a', '#e6dbc6'],
    sand:       ['n0a', '#eee3cb'], rock: ['n2', '#b3ada3'], snow: ['paper', '#f7f9fa'],
    water:      ['n1', '#a7c8c2'], ice: ['n0a', '#dce9ec'],
    wall:       ['paper', '#f6f1e8'], concrete: ['n1', '#d8d5ce'], brick: ['n1', '#cba18b'],
    roof:       ['n2', '#c58e74'], roofDark: ['n3', '#a6725c'], wood: ['n2a', '#bb9670'],
    metal:      ['n2a', '#a2a9b0'], glass: ['n5', '#66798a'], tyre: ['n7', '#4a4744'],
    skin1:      ['n2a', '#e4c3a8'], skin2: ['n2a', '#c79a7a'], skin3: ['n2a', '#94705a'],
    hair:       ['n5', '#53443b'], hairLight: ['n4', '#a5876a'],
    clothA:     ['n1', '#93a6bf'], clothB: ['n2a', '#d9bb72'], clothC: ['n0a', '#c08e86'],
    clothD:     ['n2', '#88a594'], clothE: ['n3', '#6f6a80'], clothLight: ['n0a', '#ece6da']
  };
  let colourWorld = false;
  // Switch the world's palette: false (the default) monotone, true colour.
  // Resolved when drawn, so one built world renders either way.
  Film.worldColor = function (on) { if (on !== undefined) colourWorld = !!on; return colourWorld; };
  Film.materials = Object.keys(MATERIALS);

  function palette() {
    return (root.Charts && root.Charts.palette) || {};
  }
  function hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }
  // token, '#hex', [r,g,b] (0..1), or { mix: [a, b, t] } between two tokens
  Film.color = function color(c) {
    if (Array.isArray(c)) return c;
    if (c && typeof c === 'object' && c.mix) {
      const a = color(c.mix[0]), b = color(c.mix[1]), t = c.mix[2];
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    }
    check('color', typeof c === 'string', 'expected a theme token or #hex, got ' + JSON.stringify(c));
    if (c[0] === '#') return hexToRgb(c);
    if (FIXED[c]) return hexToRgb(FIXED[c]);
    if (MATERIALS[c]) {
      const brand = palette()['w-' + c];
      return colourWorld ? hexToRgb(brand || MATERIALS[c][1]) : color(MATERIALS[c][0]);
    }
    const p = palette(), key = ROLES[c] || c;
    check('color', p[key], 'unknown colour token "' + c + '" (is theme.js loaded before film-lib?)');
    return hexToRgb(p[key]);
  };
  Film.hex = function (c) {
    const [r, g, b] = Film.color(c);
    return '#' + [r, g, b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
  };

  // ── groups ────────────────────────────────────────────────────────────
  const cache = new Map();
  function cached(key, make) {
    if (!cache.has(key)) cache.set(key, make());
    return cache.get(key);
  }

  function Group(o) {
    this.children = [];
    this.name = (o && o.name) || '';
    this.set(o || {});
  }
  Film.Group = Group;
  Film.group = o => new Group(o);

  // at [x,y,z], rot (degrees: a number turns about z, or [x,y,z]), scale
  Group.prototype.set = function (o) {
    if ('at' in o) this.at = o.at;
    if ('rot' in o) this.rot = o.rot;
    if ('scale' in o) this.scale = o.scale;
    if ('visible' in o) this.visible = o.visible;
    this.matrix = M.trs(this.at, this.rot, this.scale);
    return this;
  };

  function Mesh(g, o) {
    this.geom = g;
    this.color = o.color || 'n0a';
    Film.color(this.color);                 // fail now, not at render time
    this.shadow = o.shadow !== false;
    this.name = o.name || '';
    this.tex = o.tex || null;
    this.twoSided = !!o.twoSided;
    this.glow = !!o.glow;                 // drawn in its own colour, unlit: lamps, lit windows, screens at night
    this.opacity = o.opacity == null ? 1 : o.opacity;    // < 1: glass, water, haze; drawn after solids, casts no shadow
    if (this.opacity < 1) this.shadow = false;
    // axis 'x' or 'y' lays a round solid (cylinder, cone, lathe, capsule, torus) on its side,
    // centred on its at: wheels, rollers, logs, barrels, pipes
    // (only round solids pass _len; extrude and loft use axis for their outline instead)
    this.axis = o._len != null && (o.axis === 'x' || o.axis === 'y') ? o.axis : null;
    this.axisLen = o._len || 0;
    this.set(o);
  }
  Mesh.prototype.set = function (o) {
    Group.prototype.set.call(this, o);
    if (this.axis) {
      const lie = this.axis === 'x' ? M.rotY(90) : M.rotX(-90);
      this.matrix = M.mul(this.matrix, M.mul(lie, M.translate(0, 0, -this.axisLen / 2)));
    }
    return this;
  };
  Mesh.prototype.paint = function (c) { Film.color(c); this.color = c; return this; };
  Film.Mesh = Mesh;

  function addMesh(grp, g, o) {
    const m = new Mesh(g, o || {});
    grp.children.push(m);
    return m;
  }

  // Every solid takes o = { at, rot, scale, color, shadow, name } and returns its mesh.
  Group.prototype.box = function (size, o) {
    check('box', Array.isArray(size) && size.length === 3, 'size is [w, d, h]');
    const bevel = o && o.bevel || 0;
    return addMesh(this, cached('box' + size + '|' + bevel, () => G.box(size[0], size[1], size[2], bevel)), o);
  };
  Group.prototype.extrude = function (outline, depth, o) {
    const axis = o && o.axis || 'z';
    return addMesh(this, cached('ex' + JSON.stringify(outline) + depth + axis, () => G.extrude(outline, depth, axis)), o);
  };
  // r, h; o.top for a different top radius (a frustum), o.seg for facets
  Group.prototype.cylinder = function (r, h, o) {
    const top = o && o.top != null ? o.top : r, seg = o && o.seg || 32;
    return addMesh(this, cached('cy' + [r, top, h, seg], () => G.cylinder(r, top, h, seg)), Object.assign({ _len: h }, o));
  };
  Group.prototype.cone = function (r, h, o) {
    const seg = o && o.seg || 32;
    return addMesh(this, cached('co' + [r, h, seg], () => G.cylinder(r, 0, h, seg)), Object.assign({ _len: h }, o));
  };
  Group.prototype.sphere = function (r, o) {
    const seg = o && o.seg || 24;
    return addMesh(this, cached('sp' + [r, seg], () => G.sphere(r, seg)), o);
  };
  // a faceted lump (o.detail 0 or 1, o.seed, o.jitter): canopies, bushes, rocks, hills, a chunky animal
  Group.prototype.facet = function (size, o) {
    o = o || {};
    const key = 'fa' + size + '|' + [o.detail, o.seed, o.jitter];
    return addMesh(this, cached(key, () => G.facet(size[0], size[1], size[2], o)), o);
  };
  Group.prototype.rounded = function (size, o) {
    const round = o && o.round != null ? o.round : 0.4;
    return addMesh(this, cached('ro' + size + '|' + round, () => G.rounded(size[0], size[1], size[2], round)), o);
  };
  Group.prototype.tray = function (size, o) {
    const t = o && o.wall || Math.min(size[0], size[1]) * 0.06, open = o && o.open || 'top';
    return addMesh(this, cached('tr' + size + '|' + t + open, () => G.tray(size[0], size[1], size[2], t, open)), o);
  };
  Group.prototype.capsule = function (r, len, o) {
    return addMesh(this, cached('ca' + [r, len], () => G.capsule(r, len)), Object.assign({ _len: len }, o));
  };
  Group.prototype.tube = function (points, r, o) {
    o = o || {};
    return addMesh(this, cached('tu' + JSON.stringify(points) + r + (o.closed ? 'c' : '') + (o.smooth === false ? 's' : ''), () => G.tube(points, r, o)), o);
  };
  Group.prototype.loft = function (sections, o) {
    o = o || {};
    return addMesh(this, cached('lo' + JSON.stringify(sections) + (o.axis || 'x') + (o.flat ? 'f' : '') + (o.open ? 'o' : ''),
      () => G.loft(sections, o.axis || 'x', o)), Object.assign({}, o, { axis: null }));
  };
  // a ring lying flat (o.axis 'x' or 'y' stands it up, like a wheel)
  Group.prototype.torus = function (R, r, o) {
    return addMesh(this, cached('to' + [R, r], () => G.torus(R, r)), Object.assign({ _len: 0 }, o));
  };
  Group.prototype.lathe = function (profile, o) {
    const seg = o && o.seg || 32;
    const len = Math.max(...profile.map(p => p[1])) + Math.min(0, ...profile.map(p => p[1]));
    return addMesh(this, cached('la' + JSON.stringify(profile) + seg + (o && o.flat ? 'f' : '') + (o && o.open ? 'o' : ''), () => G.lathe(profile, seg, o)), Object.assign({ _len: len }, o));
  };
  // a flat shape on the surface it's placed on (roads, rugs, markings); casts no shadow
  Group.prototype.flat = function (outline, o) {
    o = Object.assign({ shadow: false }, o);
    return addMesh(this, cached('fl' + JSON.stringify(outline), () => G.flat(outline)), o);
  };
  // A rounded rod from point a to point b (poles, pipes, limbs, cables).
  Group.prototype.rod = function (a, b, r, o) {
    const d = V.sub(b, a), len = V.len(d);
    check('rod', len > 2 * r, 'the two points must be further apart than the rod is thick');
    const yaw = Math.atan2(d[1], d[0]) * 180 / Math.PI;
    const pitch = Math.acos(Math.max(-1, Math.min(1, d[2] / len))) * 180 / Math.PI;
    const g = this.group({ at: a, rot: [0, 0, yaw] });
    const inner = g.group({ rot: [0, pitch, 0] });
    const m = addMesh(inner, cached('ca' + [r, len], () => G.capsule(r, len)), Object.assign({}, o, { at: null, rot: null }));
    return m;
  };
  // A picture painted onto a w x h rectangle: draw(ctx, pw, ph) paints a 2D
  // canvas. The rectangle stands in the x/z plane facing -y; turn it with rot
  // (rot: 90 faces +x, -90 faces -x, 180 faces +y, [-90,0,0] faces up).
  // o.px is pixels per metre (default 400). Use it for screens, signs, paper,
  // maps, posters, labels: any detail that would be silly as geometry.
  Group.prototype.decal = function (w, h, draw, o) {
    o = Object.assign({ shadow: false }, o);
    const px = Math.min(o.px || 400, 2048 / Math.max(w, h));   // a big facade still fits one texture
    const pw = Math.max(2, Math.round(w * px)), ph = Math.max(2, Math.round(h * px));
    // o.key: decals with the same key and size share one picture (window
    // bands on a hundred buildings are one texture, not a hundred)
    const tk = o.key && 'tex|' + o.key + '|' + pw + 'x' + ph;
    // the picture is painted the first time the renderer needs it, not here,
    // so building a world costs no canvas work (and runs without a canvas)
    if (tk && cache.has(tk)) o.tex = cache.get(tk);
    else {
      o.tex = { draw, pw, ph, canvas: null };
      if (tk) cache.set(tk, o.tex);
    }
    return addMesh(this, cached('pl' + [w, h], () => G.plane(w, h)), o);
  };
  // Text on a surface, sized by its cap height in metres (o.size, default 0.1).
  Group.prototype.label = function (text, o) {
    o = Object.assign({ size: 0.1, ink: 'n8', weight: 700 }, o);
    const px = 400, fs = o.size * px / 0.72;
    const font = o.weight + ' ' + fs + 'px ' + Film.font;
    const meas = makeCanvas(2, 2).getContext('2d');
    meas.font = font;
    const w = (meas.measureText(text).width + fs * 0.3) / px, h = fs * 1.3 / px;
    return this.decal(w, h, (ctx, pw, ph) => {
      if (o.bg) { ctx.fillStyle = Film.hex(o.bg); ctx.fillRect(0, 0, pw, ph); }
      ctx.font = font; ctx.fillStyle = Film.hex(o.ink);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, pw / 2, ph / 2);
    }, Object.assign({}, o, { px }));
  };
  // Seeded random numbers, 0..1: the same seed gives the same crowd, canopy
  // or scatter on every render, so a film never flickers between frames.
  Film.rng = function (seed) {
    let a = (seed | 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  Film.font = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';

  // A child group placed in this one. Returns the child.
  Group.prototype.group = function (o) {
    const g = new Group(o);
    this.children.push(g);
    return g;
  };
  // Place an existing group (a built cast item) in this one.
  Group.prototype.add = function (g, o) {
    check('add', g instanceof Group, 'add() takes a Film.group(); call the cast function first');
    if (o) g.set(o);
    this.children.push(g);
    return g;
  };
  // Recolour every mesh (optionally only those whose name matches).
  // Every part, hidden or not: a thing painted while hidden shows its colour
  // when it appears (walk() skips hidden parts, so paint doesn't use it).
  Group.prototype.paint = function (c, match) {
    Film.color(c);
    (function visit(n) {
      for (const k of n.children) {
        if (k.children) visit(k);
        else if (!match || k.name === match) k.paint(c);
      }
    })(this);
    return this;
  };
  Group.prototype.find = function (name) {
    let hit = null;
    (function f(n) {
      if (hit) return;
      if (n.name === name) { hit = n; return; }
      if (n.children) n.children.forEach(f);
    })(this);
    return hit;
  };
  // Where a point on a part is in this group's space: g.locate('handL') is
  // the posed hand's joint; g.locate(node, [0, 0, -0.1]) a point 10 cm down
  // that part. Use it to put a held thing where a posed hand is.
  Group.prototype.locate = function (part, p) {
    const target = typeof part === 'string' ? this.find(part) : part;
    Film._check('locate', target, 'no part named ' + JSON.stringify(part));
    let hit = null;
    (function f(n, W) {
      if (hit) return;
      const Wn = M.mul(W, n.matrix);
      if (n === target) { hit = M.point(Wn, p || [0, 0, 0]); return; }
      if (n.children) n.children.forEach(c => f(c, Wn));
    })(this, M.identity());
    return hit;
  };

  // Visit every visible mesh with its world matrix.
  Group.prototype.walk = function (fn, parent) {
    if (this.visible === false) return;
    const W = parent ? M.mul(parent, this.matrix) : this.matrix;
    for (const c of this.children) {
      if (c instanceof Group) c.walk(fn, W);
      else if (c.visible !== false) fn(c, M.mul(W, c.matrix));
    }
  };
  // World bounds { lo, hi } of everything that casts a shadow or has a colour.
  Group.prototype.bounds = function () {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    this.walk((m, W) => {
      const b = m.geom.bounds;
      for (let i = 0; i < 8; i++) {
        const p = M.point(W, [i & 1 ? b.hi[0] : b.lo[0], i & 2 ? b.hi[1] : b.lo[1], i & 4 ? b.hi[2] : b.lo[2]]);
        for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); }
      }
    });
    if (lo[0] === Infinity) return { lo: [0, 0, 0], hi: [0, 0, 0] };
    return { lo, hi };
  };

  function makeCanvas(w, h) {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
    const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
  }
  Film._makeCanvas = makeCanvas;

  // ── camera ────────────────────────────────────────────────────────────
  // Orbit framing: look at `target` from azimuth az (degrees, 0 = from +x,
  // -90 = from -y, the front), elevation el (0 = eye level, 90 = straight
  // down), distance dist. fov is the vertical lens angle: 20-35 reads as a
  // film lens; 0 means orthographic, framing `height` metres. zoom narrows
  // the lens (2 = twice as close) without moving the camera.
  Film.camera = function (o) {
    o = Object.assign({ target: [0, 0, 0], az: -60, el: 30, dist: 10, fov: 30, zoom: 1, roll: 0 }, o);
    const a = o.az * Math.PI / 180, e = o.el * Math.PI / 180;
    const eye = o.eye || V.add(o.target, V.mul([Math.cos(a) * Math.cos(e), Math.sin(a) * Math.cos(e), Math.sin(e)], o.dist));
    return { eye, target: o.target, fov: o.fov, zoom: o.zoom, height: o.height || o.dist * 0.5, roll: o.roll,
      az: o.az, el: o.el, dist: o.dist };
  };

  // Frame a group (or bounds) so all of it shows: returns a camera.
  Film.frame = function (what, o) {
    o = Object.assign({ az: -60, el: 30, fov: 30, margin: 1.12, aspect: 16 / 9 }, o);
    const b = what instanceof Group ? what.bounds() : what;
    const c = V.mul(V.add(b.lo, b.hi), 0.5), R = Math.max(0.05, V.len(V.sub(b.hi, b.lo)) / 2) * o.margin;
    const half = Math.min(o.fov || 30, 2 * Math.atan(Math.tan((o.fov || 30) * Math.PI / 360) * o.aspect) * 180 / Math.PI) / 2;
    const dist = R / Math.sin(half * Math.PI / 180);
    const cam = Film.camera(Object.assign({}, o, { target: c, dist, height: 2 * R }));
    return cam;
  };

  // Ease between two cameras (t 0..1, already eased by the caller): orbit
  // angles, distance, target and lens move together, so a move is one arc.
  Film.lerpCamera = function (a, b, t) {
    const L = (x, y) => x + (y - x) * t;
    let daz = ((b.az - a.az) % 360 + 540) % 360 - 180;
    return Film.camera({ target: V.lerp(a.target, b.target, t), az: a.az + daz * t, el: L(a.el, b.el),
      dist: L(a.dist, b.dist), fov: L(a.fov, b.fov), zoom: L(a.zoom, b.zoom), roll: L(a.roll || 0, b.roll || 0),
      height: L(a.height, b.height) });
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Film;
})(typeof window !== 'undefined' ? window : globalThis);
