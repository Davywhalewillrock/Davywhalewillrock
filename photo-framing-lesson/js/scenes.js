/*
 * Scene choreography: what happens on screen, anchored to the narration cues.
 * Lessons share one pattern: live view (bad framing) → shutter → red mark →
 * the photographer fixes the shot → shutter → keeper mark → before/after strip.
 */
'use strict';

const _cache = new Map();
function cached(key, w, h, paint) {
  let c = _cache.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    paint(c.getContext('2d'), c);
    _cache.set(key, c);
  }
  return c;
}

/* ---------- helpers for marks (all sized from the photo rect, so thumbnails scale) ---------- */
const ru = r => r.w / 1080;
function mLoop(ctx, r, cam, wx, wy, rx, ry, p, color, seed = 1) {
  const s = r.w / cam.w;
  const [x, y] = w2p(r, cam, wx, wy);
  grease(ctx, loopPts(x, y, rx * s, ry * s, seed), p, color, 9 * ru(r));
  return [x, y, rx * s, ry * s];
}
function mLine(ctx, r, cam, a, b, p, color, w = 8) {
  const A = w2p(r, cam, a[0], a[1]), B = w2p(r, cam, b[0], b[1]);
  grease(ctx, bowPts(A[0], A[1], B[0], B[1], 0.01, 30), p, color, w * ru(r));
}
function mArrow(ctx, r, cam, a, b, p, color, bend = 0.05) {
  const A = w2p(r, cam, a[0], a[1]), B = w2p(r, cam, b[0], b[1]);
  markArrow(ctx, A[0], A[1], B[0], B[1], bend, p, color, 8 * ru(r));
}
function mNote(ctx, r, str, fx, fy, p, color, align = 'left', rot = -0.05) {
  handNote(ctx, str, r.x + r.w * fx, r.y + r.h * fy, p, color, 50 * ru(r), rot, align);
}
/** Full-width grid line in photo space (fraction f along x or y). */
function gridLine(ctx, r, vertical, f, p, color, w = 6) {
  const pts = vertical ? bowPts(r.x + r.w * f, r.y + r.h * 0.04, r.x + r.w * f, r.y + r.h * 0.96, 0.004, 30) : bowPts(r.x + r.w * 0.03, r.y + r.h * f, r.x + r.w * 0.97, r.y + r.h * f, 0.004, 30);
  grease(ctx, pts, p, color, w * ru(r));
}

/** Clip to a photo plus a small bleed, so marks never run into the page text. */
function clipBleed(ctx, r, b = 18) {
  const e = b * ru(r);
  ctx.beginPath();
  ctx.rect(r.x - e, r.y - e, r.w + 2 * e, r.h + 2 * e);
  ctx.clip();
}

function actionChip(ctx, r, text, a) {
  if (a <= 0 || !text) return;
  const u = ru(r);
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.font = F.mono(19 * u, 500);
  if ('letterSpacing' in ctx) ctx.letterSpacing = 2 * u + 'px';
  const tw = ctx.measureText(text).width;
  const h = 46 * u, w = tw + 66 * u, x = r.x + r.w / 2 - w / 2, y = r.y + 28 * u;
  ctx.fillStyle = 'rgba(10,9,8,0.74)';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();
  ctx.fillStyle = C.yellow;
  ctx.beginPath(); ctx.arc(x + 25 * u, y + h / 2, 6 * u, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 43 * u, y + h / 2 + 1 * u);
  ctx.restore();
}

