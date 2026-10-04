/*
 * Lesson 2, Photographing People: the configs for each lesson, the little
 * diagrams in the notes panel, and the scenes unique to this lesson
 * (start with the eyes, quick recipes, homework).
 * The shared lesson pattern lives in js/lesson.js.
 */
'use strict';

/* ---------- aiming at faces ---------- */
const specOf = (key, v) => WORLDS[key].spec(v.st);
const specAt = (key, p) => WORLDS[key].spec({ t: 0, p, focus: p });
function faceLoop(ctx, r, cam, P, p, color, seed, k = 1) {
  const [x, y] = portraitPoint(P, [0, 22, 60]);
  const s = (P.s / 100) * k;
  return mLoop(ctx, r, cam, x, y, 112 * s, 146 * s, p, color, seed);
}
function eyesLoop(ctx, r, cam, P, p, color, seed) {
  const [x, y] = portraitPoint(P, [0, 2, 60]);
  const s = P.s / 100;
  return mLoop(ctx, r, cam, x, y, 74 * s, 30 * s, p, color, seed);
}
function featureLoop(ctx, r, cam, P, pt, rx, ry, p, color, seed) {
  const [x, y] = portraitPoint(P, pt);
  const s = P.s / 100;
  return mLoop(ctx, r, cam, x, y, rx * s, ry * s, p, color, seed);
}
/** A note beside the phone, at height fy of its screen. */
function phoneNote(ctx, r, text, fy, p, color) {
  const u = r.w / 330;
  handNote(ctx, text, r.x + r.w + 70 * u, r.y + r.h * fy, p, color, 50 * u, -0.05, 'left');
}
/** A note written next to a loop: [x, y, rx] from mLoop. */
function noteBy(ctx, r, L, text, p, color, side = 1) {
  const u = ru(r);
  const [x, y, rx] = L;
  handNote(ctx, text, x + side * (rx + 22 * u), y + 12 * u, p, color, 46 * u, -0.05, side > 0 ? 'left' : 'right');
}

