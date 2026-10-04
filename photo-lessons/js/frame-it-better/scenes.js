/*
 * Lesson 1, Frame It Better: framing configs for each lesson and the scenes
 * unique to this lesson (big idea, contact-sheet recap, homework).
 * The shared lesson pattern lives in js/lesson.js.
 */
'use strict';

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
/* ---------- homework and end card ---------- */
const HOMEWORK = [
  { label: '1 · WIDE', world: 'dogLow', cam: { x: 1250, y: 880, w: 2300 }, phrase: 'Wide' },
  { label: '2 · CLOSE', world: 'dogLow', cam: { x: 1300, y: 828, w: 560 }, phrase: 'close' },
  { label: '3 · NEW ANGLE', world: 'dogWorm', cam: { x: 1200, y: 860, w: 1700 }, phrase: 'new angle' },
];
const TITLE = {
  subtitle: 'What makes a good photo, and where to put things in the frame.',
  tagline: 'A BEGINNER’S GUIDE TO COMPOSITION · 9 LESSONS',
  paint: (ctx, r, L) => drawPhoto(ctx, r, WORLDS.sunset, L.portrait ? { x: 1950, y: 980, w: 1250 } : { x: 1760, y: 1000, w: 1900 }, { t: 0 }),
};

function renderHomework(ctx, L, t, S) {
  renderPrints(ctx, L, t, S, {
    prints: HOMEWORK.map(h => ({ label: h.label, phrase: h.phrase, paint: (c, r, tt) => drawPhoto(c, r, WORLDS[h.world], h.cam, { t: tt }) })),
    tip: 'Your best shot is often the second or third try.',
    endLine: 'Now go take some photos.',
  });
}

/* ---------- scene kinds ---------- */
const KINDS = {
  title: { render: (ctx, L, t, S) => renderTitleCard(ctx, L, t, S, TITLE), events: () => [{ t: TITLE_LOCK, type: 'beep' }] },
  idea: { ...lessonKind('idea'), render: renderIdea },
  lesson: lessonKind(),
  recap: { render: renderRecap, minDur: S => S.cues[6].at + 3.0, events: S => [{ t: recapSnap(S), type: 'shutter' }] },
  homework: { render: renderHomework, minDur: S => S.cues[1].end + 0.7 + 4.0 },
};
