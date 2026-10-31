// film-lib/geom.js: matrices and the solids every cast item is built from.
//
// World units are metres, z is up, the ground is z = 0. A geometry is a
// non-indexed triangle list: { pos, nrm } as Float32Arrays, plus `uv` for a
// decal quad. Nothing here knows what a laptop or a person is: the cast files
// a film writes build those from these solids.
(function (root) {
  'use strict';
  const Film = root.Film = root.Film || {};
  const D2R = Math.PI / 180;

  // ── mat4, column-major (WebGL order) ──────────────────────────────────
  const M = {
    identity() { return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; },
    mul(a, b) {
      const o = new Array(16);
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
        o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
      }
      return o;
    },
    translate(x, y, z) { return [1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]; },
    scale(x, y, z) { return [x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1]; },
    rotX(d) { const c = Math.cos(d * D2R), s = Math.sin(d * D2R); return [1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]; },
    rotY(d) { const c = Math.cos(d * D2R), s = Math.sin(d * D2R); return [c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]; },
    rotZ(d) { const c = Math.cos(d * D2R), s = Math.sin(d * D2R); return [c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]; },
    // at, rot (degrees, applied x then y then z), scale (number or [x,y,z])
    trs(at, rot, scale) {
      let m = M.identity();
      if (at) m = M.translate(at[0] || 0, at[1] || 0, at[2] || 0);
      if (rot) {
        const r = typeof rot === 'number' ? [0, 0, rot] : rot;
        if (r[2]) m = M.mul(m, M.rotZ(r[2]));
        if (r[1]) m = M.mul(m, M.rotY(r[1]));
        if (r[0]) m = M.mul(m, M.rotX(r[0]));
      }
      if (scale != null) {
        const s = typeof scale === 'number' ? [scale, scale, scale] : scale;
        m = M.mul(m, M.scale(s[0], s[1], s[2]));
      }
      return m;
    },
    point(m, p) {
      return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
              m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
              m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
    },
    invert(m) {
      const a = m, o = new Array(16);
      const b00 = a[0]*a[5]-a[1]*a[4], b01 = a[0]*a[6]-a[2]*a[4], b02 = a[0]*a[7]-a[3]*a[4];
      const b03 = a[1]*a[6]-a[2]*a[5], b04 = a[1]*a[7]-a[3]*a[5], b05 = a[2]*a[7]-a[3]*a[6];
      const b06 = a[8]*a[13]-a[9]*a[12], b07 = a[8]*a[14]-a[10]*a[12], b08 = a[8]*a[15]-a[11]*a[12];
      const b09 = a[9]*a[14]-a[10]*a[13], b10 = a[9]*a[15]-a[11]*a[13], b11 = a[10]*a[15]-a[11]*a[14];
      let det = b00*b11 - b01*b10 + b02*b09 + b03*b08 - b04*b07 + b05*b06;
      if (!det) return M.identity();
      det = 1 / det;
      o[0] = (a[5]*b11 - a[6]*b10 + a[7]*b09) * det;  o[1] = (a[2]*b10 - a[1]*b11 - a[3]*b09) * det;
      o[2] = (a[13]*b05 - a[14]*b04 + a[15]*b03) * det; o[3] = (a[10]*b04 - a[9]*b05 - a[11]*b03) * det;
      o[4] = (a[6]*b08 - a[4]*b11 - a[7]*b07) * det;  o[5] = (a[0]*b11 - a[2]*b08 + a[3]*b07) * det;
      o[6] = (a[14]*b02 - a[12]*b05 - a[15]*b01) * det; o[7] = (a[8]*b05 - a[10]*b02 + a[11]*b01) * det;
      o[8] = (a[4]*b10 - a[5]*b08 + a[7]*b06) * det;  o[9] = (a[1]*b08 - a[0]*b10 - a[3]*b06) * det;
      o[10] = (a[12]*b04 - a[13]*b02 + a[15]*b00) * det; o[11] = (a[9]*b02 - a[8]*b04 - a[11]*b00) * det;
      o[12] = (a[5]*b07 - a[4]*b09 - a[6]*b06) * det; o[13] = (a[0]*b09 - a[1]*b07 + a[2]*b06) * det;
      o[14] = (a[13]*b01 - a[12]*b03 - a[14]*b00) * det; o[15] = (a[8]*b03 - a[9]*b01 + a[10]*b00) * det;
      return o;
    },
    // 3x3 normal matrix (inverse transpose of the upper-left 3x3)
    normal(m) {
      const i = M.invert(m);
      return [i[0], i[4], i[8], i[1], i[5], i[9], i[2], i[6], i[10]];
    },
    perspective(fovDeg, aspect, near, far) {
      const f = 1 / Math.tan(fovDeg * D2R / 2), nf = 1 / (near - far);
      return [f / aspect,0,0,0, 0,f,0,0, 0,0,(far + near) * nf,-1, 0,0,2 * far * near * nf,0];
    },
    ortho(l, r, b, t, n, f) {
      return [2/(r-l),0,0,0, 0,2/(t-b),0,0, 0,0,-2/(f-n),0, -(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1];
    },
    lookAt(eye, target, up) {
      let z = V.norm(V.sub(eye, target));
      let x = V.cross(up, z);
      if (V.len(x) < 1e-6) x = V.cross([0, 1, 0], z);
      x = V.norm(x);
      const y = V.cross(z, x);
      return [x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0,
        -V.dot(x, eye), -V.dot(y, eye), -V.dot(z, eye), 1];
    }
  };

  const V = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: a => Math.hypot(a[0], a[1], a[2]),
    norm(a) { const l = V.len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
  };

  // ── triangle-list builder ─────────────────────────────────────────────
  function Builder() { this.p = []; this.n = []; this.uv = null; }
  Builder.prototype.tri = function (a, b, c, na, nb, nc) {
    if (!na) na = nb = nc = V.norm(V.cross(V.sub(b, a), V.sub(c, a)));
    this.p.push(...a, ...b, ...c);
    this.n.push(...na, ...(nb || na), ...(nc || na));
  };
  // a flat convex-or-concave polygon (3D points, counter-clockwise seen from its front)
  Builder.prototype.poly = function (pts, normal) {
    const n = normal || newell(pts);
    const tris = earClip(pts, n);
    for (const [a, b, c] of tris) this.tri(pts[a], pts[b], pts[c], n, n, n);
  };
  Builder.prototype.quad = function (a, b, c, d, na, nb, nc, nd) {
    this.tri(a, b, c, na, nb, nc);
    this.tri(a, c, d, na, nc, nd);
  };
  Builder.prototype.done = function () {
    const g = { pos: new Float32Array(this.p), nrm: new Float32Array(this.n) };
    if (this.uv) g.uv = new Float32Array(this.uv);
    g.count = this.p.length / 3;
    g.bounds = bounds(g.pos);
    return g;
  };

  function newell(pts) {
    let x = 0, y = 0, z = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      x += (a[1] - b[1]) * (a[2] + b[2]); y += (a[2] - b[2]) * (a[0] + b[0]); z += (a[0] - b[0]) * (a[1] + b[1]);
    }
    return V.norm([x, y, z]);
  }

  // Ear clipping in the polygon's own plane. Returns index triples.
  function earClip(pts, n) {
    const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]);
    const [u, v] = az >= ax && az >= ay ? [0, 1] : ax >= ay ? [1, 2] : [2, 0];
    const sgn = (az >= ax && az >= ay ? n[2] : ax >= ay ? n[0] : n[1]) >= 0 ? 1 : -1;
    const P = pts.map(p => [p[u], p[v] * sgn]);
    const area2 = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    // either winding is accepted: clip in counter-clockwise order
    let sa = 0;
    for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; sa += a[0] * b[1] - b[0] * a[1]; }
    const idx = P.map((_, i) => i), out = [];
    if (sa < 0) idx.reverse();
    const inside = (p, a, b, c) => area2(a, b, p) >= 0 && area2(b, c, p) >= 0 && area2(c, a, p) >= 0;
    let guard = 0;
    while (idx.length > 3 && guard++ < 10000) {
      let clipped = false;
      for (let i = 0; i < idx.length; i++) {
        const ia = idx[(i + idx.length - 1) % idx.length], ib = idx[i], ic = idx[(i + 1) % idx.length];
        const a = P[ia], b = P[ib], c = P[ic];
        if (area2(a, b, c) <= 1e-12) continue;
        let ok = true;
        for (const j of idx) {
          if (j === ia || j === ib || j === ic) continue;
          if (inside(P[j], a, b, c)) { ok = false; break; }
        }
        if (!ok) continue;
        out.push([ia, ib, ic]); idx.splice(i, 1); clipped = true; break;
      }
      if (!clipped) break;
    }
    if (idx.length === 3) out.push([idx[0], idx[1], idx[2]]);
    return out;
  }

  function signedArea(poly) {
    let s = 0;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      s += a[0] * b[1] - b[0] * a[1];
    }
    return s / 2;
  }

  function bounds(pos) {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) {
      if (pos[i + k] < lo[k]) lo[k] = pos[i + k];
      if (pos[i + k] > hi[k]) hi[k] = pos[i + k];
    }
    return { lo, hi };
  }

  function check(name, cond, msg) {
    if (!cond) throw new Error('Film.' + name + ': ' + msg);
  }

  // ── solids ────────────────────────────────────────────────────────────
  const G = {};

  // w along x, d along y, h up; centred on x and y, sitting on z = 0.
  // `bevel` cuts every edge at 45 degrees by that much (metres): the soft,
  // toy-like block that catches a thin line of light along each edge.
  G.box = function (w, d, h, bevel) {
    check('box', w > 0 && d > 0 && h > 0, 'size must be three positive numbers, got ' + [w, d, h]);
    if (bevel) return chamferBox(w, d, h, Math.min(bevel, w / 2.01, d / 2.01, h / 2.01));
    const x = w / 2, y = d / 2, b = new Builder();
    const c = [[-x,-y,0],[x,-y,0],[x,y,0],[-x,y,0],[-x,-y,h],[x,-y,h],[x,y,h],[-x,y,h]];
    b.poly([c[4], c[5], c[6], c[7]], [0, 0, 1]);
    b.poly([c[3], c[2], c[1], c[0]], [0, 0, -1]);
    b.poly([c[0], c[1], c[5], c[4]], [0, -1, 0]);
    b.poly([c[1], c[2], c[6], c[5]], [1, 0, 0]);
    b.poly([c[2], c[3], c[7], c[6]], [0, 1, 0]);
    b.poly([c[3], c[0], c[4], c[7]], [-1, 0, 0]);
    return b.done();
  };

  function chamferBox(w, d, h, c) {
    const X = w / 2, Y = d / 2, Z = h / 2, b = new Builder();
    const S = [-1, 1];
    // three points per corner, one on each face the corner touches
    const P = (sx, sy, sz, face) => face === 'x' ? [sx * X, sy * (Y - c), Z + sz * (Z - c)]
      : face === 'y' ? [sx * (X - c), sy * Y, Z + sz * (Z - c)] : [sx * (X - c), sy * (Y - c), Z + sz * Z];
    for (const s of S) {
      b.poly([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => P(s, u, v, 'x')), [s, 0, 0]);
      b.poly([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => P(u, s, v, 'y')), [0, s, 0]);
      b.poly([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => P(u, v, s, 'z')), [0, 0, s]);
    }
    for (const a of S) for (const e of S) {
      // the bevel along each of the twelve edges
      b.poly([P(a, e, -1, 'x'), P(a, e, -1, 'y'), P(a, e, 1, 'y'), P(a, e, 1, 'x')], V.norm([a, e, 0]));
      b.poly([P(a, -1, e, 'x'), P(a, -1, e, 'z'), P(a, 1, e, 'z'), P(a, 1, e, 'x')], V.norm([a, 0, e]));
      b.poly([P(-1, a, e, 'y'), P(-1, a, e, 'z'), P(1, a, e, 'z'), P(1, a, e, 'y')], V.norm([0, a, e]));
    }
    for (const sx of S) for (const sy of S) for (const sz of S) {
      b.poly([P(sx, sy, sz, 'x'), P(sx, sy, sz, 'y'), P(sx, sy, sz, 'z')], V.norm([sx, sy, sz]));
    }
    return b.done();
  }

  // A faceted lump: an icosahedron (detail 0, 20 faces) or once divided
  // (detail 1, 80 faces), each corner pushed in or out a little by a seeded
  // amount, scaled to w x d x h and sitting on z = 0. Flat-shaded, so it reads
  // as cut paper: canopies, bushes, rocks, hills, ice, clouds, a lumpy animal.
  G.facet = function (w, d, h, opts) {
    opts = opts || {};
    check('facet', w > 0 && d > 0 && h > 0, 'size must be three positive numbers');
    const t = (1 + Math.sqrt(5)) / 2;
    let verts = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
      [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(V.norm);
    let faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6],
      [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    for (let k = 0; k < (opts.detail == null ? 1 : opts.detail); k++) {
      const mid = new Map(), next = [];
      const m = (a, c) => {
        const key = a < c ? a + '_' + c : c + '_' + a;
        if (!mid.has(key)) { verts.push(V.norm(V.mul(V.add(verts[a], verts[c]), 0.5))); mid.set(key, verts.length - 1); }
        return mid.get(key);
      };
      for (const [a, b2, c] of faces) {
        const ab = m(a, b2), bc = m(b2, c), ca = m(c, a);
        next.push([a, ab, ca], [b2, bc, ab], [c, ca, bc], [ab, bc, ca]);
      }
      faces = next;
    }
    const rnd = Film.rng ? Film.rng(opts.seed || 1) : Math.random;
    const jit = opts.jitter == null ? 0.12 : opts.jitter;
    verts = verts.map(v => V.mul(v, 1 + (rnd() * 2 - 1) * jit));
    let lo = Infinity;
    for (const v of verts) lo = Math.min(lo, v[2] * h / 2);
    const P = verts.map(v => [v[0] * w / 2, v[1] * d / 2, v[2] * h / 2 - lo]);
    const b = new Builder();
    for (const [a, b2, c] of faces) b.tri(P[a], P[b2], P[c]);
    // keep each face's normal pointing out
    for (let i = 0; i < b.n.length; i += 9) {
      const cx = (b.p[i] + b.p[i + 3] + b.p[i + 6]) / 3, cy = (b.p[i + 1] + b.p[i + 4] + b.p[i + 7]) / 3, cz = (b.p[i + 2] + b.p[i + 5] + b.p[i + 8]) / 3 - h / 2;
      if (b.n[i] * cx + b.n[i + 1] * cy + b.n[i + 2] * cz < 0) for (let k = 0; k < 9; k++) b.n[i + k] = -b.n[i + k];
    }
    return b.done();
  };


  // A 2D outline [[x,y],...] (any winding, may be concave) pushed up by h.
  // axis 'z' (default): outline on the ground, extruded up from z = 0.
  // axis 'x': outline is in (y, z), extruded along x, centred on x = 0.
  // axis 'y': outline is in (x, z), extruded along y, centred on y = 0.
  G.extrude = function (outline, h, axis) {
    check('extrude', Array.isArray(outline) && outline.length >= 3, 'outline needs at least 3 points');
    check('extrude', h > 0, 'depth must be positive');
    let o = outline.map(p => [p[0], p[1]]);
    if (signedArea(o) < 0) o = o.slice().reverse();
    const z0 = axis && axis !== 'z' ? -h / 2 : 0, z1 = z0 + h;
    const b = new Builder();
    b.poly(o.map(p => [p[0], p[1], z1]), [0, 0, 1]);
    b.poly(o.slice().reverse().map(p => [p[0], p[1], z0]), [0, 0, -1]);
    for (let i = 0; i < o.length; i++) {
      const a = o[i], c = o[(i + 1) % o.length];
      const n = V.norm([c[1] - a[1], -(c[0] - a[0]), 0]);
      b.quad([a[0], a[1], z0], [c[0], c[1], z0], [c[0], c[1], z1], [a[0], a[1], z1], n, n, n, n);
    }
    const g = b.done();
    return axis && axis !== 'z' ? permute(g, axis) : g;
  };

  // outline coords (u, v) and extrusion w → world
  function permute(g, axis) {
    const map = axis === 'x' ? (a, i) => [a[i + 2], a[i], a[i + 1]] : (a, i) => [a[i], a[i + 2], a[i + 1]];
    const P = new Float32Array(g.pos.length), N = new Float32Array(g.nrm.length);
    for (let i = 0; i < g.pos.length; i += 3) {
      P.set(map(g.pos, i), i); N.set(map(g.nrm, i), i);
    }
    return { pos: P, nrm: N, count: g.count, bounds: bounds(P) };
  }

  // Surface of revolution about z: profile [[r, z], ...] from bottom to top.
  // Smooth shading around; caps added where the profile starts or ends off-axis.
  G.lathe = function (profile, seg, opts) {
    check('lathe', Array.isArray(profile) && profile.length >= 2, 'profile needs at least 2 [r, z] points');
    seg = seg || 32;
    const flat = opts && opts.flat;
    const b = new Builder();
    const ring = (r, z, a) => [r * Math.cos(a), r * Math.sin(a), z];
    // profile normals (2D, outward), averaged at interior points
    const pn = profile.map((p, i) => {
      const segN = (a, c) => { const dr = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dr, dz) || 1; return [dz / l, -dr / l]; };
      const n1 = i > 0 ? segN(profile[i - 1], p) : null, n2 = i < profile.length - 1 ? segN(p, profile[i + 1]) : null;
      const n = n1 && n2 ? [n1[0] + n2[0], n1[1] + n2[1]] : (n1 || n2);
      const l = Math.hypot(n[0], n[1]) || 1; return [n[0] / l, n[1] / l];
    });
    for (let j = 0; j < seg; j++) {
      const a0 = j / seg * 2 * Math.PI, a1 = (j + 1) / seg * 2 * Math.PI;
      for (let i = 0; i < profile.length - 1; i++) {
        const [r0, z0] = profile[i], [r1, z1] = profile[i + 1];
        const p00 = ring(r0, z0, a0), p01 = ring(r0, z0, a1), p10 = ring(r1, z1, a0), p11 = ring(r1, z1, a1);
        const nn = (k, a) => [pn[k][0] * Math.cos(a), pn[k][0] * Math.sin(a), pn[k][1]];
        if (flat) { b.tri(p00, p01, p11); b.tri(p00, p11, p10); continue; }
        // segment normal for sharp profile corners, interior smoothing otherwise
        b.quad(p00, p01, p11, p10, nn(i, a0), nn(i, a1), nn(i + 1, a1), nn(i + 1, a0));
      }
    }
    const first = profile[0], last = profile[profile.length - 1];
    const cap = (r, z, up) => {
      if (r <= 1e-6) return;
      const pts = [];
      for (let j = 0; j < seg; j++) pts.push(ring(r, z, (up ? j : seg - j) / seg * 2 * Math.PI));
      b.poly(pts, [0, 0, up ? 1 : -1]);
    };
    if (!(opts && opts.open)) {          // open: no caps, a hollow sleeve (a pipe, a lampshade, a bucket's wall)
      cap(first[0], first[1], false);
      cap(last[0], last[1], true);
    }
    return b.done();
  };

  // A ring lying flat, centred on z = 0: R to the middle of the tube, r the
  // tube's radius. Tyres, hoops, steering wheels, life rings, rims.
  G.torus = function (R, r, seg) {
    check('torus', R > r && r > 0, 'needs ring radius > tube radius > 0');
    seg = seg || 36;
    const b = new Builder(), tseg = 16;   // a multiple of 4, so the tube reaches its full width and height
    const at = (u, v) => [(R + r * Math.cos(v)) * Math.cos(u), (R + r * Math.cos(v)) * Math.sin(u), r * Math.sin(v)];
    const nm = (u, v) => [Math.cos(v) * Math.cos(u), Math.cos(v) * Math.sin(u), Math.sin(v)];
    for (let i = 0; i < seg; i++) for (let j = 0; j < tseg; j++) {
      const u0 = 2 * Math.PI * i / seg, u1 = 2 * Math.PI * (i + 1) / seg;
      const v0 = 2 * Math.PI * j / tseg, v1 = 2 * Math.PI * (j + 1) / tseg;
      b.quad(at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1), nm(u0, v0), nm(u1, v0), nm(u1, v1), nm(u0, v1));
    }
    return b.done();
  };

  // Cylinder or frustum standing on z = 0 (r1 bottom, r2 top). Sharp rims.
  G.cylinder = function (r1, r2, h, seg) {
    check('cylinder', r1 >= 0 && r2 >= 0 && h > 0 && (r1 > 0 || r2 > 0), 'radii and height must be positive');
    return G.lathe([[r1, 0], [r2, h]], seg || 32);
  };

  G.sphere = function (r, seg) {
    check('sphere', r > 0, 'radius must be positive');
    seg = seg || 24;
    const prof = [];
    for (let i = 0; i <= seg / 2; i++) {
      const a = -Math.PI / 2 + Math.PI * i / (seg / 2);
      prof.push([Math.max(0, r * Math.cos(a)), r * Math.sin(a)]);
    }
    return G.lathe(prof, seg);
  };

  // Rounded rod along +z from 0 to len (len includes both round ends).
  G.capsule = function (r, len, seg) {
    check('capsule', r > 0 && len >= 2 * r, 'needs radius > 0 and length >= 2 * radius');
    seg = seg || 20;
    const prof = [], k = 6;
    for (let i = 0; i <= k; i++) { const a = -Math.PI / 2 + Math.PI / 2 * i / k; prof.push([r * Math.cos(a), r + r * Math.sin(a)]); }
    for (let i = 0; i <= k; i++) { const a = Math.PI / 2 * i / k; prof.push([r * Math.cos(a), len - r + r * Math.sin(a)]); }
    prof[0][0] = 0; prof[prof.length - 1][0] = 0;
    return G.lathe(prof, seg);
  };

  // A soft block: w x d x h, standing on z = 0, with every edge and corner
  // rounded by `round` (0 nearly a box, 1 an ellipsoid). Sacks, cushions,
  // loaves, foliage clumps, car bodies, boulders, bellies.
  G.rounded = function (w, d, h, round, seg) {
    check('rounded', w > 0 && d > 0 && h > 0, 'size must be three positive numbers');
    const e = Math.max(0.08, Math.min(1, round == null ? 0.4 : round));
    seg = seg || 24;
    const rows = seg / 2, sp = (c, p) => Math.sign(c) * Math.pow(Math.abs(c), p);
    const at = (i, j) => {
      const v = -Math.PI / 2 + Math.PI * i / rows, u = 2 * Math.PI * j / seg;
      return [w / 2 * sp(Math.cos(v), e) * sp(Math.cos(u), e), d / 2 * sp(Math.cos(v), e) * sp(Math.sin(u), e),
        h / 2 + h / 2 * sp(Math.sin(v), e)];
    };
    // normal of the implicit surface |x/a|^(2/e) + |y/b|^(2/e) + |z/c|^(2/e) = 1
    const nrm = p => {
      const q = 2 / e, a = w / 2, b = d / 2, c = h / 2, z = p[2] - c;
      const g = (x, s) => Math.sign(x) * Math.pow(Math.abs(x / s) + 1e-9, q - 1) / s;
      return V.norm([g(p[0], a), g(p[1], b), g(z, c)]);
    };
    const bld = new Builder();
    for (let i = 0; i < rows; i++) for (let j = 0; j < seg; j++) {
      const a = at(i, j), b = at(i, j + 1), c = at(i + 1, j + 1), dd = at(i + 1, j);
      bld.quad(a, b, c, dd, nrm(a), nrm(b), nrm(c), nrm(dd));
    }
    return bld.done();
  };

  // An open box with walls of thickness t: a tray, crate, drawer, skip,
  // container, swimming pool, room. open: 'top' (default) or a side, '-y'
  // (the front), '+y', '-x', '+x', or 'none' (a closed hollow box).
  G.tray = function (w, d, h, t, open) {
    check('tray', w > 2 * t && d > 2 * t && h > t && t > 0, 'walls must be thinner than half the tray');
    open = open || 'top';
    const parts = [];
    const add = (cx, cy, cz, sx, sy, sz) => parts.push([cx, cy, cz, sx, sy, sz]);
    add(0, 0, 0, w, d, t);                                         // floor
    if (open !== 'none' && open !== 'top') add(0, 0, h - t, w, d, t);   // roof when a side is open
    if (open === 'none') add(0, 0, h - t, w, d, t);
    if (open !== '-y') add(0, -d / 2 + t / 2, t, w, t, h - 2 * t + (open === 'top' ? t : 0));
    if (open !== '+y') add(0, d / 2 - t / 2, t, w, t, h - 2 * t + (open === 'top' ? t : 0));
    if (open !== '-x') add(-w / 2 + t / 2, 0, t, t, d - 2 * t, h - 2 * t + (open === 'top' ? t : 0));
    if (open !== '+x') add(w / 2 - t / 2, 0, t, t, d - 2 * t, h - 2 * t + (open === 'top' ? t : 0));
    const P = [], N = [];
    for (const [cx, cy, cz, sx, sy, sz] of parts) {
      const g = G.box(sx, sy, sz);
      for (let i = 0; i < g.pos.length; i += 3) P.push(g.pos[i] + cx, g.pos[i + 1] + cy, g.pos[i + 2] + cz);
      N.push(...g.nrm);
    }
    const pos = new Float32Array(P);
    return { pos, nrm: new Float32Array(N), count: P.length / 3, bounds: bounds(pos) };
  };

  // A round tube along a path of 3D points: ropes, cables, hoses, pipes,
  // vines, rails, tails. smooth (default) rounds the path through its points.
  G.tube = function (points, r, opts) {
    opts = opts || {};
    check('tube', Array.isArray(points) && points.length >= 2 && r > 0, 'needs 2+ points and a radius');
    let pts = points.map(p => [p[0], p[1], p[2] || 0]);
    if (opts.smooth !== false && pts.length > 2) pts = catmull(pts, opts.closed, 8);
    const seg = opts.seg || 12, n = pts.length, closed = !!opts.closed;
    const tang = i => V.norm(V.sub(pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)], pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)]));
    // rotation-minimising frames, so the tube does not twist
    let t = tang(0), nrm = V.norm(V.cross(t, Math.abs(t[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]));
    const rings = [];
    for (let i = 0; i < n; i++) {
      const ti = tang(i);
      nrm = V.norm(V.sub(nrm, V.mul(ti, V.dot(nrm, ti))));
      const bi = V.cross(ti, nrm), ring = [];
      for (let j = 0; j < seg; j++) {
        const a = 2 * Math.PI * j / seg, dir = V.add(V.mul(nrm, Math.cos(a)), V.mul(bi, Math.sin(a)));
        ring.push([V.add(pts[i], V.mul(dir, r)), dir]);
      }
      rings.push(ring);
    }
    const b = new Builder(), last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) for (let j = 0; j < seg; j++) {
      const A = rings[i][j], B = rings[i][(j + 1) % seg], C = rings[(i + 1) % n][(j + 1) % seg], D = rings[(i + 1) % n][j];
      b.quad(A[0], B[0], C[0], D[0], A[1], B[1], C[1], D[1]);
    }
    if (!closed) for (const [i, sgn] of [[0, -1], [n - 1, 1]]) {
      const ring = rings[i].map(x => x[0]);
      b.poly(sgn < 0 ? ring.slice().reverse() : ring, V.mul(tang(i), sgn));
    }
    return b.done();
  };

  function catmull(p, closed, k) {
    const out = [], n = p.length, get = i => closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))];
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      for (let s = 0; s < k; s++) {
        const t = s / k, t2 = t * t, t3 = t2 * t;
        out.push([0, 1, 2].map(c => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
      }
    }
    if (!closed) out.push(p[n - 1]);
    return out;
  }

  // A skin through cross-sections: [[w, [[u, v], ...]], ...] with the same
  // number of points in every outline. axis 'x' (default): each outline is in
  // (y, z) at x = w: hulls, fuselages, car bodies, loaves, a whale. axis 'z':
  // outlines in (x, y) at height w: towers that taper, trunks, vases with a
  // square foot. axis 'y': outlines in (x, z) at y = w. Smooth unless flat.
  G.loft = function (sections, axis, opts) {
    check('loft', Array.isArray(sections) && sections.length >= 2, 'needs 2+ sections [w, outline]');
    const P = sections[0][1].length;
    check('loft', P >= 3 && sections.every(s => s[1].length === P), 'every outline needs the same number of points (3+)');
    axis = axis || 'x';
    const flat = opts && opts.flat;
    const map = axis === 'z' ? p => [p[0], p[1], p[2]] : axis === 'x' ? p => [p[2], p[0], p[1]] : p => [p[0], p[2], p[1]];
    const K = sections.length;
    const pos = sections.map(([w, o]) => o.map(([u, v]) => map([u, v, w])));
    const cen = pos.map(ring => V.mul(ring.reduce((a, q) => V.add(a, q), [0, 0, 0]), 1 / P));
    const fn = [];   // face normals, turned to point away from the sections' centre line
    for (let k = 0; k < K - 1; k++) {
      fn.push([]);
      for (let i = 0; i < P; i++) {
        const a = pos[k][i], b = pos[k][(i + 1) % P], c = pos[k + 1][(i + 1) % P], d = pos[k + 1][i];
        let n = V.norm(V.cross(V.sub(c, a), V.sub(d, b)));
        const mid = V.mul(V.add(V.add(a, b), V.add(c, d)), 0.25), cm = V.mul(V.add(cen[k], cen[k + 1]), 0.5);
        if (V.dot(n, V.sub(mid, cm)) < 0) n = V.mul(n, -1);
        fn[k].push(n);
      }
    }
    const vn = (k, i) => {
      let s = [0, 0, 0];
      for (const kk of [k - 1, k]) if (kk >= 0 && kk < K - 1) for (const ii of [i - 1, i]) s = V.add(s, fn[kk][(ii + P) % P]);
      return V.norm(s);
    };
    const b = new Builder();
    for (let k = 0; k < K - 1; k++) for (let i = 0; i < P; i++) {
      const i1 = (i + 1) % P, a = pos[k][i], bb = pos[k][i1], c = pos[k + 1][i1], d = pos[k + 1][i];
      if (flat) { const n = fn[k][i]; b.quad(a, bb, c, d, n, n, n, n); }
      else b.quad(a, bb, c, d, vn(k, i), vn(k, i1), vn(k + 1, i1), vn(k + 1, i));
    }
    if (!(opts && opts.open)) {
      const run = V.norm(V.sub(cen[K - 1], cen[0]));
      b.poly(pos[0], V.mul(run, -1));
      b.poly(pos[K - 1], run);
    }
    return b.done();
  };

  // A flat w x h rectangle in the x/z plane facing -y, centred, with uv for a decal.
  G.plane = function (w, h) {
    const b = new Builder(), x = w / 2, z = h / 2, n = [0, -1, 0];
    b.quad([-x, 0, -z], [x, 0, -z], [x, 0, z], [-x, 0, z], n, n, n, n);
    b.uv = [0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0];
    return b.done();
  };

  // A flat outline lying on its own z = 0 (ground marks, roads, rivers, shadows of paper).
  G.flat = function (outline) {
    check('flat', Array.isArray(outline) && outline.length >= 3, 'outline needs at least 3 points');
    const b = new Builder();
    let o = outline.slice(); if (signedArea(o) < 0) o.reverse();
    b.poly(o.map(p => [p[0], p[1], 0]), [0, 0, 1]);
    return b.done();
  };

  Film.M = M;
  Film.V = V;
  Film.geom = G;
  Film._earClip = earClip;
  Film._check = check;
  if (typeof module !== 'undefined' && module.exports) module.exports = Film;
})(typeof window !== 'undefined' ? window : globalThis);