/* ---------- lesson configurations ---------- */
// bad/good: camera framings. af: focus point. Times come from anchors(cues).
const LESSONS = {
  idea: {
    world: 'park',
    bad: { x: 1200, y: 860, w: 2200 },
    good: { x: 1941, y: 975, w: 720 },
    af: () => [1840, 958],
    readout: '1/320   F5.6   ISO 100',
    action: 'GET CLOSER',
    noteBad: 'Where do I look?',
    anchors: c => ({ badSnap: c[0].end + 0.1, move: c[2].at + 0.1, moveDur: 2.6, goodSnap: c[3].at - 0.35, compare: c[4].at + 0.1 }),
    markBad(ctx, r, v, p, t, A) {
      mNote(ctx, r, this.noteBad, 0.5, 0.17, p, C.red, 'center', -0.03);
      WORLDS.park.clutter.forEach((c, i) => {
        const q = seg(t, A.badSnap + 1.3 + i * 0.42, 0.5, Ease.out);
        mLoop(ctx, r, v.cam, c.x, c.y, c.rx, c.ry, q, C.red, 20 + i);
      });
    },
    markGood(ctx, r, v, p) {
      mLoop(ctx, r, v.cam, 1846, 1060, 118, 165, p, C.yellow, 7);
      mNote(ctx, r, 'Keeper!', 0.82, 0.2, seg(p, 0.5, 0.5), C.yellow, 'center');
    },
  },
  closer: {
    world: 'cat',
    bad: { x: 1200, y: 830, w: 2300 },
    good: { x: 1300, y: 948, w: 560 },
    af: () => [1300, 862],
    readout: '1/250   F4   ISO 200',
    action: 'WALK CLOSER',
    anchors: c => ({ badSnap: c[1].at - 0.35, move: c[2].at + 0.1, moveDur: 2.6, goodSnap: c[2].end + 0.15, compare: 0 }),
    markBad(ctx, r, v, p) {
      const [x, y, rx] = mLoop(ctx, r, v.cam, 1300, 930, 175, 165, p, C.red, 3);
      handNote(ctx, 'Too far!', x + rx + 26 * ru(r), y + 12 * ru(r), seg(p, 0.5, 0.5), C.red, 50 * ru(r), -0.06);
    },
    markGood(ctx, r, v, p) {
      mLoop(ctx, r, v.cam, 1300, 872, 118, 100, p, C.yellow, 4);
      mNote(ctx, r, 'Keeper!', 0.83, 0.2, seg(p, 0.5, 0.5), C.yellow, 'center');
    },
  },
  thirds: {
    world: 'sunset',
    bad: { x: 2000, y: 1150, w: 1600 },
    good: { x: 1733, y: 972, w: 1600 },
    af: () => [2000, 900],
    readout: '1/500   F11   ISO 100',
    action: 'REFRAME',
    grid: (t, S) => seg(t, S.cues[0].at + 0.4, 1.3),
    anchors: c => ({ badSnap: c[1].at - 0.35, move: c[2].at + 0.1, moveDur: 2.4, goodSnap: c[3].at - 0.35, compare: c[3].end + 0.3 }),
    markBad(ctx, r, v, p) {
      mLine(ctx, r, v.cam, [1240, 1150], [2760, 1150], seg(p, 0, 0.5), C.red);
      mLoop(ctx, r, v.cam, 2000, 960, 235, 255, seg(p, 0.35, 0.65), C.red, 5);
      mNote(ctx, r, 'Dead center', 0.5, 0.84, seg(p, 0.5, 0.5), C.red, 'center', -0.03);
    },
    markGood(ctx, r, v, p) {
      gridLine(ctx, r, true, 2 / 3, seg(p, 0, 0.4), C.yellow, 5);
      gridLine(ctx, r, false, 2 / 3, seg(p, 0.15, 0.4), C.yellow, 5);
      const x = r.x + (r.w * 2) / 3, y = r.y + (r.h * 2) / 3;
      grease(ctx, loopPts(x, y, 46 * ru(r), 46 * ru(r), 9), seg(p, 0.5, 0.4), C.yellow, 8 * ru(r));
      mNote(ctx, r, 'Keeper!', 0.22, 0.2, seg(p, 0.6, 0.4), C.yellow, 'center');
    },
  },
  room: {
    world: 'run',
    bad: { x: 786, y: 840, w: 1150 },
    good: { x: 1392, y: 840, w: 1150 },
    af: () => [1215, 680],
    readout: '1/1000   F5.6   ISO 400',
    action: 'PAN AHEAD',
    sway: 0.6,
    anchors: c => ({ badSnap: c[1].at - 0.35, move: c[2].at + 0.05, moveDur: 1.8, goodSnap: c[2].end + 0.15, compare: 0 }),
    markBad(ctx, r, v, p) {
      mArrow(ctx, r, v.cam, [1250, 790], [1355, 790], p, C.red, 0);
      mNote(ctx, r, 'No room!', 0.3, 0.2, seg(p, 0.5, 0.5), C.red, 'center');
    },
    markGood(ctx, r, v, p) {
      mArrow(ctx, r, v.cam, [1290, 790], [1820, 790], p, C.yellow, -0.04);
      mNote(ctx, r, 'Keeper!', 0.7, 0.2, seg(p, 0.5, 0.5), C.yellow, 'center');
    },
  },
  lines: {
    world: 'pier',
    bad: { x: 760, y: 980, w: 1500 },
    good: { x: 1225, y: 960, w: 1650 },
    af: () => [1500, 640],
    readout: '1/125   F8   ISO 200',
    action: 'TURN TOWARD THE SUBJECT',
    anchors: c => ({ badSnap: c[1].at - 0.35, move: c[2].at + 0.05, moveDur: 2.2, goodSnap: c[2].end + 0.15, compare: 0 }),
    markBad(ctx, r, v, p) {
      mArrow(ctx, r, v.cam, [870, 1050], [1505, 790], p, C.red, 0.02);
      mArrow(ctx, r, v.cam, [880, 1300], [1505, 830], seg(p, 0.2, 0.8), C.red, 0.02);
      mNote(ctx, r, 'Leads out!', 0.3, 0.2, seg(p, 0.5, 0.5), C.red, 'center');
    },
    markGood(ctx, r, v, p) {
      const P = (X, Z, Y) => [1500 + (840 * X) / Z, 760 + (840 * (1 - Y)) / Z];
      mArrow(ctx, r, v.cam, P(-0.9, 1.3, 0.56), P(-0.9, 7.5, 0.56), p, C.yellow, 0.01);
      mArrow(ctx, r, v.cam, P(0.9, 1.75, 0.56), P(0.9, 7.5, 0.56), seg(p, 0.15, 0.85), C.yellow, -0.01);
      mLoop(ctx, r, v.cam, 1500, 655, 80, 230, seg(p, 0.5, 0.5), C.yellow, 11);
      mNote(ctx, r, 'Keeper!', 0.24, 0.2, seg(p, 0.6, 0.4), C.yellow, 'center');
    },
  },
  background: {
    world: 'street',
    bad: { x: 1200, y: 900, w: 1350 },
    good: { x: 1200, y: 900, w: 1350 },
    af: () => [1200, 760],
    readout: '1/320   F2.8   ISO 200',
    action: 'STEP TO THE SIDE',
    state: (tt, p) => ({ step: p }),
    anchors: c => ({ badSnap: c[1].at - 0.35, move: phraseAt(c[2], 'Move your feet'), moveDur: 2.0, goodSnap: c[2].end + 0.15, compare: 0 }),
    markBad(ctx, r, v, p) {
      const [x, y, rx] = mLoop(ctx, r, v.cam, 1200, 545, 70, 105, p, C.red, 6);
      handNote(ctx, 'Pole!', x + rx + 24 * ru(r), y + 10 * ru(r), seg(p, 0.5, 0.5), C.red, 50 * ru(r), -0.06);
    },
    markGood(ctx, r, v, p) {
      mLoop(ctx, r, v.cam, 1200, 740, 170, 190, p, C.yellow, 8);
      mNote(ctx, r, 'Keeper!', 0.82, 0.2, seg(p, 0.5, 0.5), C.yellow, 'center');
    },
  },
  level: {
    world: 'sea',
    bad: { x: 1200, y: 633, w: 1500, r: 4 * DEG },
    good: { x: 1200, y: 633, w: 1500, r: 0 },
    af: () => [1450, 760],
    readout: '1/1000   F8   ISO 100',
    action: 'ROTATE TO LEVEL',
    level: true,
    sway: 0.5,
    anchors: c => ({ badSnap: c[1].at - 0.35, move: c[2].at + 0.5, moveDur: 1.6, goodSnap: c[2].end + 0.15, compare: 0 }),
    markBad(ctx, r, v, p) {
      mLine(ctx, r, v.cam, [480, 800], [1920, 800], seg(p, 0, 0.6), C.red);
      mNote(ctx, r, 'Tilted!', 0.24, 0.22, seg(p, 0.5, 0.5), C.red, 'center');
    },
    markGood(ctx, r, v, p) {
      mLine(ctx, r, v.cam, [480, 800], [1920, 800], seg(p, 0, 0.6), C.yellow);
      mNote(ctx, r, 'Keeper!', 0.24, 0.22, seg(p, 0.5, 0.5), C.yellow, 'center');
    },
  },
  frame: {
    world: 'arch',
    bad: { x: 1240, y: 790, w: 660 },
    good: { x: 1200, y: 905, w: 2000 },
    af: () => [1450, 690],
    readout: '1/250   F8   ISO 100',
    action: 'STEP BACK',
    anchors: c => ({ badSnap: c[1].at - 0.35, move: c[2].at + 0.1, moveDur: 2.4, goodSnap: c[2].end + 0.15, compare: 0 }),
    markBad(ctx, r, v, p) {
      mLoop(ctx, r, v.cam, 1450, 690, 120, 120, p, C.red, 12);
      mNote(ctx, r, 'Flat', 0.25, 0.22, seg(p, 0.5, 0.5), C.red, 'center');
    },
    markGood(ctx, r, v, p) {
      const pts = [];
      pts.push(w2p(r, v.cam, 790, 1310));
      for (let i = 0; i <= 40; i++) { const a = Math.PI + (i / 40) * Math.PI; pts.push(w2p(r, v.cam, 1200 + Math.cos(a) * 410, 760 + Math.sin(a) * 410)); }
      pts.push(w2p(r, v.cam, 1610, 1310));
      grease(ctx, pts, seg(p, 0, 0.6), C.yellow, 7 * ru(r));
      mLoop(ctx, r, v.cam, 1450, 690, 110, 110, seg(p, 0.45, 0.55), C.yellow, 13);
      mNote(ctx, r, 'Keeper!', 0.84, 0.18, seg(p, 0.6, 0.4), C.yellow, 'center');
    },
  },
  angle: {
    bad: { x: 1200, y: 870, w: 1500 },
    good: { x: 1162, y: 925, w: 1150 },
    af: p => (p < 0.5 ? [1200, 966] : [1300, 803]),
    readout: '1/500   F4   ISO 200',
    action: 'CROUCH DOWN',
    anchors: c => ({ badSnap: c[1].at - 0.35, move: c[2].at + 0.1, moveDur: 1.8, goodSnap: c[2].end + 0.15, compare: 0 }),
    view(tt, p) { return { cam: sway(p < 0.5 ? this.bad : this.good, tt), st: { t: tt }, p }; },
    photo(ctx, r, v) {
      const p = v.p, t = v.st.t;
      const fade = Ease.inOut(clamp01((p - 0.38) / 0.24));
      if (fade < 1) drawPhoto(ctx, r, WORLDS.dogHigh, sway({ ...this.bad, y: this.bad.y + Ease.in(p) * 420 }, t), v.st);
      if (fade > 0) {
        ctx.save();
        ctx.globalAlpha *= fade;
        drawPhoto(ctx, r, WORLDS.dogLow, sway({ ...this.good, y: this.good.y - (1 - Ease.out(p)) * 380 }, t), v.st);
        ctx.restore();
      }
    },
    markBad(ctx, r, v, p) {
      mLoop(ctx, r, v.cam, 1200, 900, 205, 215, p, C.red, 14);
      mNote(ctx, r, 'Too high', 0.22, 0.2, seg(p, 0.5, 0.5), C.red, 'center');
    },
    markGood(ctx, r, v, p) {
      mLoop(ctx, r, v.cam, 1300, 805, 150, 140, p, C.yellow, 15);
      mNote(ctx, r, 'Keeper!', 0.8, 0.2, seg(p, 0.5, 0.5), C.yellow, 'center');
    },
    side: { h: 270, draw: (ctx, rect, t, A) => drawAngleDiagram(ctx, rect, seg(t, A.move, A.moveDur)) },
  },
  center: {
    world: 'lake',
    bad: { x: 1450, y: 640, w: 1500 },
    good: { x: 1200, y: 806, w: 1500 },
    af: () => [1200, 745],
    readout: '1/200   F8   ISO 100',
    action: 'RECENTER',
    grid: (t, S) => seg(t, S.cues[0].at, 1.0),
    anchors: c => ({ badSnap: c[1].at - 0.35, move: c[2].at + 0.1, moveDur: 2.2, goodSnap: c[2].end + 0.15, compare: 0 }),
    markBad(ctx, r, v, p) {
      mLoop(ctx, r, v.cam, 1200, 760, 230, 115, p, C.red, 16);
      mNote(ctx, r, 'Off-balance', 0.7, 0.2, seg(p, 0.5, 0.5), C.red, 'center');
    },
    markGood(ctx, r, v, p) {
      gridLine(ctx, r, true, 0.5, seg(p, 0, 0.45), C.yellow, 5);
      gridLine(ctx, r, false, 0.5, seg(p, 0.2, 0.45), C.yellow, 5);
      mNote(ctx, r, 'Keeper!', 0.24, 0.2, seg(p, 0.55, 0.45), C.yellow, 'center');
    },
  },
};

