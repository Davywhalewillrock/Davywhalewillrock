/*
 * Illustration kit: flat vector shapes, landscape pieces and characters.
 * All functions draw in world units; the camera transform handles scale.
 */
'use strict';

if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(typeof r === 'number' ? r : (r && r[0]) || 0, Math.abs(w) / 2, Math.abs(h) / 2);
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
  };
}

/* ---------- primitives ---------- */
function circ(ctx, x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); ctx.fillStyle = fill; ctx.fill(); }
function ell(ctx, x, y, rx, ry, fill, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, TAU); ctx.fillStyle = fill; ctx.fill(); }
function rr(ctx, x, y, w, h, r, fill) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); }
function poly(ctx, pts, fill) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}
function lg(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); for (const [o, c] of stops) g.addColorStop(o, c); return g; }
function rg(ctx, x, y, r0, r1, stops) { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); for (const [o, c] of stops) g.addColorStop(o, c); return g; }
function line(ctx, x0, y0, x1, y1, color, w) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke(); }
function curve(ctx, pts, color, w) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  if (pts.length === 3) ctx.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
  else if (pts.length === 4) ctx.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]);
  else for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}
/** Fill the current path with a soft light-to-shadow wash (gives flat shapes volume). */
function shade(ctx, x, y, r, light = 'rgba(255,255,255,0.18)', dark = 'rgba(0,0,0,0.2)', angle = -0.8) {
  ctx.save();
  ctx.clip();
  const dx = Math.cos(angle) * r, dy = Math.sin(angle) * r;
  ctx.fillStyle = lg(ctx, x + dx, y + dy, x - dx, y - dy, [[0, light], [0.5, 'rgba(255,255,255,0)'], [1, dark]]);
  ctx.fillRect(x - r * 1.6, y - r * 1.6, r * 3.2, r * 3.2);
  ctx.restore();
}
function sky(ctx, x0, y0, x1, y1, stops) { ctx.fillStyle = lg(ctx, 0, y0, 0, y1, stops); ctx.fillRect(x0, y0, x1 - x0, y1 - y0); }
/** Smooth 1D pseudo-noise in roughly [-1, 1]. */
function wave(x, seed = 0) { return Math.sin(x + seed) * 0.5 + Math.sin(x * 2.17 + seed * 1.31) * 0.3 + Math.sin(x * 4.63 + seed * 2.07) * 0.2; }
function hillPath(ctx, x0, x1, baseY, amp, period, seed, bottom) {
  ctx.beginPath();
  ctx.moveTo(x0, bottom);
  const n = 96;
  for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n; ctx.lineTo(x, baseY - amp * wave(x / period, seed)); }
  ctx.lineTo(x1, bottom);
  ctx.closePath();
}
function hill(ctx, x0, x1, baseY, amp, period, seed, fill, bottom) { hillPath(ctx, x0, x1, baseY, amp, period, seed, bottom); ctx.fillStyle = fill; ctx.fill(); }
/** Jagged mountain silhouette through control points (midpoint displacement). */
function mountainPts(pts, seed, rough) {
  const rnd = mulberry32(seed);
  let p = pts.slice();
  for (let k = 0; k < 4; k++) {
    const q = [];
    for (let i = 0; i < p.length - 1; i++) {
      const [x0, y0] = p[i], [x1, y1] = p[i + 1];
      const d = Math.hypot(x1 - x0, y1 - y0);
      q.push(p[i], [(x0 + x1) / 2 + (rnd() - 0.5) * d * 0.08, (y0 + y1) / 2 + (rnd() - 0.5) * d * rough]);
    }
    q.push(p[p.length - 1]);
    p = q;
    rough *= 0.62;
  }
  return p;
}
function mountains(ctx, pts, fill, bottom, seed = 1, rough = 0.3) {
  const p = mountainPts(pts, seed, rough);
  ctx.beginPath();
  ctx.moveTo(p[0][0], bottom);
  for (const [x, y] of p) ctx.lineTo(x, y);
  ctx.lineTo(p[p.length - 1][0], bottom);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  return p;
}
function cloud(ctx, x, y, s, fill) {
  ctx.beginPath();
  for (const [dx, dy, r] of [[-1.05, 0.12, 0.5], [-0.48, -0.22, 0.68], [0.22, -0.38, 0.8], [0.88, -0.08, 0.6], [1.4, 0.16, 0.42]]) {
    ctx.moveTo(x + dx * s + r * s, y + dy * s);
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU);
  }
  ctx.roundRect(x - 1.45 * s, y - 0.05 * s, 3.0 * s, 0.6 * s, 0.3 * s);
  ctx.fillStyle = fill;
  ctx.fill();
}
function sunDisc(ctx, x, y, r, core, glow, glowR) {
  ctx.fillStyle = rg(ctx, x, y, r * 0.6, glowR, [[0, glow], [1, 'rgba(255,255,255,0)']]);
  ctx.fillRect(x - glowR, y - glowR, glowR * 2, glowR * 2);
  circ(ctx, x, y, r, core);
}
function bird(ctx, x, y, s, color) {
  ctx.beginPath();
  ctx.moveTo(x - s, y - s * 0.25);
  ctx.quadraticCurveTo(x - s * 0.45, y - s * 0.55, x, y);
  ctx.quadraticCurveTo(x + s * 0.45, y - s * 0.55, x + s, y - s * 0.25);
  ctx.strokeStyle = color;
  ctx.lineWidth = s * 0.16;
  ctx.lineCap = 'round';
  ctx.stroke();
}

