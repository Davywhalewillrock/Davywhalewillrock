/*
 * Animation engine: timeline, layout, text, the camera "viewfinder", grease-pencil
 * marks and the contact-strip comparison. Everything is a pure function of time,
 * so the same code drives the live player and the frame-by-frame video render.
 */
'use strict';

/* ---------- math ---------- */
const TAU = Math.PI * 2;
const ASPECT = 3 / 2; // camera sensor aspect ratio
const DEG = Math.PI / 180;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const clamp01 = v => clamp(v, 0, 1);
const lerp = (a, b, t) => a + (b - a) * t;
const Ease = {
  linear: t => t,
  inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  sine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};
/** Eased 0→1 progress of a span that starts at `a` and lasts `d` seconds. */
function seg(t, a, d, e = Ease.inOut) { return e(clamp01((t - a) / d)); }
/** Envelope: 0 before a, fades up, holds, fades down to 0 at b. */
function env(t, a, b, fin = 0.35, fout = 0.35) {
  if (t <= a || t >= b) return 0;
  return Math.min(Ease.out(clamp01((t - a) / fin)), Ease.out(clamp01((b - t) / fout)));
}
function mulberry32(seed) {
  return function () {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- palette & type ---------- */
const C = {
  bg: '#141312',       // darkroom charcoal
  panel: '#0b0a09',
  ink: '#f3efe8',      // warm paper white
  dim: '#aba49a',
  mid: '#6f6961',
  faint: '#3b3732',
  red: '#f0503f',      // grease pencil: reject
  yellow: '#f8cb4a',   // grease pencil: keeper
  green: '#62d68f',    // focus confirmation
  edge: '#c99a3c',     // film edge markings
};
const F = {
  display: (px, w = 800) => `${w} ${px}px Archivo, "Arial Narrow", Arial, sans-serif`,
  body: (px, w = 400) => `${w} ${px}px "Atkinson Hyperlegible", "Helvetica Neue", Arial, sans-serif`,
  mono: (px, w = 500) => `${w} ${px}px "DM Mono", ui-monospace, Menlo, Consolas, monospace`,
  hand: px => `${px}px "Permanent Marker", "Comic Sans MS", cursive`,
};
const FONT_FACES = [
  '800 60px Archivo', '600 60px Archivo',
  '400 30px "Atkinson Hyperlegible"', '700 30px "Atkinson Hyperlegible"',
  '500 20px "DM Mono"', '400 20px "DM Mono"',
  '40px "Permanent Marker"',
];

/* ---------- timeline ---------- */
const FALLBACK_WPS = 2.7; // words per second, used until narration timings exist

function buildTimeline(lesson, durations = {}) {
  let T = 0;
  const scenes = lesson.scenes.map((def, index) => {
    let t = def.lead ?? 1.0;
    const cues = def.cues.map(c => {
      const speech = durations[c.id] ?? c.say.split(/\s+/).length / FALLBACK_WPS + 0.25;
      const cue = { ...c, at: t, speech, end: t + speech };
      t += Math.max(speech + (c.gap ?? 0.45), c.min ?? 0);
      return cue;
    });
    const dur = t + (def.tail ?? 1.0);
    const scene = { ...def, index, cues, start: T, dur, end: T + dur };
    T += dur;
    return scene;
  });
  return { scenes, duration: T };
}

/** Approximate moment a phrase is spoken inside a cue (by character position). */
function phraseAt(cue, phrase) {
  const i = cue.say.indexOf(phrase);
  if (i < 0) return cue.at;
  return cue.at + cue.speech * (i / cue.say.length);
}

/* ---------- layout ---------- */
function makeLayout(W, H) {
  if (H <= W) {
    const u = W / 1920;
    const m = 64 * u;
    const vis = { x: m, y: 190 * u, w: 1080 * u, h: 720 * u };
    const sideX = vis.x + vis.w + 64 * u;
    return {
      W, H, u, portrait: false,
      head: { x: m, kickerY: 92 * u, titleY: 156 * u, w: W - 2 * m },
      vis,
      side: { x: sideX, y: vis.y + 6 * u, w: W - m - sideX, h: vis.h },
      sub: { x: W / 2, y: 974 * u, w: 1640 * u },
      prog: { x: m, y: H - 38 * u, w: W - 2 * m, h: 4 * u },
      f: { kicker: 21 * u, title: 60 * u, idea: 36 * u, body: 29 * u, label: 18 * u, tip: 25 * u, sub: 31 * u, hand: 46 * u },
      lh: { idea: 46 * u, body: 37 * u, tip: 33 * u, sub: 40 * u, title: 66 * u },
    };
  }
  const u = W / 1080;
  const m = 56 * u;
  const vis = { x: 40 * u, y: 318 * u, w: 1000 * u, h: 1000 * u / ASPECT };
  return {
    W, H, u, portrait: true,
    head: { x: m, kickerY: 128 * u, titleY: 204 * u, w: W - 2 * m },
    vis,
    side: { x: 64 * u, y: vis.y + vis.h + 64 * u, w: W - 128 * u, h: 560 * u },
    sub: { x: W / 2, y: H - 236 * u, w: W - 120 * u },
    prog: { x: m, y: H - 64 * u, w: W - 2 * m, h: 5 * u },
    f: { kicker: 26 * u, title: 60 * u, idea: 42 * u, body: 34 * u, label: 22 * u, tip: 30 * u, sub: 37 * u, hand: 50 * u },
    lh: { idea: 54 * u, body: 44 * u, tip: 40 * u, sub: 50 * u, title: 68 * u },
  };
}

/* ---------- text ---------- */
const _wrapCache = new Map();
function wrapText(ctx, str, maxW) {
  const key = ctx.font + '|' + Math.round(maxW) + '|' + str;
  let lines = _wrapCache.get(key);
  if (lines) return lines;
  lines = [];
  for (const para of String(str).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const test = line ? line + ' ' + word : word;
      if (line && ctx.measureText(test).width > maxW) { lines.push(line); line = word; } else line = test;
    }
    lines.push(line);
  }
  if (_wrapCache.size > 4000) _wrapCache.clear();
  _wrapCache.set(key, lines);
  return lines;
}
/** Draws (optionally wrapped) text; returns the block height. */
function drawText(ctx, str, x, y, o) {
  ctx.save();
  ctx.font = o.font;
  ctx.fillStyle = o.color || C.ink;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.baseline || 'alphabetic';
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (o.ls && 'letterSpacing' in ctx) ctx.letterSpacing = o.ls + 'px';
  const lines = o.maxW ? wrapText(ctx, str, o.maxW) : [str];
  const lh = o.lh || 0;
  lines.forEach((ln, i) => ctx.fillText(ln, x, y + i * lh));
  ctx.restore();
  return lines.length * lh;
}
function textLines(ctx, str, font, maxW) {
  ctx.save(); ctx.font = font; const lines = wrapText(ctx, str, maxW); ctx.restore();
  return lines.length;
}

/* ---------- camera ---------- */
// A camera is { x, y, w, r }: centre in world units, frame width, roll in radians.
function lerpCam(a, b, p) {
  return {
    x: lerp(a.x, b.x, p),
    y: lerp(a.y, b.y, p),
    w: Math.exp(lerp(Math.log(a.w), Math.log(b.w), p)),
    r: lerp(a.r || 0, b.r || 0, p),
  };
}
/** Small hand-held drift for the live view. */
function sway(cam, t, amount = 1) {
  const k = cam.w * 0.0022 * amount;
  return { ...cam, x: cam.x + k * Math.sin(t * 1.3 + 0.4), y: cam.y + k * 0.8 * Math.sin(t * 0.93 + 1.7), r: (cam.r || 0) + amount * 0.0012 * Math.sin(t * 0.71) };
}
/** Bounding box of rect r in canvas pixels, under the current transform. */
function deviceBox(ctx, r) {
  const m = ctx.getTransform();
  const xs = [], ys = [];
  for (const [x, y] of [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]]) {
    xs.push(m.a * x + m.c * y + m.e);
    ys.push(m.b * x + m.d * y + m.f);
  }
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  return { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 };
}
/**
 * Draws what `cam` sees of `world` into rect `r` (any aspect; width-matched).
 * The world also gets the photo's box in canvas pixels, for effects that work off-screen.
 */