/* ---------- lesson configurations ---------- */
/** A landscape frame from just above the head down to `bottom`, with the person on the left third. */
function jointsCam(bottom) {
  const top = JOINTS.top - 60, h = bottom - top, w = h * ASPECT;
  return { x: SUBJECT.standing.x + w / 6, y: (top + bottom) / 2, w };
}
const std = c => ({ badSnap: c[1].at - 0.35, move: c[2].at + 0.1, moveDur: 2.2, goodSnap: c[2].end + 0.15, compare: 0 });
const LESSONS = {
  eyes: {
    world: 'eyes',
    bad: { x: 1400, y: 960, w: 1300 },
    good: { x: 1400, y: 960, w: 1300 },
    state: (tt, p) => ({ focus: p }),
    af: p => (p < 0.55 ? (() => { const e = nearEye(specAt('eyes', 1)); const q = Ease.inOut(p / 0.55); return [lerp(TREE_AF[0], e[0], q), lerp(TREE_AF[1], e[1], q)]; })() : null),
    readout: '1/250   F2   ISO 100',
    action: 'FOCUS ON THE NEAR EYE',
    anchors: c => ({ badSnap: c[1].at - 0.35, move: c[2].at + 0.1, moveDur: 1.6, goodSnap: c[2].end + 0.1, compare: c[3].at + 0.4 }),
    // eye detection: a box that hugs the near eye once focus gets there
    overlay(ctx, P, v, t, A, a) {
      const k = clamp01((v.p - 0.5) / 0.2) * a;
      if (k <= 0) return;
      const u = ru(P);
      const [ex, ey] = w2p(P, v.cam, ...nearEye(specOf('eyes', v)));
      const lock = t > A.goodSnap - 0.5;
      const w = 74 * u, h = 52 * u;
      ctx.save();
      ctx.globalAlpha *= k;
      ctx.strokeStyle = lock ? C.green : 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 3 * u;
      ctx.strokeRect(ex - w / 2, ey - h / 2, w, h);
      drawText(ctx, 'EYE AF', ex - w / 2, ey - h / 2 - 10 * u, { font: F.mono(15 * u, 500), color: lock ? C.green : '#ffffff', ls: 1.5 * u });
      ctx.restore();
    },
    markBad(ctx, r, v, p) {
      const P = specOf('eyes', v);
      const L = faceLoop(ctx, r, v.cam, P, p, C.red, 3);
      noteBy(ctx, r, L, 'Blurry!', seg(p, 0.5, 0.5), C.red);
    },
    markGood(ctx, r, v, p) {
      const P = specOf('eyes', v);
      const [x, y] = nearEye(P);
      mLoop(ctx, r, v.cam, x, y, 60, 40, p, C.yellow, 4);
      mNote(ctx, r, 'Keeper!', 0.8, 0.2, seg(p, 0.5, 0.5), C.yellow, 'center');
    },
  },

  headroom: {
    world: 'headroom',
    bad: { x: 1200, y: 800, w: 1500 },
    good: { x: 1200, y: 900, w: 900 },
    af: () => nearEye(specAt('headroom', 0)),
    grid: (t, S) => seg(t, S.cues[0].at, 1.0),
    readout: '1/250   F2.8   ISO 200',
    action: 'ZOOM IN · EYES ON THE TOP LINE',
    anchors: std,
    markBad(ctx, r, v, p) {
      const top = v.cam.y - v.cam.w / ASPECT / 2;
      mArrow(ctx, r, v.cam, [1420, top + 40], [1420, 640], seg(p, 0, 0.6), C.red, 0);
      mArrow(ctx, r, v.cam, [1420, 640], [1420, top + 40], seg(p, 0.1, 0.6), C.red, 0);
      mNote(ctx, r, 'Empty!', 0.72, 0.2, seg(p, 0.5, 0.5), C.red, 'left');
    },
    markGood(ctx, r, v, p) {
      gridLine(ctx, r, false, 1 / 3, seg(p, 0, 0.5), C.yellow, 5);
      eyesLoop(ctx, r, v.cam, specOf('headroom', v), seg(p, 0.3, 0.6), C.yellow, 5);
      mNote(ctx, r, 'Keeper!', 0.82, 0.62, seg(p, 0.6, 0.4), C.yellow, 'center');
    },
  },

  joints: {
    world: 'joints',
    bad: jointsCam(JOINTS.knee),
    good: jointsCam((JOINTS.hip + JOINTS.knee) / 2),
    af: () => [1185, JOINTS.eyes],
    readout: '1/320   F4   ISO 100',
    action: 'CROP AT MID-THIGH',
    sway: 0.6,
    anchors: std,
    markBad(ctx, r, v, p) {
      const y = r.y + r.h - 10 * ru(r);
      grease(ctx, bowPts(r.x + r.w * 0.2, y, r.x + r.w * 0.5, y, 0.003, 20), seg(p, 0, 0.5), C.red, 10 * ru(r));
      mArrow(ctx, r, v.cam, [1700, JOINTS.knee - 170], [1330, JOINTS.knee - 25], seg(p, 0.3, 0.5), C.red, 0.06);
      mNote(ctx, r, 'Cut at the knees!', 0.69, 0.62, seg(p, 0.5, 0.5), C.red, 'center', -0.04);
    },
    markGood(ctx, r, v, p) {
      const y = r.y + r.h - 10 * ru(r);
      grease(ctx, bowPts(r.x + r.w * 0.2, y, r.x + r.w * 0.5, y, 0.003, 20), seg(p, 0, 0.5), C.yellow, 10 * ru(r));
      mNote(ctx, r, 'Keeper!', 0.72, 0.2, seg(p, 0.5, 0.5), C.yellow, 'center');
    },
    side: { h: 230, draw: (ctx, rect, t, A) => drawJointsChart(ctx, rect, seg(t, A.badSnap + 0.3, 1.4), seg(t, A.move, 1.4)) },
  },

  wall: {
    world: 'wall',
    bad: { x: 1250, y: 940, w: 1300 },
    good: { x: 1250, y: 940, w: 1300 },
    state: (tt, p) => ({ p }),
    af: () => nearEye(specAt('wall', 0)),
    readout: '1/250   F2.8   ISO 100',
    action: 'STEP AWAY FROM THE WALL',
    anchors: c => ({ ...std(c), move: phraseAt(c[2], 'Bring them'), moveDur: 2.4 }),
    markBad(ctx, r, v, p) {
      const [sx, sy] = WORLDS.wall.shadowAt(0);
      const L = mLoop(ctx, r, v.cam, sx + 60, sy - 10, 150, 190, p, C.red, 6);
      noteBy(ctx, r, L, 'Shadow!', seg(p, 0.5, 0.5), C.red);
    },
    markGood(ctx, r, v, p) {
      faceLoop(ctx, r, v.cam, specOf('wall', v), p, C.yellow, 7, 1.08);
      mNote(ctx, r, 'Keeper!', 0.8, 0.2, seg(p, 0.5, 0.5), C.yellow, 'center');
    },
    side: { h: 230, draw: (ctx, rect, t, A) => drawTopView(ctx, rect, seg(t, A.move, A.moveDur), 'wall') },
  },

  midday: {
    world: 'midday',
    bad: { x: 1060, y: 960, w: 1300 },
    good: { x: 2360, y: 960, w: 1300 },
    state: (tt, p) => ({ p }),
    af: p => nearEye(specAt('midday', p)),
    readout: v => (v.p < 0.6 ? '1/2000   F8   ISO 100' : '1/320   F2.8   ISO 100'),
    action: 'MOVE INTO THE SHADE',
    anchors: c => ({ ...std(c), move: c[2].at + 0.1, moveDur: 2.6 }),
    markBad(ctx, r, v, p) {
      const P = specOf('midday', v);
      const L = eyesLoop(ctx, r, v.cam, P, p, C.red, 8);
      featureLoop(ctx, r, v.cam, P, [0, 56, 84], 30, 16, seg(p, 0.3, 0.6), C.red, 9);
      noteBy(ctx, r, L, 'Squinting!', seg(p, 0.5, 0.5), C.red);
    },
    markGood(ctx, r, v, p) {
      faceLoop(ctx, r, v.cam, specOf('midday', v), p, C.yellow, 10);
      mNote(ctx, r, 'Keeper!', 0.2, 0.2, seg(p, 0.5, 0.5), C.yellow, 'center');
    },
    side: { h: 230, draw: (ctx, rect, t, A) => drawSunView(ctx, rect, seg(t, A.move, A.moveDur), 'midday') },
  },

  window: {
    world: 'window',
    bad: { x: 1400, y: 900, w: 1300 },
    good: { x: 2250, y: 900, w: 1300 },
    state: (tt, p) => ({ p }),
    af: p => nearEye(specAt('window', p)),
    readout: '1/125   F2   ISO 400',
    action: 'TURN TOWARD THE WINDOW',
    anchors: c => ({ ...std(c), moveDur: 2.6 }),
    markBad(ctx, r, v, p) {
      const L = faceLoop(ctx, r, v.cam, specOf('window', v), p, C.red, 11);
      noteBy(ctx, r, L, 'Too dark!', seg(p, 0.5, 0.5), C.red);
    },
    markGood(ctx, r, v, p) {
      const L = eyesLoop(ctx, r, v.cam, specOf('window', v), p, C.yellow, 12);
      noteBy(ctx, r, L, 'Sparkle!', seg(p, 0.5, 0.5), C.yellow);
    },
    side: { h: 230, draw: (ctx, rect, t, A) => drawTopView(ctx, rect, seg(t, A.move, A.moveDur), 'window') },
  },

  golden: {
    world: 'golden',
    bad: { x: 1350, y: 950, w: 1300 },
    good: { x: 4150, y: 950, w: 1300 },
    state: (tt, p) => ({ p, smear: 4 * p * (1 - p) }),
    af: p => nearEye(specAt('golden', p)),
    sway: 0.8,
    readout: v => (v.p < 0.6 ? '1/500   F2.8   ISO 100   EV ±0' : '1/250   F2.8   ISO 100   EV +1.0'),
    action: 'SUN BEHIND THEM · EXPOSURE +1',
    anchors: c => ({ ...std(c), moveDur: 2.4 }),
    markBad(ctx, r, v, p) {
      const L = eyesLoop(ctx, r, v.cam, specOf('golden', v), p, C.red, 13);
      noteBy(ctx, r, L, 'Squinting!', seg(p, 0.5, 0.5), C.red);
    },
    markGood(ctx, r, v, p) {
      // trace the glowing edge of her hair
      const P = specOf('golden', v);
      const s = P.s / 100;
      const pts = [];
      for (let i = 0; i <= 30; i++) {
        const a = -Math.PI * 0.95 + (i / 30) * Math.PI * 0.75;
        pts.push(w2p(r, v.cam, P.x + Math.cos(a) * 112 * s + 6 * s, P.y - 30 * s + Math.sin(a) * 126 * s));
      }
      grease(ctx, pts, p, C.yellow, 8 * ru(r));
      mNote(ctx, r, 'Glow!', 0.72, 0.16, seg(p, 0.5, 0.5), C.yellow, 'center');
    },
    side: { h: 230, draw: (ctx, rect, t, A) => drawSunView(ctx, rect, seg(t, A.move, A.moveDur), 'golden') },
  },

  faceangle: {
    world: 'faceangle',
    bad: { x: 1250, y: -420, w: 1300 },
    good: { x: 1250, y: 1080, w: 1300 },
    state: (tt, p) => ({ p }),
    af: p => nearEye(specAt('faceangle', p)),
    readout: '1/250   F2.8   ISO 200',
    action: 'RAISE THE CAMERA',
    anchors: std,
    markBad(ctx, r, v, p) {
      const P = specOf('faceangle', v);
      const L = featureLoop(ctx, r, v.cam, P, [0, 46, 90], 40, 26, p, C.red, 14);
      featureLoop(ctx, r, v.cam, P, [0, 102, 30], 70, 26, seg(p, 0.3, 0.6), C.red, 15);
      noteBy(ctx, r, L, 'Up the nose!', seg(p, 0.5, 0.5), C.red);
    },
    markGood(ctx, r, v, p) {
      faceLoop(ctx, r, v.cam, specOf('faceangle', v), p, C.yellow, 16);
      mNote(ctx, r, 'Keeper!', 0.8, 0.2, seg(p, 0.5, 0.5), C.yellow, 'center');
    },
    side: { h: 230, draw: (ctx, rect, t, A) => drawHeightView(ctx, rect, seg(t, A.move, A.moveDur), 'faceangle') },
  },

  kids: {
    world: 'kids',
    bad: { x: 1230, y: 1640, w: 1300 },
    good: { x: 1230, y: 440, w: 1300 },
    state: (tt, p) => ({ p }),
    af: p => nearEye(specAt('kids', p)),
    readout: '1/500   F4   ISO 400',
    action: 'GET DOWN TO THEIR LEVEL',
    anchors: c => ({ ...std(c), move: c[2].at + 0.1, moveDur: 2.4, goodSnap: phraseAt(c[2], 'One frame') - 0.1 }),
    extraShots: A => [A.goodSnap + 0.24, A.goodSnap + 0.48],
    // a burst: each frame freezes in turn
    frozenAt: (t, A, f) => (t >= A.goodSnap + 0.48 ? A.goodSnap + 0.48 : t >= A.goodSnap + 0.24 ? A.goodSnap + 0.24 : f),
    afterShots(ctx, P, t, A) {
      const a = env(t, A.goodSnap - 0.05, A.goodSnap + 1.6, 0.1, 0.4);
      if (a <= 0) return;
      const u = ru(P), n = t >= A.goodSnap + 0.48 ? 3 : t >= A.goodSnap + 0.24 ? 2 : 1;
      ctx.save();
      ctx.globalAlpha *= a;
      ctx.fillStyle = 'rgba(10,9,8,0.7)';
      ctx.beginPath(); ctx.roundRect(P.x + P.w - 210 * u, P.y + 24 * u, 186 * u, 44 * u, 22 * u); ctx.fill();
      drawText(ctx, `BURST  ${'●'.repeat(n)}${'○'.repeat(3 - n)}`, P.x + P.w - 190 * u, P.y + 53 * u, { font: F.mono(18 * u, 500), color: C.yellow, ls: 1.5 * u });
      ctx.restore();
    },
    markBad(ctx, r, v, p) {
      const P = specOf('kids', v);
      const L = featureLoop(ctx, r, v.cam, P, [0, 64, 80], 46, 26, p, C.red, 17);
      noteBy(ctx, r, L, 'Say cheese...', seg(p, 0.5, 0.5), C.red);
    },
    markGood(ctx, r, v, p) {
      faceLoop(ctx, r, v.cam, specOf('kids', v), p, C.yellow, 18, 1.05);
      mNote(ctx, r, 'Keeper!', 0.2, 0.2, seg(p, 0.5, 0.5), C.yellow, 'center');
    },
    side: { h: 230, draw: (ctx, rect, t, A) => drawHeightView(ctx, rect, seg(t, A.move, A.moveDur), 'kids') },
  },

  fullbody: {
    world: 'fullbody',
    orient: 'v',
    bad: { x: 1200, y: 1045, w: 647 },
    good: { x: 1200, y: 1060, w: 720 },
    state: (tt, p) => ({ p }),
    af: () => [1185, 760],
    readout: '1/320   F4   ISO 100',
    action: 'CAMERA AT WAIST HEIGHT',
    sway: 0.6,
    anchors: std,
    markBad(ctx, r, v, p) {
      mLoop(ctx, r, v.cam, 1200, 700, 110, 120, p, C.red, 19);
      mNote(ctx, r, 'Big head', 1.06, 0.13, seg(p, 0.4, 0.4), C.red, 'left', -0.04);
      mArrow(ctx, r, v.cam, [1380, 1180], [1380, 1470], seg(p, 0.4, 0.5), C.red, 0);
      mNote(ctx, r, 'Short legs', 1.06, 0.78, seg(p, 0.7, 0.3), C.red, 'left', -0.04);
    },
    markGood(ctx, r, v, p) {
      mArrow(ctx, r, v.cam, [1390, 1080], [1390, 1470], p, C.yellow, 0);
      mNote(ctx, r, 'Long legs!', 1.06, 0.72, seg(p, 0.4, 0.4), C.yellow, 'left', -0.04);
      mNote(ctx, r, 'Keeper!', -0.06, 0.2, seg(p, 0.5, 0.5), C.yellow, 'right');
    },
    side: { h: 230, draw: (ctx, rect, t, A) => drawHeightView(ctx, rect, seg(t, A.move, A.moveDur), 'fullbody') },
  },

  selfie: {
    world: 'selfie',
    orient: 'phone',
    chrome: 'phone',
    bad: { x: 1200, y: -380, w: 760 },
    good: { x: 1200, y: 860, w: 760 },
    state: (tt, p) => ({ p }),
    zoomChip: v => (v.p > 0.5 ? 2 : 1),
    action: 'ARM OUT · PHONE UP',
    anchors: std,
    markBad(ctx, r, v, p) {
      const P = specOf('selfie', v);
      featureLoop(ctx, r, v.cam, P, [0, 44, 92], 44, 30, p, C.red, 20);
      phoneNote(ctx, r, 'Up the nose!', 0.42, seg(p, 0.4, 0.4), C.red);
      phoneNote(ctx, r, 'Stretched!', 0.6, seg(p, 0.7, 0.3), C.red);
    },
    markGood(ctx, r, v, p) {
      faceLoop(ctx, r, v.cam, specOf('selfie', v), p, C.yellow, 21);
      phoneNote(ctx, r, 'Keeper!', 0.42, seg(p, 0.5, 0.5), C.yellow);
    },
    side: { h: 230, draw: (ctx, rect, t, A) => drawHeightView(ctx, rect, seg(t, A.move, A.moveDur), 'selfie') },
  },
};

