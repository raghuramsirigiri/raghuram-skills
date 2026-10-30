// film-lib/render.js: the WebGL2 renderer.
//
// Flat colour per mesh, lit by one fixed sun plus a sky term, with a soft
// shadow map onto a ground the same colour as the background, so objects sit
// on an endless pale floor (the reference look). No outlines, no textures
// except decals. The light is fixed in the world, so faces change tone as
// the camera moves around them, which is what makes a move read as 3D.
(function (root) {
  'use strict';
  const Film = root.Film = root.Film || {};
  const { M, V } = Film;

  const VS = `#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aN; layout(location=2) in vec2 aUV;
uniform mat4 uModel, uVP, uLightVP; uniform mat3 uNM; uniform float uNormalBias;
out vec3 vN; out vec4 vL; out vec2 vUV;
void main(){
  vec4 w = uModel*vec4(aPos,1.); vN = uNM*aN; vUV = aUV;
  // look up the shadow a little off the surface, along its normal: no acne on curves
  vL = uLightVP*(w + vec4(normalize(vN)*uNormalBias, 0.));
  gl_Position = uVP*w;
}`;

  const FS = `#version 300 es
precision highp float; precision highp sampler2DShadow;
in vec3 vN; in vec4 vL; in vec2 vUV;
uniform vec3 uColor, uLight, uK; uniform float uTexel, uSoft, uShadowDark, uBias, uAlpha, uGlow, uExposure;
uniform sampler2DShadow uShadow; uniform sampler2D uTex; uniform int uUseTex;
out vec4 o;
float shadowAt(){
  vec3 p = vL.xyz/vL.w*0.5+0.5;
  if(p.x<0.||p.x>1.||p.y<0.||p.y>1.||p.z>1.) return 1.;
  float s=0.;
  for(int x=-2;x<=2;x++) for(int y=-2;y<=2;y++) s+=texture(uShadow, vec3(p.xy+vec2(x,y)*uTexel*uSoft, p.z-uBias));
  return s/25.;
}
void main(){
  vec3 n = normalize(vN);
  vec4 base = vec4(uColor,uAlpha);
  if(uUseTex==1){ base = texture(uTex, vUV); if(base.a<0.02) discard; }
  if(uGlow > 0.5){ o = vec4(base.rgb, base.a); return; }   // lamps, lit windows: no light, no shade
  float sh = shadowAt();
  float d = max(dot(n,uLight),0.);
  float lit = uK.x + uK.y*(0.5+0.5*n.z) + uK.z*d*sh - uShadowDark*(1.-sh);
  // A saturated colour (the highlight) loses its form under the soft neutral
  // light, so it gets more contrast: tops lift towards white, sides go deeper.
  // Neutrals have no saturation and are untouched.
  float sat = max(base.r, max(base.g, base.b)) - min(base.r, min(base.g, base.b));
  float up = max(n.z, 0.);
  vec3 c = base.rgb*min(lit - sat*0.16*(1.-up), 1.02);
  c = mix(c, vec3(1.), sat*0.38*up*up*sh);
  o = vec4(c*uExposure, base.a);
}`;

  const DEPTH_VS = `#version 300 es
layout(location=0) in vec3 aPos; uniform mat4 uModel, uLightVP;
void main(){ gl_Position = uLightVP*uModel*vec4(aPos,1.); }`;
  const DEPTH_FS = `#version 300 es
precision mediump float; out vec4 o; void main(){ o = vec4(1.); }`;

  // Tones: an unshadowed top face shows its colour exactly; the face turned
  // to the sun about 0.89 of it, the face turned away about 0.72, so facets
  // and bevels separate the way they do in a toy-diorama illustration; a cast
  // shadow takes a little off the ground. Tuned against the reference stills.
  const DEFAULTS = {
    light: V.norm([-0.35, -0.6, 0.75]),
    ambient: 0.65, sky: 0.14, sun: 0.28,
    shadowDark: 0.06, soft: 1.6, shadowSize: 2048,
    ground: true
  };

  function compile(gl, vs, fs) {
    const p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('Film shader: ' + gl.getShaderInfoLog(s));
      gl.attachShader(p, s);
    }
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Film program: ' + gl.getProgramInfoLog(p));
    const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
    return { p, u };
  }

  function Renderer(canvas, opts) {
    this.canvas = canvas;
    this.o = Object.assign({}, DEFAULTS, opts);
    const gl = this.gl = canvas.getContext('webgl2', { antialias: true, preserveDrawingBuffer: true, alpha: false });
    if (!gl) throw new Error('Film: this browser has no WebGL2 (use a current Chrome, Edge or Firefox)');
    this.main = compile(gl, VS, FS);
    this.depth = compile(gl, DEPTH_VS, DEPTH_FS);
    this.vaos = new WeakMap();
    this.texs = new WeakMap();
    // shadow map
    const S = this.o.shadowSize;
    this.shadowTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, S, S);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    this.shadowFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shadowTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.groundGeom = Film.geom.flat([[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]);  // one face, up
  }

  Renderer.prototype.size = function (w, h) {
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    return this;
  };

  Renderer.prototype.vao = function (g) {
    let v = this.vaos.get(g);
    if (v) return v;
    const gl = this.gl;
    v = gl.createVertexArray();
    gl.bindVertexArray(v);
    const buf = (data, loc, n) => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0);
    };
    buf(g.pos, 0, 3); buf(g.nrm, 1, 3);
    if (g.uv) buf(g.uv, 2, 2); else gl.vertexAttrib2f(2, 0, 0);
    gl.bindVertexArray(null);
    this.vaos.set(g, v);
    return v;
  };

  Renderer.prototype.texture = function (t) {
    let tx = this.texs.get(t);
    if (tx) return tx;
    const gl = this.gl;
    tx = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tx);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, t.canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    // window bands seen at a slant shimmer without anisotropic filtering
    const an = gl.getExtension('EXT_texture_filter_anisotropic');
    if (an) gl.texParameterf(gl.TEXTURE_2D, an.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(an.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.texs.set(t, tx);
    return tx;
  };

  // Projection and view for a camera at this canvas's aspect.
  Renderer.prototype.viewProj = function (cam, R, c, nearAt) {
    const aspect = this.canvas.width / this.canvas.height;
    let up = [0, 0, 1];
    if (cam.roll) {
      const f = V.norm(V.sub(cam.target, cam.eye)), r = V.norm(V.cross(f, up)), u = V.cross(r, f);
      const a = cam.roll * Math.PI / 180;
      up = V.add(V.mul(u, Math.cos(a)), V.mul(r, Math.sin(a)));
    }
    const view = M.lookAt(cam.eye, cam.target, up);
    const d = V.len(V.sub(cam.eye, c));
    // A near plane far enough out keeps depth precise in wide shots, so
    // flat things millimetres apart (roads, markings) don't fight
    const near = nearAt || Math.max(0.02, d - R * 1.6), far = d + R * 3;
    let proj;
    if (!cam.fov) {
      const h = cam.height / (cam.zoom || 1) / 2;
      proj = M.ortho(-h * aspect, h * aspect, -h, h, near, far);
    } else {
      proj = M.perspective(cam.fov / (cam.zoom || 1), aspect, nearAt || Math.max(0.02, near * 0.5), far);
    }
    return M.mul(proj, view);
  };

  // Draw a group (the world, or one cast item) through a camera.
  Renderer.prototype.render = function (world, cam, opts) {
    const o = Object.assign({}, this.o, opts), gl = this.gl;
    const items = [];
    world.walk((m, W) => items.push([m, W]));
    const b = world.bounds();
    // the ground covers well past what any camera here can see
    const c = V.mul(V.add(b.lo, b.hi), 0.5);
    const R = Math.max(1, V.len(V.sub(b.hi, b.lo)) / 2);
    // The ground is the background colour, so where the far plane clips it
    // nothing shows. It is drawn first without writing depth: a flat shape
    // laid at z = 0 never fights it.
    const groundR = Math.max(R * 8, V.len(V.sub(cam.eye, c)) * 4);
    const ground = o.ground ? [{ geom: this.groundGeom, color: o.groundColor || 'ground', shadow: false },
      M.mul(M.translate(c[0], c[1], 0), M.scale(groundR * 2, groundR * 2, 1))] : null;

    // light: an orthographic box around the objects (not the ground), or,
    // for a big world, around what the camera looks at (o.focus), so the
    // shadow map's detail goes where the viewer is looking
    const L = o.light, lUp = Math.abs(L[2]) > 0.99 ? [0, 1, 0] : [0, 0, 1];
    let lc = o.focus ? o.focus.center : c, lR = o.focus ? o.focus.radius : R * 1.15;
    // Stable shadows: the box (o.focus) is fixed for a whole beat by the
    // film; snapping it to whole texels keeps it exact between beats too.
    if (o.focus) {
      const S0 = o.shadowSize, texel = 2 * lR / S0;
      const m0 = M.lookAt(V.add(lc, V.mul(L, lR * 2)), lc, lUp);
      const right = [m0[0], m0[4], m0[8]], up = [m0[1], m0[5], m0[9]];
      const a = V.dot(lc, right), b = V.dot(lc, up);
      lc = V.add(lc, V.add(V.mul(right, Math.round(a / texel) * texel - a), V.mul(up, Math.round(b / texel) * texel - b)));
    }
    const lEye = V.add(lc, V.mul(L, lR * 2));
    const lView = M.lookAt(lEye, lc, lUp);
    const lightVP = M.mul(M.ortho(-lR, lR, -lR, lR, 0.01, lR * 4), lView);

    // pass 1: shadow depth
    const S = o.shadowSize;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo);
    gl.viewport(0, 0, S, S);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
    gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(2, 4);
    gl.useProgram(this.depth.p);
    gl.uniformMatrix4fv(this.depth.u.uLightVP, false, lightVP);
    for (const [m, W] of items) {
      if (!m.shadow || m.tex) continue;
      gl.uniformMatrix4fv(this.depth.u.uModel, false, W);
      gl.bindVertexArray(this.vao(m.geom));
      gl.drawArrays(gl.TRIANGLES, 0, m.geom.count);
    }
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // pass 2: colour
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    // the background is the ground's colour seen at the horizon, darkened by the same exposure
    const bg = Film.color(o.bg || o.groundColor || 'ground').map(v => v * (o.exposure || 1));
    gl.clearColor(bg[0], bg[1], bg[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const P = this.main, u = P.u;
    gl.useProgram(P.p);
    gl.uniformMatrix4fv(u.uVP, false, this.viewProj(cam, R, c, o.near));
    gl.uniformMatrix4fv(u.uLightVP, false, lightVP);
    gl.uniform3fv(u.uLight, L);
    gl.uniform3f(u.uK, o.ambient, o.sky, o.sun);
    gl.uniform1f(u.uTexel, 1 / S);
    gl.uniform1f(u.uSoft, o.soft);
    gl.uniform1f(u.uShadowDark, o.shadowDark);
    gl.uniform1f(u.uBias, 0.0008);
    gl.uniform1f(u.uExposure, o.exposure || 1);
    gl.uniform1f(u.uNormalBias, 2 * lR / S * 1.5);   // one and a half shadow texels
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);
    gl.uniform1i(u.uShadow, 0);
    gl.uniform1i(u.uTex, 1);
    const draw = (m, W) => {
      gl.uniformMatrix4fv(u.uModel, false, W);
      gl.uniformMatrix3fv(u.uNM, false, M.normal(W));
      gl.uniform3fv(u.uColor, Film.color(m.color));
      gl.uniform1f(u.uAlpha, m.opacity == null ? 1 : m.opacity);
      gl.uniform1f(u.uGlow, m.glow ? 1 : 0);
      gl.bindVertexArray(this.vao(m.geom));
      gl.drawArrays(gl.TRIANGLES, 0, m.geom.count);
    };
    gl.uniform1i(u.uUseTex, 0);
    if (ground) { gl.depthMask(false); draw(ground[0], ground[1]); gl.depthMask(true); }
    for (const [m, W] of items) if (!m.tex && !(m.opacity < 1)) draw(m, W);
    // see-through solids (glass, water), furthest first, without writing depth
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    const glass = items.filter(([m]) => !m.tex && m.opacity < 1)
      .map(([m, W]) => [m, W, V.len(V.sub(cam.eye, [W[12], W[13], W[14]]))]).sort((a, b) => b[2] - a[2]);
    gl.depthMask(false);
    for (const [m, W] of glass) draw(m, W);
    gl.depthMask(true);
    // decals last, pulled toward the camera so they sit on their surface;
    // one-sided (a sign seen from behind isn't mirrored) unless twoSided
    gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-1, -2);
    gl.uniform1i(u.uUseTex, 1);
    gl.activeTexture(gl.TEXTURE1);
    for (const [m, W] of items) {
      if (!m.tex) continue;
      gl.bindTexture(gl.TEXTURE_2D, this.texture(m.tex));
      if (m.twoSided) gl.disable(gl.CULL_FACE); else { gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); }
      draw(m, W);
    }
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.POLYGON_OFFSET_FILL); gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
    return this.canvas;
  };

  Film.renderer = (canvas, opts) => new Renderer(canvas, opts);
  Film.Renderer = Renderer;
})(typeof window !== 'undefined' ? window : globalThis);