function lessonTimes(cfg, S) {
  const A = cfg.anchors(S.cues);
  A.goodSnap = Math.max(A.goodSnap, A.move + A.moveDur + 0.35);
  A.compare = Math.max(A.compare, A.goodSnap + 1.3);
  return A;
}
function lessonView(cfg, A, tt) {
  const p = seg(tt, A.move, A.moveDur);
  if (cfg.view) return cfg.view(tt, p);
  const cam = sway(lerpCam(cfg.bad, cfg.good, p), tt, cfg.sway ?? 1);
  return { cam, st: { t: tt, ...(cfg.state ? cfg.state(tt, p) : {}) }, p };
}
function lessonPhoto(ctx, r, cfg, v) {
  if (cfg.photo) cfg.photo(ctx, r, v);
  else drawPhoto(ctx, r, WORLDS[cfg.world], v.cam, v.st);
}

/** Lesson and big-idea renderer. */
function renderLessonLike(ctx, L, t, S, cfg, notes) {
  const A = lessonTimes(cfg, S);
  const V = L.vis;
  drawHeader(ctx, L, S, t);

  const frozenAt = t >= A.badSnap && t < A.move ? A.badSnap : t >= A.goodSnap ? A.goodSnap : null;
  const v = lessonView(cfg, A, frozenAt ?? t);
  const cmp = seg(t, A.compare, 1.0);
  const fBad = seg(t, A.badSnap, 0.12) * (1 - seg(t, A.move, 0.3));
  const fGood = seg(t, A.goodSnap, 0.12);
  const frozenA = Math.max(fBad, fGood);

  if (cmp < 1) {
    const r = cmp > 0 ? rectLerp(V, stripRects(V).b, Ease.inOut(cmp)) : V;
    if (cmp > 0) {
      const R = stripRects(V);
      drawFilmBand(ctx, R.band, cmp);
      ctx.save(); ctx.globalAlpha *= cmp; lessonPhoto(ctx, R.a, cfg, lessonView(cfg, A, A.badSnap)); ctx.restore();
    }
    ctx.fillStyle = C.panel;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    lessonPhoto(ctx, r, cfg, v);
    if (cmp === 0) {
      const chromeA = 1 - frozenA;
      const af = cfg.af ? cfg.af(v.p) : null;
      const lock = [A.badSnap, A.goodSnap].some(s => t > s - 0.5 && t < s + 0.1);
      drawViewfinder(ctx, V, {
        alpha: chromeA,
        grid: cfg.grid ? cfg.grid(t, S) : 0,
        af: af ? w2p(V, v.cam, af[0], af[1]) : null,
        afLock: lock,
        readout: cfg.readout,
        level: cfg.level ? v.cam.r || 0 : null,
        frameNo: 312 - S.index * 2 - (t >= A.badSnap ? 1 : 0) - (t >= A.goodSnap ? 1 : 0),
      });
      actionChip(ctx, V, cfg.action, env(t, A.move - 0.1, A.move + A.moveDur + 0.25, 0.25, 0.3));
      drawReviewTag(ctx, V, `100-${String(400 + S.index * 2 + (t >= A.goodSnap ? 1 : 0)).padStart(4, '0')}`, frozenA);
      if (fBad > 0) { ctx.save(); clipBleed(ctx, V); ctx.globalAlpha *= 1 - seg(t, A.move - 0.15, 0.3); cfg.markBad(ctx, V, v, seg(t, A.badSnap + 0.3, 0.9, Ease.out), t, A); ctx.restore(); }
      if (fGood > 0) { ctx.save(); clipBleed(ctx, V); cfg.markGood(ctx, V, v, seg(t, A.goodSnap + 0.3, 1.0, Ease.out), t, A); ctx.restore(); }
      drawShutter(ctx, V, t, A.badSnap);
      drawShutter(ctx, V, t, A.goodSnap);
    } else if (cmp < 0.6) {
      ctx.save(); clipBleed(ctx, r); ctx.globalAlpha *= 1 - cmp / 0.6; cfg.markGood(ctx, r, v, 1, t, A); ctx.restore();
    }
  } else {
    const R = stripRects(V);
    drawFilmBand(ctx, R.band, 1);
    lessonPhoto(ctx, R.a, cfg, lessonView(cfg, A, A.badSnap));
    lessonPhoto(ctx, R.b, cfg, v);
  }
  if (cmp > 0) drawStripMarks(ctx, L, t, A, S);

  drawNotes(ctx, L, t, notes(A));
}