function drawPhoto(ctx, r, world, cam, st) {
  const box = deviceBox(ctx, r);
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  const s = r.w / cam.w;
  ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
  ctx.rotate(-(cam.r || 0));
  ctx.scale(s, s);
  ctx.translate(-cam.x, -cam.y);
  world.draw(ctx, st || {}, box);
  ctx.restore();
}
/** World point → canvas point for a photo drawn with drawPhoto(r, cam). */
function w2p(r, cam, wx, wy) {
  const s = r.w / cam.w;
  const a = -(cam.r || 0);
  const dx = (wx - cam.x) * s, dy = (wy - cam.y) * s;
  return [r.x + r.w / 2 + dx * Math.cos(a) - dy * Math.sin(a), r.y + r.h / 2 + dx * Math.sin(a) + dy * Math.cos(a)];
}
const rectLerp = (a, b, p) => ({ x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), w: lerp(a.w, b.w, p), h: lerp(a.h, b.h, p) });

/* ---------- viewfinder chrome ---------- */
function strokeLine(ctx, x0, y0, x1, y1) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }

function drawGrid(ctx, r, p, alpha = 0.55) {
  if (p <= 0) return;
  const u = r.w / 1080;
  ctx.save();
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = Math.max(1, 1.6 * u);
  for (let i = 1; i <= 2; i++) {
    const x = r.x + (r.w * i) / 3, y = r.y + (r.h * i) / 3;
    const lv = r.h * p, lh = r.w * p;
    strokeLine(ctx, x, r.y + r.h / 2 - lv / 2, x, r.y + r.h / 2 + lv / 2);
    strokeLine(ctx, r.x + r.w / 2 - lh / 2, y, r.x + r.w / 2 + lh / 2, y);
  }
  ctx.restore();
}

