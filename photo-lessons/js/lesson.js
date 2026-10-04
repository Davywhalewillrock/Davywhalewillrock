/*
 * Shared lesson machinery, used by every lesson page:
 *  - grease-pencil mark helpers sized from the photo rectangle,
 *  - the lesson renderer: live view → shutter → red mark → the fix → shutter →
 *    keeper mark → before/after film strip,
 *  - the title card, the instant-print homework scene and the end card,
 *  - timeline finishing and scene dispatch.
 *
 * Each lesson's own scenes.js defines two globals:
 *   LESSONS  per-lesson framing configs (bad/good camera, anchors, marks, …)
 *   KINDS    scene kind → { render(ctx, L, t, S), minDur?(S), events?(S) }
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
// unit size for marks: a landscape photo's width, or a tall photo's height
const ru = r => Math.max(r.w, r.h * ASPECT) / 1080;
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

/* ---------- photo shapes: landscape, vertical, phone ---------- */
/** Where the photo sits inside the visual panel for a given orientation. */
function photoRect(V, orient) {
  if (!orient || orient === 'h') return V;
  if (orient === 'phone') return phoneGeom(V).photo;
  const w = (V.h * 2) / 3;
  return { x: V.x + (V.w - w) / 2, y: V.y, w, h: V.h };
}
/** A phone held upright: body, screen and the 3:4 camera preview inside it. */
function phoneGeom(V) {
  const h = V.h, w = h * 0.5;
  const body = { x: V.x + (V.w - w) / 2, y: V.y, w, h };
  const bz = w * 0.045;
  const screen = { x: body.x + bz, y: body.y + bz, w: w - 2 * bz, h: h - 2 * bz };
  const pw = screen.w, ph = (pw * 4) / 3;
  const photo = { x: screen.x, y: screen.y + (screen.h - ph) * 0.42, w: pw, h: ph };
  return { body, screen, photo };
}
/** Before/after frames on a strip of film, for any photo orientation. */
function stripRectsFor(V, orient) {
  if (!orient || orient === 'h') return stripRects(V);
  const ratio = orient === 'phone' ? 3 / 4 : 2 / 3;
  const fh = V.h * 0.66, fw = fh * ratio;
  const g = fw * 0.16;
  const total = fw * 2 + g;
  const x0 = V.x + (V.w - total) / 2;
  const y = V.y + (V.h - fh) / 2 - V.h * 0.03;
  const bandW = Math.min(V.w, total + g * 3);
  return {
    band: { x: V.x + (V.w - bandW) / 2, y: y - fh * 0.13, w: bandW, h: fh * 1.26 },
    a: { x: x0, y, w: fw, h: fh },
    b: { x: x0 + fw + g, y, w: fw, h: fh },
  };
}