/* ---------- notes-panel diagrams ---------- */
// All drawn in a 648 × 230 box, scaled to fit the notes column.
const DIAG = { w: 648, h: 230 };
const diagScale = rect => Math.min(rect.w / DIAG.w, rect.h / DIAG.h);
const INK = '#d9d3ca';
function diagLabel(ctx, rect, s, good, labels) {
  drawText(ctx, good ? labels[1] : labels[0], rect.x, rect.y + 16 * s, { font: F.mono(17 * s, 500), color: good ? C.yellow : '#ee9d92', ls: 2 * s });
}
function sunIcon(ctx, x, y, s, a = 1) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.strokeStyle = C.yellow;
  ctx.lineWidth = 3 * s;
  for (let i = 0; i < 8; i++) {
    const an = (i / 8) * TAU;
    strokeLine(ctx, x + Math.cos(an) * 19 * s, y + Math.sin(an) * 19 * s, x + Math.cos(an) * 27 * s, y + Math.sin(an) * 27 * s);
  }
  circ(ctx, x, y, 14 * s, C.yellow);
  ctx.restore();
}
function dashed(ctx, s, color, x0, y0, x1, y1, w = 3) {
  ctx.save();
  ctx.setLineDash([8 * s, 8 * s]);
  ctx.strokeStyle = color;
  ctx.lineWidth = w * s;
  strokeLine(ctx, x0, y0, x1, y1);
  ctx.restore();
}
/** Side view of a person: joints from foot to head, given as [x, height] pairs from the foot. */
function sideFigure(ctx, x, gy, s, j, color, headR = 14) {
  const P = q => [x + q[0] * s, gy - q[1] * s];
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = 11 * s * (headR / 14);
  ctx.beginPath(); ctx.moveTo(...P(j.foot)); ctx.lineTo(...P(j.knee)); ctx.lineTo(...P(j.hip)); ctx.lineTo(...P(j.shoulder)); ctx.stroke();
  if (j.hand) {
    ctx.lineWidth = 8 * s * (headR / 14);
    ctx.beginPath(); ctx.moveTo(...P(j.shoulder)); ctx.lineTo(...P(j.elbow || j.hand)); ctx.lineTo(...P(j.hand)); ctx.stroke();
  }
  circ(ctx, ...P(j.head), headR * s, color);
  ctx.restore();
}
const lerpPt = (a, b, q) => [lerp(a[0], b[0], q), lerp(a[1], b[1], q)];
const lerpJ = (a, b, q) => Object.fromEntries(Object.keys(a).map(k => [k, lerpPt(a[k], b[k] || a[k], q)]));
function cameraIcon(ctx, x, y, s, dir = 1, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(dir, 1);
  rr(ctx, -10 * s, -8 * s, 20 * s, 15 * s, 3 * s, '#f3efe8');
  circ(ctx, 13 * s, -0.5 * s, 4.5 * s, C.yellow);
  ctx.restore();
}