function drawStripMarks(ctx, L, t, A, S) {
  const R = stripRects(L.vis), u = ru(L.vis);
  const n = 10 + S.index * 2;
  const la = seg(t, A.compare + 0.5, 0.5);
  if (la > 0) {
    const f = F.mono(15 * u, 500);
    const ny = R.a.y + R.a.h + 25 * u;
    ctx.save();
    ctx.globalAlpha *= la;
    drawText(ctx, `${n}`, R.a.x + 6 * u, ny, { font: f, color: C.edge });
    drawText(ctx, `▸${n}A`, R.a.x + R.a.w * 0.55, ny, { font: f, color: C.edge });
    drawText(ctx, `${n + 1}`, R.b.x + 6 * u, ny, { font: f, color: C.edge });
    drawText(ctx, `▸${n + 1}A`, R.b.x + R.b.w * 0.55, ny, { font: f, color: C.edge });
    const ly = R.band.y + R.band.h + 52 * u;
    drawText(ctx, 'BEFORE', R.a.x + R.a.w / 2, ly, { font: F.mono(25 * u, 500), color: '#ee9d92', align: 'center', ls: 4 * u });
    drawText(ctx, 'AFTER', R.b.x + R.b.w / 2, ly, { font: F.mono(25 * u, 500), color: C.yellow, align: 'center', ls: 4 * u });
    ctx.restore();
  }
  markX(ctx, R.a.x + R.a.w / 2, R.a.y + R.a.h / 2, R.a.h * 0.36, seg(t, A.compare + 0.8, 0.7), C.red, 11 * u);
  grease(ctx, loopPts(R.b.x + R.b.w / 2, R.b.y + R.b.h / 2, R.b.w * 0.6, R.b.h * 0.68, 31), seg(t, A.compare + 1.2, 0.9, Ease.out), C.yellow, 11 * u);
}

function lessonNotes(S, cfg) {
  return A => {
    const items = [{ kind: 'idea', text: S.notes.idea, at: S.cues[0].at - 0.3 }];
    if (cfg.side) items.push({ kind: 'custom', h: cfg.side.h, at: S.cues[0].at, draw: (ctx, rect, t) => cfg.side.draw(ctx, rect, t, A) });
    items.push({ kind: 'bad', text: S.notes.bad, at: A.badSnap + 0.4 });
    items.push({ kind: 'good', text: S.notes.good, at: A.goodSnap + 0.4 });
    items.push({ kind: 'tip', text: S.notes.tip, at: A.compare + 0.6 });
    return items;
  };
}