/* ---------- plants ---------- */
const CROWN = [[0, 0, 1], [-0.72, 0.3, 0.7], [0.74, 0.28, 0.72], [-0.36, -0.42, 0.72], [0.4, -0.36, 0.7], [0.02, 0.42, 0.74]];
function roundTree(ctx, x, y, h, o = {}) {
  const tw = h * 0.075, th = h * 0.5;
  poly(ctx, [[x - tw * 0.62, y], [x - tw * 0.38, y - th], [x + tw * 0.38, y - th], [x + tw * 0.62, y]], o.trunk || '#5b3d2a');
  if (o.branches !== false) {
    curve(ctx, [[x, y - th * 0.7], [x - h * 0.08, y - th * 0.95], [x - h * 0.14, y - th * 1.12]], o.trunk || '#5b3d2a', tw * 0.45);
    curve(ctx, [[x, y - th * 0.8], [x + h * 0.07, y - th], [x + h * 0.13, y - th * 1.16]], o.trunk || '#5b3d2a', tw * 0.4);
  }
  const cr = h * (o.crown || 0.3), cy = y - h + cr;
  ctx.beginPath();
  for (const [dx, dy, s] of o.blobs || CROWN) {
    ctx.moveTo(x + dx * cr * (o.wide || 1) + s * cr, cy + dy * cr);
    ctx.arc(x + dx * cr * (o.wide || 1), cy + dy * cr, s * cr, 0, TAU);
  }
  ctx.fillStyle = o.leaf || '#3f7a3d';
  ctx.fill();
  if (o.shade !== false) shade(ctx, x, cy, cr * 1.4, o.hi, o.lo);
}
function pine(ctx, x, y, h, fill, trunk = '#3a2a1e') {
  ctx.fillStyle = trunk;
  ctx.fillRect(x - h * 0.025, y - h * 0.12, h * 0.05, h * 0.12);
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const f = i / tiers;
    const ty = y - h * 0.08 - f * h * 0.66;
    const tw = h * 0.44 * (1 - f * 0.6);
    poly(ctx, [[x - tw / 2, ty], [x, ty - h * 0.38], [x + tw / 2, ty]], fill);
  }
}
function bush(ctx, x, y, w, fill, seed = 1, o = {}) {
  const rnd = mulberry32(seed);
  ctx.beginPath();
  const n = o.n || 6;
  for (let i = 0; i < n; i++) {
    const f = n === 1 ? 0.5 : i / (n - 1);
    const r = w * (0.2 + rnd() * 0.1);
    const cx = x - w / 2 + r + f * (w - 2 * r);
    const cy = y - r * (0.75 + Math.sin(f * Math.PI) * 0.75);
    ctx.moveTo(cx + r, cy);
    ctx.arc(cx, cy, r, 0, TAU);
  }
  ctx.rect(x - w / 2 + w * 0.12, y - w * 0.14, w * 0.76, w * 0.14);
  ctx.fillStyle = fill;
  ctx.fill();
  if (o.shade !== false) shade(ctx, x, y - w * 0.3, w * 0.6, o.hi || 'rgba(255,255,255,0.14)', o.lo || 'rgba(0,0,0,0.18)');
}
function grassTufts(ctx, x0, x1, y0, y1, n, color, seed, len = 18) {
  const rnd = mulberry32(seed);
  ctx.strokeStyle = color;
  ctx.lineWidth = len * 0.14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, rnd()), y = lerp(y0, y1, rnd());
    const s = len * (0.6 + rnd() * 0.8) * (0.5 + 0.5 * (y - y0) / Math.max(1, y1 - y0));
    ctx.moveTo(x - s * 0.3, y); ctx.lineTo(x - s * 0.45, y - s * 0.8);
    ctx.moveTo(x, y); ctx.lineTo(x + s * 0.05, y - s);
    ctx.moveTo(x + s * 0.3, y); ctx.lineTo(x + s * 0.5, y - s * 0.75);
  }
  ctx.stroke();
}
function flowers(ctx, x0, x1, y0, y1, n, colors, seed, size = 7) {
  const rnd = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, rnd()), y = lerp(y0, y1, rnd());
    const c = colors[Math.floor(rnd() * colors.length)];
    const s = size * (0.7 + rnd() * 0.6);
    for (let p = 0; p < 5; p++) { const a = (p / 5) * TAU; circ(ctx, x + Math.cos(a) * s * 0.55, y + Math.sin(a) * s * 0.55, s * 0.45, c); }
    circ(ctx, x, y, s * 0.3, '#fff2b0');
  }
}

/* ---------- people ---------- */
/**
 * Small full-body figure, front view. (x, y) = feet centre, h = height.
 * o: skin, hair, hairStyle, top, bottom, shoe, kid, walk (phase), arms, skirt, back, face, look
 */