/** Where to crop: red lines at the joints, yellow lines between them. */
function drawJointsChart(ctx, rect, pRed, pGood) {
  const s = diagScale(rect);
  const x = rect.x + 90 * s, top = rect.y + 14 * s, H = 210 * s;
  const Y = f => top + H * f;
  ctx.save();
  ctx.lineCap = 'round';
  // a simple front-view figure
  ctx.strokeStyle = INK;
  ctx.lineWidth = 12 * s;
  circ(ctx, x, Y(0.06), 13 * s, INK);
  ctx.beginPath(); ctx.moveTo(x, Y(0.13)); ctx.lineTo(x, Y(0.5)); ctx.stroke();
  ctx.lineWidth = 9 * s;
  for (const sd of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(x + sd * 4 * s, Y(0.16)); ctx.lineTo(x + sd * 22 * s, Y(0.33)); ctx.lineTo(x + sd * 26 * s, Y(0.48)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + sd * 6 * s, Y(0.5)); ctx.lineTo(x + sd * 10 * s, Y(0.73)); ctx.lineTo(x + sd * 12 * s, Y(0.95)); ctx.stroke();
  }
  const rows = [
    { f: 0.135, text: 'NECK', bad: true }, { f: 0.33, text: 'ELBOWS · WAIST', bad: true }, { f: 0.48, text: 'WRISTS', bad: true },
    { f: 0.615, text: 'MID-THIGH', bad: false }, { f: 0.73, text: 'KNEES', bad: true }, { f: 0.84, text: 'MID-SHIN', bad: false }, { f: 0.95, text: 'ANKLES', bad: true },
  ];
  rows.forEach((row, i) => {
    const p = row.bad ? seg(pRed, i * 0.1, 0.5) : seg(pGood, (i - 3) * 0.12, 0.5);
    if (p <= 0) return;
    const y = Y(row.f), x0 = rect.x + 20 * s, x1 = rect.x + 200 * s;
    ctx.save();
    ctx.globalAlpha *= p;
    if (row.bad) ctx.setLineDash([7 * s, 6 * s]);
    ctx.strokeStyle = row.bad ? C.red : C.yellow;
    ctx.lineWidth = (row.bad ? 2.5 : 4) * s;
    strokeLine(ctx, x0, y, lerp(x0, x1, p), y);
    ctx.setLineDash([]);
    drawText(ctx, (row.bad ? '✕ ' : '✓ ') + row.text, rect.x + 218 * s, y + 6 * s, { font: F.mono(18 * s, 500), color: row.bad ? '#ee9d92' : C.yellow, ls: 1.5 * s });
    ctx.restore();
  });
  ctx.restore();
}