function renderLesson(ctx, L, t, S) {
  const cfg = LESSONS[S.id];
  renderLessonLike(ctx, L, t, S, cfg, lessonNotes(S, cfg));
}

function renderIdea(ctx, L, t, S) {
  const cfg = LESSONS.idea;
  const c3 = S.cues[3];
  const list = S.notes.list;
  const times = [phraseAt(c3, 'One clear'), phraseAt(c3, 'Nothing'), phraseAt(c3, 'Everything')];
  renderLessonLike(ctx, L, t, S, cfg, A => [
    { kind: 'bad', text: 'Too much going on: nothing stands out', at: A.badSnap + 0.4 },
    { kind: 'gap', h: 34 },
    { kind: 'label', text: S.notes.label, at: times[0] - 0.4 },
    { kind: 'gap', h: 10 },
    ...list.map((text, i) => ({ kind: 'custom', h: L.portrait ? 74 : 64, at: times[i], draw: (ctx2, rect) => drawListRow(ctx2, L, rect, i + 1, text) })),
  ]);
}

function drawListRow(ctx, L, rect, n, text) {
  const u = L.u;
  const y = rect.y + L.f.idea * 0.95;
  drawText(ctx, String(n).padStart(2, '0'), rect.x, y, { font: F.mono(L.f.body * 0.9, 500), color: C.yellow });
  drawText(ctx, text, rect.x + 62 * u, y, { font: F.body(L.f.idea, 700), color: C.ink, maxW: rect.w - 62 * u, lh: L.lh.idea });
}

/** Side-view diagram: photographer standing, then squatting to the dog's eye level. */
function drawAngleDiagram(ctx, rect, p) {
  const s = Math.min(rect.w / 648, rect.h / 270);
  const gy = rect.y + rect.h - 16 * s;
  const x0 = rect.x + 60 * s;
  const q = Ease.inOut(p);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = C.faint;
  ctx.lineWidth = 2 * s;
  strokeLine(ctx, rect.x, gy, rect.x + rect.w, gy);
  // dog, side view, facing the photographer
  const dx = rect.x + rect.w - 110 * s;
  const tan = '#c98b4a';
  ctx.strokeStyle = tan;
  ctx.lineWidth = 9 * s;
  for (const lx of [-26, -12, 22, 34]) strokeLine(ctx, dx + lx * s, gy - 40 * s, dx + lx * s, gy - 2 * s);
  ell(ctx, dx + 4 * s, gy - 48 * s, 42 * s, 19 * s, tan);
  curve(ctx, [[dx + 44 * s, gy - 54 * s], [dx + 60 * s, gy - 64 * s], [dx + 62 * s, gy - 80 * s]], tan, 6 * s);
  circ(ctx, dx - 36 * s, gy - 78 * s, 19 * s, tan);
  ell(ctx, dx - 54 * s, gy - 72 * s, 12 * s, 8 * s, '#f7f1e6');
  ell(ctx, dx - 64 * s, gy - 75 * s, 4 * s, 3.4 * s, '#2a2220');
  ell(ctx, dx - 26 * s, gy - 72 * s, 7 * s, 14 * s, '#7c4a25');
  circ(ctx, dx - 44 * s, gy - 84 * s, 2.6 * s, '#2a2220');
  const eye = [dx - 46 * s, gy - 84 * s];
  // photographer, interpolated between standing and squatting
  const P = (a, b) => [x0 + lerp(a[0], b[0], q) * s, gy - lerp(a[1], b[1], q) * s];
  const foot = P([0, 0], [14, 0]), knee = P([2, 54], [46, 38]), hip = P([0, 104], [0, 36]);
  const shoulder = P([4, 164], [12, 92]), head = P([8, 190], [20, 116]);
  const cam = P([34, 174], [46, 90]);
  ctx.strokeStyle = '#d9d3ca';
  ctx.lineWidth = 11 * s;
  ctx.beginPath(); ctx.moveTo(...foot); ctx.lineTo(...knee); ctx.lineTo(...hip); ctx.lineTo(...shoulder); ctx.stroke();
  ctx.lineWidth = 8 * s;
  ctx.beginPath(); ctx.moveTo(...shoulder); ctx.lineTo(cam[0] - 14 * s, cam[1] + 12 * s); ctx.lineTo(cam[0] - 4 * s, cam[1]); ctx.stroke();
  circ(ctx, head[0], head[1], 14 * s, '#d9d3ca');
  rr(ctx, cam[0] - 8 * s, cam[1] - 9 * s, 20 * s, 15 * s, 3 * s, '#f3efe8');
  circ(ctx, cam[0] + 13 * s, cam[1] - 1.5 * s, 4.5 * s, C.yellow);
  // line of sight
  ctx.setLineDash([8 * s, 8 * s]);
  ctx.strokeStyle = q < 0.5 ? C.red : C.yellow;
  ctx.lineWidth = 3 * s;
  strokeLine(ctx, cam[0] + 18 * s, cam[1] - 1.5 * s, eye[0] - 6 * s, eye[1]);
  ctx.setLineDash([]);
  drawText(ctx, q < 0.5 ? 'STANDING: LOOKING DOWN' : 'SQUATTING: EYE LEVEL', rect.x, rect.y + 16 * s, { font: F.mono(17 * s, 500), color: q < 0.5 ? '#ee9d92' : C.yellow, ls: 2 * s });
  ctx.restore();
}