function figure(ctx, x, y, h, o = {}) {
  const k = h / 100;
  const kid = !!o.kid;
  const skin = o.skin || '#d8a27c';
  const top = o.top || '#3f6fb0';
  const bottom = o.bottom || '#2b2f3a';
  const hair = o.hair || '#2e2018';
  const shoe = o.shoe || '#25221f';
  const sw = o.walk == null ? 0 : Math.sin(o.walk);
  const hipY = y - (kid ? 40 : 47) * k;
  const shY = y - (kid ? 69 : 80) * k;
  const headR = (kid ? 10.8 : 8.3) * k;
  const headY = shY - headR - (kid ? 2 : 3) * k;
  const legW = (kid ? 7.4 : 7.6) * k;
  const tw = (kid ? 21 : 23) * k;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // long hair behind the head
  if (o.hairStyle === 'long') rr(ctx, x - headR * 1.12, headY - headR * 0.7, headR * 2.24, headR * 2.55, headR * 0.9, hair);

  // legs
  for (const side of [-1, 1]) {
    const a = side * sw * 0.3;
    const hx = x + side * 4.6 * k;
    const fx = hx + Math.sin(a) * (y - hipY), fy = hipY + Math.cos(a) * (y - hipY);
    line(ctx, hx, hipY, fx, fy - legW * 0.5, o.legs || bottom, legW);
    ell(ctx, fx, fy - 1.6 * k, legW * 0.78, 2.7 * k, shoe);
  }
  // arms
  const armW = (kid ? 5.4 : 5.6) * k;
  for (const side of [-1, 1]) {
    const sx = x + side * (tw / 2 - 1.8 * k), sy = shY + 3.5 * k;
    let pts;
    if (o.arms === 'raise' && side === 1) pts = [[sx, sy], [sx + 7 * k, sy - 9 * k], [sx + 9 * k, sy - 22 * k]];
    else if (o.arms === 'phone' && side === 1) pts = [[sx, sy], [sx + 3.5 * k, sy + 15 * k], [x + 4 * k, headY + 3 * k]];
    else if (o.arms === 'hips') pts = [[sx, sy], [sx + side * 8 * k, sy + 12 * k], [x + side * (tw / 2 - 1 * k), hipY - 2 * k]];
    else pts = [[sx, sy], [x + side * (tw / 2 + 2.2 * k), hipY + 3 * k + (o.walk == null ? 0 : side * sw * 1.5 * k)]];
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.strokeStyle = o.sleeve || top;
    ctx.lineWidth = armW;
    ctx.stroke();
    const hp = pts[pts.length - 1];
    circ(ctx, hp[0], hp[1], armW * 0.55, skin);
    if (o.arms === 'phone' && side === 1) rr(ctx, hp[0] - 2.2 * k, hp[1] - 4 * k, 4.4 * k, 7 * k, 1 * k, '#1c1c1e');
  }
  // torso and skirt
  rr(ctx, x - tw / 2, shY, tw, hipY - shY + 5 * k, 6 * k, top);
  if (o.skirt) poly(ctx, [[x - tw / 2, hipY - 3 * k], [x + tw / 2, hipY - 3 * k], [x + tw / 2 + 4 * k, hipY + 13 * k], [x - tw / 2 - 4 * k, hipY + 13 * k]], o.skirt);
  if (o.stripe) rr(ctx, x - tw / 2, shY + (hipY - shY) * 0.42, tw, 4 * k, 0, o.stripe);
  // neck & head
  rr(ctx, x - 2.6 * k, headY + headR - 2.5 * k, 5.2 * k, 6 * k, 1 * k, skin);
  circ(ctx, x, headY, headR, skin);
  // hair
  const hs = o.hairStyle || 'short';
  if (o.back) {
    circ(ctx, x, headY - headR * 0.04, headR * 1.04, hair);
  } else if (hs === 'cap') {
    ctx.beginPath(); ctx.ellipse(x, headY - headR * 0.22, headR * 1.06, headR * 0.9, 0, Math.PI, TAU); ctx.fillStyle = o.capColor || '#c0392b'; ctx.fill();
    rr(ctx, x - headR * 0.2, headY - headR * 0.32, headR * 1.5, headR * 0.26, headR * 0.12, o.capColor || '#c0392b');
  } else if (hs !== 'bald') {
    ctx.beginPath(); ctx.ellipse(x, headY - headR * 0.18, headR * 1.07, headR * 0.92, 0, Math.PI * 0.98, Math.PI * 2.02); ctx.fillStyle = hair; ctx.fill();
    if (hs === 'bun') circ(ctx, x, headY - headR * 1.12, headR * 0.46, hair);
    if (hs === 'curly') for (let i = 0; i < 7; i++) { const a = Math.PI + (i / 6) * Math.PI; circ(ctx, x + Math.cos(a) * headR * 0.98, headY - headR * 0.1 + Math.sin(a) * headR * 0.92, headR * 0.34, hair); }
  }
  // face
  if (o.face && !o.back) {
    const lookY = o.look === 'up' ? -0.16 : 0.06;
    const lookX = o.lookX || 0;
    circ(ctx, x - headR * 0.37 + lookX * headR, headY + lookY * headR, headR * 0.1, '#2a1d17');
    circ(ctx, x + headR * 0.37 + lookX * headR, headY + lookY * headR, headR * 0.1, '#2a1d17');
    ctx.beginPath();
    ctx.arc(x + lookX * headR * 0.5, headY + headR * 0.36, headR * 0.26, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.strokeStyle = '#7a3b2e'; ctx.lineWidth = headR * 0.09; ctx.stroke();
    circ(ctx, x - headR * 0.55, headY + headR * 0.32, headR * 0.16, 'rgba(235,120,110,0.35)');
    circ(ctx, x + headR * 0.55, headY + headR * 0.32, headR * 0.16, 'rgba(235,120,110,0.35)');
  }
  return { hand: o.arms === 'raise' ? [x + (tw / 2 - 1.8 * k) + 9 * k, shY + 3.5 * k - 22 * k] : null, headY, headR };
}

function balloon(ctx, hx, hy, bx, by, r, color, t = 0) {
  const swayX = Math.sin(t * 1.4) * r * 0.25;
  ctx.lineCap = 'round';
  curve(ctx, [[hx, hy], [(hx + bx) / 2 + swayX, (hy + by) / 2 + r * 0.6], [bx + swayX * 0.6, by + r * 1.12]], 'rgba(70,64,58,0.9)', r * 0.045);
  const cx = bx + swayX * 0.6;
  poly(ctx, [[cx - r * 0.13, by + r * 1.16], [cx + r * 0.13, by + r * 1.16], [cx, by + r * 0.98]], color);
  ell(ctx, cx, by, r * 0.86, r, color);
  ctx.beginPath(); ctx.ellipse(cx, by, r * 0.86, r, 0, 0, TAU);
  shade(ctx, cx, by, r, 'rgba(255,255,255,0.22)', 'rgba(60,0,0,0.25)');
  ell(ctx, cx - r * 0.33, by - r * 0.4, r * 0.14, r * 0.27, 'rgba(255,255,255,0.6)', -0.45);
}

/** Head-and-shoulders portrait subject. (cx, cy) = head centre, s = head height / 2. */
function portrait(ctx, cx, cy, s, o = {}) {
  const skin = o.skin || '#c98d6a', skinDark = o.skinDark || '#b0765a';
  const hair = o.hair || '#2b1b14', top = o.top || '#2f7f78', topDark = o.topDark || '#26655f';
  // hair behind the head (bob)
  ctx.beginPath();
  ctx.moveTo(cx - s * 1.08, cy + s * 0.55);
  ctx.bezierCurveTo(cx - s * 1.25, cy - s * 0.4, cx - s * 0.9, cy - s * 1.25, cx, cy - s * 1.22);
  ctx.bezierCurveTo(cx + s * 0.9, cy - s * 1.25, cx + s * 1.25, cy - s * 0.4, cx + s * 1.08, cy + s * 0.55);
  ctx.quadraticCurveTo(cx + s * 0.9, cy + s * 0.75, cx + s * 0.7, cy + s * 0.6);
  ctx.lineTo(cx - s * 0.7, cy + s * 0.6);
  ctx.quadraticCurveTo(cx - s * 0.9, cy + s * 0.75, cx - s * 1.08, cy + s * 0.55);
  ctx.fillStyle = hair;
  ctx.fill();
  // shoulders / sweater
  ctx.beginPath();
  ctx.moveTo(cx - s * 2.1, cy + s * 4.5);
  ctx.bezierCurveTo(cx - s * 2.15, cy + s * 2.2, cx - s * 1.6, cy + s * 1.62, cx - s * 0.52, cy + s * 1.38);
  ctx.lineTo(cx + s * 0.52, cy + s * 1.38);
  ctx.bezierCurveTo(cx + s * 1.6, cy + s * 1.62, cx + s * 2.15, cy + s * 2.2, cx + s * 2.1, cy + s * 4.5);
  ctx.closePath();
  ctx.fillStyle = top;
  ctx.fill();
  shade(ctx, cx, cy + s * 2.6, s * 2.2, 'rgba(255,255,255,0.08)', 'rgba(0,0,0,0.25)', -1.2);
  // neck
  rr(ctx, cx - s * 0.31, cy + s * 0.55, s * 0.62, s * 0.95, s * 0.2, skin);
  ell(ctx, cx, cy + s * 0.78, s * 0.32, s * 0.18, skinDark);
  // collar
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 1.38, s * 0.62, s * 0.24, 0, 0, Math.PI);
  ctx.lineWidth = s * 0.16;
  ctx.strokeStyle = topDark;
  ctx.stroke();
  // ears
  ell(ctx, cx - s * 0.8, cy + s * 0.05, s * 0.13, s * 0.21, skinDark);
  ell(ctx, cx + s * 0.8, cy + s * 0.05, s * 0.13, s * 0.21, skinDark);
  // face
  ell(ctx, cx, cy, s * 0.8, s, skin);
  // hair fringe with a side part
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.86, cy + s * 0.1);
  ctx.bezierCurveTo(cx - s * 0.95, cy - s * 0.85, cx - s * 0.35, cy - s * 1.12, cx + s * 0.2, cy - s * 1.05);
  ctx.bezierCurveTo(cx + s * 0.75, cy - s * 0.98, cx + s * 0.95, cy - s * 0.5, cx + s * 0.86, cy + s * 0.05);
  ctx.bezierCurveTo(cx + s * 0.7, cy - s * 0.42, cx + s * 0.35, cy - s * 0.58, cx - s * 0.12, cy - s * 0.52);
  ctx.bezierCurveTo(cx - s * 0.48, cy - s * 0.46, cx - s * 0.7, cy - s * 0.25, cx - s * 0.86, cy + s * 0.1);
  ctx.fillStyle = hair;
  ctx.fill();
  // brows, eyes, nose, mouth
  ctx.lineCap = 'round';
  curve(ctx, [[cx - s * 0.48, cy - s * 0.22], [cx - s * 0.32, cy - s * 0.3], [cx - s * 0.14, cy - s * 0.24]], hair, s * 0.075);
  curve(ctx, [[cx + s * 0.14, cy - s * 0.24], [cx + s * 0.32, cy - s * 0.3], [cx + s * 0.48, cy - s * 0.22]], hair, s * 0.075);
  for (const side of [-1, 1]) {
    ell(ctx, cx + side * s * 0.31, cy, s * 0.085, s * 0.105, '#231712');
    circ(ctx, cx + side * s * 0.31 + s * 0.03, cy - s * 0.035, s * 0.028, '#ffffff');
  }
  curve(ctx, [[cx - s * 0.02, cy + s * 0.12], [cx + s * 0.08, cy + s * 0.3], [cx - s * 0.06, cy + s * 0.34]], skinDark, s * 0.06);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.26, cy + s * 0.5);
  ctx.quadraticCurveTo(cx, cy + s * 0.72, cx + s * 0.26, cy + s * 0.5);
  ctx.quadraticCurveTo(cx, cy + s * 0.58, cx - s * 0.26, cy + s * 0.5);
  ctx.fillStyle = '#8e3b36';
  ctx.fill();
  circ(ctx, cx - s * 0.47, cy + s * 0.32, s * 0.13, 'rgba(225,110,100,0.28)');
  circ(ctx, cx + s * 0.47, cy + s * 0.32, s * 0.13, 'rgba(225,110,100,0.28)');
}