/** Top view: the wall lesson (stepping away) and the window lesson (turning to the light). */
function drawTopView(ctx, rect, p, kind) {
  const s = diagScale(rect);
  const q = Ease.inOut(p);
  const ox = rect.x, oy = rect.y;
  const X = v => ox + v * s, Y = v => oy + v * s;
  ctx.save();
  ctx.lineCap = 'round';
  if (kind === 'wall') {
    diagLabel(ctx, rect, s, q > 0.5, ['TOUCHING THE WALL', 'A FEW STEPS OUT']);
    // the wall, seen from above
    ctx.fillStyle = '#9a4a35';
    ctx.fillRect(X(160), Y(40), 330 * s, 18 * s);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1.5 * s;
    for (let x = 160; x < 490; x += 24) strokeLine(ctx, X(x), Y(40), X(x), Y(58));
    // the person steps out; their shadow leaves the wall
    const py = lerp(76, 150, q), px = 325;
    const shA = 1 - q;
    if (shA > 0) { ctx.save(); ctx.globalAlpha *= 0.7 * shA; ell(ctx, X(px + 40), Y(66), 30 * s, 8 * s, '#000000'); ctx.restore(); }
    if (q > 0.3) {
      ctx.save(); ctx.globalAlpha *= seg(q, 0.3, 0.4) * 0.6;
      for (let i = 0; i < 3; i++) { ell(ctx, X(px - 8), Y(88 + i * 22), 5 * s, 8 * s, INK); ell(ctx, X(px + 8), Y(98 + i * 22), 5 * s, 8 * s, INK); }
      ctx.restore();
    }
    ell(ctx, X(px), Y(py), 40 * s, 18 * s, '#46688a');
    circ(ctx, X(px), Y(py), 16 * s, '#7d4d31');
    poly(ctx, [[X(px - 7), Y(py + 13)], [X(px + 7), Y(py + 13)], [X(px), Y(py + 23)]], '#7d4d31');
    // light from the front left
    sunIcon(ctx, X(110), Y(205), s * 0.8);
    dashed(ctx, s, 'rgba(248,203,74,0.6)', X(130), Y(190), X(px - 16), Y(py + 6), 2);
    cameraIcon(ctx, X(px), Y(212), s * 1.3, 1, -Math.PI / 2);
    dashed(ctx, s, q > 0.5 ? C.yellow : C.red, X(px), Y(198), X(px), Y(py + 20), 2.5);
    if (q > 0.6) {
      ctx.save(); ctx.globalAlpha *= seg(q, 0.6, 0.4);
      ctx.strokeStyle = C.yellow; ctx.lineWidth = 2 * s;
      strokeLine(ctx, X(px + 60), Y(60), X(px + 60), Y(py - 4));
      drawText(ctx, 'SPACE', X(px + 72), Y((60 + py) / 2 + 6), { font: F.mono(15 * s, 500), color: C.yellow, ls: 1.5 * s });
      ctx.restore();
    }
  } else {
    diagLabel(ctx, rect, s, q > 0.5, ['WINDOW BEHIND', 'WINDOW TO THE SIDE']);
    // the room's window wall
    ctx.strokeStyle = C.faint;
    ctx.lineWidth = 6 * s;
    strokeLine(ctx, X(150), Y(40), X(500), Y(40));
    ctx.fillStyle = '#cfe6f5';
    ctx.fillRect(X(255), Y(34), 140 * s, 12 * s);
    // light pours in
    for (let i = 0; i < 4; i++) dashed(ctx, s, 'rgba(248,203,74,0.55)', X(270 + i * 37), Y(50), X(290 + i * 25), Y(96), 2);
    const cx = 325, cy = 120;
    // the camera circles round to the side; she turns toward the window
    const th = lerp(0, 1.25, q);
    const camX = cx + Math.sin(th) * 96, camY = cy + Math.cos(th) * 96;
    const face = lerp(Math.PI / 2, -0.62, q);          // the way her nose points
    ell(ctx, X(cx), Y(cy), 40 * s, 18 * s, '#e2d6c6', face + Math.PI / 2);
    circ(ctx, X(cx), Y(cy), 16 * s, '#3a2318');
    poly(ctx, [[X(cx + Math.cos(face) * 13 - Math.sin(face) * 7), Y(cy + Math.sin(face) * 13 + Math.cos(face) * 7)], [X(cx + Math.cos(face) * 13 + Math.sin(face) * 7), Y(cy + Math.sin(face) * 13 - Math.cos(face) * 7)], [X(cx + Math.cos(face) * 24), Y(cy + Math.sin(face) * 24)]], '#eec29f');
    cameraIcon(ctx, X(camX), Y(camY), s * 1.3, 1, Math.atan2(cy - camY, cx - camX));
    dashed(ctx, s, q > 0.5 ? C.yellow : C.red, X(lerp(camX, cx, 0.2)), Y(lerp(camY, cy, 0.2)), X(lerp(camX, cx, 0.75)), Y(lerp(camY, cy, 0.75)), 2.5);
  }
  ctx.restore();
}