/**
 * Live-view overlay: corner brackets, optional 3x3 grid, focus box, exposure readout
 * and electronic level. o = { alpha, grid, af:[x,y], afLock, readout, level, frameNo }
 */
function drawViewfinder(ctx, r, o) {
  const a = o.alpha ?? 1;
  if (a <= 0) return;
  const u = r.w / 1080;
  ctx.save();
  ctx.globalAlpha *= a;
  drawGrid(ctx, r, o.grid ?? 0);

  // corner brackets
  const L = 44 * u, ins = 20 * u;
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = 3 * u;
  ctx.lineCap = 'square';
  const corners = [[r.x + ins, r.y + ins, 1, 1], [r.x + r.w - ins, r.y + ins, -1, 1], [r.x + ins, r.y + r.h - ins, 1, -1], [r.x + r.w - ins, r.y + r.h - ins, -1, -1]];
  for (const [x, y, sx, sy] of corners) {
    ctx.beginPath(); ctx.moveTo(x, y + sy * L); ctx.lineTo(x, y); ctx.lineTo(x + sx * L, y); ctx.stroke();
  }

  // focus box
  if (o.af) {
    const [fx, fy] = o.af;
    const s = 30 * u * (o.afLock ? 1 : 1.18);
    ctx.strokeStyle = o.afLock ? C.green : 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 3 * u;
    const k = s * 0.45;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      ctx.beginPath();
      ctx.moveTo(fx + sx * s, fy + sy * (s - k));
      ctx.lineTo(fx + sx * s, fy + sy * s);
      ctx.lineTo(fx + sx * (s - k), fy + sy * s);
      ctx.stroke();
    }
  }

  // electronic level: a line through the centre that tilts with the camera
  if (o.level != null) {
    const tilt = o.level;
    const ok = Math.abs(tilt) < 0.4 * DEG;
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, len = r.w * 0.16;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 2 * u;
    strokeLine(ctx, -len * 1.25, 0, -len * 1.08, 0);
    strokeLine(ctx, len * 1.08, 0, len * 1.25, 0);
    ctx.rotate(-tilt);
    ctx.strokeStyle = ok ? C.green : C.red;
    ctx.lineWidth = 4 * u;
    strokeLine(ctx, -len, 0, -len * 0.15, 0);
    strokeLine(ctx, len * 0.15, 0, len, 0);
    ctx.restore();
  }

  // exposure readout strip
  if (o.readout) {
    const h = 40 * u;
    const y = r.y + r.h - h;
    const g = ctx.createLinearGradient(0, y - 20 * u, 0, r.y + r.h);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(r.x, y - 20 * u, r.w, h + 20 * u);
    drawText(ctx, o.readout, r.x + 64 * u, y + 27 * u, { font: F.mono(17 * u, 500), color: 'rgba(255,255,255,0.88)', ls: 1.5 * u });
    // battery + shots left
    const bx = r.x + r.w - 150 * u, by = y + 13 * u;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.6 * u;
    ctx.strokeRect(bx, by, 30 * u, 15 * u);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(bx + 30 * u, by + 4 * u, 3 * u, 7 * u);
    for (let i = 0; i < 3; i++) ctx.fillRect(bx + 3 * u + i * 9 * u, by + 3 * u, 6.5 * u, 9 * u);
    drawText(ctx, `[${o.frameNo ?? 312}]`, bx + 46 * u, y + 27 * u, { font: F.mono(17 * u, 500), color: 'rgba(255,255,255,0.88)' });
  }
  ctx.restore();
}