/** Side-view runner heading right. (x, y) = ground under the hips, h = height, ph = stride phase. */
function runner(ctx, x, y, h, ph, o = {}) {
  const k = h / 100;
  const skin = o.skin || '#a96c4d', top = o.top || '#ff6b35', shorts = o.shorts || '#1e2a44';
  const hair = o.hair || '#1d1511', shoe = o.shoe || '#f3f1ec';
  const bob = -Math.abs(Math.sin(ph)) * 2.4 * k;
  const hip = [x, y - 52 * k + bob];
  const lean = 0.17;
  const sh = [hip[0] + Math.sin(lean) * 30 * k, hip[1] - Math.cos(lean) * 30 * k];
  const head = [sh[0] + 5 * k, sh[1] - 11.5 * k];
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const leg = (phase, dark) => {
    const th = 0.68 * Math.sin(phase);
    const kn = 0.22 + 1.75 * Math.pow(Math.max(0, Math.cos(phase)), 1.4);
    const knee = [hip[0] + Math.sin(th) * 26 * k, hip[1] + Math.cos(th) * 26 * k];
    const sa = th - kn;
    const foot = [knee[0] + Math.sin(sa) * 25 * k, knee[1] + Math.cos(sa) * 25 * k];
    const c = dark ? '#8a573e' : skin;
    ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(knee[0], knee[1]); ctx.lineTo(foot[0], foot[1]);
    ctx.strokeStyle = c; ctx.lineWidth = 8 * k; ctx.stroke();
    ctx.save();
    ctx.translate(foot[0], foot[1]);
    ctx.rotate(sa * 0.35);
    rr(ctx, -4 * k, -2.5 * k, 13.5 * k, 6 * k, 2.6 * k, dark ? '#c9c5bd' : shoe);
    rr(ctx, -3 * k, 1.8 * k, 12 * k, 1.8 * k, 0.8 * k, o.accent || top);
    ctx.restore();
  };
  const arm = (phase, dark) => {
    const b = -0.85 * Math.sin(phase);
    const elbow = [sh[0] + Math.sin(b) * 16 * k, sh[1] + Math.cos(b) * 16 * k];
    const g = b + 1.65;
    const hand = [elbow[0] + Math.sin(g) * 14 * k, elbow[1] + Math.cos(g) * 14 * k];
    ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.lineTo(elbow[0], elbow[1]); ctx.lineTo(hand[0], hand[1]);
    ctx.strokeStyle = dark ? '#8a573e' : skin; ctx.lineWidth = 6 * k; ctx.stroke();
    // sleeve
    ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.lineTo(lerp(sh[0], elbow[0], 0.45), lerp(sh[1], elbow[1], 0.45));
    ctx.strokeStyle = dark ? '#c4552c' : top; ctx.lineWidth = 7.4 * k; ctx.stroke();
  };
  arm(ph, true);
  leg(ph + Math.PI, true);
  // torso
  ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(sh[0], sh[1]);
  ctx.strokeStyle = top; ctx.lineWidth = 15 * k; ctx.stroke();
  leg(ph, false);
  // shorts over the hips
  ctx.save();
  ctx.translate(hip[0], hip[1]);
  ctx.rotate(lean);
  rr(ctx, -8.5 * k, -5 * k, 17 * k, 12 * k, 4 * k, shorts);
  ctx.restore();
  // head
  rr(ctx, sh[0] - 1.5 * k, sh[1] - 7 * k, 5 * k, 7 * k, 1.5 * k, skin);
  circ(ctx, head[0], head[1], 7.6 * k, skin);
  ctx.beginPath(); ctx.ellipse(head[0] - 1.2 * k, head[1] - 2 * k, 7.9 * k, 6.6 * k, 0, Math.PI * 0.9, Math.PI * 2.05); ctx.fillStyle = hair; ctx.fill();
  const tail = Math.sin(ph * 2) * 2.5 * k;
  ell(ctx, head[0] - 9 * k, head[1] - 1 * k + tail, 4.2 * k, 2.6 * k, hair, 0.35 + tail * 0.02 / k);
  rr(ctx, head[0] - 7.6 * k, head[1] - 4.6 * k, 15.2 * k, 2.6 * k, 1.2 * k, o.band || '#ffffff');
  circ(ctx, head[0] + 4.6 * k, head[1] + 0.2 * k, 0.85 * k, '#2a1d17');
  arm(ph + Math.PI, false);
}