/** Side view with the sun: midday (step under the tree) and golden hour (sun behind them). */
function drawSunView(ctx, rect, p, kind) {
  const s = diagScale(rect);
  const q = Ease.inOut(p);
  const gy = rect.y + rect.h - 14 * s;
  const X = v => rect.x + v * s;
  const fs = 0.62;                                   // people are drawn small, to leave the sky for the sun
  const scaleJ = j => Object.fromEntries(Object.entries(j).map(([k, v]) => [k, [v[0] * fs, v[1] * fs]]));
  ctx.save();
  ctx.strokeStyle = C.faint;
  ctx.lineWidth = 2 * s;
  strokeLine(ctx, rect.x, gy, rect.x + rect.w, gy);
  const stand = { foot: [0, 0], knee: [0, 50], hip: [0, 96], shoulder: [0, 150], head: [-4, 172] };
  const shooter = { foot: [0, 0], knee: [0, 50], hip: [0, 96], shoulder: [2, 150], head: [6, 172], elbow: [18, 132], hand: [30, 150] };
  const camY = gy - 152 * fs * s;
  sideFigure(ctx, X(120), gy, s, scaleJ(shooter), INK, 14 * fs);
  cameraIcon(ctx, X(120 + 34 * fs), camY, s * 0.8);
  let px, head;
  if (kind === 'midday') {
    diagLabel(ctx, rect, s, q > 0.5, ['IN THE MIDDAY SUN', 'IN OPEN SHADE']);
    px = lerp(330, 470, q);
    head = [X(px - 3), gy - 172 * fs * s];
    // the tree she steps under, and its shade
    ell(ctx, X(490), gy - 1 * s, 130 * s, 5 * s, 'rgba(0,0,0,0.4)');
    rr(ctx, X(540), gy - 128 * s, 16 * s, 128 * s, 4 * s, '#6b5040');
    ell(ctx, X(495), gy - 136 * s, 135 * s, 34 * s, '#3f6f35');
    const sun = [X(330), rect.y + 52 * s];
    sunIcon(ctx, sun[0], sun[1], s * 0.85);
    // straight down: onto her head in the sun, onto the leaves in the shade
    for (let i = -1; i <= 1; i++) {
      const x0 = sun[0] + i * 12 * s, y0 = sun[1] + 30 * s;
      const x1 = lerp(x0, head[0] + i * 10 * s, 1 - q), y1 = q > 0.5 ? gy - 172 * s : head[1] - 14 * s;
      dashed(ctx, s, 'rgba(248,203,74,0.8)', x0, y0, x1, y1, 2);
    }
    sideFigure(ctx, X(px), gy, s, scaleJ(stand), '#e2d6c6', 14 * fs);
  } else {
    diagLabel(ctx, rect, s, q > 0.5, ['FACING THE SUN', 'SUN BEHIND THEM']);
    px = 330;
    head = [X(px - 3), gy - 172 * fs * s];
    // the low sun travels over to behind her
    const a = lerp(0.1, Math.PI - 0.1, q);
    const sun = [X(px - Math.cos(a) * 300), gy - (40 + Math.sin(a) * 136) * s];
    sunIcon(ctx, sun[0], sun[1], s * 0.85);
    for (let i = -1; i <= 1; i++) dashed(ctx, s, 'rgba(248,203,74,0.8)', lerp(sun[0], head[0], 0.18), lerp(sun[1], head[1], 0.18) + i * 7 * s, lerp(sun[0], head[0], 0.85), lerp(sun[1], head[1], 0.85) + i * 7 * s, 2);
    sideFigure(ctx, X(px), gy, s, scaleJ(stand), '#e9a77a', 14 * fs);
    if (q > 0.6) {
      // glowing hair
      ctx.save();
      ctx.globalAlpha *= seg(q, 0.6, 0.4);
      ctx.strokeStyle = '#ffd98a';
      ctx.lineWidth = 3.5 * s;
      ctx.beginPath(); ctx.arc(head[0], head[1], 12 * s, -Math.PI * 0.6, Math.PI * 0.25); ctx.stroke();
      ctx.restore();
    }
  }
  dashed(ctx, s, q > 0.5 ? C.yellow : C.red, X(120 + 50 * fs), camY, head[0] - 12 * s, head[1] + 2 * s, 2.5);
  ctx.restore();
}