/* ---------- title ---------- */
const TITLE_LOCK = 1.35;
function renderTitle(ctx, L, t, S) {
  const { W, H, u } = L;
  const bg = cached(`title-bg-${W}x${H}`, W, H, c2 => {
    const sm = cached(`title-sm-${W}x${H}`, W / 6, H / 6, c3 => {
      const cam = L.portrait ? { x: 1950, y: 980, w: 1250 } : { x: 1760, y: 1000, w: 1900 };
      drawPhoto(c3, { x: 0, y: 0, w: W / 6, h: H / 6 }, WORLDS.sunset, cam, { t: 0 });
    });
    if ('filter' in c2) c2.filter = `blur(${10 * u}px)`;
    c2.drawImage(sm, -30 * u, -30 * u, W + 60 * u, H + 60 * u);
  });
  ctx.save();
  const z = 1 + 0.05 * clamp01(t / S.dur);
  ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  ctx.drawImage(bg, 0, 0);
  ctx.restore();
  ctx.fillStyle = 'rgba(12,10,9,0.5)';
  ctx.fillRect(0, 0, W, H);

  const frame = { x: 0, y: 0, w: W, h: H };
  const b = seg(t, 0.25, 0.8, Ease.out);
  const ins = lerp(10, L.portrait ? 44 : 56, b) * u;
  ctx.save();
  ctx.globalAlpha *= b;
  drawGrid(ctx, frame, seg(t, 0.5, 1.2), 0.22);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 3.5 * u;
  const Lb = 60 * u;
  for (const [x, y, sx, sy] of [[ins, ins, 1, 1], [W - ins, ins, -1, 1], [ins, H - ins, 1, -1], [W - ins, H - ins, -1, -1]]) {
    ctx.beginPath(); ctx.moveTo(x, y + sy * Lb); ctx.lineTo(x, y); ctx.lineTo(x + sx * Lb, y); ctx.stroke();
  }
  drawText(ctx, '1/250   F8   ISO 100', ins + 44 * u, ins + 52 * u, { font: F.mono(18 * u, 500), color: 'rgba(255,255,255,0.8)', ls: 1.5 * u });
  drawText(ctx, '[312]', W - ins - 44 * u, ins + 52 * u, { font: F.mono(18 * u, 500), color: 'rgba(255,255,255,0.8)', align: 'right' });
  ctx.restore();

  const titleSize = (L.portrait ? 132 : 150) * u;
  const cy = H * (L.portrait ? 0.4 : 0.44);
  const ta = seg(t, 0.9, 0.8, Ease.out);
  const lines = textLines(ctx, LESSON.title, F.display(titleSize, 800), W * 0.84);
  const lh = titleSize * 1.02;
  const top = cy - (lines * lh) / 2;
  drawText(ctx, LESSON.title, W / 2, top + titleSize * 0.8 + (1 - ta) * 16 * u, { font: F.display(titleSize, 800), color: C.ink, align: 'center', maxW: W * 0.84, lh, alpha: ta });
  const subY = top + lines * lh + 36 * u;
  drawText(ctx, 'What makes a good photo, and where to put things in the frame.', W / 2, subY + (L.portrait ? 30 : 20) * u, { font: F.body((L.portrait ? 40 : 36) * u, 400), color: '#e4ddd2', align: 'center', maxW: W * 0.8, lh: (L.portrait ? 54 : 46) * u, alpha: seg(t, 1.5, 0.7) });
  drawText(ctx, 'A BEGINNER’S GUIDE TO COMPOSITION · 9 LESSONS', W / 2, subY + (L.portrait ? 170 : 96) * u, { font: F.mono((L.portrait ? 22 : 20) * u, 500), color: C.dim, align: 'center', ls: 3 * u, alpha: seg(t, 1.9, 0.7) });

  // focus box hunting, then locking onto the title
  const fa = seg(t, 0.7, 0.3);
  if (fa > 0) {
    ctx.save();
    ctx.font = F.display(titleSize, 800);
    const tw = Math.min(W * 0.84, ctx.measureText(LESSON.title).width);
    ctx.restore();
    const locked = t >= TITLE_LOCK;
    const hunt = locked ? 0 : Math.sin(t * 22) * 10 * u;
    const bx = W / 2 - tw / 2 - 36 * u - hunt, by = top - 14 * u - hunt;
    const bw = tw + 72 * u + hunt * 2, bh = lines * lh + 26 * u + hunt * 2;
    const k = 34 * u;
    ctx.save();
    ctx.globalAlpha *= fa * (locked ? 1 - seg(t, 3.2, 0.8) * 0.65 : 0.85);
    ctx.strokeStyle = locked ? C.green : '#ffffff';
    ctx.lineWidth = 4 * u;
    for (const [x, y, sx, sy] of [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]]) {
      ctx.beginPath(); ctx.moveTo(x, y + sy * k); ctx.lineTo(x, y); ctx.lineTo(x + sx * k, y); ctx.stroke();
    }
    ctx.restore();
  }
}