/** Playback label shown on a frozen shot, like a camera's review screen. */
function drawReviewTag(ctx, r, label, alpha) {
  if (alpha <= 0) return;
  const u = r.w / 1080;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.roundRect(r.x + 18 * u, r.y + 18 * u, 186 * u, 36 * u, 6 * u);
  ctx.fill();
  // play triangle
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.moveTo(r.x + 34 * u, r.y + 27 * u); ctx.lineTo(r.x + 34 * u, r.y + 45 * u); ctx.lineTo(r.x + 48 * u, r.y + 36 * u);
  ctx.closePath(); ctx.fill();
  drawText(ctx, label, r.x + 60 * u, r.y + 42 * u, { font: F.mono(17 * u, 500), color: 'rgba(255,255,255,0.9)', ls: 1 * u });
  ctx.restore();
}

/** Mirror blackout then a soft flash, centred on the shutter moment. */
function drawShutter(ctx, r, t, tSnap) {
  const dt = t - tSnap;
  if (dt < -0.07 || dt > 0.5) return;
  ctx.save();
  if (dt < 0.05) {
    ctx.fillStyle = '#000';
    ctx.globalAlpha *= 0.95;
  } else {
    ctx.fillStyle = '#fff';
    ctx.globalAlpha *= 0.5 * Math.pow(1 - (dt - 0.05) / 0.45, 2);
  }
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.restore();
}