/** Side view of camera height: faces, kids, full body and selfies. */
function drawHeightView(ctx, rect, p, kind) {
  const s = diagScale(rect);
  const q = Ease.inOut(p);
  const gy = rect.y + rect.h - 14 * s;
  const X = v => rect.x + v * s;
  ctx.save();
  ctx.strokeStyle = C.faint;
  ctx.lineWidth = 2 * s;
  strokeLine(ctx, rect.x, gy, rect.x + rect.w, gy);
  const standJ = { foot: [0, 0], knee: [2, 50], hip: [0, 96], shoulder: [3, 150], head: [7, 174] };
  const squatJ = { foot: [14, 0], knee: [44, 36], hip: [0, 34], shoulder: [12, 86], head: [20, 110] };
  const labels = {
    faceangle: ['CAMERA BELOW THE FACE', 'JUST ABOVE EYE LEVEL'],
    kids: ['STANDING: LOOKING DOWN', 'DOWN AT THEIR EYE LEVEL'],
    fullbody: ['FROM YOUR EYE LEVEL', 'FROM THEIR WAIST'],
    selfie: ['LOW AND CLOSE', 'ARM OUT, ABOVE THE EYES'],
  }[kind];
  diagLabel(ctx, rect, s, q > 0.5, labels);
  let cam, eye;
  if (kind === 'selfie') {
    // one person holding the phone out in front
    const px = 330;
    const J = { ...standJ, head: [-4, 174], shoulder: [-2, 150] };
    const hand = lerpPt([-34, 128], [-78, 186], q), elbow = lerpPt([-20, 116], [-44, 168], q);
    sideFigure(ctx, X(px), gy, s, { ...J, elbow, hand }, '#e9a77a');
    rr(ctx, X(px + hand[0] - 6), gy - (hand[1] + 14) * s, 9 * s, 28 * s, 3 * s, '#f3efe8');
    cam = [X(px + hand[0] + 2), gy - hand[1] * s];
    eye = [X(px - 12), gy - 176 * s];
    // the window she faces
    ctx.save();
    ctx.globalAlpha *= seg(q, 0.4, 0.5);
    rr(ctx, X(70), gy - 200 * s, 16 * s, 120 * s, 3 * s, '#cfe6f5');
    for (let i = 0; i < 3; i++) dashed(ctx, s, 'rgba(248,203,74,0.6)', X(90), gy - (190 - i * 40) * s, X(250), gy - (186 - i * 14) * s, 2);
    ctx.restore();
  } else {
    // the photographer, standing or crouching, and where the camera is held
    const crouch = kind === 'faceangle' ? 0 : kind === 'fullbody' ? q * 0.55 : q;
    const J = lerpJ(standJ, squatJ, crouch);
    const camPt = {
      faceangle: lerpPt([34, 112], [36, 186], q),
      kids: lerpPt([34, 160], [46, 88], q),
      fullbody: lerpPt([34, 160], [42, 104], q),
    }[kind];
    J.hand = [camPt[0] - 6, camPt[1] - 4];
    J.elbow = lerpPt([J.shoulder[0] + 12, J.shoulder[1] - 22], [camPt[0] - 16, (J.shoulder[1] + camPt[1]) / 2 - 8], 0.5);
    sideFigure(ctx, X(100), gy, s, J, INK);
    cam = [X(100 + camPt[0] + 4), gy - camPt[1] * s];
    cameraIcon(ctx, cam[0], cam[1], s);
    cam = [cam[0] + 16 * s, cam[1]];
    // the subject, facing the camera
    const kid = kind === 'kids';
    const sx = kid ? 470 : 450;
    const k = kid ? 0.58 : 1;
    const sub = { foot: [0, 0], knee: [0, 50 * k], hip: [0, 96 * k], shoulder: [0, 150 * k], head: [-4, 172 * k] };
    sideFigure(ctx, X(sx), gy, s, sub, kid ? '#f2b632' : '#c0493f', kid ? 13 : 14);
    eye = kind === 'fullbody' ? [X(sx - 10), gy - 100 * s] : [X(sx - 14), gy - 174 * k * s];
    if (kind === 'fullbody') {
      // a bracket for the whole body
      ctx.save();
      ctx.strokeStyle = 'rgba(248,203,74,0.5)';
      ctx.lineWidth = 2 * s;
      strokeLine(ctx, X(sx + 30), gy - 190 * s, X(sx + 30), gy);
      ctx.restore();
    }
  }
  dashed(ctx, s, q > 0.5 ? C.yellow : C.red, cam[0], cam[1], eye[0], eye[1], 2.5);
  ctx.restore();
}

/* ---------- 1. start with the eyes ---------- */
function renderEyes(ctx, L, t, S) {
  const cfg = LESSONS.eyes;
  const c3 = S.cues[3];
  const times = [phraseAt(c3, 'where you put them'), phraseAt(c3, 'the light'), phraseAt(c3, 'the angle')];
  renderLessonLike(ctx, L, t, S, cfg, A => [
    { kind: 'idea', text: S.notes.idea, at: S.cues[0].at - 0.3 },
    { kind: 'bad', text: S.notes.bad, at: A.badSnap + 0.4 },
    { kind: 'good', text: S.notes.good, at: A.goodSnap + 0.4 },
    { kind: 'gap', h: 30 },
    { kind: 'label', text: S.notes.label, at: times[0] - 0.4 },
    { kind: 'gap', h: 10 },
    ...S.notes.list.map((text, i) => ({ kind: 'custom', h: L.portrait ? 70 : 60, at: times[i], draw: (c2, rect) => drawListRow(c2, L, rect, i + 1, text) })),
  ]);
}

