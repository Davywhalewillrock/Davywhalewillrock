/*
 * People: a parametric portrait (head and shoulders) with pose, expression and
 * lighting, plus a full-body figure. Flat, cel-shaded style: every surface gets
 * a lit shape and a shadow shape, with a crisp edge in hard light and a soft
 * edge in soft light.
 *
 * Portrait spec P:
 *   x, y        face centre (on the eye line) in world units;  s  scale (100 = eye line to chin)
 *   yaw         head turn, -1..1 (+ turns toward the viewer's right)
 *   pitch       camera height, -1 (below the face) .. +1 (above it)
 *   distort     wide-angle closeness, 0..1 (big nose, small ears)
 *   smile, squint, laugh, blink, forced   expression, 0..1
 *   gaze        [x, y] where the eyes look, -1..1
 *   light       { dir: [right, up, toward camera], hard, key, fill, warm, rim, dark, window, sky }
 *   look        skin, hair and clothes (see LOOKS);  noBody  draw the head and neck only
 */
'use strict';

/* ---------- colour helpers ---------- */
function hexRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(h, a) { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${clamp01(a).toFixed(3)})`; }
function mixHex(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp01(t))).toString(16).padStart(2, '0')).join('');
}

/* ---------- looks ---------- */
const SKINS = {
  fair: { base: '#f4d0b4', shade: '#d49d84', deep: '#a76e58', lip: '#c9696d', blush: '#f2897f' },
  light: { base: '#eec29f', shade: '#cb8e6c', deep: '#9a5e44', lip: '#bf5e5e', blush: '#ee8573' },
  medium: { base: '#d59d76', shade: '#ae6f4d', deep: '#7d4831', lip: '#a5504c', blush: '#df7a65' },
  brown: { base: '#a56e4a', shade: '#7d4d31', deep: '#56321f', lip: '#7f3e3b', blush: '#c55f4c' },
  deep: { base: '#704731', shade: '#533221', deep: '#381f14', lip: '#5d2b29', blush: '#93473a' },
};
const LOOKS = {
  // long wavy hair: the "beauty portrait" model
  maya: { skin: SKINS.light, hair: '#3a2318', hairLit: '#5b3826', hairHi: '#9a6a48', style: 'long', top: '#e2d6c6', topDark: '#bcae9b', neckline: 'scoop', iris: '#6a4128', lashes: true },
  // short hair and a trimmed beard
  sam: { skin: SKINS.brown, hair: '#191311', hairLit: '#2c221d', hairHi: '#5a4a40', style: 'short', beard: true, top: '#46688a', topDark: '#30495f', neckline: 'crew', iris: '#3b2416' },
  // a black bob with a fringe
  lin: { skin: SKINS.fair, hair: '#18171c', hairLit: '#2b2a31', hairHi: '#5c5866', style: 'bob', top: '#c0493f', topDark: '#94352e', neckline: 'crew', iris: '#2e211b', lashes: true },
  // red hair and freckles, the selfie taker
  ivy: { skin: SKINS.fair, hair: '#9c4220', hairLit: '#c25f2e', hairHi: '#eea06a', style: 'long', top: '#2f3b56', topDark: '#212a3e', neckline: 'crew', iris: '#4f6b3a', lashes: true, freckles: true },
  // a child with curly hair
  kai: { skin: SKINS.medium, hair: '#2a1911', hairLit: '#40291c', hairHi: '#6e4a33', style: 'curly', top: '#f2b632', topDark: '#cf8d1c', neckline: 'crew', iris: '#3d2617', kid: true },
};

/* ---------- light ---------- */
const LIGHTS = {
  midday: { dir: [0.12, 0.97, 0.2], hard: 1, key: 1, fill: 0.16, warm: 0.05 },
  shade: { dir: [0.08, 0.3, 0.95], hard: 0, key: 0.92, fill: 0.68, warm: -0.12, sky: true },
  windowBehind: { dir: [-0.25, 0.12, -0.96], hard: 0.15, key: 1, fill: 0.15, rim: 0.6, dark: 0.45 },
  window: { dir: [-0.72, 0.24, 0.65], hard: 0.12, key: 1, fill: 0.36, window: true },
  sunFront: { dir: [0.2, 0.15, 0.97], hard: 0.85, key: 1, fill: 0.32, warm: 1, glare: true },
  sunBehind: { dir: [0.5, 0.25, -0.83], hard: 0.6, key: 1, fill: 0.5, warm: 1, rim: 1, dark: 0.25 },
  ceiling: { dir: [0.04, 0.97, 0.22], hard: 0.6, key: 0.9, fill: 0.2, warm: 0.3 },
  soft: { dir: [-0.5, 0.34, 0.8], hard: 0.1, key: 1, fill: 0.5 },
  flat: { dir: [0.05, 0.2, 0.98], hard: 0.3, key: 1, fill: 0.55 },
};
function lerpLight(a, b, t) {
  const o = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const va = a[key], vb = b[key];
    if (key === 'dir') o.dir = [0, 1, 2].map(i => lerp(va[i], vb[i], t));
    else if (typeof va === 'boolean' || typeof vb === 'boolean') o[key] = t < 0.5 ? !!va : !!vb;
    else o[key] = lerp(va ?? 0, vb ?? 0, t);
  }
  return o;
}
function normLight(l) {
  const [x, y, z] = l.dir;
  const n = Math.hypot(x, y, z) || 1;
  return { ...l, x: x / n, y: y / n, z: z / n, hard: l.hard ?? 0.5, key: l.key ?? 1, fill: l.fill ?? 0.3, warm: l.warm || 0, rim: l.rim || 0, dark: l.dark || 0 };
}

/* ---------- head geometry ---------- */
// Frontal points (x right, y down, z toward the camera) in face units; eye line at y = 0.
const FACE = {
  eye: [33, 0, 58], brow: [33, -25, 66], cheek: [46, 30, 54], ear: [77, 14, -4],
  noseTop: [0, 2, 72], noseTip: [0, 40, 98], noseBase: [0, 47, 88], nostril: [9, 45, 84],
  mouth: [0, 67, 80], corner: [22, 66, 70], lowerLip: [0, 75, 78], chin: [0, 100, 64],
  forehead: [0, -50, 66],
  jaw: [[76, 6, 4], [72, 35, 12], [60, 63, 26], [40, 86, 46], [18, 98, 60], [0, 101, 64]],
};
const KID_FACE = {
  ...FACE,
  eye: [31, 6, 58], brow: [31, -18, 64], cheek: [46, 36, 52], noseTip: [0, 38, 92], noseBase: [0, 43, 84], nostril: [7, 42, 80],
  mouth: [0, 60, 78], corner: [17, 59, 70], lowerLip: [0, 66, 76], chin: [0, 90, 62],
  jaw: [[80, 6, 4], [78, 34, 12], [69, 60, 26], [49, 80, 46], [24, 91, 58], [0, 94, 62]],
};
function headProjector(P) {
  const th = (P.yaw || 0) * 0.8;
  const al = (P.pitch || 0) * 0.32;
  const d = P.distort || 0;
  const ct = Math.cos(th), st = Math.sin(th), ca = Math.cos(al), sa = Math.sin(al);
  return ([x, y, z]) => {
    const xr = x * ct + z * st;
    const zr = -x * st + z * ct;
    let sx = xr, sy = y * ca + zr * sa;
    const m = 1 + d * 0.6 * (zr / 100);
    sx *= m;
    sy = 25 + (sy - 25) * m;
    return { x: sx, y: sy, z: zr, m, f: Math.max(0, Math.cos(Math.atan2(x, z) + th)) };
  };
}

/* ---------- drawing helpers (face units) ---------- */
function fillEll(ctx, x, y, rx, ry, color, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); ctx.fillStyle = color; ctx.fill(); }
function softSpot(ctx, x, y, r, color, a, sy = 1) {
  if (a <= 0.002) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, sy);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, rgba(color, a));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
}
/** A shadow ellipse whose edge is crisp in hard light (crisp = 1) and soft in soft light. */
function shadowEll(ctx, x, y, rx, ry, color, a, crisp, rot = 0) {
  if (a <= 0.002) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, rgba(color, a));
  g.addColorStop(lerp(0.25, 0.82, clamp01(crisp)), rgba(color, a));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill();
  ctx.restore();
}
/** Path through projected 3D points; mirror = also run back up the other side. */
function projPath(ctx, pr, pts, close = true) {
  pts.forEach((p, i) => { const q = pr(p); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); });
  if (close) ctx.closePath();
}
const mirror3 = pts => pts.map(([x, y, z]) => [-x, y, z]);

/** Closed cubic path: [start, [c1x, c1y, c2x, c2y, x, y], ...], optionally walked backwards. */
function bezLoop(ctx, segs, reverse) {
  if (!reverse) {
    ctx.moveTo(segs[0][0], segs[0][1]);
    for (const s of segs.slice(1)) ctx.bezierCurveTo(...s);
  } else {
    const ends = segs.map(s => s.slice(-2));
    ctx.moveTo(...ends[ends.length - 1]);
    for (let i = segs.length - 1; i > 0; i--) { const s = segs[i]; ctx.bezierCurveTo(s[2], s[3], s[0], s[1], ...ends[i - 1]); }
  }
  ctx.closePath();
}

/** Smooth closed curve through points (quadratic midpoints). */
function blobPath(ctx, pts) {
  const n = pts.length;
  ctx.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  }
  ctx.closePath();
}
/** Open smooth curve through points. */
function curvePath(ctx, pts) {
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) ctx.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
  const l = pts[pts.length - 1];
  ctx.lineTo(l[0], l[1]);
}

/**
 * Cel shading inside the current clip: the whole area in the shadow colour, then
 * the lit part in the lit colour. The lit part is a disc pushed toward the light;
 * how far it is pushed comes from the light's angle, and its edge is crisp for
 * hard light and wide for soft light.
 */
function celShade(ctx, cx, cy, R, Lt, lit, shadow, extra = {}) {
  const big = R * 6;
  ctx.fillStyle = shadow;
  ctx.fillRect(cx - big, cy - big, big * 2, big * 2);
  let dx = Lt.x, dy = -Lt.y;
  const n = Math.hypot(dx, dy);
  if (n < 0.05) { dx = 0; dy = -1; } else { dx /= n; dy /= n; }
  const Rl = R * 1.2;
  const shift = Rl * (1 - Lt.z);
  const spread = extra.spread ?? 1;
  const lx = cx + dx * shift * spread, ly = cy + dy * shift * (extra.spreadY ?? spread);
  const soft = lerp(0.035, 0.85, 1 - Lt.hard);
  const inner = Math.max(0, Rl * (1 - soft * 0.9)), outer = Rl * (1 + soft * 0.25);
  const g = ctx.createRadialGradient(lx, ly, inner, lx, ly, outer);
  g.addColorStop(0, rgba(lit, 1));
  g.addColorStop(1, rgba(lit, 0));
  ctx.fillStyle = g;
  ctx.fillRect(cx - big, cy - big, big * 2, big * 2);
  return { lx, ly, Rl };
}

/* ---------- the portrait ---------- */
function drawPortrait(ctx, P) {
  const look = P.look || LOOKS.maya;
  const skin = look.skin;
  const kid = !!look.kid;
  const F_ = kid ? KID_FACE : FACE;
  const Lt = normLight(P.light || LIGHTS.soft);
  const pr = headProjector(P);
  const k = P.s / 100;
  const yaw = P.yaw || 0, pitch = P.pitch || 0;
  ctx.save();
  ctx.translate(P.x, P.y);
  ctx.scale(k, k);
  if (P.roll) ctx.rotate(P.roll);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // how dark shadows get, and their colour on skin
  const S = clamp01((1 - Lt.fill) * Lt.key * 0.95);
  const skinShadow = mixHex(skin.base, mixHex(skin.shade, skin.deep, Lt.hard * 0.5), S);
  const skinLit = Lt.key < 1 ? mixHex(skin.base, skin.shade, (1 - Lt.key) * 0.6) : skin.base;

  // projected shapes
  const al = pitch * 0.32;
  const front = pr(F_.forehead);
  const hx = pr([0, -30, 30]).x * 0.55;          // the skull shifts a little with the turn
  const skullY = (kid ? -30 : -30) + Math.sin(al) * 16;
  const skullRx = (kid ? 85 : 79) * (1 + Math.abs(Math.sin(yaw * 0.8)) * 0.08) * (1 - (P.distort || 0) * 0.1);
  const skullRy = (kid ? 92 : 94) * (1 - Math.abs(al) * 0.15);
  const jawR = F_.jaw.map(p => pr(p));
  const jawL = F_.jaw.map(([x, y, z]) => pr([-x, y, z]));
  const chin = pr(F_.chin);
  const facePath = c => {
    c.beginPath();
    c.ellipse(hx, skullY, skullRx, skullRy, 0, Math.PI, 0);
    const right = jawR.map(p => [p.x, p.y]);
    const left = jawL.map(p => [p.x, p.y]).reverse();
    c.lineTo(right[0][0], right[0][1]);
    const pts = [...right, ...left.slice(1)];
    for (let i = 1; i < pts.length - 1; i++) c.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
    c.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    c.closePath();
  };
  const neckX = chin.x * 0.3;
  const neckW = kid ? 25 : 29;
  const neckTop = 55, neckBot = kid ? 108 : 118;
  const neckPath = c => {
    c.beginPath();
    c.moveTo(neckX - neckW, neckTop);
    c.quadraticCurveTo(neckX - neckW + 2, neckBot - 20, neckX - neckW - 6, neckBot + 8);
    c.lineTo(neckX + neckW + 6, neckBot + 8);
    c.quadraticCurveTo(neckX + neckW - 2, neckBot - 20, neckX + neckW, neckTop);
    c.closePath();
  };
  const bodyX = (P.bodyYaw ?? yaw * 0.4) * 50;
  const G = { hx, skullY, skullRx, skullRy, front, chin, neckX, neckBot, bodyX, kid, yaw };

  if (P.silhouette) {
    // just the outline, in one colour: for cast shadows
    ctx.fillStyle = P.silhouette;
    hairBackPath(ctx, look, G); ctx.fill();
    if (!P.noBody) { bodyPath(ctx, G); ctx.fill(); }
    neckPath(ctx); ctx.fill();
    facePath(ctx); ctx.fill();
    hairFrontPath(ctx, look, G); ctx.fill();
    ctx.restore();
    return;
  }

  /* rim light: a bright copy of the silhouette nudged toward a light behind the subject */
  let rdx = Lt.x, rdy = -Lt.y;
  { const n = Math.hypot(rdx, rdy) || 1; rdx /= n; rdy /= n; }
  const rimA = Lt.rim * clamp01(-Lt.z * 1.5) * Lt.key;
  const rimColor = Lt.warm > 0.3 ? '#ffdca6' : '#fff6e8';
  if (rimA > 0.01) {
    softSpot(ctx, hx + rdx * 60, skullY + rdy * 50, 280, rimColor, 0.4 * rimA);
    ctx.save();
    ctx.translate(rdx * 5.5, rdy * 5.5);
    ctx.globalAlpha *= rimA;
    ctx.fillStyle = rimColor;
    hairBackPath(ctx, look, G); ctx.fill();
    if (!P.noBody) { bodyPath(ctx, G); ctx.fill(); }
    facePath(ctx); ctx.fill();
    neckPath(ctx); ctx.fill();
    hairFrontPath(ctx, look, G); ctx.fill();
    ctx.restore();
  }

  /* back hair */
  const hairShadow = mixHex(look.hair, '#000000', 0.25 * S);
  const hairLt = { ...Lt, hard: Lt.hard * 0.45 };     // hair is soft: its shading never gets a crisp edge
  // exposing for a bright background leaves the person darker: each part is dimmed as it's drawn
  const DIM = '#160e0c';
  const dimFill = () => { if (Lt.dark > 0.01) { ctx.fillStyle = rgba(DIM, Lt.dark); ctx.fillRect(-700, -700, 1400, 1700); } };
  const dimHex = c => (Lt.dark > 0.01 ? mixHex(c, DIM, Lt.dark) : c);
  ctx.save();
  hairBackPath(ctx, look, G);
  ctx.clip();
  celShade(ctx, hx, skullY + 60, 150, hairLt, look.hairLit, hairShadow, { spread: 0.9 });
  dimFill();
  ctx.restore();

  /* body and clothes */
  if (!P.noBody) {
    ctx.save();
    bodyPath(ctx, G);
    ctx.clip();
    celShade(ctx, bodyX, 260, 200, hairLt, look.top, mixHex(look.top, look.topDark, 0.4 + S * 0.6));
    // the head and hair shade the chest
    softSpot(ctx, neckX, neckBot + 18, 90, '#000000', 0.1 + 0.18 * S);
    if (look.neckline === 'scoop') {
      ctx.beginPath(); ctx.ellipse(neckX + bodyX * 0.3, neckBot - 2, neckW * 2.3, 40, 0, 0, Math.PI);
      ctx.fillStyle = mixHex(skinLit, skinShadow, 0.25); ctx.fill();
    }
    dimFill();
    ctx.restore();
  }

  /* neck: mostly in the jaw's shadow */
  ctx.save();
  neckPath(ctx);
  ctx.clip();
  celShade(ctx, neckX, neckTop + 40, 70, Lt, mixHex(skinLit, skinShadow, 0.3), mixHex(skinShadow, skin.deep, 0.25));
  // cast shadow of the jaw
  ctx.translate(-Lt.x * 10, 12 + Lt.y * 16);
  facePath(ctx);
  ctx.fillStyle = rgba(skin.deep, 0.35 + 0.35 * S * clamp01(Lt.y + 0.3));
  ctx.fill();
  dimFill();
  ctx.restore();
  if (look.neckline === 'crew' && !P.noBody) {
    ctx.beginPath(); ctx.ellipse(neckX + bodyX * 0.25, neckBot + 4, neckW + 12, 13, 0, 0, Math.PI);
    ctx.lineWidth = 10; ctx.strokeStyle = dimHex(mixHex(look.top, look.topDark, 0.6)); ctx.stroke();
  }

  /* from below, the underside of the jaw shows: the "double chin" */
  if (pitch < -0.05) {
    const under = F_.jaw.map(([x, y, z]) => [x * 0.84, y + 12, z - 48]);
    ctx.beginPath();
    projPath(ctx, pr, [...F_.jaw, ...mirror3(F_.jaw).reverse(), ...mirror3(under), ...under.slice().reverse()]);
    ctx.fillStyle = mixHex(skinShadow, skin.deep, 0.2);
    ctx.fill();
    ctx.save();
    ctx.clip();
    softSpot(ctx, chin.x, chin.y + 8, 60, skinLit, 0.35);
    dimFill();
    ctx.restore();
  }
  if (look.beard) {
    // the beard reaches a little past the jawline
    ctx.beginPath();
    const edge = F_.jaw.map(([x, y, z]) => [x, y + 4, z]);
    projPath(ctx, pr, [...edge, ...mirror3(edge).reverse()]);
    ctx.fillStyle = dimHex(beardColor(look, S));
    ctx.fill();
  }

  /* ears, for hair that leaves them visible */
  if (look.style === 'short' || look.style === 'curly') {
    for (const side of [-1, 1]) {
      const e = pr([F_.ear[0] * side, F_.ear[1], F_.ear[2]]);
      if (e.z < -30) continue;
      const vis = Math.abs(e.x) - Math.abs(hx);
      if (vis < 40) continue;
      fillEll(ctx, e.x + side * 2, e.y, 11, 19, dimHex(skin.base));
      fillEll(ctx, e.x + side * 3, e.y + 1, 5, 10, dimHex(skin.shade));
    }
  }

  /* face */
  ctx.save();
  facePath(ctx);
  ctx.clip();
  // the front of the face looks at the camera, so light from above moves the shading less
  celShade(ctx, front.x * 0.4 + hx * 0.6, -8, 112, Lt, skinLit, skinShadow, { spreadY: 0.38 });
  // gentle falloff at the edges gives the face volume
  const edge = ctx.createRadialGradient(front.x * 0.5, 10, 60, hx, 0, 130);
  edge.addColorStop(0, rgba(skin.deep, 0));
  edge.addColorStop(1, rgba(skin.deep, 0.16));
  ctx.fillStyle = edge;
  ctx.fillRect(-250, -250, 500, 500);
  if (Lt.warm > 0.05) {
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = `rgba(255,150,60,${0.3 * Lt.warm})`;
    ctx.fillRect(-250, -250, 500, 500);
    ctx.globalCompositeOperation = 'source-over';
  } else if (Lt.warm < -0.05) {
    ctx.fillStyle = `rgba(140,170,215,${0.12 * -Lt.warm})`;
    ctx.fillRect(-250, -250, 500, 500);
  }
  if (look.beard) drawBeard(ctx, look, F_, pr, Lt, S);
  drawFeatures(ctx, P, look, F_, Lt, pr, S);
  dimFill();
  ctx.restore();

  /* front hair */
  ctx.save();
  hairFrontPath(ctx, look, G);
  ctx.clip();
  celShade(ctx, hx, skullY + (look.style === 'long' ? 40 : 0), look.style === 'long' ? 150 : 110, hairLt, look.hairLit, hairShadow, { spread: 0.95, spreadY: 0.7 });
  hairStrands(ctx, look, G, Lt, rimA);
  dimFill();
  ctx.restore();
  ctx.restore();
}

/** A point on the head (face units, see FACE) in world coordinates. */
function portraitPoint(P, pt) {
  const q = headProjector(P)(pt);
  const k = P.s / 100;
  return [P.x + q.x * k, P.y + q.y * k];
}
/** World position of the eye nearest the camera. */
function nearEye(P) {
  const F_ = P.look && P.look.kid ? KID_FACE : FACE;
  const pr = headProjector(P);
  const a = pr([F_.eye[0], F_.eye[1], F_.eye[2]]), b = pr([-F_.eye[0], F_.eye[1], F_.eye[2]]);
  return portraitPoint(P, a.z >= b.z ? F_.eye : [-F_.eye[0], F_.eye[1], F_.eye[2]]);
}

function bodyPath(ctx, G) {
  const x = G.bodyX, n = G.neckBot;
  const w = G.kid ? 130 : 178, slope = G.kid ? 40 : 52;
  ctx.beginPath();
  ctx.moveTo(G.neckX - 36, n - 6);
  ctx.bezierCurveTo(x - 90, n + 2, x - w + 24, n + slope - 22, x - w, n + slope + 30);
  ctx.lineTo(x - w - 26, 700);
  ctx.lineTo(x + w + 26, 700);
  ctx.lineTo(x + w, n + slope + 30);
  ctx.bezierCurveTo(x + w - 24, n + slope - 22, x + 90, n + 2, G.neckX + 36, n - 6);
  ctx.closePath();
}

/* ---------- hair ---------- */
function hairBackPath(ctx, look, G) {
  const { hx, skullY: sy, skullRx: rx, skullRy: ry } = G;
  ctx.beginPath();
  if (look.style === 'long') {
    blobPath(ctx, [
      [hx, sy - ry - 12], [hx + rx + 18, sy - ry * 0.55], [hx + rx + 28, sy + 40], [hx + rx + 36, sy + 150],
      [hx + rx + 26, sy + 230], [hx, sy + 240],
      [hx - rx - 26, sy + 230], [hx - rx - 36, sy + 150], [hx - rx - 28, sy + 40], [hx - rx - 18, sy - ry * 0.55],
    ]);
  } else if (look.style === 'bob') {
    blobPath(ctx, [
      [hx, sy - ry - 14], [hx + rx + 18, sy - ry * 0.5], [hx + rx + 22, sy + 60], [hx + rx + 18, sy + 128],
      [hx + rx - 10, sy + 140], [hx - rx + 10, sy + 140], [hx - rx - 18, sy + 128], [hx - rx - 22, sy + 60], [hx - rx - 18, sy - ry * 0.5],
    ]);
  } else if (look.style === 'curly') {
    for (let i = 0; i < 13; i++) {
      const a = Math.PI * 0.92 + (i / 12) * Math.PI * 1.16;
      const cx = hx + Math.cos(a) * (rx + 6), cy = sy + Math.sin(a) * (ry + 4) + 4;
      ctx.moveTo(cx + 28, cy); ctx.arc(cx, cy, 28, 0, TAU);
    }
  } else {
    ctx.ellipse(hx, sy - 2, rx + 6, ry + 7, 0, Math.PI * 0.95, Math.PI * 2.05);
    ctx.closePath();
  }
}

function hairFrontPath(ctx, look, G) {
  const { hx, skullY: sy, skullRx: rx, skullRy: ry, front } = G;
  const fx = front.x;
  ctx.beginPath();
  if (look.style === 'long') {
    const part = fx - 22;
    // crown with a side parting and a fringe sweeping toward the viewer's right
    ctx.moveTo(hx - rx - 10, sy + 34);
    ctx.ellipse(hx, sy, rx + 10, ry + 12, 0, Math.PI * 0.92, Math.PI * 2.08);
    ctx.lineTo(hx + rx + 2, sy + 70);
    ctx.bezierCurveTo(hx + rx - 6, sy + 30, fx + 58, sy - 4, fx + 30, sy - 26);
    ctx.bezierCurveTo(fx + 10, sy - 38, part + 10, sy - 40, part, sy - 36);
    ctx.bezierCurveTo(part - 20, sy - 30, hx - rx + 14, sy - 6, hx - rx + 4, sy + 40);
    ctx.closePath();
    // locks falling past the jaw and over the front of the shoulders (both wound like the crown,
    // so the overlaps stay filled)
    for (const s of [-1, 1]) {
      const ex = hx + s * rx;
      bezLoop(ctx, [[ex - s * 8, sy - 10],
        [ex - s * 2, sy + 60, ex - s * 10, sy + 130, ex - s * 18, sy + 190],
        [ex - s * 24, sy + 236, ex - s * 6, sy + 272, ex + s * 6, sy + 290],
        [ex + s * 14, sy + 270, ex + s * 34, sy + 240, ex + s * 32, sy + 180],
        [ex + s * 32, sy + 120, ex + s * 30, sy + 40, ex + s * 12, sy - 40]], s > 0);
    }
  } else if (look.style === 'bob') {
    ctx.moveTo(hx - rx - 18, sy + 128);
    ctx.lineTo(hx - rx - 20, sy);
    ctx.ellipse(hx, sy, rx + 20, ry + 14, 0, Math.PI, 0);
    ctx.lineTo(hx + rx + 18, sy + 128);
    ctx.quadraticCurveTo(hx + rx + 2, sy + 140, hx + rx - 14, sy + 126);
    ctx.lineTo(hx + rx - 10, sy + 34);
    ctx.quadraticCurveTo(fx + 40, sy - 6, fx + 30, sy - 4);
    ctx.lineTo(fx - 64, sy - 4);
    ctx.quadraticCurveTo(hx - rx + 10, sy + 6, hx - rx + 10, sy + 34);
    ctx.lineTo(hx - rx + 14, sy + 126);
    ctx.quadraticCurveTo(hx - rx - 2, sy + 140, hx - rx - 18, sy + 128);
    ctx.closePath();
  } else if (look.style === 'short') {
    // close at the sides, with some height on top
    ctx.moveTo(hx - rx - 2, sy + 34);
    // a textured top: small tufts along the crown
    const tuft = (a, grow) => [hx + Math.cos(a) * (rx + 4 + grow), sy - 4 + Math.sin(a) * (ry + 6 + grow * 2.2)];
    let prev = tuft(Math.PI * 0.97, 0);
    ctx.lineTo(...prev);
    for (let i = 1; i <= 10; i++) {
      const a = Math.PI * (0.97 + 1.06 * i / 10), grow = Math.sin(Math.PI * i / 10) * 6;
      const p = tuft(a, grow), c = tuft(Math.PI * (0.97 + 1.06 * (i - 0.5) / 10), grow + 4);
      ctx.quadraticCurveTo(c[0], c[1], p[0], p[1]);
      prev = p;
    }
    ctx.lineTo(hx + rx - 2, sy + 34);
    ctx.lineTo(hx + rx - 9, sy + 4);
    ctx.bezierCurveTo(fx + 46, sy - 32, fx + 20, sy - 44, fx - 6, sy - 42);
    ctx.bezierCurveTo(fx - 40, sy - 40, hx - rx + 16, sy - 24, hx - rx + 9, sy + 4);
    ctx.closePath();
  } else if (look.style === 'curly') {
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * 1.04 + (i / 8) * Math.PI * 0.92;
      const cx = hx + Math.cos(a) * (rx - 8) + G.yaw * 8, cy = sy + Math.sin(a) * (ry - 18) + 2;
      ctx.moveTo(cx + 26, cy); ctx.arc(cx, cy, 26, 0, TAU);
    }
  }
}

/** Hair shine: a crescent on the crown toward the light, plus a few strand lines in long hair. */
function hairStrands(ctx, look, G, Lt, rimA) {
  const { hx, skullY: sy, skullRx: rx, skullRy: ry } = G;
  const side = Lt.x >= 0 ? 1 : -1;
  const shine = clamp01(Lt.key * (0.35 + Lt.hard * 0.4) * clamp01(Lt.z + 0.7) + rimA * 0.6) * (1 - Lt.dark * 0.7);
  const col = rimA > 0.25 ? '#ffe2b0' : look.hairHi;
  if (look.style === 'curly') {
    // a glint on each curl toward the light
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * 1.04 + (i / 8) * Math.PI * 0.92;
      const cx = hx + Math.cos(a) * (rx - 8) + G.yaw * 8, cy = sy + Math.sin(a) * (ry - 18) + 2;
      fillEll(ctx, cx + side * 8, cy - 9, 9, 5, rgba(col, 0.45 * shine), side * -0.5);
    }
    return;
  }
  const grow = look.style === 'bob' ? [20, 14] : look.style === 'short' ? [4, 18] : [10, 12];
  const R0 = rx + grow[0] - 6, R1 = ry + grow[1] - 6;
  const a0 = side > 0 ? Math.PI * 1.56 : Math.PI * 1.1, a1 = side > 0 ? Math.PI * 1.9 : Math.PI * 1.44;
  ctx.beginPath();
  ctx.ellipse(hx, sy, R0, R1, 0, a0, a1);
  ctx.ellipse(hx + side * 6, sy + 12, R0 - 14, R1 - 16, 0, a1, a0, true);
  ctx.closePath();
  ctx.fillStyle = rgba(col, 0.5 * shine);
  ctx.fill();
  if (look.style === 'long') {
    ctx.strokeStyle = rgba(col, 0.3 * shine);
    ctx.lineWidth = 2.4;
    for (const s of [-1, 1]) {
      const ex = hx + s * rx;
      for (const o of [6, 18]) {
        ctx.beginPath();
        ctx.moveTo(ex + s * (o - 8), sy + 20);
        ctx.bezierCurveTo(ex + s * (o - 4), sy + 100, ex + s * (o - 8), sy + 170, ex + s * (o - 2), sy + 240);
        ctx.stroke();
      }
    }
  }
}

function beardColor(look, S) { return mixHex(mixHex(look.hair, look.skin.shade, 0.3), '#000000', 0.1 * S); }
// a short boxed beard and moustache, in face-space 3D points (right half; mirrored for the left)
const BEARD_OUT = [[75, -8, 0], [77, 8, 4], [74, 37, 12], [63, 67, 26], [42, 92, 46], [19, 106, 60], [0, 109, 64]];
const BEARD_IN = [[0, 86, 77], [15, 85, 73], [29, 73, 64], [40, 50, 55], [54, 34, 44], [64, 12, 22], [66, -8, 12]];
const MOUSTACHE = [[-27, 67, 66], [-15, 54, 82], [0, 52, 88], [15, 54, 82], [27, 67, 66], [22, 64, 70], [10, 61, 81], [0, 62, 83], [-10, 61, 81], [-22, 64, 70]];
function drawBeard(ctx, look, F_, pr, Lt, S) {
  const col = beardColor(look, S);
  ctx.beginPath();
  projPath(ctx, pr, [...BEARD_OUT, ...mirror3(BEARD_OUT).reverse().slice(1), ...mirror3(BEARD_IN).reverse(), ...BEARD_IN.slice(1)]);
  projPath(ctx, pr, MOUSTACHE);
  ctx.fillStyle = col;
  ctx.fill();
  // a soft sheen on the lit side
  ctx.save();
  ctx.clip();
  const c = pr([Lt.x * 40, 70, 60]);
  softSpot(ctx, c.x, c.y, 60, mixHex(look.hairHi, look.skin.shade, 0.3), 0.35 * Lt.key * clamp01(Lt.z + 0.5) * (1 - Lt.dark));
  ctx.restore();
}

/* ---------- eyes, brows, nose, mouth ---------- */
function drawFeatures(ctx, P, look, F_, Lt, pr, S) {
  const skin = look.skin;
  const kid = !!look.kid;
  const squint = clamp01(P.squint || 0), smile = clamp01(P.smile || 0), laugh = clamp01(P.laugh || 0), blink = clamp01(P.blink || 0);
  const pitch = P.pitch || 0, yaw = P.yaw || 0;
  const gaze = P.gaze || [-yaw * 0.6, -pitch * 0.55];
  const hardS = Lt.hard * S;
  const overhead = clamp01((Lt.y - 0.5) / 0.4) * clamp01(Lt.z + 0.7);
  const eyeK = kid ? 1.22 : 1;
  const sdir = Lt.x >= 0 ? -1 : 1;     // the side away from the light
  const browCol = mixHex(look.hair, skin.deep, 0.2);

  /* eyes */
  for (const side of [-1, 1]) {
    const e = pr([F_.eye[0] * side, F_.eye[1], F_.eye[2]]);
    if (e.f < 0.15) continue;
    const w = 17 * eyeK * e.f * e.m;
    const open = (1 - squint * 0.6) * (1 - blink) * (1 - laugh) * (1 - smile * 0.15);
    const h = 8.6 * eyeK * e.m * open;
    const cx = e.x, cy = e.y;

    // brow
    const b = pr([F_.brow[0] * side, F_.brow[1], F_.brow[2]]);
    const knit = squint * 6 - (P.forced ? 4 : 0) - laugh * 2;
    ctx.strokeStyle = browCol;
    ctx.lineWidth = (kid ? 5 : look.lashes ? 5.5 : 7) * b.m;
    ctx.beginPath();
    ctx.moveTo(b.x - side * 17 * b.f, b.y + 4 + knit);
    ctx.quadraticCurveTo(b.x + side * 3 * b.f, b.y - (look.lashes ? 8 : 5) + knit * 0.4, b.x + side * 20 * b.f, b.y + 3);
    ctx.stroke();

    // lid crease
    ctx.strokeStyle = rgba(skin.deep, 0.4);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(cx, cy - h * 0.2, w * 1.02, h + 6, 0, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    if (open < 0.14) {
      ctx.strokeStyle = '#2a1a14';
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (laugh > 0.4 || smile > 0.6) ctx.ellipse(cx, cy + 4, w * 0.9, 6, 0, Math.PI * 1.12, Math.PI * 1.88);
      else ctx.ellipse(cx, cy - 1, w * 0.92, 4.5, 0, Math.PI * 0.08, Math.PI * 0.92);
      ctx.stroke();
      continue;
    }
    const almond = c => {
      c.beginPath();
      c.moveTo(cx - w, cy + 1);
      c.bezierCurveTo(cx - w * 0.6, cy - h * 1.3, cx + w * 0.45, cy - h * 1.35, cx + w, cy - 1);
      c.bezierCurveTo(cx + w * 0.5, cy + h * 0.95, cx - w * 0.55, cy + h, cx - w, cy + 1);
      c.closePath();
    };
    almond(ctx);
    ctx.fillStyle = '#f7f3ef';
    ctx.fill();
    ctx.save();
    almond(ctx);
    ctx.clip();
    const ir = 8.4 * eyeK * e.m;
    const ix = cx + gaze[0] * w * 0.32, iy = cy + gaze[1] * h * 0.45 + 0.5;
    const ig = ctx.createRadialGradient(ix, iy, ir * 0.15, ix, iy, ir);
    ig.addColorStop(0, mixHex(look.iris, '#ffffff', 0.25));
    ig.addColorStop(0.7, look.iris);
    ig.addColorStop(1, mixHex(look.iris, '#000000', 0.5));
    ctx.fillStyle = ig;
    ctx.beginPath(); ctx.arc(ix, iy, ir, 0, TAU); ctx.fill();
    ctx.fillStyle = '#100a08';
    ctx.beginPath(); ctx.arc(ix, iy, ir * 0.44, 0, TAU); ctx.fill();
    // the upper lid shades the eyeball
    const lidShade = ctx.createLinearGradient(0, cy - h * 1.3, 0, cy + 2);
    lidShade.addColorStop(0, 'rgba(60,28,18,0.5)');
    lidShade.addColorStop(1, 'rgba(60,28,18,0)');
    ctx.fillStyle = lidShade;
    ctx.fillRect(cx - w, cy - h * 1.4, w * 2, h * 1.6);
    // catchlights: the light source reflected in the eye
    const blocked = overhead * Lt.hard > 0.5;
    if (Lt.z > 0.06 && !blocked) {
      const ox = clamp(Lt.x, -0.85, 0.85) * ir * 0.5, oy = clamp(-Lt.y, -0.85, 0.85) * ir * 0.45;
      const ca = clamp01(Lt.key * (0.5 + Lt.z * 0.55)) * (1 - Lt.dark);
      if (Lt.window) {
        const sw = ir * 0.62, sh = ir * 0.78;
        ctx.fillStyle = `rgba(255,255,255,${0.97 * ca})`;
        ctx.beginPath(); ctx.roundRect(ix + ox - sw / 2, iy + oy - sh / 2, sw, sh, 1.2); ctx.fill();
        ctx.strokeStyle = rgba(look.iris, 0.85 * ca);
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(ix + ox, iy + oy - sh / 2); ctx.lineTo(ix + ox, iy + oy + sh / 2);
        ctx.moveTo(ix + ox - sw / 2, iy + oy); ctx.lineTo(ix + ox + sw / 2, iy + oy);
        ctx.stroke();
      } else if (Lt.sky) {
        softSpot(ctx, ix + ox * 0.4, iy - ir * 0.42, ir * 0.85, '#ffffff', 0.85 * ca, 0.5);
        fillEll(ctx, ix + ox * 0.6 - ir * 0.2, iy - ir * 0.38, ir * 0.22, ir * 0.16, `rgba(255,255,255,${0.9 * ca})`);
      } else {
        fillEll(ctx, ix + ox, iy + oy, ir * 0.26, ir * 0.26, `rgba(255,255,255,${0.97 * ca})`);
      }
      if (Lt.fill > 0.42) fillEll(ctx, ix - ox * 0.3, iy + ir * 0.58, ir * 0.14, ir * 0.09, `rgba(255,255,255,${0.45 * ca})`);
    }
    ctx.restore();
    // lash line and lower lid
    ctx.strokeStyle = '#1d120e';
    ctx.lineWidth = look.lashes ? 3.4 : 2.4;
    ctx.beginPath();
    ctx.moveTo(cx - w, cy + 1);
    ctx.bezierCurveTo(cx - w * 0.6, cy - h * 1.3, cx + w * 0.45, cy - h * 1.35, cx + w, cy - 1);
    ctx.stroke();
    if (look.lashes) {
      // a small flick at the outer corner
      const ox = side > 0 ? cx + w : cx - w, oy = side > 0 ? cy - 1 : cy + 1;
      ctx.beginPath(); ctx.moveTo(ox - side * 3, oy - 1); ctx.lineTo(ox + side * 4, oy - 5); ctx.stroke();
    }
    ctx.strokeStyle = rgba(skin.deep, 0.5);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.75, cy + h * 0.7);
    ctx.quadraticCurveTo(cx, cy + h * 1.05 + 1 - smile * 2, cx + w * 0.8, cy + h * 0.55);
    ctx.stroke();
  }
  // eye sockets go dark under a high, hard light
  const socket = hardS * overhead * 0.9;
  if (socket > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    for (const side of [-1, 1]) {
      const e = pr([F_.eye[0] * side, F_.eye[1] - 3, F_.eye[2]]);
      if (e.f < 0.15) continue;
      shadowEll(ctx, e.x + side * 2, e.y, 29 * e.m, 17 * e.m, skin.shade, socket, Lt.hard * 0.7, side * 0.12);
    }
    ctx.restore();
  }
  if (squint > 0.3) {
    const b = pr([0, F_.brow[1] - 2, 68]);
    ctx.strokeStyle = rgba(skin.deep, 0.5 * squint);
    ctx.lineWidth = 2;
    for (const dx of [-5, 5]) { ctx.beginPath(); ctx.moveTo(b.x + dx, b.y - 5); ctx.lineTo(b.x + dx * 0.7, b.y + 7); ctx.stroke(); }
  }

  /* nose */
  const nt = pr(F_.noseTip), nb = pr(F_.noseBase), ntop = pr(F_.noseTop);
  // shadow side of the nose
  ctx.save();
  // (a turned head shows the nose's outline instead)
  ctx.strokeStyle = rgba(skin.deep, (0.18 + S * 0.35) * clamp01(1 - (Math.abs(yaw) - 0.1) * 5));
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(ntop.x + sdir * 7, ntop.y + 6);
  ctx.quadraticCurveTo(nt.x + sdir * 10, (ntop.y + nt.y) / 2 + 8, nt.x + sdir * 9, nt.y + 3);
  ctx.stroke();
  ctx.restore();
  if (Math.abs(yaw) > 0.12) {
    const s = Math.sign(yaw);
    ctx.strokeStyle = rgba(skin.deep, 0.5 * clamp01(Math.abs(yaw) * 2.5));
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(ntop.x + s * 3, ntop.y + 4); ctx.quadraticCurveTo(nt.x + s * 8, nt.y - 6, nt.x + s * 3, nt.y + 5); ctx.stroke();
  }
  // the nose casts a shadow: below it in overhead light, across the cheek in side light
  const castA = hardS * clamp01(Lt.z + 0.75);
  if (castA > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    shadowEll(ctx, nb.x - Lt.x * 16, nb.y + 2 + Lt.y * 5, 13 * nt.m, 6.5 * nt.m, skin.shade, castA * 0.8, Lt.hard * 0.8, -Lt.x * 0.5);
    ctx.restore();
  }
  // nose wings and nostrils; the nostrils show more from below
  const from = clamp01(-pitch);
  fillEll(ctx, nb.x, nb.y - 4, 13 * nb.m, 7 * nb.m, rgba(skin.shade, 0.18 + S * 0.15));
  ctx.strokeStyle = rgba(skin.deep, 0.45);
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    const n = pr([F_.nostril[0] * side, F_.nostril[1], F_.nostril[2]]);
    if (n.f < 0.2) continue;
    const wx = n.x + side * 6 * n.m * n.f;
    ctx.beginPath(); ctx.moveTo(wx - side * 1, n.y - 9 * n.m); ctx.quadraticCurveTo(wx + side * 5 * n.m, n.y - 3 * n.m, wx - side * 1, n.y + 2 * n.m); ctx.stroke();
    fillEll(ctx, n.x - side * 0.5, n.y + from * 1.5, 3.6 * n.m * n.f, (1.5 + from * 1.4) * n.m, rgba(skin.deep, 0.62 + from * 0.2), side * 0.3);
  }
  softSpot(ctx, nt.x - sdir * 3, nt.y - 4, 8 * nt.m, '#ffffff', 0.35 * Lt.key * (Lt.z > -0.2 ? 1 : 0.2) * (1 - Lt.dark));

  /* mouth */
  const m = pr(F_.mouth), ll = pr(F_.lowerLip);
  const cr = pr(F_.corner), cl = pr([-F_.corner[0], F_.corner[1], F_.corner[2]]);
  const up = smile * 8 + laugh * 5 + (P.forced ? 3 : 0);
  const wide = 1 + smile * 0.16 + laugh * 0.12 + (P.forced ? 0.2 : 0);
  const xr = m.x + (cr.x - m.x) * wide, xl = m.x + (cl.x - m.x) * wide;
  const lip = mixHex(skin.lip, skin.base, kid ? 0.4 : 0);
  if (laugh > 0.3 || smile > 0.55 || P.forced) {
    const open = laugh > 0.3 ? 10 + laugh * 14 : P.forced ? 9 : (smile - 0.55) * 26;
    ctx.beginPath();
    ctx.moveTo(xl, cl.y - up);
    ctx.quadraticCurveTo(m.x, m.y - 3, xr, cr.y - up);
    ctx.quadraticCurveTo(m.x, m.y + open * 1.5, xl, cl.y - up);
    ctx.closePath();
    ctx.fillStyle = '#5b1f20';
    ctx.fill();
    ctx.save();
    ctx.clip();
    fillEll(ctx, m.x, m.y - 2, (xr - xl) * 0.44, 6 + open * 0.14, '#fbf8f3');
    if (P.forced) fillEll(ctx, m.x, m.y + open * 0.6, (xr - xl) * 0.44, 4, '#f2ede6');
    if (laugh > 0.3) fillEll(ctx, m.x, m.y + open * 1.15, (xr - xl) * 0.26, 7, '#d5666c');
    ctx.restore();
    ctx.strokeStyle = lip;
    ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(xl, cl.y - up); ctx.quadraticCurveTo(m.x, m.y + open * 1.5, xr, cr.y - up); ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(xl, cl.y - up); ctx.quadraticCurveTo(m.x, m.y - 3, xr, cr.y - up); ctx.stroke();
  } else {
    ctx.fillStyle = lip;
    ctx.beginPath();
    ctx.moveTo(xl, cl.y - up);
    ctx.quadraticCurveTo(m.x - 10, m.y - 9, m.x, m.y - 5);
    ctx.quadraticCurveTo(m.x + 10, m.y - 9, xr, cr.y - up);
    ctx.quadraticCurveTo(m.x, m.y + 2 - up * 0.2, xl, cl.y - up);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(xl + 2, cl.y - up + 0.5);
    ctx.quadraticCurveTo(m.x, m.y + 2 - up * 0.2, xr - 2, cr.y - up + 0.5);
    ctx.quadraticCurveTo(m.x, ll.y + 5, xl + 2, cl.y - up + 0.5);
    ctx.fillStyle = mixHex(lip, '#ffffff', 0.1);
    ctx.fill();
    ctx.strokeStyle = rgba(mixHex(lip, '#000000', 0.5), 0.85);
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(xl, cl.y - up); ctx.quadraticCurveTo(m.x, m.y + 2 - up * 0.2, xr, cr.y - up); ctx.stroke();
    softSpot(ctx, m.x + 5, ll.y + 1, 7, '#ffffff', 0.25 * Lt.key * (1 - Lt.dark));
  }
  softSpot(ctx, ll.x, ll.y + 10, 14, skin.deep, 0.1 + hardS * clamp01(Lt.y) * 0.4, 0.5);
  if (smile > 0.5 || laugh > 0.3) {
    // smile lines
    ctx.strokeStyle = rgba(skin.deep, 0.24 * clamp01(Math.max(smile - 0.5, laugh) * 2));
    ctx.lineWidth = 1.6;
    for (const s of [-1, 1]) { const x0 = s > 0 ? xr : xl; ctx.beginPath(); ctx.moveTo(x0 + s * 7, (s > 0 ? cr.y : cl.y) - up - 10); ctx.quadraticCurveTo(x0 + s * 11, m.y - 4, x0 + s * 7, m.y + 3); ctx.stroke(); }
  }

  /* cheeks, freckles, highlights */
  for (const side of [-1, 1]) {
    const c = pr([F_.cheek[0] * side, F_.cheek[1], F_.cheek[2]]);
    if (c.f < 0.15) continue;
    softSpot(ctx, c.x, c.y + 2 - smile * 5, 24, skin.blush, (kid ? 0.34 : 0.24) * (1 - Lt.dark), 0.72);
    if (look.freckles) {
      const rnd = mulberry32(side > 0 ? 5 : 9);
      for (let i = 0; i < 16; i++) fillEll(ctx, c.x + (rnd() - 0.5) * 40, c.y - 8 + (rnd() - 0.5) * 20, 1.3, 1.3, rgba('#a2522d', 0.5));
    }
  }
  const hl = Lt.key * (0.12 + Lt.hard * 0.22) * clamp01(Lt.z + 0.4) * (1 - Lt.dark);
  const fh = pr(F_.forehead);
  softSpot(ctx, fh.x + Lt.x * 18, fh.y + 8, 26, '#ffffff', hl, 0.6);
  const cside = Lt.x >= 0 ? 1 : -1;
  const cb = pr([F_.cheek[0] * cside * 0.85, F_.cheek[1] - 10, F_.cheek[2]]);
  if (cb.f > 0.2) softSpot(ctx, cb.x, cb.y, 17, '#ffffff', hl * 0.9, 0.7);
  const ch = pr(F_.chin);
  softSpot(ctx, ch.x, ch.y - 12, 11, '#ffffff', hl * 0.6, 0.7);
}

/* ---------- full-body figure ---------- */
/**
 * Standing person, front view. (x, y) = between the feet on the ground, h = height.
 * o.camHigh 0..1: shot down from the photographer's eye level (bigger head, shorter legs).
 * Returns the heights of the joints, for crop guides.
 */
function drawStanding(ctx, x, y, h, o = {}) {
  const look = o.look || LOOKS.lin;
  const c = clamp01(o.camHigh || 0);
  const k = h / 100;
  const headS = 1 + c * 0.3, legS = 1 - c * 0.22, torsoS = 1 + c * 0.05;
  const legLen = 47 * legS, torsoLen = 30 * torsoS;
  const hip = y - legLen * k, shoulder = hip - torsoLen * k;
  const skin = look.skin;
  const Lt = normLight(o.light || LIGHTS.soft);
  const soft = { ...Lt, hard: Lt.hard * 0.45 };
  const S = clamp01((1 - Lt.fill) * 0.9);
  const lit = Lt.x >= 0 ? 1 : -1;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ell(ctx, x + 5 * k, y + 0.6 * k, 15 * k * (1 + c * 0.2), 2.4 * k * (1 + c * 0.8), 'rgba(30,25,20,0.3)');

  /* legs: tapered, with a knee crease */
  const kneeY = hip + legLen * 0.52 * k;
  const jeans = o.legs || '#3d5c86', jeansDark = mixHex(jeans, '#000000', 0.3);
  const ww = 10.6 * k;                       // half the width at the waist
  for (const side of [-1, 1]) {
    const hx = x + side * 5 * k, fx = x + side * 5.4 * k;
    ctx.fillStyle = side === lit ? jeans : mixHex(jeans, jeansDark, S);
    ctx.beginPath();
    ctx.moveTo(x + side * 0.2 * k, hip - 1 * k);
    ctx.lineTo(x + side * ww, hip - 1 * k);
    ctx.quadraticCurveTo(hx + side * 4.8 * k, kneeY - 6 * k, fx + side * 3 * k, y - 4 * k);
    ctx.lineTo(fx - side * 2.6 * k, y - 4 * k);
    ctx.quadraticCurveTo(hx - side * 3.6 * k, kneeY, x + side * 0.6 * k, hip + 6 * k);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba('#000000', 0.18);
    ctx.lineWidth = 0.9 * k;
    ctx.beginPath(); ctx.moveTo(hx - side * 1.8 * k, kneeY); ctx.quadraticCurveTo(hx + side * 0.4 * k, kneeY + 1.1 * k, hx + side * 2.6 * k, kneeY - 0.3 * k); ctx.stroke();
    ctx.fillStyle = o.shoes || '#f3efe8';
    const sw = 9.5 * k * (1 - c * 0.25);
    ctx.beginPath(); ctx.roundRect(fx - sw / 2 + side * 1 * k, y - 4.4 * k, sw, 4.8 * k, 2.2 * k); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(fx - sw / 2 + side * 1 * k, y - 1.2 * k, sw, 1 * k);
  }

  /* torso: rounded shoulders, narrowing to the waist */
  const sh = 13.4 * k;                       // half the shoulder width
  const torso = () => {
    ctx.beginPath();
    ctx.moveTo(x - sh + 2.4 * k, shoulder + 0.6 * k);
    ctx.quadraticCurveTo(x - sh - 0.6 * k, shoulder + 1.4 * k, x - sh, shoulder + 6 * k);
    ctx.quadraticCurveTo(x - sh + 1.6 * k, hip - 10 * k, x - ww, hip + 1.5 * k);
    ctx.lineTo(x + ww, hip + 1.5 * k);
    ctx.quadraticCurveTo(x + sh - 1.6 * k, hip - 10 * k, x + sh, shoulder + 6 * k);
    ctx.quadraticCurveTo(x + sh + 0.6 * k, shoulder + 1.4 * k, x + sh - 2.4 * k, shoulder + 0.6 * k);
    ctx.quadraticCurveTo(x, shoulder - 1.4 * k, x - sh + 2.4 * k, shoulder + 0.6 * k);
    ctx.closePath();
  };
  ctx.save();
  torso();
  ctx.clip();
  celShade(ctx, x, (shoulder + hip) / 2, 18 * k, soft, look.top, mixHex(look.top, look.topDark, 0.4 + S * 0.6));
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x - sh, hip - 0.6 * k, sh * 2, 2.1 * k);
  ctx.restore();

  /* arms: one relaxed, one hand on the hip */
  const sy = shoulder + 3.2 * k;
  for (const side of [-1, 1]) {
    const sx = x + side * (sh - 1.6 * k);
    const elbow = side < 0 ? [sx + side * 1.4 * k, sy + 14.5 * k * torsoS] : [sx + side * 6.6 * k, sy + 12.5 * k * torsoS];
    const hand = side < 0 ? [sx + side * 0.2 * k, sy + 27.5 * k * torsoS] : [x + ww + 0.6 * k, hip - 2.5 * k];
    const col = side === lit ? look.top : mixHex(look.top, look.topDark, 0.5 + S * 0.5);
    ctx.strokeStyle = col;
    ctx.lineWidth = 5.4 * k;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(elbow[0], elbow[1]); ctx.stroke();
    ctx.lineWidth = 4.4 * k;
    ctx.beginPath(); ctx.moveTo(elbow[0], elbow[1]); ctx.lineTo(hand[0], hand[1]); ctx.stroke();
    ell(ctx, hand[0], hand[1] + 1.2 * k, 2.3 * k, 2.9 * k, side === lit ? skin.base : skin.shade);
  }

  /* head */
  const headY = shoulder - 10.5 * k * headS;
  drawPortrait(ctx, { x, y: headY, s: 8.4 * k * headS, look, light: o.light || LIGHTS.soft, smile: o.smile ?? 0.6, pitch: c * 0.8, noBody: true, yaw: o.yaw || 0 });
  ctx.restore();
  return {
    top: headY - 13 * k * headS, neck: shoulder - 1.5 * k, elbow: shoulder + 17.5 * k * torsoS, waist: hip - 3 * k,
    wrist: shoulder + 31 * k * torsoS, hip, knee: kneeY, ankle: y - 4.5 * k, foot: y,
  };
}