/* ---------- animals ---------- */
/** Sitting cat, front view. (x, y) = bottom centre, s = height. */
function cat(ctx, x, y, s, o = {}) {
  const k = s / 100;
  const fur = o.fur || '#e8893a', stripe = o.stripe || '#c1611f', cream = o.cream || '#f7e6cc';
  const eye = o.eye || '#a8cf4a', pink = '#e8939a';
  ctx.lineCap = 'round';
  // body
  ctx.beginPath();
  ctx.ellipse(x, y - 27 * k, 31 * k, 27 * k, 0, 0, TAU);
  ctx.moveTo(x + 21 * k, y - 50 * k);
  ctx.ellipse(x, y - 50 * k, 21 * k, 21 * k, 0, 0, TAU);
  ctx.fillStyle = fur;
  ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y - 30 * k, 31 * k, 30 * k, 0, 0, TAU);
  shade(ctx, x, y - 32 * k, 34 * k, 'rgba(255,255,255,0.1)', 'rgba(90,30,0,0.22)', -0.6);
  for (const side of [-1, 1]) {
    curve(ctx, [[x + side * 30 * k, y - 34 * k], [x + side * 22 * k, y - 30 * k], [x + side * 19 * k, y - 22 * k]], stripe, 2.6 * k);
    curve(ctx, [[x + side * 31 * k, y - 22 * k], [x + side * 24 * k, y - 18 * k], [x + side * 22 * k, y - 10 * k]], stripe, 2.6 * k);
  }
  // tail curling round the front
  curve(ctx, [[x + 26 * k, y - 10 * k], [x + 42 * k, y + 2 * k], [x + 20 * k, y + 1 * k], [x + 2 * k, y - 1 * k]], fur, 8 * k);
  curve(ctx, [[x + 25 * k, y - 1 * k], [x + 23 * k, y + 3.2 * k]], stripe, 2.4 * k);
  curve(ctx, [[x + 15 * k, y - 0.5 * k], [x + 14 * k, y + 3.4 * k]], stripe, 2.4 * k);
  // chest and legs
  ell(ctx, x, y - 38 * k, 13 * k, 20 * k, cream);
  for (const side of [-1, 1]) {
    rr(ctx, x + side * 9.5 * k - 5 * k, y - 36 * k, 10 * k, 33 * k, 5 * k, fur);
    ell(ctx, x + side * 9.5 * k, y - 3 * k, 6.8 * k, 4.2 * k, cream);
  }
  // ears
  for (const side of [-1, 1]) {
    poly(ctx, [[x + side * 25 * k, y - 77 * k], [x + side * 21 * k, y - 103 * k], [x + side * 6 * k, y - 91 * k]], fur);
    poly(ctx, [[x + side * 21.5 * k, y - 82 * k], [x + side * 20 * k, y - 97 * k], [x + side * 11 * k, y - 90 * k]], pink);
  }
  // head
  ctx.beginPath();
  ctx.ellipse(x, y - 76 * k, 26 * k, 21 * k, 0, 0, TAU);
  ctx.fillStyle = fur;
  ctx.fill();
  for (const side of [-1, 1]) poly(ctx, [[x + side * 23 * k, y - 76 * k], [x + side * 30 * k, y - 66 * k], [x + side * 20 * k, y - 63 * k]], fur);
  ctx.beginPath(); ctx.ellipse(x, y - 76 * k, 26 * k, 21 * k, 0, 0, TAU);
  shade(ctx, x, y - 78 * k, 26 * k, 'rgba(255,255,255,0.12)', 'rgba(90,30,0,0.16)', -0.7);
  for (const dx of [-5, 0, 5]) curve(ctx, [[x + dx * k, y - 95.5 * k], [x + dx * 0.8 * k, y - 87 * k]], stripe, 2.3 * k);
  for (const side of [-1, 1]) curve(ctx, [[x + side * 25 * k, y - 80 * k], [x + side * 19 * k, y - 79 * k]], stripe, 2 * k);
  // muzzle
  ell(ctx, x - 4.6 * k, y - 66.5 * k, 6.2 * k, 4.6 * k, cream);
  ell(ctx, x + 4.6 * k, y - 66.5 * k, 6.2 * k, 4.6 * k, cream);
  ell(ctx, x, y - 62.5 * k, 4 * k, 2.6 * k, cream);
  // eyes (with an occasional slow blink)
  const blink = o.blink || 0;
  for (const side of [-1, 1]) {
    const ex = x + side * 10.5 * k, ey = y - 77 * k;
    const ry = 5.1 * k * (1 - blink);
    if (ry > 0.4 * k) {
      ell(ctx, ex, ey, 6.1 * k, ry, eye);
      ctx.save();
      ctx.beginPath(); ctx.ellipse(ex, ey, 6.1 * k, ry, 0, 0, TAU); ctx.clip();
      ell(ctx, ex, ey, 1.8 * k, 4.6 * k, '#1d1a14');
      circ(ctx, ex + 1.7 * k, ey - 1.9 * k, 1.25 * k, '#ffffff');
      ctx.restore();
      ctx.beginPath(); ctx.ellipse(ex, ey, 6.1 * k, ry, 0, 0, TAU);
      ctx.strokeStyle = '#6b3a14'; ctx.lineWidth = 0.9 * k; ctx.stroke();
    } else {
      curve(ctx, [[ex - 6 * k, ey], [ex, ey + 1.8 * k], [ex + 6 * k, ey]], '#6b3a14', 1.2 * k);
    }
  }
  // nose, mouth, whiskers
  poly(ctx, [[x - 2.7 * k, y - 70.6 * k], [x + 2.7 * k, y - 70.6 * k], [x, y - 67.6 * k]], pink);
  ctx.lineWidth = 0.9 * k;
  curve(ctx, [[x, y - 67.6 * k], [x, y - 66 * k]], '#6b3a14', 0.9 * k);
  curve(ctx, [[x, y - 66 * k], [x - 1.6 * k, y - 64.4 * k], [x - 3.4 * k, y - 65 * k]], '#6b3a14', 0.9 * k);
  curve(ctx, [[x, y - 66 * k], [x + 1.6 * k, y - 64.4 * k], [x + 3.4 * k, y - 65 * k]], '#6b3a14', 0.9 * k);
  for (const side of [-1, 1]) {
    for (const [ey, oy] of [[-68, -71.5], [-66, -65.5], [-64.5, -59.5]]) {
      curve(ctx, [[x + side * 9 * k, y + ey * k], [x + side * 22 * k, y + (oy - 1) * k], [x + side * 33 * k, y + oy * k]], 'rgba(255,255,255,0.85)', 0.55 * k);
    }
  }
}