/* ---------- recap: four recipe cards ---------- */
// keeper shots for the cards; cam.w is picked per card, the height follows the card's shape
const RECIPE_SHOTS = [
  { world: 'window', x: 2290, y: 930, w: 1120 },
  { world: 'kids', x: 1225, y: 470, w: 1150 },
  { world: 'fullbody', x: 1200, y: 1060, w: 1250 },
  { world: 'selfie', x: 1200, y: 880, w: 900 },
];
function recipeLayout(L) {
  const u = L.u;
  if (!L.portrait) {
    const gap = 34 * u, x0 = L.head.x, w = (L.W - 2 * x0 - gap * 3) / 4;
    return [0, 1, 2, 3].map(i => ({ x: x0 + i * (w + gap), y: L.vis.y + 34 * u, w, ph: w * 0.86 }));
  }
  const gap = 36 * u, x0 = L.head.x, w = (L.W - 2 * x0 - gap) / 2;
  return [0, 1, 2, 3].map(i => ({ x: x0 + (i % 2) * (w + gap), y: L.vis.y + 10 * u + Math.floor(i / 2) * (w * 0.8 + 300 * u), w, ph: w * 0.8 }));
}
function renderRecap(ctx, L, t, S) {
  drawHeader(ctx, L, S, t);
  const u = L.u;
  const cards = recipeLayout(L);
  S.recipes.forEach((rcp, i) => {
    const c = S.cues[i + 1];
    const at = c.at - 0.3;
    const a = seg(t, at, 0.6, Ease.out);
    if (a <= 0) return;
    const R = cards[i];
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(0, (1 - a) * 20 * u);
    // a print with a white border
    const b = 10 * u;
    ctx.fillStyle = '#f1ece3';
    ctx.fillRect(R.x, R.y, R.w, R.ph);
    const photo = { x: R.x + b, y: R.y + b, w: R.w - 2 * b, h: R.ph - 2 * b };
    const shot = RECIPE_SHOTS[i];
    drawPhoto(ctx, photo, WORLDS[shot.world], { x: shot.x, y: shot.y, w: shot.w }, { t: 2 + t * 0.6, p: 1, focus: 1 });
    const ty = R.y + R.ph + (L.portrait ? 58 : 52) * u;
    drawText(ctx, rcp.title, R.x, ty, { font: F.mono((L.portrait ? 24 : 22) * u, 500), color: C.yellow, ls: 3 * u });
    rcp.lines.forEach((line, j) => {
      const lt = at + 0.6 + j * 0.5;
      const la = seg(t, lt, 0.5, Ease.out);
      const ly = ty + (L.portrait ? 56 : 52) * u + j * (L.portrait ? 50 : 46) * u;
      ctx.save();
      ctx.globalAlpha *= la;
      markCheck(ctx, R.x + 12 * u, ly - 10 * u, 11 * u, seg(t, lt, 0.4), C.yellow, 4 * u);
      drawText(ctx, line, R.x + 38 * u, ly, { font: F.body((L.portrait ? 31 : 28) * u, 400), color: C.ink, maxW: R.w - 38 * u });
      ctx.restore();
    });
    ctx.restore();
  });
}

/* ---------- homework and end card ---------- */
const HOMEWORK = [
  { label: '1 · OPEN SHADE', phrase: 'Open shade', world: 'hwShade', cam: { x: 2330, y: 930, w: 1250 }, st: {} },
  { label: '2 · A WINDOW', phrase: 'a window', world: 'window', cam: { x: 2280, y: 930, w: 1250 }, st: { p: 1, look: LOOKS.maya } },
  { label: '3 · SUN BEHIND', phrase: 'the sun behind', world: 'golden', cam: { x: 4130, y: 930, w: 1250 }, st: { p: 1, look: LOOKS.maya } },
];
const TITLE = {
  subtitle: 'Where to put them, how to read the light, and which angle to shoot from.',
  tagline: 'A BEGINNER’S GUIDE TO PORTRAITS · 10 LESSONS',
  paint: (ctx, r, L) => drawPhoto(ctx, r, WORLDS.window, L.portrait ? { x: 2330, y: 900, w: 1000 } : { x: 2200, y: 900, w: 1900 }, { t: 0, p: 1 }),
};
function renderHomework(ctx, L, t, S) {
  renderPrints(ctx, L, t, S, {
    prints: HOMEWORK.map(h => ({ label: h.label, phrase: h.phrase, paint: (c, r, tt) => drawPhoto(c, r, WORLDS[h.world], h.cam, { t: tt, ...h.st }) })),
    tip: 'Keep the person and the place the same: only the light changes.',
    endLine: 'Now go photograph someone you love.',
  });
}

/* ---------- scene kinds ---------- */
const KINDS = {
  title: { render: (ctx, L, t, S) => renderTitleCard(ctx, L, t, S, TITLE), events: () => [{ t: TITLE_LOCK, type: 'beep' }] },
  eyes: { ...lessonKind('eyes'), render: renderEyes },
  lesson: lessonKind(),
  recap: { render: renderRecap, minDur: S => S.cues[S.cues.length - 1].end + 3.2 },
  homework: { render: renderHomework, minDur: S => S.cues[S.cues.length - 1].end + 0.7 + 4.0 },
};