/* ---------- recap: the contact sheet ---------- */
const recapSnap = S => S.cues[6].at + 0.95; // the shutter on "Then press the shutter"
const SHEET = ['closer', 'thirds', 'room', 'lines', 'background', 'level', 'frame', 'angle', 'center'];
function sheetLayout(V) {
  const u = ru(V);
  const cols = 3, rows = 3;
  const gap = 26 * u, reb = 20 * u;
  const fw = Math.min((V.w - 120 * u - gap * (cols - 1)) / cols, ((V.h - 30 * u) / rows - 2 * reb - 12 * u) * ASPECT);
  const fh = fw / ASPECT;
  const stripH = fh + reb * 2;
  const stripW = cols * fw + (cols + 1) * gap;
  const x0 = V.x + (V.w - stripW) / 2;
  const totalH = rows * stripH + (rows - 1) * 12 * u;
  const y0 = V.y + (V.h - totalH) / 2;
  const frames = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) frames.push({ x: x0 + gap + c * (fw + gap), y: y0 + r * (stripH + 12 * u) + reb, w: fw, h: fh });
  return { frames, strips: [0, 1, 2].map(r => ({ x: x0, y: y0 + r * (stripH + 12 * u), w: stripW, h: stripH })), u };
}
function keeperPhoto(ctx, r, id) {
  const cfg = LESSONS[id];
  const v = cfg.view ? cfg.view(0, 1) : { cam: cfg.good, st: { t: 0.6, ...(cfg.state ? cfg.state(0, 1) : {}) }, p: 1 };
  lessonPhoto(ctx, r, cfg, v);
}
function renderRecap(ctx, L, t, S) {
  const V = L.vis;
  drawHeader(ctx, L, S, t);
  const sheet = cached(`sheet-${Math.round(V.w)}x${Math.round(V.h)}`, V.w, V.h, c2 => {
    const R = { x: 0, y: 0, w: V.w, h: V.h };
    const G = sheetLayout(R);
    c2.fillStyle = '#ece7de';
    c2.fillRect(0, 0, V.w, V.h);
    G.strips.forEach((s, i) => {
      c2.fillStyle = '#080706';
      c2.fillRect(s.x, s.y, s.w, s.h);
      c2.fillStyle = '#ece7de';
      for (let x = s.x + 10 * G.u; x < s.x + s.w - 12 * G.u; x += 26 * G.u) {
        c2.beginPath(); c2.roundRect(x, s.y + 5 * G.u, 11 * G.u, 9 * G.u, 2 * G.u); c2.fill();
        c2.beginPath(); c2.roundRect(x, s.y + s.h - 14 * G.u, 11 * G.u, 9 * G.u, 2 * G.u); c2.fill();
      }
      for (let c = 0; c < 3; c++) {
        const f = G.frames[i * 3 + c];
        drawText(c2, `${21 + i * 3 + c}`, f.x + 4 * G.u, s.y + s.h - 1.5 * G.u, { font: F.mono(11 * G.u, 500), color: C.edge });
      }
    });
    G.frames.forEach((f, i) => keeperPhoto(c2, f, SHEET[i]));
  });
  const a = seg(t, 0.15, 0.7);
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.drawImage(sheet, V.x, V.y, V.w, V.h);
  ctx.restore();
  // china-marker loops around every keeper, one after another
  const G = sheetLayout(V);
  const c = S.cues;
  const t0 = c[1].at, t1 = c[6].at - 0.4;
  G.frames.forEach((f, i) => {
    const at = lerp(t0, t1, i / (G.frames.length - 1));
    grease(ctx, loopPts(f.x + f.w / 2, f.y + f.h / 2, f.w * 0.53, f.h * 0.6, 40 + i), seg(t, at, 0.7, Ease.out), C.yellow, 6 * G.u);
  });
  const snapT = recapSnap(S);
  drawShutter(ctx, V, t, snapT);

  // checklist
  const items = S.notes.list;
  drawNotes(ctx, L, t, [
    ...items.map((text, i) => ({
      kind: 'custom', h: L.portrait ? 82 : 76, at: c[i + 1].at - 0.15,
      draw: (ctx2, rect, tt) => drawCheckRow(ctx2, L, rect, text, tt >= c[i + 2].at - 0.1, seg(tt, c[i + 2].at - 0.1, 0.5)),
    })),
    { kind: 'gap', h: 18 },
    { kind: 'custom', h: 80, at: c[6].at - 0.1, draw: (ctx2, rect, tt) => drawShutterRow(ctx2, L, rect, seg(tt, snapT - 0.2, 0.3)) },
  ]);
}
function drawCheckRow(ctx, L, rect, text, done, p) {
  const u = L.u, s = L.f.idea;
  const y = rect.y + s * 0.95;
  ctx.save();
  ctx.strokeStyle = done ? C.yellow : C.dim;
  ctx.lineWidth = 2.5 * u;
  ctx.strokeRect(rect.x + 2 * u, y - s * 0.72, s * 0.78, s * 0.78);
  ctx.restore();
  if (done) markCheck(ctx, rect.x + s * 0.42, y - s * 0.36, s * 0.42, p, C.yellow, 6 * u);
  drawText(ctx, text, rect.x + s * 1.35, y, { font: F.body(L.f.idea, 700), color: done ? C.dim : C.ink, maxW: rect.w - s * 1.35, lh: L.lh.idea });
}
function drawShutterRow(ctx, L, rect, p) {
  const u = L.u, s = L.f.idea;
  const y = rect.y + s * 0.95;
  const cx = rect.x + s * 0.4, cy = y - s * 0.34;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, s * 0.52, 0, TAU); ctx.strokeStyle = C.ink; ctx.lineWidth = 3 * u; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, s * 0.38 * (1 - 0.15 * Math.sin(p * Math.PI)), 0, TAU); ctx.fillStyle = p > 0 ? C.yellow : C.ink; ctx.fill();
  ctx.restore();
  drawText(ctx, 'Then press the shutter.', rect.x + s * 1.35, y, { font: F.body(L.f.idea, 400), color: C.ink, maxW: rect.w - s * 1.35, lh: L.lh.idea });
}