/** The phone itself: body and black screen around the selfie preview. */
function drawPhoneBody(ctx, V, a) {
  if (a <= 0) return;
  const G = phoneGeom(V);
  const u = G.body.w / 540;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.fillStyle = '#2a2c31';
  ctx.beginPath(); ctx.roundRect(G.body.x, G.body.y, G.body.w, G.body.h, 64 * u); ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.beginPath(); ctx.roundRect(G.screen.x, G.screen.y, G.screen.w, G.screen.h, 44 * u); ctx.fill();
  ctx.restore();
}
function drawPhoneUI(ctx, V, a, info) {
  if (a <= 0) return;
  const G = phoneGeom(V);
  const u = G.body.w / 540;
  const s = G.screen;
  ctx.save();
  ctx.globalAlpha *= a;
  // dynamic island
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.roundRect(s.x + s.w / 2 - 62 * u, s.y + 20 * u, 124 * u, 34 * u, 17 * u); ctx.fill();
  // mode labels and shutter
  const by = G.photo.y + G.photo.h + (s.y + s.h - G.photo.y - G.photo.h) * 0.62;
  drawText(ctx, 'VIDEO', s.x + s.w / 2 - 110 * u, G.photo.y + G.photo.h + 46 * u, { font: F.mono(18 * u, 500), color: 'rgba(255,255,255,0.6)', align: 'center', ls: 1.5 * u });
  drawText(ctx, 'PHOTO', s.x + s.w / 2, G.photo.y + G.photo.h + 46 * u, { font: F.mono(18 * u, 500), color: C.yellow, align: 'center', ls: 1.5 * u });
  drawText(ctx, 'PORTRAIT', s.x + s.w / 2 + 124 * u, G.photo.y + G.photo.h + 46 * u, { font: F.mono(18 * u, 500), color: 'rgba(255,255,255,0.6)', align: 'center', ls: 1.5 * u });
  ctx.beginPath(); ctx.arc(s.x + s.w / 2, by, 46 * u, 0, TAU); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6 * u; ctx.stroke();
  ctx.beginPath(); ctx.arc(s.x + s.w / 2, by, info.press ? 34 * u : 38 * u, 0, TAU); ctx.fillStyle = '#ffffff'; ctx.fill();
  // flip-camera and gallery buttons
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath(); ctx.arc(s.x + s.w / 2 + 150 * u, by, 30 * u, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.roundRect(s.x + s.w / 2 - 180 * u, by - 28 * u, 56 * u, 56 * u, 10 * u); ctx.fill();
  // zoom chips
  if (info.zoom) {
    ['.5', '1×', '2'].forEach((z, i) => {
      const cx = G.photo.x + G.photo.w / 2 + (i - 1) * 64 * u, cy = G.photo.y + G.photo.h - 46 * u;
      const on = (info.zoom === 2 && i === 2) || (info.zoom === 1 && i === 1);
      ctx.fillStyle = on ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.arc(cx, cy, on ? 25 * u : 20 * u, 0, TAU); ctx.fill();
      drawText(ctx, on && i === 2 ? '2×' : z, cx, cy + 6 * u, { font: F.mono((on ? 17 : 14) * u, 500), color: on ? C.yellow : '#ffffff', align: 'center' });
    });
  }
  ctx.restore();
}

/* ---------- the lesson pattern ---------- */
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
/** Shutter moments: the bad shot, the keeper, and any extras (a burst). */
function lessonShots(cfg, A) {
  return [A.badSnap, A.goodSnap, ...(cfg.extraShots ? cfg.extraShots(A) : [])];
}

/** Lesson and big-idea renderer. */
function renderLessonLike(ctx, L, t, S, cfg, notes) {
  const A = lessonTimes(cfg, S);
  const V = L.vis;
  const P = photoRect(V, cfg.orient);
  drawHeader(ctx, L, S, t);

  let frozenAt = t >= A.badSnap && t < A.move ? A.badSnap : t >= A.goodSnap ? A.goodSnap : null;
  if (cfg.frozenAt) frozenAt = cfg.frozenAt(t, A, frozenAt);
  const v = lessonView(cfg, A, frozenAt ?? t);
  const cmp = seg(t, A.compare, 1.0);
  const fBad = seg(t, A.badSnap, 0.12) * (1 - seg(t, A.move, 0.3));
  const fGood = seg(t, A.goodSnap, 0.12);
  const frozenA = Math.max(fBad, fGood);
  const SR = stripRectsFor(V, cfg.orient);

  if (cmp < 1) {
    const r = cmp > 0 ? rectLerp(P, SR.b, Ease.inOut(cmp)) : P;
    if (cmp > 0) {
      drawFilmBand(ctx, SR.band, cmp);
      ctx.save(); ctx.globalAlpha *= cmp; lessonPhoto(ctx, SR.a, cfg, lessonView(cfg, A, A.badSnap)); ctx.restore();
    }
    if (cfg.chrome === 'phone') drawPhoneBody(ctx, V, 1 - seg(cmp, 0, 0.5));
    ctx.fillStyle = C.panel;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    lessonPhoto(ctx, r, cfg, v);
    if (cmp === 0) {
      const chromeA = 1 - frozenA;
      if (cfg.overlay) { ctx.save(); clipBleed(ctx, P, 0); cfg.overlay(ctx, P, v, t, A, chromeA); ctx.restore(); }
      const shots = lessonShots(cfg, A);
      const lock = shots.some(s => t > s - 0.5 && t < s + 0.1);
      if (cfg.chrome === 'phone') {
        drawPhoneUI(ctx, V, 1, { press: shots.some(s => t > s - 0.12 && t < s + 0.1), zoom: cfg.zoomChip ? cfg.zoomChip(v) : 0 });
      } else {
        const af = cfg.af ? cfg.af(v.p) : null;
        drawViewfinder(ctx, P, {
          alpha: chromeA,
          grid: cfg.grid ? cfg.grid(t, S) : 0,
          af: af ? w2p(P, v.cam, af[0], af[1]) : null,
          afLock: lock,
          readout: typeof cfg.readout === 'function' ? cfg.readout(v, t, A) : cfg.readout,
          level: cfg.level ? v.cam.r || 0 : null,
          frameNo: 312 - S.index * 2 - (t >= A.badSnap ? 1 : 0) - (t >= A.goodSnap ? 1 : 0),
        });
      }
      // tall photos get the chip at a readable size, centred over the photo
      const chipRect = !cfg.orient || cfg.orient === 'h' ? P : { x: V.x + V.w * 0.1, y: P.y, w: V.w * 0.8, h: P.h };
      actionChip(ctx, chipRect, cfg.action, env(t, A.move - 0.1, A.move + A.moveDur + 0.25, 0.25, 0.3));
      if (cfg.chrome !== 'phone') drawReviewTag(ctx, P, `100-${String(400 + S.index * 2 + (t >= A.goodSnap ? 1 : 0)).padStart(4, '0')}`, frozenA);
      // marks may spill beside a tall photo, but never out of the visual panel
      const markClip = !cfg.orient || cfg.orient === 'h' ? P : V;
      if (fBad > 0) { ctx.save(); clipBleed(ctx, markClip); ctx.globalAlpha *= 1 - seg(t, A.move - 0.15, 0.3); cfg.markBad(ctx, P, v, seg(t, A.badSnap + 0.3, 0.9, Ease.out), t, A); ctx.restore(); }
      if (fGood > 0) { ctx.save(); clipBleed(ctx, markClip); cfg.markGood(ctx, P, v, seg(t, A.goodSnap + 0.3, 1.0, Ease.out), t, A); ctx.restore(); }
      if (cfg.afterShots) cfg.afterShots(ctx, P, t, A, L);
      for (const s of shots) drawShutter(ctx, P, t, s);
    } else if (cmp < 0.6) {
      ctx.save(); clipBleed(ctx, !cfg.orient || cfg.orient === 'h' ? r : V); ctx.globalAlpha *= 1 - cmp / 0.6; cfg.markGood(ctx, r, v, 1, t, A); ctx.restore();
    }
  } else {
    drawFilmBand(ctx, SR.band, 1);
    lessonPhoto(ctx, SR.a, cfg, lessonView(cfg, A, A.badSnap));
    lessonPhoto(ctx, SR.b, cfg, v);
  }
  if (cmp > 0) drawStripMarks(ctx, L, t, A, S, SR);

  drawNotes(ctx, L, t, notes(A));
}

function drawStripMarks(ctx, L, t, A, S, R = stripRects(L.vis)) {
  const u = ru(L.vis);
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
  markX(ctx, R.a.x + R.a.w / 2, R.a.y + R.a.h / 2, Math.min(R.a.h, R.a.w) * 0.36, seg(t, A.compare + 0.8, 0.7), C.red, 11 * u);
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

/** Default timing rules for scenes built on the lesson pattern. */
const lessonKind = key => ({
  render: (ctx, L, t, S) => (key ? renderLessonLike(ctx, L, t, S, LESSONS[key], lessonNotes(S, LESSONS[key])) : renderLesson(ctx, L, t, S)),
  minDur: S => lessonTimes(LESSONS[key || S.id], S).compare + 2.6,
  events: S => lessonShots(LESSONS[key || S.id], lessonTimes(LESSONS[key || S.id], S)).map(t => ({ t, type: 'shutter' })),
});

/* ---------- notes rows ---------- */
function drawListRow(ctx, L, rect, n, text) {
  const u = L.u;
  const y = rect.y + L.f.idea * 0.95;
  drawText(ctx, String(n).padStart(2, '0'), rect.x, y, { font: F.mono(L.f.body * 0.9, 500), color: C.yellow });
  drawText(ctx, text, rect.x + 62 * u, y, { font: F.body(L.f.idea, 700), color: C.ink, maxW: rect.w - 62 * u, lh: L.lh.idea });
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

/* ---------- title card ---------- */
const TITLE_LOCK = 1.35;
/** o = { paint(ctx, rect) for the blurred backdrop, subtitle, tagline } */
function renderTitleCard(ctx, L, t, S, o) {
  const { W, H, u } = L;
  const bg = cached(`title-bg-${W}x${H}`, W, H, c2 => {
    const sm = cached(`title-sm-${W}x${H}`, W / 6, H / 6, c3 => o.paint(c3, { x: 0, y: 0, w: W / 6, h: H / 6 }, L));
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
  drawText(ctx, o.subtitle, W / 2, subY + (L.portrait ? 30 : 20) * u, { font: F.body((L.portrait ? 40 : 36) * u, 400), color: '#e4ddd2', align: 'center', maxW: W * 0.8, lh: (L.portrait ? 54 : 46) * u, alpha: seg(t, 1.5, 0.7) });
  drawText(ctx, o.tagline, W / 2, subY + (L.portrait ? 170 : 96) * u, { font: F.mono((L.portrait ? 22 : 20) * u, 500), color: C.dim, align: 'center', ls: 3 * u, alpha: seg(t, 1.9, 0.7) });

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

/* ---------- homework: instant prints that develop, then the end card ---------- */
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
/**
 * o = { prints: [{ label, phrase, paint(ctx, rect, t) }], tip, endLine }
 * Prints develop as their phrase is spoken in the first cue; the end card follows the last cue.
 */
function renderPrints(ctx, L, t, S, o) {
  const u = L.u;
  const endAt = S.cues[S.cues.length - 1].end + 0.7;
  const ea = seg(t, endAt, 0.9);
  if (ea < 1) {
    ctx.save();
    ctx.globalAlpha *= 1 - ea;
    drawHeader(ctx, L, S, t);
    const prints = homeworkPrints(L);
    const b = 12 * u;
    o.prints.forEach((h, i) => {
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
        h.paint(ctx, photo, t);
        ctx.fillStyle = `rgba(70,80,90,${0.35 * (1 - fill)})`;
        ctx.fillRect(photo.x, photo.y, photo.w, photo.h);
        ctx.restore();
      }
      drawText(ctx, h.label, 0, photo.y + photo.h + 38 * u, { font: F.mono(21 * u, 500), color: '#2b2824', align: 'center', ls: 3 * u });
      ctx.restore();
    });
    const last = prints[prints.length - 1];
    const ty = last.y + last.h + (L.portrait ? 110 : 84) * u;
    drawText(ctx, o.tip, L.W / 2, ty, { font: F.body(L.f.idea, 400), color: C.ink, align: 'center', maxW: L.W * 0.86, lh: L.lh.idea, alpha: seg(t, S.cues[S.cues.length - 1].at - 0.2, 0.6) });
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
    drawText(ctx, o.endLine, W / 2, top + lines * ts * 1.02 + 46 * u, { font: F.body(40 * u, 400), color: '#e4ddd2', align: 'center' });
    ctx.restore();
  }
}

/* ---------- timeline finishing and dispatch ---------- */
// Each scene needs time after its last line for the animation to land
// (the before/after strip, the final shutter, the end card).
function finishTimeline(TL) {
  let T = 0;
  for (const S of TL.scenes) {
    const k = KINDS[S.kind];
    S.dur = Math.max(S.dur, k && k.minDur ? k.minDur(S) : 0);
    S.start = T;
    S.end = T + S.dur;
    T = S.end;
  }
  TL.duration = T;
  return TL;
}

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
  KINDS[S.kind].render(ctx, L, t, S);
  ctx.globalAlpha = 1;
  if (opts.subtitles !== false) drawSubtitles(ctx, L, S, t);
  if (opts.progress) drawProgress(ctx, L, TL, T);
  ctx.restore();
}

/** Sound cues for the soundtrack: shutter clicks and the focus beep. */
function collectEvents(TL) {
  const ev = [];
  for (const S of TL.scenes) {
    const k = KINDS[S.kind];
    if (k && k.events) for (const e of k.events(S)) ev.push({ ...e, t: S.start + e.t });
  }
  return ev;
}