/** Sitting dog, front view. (x, y) = bottom centre, s = height. o.lookUp turns the gaze upward. */
function dog(ctx, x, y, s, o = {}) {
  const k = s / 100;
  const tan = o.tan || '#c98b4a', white = '#f7f1e6';
  const wag = Math.sin((o.t || 0) * 9) * 4 * k;
  ctx.lineCap = 'round';
  // tail
  curve(ctx, [[x + 22 * k, y - 10 * k], [x + 36 * k, y - 14 * k], [x + 38 * k + wag, y - 30 * k]], tan, 6 * k);
  // haunches and body
  ell(ctx, x, y - 20 * k, 32 * k, 20 * k, tan);
  ell(ctx, x - 26 * k, y - 3 * k, 9 * k, 4 * k, white);
  ell(ctx, x + 26 * k, y - 3 * k, 9 * k, 4 * k, white);
  ell(ctx, x, y - 40 * k, 22 * k, 26 * k, tan);
  ctx.beginPath(); ctx.ellipse(x, y - 30 * k, 32 * k, 30 * k, 0, 0, TAU);
  shade(ctx, x, y - 30 * k, 32 * k, 'rgba(255,255,255,0.1)', 'rgba(70,30,0,0.2)', -0.6);
  ell(ctx, x, y - 38 * k, 14 * k, 22 * k, white);
  for (const side of [-1, 1]) {
    rr(ctx, x + side * 10 * k - 5 * k, y - 38 * k, 10 * k, 36 * k, 5 * k, white);
    ell(ctx, x + side * 10 * k, y - 2.5 * k, 7.6 * k, 4 * k, white);
    for (const t of [-2.5, 0, 2.5]) curve(ctx, [[x + side * 10 * k + t * k, y - 4.6 * k], [x + side * 10 * k + t * k, y - 1.8 * k]], '#d9cfc0', 0.8 * k);
  }
  // head, collar and face (shared with the high-angle view in worlds.js)
  dogHead(ctx, x, y - 77 * k, k, o);
}