/* ---------- homework and end card ---------- */
const HOMEWORK = [
  { label: '1 · WIDE', world: 'dogLow', cam: { x: 1250, y: 880, w: 2300 }, phrase: 'Wide' },
  { label: '2 · CLOSE', world: 'dogLow', cam: { x: 1300, y: 828, w: 560 }, phrase: 'close' },
  { label: '3 · NEW ANGLE', world: 'dogWorm', cam: { x: 1200, y: 860, w: 1700 }, phrase: 'new angle' },
];
function homeworkPrints(L) {
  const u = L.u;
  if (!L.portrait) {
    const x0 = L.head.x, w = L.W - 2 * L.head.x, gap = 44 * u;
    const pw = (w - gap * 2) / 3;
    const ph = (pw - 24 * u) / ASPECT + 24 * u + 58 * u;
    const y = L.vis.y + 40 * u;
    return [0, 1, 2].map(i => ({ x: x0 + i * (pw + gap), y, w: pw, h: ph }));
  }
  const pw = 470 * u, gap = 40 * u;
  const ph = (pw - 24 * u) / ASPECT + 24 * u + 58 * u;
  const y0 = L.vis.y + 10 * u;
  return [
    { x: L.W / 2 - pw - gap / 2, y: y0, w: pw, h: ph },
    { x: L.W / 2 + gap / 2, y: y0, w: pw, h: ph },
    { x: L.W / 2 - pw / 2, y: y0 + ph + gap, w: pw, h: ph },
  ];
}
function renderHomework(ctx, L, t, S) {
  const u = L.u;
  const endAt = S.cues[1].end + 0.7;
  const ea = seg(t, endAt, 0.9);
  if (ea < 1) {
    ctx.save();
    ctx.globalAlpha *= 1 - ea;
    drawHeader(ctx, L, S, t);
    const prints = homeworkPrints(L);
    const b = 12 * u;
    HOMEWORK.forEach((h, i) => {
      const r = prints[i];
      const appear = seg(t, 0.3 + i * 0.15, 0.6, Ease.out);
      const at = phraseAt(S.cues[0], h.phrase) - 0.15;
      const fill = seg(t, at, 1.1, Ease.inOut);
      if (appear <= 0) return;
      ctx.save();
      ctx.globalAlpha *= appear;
      ctx.translate(r.x + r.w / 2, r.y + r.h / 2 + (1 - appear) * 24 * u);
      ctx.rotate([-0.022, 0.014, -0.012][i]);
      ctx.fillStyle = '#f1ece3';
      ctx.fillRect(-r.w / 2, -r.h / 2, r.w, r.h);
      const photo = { x: -r.w / 2 + b, y: -r.h / 2 + b, w: r.w - b * 2, h: (r.w - b * 2) / ASPECT };
      // an instant print that develops when its shot is named
      ctx.fillStyle = '#2d3336';
      ctx.fillRect(photo.x, photo.y, photo.w, photo.h);
      if (fill > 0) {
        ctx.save();
        ctx.globalAlpha *= fill;
        drawPhoto(ctx, photo, WORLDS[h.world], h.cam, { t });
        ctx.fillStyle = `rgba(70,80,90,${0.35 * (1 - fill)})`;
        ctx.fillRect(photo.x, photo.y, photo.w, photo.h);
        ctx.restore();
      }
      drawText(ctx, h.label, 0, photo.y + photo.h + 38 * u, { font: F.mono(21 * u, 500), color: '#2b2824', align: 'center', ls: 3 * u });
      ctx.restore();
    });
    const last = prints[prints.length - 1];
    const ty = last.y + last.h + (L.portrait ? 110 : 84) * u;
    drawText(ctx, 'Your best shot is often the second or third try.', L.W / 2, ty, { font: F.body(L.f.idea, 400), color: C.ink, align: 'center', maxW: L.W * 0.86, lh: L.lh.idea, alpha: seg(t, S.cues[1].at - 0.2, 0.6) });
    ctx.restore();
  }
  if (ea > 0) {
    const { W, H } = L;
    ctx.save();
    ctx.globalAlpha *= ea;
    const ins = (L.portrait ? 44 : 56) * u, k = 60 * u;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3.5 * u;
    for (const [x, y, sx, sy] of [[ins, ins, 1, 1], [W - ins, ins, -1, 1], [ins, H - ins, 1, -1], [W - ins, H - ins, -1, -1]]) {
      ctx.beginPath(); ctx.moveTo(x, y + sy * k); ctx.lineTo(x, y); ctx.lineTo(x + sx * k, y); ctx.stroke();
    }
    const ts = (L.portrait ? 120 : 132) * u;
    const lines = textLines(ctx, LESSON.title, F.display(ts, 800), W * 0.86);
    const top = H * 0.46 - (lines * ts * 1.02) / 2;
    drawText(ctx, LESSON.title, W / 2, top + ts * 0.8, { font: F.display(ts, 800), color: C.ink, align: 'center', maxW: W * 0.86, lh: ts * 1.02 });
    drawText(ctx, 'Now go take some photos.', W / 2, top + lines * ts * 1.02 + 46 * u, { font: F.body(40 * u, 400), color: '#e4ddd2', align: 'center' });
    ctx.restore();
  }
}

/* ---------- timeline finishing ---------- */
// Each scene needs time after its last line for the animation to land
// (the before/after strip, the final shutter, the end card).
function sceneMinDur(S) {
  if (S.kind === 'lesson' || S.kind === 'idea') return lessonTimes(LESSONS[S.kind === 'idea' ? 'idea' : S.id], S).compare + 2.6;
  if (S.kind === 'recap') return S.cues[6].at + 3.0;
  if (S.kind === 'homework') return S.cues[1].end + 0.7 + 4.0;
  return 0;
}
function finishTimeline(TL) {
  let T = 0;
  for (const S of TL.scenes) {
    S.dur = Math.max(S.dur, sceneMinDur(S));
    S.start = T;
    S.end = T + S.dur;
    T = S.end;
  }
  TL.duration = T;
  return TL;
}

/* ---------- dispatch ---------- */
const RENDER = { title: renderTitle, idea: renderIdea, lesson: renderLesson, recap: renderRecap, homework: renderHomework };

function sceneAt(TL, T) {
  for (const s of TL.scenes) if (T < s.end) return s;
  return TL.scenes[TL.scenes.length - 1];
}

function renderAt(ctx, L, TL, T, opts = {}) {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, L.W, L.H);
  const S = sceneAt(TL, T);
  const t = clamp(T - S.start, 0, S.dur);
  const last = S === TL.scenes[TL.scenes.length - 1];
  const a = Math.min(seg(t, 0, 0.5, Ease.out), last ? 1 : 1 - seg(t, S.dur - 0.4, 0.4, Ease.in));
  ctx.globalAlpha = a;
  RENDER[S.kind](ctx, L, t, S);
  ctx.globalAlpha = 1;
  if (opts.subtitles !== false) drawSubtitles(ctx, L, S, t);
  if (opts.progress) drawProgress(ctx, L, TL, T);
  ctx.restore();
}

/** Sound cues for the soundtrack: shutter clicks and the focus beep. */
function collectEvents(TL) {
  const ev = [];
  for (const S of TL.scenes) {
    if (S.kind === 'lesson' || S.kind === 'idea') {
      const A = lessonTimes(LESSONS[S.kind === 'idea' ? 'idea' : S.id], S);
      ev.push({ t: S.start + A.badSnap, type: 'shutter' }, { t: S.start + A.goodSnap, type: 'shutter' });
    } else if (S.kind === 'title') {
      ev.push({ t: S.start + TITLE_LOCK, type: 'beep' });
    } else if (S.kind === 'recap') {
      ev.push({ t: S.start + recapSnap(S), type: 'shutter' });
    }
  }
  return ev;
}