/* ---------- grease pencil ---------- */
function polyLength(pts) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return total;
}
function strokePartial(ctx, pts, p) {
  if (p <= 0 || pts.length < 2) return;
  let remain = polyLength(pts) * clamp01(p);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (remain >= l) { ctx.lineTo(pts[i][0], pts[i][1]); remain -= l; } else {
      const f = l ? remain / l : 0;
      ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f));
      break;
    }
  }
  ctx.stroke();
}
/** A waxy china-marker stroke, drawn up to fraction p of its length. */
function grease(ctx, pts, p, color, width) {
  if (p <= 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = width * 0.9;
  ctx.globalAlpha *= 0.94;
  ctx.lineWidth = width;
  strokePartial(ctx, pts, p);
  ctx.shadowBlur = 0;
  ctx.globalAlpha *= 0.5;
  ctx.lineWidth = width * 0.45;
  ctx.strokeStyle = '#ffffff';
  ctx.translate(-width * 0.12, -width * 0.16);
  strokePartial(ctx, pts, p);
  ctx.restore();
}
function loopPts(cx, cy, rx, ry, seed = 1) {
  const rnd = mulberry32(seed);
  const pts = [];
  const a0 = -2.4 + rnd() * 0.5;
  const n = 72;
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const a = a0 + f * TAU * 1.08;
    const wob = 1 + 0.035 * Math.sin(f * 11 + seed) + (f > 0.85 ? (f - 0.85) * 0.55 : 0);
    pts.push([cx + Math.cos(a) * rx * wob, cy + Math.sin(a) * ry * wob]);
  }
  return pts;
}
function bowPts(x0, y0, x1, y1, bend, n = 24) {
  const mx = (x0 + x1) / 2 - (y1 - y0) * bend, my = (y0 + y1) / 2 + (x1 - x0) * bend;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    pts.push([(1 - f) * (1 - f) * x0 + 2 * (1 - f) * f * mx + f * f * x1, (1 - f) * (1 - f) * y0 + 2 * (1 - f) * f * my + f * f * y1]);
  }
  return pts;
}
function markX(ctx, cx, cy, s, p, color, width) {
  grease(ctx, bowPts(cx - s, cy - s * 0.92, cx + s * 0.95, cy + s, 0.04), seg(p, 0, 0.5, Ease.out), color, width);
  grease(ctx, bowPts(cx + s * 0.92, cy - s, cx - s * 0.9, cy + s * 0.95, -0.05), seg(p, 0.5, 0.5, Ease.out), color, width);
}
function markCheck(ctx, x, y, s, p, color, width) {
  const pts = [[x - s * 0.9, y - s * 0.05], [x - s * 0.35, y + s * 0.55], [x + s * 1.0, y - s * 0.85]];
  const dense = [];
  for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < 10; k++) dense.push([lerp(pts[i][0], pts[i + 1][0], k / 10), lerp(pts[i][1], pts[i + 1][1], k / 10)]);
  dense.push(pts[pts.length - 1]);
  grease(ctx, dense, p, color, width);
}
function markArrow(ctx, x0, y0, x1, y1, bend, p, color, width) {
  const pts = bowPts(x0, y0, x1, y1, bend);
  grease(ctx, pts, seg(p, 0, 0.75, Ease.out), color, width);
  const q = seg(p, 0.75, 0.25, Ease.out);
  if (q > 0) {
    const [ax, ay] = pts[pts.length - 1], [bx, by] = pts[pts.length - 4];
    const ang = Math.atan2(ay - by, ax - bx), hl = width * 3.4;
    grease(ctx, [[ax + Math.cos(ang + 2.55) * hl, ay + Math.sin(ang + 2.55) * hl], [ax, ay], [ax + Math.cos(ang - 2.55) * hl, ay + Math.sin(ang - 2.55) * hl]], q, color, width);
  }
}
/** Handwritten note revealed left to right. */
function handNote(ctx, str, x, y, p, color, px, rot = -0.05, align = 'left') {
  if (p <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.font = F.hand(px);
  const w = ctx.measureText(str).width;
  const x0 = align === 'center' ? -w / 2 : align === 'right' ? -w : 0;
  ctx.beginPath();
  ctx.rect(x0 - px, -px * 1.4, (w + px * 2) * clamp01(p), px * 2.4);
  ctx.clip();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = px * 0.25;
  ctx.fillStyle = color;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x0, 0);
  ctx.restore();
}

/* ---------- contact strip (before / after) ---------- */
function stripRects(r) {
  const g = r.w * 0.045;
  const fw = (r.w - g * 3) / 2, fh = fw / ASPECT;
  const y = r.y + (r.h - fh) / 2 - r.h * 0.03;
  return {
    band: { x: r.x, y: y - fh * 0.2, w: r.w, h: fh * 1.4 },
    a: { x: r.x + g, y, w: fw, h: fh },
    b: { x: r.x + g * 2 + fw, y, w: fw, h: fh },
  };
}
function drawFilmBand(ctx, band, alpha) {
  if (alpha <= 0) return;
  const u = band.w / 1080;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = '#050505';
  ctx.fillRect(band.x, band.y, band.w, band.h);
  // sprocket holes
  ctx.fillStyle = '#d8d2c6';
  const hw = 15 * u, hh = 21 * u, step = 38 * u;
  for (let x = band.x + 14 * u; x < band.x + band.w - hw; x += step) {
    ctx.beginPath(); ctx.roundRect(x, band.y + 10 * u, hw, hh, 3 * u); ctx.fill();
    ctx.beginPath(); ctx.roundRect(x, band.y + band.h - 10 * u - hh, hw, hh, 3 * u); ctx.fill();
  }
  ctx.restore();
}

/* ---------- page furniture ---------- */
function drawHeader(ctx, L, S, t) {
  const a = seg(t, 0.05, 0.6, Ease.out);
  const dy = (1 - a) * 14 * L.u;
  drawText(ctx, S.kicker || '', L.head.x, L.head.kickerY + dy, { font: F.mono(L.f.kicker, 500), color: C.dim, ls: 3 * L.u, alpha: a });
  drawText(ctx, S.title || '', L.head.x, L.head.titleY + dy, { font: F.display(L.f.title, 800), color: C.ink, alpha: a, maxW: L.head.w, lh: L.lh.title });
}