/* ---------- objects ---------- */
function lampPost(ctx, x, y, h, color = '#2c3530', glass = '#fff3c8') {
  const k = h / 100;
  rr(ctx, x - 1.7 * k, y - h, 3.4 * k, h, 1.2 * k, color);
  rr(ctx, x - 3.4 * k, y - 7 * k, 6.8 * k, 7 * k, 1.2 * k, color);
  rr(ctx, x - 2.8 * k, y - h - 1 * k, 5.6 * k, 3 * k, 1 * k, color);
  poly(ctx, [[x - 4.2 * k, y - h - 13 * k], [x + 4.2 * k, y - h - 13 * k], [x + 3 * k, y - h - 1 * k], [x - 3 * k, y - h - 1 * k]], glass);
  ctx.strokeStyle = color; ctx.lineWidth = 0.9 * k;
  ctx.strokeRect(x - 0.45 * k, y - h - 13 * k, 0.9 * k, 12 * k);
  poly(ctx, [[x - 6 * k, y - h - 12.5 * k], [x + 6 * k, y - h - 12.5 * k], [x, y - h - 19 * k]], color);
  circ(ctx, x, y - h - 19.5 * k, 1.2 * k, color);
}
function bench(ctx, x, y, w, color = '#8a5a3c', metal = '#2f2f33') {
  const k = w / 100;
  rr(ctx, x - 44 * k, y - 22 * k, 4 * k, 22 * k, 1 * k, metal);
  rr(ctx, x + 40 * k, y - 22 * k, 4 * k, 22 * k, 1 * k, metal);
  rr(ctx, x - 50 * k, y - 25 * k, 100 * k, 5 * k, 1.5 * k, color);
  rr(ctx, x - 50 * k, y - 46 * k, 100 * k, 6 * k, 1.5 * k, color);
  rr(ctx, x - 50 * k, y - 37 * k, 100 * k, 6 * k, 1.5 * k, color);
  rr(ctx, x - 44 * k, y - 48 * k, 3 * k, 26 * k, 1 * k, metal);
  rr(ctx, x + 41 * k, y - 48 * k, 3 * k, 26 * k, 1 * k, metal);
}
function bin(ctx, x, y, h, color = '#3d6b4f') {
  const k = h / 100;
  rr(ctx, x - 26 * k, y - 88 * k, 52 * k, 88 * k, 6 * k, color);
  rr(ctx, x - 30 * k, y - 100 * k, 60 * k, 14 * k, 5 * k, '#2c4f3a');
  for (const dx of [-12, 0, 12]) rr(ctx, x + dx * k - 2 * k, y - 76 * k, 4 * k, 60 * k, 2 * k, 'rgba(0,0,0,0.18)');
}
function sign(ctx, x, y, h, board = '#7a5638', face = '#f3ead8') {
  const k = h / 100;
  rr(ctx, x - 30 * k, y - h, 4 * k, h, 1 * k, '#5b4030');
  rr(ctx, x + 26 * k, y - h, 4 * k, h, 1 * k, '#5b4030');
  rr(ctx, x - 40 * k, y - h - 5 * k, 80 * k, 52 * k, 3 * k, board);
  rr(ctx, x - 35 * k, y - h, 70 * k, 42 * k, 2 * k, face);
  for (let i = 0; i < 4; i++) rr(ctx, x - 28 * k, y - h + (7 + i * 9) * k, (i % 2 ? 40 : 52) * k, 3.5 * k, 1 * k, '#8d8172');
  circ(ctx, x + 22 * k, y - h + 12 * k, 8 * k, '#d23c3c');
  circ(ctx, x + 22 * k, y - h + 12 * k, 5.6 * k, face);
  line(ctx, x + 18 * k, y - h + 8 * k, x + 26 * k, y - h + 16 * k, '#d23c3c', 2 * k);
}
function iceCart(ctx, x, y, h) {
  const k = h / 100;
  line(ctx, x, y - 60 * k, x, y - 92 * k, '#5d5d5d', 2 * k);
  ctx.beginPath();
  ctx.moveTo(x - 38 * k, y - 88 * k);
  ctx.quadraticCurveTo(x, y - 116 * k, x + 38 * k, y - 88 * k);
  ctx.closePath();
  ctx.fillStyle = '#f7f3ec';
  ctx.fill();
  for (let i = 0; i < 6; i += 2) {
    const a = -38 + (i * 76) / 6, b = -38 + ((i + 1) * 76) / 6;
    poly(ctx, [[x + a * k, y - 88 * k], [x, y - 108 * k], [x + b * k, y - 88 * k]], '#e2483d');
  }
  rr(ctx, x - 30 * k, y - 62 * k, 60 * k, 42 * k, 4 * k, '#f7f3ec');
  for (let i = 0; i < 5; i++) rr(ctx, x - 30 * k + i * 12 * k, y - 62 * k, 6 * k, 42 * k, 0, '#f2a7b5');
  circ(ctx, x - 18 * k, y - 14 * k, 8 * k, '#333');
  circ(ctx, x + 18 * k, y - 14 * k, 8 * k, '#333');
  circ(ctx, x - 18 * k, y - 14 * k, 3 * k, '#999');
  circ(ctx, x + 18 * k, y - 14 * k, 3 * k, '#999');
}
function pigeon(ctx, x, y, s, flip = 1) {
  ell(ctx, x, y - s * 0.4, s * 0.55, s * 0.35, '#8b8f99');
  circ(ctx, x + flip * s * 0.45, y - s * 0.75, s * 0.22, '#6d717c');
  poly(ctx, [[x + flip * s * 0.62, y - s * 0.78], [x + flip * s * 0.8, y - s * 0.72], [x + flip * s * 0.62, y - s * 0.68]], '#e0b04a');
  poly(ctx, [[x - flip * s * 0.45, y - s * 0.45], [x - flip * s * 0.9, y - s * 0.6], [x - flip * s * 0.8, y - s * 0.3]], '#6d717c');
}
function sailboat(ctx, x, y, s) {
  const k = s / 100;
  poly(ctx, [[x - 46 * k, y - 10 * k], [x + 50 * k, y - 10 * k], [x + 36 * k, y + 4 * k], [x - 36 * k, y + 4 * k]], '#203a5c');
  rr(ctx, x - 46 * k, y - 13 * k, 96 * k, 4 * k, 1 * k, '#f2efe8');
  line(ctx, x, y - 12 * k, x, y - 118 * k, '#5a4a3e', 2.4 * k);
  poly(ctx, [[x + 2 * k, y - 116 * k], [x + 2 * k, y - 18 * k], [x + 44 * k, y - 18 * k]], '#fbfaf6');
  poly(ctx, [[x - 2 * k, y - 104 * k], [x - 2 * k, y - 20 * k], [x - 36 * k, y - 20 * k]], '#ecebe5');
  poly(ctx, [[x, y - 118 * k], [x + 12 * k, y - 114 * k], [x, y - 110 * k]], '#e2483d');
}
function lighthouse(ctx, x, y, h, glowA = 1) {
  const k = h / 100;
  const bw = 13 * k, tw = 8.6 * k, th = 70 * k;
  const tower = () => { ctx.beginPath(); ctx.moveTo(x - bw, y); ctx.lineTo(x - tw, y - th); ctx.lineTo(x + tw, y - th); ctx.lineTo(x + bw, y); ctx.closePath(); };
  tower(); ctx.fillStyle = '#f4efe6'; ctx.fill();
  ctx.save(); tower(); ctx.clip();
  ctx.fillStyle = '#d4443b';
  for (let i = 0; i < 3; i++) ctx.fillRect(x - bw, y - (12 + i * 22) * k, bw * 2, 10 * k);
  ctx.fillStyle = 'rgba(40,20,40,0.22)';
  ctx.fillRect(x + 2 * k, y - th, bw, th);
  ctx.restore();
  rr(ctx, x - 3 * k, y - 9 * k, 6 * k, 9 * k, 3 * k, '#3a2a2a');
  rr(ctx, x - 13 * k, y - th - 3 * k, 26 * k, 4 * k, 1 * k, '#2d2a2e');
  if (glowA > 0) {
    ctx.fillStyle = rg(ctx, x, y - th - 12 * k, 2 * k, 40 * k, [[0, `rgba(255,236,170,${0.85 * glowA})`], [1, 'rgba(255,236,170,0)']]);
    ctx.fillRect(x - 40 * k, y - th - 52 * k, 80 * k, 80 * k);
  }
  rr(ctx, x - 7 * k, y - th - 16 * k, 14 * k, 13 * k, 1 * k, '#ffe9a8');
  for (const dx of [-3.5, 0, 3.5]) line(ctx, x + dx * k, y - th - 16 * k, x + dx * k, y - th - 3 * k, '#2d2a2e', 0.8 * k);
  ctx.beginPath(); ctx.moveTo(x - 9 * k, y - th - 16 * k); ctx.quadraticCurveTo(x, y - th - 27 * k, x + 9 * k, y - th - 16 * k); ctx.closePath();
  ctx.fillStyle = '#b8352f'; ctx.fill();
  circ(ctx, x, y - th - 24 * k, 1.8 * k, '#2d2a2e');
}
function buildingRow(ctx, x0, x1, baseY, seed, colors, minH, maxH, winColor) {
  const rnd = mulberry32(seed);
  let x = x0;
  while (x < x1) {
    const w = 80 + rnd() * 140, h = minH + rnd() * (maxH - minH);
    const c = colors[Math.floor(rnd() * colors.length)];
    ctx.fillStyle = c;
    ctx.fillRect(x, baseY - h, w + 1, h);
    if (winColor) {
      ctx.fillStyle = winColor;
      for (let wy = baseY - h + 18; wy < baseY - 24; wy += 30) for (let wx = x + 14; wx < x + w - 18; wx += 26) ctx.fillRect(wx, wy, 12, 16);
    }
    x += w;
  }
}
