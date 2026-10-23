/*!
 * things/people.js — a person: faceless, monochrome, upright on their spot in
 * the 2.5D world (the way isometric illustration draws people), lit from the
 * top left. A seed varies height, build, hair and clothes so a group isn't
 * clones; only the share wears the accent.
 *
 *   "picture": { "things": "person", "arrange": "queue", "of": "product page visits" }
 *
 * Poses: stand, walk (with a phase), phone (looking at one), card (holding a
 * card: an account, a payment), sheet (holding a form).
 */
(function (root) {
  'use strict';
  const M = root.Motion;
  const H = 90;                      // height in world px at scale 1

  const hash = n => { const s = Math.sin(n * 91.345 + 47.853) * 43758.5453; return s - Math.floor(s); };
  const pick = (arr, k) => arr[Math.floor(k * arr.length) % arr.length];

  function rr(ctx, x, y, w, h, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); else ctx.rect(x, y, w, h);
    ctx.fill();
  }
  function disc(ctx, x, y, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }

  // o: { mat, body (tint), kind: 'rest' | 'share' | 'part', seed, pose, phase, alpha }
  function draw(V, x, y, z, o) {
    const m = o.mat, ctx = V.ctx, sd = o.seed || 0;
    const tall = H * (0.94 + hash(sd) * 0.12) * V.s, wide = 0.94 + hash(sd + 3) * 0.12;
    const u = tall;                                     // one person-height in screen px
    const [fx, fy] = V.P(x, y, z);
    const skin = pick(m.skin, hash(sd + 7)), hair = pick(m.hair, hash(sd + 11)), legs = pick(m.legs, hash(sd + 13));
    const shirt = o.kind === 'rest' ? pick(m.shirts, hash(sd + 17)) : o.body;
    const style = Math.floor(hash(sd + 19) * 4);       // short, long, bun, cropped
    const walk = o.pose === 'walk', ph = o.phase || 0;
    const sw = walk ? Math.sin(ph) : 0, bob = walk ? Math.abs(Math.sin(ph)) * 0.012 * u : 0;
    const by = fy - bob;

    V.spot(x, y, 0.147 * H * wide, m.shadow);
    // Legs: the far one a shade darker; in a stride they part and lift.
    const lw = 0.13 * u * wide, lh = 0.44 * u;
    const legAt = (side, dx, lift, color) => rr(ctx, fx + side * 0.072 * u * wide - lw / 2 + dx, by - lh - lift, lw, lh, lw * 0.35, color);
    legAt(1, -sw * 0.06 * u, Math.max(0, -sw) * 0.03 * u, M.design.mix(legs, m.ink, 0.12));
    legAt(-1, sw * 0.06 * u, Math.max(0, sw) * 0.03 * u, legs);
    // Arms behind the torso's edges, swinging against the legs.
    const aw = 0.085 * u * wide, ah = 0.33 * u, sy = by - 0.785 * u;
    const pose = o.pose || 'stand';
    rr(ctx, fx + 0.165 * u * wide - aw / 2 + sw * 0.03 * u, sy + 0.02 * u, aw, ah, aw / 2, shirt.right);
    if (pose === 'stand' || pose === 'walk') rr(ctx, fx - 0.165 * u * wide - aw / 2 - sw * 0.03 * u, sy + 0.02 * u, aw, ah, aw / 2, shirt.right);
    // Torso: lit on the left, shaded on the right.
    const tw = 0.34 * u * wide, th = 0.38 * u;
    rr(ctx, fx - tw / 2, sy, tw, th, 0.09 * u, shirt.left);
    rr(ctx, fx + tw * 0.12, sy, tw * 0.38, th, 0.09 * u, shirt.right);
    // Neck, then hair behind the head for long styles, the head, the hair on top.
    rr(ctx, fx - 0.035 * u, sy - 0.05 * u, 0.07 * u, 0.07 * u, 0.02 * u, skin);
    const hy = sy - 0.115 * u, hr = 0.098 * u;
    if (style === 1) rr(ctx, fx - hr * 1.08, hy - hr * 0.3, hr * 2.16, hr * 2.15, hr * 0.5, hair);
    disc(ctx, fx, hy, hr, skin);
    ctx.save(); ctx.beginPath(); ctx.arc(fx, hy, hr * 1.04, 0, Math.PI * 2); ctx.clip();
    if (style === 3) rr(ctx, fx - hr * 1.1, hy - hr * 1.1, hr * 2.2, hr * 0.62, hr * 0.3, hair);
    else rr(ctx, fx - hr * 1.1, hy - hr * 1.1, hr * 2.2, hr * 0.92, hr * 0.5, hair);
    ctx.restore();
    if (style === 2) disc(ctx, fx + hr * 0.15, hy - hr * 1.12, hr * 0.42, hair);
    // A raised arm holding something in front of the chest.
    if (pose !== 'stand' && pose !== 'walk') {
      rr(ctx, fx - 0.165 * u * wide - aw / 2, sy + 0.02 * u, aw, ah * 0.5, aw / 2, shirt.right);
      rr(ctx, fx - 0.2 * u, sy + 0.14 * u, 0.2 * u, aw, aw / 2, shirt.right);
      if (pose === 'phone') rr(ctx, fx - 0.07 * u, sy + 0.04 * u, 0.075 * u, 0.13 * u, 0.015 * u, m.dark);
      else if (pose === 'card') {
        // Held up, so it reads against an accent shirt: a light card with a dark stripe.
        const card = o.kind === 'rest' ? m.accent : m.PAPER.top, cx = fx - 0.25 * u, cy = sy + 0.0 * u;
        rr(ctx, cx, cy, 0.24 * u, 0.155 * u, 0.02 * u, card);
        rr(ctx, cx, cy + 0.035 * u, 0.24 * u, 0.03 * u, 0, m.dark);
        rr(ctx, cx + 0.03 * u, cy + 0.085 * u, 0.05 * u, 0.04 * u, 0.006 * u, M.design.mix(card, m.ink, 0.3));
      }
      else if (pose === 'sheet') rr(ctx, fx - 0.13 * u, sy + 0.05 * u, 0.2 * u, 0.25 * u, 0.012 * u, m.PAPER.top);
    }
    V.note([[fx - (pose === 'card' ? 0.27 : 0.26) * u, sy - 0.24 * u], [fx + 0.26 * u, fy + 0.02 * u]]);
  }

  M.things.register({
    name: 'person', aka: ['people', 'member', 'customer', 'visitor', 'patient', 'staff', 'employee', 'user', 'student', 'passenger', 'resident'],
    role: 'unit', people: true, size: { w: 28, d: 28, h: H }, spacing: 32, walks: true,
    poses: ['stand', 'walk', 'phone', 'card', 'sheet'],
    draw
  });
})(typeof window !== 'undefined' ? window : globalThis);