function drawSubtitles(ctx, L, S, t) {
  for (const c of S.cues) {
    const a = env(t, c.at - 0.12, c.end + 0.3, 0.12, 0.2);
    if (a <= 0) continue;
    drawText(ctx, c.say, L.sub.x, L.sub.y, { font: F.body(L.f.sub, 400), color: '#d9d3ca', align: 'center', maxW: L.sub.w, lh: L.lh.sub, alpha: a });
  }
}

function drawProgress(ctx, L, TL, T) {
  const g = 6 * L.u, p = L.prog;
  const totalGap = g * (TL.scenes.length - 1);
  let x = p.x;
  for (const s of TL.scenes) {
    const w = ((p.w - totalGap) * s.dur) / TL.duration;
    ctx.fillStyle = C.faint;
    ctx.fillRect(x, p.y, w, p.h);
    const f = clamp01((T - s.start) / s.dur);
    if (f > 0) { ctx.fillStyle = T < s.end ? C.ink : C.dim; ctx.fillRect(x, p.y, w * f, p.h); }
    x += w + g;
  }
}

/** Marker icons used in the notes panel. */
function iconX(ctx, x, y, s, p) { markX(ctx, x, y, s * 0.42, p, C.red, s * 0.16); }
function iconCheck(ctx, x, y, s, p) { markCheck(ctx, x, y, s * 0.42, p, C.yellow, s * 0.16); }

/**
 * Notes panel: a stack of items that fade in at their own time.
 * item = { kind: 'idea'|'bad'|'good'|'tip'|'label'|'gap'|'custom', text, at, h, draw }
 */
function drawNotes(ctx, L, t, items) {
  const s = L.side, u = L.u;
  let y = s.y;
  for (const it of items) {
    const a = it.at == null ? 1 : seg(t, it.at, 0.55, Ease.out);
    const dy = (1 - a) * 12 * u;
    if (it.kind === 'idea') {
      y += L.f.idea * 0.9;
      const h = drawText(ctx, it.text, s.x, y + dy, { font: F.body(L.f.idea, 400), color: C.ink, maxW: s.w, lh: L.lh.idea, alpha: a });
      y += h - L.lh.idea + L.f.idea * 0.35 + 30 * u;
    } else if (it.kind === 'bad' || it.kind === 'good') {
      const iconS = L.f.body * 1.25;
      y += L.f.body * 0.9;
      if (a > 0) {
        ctx.save(); ctx.globalAlpha *= a;
        (it.kind === 'bad' ? iconX : iconCheck)(ctx, s.x + iconS * 0.45, y - L.f.body * 0.32 + dy, iconS, seg(t, it.at, 0.7));
        ctx.restore();
      }
      const h = drawText(ctx, it.text, s.x + iconS * 1.25, y + dy, { font: F.body(L.f.body, 400), color: it.kind === 'bad' ? '#e9c9c3' : '#f1e3bd', maxW: s.w - iconS * 1.25, lh: L.lh.body, alpha: a });
      y += h - L.lh.body + L.f.body * 0.35 + 18 * u;
    } else if (it.kind === 'tip') {
      y += 22 * u;
      ctx.save(); ctx.globalAlpha *= a;
      ctx.fillStyle = C.faint; ctx.fillRect(s.x, y + dy, s.w, Math.max(1, 1.5 * u));
      ctx.restore();
      y += 26 * u + L.f.label;
      drawText(ctx, it.label || 'TRY IT', s.x, y + dy, { font: F.mono(L.f.label, 500), color: C.dim, ls: 2.5 * u, alpha: a });
      y += L.f.tip * 1.5;
      const h = drawText(ctx, it.text, s.x, y + dy, { font: F.body(L.f.tip, 400), color: '#cfc8be', maxW: s.w, lh: L.lh.tip, alpha: a });
      y += h;
    } else if (it.kind === 'label') {
      y += L.f.label;
      drawText(ctx, it.text, s.x, y + dy, { font: F.mono(L.f.label, 500), color: C.dim, ls: 2.5 * u, alpha: a });
      y += 22 * u;
    } else if (it.kind === 'gap') {
      y += it.h * u;
    } else if (it.kind === 'custom') {
      if (a > 0) { ctx.save(); ctx.globalAlpha *= a; it.draw(ctx, { x: s.x, y: y + dy, w: s.w, h: it.h * u }, t); ctx.restore(); }
      y += it.h * u;
    }
  }
}
